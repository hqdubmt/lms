import { getLearningState } from './learning-state';
import { analyzeKnowledgeGap } from './knowledge-gap';
import { prisma } from './prisma';

export interface Recommendation {
  lesson?: { id: string; title: string; courseTitle: string };
  quiz?: { id: string; title: string };
  exercise?: string;
  reasons: string[];
}

export async function getRecommendations(userId: string, subject: string): Promise<Recommendation> {
  const [, gap] = await Promise.all([
    getLearningState(userId, subject),
    analyzeKnowledgeGap(userId, subject),
  ]);

  const rec: Recommendation = { reasons: [] };

  if (gap.weak.length > 0) {
    try {
      const lesson = await prisma.lesson.findFirst({
        where: {
          OR: gap.weak.slice(0, 3).map(w => ({
            title: { contains: w.split(' ')[0], mode: 'insensitive' as const },
          })),
        },
        select: {
          id: true,
          title: true,
          section: { select: { course: { select: { title: true } } } },
        },
      });
      if (lesson) {
        rec.lesson = {
          id: lesson.id,
          title: lesson.title,
          courseTitle: lesson.section?.course?.title ?? '',
        };
        rec.reasons.push(`Cần ôn lại: ${gap.weak[0]}`);
      }
    } catch { /* ignore */ }

    try {
      const quiz = await prisma.quizSet.findFirst({
        where: {
          isPublic: true,
          OR: gap.weak.slice(0, 2).map(w => ({
            topic: { contains: w.split(' ')[0], mode: 'insensitive' as const },
          })),
        },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
      });
      if (quiz) {
        rec.quiz = quiz;
        rec.reasons.push(`Luyện tập thêm: ${gap.weak[0]}`);
      }
    } catch { /* ignore */ }

    rec.exercise = `Làm thêm bài tập về ${gap.weak[0]}`;
  }

  if (rec.reasons.length === 0) {
    rec.reasons.push('Tiếp tục học chủ đề tiếp theo');
  }

  return rec;
}
