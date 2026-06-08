/**
 * AI Orchestrator Engine
 * Quyết định: model nào, có dùng RAG không, có rewrite query không
 *
 * Routing logic:
 *   quiz / exercise / tin nhắn ngắn  → Groq  (nhanh, phù hợp task nhẹ)
 *   math explain / viet / homework   → Gemini (reasoning tốt hơn)
 *   fallback                         → Ollama (local, không cần API key)
 */

import type { BrainState } from './conversation-brain';

export type ProviderPref = 'groq' | 'gemini' | 'ollama';

export interface OrchestrationResult {
  preferredProvider: ProviderPref | null; // null = dùng default (Groq)
  useRAG: boolean;
  expandQuery: boolean; // có nên mở rộng query bằng brain.topic không
}

export function orchestrate(params: {
  subject: string;
  mode: string;
  brain: BrainState;
  message: string;
  messageLen: number;
  ragIndexSize: number;
}): OrchestrationResult {
  const { subject, mode, message, messageLen, ragIndexSize, brain } = params;

  // ── Model routing theo task ──────────────────────────────────────────────
  let preferredProvider: ProviderPref | null = null;

  if (mode === 'quiz' || mode === 'exercise') {
    preferredProvider = 'groq';       // cần nhanh, không cần reasoning sâu
  } else if (mode === 'adaptive') {
    preferredProvider = 'gemini';     // adaptive cần reasoning để cá nhân hóa
  } else if (messageLen < 60 && mode === 'tutor') {
    preferredProvider = 'groq';       // câu hỏi ngắn → trả lời nhanh
  } else if (mode === 'homework') {
    preferredProvider = 'gemini';     // chấm bài cần phân tích kỹ
  } else if (subject === 'math' && mode === 'tutor') {
    preferredProvider = 'gemini';     // math reasoning
  } else if (subject === 'viet' && mode === 'tutor') {
    preferredProvider = 'gemini';     // tiếng Việt tự nhiên hơn
  } else if (subject === 'language') {
    preferredProvider = 'groq';       // language tasks: Groq nhanh và tốt
  }

  // ── RAG decision ─────────────────────────────────────────────────────────
  // Bỏ qua RAG nếu: index trống, tin nhắn quá ngắn, hoặc là câu hỏi chào hỏi
  const trivial = /^(xin chào|hello|hi\b|chào|ok\b|oke|cảm ơn|thanks|bye|tạm biệt)/i.test(message.trim());
  const useRAG = ragIndexSize > 0 && messageLen >= 8 && !trivial;

  // ── Query expansion ───────────────────────────────────────────────────────
  // Mở rộng query bằng brain.topic khi câu hỏi ngắn + có topic từ trước
  const expandQuery = !!brain.topic && messageLen < 40 && !trivial;

  return { preferredProvider, useRAG, expandQuery };
}
