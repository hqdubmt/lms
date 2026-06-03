import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { recordEvent, getAnalyticsSummary } from '../../services/analytics';

export async function analyticsRoutes(app: FastifyInstance) {
  // POST — record a learning event
  app.post('/record', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      type: z.enum(['quiz_completed', 'lesson_viewed', 'homework_submitted', 'chat_session', 'voice_session']),
      subject: z.string().default('general'),
      score: z.number().min(0).max(100).optional(),
      durationSeconds: z.number().min(0).optional(),
      topic: z.string().max(100).optional(),
      correct: z.number().int().min(0).optional(),
      total: z.number().int().min(1).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    await recordEvent(sub, body.data);
    return reply.send({ ok: true });
  });

  // GET — analytics summary for student dashboard
  app.get('/summary', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string; days?: string };
    const subject = q.subject || 'general';
    const rawDays = parseInt(q.days ?? '30', 10);
    const days = ([7, 30, 90].includes(rawDays) ? rawDays : 30) as 7 | 30 | 90;
    return reply.send(await getAnalyticsSummary(sub, subject, days));
  });
}
