/**
 * Conversation Brain — AI memory layer
 * Redis key: ai:brain:{userId}:{subject}  TTL 7 ngày
 *
 * Nâng cấp v2:
 * - Structured mistakes với count + lastSeen timestamp
 * - Memory decay: lỗi cũ tự mờ dần theo thời gian
 * - Mastery tracking per concept (0.0 – 1.0)
 */

import { redis } from './redis';

const BRAIN_TTL = 7 * 24 * 3600;
const DECAY_RATE = 0.15; // per day — importance = count × exp(-rate × ageDays)

export type LearningLevel = 'basic' | 'intermediate' | 'advanced';

export interface MistakeRecord {
  type: string;       // mô tả lỗi (tối đa 80 ký tự)
  count: number;      // số lần gặp
  lastSeen: number;   // Unix ms timestamp
}

export interface BrainState {
  topic: string | null;
  goal: string | null;
  level: LearningLevel;
  mistakes: MistakeRecord[];
  mastery: Record<string, number>; // concept slug → 0.0–1.0
  messageCount: number;
}

const DEFAULT_BRAIN: BrainState = {
  topic: null,
  goal: null,
  level: 'basic',
  mistakes: [],
  mastery: {},
  messageCount: 0,
};

function brainKey(userId: string, subject: string) {
  return `ai:brain:${userId}:${subject}`;
}

// ─── Memory decay: lọc bỏ mistakes đã cũ / không quan trọng ─────────────────

function applyDecay(brain: BrainState): BrainState {
  const now = Date.now();
  const decayed = brain.mistakes
    .map(m => ({
      ...m,
      _importance: m.count * Math.exp(-DECAY_RATE * (now - m.lastSeen) / 86400000),
    }))
    .filter(m => m._importance > 0.2)
    .sort((a, b) => b._importance - a._importance)
    .slice(0, 6)
    .map(({ _importance: _, ...m }) => m);
  return { ...brain, mistakes: decayed };
}

// ─── Migration: chuẩn hoá brain đọc từ Redis (backward compat) ───────────────

function normalizeBrain(raw: any): BrainState {
  const brain: BrainState = { ...DEFAULT_BRAIN, ...raw };
  // Migrate old string[] mistakes → MistakeRecord[]
  if (Array.isArray(brain.mistakes) && brain.mistakes.length > 0 && typeof brain.mistakes[0] === 'string') {
    brain.mistakes = (brain.mistakes as unknown as string[]).map(m => ({
      type: m.slice(0, 80),
      count: 1,
      lastSeen: Date.now(),
    }));
  }
  if (!brain.mastery || typeof brain.mastery !== 'object') brain.mastery = {};
  return brain;
}

export async function getBrain(userId: string, subject: string): Promise<BrainState> {
  const raw = await redis.get(brainKey(userId, subject));
  if (!raw) return { ...DEFAULT_BRAIN };
  try {
    return applyDecay(normalizeBrain(JSON.parse(raw)));
  } catch {
    return { ...DEFAULT_BRAIN };
  }
}

// ─── Merge mistakes: tăng count nếu trùng type, dedup trong incoming ─────────

function mergeMistakes(current: MistakeRecord[], incoming: MistakeRecord[]): MistakeRecord[] {
  const now = Date.now();
  const map = new Map(current.map(m => [m.type, { ...m }]));
  // Dedup incoming trước — nếu cùng type, gộp count
  const incomingDeduped = new Map<string, number>();
  for (const m of incoming) {
    incomingDeduped.set(m.type, (incomingDeduped.get(m.type) ?? 0) + 1);
  }
  for (const [type, cnt] of incomingDeduped) {
    const existing = map.get(type);
    if (existing) {
      existing.count += cnt;
      existing.lastSeen = now;
    } else {
      map.set(type, { type, count: cnt, lastSeen: now });
    }
  }
  return [...map.values()].slice(-8);
}

