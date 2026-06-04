import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { getBrain } from '../../services/conversation-brain';
import { getAchievements } from '../../services/achievement';
import { getStreak } from '../../services/streak';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getAnalyticsSummary } from '../../services/analytics';

const SUBJECTS = ['math', 'language', 'viet', 'general'];

export async function reportCardRoutes(app: FastifyInstance) {
  app.get('/report-card', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const [brain, achievements, streak, la, summary] = await Promise.all([
      getBrain(sub, subject),
      getAchievements(sub),
      getStreak(sub),
      getLearningAnalytics(sub),
      getAnalyticsSummary(sub, subject, 30).catch(() => null),
    ]);

    // Mastery breakdown
    const masteryMap = brain.mastery as Record<string, number>;
    const masteryEntries = Object.entries(masteryMap).map(([topic, score]) => ({
      topic,
      score: Math.round(score * 100),
    }));
    const masteryAvg = masteryEntries.length
      ? Math.round(masteryEntries.reduce((s, e) => s + e.score, 0) / masteryEntries.length)
      : 0;

    const strongTopics = masteryEntries
      .filter(e => e.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const weakTopics = masteryEntries
      .filter(e => e.score < 60)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    // Mistake summary
    const mistakeCounts: Record<string, number> = {};
    for (const m of brain.mistakes) {
      mistakeCounts[m.type] = (mistakeCounts[m.type] ?? 0) + 1;
    }

    // Unlocked achievements
    const unlockedAch = achievements.filter(a => a.unlockedAt !== null);

    // Study time estimate (minutes)
    const studyMinutes = la.studyMinutes + (la.chatCount * 3) + (la.quizCount * 5) + (la.homeworkCount * 10);

    // Grade calculation
    let grade = 'F';
    if (masteryAvg >= 90) grade = 'A+';
    else if (masteryAvg >= 80) grade = 'A';
    else if (masteryAvg >= 70) grade = 'B';
    else if (masteryAvg >= 60) grade = 'C';
    else if (masteryAvg >= 50) grade = 'D';

    return reply.send({
      subject,
      grade,
      masteryAvg,
      strongTopics,
      weakTopics,
      mistakeSummary: Object.entries(mistakeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      activity: {
        chatCount: la.chatCount,
        quizCount: la.quizCount,
        homeworkCount: la.homeworkCount,
        voiceCount: la.voiceCount,
        studyMinutes,
      },
      streak: {
        current: streak.currentStreak,
        best: streak.bestStreak,
        totalDays: streak.totalActiveDays,
      },
      achievements: {
        total: achievements.length,
        unlocked: unlockedAch.length,
        recent: unlockedAch
          .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
          .slice(0, 3),
      },
      analytics: summary,
      generatedAt: new Date().toISOString(),
    });
  });
}
