'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Class {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  creator: { id: string; name: string };
  _count: { members: number };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const data = await api.get<{ classes: Class[]; total: number }>(`/admin/classes?${params}`);
      setClasses(data.classes);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa lớp "${name}"? Tất cả thành viên sẽ bị xóa khỏi lớp.`)) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      load();
    } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lớp học</h1>
          <p className="text-sm text-muted-foreground">{total} lớp</p>
        </div>
        <Link href="/admin/classes/new">
          <Button><Plus className="h-4 w-4 mr-2" />Tạo lớp học</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm lớp học..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Chưa có lớp học nào</p>
            <Link href="/admin/classes/new" className="inline-block mt-3">
              <Button size="sm">Tạo lớp đầu tiên</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{cls.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tạo bởi {cls.creator.name} · {formatDate(cls.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Link href={`/admin/classes/${cls.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cls.id, cls.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {cls.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cls.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    {cls._count.members} học viên
                  </span>
                  <Link href={`/admin/classes/${cls.id}`}>
                    <Button size="sm" variant="outline">Quản lý</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            {page} / {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
