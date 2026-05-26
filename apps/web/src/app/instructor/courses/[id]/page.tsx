'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Plus, Trash2,
  ChevronDown, ChevronRight, Save,
  Pencil, Video, X, Upload, Check, Eye, EyeOff,
  ExternalLink, BookMarked, Users, Film, FileText, Image as ImageIcon,
  HelpCircle, AlignLeft, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { InlineFileViewer } from '@/components/media/InlineFileViewer';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string; title: string; slug: string; description?: string;
  status: string; level: string; price: number; isFree: boolean;
  sections: Section[];
  _count: { enrollments: number };
}
interface Section { id: string; title: string; order: number; lessons: Lesson[] }
interface Lesson {
  id: string; title: string; type: string; order: number;
  isFree: boolean; isPublished: boolean; videoKey?: string; videoUrl?: string; videoDuration?: number;
  textContent?: string;
}

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Lưu trữ' };

type Tab = 'info' | 'content' | 'modules';

// ─── Modules Tab ──────────────────────────────────────────────────────────────

type ContentType = 'VOCAB_SET' | 'LANG_EXERCISE' | 'MATH_TOPIC' | 'MATH_EXERCISE' | 'VIET_SET' | 'VIET_EXERCISE' | 'MEDIA_FILE';
interface ModuleLink {
  id: string; contentType: ContentType; contentId: string; addedAt: string;
  title: string; subtitle?: string; mimeType?: string; mediaType?: string;
}
interface PickerItem { id: string; title: string; subtitle?: string; contentType: ContentType; mimeType?: string; mediaType?: string; }
interface MediaPickerItem { id: string; name: string; fileSize: number; mimeType: string; type: 'VIDEO' | 'IMAGE' | 'DOCUMENT'; }

