'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PlayCircle, ChevronLeft, Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_COLOR, CATEGORY_OPTIONS, EXERCISE_TYPE_LABEL, EXERCISE_TYPE_OPTIONS, EXERCISE_ICONS } from '@/constants/viet';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VietExercise {
  id: string; title: string; type: string; category: string; grade: number; level: string;
  description?: string;
  _count: { questions: number; attempts: number };
  creator: { name: string };
}

function ExercisesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercises, setExercises] = useState<VietExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const category = searchParams.get('category') || '';
  const type = searchParams.get('type') || '';
  const grade = searchParams.get('grade') || '';

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/viet/exercises?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (type) params.set('type', type);
    if (grade) params.set('grade', grade);
    api.get<VietExercise[]>(`/viet/exercises?${params.toString()}`)
      .then(setExercises)
      .finally(() => setLoading(false));
  }, [category, type, grade]);

  const filtered = search
    ? exercises.filter(e => e.title.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {type ? `Bài tập: ${EXERCISE_TYPE_LABEL[type] || type}` : 'Tất cả bài tập Tiếng Việt'}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} bài tập</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <SlidersHorizontal className="h-4 w-4" />Bộ lọc
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('category', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !category ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả chủ đề</button>
          {CATEGORY_OPTIONS.map(c => (
            <button key={c.value}
              onClick={() => setFilter('category', c.value === category ? '' : c.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                category === c.value ? 'bg-red-600 text-white' : cn('hover:opacity-80', CATEGORY_COLOR[c.value] || 'bg-gray-100 text-gray-600')
              )}>{c.label}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('type', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !type ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả dạng</button>
          {EXERCISE_TYPE_OPTIONS.map(t => (
            <button key={t.value}
              onClick={() => setFilter('type', t.value === type ? '' : t.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                type === t.value ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>{t.label}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('grade', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !grade ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả lớp</button>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(g => (
            <button key={g}
              onClick={() => setFilter('grade', String(g) === grade ? '' : String(g))}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                String(g) === grade ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>Lớp {g}</button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm bài tập..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">🇻🇳</span>
          <p className="text-muted-foreground text-sm">Không tìm thấy bài tập nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(ex => {
            const Icon = EXERCISE_ICONS[ex.type];
            return (
              <button key={ex.id}
                onClick={() => router.push(`/viet/exercise/${ex.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
                <div className="flex items-start justify-between mb-3">
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1', CATEGORY_COLOR[ex.category] || 'bg-gray-100 text-gray-600')}>
                    {Icon && <Icon className="h-3 w-3" />}
                    {EXERCISE_TYPE_LABEL[ex.type] || ex.type}
                  </span>
                  <span className="text-xs text-muted-foreground">Lớp {ex.grade}</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">
                  {ex.title}
                </h3>
                {ex.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{ex.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{ex._count.questions} câu hỏi</span>
                  <span>{ex._count.attempts} lượt làm</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-red-500 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="h-3.5 w-3.5" />Làm bài
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VietExercisesPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-gray-100 rounded-2xl"/>)}</div>}>
      <ExercisesContent />
    </Suspense>
  );
}
