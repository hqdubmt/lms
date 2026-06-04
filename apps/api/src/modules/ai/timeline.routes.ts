import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getTimeline, recordTimelineEvent } from '../../services/timeline';
import { z } from 'zod';

export async function timelineRoutes(app: FastifyInstance) {
  app.get('/timeline', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { days?: string };
    const days = Math.min(parseInt(q.days ?? '30', 10), 90);
    return reply.send(await getTimeline(sub, days));
  });

  // Internal endpoint to record events (called from other modules)
  app.post('/timeline/record', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      type: z.enum(['chat', 'quiz', 'homework', 'voice', 'achievement', 'streak']),
      title: z.string().max(100),
      description: z.string().max(200),
      subject: z.string().default('general'),
      score: z.number().optional(),
      time: z.number().optional(),
      badge: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    await recordTimelineEvent(sub, {
      ...body.data,
      time: body.data.time ?? Date.now(),
    });
    return reply.send({ ok: true });
  });
}
