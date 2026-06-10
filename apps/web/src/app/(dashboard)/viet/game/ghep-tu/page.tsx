'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, CheckCircle2, XCircle, RotateCcw, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FlowNextStep } from '@/components/learning/FlowNextStep';

interface Question {
  id: string;
  meaning: string;
  answer: string[];
  options: string[];
}

interface SubmitResult {
  results: Array<{ id: string; correct: boolean; expected: string; given: string }>;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
}

type GameState = 'idle' | 'playing' | 'done';

export default function GhepTuPage() {
  const [state, setState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  async function startGame() {
    setLoading(true);
    try {
      const data = await api.get<{ questions: Question[] }>('/viet/game/ghep-tu?count=10');
      setQuestions(data.questions);
      setCurrent(0);
      setSelected([]);
      setRemaining([...data.questions[0].options]);
      setAnswers({});
      setFeedback(null);
      setState('playing');
    } finally {
      setLoading(false);
    }
  }

  function pickSyllable(syl: string, idx: number) {
    const newRemaining = [...remaining];
    newRemaining.splice(idx, 1);
    setRemaining(newRemaining);
    setSelected([...selected, syl]);
  }

  function removeSyllable(syl: string, idx: number) {
    const newSelected = [...selected];
    newSelected.splice(idx, 1);
    setSelected(newSelected);
    setRemaining([...remaining, syl]);
  }

  function checkAnswer() {
    const q = questions[current];
    const given = selected.join(' ').toLowerCase().trim();
    const expected = q.answer.join(' ').toLowerCase().trim();
    const correct = given === expected;
    setFeedback(correct ? 'correct' : 'wrong');
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);

    setTimeout(() => {
      setFeedback(null);
      if (current + 1 < questions.length) {
        const next = current + 1;
        setCurrent(next);
        setSelected([]);
        setRemaining([...questions[next].options]);
      } else {
        submitGame(newAnswers);
      }
    }, 1200);
  }

  async function submitGame(finalAnswers: Record<string, string[]>) {
    setSubmitting(true);
    try {
      const res = await api.post<SubmitResult>('/viet/game/ghep-tu/submit', {
        answers: finalAnswers,
        questions: questions.map(q => ({ id: q.id, answer: q.answer })),
      });
      setResult(res);
      setState('done');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Idle ──
  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/viet" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-red-700">Ghép Từ</h1>
            <p className="text-sm text-muted-foreground">Sắp xếp âm tiết thành từ đúng</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Luật chơi</p>
            <ul className="space-y-1 text-xs">
              <li>• Đọc nghĩa của từ cần ghép</li>
              <li>• Chọn đúng các âm tiết để tạo thành từ</li>
              <li>• Bỏ qua các âm tiết nhiễu</li>
              <li>• Mỗi từ đúng: +10 XP · Perfect: +50 XP</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Bắt đầu chơi'}
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (state === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-5">
          <Trophy className="h-14 w-14 text-yellow-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">{result.score >= 80 ? 'Tuyệt vời!' : result.score >= 50 ? 'Khá tốt!' : 'Cố lên!'}</h2>
            <p className="text-muted-foreground mt-1">{result.correct}/{result.total} từ đúng</p>
          </div>
          <div className="text-4xl font-bold text-red-600">{result.score}%</div>
          <div className="flex items-center justify-center gap-2 text-amber-600 font-semibold">
            <Zap className="h-5 w-5" /> +{result.xpEarned} XP
          </div>

          <div className="space-y-2 text-left max-h-48 overflow-y-auto">
            {result.results.map((r) => (
              <div key={r.id} className={cn('flex items-start gap-2 p-3 rounded-xl text-sm', r.correct ? 'bg-green-50' : 'bg-red-50')}>
                {r.correct ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  {!r.correct && <p className="text-red-700 truncate">Bạn: {r.given || '(trống)'}</p>}
                  <p className={cn('truncate', r.correct ? 'text-green-700' : 'text-muted-foreground')}>
                    {r.correct ? r.expected : `Đúng: ${r.expected}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <FlowNextStep subject="viet" score={result.score} xpEarned={result.xpEarned} activityType="game" />

          <button
            onClick={() => { setState('idle'); setResult(null); }}
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──
  const q = questions[current];
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/viet" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn('h-2 rounded-full transition-all', i < current ? 'bg-green-500 w-6' : i === current ? 'bg-red-500 w-8' : 'bg-gray-200 w-6')}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{current + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      <div className={cn(
        'bg-white rounded-2xl border p-6 mb-4 transition-colors',
        feedback === 'correct' ? 'border-green-400 bg-green-50' : feedback === 'wrong' ? 'border-red-400 bg-red-50' : 'border-gray-100',
      )}>
        <p className="text-xs text-muted-foreground mb-1">Ghép các âm tiết thành từ có nghĩa:</p>
        <p className="text-lg font-semibold">{q.meaning}</p>

        {/* Selected syllables */}
        <div className="mt-4 min-h-12 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          {selected.length === 0 ? (
            <span className="text-sm text-gray-400 self-center">Chọn âm tiết bên dưới...</span>
          ) : (
            selected.map((syl, idx) => (
              <button
                key={idx}
                onClick={() => removeSyllable(syl, idx)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                {syl}
              </button>
            ))
          )}
        </div>

        {selected.length > 0 && (
          <p className="mt-2 text-center text-sm font-medium text-gray-500">
            → <span className="text-red-700 font-bold">{selected.join(' ')}</span>
          </p>
        )}
      </div>

      {/* Syllable bank */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {remaining.map((syl, idx) => (
          <button
            key={idx}
            onClick={() => pickSyllable(syl, idx)}
            className="px-4 py-2.5 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:border-red-400 hover:text-red-600 transition-colors shadow-sm"
          >
            {syl}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn('flex items-center gap-2 p-3 rounded-xl mb-4 font-medium', feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {feedback === 'correct' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {feedback === 'correct' ? 'Chính xác!' : `Đúng: ${q.answer.join(' ')}`}
        </div>
      )}

      {/* Action */}
      <div className="flex gap-3">
        <button
          onClick={() => { setSelected([]); setRemaining([...q.options]); }}
          className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={checkAnswer}
          disabled={selected.length === 0 || !!feedback || submitting}
          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
        >
          Kiểm tra
        </button>
      </div>
    </div>
  );
}
