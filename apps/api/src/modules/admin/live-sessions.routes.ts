import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAdmin } from '../../middleware/auth';

const sessionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  meetLink: z.string().url(),
  courseId: z.string().optional(),
  classId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'ENDED']).default('SCHEDULED'),
});

const include = {
  course: { select: { id: true, title: true } },
  class: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
};

export async function liveSessionsRoutes(app: FastifyInstance) {
  app.get('/live-sessions', { preHandler: requireAdmin }, async (req) => {
    const q = req.query as { status?: string; classId?: string; courseId?: string; page?: string; limit?: string };
    const page = Number(q.page) || 1;
    const limit = Math.min(Number(q.limit) || 20, 100);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.classId) where.classId = q.classId;
    if (q.courseId) where.courseId = q.courseId;
    const [sessions, total] = await Promise.all([
      prisma.liveSession.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { startTime: 'desc' }, include }),
      prisma.liveSession.count({ where }),
    ]);
    return { sessions, total, page, limit };
  });

  app.post('/live-sessions', { preHandler: requireAdmin }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = sessionSchema.parse(req.body);
    const session = await prisma.liveSession.create({
      data: { ...body, createdBy: sub, startTime: new Date(body.startTime), endTime: new Date(body.endTime) },
      include,
    });
    return reply.status(201).send(session);
  });

  app.get('/live-sessions/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await prisma.liveSession.findUnique({ where: { id }, include });
    if (!session) return reply.status(404).send({ error: 'Không tìm thấy buổi học' });
    return session;
  });

  app.patch('/live-sessions/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = sessionSchema.partial().parse(req.body);
    const data: any = { ...body };
    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime) data.endTime = new Date(body.endTime);
    return prisma.liveSession.update({ where: { id }, data, include });
  });

  app.delete('/live-sessions/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.liveSession.delete({ where: { id } });
    return { message: 'Đã xóa buổi học' };
  });
}
