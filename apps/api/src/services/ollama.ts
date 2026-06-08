// Re-export từ ai-provider để backward compat với các module khác
export { aiChatOnce as ollamaChat, aiChatStream as ollamaStream, type ChatMessage } from './ai-provider';
export { checkAllProviders as checkOllamaHealth } from './ai-provider';

export type Subject = 'math' | 'language' | 'viet' | 'general';
export type Mode = 'tutor' | 'exercise' | 'homework' | 'quiz';

const BASE_PROMPTS: Record<Subject, string> = {
  math: 'Bạn là giáo viên Toán tiểu học và THCS (lớp 1-9) theo chương trình Việt Nam (Chân trời sáng tạo / Kết nối tri thức / Cánh diều). Giải thích từng bước rõ ràng, ngôn ngữ đơn giản phù hợp lứa tuổi học sinh. Công thức trình bày gọn, ví dụ cụ thể với số. Không bịa đặt kiến thức ngoài chương trình.',
  language: 'Bạn là giáo viên ngoại ngữ. Giải thích ngữ pháp và từ vựng bằng tiếng Việt, đưa ví dụ thực tế. Ngắn gọn, dễ hiểu.',
  viet: 'Bạn là giáo viên Tiếng Việt tiểu học. Giải thích từ vựng, ngữ pháp, thành ngữ, tục ngữ bằng ngôn ngữ đơn giản, phù hợp lứa tuổi học sinh. Luôn đặt câu ví dụ minh họa.',
  general: 'Bạn là trợ lý học tập AI. Luôn trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu, phù hợp học sinh tiểu học và THCS.',
};

const MODE_ADDITIONS: Record<Mode, string> = {
  tutor: 'Hãy giải thích kiến thức rõ ràng, từng bước, kèm ví dụ minh họa cụ thể. Dùng markdown để trình bày đẹp (tiêu đề, danh sách, in đậm).',
  exercise: 'Hãy tạo bài tập theo yêu cầu. Mỗi bài có số thứ tự, nội dung rõ ràng. Ghi đáp án vào phần "**Đáp án:**" ở cuối. Dùng markdown để trình bày.',
  homework: 'Hãy chấm bài học sinh: chỉ ra lỗi sai cụ thể, giải thích tại sao sai, gợi ý cách sửa. Cho điểm từ 0–10 dạng **Điểm: X/10**. Nhận xét tổng thể cuối bài.',
  quiz: 'Hãy tạo quiz. Sử dụng đa dạng loại câu hỏi:\n\n1. Trắc nghiệm MCQ:\n**Câu N:** [câu hỏi]\nA. ...\nB. ...\nC. ...\nD. ...\n**Đáp án: A**\n\n2. Đúng/Sai:\n**Câu N (Đúng/Sai):** [câu khẳng định cần đánh giá]\n**Đáp án: Đúng** (hoặc **Đáp án: Sai**)\n\n3. Điền từ:\n**Câu N (Điền từ):** [câu có ___ là chỗ trống]\n**Đáp án:** [từ/cụm từ cần điền]\n\n4. Nối đôi:\n**Câu N (Nối đôi):** [chủ đề]\n1.[item] | 2.[item] | 3.[item]\nA.[item] | B.[item] | C.[item]\n**Đáp án:** 1-A, 2-B, 3-C\n\nTạo đủ số câu theo yêu cầu. Trộn nhiều loại câu để bài quiz phong phú.',
};

export const SYSTEM_PROMPTS: Record<string, string> = BASE_PROMPTS;

export function buildSystemPrompt(subject: Subject, mode: Mode): string {
  return `${BASE_PROMPTS[subject] ?? BASE_PROMPTS.general}\n\n${MODE_ADDITIONS[mode]}`;
}

export const SUGGESTIONS: Record<Subject, Record<Mode, string[]>> = {
  math: {
    tutor: ['Cho em ví dụ cụ thể', 'Cho em bài tập về chủ đề này', 'Giải thích đơn giản hơn'],
    exercise: ['Bài khó hơn', 'Thêm bài tập tương tự', 'Hướng dẫn cách giải'],
    homework: ['Em sai ở đâu?', 'Cách cải thiện điểm', 'Cho em bài ôn tập'],
    quiz: ['Quiz tiếp theo', 'Giải thích đáp án', 'Quiz chủ đề khác'],
  },
  language: {
    tutor: ['Cho em ví dụ câu', 'Bài tập luyện tập', 'Từ vựng liên quan'],
    exercise: ['Bài nâng cao hơn', 'Thêm bài luyện', 'Hướng dẫn giải'],
    homework: ['Sai ở đâu?', 'Cách viết tốt hơn', 'Bài ôn tập'],
    quiz: ['Quiz tiếp theo', 'Giải thích đáp án', 'Quiz chủ đề khác'],
  },
  viet: {
    tutor: ['Ví dụ câu cụ thể', 'Bài tập luyện tập', 'Từ đồng nghĩa'],
    exercise: ['Bài khó hơn', 'Thêm bài', 'Hướng dẫn'],
    homework: ['Sai ở đâu?', 'Cách viết đúng hơn', 'Bài ôn tập'],
    quiz: ['Quiz tiếp theo', 'Giải thích đáp án', 'Chủ đề khác'],
  },
  general: {
    tutor: ['Cho em ví dụ', 'Giải thích thêm', 'Tóm tắt lại'],
    exercise: ['Thêm bài tập', 'Bài khó hơn', 'Hướng dẫn giải'],
    homework: ['Nhận xét chi tiết', 'Cách cải thiện', 'Bài tương tự'],
    quiz: ['Quiz tiếp theo', 'Giải thích đáp án', 'Chủ đề khác'],
  },
};
