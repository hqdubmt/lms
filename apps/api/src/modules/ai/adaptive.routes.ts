import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getDifficultyLevel } from '../../services/adaptive-learning';
import { computeAdaptiveDifficulty } from '../../services/adaptive-engine';
import { getBrain } from '../../services/conversation-brain';
import { analyzeKnowledgeGap } from '../../services/knowledge-gap';
import { generateStudyPlan } from '../../services/study-plan';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getStreak } from '../../services/streak';

export async function adaptiveRoutes(app: FastifyInstance) {
  // GET /ai/adaptive-session — adaptive difficulty + weak topics + next challenge
  app.get('/adaptive-session', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';

    const [brain, gap, diffv1] = await Promise.all([
      getBrain(sub, subject),
      analyzeKnowledgeGap(sub, subject),
      getDifficultyLevel(sub, subject),
    ]);

    const diffv2 = await computeAdaptiveDifficulty(
      sub,
      brain.mastery as Record<string, number>,
      brain.mistakes,
    );

    return reply.send({
      subject,
      difficulty: diffv2.level,
      confidence: diffv2.confidence,
      reason: diffv2.reason,
      nextChallenge: diffv2.nextChallenge,
      weakTopics: gap.weak,
      strongTopics: gap.strong,
      recommendation: diffv1.recommendation,
      avgMastery: Math.round(diffv2.adjustedMastery * 100),
      currentTopic: brain.topic,
      level: brain.level,
    });
  });

  // GET /ai/parent-report — parent-friendly progress report
  app.get('/parent-report', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const SUBJECTS = ['math', 'language', 'viet', 'general'];

    const [la, streak, plan] = await Promise.all([
      getLearningAnalytics(sub),
      getStreak(sub),
      generateStudyPlan(sub, 'general', 7),
    ]);

    const subjects = await Promise.all(
      SUBJECTS.map(async subject => {
        const brain = await getBrain(sub, subject);
        const masteryValues = Object.values(brain.mastery as Record<string, number>);
        const avgMastery = masteryValues.length
          ? Math.round((masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length) * 100)
          : 0;
        const weakTopics = brain.mistakes
          .filter(m => m.count >= 1)
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 3)
          .map((m: any) => m.type);
        return {
          subject,
          avgMastery,
          topicCount: masteryValues.length,
          currentTopic: brain.topic,
          weakTopics,
        };
      }),
    );

    // Weekly trend from masteryHistory (last 7 entries)
    const weeklyTrend = la.masteryHistory.slice(-7).map((h: any) => ({
      date: h.date,
      avg: Math.round(h.avg * 100),
    }));

    const today = new Date().toISOString().slice(0, 10);
    const todayPlan = plan.plan.find(d => d.date === today) ?? plan.plan[0];

    return reply.send({
      generatedAt: new Date().toISOString(),
      streak: {
        current: streak.currentStreak,
        best: streak.bestStreak,
        totalDays: streak.totalActiveDays,
      },
      activity: {
        chatCount: la.chatCount,
        quizCount: la.quizCount,
        homeworkCount: la.homeworkCount,
        voiceCount: la.voiceCount,
        studyMinutes: la.studyMinutes,
      },
      subjects,
      weeklyTrend,
      todayFocus: todayPlan?.focus ?? 'Ôn tập tổng hợp',
      weakTopicsAll: plan.weakTopics,
    });
  });
}
