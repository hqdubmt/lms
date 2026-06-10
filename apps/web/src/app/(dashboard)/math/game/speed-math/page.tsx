'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Trophy, Timer, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  expression: string;
  answer: number;
  options: number[];
}

type GameState = 'idle' | 'playing' | 'done';

function levelLabel(level: number) {
  if (level <= 10) return 'Beginner';
  if (level <= 20) return 'Explorer';
  if (level <= 30) return 'Scholar';
  if (level <= 50) return 'Master';
  return 'Legend';
}

export default function SpeedMathPage() {
  const [grade, setGrade] = useState(6);
  const [state, setState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; score: number; xpEarned: number } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endGame = useCallback(async (answersMap: Record<string, number>, qs: Question[], streak: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('done');
    try {
      const res = await api.post<{ correct: number; total: number; score: number; xpEarned: number }>(
        '/math/game/speed-math/submit',
        { answers: answersMap, questions: qs.map(q => ({ id: q.id, answer: q.answer })), streak, timeTaken: 60 - timeLeft }
      );
      setResult(res);
    } catch {
      setResult({ correct: Object.values(answersMap).length, total: qs.length, score: 0, xpEarned: 0 });
    }
  }, [timeLeft]);

  const startGame = async () => {
    const data = await api.get<{ questions: Question[]; timeLimit: number }>(`/math/game/speed-math?grade=${grade}&count=20`);
    setQuestions(data.questions);
    setAnswers({});
    setCurrent(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(data.timeLimit || 60);
    setResult(null);
    setFeedback(null);
    setState('playing');
  };

  useEffect(() => {
    if (state !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setState('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  useEffect(() => {
    if (state === 'done' && timeLeft === 0 && questions.length > 0 && result === null) {
      endGame(answers, questions, maxStreak);
    }
  }, [state, timeLeft, questions, answers, maxStreak, result, endGame]);

  const handleAnswer = (option: number) => {
    if (state !== 'playing' || feedback) return;
    const q = questions[current];
    const isCorrect = option === q.answer;

    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    let newStreak = streak;
    let newMax = maxStreak;
    if (isCorrect) {
      newStreak = streak + 1;
      newMax = Math.max(maxStreak, newStreak);
    } else {
      newStreak = 0;
    }
    setStreak(newStreak);
    setMaxStreak(newMax);

    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      if (current + 1 >= questions.length) {
        endGame(newAnswers, questions, newMax);
      } else {
        setCurrent(c => c + 1);
      }
    }, 400);
  };

  const timeColor = timeLeft > 20 ? 'text-green-600' : timeLeft > 10 ? 'text-yellow-600' : 'text-red-600';

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-white text-center shadow-xl">
          <Zap className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Speed Math</h1>
          <p className="text-white/80 mt-1">60 giây — trả lời nhanh nhất có thể!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp</label>
            <select value={grade} onChange={e => setGrade(+e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>Lớp {g}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Mỗi câu đúng: <span className="font-semibold text-orange-600">+10 XP</span></p>
            <p>✦ Chuỗi 5 câu đúng: <span className="font-semibold text-orange-600">+20 XP bonus</span></p>
            <p>✦ Chuỗi 10 câu đúng: <span className="font-semibold text-orange-600">+50 XP bonus</span></p>
            <p>✦ Perfect (100%): <span className="font-semibold text-orange-600">+100 XP bonus</span></p>
          </div>
          <button onClick={startGame}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition">
            Bắt đầu chơi!
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
          result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
          : result.score >= 60 ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
          : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
          <Trophy className="w-14 h-14 mx-auto mb-3" />
          <div className="text-5xl font-black">{result.score}%</div>
          <p className="text-white/80 mt-1">{result.correct}/{result.total} câu đúng</p>
          <p className="text-white/70 text-sm mt-1">Chuỗi tốt nhất: {maxStreak} | +{result.xpEarned} XP</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setState('idle')}
            className="flex-1 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 font-medium transition">
            Chọn lại
          </button>
          <button onClick={startGame}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition">
            Chơi lại!
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done' && !result) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;

  const answered = Object.keys(answers).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <span className="text-sm font-medium text-gray-600">{answered}/{questions.length} câu</span>
          {streak >= 3 && <span className="text-sm font-bold text-orange-500">🔥 ×{streak}</span>}
        </div>
        <div className={cn('flex items-center gap-1 font-bold text-xl', timeColor)}>
          <Timer className="w-5 h-5" />
          {timeLeft}s
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>

      <div className={cn(
        'rounded-2xl p-8 text-center shadow-lg transition-all',
        feedback === 'correct' ? 'bg-green-100 border-2 border-green-400' :
        feedback === 'wrong' ? 'bg-red-100 border-2 border-red-400' :
        'bg-white border border-gray-200'
      )}>
        <div className="text-4xl font-black text-gray-800 mb-2">{q.expression} = ?</div>
        {feedback === 'correct' && <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />}
        {feedback === 'wrong' && <XCircle className="w-8 h-8 text-red-500 mx-auto" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => (
          <button key={opt} onClick={() => handleAnswer(opt)}
            className={cn(
              'py-5 rounded-xl text-2xl font-bold transition',
              feedback
                ? opt === q.answer ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                : 'bg-white border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-gray-800'
            )}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
