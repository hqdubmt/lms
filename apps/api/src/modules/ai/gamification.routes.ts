import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getStreak } from '../../services/streak';
import { getAchievements } from '../../services/achievement';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { computeAdaptiveDifficulty } from '../../services/adaptive-engine';
import { getKGVisualization } from '../../services/kg-visualizer';
import { getBrain } from '../../services/conversation-brain';
import { analyzeKnowledgeGap } from '../../services/knowledge-gap';

export async function gamificationRoutes(app: FastifyInstance) {
  app.get('/streak', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getStreak(sub));
  });

  app.get('/achievements', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getAchievements(sub));
  });

  app.get('/analytics-v2', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getLearningAnalytics(sub));
  });

  app.get('/adaptive-v2', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    const brain = await getBrain(sub, subject);
    return reply.send(await computeAdaptiveDifficulty(sub, brain.mastery as Record<string, number>, brain.mistakes));
  });

  app.get('/kg-viz', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    const data = await getKGVisualization(sub, subject);
    if (!data) return reply.send({ nodes: [], edges: [], rootIds: [], subject, builtAt: null });
    return reply.send(data);
  });

  // ── Module 9: Student Profile ────────────────────────────────────────────────
  app.get('/profile', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';

    const [brain, achievements, streak, la, gap] = await Promise.all([
      getBrain(sub, subject),
      getAchievements(sub),
      getStreak(sub),
      getLearningAnalytics(sub),
      analyzeKnowledgeGap(sub, subject).catch(() => ({ weak: [], strong: [] })),
    ]);

    const masteryEntries = Object.entries(brain.mastery as Record<string, number>);
    const masteryAverage = masteryEntries.length > 0
      ? Math.round(masteryEntries.reduce((s, [, v]) => s + v, 0) / masteryEntries.length * 100)
      : 0;

    const sorted = [...masteryEntries].sort((a, b) => b[1] - a[1]);
    const strongestTopics = sorted.slice(0, 3).map(([k]) => k);
    const weakestTopics = sorted.slice(-3).reverse().map(([k]) => k).filter(t => !strongestTopics.includes(t));

    const levelLabel = masteryAverage >= 80 ? 'Nâng cao'
      : masteryAverage >= 50 ? 'Trung bình'
      : 'Cơ bản';

    return reply.send({
      level: levelLabel,
      masteryAverage,
      strongestTopics: strongestTopics.length ? strongestTopics : gap.strong.slice(0, 3),
      weakestTopics: weakestTopics.length ? weakestTopics : gap.weak.slice(0, 3),
      achievements: achievements.filter(a => a.unlockedAt !== null),
      streak,
      activity: {
        chatCount: la.chatCount,
        quizCount: la.quizCount,
        homeworkCount: la.homeworkCount,
        voiceCount: la.voiceCount,
        studyMinutes: la.studyMinutes,
      },
      subject,
    });
  });
}
