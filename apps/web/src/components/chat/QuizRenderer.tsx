'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AnyQuizQ, QuizQ, QuizQTF, QuizQFill, QuizQMatch } from './types';

// ── MCQ ──────────────────────────────────────────────────────────────────────

function MCQCard({ q, onScore }: { q: QuizQ; onScore: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-2">Câu {q.num}: {q.text}</p>
      <div className="space-y-1.5">
        {q.options.map(opt => {
          const isSelected = selected === opt.key;
          const isCorrect = opt.key === q.answer;
          return (
            <button
              key={opt.key}
              disabled={revealed}
              onClick={() => { setSelected(opt.key); onScore(opt.key === q.answer); }}
              className={cn(
                'w-full text-left text-xs rounded-lg px-2.5 py-1.5 border transition-colors',
                !revealed && 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer',
                revealed && isCorrect && 'border-green-400 bg-green-50 text-green-700 font-medium',
                revealed && isSelected && !isCorrect && 'border-red-400 bg-red-50 text-red-700',
                revealed && !isSelected && !isCorrect && 'border-gray-100 text-gray-400',
              )}
            >
              <span className="font-medium">{opt.key}.</span> {opt.text}
            </button>
          );
        })}
      </div>
      {revealed && selected !== q.answer && (
        <p className="text-xs text-green-600 mt-1.5 font-medium">Đáp án: {q.answer}</p>
      )}
    </div>
  );
}

// ── True/False ────────────────────────────────────────────────────────────────

function TrueFalseCard({ q, onScore }: { q: QuizQTF; onScore: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const revealed = selected !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-2">Câu {q.num} (Đúng/Sai): {q.text}</p>
      <div className="flex gap-2">
        {([true, false] as const).map(val => {
          const label = val ? 'Đúng' : 'Sai';
          const isSelected = selected === val;
          const isCorrect = val === q.answer;
          return (
            <button
              key={label}
              disabled={revealed}
              onClick={() => { setSelected(val); onScore(val === q.answer); }}
              className={cn(
                'flex-1 text-xs rounded-lg px-3 py-1.5 border font-medium transition-colors',
                !revealed && 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer',
                revealed && isCorrect && 'border-green-400 bg-green-50 text-green-700',
                revealed && isSelected && !isCorrect && 'border-red-400 bg-red-50 text-red-700',
                revealed && !isSelected && !isCorrect && 'border-gray-100 text-gray-400',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {revealed && selected !== q.answer && (
        <p className="text-xs text-green-600 mt-1.5 font-medium">Đáp án: {q.answer ? 'Đúng' : 'Sai'}</p>
      )}
    </div>
  );
}

// ── Fill Blank ────────────────────────────────────────────────────────────────

function FillBlankCard({ q, onScore }: { q: QuizQFill; onScore: (correct: boolean) => void }) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const correct = input.trim().toLowerCase() === q.answer.toLowerCase();

  const handleSubmit = () => {
    if (!input.trim()) return;
    setSubmitted(true);
    onScore(correct);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-2">Câu {q.num} (Điền từ): {q.text}</p>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          disabled={submitted}
          placeholder="Điền từ vào đây..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500"
        />
        <button
          onClick={handleSubmit}
          disabled={submitted || !input.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium disabled:opacity-40"
        >
          Kiểm tra
        </button>
      </div>
      {submitted && (
        <p className={cn('text-xs mt-1.5 font-medium', correct ? 'text-green-600' : 'text-red-600')}>
          {correct ? '✓ Chính xác!' : `✗ Đáp án đúng: ${q.answer}`}
        </p>
      )}
    </div>
  );
}

// ── Matching ──────────────────────────────────────────────────────────────────

function MatchingCard({ q, onScore }: { q: QuizQMatch; onScore: (correct: boolean) => void }) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const allSelected = q.colA.every(item => userAnswers[item.num]);

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = q.colA.filter(item => userAnswers[item.num] === q.answer[item.num]).length;
    onScore(correctCount === q.colA.length);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-left">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Câu {q.num} (Nối đôi){q.text ? `: ${q.text}` : ''}
      </p>
      <div className="space-y-2">
        {q.colA.map(aItem => {
          const isCorrect = submitted && userAnswers[aItem.num] === q.answer[aItem.num];
          const isWrong = submitted && userAnswers[aItem.num] !== q.answer[aItem.num];
          return (
            <div key={aItem.num} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 min-w-0 flex-1">{aItem.num}. {aItem.text}</span>
              <select
                value={userAnswers[aItem.num] ?? ''}
                onChange={e => setUserAnswers(prev => ({ ...prev, [aItem.num]: e.target.value }))}
                disabled={submitted}
                className={cn(
                  'text-xs border rounded-lg px-2 py-1 outline-none',
                  !submitted && 'border-gray-200 focus:border-primary',
                  isCorrect && 'border-green-400 bg-green-50 text-green-700',
                  isWrong && 'border-red-400 bg-red-50 text-red-700',
                )}
              >
                <option value="">-- chọn --</option>
                {q.colB.map(bItem => (
                  <option key={bItem.key} value={bItem.key}>{bItem.key}. {bItem.text}</option>
                ))}
              </select>
              {isWrong && (
                <span className="text-xs text-green-600 font-medium whitespace-nowrap">→ {q.answer[aItem.num]}</span>
              )}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allSelected}
          className="mt-2 w-full text-xs py-1.5 rounded-lg bg-primary text-white font-medium disabled:opacity-40"
        >
          Kiểm tra
        </button>
      )}
      {submitted && (
        <p className="text-xs text-center text-gray-500 mt-2 font-medium">
          Đúng {q.colA.filter(item => userAnswers[item.num] === q.answer[item.num]).length}/{q.colA.length} cặp
        </p>
      )}
    </div>
  );
}

// ── Main Renderer ─────────────────────────────────────────────────────────────

export function QuizRenderer({ questions }: { questions: AnyQuizQ[] }) {
  const [scores, setScores] = useState<Record<number, boolean>>({});

  const setScore = (num: number, correct: boolean) => {
    setScores(s => ({ ...s, [num]: correct }));
  };

  const doneCount = Object.keys(scores).length;
  const correctCount = Object.values(scores).filter(Boolean).length;

  return (
    <div className="space-y-3 w-full">
      {questions.map(q => {
        if (q.type === 'mcq') return <MCQCard key={q.num} q={q} onScore={c => setScore(q.num, c)} />;
        if (q.type === 'tf') return <TrueFalseCard key={q.num} q={q} onScore={c => setScore(q.num, c)} />;
        if (q.type === 'fill') return <FillBlankCard key={q.num} q={q} onScore={c => setScore(q.num, c)} />;
        if (q.type === 'match') return <MatchingCard key={q.num} q={q} onScore={c => setScore(q.num, c)} />;
        return null;
      })}
      {doneCount === questions.length && doneCount > 0 && (
        <p className="text-xs text-center text-gray-500 font-medium">
          Kết quả: <span className="text-primary">{correctCount}/{questions.length}</span> câu đúng
        </p>
      )}
    </div>
  );
}
