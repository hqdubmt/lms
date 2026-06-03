'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { QuizQ } from './types';

export function QuizRenderer({ questions }: { questions: QuizQ[] }) {
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const score = Object.keys(revealed).filter(n => selected[+n] === questions.find(q => q.num === +n)?.answer).length;

  return (
    <div className="space-y-3 w-full">
      {questions.map(q => (
        <div key={q.num} className="bg-white rounded-xl border border-gray-200 p-3 text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2">Câu {q.num}: {q.text}</p>
          <div className="space-y-1.5">
            {q.options.map(opt => {
              const isSelected = selected[q.num] === opt.key;
              const isRev = revealed[q.num];
              const isCorrect = opt.key === q.answer;
              return (
                <button
                  key={opt.key}
                  disabled={isRev}
                  onClick={() => {
                    setSelected(s => ({ ...s, [q.num]: opt.key }));
                    setRevealed(r => ({ ...r, [q.num]: true }));
                  }}
                  className={cn(
                    'w-full text-left text-xs rounded-lg px-2.5 py-1.5 border transition-colors',
                    !isRev && 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer',
                    isRev && isCorrect && 'border-green-400 bg-green-50 text-green-700 font-medium',
                    isRev && isSelected && !isCorrect && 'border-red-400 bg-red-50 text-red-700',
                    isRev && !isSelected && !isCorrect && 'border-gray-100 text-gray-400',
                  )}
                >
                  <span className="font-medium">{opt.key}.</span> {opt.text}
                </button>
              );
            })}
          </div>
          {revealed[q.num] && selected[q.num] !== q.answer && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">Đáp án: {q.answer}</p>
          )}
        </div>
      ))}
      {Object.keys(revealed).length === questions.length && (
        <p className="text-xs text-center text-gray-500 font-medium">
          Kết quả: <span className="text-primary">{score}/{questions.length}</span> câu đúng
        </p>
      )}
    </div>
  );
}
