'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy, ChevronRight, Loader2, RotateCcw, Medal } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK';
  options: string[];
  correctIndex?: number | null;
  correctText?: string | null;
  order: number;
  explanation?: string | null;
}

interface QuizSet {
  id: string;
  title: string;
  description?: string;
  topic: string;
  timeLimit?: number;
  author: { name: string };
  questions: Question[];
  _count: { attempts: number };
}

interface GradedAnswer {
  questionId: string;
  userAnswer: number | string | undefined;
  isCorrect: boolean;
  explanation?: string;
}

interface Attempt {
  attemptId: string;
  score: number;
  correct: number;
  total: number;
  graded: GradedAnswer[];
}

type Phase = 'intro' | 'playing' | 'review' | 'leaderboard';

interface LeaderEntry {
  rank: number;
  user: { id: string; name: string; avatarUrl?: string };
  score: number;
  timeTaken?: number;
  createdAt: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

export default function QuizPlayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [selected, setSelected] = useState<number | string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const [fillInput, setFillInput] = useState('');

  useEffect(() => {
    api.get<QuizSet>(`/quiz/${id}`).then((d) => setQuiz(d)).finally(() => setLoading(false));
  }, [id]);

  // Timer per question
  useEffect(() => {
    if (phase !== 'playing' || !quiz?.timeLimit) return;
    setTimeLeft(quiz.timeLimit);
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) { clearInterval(t); if (!confirmed) autoNext(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, current]);

  // Total timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setTotalTime((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const q = quiz?.questions[current];

  const autoNext = useCallback(() => {
    if (!q) return;
    const ans = answers[q.id] ?? (fillInput || undefined);
    if (ans !== undefined) setAnswers((prev) => ({ ...prev, [q.id]: ans }));
    goNext();
  }, [q, answers, fillInput]);

  const handleConfirm = () => {
    if (!q) return;
    const ans = q.type === 'FILL_BLANK' ? fillInput : selected;
    if (ans === null || ans === undefined || ans === '') return;
    setAnswers((prev) => ({ ...prev, [q.id]: ans as number | string }));
    setConfirmed(true);
  };

  const goNext = () => {
    if (!quiz) return;
    setSelected(null);
    setConfirmed(false);
    setFillInput('');
    if (current + 1 >= quiz.questions.length) {
      handleSubmit();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const result = await api.post<Attempt>(`/quiz/${id}/submit`, { answers, timeTaken: totalTime });
      setAttempt(result);
      setPhase('review');
    } catch {}
    setSubmitting(false);
  };

  const loadLeaderboard = async () => {
    setLoadingLB(true);
    try {
      const data = await api.get<LeaderEntry[]>(`/quiz/${id}/leaderboard`);
      setLeaderboard(data);
    } catch {}
    setLoadingLB(false);
    setPhase('leaderboard');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!quiz) return <div className="text-center py-20 text-gray-400">Không tìm thấy quiz</div>;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      <button onClick={() => router.push('/quiz')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />Trở về
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
          <Trophy className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{quiz.topic}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{quiz.title}</h1>
          {quiz.description && <p className="text-sm text-gray-500 mt-2">{quiz.description}</p>}
        </div>
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <span>{quiz.questions.length} câu hỏi</span>
          {quiz.timeLimit && <span><Clock className="h-4 w-4 inline mr-1" />{quiz.timeLimit}s / câu</span>}
          <span>{quiz._count.attempts} lượt chơi</span>
        </div>
        <button onClick={() => { setPhase('playing'); setCurrent(0); setAnswers({}); setTotalTime(0); }}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-colors">
          Bắt đầu 🎮
        </button>
        <button onClick={loadLeaderboard} className="text-sm text-indigo-500 hover:underline">Xem bảng xếp hạng</button>
      </div>
    </div>
  );

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    if (!q) return null;
    const progress = ((current) / quiz.questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Câu {current + 1} / {quiz.questions.length}</span>
            <div className="flex items-center gap-3">
              {quiz.timeLimit && timeLeft !== null && (
                <span className={cn('font-bold', timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-600')}>
                  <Clock className="h-3.5 w-3.5 inline mr-0.5" />{timeLeft}s
                </span>
              )}
              <span className="text-gray-400">{formatTime(totalTime)}</span>
            </div>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <p className="text-base font-semibold text-gray-900 leading-relaxed">{q.question}</p>

          {/* Multiple choice / True-False */}
          {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
            <div className="space-y-2">
              {(q.type === 'TRUE_FALSE' ? ['Đúng', 'Sai'] : q.options).map((opt, i) => {
                const isSelected = selected === i;
                return (
                  <button key={i} onClick={() => !confirmed && setSelected(i)} disabled={confirmed}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      confirmed && i === selected && 'border-indigo-400 bg-indigo-50',
                      !confirmed && isSelected && 'border-indigo-400 bg-indigo-50',
                      !confirmed && !isSelected && 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50',
                      confirmed && 'cursor-default',
                    )}>
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-xs font-bold mr-3">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill blank */}
          {q.type === 'FILL_BLANK' && (
            <input value={fillInput} onChange={(e) => !confirmed && setFillInput(e.target.value)}
              disabled={confirmed} placeholder="Nhập câu trả lời..."
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-50" />
          )}

          {/* Confirm / Next */}
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={(q.type === 'FILL_BLANK' ? !fillInput.trim() : selected === null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-40 transition-colors">
              Xác nhận
            </button>
          ) : (
            <button onClick={goNext} disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {current + 1 >= quiz.questions.length ? '🎉 Nộp bài' : 'Câu tiếp →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── REVIEW ─────────────────────────────────────────────────────────────────
  if (phase === 'review' && attempt) {
    const pct = attempt.score;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <div className="text-4xl">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div>
            <p className="text-5xl font-black text-indigo-600">{pct}<span className="text-2xl">%</span></p>
            <p className="text-sm text-gray-500 mt-1">{attempt.correct}/{attempt.total} câu đúng · {formatTime(totalTime)}</p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setPhase('playing'); setCurrent(0); setAnswers({}); setTotalTime(0); setAttempt(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
              <RotateCcw className="h-4 w-4" />Chơi lại
            </button>
            <button onClick={loadLeaderboard}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600">
              <Trophy className="h-4 w-4" />Xếp hạng
            </button>
          </div>
        </div>

        {/* Per-question review */}
        <div className="space-y-3">
          {attempt.graded.map((g, i) => {
            const qq = quiz.questions.find((q) => q.id === g.questionId)!;
            const correctAnswer = qq.type === 'FILL_BLANK'
              ? null : qq.options[qq.correctIndex ?? -1] || '';
            const userAns = qq.type === 'FILL_BLANK'
              ? String(g.userAnswer ?? '')
              : qq.options[Number(g.userAnswer ?? -1)] || '—';
            return (
              <div key={g.questionId} className={cn('bg-white rounded-xl border p-4 space-y-2', g.isCorrect ? 'border-emerald-200' : 'border-red-200')}>
                <div className="flex items-start gap-3">
                  {g.isCorrect
                    ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Câu {i + 1}: {qq.question}</p>
                    <p className={cn('text-xs mt-1', g.isCorrect ? 'text-emerald-600' : 'text-red-500')}>
                      Bạn trả lời: <span className="font-medium">{userAns || '(bỏ qua)'}</span>
                    </p>
                    {!g.isCorrect && correctAnswer !== null && (
                      <p className="text-xs text-emerald-600 mt-0.5">Đáp án đúng: <span className="font-medium">{correctAnswer}</span></p>
                    )}
                    {g.explanation && <p className="text-xs text-gray-500 mt-1 italic">{g.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  if (phase === 'leaderboard') {
    const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <button onClick={() => setPhase('intro')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />Trở về
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Bảng xếp hạng</h1>
          <p className="text-sm text-gray-500">{quiz.title}</p>
        </div>
        {loadingLB ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Chưa có ai chơi</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div key={entry.user.id} className={cn('flex items-center gap-4 p-4 bg-white rounded-xl border', entry.rank <= 3 ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200')}>
                <span className="text-xl w-8 text-center">{MEDAL[entry.rank] || `#${entry.rank}`}</span>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
                  {entry.user.avatarUrl
                    ? <img src={entry.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <span className="text-xs font-bold text-white">{entry.user.name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{entry.user.name}</p>
                  {entry.timeTaken && <p className="text-xs text-gray-400">{formatTime(entry.timeTaken)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-indigo-600">{entry.score}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setPhase('playing'); setCurrent(0); setAnswers({}); setTotalTime(0); setAttempt(null); }}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
          Chơi ngay 🎮
        </button>
      </div>
    );
  }

  return null;
}
