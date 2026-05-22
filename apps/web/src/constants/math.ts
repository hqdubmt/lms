import type { ElementType } from 'react';
import { Brain, PenLine, CheckSquare, Calculator, Hash } from 'lucide-react';

export const SUBJECT_OPTIONS = [
  { value: 'ARITHMETIC', label: 'Số học' }, { value: 'ALGEBRA', label: 'Đại số' },
  { value: 'GEOMETRY', label: 'Hình học' }, { value: 'TRIGONOMETRY', label: 'Lượng giác' },
  { value: 'CALCULUS', label: 'Giải tích' }, { value: 'STATISTICS', label: 'Thống kê' },
  { value: 'NUMBER_THEORY', label: 'Số học cao cấp' }, { value: 'COMBINATORICS', label: 'Tổ hợp' },
];

export const SUBJECT_LABEL: Record<string, string> = Object.fromEntries(SUBJECT_OPTIONS.map(s => [s.value, s.label]));

export const SUBJECT_COLOR: Record<string, string> = {
  ARITHMETIC: 'bg-blue-100 text-blue-700', ALGEBRA: 'bg-violet-100 text-violet-700',
  GEOMETRY: 'bg-green-100 text-green-700', TRIGONOMETRY: 'bg-orange-100 text-orange-700',
  CALCULUS: 'bg-red-100 text-red-700', STATISTICS: 'bg-teal-100 text-teal-700',
  NUMBER_THEORY: 'bg-indigo-100 text-indigo-700', COMBINATORICS: 'bg-pink-100 text-pink-700',
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
