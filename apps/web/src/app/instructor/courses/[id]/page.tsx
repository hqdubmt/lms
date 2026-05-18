'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  Play, FileText, Video, Save, Loader2, BookOpen, Users,
  CheckCircle2, Circle, Eye, Globe, Archive, AlertCircle,
  GripVertical, X, Upload, Link as LinkIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lesson {
  id: string; title: string; type: 'VIDEO' | 'TEXT' | 'LIVE';
  order: number; isFree: boolean; isPublished: boolean;
  videoDuration?: number; videoKey?: string; slug: string;
}

interface Section {
  id: string; title: string; order: number; lessons: Lesson[];
}

interface Course {
  id: string; title: string; slug: string; description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  level: string; isFree: boolean; price: number;
  thumbnailUrl?: string;
  category?: { id: string; name: string };
  sections: Section[];
  _count: { enrollments: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LESSON_TYPE_ICON: Record<string, any> = { VIDEO: Play, TEXT: FileText, LIVE: Video };
const LESSON_TYPE_LABEL: Record<string, string> = { VIDEO: 'Video', TEXT: 'Bài đọc', LIVE: 'Trực tuyến' };

const STATUS_CONFIG = {
  PUBLISHED: { label: 'Đã xuất bản', icon: Globe, cls: 'bg-green-100 text-green-700' },
  DRAFT:     { label: 'Bản nháp',    icon: AlertCircle, cls: 'bg-yellow-100 text-yellow-700' },
  ARCHIVED:  { label: 'Lưu trữ',    icon: Archive, cls: 'bg-gray-100 text-gray-600' },
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao',
};

function Toast({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium',
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white',
    )}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
    </div>
  );
}

// ─── Inline editable text ─────────────────────────────────────────────────────

