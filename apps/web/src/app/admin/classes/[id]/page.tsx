'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, UserPlus, UserX, BookOpen,
  CheckSquare, Users, Save, Upload, Download, X, CheckCircle2, AlertCircle,
  CalendarDays, Plus, Calendar, Clock, Video, Pencil, Trash2, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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

type Tab = 'members' | 'grant' | 'sessions';

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

  useEffect(() => { loadClass(); }, [loadClass]);
  useEffect(() => { if (tab === 'grant') loadCourses(); }, [tab, loadCourses]);
  useEffect(() => { if (tab === 'sessions') loadSessions(); }, [tab, loadSessions]);

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
      <div className="flex border-b">
        {([
          { key: 'members', label: `Thành viên (${cls.members.length})`, icon: Users },
          { key: 'grant', label: 'Cấp quyền khóa học', icon: BookOpen },
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
