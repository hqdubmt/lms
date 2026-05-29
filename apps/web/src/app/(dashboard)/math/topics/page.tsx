'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookOpen, PlayCircle, ChevronLeft, Search, SlidersHorizontal } from 'lucide-react';
import { SUBJECT_LABEL, SUBJECT_COLOR, SUBJECT_OPTIONS, LESSON_TYPE_OPTIONS, LESSON_TYPE_LABEL, LESSON_TYPE_COLOR, TEXTBOOK_OPTIONS } from '@/constants/math';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MathTopic {
  id: string; title: string; subject: string; lessonType?: string; textbook?: string;
  grade: number; level: string; description?: string;
  _count: { concepts: number; exercises: number };
  creator: { name: string };
}

function TopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<MathTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const subject = searchParams.get('subject') || '';
  const grade = searchParams.get('grade') || '';
  const lessonType = searchParams.get('lessonType') || '';
  const textbook = searchParams.get('textbook') || '';

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/math/topics?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (grade) params.set('grade', grade);
    api.get<MathTopic[]>(`/math/topics?${params.toString()}`)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, [subject, grade, lessonType, textbook]);

  const filtered = search
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : topics;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {subject ? `Chủ đề: ${SUBJECT_LABEL[subject] || subject}` : 'Tất cả chủ đề Toán'}
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} chủ đề</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <SlidersHorizontal className="h-4 w-4" />Bộ lọc
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Subject filter */}
          <button
            onClick={() => setFilter('subject', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !subject ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả môn</button>
          {SUBJECT_OPTIONS.map(s => (
            <button key={s.value}
              onClick={() => setFilter('subject', s.value === subject ? '' : s.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                subject === s.value ? 'bg-blue-600 text-white' : cn('hover:opacity-80', SUBJECT_COLOR[s.value] || 'bg-gray-100 text-gray-600')
              )}>{s.label}</button>
          ))}
        </div>

        {/* Grade filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('grade', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !grade ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả lớp</button>
          {Array.from({ length: 9 }, (_, i) => i + 1).map(g => (
            <button key={g} onClick={() => setFilter('grade', String(g) === grade ? '' : String(g))}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                String(g) === grade ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>Lớp {g}</button>
          ))}
        </div>

        {/* Lesson type filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('lessonType', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !lessonType ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả loại</button>
          {LESSON_TYPE_OPTIONS.map(l => (
            <button key={l.value} onClick={() => setFilter('lessonType', l.value === lessonType ? '' : l.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                lessonType === l.value ? 'bg-blue-600 text-white' : cn('hover:opacity-80', LESSON_TYPE_COLOR[l.value] || 'bg-gray-100')
              )}>{l.label}</button>
          ))}
        </div>

        {/* Textbook filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('textbook', '')}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              !textbook ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>Tất cả sách</button>
          {TEXTBOOK_OPTIONS.map(tb => (
            <button key={tb.value} onClick={() => setFilter('textbook', tb.value === textbook ? '' : tb.value)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                textbook === tb.value ? 'bg-blue-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
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
          placeholder="Tìm chủ đề..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Không tìm thấy chủ đề nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(topic => (
            <button key={topic.id}
              onClick={() => router.push(`/math/topic/${topic.id}`)}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
              <div className="flex items-start justify-between mb-2 gap-1 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', SUBJECT_COLOR[topic.subject] || 'bg-gray-100 text-gray-600')}>
                    {SUBJECT_LABEL[topic.subject] || topic.subject}
                  </span>
                  {topic.lessonType && (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-lg', LESSON_TYPE_COLOR[topic.lessonType] || 'bg-gray-100 text-gray-500')}>
                      {LESSON_TYPE_LABEL[topic.lessonType] ?? topic.lessonType}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Lớp {topic.grade}</span>
              </div>
              {topic.textbook && (
                <p className="text-xs text-gray-400 mb-1">{topic.textbook}</p>
              )}
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                {topic.title}
              </h3>
              {topic.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{topic.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{topic._count.concepts} khái niệm</span>
                <span>{topic._count.exercises} bài tập</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="h-3.5 w-3.5" />Học ngay
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MathTopicsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i=><div key={i} className="h-32 bg-gray-100 rounded-2xl"/>)}</div>}>
      <TopicsContent />
    </Suspense>
  );
}
