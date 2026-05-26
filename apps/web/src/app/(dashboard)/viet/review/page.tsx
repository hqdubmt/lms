'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Brain, RefreshCw, Volume2, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL } from '@/constants/viet';

interface VietItemWithProgress {
  id: string; word: string; meaning: string; example?: string; note?: string;
  progress: { interval: number; easeFactor: number; repetitions: number; isLearned: boolean } | null;
  set?: { title: string; category: string };
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch {}
}


export default function VietReviewPage() {
  const [items, setItems] = useState<VietItemWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ itemId: string; quality: number }[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    api.get<VietItemWithProgress[]>('/viet/review/due')
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const rate = async (quality: number) => {
    const current = items[idx];
    const newResults = [...results, { itemId: current.id, quality }];

    if (idx + 1 >= items.length) {
      setResults(newResults);
      setSaving(true);
      try {
        const res = await api.post<{ xpEarned: number; reviewed: number }>('/viet/review/submit', { results: newResults });
        setXpEarned(res.xpEarned);
      } catch {}
      setSaving(false);
      setDone(true);
    } else {
      setResults(newResults);
      setIdx(idx + 1);
      setFlipped(false);
    }
  };

  const restart = () => { setIdx(0); setFlipped(false); setResults([]); setDone(false); setXpEarned(0); };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (items.length === 0) return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-4">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold">Tất cả đã ổn!</h2>
      <p className="text-muted-foreground">Không có mục nào cần ôn tập hôm nay.</p>
      <Link href="/viet" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />Về trang tiếng Việt
      </Link>
    </div>
  );

  if (done) return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-4">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        {saving ? <Loader2 className="h-8 w-8 animate-spin text-green-600" /> : <CheckCircle2 className="h-8 w-8 text-green-600" />}
      </div>
      <h2 className="text-xl font-bold">Hoàn thành ôn tập!</h2>
      <p className="text-muted-foreground">Đã ôn {items.length} mục · +{xpEarned} XP</p>
      <div className="flex gap-3 justify-center">
        <Link href="/viet" className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
          Về trang tiếng Việt
        </Link>
        <button onClick={restart}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          <RefreshCw className="h-4 w-4" />Làm lại
        </button>
      </div>
    </div>
  );

  const current = items[idx];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/viet" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />Quay lại
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold text-gray-900">Ôn tập SRS</span>
        </div>
        <span className="text-sm text-muted-foreground">{idx + 1}/{items.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      {/* Set tag */}
      {current.set && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          {current.set.title}
          {current.set.category && <span className="text-muted-foreground/60">· {CATEGORY_LABEL[current.set.category] || current.set.category}</span>}
        </div>
      )}

      {/* Card */}
      <div
        onClick={() => { if (!flipped) speak(current.word); setFlipped(!flipped); }}
        className="bg-white rounded-2xl border border-gray-200 p-8 min-h-[280px] flex flex-col justify-center cursor-pointer hover:shadow-md transition-all select-none"
      >
        {!flipped ? (
          <div className="text-center space-y-3">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Từ / Thành ngữ</p>
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{current.word}</h2>
              <button onClick={(e) => { e.stopPropagation(); speak(current.word); }}
                className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            {current.note && <p className="text-xs text-muted-foreground italic">{current.note}</p>}
            <p className="text-muted-foreground text-sm">Nhấn để xem nghĩa</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Nghĩa</p>
            <p className="text-gray-900 leading-relaxed text-lg">{current.meaning}</p>
            {current.example && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Ví dụ</p>
                <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{current.example}</p>
                <button onClick={(e) => { e.stopPropagation(); speak(current.example!); }}
                  className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                  <Volume2 className="h-3 w-3" />Nghe ví dụ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
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
