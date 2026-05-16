import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor, requireAdmin } from '../../middleware/auth';

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
  // Public: list courses
  app.get('/', async (req) => {
    const q = req.query as {
      page?: string; limit?: string; search?: string;
      categoryId?: string; level?: string; isFree?: string;
    };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 12, 50);
    const skip = (page - 1) * limit;

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

  // Public: get course by slug
  app.get('/:slug', async (req) => {
    const { slug } = req.params as { slug: string };
    return prisma.course.findUniqueOrThrow({
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
    });
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

  // Protected: create course
  app.post('/', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createCourseSchema.parse(req.body);
    const slug = slugify(body.title) + '-' + Date.now();

    const course = await prisma.course.create({
      data: { ...body, slug, instructorId: sub },
    });
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

    return prisma.course.update({ where: { id }, data: body });
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
    return reply.status(201).send(enrollment);
  });

  // Get categories
  app.get('/meta/categories', async () => {
    return prisma.category.findMany({
      where: { parentId: null },
      include: { children: true, _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  });
}
