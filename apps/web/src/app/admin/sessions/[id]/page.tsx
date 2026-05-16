'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface CourseOption { id: string; title: string }
interface ClassOption { id: string; name: string }

function toLocalDatetime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [courseId, setCourseId] = useState('');

  const [form, setForm] = useState({
    title: '', description: '',
    startTime: '', endTime: '',
    meetLink: '', courseId: '', classId: '', status: 'SCHEDULED',
  });

  useEffect(() => {
    Promise.all([
      api.get<any>(`/admin/live-sessions/${id}`),
      api.get<any>('/admin/courses?limit=100'),
      api.get<any>('/admin/classes?limit=100'),
    ]).then(([session, coursesData, classesData]) => {
      setForm({
        title: session.title || '',
        description: session.description || '',
        startTime: toLocalDatetime(session.startTime),
        endTime: toLocalDatetime(session.endTime),
        meetLink: session.meetLink || '',
        courseId: session.courseId || '',
        classId: session.classId || '',
        status: session.status || 'SCHEDULED',
      });
      setClassId(session.classId || '');
      setCourseId(session.courseId || '');
      setCourses(coursesData.courses || []);
      setClasses(classesData.classes || []);
    }).catch(() => router.replace('/admin/sessions')).finally(() => setLoading(false));
  }, [id, router]);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const goBack = () => {
    const backClassId = searchParams.get('classId') || classId;
    const backCourseId = searchParams.get('courseId') || courseId;
    if (backClassId) router.push(`/admin/classes/${backClassId}?tab=sessions`);
    else if (backCourseId) router.push(`/admin/courses/${backCourseId}?tab=sessions`);
    else router.push('/admin/sessions');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/live-sessions/${id}`, {
        ...form,
        courseId: form.courseId || null,
        classId: form.classId || null,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      });
      goBack();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Xóa buổi học này?')) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/live-sessions/${id}`);
      goBack();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    setDeleting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Chỉnh sửa buổi học</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
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
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
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
                Lưu thay đổi
              </Button>
              <Button type="button" variant="outline" onClick={goBack}>Hủy</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
