'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, PlayCircle, Target, Calculator } from 'lucide-react';
import { SUBJECT_LABEL, SUBJECT_COLOR, LESSON_TYPE_LABEL, LESSON_TYPE_COLOR } from '@/constants/math';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MathTopic {
  id: string; title: string; subject: string; lessonType?: string; textbook?: string;
  grade: number; level: string; description?: string;
  _count: { concepts: number; exercises: number };
  creator: { name: string };
}

const GRADE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  2: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  3: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  4: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  5: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function MathGradePage() {
  const params = useParams();
  const router = useRouter();
  const grade = Number(params.grade);
  const [topics, setTopics] = useState<MathTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!grade || isNaN(grade)) return;
    api.get<MathTopic[]>(`/math/topics?grade=${grade}`)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, [grade]);

  const color = GRADE_COLORS[grade] ?? GRADE_COLORS[2];

  const grouped = topics.reduce<Record<string, MathTopic[]>>((acc, t) => {
    (acc[t.subject] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/math"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />Quay lại Toán học
      </Link>

      {/* Header */}
      <div className={cn('rounded-2xl border p-6', color.bg, color.border)}>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className={cn('text-2xl font-bold', color.text)}>Toán lớp {grade}</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? '…' : `${topics.length} chủ đề`} · Kết nối tri thức với cuộc sống
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
        </div>
      ) : topics.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Chưa có chủ đề nào cho lớp {grade}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([subject, items]) => (
            <div key={subject}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', SUBJECT_COLOR[subject] || 'bg-gray-100 text-gray-600')}>
                  {SUBJECT_LABEL[subject] || subject}
                </span>
                <span className="text-xs text-muted-foreground">{items.length} chủ đề</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(topic => (
                  <button key={topic.id}
                    onClick={() => router.push(`/math/topic/${topic.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
                    {topic.lessonType && (
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-lg mb-2 inline-block',
                        LESSON_TYPE_COLOR[topic.lessonType] || 'bg-gray-100 text-gray-500')}>
                        {LESSON_TYPE_LABEL[topic.lessonType] ?? topic.lessonType}
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {topic.title}
                    </h3>
                    {topic.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{topic.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{topic._count.concepts} khái niệm · {topic._count.exercises} bài tập</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-3.5 w-3.5" />Học ngay
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick link to exercises */}
      {!loading && topics.length > 0 && (
        <Link href={`/math/exercises?grade=${grade}`}
          className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-white">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Bài tập Toán lớp {grade}</p>
              <p className="text-xs text-muted-foreground">Luyện tập tất cả dạng bài</p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
