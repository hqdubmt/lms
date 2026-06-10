/**
 * Multi-Agent System — chuẩn hóa V1
 *
 * Chỉ 4 agent:
 *   tutorAgent    — giải thích kiến thức (bao gồm math/quiz/homework hints)
 *   reviewAgent   — phân tích lỗi sai
 *   plannerAgent  — đề xuất bước học tiếp
 *   languageAgent — chỉ cho ngoại ngữ
 */

import type { BrainState } from './conversation-brain';

export type AgentType = 'tutor' | 'review' | 'planner' | 'language';

export interface AgentResult {
  agent: AgentType;
  hint: string;
}

type Subject = 'math' | 'language' | 'viet' | 'general';

// ─── Tutor Agent ──────────────────────────────────────────────────────────────
// Giải thích kiến thức + math/quiz/homework mode hints

function tutorAgent(brain: BrainState, mode: string, subject: Subject, message: string): AgentResult | null {
  const parts: string[] = [];

  if (brain.level) {
    const levelMap: Record<string, string> = {
      basic:        'cơ bản — giải thích đơn giản, nhiều ví dụ cụ thể',
      intermediate: 'trung bình — cân bằng lý thuyết và thực hành',
      advanced:     'nâng cao — ngắn gọn, tập trung vào điểm mấu chốt',
    };
    parts.push(`Mức độ học sinh: ${levelMap[brain.level] ?? brain.level}.`);
  }

  if (brain.mistakes.length > 0) {
    const recent = brain.mistakes.slice(-2).map(m => m.type);
    parts.push(`Lỗi thường gặp: ${recent.join(', ')} — cần chú ý giải thích để tránh nhầm lẫn.`);
  }

  const mastered = Object.entries(brain.mastery)
    .filter(([, v]) => v >= 0.8)
    .map(([k]) => k)
    .slice(0, 3);
  if (mastered.length > 0) {
    parts.push(`Đã thành thạo: ${mastered.join(', ')} — không cần giải thích lại kiến thức cơ bản này.`);
  }

  // Math: yêu cầu LaTeX
  if (subject === 'math') {
    parts.push('Dùng LaTeX ($..$ inline, $$..$$ block) cho mọi công thức toán. Trình bày: Phân tích đề → Phương pháp giải → Giải chi tiết từng bước → Kiểm tra / kết luận.');
  }

  // Quiz mode: định dạng câu hỏi
  if (mode === 'quiz') {
    const weak = Object.entries(brain.mastery).filter(([, v]) => v < 0.5).map(([k]) => k);
    const numQ = weak.length > 0 ? 5 : 4;
    const topicHint = weak.length > 0
      ? `Ưu tiên kiểm tra chủ đề yếu: ${weak.slice(0, 2).join(', ')}.`
      : 'Bao phủ đều các chủ đề đã học.';

    const wantTF    = /đúng.*sai|true.*false/i.test(message);
    const wantFill  = /điền từ|fill.{0,5}blank|điền vào/i.test(message);
    const wantMatch = /nối đôi|nối cặp|matching/i.test(message);
    const hasExplicit = wantTF || wantFill || wantMatch;
    const useMCQ   = !hasExplicit || /trắc nghiệm|mcq/i.test(message);
    const useTF    = wantTF    || (!hasExplicit && subject !== 'math');
    const useFill  = wantFill  || (!hasExplicit && (subject === 'language' || subject === 'viet'));
    const useMatch = wantMatch || (!hasExplicit && subject === 'language');

    const FORMATS: Record<string, string> = {
      mcq:   '**MCQ:**\n**Câu N:** [câu hỏi]\nA. ...\nB. ...\nC. ...\nD. ...\n**Đáp án: A**',
      tf:    '**Đúng/Sai:**\n**Câu N (Đúng/Sai):** [câu khẳng định]\n**Đáp án: Đúng**',
      fill:  '**Điền từ:**\n**Câu N (Điền từ):** [câu có ___ là chỗ trống]\n**Đáp án:** [từ/cụm từ]',
      match: '**Nối đôi:**\n**Câu N (Nối đôi):** [chủ đề]\n1.[item] | A.[item]\n**Đáp án:** 1-A',
    };
    const selected: string[] = [];
    if (useMCQ)   selected.push(FORMATS.mcq);
    if (useTF)    selected.push(FORMATS.tf);
    if (useFill)  selected.push(FORMATS.fill);
    if (useMatch) selected.push(FORMATS.match);
    if (selected.length === 0) selected.push(FORMATS.mcq);

    parts.push(`Tạo ${numQ} câu quiz. ${topicHint}\nFormat bắt buộc:\n${selected.join('\n\n')}`);
  }

  // Homework mode: rubric chấm điểm
  if (mode === 'homework') {
    const rubrics: Record<Subject, string> = {
      math:     'Tiêu chí: Đặt vấn đề 30% + Tính toán đúng 40% + Kết quả chính xác 20% + Trình bày 10%.',
      viet:     'Tiêu chí: Chính tả 25% + Ngữ pháp 25% + Diễn đạt 25% + Nội dung phù hợp 25%.',
      language: 'Criteria: Grammar 30% + Vocabulary 30% + Coherence 20% + Accuracy 20%.',
      general:  'Tiêu chí: Hiểu đúng yêu cầu 30% + Nội dung đầy đủ 40% + Trình bày rõ ràng 30%.',
    };
    parts.push(`${rubrics[subject] ?? rubrics.general} Bắt buộc có **Điểm: X/10** ở cuối phản hồi.`);
  }

  if (!parts.length) return null;
  return { agent: 'tutor', hint: `[Tutor Agent] ${parts.join(' ')}` };
}

