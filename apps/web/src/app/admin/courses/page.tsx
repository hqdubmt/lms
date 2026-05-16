'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Users, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  level: string;
  price: number;
  isFree: boolean;
  createdAt: string;
  instructor: { id: string; name: string; email: string };
  category: { id: string; name: string } | null;
  _count: { enrollments: number; sections: number };
}

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Lưu trữ' };
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline',
  PUBLISHED: 'default',
  ARCHIVED: 'secondary',
};
const LEVEL_LABEL: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const data = await api.get<{ courses: Course[]; total: number }>(`/admin/courses?${params}`);
      setCourses(data.courses);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v === status ? '' : v); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khóa học</h1>
          <p className="text-sm text-muted-foreground">{total} khóa học</p>
        </div>
        <Link href="/admin/courses/new">
          <Button><Plus className="h-4 w-4 mr-2" />Tạo khóa học</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm khóa học..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
          <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => handleStatus(s)}>
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Chưa có khóa học nào</p>
            <Link href="/admin/courses/new" className="inline-block mt-3">
              <Button size="sm">Tạo khóa học đầu tiên</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Khóa học</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Giảng viên</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Cấp độ</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Học viên</th>
                <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Ngày tạo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => (
                <tr key={course.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3">
                    <div className="font-medium line-clamp-1">{course.title}</div>
                    <div className="text-xs text-muted-foreground">{course.isFree ? 'Miễn phí' : `${Number(course.price).toLocaleString('vi-VN')}đ`}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{course.instructor.name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{LEVEL_LABEL[course.level]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[course.status]}>{STATUS_LABEL[course.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />{course._count.enrollments}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">{formatDate(course.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/courses/${course.id}`}>
                      <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            Trang {page} / {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
