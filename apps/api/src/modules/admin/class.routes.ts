import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAdmin } from '../../middleware/auth';

const createClassSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

const grantCourseSchema = z.object({
  courseIds: z.array(z.string()).min(1),
});

export async function classRoutes(app: FastifyInstance) {
  // ─── PUBLIC: list classes (for landing page) ──────────────
  app.get('/classes/public', async (req) => {
    const q = req.query as { limit?: string };
    const limit = Math.min(Number(q.limit) || 20, 50);
    return prisma.class.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, description: true, createdAt: true,
        creator: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });
  });

  // ─── LIST ─────────────────────────────────────────────────
  app.get('/classes', { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { page?: string; limit?: string; search?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.class.count({ where }),
    ]);
    return { classes, total, page, limit };
  });

  // ─── GET ONE ──────────────────────────────────────────────
  app.get('/classes/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.class.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        members: {
          orderBy: { joinedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
          },
        },
      },
    });
  });

  // ─── CREATE ───────────────────────────────────────────────
  app.post('/classes', { preHandler: requireAdmin }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createClassSchema.parse(req.body);
    const cls = await prisma.class.create({
      data: { ...body, createdBy: sub },
      include: { _count: { select: { members: true } } },
    });
    return reply.status(201).send(cls);
  });

  // ─── UPDATE ───────────────────────────────────────────────
  app.patch('/classes/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = createClassSchema.partial().parse(req.body);
    return prisma.class.update({
      where: { id },
      data: body,
      include: { _count: { select: { members: true } } },
    });
  });

  // ─── DELETE ───────────────────────────────────────────────
  app.delete('/classes/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.class.delete({ where: { id } });
    return { message: 'Đã xóa lớp học' };
  });

  // ─── ADD MEMBERS ──────────────────────────────────────────
  app.post('/classes/:id/members', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId } = req.params as { id: string };
    const { userIds } = addMembersSchema.parse(req.body);

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        prisma.classMember.upsert({
          where: { classId_userId: { classId, userId } },
          update: {},
          create: { classId, userId },
        }),
      ),
    );
    const added = results.filter((r) => r.status === 'fulfilled').length;
    return reply.status(201).send({ added, total: userIds.length });
  });

  // ─── BULK IMPORT MEMBERS BY EMAIL ────────────────────────
  app.post('/classes/:id/members/import', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId } = req.params as { id: string };
    const { emails } = z.object({
      emails: z.array(z.string().email()).min(1).max(500),
    }).parse(req.body);

    const normalized = emails.map((e) => e.toLowerCase().trim());
    const users: Array<{ id: string; email: string; name: string; role: string }> = await prisma.user.findMany({
      where: { email: { in: normalized } },
      select: { id: true, email: true, name: true, role: true },
    });

    const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const notFound = normalized.filter((e) => !foundEmails.has(e));

    const results = await Promise.allSettled(
      users.map(({ id: userId }) =>
        prisma.classMember.upsert({
          where: { classId_userId: { classId, userId } },
          update: {},
          create: { classId, userId },
        }),
      ),
    );
    const added = results.filter((r) => r.status === 'fulfilled').length;

    return reply.status(201).send({ total: emails.length, found: users.length, added, notFound, users });
  });

  // ─── REMOVE MEMBER ────────────────────────────────────────
  app.delete('/classes/:id/members/:userId', { preHandler: requireAdmin }, async (req) => {
    const { id: classId, userId } = req.params as { id: string; userId: string };
    await prisma.classMember.delete({
      where: { classId_userId: { classId, userId } },
    });
    return { message: 'Đã xóa thành viên' };
  });

  // ─── GRANT COURSES ────────────────────────────────────────
  // Cấp quyền toàn bộ lớp vào các khóa học
  app.post('/classes/:id/grant-courses', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId } = req.params as { id: string };
    const { courseIds } = grantCourseSchema.parse(req.body);

    // Lấy tất cả thành viên trong lớp
    const members: Array<{ userId: string }> = await prisma.classMember.findMany({
      where: { classId },
      select: { userId: true },
    });

    if (members.length === 0) {
      return reply.status(400).send({ error: 'Lớp học chưa có thành viên' });
    }

    let totalEnrolled = 0;
    for (const courseId of courseIds) {
      const results = await Promise.allSettled(
        members.map(({ userId }) =>
          prisma.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: { status: 'ACTIVE' },
            create: { userId, courseId, status: 'ACTIVE' },
          }),
        ),
      );
      const enrolled = results.filter((r) => r.status === 'fulfilled').length;
      totalEnrolled += enrolled;

      await prisma.course.update({
        where: { id: courseId },
        data: { totalStudents: { increment: enrolled } },
      });
    }

    return reply.status(201).send({
      classSize: members.length,
      courses: courseIds.length,
      totalEnrolled,
    });
  });

  // ─── LIST ENROLLABLE COURSES ──────────────────────────────
  app.get('/classes/:id/available-courses', { preHandler: requireAdmin }, async (req) => {
    const { id: classId } = req.params as { id: string };
    const members = await prisma.classMember.findMany({ where: { classId }, select: { userId: true } });
    const courses = await prisma.course.findMany({
      select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { title: 'asc' },
    });
    return { courses, classSize: members.length };
  });

  // ─── CLASS COURSES (direct link) ─────────────────────────

  // List courses linked to class
  app.get('/classes/:id/courses', { preHandler: requireAdmin }, async (req) => {
    const { id: classId } = req.params as { id: string };
    const items = await (prisma as any).classCourse.findMany({
      where: { classId },
      orderBy: { addedAt: 'asc' },
      include: {
        course: {
          select: { id: true, title: true, status: true, thumbnailUrl: true, _count: { select: { enrollments: true } } },
        },
      },
    });
    return items.map((i: any) => i.course);
  });

  // Add courses to class
  app.post('/classes/:id/courses', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId } = req.params as { id: string };
    const { courseIds } = z.object({ courseIds: z.array(z.string()).min(1) }).parse(req.body);
    const crypto = require('crypto');
    await prisma.$transaction(
      courseIds.map((courseId: string) =>
        (prisma as any).classCourse.upsert({
          where: { classId_courseId: { classId, courseId } },
          update: {},
          create: { id: crypto.randomUUID(), classId, courseId },
        }),
      ),
    );
    return reply.status(201).send({ added: courseIds.length });
  });

  // Remove course from class
  app.delete('/classes/:id/courses/:courseId', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId, courseId } = req.params as { id: string; courseId: string };
    await (prisma as any).classCourse.deleteMany({ where: { classId, courseId } });
    return reply.send({ ok: true });
  });

  // ─── CLASS MODULES ────────────────────────────────────────────────────────────

  async function resolveClassModuleContent(contentType: string, contentId: string): Promise<{ title: string; subtitle?: string }> {
    try {
      if (contentType === 'VOCAB_SET') {
        const r = await prisma.vocabSet.findUnique({ where: { id: contentId }, select: { title: true, language: true, _count: { select: { items: true } } } });
        return r ? { title: r.title, subtitle: `${r.language} · ${r._count.items} từ` } : { title: contentId };
      }
      if (contentType === 'LANG_EXERCISE') {
        const r = await prisma.langExercise.findUnique({ where: { id: contentId }, select: { title: true, type: true, _count: { select: { questions: true } } } });
        return r ? { title: r.title, subtitle: `${r.type} · ${r._count.questions} câu` } : { title: contentId };
      }
      if (contentType === 'MATH_TOPIC') {
        const r = await prisma.mathTopic.findUnique({ where: { id: contentId }, select: { title: true, subject: true, _count: { select: { concepts: true } } } });
        return r ? { title: r.title, subtitle: `${r.subject} · ${r._count.concepts} khái niệm` } : { title: contentId };
      }
      if (contentType === 'MATH_EXERCISE') {
        const r = await prisma.mathExercise.findUnique({ where: { id: contentId }, select: { title: true, type: true, _count: { select: { questions: true } } } });
        return r ? { title: r.title, subtitle: `${r.type} · ${r._count.questions} câu` } : { title: contentId };
      }
      if (contentType === 'VIET_SET') {
        const r = await prisma.vietSet.findUnique({ where: { id: contentId }, select: { title: true, category: true, _count: { select: { items: true } } } });
        return r ? { title: r.title, subtitle: `${r.category} · ${r._count.items} mục` } : { title: contentId };
      }
      if (contentType === 'VIET_EXERCISE') {
        const r = await prisma.vietExercise.findUnique({ where: { id: contentId }, select: { title: true, type: true, _count: { select: { questions: true } } } });
        return r ? { title: r.title, subtitle: `${r.type} · ${r._count.questions} câu` } : { title: contentId };
      }
    } catch {}
    return { title: contentId };
  }

  // List modules linked to a class
  app.get('/classes/:id/modules', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const links = await (prisma as any).classModule.findMany({
        where: { classId: id },
        orderBy: { addedAt: 'asc' },
      });
      const resolved = await Promise.all(
        links.map(async (link: any) => {
          const { title, subtitle } = await resolveClassModuleContent(link.contentType, link.contentId);
          return { id: link.id, contentType: link.contentType, contentId: link.contentId, addedAt: link.addedAt, title, subtitle };
        }),
      );
      return resolved;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Add module to class
  app.post('/classes/:id/modules', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { contentType, contentId } = z.object({
      contentType: z.enum(['VOCAB_SET', 'LANG_EXERCISE', 'MATH_TOPIC', 'MATH_EXERCISE', 'VIET_SET', 'VIET_EXERCISE']),
      contentId: z.string().min(1),
    }).parse(req.body);
    try {
      const crypto = require('crypto');
      const link = await (prisma as any).classModule.upsert({
        where: { classId_contentType_contentId: { classId: id, contentType, contentId } },
        update: {},
        create: { id: crypto.randomUUID(), classId: id, contentType, contentId },
      });
      const { title, subtitle } = await resolveClassModuleContent(contentType, contentId);
      return reply.status(201).send({ ...link, title, subtitle });
    } catch (e: any) {
      if (e.code === 'P2002') return reply.status(409).send({ error: 'Nội dung đã được liên kết' });
      return reply.status(500).send({ error: e.message });
    }
  });

  // Remove module from class
  app.delete('/classes/:id/modules/:linkId', { preHandler: requireAdmin }, async (req, reply) => {
    const { linkId } = req.params as { id: string; linkId: string };
    try {
      await (prisma as any).classModule.delete({ where: { id: linkId } });
      return { message: 'Đã gỡ liên kết' };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
