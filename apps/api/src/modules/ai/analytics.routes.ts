import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { recordEvent, getAnalyticsSummary } from '../../services/analytics';
import { getBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getXPData } from '../../services/xp-gamification';
import { getProviderDashboard, type Provider } from '../../services/provider-monitor';
import { getAgentDashboard, type MonitoredAgent } from '../../services/agent-monitor';

const SUBJECTS = ['math', 'language', 'viet', 'general'];

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

  // Module I: GET /ai/analytics/subject — per-subject breakdown
  app.get('/subject', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const results = await Promise.all(
      SUBJECTS.map(async subject => {
        const [brain, summary] = await Promise.all([
          getBrain(sub, subject),
          getAnalyticsSummary(sub, subject, 30).catch(() => null),
        ]);
        const masteryMap = brain.mastery as Record<string, number>;
        const entries = Object.values(masteryMap);
        const avgMastery = entries.length
          ? Math.round((entries.reduce((s, v) => s + v, 0) / entries.length) * 100)
          : 0;
        return {
          subject,
          avgMastery,
          topicCount: entries.length,
          quizCount: summary?.dailyData?.reduce((s, d) => s + (d.quizCount ?? 0), 0) ?? 0,
          studyMinutes: summary?.totalStudyMinutes ?? 0,
        };
      }),
    );

    return reply.send({ subjects: results });
  });

  // Module I: GET /ai/analytics/mastery — mastery history chart
  app.get('/mastery', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const [brain, la] = await Promise.all([
      getBrain(sub, subject),
      getLearningAnalytics(sub),
    ]);

    const masteryMap = brain.mastery as Record<string, number>;
    const topicMastery = Object.entries(masteryMap)
      .map(([topic, score]) => ({ topic, score: Math.round(score * 100) }))
      .sort((a, b) => b.score - a.score);

    return reply.send({
      subject,
      history: la.masteryHistory,
      topicMastery,
      currentAvg: topicMastery.length
        ? Math.round(topicMastery.reduce((s, t) => s + t.score, 0) / topicMastery.length)
        : 0,
    });
  });

  // Module I: GET /ai/analytics/trends — growth trends over time
  app.get('/trends', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string; days?: string };
    const subject = q.subject || 'general';
    const rawDays = parseInt(q.days ?? '30', 10);
    const days = ([7, 30, 90].includes(rawDays) ? rawDays : 30) as 7 | 30 | 90;

    const [summary, la] = await Promise.all([
      getAnalyticsSummary(sub, subject, days),
      getLearningAnalytics(sub),
    ]);

    // Build trend data from dailyData
    const quizTrend = (summary.dailyData ?? []).map(d => ({
      date: d.date,
      value: d.quizAccuracy ?? 0,
    }));

    const studyTrend = (summary.dailyData ?? []).map(d => ({
      date: d.date,
      value: d.studyMinutes ?? 0,
    }));

    const masteryTrend = la.masteryHistory.slice(-days).map(h => ({
      date: h.date,
      value: Math.round(h.avg * 100),
    }));

    return reply.send({
      subject,
      days,
      quizTrend,
      studyTrend,
      masteryTrend,
      summary: {
        totalStudyMinutes: summary.totalStudyMinutes,
        quizAccuracy: Math.round(summary.quizAccuracy),
        masteryGrowth: Math.round((summary.masteryGrowth ?? 0) * 100),
      },
    });
  });

  // Phase 6: GET /ai/analytics/dashboard — advanced analytics for student
  app.get('/dashboard', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const [la, xp, providerDash, agentDash] = await Promise.all([
      getLearningAnalytics(sub),
      getXPData(sub),
      getProviderDashboard(7),
      getAgentDashboard(7),
    ]);

    // Aggregate provider stats over last 7 days
    const providers = (Object.entries(providerDash) as [Provider, ReturnType<typeof providerDash[Provider]['map']>][]).map(
      ([name, days]) => {
        const totalRequests = (days as any[]).reduce((s: number, d: any) => s + (d.requestCount ?? 0), 0);
        const totalSuccess = (days as any[]).reduce((s: number, d: any) => s + (d.successCount ?? 0), 0);
        return { name, totalRequests, totalSuccess };
      },
    ).filter(p => p.totalRequests > 0);

    // Aggregate agent stats over last 7 days
    const agents = (Object.entries(agentDash) as [MonitoredAgent, ReturnType<typeof agentDash[MonitoredAgent]['map']>][]).map(
      ([name, days]) => {
        const totalCalls = (days as any[]).reduce((s: number, d: any) => s + (d.callCount ?? 0), 0);
        return { name, totalCalls };
      },
    ).filter(a => a.totalCalls > 0);

    // XP history last 7 days (from xp.history)
    const xpHistory = xp.history.slice(-7).map(h => ({ date: h.date, xp: h.xp }));

    return reply.send({
      activity: {
        chatCount: la.chatCount,
        quizCount: la.quizCount,
        homeworkCount: la.homeworkCount,
        voiceCount: la.voiceCount,
        studyMinutes: la.studyMinutes,
      },
      xp: {
        totalXP: xp.totalXP,
        level: xp.level,
        rank: xp.rank,
        rankColor: xp.rankColor,
        xpProgress: xp.xpProgress,
        xpToNextLevel: xp.xpToNextLevel,
        history: xpHistory,
      },
      providers,
      agents,
    });
  });
}
