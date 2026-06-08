/**
 * Response Strategy Engine
 * Quyết định cách AI trả lời dựa trên intent, mode, brain state, độ dài message
 */

import type { BrainState } from './conversation-brain';

export type ResponseStyle =
  | 'step_by_step'
  | 'short_answer'
  | 'hint_first'
  | 'strict_grading'
  | 'interactive_quiz'
  | 'socratic'
  | 'explain_beginner';

export type Verbosity = 'low' | 'medium' | 'high';

export interface ResponseStrategy {
  style: ResponseStyle;
  verbosity: Verbosity;
  ask_question: boolean;
}

// ─── Mapping style → text bổ sung vào system prompt ─────────────────────────

const STYLE_PROMPTS: Record<ResponseStyle, string> = {
  step_by_step:
    'Giải thích từng bước một, đánh số thứ tự rõ ràng. Sau mỗi bước quan trọng hãy đặt câu hỏi kiểm tra hiểu biết.',
  short_answer:
    'Trả lời ngắn gọn, đúng trọng tâm. Tối đa 3-4 câu. Không giải thích lan man.',
  hint_first:
    'Đừng giải thích đáp án ngay. Hỏi học sinh một câu để kiểm tra hiểu biết trước, rồi mới gợi ý từng bước nhỏ.',
  strict_grading:
    'Chấm điểm nghiêm túc và khách quan. Chỉ ra từng lỗi sai cụ thể và giải thích tại sao sai. Cho điểm dạng **Điểm: X/10**.',
  interactive_quiz:
    'Tạo quiz trắc nghiệm đúng format **Câu N:** / A. B. C. D. / **Đáp án: X**. Mỗi câu trên một dòng riêng.',
  socratic:
    'Dùng phương pháp Socratic: không nói thẳng đáp án, thay vào đó đặt câu hỏi dẫn dắt để học sinh tự tìm ra. Chỉ xác nhận/phủ nhận sau khi học sinh trả lời.',
  explain_beginner:
    'Giải thích như đang nói với người mới bắt đầu: dùng ngôn ngữ đơn giản, nhiều ví dụ thực tế gần gũi, tránh thuật ngữ kỹ thuật. Luôn kèm ví dụ minh họa.',
};

const VERBOSITY_PROMPTS: Record<Verbosity, string> = {
  low: 'Phản hồi ngắn (1-3 câu).',
  medium: 'Phản hồi vừa phải (3-6 câu hoặc 2-4 bước).',
  high: 'Phản hồi chi tiết, đầy đủ, có ví dụ minh họa.',
};

// ─── Chọn strategy dựa trên context ─────────────────────────────────────────

export function buildResponseStrategy(
  mode: string,
  brain: BrainState,
  messageLen: number,
): ResponseStrategy {
  if (mode === 'quiz') {
    return { style: 'interactive_quiz', verbosity: 'medium', ask_question: false };
  }

  if (mode === 'homework') {
    return { style: 'strict_grading', verbosity: 'high', ask_question: false };
  }

  if (mode === 'exercise') {
    return { style: 'step_by_step', verbosity: 'medium', ask_question: false };
  }

  if (mode === 'adaptive') {
    // Adaptive: Socratic nếu advanced, explain_beginner nếu basic với nhiều lỗi
    if (brain.level === 'advanced') {
      return { style: 'socratic', verbosity: 'medium', ask_question: true };
    }
    if (brain.level === 'basic' || brain.mistakes.length >= 3) {
      return { style: 'explain_beginner', verbosity: 'high', ask_question: true };
    }
    return { style: 'step_by_step', verbosity: 'medium', ask_question: true };
  }

  // mode === 'tutor' (hoặc 'voice' — xử lý giống tutor)
  if (messageLen < 25) {
    // Câu hỏi rất ngắn → hỏi lại để hiểu ý trước khi giải
    return { style: 'hint_first', verbosity: 'low', ask_question: true };
  }

  if (brain.level === 'basic' && brain.messageCount < 5) {
    // Mới bắt đầu → giải thích dễ hiểu
    return { style: 'explain_beginner', verbosity: 'high', ask_question: false };
  }

  if (brain.mistakes.length >= 2) {
    // Học sinh hay sai → giải thích kỹ từng bước
    return { style: 'step_by_step', verbosity: 'high', ask_question: true };
  }

  if (brain.level === 'advanced') {
    return { style: 'short_answer', verbosity: 'medium', ask_question: false };
  }

  return { style: 'step_by_step', verbosity: 'medium', ask_question: false };
}

// ─── Chuyển strategy thành đoạn text bổ sung vào system prompt ───────────────

export function strategyToPrompt(strategy: ResponseStrategy): string {
  const parts = [STYLE_PROMPTS[strategy.style], VERBOSITY_PROMPTS[strategy.verbosity]];
  if (strategy.ask_question) {
    parts.push('Cuối phản hồi, đặt một câu hỏi nhỏ để kiểm tra học sinh đã hiểu chưa.');
  }
  return parts.join(' ');
}
