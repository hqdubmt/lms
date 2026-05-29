'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, User, TrendingUp, TrendingDown, Target, Loader2, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import { LESSON_TYPE_LABEL, LESSON_TYPE_COLOR, DIFFICULTY_COLOR, DIFFICULTY_LABEL } from '@/constants/viet';
import type { StudentVietProfile } from '@/types/viet';

export default function VietProfilePage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentVietProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.get<StudentVietProfile>('/viet/student-profile').then(setProfile).finally(() => setLoading(false));
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
            <User className="h-5 w-5 text-red-600" />Hồ sơ học tập Tiếng Việt
          </h1>
          <p className="text-sm text-muted-foreground">Phân tích điểm mạnh và điểm yếu của bạn</p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Chưa có dữ liệu học tập</p>
          <p className="text-sm text-muted-foreground mt-1">Làm bài tập để xem phân tích hồ sơ của bạn</p>
          <button onClick={() => router.push('/viet/exercises')}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
            Làm bài tập ngay
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Điểm TB</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{profile.avgScore.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookOpen className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Số lần làm bài</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{profile.totalAttempts}</div>
              <div className="text-xs text-muted-foreground">lần</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />Cần cải thiện
            </h2>
            {profile.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa phát hiện điểm yếu — tiếp tục phấn đấu! 🎯</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.weakTopics.map((t) => (
                  <button key={t} onClick={() => router.push(`/viet/sets?lessonType=${t}`)}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity', LESSON_TYPE_COLOR[t] || 'bg-red-100 text-red-700')}>
                    {LESSON_TYPE_LABEL[t] ?? t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />Điểm mạnh
            </h2>
            {profile.strongTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có điểm mạnh nổi bật — hãy luyện tập thêm!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.strongTopics.map((t) => (
                  <button key={t} onClick={() => router.push(`/viet/sets?lessonType=${t}`)}
                    className={cn('text-sm font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity', LESSON_TYPE_COLOR[t] || 'bg-emerald-100 text-emerald-700')}>
                    {LESSON_TYPE_LABEL[t] ?? t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700">
            <p className="font-medium mb-2">Luyện tập theo dạng bài</p>
            <div className="flex flex-wrap gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} onClick={() => router.push(`/viet/exercises?difficulty=${d}`)}
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
