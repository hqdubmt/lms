'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Play, Clock, Search, Loader2,
  GraduationCap, Plus, Users, LayoutList, Eye, Edit3,
  CheckCircle2, AlertCircle, Archive, ChevronRight,
  TrendingUp, Star, ArrowRight, Filter, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';

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

interface PublicCourse {
  id: string; title: string; slug: string; thumbnailUrl?: string;
  totalLessons: number; totalDuration: number;
  isFree: boolean; price: number; level: string;
  instructor: { name: string };
  _count: { enrollments: number };
}

interface MyCourse {
  id: string; title: string; slug: string; thumbnailUrl?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  level: string; isFree: boolean; price: number; totalLessons: number;
  createdAt: string;
  category?: { name: string };
  _count: { enrollments: number; sections: number };
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

const STATUS_CONFIG: Record<MyCourse['status'], { label: string; icon: any; cls: string }> = {
  PUBLISHED: { label: 'Đã xuất bản', icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
  DRAFT:     { label: 'Bản nháp',    icon: AlertCircle,  cls: 'bg-yellow-100 text-yellow-700' },
  ARCHIVED:  { label: 'Lưu trữ',     icon: Archive,       cls: 'bg-gray-100 text-gray-500' },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />;
}

function CourseThumbnail({ src, title, children, showPlay }: {
  src?: string; title: string; children?: React.ReactNode; showPlay?: boolean;
}) {
  return (
    <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
      {src
        ? <img src={src} alt={title} className="w-full h-full object-cover" />
        : <BookOpen className="h-10 w-10 text-indigo-300" />
      }
      {showPlay && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
            <Play className="h-5 w-5 text-indigo-600 ml-0.5" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Tìm khoá học..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 bg-white border-gray-200 rounded-xl"
      />
    </div>
  );
}

function Tabs({ tabs, active, onChange }: {
  tabs: [string, string][]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit flex-wrap shadow-sm">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            active === key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Empty({ icon: Icon, text, action }: {
  icon: any; text: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
      <Icon className="h-12 w-12 text-gray-300 mb-4" />
      <p className="font-medium text-muted-foreground">{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 text-sm text-indigo-600 hover:underline font-medium flex items-center gap-1">
          {action.label} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Student View ─────────────────────────────────────────────────────────────

function StudentView() {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [browse, setBrowse] = useState<PublicCourse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'my' | 'browse'>('my');

  useEffect(() => {
    Promise.all([
      api.get<EnrolledCourse[]>('/users/enrollments').catch(() => []),
      api.get<{ courses: PublicCourse[] }>('/courses?limit=50').catch(() => ({ courses: [] })),
    ]).then(([enrollData, browseData]) => {
      setEnrolled(Array.isArray(enrollData) ? enrollData : []);
      setBrowse(browseData?.courses ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const enrolledIds = new Set(enrolled.map((e) => e.course.id));

  const filteredEnrolled = enrolled.filter((e) =>
    e.course.title.toLowerCase().includes(search.toLowerCase()));

  const filteredBrowse = browse
    .filter((c) => !enrolledIds.has(c.id))
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  const activeCount = enrolled.filter((e) => e.status === 'ACTIVE').length;
  const completedCount = enrolled.filter((e) => e.status === 'COMPLETED').length;

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Hero banner ── */}
      <div
        className="rounded-3xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}
      >
        <div className="absolute right-0 top-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Khoá học của tôi</h1>
            <p className="text-white/60 text-sm mt-1">
              {activeCount} đang học · {completedCount} đã hoàn thành · {enrolled.length} tổng
            </p>
          </div>
          <div className="flex gap-4">
            {[
              { label: 'Đang học', value: activeCount, icon: BookOpen },
              { label: 'Hoàn thành', value: completedCount, icon: CheckCircle2 },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs
          tabs={[['my', 'Đang học'], ['browse', 'Khám phá']]}
          active={tab}
          onChange={setTab as any}
        />
        <SearchBox value={search} onChange={setSearch} />
      </div>

      {/* ── My courses ── */}
      {tab === 'my' && (
        filteredEnrolled.length === 0 ? (
          <Empty
            icon={GraduationCap}
            text={search ? 'Không tìm thấy khoá học phù hợp' : 'Bạn chưa đăng ký khoá học nào'}
            action={!search ? { label: 'Khám phá khoá học', onClick: () => setTab('browse') } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEnrolled.map(({ course, progress, status }) => (
              <Link
                key={course.id}
                href={`/learn/${course.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
              >
                <CourseThumbnail src={course.thumbnailUrl} title={course.title} showPlay>
                  {status === 'COMPLETED' && (
                    <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      Hoàn thành
                    </span>
                  )}
                  {status === 'ACTIVE' && progress > 0 && (
                    <span className="absolute top-2 right-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                      Đang học
                    </span>
                  )}
                </CourseThumbnail>

                <div className="p-4 flex-1 flex flex-col gap-3">
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

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />{course.totalLessons} bài
                    </span>
                    {course.totalDuration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{formatDuration(course.totalDuration)}
                      </span>
                    )}
                    <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                      {progress > 0 ? 'Tiếp tục' : 'Bắt đầu'} <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Browse courses ── */}
      {tab === 'browse' && (
        filteredBrowse.length === 0 ? (
          <Empty icon={Search} text={search ? 'Không tìm thấy khoá học phù hợp' : 'Không có khoá học mới nào'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBrowse.map((course) => (
              <div
                key={course.id}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
              >
                <CourseThumbnail src={course.thumbnailUrl} title={course.title}>
                  {course.isFree && (
                    <span className="absolute top-2 left-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      Miễn phí
                    </span>
                  )}
                </CourseThumbnail>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLOR[course.level] || 'bg-gray-100 text-gray-600'}`}>
                        {LEVEL_LABEL[course.level] || course.level}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{course.instructor.name}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />{course.totalLessons} bài
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />{course._count.enrollments} học viên
                    </span>
                    {course.totalDuration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{formatDuration(course.totalDuration)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="font-bold text-sm">
                      {course.isFree ? (
                        <span className="text-green-600">Miễn phí</span>
                      ) : (
                        `${Number(course.price).toLocaleString('vi-VN')} ₫`
                      )}
                    </span>
                    <Link
                      href={`/learn/${course.slug}`}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
                    >
                      <Play className="h-3.5 w-3.5" />Xem khoá học
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Instructor View ──────────────────────────────────────────────────────────

function InstructorView() {
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'PUBLISHED' | 'DRAFT'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; enrollments: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<MyCourse[]>('/courses/mine')
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${deleteTarget.id}`);
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {}
    setDeleting(false);
  };

  const filtered = courses
    .filter((c) => tab === 'all' || c.status === tab)
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: courses.length,
    PUBLISHED: courses.filter((c) => c.status === 'PUBLISHED').length,
    DRAFT: courses.filter((c) => c.status === 'DRAFT').length,
  };

  const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div
        className="rounded-3xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #10b981 100%)' }}
      >
        <div className="absolute right-0 top-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Khoá học của tôi</h1>
            <p className="text-white/60 text-sm mt-1">
              Quản lý và theo dõi khoá học bạn đã tạo
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-3">
              {[
                { label: 'Xuất bản', value: counts.PUBLISHED },
                { label: 'Học viên', value: totalStudents },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-white text-emerald-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />Tạo khoá học
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs + Search ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs
          tabs={[
            ['all', `Tất cả (${counts.all})`],
            ['PUBLISHED', `Đã xuất bản (${counts.PUBLISHED})`],
            ['DRAFT', `Bản nháp (${counts.DRAFT})`],
          ]}
          active={tab}
          onChange={setTab as any}
        />
        <SearchBox value={search} onChange={setSearch} />
      </div>

      {/* ── Course grid ── */}
      {filtered.length === 0 ? (
        <Empty
          icon={BookOpen}
          text={search ? 'Không tìm thấy khoá học phù hợp' : 'Bạn chưa tạo khoá học nào'}
          action={!search ? { label: 'Tạo khoá học đầu tiên', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const st = STATUS_CONFIG[course.status];
            const StatusIcon = st.icon;
            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
              >
                <CourseThumbnail src={course.thumbnailUrl} title={course.title}>
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${st.cls}`}>
                    <StatusIcon className="h-3 w-3" />{st.label}
                  </span>
                </CourseThumbnail>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">{course.title}</h3>
                    {course.category && (
                      <p className="text-xs text-muted-foreground mt-1">{course.category.name}</p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100">
                    {[
                      { icon: Users, value: course._count.enrollments, label: 'Học viên' },
                      { icon: LayoutList, value: course._count.sections, label: 'Chương' },
                      { icon: BookOpen, value: course.totalLessons, label: 'Bài học' },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-0.5">
                        <s.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold">{s.value}</span>
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/learn/${course.slug}`}
                      className="flex items-center justify-center gap-1.5 text-xs border border-gray-200 rounded-xl py-2 px-3 hover:bg-gray-50 transition-colors font-medium"
                    >
                      <Eye className="h-3.5 w-3.5" />Xem trước
                    </Link>
                    <Link
                      href={`/instructor/courses/${course.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-xl py-2 hover:bg-indigo-100 transition-colors font-semibold"
                    >
                      <Edit3 className="h-3.5 w-3.5" />Quản lý
                    </Link>
                    <button
                      onClick={() => setDeleteTarget({ id: course.id, title: course.title, enrollments: course._count.enrollments })}
                      className="flex items-center justify-center h-full px-3 rounded-xl border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa khoá học"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setCourses((prev) => [c, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {/* Delete course confirm modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Xóa khóa học?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>"{deleteTarget.title}"</strong> sẽ bị xóa vĩnh viễn cùng toàn bộ nội dung.
                </p>
                {deleteTarget.enrollments > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-semibold">
                    ⚠ Đang có {deleteTarget.enrollments} học viên đăng ký!
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Xóa vĩnh viễn
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Create Course Modal ──────────────────────────────────────────────────────

function CreateCourseModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (course: MyCourse) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('BEGINNER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5) { setError('Tên khoá học tối thiểu 5 ký tự'); return; }
    setSaving(true);
    try {
      const course = await api.post<MyCourse>('/courses', { title, description, level });
      onCreated(course);
    } catch (err: any) {
      setError(err.message || 'Tạo khoá học thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">Tạo khoá học mới</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Tên khoá học <span className="text-red-500">*</span></label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Lập trình Python từ cơ bản đến nâng cao"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả ngắn</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nội dung khoá học..."
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Trình độ</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Đang tạo...' : 'Tạo khoá học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const { user } = useAuthStore();

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="p-6 max-w-6xl mx-auto">
        {user.role === 'INSTRUCTOR' ? <InstructorView /> : <StudentView />}
      </div>
    </div>
  );
}
