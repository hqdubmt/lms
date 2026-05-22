'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, X, Volume2, Clock, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { LangExercise as Exercise } from '@/types/language';
import { EXERCISE_TYPE_LABEL as TYPE_LABEL } from '@/constants/language';
import { MultipleChoice, FillBlank, Matching, WordOrder, Dictation } from './_components/QuestionRenderers';
import { AiExplain } from '@/components/ai/AiExplain';

interface AttemptResult {
  score: number; xpEarned: number;
  results: Record<string, { correct: boolean; correctAnswer: any }>;
}

// ─── Main Exercise Page ────────────────────────────────────────────────────────
export default function ExercisePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    api.get<Exercise>(`/language/exercises/${id}`)
      .then(e => { setExercise(e); if (e.timeLimit) setTimeLeft(e.timeLimit); })
      .catch(() => router.push('/language'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = useCallback(async () => {
    if (!exercise || submitting) return;
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    try {
      const res = await api.post<AttemptResult>(`/language/exercises/${id}/attempt`, { answers, timeTaken });
      setResult(res); setSubmitted(true);
    } catch { }
    setSubmitting(false);
  }, [exercise, submitting, startTime, id, answers]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => (t || 1) - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, submitted, handleSubmit]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!exercise) return null;

  const q = exercise.questions[currentQ];
  const totalQ = exercise.questions.length;
  const answered = Object.keys(answers).length;

  if (result && submitted) {
    const score = result.score;
    const emoji = score >= 90 ? '🏆' : score >= 70 ? '⭐' : score >= 50 ? '👍' : '📚';
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-4 py-6">
          <div className="text-6xl">{emoji}</div>
          <h2 className="text-2xl font-bold">Hoàn thành bài tập!</h2>
          <div className="text-5xl font-bold text-primary">{score}%</div>
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-green-600">✓ {exercise.questions.filter(q => result.results[q.id]?.correct).length} đúng</span>
            <span className="text-red-500">✗ {exercise.questions.filter(q => !result.results[q.id]?.correct).length} sai</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-yellow-600">
            <Zap className="h-5 w-5" />+{result.xpEarned} XP
          </div>
        </div>

        {/* Review */}
        <div className="space-y-3">
          <h3 className="font-semibold">Xem lại đáp án</h3>
          {exercise.questions.map((q, i) => {
            const r = result.results[q.id];
            return (
              <Card key={q.id} className={cn('border-l-4', r.correct ? 'border-l-green-500' : 'border-l-red-500')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {r.correct ? <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /> : <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">Câu {i + 1}: {q.content.replace('___', '_____')}</p>
                      {!r.correct && (
                        <p className="text-xs text-green-700 mt-1">Đáp án đúng: <strong>{JSON.stringify(r.correctAnswer)}</strong></p>
                      )}
                      {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
                      <AiExplain
                        question={q.content}
                        correctAnswer={String(r.correctAnswer)}
                        userAnswer={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                        subject="language"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => { setAnswers({}); setSubmitted(false); setResult(null); setCurrentQ(0); }}>
            <RotateCcw className="h-4 w-4 mr-2" />Làm lại
          </Button>
          <Button variant="outline" onClick={() => router.push('/language')}>Thoát</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/language')}>
          <ChevronLeft className="h-4 w-4 mr-1" />Thoát
        </Button>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <span className={cn('flex items-center gap-1.5 text-sm font-medium', timeLeft < 60 ? 'text-red-500' : 'text-muted-foreground')}>
              <Clock className="h-4 w-4" />{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
          <Badge variant="outline">{TYPE_LABEL[exercise.type]}</Badge>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Câu {currentQ + 1} / {totalQ}</span>
          <span>{answered} đã trả lời</span>
        </div>
        <div className="flex gap-1">
          {exercise.questions.map((question, i) => (
            <button key={question.id} onClick={() => setCurrentQ(i)}
              className={cn('flex-1 h-2 rounded-full transition-all',
                i === currentQ ? 'bg-primary' :
                answers[question.id] !== undefined ? 'bg-primary/40' : 'bg-muted')}>
            </button>
          ))}
        </div>
      </div>

      {/* Question card */}
      <Card className="shadow-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Câu {currentQ + 1}</p>
              <h3 className="text-lg font-semibold">
                {exercise.type !== 'FILL_BLANK' && exercise.type !== 'DICTATION' && exercise.type !== 'WORD_ORDER'
                  ? q.content : exercise.type === 'DICTATION' ? 'Nghe audio và viết lại nội dung' : q.content}
              </h3>
            </div>
            {q.audioUrl && (
              <button onClick={() => new Audio(q.audioUrl!).play()} className="text-primary hover:text-primary/80">
                <Volume2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {exercise.type === 'MULTIPLE_CHOICE' && (
            <MultipleChoice key={q.id} q={q} answer={answers[q.id]} onAnswer={a => setAnswers(p => ({ ...p, [q.id]: a }))}
              submitted={submitted} result={result?.results[q.id]} />
          )}
          {exercise.type === 'FILL_BLANK' && (
            <FillBlank key={q.id} q={q} answer={answers[q.id]} onAnswer={a => setAnswers(p => ({ ...p, [q.id]: a }))}
              submitted={submitted} result={result?.results[q.id]} />
          )}
          {exercise.type === 'MATCHING' && (
            <Matching key={q.id} q={q} answer={answers[q.id]} onAnswer={a => setAnswers(p => ({ ...p, [q.id]: a }))}
              submitted={submitted} result={result?.results[q.id]} />
          )}
          {exercise.type === 'WORD_ORDER' && (
            <WordOrder key={q.id} q={q} answer={answers[q.id]} onAnswer={a => setAnswers(p => ({ ...p, [q.id]: a }))}
              submitted={submitted} result={result?.results[q.id]} />
          )}
          {exercise.type === 'DICTATION' && (
            <Dictation key={q.id} q={q} answer={answers[q.id]} onAnswer={a => setAnswers(p => ({ ...p, [q.id]: a }))}
              submitted={submitted} result={result?.results[q.id]} />
          )}

          {submitted && q.explanation && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              💡 {q.explanation}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(i => i - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />Câu trước
        </Button>
        {currentQ < totalQ - 1 ? (
          <Button onClick={() => setCurrentQ(i => i + 1)}>
            Câu tiếp <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || answered === 0} className="bg-green-600 hover:bg-green-700 text-white">
            {submitting ? 'Đang nộp...' : `Nộp bài (${answered}/${totalQ})`}
          </Button>
        )}
      </div>
    </div>
  );
}
