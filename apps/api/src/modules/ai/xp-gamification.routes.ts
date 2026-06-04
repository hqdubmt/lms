import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getXPData, awardXP, completeQuest } from '../../services/xp-gamification';

export async function xpGamificationRoutes(app: FastifyInstance) {
  app.get('/xp', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getXPData(sub));
  });

  app.post('/xp/award', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      activity: z.string(),
      xp: z.number().int().min(1).max(500).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    return reply.send(await awardXP(sub, body.data.activity, body.data.xp));
  });

  app.post('/xp/quest/complete', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      questId: z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const result = await completeQuest(sub, body.data.questId);
    if (!result) return reply.status(400).send({ error: 'Quest không hợp lệ hoặc đã hoàn thành' });
    return reply.send(result);
  });
}
