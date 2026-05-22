import type { ElementType } from 'react';
import { Brain, PenLine, CheckSquare, Shuffle, AlignLeft, BookOpen } from 'lucide-react';

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

export const EXERCISE_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
  SPELLING: 'Chính tả', MATCHING: 'Ghép đôi', WORD_ORDER: 'Sắp xếp câu', READING: 'Đọc hiểu',
};

export const EXERCISE_TYPE_OPTIONS = Object.entries(EXERCISE_TYPE_LABEL).map(([value, label]) => ({ value, label }));

export const EXERCISE_ICONS: Record<string, ElementType> = {
  MULTIPLE_CHOICE: Brain, FILL_BLANK: PenLine, SPELLING: CheckSquare,
  MATCHING: Shuffle, WORD_ORDER: AlignLeft, READING: BookOpen,
};
