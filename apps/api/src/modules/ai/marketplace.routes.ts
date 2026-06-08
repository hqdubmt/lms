/**
 * Phase 16 — Course Marketplace
 * Public marketplace: list, search, buy, review courses.
 * Reuses existing Course/Payment/Enrollment Prisma models.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../services/prisma';

const PAGE_SIZE = 20;

const searchSchema = z.object({
  q:        z.string().optional(),
  category: z.string().optional(),
  level:    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort:     z.enum(['newest', 'popular', 'rating', 'price_asc', 'price_desc']).default('newest'),
  page:     z.coerce.number().int().min(1).default(1),
});

const buySchema = z.object({
  courseId: z.string().min(1),
  method:   z.enum(['VNPAY', 'MOMO', 'ZALOPAY', 'STRIPE', 'PAYPAL', 'CRYPTO']).default('VNPAY'),
});

export async function marketplaceRoutes(app: FastifyInstance) {
  // ─── Public: list marketplace courses ──────────────────────────────────────
  app.get('/courses', async (req, reply) => {
    const q = searchSchema.parse(req.query);
    const skip = (q.page - 1) * PAGE_SIZE;

    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { tags: { has: q.q } },
      ];
    }
    if (q.category) where.categoryId = q.category;
    if (q.level)    where.level      = q.level;
    if (q.minPrice !== undefined) where.price = { ...(where.price as object ?? {}), gte: q.minPrice };
    if (q.maxPrice !== undefined) where.price = { ...(where.price as object ?? {}), lte: q.maxPrice };

    const orderBy: Record<string, string>[] = {
      newest:     [{ publishedAt: 'desc' }],
      popular:    [{ totalStudents: 'desc' }],
      rating:     [{ avgRating: 'desc' }],
      price_asc:  [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
    }[q.sort] ?? [{ publishedAt: 'desc' }];

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip,
        take: PAGE_SIZE,
        select: {
          id: true, title: true, slug: true, description: true,
          thumbnailUrl: true, level: true, price: true, discountPrice: true,
          isFree: true, avgRating: true, totalReviews: true, totalStudents: true,
          totalDuration: true, totalLessons: true, language: true, tags: true,
          publishedAt: true,
          instructor: { select: { id: true, name: true, avatarUrl: true } },
          category:   { select: { id: true, name: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return reply.send({
      courses,
      pagination: { total, page: q.page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) },
    });
  });

  // ─── Public: featured courses ───────────────────────────────────────────────
  app.get('/courses/featured', async (_req, reply) => {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      orderBy: { avgRating: 'desc' },
      take: 8,
      select: {
        id: true, title: true, slug: true, thumbnailUrl: true, level: true,
        price: true, discountPrice: true, isFree: true, avgRating: true,
        totalStudents: true,
        instructor: { select: { id: true, name: true } },
      },
    });
    return reply.send({ courses });
  });

  // ─── Public: course detail ──────────────────────────────────────────────────
  app.get('/courses/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const course = await prisma.course.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        instructor: { select: { id: true, name: true, avatarUrl: true, bio: true } },
        category:   { select: { id: true, name: true } },
        sections:   {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, videoDuration: true, isFree: true } } },
        },
        reviews: { take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, avatarUrl: true } } } },
      },
    });
    if (!course) return reply.status(404).send({ error: 'Course not found' });
    return reply.send(course);
  });

  // ─── Auth: purchase course ──────────────────────────────────────────────────
  app.post('/buy', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const { courseId, method } = buySchema.parse(req.body);

    const course = await prisma.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      select: { id: true, price: true, isFree: true, title: true },
    });
    if (!course) return reply.status(404).send({ error: 'Course not found' });

    // Check already enrolled
    const enrolled = await prisma.enrollment.findFirst({ where: { userId: user.id, courseId } });
    if (enrolled) return reply.status(409).send({ error: 'Already enrolled' });

    const price = Number(course.price);

    if (course.isFree || price === 0) {
      // Free course → enroll directly, record with VNPAY method but 0 amount
      await prisma.enrollment.create({ data: { userId: user.id, courseId, status: 'ACTIVE' } });
      await prisma.payment.create({
        data: { userId: user.id, courseId, amount: 0, method: 'VNPAY', status: 'COMPLETED', paidAt: new Date() },
      });
      return reply.send({ ok: true, enrolled: true, payment: null });
    }

    // Paid course → create PENDING payment, return redirect info
    const txnRef = `LMS${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const safeMethod = (method as string) in { VNPAY: 1, MOMO: 1, ZALOPAY: 1, STRIPE: 1, PAYPAL: 1, CRYPTO: 1 }
      ? method as 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'STRIPE' | 'PAYPAL' | 'CRYPTO'
      : 'VNPAY';
    const payment = await prisma.payment.create({
      data: { userId: user.id, courseId, amount: price, currency: 'VND', method: safeMethod, status: 'PENDING', txnRef },
    });

    return reply.send({
      ok: true,
      enrolled: false,
      payment: { id: payment.id, txnRef, amount: price, method },
      message: `Tạo đơn thanh toán thành công. TxnRef: ${txnRef}`,
    });
  });

  // ─── Auth: instructor submit course to marketplace ──────────────────────────
  app.post('/submit/:courseId', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; role: string };
    const { courseId } = req.params as { courseId: string };

    if (!['instructor', 'admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Only instructors can submit courses' });
    }

    const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: user.id } });
    if (!course) return reply.status(404).send({ error: 'Course not found or not yours' });

    await prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    return reply.send({ ok: true, message: 'Course submitted to marketplace' });
  });

  // ─── Auth: my purchases ─────────────────────────────────────────────────────
  app.get('/my-purchases', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const payments = await prisma.payment.findMany({
      where: { userId: user.id, status: 'COMPLETED' },
      orderBy: { paidAt: 'desc' },
      include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } },
    });
    return reply.send({ payments });
  });

  // ─── Auth: instructor earnings ──────────────────────────────────────────────
  app.get('/earnings', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; role: string };
    if (!['instructor', 'admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const courses = await prisma.course.findMany({
      where: { instructorId: user.id },
      select: { id: true, title: true, price: true, totalStudents: true },
    });
    const courseIds = courses.map(c => c.id);

    const payments = await prisma.payment.aggregate({
      where: { courseId: { in: courseIds }, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const PLATFORM_FEE = 0.3; // 30% platform fee
    const grossRevenue = Number(payments._sum.amount ?? 0);
    const netRevenue   = grossRevenue * (1 - PLATFORM_FEE);

    return reply.send({
      courses,
      grossRevenue,
      netRevenue,
      platformFee: PLATFORM_FEE,
      totalSales: payments._count.id,
    });
  });
}
