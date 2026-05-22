'use client';

import { useState } from 'react';
import { Lightbulb, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  subject: 'math' | 'language' | 'viet' | 'general';
}

export function AiExplain({ question, correctAnswer, userAnswer, subject }: Props) {
  const { accessToken } = useAuthStore();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [explanation, setExplanation] = useState('');
  const [expanded, setExpanded] = useState(true);

  const handleExplain = async () => {
    if (state === 'loading') return;
    if (state === 'done') { setExpanded(e => !e); return; }

    setState('loading');
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ question, correctAnswer, subject, userAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExplanation(data.explanation);
      setState('done');
      setExpanded(true);
    } catch {
      setState('error');
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleExplain}
        disabled={state === 'loading'}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
          state === 'done'
            ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            : state === 'error'
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
        )}
      >
        {state === 'loading'
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Lightbulb className="h-3.5 w-3.5" />}
        {state === 'loading' ? 'AI đang giải thích...'
          : state === 'error' ? 'Thử lại'
          : state === 'done' ? (expanded ? 'Ẩn giải thích' : 'Xem giải thích AI')
          : 'AI Giải thích'}
        {state === 'done' && (expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>

      {state === 'done' && expanded && (
        <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-amber-700">
            <Lightbulb className="h-3.5 w-3.5" />AI Giải thích (qwen2.5:1.5b)
          </div>
          <p className="whitespace-pre-wrap">{explanation}</p>
        </div>
      )}
    </div>
  );
}
