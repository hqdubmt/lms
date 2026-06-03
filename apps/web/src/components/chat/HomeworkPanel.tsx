'use client';

import { useState } from 'react';
import { CheckSquare, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeworkRubricCard, type HomeworkResult } from './HomeworkRubricCard';

interface HomeworkPanelProps {
  color: string;
  loading: boolean;
  result: HomeworkResult | null;
  error: string | null;
  onSubmit: (content: string) => void;
  onClear: () => void;
}

export function HomeworkPanel({ color, loading, result, error, onSubmit, onClear }: HomeworkPanelProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  };

  const handleClear = () => {
    setText('');
    onClear();
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="px-3 py-2 border-t border-gray-100 shrink-0">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium',
            'border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary/50 hover:text-primary',
            'transition-colors',
          )}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Chấm bài chi tiết (rubric)
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 shrink-0 bg-gray-50/50">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
          <CheckSquare className="h-3.5 w-3.5" />Chấm bài chi tiết
        </span>
        <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {result ? (
        <div className="px-3 pb-3">
          <HomeworkRubricCard result={result} />
          <button
            onClick={handleClear}
            className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            Chấm bài mới
          </button>
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Dán bài làm của học sinh vào đây..."
            disabled={loading}
            rows={3}
            className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none disabled:opacity-50"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white',
              'bg-gradient-to-br transition-all disabled:opacity-40',
              color,
            )}
          >
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang chấm...</>
              : <><CheckSquare className="h-3.5 w-3.5" />Chấm bài</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
