import { FastifyInstance } from 'fastify';
import { prisma } from '../../services/prisma';
import { requireAuth } from '../../middleware/auth';
import { getOrSet } from '../../services/cache';

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications — lấy 30 thông báo gần nhất
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return getOrSet(`notif:${sub}`, 30, async () => {
      const [items, unread] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: sub },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        prisma.notification.count({ where: { userId: sub, isRead: false } }),
      ]);
      return { items, unread };
    });
  });

  // PATCH /notifications/read-all
  app.patch('/read-all', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    await prisma.notification.updateMany({
      where: { userId: sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  });

  // PATCH /notifications/:id/read
  app.patch('/:id/read', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== sub) return reply.status(404).send({ error: 'Not found' });
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  });
}
