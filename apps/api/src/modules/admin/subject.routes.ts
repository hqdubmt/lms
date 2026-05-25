import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAdmin, requireInstructor } from '../../middleware/auth';

const createSubjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
});

export async function subjectRoutes(app: FastifyInstance) {
  // List all subjects (public)
  app.get('/subjects', async (req) => {
    const q = req.query as { search?: string; page?: string; limit?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 50, 100);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
          _count: { select: { classes: true, courses: true } },
        },
      }),
      prisma.subject.count({ where }),
    ]);
    return { subjects, total, page, limit };
  });

  // Get single subject with classes and courses
  app.get('/subjects/:id', async (req) => {
    const { id } = req.params as { id: string };
    return prisma.subject.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        classes: {
          include: { class: { select: { id: true, name: true } } },
        },
        courses: {
          include: { course: { select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } } } },
        },
      },
    });
  });

  // Create subject (admin or instructor)
  app.post('/subjects', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createSubjectSchema.parse(req.body);
    const subject = await prisma.subject.create({
      data: { ...body, createdBy: sub },
      include: { creator: { select: { id: true, name: true } } },
    });
    return reply.status(201).send(subject);
  });

  // Update subject (admin only)
  app.patch('/subjects/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = createSubjectSchema.partial().parse(req.body);
    return prisma.subject.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
    });
  });

  // Delete subject (admin only)
  app.delete('/subjects/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.subject.delete({ where: { id } });
    return reply.send({ message: 'Đã xóa môn học' });
  });

  // Link courses to subject
  app.post('/subjects/:id/courses', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { courseIds } = z.object({ courseIds: z.array(z.string()).min(1) }).parse(req.body);

    await prisma.$transaction(
      courseIds.map((courseId) =>
        prisma.subjectCourse.upsert({
          where: { subjectId_courseId: { subjectId: id, courseId } },
          update: {},
          create: { subjectId: id, courseId, id: require('crypto').randomUUID() },
        }),
      ),
    );
    return reply.status(201).send({ message: `Đã gắn ${courseIds.length} khóa học vào môn học` });
  });

  // Remove course from subject
  app.delete('/subjects/:id/courses/:courseId', { preHandler: requireInstructor }, async (req, reply) => {
    const { id, courseId } = req.params as { id: string; courseId: string };
    await prisma.subjectCourse.deleteMany({ where: { subjectId: id, courseId } });
    return reply.send({ message: 'Đã xóa khóa học khỏi môn học' });
  });

  // Link subjects to class
  app.post('/classes/:id/subjects', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId } = req.params as { id: string };
    const { subjectIds } = z.object({ subjectIds: z.array(z.string()).min(1) }).parse(req.body);

    const crypto = require('crypto');
    await prisma.$transaction(
      subjectIds.map((subjectId) =>
        prisma.classSubject.upsert({
          where: { classId_subjectId: { classId, subjectId } },
          update: {},
          create: { classId, subjectId, id: crypto.randomUUID() },
        }),
      ),
    );
    return reply.status(201).send({ message: `Đã thêm ${subjectIds.length} môn học vào lớp` });
  });

  // Remove subject from class
  app.delete('/classes/:id/subjects/:subjectId', { preHandler: requireAdmin }, async (req, reply) => {
    const { id: classId, subjectId } = req.params as { id: string; subjectId: string };
    await prisma.classSubject.deleteMany({ where: { classId, subjectId } });
    return reply.send({ message: 'Đã xóa môn học khỏi lớp' });
  });

  // All courses (for link modal)
  app.get('/available-courses', { preHandler: requireAdmin }, async () => {
    return prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true },
    });
  });

  // Get subjects of a class
  app.get('/classes/:id/subjects', async (req) => {
    const { id: classId } = req.params as { id: string };
    const items = await prisma.classSubject.findMany({
      where: { classId },
      orderBy: { addedAt: 'asc' },
      include: {
        subject: {
          include: {
            courses: {
              include: {
                course: { select: { id: true, title: true, status: true, thumbnailUrl: true } },
              },
            },
          },
        },
      },
    });
    return items.map((i) => i.subject);
  });
}
