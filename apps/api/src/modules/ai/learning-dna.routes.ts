/**
 * Learning DNA V1 API (bna.md)
 *
 * GET  /ai/learning-dna/v1     — lấy DNA V1 của user
 * POST /ai/learning-dna/record — ghi sự kiện topic (lesson/quiz)
 *
 * Legacy:
 * GET  /ai/learning-dna        — profile cũ (Phase 15)
 * POST /ai/learning-dna/sync   — sync từ brain state
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getDnaProfile, updateDna, getDnaV1, recordTopicEvent } from '../../services/learning-dna';
import { getBrain } from '../../services/conversation-brain';

const syncSchema = z.object({
  subject:        z.string().default('general'),
  sessionMinutes: z.number().min(0).default(5),
});

const recordSchema = z.object({
  subject: z.enum(['math', 'language', 'viet']),
  topic:   z.string().min(1).max(80),
  event:   z.enum(['lesson', 'quiz_correct', 'quiz_wrong']),
});

export async function learningDnaRoutes(app: FastifyInstance) {
  // ── V1: get DNA profile ────────────────────────────────────────────────────
  app.get('/learning-dna/v1', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; sub: string };
    const userId = user.id ?? user.sub;
    return reply.send(await getDnaV1(userId));
  });

  // ── V1: record topic event ─────────────────────────────────────────────────
  app.post('/learning-dna/record', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; sub: string };
    const userId = user.id ?? user.sub;
    const body = recordSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });
    const { subject, topic, event } = body.data;
    await recordTopicEvent(userId, subject, topic, event);
    return reply.send({ ok: true });
  });

  // ── Legacy: get full profile ───────────────────────────────────────────────
  app.get('/learning-dna', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; sub: string };
    const userId = user.id ?? user.sub;
    return reply.send(await getDnaProfile(userId));
  });

  // ── Legacy: sync from brain ────────────────────────────────────────────────
  app.post('/learning-dna/sync', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string; sub: string };
    const userId = user.id ?? user.sub;
    const { subject, sessionMinutes } = syncSchema.parse(req.body);
    const brain = await getBrain(userId, subject);
    const profile = await updateDna(userId, brain, subject, sessionMinutes);
    return reply.send(profile);
  });
}
