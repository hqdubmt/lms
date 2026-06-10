// Phase 7 — ProviderSelector
// Quy tắc chọn provider theo context, không thay đổi AI API hiện tại.
// Kết quả được truyền vào aiChatStream / aiChatOnce qua opts.prefer.

import type { ProviderPref } from './ai-provider';

export interface ProviderSelectorParams {
  messageLen: number;   // số ký tự của tin nhắn user
  subject: string;
  mode: string;
  isOffline?: boolean;  // client báo offline (navigator.onLine = false)
}

const SHORT_THRESHOLD = 200;  // <= 200 ký tự → Chat ngắn → Groq
const LONG_THRESHOLD  = 800;  // >= 800 ký tự → Chat dài  → Gemini

export function selectProvider(params: ProviderSelectorParams): ProviderPref {
  const { messageLen, subject, mode, isOffline } = params;

  if (isOffline) return 'ollama';

  // Bài dài, cần reasoning → Gemini
  if (messageLen >= LONG_THRESHOLD) return 'gemini';

  // Môn toán / homework cần reasoning → Gemini
  if (subject === 'math' || mode === 'homework') return 'gemini';

  // Tin nhắn ngắn, quiz, exercise → Groq (nhanh)
  if (messageLen <= SHORT_THRESHOLD) return 'groq';
  if (mode === 'quiz' || mode === 'exercise') return 'groq';

  // Default
  return 'groq';
}
