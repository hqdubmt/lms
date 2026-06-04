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

async function assertAdmin(userId: string): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return u?.role === 'ADMIN';
  } catch {
    return false;
  }
}

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

  // ── Module 6: Provider Stats (detailed, admin only) ──────────────────────────
  app.get('/admin/provider-stats', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    const days = Math.min(parseInt((req.query as any).days ?? '7', 10), 30);
    const [providerDash, totalTokens] = await Promise.all([
      getProviderDashboard(days),
      getTotalTokenUsage(days),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    return reply.send({
      providers: providerDash,
      today: {
        groq:   providerDash.groq.find(d => d.date === today) ?? null,
        gemini: providerDash.gemini.find(d => d.date === today) ?? null,
        ollama: providerDash.ollama.find(d => d.date === today) ?? null,
      },
      totalTokens,
      days,
      generatedAt: new Date().toISOString(),
    });
  });

  // ── Module 7: Agent Stats (detailed, admin only) ─────────────────────────────
  app.get('/admin/agent-stats', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    const days = Math.min(parseInt((req.query as any).days ?? '7', 10), 30);
    const agentDash = await getAgentDashboard(days);

    const today = new Date().toISOString().slice(0, 10);
    return reply.send({
      agents: agentDash,
      today: {
        tutor:           agentDash.tutor.find(d => d.date === today) ?? null,
        math:            agentDash.math.find(d => d.date === today) ?? null,
        quiz:            agentDash.quiz.find(d => d.date === today) ?? null,
        homework:        agentDash.homework.find(d => d.date === today) ?? null,
        knowledge_graph: agentDash.knowledge_graph.find(d => d.date === today) ?? null,
      },
      days,
      generatedAt: new Date().toISOString(),
    });
  });

  // ── Module F: /admin/providers (alias with standardized format) ─────────────
  app.get('/admin/providers', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    const days = Math.min(parseInt((req.query as any).days ?? '7', 10), 30);
    const [providerDash, totalTokens] = await Promise.all([
      getProviderDashboard(days),
      getTotalTokenUsage(days),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const allProviders = ['groq', 'gemini', 'ollama'] as const;
    const summary = allProviders.map(p => {
      const hist = providerDash[p] ?? [];
      const todayData = hist.find(d => d.date === today);
      const totalCalls = hist.reduce((s, d) => s + (d.requestCount ?? 0), 0);
      const totalErrors = hist.reduce((s, d) => s + (d.errorCount ?? 0), 0);
      const avgLatency = hist.length
        ? hist.reduce((s, d) => s + (d.avgLatencyMs ?? 0), 0) / hist.length
        : 0;
      return {
        provider: p,
        todayCalls: todayData?.requestCount ?? 0,
        todayErrors: todayData?.errorCount ?? 0,
        totalCalls,
        errorRate: totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100) : 0,
        avgLatencyMs: Math.round(avgLatency),
        history: hist,
      };
    });

    return reply.send({ providers: summary, totalTokens, days, generatedAt: new Date().toISOString() });
  });

  // ── Module F: /admin/agents (standardized format) ──────────────────────────
  app.get('/admin/agents', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    const days = Math.min(parseInt((req.query as any).days ?? '7', 10), 30);
    const agentDash = await getAgentDashboard(days);

    const today = new Date().toISOString().slice(0, 10);
    const agentNames = Object.keys(agentDash) as Array<keyof typeof agentDash>;
    const summary = agentNames.map(name => {
      const hist = agentDash[name] ?? [];
      const todayData = hist.find((d: any) => d.date === today);
      const totalInvocations = hist.reduce((s: number, d: any) => s + (d.callCount ?? 0), 0);
      return {
        agent: name,
        todayInvocations: todayData?.callCount ?? 0,
        totalInvocations,
        history: hist,
      };
    });

    return reply.send({ agents: summary, days, generatedAt: new Date().toISOString() });
  });

  // ── Module F: /admin/rag — RAG hit rate and index stats ────────────────────
  app.get('/admin/rag', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    try {
      const { getIndexStats } = await import('../../services/rag');
      const subjects = ['math', 'language', 'viet', 'general'];
      const stats = await Promise.all(
        subjects.map(async s => {
          const st = await getIndexStats(s as any).catch(() => ({ total: 0 }));
          return { subject: s, documentCount: st.total ?? 0 };
        }),
      );
      const totalDocs = stats.reduce((s, d) => s + d.documentCount, 0);

      // RAG hit rate from redis counters
      const [hitRaw, missRaw] = await Promise.all([
        redis.get('rag:hits').catch(() => null),
        redis.get('rag:misses').catch(() => null),
      ]);
      const hits = parseInt(hitRaw ?? '0', 10);
      const misses = parseInt(missRaw ?? '0', 10);
      const total = hits + misses;
      const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;

      return reply.send({
        subjects: stats,
        totalDocuments: totalDocs,
        hitRate,
        hits,
        misses,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return reply.status(500).send({ error: 'Không thể lấy RAG stats' });
    }
  });

  // ── Module F: /admin/usage — aggregate usage stats ─────────────────────────
  app.get('/admin/usage', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as { sub: string };
    if (!(await assertAdmin(user.sub))) {
      return reply.status(403).send({ error: 'Chỉ admin mới có thể xem thống kê này' });
    }

    const days = Math.min(parseInt((req.query as any).days ?? '30', 10), 90);
    const [totalUsers, activeUserKeys, totalTokens] = await Promise.all([
      prisma.user.count().catch(() => 0),
      redis.keys('la:v2:*').catch(() => [] as string[]),
      getTotalTokenUsage(days),
    ]);

    let totalChats = 0, totalQuizzes = 0, totalHomework = 0, totalVoice = 0;
    if (activeUserKeys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of activeUserKeys) pipeline.get(key);
      const results = await pipeline.exec();
      if (results) {
        for (const [, raw] of results) {
          if (!raw) continue;
          try {
            const d = JSON.parse(raw as string);
            totalChats += d.chatCount ?? 0;
            totalQuizzes += d.quizCount ?? 0;
            totalHomework += d.homeworkCount ?? 0;
            totalVoice += d.voiceCount ?? 0;
          } catch { /* skip */ }
        }
      }
    }

    return reply.send({
      period: `${days} ngày gần nhất`,
      users: { total: totalUsers, active: activeUserKeys.length },
      interactions: { chats: totalChats, quizzes: totalQuizzes, homework: totalHomework, voice: totalVoice },
      tokens: totalTokens,
      generatedAt: new Date().toISOString(),
    });
  });
}
