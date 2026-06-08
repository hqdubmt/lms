import { BookOpen, PenLine, CheckSquare, HelpCircle, Languages, Sparkles, Volume2, Mic, Headphones, MicVocal } from 'lucide-react';
import type { ElementType } from 'react';
import type { Subject, Mode } from './types';

export const SUBJECT_META: Record<Subject, { label: string; color: string; hint: string }> = {
  math:     { label: 'Toán học',   color: 'from-violet-600 to-indigo-600', hint: 'Hỏi về bài toán, công thức, cách giải...' },
  language: { label: 'Ngoại ngữ', color: 'from-blue-600 to-cyan-500',     hint: 'Hỏi về từ vựng, ngữ pháp, phát âm...' },
  viet:     { label: 'Tiếng Việt', color: 'from-red-600 to-orange-500',   hint: 'Hỏi về từ vựng, ngữ pháp tiếng Việt...' },
  general:  { label: 'Học tập',    color: 'from-primary to-primary/70',   hint: 'Hỏi bất cứ điều gì về bài học...' },
};

export const MODES: { id: Mode; label: string; icon: ElementType }[] = [
  { id: 'tutor',    label: 'Giải thích', icon: BookOpen    },
  { id: 'exercise', label: 'Bài tập',    icon: PenLine     },
  { id: 'homework', label: 'Chấm bài',   icon: CheckSquare },
  { id: 'quiz',     label: 'Quiz',       icon: HelpCircle  },
  { id: 'voice',    label: 'Giọng nói',  icon: Mic         },
];

export const MODE_HINTS: Record<Mode, string> = {
  tutor:    'Hỏi để hiểu kiến thức...',
  exercise: 'Yêu cầu tạo bài tập...',
  homework: 'Gửi bài làm để chấm...',
  quiz:     'Yêu cầu kiểm tra nhanh...',
  voice:    'Nhấn micro để nói chuyện...',
};

export const LANG_QUICK_ACTIONS: Array<{ label: string; icon: ElementType; prompt: string }> = [
  { label: 'Dịch',       icon: Languages,  prompt: 'Dịch câu sau sang tiếng Anh: ' },
  { label: 'Ngữ pháp',   icon: BookOpen,   prompt: 'Giải thích ngữ pháp của: ' },
  { label: 'Từ vựng',    icon: Sparkles,   prompt: 'Giải thích từ vựng: ' },
  { label: 'Phát âm',    icon: Volume2,    prompt: 'Hướng dẫn phát âm và IPA của: ' },
  { label: 'IPA',        icon: BookOpen,   prompt: 'Giải thích ký hiệu IPA: ' },
  { label: 'Luyện nói',  icon: MicVocal,   prompt: 'Luyện nói và cách đọc câu: ' },
  { label: 'Viết',       icon: PenLine,    prompt: 'Kiểm tra và sửa bài viết của em: ' },
  { label: 'Luyện nghe', icon: Headphones, prompt: 'Giải thích nội dung nghe và từ vựng quan trọng: ' },
];

export const INTENT_PATTERNS: Array<{ pattern: RegExp; mode: Mode }> = [
  { pattern: /chấm bài|sửa bài|chấm điểm|bài làm của/i,                 mode: 'homework' }, // 1
  { pattern: /quiz|trắc nghiệm|kiểm tra nhanh|test\b/i,                 mode: 'quiz' },     // 2
  { pattern: /bài tập|cho.*bài|tập làm|luyện tập/i,                     mode: 'exercise' }, // 3
];
