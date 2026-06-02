'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookMarked, PlayCircle, Target } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_COLOR, LESSON_TYPE_LABEL, LESSON_TYPE_COLOR } from '@/constants/viet';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VietSet {
  id: string; title: string; category: string; lessonType?: string; textbook?: string;
  grade: number; level: string; description?: string;
  _count: { items: number };
  creator: { name: string };
}

const GRADE_COLORS: Record<number, { bg: string; text: string; border: string; accent: string }> = {
  1: { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   accent: 'text-rose-500' },
  2: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    accent: 'text-red-500' },
  3: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'text-orange-500' },
  4: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  accent: 'text-amber-600' },
  5: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', accent: 'text-yellow-700' },
};

const GRADE_EMOJI: Record<number, string> = { 1: '🌱', 2: '🌿', 3: '🌳', 4: '📖', 5: '🎓' };

export default function VietGradePage() {
  const params = useParams();
  const router = useRouter();
  const grade = Number(params.grade);
  const [sets, setSets] = useState<VietSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!grade || isNaN(grade)) return;
    api.get<VietSet[]>(`/viet/sets?grade=${grade}`)
      .then(setSets)
      .finally(() => setLoading(false));
  }, [grade]);

  const color = GRADE_COLORS[grade] ?? GRADE_COLORS[2];
  const emoji = GRADE_EMOJI[grade] ?? '📚';

  const grouped = sets.reduce<Record<string, VietSet[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/viet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />Quay lại Tiếng Việt
      </Link>

      {/* Header */}
      <div className={cn('rounded-2xl border p-6', color.bg, color.border)}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{emoji}</div>
          <div>
            <h1 className={cn('text-2xl font-bold', color.text)}>Tiếng Việt lớp {grade}</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? '…' : `${sets.length} bộ bài học`} · Kết nối tri thức với cuộc sống
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
        </div>
      ) : sets.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">🇻🇳</span>
          <p className="text-muted-foreground text-sm">Chưa có bộ bài học nào cho lớp {grade}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg',
                  CATEGORY_COLOR[category] || 'bg-gray-100 text-gray-600')}>
                  {CATEGORY_LABEL[category] || category}
                </span>
                <span className="text-xs text-muted-foreground">{items.length} bộ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(set => (
                  <button key={set.id}
                    onClick={() => router.push(`/viet/set/${set.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
                    {set.lessonType && (
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-lg mb-2 inline-block',
                        LESSON_TYPE_COLOR[set.lessonType] || 'bg-gray-100 text-gray-500')}>
                        {LESSON_TYPE_LABEL[set.lessonType] ?? set.lessonType}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">
                      {set.title}
                    </h3>
                    {set.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{set.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{set._count.items} mục</span>
                      <span className="flex items-center gap-1 text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="h-3 w-3" />Học ngay
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick link to exercises */}
      {!loading && sets.length > 0 && (
        <Link href={`/viet/exercises?grade=${grade}`}
          className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-600 flex items-center justify-center text-white">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Bài tập Tiếng Việt lớp {grade}</p>
              <p className="text-xs text-muted-foreground">Chính tả, ngữ pháp, đọc hiểu</p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