const MODULE_TYPE_GROUP: Record<ContentType, 'lang' | 'math' | 'viet' | 'media'> = {
  VOCAB_SET: 'lang', LANG_EXERCISE: 'lang',
  MATH_TOPIC: 'math', MATH_EXERCISE: 'math',
  VIET_SET: 'viet', VIET_EXERCISE: 'viet',
  MEDIA_FILE: 'media',
};
const MODULE_TYPE_LABEL: Record<ContentType, string> = {
  VOCAB_SET: 'Bộ từ vựng', LANG_EXERCISE: 'Bài tập ngoại ngữ',
  MATH_TOPIC: 'Chủ đề toán', MATH_EXERCISE: 'Bài tập toán',
  VIET_SET: 'Bộ tiếng Việt', VIET_EXERCISE: 'Bài tập tiếng Việt',
  MEDIA_FILE: 'Tài liệu',
};
const GROUP_COLORS = {
  lang:  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
  math:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700'   },
  viet:  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  media: { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700'   },
};
const GROUP_TITLES = { lang: 'Ngoại ngữ', math: 'Toán học', viet: 'Tiếng Việt', media: 'Thư viện' };

function getModuleViewUrl(contentType: ContentType, contentId: string): string {
  switch (contentType) {
    case 'VOCAB_SET':     return `/instructor/language/vocab/${contentId}`;
    case 'LANG_EXERCISE': return `/instructor/language/exercise/${contentId}`;
    case 'MATH_TOPIC':   return `/instructor/math/topic/${contentId}`;
    case 'VIET_SET':     return `/instructor/viet/set/${contentId}`;
    case 'MEDIA_FILE':   return '';
    default:             return '';
  }
}
function getModuleParentUrl(contentType: ContentType): string {
  switch (contentType) {
    case 'VOCAB_SET': case 'LANG_EXERCISE': return '/instructor/language';
    case 'MATH_TOPIC': case 'MATH_EXERCISE': return '/instructor/math';
    case 'MEDIA_FILE': return '';
    default: return '/instructor/viet';
  }
}

function mediaTypeIcon(mediaType?: string) {
  if (mediaType === 'VIDEO') return Film;
  if (mediaType === 'IMAGE') return ImageIcon;
  return FileText;
}

// ─── Quiz Management Section (inside lesson editor) ──────────────────────────

interface QuizQuestion {
  id: string; question: string; options: string[]; answer: number; explanation?: string | null; order: number;
}

interface QuizFormState {
  question: string; options: string[]; answer: number; explanation: string;
}

const emptyQuizForm = (): QuizFormState => ({ question: '', options: ['', ''], answer: 0, explanation: '' });

function QuizManagementSection({ lessonId }: { lessonId: string }) {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuizFormState>(emptyQuizForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.get<QuizQuestion[]>(`/lessons/${lessonId}/quizzes`)
      .then(setQuizzes).catch(() => {}).finally(() => setLoading(false));
  }, [lessonId]);

  const openAdd = () => { setEditingId(null); setForm(emptyQuizForm()); setShowForm(true); };
  const openEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setForm({ question: q.question, options: [...q.options], answer: q.answer, explanation: q.explanation ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || form.options.filter((o) => o.trim()).length < 2) return;
    setSaving(true);
    const body = {
      question: form.question.trim(),
      options: form.options.filter((o) => o.trim()),
      answer: form.answer,
      explanation: form.explanation.trim() || undefined,
    };
    try {
      if (editingId) {
        const updated = await api.patch<QuizQuestion>(`/lessons/quizzes/${editingId}`, body);
        setQuizzes((prev) => prev.map((q) => q.id === editingId ? updated : q));
      } else {
        const created = await api.post<QuizQuestion>(`/lessons/${lessonId}/quizzes`, body);
        setQuizzes((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/lessons/quizzes/${id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch {}
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const setOption = (i: number, val: string) =>
    setForm((f) => { const opts = [...f.options]; opts[i] = val; return { ...f, options: opts }; });
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ''] }));
  const removeOption = (i: number) =>
    setForm((f) => {
      const opts = f.options.filter((_, idx) => idx !== i);
      return { ...f, options: opts, answer: f.answer >= opts.length ? Math.max(0, opts.length - 1) : f.answer };
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />Câu hỏi Quiz ({quizzes.length})
        </span>
        <button type="button" onClick={openAdd}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
          <Plus className="h-3 w-3" />Thêm câu hỏi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : quizzes.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground text-center py-2">Chưa có câu hỏi nào.</p>
      ) : (
        <div className="space-y-1.5">
          {quizzes.map((q, qi) => (
            <div key={q.id} className="border rounded-lg p-2.5 text-xs bg-muted/20">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0 mt-0.5">{qi + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{q.question}</p>
                  <div className="mt-1 space-y-0.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${oi === q.answer ? 'bg-green-100 text-green-700 font-medium' : 'text-muted-foreground'}`}>
                        <span className="shrink-0 w-4 text-center">{String.fromCharCode(65 + oi)}.</span>
                        <span>{opt}</span>
                        {oi === q.answer && <Check className="h-3 w-3 ml-auto shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => openEdit(q)}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                  {confirmDeleteId === q.id ? (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}
                        className="text-destructive hover:underline font-medium">
                        {deletingId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Xóa'}
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:underline">Hủy</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(q.id)}
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-3 space-y-2.5 bg-background">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</span>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Câu hỏi</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Nhập câu hỏi..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium">Đáp án (chọn đáp án đúng)</label>
              {form.options.length < 6 && (
                <button type="button" onClick={addOption}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  <Plus className="h-3 w-3" />Thêm đáp án
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name={`answer-${lessonId}`} checked={form.answer === i}
                    onChange={() => setForm((f) => ({ ...f, answer: i }))}
                    className="shrink-0 accent-green-600" />
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{String.fromCharCode(65 + i)}.</span>
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                    className="flex-1 h-7 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {form.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Giải thích (tùy chọn)</label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Giải thích đáp án đúng..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving || !form.question.trim()}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              {editingId ? 'Cập nhật' : 'Thêm'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>Hủy</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lesson Modules Section (inside lesson editor) ────────────────────────────

function LessonModulesSection({ lessonId }: { lessonId: string }) {
  const [modules, setModules] = useState<ModuleLink[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'lang' | 'math' | 'viet' | 'media'>('lang');
  const [pickerItems, setPickerItems] = useState<{ lang: PickerItem[]; math: PickerItem[]; viet: PickerItem[]; media: PickerItem[] }>({ lang: [], math: [], viet: [], media: [] });
  const [pickerLoading, setPickerLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    api.get<ModuleLink[]>(`/lessons/${lessonId}/modules`).then(setModules).catch(() => {});
  }, [lessonId]);

  const loadPicker = useCallback(async () => {
    setPickerLoading(true);
    try {
      const [langData, mathData, vietData, mediaData] = await Promise.all([
        api.get<{ vocabSets: any[]; exercises: any[] }>('/language/mine'),
        api.get<{ topics: any[]; exercises: any[] }>('/math/mine'),
        api.get<{ sets: any[]; exercises: any[] }>('/viet/mine'),
        api.get<MediaPickerItem[]>('/media').catch(() => [] as MediaPickerItem[]),
      ]);
      const fmtBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
      setPickerItems({
        lang: [
          ...langData.vocabSets.map((v: any) => ({ id: v.id, title: v.title, subtitle: `${v.language} · ${v._count?.items ?? 0} từ`, contentType: 'VOCAB_SET' as ContentType })),
          ...langData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'LANG_EXERCISE' as ContentType })),
        ],
        math: [
          ...mathData.topics.map((t: any) => ({ id: t.id, title: t.title, subtitle: `${t.subject} · Lớp ${t.grade}`, contentType: 'MATH_TOPIC' as ContentType })),
          ...mathData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'MATH_EXERCISE' as ContentType })),
        ],
        viet: [
          ...vietData.sets.map((s: any) => ({ id: s.id, title: s.title, subtitle: `${s.category} · ${s._count?.items ?? 0} mục`, contentType: 'VIET_SET' as ContentType })),
          ...vietData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'VIET_EXERCISE' as ContentType })),
        ],
        media: (Array.isArray(mediaData) ? mediaData : []).map((m) => ({
          id: m.id, title: m.name, subtitle: fmtBytes(m.fileSize),
          contentType: 'MEDIA_FILE' as ContentType, mimeType: m.mimeType, mediaType: m.type,
        })),
      });
    } catch {}
    setPickerLoading(false);
  }, []);

  useEffect(() => { if (showPicker) loadPicker(); }, [showPicker, loadPicker]);

  const handleAdd = async (item: PickerItem) => {
    setAdding(item.id);
    try {
      const link = await api.post<ModuleLink>(`/lessons/${lessonId}/modules`, { contentType: item.contentType, contentId: item.id });
      setModules((prev) => [...prev, { ...link, mimeType: item.mimeType, mediaType: item.mediaType }]);
    } catch {}
    setAdding(null);
  };

  const handleRemove = async (moduleId: string) => {
    setRemoving(moduleId);
    try {
      await api.delete(`/lessons/${lessonId}/modules/${moduleId}`);
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
    } catch {}
    setRemoving(null);
  };

  const linkedIds = new Set(modules.map((m) => m.contentId));
  const filteredPicker = pickerItems[pickerTab].filter((item) =>
    !linkedIds.has(item.id) && (!search.trim() || item.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Nội dung học kèm ({modules.length})</span>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <Plus className="h-3 w-3" />Thêm
        </button>
      </div>

      {modules.length > 0 && (
        <div className="space-y-1">
          {modules.map((m) => {
            const colors = GROUP_COLORS[MODULE_TYPE_GROUP[m.contentType]];
            const MIcon = mediaTypeIcon(m.mediaType);
            return (
              <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 text-xs group">
                {m.contentType === 'MEDIA_FILE' ? (
                  <div className={`shrink-0 h-4 w-4 rounded flex items-center justify-center ${colors.badge}`}>
                    <MIcon className="h-2.5 w-2.5" />
                  </div>
                ) : (
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight ${colors.badge}`}>
                    {MODULE_TYPE_LABEL[m.contentType].split(' ').slice(-1)[0]}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">{m.title}</span>
                {m.subtitle && <span className="text-muted-foreground shrink-0 hidden sm:inline">{m.subtitle}</span>}
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  disabled={removing === m.id}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-destructive/60 hover:text-destructive transition-opacity"
                >
                  {removing === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg flex flex-col border" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h3 className="font-bold text-sm">Thêm nội dung học kèm</h3>
              <button onClick={() => setShowPicker(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex border-b px-4 shrink-0">
              {(['lang', 'math', 'viet', 'media'] as const).map((g) => (
                <button key={g} type="button" onClick={() => { setPickerTab(g); setSearch(''); }}
                  className={cn('px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                    pickerTab === g ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  {GROUP_TITLES[g]}
                </button>
              ))}
            </div>
            <div className="px-4 pt-3 shrink-0">
              <input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-0">
              {pickerLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredPicker.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {search ? 'Không tìm thấy kết quả' : 'Không có nội dung để thêm'}
                </p>
              ) : filteredPicker.map((item) => {
                const colors = GROUP_COLORS[pickerTab];
                const MediaIcon = mediaTypeIcon(item.mediaType);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    {pickerTab === 'media' ? (
                      <div className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${colors.badge}`}>
                        <MediaIcon className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {MODULE_TYPE_LABEL[item.contentType]}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs shrink-0"
                      disabled={adding === item.id} onClick={() => handleAdd(item)}>
                      {adding === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                      Thêm
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstructorModulesTab({ courseId }: { courseId: string }) {
  const { accessToken } = useAuthStore();
  const [modules, setModules] = useState<ModuleLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<'all' | 'lang' | 'math' | 'viet' | 'media'>('all');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'lang' | 'math' | 'viet' | 'media'>('lang');
  const [pickerItems, setPickerItems] = useState<{ lang: PickerItem[]; math: PickerItem[]; viet: PickerItem[]; media: PickerItem[] }>({ lang: [], math: [], viet: [], media: [] });
  const [pickerLoading, setPickerLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;

  const loadModules = useCallback(async () => {
    try {
      const data = await api.get<ModuleLink[]>(`/courses/${courseId}/modules`);
      setModules(data);
      if (data.length > 0) setSelectedId((prev) => prev ?? data[0].id);
    } catch {}
    setLoading(false);
  }, [courseId]);

  const loadPickerContent = useCallback(async () => {
    setPickerLoading(true);
    try {
      const [langData, mathData, vietData, mediaData] = await Promise.all([
        api.get<{ vocabSets: any[]; exercises: any[] }>('/language/mine'),
        api.get<{ topics: any[]; exercises: any[] }>('/math/mine'),
        api.get<{ sets: any[]; exercises: any[] }>('/viet/mine'),
        api.get<MediaPickerItem[]>('/media').catch(() => [] as MediaPickerItem[]),
      ]);
      const fmtBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
      const langItems: PickerItem[] = [
        ...langData.vocabSets.map((v: any) => ({ id: v.id, title: v.title, subtitle: `${v.language} · ${v._count?.items ?? 0} từ`, contentType: 'VOCAB_SET' as ContentType })),
        ...langData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'LANG_EXERCISE' as ContentType })),
      ];
      const mathItems: PickerItem[] = [
        ...mathData.topics.map((t: any) => ({ id: t.id, title: t.title, subtitle: `${t.subject} · Lớp ${t.grade}`, contentType: 'MATH_TOPIC' as ContentType })),
        ...mathData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'MATH_EXERCISE' as ContentType })),
      ];
      const vietItems: PickerItem[] = [
        ...vietData.sets.map((s: any) => ({ id: s.id, title: s.title, subtitle: `${s.category} · ${s._count?.items ?? 0} mục`, contentType: 'VIET_SET' as ContentType })),
        ...vietData.exercises.map((e: any) => ({ id: e.id, title: e.title, subtitle: `${e.type} · ${e._count?.questions ?? 0} câu`, contentType: 'VIET_EXERCISE' as ContentType })),
      ];
      const mediaItems: PickerItem[] = (Array.isArray(mediaData) ? mediaData : []).map((m) => ({
        id: m.id, title: m.name, subtitle: fmtBytes(m.fileSize),
        contentType: 'MEDIA_FILE' as ContentType, mimeType: m.mimeType, mediaType: m.type,
      }));
      setPickerItems({ lang: langItems, math: mathItems, viet: vietItems, media: mediaItems });
    } catch {}
    setPickerLoading(false);
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);
  useEffect(() => { if (showPicker) loadPickerContent(); }, [showPicker, loadPickerContent]);

  const handleAdd = async (item: PickerItem) => {
    setAdding(item.id);
    try {
      const link = await api.post<ModuleLink>(`/courses/${courseId}/modules`, { contentType: item.contentType, contentId: item.id });
      const full: ModuleLink = { ...link, mimeType: item.mimeType, mediaType: item.mediaType };
      setModules((prev) => [...prev, full]);
      setSelectedId(full.id);
    } catch {}
    setAdding(null);
  };

  const handleRemove = async (linkId: string, title: string) => {
    if (!confirm(`Gỡ "${title}" khỏi khóa học?`)) return;
    setRemoving(linkId);
    try {
      await api.delete(`/courses/${courseId}/modules/${linkId}`);
      setModules((prev) => {
        const next = prev.filter((m) => m.id !== linkId);
        if (selectedId === linkId) setSelectedId(next[0]?.id ?? null);
        return next;
      });
    } catch {}
    setRemoving(null);
  };

  const linkedIds = new Set(modules.map((m) => m.contentId));
  const filteredModules = filterGroup === 'all' ? modules : modules.filter((m) => MODULE_TYPE_GROUP[m.contentType] === filterGroup);
  const currentPickerItems = pickerItems[pickerTab];
  const filteredPicker = currentPickerItems.filter((item) =>
    !linkedIds.has(item.id) && (!search.trim() || item.title.toLowerCase().includes(search.toLowerCase()))
  );
  const viewUrl = selectedModule ? getModuleViewUrl(selectedModule.contentType, selectedModule.contentId) : '';
  const parentUrl = selectedModule ? getModuleParentUrl(selectedModule.contentType) : '';
  const isMediaFile = selectedModule?.contentType === 'MEDIA_FILE';
  const mediaFileUrl = isMediaFile
    ? `/api/media/${selectedModule!.contentId}/file${accessToken ? `?token=${accessToken}` : ''}`
    : '';

  return (
    <>
      <div className="rounded-xl border overflow-hidden bg-background flex" style={{ height: 'calc(100vh - 260px)', minHeight: 460 }}>
        {/* Left panel */}
        <div className="w-64 shrink-0 flex flex-col border-r">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
            <span className="font-semibold text-sm">Nội dung ({modules.length})</span>
            <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => setShowPicker(true)}>
              <Plus className="h-3 w-3 mr-1" />Thêm
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b text-xs shrink-0 overflow-x-auto">
            {(['all', 'lang', 'math', 'viet', 'media'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={cn(
                  'px-2.5 py-2 font-medium border-b-2 transition-colors whitespace-nowrap',
                  filterGroup === g ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {g === 'all' ? 'Tất cả' : { lang: 'NN', math: 'Toán', viet: 'Việt', media: 'File' }[g]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredModules.length === 0 ? (
              <div className="text-center py-8 px-4">
                <BookMarked className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có nội dung</p>
                <button onClick={() => setShowPicker(true)} className="mt-1 text-xs text-primary hover:underline">+ Thêm</button>
              </div>
            ) : (
              filteredModules.map((m) => {
                const colors = GROUP_COLORS[MODULE_TYPE_GROUP[m.contentType]];
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'flex items-start gap-2 px-4 py-3 cursor-pointer border-b hover:bg-muted/50 transition-colors group border-l-2',
                      selectedId === m.id ? 'bg-primary/5 border-l-primary' : 'border-l-transparent',
                    )}
                  >
                    {m.contentType === 'MEDIA_FILE' ? (
                      (() => { const MIcon = mediaTypeIcon(m.mediaType); return (
                        <div className={`shrink-0 mt-0.5 h-5 w-5 rounded flex items-center justify-center ${colors.badge}`}>
                          <MIcon className="h-3 w-3" />
                        </div>
                      ); })()
                    ) : (
                      <div className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight ${colors.badge}`}>
                        {MODULE_TYPE_LABEL[m.contentType].split(' ').slice(-1)[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{m.title}</p>
                      {m.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.subtitle}</p>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(m.id, m.title); }}
                      disabled={removing === m.id}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-destructive/60 hover:text-destructive shrink-0 transition-opacity mt-0.5"
                    >
                      {removing === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedModule ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <BookMarked className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Chọn một nội dung bên trái để xem</p>
            </div>
          ) : (
            <>
              {/* Header bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30 shrink-0">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].badge}`}>
                  {MODULE_TYPE_LABEL[selectedModule.contentType]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedModule.title}</p>
                  {selectedModule.subtitle && <p className="text-xs text-muted-foreground">{selectedModule.subtitle}</p>}
                </div>
                {!isMediaFile && (viewUrl || parentUrl) && (
                  <a href={viewUrl || parentUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <ExternalLink className="h-3 w-3" />Mở
                  </a>
                )}
                {isMediaFile && (
                  <a href={mediaFileUrl} download={selectedModule.title}
                    className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                    Tải xuống
                  </a>
                )}
              </div>

              {/* Content */}
              {isMediaFile ? (
                <div className="flex-1 overflow-hidden">
                  <InlineFileViewer
                    item={{
                      id: selectedModule.contentId,
                      name: selectedModule.title,
                      mimeType: selectedModule.mimeType ?? 'application/octet-stream',
                      type: (selectedModule.mediaType as any) ?? 'DOCUMENT',
                    }}
                    fileUrl={mediaFileUrl}
                  />
                </div>
              ) : viewUrl ? (
                <div className="flex-1 overflow-hidden">
                  <iframe
                    key={viewUrl}
                    src={viewUrl}
                    className="w-full h-full border-0"
                    title={selectedModule.title}
                    style={{ display: 'block' }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].bg}`}>
                    <BookMarked className={`h-7 w-7 ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].text}`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedModule.title}</p>
                    {selectedModule.subtitle && <p className="text-xs text-muted-foreground mt-1">{selectedModule.subtitle}</p>}
                  </div>
                  {parentUrl && (
                    <a href={parentUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />Mở trang quản lý
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg flex flex-col border" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h3 className="font-bold">Thêm nội dung học</h3>
              <button onClick={() => setShowPicker(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex border-b px-4 shrink-0">
              {(['lang', 'math', 'viet', 'media'] as const).map((g) => (
                <button key={g} onClick={() => { setPickerTab(g); setSearch(''); }}
                  className={cn('px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                    pickerTab === g ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  {GROUP_TITLES[g]}
                </button>
              ))}
            </div>
            <div className="px-4 pt-3 shrink-0">
              <input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-0">
              {pickerLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredPicker.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">{search ? 'Không tìm thấy kết quả' : 'Không có nội dung để thêm'}</p>
                  {!search && pickerTab !== 'media' && (
                    <a href={pickerTab === 'lang' ? '/instructor/language' : pickerTab === 'math' ? '/instructor/math' : '/instructor/viet'}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                      <Plus className="h-3.5 w-3.5" />Tạo nội dung mới
                    </a>
                  )}
                  {!search && pickerTab === 'media' && (
                    <a href="/instructor/media" target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                      <Plus className="h-3.5 w-3.5" />Tải file lên thư viện
                    </a>
                  )}
                </div>
              ) : filteredPicker.map((item) => {
                const colors = GROUP_COLORS[pickerTab];
                const MediaIcon = mediaTypeIcon(item.mediaType);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    {pickerTab === 'media' ? (
                      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${colors.badge}`}>
                        <MediaIcon className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {MODULE_TYPE_LABEL[item.contentType]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs shrink-0"
                      disabled={adding === item.id} onClick={() => handleAdd(item)}>
                      {adding === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                      Thêm
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editPrice, setEditPrice] = useState('0');
  const [editFree, setEditFree] = useState(true);

  // Delete state
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add section
  const [newSection, setNewSection] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  // Add lesson
  const [newLessonTitle, setNewLessonTitle] = useState<Record<string, string>>({});
  const [addingLesson, setAddingLesson] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Edit section
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  // Edit lesson
  type EditLesson = { id: string; title: string; type: string; isFree: boolean; isPublished: boolean; videoKey?: string; videoUrl?: string; textContent?: string };
  const [editLesson, setEditLesson] = useState<EditLesson | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [savingLesson, setSavingLesson] = useState(false);

  // Upload video
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadCourse = useCallback(async () => {
    try {
      const data = await api.get<Course>(`/courses/${id}/manage`);
      setCourse(data);
      setEditTitle(data.title);
      setEditStatus(data.status);
      setEditLevel(data.level);
      setEditPrice(String(data.price));
      setEditFree(data.isFree);
      const exp: Record<string, boolean> = {};
      data.sections.forEach((s) => { exp[s.id] = true; });
      setExpandedSections(exp);
    } catch { }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/courses/${id}`, {
        title: editTitle, status: editStatus, level: editLevel,
        price: editFree ? 0 : Number(editPrice), isFree: editFree,
      });
      await loadCourse();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleAddSection = async () => {
    if (!newSection.trim() || !course) return;
    setAddingSection(true);
    try {
      await api.post(`/courses/${course.id}/sections`, { title: newSection.trim(), order: course.sections.length + 1 });
      setNewSection('');
      await loadCourse();
    } catch { }
    setAddingSection(false);
  };

  const handleDeleteSection = async (sectionId: string) => {
    setDeletingId(sectionId); setDeleteError('');
    try {
      await api.delete(`/courses/sections/${sectionId}`);
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa chương thất bại');
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleAddLesson = async (sectionId: string) => {
    const title = newLessonTitle[sectionId];
    if (!title?.trim()) return;
    setAddingLesson((p) => ({ ...p, [sectionId]: true }));
    try {
      const section = course!.sections.find((s) => s.id === sectionId)!;
      await api.post(`/courses/sections/${sectionId}/lessons`, {
        title: title.trim(), order: section.lessons.length + 1, type: 'VIDEO',
      });
      setNewLessonTitle((p) => ({ ...p, [sectionId]: '' }));
      await loadCourse();
    } catch { }
    setAddingLesson((p) => ({ ...p, [sectionId]: false }));
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setDeletingId(lessonId); setDeleteError('');
    try {
      await api.delete(`/courses/lessons/${lessonId}`);
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa bài học thất bại');
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleSaveSection = async () => {
    if (!editSectionId || !editSectionTitle.trim()) return;
    setSavingSection(true);
    try {
      await api.patch(`/courses/sections/${editSectionId}`, { title: editSectionTitle.trim() });
      setEditSectionId(null);
      await loadCourse();
    } catch { }
    setSavingSection(false);
  };

  const handleSaveVideoUrl = async () => {
    if (!editLesson) return;
    setSavingLesson(true);
    try {
      await api.patch(`/courses/lessons/${editLesson.id}`, {
        videoUrl: editLesson.videoUrl || '',
        videoKey: editLesson.videoUrl ? null : editLesson.videoKey,
      });
      await loadCourse();
    } catch (err: any) { alert(err.message); }
    setSavingLesson(false);
  };

  const handleSaveLesson = async () => {
    if (!editLesson) return;
    setSavingLesson(true);
    try {
      await api.patch(`/courses/lessons/${editLesson.id}`, {
        title: editLesson.title,
        type: editLesson.type,
        isFree: editLesson.isFree,
        isPublished: editLesson.isPublished,
        videoUrl: editLesson.videoUrl ?? undefined,
        textContent: editLesson.textContent ?? undefined,
      });
      setEditLesson(null);
      await loadCourse();
    } catch { }
    setSavingLesson(false);
  };

  const handleUploadVideo = async (lessonId: string, file: File) => {
    setUploadingLesson(lessonId);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/lessons/${lessonId}/upload-video`);
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload thất bại'));
        xhr.onerror = () => reject(new Error('Lỗi mạng'));
        xhr.send(formData);
      });
      await loadCourse();
    } catch (err: any) {
      alert(err.message || 'Upload thất bại');
    }
    setUploadingLesson(null);
    setUploadProgress(0);
  };

  const handleDeleteVideo = async (lessonId: string) => {
    setDeletingId(`video-${lessonId}`); setDeleteError('');
    try {
      await api.patch(`/courses/lessons/${lessonId}`, { videoKey: null });
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa video thất bại');
    }
    setDeletingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-muted-foreground">Không tìm thấy khóa học</div>
  );

  const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Thông tin' },
    { key: 'content', label: `Bài giảng (${totalLessons} bài)` },
    { key: 'modules', label: 'Nội dung học' },
  ];

  return (
    <div className={`space-y-5 ${tab === 'modules' ? 'max-w-full' : 'max-w-4xl'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/courses')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold line-clamp-1">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={course.status === 'PUBLISHED' ? 'default' : 'outline'}>{STATUS_LABEL[course.status] ?? course.status}</Badge>
            <a href={`/instructor/courses/${id}/students`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Users className="h-3.5 w-3.5" />{course._count.enrollments} học viên
            </a>
            <a href={`/learn/${course.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1">
              <Eye className="h-3.5 w-3.5" />Xem trước
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Chỉnh sửa thông tin</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tên khóa học</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Trạng thái</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="PUBLISHED">Công khai</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cấp độ</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                >
                  <option value="BEGINNER">Cơ bản</option>
                  <option value="INTERMEDIATE">Trung cấp</option>
                  <option value="ADVANCED">Nâng cao</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={editFree} onChange={(e) => setEditFree(e.target.checked)} />
              <span className="text-sm font-medium">Miễn phí</span>
            </label>
            {!editFree && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Giá (VNĐ)</label>
                <Input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Lưu thay đổi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab: Content */}
      {tab === 'content' && (
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive flex items-center justify-between">
              <span>{deleteError}</span>
              <button onClick={() => setDeleteError('')} className="ml-2 hover:opacity-70">✕</button>
            </div>
          )}

          {/* Add section */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Input placeholder="Tên chương mới..." value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSection()} />
                <Button onClick={handleAddSection} disabled={addingSection || !newSection.trim()}>
                  {addingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Thêm chương
                </Button>
              </div>
            </CardContent>
          </Card>

          {course.sections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Chưa có chương nào.</p>
          ) : course.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  {editSectionId === section.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {expandedSections[section.id]
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <Input className="h-7 text-sm flex-1" value={editSectionTitle}
                        onChange={(e) => setEditSectionTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()} autoFocus />
                      <Button size="sm" className="h-7 px-2 shrink-0" onClick={handleSaveSection} disabled={savingSection}>
                        {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={() => setEditSectionId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button onClick={() => setExpandedSections((p) => ({ ...p, [section.id]: !p[section.id] }))}
                      className="flex items-center gap-2 flex-1 text-left min-w-0">
                      {expandedSections[section.id]
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="font-medium truncate">{section.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({section.lessons.length} bài)</span>
                    </button>
                  )}
                  {editSectionId !== section.id && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => { setEditSectionId(section.id); setEditSectionTitle(section.title); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {confirmDeleteId === section.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-destructive font-medium">Xóa?</span>
                          <Button variant="destructive" size="sm" className="h-7 px-2 text-xs"
                            disabled={deletingId === section.id}
                            onClick={() => handleDeleteSection(section.id)}>
                            {deletingId === section.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Có'}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}>
                            Không
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(section.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              {expandedSections[section.id] && (
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id}>
                      {editLesson?.id === lesson.id ? (
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Tên bài học</label>
                              <Input className="h-8 text-sm" value={editLesson.title}
                                onChange={(e) => setEditLesson({ ...editLesson, title: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Loại</label>
                              <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={editLesson.type}
                                onChange={(e) => setEditLesson({ ...editLesson, type: e.target.value })}>
                                {['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LIVE'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" className="h-3.5 w-3.5"
                                checked={editLesson.isFree} onChange={(e) => setEditLesson({ ...editLesson, isFree: e.target.checked })} />
                              Miễn phí
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox" className="h-3.5 w-3.5"
                                checked={editLesson.isPublished} onChange={(e) => setEditLesson({ ...editLesson, isPublished: e.target.checked })} />
                              Công khai
                            </label>
                          </div>

                          {editLesson.type === 'TEXT' && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium flex items-center gap-1">
                                <AlignLeft className="h-3 w-3" />Nội dung văn bản
                              </label>
                              <textarea
                                value={editLesson.textContent ?? ''}
                                onChange={(e) => setEditLesson({ ...editLesson, textContent: e.target.value })}
                                rows={10}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
                                placeholder="Nhập nội dung bài học (hỗ trợ Markdown)..."
                              />
                              <p className="text-xs text-muted-foreground">Hỗ trợ Markdown: **in đậm**, *in nghiêng*, # tiêu đề, - danh sách</p>
                            </div>
                          )}

                          {editLesson.type === 'QUIZ' && (
                            <div className="border-t pt-3">
                              <QuizManagementSection lessonId={editLesson.id} />
                            </div>
                          )}

                          {editLesson.type === 'VIDEO' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium">Video bài giảng</label>
                                <div className="flex rounded-md border overflow-hidden text-xs">
                                  <button type="button"
                                    className={`px-3 py-1 transition-colors ${videoInputMode === 'upload' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                                    onClick={() => setVideoInputMode('upload')}>
                                    <Upload className="inline h-3 w-3 mr-1" />Upload
                                  </button>
                                  <button type="button"
                                    className={`px-3 py-1 transition-colors ${videoInputMode === 'url' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                                    onClick={() => setVideoInputMode('url')}>
                                    <Video className="inline h-3 w-3 mr-1" />Link URL
                                  </button>
                                </div>
                              </div>

                              {videoInputMode === 'upload' ? (
                                editLesson.videoKey ? (
                                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded px-3 py-2">
                                    <Video className="h-4 w-4 shrink-0" />
                                    <span className="flex-1 truncate font-mono text-xs">{editLesson.videoKey.split('/').pop()}</span>
                                    <Button size="sm" variant="ghost"
                                      className="h-6 text-xs text-destructive hover:text-destructive px-2"
                                      disabled={deletingId === `video-${lesson.id}`}
                                      onClick={() => handleDeleteVideo(lesson.id)}>
                                      {deletingId === `video-${lesson.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Xóa'}
                                    </Button>
                                  </div>
                                ) : uploadingLesson === lesson.id ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Đang tải lên... {uploadProgress}%
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm border rounded px-3 py-1.5 hover:bg-accent transition-colors">
                                    <Upload className="h-4 w-4" />
                                    Chọn file video
                                    <input type="file" accept="video/*" className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadVideo(lesson.id, f);
                                        e.target.value = '';
                                      }} />
                                  </label>
                                )
                              ) : (
                                <div className="space-y-1.5">
                                  <Input className="h-8 text-sm"
                                    placeholder="https://youtube.com/watch?v=..."
                                    value={editLesson.videoUrl ?? ''}
                                    onChange={(e) => setEditLesson({ ...editLesson, videoUrl: e.target.value })}
                                  />
                                  {editLesson.videoUrl && (
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-muted-foreground flex-1 truncate">
                                        Link: <span className="text-primary">{editLesson.videoUrl}</span>
                                      </p>
                                      <a href={`/learn/${course.slug}?lesson=${editLesson.id}`} target="_blank" rel="noopener noreferrer"
                                        className="shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                                        <Eye className="h-3 w-3" />Xem thử
                                      </a>
                                    </div>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    disabled={savingLesson} onClick={handleSaveVideoUrl}>
                                    {savingLesson ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                    Lưu link
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="border-t pt-3">
                            <LessonModulesSection lessonId={editLesson.id} />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={handleSaveLesson} disabled={savingLesson}>
                              {savingLesson ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              Lưu
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditLesson(null)}>Hủy</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-muted/50">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{lesson.order}.</span>
                          <span className="flex-1 text-sm truncate">{lesson.title}</span>
                          {lesson.videoKey && <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{lesson.type}</Badge>
                          {lesson.isFree && <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Free</Badge>}
                          {lesson.isPublished
                            ? <Eye className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            : <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}

                          {confirmDeleteId === lesson.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-destructive font-medium">Xóa?</span>
                              <Button variant="destructive" size="sm" className="h-6 px-2 text-xs"
                                disabled={deletingId === lesson.id}
                                onClick={() => handleDeleteLesson(lesson.id)}>
                                {deletingId === lesson.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Có'}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                onClick={() => setConfirmDeleteId(null)}>
                                Không
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 shrink-0">
                              {(lesson.videoKey || lesson.videoUrl) && (
                                <a href={`/learn/${course.slug}?lesson=${lesson.id}`} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Eye className="h-3.5 w-3.5 text-blue-500" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditLesson({ id: lesson.id, title: lesson.title, type: lesson.type, isFree: lesson.isFree, isPublished: lesson.isPublished, videoKey: lesson.videoKey, videoUrl: lesson.videoUrl, textContent: lesson.textContent });
                                  setVideoInputMode(lesson.videoUrl ? 'url' : 'upload');
                                }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setConfirmDeleteId(lesson.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add lesson */}
                  <div className="flex gap-2 pt-1">
                    <Input
                      className="h-8 text-sm"
                      placeholder="Tên bài học mới..."
                      value={newLessonTitle[section.id] || ''}
                      onChange={(e) => setNewLessonTitle((p) => ({ ...p, [section.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLesson(section.id)}
                    />
                    <Button size="sm" className="h-8 shrink-0"
                      disabled={addingLesson[section.id] || !newLessonTitle[section.id]?.trim()}
                      onClick={() => handleAddLesson(section.id)}>
                      {addingLesson[section.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Thêm bài
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Modules */}
      {tab === 'modules' && <InstructorModulesTab courseId={id} />}
    </div>
  );
}
