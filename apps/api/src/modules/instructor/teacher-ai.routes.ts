import { FastifyInstance } from 'fastify';
import { requireInstructor } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import { getBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getStreak } from '../../services/streak';

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Toán học',
  language: 'Ngoại ngữ',
  viet: 'Tiếng Việt',
  general: 'Tổng hợp',
};

export async function teacherAiRoutes(app: FastifyInstance) {
  // GET /instructor/ai-students?classId=<id>&subject=<subject>
  app.get('/ai-students', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { classId?: string; subject?: string };
    const subject = q.subject || 'general';

    const classes = await prisma.class.findMany({
      where: { createdBy: sub },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!classes.length) {
      return reply.send({
        classes: [],
        class: null,
        subject,
        subjectLabel: SUBJECT_LABELS[subject] ?? subject,
        students: [],
        summary: { totalStudents: 0, avgMastery: 0, activeStudents: 0 },
      });
    }

    const targetClass = q.classId
      ? classes.find(c => c.id === q.classId)
      : classes[0];

    if (!targetClass) {
      return reply.status(404).send({ error: 'Không tìm thấy lớp' });
    }

    const members = targetClass.members.map(m => m.user);

    const students = await Promise.all(
      members.map(async user => {
        const [brain, la, streak] = await Promise.all([
          getBrain(user.id, subject),
          getLearningAnalytics(user.id).catch(() => ({
            chatCount: 0, quizCount: 0, homeworkCount: 0,
            voiceCount: 0, studyMinutes: 0, masteryHistory: [],
          })),
          getStreak(user.id).catch(() => ({ currentStreak: 0, bestStreak: 0, totalActiveDays: 0 })),
        ]);

        const masteryValues = Object.values(brain.mastery as Record<string, number>);
        const avgMastery = masteryValues.length
          ? Math.round((masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length) * 100)
          : 0;

        const weakTopics = brain.mistakes
          .filter((m: any) => m.count >= 1)
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 3)
          .map((m: any) => m.type.slice(0, 40));

        const totalActivity = la.chatCount + la.quizCount + la.homeworkCount;

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          avgMastery,
          weakTopics,
          currentTopic: brain.topic,
          level: brain.level,
          chatCount: la.chatCount,
          quizCount: la.quizCount,
          homeworkCount: la.homeworkCount,
          studyMinutes: la.studyMinutes,
          streak: streak.currentStreak,
          totalActivity,
          isActive: totalActivity > 0 || streak.currentStreak > 0,
        };
      }),
    );

    const sorted = students.sort((a, b) => b.avgMastery - a.avgMastery);
    const activeStudents = sorted.filter(s => s.isActive).length;
    const avgMastery = sorted.length
      ? Math.round(sorted.reduce((s, u) => s + u.avgMastery, 0) / sorted.length)
      : 0;

    return reply.send({
      classes: classes.map(c => ({ id: c.id, name: c.name })),
      class: { id: targetClass.id, name: targetClass.name },
      subject,
      subjectLabel: SUBJECT_LABELS[subject] ?? subject,
      students: sorted,
      summary: {
        totalStudents: sorted.length,
        avgMastery,
        activeStudents,
      },
    });
  });
}
