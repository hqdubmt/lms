import { FastifyInstance } from 'fastify';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';

export async function announcementRoutes(app: FastifyInstance) {
  // List announcements visible to current user
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { topic } = req.query as { topic?: string };

    let where: any = {};

    if (role === 'ADMIN') {
      // admin sees all
    } else if (role === 'INSTRUCTOR') {
      // instructors see global + their own
      where.OR = [
        { topic: { in: ['SYSTEM', 'GENERAL', 'EVENT'] } },
        { authorId: sub },
      ];
    } else {
      // students: global + courses they're enrolled in + classes they're in
      const [enrollments, memberships] = await Promise.all([
        prisma.enrollment.findMany({ where: { userId: sub }, select: { courseId: true } }),
        prisma.classMember.findMany({ where: { userId: sub }, select: { classId: true } }),
      ]);
      const orClauses: any[] = [{ topic: { in: ['SYSTEM', 'GENERAL', 'EVENT'] } }];
      if (enrollments.length) {
        orClauses.push({ topic: 'COURSE', courseId: { in: enrollments.map((e) => e.courseId) } });
      }
      if (memberships.length) {
        orClauses.push({ topic: 'CLASS', classId: { in: memberships.map((m) => m.classId) } });
      }
      where.OR = orClauses;
    }

    if (topic && ['SYSTEM', 'COURSE', 'CLASS', 'EVENT', 'GENERAL'].includes(topic)) {
      if (where.OR) {
        where = { AND: [where, { topic }] };
      } else {
        where.topic = topic;
      }
    }

    const items = await prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        course:  { select: { id: true, title: true } },
        class:   { select: { id: true, name: true } },
        reads:   { where: { userId: sub }, select: { readAt: true } },
        _count:  { select: { reads: true } },
      },
    });

    return items.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
      reads: undefined,
    }));
  });

  // Unread count for badge
  app.get('/unread-count', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };

    let where: any = {};
    if (role !== 'ADMIN') {
      const [enrollments, memberships] = await Promise.all([
        prisma.enrollment.findMany({ where: { userId: sub }, select: { courseId: true } }),
        prisma.classMember.findMany({ where: { userId: sub }, select: { classId: true } }),
      ]);
      const orClauses: any[] = [{ topic: { in: ['SYSTEM', 'GENERAL', 'EVENT'] } }];
      if (enrollments.length)
        orClauses.push({ topic: 'COURSE', courseId: { in: enrollments.map((e) => e.courseId) } });
      if (memberships.length)
        orClauses.push({ topic: 'CLASS', classId: { in: memberships.map((m) => m.classId) } });
      where.OR = orClauses;
    }
    where.reads = { none: { userId: sub } };

    const count = await prisma.announcement.count({ where });
    return { count };
  });

  // Create announcement
  app.post('/', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { title, content, topic, courseId, classId, isPinned } = req.body as {
      title: string; content: string; topic?: string;
      courseId?: string; classId?: string; isPinned?: boolean;
    };

    if (!title?.trim() || !content?.trim())
      return reply.status(400).send({ error: 'Tiêu đề và nội dung không được để trống' });

    const resolvedTopic = (['SYSTEM', 'COURSE', 'CLASS', 'EVENT', 'GENERAL'].includes(topic || '')
      ? topic : 'GENERAL') as any;

    // Only admin can post SYSTEM announcements
    if (resolvedTopic === 'SYSTEM' && role !== 'ADMIN')
      return reply.status(403).send({ error: 'Chỉ admin mới có thể đăng thông báo hệ thống' });

    return prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        topic: resolvedTopic,
        authorId: sub,
        courseId: resolvedTopic === 'COURSE' ? courseId || null : null,
        classId:  resolvedTopic === 'CLASS'  ? classId  || null : null,
        isPinned: isPinned || false,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  });

  // Mark as read
  app.post('/:id/read', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: sub } },
      create: { announcementId: id, userId: sub },
      update: { readAt: new Date() },
    });
    return { ok: true };
  });

  // Mark all as read
  app.post('/read-all', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    let where: any = {};
    if (role !== 'ADMIN') {
      const [enrollments, memberships] = await Promise.all([
        prisma.enrollment.findMany({ where: { userId: sub }, select: { courseId: true } }),
        prisma.classMember.findMany({ where: { userId: sub }, select: { classId: true } }),
      ]);
      const orClauses: any[] = [{ topic: { in: ['SYSTEM', 'GENERAL', 'EVENT'] } }];
      if (enrollments.length)
        orClauses.push({ topic: 'COURSE', courseId: { in: enrollments.map((e) => e.courseId) } });
      if (memberships.length)
        orClauses.push({ topic: 'CLASS', classId: { in: memberships.map((m) => m.classId) } });
      where.OR = orClauses;
    }
    where.reads = { none: { userId: sub } };
    const unread = await prisma.announcement.findMany({ where, select: { id: true } });
    await prisma.announcementRead.createMany({
      data: unread.map((a) => ({ announcementId: a.id, userId: sub })),
      skipDuplicates: true,
    });
    return { marked: unread.length };
  });

  // Update announcement
  app.patch('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const { title, content, topic, courseId, classId, isPinned } = req.body as any;

    const item = await prisma.announcement.findUnique({ where: { id } });
    if (!item) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && item.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });

    return prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(content && { content: content.trim() }),
        ...(topic && { topic }),
        ...(courseId !== undefined && { courseId }),
        ...(classId !== undefined && { classId }),
        ...(isPinned !== undefined && { isPinned }),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  });

  // Delete announcement
  app.delete('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const item = await prisma.announcement.findUnique({ where: { id } });
    if (!item) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && item.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    await prisma.announcement.delete({ where: { id } });
    return { ok: true };
  });
}
