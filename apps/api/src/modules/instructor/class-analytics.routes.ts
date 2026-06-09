/**
 * Instructor Class Analytics — Module 5 P2
 * GET /instructor/class-analytics — Class Performance + Weak Topics
 * Không sửa bất kỳ module hiện tại nào.
 */

import { FastifyInstance } from 'fastify';
import { requireInstructor } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';
import { getBrain } from '../../services/conversation-brain';

export async function classAnalyticsRoutes(app: FastifyInstance) {
  // GET /instructor/class-analytics?classId=<id>
  app.get('/class-analytics', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { classId?: string };

    // Lấy danh sách lớp do instructor tạo
    const classes = await prisma.class.findMany({
      where: { createdBy: sub },
      include: {
        members: { select: { userId: true } },
        courses: { select: { courseId: true } },
      },
    });

    if (classes.length === 0) {
      return reply.send({
        class: null,
        allClasses: [],
        summary: { totalStudents: 0, avgProgress: 0, avgQuizScore: null, enrolledCourses: 0 },
        students: [],
        weakTopics: [],
      });
    }

    const targetClass = q.classId
      ? classes.find(c => c.id === q.classId)
      : classes[0];

    if (!targetClass) {
      return reply.status(404).send({ error: 'Không tìm thấy lớp' });
    }

    const memberIds = targetClass.members.map(m => m.userId);
    const courseIds = targetClass.courses.map(c => c.courseId);

    // Course progress via Enrollment
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: { in: memberIds }, courseId: { in: courseIds } },
      select: { userId: true, courseId: true, progress: true, status: true },
    });

    // Lesson completions — Lesson → Section → Course
    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: {
        userId: { in: memberIds },
        lesson: { section: { courseId: { in: courseIds } } },
      },
      select: { userId: true, isCompleted: true, watchTime: true },
    });

    // Quiz attempts
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, score: true },
    });

    // Per-student stats
    const studentStats = await Promise.all(
      memberIds.map(async userId => {
        const userEnrollments = enrollments.filter(e => e.userId === userId);
        const avgProgress = userEnrollments.length
          ? Math.round(userEnrollments.reduce((s, e) => s + e.progress, 0) / userEnrollments.length)
          : 0;

        const completedLessons = lessonProgresses.filter(lp => lp.userId === userId && lp.isCompleted).length;
        const totalLessons = lessonProgresses.filter(lp => lp.userId === userId).length;

        const userQuizzes = quizAttempts.filter(a => a.userId === userId);
        const quizAvg = userQuizzes.length
          ? Math.round(userQuizzes.reduce((s, a) => s + a.score, 0) / userQuizzes.length)
          : null;

        // Analytics from Redis for weak topics
        let weakTopics: string[] = [];
        try {
          const brain = await getBrain(userId, 'general');
          const masteryMap = brain.mastery as Record<string, number>;
          weakTopics = Object.entries(masteryMap)
            .filter(([, v]) => v < 0.5)
            .sort(([, a], [, b]) => a - b)
            .slice(0, 3)
            .map(([k]) => k);
        } catch { /* skip */ }

        return { userId, avgProgress, completedLessons, totalLessons, quizAvg, weakTopics };
      }),
    );

    // Class-level aggregates
    const classProgress = studentStats.length
      ? Math.round(studentStats.reduce((s, st) => s + st.avgProgress, 0) / studentStats.length)
      : 0;

    const classQuizAvg = studentStats.filter(st => st.quizAvg !== null).length
      ? Math.round(
          studentStats.filter(st => st.quizAvg !== null).reduce((s, st) => s + (st.quizAvg ?? 0), 0) /
          studentStats.filter(st => st.quizAvg !== null).length,
        )
      : null;

    // Aggregate weak topics across class
    const allWeakTopics = studentStats.flatMap(st => st.weakTopics);
    const weakTopicFreq: Record<string, number> = {};
    for (const topic of allWeakTopics) {
      weakTopicFreq[topic] = (weakTopicFreq[topic] ?? 0) + 1;
    }
    const topWeakTopics = Object.entries(weakTopicFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, affectedStudents: count }));

    return reply.send({
      class: { id: targetClass.id, name: targetClass.name },
      allClasses: classes.map(c => ({ id: c.id, name: c.name, memberCount: c.members.length })),
      summary: {
        totalStudents: memberIds.length,
        avgProgress: classProgress,
        avgQuizScore: classQuizAvg,
        enrolledCourses: courseIds.length,
      },
      students: studentStats,
      weakTopics: topWeakTopics,
    });
  });

  // GET /instructor/classes/list — danh sách lớp của instructor
  app.get('/classes/list', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const classes = await prisma.class.findMany({
      where: { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, description: true, createdAt: true,
        _count: { select: { members: true, courses: true } },
      },
    });
    return reply.send(classes);
  });

  // POST /instructor/classes — tạo lớp mới
  app.post('/classes', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) return reply.status(400).send({ error: 'Tên lớp không được trống' });
    const cls = await prisma.class.create({
      data: { name: name.trim(), description: description?.trim() || null, createdBy: sub },
    });
    return reply.status(201).send(cls);
  });

  // DELETE /instructor/classes/:classId — xoá lớp
  app.delete('/classes/:classId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { classId } = req.params as { classId: string };
    const cls = await prisma.class.findFirst({ where: { id: classId, createdBy: sub } });
    if (!cls) return reply.status(404).send({ error: 'Không tìm thấy lớp' });
    await prisma.classMember.deleteMany({ where: { classId } });
    await prisma.class.delete({ where: { id: classId } });
    return reply.send({ ok: true });
  });

  // POST /instructor/classes/:classId/members — thêm học sinh vào lớp (theo email)
  app.post('/classes/:classId/members', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { classId } = req.params as { classId: string };
    const { emails } = req.body as { emails?: string[] };

    const cls = await prisma.class.findFirst({ where: { id: classId, createdBy: sub } });
    if (!cls) return reply.status(404).send({ error: 'Không tìm thấy lớp' });
    if (!emails?.length) return reply.status(400).send({ error: 'Danh sách email trống' });

    const users = await prisma.user.findMany({
      where: { email: { in: emails.map(e => e.trim().toLowerCase()) } },
      select: { id: true, email: true, name: true },
    });

    const existing = await prisma.classMember.findMany({
      where: { classId, userId: { in: users.map(u => u.id) } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map(m => m.userId));
    const toAdd = users.filter(u => !existingIds.has(u.id));

    if (toAdd.length > 0) {
      await prisma.classMember.createMany({
        data: toAdd.map(u => ({ classId, userId: u.id })),
        skipDuplicates: true,
      });
    }

    const notFound = emails.filter(e => !users.find(u => u.email === e.trim().toLowerCase()));
    return reply.send({
      added: toAdd.length,
      alreadyIn: existing.length,
      notFound,
      users: toAdd,
    });
  });

  // GET /instructor/class-analytics/performance — phân phối điểm
  app.get('/class-analytics/performance', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { classId?: string };

    const classes = await prisma.class.findMany({
      where: { createdBy: sub },
      include: { members: { select: { userId: true } } },
    });

    const targetClass = q.classId
      ? classes.find(c => c.id === q.classId)
      : classes[0];

    if (!targetClass) {
      return reply.status(404).send({ error: 'Không tìm thấy lớp' });
    }

    const memberIds = targetClass.members.map(m => m.userId);
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, score: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Score distribution buckets: 0-59, 60-69, 70-79, 80-89, 90-100
    const buckets = [
      { label: '0–59', min: 0, max: 59, count: 0 },
      { label: '60–69', min: 60, max: 69, count: 0 },
      { label: '70–79', min: 70, max: 79, count: 0 },
      { label: '80–89', min: 80, max: 89, count: 0 },
      { label: '90–100', min: 90, max: 100, count: 0 },
    ];

    for (const attempt of quizAttempts) {
      const bucket = buckets.find(b => attempt.score >= b.min && attempt.score <= b.max);
      if (bucket) bucket.count += 1;
    }

    return reply.send({
      class: { id: targetClass.id, name: targetClass.name },
      distribution: buckets,
      totalAttempts: quizAttempts.length,
      avgScore: quizAttempts.length
        ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length)
        : null,
    });
  });
}
