import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getLearningState, updateLearningState } from '../../services/learning-state';
import { analyzeKnowledgeGap } from '../../services/knowledge-gap';
import { getRecommendations } from '../../services/recommendation';

export async function learningRoutes(app: FastifyInstance) {
  // Phase B — GET learning state
  app.get('/learning-state', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    return reply.send(await getLearningState(sub, subject));
  });

  // Phase B — POST update learning state
  app.post('/learning-state/update', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      subject: z.string().default('general'),
      grade: z.string().optional(),
      currentLesson: z.string().optional(),
      currentChapter: z.string().optional(),
      progress: z.number().min(0).max(100).optional(),
      weakTopics: z.array(z.string()).optional(),
      strongTopics: z.array(z.string()).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });
    const { subject, ...patch } = body.data;
    return reply.send(await updateLearningState(sub, subject, patch));
  });

  // Phase C — GET knowledge gap
  app.get('/knowledge-gap', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    return reply.send(await analyzeKnowledgeGap(sub, subject));
  });

  // Phase D — GET recommendations
  app.get('/recommendations', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    return reply.send(await getRecommendations(sub, subject));
  });
}
