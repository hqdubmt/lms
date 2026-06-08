/**
 * Phase 14 — AI Response Feedback (👍/👎)
 * POST /ai/feedback       — student submits vote
 * GET  /ai/feedback/stats — admin gets aggregate stats
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { AiFeedback } from '../../services/mongo';
import { incCounter } from '../../services/metrics';

const submitSchema = z.object({
  messageId: z.string().min(1),
  subject:   z.string().default('general'),
  mode:      z.string().default('tutor'),
  vote:      z.enum(['up', 'down']),
  comment:   z.string().max(500).default(''),
  provider:  z.string().default(''),
});

export async function aiFeedbackRoutes(app: FastifyInstance) {
  // Submit feedback
  app.post('/feedback', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const body = submitSchema.parse(req.body);

    await AiFeedback.findOneAndUpdate(
      { userId: user.id, messageId: body.messageId },
      { ...body, userId: user.id, createdAt: new Date() },
      { upsert: true, new: true },
    );

    incCounter(body.vote === 'up' ? 'ai_feedback_positive' : 'ai_feedback_negative');

    return reply.send({ ok: true });
  });

  // Admin: aggregate stats
  app.get('/feedback/stats', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const [totals, bySubject, recent] = await Promise.all([
      AiFeedback.aggregate([
        { $group: { _id: '$vote', count: { $sum: 1 } } },
      ]),
      AiFeedback.aggregate([
        { $group: { _id: { subject: '$subject', vote: '$vote' }, count: { $sum: 1 } } },
        { $sort: { '_id.subject': 1 } },
      ]),
      AiFeedback.find().sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const up = totals.find(t => t._id === 'up')?.count ?? 0;
    const down = totals.find(t => t._id === 'down')?.count ?? 0;

    return reply.send({ up, down, total: up + down, bySubject, recent });
  });

  // User: get own feedback
  app.get('/feedback/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };
    const items = await AiFeedback.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return reply.send({ items });
  });
}
