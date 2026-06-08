/**
 * Phase 19 — Enterprise Version
 * Organization Dashboard: KPI, Analytics, Reports
 * Xây dựng trên Prisma models hiện có: User, Class, Course, Enrollment, Payment
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';

const CACHE_TTL = 300; // 5 min

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const data = await fn();
  await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  return data;
}

export async function enterpriseRoutes(app: FastifyInstance) {
  // ─── Organization KPI Dashboard ─────────────────────────────────────────────
  app.get('/enterprise/kpi', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data = await cached('enterprise:kpi', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        totalUsers, newUsersThisMonth, newUsersLastMonth,
        totalCourses, publishedCourses,
        totalEnrollments, enrollmentsThisMonth, enrollmentsLastMonth,
        totalRevenue, revenueThisMonth, revenueLastMonth,
        totalClasses,
        completionStats,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.course.count(),
        prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma.enrollment.count(),
        prisma.enrollment.count({ where: { enrolledAt: { gte: startOfMonth } } }),
        prisma.enrollment.count({ where: { enrolledAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
        prisma.class.count(),
        prisma.enrollment.groupBy({ by: ['status'], _count: { id: true } }),
      ]);

      const completed = completionStats.find(s => s.status === 'COMPLETED')?._count.id ?? 0;
      const completionRate = totalEnrollments > 0 ? ((completed / totalEnrollments) * 100).toFixed(1) : '0';

      const growthUsers      = newUsersLastMonth > 0 ? (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1) : '0';
      const growthEnrollments = enrollmentsLastMonth > 0 ? (((enrollmentsThisMonth - enrollmentsLastMonth) / enrollmentsLastMonth) * 100).toFixed(1) : '0';
      const rev = Number(revenueThisMonth._sum.amount ?? 0);
      const revLast = Number(revenueLastMonth._sum.amount ?? 0);
      const growthRevenue = revLast > 0 ? (((rev - revLast) / revLast) * 100).toFixed(1) : '0';

      return {
        users: { total: totalUsers, thisMonth: newUsersThisMonth, growth: growthUsers },
        courses: { total: totalCourses, published: publishedCourses },
        enrollments: { total: totalEnrollments, thisMonth: enrollmentsThisMonth, growth: growthEnrollments, completionRate },
        revenue: {
          total: Number(totalRevenue._sum.amount ?? 0),
          thisMonth: rev,
          lastMonth: revLast,
          growth: growthRevenue,
          currency: 'VND',
        },
        classes: { total: totalClasses, active: totalClasses },
        generatedAt: now.toISOString(),
      };
    });

    return reply.send(data);
  });

  // ─── User Analytics ─────────────────────────────────────────────────────────
  app.get('/enterprise/users/analytics', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data = await cached('enterprise:users:analytics', async () => {
      const [byRole, byMonth, topStudents] = await Promise.all([
        prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
        // Last 6 months registrations
        prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT to_char("createdAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
          FROM "User"
          WHERE "createdAt" >= NOW() - INTERVAL '6 months'
          GROUP BY month
          ORDER BY month ASC
        `,
        prisma.enrollment.groupBy({
          by: ['userId'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        byRole: byRole.map(r => ({ role: r.role, count: r._count.id })),
        registrationTrend: byMonth.map(r => ({ month: r.month, count: Number(r.count) })),
        topActiveStudents: topStudents.map(s => ({ userId: s.userId, enrollments: s._count.id })),
      };
    });

    return reply.send(data);
  });

  // ─── Course Analytics ────────────────────────────────────────────────────────
  app.get('/enterprise/courses/analytics', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data = await cached('enterprise:courses:analytics', async () => {
      const [byLevel, topCourses, byCategory] = await Promise.all([
        prisma.course.groupBy({ by: ['level'], where: { status: 'PUBLISHED' }, _count: { id: true } }),
        prisma.course.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { totalStudents: 'desc' },
          take: 10,
          select: { id: true, title: true, totalStudents: true, avgRating: true, price: true, instructor: { select: { name: true } } },
        }),
        prisma.course.groupBy({
          by: ['categoryId'],
          where: { status: 'PUBLISHED', categoryId: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        byLevel: byLevel.map(l => ({ level: l.level, count: l._count.id })),
        topCourses,
        byCategory: byCategory.map(c => ({ categoryId: c.categoryId, count: c._count.id })),
      };
    });

    return reply.send(data);
  });

  // ─── Revenue Report ──────────────────────────────────────────────────────────
  app.get('/enterprise/revenue', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data = await cached('enterprise:revenue', async () => {
      const [byMonth, byMethod, topCourses] = await Promise.all([
        prisma.$queryRaw<Array<{ month: string; revenue: string; count: bigint }>>`
          SELECT to_char("paidAt", 'YYYY-MM') as month,
                 SUM(amount)::text as revenue,
                 COUNT(*)::bigint as count
          FROM "Payment"
          WHERE status = 'COMPLETED' AND "paidAt" >= NOW() - INTERVAL '12 months'
          GROUP BY month
          ORDER BY month ASC
        `,
        prisma.payment.groupBy({
          by: ['method'],
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.payment.groupBy({
          by: ['courseId'],
          where: { status: 'COMPLETED', courseId: { not: null } },
          _sum: { amount: true },
          _count: { id: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        monthlyTrend: byMonth.map(r => ({ month: r.month, revenue: Number(r.revenue), transactions: Number(r.count) })),
        byMethod: byMethod.map(m => ({ method: m.method, revenue: Number(m._sum.amount ?? 0), count: m._count.id })),
        topRevenueCourses: topCourses.map(c => ({ courseId: c.courseId, revenue: Number(c._sum.amount ?? 0), count: c._count.id })),
      };
    });

    return reply.send(data);
  });

  // ─── Class/School Management Analytics ──────────────────────────────────────
  app.get('/enterprise/classes/report', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data = await cached('enterprise:classes:report', async () => {
      const classes = await prisma.class.findMany({
        include: { _count: { select: { members: true, courses: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        classes: classes.map(c => ({
          id: c.id,
          name: c.name,
          memberCount: c._count.members,
          courseCount: c._count.courses,
          createdAt: c.createdAt,
        })),
        totalClasses: classes.length,
      };
    });

    return reply.send(data);
  });
}
