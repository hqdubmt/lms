'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, BookOpen, Play, Users, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { siteConfig } from '@/config/site';

interface Course {
  id: string; title: string; slug: string; thumbnailUrl?: string;
  totalLessons: number; totalDuration: number;
  isFree: boolean; price: number; level: string;
  instructor: { name: string; avatarUrl?: string };
  _count: { enrollments: number };
}

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao',
};

function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/course/${course.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 flex flex-col">
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-indigo-50 to-purple-100 relative overflow-hidden">
        {course.thumbnailUrl
          ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-indigo-200" />
            </div>
          )
        }
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
            <Play className="h-6 w-6 text-indigo-600 ml-1" />
          </div>
        </div>
        {/* Free badge */}
        {course.isFree && (
          <span className="absolute top-3 left-3 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            Miễn phí
          </span>
        )}
        {/* Level badge */}
        <span className="absolute top-3 right-3 bg-black/40 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {LEVEL_LABEL[course.level] || course.level}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-[13px] leading-snug line-clamp-2 text-gray-900 group-hover:text-indigo-600 transition-colors flex-1">
          {course.title}
        </h3>

        {/* Instructor */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
            {course.instructor.avatarUrl
              ? <img src={course.instructor.avatarUrl} className="h-full w-full object-cover" alt="" />
              : <span className="text-[9px] font-bold text-indigo-600">{course.instructor.name[0]}</span>
            }
          </div>
          <span className="text-xs text-gray-500 truncate">{course.instructor.name}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />{course.totalLessons} bài
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{course._count.enrollments}
          </span>
          <span className="ml-auto font-bold text-indigo-600 text-xs">
            {course.isFree ? 'Miễn phí' : `${Number(course.price).toLocaleString('vi-VN')}₫`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ courses: Course[] }>('/courses?limit=50')
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">{siteConfig.name}</span>
          </div>
          <Link href="/login"
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
            Đăng nhập
          </Link>
        </div>
      </nav>

      {/* Courses */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-200 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <BookOpen className="h-14 w-14 mb-4 opacity-20" />
            <p className="text-sm">Chưa có khoá học nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
