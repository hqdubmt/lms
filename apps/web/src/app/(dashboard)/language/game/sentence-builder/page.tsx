'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, CheckCircle2, XCircle, RotateCcw, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FlowNextStep } from '@/components/learning/FlowNextStep';

interface Question {
  id: string;
  hint: string;
  keyword: string;
  words: string[];
  answer: string[];
}

interface SubmitResult {
  results: Array<{ id: string; correct: boolean; expected: string; given: string }>;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
}

type GameState = 'idle' | 'playing' | 'done';

const LANG_OPTIONS = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ko', label: '🇰🇷 한국어' },
];

export default function SentenceBuilderPage() {
  const [lang, setLang] = useState('en');
  const [state, setState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [arranged, setArranged] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  async function startGame() {
    setLoading(true);
    try {
      const data = await api.get<{ questions: Question[] }>(`/language/game/sentence-builder?lang=${lang}&count=8`);
      if (!data.questions.length) {
        alert('Chưa có dữ liệu cho ngôn ngữ này. Hãy thêm từ vựng có ví dụ trước!');
        return;
      }
      setQuestions(data.questions);
      setCurrent(0);
      setArranged([]);
      setRemaining([...data.questions[0].words]);
      setAnswers({});
      setFeedback(null);
      setState('playing');
    } finally {
      setLoading(false);
    }
  }

  function pickWord(word: string, idx: number) {
    const newRemaining = [...remaining];
    newRemaining.splice(idx, 1);
    setRemaining(newRemaining);
    setArranged([...arranged, word]);
  }

  function removeWord(word: string, idx: number) {
    const newArranged = [...arranged];
    newArranged.splice(idx, 1);
    setArranged(newArranged);
    setRemaining([...remaining, word]);
  }

  function checkAnswer() {
    const q = questions[current];
    const given = arranged.join(' ').toLowerCase().trim();
    const expected = q.answer.join(' ').toLowerCase().trim();
    const correct = given === expected;
    setFeedback(correct ? 'correct' : 'wrong');
    const newAnswers = { ...answers, [q.id]: arranged };
    setAnswers(newAnswers);

    setTimeout(() => {
      setFeedback(null);
      if (current + 1 < questions.length) {
        const next = current + 1;
        setCurrent(next);
        setArranged([]);
        setRemaining([...questions[next].words]);
      } else {
        submitGame(newAnswers);
      }
    }, 1200);
  }

  async function submitGame(finalAnswers: Record<string, string[]>) {
    setSubmitting(true);
    try {
      const res = await api.post<SubmitResult>('/language/game/sentence-builder/submit', {
        answers: finalAnswers,
        questions: questions.map(q => ({ id: q.id, answer: q.answer })),
      });
      setResult(res);
      setState('done');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Idle screen ──
  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/language" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sentence Builder</h1>
            <p className="text-sm text-muted-foreground">Sắp xếp từ thành câu đúng</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <div>
            <p className="text-sm font-medium mb-3">Chọn ngôn ngữ</p>
            <div className="grid grid-cols-2 gap-2">
              {LANG_OPTIONS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors',
                    lang === l.code
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
            <p className="font-semibold mb-1">Luật chơi</p>
            <ul className="space-y-1 text-xs">
              <li>• Đọc gợi ý nghĩa của câu</li>
              <li>• Chọn từng từ theo thứ tự đúng</li>
              <li>• Mỗi câu đúng: +12 XP</li>
              <li>• Hoàn hảo 100%: +50 XP bonus</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Bắt đầu chơi'}
          </button>
        </div>
      </div>
    );
  }

  // ── Done screen ──
  if (state === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-5">
          <Trophy className="h-14 w-14 text-yellow-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">{result.score >= 80 ? 'Xuất sắc!' : result.score >= 50 ? 'Tốt lắm!' : 'Cố lên!'}</h2>
            <p className="text-muted-foreground mt-1">{result.correct}/{result.total} câu đúng</p>
          </div>
          <div className="text-4xl font-bold text-indigo-600">{result.score}%</div>
          <div className="flex items-center justify-center gap-2 text-amber-600 font-semibold">
            <Zap className="h-5 w-5" /> +{result.xpEarned} XP
          </div>

          <div className="space-y-2 text-left max-h-48 overflow-y-auto">
            {result.results.map((r, i) => (
              <div key={r.id} className={cn('flex items-start gap-2 p-3 rounded-xl text-sm', r.correct ? 'bg-green-50' : 'bg-red-50')}>
                {r.correct ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  {!r.correct && <p className="text-red-700 font-medium truncate">Bạn: {r.given || '(trống)'}</p>}
                  <p className={cn('truncate', r.correct ? 'text-green-700' : 'text-muted-foreground')}>
                    {r.correct ? r.expected : `Đúng: ${r.expected}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <FlowNextStep subject="language" score={result.score} xpEarned={result.xpEarned} activityType="game" />

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

  // ── Playing screen ──
  const q = questions[current];
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/language" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn('h-2 rounded-full transition-all', i < current ? 'bg-green-500 w-6' : i === current ? 'bg-indigo-500 w-8' : 'bg-gray-200 w-6')}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{current + 1}/{questions.length}</span>
      </div>

      {/* Question card */}
      <div className={cn(
        'bg-white rounded-2xl border p-6 mb-4 transition-colors',
        feedback === 'correct' ? 'border-green-400 bg-green-50' : feedback === 'wrong' ? 'border-red-400 bg-red-50' : 'border-gray-100',
      )}>
        <p className="text-xs text-muted-foreground mb-1">Xây dựng câu có nghĩa:</p>
        <p className="text-lg font-semibold">{q.hint}</p>
        {q.keyword && (
          <span className="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            từ khóa: {q.keyword}
          </span>
        )}

        {/* Arranged words */}
        <div className="mt-4 min-h-12 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          {arranged.length === 0 ? (
            <span className="text-sm text-gray-400 self-center">Chọn từ bên dưới...</span>
          ) : (
            arranged.map((word, idx) => (
              <button
                key={idx}
                onClick={() => removeWord(word, idx)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 mb-6">
        {remaining.map((word, idx) => (
          <button
            key={idx}
            onClick={() => pickWord(word, idx)}
            className="px-3 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-sm"
          >
            {word}
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
          onClick={() => { setArranged([]); setRemaining([...q.words]); }}
          className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={checkAnswer}
          disabled={arranged.length === 0 || !!feedback || submitting}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
        >
          Kiểm tra
        </button>
      </div>
    </div>
  );
}
