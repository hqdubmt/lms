import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor, requireAdmin } from '../../middleware/auth';
import { Message } from '../../services/mongo';
import { extractText, structureWithAI } from '../../services/file-import';
import { getOrSet, cacheDel, cacheDelPattern } from '../../services/cache';

const createCourseSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  price: z.number().min(0).default(0),
  language: z.string().default('vi'),
  tags: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
});

const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  thumbnailUrl: z.string().url().optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function coursesRoutes(app: FastifyInstance) {
  // Instructor: get own courses (incl. DRAFT)
  app.get('/mine', { preHandler: requireInstructor }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.course.findMany({
      where: { instructorId: sub },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        _count: { select: { enrollments: true, sections: true } },
      },
    });
  });

  // Public: list courses
  app.get('/', async (req) => {
    const q = req.query as {
      page?: string; limit?: string; search?: string;
      categoryId?: string; level?: string; isFree?: string;
    };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const cacheKey = `c:list:${page}:${limit}:${q.search || ''}:${q.categoryId || ''}:${q.level || ''}:${q.isFree || ''}`;

    return getOrSet(cacheKey, 120, async () => {
      const where: any = { status: 'PUBLISHED' };
      if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
      if (q.categoryId) where.categoryId = q.categoryId;
      if (q.level) where.level = q.level;
      if (q.isFree === 'true') where.isFree = true;

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where, skip, take: limit,
          orderBy: { publishedAt: 'desc' },
          include: {
            instructor: { select: { name: true, avatarUrl: true } },
            category: { select: { name: true, slug: true } },
            _count: { select: { enrollments: true } },
          },
        }),
        prisma.course.count({ where }),
      ]);

      return { courses, total, page, limit };
    });
  });

  // Public: get course by slug
  app.get('/:slug', async (req) => {
    const { slug } = req.params as { slug: string };
    return getOrSet(`c:detail:${slug}`, 300, () =>
      prisma.course.findUniqueOrThrow({
        where: { slug },
        include: {
          instructor: { select: { id: true, name: true, avatarUrl: true, bio: true } },
          category: { select: { name: true, slug: true } },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, slug: true, type: true, order: true, isFree: true, videoDuration: true },
              },
            },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
          _count: { select: { enrollments: true, reviews: true } },
        },
      })
    );
  });

  // Public: get live sessions for a course (slug)
  app.get('/:slug/sessions', async (req) => {
    const { slug } = req.params as { slug: string };
    const course = await prisma.course.findUniqueOrThrow({ where: { slug }, select: { id: true } });
    return prisma.liveSession.findMany({
      where: { courseId: course.id, status: { in: ['SCHEDULED', 'LIVE'] } },
      orderBy: { startTime: 'asc' },
      select: {
        id: true, title: true, description: true,
        startTime: true, endTime: true, meetLink: true, status: true,
        creator: { select: { name: true } },
      },
    });
  });

  // Instructor: create live session for own course
  app.post('/:id/sessions', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };
    const { title, description, startTime, endTime, meetLink } = req.body as {
      title: string; description?: string;
      startTime: string; endTime: string; meetLink: string;
    };
    const course = await prisma.course.findUniqueOrThrow({ where: { id }, select: { instructorId: true } });
    if (course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    const session = await prisma.liveSession.create({
      data: {
        title, description, meetLink,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        courseId: id,
        createdBy: sub,
        status: 'SCHEDULED',
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.status(201).send(session);
  });

  // Instructor: update own live session
  app.patch('/sessions/:sessionId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { title?: string; description?: string; startTime?: string; endTime?: string; meetLink?: string; status?: string };
    const session = await prisma.liveSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { course: { select: { instructorId: true } } },
    });
    if (session.course?.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    const data: any = { ...body };
    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime) data.endTime = new Date(body.endTime);
    return prisma.liveSession.update({ where: { id: sessionId }, data });
  });

  // Instructor: delete own live session
  app.delete('/sessions/:sessionId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { sessionId } = req.params as { sessionId: string };
    const session = await prisma.liveSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { course: { select: { instructorId: true } } },
    });
    if (session.course?.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    await prisma.liveSession.delete({ where: { id: sessionId } });
    return { message: 'Đã xóa buổi học' };
  });

  // Protected: create course
  app.post('/', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createCourseSchema.parse(req.body);
    const slug = slugify(body.title) + '-' + Date.now();

    const course = await prisma.course.create({
      data: { ...body, slug, instructorId: sub },
      include: {
        category: { select: { name: true } },
        _count: { select: { enrollments: true, sections: true } },
      },
    });
    await cacheDelPattern('c:list:*');
    return reply.status(201).send(course);
  });

  // Protected: update course
  app.patch('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };
    const body = updateCourseSchema.parse(req.body);

    const course = await prisma.course.findUniqueOrThrow({ where: { id } });
    if (course.instructorId !== sub && role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const updated = await prisma.course.update({ where: { id }, data: body });
    await Promise.all([
      cacheDel(`c:detail:${course.slug}`),
      cacheDelPattern('c:list:*'),
    ]);
    return updated;
  });

  // Protected: delete course
  app.delete('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };

    const course = await prisma.course.findUniqueOrThrow({ where: { id } });
    if (course.instructorId !== sub && role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await prisma.course.delete({ where: { id } });
    await Promise.all([
      cacheDel(`c:detail:${course.slug}`),
      cacheDelPattern('c:list:*'),
    ]);
    return { message: 'Khóa học đã bị xóa' };
  });

  // Protected: enroll
  app.post('/:id/enroll', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const course = await prisma.course.findUniqueOrThrow({ where: { id } });

    if (course.price.gt(0) && !course.isFree) {
      return reply.status(402).send({ error: 'Khóa học này cần thanh toán' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: sub, courseId: id } },
    });
    if (existing) return reply.status(409).send({ error: 'Đã đăng ký khóa học này' });

    const enrollment = await prisma.enrollment.create({
      data: { userId: sub, courseId: id },
    });

    await prisma.course.update({ where: { id }, data: { totalStudents: { increment: 1 } } });
    // Invalidate course detail cache (enrollment count changed)
    await cacheDel(`c:detail:${course.slug}`);
    return reply.status(201).send(enrollment);
  });

  // Instructor: get full course detail (sections + lessons) for management
  app.get('/:id/manage', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };
    const course = await prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (course.instructorId !== sub && role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return course;
  });

  // Instructor: create section
  app.post('/:id/sections', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };
    const { title, order } = req.body as { title: string; order?: number };
    const course = await prisma.course.findUniqueOrThrow({ where: { id }, select: { instructorId: true } });
    if (course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    const section = await prisma.section.create({ data: { title, order: order ?? 0, courseId: id } });
    return reply.status(201).send(section);
  });

  // Instructor: update section
  app.patch('/sections/:sectionId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { sectionId } = req.params as { sectionId: string };
    const body = req.body as { title?: string; order?: number };
    const section = await prisma.section.findUniqueOrThrow({
      where: { id: sectionId },
      include: { course: { select: { instructorId: true } } },
    });
    if (section.course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    return prisma.section.update({ where: { id: sectionId }, data: body });
  });

  // Instructor: delete section
  app.delete('/sections/:sectionId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { sectionId } = req.params as { sectionId: string };
    const section = await prisma.section.findUniqueOrThrow({
      where: { id: sectionId },
      include: { course: { select: { instructorId: true } } },
    });
    if (section.course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    await prisma.section.delete({ where: { id: sectionId } });
    return { message: 'Đã xóa chương' };
  });

  // Instructor: create lesson in section
  app.post('/sections/:sectionId/lessons', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { sectionId } = req.params as { sectionId: string };
    const { title, type, order, isFree } = req.body as { title: string; type?: 'VIDEO' | 'TEXT' | 'LIVE'; order?: number; isFree?: boolean };
    const section = await prisma.section.findUniqueOrThrow({
      where: { id: sectionId },
      include: { course: { select: { instructorId: true, id: true } } },
    });
    if (section.course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    const lessonSlug = slugify(title) + '-' + Date.now();
    const lesson = await prisma.lesson.create({
      data: { title, slug: lessonSlug, type: type ?? 'VIDEO', order: order ?? 0, isFree: isFree ?? false, sectionId },
    });
    const count = await prisma.lesson.count({ where: { section: { courseId: section.course.id } } });
    await prisma.course.update({ where: { id: section.course.id }, data: { totalLessons: count } });
    return reply.status(201).send(lesson);
  });

  // Instructor: update lesson
  app.patch('/lessons/:lessonId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { lessonId } = req.params as { lessonId: string };
    const { type, ...rest } = req.body as { title?: string; type?: 'VIDEO' | 'TEXT' | 'LIVE'; order?: number; isFree?: boolean; isPublished?: boolean; textContent?: string; description?: string };
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { section: { include: { course: { select: { instructorId: true } } } } },
    });
    if (lesson.section.course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    return prisma.lesson.update({ where: { id: lessonId }, data: { ...rest, ...(type ? { type } : {}) } });
  });

  // Instructor: delete lesson
  app.delete('/lessons/:lessonId', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { lessonId } = req.params as { lessonId: string };
    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { section: { include: { course: { select: { instructorId: true, id: true } } } } },
    });
    if (lesson.section.course.instructorId !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Forbidden' });
    await prisma.lesson.delete({ where: { id: lessonId } });
    const count = await prisma.lesson.count({ where: { section: { courseId: lesson.section.course.id } } });
    await prisma.course.update({ where: { id: lesson.section.course.id }, data: { totalLessons: count } });
    return { message: 'Đã xóa bài học' };
  });

  // ─── COURSE CHAT ─────────────────────────────────────────────────────────

  // Get chat history (enrolled students + instructor/admin)
  app.get('/:id/chat', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { before } = req.query as { before?: string };
    const { sub, role } = req.user as { sub: string; role: string };

    if (!['ADMIN', 'INSTRUCTOR'].includes(role)) {
      const course = await prisma.course.findUnique({ where: { id }, select: { instructorId: true } });
      if (course?.instructorId !== sub) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { userId: sub, courseId: id, status: 'ACTIVE' },
        });
        if (!enrollment) return reply.status(403).send({ error: 'Không có quyền truy cập' });
      }
    }

    const query: Record<string, any> = { roomId: `course:${id}` };
    if (before) query.createdAt = { $lt: new Date(before) };

    const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return msgs.reverse();
  });

  // Delete a message (instructor of this course or admin)
  app.delete('/:id/chat/:messageId', { preHandler: requireInstructor }, async (req, reply) => {
    const { id, messageId } = req.params as { id: string; messageId: string };
    const { sub, role } = req.user as { sub: string; role: string };

    if (role !== 'ADMIN') {
      const course = await prisma.course.findUnique({ where: { id }, select: { instructorId: true } });
      if (course?.instructorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    }

    await Message.deleteOne({ _id: messageId, roomId: `course:${id}` });
    return { message: 'Đã xóa tin nhắn' };
  });

  // ─── IMPORT FROM FILE ────────────────────────────────────────────────────────

  app.post('/:id/import-file', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };

    const course = await prisma.course.findUniqueOrThrow({
      where: { id },
      select: { instructorId: true, title: true },
    });
    if (course.instructorId !== sub && role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const file = await req.file();
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (!allowedMimes.includes(file.mimetype) && !['pdf', 'docx', 'txt', 'md'].includes(ext || '')) {
      return reply.status(400).send({ error: 'Chỉ hỗ trợ PDF, DOCX, TXT, MD' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 20 * 1024 * 1024) {
      return reply.status(400).send({ error: 'File tối đa 20MB' });
    }

    const text = await extractText(buffer, file.mimetype, file.filename);
    if (!text.trim()) return reply.status(400).send({ error: 'Không đọc được nội dung file' });

    const sections = await structureWithAI(text, course.title);

    // Persist sections + lessons into DB
    const maxOrder = await prisma.section.aggregate({ where: { courseId: id }, _max: { order: true } });
    let sectionOrder = (maxOrder._max.order ?? -1) + 1;

    const created = [];
    for (const sec of sections) {
      const dbSection = await prisma.section.create({
        data: { title: sec.title, order: sectionOrder++, courseId: id },
      });
      const lessons = [];
      let lessonOrder = 0;
      for (const les of sec.lessons) {
        const lessonSlug = slugify(les.title) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const dbLesson = await prisma.lesson.create({
          data: {
            title: les.title,
            slug: lessonSlug,
            type: les.type || 'TEXT',
            order: lessonOrder++,
            sectionId: dbSection.id,
            textContent: les.textContent || '',
            isFree: false,
            isPublished: false,
          },
        });
        lessons.push(dbLesson);
      }
      created.push({ ...dbSection, lessons });
    }

    // Update totalLessons
    const count = await prisma.lesson.count({ where: { section: { courseId: id } } });
    await prisma.course.update({ where: { id }, data: { totalLessons: count } });

    return reply.status(201).send({ sections: created, totalLessons: count });
  });

  // Get categories
  app.get('/meta/categories', async () => {
    return getOrSet('c:categories', 3600, () =>
      prisma.category.findMany({
        where: { parentId: null },
        include: { children: true, _count: { select: { courses: true } } },
        orderBy: { name: 'asc' },
      })
    );
  });
}
