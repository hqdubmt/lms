import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';
import { prisma } from '../../services/prisma';
import { requireAdmin } from '../../middleware/auth';
import { minioClient } from '../../services/minio';
import { env } from '../../config/env';

// ─── helpers ───────────────────────────────────────────────
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

// ─── schemas ───────────────────────────────────────────────
const createCourseSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  instructorId: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  price: z.coerce.number().min(0).default(0),
  isFree: z.boolean().default(false),
  language: z.string().default('vi'),
  tags: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

const updateCourseSchema = createCourseSchema.partial();

const createSectionSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(1),
});

const createLessonSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LIVE']).default('VIDEO'),
  order: z.number().int().min(1),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  description: z.string().optional(),
  textContent: z.string().optional(),
  videoDuration: z.number().optional(),
  videoKey: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

const bulkEnrollSchema = z.object({
  courseId: z.string(),
  userIds: z.array(z.string()).min(1),
});

export async function adminRoutes(app: FastifyInstance) {
  // ─── STATS ────────────────────────────────────────────────
  app.get('/stats', { preHandler: requireAdmin }, async () => {
    const [totalStudents, totalInstructors, totalCourses, totalEnrollments, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
    ]);
    return { totalStudents, totalInstructors, totalCourses, totalEnrollments, totalRevenue: totalRevenue._sum.amount || 0 };
  });

  app.get('/module-stats', { preHandler: requireAdmin }, async () => {
    const [
      mathTopics, mathExercises, mathUsers, mathAttempts,
      vietSets, vietExercises, vietUsers, vietAttempts,
      langSets, langExercises,
    ] = await Promise.all([
      prisma.mathTopic.count(),
      prisma.mathExercise.count(),
      prisma.mathUserStats.count(),
      prisma.mathAttempt.count(),
      prisma.vietSet.count(),
      prisma.vietExercise.count(),
      prisma.vietUserStats.count(),
      prisma.vietAttempt.count(),
      prisma.vocabSet.count(),
      prisma.langExercise.count(),
    ]);
    return {
      math: { topics: mathTopics, exercises: mathExercises, users: mathUsers, attempts: mathAttempts },
      viet: { sets: vietSets, exercises: vietExercises, users: vietUsers, attempts: vietAttempts },
      language: { sets: langSets, exercises: langExercises },
    };
  });

  // ─── COURSES ──────────────────────────────────────────────
  app.get('/courses', { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { page?: string; limit?: string; search?: string; status?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.status) where.status = q.status;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, sections: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);
    return { courses, total, page, limit };
  });

  app.get('/courses/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.course.findUniqueOrThrow({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
  });

  app.post('/courses', { preHandler: requireAdmin }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createCourseSchema.parse(req.body);
    const slug = slugify(body.title) + '-' + Date.now();
    const instructorId = body.instructorId || sub;

    const course = await prisma.course.create({
      data: {
        ...body,
        slug,
        instructorId,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : undefined,
      },
      include: { instructor: { select: { name: true } } },
    });
    return reply.status(201).send(course);
  });

  app.patch('/courses/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = updateCourseSchema.parse(req.body);

    const current = await prisma.course.findUniqueOrThrow({ where: { id } });
    const publishedAt =
      body.status === 'PUBLISHED' && current.status !== 'PUBLISHED'
        ? new Date()
        : current.publishedAt;

    return prisma.course.update({
      where: { id },
      data: { ...body, publishedAt },
      include: { instructor: { select: { name: true } }, category: { select: { name: true } } },
    });
  });

  app.delete('/courses/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.course.delete({ where: { id } });
    return { message: 'Đã xóa khóa học' };
  });

  // ─── SECTIONS ─────────────────────────────────────────────
  app.post('/courses/:courseId/sections', { preHandler: requireAdmin }, async (req, reply) => {
    const { courseId } = req.params as { courseId: string };
    const body = createSectionSchema.parse(req.body);
    const section = await prisma.section.create({ data: { ...body, courseId } });
    return reply.status(201).send(section);
  });

  app.patch('/sections/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = createSectionSchema.partial().parse(req.body);
    return prisma.section.update({ where: { id }, data: body });
  });

  app.delete('/sections/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.section.delete({ where: { id } });
    return { message: 'Đã xóa chương' };
  });

  // ─── LESSONS ──────────────────────────────────────────────
  app.post('/sections/:sectionId/lessons', { preHandler: requireAdmin }, async (req, reply) => {
    const { sectionId } = req.params as { sectionId: string };
    const body = createLessonSchema.parse(req.body);
    const slug = slugify(body.title) + '-' + Date.now();
    const lesson = await prisma.lesson.create({ data: { ...body, slug, sectionId } });

    // Update totalLessons on course
    const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } });
    const count = await prisma.lesson.count({ where: { section: { courseId: section.courseId } } });
    await prisma.course.update({ where: { id: section.courseId }, data: { totalLessons: count } });

    return reply.status(201).send(lesson);
  });

  app.patch('/lessons/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = createLessonSchema.partial().parse(req.body);
    return prisma.lesson.update({ where: { id }, data: body });
  });

  app.delete('/lessons/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const lesson = await prisma.lesson.findUnique({ where: { id }, include: { section: true } });
    if (!lesson) return reply.status(404).send({ error: 'Không tìm thấy bài học' });

    // Xóa video trong MinIO nếu có
    if (lesson.videoKey) {
      try { await minioClient.removeObject(env.MINIO_BUCKET_VIDEOS, lesson.videoKey); } catch { }
    }

    await prisma.lesson.delete({ where: { id } });

    const count = await prisma.lesson.count({ where: { section: { courseId: lesson.section.courseId } } });
    await prisma.course.update({ where: { id: lesson.section.courseId }, data: { totalLessons: count } });
    return { message: 'Đã xóa bài học' };
  });

  // Upload video for a lesson
  app.post('/lessons/:id/upload-video', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowed.includes(data.mimetype)) {
      data.file.resume();
      return reply.status(400).send({ error: 'Chỉ chấp nhận file video (mp4, webm, mov, avi)' });
    }

    const ext = path.extname(data.filename || 'video.mp4').toLowerCase() || '.mp4';
    const key = `lessons/${id}/${crypto.randomBytes(8).toString('hex')}${ext}`;

    // Stream directly to MinIO
    await minioClient.putObject(env.MINIO_BUCKET_VIDEOS, key, data.file, undefined, {
      'Content-Type': data.mimetype,
    });

    await prisma.lesson.update({ where: { id }, data: { videoKey: key } });
    return { key, message: 'Upload thành công' };
  });

  // Delete video of a lesson
  app.delete('/lessons/:id/video', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id } });
    if (lesson.videoKey) {
      try { await minioClient.removeObject(env.MINIO_BUCKET_VIDEOS, lesson.videoKey); } catch { }
    }
    await prisma.lesson.update({ where: { id }, data: { videoKey: null, videoDuration: null } });
    return { message: 'Đã xóa video' };
  });

  // ─── ENROLLMENTS ──────────────────────────────────────────
  // List students in a course
  app.get('/courses/:courseId/enrollments', { preHandler: requireAdmin }, async (req) => {
    const { courseId } = req.params as { courseId: string };
    const q = req.query as { page?: string; limit?: string; search?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { courseId };
    if (q.search) {
      where.user = {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ]
      };
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where, skip, take: limit,
        orderBy: { enrolledAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
      }),
      prisma.enrollment.count({ where }),
    ]);
    return { enrollments, total, page, limit };
  });

  // Enroll one or more students into a course
  app.post('/enrollments', { preHandler: requireAdmin }, async (req, reply) => {
    const { courseId, userIds } = bulkEnrollSchema.parse(req.body);

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: { status: 'ACTIVE' },
          create: { userId, courseId, status: 'ACTIVE' },
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    await prisma.course.update({
      where: { id: courseId },
      data: { totalStudents: { increment: succeeded } },
    });

    return reply.status(201).send({ enrolled: succeeded, total: userIds.length });
  });

  // Bulk enroll by email
  app.post('/enrollments/import', { preHandler: requireAdmin }, async (req, reply) => {
    const { courseId, emails } = z.object({
      courseId: z.string(),
      emails: z.array(z.string().email()).min(1).max(500),
    }).parse(req.body);

    const normalized = emails.map((e) => e.toLowerCase().trim());
    const users: Array<{ id: string; email: string; name: string }> = await prisma.user.findMany({
      where: { email: { in: normalized } },
      select: { id: true, email: true, name: true },
    });
    const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const notFound = normalized.filter((e) => !foundEmails.has(e));

    const results = await Promise.allSettled(
      users.map(({ id: userId }) =>
        prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: { status: 'ACTIVE' },
          create: { userId, courseId, status: 'ACTIVE' },
        }),
      ),
    );

    const added = results.filter((r) => r.status === 'fulfilled').length;
    if (added > 0) {
      await prisma.course.update({ where: { id: courseId }, data: { totalStudents: { increment: added } } });
    }

    return reply.status(201).send({ total: emails.length, found: users.length, added, notFound, users });
  });

  // Remove enrollment
  app.delete('/enrollments/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id } });
    await prisma.enrollment.delete({ where: { id } });
    await prisma.course.update({
      where: { id: enrollment.courseId },
      data: { totalStudents: { decrement: 1 } },
    });
    return { message: 'Đã xóa đăng ký' };
  });

  // Update enrollment status
  app.patch('/enrollments/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: string };
    return prisma.enrollment.update({ where: { id }, data: { status: status as any } });
  });

  // ─── USERS ────────────────────────────────────────────────
  app.get('/users', { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { page?: string; limit?: string; search?: string; role?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.role) where.role = q.role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true,
          isActive: true, isVerified: true, createdAt: true,
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  });

  app.get('/users/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, name: true, email: true, username: true, role: true,
        isActive: true, isVerified: true, avatarUrl: true, bio: true, createdAt: true,
        enrollments: {
          include: { course: { select: { id: true, title: true, slug: true, status: true } } },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });
    return user;
  });

  // Create user
  app.post('/users', { preHandler: requireAdmin }, async (req, reply) => {
    const body = z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).default('STUDENT'),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.status(409).send({ error: 'Email đã tồn tại' });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        isVerified: true,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true, _count: { select: { enrollments: true } } },
    });
    return reply.status(201).send(user);
  });

  // Bulk create users (CSV rows parsed on client, sent as JSON array)
  app.post('/users/bulk', { preHandler: requireAdmin }, async (req, reply) => {
    const bodySchema = z.object({
      users: z.array(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).default('STUDENT'),
      })).min(1).max(500),
    });
    const { users } = bodySchema.parse(req.body);

    const results: { email: string; status: 'created' | 'skipped'; reason?: string }[] = [];

    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        results.push({ email: u.email, status: 'skipped', reason: 'Email đã tồn tại' });
        continue;
      }
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: { name: u.name, email: u.email, passwordHash, role: u.role, isVerified: true, isActive: true },
      });
      results.push({ email: u.email, status: 'created' });
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    return reply.status(201).send({ created, skipped, results });
  });

  // Change user role
  app.patch('/users/:id/role', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const { role } = z.object({ role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']) }).parse(req.body);
    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  // Reset user account to default state
  app.post('/users/:id/reset', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        bio: null,
        avatarUrl: null,
        isActive: true,
        isVerified: true,
      },
    });
    return { message: 'Đã reset tài khoản về mặc định', defaultPassword: generatedPassword };
  });

  // Toggle active
  app.patch('/users/:id/toggle-active', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    return prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  });

  // Get user's enrollments
  app.get('/users/:id/enrollments', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.enrollment.findMany({
      where: { userId: id },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnailUrl: true, status: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  });

  // Enroll user into courses
  app.post('/users/:id/enrollments', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: userId } = req.params as { id: string };
    const { courseIds } = z.object({ courseIds: z.array(z.string()).min(1) }).parse(req.body);

    const results = await Promise.allSettled(
      courseIds.map((courseId) =>
        prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: { status: 'ACTIVE' },
          create: { userId, courseId, status: 'ACTIVE' },
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return reply.status(201).send({ enrolled: succeeded });
  });

  // Remove user from a course
  app.delete('/users/:id/enrollments/:courseId', { preHandler: requireAdmin }, async (req) => {
    const { id: userId, courseId } = req.params as { id: string; courseId: string };
    await prisma.enrollment.delete({
      where: { userId_courseId: { userId, courseId } },
    });
    return { message: 'Đã xóa đăng ký' };
  });

  // List all courses (for dropdown selection)
  app.get('/courses-all', { preHandler: requireAdmin }, async () => {
    return prisma.course.findMany({
      select: { id: true, title: true, slug: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { title: 'asc' },
    });
  });

  // List all instructors
  app.get('/instructors', { preHandler: requireAdmin }, async () => {
    return prisma.user.findMany({
      where: { role: { in: ['INSTRUCTOR', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  });
}
