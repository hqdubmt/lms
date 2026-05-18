'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Calendar, Clock, Play, ChevronRight,
  TrendingUp, Award, Video, ExternalLink,
  Bell, Search, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnrolledCourse {
  id: string;
  status: string;
  progress: number;
  enrolledAt: string;
  course: {
    id: string; title: string; slug: string; thumbnailUrl?: string;
    totalLessons: number; totalDuration: number;
    instructor: { name: string };
  };
}

interface LiveSession {
  id: string; title: string;
  startTime: string; endTime: string;
  meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  class?: { name: string };
  course?: { title: string };
  creator: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayMonth(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getTodayStr() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Course Progress Card ─────────────────────────────────────────────────────

function CourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const { course, progress, status } = enrollment;
  return (
    <Link
      href={`/learn/${course.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 relative overflow-hidden">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-indigo-300" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
            <Play className="h-5 w-5 text-indigo-600 ml-0.5" />
          </div>
        </div>
        {/* Badge */}
        {status === 'COMPLETED' && (
          <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
            Hoàn thành
          </span>
        )}
        {status === 'ACTIVE' && progress > 0 && progress < 100 && (
          <span className="absolute top-2 right-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
            Đang học
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{course.instructor.name}</p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tiến độ</span>
            <span className="font-semibold text-indigo-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.totalLessons} bài học
          </span>
          {course.totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(course.totalDuration)}
            </span>
          )}
          <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
            {progress > 0 ? 'Tiếp tục' : 'Bắt đầu'}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: LiveSession }) {
  const isLive = session.status === 'LIVE';
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isLive ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white hover:shadow-sm'}`}>
      {/* Icon */}
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${isLive ? 'bg-red-100' : 'bg-indigo-50'}`}>
        <Video className={`h-5 w-5 ${isLive ? 'text-red-500' : 'text-indigo-600'}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{session.title}</span>
          {isLive && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span>{session.class?.name || session.course?.title || session.creator.name}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtDayMonth(session.startTime)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
          </span>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => window.open(session.meetLink, '_blank')}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
          isLive
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {isLive ? 'Vào học ngay' : 'Meet'}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/users/enrollments').catch(() => []),
      api.get<LiveSession[]>('/users/schedule').catch(() => []),
    ]).then(([enrollData, scheduleData]) => {
      const enrollList = Array.isArray(enrollData) ? enrollData : enrollData?.enrollments ?? [];
      const schedList = Array.isArray(scheduleData) ? scheduleData : [];
      setEnrolled(enrollList);
      setSessions(schedList.filter((s: LiveSession) => s.status !== 'ENDED'));
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──
  const activeCourses = enrolled.filter((e) => e.status === 'ACTIVE');
  const completedCourses = enrolled.filter((e) => e.status === 'COMPLETED');
  const avgProgress = activeCourses.length
    ? Math.round(activeCourses.reduce((acc, e) => acc + e.progress, 0) / activeCourses.length)
    : 0;
  const totalHours = Math.round(
    enrolled.reduce((acc, e) => acc + (e.course.totalDuration || 0), 0) / 3600,
  );
  const upcomingSessions = sessions.slice(0, 3);
  const inProgress = enrolled
    .filter((e) => e.status === 'ACTIVE' && e.progress > 0 && e.progress < 100)
    .slice(0, 3);
  const notStarted = enrolled.filter((e) => e.progress === 0).slice(0, 3 - inProgress.length);
  const continueLearning = [...inProgress, ...notStarted];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{getTodayStr()}</p>
          <p className="text-sm font-semibold text-gray-800">{getGreeting()}, {user?.name?.split(' ').pop()} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/courses"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tìm khoá học</span>
          </Link>
          <button className="relative h-9 w-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <Bell className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* ── Hero welcome ── */}
        <div
          className="rounded-3xl p-7 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}
        >
          {/* BG decoration */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute right-20 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm font-medium mb-1">Học viên</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{user?.name}</h1>
              <p className="text-white/60 text-sm mt-2 max-w-md">
                {activeCourses.length > 0
                  ? `Bạn đang học ${activeCourses.length} khoá · Tiến độ trung bình ${avgProgress}%`
                  : 'Bắt đầu hành trình học tập của bạn ngay hôm nay'}
              </p>

              {activeCourses.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1.5">
                    <span>Tiến độ trung bình</span>
                    <span className="font-semibold text-white">{avgProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full w-48 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${avgProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Quick actions inside hero */}
          <div className="relative z-10 mt-5 flex gap-3 flex-wrap">
            <Link href="/courses"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <BookOpen className="h-4 w-4" />Khoá học của tôi
            </Link>
            <Link href="/schedule"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Calendar className="h-4 w-4" />Lịch học
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={BookOpen}
              label="Khoá đang học"
              value={activeCourses.length}
              sub={`${enrolled.length} khoá đã đăng ký`}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={Award}
              label="Đã hoàn thành"
              value={completedCourses.length}
              sub="khoá học"
              color="bg-green-50 text-green-600"
            />
            <StatCard
              icon={Clock}
              label="Giờ học tích lũy"
              value={`${totalHours}h`}
              sub="tổng nội dung"
              color="bg-orange-50 text-orange-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Tiến độ TB"
              value={`${avgProgress}%`}
              sub="các khoá đang học"
              color="bg-purple-50 text-purple-600"
            />
          </div>
        )}

        {/* ── Continue Learning ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Tiếp tục học</h2>
              <p className="text-xs text-muted-foreground">Khoá học của bạn</p>
            </div>
            <Link href="/courses"
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : continueLearning.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Bạn chưa đăng ký khoá học nào</p>
              <Link href="/courses"
                className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline font-medium">
                Khám phá khoá học <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {continueLearning.map((e) => (
                <CourseCard key={e.id} enrollment={e} />
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming Sessions ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Lịch học sắp tới</h2>
              <p className="text-xs text-muted-foreground">Buổi học trực tuyến</p>
            </div>
            <Link href="/schedule"
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Xem lịch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Không có buổi học nào sắp tới</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          )}
        </section>

        {/* ── Bottom padding ── */}
        <div className="h-4" />
      </div>
    </div>
  );
}
