'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface CourseOption { id: string; title: string }
interface ClassOption { id: string; name: string }

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const preClassId = searchParams.get('classId') || '';
  const preCourseId = searchParams.get('courseId') || '';

  const [form, setForm] = useState({
    title: '', description: '',
    startTime: '', endTime: '',
    meetLink: '', courseId: preCourseId, classId: preClassId, status: 'SCHEDULED',
  });

  useEffect(() => {
    api.get<any>('/admin/courses?limit=100').then((d) => setCourses(d.courses || [])).catch(() => {});
    api.get<any>('/admin/classes?limit=100').then((d) => setClasses(d.classes || [])).catch(() => {});
  }, []);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime || !form.meetLink) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/live-sessions', {
        ...form,
        courseId: form.courseId || undefined,
        classId: form.classId || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      // Quay lại trang gốc (class hoặc course nếu có)
      if (preClassId) router.push(`/admin/classes/${preClassId}?tab=sessions`);
      else if (preCourseId) router.push(`/admin/courses/${preCourseId}?tab=sessions`);
      else router.push('/admin/sessions');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Tạo buổi học</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Thông tin buổi học</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tiêu đề <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Buổi học trực tuyến..." />
            </div>

            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Nội dung buổi học..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Thời gian bắt đầu <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Thời gian kết thúc <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Link Google Meet <span className="text-destructive">*</span></Label>
              <Input value={form.meetLink} onChange={(e) => set('meetLink', e.target.value)} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Khóa học (tuỳ chọn)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.courseId}
                  onChange={(e) => set('courseId', e.target.value)}
                >
                  <option value="">— Không chọn —</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Lớp học (tuỳ chọn)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.classId}
                  onChange={(e) => set('classId', e.target.value)}
                >
                  <option value="">— Không chọn —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="SCHEDULED">Sắp diễn ra</option>
                <option value="LIVE">Đang diễn ra</option>
                <option value="ENDED">Đã kết thúc</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Tạo buổi học
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