function InlineEdit({ value, onSave, className }: { value: string; onSave: (v: string) => Promise<void>; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (val.trim() === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(val.trim());
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={cn('cursor-pointer hover:text-indigo-600 transition-colors group', className)}
      >
        {value}
        <Edit3 className="h-3 w-3 inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
      className="border-b border-indigo-400 outline-none bg-transparent text-sm font-medium w-full max-w-sm"
      disabled={saving}
    />
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseId, sectionId, onUpdate, onDelete,
}: {
  lesson: Lesson; courseId: string; sectionId: string;
  onUpdate: (id: string, data: Partial<Lesson>) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = LESSON_TYPE_ICON[lesson.type] || Play;
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Xóa bài "${lesson.title}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/lessons/${lesson.id}`);
      onDelete(lesson.id);
    } catch {}
    setDeleting(false);
  };

  const toggleFree = async () => {
    const updated = await api.patch<Lesson>(`/courses/lessons/${lesson.id}`, { isFree: !lesson.isFree }).catch(() => null);
    if (updated) onUpdate(lesson.id, { isFree: updated.isFree });
  };

  const togglePublished = async () => {
    const updated = await api.patch<Lesson>(`/courses/lessons/${lesson.id}`, { isPublished: !lesson.isPublished }).catch(() => null);
    if (updated) onUpdate(lesson.id, { isPublished: updated.isPublished });
  };

  const { accessToken } = useAuthStore();

  const handleUploadVideo = (file: File) => {
    setUploading(true);
    setUploadPct(0);
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/lessons/${lesson.id}/upload-video`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        onUpdate(lesson.id, { videoKey: res.key });
      }
    };
    xhr.onerror = () => setUploading(false);
    xhr.send(formData);
  };

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 group transition-colors">
        <GripVertical className="h-4 w-4 text-gray-300 shrink-0 cursor-grab" />
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
          lesson.type === 'VIDEO' ? 'bg-indigo-50' : lesson.type === 'TEXT' ? 'bg-green-50' : 'bg-red-50',
        )}>
          <Icon className={cn('h-3.5 w-3.5',
            lesson.type === 'VIDEO' ? 'text-indigo-600' : lesson.type === 'TEXT' ? 'text-green-600' : 'text-red-500',
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <InlineEdit
            value={lesson.title}
            onSave={async (title) => {
              const updated = await api.patch<Lesson>(`/courses/lessons/${lesson.id}`, { title }).catch(() => null);
              if (updated) onUpdate(lesson.id, { title: updated.title });
            }}
            className="text-sm font-medium text-gray-800"
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {LESSON_TYPE_LABEL[lesson.type]}
            {lesson.type === 'VIDEO' && lesson.videoKey && (
              <span className="ml-2 text-green-600 font-medium">· Đã có video</span>
            )}
            {lesson.type === 'VIDEO' && !lesson.videoKey && (
              <span className="ml-2 text-orange-500 font-medium">· Chưa có video</span>
            )}
          </p>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {lesson.type === 'VIDEO' && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-2 rounded-lg flex items-center gap-1 hover:bg-indigo-50 text-indigo-600 text-[10px] font-semibold"
            >
              <Upload className="h-3 w-3" />Upload
            </button>
          )}
          <button
            onClick={toggleFree}
            className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors',
              lesson.isFree ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-green-200',
            )}
          >
            {lesson.isFree ? 'Miễn phí' : 'Trả phí'}
          </button>
          <button
            onClick={togglePublished}
            title={lesson.isPublished ? 'Ẩn bài' : 'Xuất bản'}
            className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-gray-100"
          >
            {lesson.isPublished
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              : <Circle className="h-3.5 w-3.5 text-gray-400" />
            }
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Video upload panel */}
      {expanded && lesson.type === 'VIDEO' && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          {lesson.videoKey ? (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-mono">{lesson.videoKey.split('/').pop()}</span>
              <button
                className="ml-auto text-red-500 hover:text-red-700 shrink-0 font-medium"
                onClick={async () => {
                  await api.patch(`/courses/lessons/${lesson.id}`, { videoKey: null }).catch(() => {});
                  onUpdate(lesson.id, { videoKey: undefined });
                }}
              >
                Xóa
              </button>
            </div>
          ) : null}
          {uploading ? (
            <div className="space-y-1">
              <div className="text-xs text-indigo-600 font-medium">Đang tải lên... {uploadPct}%</div>
              <div className="h-1.5 rounded-full bg-gray-200">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              <Upload className="h-3.5 w-3.5" />
              {lesson.videoKey ? 'Thay thế video mới' : 'Chọn file video (mp4, webm, mov)'}
              <input
                type="file" accept="video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadVideo(f); }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({
  section, courseId, onUpdate, onDelete, onLessonAdd, onLessonUpdate, onLessonDelete,
}: {
  section: Section; courseId: string;
  onUpdate: (id: string, data: Partial<Section>) => void;
  onDelete: (id: string) => void;
  onLessonAdd: (sectionId: string, lesson: Lesson) => void;
  onLessonUpdate: (sectionId: string, lessonId: string, data: Partial<Lesson>) => void;
  onLessonDelete: (sectionId: string, lessonId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'VIDEO' | 'TEXT' | 'LIVE'>('VIDEO');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleAddLesson = async () => {
    if (!lessonTitle.trim()) return;
    setSaving(true);
    try {
      const lesson = await api.post<Lesson>(`/courses/sections/${section.id}/lessons`, {
        title: lessonTitle.trim(),
        type: lessonType,
        order: section.lessons.length,
      });
      onLessonAdd(section.id, lesson);
      setLessonTitle('');
      setAddingLesson(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Xóa chương "${section.title}"? Tất cả bài học sẽ bị xóa.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/sections/${section.id}`);
      onDelete(section.id);
    } catch {}
    setDeleting(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {expanded
            ? <ChevronDown className="h-4 w-4 text-gray-500" />
            : <ChevronRight className="h-4 w-4 text-gray-500" />
          }
        </button>
        <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0 font-semibold text-sm">
          <InlineEdit
            value={section.title}
            onSave={async (title) => {
              const updated = await api.patch<Section>(`/courses/sections/${section.id}`, { title }).catch(() => null);
              if (updated) onUpdate(section.id, { title: updated.title });
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{section.lessons.length} bài</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600 ml-1 transition-colors"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="p-3 space-y-0.5">
          {section.lessons.length === 0 && !addingLesson && (
            <p className="text-xs text-muted-foreground text-center py-4">Chưa có bài học nào</p>
          )}
          {section.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              sectionId={section.id}
              onUpdate={(lid, data) => onLessonUpdate(section.id, lid, data)}
              onDelete={(lid) => onLessonDelete(section.id, lid)}
            />
          ))}

          {/* Add lesson form */}
          {addingLesson ? (
            <div className="flex items-center gap-2 pt-2 px-3">
              <Input
                autoFocus
                placeholder="Tên bài học..."
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); if (e.key === 'Escape') setAddingLesson(false); }}
                className="text-sm h-8"
              />
              <select
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value as any)}
                className="border rounded-lg px-2 py-1.5 text-xs h-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="VIDEO">Video</option>
                <option value="TEXT">Bài đọc</option>
                <option value="LIVE">Trực tuyến</option>
              </select>
              <button onClick={handleAddLesson} disabled={saving}
                className="h-8 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Thêm
              </button>
              <button onClick={() => setAddingLesson(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingLesson(true)}
              className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors w-full"
            >
              <Plus className="h-3.5 w-3.5" />Thêm bài học
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Course Info Panel ────────────────────────────────────────────────────────

function CourseInfoPanel({ course, onUpdate }: { course: Course; onUpdate: (data: Partial<Course>) => void }) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description || '',
    level: course.level,
    status: course.status,
    price: course.price,
    isFree: course.isFree,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Course>(`/courses/${course.id}`, form);
      onUpdate(updated);
      setToast({ type: 'success', msg: 'Đã lưu thông tin khoá học' });
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Lưu thất bại' });
    }
    setSaving(false);
  };

  const st = STATUS_CONFIG[form.status];
  const StatusIcon = st.icon;

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', st.cls)}>
        <StatusIcon className="h-3.5 w-3.5" />{st.label}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tên khoá học</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="Mô tả khoá học..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Trình độ</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Trạng thái</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Xuất bản</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked, price: e.target.checked ? 0 : form.price })}
              className="rounded border-gray-300 text-indigo-600" />
            <span className="text-sm font-medium">Miễn phí</span>
          </label>
        </div>
        {!form.isFree && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Giá (₫)</label>
            <Input type="number" min={0} value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="text-sm" />
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Đang lưu...' : 'Lưu thông tin'}
      </button>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [savingSection, setSavingSection] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    api.get<Course>(`/courses/${id}/manage`)
      .then(setCourse)
      .catch(() => router.replace('/courses'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleAddSection = async () => {
    if (!sectionTitle.trim()) return;
    setSavingSection(true);
    try {
      const section = await api.post<Section>(`/courses/${id}/sections`, {
        title: sectionTitle.trim(),
        order: course?.sections.length ?? 0,
      });
      setCourse((prev) => prev ? { ...prev, sections: [...prev.sections, { ...section, lessons: [] }] } : prev);
      setSectionTitle('');
      setAddingSection(false);
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Thêm chương thất bại' });
    }
    setSavingSection(false);
  };

  const updateSection = useCallback((sectionId: string, data: Partial<Section>) => {
    setCourse((prev) => prev ? {
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, ...data } : s),
    } : prev);
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setCourse((prev) => prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) } : prev);
  }, []);

  const addLesson = useCallback((sectionId: string, lesson: Lesson) => {
    setCourse((prev) => prev ? {
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, lessons: [...s.lessons, lesson] } : s,
      ),
    } : prev);
  }, []);

  const updateLesson = useCallback((sectionId: string, lessonId: string, data: Partial<Lesson>) => {
    setCourse((prev) => prev ? {
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.map((l) => l.id === lessonId ? { ...l, ...data } : l) }
          : s,
      ),
    } : prev);
  }, []);

  const deleteLesson = useCallback((sectionId: string, lessonId: string) => {
    setCourse((prev) => prev ? {
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) } : s,
      ),
    } : prev);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!course) return null;

  const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}
        className="px-6 py-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/courses" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-white" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-xs mb-0.5">Quản lý khoá học</p>
            <h1 className="text-white font-bold text-lg truncate">{course.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2">
              <div className="text-center">
                <div className="text-white font-bold text-sm">{course.sections.length}</div>
                <div className="text-white/50 text-[10px]">Chương</div>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="text-center">
                <div className="text-white font-bold text-sm">{totalLessons}</div>
                <div className="text-white/50 text-[10px]">Bài học</div>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="text-center">
                <div className="text-white font-bold text-sm">{course._count.enrollments}</div>
                <div className="text-white/50 text-[10px]">Học viên</div>
              </div>
            </div>
            <Link href={`/learn/${course.slug}`}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
              <Eye className="h-3.5 w-3.5" />Xem trước
            </Link>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-6">
        {/* ── Sections (left main) ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Nội dung khoá học</h2>
            <button
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-xl transition-all"
            >
              <Plus className="h-4 w-4" />Thêm chương
            </button>
          </div>

          {/* Add section form */}
          {addingSection && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-4 flex items-center gap-3">
              <Input
                autoFocus
                placeholder="Tên chương mới..."
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setAddingSection(false); }}
                className="text-sm"
              />
              <button onClick={handleAddSection} disabled={savingSection}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 shrink-0">
                {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Thêm
              </button>
              <button onClick={() => setAddingSection(false)}
                className="h-9 w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center shrink-0">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          )}

          {course.sections.length === 0 && !addingSection ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Chưa có chương nào</p>
              <button
                onClick={() => setAddingSection(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline font-medium"
              >
                + Thêm chương đầu tiên
              </button>
            </div>
          ) : (
            course.sections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                courseId={id}
                onUpdate={updateSection}
                onDelete={deleteSection}
                onLessonAdd={addLesson}
                onLessonUpdate={updateLesson}
                onLessonDelete={deleteLesson}
              />
            ))
          )}
        </div>

        {/* ── Right panel ── */}
        <aside className="w-72 shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-sm mb-4">Thông tin khoá học</h3>
            <CourseInfoPanel
              course={course}
              onUpdate={(data) => setCourse((prev) => prev ? { ...prev, ...data } : prev)}
            />
          </div>
        </aside>
      </div>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}
