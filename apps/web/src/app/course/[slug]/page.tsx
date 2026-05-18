'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Clock, Users, Star, Play, ChevronDown,
  ChevronRight, CheckCircle2, Lock, Globe, Award, Loader2,
  FileText, Video, GraduationCap, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lesson {
  id: string; title: string; type: string; order: number;
  isFree: boolean; videoDuration?: number;
}
interface Section { id: string; title: string; order: number; lessons: Lesson[] }
interface Instructor { id: string; name: string; avatarUrl?: string; bio?: string }
interface Course {
  id: string; title: string; slug: string; description?: string;
  thumbnailUrl?: string; status: string;
  level: string; isFree: boolean; price: number;
  totalLessons: number; totalDuration: number;
  instructor: Instructor;
  sections: Section[];
  _count: { enrollments: number; reviews: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao',
};
const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
};
const LESSON_ICON: Record<string, any> = { VIDEO: Play, TEXT: FileText, LIVE: Video };

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [enrollMsg, setEnrollMsg] = useState('');
  const [tab, setTab] = useState<'content' | 'instructor'>('content');

  useEffect(() => {
    api.get<Course>(`/courses/${slug}`)
      .then((data) => {
        setCourse(data);
        const exp: Record<string, boolean> = {};
        data.sections.slice(0, 2).forEach((s) => { exp[s.id] = true; });
        setExpanded(exp);
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [slug, router]);

  useEffect(() => {
    if (!user || !course) return;
    api.get<any>('/users/enrollments')
      .then((list) => {
        const arr: any[] = Array.isArray(list) ? list : (list?.enrollments ?? []);
        setIsEnrolled(arr.some((e: any) => e.course?.id === course.id || e.courseId === course.id));
      })
      .catch(() => {});
  }, [user, course]);

  const handleEnroll = async () => {
    if (!user) { router.push('/login'); return; }
    if (isEnrolled) { router.push(`/learn/${slug}`); return; }
    setEnrolling(true);
    try {
      await api.post(`/courses/${course!.id}/enroll`);
      setIsEnrolled(true);
      setEnrollMsg('Đăng ký thành công! Chuyển hướng...');
      setTimeout(() => router.push(`/learn/${slug}`), 1500);
    } catch (e: any) {
      setEnrollMsg(e.message || 'Đăng ký thất bại');
    }
    setEnrolling(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  if (!course) return null;

  const totalLessons = course.sections.reduce((a, s) => a + s.lessons.length, 0);
  const freeLessons = course.sections.flatMap((s) => s.lessons).filter((l) => l.isFree).length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.back()}
            className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 truncate">{course.title}</span>
          {user ? (
            <Link href="/dashboard" className="ml-auto text-sm text-indigo-600 hover:underline font-medium shrink-0">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="ml-auto text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium shrink-0">
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 70%, #6d28d9 100%)' }}
        className="text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', LEVEL_COLOR[course.level] || 'bg-gray-100 text-gray-600')}>
                  {LEVEL_LABEL[course.level] || course.level}
                </span>
                {course.isFree && <span className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-full font-bold">Miễn phí</span>}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">{course.title}</h1>
              {course.description && (
                <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-xl">{course.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 flex-wrap text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-semibold">4.8</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />{course._count.enrollments} học viên
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />{totalLessons} bài học
                </span>
                {course.totalDuration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />{formatDuration(course.totalDuration)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />Tiếng Việt
                </span>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-2 mt-5">
                <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {course.instructor.avatarUrl
                    ? <img src={course.instructor.avatarUrl} alt={course.instructor.name} className="h-full w-full object-cover" />
                    : <span className="text-xs font-bold">{course.instructor.name[0]}</span>
                  }
                </div>
                <span className="text-sm text-white/70">Giảng viên: <span className="text-white font-medium">{course.instructor.name}</span></span>
              </div>
            </div>

            {/* Right — Enroll card */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center relative">
                  {course.thumbnailUrl
                    ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    : <BookOpen className="h-12 w-12 text-indigo-300" />
                  }
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="h-6 w-6 text-indigo-600 ml-1" />
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {course.isFree ? <span className="text-green-600">Miễn phí</span> : `${Number(course.price).toLocaleString('vi-VN')} ₫`}
                  </div>
                  {!course.isFree && <p className="text-xs text-gray-400 mb-4">Thanh toán một lần, truy cập mãi mãi</p>}

                  {enrollMsg && (
                    <div className={cn('flex items-center gap-2 text-sm px-3 py-2 rounded-xl mb-3',
                      enrollMsg.includes('thành công') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                      {enrollMsg.includes('thành công') ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {enrollMsg}
                    </div>
                  )}

                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {enrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <GraduationCap className="h-5 w-5" />}
                    {isEnrolled ? 'Tiếp tục học' : course.isFree ? 'Đăng ký miễn phí' : 'Đăng ký ngay'}
                  </button>

                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    {[
                      { icon: CheckCircle2, text: 'Truy cập trọn đời' },
                      { icon: Globe, text: `${totalLessons} bài học · ${course.sections.length} chương` },
                      { icon: Award, text: 'Chứng chỉ hoàn thành' },
                      ...(freeLessons > 0 ? [{ icon: Play, text: `${freeLessons} bài học miễn phí` }] : []),
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-green-500 shrink-0" />{item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="lg:max-w-[calc(100%-320px-2rem)]">
          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit mb-6 shadow-sm">
            {([['content', 'Nội dung khoá học'], ['instructor', 'Giảng viên']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')}>
                {label}
              </button>
            ))}
          </div>

          {/* Content tab */}
          {tab === 'content' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-900">Nội dung khoá học</h2>
                <span className="text-sm text-gray-500">{totalLessons} bài · {course.sections.length} chương</span>
              </div>

              {course.sections.map((section) => (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [section.id]: !p[section.id] }))}
                    className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    {expanded[section.id] ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
                    <span className="flex-1 font-semibold text-sm text-gray-900">{section.title}</span>
                    <span className="text-xs text-gray-500 shrink-0">{section.lessons.length} bài</span>
                  </button>

                  {expanded[section.id] && (
                    <div className="divide-y divide-gray-50">
                      {section.lessons.map((lesson) => {
                        const Icon = LESSON_ICON[lesson.type] || Play;
                        const accessible = lesson.isFree || isEnrolled;
                        return (
                          <div key={lesson.id}
                            onClick={() => accessible && router.push(`/learn/${slug}?lesson=${lesson.id}`)}
                            className={cn('flex items-center gap-3 px-5 py-3 transition-colors',
                              accessible ? 'hover:bg-indigo-50 cursor-pointer' : 'cursor-default opacity-70')}>
                            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                              lesson.type === 'VIDEO' ? 'bg-indigo-50' : lesson.type === 'TEXT' ? 'bg-green-50' : 'bg-red-50')}>
                              {accessible
                                ? <Icon className={cn('h-3.5 w-3.5', lesson.type === 'VIDEO' ? 'text-indigo-600' : lesson.type === 'TEXT' ? 'text-green-600' : 'text-red-500')} />
                                : <Lock className="h-3.5 w-3.5 text-gray-400" />
                              }
                            </div>
                            <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              {lesson.isFree && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Miễn phí</span>
                              )}
                              {lesson.videoDuration && (
                                <span className="text-xs text-gray-400">{formatDuration(lesson.videoDuration)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Instructor tab */}
          {tab === 'instructor' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start gap-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {course.instructor.avatarUrl
                    ? <img src={course.instructor.avatarUrl} alt={course.instructor.name} className="h-full w-full object-cover" />
                    : <span className="text-3xl font-bold text-indigo-600">{course.instructor.name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900">{course.instructor.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium mb-3">Giảng viên</p>
                  {course.instructor.bio ? (
                    <p className="text-sm text-gray-600 leading-relaxed">{course.instructor.bio}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Chưa có thông tin giới thiệu</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
