'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  Play, FileText, Video, Save, Loader2, BookOpen, Users,
  CheckCircle2, Circle, Eye, Globe, Archive, AlertCircle,
  GripVertical, X, Upload, Link as LinkIcon, FileUp, Sparkles,
  Languages, BookMarked, Unlink, HelpCircle,
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

// ─── Quiz Manager ────────────────────────────────────────────────────────────

interface QuizItem {
  id: string; question: string; options: string[]; answer: number;
  explanation?: string; order: number;
}

function QuizManager({ lessonId }: { lessonId: string }) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuizItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const emptyForm = (): Omit<QuizItem, 'id' | 'order'> => ({
    question: '', options: ['', '', '', ''], answer: 0, explanation: '',
  });
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    api.get<QuizItem[]>(`/lessons/${lessonId}/quizzes`)
      .then(setQuizzes).catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const startCreate = () => { setForm(emptyForm()); setEditing(null); setCreating(true); };
  const startEdit = (q: QuizItem) => {
    setForm({ question: q.question, options: [...q.options], answer: q.answer, explanation: q.explanation ?? '' });
    setEditing(q);
    setCreating(false);
  };
  const cancel = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.question.trim() || form.options.filter((o) => o.trim()).length < 2) return;
    const payload = {
      question: form.question.trim(),
      options: form.options.filter((o) => o.trim()),
      answer: form.answer,
      explanation: form.explanation?.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.patch<QuizItem>(`/lessons/quizzes/${editing.id}`, payload);
        setQuizzes((prev) => prev.map((q) => q.id === editing.id ? updated : q));
      } else {
        const created = await api.post<QuizItem>(`/lessons/${lessonId}/quizzes`, payload);
        setQuizzes((prev) => [...prev, created]);
      }
      cancel();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    setDeleting(id);
    try {
      await api.delete(`/lessons/quizzes/${id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch {}
    setDeleting(null);
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
          Câu hỏi kiểm tra ({quizzes.length})
        </span>
        {!creating && !editing && (
          <button onClick={startCreate}
            className="h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus className="h-3 w-3" />Thêm câu hỏi
          </button>
        )}
      </div>

      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {/* Quiz list */}
      {!loading && quizzes.length === 0 && !creating && (
        <p className="text-xs text-muted-foreground">Chưa có câu hỏi nào</p>
      )}
      {!loading && quizzes.map((q, qi) => (
        <div key={q.id} className={cn('rounded-xl border bg-white p-3 space-y-2', editing?.id === q.id ? 'ring-2 ring-indigo-300' : '')}>
          {editing?.id !== q.id ? (
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-indigo-600 shrink-0 mt-0.5">{qi + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug">{q.question}</p>
                <div className="mt-1.5 space-y-0.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={cn('text-[11px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg',
                      oi === q.answer ? 'bg-green-50 text-green-700 font-semibold' : 'text-muted-foreground',
                    )}>
                      <span className={cn('h-4 w-4 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0',
                        oi === q.answer ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300',
                      )}>{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-[11px] text-blue-600 mt-1">Giải thích: {q.explanation}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(q)} className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                  <Edit3 className="h-3 w-3 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(q.id)} disabled={deleting === q.id}
                  className="h-6 w-6 rounded-lg hover:bg-red-50 flex items-center justify-center">
                  {deleting === q.id ? <Loader2 className="h-3 w-3 animate-spin text-red-400" /> : <Trash2 className="h-3 w-3 text-red-400" />}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="rounded-xl border-2 border-indigo-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">{editing ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</p>

          {/* Question */}
          <div>
            <label className="text-[11px] font-medium text-gray-600 block mb-1">Câu hỏi *</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              placeholder="Nhập câu hỏi..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-[11px] font-medium text-gray-600 block mb-1">Các đáp án (tối thiểu 2, tối đa 6)</label>
            <div className="space-y-1.5">
              {form.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => setForm((p) => ({ ...p, answer: oi }))}
                    className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors',
                      form.answer === oi ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-300',
                    )}
                    title="Chọn đáp án đúng"
                  >
                    {String.fromCharCode(65 + oi)}
                  </button>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...form.options];
                      opts[oi] = e.target.value;
                      setForm((p) => ({ ...p, options: opts }));
                    }}
                    placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                    className="flex-1 h-7 rounded-lg border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                  {form.options.length > 2 && (
                    <button
                      onClick={() => {
                        const opts = form.options.filter((_, i) => i !== oi);
                        setForm((p) => ({ ...p, options: opts, answer: Math.min(p.answer, opts.length - 1) }));
                      }}
                      className="h-5 w-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {form.options.length < 6 && (
                <button onClick={() => setForm((p) => ({ ...p, options: [...p.options, ''] }))}
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" />Thêm đáp án
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Click vào vòng tròn màu xanh để chọn đáp án đúng</p>
          </div>

          {/* Explanation */}
          <div>
            <label className="text-[11px] font-medium text-gray-600 block mb-1">Giải thích (tuỳ chọn)</label>
            <input
              value={form.explanation ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              placeholder="Giải thích tại sao đáp án đúng..."
              className="w-full h-7 rounded-lg border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !form.question.trim()}
              className="h-7 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {editing ? 'Cập nhật' : 'Lưu câu hỏi'}
            </button>
            <button onClick={cancel} className="h-7 px-3 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson, courseId, courseSlug, sectionId, onUpdate, onDelete,
}: {
  lesson: Lesson; courseId: string; courseSlug: string; sectionId: string;
  onUpdate: (id: string, data: Partial<Lesson>) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = LESSON_TYPE_ICON[lesson.type] || Play;
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

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
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    // Upload thẳng vào API server để tránh Next.js proxy buffer toàn bộ file
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    xhr.open('POST', `${apiBase}/lessons/${lesson.id}/upload-video`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          onUpdate(lesson.id, { videoKey: res.key, isPublished: true });
        } catch {
          setUploadError('Upload thành công nhưng không đọc được phản hồi.');
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setUploadError(err.error || `Lỗi ${xhr.status}`);
        } catch {
          setUploadError(`Upload thất bại (${xhr.status})`);
        }
      }
    };
    xhr.onerror = () => { setUploading(false); setUploadError('Lỗi kết nối – không thể tải video lên.'); };
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
          {(lesson.videoKey || lesson.type === 'VIDEO') && (
            <a
              href={`/learn/${courseSlug}?lesson=${lesson.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 px-2 rounded-lg flex items-center gap-1 hover:bg-green-50 text-green-600 text-[10px] font-semibold"
              title="Xem video bài học"
            >
              <Play className="h-3 w-3" />Xem
            </a>
          )}
          <button
            onClick={() => setQuizOpen(!quizOpen)}
            className={cn('h-6 px-2 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-colors',
              quizOpen ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-indigo-50 text-indigo-600',
            )}
          >
            <HelpCircle className="h-3 w-3" />Quiz
          </button>
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

      {/* Quiz management panel */}
      {quizOpen && <QuizManager lessonId={lesson.id} />}

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
          {uploadError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <span className="font-medium">Lỗi:</span> {uploadError}
            </div>
          )}
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
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadError(''); handleUploadVideo(f); } }}
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
  section, courseId, courseSlug, onUpdate, onDelete, onLessonAdd, onLessonUpdate, onLessonDelete,
}: {
  section: Section; courseId: string; courseSlug: string;
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
              courseSlug={courseSlug}
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

// ─── Import File Modal ────────────────────────────────────────────────────────

interface ImportResult {
  sections: Array<{ id: string; title: string; lessons: any[] }>;
  totalLessons: number;
}

function ImportFileModal({ courseId, onDone, onClose }: {
  courseId: string;
  onDone: (result: ImportResult) => void;
  onClose: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const { accessToken } = useAuthStore();

  const ACCEPTED = ['.pdf', '.docx', '.txt', '.md'];

  const pick = (f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) { setError('Chỉ hỗ trợ PDF, DOCX, TXT, MD'); return; }
    setError('');
    setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/courses/${courseId}/import-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Import thất bại');
      }
      const result: ImportResult = await res.json();
      onDone(result);
    } catch (e: any) {
      setError(e.message || 'Import thất bại');
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Import từ file</h3>
              <p className="text-xs text-muted-foreground">AI tự động tạo chương và bài học</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer',
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
            file ? 'border-green-400 bg-green-50' : '',
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
          onClick={() => document.getElementById('file-import-input')?.click()}
        >
          <input
            id="file-import-input"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
          />
          {file ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-700 text-sm">{file.name}</p>
              <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
            </>
          ) : (
            <>
              <FileUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700 text-sm">Kéo thả hoặc click để chọn file</p>
              <p className="text-xs text-muted-foreground mt-1">Hỗ trợ: PDF, DOCX, TXT, MD (tối đa 20MB)</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700 space-y-1">
          <p className="font-semibold flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI sẽ tự động:</p>
          <p>• Đọc nội dung file</p>
          <p>• Chia thành chương và bài học phù hợp</p>
          <p>• Điền nội dung vào từng bài học</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {importing ? 'Đang xử lý...' : 'Bắt đầu import'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Course Language Section ──────────────────────────────────────────────────

interface LangVocabSet { id: string; title: string; language: string; courseId: string | null; _count: { items: number }; }
interface LangExercise { id: string; title: string; type: string; language: string; courseId: string | null; _count: { questions: number }; }

function CourseLangSection({ courseId }: { courseId: string }) {
  const [vocabSets, setVocabSets] = useState<LangVocabSet[]>([]);
  const [exercises, setExercises] = useState<LangExercise[]>([]);
  const [allVocab, setAllVocab] = useState<LangVocabSet[]>([]);
  const [allExercises, setAllExercises] = useState<LangExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [content, mine] = await Promise.all([
        api.get<{ vocabSets: LangVocabSet[]; exercises: LangExercise[] }>(`/language/course/${courseId}/content`),
        api.get<{ vocabSets: LangVocabSet[]; exercises: LangExercise[] }>('/language/mine'),
      ]);
      setVocabSets(content.vocabSets);
      setExercises(content.exercises);
      setAllVocab(mine.vocabSets);
      setAllExercises(mine.exercises);
    } catch {}
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const linkVocab = async (id: string) => {
    setLinking(id);
    try {
      await api.patch(`/language/vocab-sets/${id}`, { courseId });
      await load();
      setToast({ type: 'success', msg: 'Đã liên kết bộ từ vựng' });
    } catch (e: any) { setToast({ type: 'error', msg: e.message }); }
    setLinking(null);
  };

  const unlinkVocab = async (id: string) => {
    setLinking(id);
    try {
      await api.patch(`/language/vocab-sets/${id}`, { courseId: null });
      setVocabSets((prev) => prev.filter((v) => v.id !== id));
      setToast({ type: 'success', msg: 'Đã gỡ liên kết' });
    } catch (e: any) { setToast({ type: 'error', msg: e.message }); }
    setLinking(null);
  };

  const linkExercise = async (id: string) => {
    setLinking(id);
    try {
      await api.patch(`/language/exercises/${id}`, { courseId });
      await load();
      setToast({ type: 'success', msg: 'Đã liên kết bài tập' });
    } catch (e: any) { setToast({ type: 'error', msg: e.message }); }
    setLinking(null);
  };

  const unlinkExercise = async (id: string) => {
    setLinking(id);
    try {
      await api.patch(`/language/exercises/${id}`, { courseId: null });
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setToast({ type: 'success', msg: 'Đã gỡ liên kết' });
    } catch (e: any) { setToast({ type: 'error', msg: e.message }); }
    setLinking(null);
  };

  const TYPE_LABEL: Record<string, string> = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ', MATCHING: 'Nối từ', WORD_ORDER: 'Sắp xếp', DICTATION: 'Nghe viết' };

  const linkedVocabIds = new Set(vocabSets.map((v) => v.id));
  const linkedExerciseIds = new Set(exercises.map((e) => e.id));
  const unlinkedVocab = allVocab.filter((v) => !linkedVocabIds.has(v.id) && !v.courseId);
  const unlinkedExercises = allExercises.filter((e) => !linkedExerciseIds.has(e.id) && !e.courseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-violet-600" />
          <h2 className="font-bold text-gray-900">Nội dung ngoại ngữ</h2>
        </div>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 bg-white border border-violet-200 hover:border-violet-400 px-3 py-1.5 rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" />Thêm nội dung
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {vocabSets.length === 0 && exercises.length === 0 && !showPicker && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <BookMarked className="h-9 w-9 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Chưa có nội dung ngoại ngữ</p>
              <button onClick={() => setShowPicker(true)} className="mt-2 text-sm text-violet-600 hover:underline font-medium">
                + Liên kết bộ từ vựng hoặc bài tập
              </button>
            </div>
          )}

          {vocabSets.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-violet-50/50">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Bộ từ vựng ({vocabSets.length})</p>
              </div>
              <div className="divide-y divide-gray-50">
                {vocabSets.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <BookMarked className="h-4 w-4 text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.language} · {v._count.items} từ</p>
                    </div>
                    <button
                      onClick={() => unlinkVocab(v.id)}
                      disabled={linking === v.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shrink-0"
                    >
                      {linking === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                      Gỡ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exercises.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-violet-50/50">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Bài tập ({exercises.length})</p>
              </div>
              <div className="divide-y divide-gray-50">
                {exercises.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABEL[e.type] || e.type} · {e._count.questions} câu</p>
                    </div>
                    <button
                      onClick={() => unlinkExercise(e.id)}
                      disabled={linking === e.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 shrink-0"
                    >
                      {linking === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                      Gỡ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPicker && (
            <div className="bg-white rounded-2xl border border-violet-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-gray-900">Chọn nội dung để liên kết</p>
                <button onClick={() => setShowPicker(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {unlinkedVocab.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bộ từ vựng chưa liên kết</p>
                  <div className="space-y-1.5">
                    {unlinkedVocab.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <BookMarked className="h-4 w-4 text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          <p className="text-xs text-muted-foreground">{v.language} · {v._count.items} từ</p>
                        </div>
                        <button
                          onClick={() => linkVocab(v.id)}
                          disabled={linking === v.id}
                          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                        >
                          {linking === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unlinkedExercises.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bài tập chưa liên kết</p>
                  <div className="space-y-1.5">
                    {unlinkedExercises.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">{TYPE_LABEL[e.type] || e.type} · {e._count.questions} câu</p>
                        </div>
                        <button
                          onClick={() => linkExercise(e.id)}
                          disabled={linking === e.id}
                          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 shrink-0"
                        >
                          {linking === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unlinkedVocab.length === 0 && unlinkedExercises.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Tất cả nội dung đã được liên kết hoặc chưa có nội dung nào</p>
              )}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white',
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [showImport, setShowImport] = useState(false);

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

  const handleDeleteCourse = async () => {
    setDeletingCourse(true);
    try {
      await api.delete(`/courses/${id}`);
      router.replace('/courses');
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Xóa khóa học thất bại' });
      setShowDeleteConfirm(false);
    }
    setDeletingCourse(false);
  };

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
                <div className="text-white font-bold text-sm">{course._count?.enrollments ?? 0}</div>
                <div className="text-white/50 text-[10px]">Học viên</div>
              </div>
            </div>
            <a href={`/learn/${course.slug}`}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
              <Eye className="h-3.5 w-3.5" />Xem trước
            </a>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/40 text-indigo-100 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />Import AI
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-400/30 text-red-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />Xóa
            </button>
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
                courseSlug={course.slug}
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
              onUpdate={(data) => setCourse((prev) => prev ? { ...prev, ...data, _count: prev._count } : prev)}
            />
          </div>
          <CourseLangSection courseId={id} />
        </aside>
      </div>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}

      {/* Delete course confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Xóa khóa học?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>"{course.title}"</strong> sẽ bị xóa vĩnh viễn cùng toàn bộ nội dung.
                </p>
                {(course._count?.enrollments ?? 0) > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-semibold">
                    ⚠ Đang có {course._count?.enrollments ?? 0} học viên đăng ký!
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCourse}
                disabled={deletingCourse}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {deletingCourse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Xóa vĩnh viễn
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportFileModal
          courseId={id}
          onClose={() => setShowImport(false)}
          onDone={(result) => {
            setCourse((prev) => prev ? {
              ...prev,
              sections: [
                ...prev.sections,
                ...result.sections.map((s: any) => ({ ...s, order: s.order ?? 0, lessons: s.lessons || [] })),
              ],
            } : prev);
            setShowImport(false);
            setToast({ type: 'success', msg: `✨ Đã tạo ${result.sections.length} chương và ${result.totalLessons} bài học từ file!` });
          }}
        />
      )}
    </div>
  );
}
