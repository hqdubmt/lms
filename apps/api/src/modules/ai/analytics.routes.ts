import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { recordEvent, getAnalyticsSummary } from '../../services/analytics';
import { getBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';

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
}
