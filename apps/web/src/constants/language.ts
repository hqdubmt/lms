import type { ElementType } from 'react';
import { Brain, Headphones, Shuffle, Target, PenLine } from 'lucide-react';

export const LANGUAGES = [
  { code: 'en', name: 'Tiếng Anh' }, { code: 'ja', name: 'Tiếng Nhật' },
  { code: 'ko', name: 'Tiếng Hàn' }, { code: 'fr', name: 'Tiếng Pháp' },
  { code: 'de', name: 'Tiếng Đức' }, { code: 'zh', name: 'Tiếng Trung' },
  { code: 'es', name: 'Tiếng Tây Ban Nha' }, { code: 'vi', name: 'Tiếng Việt' },
];

export const LANG_NAMES: Record<string, string> = Object.fromEntries(LANGUAGES.map(l => [l.code, l.name]));

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const EXERCISE_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
  MATCHING: 'Ghép cặp', WORD_ORDER: 'Sắp xếp câu', DICTATION: 'Nghe viết',
};

export const EXERCISE_ICONS: Record<string, ElementType> = {
  MULTIPLE_CHOICE: Brain, FILL_BLANK: PenLine, MATCHING: Shuffle, WORD_ORDER: Target, DICTATION: Headphones,
};
