import type { ElementType } from 'react';
import { Brain, PenLine, CheckSquare, Shuffle, AlignLeft, BookOpen, BookMarked, Feather, MessageSquare, Edit, Music } from 'lucide-react';

export const CATEGORY_OPTIONS = [
  { value: 'CHINH_TA', label: 'Chính tả' }, { value: 'TU_VUNG', label: 'Từ vựng' },
  { value: 'NGU_PHAP', label: 'Ngữ pháp' }, { value: 'THANH_NGU', label: 'Thành ngữ' },
  { value: 'TUC_NGU', label: 'Tục ngữ' }, { value: 'VAN_HOC', label: 'Văn học' },
  { value: 'TAP_DOC', label: 'Tập đọc' }, { value: 'CA_DAO', label: 'Ca dao' },
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.label]));

export const CATEGORY_COLOR: Record<string, string> = {
  CHINH_TA: 'bg-red-100 text-red-700', TU_VUNG: 'bg-blue-100 text-blue-700',
  NGU_PHAP: 'bg-violet-100 text-violet-700', THANH_NGU: 'bg-orange-100 text-orange-700',
  TUC_NGU: 'bg-amber-100 text-amber-700', VAN_HOC: 'bg-green-100 text-green-700',
  TAP_DOC: 'bg-teal-100 text-teal-700', CA_DAO: 'bg-pink-100 text-pink-700',
};

// tiengviet.md lesson types
export const LESSON_TYPE_OPTIONS = [
  { value: 'vocabulary', label: 'Từ vựng' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'dictation', label: 'Chính tả' },
  { value: 'reading', label: 'Đọc hiểu' },
  { value: 'writing', label: 'Tập làm văn' },
  { value: 'poem', label: 'Thơ' },
  { value: 'idiom', label: 'Thành ngữ' },
  { value: 'proverb', label: 'Tục ngữ / Ca dao' },
];

export const LESSON_TYPE_LABEL: Record<string, string> = Object.fromEntries(LESSON_TYPE_OPTIONS.map(l => [l.value, l.label]));

export const LESSON_TYPE_COLOR: Record<string, string> = {
  vocabulary: 'bg-blue-100 text-blue-700',
  grammar: 'bg-violet-100 text-violet-700',
  dictation: 'bg-red-100 text-red-700',
  reading: 'bg-teal-100 text-teal-700',
  writing: 'bg-green-100 text-green-700',
  poem: 'bg-pink-100 text-pink-700',
  idiom: 'bg-orange-100 text-orange-700',
  proverb: 'bg-amber-100 text-amber-700',
};

export const LESSON_TYPE_ICONS: Record<string, ElementType> = {
  vocabulary: BookMarked, grammar: Brain, dictation: CheckSquare,
  reading: BookOpen, writing: Edit, poem: Feather,
  idiom: MessageSquare, proverb: Music,
};

// tiengviet.md difficulty levels (easy|medium|hard — no olympic)
export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' },
];

export const DIFFICULTY_LABEL: Record<string, string> = Object.fromEntries(DIFFICULTY_OPTIONS.map(d => [d.value, d.label]));

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

// tiengviet.md supported textbooks
export const TEXTBOOK_OPTIONS = [
  { value: 'Chân trời sáng tạo', label: 'Chân trời sáng tạo' },
  { value: 'Kết nối tri thức', label: 'Kết nối tri thức' },
  { value: 'Cánh diều', label: 'Cánh diều' },
];

export const EXERCISE_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
  SPELLING: 'Chính tả', MATCHING: 'Ghép đôi', WORD_ORDER: 'Sắp xếp câu', READING: 'Đọc hiểu',
};

export const EXERCISE_TYPE_OPTIONS = Object.entries(EXERCISE_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const EXERCISE_ICONS: Record<string, ElementType> = {
  MULTIPLE_CHOICE: Brain, FILL_BLANK: PenLine, SPELLING: CheckSquare,
  MATCHING: Shuffle, WORD_ORDER: AlignLeft, READING: BookOpen,
};
