'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Trophy, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  name: string;
  example?: string | null;
  options: string[];
  correctAnswer: string;
}

interface Answer {
  questionId: string;
  answer: string;
  correct: boolean;
  timeMs: number;
}

interface SubmitResult {
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
}

const TIME_PER_Q = 8;

export default function MathFlashQuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [state, setState] = useState<'idle' | 'playing' | 'answered' | 'done'>('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [qStartTime, setQStartTime] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startGame = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ questions: Question[] }>('/math/game/flash-quiz?count=10');
      setQuestions(data.questions);
      setCurrent(0); setAnswers([]); setStreak(0); setMaxStreak(0);
      setSelected(null); setResult(null);
      setState('playing'); setTimeLeft(TIME_PER_Q); setQStartTime(Date.now());
    } catch (e: any) { alert(e.message || 'Không tải được câu hỏi'); }
    finally { setLoading(false); }
  };

  const submitGame = useCallback(async (finalAnswers: Answer[], finalStreak: number) => {
    setState('done'); setLoading(true);
    try {
      const res = await api.post<SubmitResult>('/math/game/flash-quiz/submit', { answers: finalAnswers, streak: finalStreak });
      setResult(res);
    } catch { setResult(null); } finally { setLoading(false); }
  }, []);

  const handleAnswer = useCallback((option: string | null) => {
    if (state !== 'playing') return;
    clearTimer();
    const q = questions[current];
    const timeMs = Date.now() - qStartTime;
    const correct = option === q.correctAnswer;
    const newStreak = correct ? streak + 1 : 0;
    const newMax = Math.max(maxStreak, newStreak);
    setSelected(option); setStreak(newStreak); setMaxStreak(newMax); setState('answered');
    const newAnswers = [...answers, { questionId: q.id, answer: option ?? '', correct, timeMs }];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (current + 1 >= questions.length) { submitGame(newAnswers, newMax); }
      else { setCurrent(c => c + 1); setSelected(null); setState('playing'); setTimeLeft(TIME_PER_Q); setQStartTime(Date.now()); }
    }, 900);
  }, [state, questions, current, qStartTime, streak, maxStreak, answers, submitGame]);

  useEffect(() => {
    if (state !== 'playing') return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearTimer(); handleAnswer(null); return 0; } return t - 1; });
    }, 1000);
    return clearTimer;
  }, [state, current, handleAnswer]);

  if (state === 'idle') return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Quay lại Toán</Link>
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-white text-center shadow-xl">
        <Zap className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-3xl font-black">Trắc Nghiệm Toán</h1>
        <p className="text-white/80 mt-1">Chọn đúng công thức / định nghĩa — càng nhanh càng tốt!</p>
      </div>
      <div className="rounded-xl border p-5 space-y-4 bg-white">
        <div className="text-sm text-gray-500 space-y-1.5">
          <p>⚡ Mỗi câu có <span className="font-semibold text-blue-600">{TIME_PER_Q} giây</span> — hết giờ tính sai</p>
          <p>🔥 Streak liên tiếp sẽ tăng XP thưởng</p>
          <p>✦ Mỗi câu đúng: <span className="font-semibold text-blue-600">+5 XP</span></p>
          <p>🏆 Hoàn hảo 100%: <span className="font-semibold text-blue-600">+30 XP thưởng</span></p>
        </div>
        <button onClick={startGame} disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition disabled:opacity-50">
          {loading ? 'Đang tải...' : 'Bắt đầu!'}
        </button>
      </div>
    </div>
  );

  if (state === 'done') return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
      <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Quay lại Toán</Link>
      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      : result ? (
        <>
          <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
            result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
            : result.score >= 60 ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
            : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
            <Trophy className="w-14 h-14 mx-auto mb-3" />
            <div className="text-5xl font-black">{result.score}%</div>
            <p className="text-white/80 mt-1">{result.correct}/{result.total} câu đúng</p>
            <p className="text-white/70 text-sm mt-1">+{result.xpEarned} XP</p>
            {maxStreak >= 3 && <p className="text-white/80 text-sm mt-1">🔥 Streak: ×{maxStreak}</p>}
          </div>
          <div className="space-y-2">
            {answers.map((a, i) => {
              const q = questions[i];
              return (
                <div key={a.questionId} className={cn('rounded-xl border p-3 flex items-center gap-3', a.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                  {a.correct ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{q?.name}</p>
                    {!a.correct && <p className="text-xs text-gray-500 mt-0.5">{a.answer ? <span>Bạn: <span className="text-red-600 font-mono">{a.answer.slice(0,50)}</span></span> : <span className="text-red-500">Hết giờ</span>}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{(a.timeMs / 1000).toFixed(1)}s</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">Chọn lại</button>
            <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition">Chơi lại!</button>
          </div>
        </>
      ) : null}
    </div>
  );

  const q = questions[current];
  if (!q) return null;
  const timerPct = (timeLeft / TIME_PER_Q) * 100;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{questions.length}</span>
          {streak >= 3 && <span className="text-sm font-bold text-orange-500">🔥 ×{streak}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Timer className="w-4 h-4 text-gray-400" />
          <span className={cn('text-sm font-bold tabular-nums', timeLeft <= 3 ? 'text-red-500' : 'text-gray-600')}>{timeLeft}s</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={cn('h-2 rounded-full transition-all duration-1000', timerPct > 50 ? 'bg-blue-500' : timerPct > 25 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${timerPct}%` }} />
      </div>
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Khái niệm / Công thức</p>
        <p className="text-2xl font-black text-gray-900 mb-2">{q.name}</p>
        {q.example && <p className="text-sm text-gray-400 italic font-mono">"{q.example}"</p>}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {q.options.map((opt) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all font-mono';
          if (state === 'answered') {
            if (opt === q.correctAnswer) cls += ' border-green-500 bg-green-50 text-green-800';
            else if (opt === selected) cls += ' border-red-400 bg-red-50 text-red-700';
            else cls += ' border-gray-200 bg-gray-50 text-gray-400';
          } else {
            cls += ' border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-gray-800 cursor-pointer';
          }
          return (
            <button key={opt} className={cls} disabled={state !== 'playing'} onClick={() => handleAnswer(opt)}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
