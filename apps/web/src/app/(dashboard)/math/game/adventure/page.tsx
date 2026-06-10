'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Map, Lock, BookOpen, Star, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  title: string;
  subject: string;
  grade: number;
  level: string;
  _count: { concepts: number; exercises: number };
}

interface MathStats {
  xp: number;
  level: number;
  streak: number;
  conceptsLearned: number;
  exercisesDone: number;
}

const GRADE_LABEL: Record<number, string> = {
  1: 'Lớp 1', 2: 'Lớp 2', 3: 'Lớp 3', 4: 'Lớp 4', 5: 'Lớp 5',
  6: 'Lớp 6', 7: 'Lớp 7', 8: 'Lớp 8', 9: 'Lớp 9',
  10: 'Lớp 10', 11: 'Lớp 11', 12: 'THPT',
};

const GRADE_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🍀', 4: '🌻', 5: '🌳',
  6: '⚡', 7: '🔥', 8: '💫', 9: '🌟',
  10: '🚀', 11: '💎', 12: '👑',
};

const SUBJECT_COLOR: Record<string, string> = {
  ARITHMETIC:   'bg-orange-100 text-orange-700 border-orange-200',
  ALGEBRA:      'bg-violet-100 text-violet-700 border-violet-200',
  GEOMETRY:     'bg-blue-100 text-blue-700 border-blue-200',
  STATISTICS:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  CALCULUS:     'bg-red-100 text-red-700 border-red-200',
  TRIGONOMETRY: 'bg-amber-100 text-amber-700 border-amber-200',
  MEASUREMENT:  'bg-teal-100 text-teal-700 border-teal-200',
  WORD_PROBLEM: 'bg-pink-100 text-pink-700 border-pink-200',
  NUMBER_THEORY:'bg-indigo-100 text-indigo-700 border-indigo-200',
  LOGIC:        'bg-gray-100 text-gray-700 border-gray-200',
};

const SUBJECT_LABEL: Record<string, string> = {
  ARITHMETIC: 'Số học', ALGEBRA: 'Đại số', GEOMETRY: 'Hình học',
  STATISTICS: 'Xác suất', CALCULUS: 'Giải tích', TRIGONOMETRY: 'Lượng giác',
  MEASUREMENT: 'Đo lường', WORD_PROBLEM: 'Toán đố', NUMBER_THEORY: 'Số luận', LOGIC: 'Logic',
};

function levelUnlocked(userLevel: number, grade: number): boolean {
  return userLevel >= Math.max(1, grade - 2);
}

export default function AdventureMapPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<MathStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Topic[]>('/math/topics'),
      api.get<MathStats>('/math/stats'),
    ]).then(([t, s]) => {
      setTopics(t);
      setStats(s);
      if (t.length > 0) {
        const grades = [...new Set(t.map(x => x.grade))].sort((a, b) => a - b);
        setSelectedGrade(grades[0]);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const grades = [...new Set(topics.map(t => t.grade))].sort((a, b) => a - b);
  const gradeTopics = topics.filter(t => t.grade === selectedGrade);
  const userLevel = stats?.level ?? 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/math" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex items-center gap-2">
          <Map className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-black text-gray-900">Adventure Map</h1>
        </div>
        {stats && (
          <div className="ml-auto flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-700">Lv.{stats.level}</span>
          </div>
        )}
      </div>

      {/* Grade map */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {grades.length === 0 ? (
            <div className="text-sm text-gray-500 py-4">Chưa có chủ đề nào. Giáo viên cần thêm bài học.</div>
          ) : (
            grades.map((grade, idx) => {
              const isUnlocked = levelUnlocked(userLevel, grade);
              const count = topics.filter(t => t.grade === grade).length;
              const isSelected = selectedGrade === grade;
              return (
                <button key={grade} onClick={() => isUnlocked && setSelectedGrade(grade)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border-2 transition min-w-[80px]',
                    isSelected ? 'border-blue-500 bg-blue-50'
                    : isUnlocked ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  )}>
                  {!isUnlocked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-gray-400" />}
                  <span className="text-2xl">{GRADE_EMOJI[grade] ?? '📚'}</span>
                  <span className="text-xs font-bold text-gray-700">{GRADE_LABEL[grade] ?? `Lớp ${grade}`}</span>
                  <span className="text-[10px] text-gray-400">{count} chủ đề</span>
                  {idx < grades.length - 1 && (
                    <ChevronRight className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected grade topics */}
      {selectedGrade && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{GRADE_EMOJI[selectedGrade] ?? '📚'}</span>
            <h2 className="font-bold text-gray-800">{GRADE_LABEL[selectedGrade] ?? `Lớp ${selectedGrade}`}</h2>
            <span className="text-sm text-gray-400">— {gradeTopics.length} chủ đề</span>
          </div>

          {gradeTopics.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Chưa có chủ đề nào cho lớp này.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {gradeTopics.map(topic => (
                <Link key={topic.id} href={`/math/topics/${topic.id}`}
                  className="rounded-2xl border bg-white p-4 hover:shadow-md transition-shadow flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{topic.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', SUBJECT_COLOR[topic.subject] ?? 'bg-gray-100 text-gray-600 border-gray-200')}>
                        {SUBJECT_LABEL[topic.subject] ?? topic.subject}
                      </span>
                      <span className="text-[10px] text-gray-400">{topic._count.concepts} khái niệm</span>
                      {topic._count.exercises > 0 && (
                        <span className="text-[10px] text-gray-400">{topic._count.exercises} bài tập</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* XP stats */}
      {stats && (
        <div className="rounded-2xl border bg-gray-50 p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.xp}</p>
              <p className="text-xs text-gray-500">Tổng XP</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.conceptsLearned}</p>
              <p className="text-xs text-gray-500">Khái niệm</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.exercisesDone}</p>
              <p className="text-xs text-gray-500">Bài tập</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
