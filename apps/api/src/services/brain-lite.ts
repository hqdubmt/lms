// Phase 5 — BrainLite
// Chỉ lưu 5 trường cốt lõi. Nếu lỗi → fallback về getBrain() đầy đủ.
// Redis key: ai:brain-lite:{userId}:{subject}  TTL 7 ngày

import { redis } from './redis';
import { getBrain, type BrainState } from './conversation-brain';

const LITE_TTL = 7 * 24 * 3600;

export interface BrainLiteState {
  topic:    string | null;
  mastery:  Record<string, number>;
  mistakes: string[];           // chỉ lưu type string, tối đa 5
  level:    'basic' | 'intermediate' | 'advanced';
  goal:     string | null;
}

const DEFAULT_LITE: BrainLiteState = {
  topic:    null,
  mastery:  {},
  mistakes: [],
  level:    'basic',
  goal:     null,
};

function liteKey(userId: string, subject: string): string {
  return `ai:brain-lite:${userId}:${subject}`;
}

export async function getBrainLite(userId: string, subject: string): Promise<BrainLiteState> {
  try {
    const raw = await redis.get(liteKey(userId, subject));
    if (!raw) return { ...DEFAULT_LITE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LITE, ...parsed };
  } catch {
    // Fallback: lấy từ BrainState đầy đủ
    try {
      const full = await getBrain(userId, subject);
      return brainToLite(full);
    } catch {
      return { ...DEFAULT_LITE };
    }
  }
}

export async function updateBrainLite(
  userId: string,
  subject: string,
  patch: Partial<BrainLiteState>,
): Promise<void> {
  try {
    const current = await getBrainLite(userId, subject);
    const updated: BrainLiteState = {
      topic:    patch.topic    ?? current.topic,
      mastery:  patch.mastery  ? { ...current.mastery, ...patch.mastery } : current.mastery,
      mistakes: patch.mistakes ?? current.mistakes,
      level:    patch.level    ?? current.level,
      goal:     patch.goal     ?? current.goal,
    };
    // Giữ tối đa 5 mistakes
    if (updated.mistakes.length > 5) updated.mistakes = updated.mistakes.slice(-5);
    await redis.setex(liteKey(userId, subject), LITE_TTL, JSON.stringify(updated));
  } catch {
    // BrainLite lỗi → silent, brain đầy đủ vẫn hoạt động
  }
}

// Chuyển BrainState đầy đủ → BrainLiteState
export function brainToLite(brain: BrainState): BrainLiteState {
  return {
    topic:    brain.topic,
    mastery:  brain.mastery,
    mistakes: brain.mistakes.slice(-5).map(m => m.type),
    level:    brain.level,
    goal:     brain.goal,
  };
}
