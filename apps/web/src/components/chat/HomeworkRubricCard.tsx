'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RubricItem {
  criterion: string;
  score: number;
  max: number;
  comment: string;
}

export interface HomeworkResult {
  feedback: string;
  score: number | null;
  rubric: RubricItem[];
  mistakes: string[];
  suggestions: string[];
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-500';
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number | null) {
  if (score === null) return 'bg-gray-100 border-gray-200';
  if (score >= 8) return 'bg-green-50 border-green-200';
  if (score >= 6) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

interface Props {
  result: HomeworkResult;
}

export function HomeworkRubricCard({ result }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white overflow-hidden text-sm">
      {/* Header with score */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Kết quả chấm bài
        </span>
        <div className="flex items-center gap-2">
          {result.score !== null && (
            <span className={cn(
              'text-lg font-bold px-2 py-0.5 rounded-lg border',
              scoreBg(result.score), scoreColor(result.score),
            )}>
              {result.score}/10
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Overall feedback */}
          <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>

          {/* Rubric criteria */}
          {result.rubric.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tiêu chí chấm</p>
              {result.rubric.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{item.criterion}</p>
                    {item.comment && <p className="text-xs text-gray-500 mt-0.5">{item.comment}</p>}
                  </div>
                  <span className={cn(
                    'text-xs font-bold px-1.5 py-0.5 rounded border shrink-0',
                    item.score >= item.max * 0.8 ? 'bg-green-50 border-green-200 text-green-700'
                      : item.score >= item.max * 0.5 ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : 'bg-red-50 border-red-200 text-red-700',
                  )}>
                    {item.score}/{item.max}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mistakes */}
          {result.mistakes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" />Lỗi cần sửa
              </p>
              {result.mistakes.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-1.5">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" />Gợi ý cải thiện
              </p>
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
                  <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
