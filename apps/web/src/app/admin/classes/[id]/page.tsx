'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, UserPlus, UserX, BookOpen,
  CheckSquare, Users, Save, Upload, Download, X, CheckCircle2, AlertCircle,
  CalendarDays, Plus, Calendar, Clock, Video, Pencil, Trash2, ExternalLink,
  Languages, BookMarked,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface ClassDetail {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  creator: { id: string; name: string; email: string };
  members: {
    id: string;
    joinedAt: string;
    user: { id: string; name: string; email: string; role: string; avatarUrl?: string };
  }[];
}

interface User { id: string; name: string; email: string; role: string }
interface Course { id: string; title: string; status: string; _count: { enrollments: number } }

interface LiveSession {
  id: string; title: string; description?: string;
  startTime: string; endTime: string; meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  course?: { title: string }; class?: { name: string };
}

const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Sắp diễn ra', LIVE: 'Đang diễn ra', ENDED: 'Đã kết thúc' };
const STATUS_VARIANT: Record<string, any> = { SCHEDULED: 'outline', LIVE: 'default', ENDED: 'secondary' };

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Tab = 'members' | 'grant' | 'courses' | 'sessions' | 'modules';

// ─── Class Modules ─────────────────────────────────────────────────────────────

type ContentType = 'VOCAB_SET' | 'LANG_EXERCISE' | 'MATH_TOPIC' | 'MATH_EXERCISE' | 'VIET_SET' | 'VIET_EXERCISE';

interface ModuleLink {
  id: string; contentType: ContentType; contentId: string; addedAt: string;
  title: string; subtitle?: string;
}

interface PickerItem {
  id: string; title: string; subtitle?: string; contentType: ContentType;
}

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

