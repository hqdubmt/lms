import type { ElementType } from 'react';
import { Brain, PenLine, CheckSquare, Calculator, Hash, Ruler, BookOpen, Lightbulb } from 'lucide-react';

// toan.md lesson types (primary classification)
export const LESSON_TYPE_OPTIONS = [
  { value: 'arithmetic', label: 'Số học' },
  { value: 'geometry', label: 'Hình học' },
  { value: 'algebra', label: 'Đại số' },
  { value: 'measurement', label: 'Đo lường' },
  { value: 'word_problem', label: 'Toán có lời văn' },
  { value: 'logic', label: 'Lập luận / Logic' },
];

export const LESSON_TYPE_LABEL: Record<string, string> = Object.fromEntries(LESSON_TYPE_OPTIONS.map(s => [s.value, s.label]));

export const LESSON_TYPE_COLOR: Record<string, string> = {
  arithmetic: 'bg-blue-100 text-blue-700',
  geometry: 'bg-green-100 text-green-700',
  algebra: 'bg-violet-100 text-violet-700',
  measurement: 'bg-orange-100 text-orange-700',
  word_problem: 'bg-teal-100 text-teal-700',
  logic: 'bg-pink-100 text-pink-700',
};

// toan.md difficulty levels
export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' },
  { value: 'olympic', label: 'Olympic' },
];

export const DIFFICULTY_LABEL: Record<string, string> = Object.fromEntries(DIFFICULTY_OPTIONS.map(d => [d.value, d.label]));

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
  olympic: 'bg-purple-100 text-purple-700',
};

// toan.md supported textbooks
export const TEXTBOOK_OPTIONS = [
  { value: 'Chân trời sáng tạo', label: 'Chân trời sáng tạo' },
  { value: 'Kết nối tri thức', label: 'Kết nối tri thức' },
  { value: 'Cánh diều', label: 'Cánh diều' },
];

// DB subject enum (kept for backward compat)
export const SUBJECT_OPTIONS = [
  { value: 'ARITHMETIC', label: 'Số học' }, { value: 'ALGEBRA', label: 'Đại số' },
  { value: 'GEOMETRY', label: 'Hình học' }, { value: 'TRIGONOMETRY', label: 'Lượng giác' },
  { value: 'CALCULUS', label: 'Giải tích' }, { value: 'STATISTICS', label: 'Thống kê' },
  { value: 'NUMBER_THEORY', label: 'Số học cao cấp' }, { value: 'COMBINATORICS', label: 'Tổ hợp' },
  { value: 'MEASUREMENT', label: 'Đo lường' },
  { value: 'WORD_PROBLEM', label: 'Toán có lời văn' },
  { value: 'LOGIC', label: 'Lập luận' },
];

export const SUBJECT_LABEL: Record<string, string> = Object.fromEntries(SUBJECT_OPTIONS.map(s => [s.value, s.label]));

export const SUBJECT_COLOR: Record<string, string> = {
  ARITHMETIC: 'bg-blue-100 text-blue-700', ALGEBRA: 'bg-violet-100 text-violet-700',
  GEOMETRY: 'bg-green-100 text-green-700', TRIGONOMETRY: 'bg-orange-100 text-orange-700',
  CALCULUS: 'bg-red-100 text-red-700', STATISTICS: 'bg-teal-100 text-teal-700',
  NUMBER_THEORY: 'bg-indigo-100 text-indigo-700', COMBINATORICS: 'bg-pink-100 text-pink-700',
  MEASUREMENT: 'bg-amber-100 text-amber-700',
  WORD_PROBLEM: 'bg-cyan-100 text-cyan-700',
  LOGIC: 'bg-fuchsia-100 text-fuchsia-700',
};

export const EXERCISE_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền số',
  TRUE_FALSE: 'Đúng/Sai', CALCULATION: 'Tính toán', PROOF_STEP: 'Chứng minh',
};

export const EXERCISE_TYPE_OPTIONS = Object.entries(EXERCISE_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const EXERCISE_ICONS: Record<string, ElementType> = {
  MULTIPLE_CHOICE: Brain, FILL_BLANK: PenLine, TRUE_FALSE: CheckSquare,
  CALCULATION: Calculator, PROOF_STEP: Hash,
};

export const LESSON_TYPE_ICONS: Record<string, ElementType> = {
  arithmetic: Calculator, geometry: Ruler, algebra: Hash,
  measurement: Ruler, word_problem: BookOpen, logic: Lightbulb,
};