// ─── Review Agent ─────────────────────────────────────────────────────────────
// Phân tích lỗi sai của học sinh

function reviewAgent(brain: BrainState): AgentResult | null {
  if (brain.mistakes.length < 3) return null;
  const types = [...new Set(brain.mistakes.slice(-4).map(m => m.type))];
  return {
    agent: 'review',
    hint: `[Review Agent] Học sinh hay mắc lỗi: ${types.join(', ')}. Chủ động nhắc nhở và giải thích để tránh tái phạm trong phản hồi này.`,
  };
}

// ─── Planner Agent ────────────────────────────────────────────────────────────
// Đề xuất bước học tiếp + coaching tiến độ

function plannerAgent(brain: BrainState, subject: Subject): AgentResult | null {
  const entries = Object.entries(brain.mastery);
  const weak = entries.filter(([, v]) => v < 0.5).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);
  const near = entries.filter(([, v]) => v >= 0.5 && v < 0.8).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);

  const SUBJECT_PATH: Record<Subject, string> = {
    math:     'nền tảng số học → đại số → hình học → giải tích',
    language: 'từ vựng cơ bản → ngữ pháp → kỹ năng nghe-nói → đọc-viết nâng cao',
    viet:     'chính tả → ngữ pháp → văn phong → nghị luận',
    general:  'hiểu khái niệm → áp dụng → phân tích → sáng tạo',
  };

  const parts: string[] = [];
  if (weak.length > 0) parts.push(`Ưu tiên ôn tập: ${weak.join(', ')}`);
  if (near.length > 0) parts.push(`Gần thành thạo: ${near.join(', ')} — chỉ cần thêm luyện tập`);
  if (brain.messageCount > 0 && brain.messageCount % 5 === 0) {
    parts.push(`Học sinh đã học ${brain.messageCount} lần — nên tổng kết kiến thức đã học`);
  }
  if (weak.length > 0 || near.length > 0) {
    parts.push(`Lộ trình: ${SUBJECT_PATH[subject]}`);
  }

  if (parts.length === 0) return null;
  return {
    agent: 'planner',
    hint: `[Planner Agent] ${parts.join('. ')}. Nếu phù hợp, gợi ý bước học tiếp theo ở cuối phản hồi.`,
  };
}

// ─── Language Agent ───────────────────────────────────────────────────────────
// Chỉ dùng cho môn ngoại ngữ

function languageAgent(subject: Subject, message: string, brain: BrainState): AgentResult | null {
  if (subject !== 'language') return null;

  const wantPronunciation = /phát âm|pronunciation|ipa|đọc như thế nào|how to say|stress|syllable|trọng âm/i.test(message);
  const wantGrammar       = /ngữ pháp|grammar|cấu trúc|sentence structure|tense|thì/i.test(message);
  const wantVocabulary    = /từ vựng|vocabulary|từ mới|word meaning|synonym|antonym/i.test(message);
  const wantTranslation   = /dịch|translate|nghĩa là gì|how do you say|mean/i.test(message);
  const wantWriting       = /sửa bài viết|check writing|essay|paragraph|composition/i.test(message);

  let instruction: string;
  if (wantPronunciation) {
    instruction = 'Cung cấp IPA đầy đủ, trọng âm (ˈ), phiên âm tiếng Việt, lỗi phát âm thường gặp và câu ví dụ.';
  } else if (wantGrammar) {
    instruction = 'Giải thích công thức ngữ pháp, ví dụ thực tế, so sánh các thì, và lỗi học sinh Việt thường mắc.';
  } else if (wantVocabulary) {
    instruction = 'Cung cấp IPA, nghĩa chính/phụ, từ đồng nghĩa/trái nghĩa, collocations và ví dụ câu tự nhiên.';
  } else if (wantTranslation) {
    instruction = 'Dịch chính xác, giải thích sắc thái nghĩa, liệt kê các cách diễn đạt thay thế.';
  } else if (wantWriting) {
    instruction = 'Sửa lỗi theo thứ tự: grammar → vocabulary → coherence → style. Cho điểm /10 và 3 gợi ý cải thiện.';
  } else {
    instruction = 'Hỗ trợ học tiếng Anh. Dùng ví dụ thực tế, ngữ cảnh giao tiếp hàng ngày, khuyến khích nói.';
  }

  const weakAreas = Object.entries(brain.mastery as Record<string, number>)
    .filter(([, v]) => v < 0.5).map(([k]) => k).slice(0, 2);
  const weakHint = weakAreas.length > 0
    ? ` Chú ý: học sinh đang yếu phần ${weakAreas.join(', ')} — giải thích kỹ hơn.`
    : '';

  return {
    agent: 'language',
    hint: `[Language Agent] ${instruction}${weakHint}`,
  };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export interface MultiAgentParams {
  subject: string;
  mode: string;
  brain: BrainState;
  message: string;
}

export function runMultiAgent(params: MultiAgentParams): AgentResult[] {
  const { subject, mode, brain, message } = params;
  const s = subject as Subject;

  const results: Array<AgentResult | null> = [
    tutorAgent(brain, mode, s, message),
    reviewAgent(brain),
    plannerAgent(brain, s),
    languageAgent(s, message, brain),
  ];

  return results.filter((r): r is AgentResult => r !== null);
}
