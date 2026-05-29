'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, User, TrendingUp, TrendingDown, Target, Loader2, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { LESSON_TYPE_LABEL, LESSON_TYPE_COLOR, DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '@/constants/math';
import type { StudentMathProfile } from '@/types/math';

export default function MathProfilePage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentMathProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.get<StudentMathProfile>('/math/student-profile').then(setProfile).finally(() => setLoading(false));
  }, [ready]);

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const hasData = profile && profile.totalAttempts > 0;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />Hồ sơ học tập Toán
          </h1>
          <p className="text-sm text-muted-foreground">Phân tích điểm mạnh và điểm yếu của bạn</p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Chưa có dữ liệu học tập</p>
          <p className="text-sm text-muted-foreground mt-1">Làm bài tập để xem phân tích hồ sơ của bạn</p>
          <button onClick={() => router.push('/math/exercises')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Làm bài tập ngay
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Điểm TB</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{profile.avgScore.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookOpen className="h-4 w-4 text-violet-500" />
                <span className="text-xs text-muted-foreground">Số lần làm bài</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{profile.totalAttempts}</div>
              <div className="text-xs text-muted-foreground">lần</div>
            </div>
          </div>

          {/* Weak topics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />Cần cải thiện
            </h2>
            {profile.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa phát hiện điểm yếu — tiếp tục phấn đấu! 🎯</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.weakTopics.map((t) => (
                  <button key={t} onClick={() => router.push(`/math/topics?lessonType=${t}`)}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity', LESSON_TYPE_COLOR[t] || 'bg-red-100 text-red-700')}>
                    {LESSON_TYPE_LABEL[t] ?? t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Strong topics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />Điểm mạnh
            </h2>
            {profile.strongTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có điểm mạnh nổi bật — hãy luyện tập thêm!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.strongTopics.map((t) => (
                  <button key={t} onClick={() => router.push(`/math/topics?lessonType=${t}`)}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity', LESSON_TYPE_COLOR[t] || 'bg-emerald-100 text-emerald-700')}>
                    {LESSON_TYPE_LABEL[t] ?? t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty distribution hint */}
          <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Gợi ý luyện tập theo mức độ</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['easy', 'medium', 'hard', 'olympic'].map((d) => (
                <button key={d} onClick={() => router.push(`/math/exercises?difficulty=${d}`)}
                  className={cn('px-3 py-1 rounded-lg text-xs font-medium', DIFFICULTY_COLOR[d] || 'bg-gray-100 text-gray-600')}>
                  {DIFFICULTY_LABEL[d] ?? d}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
