/**
 * Adaptive Learning Engine — Feature 2 (chaiainc.md)
 * AI tự điều chỉnh độ khó dựa trên Mastery + Quiz Score + Mistakes.
 */

import { getBrain } from './conversation-brain';
import { getLearningState } from './learning-state';
import { redis } from './redis';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyResult {
  level: DifficultyLevel;
  avgMastery: number;
  reason: string;
  recommendation: string;
}

// Quiz scores are cached per user in Redis key: quiz:score:{userId}
async function getRecentQuizScore(userId: string): Promise<number | null> {
  const raw = await redis.get(`quiz:score:${userId}`);
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return typeof parsed === 'number' ? parsed : (parsed?.score ?? null);
}

export async function getDifficultyLevel(
  userId: string,
  subject: string,
): Promise<DifficultyResult> {
  const [brain, state] = await Promise.all([
    getBrain(userId, subject),
    getLearningState(userId, subject),
  ]);

  const masteryValues = Object.values(brain.mastery) as number[];
  const avgMastery = masteryValues.length > 0
    ? masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length
    : 0;

  const avgMasteryPct = Math.round(avgMastery * 100);
  const recentMistakes = brain.mistakes.length;
  const quizScore = await getRecentQuizScore(userId);

  // Adaptive rules
  let score = avgMasteryPct;

  // Boost/penalise based on quiz score (clamp to 0-100 trước khi dùng)
  if (quizScore !== null) {
    const clampedQuiz = Math.max(0, Math.min(100, quizScore));
    score = Math.round(score * 0.6 + clampedQuiz * 0.4);
  }

  // Penalise for many recent mistakes
  if (recentMistakes >= 4) score -= 10;
  else if (recentMistakes >= 2) score -= 5;

  // Level hint từ brain — key phải khớp với LearningLevel
  const levelBonus: Record<string, number> = { basic: -10, intermediate: 0, advanced: 10 };
  score += levelBonus[brain.level] ?? 0;

  score = Math.max(0, Math.min(100, score));

  let level: DifficultyLevel;
  let reason: string;
  let recommendation: string;

  if (score < 40) {
    level = 'easy';
    reason = `Mức thành thạo ${avgMasteryPct}% — cần củng cố kiến thức nền`;
    recommendation = 'Học lại lý thuyết cơ bản, làm bài tập dễ';
  } else if (score < 70) {
    level = 'medium';
    reason = `Mức thành thạo ${avgMasteryPct}% — đang tiến bộ tốt`;
    recommendation = 'Thực hành bài tập trung bình, ôn lại điểm yếu';
  } else {
    level = 'hard';
    reason = `Mức thành thạo ${avgMasteryPct}% — đã thành thạo kiến thức cơ bản`;
    recommendation = 'Thử thách với bài tập nâng cao, mở rộng kiến thức';
  }

  return { level, avgMastery: avgMasteryPct, reason, recommendation };
}
