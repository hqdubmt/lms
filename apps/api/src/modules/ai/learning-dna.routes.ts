/**
 * Phase 15 — Learning DNA API
 * GET  /ai/learning-dna      — lấy profile của user hiện tại
 * POST /ai/learning-dna/sync — cập nhật DNA từ brain state
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getDnaProfile, updateDna } from '../../services/learning-dna';
import { getBrain } from '../../services/conversation-brain';
import { z } from 'zod';

const syncSchema = z.object({
  subject:        z.string().default('general'),
  sessionMinutes: z.number().min(0).default(5),
});

export async function learningDnaRoutes(app: FastifyInstance) {
  app.get('/learning-dna', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const profile = await getDnaProfile(user.id);
    return reply.send(profile);
  });

  app.post('/learning-dna/sync', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const { subject, sessionMinutes } = syncSchema.parse(req.body);

    const brain = await getBrain(user.id, subject);
    const profile = await updateDna(user.id, brain, subject, sessionMinutes);
    return reply.send(profile);
  });
}