export async function updateBrain(
  userId: string,
  subject: string,
  patch: Partial<BrainState>,
): Promise<void> {
  const current = await getBrain(userId, subject);
  const updated: BrainState = {
    ...current,
    ...patch,
    mistakes: patch.mistakes
      ? mergeMistakes(current.mistakes, patch.mistakes)
      : current.mistakes,
    mastery: patch.mastery
      ? { ...current.mastery, ...patch.mastery }
      : current.mastery,
    messageCount: patch.messageCount ?? current.messageCount,
  };
  await redis.set(brainKey(userId, subject), JSON.stringify(updated), 'EX', BRAIN_TTL);
}

// ─── Mastery update — EMA style ───────────────────────────────────────────────

export async function updateMastery(
  userId: string,
  subject: string,
  concept: string,
  score01: number, // 0.0 – 1.0
): Promise<void> {
  const brain = await getBrain(userId, subject);
  const current = brain.mastery[concept] ?? 0.5;
  const updated = current * 0.7 + score01 * 0.3;
  await updateBrain(userId, subject, {
    mastery: { ...brain.mastery, [concept]: Math.round(updated * 100) / 100 },
  });
}

export async function deleteBrain(userId: string, subject: string): Promise<void> {
  await redis.del(brainKey(userId, subject));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'là', 'có', 'và', 'của', 'trong', 'với', 'cho', 'hãy', 'giải', 'thích',
  'tôi', 'em', 'bài', 'câu', 'muốn', 'cần', 'học', 'hiểu', 'biết', 'nào',
  'thế', 'sao', 'gì', 'tại', 'vì', 'how', 'what', 'why', 'can', 'the',
]);

export function extractTopic(text: string): string | null {
  const words = text
    .toLowerCase()
    .replace(/[?!.,;:]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  if (!words.length) return null;
  return words.slice(0, 4).join(' ');
}

export function detectLevel(text: string, current: LearningLevel): LearningLevel {
  if (/khó quá|nâng cao|olympic|chuyên sâu|advanced/i.test(text)) return 'advanced';
  if (/dễ hơn|cơ bản|đơn giản|lớp \d|beginner/i.test(text)) return 'basic';
  if (/trung bình|luyện thêm|intermediate/i.test(text)) return 'intermediate';
  return current;
}

export function extractMistakes(aiResponse: string): MistakeRecord[] {
  const now = Date.now();
  const mistakes: MistakeRecord[] = [];
  for (const line of aiResponse.split('\n')) {
    if (/lỗi|sai|chưa đúng|nhầm|thiếu/i.test(line)) {
      const cleaned = line.replace(/[*#\-•]/g, '').trim();
      if (cleaned.length > 5 && cleaned.length < 120) {
        mistakes.push({ type: cleaned.slice(0, 80), count: 1, lastSeen: now });
      }
    }
  }
  return mistakes.slice(0, 3);
}

export function buildBrainContext(brain: BrainState): string {
  const parts: string[] = [];
  if (brain.topic) parts.push(`Chủ đề: ${brain.topic}`);
  if (brain.goal) parts.push(`Mục tiêu: ${brain.goal}`);
  if (brain.level !== 'basic') {
    parts.push(`Trình độ: ${brain.level === 'advanced' ? 'nâng cao' : 'trung bình'}`);
  }
  if (brain.mistakes.length > 0) {
    const topMistakes = brain.mistakes
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(m => `- ${m.type} (${m.count}x)`)
      .join('\n');
    parts.push(`Lỗi thường gặp:\n${topMistakes}`);
  }
  const masteryEntries = Object.entries(brain.mastery).filter(([, v]) => v > 0);
  if (masteryEntries.length > 0) {
    const top = masteryEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${Math.round(v * 100)}%`)
      .join(', ');
    parts.push(`Mức độ thành thạo: ${top}`);
  }
  return parts.join('\n');
}

