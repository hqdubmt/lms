'use client';

import Link from 'next/link';
import { Loader2, Sparkles, Edit3, Trash2, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MathTopic } from '@/types/math';
import { SUBJECT_COLOR, SUBJECT_LABEL } from '@/constants/math';

interface Props {
  topic: MathTopic;
  busy: boolean;
  genBusy: boolean;
  quizBusy: boolean;
  onDelete: () => void;
  onGenerateAll: () => void;
  onGenerateQuiz: () => void;
}

export function TopicCard({ topic, busy, genBusy, quizBusy, onDelete, onGenerateAll, onGenerateQuiz }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', SUBJECT_COLOR[topic.subject] || 'bg-gray-100 text-gray-600')}>
            {SUBJECT_LABEL[topic.subject]}
          </span>
          <span className="text-xs text-muted-foreground">Lớp {topic.grade}</span>
          {!topic.isPublic && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Riêng tư</span>}
        </div>
        <p className="font-semibold text-gray-900 text-sm truncate">{topic.title}</p>
        <p className="text-xs text-muted-foreground">{topic._count?.concepts ?? 0} khái niệm · {topic._count?.exercises ?? 0} bài tập</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onGenerateAll} disabled={genBusy || (topic._count?.concepts ?? 0) < 2}
          title={(topic._count?.concepts ?? 0) < 2 ? 'Cần ít nhất 2 khái niệm' : 'AI tạo 4 loại bài tập (Groq ~5s · Ollama ~2-4 phút)'}
          className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {genBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {genBusy ? 'Đang tạo...' : 'Tạo tất cả'}
        </button>
        <button onClick={onGenerateQuiz} disabled={quizBusy || (topic._count?.concepts ?? 0) < 4}
          title={(topic._count?.concepts ?? 0) < 4 ? 'Cần ít nhất 4 khái niệm' : 'Tạo Quiz Game'}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {quizBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gamepad2 className="h-3.5 w-3.5" />}
          Tạo Quiz
        </button>
        <Link href={`/instructor/math/topic/${topic.id}`}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
          <Edit3 className="h-3.5 w-3.5" />Quản lý
        </Link>
        <button onClick={onDelete} disabled={busy}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
