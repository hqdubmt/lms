'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User, Trophy, Flame, Target, BookOpen, Mic, MessageSquare,
  ClipboardList, TrendingUp, Star, Lock, RefreshCw, Loader2,
  Network, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentProfile, type StudentProfile } from '@/services/gamification';

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp',  color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { key: 'math',     label: 'Toán học',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'viet',     label: 'Tiếng Việt', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'language', label: 'Ngoại ngữ',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const LEVEL_META: Record<string, { color: string; bg: string; bar: string }> = {
  'Nâng cao': { color: 'text-red-600',   bg: 'bg-red-50 border-red-200',   bar: 'bg-red-500' },
  'Trung bình': { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', bar: 'bg-amber-500' },
  'Cơ bản':   { color: 'text-green-600', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' },
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const [subject, setSubject] = useState('general');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (sub: string) => {
    setLoading(true);
    try {
      const data = await getStudentProfile(sub);
      setProfile(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(subject); }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const levelMeta = LEVEL_META[profile?.level ?? 'Cơ bản'] ?? LEVEL_META['Cơ bản'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Hồ sơ học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tổng quan năng lực và thành tích cá nhân
          </p>
        </div>
        <button
          onClick={() => load(subject)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Cập nhật
        </button>
      </div>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSubject(s.key)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              subject === s.key ? s.color + ' ring-2 ring-offset-1 ring-current/30' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải hồ sơ...
        </div>
      ) : !profile ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <User className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-500">Không thể tải hồ sơ</p>
        </div>
      ) : (
        <>
          {/* Level + Mastery */}
          <div className={cn('rounded-2xl border p-5', levelMeta.bg)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className={cn('h-5 w-5', levelMeta.color)} />
                <span className={cn('text-base font-bold', levelMeta.color)}>
                  Trình độ: {profile.level}
                </span>
              </div>
              <span className="text-sm font-bold text-muted-foreground">
                {profile.masteryAverage}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-white/60 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', levelMeta.bar)}
                style={{ width: `${profile.masteryAverage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Mức thành thạo trung bình</p>
          </div>

          {/* Streak + Activity */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Chuỗi ngày học" value={`${profile.streak?.currentStreak ?? 0} ngày`} icon={Flame} color="bg-orange-100 text-orange-600" />
            <StatCard label="Kỷ lục chuỗi" value={`${profile.streak?.bestStreak ?? 0} ngày`} icon={Trophy} color="bg-yellow-100 text-yellow-600" />
            <StatCard label="Tổng ngày học" value={`${profile.streak?.totalActiveDays ?? 0} ngày`} icon={Target} color="bg-green-100 text-green-600" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Chat AI" value={profile.activity.chatCount} icon={MessageSquare} color="bg-violet-100 text-violet-600" />
            <StatCard label="Giọng nói" value={profile.activity.voiceCount} icon={Mic} color="bg-cyan-100 text-cyan-600" />
            <StatCard label="Bài tập" value={profile.activity.homeworkCount} icon={ClipboardList} color="bg-rose-100 text-rose-600" />
            <StatCard label="Phút học" value={profile.activity.studyMinutes} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
          </div>

          {/* Strongest / Weakest */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-green-600 flex items-center gap-2 mb-3">
                <Star className="h-4 w-4" />Chủ đề mạnh nhất
              </h3>
              {profile.strongestTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có dữ liệu</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.strongestTopics.map((t, i) => (
                    <span key={i} className="text-xs bg-green-50 border border-green-100 text-green-700 rounded-full px-3 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" />Cần ôn lại
              </h3>
              {profile.weakestTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa phát hiện điểm yếu</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.weakestTopics.map((t, i) => (
                    <span key={i} className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-full px-3 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          {profile.achievements.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Thành tích đã mở ({profile.achievements.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {profile.achievements.map(a => (
                  <div key={a.id} className="rounded-xl border bg-yellow-50 border-yellow-200 p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-xs font-semibold text-yellow-700 truncate">{a.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{a.description}</p>
                    {a.unlockedAt && (
                      <p className="text-[10px] text-yellow-600 font-medium">
                        {new Date(a.unlockedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              href="/learning/knowledge-graph"
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Knowledge Graph</p>
                  <p className="text-xs text-muted-foreground">Xem biểu đồ kiến thức</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/learning"
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Tiến độ AI</p>
                  <p className="text-xs text-muted-foreground">Phân tích chi tiết</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
