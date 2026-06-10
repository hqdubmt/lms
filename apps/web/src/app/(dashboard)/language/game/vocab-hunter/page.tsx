'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VocabQuestion {
  id: string;
  itemId: string;
  translation: string;
  imageUrl: string | null;
  example: string | null;
  answer: string;
  options: string[];
}

type GameState = 'idle' | 'playing' | 'done';

export default function VocabHunterPage() {
  const [lang, setLang] = useState('en');
  const [state, setState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; selected: string } | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; score: number; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ questions: VocabQuestion[] }>(`/language/game/vocab-hunter?lang=${lang}&count=10`);
      if (!data.questions.length) { alert('Chưa có từ vựng nào. Hãy thêm từ vựng trước!'); setLoading(false); return; }
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setStreak(0);
      setMaxStreak(0);
      setResult(null);
      setFeedback(null);
      setState('playing');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (option: string) => {
    if (feedback) return;
    const q = questions[current];
    const isCorrect = option.toLowerCase().trim() === q.answer.toLowerCase().trim();

    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    const newStreak = isCorrect ? streak + 1 : 0;
    const newMax = Math.max(maxStreak, newStreak);
    setStreak(newStreak);
    setMaxStreak(newMax);
    setFeedback({ correct: isCorrect, selected: option });

    setTimeout(async () => {
      setFeedback(null);
      if (current + 1 >= questions.length) {
        setState('done');
        try {
          const res = await api.post<{ correct: number; total: number; score: number; xpEarned: number }>(
            '/language/game/vocab-hunter/submit',
            { answers: newAnswers, questions: questions.map(q => ({ id: q.id, answer: q.answer })), streak: newMax }
          );
          setResult(res);
        } catch {
          const correctCount = questions.filter(q => (newAnswers[q.id] ?? '').toLowerCase() === q.answer.toLowerCase()).length;
          setResult({ correct: correctCount, total: questions.length, score: Math.round(correctCount / questions.length * 100), xpEarned: correctCount * 10 });
        }
      } else {
        setCurrent(c => c + 1);
      }
    }, 600);
  };

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-8 text-white text-center shadow-xl">
          <Search className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Vocabulary Hunter</h1>
          <p className="text-white/80 mt-1">Săn từ vựng — chọn từ đúng với nghĩa!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngôn ngữ</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Mỗi câu đúng: <span className="font-semibold text-teal-600">+10 XP</span></p>
            <p>✦ Chuỗi 5 câu: <span className="font-semibold text-teal-600">+20 XP bonus</span></p>
            <p>✦ Chuỗi 10 câu: <span className="font-semibold text-teal-600">+50 XP bonus</span></p>
            <p>✦ Perfect: <span className="font-semibold text-teal-600">+100 XP bonus</span></p>
          </div>
          <button onClick={startGame} disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg transition disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Bắt đầu săn từ!'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        {result ? (
          <>
            <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
              result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : result.score >= 60 ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
              : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
              <Trophy className="w-14 h-14 mx-auto mb-3" />
              <div className="text-5xl font-black">{result.score}%</div>
              <p className="text-white/80 mt-1">{result.correct}/{result.total} câu đúng</p>
              <p className="text-white/70 text-sm mt-1">Streak tốt nhất: {maxStreak} | +{result.xpEarned} XP</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
                Chọn lại
              </button>
              <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition">
                Chơi lại!
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
          <Search className="w-5 h-5 text-teal-500" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{questions.length}</span>
          {streak >= 3 && <span className="text-sm font-bold text-orange-500">🔥 ×{streak}</span>}
        </div>
        <span className="text-sm text-gray-400">{lang.toUpperCase()}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden shadow">
        {q.imageUrl && (
          <div className="relative h-48 bg-gray-100">
            <Image src={q.imageUrl} alt={q.answer} fill className="object-cover" />
          </div>
        )}
        <div className="p-6 text-center">
          <p className="text-lg font-semibold text-gray-800">{q.translation}</p>
          {q.example && <p className="text-sm text-gray-400 mt-1 italic">{q.example}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map(opt => {
          const selected = feedback?.selected === opt;
          const isAnswer = opt.toLowerCase() === q.answer.toLowerCase();
          return (
            <button key={opt} onClick={() => handleAnswer(opt)}
              className={cn(
                'py-4 px-3 rounded-xl text-base font-semibold transition border-2',
                feedback
                  ? isAnswer ? 'bg-green-500 border-green-500 text-white'
                    : selected ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-white border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-gray-800'
              )}>
              <div className="flex items-center justify-center gap-2">
                {feedback && isAnswer && <CheckCircle2 className="w-4 h-4" />}
                {feedback && selected && !isAnswer && <XCircle className="w-4 h-4" />}
                {opt}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
