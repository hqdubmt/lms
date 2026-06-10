'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  sentence: string;
  hint: string;
  answer: string;
  note?: string | null;
}

interface SubmitResult {
  results: Array<{ id: string; correct: boolean; typed: string; expected: string }>;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
}

type GameState = 'idle' | 'playing' | 'done';

export default function FormulaFillPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [state, setState] = useState<GameState>('idle');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ questions: Question[] }>('/math/game/formula-fill?count=10');
      setQuestions(data.questions);
      setCurrent(0); setTyped({}); setResult(null); setShowHint(false);
      setState('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e: any) { alert(e.message || 'Không tải được bài tập'); }
    finally { setLoading(false); }
  };

  const handleNext = async () => {
    if (current + 1 >= questions.length) {
      setState('done'); setLoading(true);
      try {
        const answers = questions.map(q => ({ questionId: q.id, typed: typed[q.id] ?? '', answer: q.answer }));
        const res = await api.post<SubmitResult>('/math/game/formula-fill/submit', { answers });
        setResult(res);
      } catch { setResult(null); } finally { setLoading(false); }
    } else {
      setCurrent(c => c + 1); setShowHint(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (state === 'idle') return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Quay lại Toán</Link>
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-8 text-white text-center shadow-xl">
        <Calculator className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-3xl font-black">Điền Công Thức</h1>
        <p className="text-white/80 mt-1">Điền vào chỗ trống trong công thức / bài toán!</p>
      </div>
      <div className="rounded-xl border p-5 space-y-4 bg-white">
        <div className="text-sm text-gray-500 space-y-1.5">
          <p>✦ Đọc công thức có chỗ trống <span className="font-semibold text-violet-700 font-mono">______</span></p>
          <p>✦ Xem gợi ý nếu cần — không mất điểm thưởng</p>
          <p>✦ Mỗi câu đúng: <span className="font-semibold text-violet-600">+8 XP</span></p>
          <p>🏆 Hoàn hảo 100%: <span className="font-semibold text-violet-600">+30 XP thưởng</span></p>
        </div>
        <button onClick={startGame} disabled={loading} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition disabled:opacity-50">
          {loading ? 'Đang tải...' : 'Bắt đầu!'}
        </button>
      </div>
    </div>
  );

  if (state === 'done') return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
      <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Quay lại Toán</Link>
      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
      : result ? (
        <>
          <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
            result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : result.score >= 60 ? 'bg-gradient-to-br from-violet-500 to-purple-700'
            : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
            <Trophy className="w-14 h-14 mx-auto mb-3" />
            <div className="text-5xl font-black">{result.score}%</div>
            <p className="text-white/80 mt-1">{result.correct}/{result.total} câu đúng</p>
            <p className="text-white/70 text-sm mt-1">+{result.xpEarned} XP</p>
          </div>
          <div className="space-y-3">
            {result.results.map((r, i) => (
              <div key={r.id} className={cn('rounded-xl border p-4', r.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                <div className="flex items-start gap-2">
                  {r.correct ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                  <div className="text-sm space-y-1 flex-1">
                    <p className="text-gray-700 font-mono">{questions[i]?.sentence.replace('______', `[${r.expected}]`)}</p>
                    {!r.correct && <p className="text-red-600">Bạn điền: "<span className="font-semibold font-mono">{r.typed || '(để trống)'}</span>"</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">Chọn lại</button>
            <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition">Chơi lại!</button>
          </div>
        </>
      ) : null}
    </div>
  );

  const q = questions[current];
  if (!q) return null;
  const parts = q.sentence.split('______');

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-violet-600" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{questions.length}</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
        <p className="text-xs uppercase tracking-wider text-gray-400">Điền vào chỗ trống</p>
        <div className="text-lg font-medium text-gray-800 leading-relaxed flex flex-wrap items-baseline gap-1 font-mono">
          <span>{parts[0]}</span>
          <span className="inline-block border-b-2 border-violet-500 text-violet-700 font-bold min-w-[60px] text-center">
            {typed[q.id] || <span className="text-gray-300 text-sm">______</span>}
          </span>
          <span>{parts[1]}</span>
        </div>
        {showHint && (
          <p className="text-sm text-violet-700 bg-violet-50 rounded-lg px-3 py-2">
            💡 <span className="font-semibold">{q.hint}</span>
            {q.note && <span className="text-gray-500 text-xs block mt-0.5">{q.note}</span>}
          </p>
        )}
        <button onClick={() => setShowHint(h => !h)} className="text-xs text-gray-400 underline hover:text-gray-600">
          {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
        </button>
      </div>
      <input
        ref={inputRef}
        value={typed[q.id] ?? ''}
        onChange={e => setTyped(prev => ({ ...prev, [q.id]: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && handleNext()}
        placeholder="Nhập đáp án..."
        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-base font-mono focus:outline-none focus:border-violet-400"
        autoComplete="off" autoCorrect="off" spellCheck={false}
      />
      <button onClick={handleNext} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition">
        {current + 1 >= questions.length ? 'Nộp bài' : 'Câu tiếp theo →'}
      </button>
    </div>
  );
}
