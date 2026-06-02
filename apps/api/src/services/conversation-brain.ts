/**
 * Conversation Brain — AI memory layer
 * Theo dõi trạng thái học tập theo session: topic, goal, level, mistakes, summary
 * Redis key: ai:brain:{userId}:{subject}  TTL 7 ngày
 */

import { redis } from './redis';

const BRAIN_TTL = 7 * 24 * 3600;

export type LearningLevel = 'basic' | 'intermediate' | 'advanced';

export interface BrainState {
  topic: string | null;
  goal: string | null;
  level: LearningLevel;
  mistakes: string[];
  mode: string;
  summary: string | null;
  messageCount: number;
}

const DEFAULT_BRAIN: BrainState = {
  topic: null,
  goal: null,
  level: 'basic',
  mistakes: [],
  mode: 'tutor',
  summary: null,
  messageCount: 0,
};

function brainKey(userId: string, subject: string) {
  return `ai:brain:${userId}:${subject}`;
}

export async function getBrain(userId: string, subject: string): Promise<BrainState> {
  const raw = await redis.get(brainKey(userId, subject));
  if (!raw) return { ...DEFAULT_BRAIN };
  try { return JSON.parse(raw) as BrainState; }
  catch { return { ...DEFAULT_BRAIN }; }
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
      ? [...new Set([...current.mistakes, ...patch.mistakes])].slice(-8)
      : current.mistakes,
    messageCount: (patch.messageCount ?? current.messageCount),
  };
  await redis.set(brainKey(userId, subject), JSON.stringify(updated), 'EX', BRAIN_TTL);
}

export async function deleteBrain(userId: string, subject: string): Promise<void> {
  await redis.del(brainKey(userId, subject));
}

// ─── Trích xuất topic từ tin nhắn người dùng ─────────────────────────────────

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

// ─── Phát hiện level từ ngôn ngữ người dùng ──────────────────────────────────

export function detectLevel(text: string, current: LearningLevel): LearningLevel {
  if (/khó quá|nâng cao|olympic|chuyên sâu|advanced/i.test(text)) return 'advanced';
  if (/dễ hơn|cơ bản|đơn giản|lớp \d|beginner/i.test(text)) return 'basic';
  if (/trung bình|luyện thêm|intermediate/i.test(text)) return 'intermediate';
  return current;
}

// ─── Trích xuất lỗi sai từ phản hồi chấm bài ─────────────────────────────────

export function extractMistakes(aiResponse: string): string[] {
  const mistakes: string[] = [];
  const lines = aiResponse.split('\n');
  for (const line of lines) {
    if (/lỗi|sai|chưa đúng|nhầm|thiếu/i.test(line)) {
      const cleaned = line.replace(/[*#\-•]/g, '').trim();
      if (cleaned.length > 5 && cleaned.length < 120) mistakes.push(cleaned);
    }
  }
  return mistakes.slice(0, 3);
}

// ─── Build context string để inject vào system prompt ─────────────────────────

export function buildBrainContext(brain: BrainState): string {
  const parts: string[] = [];
  if (brain.summary) parts.push(`Tóm tắt hội thoại trước: ${brain.summary}`);
  if (brain.topic) parts.push(`Chủ đề đang học: ${brain.topic}`);
  if (brain.goal) parts.push(`Mục tiêu học sinh: ${brain.goal}`);
  if (brain.level !== 'basic') parts.push(`Trình độ: ${brain.level === 'advanced' ? 'nâng cao' : 'trung bình'}`);
  if (brain.mistakes.length > 0) {
    parts.push(`Lỗi thường gặp của học sinh:\n${brain.mistakes.map(m => `- ${m}`).join('\n')}`);
  }
  return parts.length > 0 ? parts.join('\n') : '';
}

// ─── Tạo summary đơn giản từ brain state ─────────────────────────────────────

export function buildSummary(brain: BrainState, lastUserMsg: string): string {
  const parts: string[] = [];
  if (brain.topic) parts.push(`Đang học về: ${brain.topic}`);
  if (brain.mistakes.length > 0) parts.push(`Cần chú ý: ${brain.mistakes[brain.mistakes.length - 1]}`);
  if (lastUserMsg) parts.push(`Câu hỏi gần nhất: ${lastUserMsg.slice(0, 80)}`);
  return parts.join('. ');
}
