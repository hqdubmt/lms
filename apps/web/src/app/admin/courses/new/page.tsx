'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const LEVELS = [
  { value: 'BEGINNER', label: 'Cơ bản' },
  { value: 'INTERMEDIATE', label: 'Trung cấp' },
  { value: 'ADVANCED', label: 'Nâng cao' },
];

const STATUSES = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Công khai' },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    level: 'BEGINNER',
    price: '0',
    isFree: true,
    status: 'DRAFT',
    language: 'vi',
    tags: '',
    requirements: '',
    objectives: '',
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tên khóa học'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        level: form.level,
        price: form.isFree ? 0 : Number(form.price),
        isFree: form.isFree,
        status: form.status,
        language: form.language,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map((s) => s.trim()).filter(Boolean),
        objectives: form.objectives.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      const course = await api.post<{ id: string }>('/admin/courses', payload);
      router.push(`/admin/courses/${course.id}`);
    } catch (err: any) {
      setError(err.message || 'Tạo khóa học thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
        <h1 className="text-2xl font-bold">Tạo khóa học mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Thông tin cơ bản</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tên khóa học <span className="text-destructive">*</span></label>
              <Input
                placeholder="VD: Lập trình Python từ cơ bản đến nâng cao"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Mô tả</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
                placeholder="Mô tả ngắn về khóa học..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cấp độ</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.level}
                  onChange={(e) => set('level', e.target.value)}
                >
                  {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Trạng thái</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags (phân cách bằng dấu phẩy)</label>
              <Input
                placeholder="VD: python, lập trình, cơ bản"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Học phí</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.isFree}
                onChange={(e) => set('isFree', e.target.checked)}
              />
              <span className="text-sm font-medium">Khóa học miễn phí</span>
            </label>
            {!form.isFree && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Giá (VNĐ)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Yêu cầu & Mục tiêu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Yêu cầu đầu vào (mỗi dòng 1 yêu cầu)</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="VD: Biết cơ bản về máy tính&#10;Có kết nối Internet"
                value={form.requirements}
                onChange={(e) => set('requirements', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mục tiêu khóa học (mỗi dòng 1 mục tiêu)</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="VD: Nắm vững Python cơ bản&#10;Xây dựng được ứng dụng thực tế"
                value={form.objectives}
                onChange={(e) => set('objectives', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Tạo khóa học
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
        </div>
      </form>
    </div>
  );
}