function ClassModulesTab({ classId }: { classId: string }) {
  const [modules, setModules] = useState<ModuleLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'lang' | 'math' | 'viet'>('lang');
  const [pickerItems, setPickerItems] = useState<{ lang: PickerItem[]; math: PickerItem[]; viet: PickerItem[] }>({ lang: [], math: [], viet: [] });
  const [pickerLoading, setPickerLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadModules = useCallback(async () => {
    try {
      const data = await api.get<ModuleLink[]>(`/admin/classes/${classId}/modules`);
      setModules(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [classId]);

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
      const link = await api.post<ModuleLink>(`/admin/classes/${classId}/modules`, { contentType: item.contentType, contentId: item.id });
      setModules((prev) => [...prev, link]);
      setToast({ type: 'success', msg: `Đã thêm: ${item.title}` });
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Thêm thất bại' });
    }
    setAdding(null);
  };

  const handleRemove = async (linkId: string, title: string) => {
    if (!confirm(`Gỡ "${title}" khỏi lớp học?`)) return;
    setRemoving(linkId);
    try {
      await api.delete(`/admin/classes/${classId}/modules/${linkId}`);
      setModules((prev) => prev.filter((m) => m.id !== linkId));
      setToast({ type: 'success', msg: 'Đã gỡ liên kết' });
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Gỡ thất bại' });
    }
    setRemoving(null);
  };

  const linkedIds = new Set(modules.map((m) => m.contentId));
  const currentPickerItems = pickerItems[pickerTab];
  const filteredPicker = currentPickerItems.filter((item) =>
    !linkedIds.has(item.id) &&
    (!search.trim() || item.title.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped = {
    lang: modules.filter((m) => MODULE_TYPE_GROUP[m.contentType] === 'lang'),
    math: modules.filter((m) => MODULE_TYPE_GROUP[m.contentType] === 'math'),
    viet: modules.filter((m) => MODULE_TYPE_GROUP[m.contentType] === 'viet'),
  };
  const groupTitles = { lang: 'Ngoại ngữ', math: 'Toán học', viet: 'Tiếng Việt' };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4" />Nội dung học ({modules.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowPicker(!showPicker)}>
              <Plus className="h-4 w-4 mr-1.5" />Thêm nội dung
            </Button>
          </div>
        </CardHeader>

        {showPicker && (
          <CardContent className="border-t pt-4 space-y-3">
            {/* Picker tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
              {(['lang', 'math', 'viet'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => { setPickerTab(g); setSearch(''); }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    pickerTab === g ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {groupTitles[g]}
                </button>
              ))}
            </div>

            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />

            {pickerLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredPicker.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? 'Không tìm thấy kết quả' : 'Không có nội dung để thêm'}
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 border rounded-lg p-2">
                {filteredPicker.map((item) => {
                  const colors = GROUP_COLORS[pickerTab];
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                        {MODULE_TYPE_LABEL[item.contentType]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={adding === item.id}
                        onClick={() => handleAdd(item)}
                        className="shrink-0 h-7 px-2"
                      >
                        {adding === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                        Thêm
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <BookMarked className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có nội dung học nào được liên kết</p>
            <Button size="sm" className="mt-3" onClick={() => setShowPicker(true)}>
              <Plus className="h-4 w-4 mr-1" />Thêm nội dung
            </Button>
          </CardContent>
        </Card>
      ) : (
        (['lang', 'math', 'viet'] as const).map((group) => {
          if (grouped[group].length === 0) return null;
          const colors = GROUP_COLORS[group];
          return (
            <Card key={group}>
              <div className={`px-5 py-2.5 border-b ${colors.bg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                  {groupTitles[group]} ({grouped[group].length})
                </p>
              </div>
              <div className="divide-y">
                {grouped[group].map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                      {MODULE_TYPE_LABEL[m.contentType]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      {m.subtitle && <p className="text-xs text-muted-foreground">{m.subtitle}</p>}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                      disabled={removing === m.id}
                      onClick={() => handleRemove(m.id, m.title)}
                    >
                      {removing === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })
      )}

      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white',
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface ClassCourse { id: string; title: string; status: string; thumbnailUrl?: string; _count: { enrollments: number } }

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'members';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Thông tin lớp
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Thêm thành viên
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number; found: number; added: number;
    notFound: string[];
    users: { id: string; email: string; name: string; role: string }[];
  } | null>(null);

  // Cấp quyền khóa học
  const [courses, setCourses] = useState<Course[]>([]);
  const [classSize, setClassSize] = useState(0);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<{ classSize: number; courses: number; totalEnrolled: number } | null>(null);

  // Lịch học
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Khoá học của lớp
  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [allCoursesList, setAllCoursesList] = useState<ClassCourse[]>([]);
  const [selectedCourseIdsForClass, setSelectedCourseIdsForClass] = useState<string[]>([]);
  const [loadingClassCourses, setLoadingClassCourses] = useState(false);
  const [addingClassCourses, setAddingClassCourses] = useState(false);

  const loadClass = useCallback(async () => {
    try {
      const data = await api.get<ClassDetail>(`/admin/classes/${id}`);
      setCls(data);
      setEditName(data.name);
      setEditDesc(data.description || '');
    } catch { }
    setLoading(false);
  }, [id]);

  const loadCourses = useCallback(async () => {
    try {
      const data = await api.get<{ courses: Course[]; classSize: number }>(`/admin/classes/${id}/available-courses`);
      setCourses(data.courses);
      setClassSize(data.classSize);
    } catch { }
  }, [id]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await api.get<{ sessions: LiveSession[]; total: number }>(`/admin/live-sessions?classId=${id}&limit=50`);
      setSessions(data.sessions);
      setSessionsTotal(data.total);
    } catch { }
    setLoadingSessions(false);
  }, [id]);

  const loadClassCourses = useCallback(async () => {
    setLoadingClassCourses(true);
    try {
      const [linked, all] = await Promise.all([
        api.get<ClassCourse[]>(`/admin/classes/${id}/courses`),
        api.get<{ courses: ClassCourse[] }>(`/admin/classes/${id}/available-courses`).then((d) => d.courses || []),
      ]);
      setClassCourses(Array.isArray(linked) ? linked : []);
      setAllCoursesList(Array.isArray(all) ? all : []);
    } catch { }
    setLoadingClassCourses(false);
  }, [id]);

  const handleAddClassCourses = async () => {
    if (selectedCourseIdsForClass.length === 0) return;
    setAddingClassCourses(true);
    try {
      await api.post(`/admin/classes/${id}/courses`, { courseIds: selectedCourseIdsForClass });
      setSelectedCourseIdsForClass([]);
      await loadClassCourses();
    } catch (e: any) { alert(e?.message || 'Lỗi thêm khoá học'); }
    finally { setAddingClassCourses(false); }
  };

  const handleRemoveClassCourse = async (courseId: string) => {
    if (!confirm('Xóa khoá học khỏi lớp?')) return;
    await api.delete(`/admin/classes/${id}/courses/${courseId}`);
    setClassCourses((p) => p.filter((c) => c.id !== courseId));
  };

  useEffect(() => { loadClass(); }, [loadClass]);
  useEffect(() => { if (tab === 'grant') loadCourses(); }, [tab, loadCourses]);
  useEffect(() => { if (tab === 'sessions') loadSessions(); }, [tab, loadSessions]);
  useEffect(() => { if (tab === 'courses') loadClassCourses(); }, [tab, loadClassCourses]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/classes/${id}`, { name: editName, description: editDesc || undefined });
      await loadClass();
    } catch { }
    setSaving(false);
  };

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await api.get<{ users: User[] }>(`/admin/users?search=${encodeURIComponent(q)}&limit=8`);
      const existingIds = new Set(cls?.members.map(m => m.user.id));
      setSearchResults(data.users.filter(u => !existingIds.has(u.id)));
    } catch { }
  };

  const handleAddMember = async (userId: string) => {
    setAdding(true);
    try {
      await api.post(`/admin/classes/${id}/members`, { userIds: [userId] });
      setUserSearch(''); setSearchResults([]);
      await loadClass();
    } catch { }
    setAdding(false);
  };

  const parseEmails = (text: string) => {
    return [...new Set(
      text.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@'))
    )];
  };

  const handleImportFile = (file: File) => {
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(1);
      const emails = lines.map((l) => {
        const cols = l.split(',');
        return (cols[0] || '').replace(/"/g, '').trim();
      }).filter((e) => e.includes('@'));
      setImportText(emails.join('\n'));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = 'email\nhocvien1@example.com\nhocvien2@example.com\ngiangvien@example.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mau_import_thanh_vien.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    const emails = parseEmails(importText);
    if (emails.length === 0) return;
    setImporting(true); setImportResult(null);
    try {
      const result = await api.post<typeof importResult>(`/admin/classes/${id}/members/import`, { emails });
      setImportResult(result);
      await loadClass();
    } catch { }
    setImporting(false);
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Xóa ${name} khỏi lớp?`)) return;
    try {
      await api.delete(`/admin/classes/${id}/members/${userId}`);
      await loadClass();
    } catch { }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  };

  const handleGrantCourses = async () => {
    if (selectedCourses.size === 0) return;
    if (!confirm(`Cấp quyền ${selectedCourses.size} khóa học cho toàn bộ ${cls?.members.length} học viên trong lớp?`)) return;
    setGranting(true); setGrantResult(null);
    try {
      const result = await api.post<{ classSize: number; courses: number; totalEnrolled: number }>(
        `/admin/classes/${id}/grant-courses`,
        { courseIds: Array.from(selectedCourses) },
      );
      setGrantResult(result);
      setSelectedCourses(new Set());
    } catch { }
    setGranting(false);
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

  if (!cls) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy lớp học</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/classes')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
        <div>
          <h1 className="text-xl font-bold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground">
            {cls.members.length} học viên · Tạo bởi {cls.creator.name} · {formatDate(cls.createdAt)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {([
          { key: 'members', label: `Thành viên (${cls.members.length})`, icon: Users },
          { key: 'courses', label: `Khoá học (${classCourses.length})`, icon: BookOpen },
          { key: 'modules', label: 'Nội dung học', icon: Languages },
          { key: 'grant', label: 'Cấp quyền hàng loạt', icon: CheckSquare },
          { key: 'sessions', label: `Lịch học (${sessionsTotal})`, icon: CalendarDays },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Members */}
      {tab === 'members' && (
        <div className="space-y-4">
          {/* Edit info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Thông tin lớp học</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tên lớp</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mô tả</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px] resize-none"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Lưu
              </Button>
            </CardContent>
          </Card>

          {/* Add member (single) */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Thêm học viên / giảng viên</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="Tìm theo tên hoặc email..."
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg z-10 overflow-hidden">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50">
                        <div>
                          <div className="text-sm font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email} · {u.role === 'STUDENT' ? 'Học viên' : u.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Admin'}</div>
                        </div>
                        <Button size="sm" disabled={adding} onClick={() => handleAddMember(u.id)}>
                          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Thêm vào lớp'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Gõ ít nhất 2 ký tự để tìm kiếm</p>
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
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />Tải mẫu CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowImport(!showImport); setImportResult(null); setImportText(''); setImportFile(null); }}>
                    {showImport ? <X className="h-4 w-4" /> : 'Mở rộng'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {showImport && (
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nhập email mỗi dòng, hoặc upload file CSV có cột <code className="bg-muted px-1 rounded text-xs">email</code>. Hỗ trợ cả học viên và giảng viên.
                </p>

                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {importFile ? importFile.name : 'Kéo thả hoặc click để chọn file CSV'}
                  </p>
                  <input id="import-file-input" type="file" accept=".csv,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Hoặc dán danh sách email</label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-y font-mono"
                    placeholder={"hocvien1@example.com\nhocvien2@example.com\ngiangvien@example.com"}
                    value={importText}
                    onChange={(e) => { setImportText(e.target.value); setImportFile(null); }}
                  />
                  {importText && (
                    <p className="text-xs text-muted-foreground">
                      Tìm thấy <strong>{parseEmails(importText).length}</strong> địa chỉ email hợp lệ
                    </p>
                  )}
                </div>

                {importResult && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-700">{importResult.found}</div>
                        <div className="text-xs text-blue-600">Tìm thấy</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-700">{importResult.added}</div>
                        <div className="text-xs text-green-600">Đã thêm vào lớp</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-orange-700">{importResult.notFound.length}</div>
                        <div className="text-xs text-orange-600">Không tìm thấy</div>
                      </div>
                    </div>

                    {importResult.users.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Đã thêm vào lớp:
                        </p>
                        <div className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                          {importResult.users.map((u) => (
                            <div key={u.id} className="flex items-center gap-2">
                              <span className="font-medium">{u.name}</span>
                              <span className="text-muted-foreground">({u.email})</span>
                              <Badge variant="outline" className="text-xs py-0">
                                {u.role === 'STUDENT' ? 'Học viên' : u.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Admin'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.notFound.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5 flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />Email không tìm thấy trong hệ thống:
                        </p>
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono max-h-24 overflow-y-auto">
                          {importResult.notFound.join('\n')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkImport}
                    disabled={importing || parseEmails(importText).length === 0}
                  >
                    {importing
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang import...</>
                      : <><Upload className="h-4 w-4 mr-2" />Import {parseEmails(importText).length > 0 ? `${parseEmails(importText).length} người` : ''}</>
                    }
                  </Button>
                  <Button variant="outline" onClick={() => { setImportText(''); setImportFile(null); setImportResult(null); }}>
                    Xóa
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Member list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danh sách học viên ({cls.members.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cls.members.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có học viên nào. Tìm kiếm và thêm học viên ở trên.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {cls.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">{m.user?.name?.[0]?.toUpperCase() || 'U'?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{m.user.name}</div>
                        <div className="text-xs text-muted-foreground">{m.user.email}</div>
                      </div>
                      <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                        {m.user.role === 'STUDENT' ? 'Học viên' : m.user.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Admin'}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden md:block">{formatDate(m.joinedAt)}</span>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Grant courses */}
      {tab === 'grant' && (
        <div className="space-y-4">
          {cls.members.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Lớp chưa có thành viên. Hãy thêm học viên trước.</p>
                <Button size="sm" className="mt-3" onClick={() => setTab('members')}>Thêm học viên</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {grantResult && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                  ✅ Đã cấp <strong>{grantResult.courses} khóa học</strong> cho <strong>{grantResult.classSize} học viên</strong>
                  {' '}({grantResult.totalEnrolled} lượt đăng ký thành công)
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Chọn khóa học để cấp cho lớp ({cls.members.length} học viên)
                    </CardTitle>
                    {selectedCourses.size > 0 && (
                      <Button onClick={handleGrantCourses} disabled={granting}>
                        {granting
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <CheckSquare className="h-4 w-4 mr-2" />
                        }
                        Cấp {selectedCourses.size} khóa học
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {courses.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">Chưa có khóa học nào</div>
                  ) : (
                    <div className="divide-y">
                      {courses.map((course) => {
                        const selected = selectedCourses.has(course.id);
                        return (
                          <label
                            key={course.id}
                            className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors ${selected ? 'bg-primary/5' : 'hover:bg-muted/40'
                              }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 accent-primary"
                              checked={selected}
                              onChange={() => toggleCourse(course.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{course.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {course._count.enrollments} học viên đã đăng ký
                              </div>
                            </div>
                            <Badge variant={course.status === 'PUBLISHED' ? 'default' : 'outline'} className="text-xs shrink-0">
                              {course.status === 'PUBLISHED' ? 'Công khai' : course.status === 'DRAFT' ? 'Nháp' : 'Lưu trữ'}
                            </Badge>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedCourses.size > 0 && (
                <div className="sticky bottom-4">
                  <div className="bg-background border rounded-xl shadow-lg px-5 py-3 flex items-center justify-between">
                    <p className="text-sm">
                      Đã chọn <strong>{selectedCourses.size}</strong> khóa học
                      → <strong>{cls.members.length}</strong> học viên sẽ được cấp quyền
                    </p>
                    <Button onClick={handleGrantCourses} disabled={granting}>
                      {granting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                      Cấp quyền ngay
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Khoá học */}
      {tab === 'courses' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Thêm khoá học vào lớp</h3>
              {loadingClassCourses ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
              ) : (
                <>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-3">
                    {allCoursesList.filter((c) => !classCourses.find((cc) => cc.id === c.id)).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Tất cả khoá học đã được thêm</p>
                    ) : allCoursesList.filter((c) => !classCourses.find((cc) => cc.id === c.id)).map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1.5">
                        <input type="checkbox" checked={selectedCourseIdsForClass.includes(c.id)}
                          onChange={(e) => setSelectedCourseIdsForClass((p) => e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id))}
                          className="h-4 w-4 rounded text-indigo-600" />
                        <span className="text-sm text-gray-800 flex-1 truncate">{c.title}</span>
                        <span className={`text-xs shrink-0 ${c.status === 'PUBLISHED' ? 'text-green-600' : 'text-gray-400'}`}>
                          {c.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Nháp'}
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={handleAddClassCourses} disabled={selectedCourseIdsForClass.length === 0 || addingClassCourses} size="sm">
                    {addingClassCourses && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Thêm {selectedCourseIdsForClass.length > 0 ? `${selectedCourseIdsForClass.length} ` : ''}khoá học
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {classCourses.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Lớp chưa có khoá học nào</p>
              </div>
            ) : classCourses.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.title} className="h-12 w-20 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-20 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${c.status === 'PUBLISHED' ? 'text-green-600' : 'text-gray-400'}`}>
                        {c.status === 'PUBLISHED' ? 'Đã xuất bản' : c.status === 'DRAFT' ? 'Nháp' : 'Lưu trữ'}
                      </span>
                      <span className="text-xs text-gray-400">{c._count.enrollments} học viên đăng ký</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveClassCourse(c.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Nội dung học */}
      {tab === 'modules' && <ClassModulesTab classId={id} />}

      {/* Tab: Sessions */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/admin/sessions/new?classId=${id}`)}>
              <Plus className="h-4 w-4 mr-2" />Tạo buổi học
            </Button>
          </div>

          {loadingSessions ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có buổi học nào cho lớp này</p>
                <Button size="sm" className="mt-3" onClick={() => router.push(`/admin/sessions/new?classId=${id}`)}>
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
                        <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
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
                        onClick={() => router.push(`/admin/sessions/${s.id}?classId=${id}`)}>
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
