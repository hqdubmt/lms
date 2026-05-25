'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Plus, Trash2, Users, BookOpen,
  ChevronDown, ChevronRight, Save, UserPlus, UserX,
  Pencil, Video, X, Upload, Check, Eye, EyeOff,
  Download, CheckCircle2, AlertCircle,
  CalendarDays, Calendar, Clock, ExternalLink, Play, BookMarked, Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Course {
  id: string; title: string; slug: string; description?: string;
  status: string; level: string; price: number; isFree: boolean;
  language: string; tags: string[]; requirements: string[]; objectives: string[];
  totalLessons: number; totalStudents: number;
  instructor: { id: string; name: string; email: string };
  sections: Section[];
  _count: { enrollments: number };
}
interface Section { id: string; title: string; order: number; lessons: Lesson[] }
interface Lesson {
  id: string; title: string; type: string; order: number;
  isFree: boolean; isPublished: boolean; videoKey?: string; videoUrl?: string; videoDuration?: number;
}
interface Enrollment {
  id: string; progress: number; status: string; enrolledAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string; role: string };
}
interface User { id: string; name: string; email: string; role: string }

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Lưu trữ' };
const ENROLL_STATUS_LABEL: Record<string, string> = { ACTIVE: 'Đang học', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', SUSPENDED: 'Tạm dừng' };
const SESSION_STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Sắp diễn ra', LIVE: 'Đang diễn ra', ENDED: 'Đã kết thúc' };
const SESSION_STATUS_VARIANT: Record<string, any> = { SCHEDULED: 'outline', LIVE: 'default', ENDED: 'secondary' };

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface LiveSession {
  id: string; title: string;
  startTime: string; endTime: string; meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
}

type Tab = 'info' | 'content' | 'enrollments' | 'sessions' | 'modules';

// ─── Admin Modules Tab ────────────────────────────────────────────────────────

type ContentType = 'VOCAB_SET' | 'LANG_EXERCISE' | 'MATH_TOPIC' | 'MATH_EXERCISE' | 'VIET_SET' | 'VIET_EXERCISE';
interface ModuleLink { id: string; contentType: ContentType; contentId: string; addedAt: string; title: string; subtitle?: string; }
interface PickerItem { id: string; title: string; subtitle?: string; contentType: ContentType; }

const MODULE_TYPE_GROUP: Record<ContentType, 'lang' | 'math' | 'viet'> = {
  VOCAB_SET: 'lang', LANG_EXERCISE: 'lang',
  MATH_TOPIC: 'math', MATH_EXERCISE: 'math',
  VIET_SET: 'viet', VIET_EXERCISE: 'viet',
};
const MODULE_TYPE_LABEL: Record<ContentType, string> = {
  VOCAB_SET: 'Bộ từ vựng', LANG_EXERCISE: 'Bài tập ngoại ngữ',
  MATH_TOPIC: 'Chủ đề toán', MATH_EXERCISE: 'Bài tập toán',
  VIET_SET: 'Bộ tiếng Việt', VIET_EXERCISE: 'Bài tập tiếng Việt',
};
const GROUP_COLORS = {
  lang: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
  math: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  viet: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
};
const GROUP_TITLES = { lang: 'Ngoại ngữ', math: 'Toán học', viet: 'Tiếng Việt' };

function getModuleViewUrl(contentType: ContentType, contentId: string): string {
  switch (contentType) {
    case 'VOCAB_SET':     return `/instructor/language/vocab/${contentId}`;
    case 'LANG_EXERCISE': return `/instructor/language/exercise/${contentId}`;
    case 'MATH_TOPIC':   return `/instructor/math/topic/${contentId}`;
    case 'VIET_SET':     return `/instructor/viet/set/${contentId}`;
    default:             return '';
  }
}
function getModuleParentUrl(contentType: ContentType): string {
  switch (contentType) {
    case 'VOCAB_SET': case 'LANG_EXERCISE': return '/instructor/language';
    case 'MATH_TOPIC': case 'MATH_EXERCISE': return '/instructor/math';
    default: return '/instructor/viet';
  }
}

function AdminModulesTab({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<ModuleLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<'all' | 'lang' | 'math' | 'viet'>('all');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'lang' | 'math' | 'viet'>('lang');
  const [pickerItems, setPickerItems] = useState<{ lang: PickerItem[]; math: PickerItem[]; viet: PickerItem[] }>({ lang: [], math: [], viet: [] });
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
      const [langData, mathData, vietData] = await Promise.all([
        api.get<{ vocabSets: any[]; exercises: any[] }>('/language/mine'),
        api.get<{ topics: any[]; exercises: any[] }>('/math/mine'),
        api.get<{ sets: any[]; exercises: any[] }>('/viet/mine'),
      ]);
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
      setPickerItems({ lang: langItems, math: mathItems, viet: vietItems });
    } catch {}
    setPickerLoading(false);
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);
  useEffect(() => { if (showPicker) loadPickerContent(); }, [showPicker, loadPickerContent]);

  const handleAdd = async (item: PickerItem) => {
    setAdding(item.id);
    try {
      const link = await api.post<ModuleLink>(`/courses/${courseId}/modules`, { contentType: item.contentType, contentId: item.id });
      setModules((prev) => [...prev, link]);
      setSelectedId(link.id);
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
          <div className="flex border-b text-xs shrink-0">
            {(['all', 'lang', 'math', 'viet'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={cn(
                  'px-2.5 py-2 font-medium border-b-2 transition-colors',
                  filterGroup === g ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {g === 'all' ? 'Tất cả' : { lang: 'Ngoại ngữ', math: 'Toán', viet: 'Việt' }[g]}
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
                    <div className={`shrink-0 mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight ${colors.badge}`}>
                      {MODULE_TYPE_LABEL[m.contentType].split(' ').slice(-1)[0]}
                    </div>
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
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30 shrink-0">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].badge}`}>
                  {MODULE_TYPE_LABEL[selectedModule.contentType]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedModule.title}</p>
                  {selectedModule.subtitle && <p className="text-xs text-muted-foreground">{selectedModule.subtitle}</p>}
                </div>
                {(viewUrl || parentUrl) && (
                  <a
                    href={viewUrl || parentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />Mở đầy đủ
                  </a>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].bg}`}>
                  <BookMarked className={`h-8 w-8 ${GROUP_COLORS[MODULE_TYPE_GROUP[selectedModule.contentType]].text}`} />
                </div>
                <div>
                  <p className="font-bold text-base">{selectedModule.title}</p>
                  {selectedModule.subtitle && <p className="text-sm text-muted-foreground mt-1">{selectedModule.subtitle}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{MODULE_TYPE_LABEL[selectedModule.contentType]}</p>
                </div>
                <a
                  href={viewUrl || parentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Mở nội dung
                </a>
              </div>
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
              {(['lang', 'math', 'viet'] as const).map((g) => (
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
                  {!search && (
                    <a href={pickerTab === 'lang' ? '/instructor/language' : pickerTab === 'math' ? '/instructor/math' : '/instructor/viet'}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                      <Plus className="h-3.5 w-3.5" />Tạo nội dung mới
                    </a>
                  )}
                </div>
              ) : filteredPicker.map((item) => {
                const colors = GROUP_COLORS[pickerTab];
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {MODULE_TYPE_LABEL[item.contentType]}
                    </div>
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

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'info';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollTotal, setEnrollTotal] = useState(0);
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
  type EditLesson = { id: string; title: string; type: string; isFree: boolean; isPublished: boolean; videoKey?: string; videoUrl?: string };
  const [editLesson, setEditLesson] = useState<EditLesson | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [savingLesson, setSavingLesson] = useState(false);

  // Upload video
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Enrollments
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState('');

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; found: number; added: number; notFound: string[]; users: { name: string; email: string }[] } | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      const data = await api.get<Course>(`/admin/courses/${id}`);
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

  const loadEnrollments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (enrollSearch) params.set('search', enrollSearch);
      const data = await api.get<{ enrollments: Enrollment[]; total: number }>(`/admin/courses/${id}/enrollments?${params}`);
      setEnrollments(data.enrollments);
      setEnrollTotal(data.total);
    } catch { }
  }, [id, enrollSearch]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await api.get<{ sessions: LiveSession[]; total: number }>(`/admin/live-sessions?courseId=${id}&limit=50`);
      setSessions(data.sessions);
      setSessionsTotal(data.total);
    } catch { }
    setLoadingSessions(false);
  }, [id]);

  useEffect(() => { loadCourse(); }, [loadCourse]);
  useEffect(() => { if (tab === 'enrollments') loadEnrollments(); }, [tab, loadEnrollments]);
  useEffect(() => { if (tab === 'sessions') loadSessions(); }, [tab, loadSessions]);

  // Save course info
  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/admin/courses/${id}`, {
        title: editTitle, status: editStatus, level: editLevel,
        price: editFree ? 0 : Number(editPrice), isFree: editFree,
      });
      await loadCourse();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  // Add section
  const handleAddSection = async () => {
    if (!newSection.trim() || !course) return;
    setAddingSection(true);
    try {
      await api.post(`/admin/courses/${course.id}/sections`, { title: newSection.trim(), order: course.sections.length + 1 });
      setNewSection('');
      await loadCourse();
    } catch { }
    setAddingSection(false);
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    setDeletingId(sectionId); setDeleteError('');
    try {
      await api.delete(`/admin/sections/${sectionId}`);
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa chương thất bại');
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  // Add lesson
  const handleAddLesson = async (sectionId: string) => {
    const title = newLessonTitle[sectionId];
    if (!title?.trim()) return;
    setAddingLesson((p) => ({ ...p, [sectionId]: true }));
    try {
      const section = course!.sections.find((s) => s.id === sectionId)!;
      await api.post(`/admin/sections/${sectionId}/lessons`, {
        title: title.trim(), order: section.lessons.length + 1, type: 'VIDEO',
      });
      setNewLessonTitle((p) => ({ ...p, [sectionId]: '' }));
      await loadCourse();
    } catch { }
    setAddingLesson((p) => ({ ...p, [sectionId]: false }));
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string) => {
    setDeletingId(lessonId); setDeleteError('');
    try {
      await api.delete(`/admin/lessons/${lessonId}`);
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa bài học thất bại');
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  // Save section title
  const handleSaveSection = async () => {
    if (!editSectionId || !editSectionTitle.trim()) return;
    setSavingSection(true);
    try {
      await api.patch(`/admin/sections/${editSectionId}`, { title: editSectionTitle.trim() });
      setEditSectionId(null);
      await loadCourse();
    } catch { }
    setSavingSection(false);
  };

  // Save video URL
  const handleSaveVideoUrl = async () => {
    if (!editLesson) return;
    setSavingLesson(true);
    try {
      await api.patch(`/admin/lessons/${editLesson.id}`, {
        videoUrl: editLesson.videoUrl || '',
        videoKey: editLesson.videoUrl ? null : editLesson.videoKey,
      });
      setEditLesson((p) => p ? { ...p } : null);
      await loadCourse();
    } catch (err: any) { alert(err.message); }
    setSavingLesson(false);
  };

  // Save lesson edits
  const handleSaveLesson = async () => {
    if (!editLesson) return;
    setSavingLesson(true);
    try {
      await api.patch(`/admin/lessons/${editLesson.id}`, {
        title: editLesson.title,
        type: editLesson.type,
        isFree: editLesson.isFree,
        isPublished: editLesson.isPublished,
        videoUrl: editLesson.videoUrl ?? undefined,
      });
      setEditLesson(null);
      await loadCourse();
    } catch { }
    setSavingLesson(false);
  };

  // Upload video
  const handleUploadVideo = async (lessonId: string, file: File) => {
    setUploadingLesson(lessonId);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/admin/lessons/${lessonId}/upload-video`);
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

  // Delete video
  const handleDeleteVideo = async (lessonId: string) => {
    setDeletingId(`video-${lessonId}`); setDeleteError('');
    try {
      await api.delete(`/admin/lessons/${lessonId}/video`);
      await loadCourse();
    } catch (err: any) {
      setDeleteError(err.message || 'Xóa video thất bại');
    }
    setDeletingId(null);
  };

  // Bulk import helpers
  const parseEmails = (text: string) =>
    text.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes('@'));

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails = parseEmails(text);
      setImportText(emails.join('\n'));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = 'email\nhocvien1@example.com\nhocvien2@example.com\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mau_import_hocvien.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    const emails = parseEmails(importText);
    if (emails.length === 0) return;
    setImporting(true); setImportResult(null);
    try {
      const result = await api.post<{ total: number; found: number; added: number; notFound: string[]; users: { name: string; email: string }[] }>(
        '/admin/enrollments/import', { courseId: id, emails }
      );
      setImportResult(result);
      await loadEnrollments();
    } catch (err: any) {
      setImportResult(null);
      alert(err.message || 'Import thất bại');
    }
    setImporting(false);
  };

  // Search users to enroll
  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await api.get<{ users: User[] }>(`/admin/users?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(data.users);
    } catch { }
  };

  // Enroll user
  const handleEnroll = async (userId: string) => {
    setEnrolling(true);
    try {
      await api.post('/admin/enrollments', { courseId: id, userIds: [userId] });
      setUserSearch(''); setSearchResults([]);
      await loadEnrollments();
    } catch { }
    setEnrolling(false);
  };

  // Remove enrollment
  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Xóa quyền truy cập của học viên này?')) return;
    try { await api.delete(`/admin/enrollments/${enrollmentId}`); await loadEnrollments(); } catch { }
  };

  // Update enrollment status
  const handleEnrollStatus = async (enrollmentId: string, status: string) => {
    try { await api.patch(`/admin/enrollments/${enrollmentId}`, { status }); await loadEnrollments(); } catch { }
  };

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Xóa buổi học "${title}"?`)) return;
    try { await api.delete(`/admin/live-sessions/${sessionId}`); await loadSessions(); } catch { }
  };

  const handleSessionStatusChange = async (sessionId: string, status: string) => {
    try { await api.patch(`/admin/live-sessions/${sessionId}`, { status }); await loadSessions(); } catch { }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-muted-foreground">Không tìm thấy khóa học</div>
  );

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'info', label: 'Thông tin', icon: BookOpen },
    { key: 'content', label: `Nội dung (${course.totalLessons} bài)`, icon: BookOpen },
    { key: 'modules', label: 'Nội dung học', icon: Languages },
    { key: 'enrollments', label: `Học viên (${course._count.enrollments})`, icon: Users },
    { key: 'sessions', label: `Lịch học (${sessionsTotal})`, icon: CalendarDays },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/courses')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold line-clamp-1">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={course.status === 'PUBLISHED' ? 'default' : 'outline'}>{STATUS_LABEL[course.status]}</Badge>
            <span className="text-xs text-muted-foreground">bởi {course.instructor.name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
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
                  <button onClick={() => setExpandedSections((p) => ({ ...p, [section.id]: !p[section.id] }))}
                    className="flex items-center gap-2 flex-1 text-left min-w-0">
                    {expandedSections[section.id]
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    {editSectionId === section.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input className="h-7 text-sm" value={editSectionTitle}
                          onChange={(e) => setEditSectionTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()} autoFocus />
                        <Button size="sm" className="h-7 px-2" onClick={handleSaveSection} disabled={savingSection}>
                          {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditSectionId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium truncate">{section.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">({section.lessons.length} bài)</span>
                      </>
                    )}
                  </button>
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
                        /* ── Edit lesson panel ── */
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

                          {/* Video upload / URL */}
                          {editLesson.type === 'VIDEO' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium">Video bài giảng</label>
                                <div className="flex rounded-md border overflow-hidden text-xs">
                                  <button
                                    type="button"
                                    className={`px-3 py-1 transition-colors ${videoInputMode === 'upload' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                                    onClick={() => setVideoInputMode('upload')}
                                  ><Upload className="inline h-3 w-3 mr-1" />Upload file</button>
                                  <button
                                    type="button"
                                    className={`px-3 py-1 transition-colors ${videoInputMode === 'url' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                                    onClick={() => setVideoInputMode('url')}
                                  ><Video className="inline h-3 w-3 mr-1" />Link URL</button>
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
                                    Chọn file video (mp4, webm, mov)
                                    <input type="file" accept="video/*" className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadVideo(lesson.id, f);
                                        e.target.value = '';
                                      }} />
                                  </label>
                                )
                              ) : (
                                /* URL input */
                                <div className="space-y-1.5">
                                  <Input
                                    className="h-8 text-sm"
                                    placeholder="https://youtube.com/watch?v=... hoặc link mp4"
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
                                        <Play className="h-3 w-3" />Xem thử
                                      </a>
                                    </div>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    disabled={savingLesson}
                                    onClick={handleSaveVideoUrl}>
                                    {savingLesson ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                    Lưu link
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={handleSaveLesson} disabled={savingLesson}>
                              {savingLesson ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                              Lưu
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditLesson(null)}>Hủy</Button>
                          </div>
                        </div>
                      ) : (
                        /* ── Lesson row ── */
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
                            /* Inline xác nhận xóa */
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
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600" title="Xem video bài học">
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setVideoInputMode(lesson.videoUrl ? 'url' : 'upload'); setEditLesson({ id: lesson.id, title: lesson.title, type: lesson.type, isFree: lesson.isFree, isPublished: lesson.isPublished, videoKey: lesson.videoKey, videoUrl: lesson.videoUrl }); }}>
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
                  <div className="flex gap-2 mt-3 pt-2 border-t">
                    <Input placeholder="Tên bài học mới..." className="h-8 text-sm"
                      value={newLessonTitle[section.id] || ''}
                      onChange={(e) => setNewLessonTitle((p) => ({ ...p, [section.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLesson(section.id)} />
                    <Button size="sm" variant="outline"
                      disabled={addingLesson[section.id] || !newLessonTitle[section.id]?.trim()}
                      onClick={() => handleAddLesson(section.id)}>
                      {addingLesson[section.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Enrollments (cấp quyền cho lớp) */}
      {tab === 'enrollments' && (
        <div className="space-y-4">
          {/* Enroll user */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Cấp quyền học viên</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Tìm học viên theo tên hoặc email..."
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg z-10 overflow-hidden">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50">
                        <div>
                          <div className="text-sm font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        <Button size="sm" disabled={enrolling} onClick={() => handleEnroll(u.id)}>
                          {enrolling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Thêm vào lớp'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Gõ ít nhất 2 ký tự để tìm kiếm học viên</p>
            </CardContent>
          </Card>

          {/* Bulk import */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />Import hàng loạt
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={downloadTemplate}>
                    <Download className="h-3.5 w-3.5 mr-1" />Tải mẫu CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setShowImport(!showImport); setImportResult(null); }}>
                    {showImport ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    {showImport ? 'Đóng' : 'Mở'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showImport && (
              <CardContent className="space-y-3">
                {/* File drop */}
                <label
                  className="block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                >
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Kéo thả file CSV hoặc <span className="text-primary underline">chọn file</span></p>
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
                </label>

                <div>
                  <label className="text-xs font-medium mb-1 block">Hoặc dán danh sách email (mỗi dòng / phân cách bởi dấu phẩy):</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={'hocvien1@example.com\nhocvien2@example.com'}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{parseEmails(importText).length} email hợp lệ</p>
                </div>

                <Button onClick={handleBulkImport} disabled={importing || parseEmails(importText).length === 0}>
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Import {parseEmails(importText).length > 0 ? `${parseEmails(importText).length} học viên` : ''}
                </Button>

                {importResult && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-md bg-background border p-2">
                        <div className="text-lg font-bold">{importResult.total}</div>
                        <div className="text-xs text-muted-foreground">Tổng email</div>
                      </div>
                      <div className="rounded-md bg-green-50 border border-green-200 p-2">
                        <div className="text-lg font-bold text-green-700">{importResult.added}</div>
                        <div className="text-xs text-green-600">Đã thêm</div>
                      </div>
                      <div className="rounded-md bg-red-50 border border-red-200 p-2">
                        <div className="text-lg font-bold text-red-700">{importResult.notFound.length}</div>
                        <div className="text-xs text-red-600">Không tìm thấy</div>
                      </div>
                    </div>

                    {importResult.users.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-green-700 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />Đã thêm vào lớp:
                        </div>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {importResult.users.map((u) => (
                            <div key={u.email} className="text-xs flex gap-2 px-2 py-0.5 rounded hover:bg-muted/50">
                              <span className="font-medium">{u.name}</span>
                              <span className="text-muted-foreground">{u.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.notFound.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-red-700 mb-1">
                          <AlertCircle className="h-3.5 w-3.5" />Không tìm thấy tài khoản:
                        </div>
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {importResult.notFound.map((e) => (
                            <div key={e} className="text-xs text-red-600 px-2 py-0.5 rounded hover:bg-red-50">{e}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Enrolled list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Danh sách học viên ({enrollTotal})</CardTitle>
                <Input
                  placeholder="Lọc học viên..."
                  className="w-52 h-8 text-sm"
                  value={enrollSearch}
                  onChange={(e) => setEnrollSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {enrollments.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có học viên nào trong lớp</p>
                </div>
              ) : (
                <div className="divide-y">
                  {enrollments.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">{e.user?.name?.[0]?.toUpperCase() || 'U'?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{e.user.name}</div>
                        <div className="text-xs text-muted-foreground">{e.user.email}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:block text-xs text-muted-foreground">{Math.round(e.progress)}%</div>
                        <select
                          className="text-xs border rounded px-2 py-1 bg-background"
                          value={e.status}
                          onChange={(ev) => handleEnrollStatus(e.id, ev.target.value)}
                        >
                          {Object.entries(ENROLL_STATUS_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveEnrollment(e.id)}
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Modules */}
      {tab === 'modules' && (
        <AdminModulesTab courseId={id} />
      )}

      {/* Tab: Sessions */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/admin/sessions/new?courseId=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />Tạo buổi học
            </Button>
          </div>

          {loadingSessions ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có buổi học nào cho khóa học này</p>
                <Button size="sm" className="mt-3" onClick={() => router.push(`/admin/sessions/new?courseId=${id}`)}>
                  <Plus className="h-4 w-4 mr-1" />Tạo buổi học đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <Card key={s.id} className={s.status === 'LIVE' ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Video className={`h-5 w-5 ${s.status === 'LIVE' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-medium">{s.title}</span>
                        <Badge variant={SESSION_STATUS_VARIANT[s.status]}>{SESSION_STATUS_LABEL[s.status]}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDT(s.startTime)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />→ {fmtDT(s.endTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select className="text-xs border rounded px-2 py-1 bg-background"
                        value={s.status}
                        onChange={(e) => handleSessionStatusChange(s.id, e.target.value)}>
                        <option value="SCHEDULED">Sắp diễn ra</option>
                        <option value="LIVE">Bắt đầu live</option>
                        <option value="ENDED">Kết thúc</option>
                      </select>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => window.open(s.meetLink, '_blank')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => router.push(`/admin/sessions/${s.id}?courseId=${id}`)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSession(s.id, s.title)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
