import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { generateStudyPlan } from '../../services/study-plan';
import { getBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getStreak } from '../../services/streak';

export async function studyPlanRoutes(app: FastifyInstance) {
  app.get('/study-plan', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string; days?: string };
    const subject = q.subject || 'general';
    const rawDays = parseInt(q.days ?? '7', 10);
    const days = ([7, 14, 30].includes(rawDays) ? rawDays : 7) as 7 | 14 | 30;
    return reply.send(await generateStudyPlan(sub, subject, days));
  });

  app.get('/weekly-goals', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const [plan, la, streak] = await Promise.all([
      generateStudyPlan(sub, subject, 7),
      getLearningAnalytics(sub),
      getStreak(sub),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const weekPlan = plan.plan.slice(0, 7);
    const todayPlan = weekPlan.find(d => d.date === today) ?? weekPlan[0];

    // Progress this week: count events since Monday
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const goals = [
      {
        id: 'chat-5',
        title: 'Chat với AI 5 lần',
        description: 'Trao đổi với AI Tutor để củng cố kiến thức',
        target: 5,
        progress: Math.min(5, la.chatCount),
        unit: 'lần',
        xpReward: 50,
      },
      {
        id: 'quiz-3',
        title: 'Hoàn thành 3 quiz',
        description: 'Làm bài kiểm tra để đánh giá kiến thức',
        target: 3,
        progress: Math.min(3, la.quizCount),
        unit: 'bài',
        xpReward: 75,
      },
      {
        id: 'streak-5',
        title: 'Duy trì streak 5 ngày',
        description: 'Học đều đặn mỗi ngày trong tuần',
        target: 5,
        progress: Math.min(5, streak.currentStreak),
        unit: 'ngày',
        xpReward: 100,
      },
      {
        id: 'homework-2',
        title: 'Nộp 2 bài tập',
        description: 'Hoàn thành bài tập để luyện tập chuyên sâu',
        target: 2,
        progress: Math.min(2, la.homeworkCount),
        unit: 'bài',
        xpReward: 60,
      },
    ];

    return reply.send({
      subject,
      weekOf: monday.toISOString().slice(0, 10),
      todayFocus: todayPlan?.focus ?? 'Ôn tập tổng hợp',
      todayActivities: todayPlan?.activities ?? [],
      goals,
      weekPlan,
      streak: streak.currentStreak,
    });
  });

  app.get('/monthly-progress', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string };
    const subject = q.subject || 'general';

    const [plan, brain, la, streak] = await Promise.all([
      generateStudyPlan(sub, subject, 30),
      getBrain(sub, subject),
      getLearningAnalytics(sub),
      getStreak(sub),
    ]);

    const masteryMap = brain.mastery as Record<string, number>;
    const masteryEntries = Object.entries(masteryMap);
    const avgMastery = masteryEntries.length
      ? masteryEntries.reduce((s, [, v]) => s + v, 0) / masteryEntries.length
      : 0;

    // Mastery history for chart
    const masteryHistory = la.masteryHistory.slice(-30);

    // Month at a glance
    const totalStudyDays = streak.totalActiveDays;
    const progressPct = Math.min(100, Math.round(
      (la.chatCount * 2 + la.quizCount * 5 + la.homeworkCount * 7) / 3,
    ));

    // Milestones
    const milestones = [
      {
        id: 'first-week',
        title: 'Hoàn thành tuần 1',
        description: 'Học đều 7 ngày đầu tiên',
        reached: totalStudyDays >= 7,
        target: 7,
        progress: Math.min(7, totalStudyDays),
      },
      {
        id: 'mastery-50',
        title: 'Thành thạo 50%',
        description: 'Đạt mức thành thạo trung bình ≥50%',
        reached: avgMastery >= 0.5,
        target: 50,
        progress: Math.round(avgMastery * 100),
      },
      {
        id: 'quiz-10',
        title: '10 bài quiz',
        description: 'Hoàn thành 10 bài quiz trong tháng',
        reached: la.quizCount >= 10,
        target: 10,
        progress: Math.min(10, la.quizCount),
      },
      {
        id: 'streak-14',
        title: 'Streak 14 ngày',
        description: 'Học liên tiếp 14 ngày',
        reached: streak.bestStreak >= 14,
        target: 14,
        progress: Math.min(14, streak.bestStreak),
      },
    ];

    return reply.send({
      subject,
      monthPlan: plan.plan,
      weakTopics: plan.weakTopics,
      progressPct,
      avgMastery: Math.round(avgMastery * 100),
      masteryHistory,
      totalStudyDays,
      milestones,
      activity: {
        chatCount: la.chatCount,
        quizCount: la.quizCount,
        homeworkCount: la.homeworkCount,
        voiceCount: la.voiceCount,
        studyMinutes: la.studyMinutes,
      },
      streak: {
        current: streak.currentStreak,
        best: streak.bestStreak,
      },
    });
  });
}
