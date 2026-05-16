'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function NewClassPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập tên lớp học'); return; }
    setSaving(true); setError('');
    try {
      const cls = await api.post<{ id: string }>('/admin/classes', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.push(`/admin/classes/${cls.id}`);
    } catch (err: any) {
      setError(err.message || 'Tạo lớp thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
        <h1 className="text-2xl font-bold">Tạo lớp học</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Thông tin lớp học</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Tên lớp <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="VD: Lớp Python K1 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mô tả</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
                placeholder="Mô tả về lớp học..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Tạo lớp học
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
