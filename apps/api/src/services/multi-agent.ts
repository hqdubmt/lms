/**
 * Multi-Agent System — Phase 3
 *
 * Nhiều agent xử lý song song, mỗi agent bổ sung context chuyên biệt
 * vào system prompt của main LLM.
 * Không thay đổi luồng chat hiện tại — chỉ mở rộng qua Orchestrator.
 */

import type { BrainState } from './conversation-brain';
import { getTopConcepts } from './knowledge-graph';

export type AgentType = 'tutor' | 'math' | 'quiz' | 'homework' | 'language' | 'research' | 'review' | 'knowledge_graph' | 'learning_coach' | 'reflection' | 'self_correction' | 'critic' | 'planner';

export interface AgentResult {
  agent: AgentType;
  hint: string;
}

type Subject = 'math' | 'language' | 'viet' | 'general';

// ─── Individual Agents ────────────────────────────────────────────────────────

function tutorAgent(brain: BrainState): AgentResult | null {
  const parts: string[] = [];

  if (brain.level) {
    const levelMap: Record<string, string> = {
      beginner:     'cơ bản — giải thích đơn giản, nhiều ví dụ cụ thể',
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

  if (!parts.length) return null;
  return { agent: 'tutor', hint: `[Tutor Agent] ${parts.join(' ')}` };
}

function mathAgent(message: string): AgentResult | null {
  const MATH_KEYWORDS =
    /phương trình|đạo hàm|tích phân|hàm số|xác suất|hình học|đại số|lượng giác|số học|tổ hợp|ma trận|vector|giới hạn|chuỗi số|bất đẳng thức|căn thức|logarit|mũ/i;
  if (!MATH_KEYWORDS.test(message)) return null;
  return {
    agent: 'math',
    hint: '[Math Agent] Dùng LaTeX ($..$ inline, $$...$$ block) cho mọi công thức toán. Trình bày: Phân tích đề → Phương pháp giải → Giải chi tiết từng bước → Kiểm tra / kết luận.',
  };
}

function quizAgent(brain: BrainState, subject: Subject, message: string): AgentResult {
  const weak = Object.entries(brain.mastery)
    .filter(([, v]) => v < 0.5)
    .map(([k]) => k);
  const numQ = weak.length > 0 ? 5 : 4;
  const topicHint = weak.length > 0
    ? `Ưu tiên kiểm tra chủ đề yếu: ${weak.slice(0, 2).join(', ')}.`
    : 'Bao phủ đều các chủ đề đã học.';

  // Detect explicit type request from user message
  const wantTF    = /đúng.*sai|true.*false/i.test(message);
  const wantFill  = /điền từ|fill.{0,5}blank|điền vào/i.test(message);
  const wantMatch = /nối đôi|nối cặp|matching/i.test(message);
  const hasExplicit = wantTF || wantFill || wantMatch;

  // Chọn loại câu theo subject + explicit request
  const useMCQ   = !hasExplicit || /trắc nghiệm|mcq/i.test(message);
  const useTF    = wantTF    || (!hasExplicit && subject !== 'math');
  const useFill  = wantFill  || (!hasExplicit && (subject === 'language' || subject === 'viet'));
  const useMatch = wantMatch || (!hasExplicit && subject === 'language');

  const FORMATS: Record<string, string> = {
    mcq:   '**MCQ:**\n**Câu N:** [câu hỏi]\nA. ...\nB. ...\nC. ...\nD. ...\n**Đáp án: A**',
    tf:    '**Đúng/Sai:**\n**Câu N (Đúng/Sai):** [câu khẳng định cần đánh giá]\n**Đáp án: Đúng**',
    fill:  '**Điền từ:**\n**Câu N (Điền từ):** [câu có ___ là chỗ trống]\n**Đáp án:** [từ/cụm từ]',
    match: '**Nối đôi:**\n**Câu N (Nối đôi):** [chủ đề]\n1.[item] | 2.[item] | 3.[item]\nA.[item] | B.[item] | C.[item]\n**Đáp án:** 1-A, 2-B, 3-C',
  };

  const selected: string[] = [];
  if (useMCQ)   selected.push(FORMATS.mcq);
  if (useTF)    selected.push(FORMATS.tf);
  if (useFill)  selected.push(FORMATS.fill);
  if (useMatch) selected.push(FORMATS.match);
  if (selected.length === 0) selected.push(FORMATS.mcq);

  const mixHint = selected.length > 1 ? `Trộn ${selected.length} loại câu trong bài quiz.` : '';

  return {
    agent: 'quiz',
    hint: `[Quiz Agent] Tạo ${numQ} câu quiz. ${topicHint}\nFormat bắt buộc:\n${selected.join('\n\n')}\n${mixHint}`,
  };
}

function homeworkAgent(subject: Subject): AgentResult {
  const rubrics: Record<Subject, string> = {
    math:     'Tiêu chí: Đặt vấn đề 30% + Tính toán đúng 40% + Kết quả chính xác 20% + Trình bày 10%.',
    viet:     'Tiêu chí: Chính tả 25% + Ngữ pháp 25% + Diễn đạt 25% + Nội dung phù hợp 25%.',
    language: 'Criteria: Grammar 30% + Vocabulary 30% + Coherence 20% + Accuracy 20%.',
    general:  'Tiêu chí: Hiểu đúng yêu cầu 30% + Nội dung đầy đủ 40% + Trình bày rõ ràng 30%.',
  };
  return {
    agent: 'homework',
    hint: `[Homework Agent] ${rubrics[subject] ?? rubrics.general} Bắt buộc có **Điểm: X/10** ở cuối phản hồi.`,
  };
}

function reviewAgent(brain: BrainState): AgentResult | null {
  if (brain.mistakes.length < 3) return null;
  const types = [...new Set(brain.mistakes.slice(-4).map(m => m.type))];
  return {
    agent: 'review',
    hint: `[Review Agent] Học sinh hay mắc lỗi: ${types.join(', ')}. Chủ động nhắc nhở và giải thích để tránh tái phạm trong phản hồi này.`,
  };
}

function researchAgent(ragSize: number, topic: string | undefined | null): AgentResult | null {
  if (ragSize === 0) return null;
  const topicPart = topic ? ` (chủ đề: ${topic})` : '';
  return {
    agent: 'research',
    hint: `[Research Agent] Có ${ragSize} tài liệu giáo trình liên quan${topicPart}. Ưu tiên dựa vào nội dung giáo trình đã cung cấp; chỉ dùng kiến thức chung khi không có trong tài liệu.`,
  };
}

// ─── Knowledge Graph Agent ────────────────────────────────────────────────────

async function knowledgeGraphAgent(
  userId: string,
  subject: Subject,
  message: string,
): Promise<AgentResult | null> {
  try {
    const topConcepts = await getTopConcepts(userId, subject, 5);
    if (topConcepts.length === 0) return null;

    const relevant = topConcepts.filter(c => {
      const pattern = new RegExp(c.label.replace(/\s+/g, '.?'), 'i');
      return pattern.test(message);
    });

    if (relevant.length === 0) return null;

    const conceptList = relevant.map(c => {
      const childNames = c.children.slice(0, 3).join(', ');
      return childNames ? `${c.label} (liên quan: ${childNames})` : c.label;
    }).join('; ');

    return {
      agent: 'knowledge_graph',
      hint: `[Knowledge Graph Agent] Chủ đề liên quan trong knowledge graph: ${conceptList}. Kết nối khái niệm này với những gì học sinh đã biết.`,
    };
  } catch {
    return null;
  }
}

// ─── Learning Coach Agent ─────────────────────────────────────────────────────

function learningCoachAgent(brain: BrainState, subject: Subject): AgentResult | null {
  const masteryEntries = Object.entries(brain.mastery) as [string, number][];
  if (masteryEntries.length === 0) return null;

  const weak = masteryEntries.filter(([, v]) => v < 0.4).map(([k]) => k);
  const near = masteryEntries.filter(([, v]) => v >= 0.4 && v < 0.7).map(([k]) => k);

  const parts: string[] = [];

  if (weak.length > 0) {
    parts.push(`Cần củng cố: ${weak.slice(0, 2).join(', ')}`);
  }
  if (near.length > 0) {
    parts.push(`Gần thành thạo: ${near.slice(0, 2).join(', ')} — chỉ cần thêm luyện tập`);
  }
  if (brain.messageCount > 0 && brain.messageCount % 5 === 0) {
    parts.push(`Học sinh đã chat ${brain.messageCount} lần — nên tổng kết kiến thức đã học`);
  }

  if (parts.length === 0) return null;

  return {
    agent: 'learning_coach',
    hint: `[Learning Coach] ${parts.join('. ')}. Khuyến khích và động viên học sinh tiếp tục cố gắng.`,
  };
}

// ─── Phase 7: Reflection Agent ───────────────────────────────────────────────

function reflectionAgent(brain: BrainState): AgentResult | null {
  if (brain.messageCount < 3) return null;

  const parts: string[] = [];

  if (brain.summary) {
    parts.push(`Tóm tắt cuộc hội thoại: ${brain.summary}`);
  }

  const mastered = Object.entries(brain.mastery as Record<string, number>)
    .filter(([, v]) => v >= 0.75)
    .map(([k]) => k)
    .slice(0, 3);

  if (mastered.length > 0) {
    parts.push(`Học sinh đã nắm vững: ${mastered.join(', ')} — không cần lặp lại kiến thức này.`);
  }

  if (parts.length === 0) return null;

  return {
    agent: 'reflection',
    hint: `[Reflection Agent] ${parts.join(' ')} Xây dựng trên nền tảng này thay vì bắt đầu từ đầu.`,
  };
}

// ─── Phase 7: Self Correction Agent ──────────────────────────────────────────

function selfCorrectionAgent(brain: BrainState, subject: Subject): AgentResult | null {
  const COMMON_MISCONCEPTIONS: Record<Subject, string[]> = {
    math:     ['nhầm dấu khi chuyển vế', 'quên kiện nghiệm', 'nhầm công thức sin/cos', 'chia cho 0'],
    language: ['nhầm thì động từ', 'dùng sai giới từ', 'thiếu mạo từ a/an/the', 'nhầm its/it\'s'],
    viet:     ['nhầm thanh điệu', 'viết sai chính tả dấu hỏi/ngã', 'dùng sai từ đồng âm'],
    general:  ['trả lời chưa đúng trọng tâm câu hỏi', 'thiếu ví dụ minh họa'],
  };

  const patterns = COMMON_MISCONCEPTIONS[subject] ?? COMMON_MISCONCEPTIONS.general;
  const recentMistakeTypes = brain.mistakes.slice(-3).map(m => m.type);
  const relevant = patterns.filter(p => recentMistakeTypes.some(r => r.toLowerCase().includes(p.slice(0, 8).toLowerCase())));

  const checkList = relevant.length > 0
    ? `Đặc biệt kiểm tra: ${relevant.join(', ')}.`
    : `Kiểm tra các lỗi thường gặp: ${patterns.slice(0, 2).join(', ')}.`;

  return {
    agent: 'self_correction',
    hint: `[Self-Correction Agent] Trước khi kết thúc phản hồi, tự kiểm tra lại tính chính xác của kết quả. ${checkList} Nếu phát hiện lỗi, sửa ngay không cần xin lỗi.`,
  };
}

// ─── Phase 7: Critic Agent ────────────────────────────────────────────────────

function criticAgent(mode: string, brain: BrainState): AgentResult | null {
  if (brain.messageCount < 2) return null;

  const QUALITY_STANDARDS: Record<string, string> = {
    tutor:    'Giải thích phải có: (1) Khái niệm rõ ràng, (2) Ít nhất 1 ví dụ cụ thể, (3) Kết nối với kiến thức đã biết.',
    exercise: 'Bài tập phải có: (1) Đề bài rõ ràng, (2) Hướng dẫn từng bước, (3) Đáp án.',
    quiz:     'Quiz phải có: (1) Câu hỏi đa dạng, (2) Độ khó phù hợp, (3) Giải thích đáp án.',
    homework: 'Chấm bài phải có: (1) Điểm số cụ thể, (2) Nhận xét từng phần, (3) Gợi ý cải thiện.',
    adaptive: 'Nội dung phải: (1) Phù hợp độ khó hiện tại, (2) Nhắm vào điểm yếu, (3) Có bước tiến rõ.',
  };

  const standard = QUALITY_STANDARDS[mode] ?? QUALITY_STANDARDS.tutor;
  return {
    agent: 'critic',
    hint: `[Critic Agent] Tiêu chuẩn chất lượng phản hồi: ${standard} Đảm bảo đáp ứng đủ trước khi kết thúc.`,
  };
}

// ─── Phase 7: Planner Agent ───────────────────────────────────────────────────

function plannerAgent(brain: BrainState, subject: Subject): AgentResult | null {
  const masteryMap = brain.mastery as Record<string, number>;
  const entries = Object.entries(masteryMap);
  if (entries.length < 2) return null;

  const weak = entries.filter(([, v]) => v < 0.5).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);
  const next = entries.filter(([, v]) => v >= 0.5 && v < 0.8).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);

  if (weak.length === 0 && next.length === 0) return null;

  const SUBJECT_PATH: Record<Subject, string> = {
    math:     'nền tảng số học → đại số → hình học → giải tích',
    language: 'từ vựng cơ bản → ngữ pháp → kỹ năng nghe-nói → đọc-viết nâng cao',
    viet:     'chính tả → ngữ pháp → văn phong → nghị luận',
    general:  'hiểu khái niệm → áp dụng → phân tích → sáng tạo',
  };

  const parts: string[] = [];
  if (weak.length > 0) parts.push(`Ưu tiên ôn tập: ${weak.join(', ')}`);
  if (next.length > 0) parts.push(`Chuẩn bị học tiếp: ${next.join(', ')}`);
  parts.push(`Lộ trình môn: ${SUBJECT_PATH[subject]}`);

  return {
    agent: 'planner',
    hint: `[Planner Agent] Kế hoạch học tập: ${parts.join('. ')}. Nếu phù hợp, gợi ý bước học tiếp theo ở cuối phản hồi.`,
  };
}

