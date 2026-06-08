// Re-export từ ai-provider để backward compat với các module khác
export { aiChatOnce as ollamaChat, aiChatStream as ollamaStream, type ChatMessage } from './ai-provider';
export { checkAllProviders as checkOllamaHealth } from './ai-provider';

export type Subject = 'math' | 'language' | 'viet' | 'general';
export type Mode = 'tutor' | 'exercise' | 'homework' | 'quiz' | 'adaptive' | 'voice';

const BASE_PROMPTS: Record<Subject, string> = {
  math: 'Bạn là giáo viên Toán tiểu học và THCS (lớp 1-9) theo chương trình Việt Nam (Chân trời sáng tạo / Kết nối tri thức / Cánh diều). Giải thích từng bước rõ ràng, ngôn ngữ đơn giản phù hợp lứa tuổi học sinh. Dùng LaTeX ($...$) cho công thức. Ví dụ cụ thể với số thực tế. Không bịa đặt kiến thức ngoài chương trình.',
  language: 'Bạn là giáo viên tiếng Anh chuyên nghiệp. Giải thích ngữ pháp, từ vựng, phát âm bằng tiếng Việt kết hợp ví dụ tiếng Anh. Với phát âm: luôn cung cấp IPA, trọng âm (ˈ), phiên âm tiếng Việt gần đúng. Với ngữ pháp: công thức rõ ràng + ví dụ câu thực tế + lỗi phổ biến học sinh Việt hay mắc. Với từ vựng: nghĩa + IPA + collocations + ví dụ câu tự nhiên.',
  viet: 'Bạn là giáo viên Tiếng Việt tiểu học. Giải thích từ vựng, ngữ pháp, thành ngữ, tục ngữ bằng ngôn ngữ đơn giản, phù hợp lứa tuổi học sinh. Luôn đặt câu ví dụ minh họa. Chú ý phân biệt các từ dễ nhầm (hỏi/ngã, d/gi/r...).',
  general: 'Bạn là trợ lý học tập AI thông minh. Luôn trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu, phù hợp học sinh tiểu học và THCS. Dùng markdown để trình bày rõ ràng.',
};

const MODE_ADDITIONS: Record<Mode, string> = {
  tutor:    'Giải thích kiến thức rõ ràng, từng bước, kèm ví dụ minh họa cụ thể. Dùng markdown để trình bày đẹp.',
  exercise: 'Tạo bài tập theo yêu cầu. Mỗi bài có số thứ tự và nội dung rõ ràng. Ghi đáp án vào phần "**Đáp án:**" ở cuối.',
  homework: 'Chấm bài học sinh: chỉ ra lỗi sai cụ thể, giải thích tại sao sai, gợi ý cách sửa. Cho điểm từ 0–10 dạng **Điểm: X/10**. Nhận xét tổng thể cuối bài.',
  quiz:     'Tạo quiz. Sử dụng đa dạng loại câu hỏi:\n\n1. Trắc nghiệm MCQ:\n**Câu N:** [câu hỏi]\nA. ...\nB. ...\nC. ...\nD. ...\n**Đáp án: A**\n\n2. Đúng/Sai:\n**Câu N (Đúng/Sai):** [câu khẳng định cần đánh giá]\n**Đáp án: Đúng**\n\n3. Điền từ:\n**Câu N (Điền từ):** [câu có ___ là chỗ trống]\n**Đáp án:** [từ/cụm từ]\n\n4. Nối đôi:\n**Câu N (Nối đôi):** [chủ đề]\n1.[item] | 2.[item] | 3.[item]\nA.[item] | B.[item] | C.[item]\n**Đáp án:** 1-A, 2-B, 3-C\n\nTrộn nhiều loại câu để bài quiz phong phú.',
  adaptive: 'Học cá nhân hóa: dạy theo điểm yếu của học sinh, điều chỉnh độ khó phù hợp, luôn đặt câu hỏi kiểm tra sau mỗi giải thích.',
  voice:    'Trả lời ngắn gọn, rõ ràng, phù hợp với giọng nói. Tránh dùng ký tự markdown, LaTeX, hay danh sách phức tạp. Dùng câu văn tự nhiên.',
};

export const SYSTEM_PROMPTS: Record<string, string> = BASE_PROMPTS;

export function buildSystemPrompt(subject: Subject, mode: Mode): string {
  return `${BASE_PROMPTS[subject] ?? BASE_PROMPTS.general}\n\n${MODE_ADDITIONS[mode]}`;
}

export const SUGGESTIONS: Record<Subject, Partial<Record<Mode, string[]>>> = {
  math: {
    tutor:    ['Cho em ví dụ cụ thể', 'Cho em bài tập về chủ đề này', 'Giải thích đơn giản hơn'],
    exercise: ['Bài khó hơn', 'Thêm bài tập tương tự', 'Hướng dẫn cách giải'],
    homework: ['Em sai ở đâu?', 'Cách cải thiện điểm', 'Cho em bài ôn tập'],
    quiz:     ['Quiz tiếp theo', 'Giải thích đáp án', 'Quiz chủ đề khác'],
    adaptive: ['Cho bài tập theo điểm yếu', 'Đánh giá lại trình độ', 'Ôn lại kiến thức cơ bản'],
    voice:    ['Giải thích lại', 'Ví dụ khác', 'Tiếp tục'],
  },
  language: {
    tutor:    ['Cho em ví dụ câu', 'Bài tập luyện tập', 'Từ vựng liên quan'],
    exercise: ['Bài nâng cao hơn', 'Thêm bài luyện', 'Hướng dẫn giải'],
    homework: ['Sai ở đâu?', 'Cách viết tốt hơn', 'Bài ôn tập'],
    quiz:     ['Quiz tiếp theo', 'Giải thích đáp án', 'Quiz chủ đề khác'],
    adaptive: ['Luyện phát âm', 'Ôn ngữ pháp yếu', 'Từ vựng mới hôm nay'],
    voice:    ['Phát âm lại', 'Ví dụ khác', 'Tiếp tục'],
  },
  viet: {
    tutor:    ['Ví dụ câu cụ thể', 'Bài tập luyện tập', 'Từ đồng nghĩa'],
    exercise: ['Bài khó hơn', 'Thêm bài', 'Hướng dẫn'],
    homework: ['Sai ở đâu?', 'Cách viết đúng hơn', 'Bài ôn tập'],
    quiz:     ['Quiz tiếp theo', 'Giải thích đáp án', 'Chủ đề khác'],
    adaptive: ['Ôn điểm yếu', 'Bài tập phù hợp', 'Kiểm tra lại'],
    voice:    ['Nói lại', 'Ví dụ khác', 'Tiếp tục'],
  },
  general: {
    tutor:    ['Cho em ví dụ', 'Giải thích thêm', 'Tóm tắt lại'],
    exercise: ['Thêm bài tập', 'Bài khó hơn', 'Hướng dẫn giải'],
    homework: ['Nhận xét chi tiết', 'Cách cải thiện', 'Bài tương tự'],
    quiz:     ['Quiz tiếp theo', 'Giải thích đáp án', 'Chủ đề khác'],
    adaptive: ['Cá nhân hóa thêm', 'Điểm yếu của em', 'Tiếp tục học'],
    voice:    ['Giải thích lại', 'Ví dụ khác', 'Tiếp tục'],
  },
};
