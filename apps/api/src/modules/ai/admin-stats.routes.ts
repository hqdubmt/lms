/**
 * Admin Stats API — GET /ai/admin/stats
 * Route mới, không sửa API hiện tại
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getProviderDashboard, getTotalTokenUsage } from '../../services/provider-monitor';
import { getAgentDashboard } from '../../services/agent-monitor';
import { redis } from '../../services/redis';
import { prisma } from '../../services/prisma';

export async function adminStatsRoutes(app: FastifyInstance) {
  app.get('/admin/stats', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string; role?: string };

    // Role check — only admin
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { role: true },
      });
      if (dbUser?.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
      }
    } catch {
      return reply.status(403).send({ error: 'Không thể xác thực quyền admin' });
    }

    // Collect stats in parallel
    const [
      totalUsers,
      activeUserKeys,
      providerDash,
      totalTokens,
      agentDash,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      redis.keys('la:v2:*').catch(() => [] as string[]),
      getProviderDashboard(7),
      getTotalTokenUsage(30),
      getAgentDashboard(7),
    ]);

    // Count quiz and homework from analytics keys
    let quizCount = 0;
    let homeworkCount = 0;
    let voiceSessions = 0;
    let chatCount = 0;

    if (activeUserKeys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of activeUserKeys) pipeline.get(key);
      const results = await pipeline.exec();
      if (results) {
        for (const [, raw] of results) {
          if (!raw) continue;
          try {
            const d = JSON.parse(raw as string);
            quizCount += d.quizCount ?? 0;
            homeworkCount += d.homeworkCount ?? 0;
            voiceSessions += d.voiceCount ?? 0;
            chatCount += d.chatCount ?? 0;
          } catch { /* skip */ }
        }
      }
    }

    // Provider summary today
    const today = new Date().toISOString().slice(0, 10);
    const provSummary = {
      groq:   providerDash.groq.find(d => d.date === today) ?? null,
      gemini: providerDash.gemini.find(d => d.date === today) ?? null,
      ollama: providerDash.ollama.find(d => d.date === today) ?? null,
    };

    return reply.send({
      users: {
        total: totalUsers,
        active: activeUserKeys.length,
      },
      activity: {
        chatCount,
        quizCount,
        homeworkCount,
        voiceSessions,
      },
      providers: {
        today: provSummary,
        tokenUsage30d: totalTokens,
      },
      agents: {
        today: {
          tutor:          agentDash.tutor.find(d => d.date === today) ?? null,
          math:           agentDash.math.find(d => d.date === today) ?? null,
          quiz:           agentDash.quiz.find(d => d.date === today) ?? null,
          homework:       agentDash.homework.find(d => d.date === today) ?? null,
          knowledge_graph: agentDash.knowledge_graph.find(d => d.date === today) ?? null,
        },
      },
      generatedAt: new Date().toISOString(),
    });
  });
}
