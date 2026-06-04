import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getRevisionQueue, completeRevision, addRevisionItem } from '../../services/revision';

export async function revisionRoutes(app: FastifyInstance) {
  app.get('/revision', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getRevisionQueue(sub));
  });

  app.post('/revision/complete', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      itemId: z.string(),
      quality: z.number().int().min(0).max(5),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const result = await completeRevision(sub, body.data.itemId, body.data.quality as 0 | 1 | 2 | 3 | 4 | 5);
    if (!result) return reply.status(404).send({ error: 'Không tìm thấy mục ôn tập' });
    return reply.send(result);
  });

  app.post('/revision/add', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      topic: z.string().max(100),
      subject: z.string().default('general'),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const item = await addRevisionItem(sub, body.data.topic, body.data.subject, body.data.difficulty);
    return reply.send(item);
  });
}
