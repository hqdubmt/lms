'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Brain, RefreshCw, Lightbulb, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ConceptWithProgress {
  id: string; name: string; definition: string; formula?: string;
  example?: string; solution?: string; hints: string[];
  progress: { interval: number; easeFactor: number; repetitions: number; isLearned: boolean } | null;
  topic?: { title: string; subject: string };
}

export default function MathReviewPage() {
  const [concepts, setConcepts] = useState<ConceptWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ conceptId: string; quality: number }[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    api.get<ConceptWithProgress[]>('/math/review/due')
      .then(setConcepts)
      .finally(() => setLoading(false));
  }, []);

  const rate = async (quality: number) => {
    const current = concepts[idx];
    const newResults = [...results, { conceptId: current.id, quality }];

    if (idx + 1 >= concepts.length) {
      setResults(newResults);
      setSaving(true);
      try {
        const res = await api.post<{ xpEarned: number; reviewed: number }>('/math/review/submit', { results: newResults });
        setXpEarned(res.xpEarned);
      } catch {}
      setSaving(false);
      setDone(true);
    } else {
      setResults(newResults);
      setIdx(idx + 1);
      setFlipped(false);
      setShowHint(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (concepts.length === 0) return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-4">
      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold">Tất cả đã ổn!</h2>
      <p className="text-muted-foreground">Không có khái niệm nào cần ôn tập hôm nay.</p>
      <Link href="/math" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />Về trang toán
      </Link>
    </div>
  );

  if (done) return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-4">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        {saving ? <Loader2 className="h-8 w-8 animate-spin text-green-600" /> : <CheckCircle2 className="h-8 w-8 text-green-600" />}
      </div>
      <h2 className="text-xl font-bold">Hoàn thành ôn tập!</h2>
      <p className="text-muted-foreground">Đã ôn {concepts.length} khái niệm · +{xpEarned} XP</p>
      <div className="flex gap-3 justify-center">
        <Link href="/math" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Về trang toán
        </Link>
        <button onClick={() => { setIdx(0); setFlipped(false); setResults([]); setDone(false); setXpEarned(0); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          <RefreshCw className="h-4 w-4" />Làm lại
        </button>
      </div>
    </div>
  );

  const current = concepts[idx];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/math" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />Quay lại
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Ôn tập SRS</span>
        </div>
        <span className="text-sm text-muted-foreground">{idx + 1}/{concepts.length}</span>
      </div>

      {/* Progress */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${(idx / concepts.length) * 100}%` }} />
      </div>

      {/* Topic tag */}
      {current.topic && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />{current.topic.title}
        </div>
      )}

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="bg-white rounded-2xl border border-gray-200 p-8 min-h-[280px] flex flex-col justify-center cursor-pointer hover:shadow-md transition-all select-none"
      >
        {!flipped ? (
          <div className="text-center space-y-3">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Khái niệm</p>
            <h2 className="text-2xl font-bold text-gray-900">{current.name}</h2>
            {current.formula && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 font-mono text-blue-800 text-sm">{current.formula}</div>
            )}
            <p className="text-muted-foreground text-sm">Nhấn để xem định nghĩa</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Định nghĩa</p>
            <p className="text-gray-900 leading-relaxed">{current.definition}</p>
            {current.example && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Ví dụ</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{current.example}</p>
              </div>
            )}
            {current.solution && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 mb-1">Lời giải</p>
                <p className="text-sm text-green-800 whitespace-pre-wrap">{current.solution}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint */}
      {current.hints.length > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
          className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
          <Lightbulb className="h-4 w-4" />{showHint ? 'Ẩn gợi ý' : `Xem gợi ý (${current.hints.length})`}
        </button>
      )}
      {showHint && (
        <div className="bg-amber-50 rounded-xl p-4 space-y-1.5">
          {current.hints.map((h, i) => (
            <p key={i} className="text-sm text-amber-800"><span className="font-semibold">#{i + 1}:</span> {h}</p>
          ))}
        </div>
      )}

      {/* Rating (only after flip) */}
      {flipped && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Bạn nhớ tốt đến mức nào?</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { q: 0, label: 'Quên', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
              { q: 2, label: 'Khó', cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
              { q: 3, label: 'Ổn', cls: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
              { q: 5, label: 'Dễ', cls: 'bg-green-100 text-green-700 hover:bg-green-200' },
            ].map((r) => (
              <button key={r.q} onClick={() => rate(r.q)}
                className={cn('py-3 rounded-xl text-sm font-semibold transition-colors', r.cls)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
