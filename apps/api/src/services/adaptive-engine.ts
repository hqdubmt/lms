/**
 * Adaptive Difficulty Engine v2 — bổ sung độc lập, không sửa adaptive-learning.ts
 * Feature flag: ENABLE_ADAPTIVE_ENGINE=true
 *
 * Input: mastery + mistakes + quiz history
 * Output: easy | medium | hard + recommended next challenge
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_ADAPTIVE_ENGINE !== 'false';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface AdaptiveResult {
  level: DifficultyLevel;
  confidence: number;     // 0–1
  reason: string;
  nextChallenge: string;
  adjustedMastery: number;
}

export interface QuizHistoryEntry {
  score: number;          // 0–100
  topic: string;
  timestamp: number;
}

// Quiz history cached per user: quiz:history:{userId}
async function getQuizHistory(userId: string): Promise<QuizHistoryEntry[]> {
  const raw = await redis.get(`quiz:history:${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function computeAdaptiveDifficulty(
  userId: string,
  mastery: Record<string, number>,
  mistakes: Array<{ type: string; count: number }>,
): Promise<AdaptiveResult> {
  if (!ENABLED) {
    return {
      level: 'medium',
      confidence: 0,
      reason: 'Adaptive engine disabled',
      nextChallenge: 'Tiếp tục ôn tập bình thường',
      adjustedMastery: 0.5,
    };
  }

  const masteryValues = Object.values(mastery) as number[];
  const avgMastery = masteryValues.length > 0
    ? masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length
    : 0.5;

  const recentHistory = await getQuizHistory(userId);
  const recent5 = recentHistory.slice(-5);
  const avgQuizScore = recent5.length > 0
    ? recent5.reduce((s, e) => s + e.score, 0) / recent5.length / 100
    : null;

  const totalMistakes = mistakes.reduce((s, m) => s + m.count, 0);

  // Weighted score: 60% mastery + 30% quiz + 10% mistake penalty
  let score = avgMastery * 0.6;
  if (avgQuizScore !== null) score += avgQuizScore * 0.3;
  else score += avgMastery * 0.3;

  const mistakePenalty = Math.min(totalMistakes * 0.02, 0.15);
  score -= mistakePenalty;
  score = Math.max(0, Math.min(1, score));

  const adjustedMastery = Math.round(score * 100) / 100;

  let level: DifficultyLevel;
  let reason: string;
  let nextChallenge: string;
  let confidence: number;

  if (score >= 0.75) {
    level = 'hard';
    confidence = 0.85;
    reason = `Thành thạo cao (${Math.round(score * 100)}%) — sẵn sàng thử thách nâng cao`;
    nextChallenge = 'Thử bài toán mở rộng, vận dụng kiến thức liên môn';
  } else if (score >= 0.45) {
    level = 'medium';
    confidence = 0.80;
    reason = `Tiến bộ tốt (${Math.round(score * 100)}%) — tiếp tục củng cố kiến thức`;
    nextChallenge = 'Làm thêm bài tập ứng dụng, quiz 10 câu';
  } else {
    level = 'easy';
    confidence = 0.90;
    reason = `Cần ôn tập thêm (${Math.round(score * 100)}%) — củng cố kiến thức cơ bản trước`;
    nextChallenge = mistakes.length > 0
      ? `Ôn lại: ${mistakes[0].type}`
      : 'Xem lại lý thuyết và làm bài tập cơ bản';
  }

  return { level, confidence, reason, nextChallenge, adjustedMastery };
}

export async function recordQuizResult(
  userId: string,
  entry: QuizHistoryEntry,
): Promise<void> {
  if (!ENABLED) return;

  const history = await getQuizHistory(userId);
  history.push(entry);
  if (history.length > 50) history.splice(0, history.length - 50);
  await redis.set(`quiz:history:${userId}`, JSON.stringify(history), 'EX', 90 * 24 * 3600);
}
