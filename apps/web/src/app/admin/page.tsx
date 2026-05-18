'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, DollarSign, School, Video, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Stats {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
}

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: any; label: string; value: string | number; href: string; color: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow border border-gray-100 group">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>('/admin/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const fmtMoney = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M ₫`
      : `${fmt(n)} ₫`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Thống kê hệ thống MasterLMS</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Học viên" value={fmt(stats?.totalStudents ?? 0)} href="/admin/users?role=STUDENT" color="bg-blue-500" />
          <StatCard icon={GraduationCap} label="Giảng viên" value={fmt(stats?.totalInstructors ?? 0)} href="/admin/users?role=INSTRUCTOR" color="bg-purple-500" />
          <StatCard icon={BookOpen} label="Khóa học" value={fmt(stats?.totalCourses ?? 0)} href="/admin/courses" color="bg-indigo-500" />
          <StatCard icon={School} label="Đăng ký học" value={fmt(stats?.totalEnrollments ?? 0)} href="/admin/courses" color="bg-violet-500" />
          <StatCard icon={DollarSign} label="Doanh thu" value={fmtMoney(stats?.totalRevenue ?? 0)} href="/admin/users" color="bg-emerald-500" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/courses', icon: BookOpen, label: 'Quản lý Khóa học', desc: 'Tạo, chỉnh sửa khóa học & bài giảng', color: 'text-indigo-600 bg-indigo-50' },
          { href: '/admin/classes', icon: School, label: 'Quản lý Lớp học', desc: 'Tạo lớp, thêm học viên', color: 'text-violet-600 bg-violet-50' },
          { href: '/admin/users', icon: Users, label: 'Quản lý Người dùng', desc: 'Tài khoản, phân quyền, đăng ký', color: 'text-blue-600 bg-blue-50' },
          { href: '/admin/sessions', icon: Video, label: 'Buổi học trực tuyến', desc: 'Lịch học, link Meet', color: 'text-rose-600 bg-rose-50' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow group flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm group-hover:text-primary transition-colors">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
