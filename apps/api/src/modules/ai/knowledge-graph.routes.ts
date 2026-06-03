import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { buildKnowledgeGraph, getKnowledgeGraph, getTopicSubgraph, getTopConcepts } from '../../services/knowledge-graph';
import { getDifficultyLevel } from '../../services/adaptive-learning';

export async function knowledgeGraphRoutes(app: FastifyInstance) {
  // Feature 1 — POST /ai/knowledge-graph/build
  app.post('/knowledge-graph/build', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      text: z.string().min(10).max(20000),
      subject: z.string().default('general'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const graph = await buildKnowledgeGraph(sub, body.data.subject, body.data.text);
    return reply.send({
      nodeCount: Object.keys(graph.nodes).length,
      rootIds: graph.rootIds,
      builtAt: graph.builtAt,
    });
  });

  // Feature 1 — GET /ai/knowledge-graph/topic?subject=math&topic=Phân+số
  app.get('/knowledge-graph/topic', { preHandler: requireAuth }, async (req, reply) => {
    const q = req.query as { subject?: string; topic?: string };
    const subject = q.subject || 'general';
    const topic = q.topic || '';

    const { sub } = req.user as { sub: string };

    if (!topic) {
      const topConcepts = await getTopConcepts(sub, subject, 10);
      return reply.send({ concepts: topConcepts });
    }

    const subgraph = await getTopicSubgraph(sub, subject, topic);
    if (!subgraph) return reply.send({ node: null, children: [], siblings: [] });
    return reply.send(subgraph);
  });

  // Feature 1 — GET /ai/knowledge-graph?subject=math
  app.get('/knowledge-graph', { preHandler: requireAuth }, async (req, reply) => {
    const subject = ((req.query as any).subject as string) || 'general';
    const { sub } = req.user as { sub: string };
    const graph = await getKnowledgeGraph(sub, subject);
    if (!graph) return reply.send({ nodes: {}, rootIds: [], builtAt: null });
    return reply.send(graph);
  });

  // Feature 2 — GET /ai/difficulty?subject=math
  app.get('/difficulty', { preHandler: requireAuth }, async (req, reply) => {
    const subject = ((req.query as any).subject as string) || 'general';
    const { sub } = req.user as { sub: string };
    return reply.send(await getDifficultyLevel(sub, subject));
  });
}
