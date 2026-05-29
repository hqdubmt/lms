'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookMarked, PlayCircle, ChevronLeft, Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_COLOR, CATEGORY_OPTIONS, LESSON_TYPE_OPTIONS, LESSON_TYPE_LABEL, LESSON_TYPE_COLOR, TEXTBOOK_OPTIONS } from '@/constants/viet';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VietSet {
  id: string; title: string; category: string; lessonType?: string; textbook?: string;
  grade: number; level: string; description?: string;
  _count: { items: number };
  creator: { name: string };
}

function SetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<VietSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const category = searchParams.get('category') || '';
  const grade = searchParams.get('grade') || '';
  const lessonType = searchParams.get('lessonType') || '';
  const textbook = searchParams.get('textbook') || '';

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/viet/sets?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (grade) params.set('grade', grade);
    if (search) params.set('search', search);
    api.get<VietSet[]>(`/viet/sets?${params.toString()}`)
      .then(setSets)
      .finally(() => setLoading(false));
  }, [category, grade]);

  const filtered = search
    ? sets.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    : sets;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {category ? `Chủ đề: ${CATEGORY_LABEL[category] || category}` : 'Tất cả bộ bài học Tiếng Việt'}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} bộ bài học</p>
        </div>
      </div>

      {/* Filters */}
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
          <button onClick={() => setFilter('grade', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !grade ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả lớp</button>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(g => (
            <button key={g} onClick={() => setFilter('grade', String(g) === grade ? '' : String(g))}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                String(g) === grade ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>Lớp {g}</button>
          ))}
        </div>

        {/* Lesson type filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('lessonType', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !lessonType ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả loại</button>
          {LESSON_TYPE_OPTIONS.map(l => (
            <button key={l.value} onClick={() => setFilter('lessonType', l.value === lessonType ? '' : l.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                lessonType === l.value ? 'bg-red-600 text-white' : cn('hover:opacity-80', LESSON_TYPE_COLOR[l.value] || 'bg-gray-100')
              )}>{l.label}</button>
          ))}
        </div>

        {/* Textbook filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('textbook', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !textbook ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả sách</button>
          {TEXTBOOK_OPTIONS.map(tb => (
            <button key={tb.value} onClick={() => setFilter('textbook', tb.value === textbook ? '' : tb.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                textbook === tb.value ? 'bg-red-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
              )}>{tb.label}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm bộ bài học..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">🇻🇳</span>
          <p className="text-muted-foreground text-sm">Không tìm thấy bộ bài học nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(set => (
            <button key={set.id}
              onClick={() => router.push(`/viet/set/${set.id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
              <div className="flex items-start justify-between mb-2 gap-1 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', CATEGORY_COLOR[set.category] || 'bg-gray-100 text-gray-600')}>
                    {CATEGORY_LABEL[set.category] || set.category}
                  </span>
                  {set.lessonType && (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-lg', LESSON_TYPE_COLOR[set.lessonType] || 'bg-gray-100 text-gray-500')}>
                      {LESSON_TYPE_LABEL[set.lessonType] ?? set.lessonType}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Lớp {set.grade}</span>
              </div>
              {set.textbook && (
                <p className="text-xs text-gray-400 mb-1">{set.textbook}</p>
              )}
              <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">
                {set.title}
              </h3>
              {set.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{set.description}</p>
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
      )}
    </div>
  );
}

export default function VietSetsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-gray-100 rounded-2xl"/>)}</div>}>
      <SetsContent />
    </Suspense>
  );
}
