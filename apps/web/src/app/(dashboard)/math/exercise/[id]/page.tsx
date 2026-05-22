'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Lightbulb,
  Clock, Trophy, ChevronRight, Calculator, Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MathQuestion, MathExercise } from '@/types/math';
import { EXERCISE_TYPE_LABEL } from '@/constants/math';
import { AiExplain } from '@/components/ai/AiExplain';

interface AttemptResult {
  attempt: { id: string; score: number; xpEarned: number };
  score: number;
  xpEarned: number;
  results: Record<string, { correct: boolean; correctAnswer: any; solution?: string }>;
}


export default function MathExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<MathExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shownHints, setShownHints] = useState<Record<string, number>>({});
  const [shownSolutions, setShownSolutions] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<MathExercise>(`/math/exercises/${id}`)
      .then(setExercise)
      .catch(() => router.replace('/math'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!exercise || submitted) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [exercise, submitted]);

  const handleSubmit = async () => {
    if (!exercise) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await api.post<AttemptResult>(`/math/exercises/${id}/attempt`, {
        answers, timeTaken: elapsed,
      });
      setResult(res);
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message || 'Nộp bài thất bại');
    }
    setSubmitting(false);
  };

  const showNextHint = (qid: string, maxHints: number) => {
    setShownHints((prev) => ({ ...prev, [qid]: Math.min((prev[qid] ?? 0) + 1, maxHints) }));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!exercise) return null;

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exercise.questions.length;

  // ── Result screen ──
  if (submitted && result) {
    const correctCount = Object.values(result.results).filter((r) => r.correct).length;
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Score card */}
        <div style={{ background: result.score >= 80 ? 'linear-gradient(135deg,#064e3b,#059669)' : result.score >= 50 ? 'linear-gradient(135deg,#1e3a5f,#2563eb)' : 'linear-gradient(135deg,#7f1d1d,#dc2626)' }}
          className="rounded-2xl p-6 text-white text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-90" />
          <div className="text-5xl font-black mb-1">{result.score}%</div>
          <p className="text-white/70">{correctCount}/{totalQuestions} câu đúng · +{result.xpEarned} XP</p>
          <p className="text-white/50 text-sm mt-1">Thời gian: {formatTime(elapsed)}</p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900">Xem lại bài làm</h3>
          {exercise.questions.map((q, i) => {
            const r = result.results[q.id];
            return (
              <div key={q.id} className={cn('bg-white rounded-2xl border p-4 space-y-2', r?.correct ? 'border-green-200' : 'border-red-200')}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {r?.correct ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Câu {i + 1}</p>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{q.content}</p>
                    {q.options && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt} className={cn('px-3 py-1.5 rounded-lg text-sm', opt === String(q.answer) ? 'bg-green-100 text-green-800 font-medium' : opt === answers[q.id] && !r?.correct ? 'bg-red-100 text-red-700' : 'text-gray-600')}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {!q.options && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Đáp án của bạn: <span className={r?.correct ? 'text-green-700 font-medium' : 'text-red-600'}>{answers[q.id] || '(bỏ trống)'}</span></p>
                        <p className="text-xs text-muted-foreground">Đáp án đúng: <span className="text-green-700 font-medium">{String(q.answer)}</span></p>
                      </div>
                    )}
                    {r?.solution && (
                      <div className="mt-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
                        <span className="font-semibold">Lời giải: </span>{r.solution}
                      </div>
                    )}
                    <AiExplain
                      question={q.content}
                      correctAnswer={String(q.answer)}
                      userAnswer={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                      subject="math"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/math" className="flex-1 py-2.5 text-center bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Về trang toán
          </Link>
          <button onClick={() => { setSubmitted(false); setResult(null); setAnswers({}); setElapsed(0); }}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
            Làm lại
          </button>
        </div>
      </div>
    );
  }

  // ── Exercise form ──
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/math" className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABEL[exercise.type]} · Lớp {exercise.grade} · {exercise.creator.name}</p>
          <h1 className="font-bold text-gray-900 truncate">{exercise.title}</h1>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-mono bg-white border border-gray-200 rounded-xl px-3 py-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Đã trả lời</span>
        <span className="font-bold text-blue-600">{answeredCount}/{totalQuestions}</span>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {exercise.questions.map((q, i) => {
          const hintsShown = shownHints[q.id] ?? 0;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{q.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{q.points} điểm</span>
                    {q.difficulty > 1 && <span className="text-xs text-orange-500 font-medium">{'★'.repeat(q.difficulty)}</span>}
                  </div>
                </div>
              </div>

              {/* Answer input based on type */}
              {(exercise.type === 'MULTIPLE_CHOICE' || exercise.type === 'TRUE_FALSE') && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button key={opt} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={cn('w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        answers[q.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-blue-300')}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(exercise.type === 'FILL_BLANK' || exercise.type === 'CALCULATION') && (
                <input
                  type={exercise.type === 'CALCULATION' ? 'number' : 'text'}
                  placeholder={exercise.type === 'CALCULATION' ? 'Nhập kết quả...' : 'Điền vào chỗ trống...'}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {exercise.type === 'PROOF_STEP' && (
                <textarea
                  placeholder="Trình bày lời giải của bạn..."
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}

              {/* Hints */}
              {q.hints.length > 0 && (
                <div className="space-y-1.5">
                  {q.hints.slice(0, hintsShown).map((hint, hi) => (
                    <div key={hi} className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <Lightbulb className="h-3 w-3 inline mr-1" />Gợi ý {hi + 1}: {hint}
                    </div>
                  ))}
                  {hintsShown < q.hints.length && (
                    <button onClick={() => showNextHint(q.id, q.hints.length)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />Xem gợi ý {hintsShown + 1}/{q.hints.length}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={submitting || answeredCount === 0}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
        {submitting ? 'Đang chấm...' : `Nộp bài (${answeredCount}/${totalQuestions} câu)`}
      </button>
    </div>
  );
}
