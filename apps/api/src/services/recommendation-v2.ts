/**
 * Recommendation v2 — bổ sung độc lập, không sửa recommendation.ts
 * Sinh: next lesson, next quiz, review topic
 */

import { getLearningState } from './learning-state';
import { analyzeKnowledgeGap } from './knowledge-gap';
import { getBrain } from './conversation-brain';
import { prisma } from './prisma';

export interface RecommendationV2 {
  nextLesson: { id: string; title: string; courseTitle: string; reason: string } | null;
  nextQuiz:   { id: string; title: string; topic: string; reason: string } | null;
  reviewTopic: { topic: string; reason: string; urgency: 'high' | 'medium' | 'low' } | null;
  estimatedMinutes: number;
}

export async function getRecommendationsV2(
  userId: string,
  subject: string,
): Promise<RecommendationV2> {
  const [brain, state, gap] = await Promise.all([
    getBrain(userId, subject),
    getLearningState(userId, subject),
    analyzeKnowledgeGap(userId, subject),
  ]);

  const rec: RecommendationV2 = {
    nextLesson: null,
    nextQuiz: null,
    reviewTopic: null,
    estimatedMinutes: 0,
  };

  // Review topic — highest urgency weak area
  if (gap.weak.length > 0) {
    const topWeak = gap.weak[0];
    const mistakeCount = brain.mistakes.find(m => m.type === topWeak)?.count ?? 1;
    rec.reviewTopic = {
      topic: topWeak,
      reason: `Gặp khó khăn ${mistakeCount} lần — cần ôn lại`,
      urgency: mistakeCount >= 3 ? 'high' : mistakeCount >= 2 ? 'medium' : 'low',
    };
    rec.estimatedMinutes += 15;
  }

  // Next lesson — find a lesson related to strong topic or current topic
  const targetTopic = state.currentLesson || brain.topic || (gap.strong[0] ?? gap.weak[0]);
  if (targetTopic) {
    try {
      const words = targetTopic.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
      const lesson = await prisma.lesson.findFirst({
        where: {
          OR: words.map(w => ({ title: { contains: w, mode: 'insensitive' as const } })),
        },
        select: {
          id: true,
          title: true,
          section: { select: { course: { select: { title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (lesson) {
        rec.nextLesson = {
          id: lesson.id,
          title: lesson.title,
          courseTitle: lesson.section?.course?.title ?? '',
          reason: gap.weak.length > 0
            ? `Bài học hỗ trợ ôn: ${gap.weak[0]}`
            : `Tiếp tục từ chủ đề: ${targetTopic}`,
        };
        rec.estimatedMinutes += 20;
      }
    } catch { /* ignore */ }
  }

  // Next quiz — find a quiz for a weak topic
  const quizTopic = gap.weak[0] ?? gap.strong[0];
  if (quizTopic) {
    try {
      const words = quizTopic.split(/\s+/).filter(w => w.length > 2).slice(0, 2);
      const quiz = await prisma.quizSet.findFirst({
        where: {
          isPublic: true,
          OR: words.map(w => ({ topic: { contains: w, mode: 'insensitive' as const } })),
        },
        select: { id: true, title: true, topic: true },
        orderBy: { createdAt: 'desc' },
      });
      if (quiz) {
        rec.nextQuiz = {
          id: quiz.id,
          title: quiz.title,
          topic: quiz.topic ?? quizTopic,
          reason: gap.weak.includes(quizTopic)
            ? `Luyện tập chủ đề yếu: ${quizTopic}`
            : `Kiểm tra và củng cố: ${quizTopic}`,
        };
        rec.estimatedMinutes += 10;
      }
    } catch { /* ignore */ }
  }

  if (rec.estimatedMinutes === 0) rec.estimatedMinutes = 15;

  return rec;
}
