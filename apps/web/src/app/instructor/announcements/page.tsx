'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Pin, X, Loader2, Megaphone, Globe, BookOpen, Users, CalendarDays, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type Topic = 'SYSTEM' | 'COURSE' | 'CLASS' | 'EVENT' | 'GENERAL';

interface Announcement {
  id: string;
  title: string;
  content: string;
  topic: Topic;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string };
  course?: { id: string; title: string } | null;
  class?:  { id: string; name: string }  | null;
  _count: { reads: number };
}

interface CourseItem { id: string; title: string; }
interface ClassItem  { id: string; name:  string; }

const TOPIC_OPTIONS: { value: Topic; label: string; icon: React.ReactNode }[] = [
  { value: 'GENERAL', label: 'Chung',      icon: <Globe  className="h-3.5 w-3.5" /> },
  { value: 'SYSTEM',  label: 'Hệ thống',   icon: <Megaphone className="h-3.5 w-3.5" /> },
  { value: 'COURSE',  label: 'Khóa học',   icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: 'CLASS',   label: 'Lớp học',    icon: <Users  className="h-3.5 w-3.5" /> },
  { value: 'EVENT',   label: 'Sự kiện',    icon: <CalendarDays className="h-3.5 w-3.5" /> },
];

const TOPIC_COLORS: Record<Topic, string> = {
  SYSTEM:  'bg-red-50 text-red-700 border-red-200',
  COURSE:  'bg-blue-50 text-blue-700 border-blue-200',
  CLASS:   'bg-purple-50 text-purple-700 border-purple-200',
  EVENT:   'bg-amber-50 text-amber-700 border-amber-200',
  GENERAL: 'bg-gray-50 text-gray-700 border-gray-200',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function InstructorAnnouncementsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<Topic>('GENERAL');
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Announcement[]>('/announcements').then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<CourseItem[]>('/courses/mine').then((d) => { if (Array.isArray(d)) setCourses(d); }).catch(() => {});
    api.get<{ classes: ClassItem[] }>('/admin/classes').then((d) => { if (d?.classes) setClasses(d.classes); }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setContent(''); setTopic('GENERAL'); setCourseId(''); setClassId(''); setIsPinned(false);
    setErr(''); setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title); setContent(a.content); setTopic(a.topic);
    setCourseId(a.course?.id || ''); setClassId(a.class?.id || ''); setIsPinned(a.isPinned);
    setErr(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { setErr('Nhập đầy đủ tiêu đề và nội dung'); return; }
    setSaving(true);
    try {
      const body = { title, content, topic, isPinned, courseId: courseId || undefined, classId: classId || undefined };
      if (editing) {
        const updated = await api.patch<Announcement>(`/announcements/${editing.id}`, body);
        setItems((prev) => prev.map((a) => a.id === editing.id ? { ...a, ...updated } : a));
      } else {
        const created = await api.post<Announcement>('/announcements', body);
        setItems((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e: any) { setErr(e?.message || 'Lỗi khi lưu'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa thông báo này?')) return;
    await api.delete(`/announcements/${id}`);
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  // Only show own announcements (filter client-side)
  const mine = user?.role === 'ADMIN' ? items : items.filter((a) => a.author.id === user?.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý thông báo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tạo và quản lý thông báo gửi tới học viên</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />Tạo thông báo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : mine.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((a) => (
            <div key={a.id} className={cn('bg-white rounded-xl border p-4', a.isPinned ? 'border-amber-200' : 'border-gray-200')}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {a.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5', TOPIC_COLORS[a.topic])}>
                      {TOPIC_OPTIONS.find((t) => t.value === a.topic)?.icon}
                      {TOPIC_OPTIONS.find((t) => t.value === a.topic)?.label}
                    </span>
                    {a.course && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{a.course.title}</span>}
                    {a.class  && <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">{a.class.name}</span>}
                  </div>
                  <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{fmtDate(a.createdAt)} · {a._count.reads} lượt đọc</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(a)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editing ? 'Sửa thông báo' : 'Tạo thông báo mới'}</h3>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {err && <p className="text-xs text-red-500">{err}</p>}

            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề thông báo..."
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />

            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung thông báo..." rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />

            {/* Topic */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Chủ đề</label>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {TOPIC_OPTIONS.map((t) => {
                  const disabled = t.value === 'SYSTEM' && user?.role !== 'ADMIN';
                  return (
                    <button key={t.value} type="button" onClick={() => !disabled && setTopic(t.value)}
                      disabled={disabled}
                      className={cn(
                        'flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs transition-colors',
                        topic === t.value ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        disabled && 'opacity-40 cursor-not-allowed',
                      )}>
                      {t.icon}{t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {topic === 'COURSE' && (
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full h-9 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">-- Chọn khóa học --</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
            {topic === 'CLASS' && (
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                className="w-full h-9 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">-- Chọn lớp --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300" />
              <span className="text-sm text-gray-700 flex items-center gap-1"><Pin className="h-3.5 w-3.5 text-amber-500" />Ghim thông báo</span>
            </label>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Cập nhật' : 'Đăng thông báo'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
