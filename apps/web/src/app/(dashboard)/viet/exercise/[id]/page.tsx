'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Lightbulb,
  Clock, Trophy, Volume2, RotateCcw, CheckCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { VietQuestion, VietExercise } from '@/types/viet';
import { EXERCISE_TYPE_LABEL, CATEGORY_LABEL } from '@/constants/viet';
import { AiExplain } from '@/components/ai/AiExplain';

interface AttemptResult {
  attempt: { id: string; score: number; xpEarned: number };
  score: number; xpEarned: number;
  results: Record<string, { correct: boolean; correctAnswer: any }>;
}


async function speak(text: string) {
  try {
    const audio = new Audio(`/api/viet/tts?text=${encodeURIComponent(text)}&lang=vi-VN`);
    await audio.play(); return;
  } catch {}
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ── Word Order Input ──────────────────────────────────────────────────────────
function WordOrderInput({ question, value, onChange }: {
  question: VietQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const pool: string[] = question.options || [];
  const placed = value;

  const usedIndices = new Set<number>();
  placed.forEach((w) => {
    const idx = pool.findIndex((p, i) => p === w && !usedIndices.has(i));
    if (idx !== -1) usedIndices.add(idx);
  });
  const availablePool = pool.filter((_, i) => !usedIndices.has(i));

  const addWord = (word: string) => {
    const idx = pool.findIndex((p, i) => p === word && !usedIndices.has(i));
    if (idx !== -1) onChange([...placed, word]);
  };
  const removeWord = (i: number) => {
    const next = [...placed];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* Word pool — click to add */}
      <p className="text-xs font-medium text-gray-500">Nhấn vào từ để thêm vào câu:</p>
      <div className="flex flex-wrap gap-2 bg-gray-50 rounded-xl p-3 min-h-[44px]">
        {availablePool.length === 0 && placed.length > 0
          ? <p className="text-xs text-muted-foreground self-center">Đã dùng hết từ — nhấn vào từ bên dưới để xoá</p>
          : availablePool.map((w, i) => (
            <button key={i} onClick={() => addWord(w)}
              className="px-3 py-1.5 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm">
              {w}
            </button>
          ))}
      </div>

      {/* Answer area — arranged sentence */}
      <p className="text-xs font-medium text-gray-500 mt-1">Câu bạn đang sắp xếp <span className="text-gray-400 font-normal">(nhấn từ để xoá)</span>:</p>
      <div className="min-h-[48px] bg-white rounded-xl border-2 border-red-200 p-3 flex flex-wrap gap-2">
        {placed.length === 0
          ? <p className="text-xs text-muted-foreground self-center italic">Chưa có từ nào — nhấn các từ phía trên</p>
          : placed.map((w, i) => (
            <button key={i} onClick={() => removeWord(i)}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
              {w} ×
            </button>
          ))}
      </div>
    </div>
  );
}

// ── Matching Input ────────────────────────────────────────────────────────────
function MatchingInput({ question, allMatchingQuestions, value, onChange }: {
  question: VietQuestion;
  allMatchingQuestions: VietQuestion[];
  value: string;
  onChange: (v: string) => void;
}) {
  const choices = allMatchingQuestions.map((q) => String(q.answer));
  return (
    <div className="space-y-2">
      {choices.map((choice) => (
        <button key={choice} onClick={() => onChange(choice)}
          className={cn('w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
            value === choice ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 hover:border-red-300')}>
          {choice}
        </button>
      ))}
    </div>
  );
}

export default function VietExercisePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<VietExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [wordOrders, setWordOrders] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shownHints, setShownHints] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get<VietExercise>(`/viet/exercises/${id}`)
      .then(setExercise)
      .catch(() => router.replace('/viet'))
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
    const finalAnswers = { ...answers };
    if (exercise.type === 'WORD_ORDER') {
      exercise.questions.forEach((q) => { finalAnswers[q.id] = wordOrders[q.id] || []; });
    }
    try {
      const res = await api.post<AttemptResult>(`/viet/exercises/${id}/attempt`, { answers: finalAnswers, timeTaken: elapsed });
      setResult(res);
      setSubmitted(true);
    } catch (e: any) { alert(e.message || 'Nộp bài thất bại'); }
    setSubmitting(false);
  };

  const showNextHint = (qid: string, max: number) => {
    setShownHints((prev) => ({ ...prev, [qid]: Math.min((prev[qid] ?? 0) + 1, max) }));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!exercise) return null;

  const matchingQuestions = exercise.questions.filter((q) => exercise.type === 'MATCHING');
  const answeredCount = exercise.type === 'WORD_ORDER'
    ? Object.values(wordOrders).filter((v) => v.length > 0).length
    : Object.keys(answers).filter((k) => answers[k] !== '' && answers[k] !== undefined).length;
  const totalQuestions = exercise.questions.length;

  // ── Result screen ──
  if (submitted && result) {
    const correctCount = Object.values(result.results).filter((r) => r.correct).length;
    const grade = result.score >= 80 ? 'linear-gradient(135deg,#14532d,#16a34a)' : result.score >= 50 ? 'linear-gradient(135deg,#7c2d12,#b45309)' : 'linear-gradient(135deg,#7c1f0e,#dc2626)';
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div style={{ background: grade }} className="rounded-2xl p-6 text-white text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-90" />
          <div className="text-5xl font-black mb-1">{result.score}%</div>
          <p className="text-white/70">{correctCount}/{totalQuestions} câu đúng · +{result.xpEarned} XP</p>
          <p className="text-white/50 text-sm mt-1">Thời gian: {formatTime(elapsed)}</p>
        </div>

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
                    {q.options && exercise.type === 'MULTIPLE_CHOICE' && (
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt} className={cn('px-3 py-1.5 rounded-lg text-sm',
                            opt === String(q.answer) ? 'bg-green-100 text-green-800 font-medium'
                              : opt === answers[q.id] && !r?.correct ? 'bg-red-100 text-red-700' : 'text-gray-600')}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {(exercise.type === 'FILL_BLANK' || exercise.type === 'SPELLING' || exercise.type === 'MATCHING') && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Đáp án của bạn: <span className={r?.correct ? 'text-green-700 font-medium' : 'text-red-600'}>{answers[q.id] || '(bỏ trống)'}</span></p>
                        <p className="text-xs text-muted-foreground">Đáp án đúng: <span className="text-green-700 font-medium">{String(q.answer)}</span></p>
                      </div>
                    )}
                    {exercise.type === 'WORD_ORDER' && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Của bạn: <span className={r?.correct ? 'text-green-700 font-medium' : 'text-red-600'}>{(wordOrders[q.id] || []).join(' ') || '(bỏ trống)'}</span></p>
                        <p className="text-xs text-muted-foreground">Đúng: <span className="text-green-700 font-medium">{Array.isArray(q.answer) ? q.answer.join(' ') : String(q.answer)}</span></p>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="mt-2 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
                        <span className="font-semibold">Giải thích: </span>{q.explanation}
                      </div>
                    )}
                    <AiExplain
                      question={q.content}
                      correctAnswer={Array.isArray(q.answer) ? q.answer.join(', ') : String(q.answer)}
                      userAnswer={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                      subject="viet"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/viet" className="flex-1 py-2.5 text-center bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
            Về trang tiếng Việt
          </Link>
          <button onClick={() => { setSubmitted(false); setResult(null); setAnswers({}); setWordOrders({}); setElapsed(0); }}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
            <RotateCcw className="h-4 w-4 inline mr-1" />Làm lại
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
        <Link href="/viet" className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABEL[exercise.type]} · {CATEGORY_LABEL[exercise.category] || exercise.category} · Lớp {exercise.grade}</p>
          <h1 className="font-bold text-gray-900 truncate">{exercise.title}</h1>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-mono bg-white border border-gray-200 rounded-xl px-3 py-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Passage for READING */}
      {exercise.passage && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700">Đoạn văn</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{exercise.passage}</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Đã trả lời</span>
        <span className="font-bold text-red-600">{answeredCount}/{totalQuestions}</span>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {exercise.questions.map((q, i) => {
          const hintsShown = shownHints[q.id] ?? 0;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap flex-1">{q.content}</p>
                    {exercise.type === 'SPELLING' && (
                      <button onClick={() => speak(q.content)} title="Nghe lại"
                        className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                        <Volume2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.points} điểm</p>
                </div>
              </div>

              {/* Multiple choice */}
              {exercise.type === 'MULTIPLE_CHOICE' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button key={opt} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={cn('w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        answers[q.id] === opt ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 hover:border-red-300')}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Fill blank / Spelling */}
              {(exercise.type === 'FILL_BLANK' || exercise.type === 'SPELLING') && (
                <input type="text"
                  placeholder={exercise.type === 'SPELLING' ? 'Gõ từ bạn nghe được...' : 'Điền vào chỗ trống...'}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              )}

              {/* Matching */}
              {exercise.type === 'MATCHING' && (
                <MatchingInput
                  question={q}
                  allMatchingQuestions={matchingQuestions}
                  value={answers[q.id] ?? ''}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                />
              )}

              {/* Word order */}
              {exercise.type === 'WORD_ORDER' && (
                <WordOrderInput
                  question={q}
                  value={wordOrders[q.id] || []}
                  onChange={(v) => setWordOrders((prev) => ({ ...prev, [q.id]: v }))}
                />
              )}

              {/* Reading */}
              {exercise.type === 'READING' && (
                <textarea
                  placeholder="Viết câu trả lời của bạn..."
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              )}

              {/* Hints */}
              {q.explanation && (
                <div className="space-y-1.5">
                  {Array.from({ length: hintsShown }).map((_, hi) => (
                    <div key={hi} className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <Lightbulb className="h-3 w-3 inline mr-1" />{q.explanation}
                    </div>
                  ))}
                  {hintsShown === 0 && (
                    <button onClick={() => showNextHint(q.id, 1)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />Xem gợi ý
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
        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCheck className="h-5 w-5" />}
        {submitting ? 'Đang chấm...' : `Nộp bài (${answeredCount}/${totalQuestions} câu)`}
      </button>
    </div>
  );
}
