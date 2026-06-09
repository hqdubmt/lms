/**
 * Instructor Student Management — quyền can thiệp toàn diện vào học sinh
 * Chỉ cho phép instructor can thiệp vào học sinh trong lớp của mình.
 */

import { FastifyInstance } from 'fastify';
import { requireInstructor } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';
import { getBrain, updateBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getStreak } from '../../services/streak';
import { generateStudyPlan } from '../../services/study-plan';

async function verifyStudentInClass(instructorId: string, studentId: string) {
  const member = await prisma.classMember.findFirst({
    where: {
      userId: studentId,
      class: { createdBy: instructorId },
    },
    include: { class: { select: { id: true, name: true } } },
  });
  return member;
}

export async function instructorStudentMgmtRoutes(app: FastifyInstance) {
  // GET /instructor/students/:studentId — full profile
  app.get('/students/:studentId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, avatarUrl: true },
    });
    if (!user) return reply.status(404).send({ error: 'Không tìm thấy học sinh' });

    const subjects = ['general', 'math', 'language', 'viet'];
    const brainAll = await Promise.all(
      subjects.map(async s => ({ subject: s, brain: await getBrain(studentId, s) })),
    );

    const [la, streak] = await Promise.all([
      getLearningAnalytics(studentId).catch(() => ({
        chatCount: 0, quizCount: 0, homeworkCount: 0, voiceCount: 0,
        studyMinutes: 0, masteryHistory: [],
      })),
      getStreak(studentId).catch(() => ({ currentStreak: 0, bestStreak: 0, totalActiveDays: 0 })),
    ]);

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, score: true, createdAt: true },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId },
      select: {
        progress: true, status: true,
        course: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Tasks assigned by this instructor to this student
    const assignedTasks = await prisma.todo.findMany({
      where: { assignedToId: studentId, createdById: sub },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, dueDate: true, priority: true },
    });

    return reply.send({
      student: user,
      class: { id: member.class.id, name: member.class.name },
      brains: brainAll,
      activity: la,
      streak,
      quizAttempts,
      enrollments,
      assignedTasks,
    });
  });

  // GET /instructor/students/:studentId/study-plan
  app.get('/students/:studentId/study-plan', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const q = req.query as { subject?: string; days?: string };
    const subject = q.subject || 'general';
    const rawDays = parseInt(q.days ?? '7', 10);
    const days = ([7, 14, 30].includes(rawDays) ? rawDays : 7) as 7 | 14 | 30;

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    // Check instructor override first
    const overrideKey = `studyplan:override:${studentId}:${subject}:${days}`;
    const overrideRaw = await redis.get(overrideKey).catch(() => null);
    const isOverride = !!overrideRaw;

    const plan = overrideRaw
      ? JSON.parse(overrideRaw)
      : await generateStudyPlan(studentId, subject, days);

    return reply.send({ ...plan, isOverride });
  });

  // POST /instructor/students/:studentId/study-plan/override — ghi đè kế hoạch AI
  app.post('/students/:studentId/study-plan/override', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const body = req.body as {
      subject?: string;
      days?: number;
      plan: Array<{ day: number; date: string; focus: string; activities: string[]; type: string }>;
    };

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    if (!body.plan?.length) return reply.status(400).send({ error: 'Plan không được trống' });

    const subject = body.subject || 'general';
    const days = body.days || body.plan.length;
    const overrideKey = `studyplan:override:${studentId}:${subject}:${days}`;

    const payload = {
      days,
      subject,
      plan: body.plan,
      weakTopics: [],
      generatedAt: Date.now(),
      overriddenBy: sub,
    };

    await redis.set(overrideKey, JSON.stringify(payload), 'EX', 30 * 24 * 3600);
    // Also bust the AI-generated cache so student sees override
    await redis.del(`studyplan:${studentId}:${subject}:${days}`).catch(() => {});

    return reply.send({ ok: true, message: 'Đã ghi đè kế hoạch học tập' });
  });

  // DELETE /instructor/students/:studentId/study-plan/cache — reset kế hoạch AI
  app.delete('/students/:studentId/study-plan/cache', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    await Promise.all([
      redis.del(`studyplan:${studentId}:${subject}:7`),
      redis.del(`studyplan:${studentId}:${subject}:14`),
      redis.del(`studyplan:${studentId}:${subject}:30`),
      redis.del(`studyplan:override:${studentId}:${subject}:7`),
      redis.del(`studyplan:override:${studentId}:${subject}:14`),
      redis.del(`studyplan:override:${studentId}:${subject}:30`),
    ]).catch(() => {});

    return reply.send({ ok: true, message: 'Đã reset kế hoạch, AI sẽ tạo lại lần sau' });
  });

  // PATCH /instructor/students/:studentId/brain — chỉnh mastery / level
  app.patch('/students/:studentId/brain', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const body = req.body as {
      subject?: string;
      mastery?: Record<string, number>;
      level?: 'basic' | 'intermediate' | 'advanced';
      topic?: string;
    };

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    const subject = body.subject || 'general';
    const patch: Record<string, unknown> = {};
    if (body.mastery) patch.mastery = body.mastery;
    if (body.level) patch.level = body.level;
    if (body.topic !== undefined) patch.topic = body.topic;

    if (!Object.keys(patch).length) return reply.status(400).send({ error: 'Không có thay đổi' });

    await updateBrain(studentId, subject, patch as Parameters<typeof updateBrain>[2]);

    // Bust study plan cache so AI regenerates with new mastery
    await Promise.all([
      redis.del(`studyplan:${studentId}:${subject}:7`),
      redis.del(`studyplan:${studentId}:${subject}:14`),
      redis.del(`studyplan:${studentId}:${subject}:30`),
    ]).catch(() => {});

    return reply.send({ ok: true, message: 'Đã cập nhật brain học sinh' });
  });

  // GET /instructor/students/:studentId/tasks — bài tập giảng viên giao
  app.get('/students/:studentId/tasks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    const tasks = await prisma.todo.findMany({
      where: { assignedToId: studentId, createdById: sub },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true, status: true,
        priority: true, dueDate: true, createdAt: true,
        assigneeConfirmed: true, resultNote: true,
      },
    });

    return reply.send(tasks);
  });

  // POST /instructor/students/:studentId/tasks — giao bài tập cho học sinh
  app.post('/students/:studentId/tasks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId } = req.params as { studentId: string };
    const body = req.body as {
      title: string;
      description?: string;
      dueDate?: string;
      priority?: number;
    };

    const member = await verifyStudentInClass(sub, studentId);
    if (!member) return reply.status(403).send({ error: 'Học sinh không thuộc lớp của bạn' });

    if (!body.title?.trim()) return reply.status(400).send({ error: 'Tiêu đề không được trống' });

    const task = await prisma.todo.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority ?? 0,
        createdById: sub,
        assignedToId: studentId,
      },
    });

    return reply.status(201).send(task);
  });

  // PATCH /instructor/students/:studentId/tasks/:taskId — cập nhật/huỷ bài tập
  app.patch('/students/:studentId/tasks/:taskId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId, taskId } = req.params as { studentId: string; taskId: string };
    const body = req.body as {
      title?: string; description?: string; dueDate?: string | null;
      priority?: number; status?: string;
    };

    const task = await prisma.todo.findFirst({
      where: { id: taskId, createdById: sub, assignedToId: studentId },
    });
    if (!task) return reply.status(404).send({ error: 'Không tìm thấy bài tập' });

    const updated = await prisma.todo.update({
      where: { id: taskId },
      data: {
        ...(body.title && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status && { status: body.status as any }),
      },
    });

    return reply.send(updated);
  });

  // DELETE /instructor/students/:studentId/tasks/:taskId — xoá bài tập
  app.delete('/students/:studentId/tasks/:taskId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { studentId, taskId } = req.params as { studentId: string; taskId: string };

    const task = await prisma.todo.findFirst({
      where: { id: taskId, createdById: sub, assignedToId: studentId },
    });
    if (!task) return reply.status(404).send({ error: 'Không tìm thấy bài tập' });

    await prisma.todo.delete({ where: { id: taskId } });
    return reply.send({ ok: true });
  });

  // GET /instructor/students/in-class/:classId — danh sách học sinh đầy đủ cho 1 lớp
  app.get('/students/in-class/:classId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { classId } = req.params as { classId: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const cls = await prisma.class.findFirst({
      where: { id: classId, createdBy: sub },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
    if (!cls) return reply.status(404).send({ error: 'Không tìm thấy lớp' });

    const students = await Promise.all(
      cls.members.map(async m => {
        const [brain, la, streak] = await Promise.all([
          getBrain(m.user.id, subject),
          getLearningAnalytics(m.user.id).catch(() => ({
            chatCount: 0, quizCount: 0, homeworkCount: 0,
            voiceCount: 0, studyMinutes: 0, masteryHistory: [],
          })),
          getStreak(m.user.id).catch(() => ({ currentStreak: 0, bestStreak: 0, totalActiveDays: 0 })),
        ]);

        const masteryValues = Object.values(brain.mastery as Record<string, number>);
        const avgMastery = masteryValues.length
          ? Math.round((masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length) * 100)
          : 0;

        const weakTopics = Object.entries(brain.mastery as Record<string, number>)
          .filter(([, v]) => v < 0.5)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([k]) => k);

        const pendingTasks = await prisma.todo.count({
          where: { assignedToId: m.user.id, createdById: sub, status: { not: 'DONE' } },
        });

        return {
          ...m.user,
          avgMastery,
          weakTopics,
          level: brain.level,
          currentTopic: brain.topic,
          chatCount: la.chatCount,
          quizCount: la.quizCount,
          studyMinutes: la.studyMinutes,
          streak: streak.currentStreak,
          pendingTasks,
          isActive: la.chatCount + la.quizCount > 0 || streak.currentStreak > 0,
        };
      }),
    );

    return reply.send({
      class: { id: cls.id, name: cls.name },
      subject,
      students: students.sort((a, b) => b.avgMastery - a.avgMastery),
    });
  });
}