// ─── Multi-Agent Runner ───────────────────────────────────────────────────────

export interface MultiAgentParams {
  subject: string;
  mode: string;
  brain: BrainState;
  message: string;
  ragHits?: number;
  userId?: string;
}

export async function runMultiAgent(params: MultiAgentParams): Promise<AgentResult[]> {
  const { subject, mode, brain, message, ragHits = 0, userId } = params;
  const s = subject as Subject;

  // Chạy song song tất cả agents liên quan
  const tasks: Array<Promise<AgentResult | null>> = [
    Promise.resolve(reviewAgent(brain)),
    Promise.resolve(researchAgent(ragHits, brain.topic)),
    Promise.resolve(learningCoachAgent(brain, s)),
    // Phase 7: new agents — only add hints, không thay đổi output cũ
    Promise.resolve(reflectionAgent(brain)),
    Promise.resolve(selfCorrectionAgent(brain, s)),
    Promise.resolve(criticAgent(mode, brain)),
    Promise.resolve(plannerAgent(brain, s)),
  ];

  if (userId) {
    tasks.push(knowledgeGraphAgent(userId, s, message));
  }

  if (mode === 'tutor' || mode === 'exercise') {
    tasks.push(Promise.resolve(tutorAgent(brain)));
  }

  if (s === 'math') {
    tasks.push(Promise.resolve(mathAgent(message)));
  }

  if (mode === 'quiz') {
    tasks.push(Promise.resolve(quizAgent(brain, s, message)));
  }

  if (mode === 'homework') {
    tasks.push(Promise.resolve(homeworkAgent(s)));
  }

  const results = await Promise.all(tasks);
  return results.filter((r): r is AgentResult => r !== null);
}
