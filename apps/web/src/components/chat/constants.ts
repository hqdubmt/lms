import { BookOpen, PenLine, HelpCircle, Languages, Sparkles, Volume2, Mic, Headphones, MicVocal, RefreshCw } from 'lucide-react';
import type { ElementType } from 'react';
import type { Subject, Mode } from './types';

export const SUBJECT_META: Record<Subject, { label: string; color: string; hint: string }> = {
  math:     { label: 'Toán học',   color: 'from-violet-600 to-indigo-600', hint: 'Hỏi về bài toán, công thức, cách giải...' },
  language: { label: 'Ngoại ngữ', color: 'from-blue-600 to-cyan-500',     hint: 'Hỏi về từ vựng, ngữ pháp, phát âm...' },
  viet:     { label: 'Tiếng Việt', color: 'from-red-600 to-orange-500',   hint: 'Hỏi về từ vựng, ngữ pháp tiếng Việt...' },
  general:  { label: 'Học tập',    color: 'from-primary to-primary/70',   hint: 'Hỏi bất cứ điều gì về bài học...' },
};

export const MODE_HINTS: Record<Mode, string> = {
  tutor:    'Hỏi để hiểu kiến thức...',
  exercise: 'Yêu cầu tạo bài tập...',
  quiz:     'Yêu cầu kiểm tra nhanh...',
  voice:    'Nhấn micro để nói chuyện...',
};

export const QUICK_ACTIONS: Array<{ label: string; icon: ElementType; prompt: string; mode: Mode }> = [
  { label: 'Giải thích',         icon: BookOpen,   prompt: 'Giải thích: ',              mode: 'tutor'    },
  { label: 'Tạo bài tập',        icon: PenLine,    prompt: 'Tạo bài tập về: ',          mode: 'exercise' },
  { label: 'Kiểm tra kiến thức', icon: HelpCircle, prompt: 'Kiểm tra kiến thức: ',      mode: 'quiz'     },
  { label: 'Ôn tập',             icon: RefreshCw,  prompt: 'Cho em ôn tập kiến thức: ', mode: 'tutor'    },
];

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

export const MATH_QUICK_ACTIONS: Array<{ label: string; icon: ElementType; prompt: string }> = [
  { label: 'Giải bài',   icon: PenLine,    prompt: 'Giải bài toán: ' },
  { label: 'Giải thích', icon: BookOpen,   prompt: 'Giải thích công thức: ' },
  { label: 'Bài tập',    icon: HelpCircle,  prompt: 'Cho em bài tập về: ' },
  { label: 'Quiz',       icon: HelpCircle, prompt: 'Tạo quiz toán về: ' },
];

export const VIET_QUICK_ACTIONS: Array<{ label: string; icon: ElementType; prompt: string }> = [
  { label: 'Giải thích', icon: BookOpen,   prompt: 'Giải thích từ: ' },
  { label: 'Chính tả',   icon: PenLine,    prompt: 'Kiểm tra chính tả câu: ' },
  { label: 'Ngữ pháp',   icon: Sparkles,   prompt: 'Giải thích ngữ pháp câu: ' },
  { label: 'Quiz',       icon: HelpCircle, prompt: 'Tạo quiz tiếng Việt về: ' },
];

export const INTENT_PATTERNS: Array<{ pattern: RegExp; mode: Mode }> = [
  { pattern: /quiz|trắc nghiệm|kiểm tra nhanh|test\b/i, mode: 'quiz'     },
  { pattern: /bài tập|cho.*bài|tập làm|luyện tập/i,     mode: 'exercise' },
];
