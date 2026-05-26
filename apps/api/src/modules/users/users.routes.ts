import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../services/prisma';
import { requireAuth, requireAdmin } from '../../middleware/auth';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
});

export async function usersRoutes(app: FastifyInstance) {
  // Get current user profile
  app.get('/profile', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.user.findUniqueOrThrow({
      where: { id: sub },
      select: {
        id: true, email: true, name: true, username: true,
        avatarUrl: true, bio: true, role: true,
        isVerified: true, createdAt: true,
        _count: { select: { enrollments: true, coursesCreated: true } },
      },
    });
  });

  // Update profile
  app.patch('/profile', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = updateProfileSchema.parse(req.body);
    return prisma.user.update({
      where: { id: sub },
      data: body,
      select: { id: true, name: true, username: true, bio: true, avatarUrl: true },
    });
  });

  // Get user enrollments
  app.get('/enrollments', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.enrollment.findMany({
      where: { userId: sub },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true, thumbnailUrl: true,
            instructor: { select: { name: true, avatarUrl: true } },
            totalLessons: true, totalDuration: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  });

  // Get user's classes
  app.get('/classes', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.classMember.findMany({
      where: { userId: sub },
      include: {
        class: {
          select: {
            id: true, name: true, description: true, createdAt: true,
            creator: { select: { name: true } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  });

  // Get courses linked to user's classes
  app.get('/class-courses', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };

    const memberships: Array<{ classId: string }> = await prisma.classMember.findMany({
      where: { userId: sub },
      select: { classId: true },
    });

    if (memberships.length === 0) return [];

    const classIds = memberships.map((m) => m.classId);

    const [classCoursesRaw, userEnrollments] = await Promise.all([
      (prisma as any).classCourse.findMany({
        where: { classId: { in: classIds } },
        include: {
          class: { select: { id: true, name: true } },
          course: {
            select: {
              id: true, title: true, slug: true, thumbnailUrl: true,
              totalLessons: true, totalDuration: true, level: true,
              instructor: { select: { name: true, avatarUrl: true } },
              _count: { select: { enrollments: true } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: { userId: sub },
        select: { courseId: true, status: true, progress: true },
      }),
    ]);

    const enrollmentMap = new Map(
      (userEnrollments as Array<{ courseId: string; status: string; progress: number }>)
        .map((e) => [e.courseId, e]),
    );

    const seen = new Set<string>();
    const result: any[] = [];
    for (const cc of classCoursesRaw as any[]) {
      if (seen.has(cc.course.id)) continue;
      seen.add(cc.course.id);
      const enroll = enrollmentMap.get(cc.course.id);
      result.push({
        ...cc.course,
        className: cc.class.name,
        classId: cc.class.id,
        enrolled: !!enroll,
        enrollStatus: enroll?.status ?? null,
        progress: enroll?.progress ?? 0,
      });
    }
    return result;
  });

  // Get user's schedule (live sessions for their courses/classes + sessions they created as instructor)
  app.get('/schedule', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const [enrollments, memberships, instructorCourses] = await Promise.all([
      prisma.enrollment.findMany({ where: { userId: sub }, select: { courseId: true } }),
      prisma.classMember.findMany({ where: { userId: sub }, select: { classId: true } }),
      (role === 'INSTRUCTOR' || role === 'ADMIN')
        ? prisma.course.findMany({ where: { instructorId: sub }, select: { id: true } })
        : Promise.resolve([]),
    ]);
    const courseIds = [...new Set([
      ...(enrollments as Array<{ courseId: string }>).map((e) => e.courseId),
      ...(instructorCourses as Array<{ id: string }>).map((c) => c.id),
    ])];
    const classIds = (memberships as Array<{ classId: string }>).map((m) => m.classId);

    if (!courseIds.length && !classIds.length) return [];

    return prisma.liveSession.findMany({
      where: {
        OR: [
          ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []),
          ...(classIds.length ? [{ classId: { in: classIds } }] : []),
        ],
      },
      orderBy: { startTime: 'asc' },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        class: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
  });

  // Change own password
  app.patch('/password', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }).parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: sub }, select: { passwordHash: true } });
    if (!user.passwordHash) return reply.status(400).send({ error: 'Tài khoản không dùng mật khẩu (đăng nhập qua OAuth)' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return reply.status(400).send({ error: 'Mật khẩu hiện tại không đúng' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: sub }, data: { passwordHash } });
    return { message: 'Đổi mật khẩu thành công' };
  });

  // Admin: list users
  app.get('/', { preHandler: requireAdmin }, async (req) => {
    const query = req.query as { page?: string; limit?: string; search?: string };
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where = query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { email: { contains: query.search, mode: 'insensitive' as const } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, role: true, isActive: true, isVerified: true, createdAt: true } }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  });

  // Admin: reset user password
  app.patch('/:id/reset-password', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const { newPassword } = z.object({ newPassword: z.string().min(6) }).parse(req.body);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Đặt lại mật khẩu thành công' };
  });

  // Admin: toggle user active
  app.patch('/:id/toggle-active', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    return prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  });
}
