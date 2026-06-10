'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Trophy, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FormulaQuestion {
  id: string;
  conceptId: string;
  prompt: string;
  hint: string;
  answer: string;
  options: string[];
}

type GameState = 'idle' | 'playing' | 'done';

export default function FormulaHuntPage() {
  const [grade, setGrade] = useState('');
  const [state, setState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<FormulaQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; selected: string } | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; score: number; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startGame = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ count: '10' });
      if (grade) params.set('grade', grade);
      const data = await api.get<{ questions: FormulaQuestion[]; message?: string }>(`/math/game/formula-hunt?${params}`);
      if (!data.questions.length) {
        setError(data.message ?? 'Chưa đủ công thức. Giáo viên cần thêm khái niệm có công thức.');
        setLoading(false); return;
      }
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setStreak(0);
      setMaxStreak(0);
      setResult(null);
      setShowHint(false);
      setFeedback(null);
      setState('playing');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (option: string) => {
    if (feedback) return;
    const q = questions[current];
    const isCorrect = option.trim() === q.answer.trim();
    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    const newStreak = isCorrect ? streak + 1 : 0;
    const newMax = Math.max(maxStreak, newStreak);
    setStreak(newStreak);
    setMaxStreak(newMax);
    setFeedback({ correct: isCorrect, selected: option });

    setTimeout(async () => {
      setFeedback(null);
      setShowHint(false);
      if (current + 1 >= questions.length) {
        setState('done');
        try {
          const res = await api.post<{ correct: number; total: number; score: number; xpEarned: number }>(
            '/math/game/formula-hunt/submit',
            { answers: newAnswers, questions: questions.map(q => ({ id: q.id, answer: q.answer })), streak: newMax }
          );
          setResult(res);
        } catch {
          const correctCount = questions.filter(q => (newAnswers[q.id] ?? '') === q.answer).length;
          setResult({ correct: correctCount, total: questions.length, score: Math.round(correctCount / questions.length * 100), xpEarned: correctCount * 10 });
        }
      } else {
        setCurrent(c => c + 1);
      }
    }, 700);
  };

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 p-8 text-white text-center shadow-xl">
          <FlaskConical className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Formula Hunt</h1>
          <p className="text-white/80 mt-1">Nhìn tên — chọn đúng công thức!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo lớp (tuỳ chọn)</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tất cả</option>
              {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={String(g)}>Lớp {g}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Nhìn tên khái niệm → chọn đúng công thức</p>
            <p>✦ Mỗi câu đúng: <span className="font-semibold text-indigo-600">+10 XP</span></p>
            <p>✦ Perfect: <span className="font-semibold text-indigo-600">+100 XP bonus</span></p>
          </div>
          <button onClick={startGame} disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg transition disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Bắt đầu!'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        {result ? (
          <>
            <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
              result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : result.score >= 60 ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
              : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
              <Trophy className="w-14 h-14 mx-auto mb-3" />
              <div className="text-5xl font-black">{result.score}%</div>
              <p className="text-white/80 mt-1">{result.correct}/{result.total} công thức đúng</p>
              <p className="text-white/70 text-sm mt-1">Streak tốt nhất: {maxStreak} | +{result.xpEarned} XP</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
                Chọn lại
              </button>
              <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition">
                Chơi lại!
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{questions.length}</span>
          {streak >= 3 && <span className="text-sm font-bold text-orange-500">🔥 ×{streak}</span>}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <div className={cn(
        'rounded-2xl border-2 p-6 text-center transition-all',
        feedback?.correct ? 'bg-green-50 border-green-400'
        : feedback && !feedback.correct ? 'bg-red-50 border-red-400'
        : 'bg-white border-gray-200'
      )}>
        <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-2">Công thức của</p>
        <h2 className="text-2xl font-black text-gray-800">{q.prompt}</h2>
        <p className="text-sm text-gray-500 mt-1">= ?</p>

        {showHint && (
          <div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            {q.hint}
          </div>
        )}
        {feedback?.correct && <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mt-3" />}
        {feedback && !feedback.correct && <XCircle className="w-7 h-7 text-red-500 mx-auto mt-3" />}
      </div>

      {!feedback && (
        <button onClick={() => setShowHint(h => !h)}
          className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 mx-auto">
          <Lightbulb className="w-4 h-4" />
          {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          const selected = feedback?.selected === opt;
          const isAnswer = opt === q.answer;
          return (
            <button key={opt} onClick={() => handleAnswer(opt)}
              className={cn(
                'py-4 px-3 rounded-xl text-sm font-semibold transition border-2 text-center break-all',
                feedback
                  ? isAnswer ? 'bg-green-500 border-green-500 text-white'
                    : selected ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-800'
              )}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
