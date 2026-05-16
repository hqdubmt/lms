'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, BookOpen, GraduationCap, DollarSign, Plus, Search,
  Loader2, UserPlus, UserX, Trash2, Save, CheckSquare,
  School, ChevronRight, X, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────
interface Stats { totalUsers: number; totalCourses: number; totalEnrollments: number; totalRevenue: number }
interface Course { id: string; title: string; slug: string; status: string; level: string; price: number; isFree: boolean; createdAt: string; instructor: { name: string }; _count: { enrollments: number } }
interface Class { id: string; name: string; description?: string; createdAt: string; creator: { name: string }; _count: { members: number } }
interface ClassDetail { id: string; name: string; description?: string; members: { id: string; joinedAt: string; user: { id: string; name: string; email: string; role: string } }[] }
interface CourseOption { id: string; title: string; status: string; _count: { enrollments: number } }
interface User { id: string; name: string; email: string; role: string; isActive: boolean; isVerified: boolean; createdAt: string; _count: { enrollments: number } }

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Lưu trữ' };
const LEVEL_LABEL: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };
const ROLE_LABEL: Record<string, string> = { STUDENT: 'Học viên', INSTRUCTOR: 'Giảng viên', ADMIN: 'Admin' };

type Tab = 'overview' | 'courses' | 'classes' | 'users';

// ─── Main Page ────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/admin/stats').then(setStats).catch(() => { });
  }, []);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Tổng quan', icon: GraduationCap },
    { key: 'courses', label: 'Khóa học', icon: BookOpen },
    { key: 'classes', label: 'Lớp học', icon: School },
    { key: 'users', label: 'Người dùng', icon: Users },
  ];

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Người dùng', value: stats?.totalUsers ?? '—', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Khóa học', value: stats?.totalCourses ?? '—', icon: BookOpen, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Lượt đăng ký', value: stats?.totalEnrollments ?? '—', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Doanh thu', value: stats ? formatPrice(Number(stats.totalRevenue)) : '—', icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && <OverviewTab onNavigate={setTab} />}
      {tab === 'courses' && <CoursesTab />}
      {tab === 'classes' && <ClassesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────
function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { key: 'courses' as Tab, icon: BookOpen, title: 'Khóa học', desc: 'Tạo và quản lý nội dung khóa học, bài học, chương trình học' },
        { key: 'classes' as Tab, icon: School, title: 'Lớp học', desc: 'Tạo lớp, thêm học viên và cấp quyền truy cập khóa học cho cả lớp' },
        { key: 'users' as Tab, icon: Users, title: 'Người dùng', desc: 'Phân quyền Admin/Giảng viên/Học viên, khóa hoặc mở tài khoản' },
      ].map((item) => (
        <Card key={item.key} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate(item.key)}>
          <CardContent className="p-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <item.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{item.desc}</p>
            <div className="flex items-center text-sm text-primary font-medium">
              Quản lý <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', level: 'BEGINNER', price: '0', isFree: true, status: 'DRAFT' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (search) p.set('search', search);
      const data = await api.get<{ courses: Course[]; total: number }>(`/admin/courses?${p}`);
      setCourses(data.courses);
      setTotal(data.total);
    } catch { }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Nhập tên khóa học'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/admin/courses', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        level: form.level,
        price: form.isFree ? 0 : Number(form.price),
        isFree: form.isFree,
        status: form.status,
        language: 'vi',
      });
      setShowForm(false);
      setForm({ title: '', description: '', level: 'BEGINNER', price: '0', isFree: true, status: 'DRAFT' });
      load();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa khóa học "${title}"?`)) return;
    try { await api.delete(`/admin/courses/${id}`); load(); } catch { }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try { await api.patch(`/admin/courses/${id}`, { status: next }); load(); } catch { }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm khóa học..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Đóng' : 'Tạo khóa học'}
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-base">Tạo khóa học mới</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Tên khóa học *</label>
                  <Input placeholder="VD: Lập trình Python cơ bản" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Mô tả</label>
                  <Input placeholder="Mô tả ngắn..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs font-medium mb-1 block">Cấp độ</label>
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.level} onChange={(e) => setForm(f => ({ ...f, level: e.target.value }))}>
                    <option value="BEGINNER">Cơ bản</option>
                    <option value="INTERMEDIATE">Trung cấp</option>
                    <option value="ADVANCED">Nâng cao</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Trạng thái</label>
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="DRAFT">Nháp</option>
                    <option value="PUBLISHED">Công khai</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isFree} onChange={(e) => setForm(f => ({ ...f, isFree: e.target.checked }))} />
                  Miễn phí
                </label>
                {!form.isFree && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Giá (VNĐ)</label>
                    <Input type="number" min="0" className="w-32 h-9" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Tạo khóa học
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Course list */}
      <div className="text-sm text-muted-foreground">{total} khóa học</div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Chưa có khóa học nào</CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Khóa học</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Giảng viên</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Cấp độ</th>
                <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">HV</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-4 py-3">
                    <div className="font-medium line-clamp-1">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.isFree ? 'Miễn phí' : formatPrice(Number(c.price))}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.instructor.name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{LEVEL_LABEL[c.level]}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(c.id, c.status)}>
                      <Badge variant={c.status === 'PUBLISHED' ? 'default' : 'outline'} className="cursor-pointer">
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">{c._count.enrollments}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.title)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Classes Tab ──────────────────────────────────────────────
function ClassesTab() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClassDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Add member
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);

  // Grant courses
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [granting, setGranting] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ classes: Class[]; total: number }>('/admin/classes?limit=50');
      setClasses(data.classes); setTotal(data.total);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadDetail = async (id: string) => {
    setLoadingDetail(true); setSelected(null); setGrantMsg(''); setSelectedCourses(new Set());
    try {
      const [detail, courseData] = await Promise.all([
        api.get<ClassDetail>(`/admin/classes/${id}`),
        api.get<{ courses: CourseOption[] }>(`/admin/classes/${id}/available-courses`),
      ]);
      setSelected(detail); setCourses(courseData.courses);
    } catch { }
    setLoadingDetail(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post('/admin/classes', { name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName(''); setNewDesc(''); setShowForm(false);
      loadClasses();
    } catch { }
    setSaving(false);
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Xóa lớp "${name}"?`)) return;
    try { await api.delete(`/admin/classes/${id}`); if (selected?.id === id) setSelected(null); loadClasses(); } catch { }
  };

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await api.get<{ users: User[] }>(`/admin/users?search=${encodeURIComponent(q)}&limit=8`);
      const existIds = new Set(selected?.members.map(m => m.user.id));
      setSearchResults(data.users.filter(u => !existIds.has(u.id)));
    } catch { }
  };

  const handleAddMember = async (userId: string) => {
    if (!selected) return;
    setAdding(true);
    try {
      await api.post(`/admin/classes/${selected.id}/members`, { userIds: [userId] });
      setUserSearch(''); setSearchResults([]);
      await loadDetail(selected.id);
      loadClasses();
    } catch { }
    setAdding(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selected) return;
    try { await api.delete(`/admin/classes/${selected.id}/members/${userId}`); await loadDetail(selected.id); loadClasses(); } catch { }
  };

  const handleGrant = async () => {
    if (!selected || selectedCourses.size === 0) return;
    if (!confirm(`Cấp ${selectedCourses.size} khóa học cho ${selected.members.length} học viên?`)) return;
    setGranting(true); setGrantMsg('');
    try {
      const r = await api.post<{ classSize: number; courses: number; totalEnrolled: number }>(
        `/admin/classes/${selected.id}/grant-courses`,
        { courseIds: Array.from(selectedCourses) },
      );
      setGrantMsg(`✅ Đã cấp ${r.courses} khóa học cho ${r.classSize} học viên (${r.totalEnrolled} lượt đăng ký)`);
      setSelectedCourses(new Set());
    } catch { }
    setGranting(false);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {/* Left: class list */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} lớp học</span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {showForm ? 'Đóng' : 'Tạo lớp'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="border rounded-lg p-3 space-y-2 bg-primary/5">
            <Input placeholder="Tên lớp học *" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <Input placeholder="Mô tả (tùy chọn)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving || !newName.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Tạo
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có lớp học nào</p>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => loadDetail(cls.id)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${selected?.id === cls.id ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{cls.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{cls._count.members} học viên</span>
                      <span>· {formatDate(cls.createdAt)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0 ml-1"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, cls.name); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: class detail */}
      <div className="lg:col-span-3">
        {!selected && !loadingDetail && (
          <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-sm py-20">
            Chọn một lớp học để quản lý
          </div>
        )}
        {loadingDetail && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {selected && !loadingDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">{selected.name}</h2>
              <span className="text-sm text-muted-foreground">{selected.members.length} học viên</span>
            </div>

            {/* Add member */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" />Thêm học viên vào lớp</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="relative">
                  <Input
                    placeholder="Tìm học viên theo tên hoặc email..."
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg z-10 overflow-hidden">
                      {searchResults.map((u) => (
                        <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50">
                          <div>
                            <div className="text-sm font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                          <Button size="sm" className="h-7 text-xs" disabled={adding} onClick={() => handleAddMember(u.id)}>
                            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Thêm'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grant courses */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Cấp quyền khóa học cho lớp</CardTitle>
                  {selectedCourses.size > 0 && (
                    <Button size="sm" className="h-7 text-xs" disabled={granting} onClick={handleGrant}>
                      {granting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckSquare className="h-3 w-3 mr-1" />}
                      Cấp {selectedCourses.size} khóa
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {grantMsg && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{grantMsg}</div>}
                {selected.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Thêm học viên trước khi cấp quyền</p>
                ) : courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chưa có khóa học nào</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {courses.map((c) => (
                      <label key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedCourses.has(c.id) ? 'bg-primary/10' : 'hover:bg-muted/40'}`}>
                        <input type="checkbox" className="accent-primary" checked={selectedCourses.has(c.id)}
                          onChange={() => setSelectedCourses(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{c._count.enrollments} học viên đã có</div>
                        </div>
                        <Badge variant={c.status === 'PUBLISHED' ? 'default' : 'outline'} className="text-xs shrink-0">
                          {STATUS_LABEL[c.status]}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Member list */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Danh sách học viên ({selected.members.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selected.members.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Chưa có học viên nào</p>
                ) : (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {selected.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">{m.user?.name?.[0]?.toUpperCase() || 'U'?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{m.user.name}</div>
                          <div className="text-xs text-muted-foreground">{m.user.email}</div>
                        </div>
                        <Badge variant="outline" className="text-xs hidden sm:flex">{ROLE_LABEL[m.user.role]}</Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleRemoveMember(m.user.id)}>
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
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (search) p.set('search', search);
      if (roleFilter) p.set('role', roleFilter);
      const data = await api.get<{ users: User[]; total: number }>(`/admin/users?${p}`);
      setUsers(data.users); setTotal(data.total);
    } catch { }
    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (id: string, role: string) => {
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.patch(`/admin/users/${id}/role`, { role }); load(); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

  const toggleActive = async (id: string) => {
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.patch(`/admin/users/${id}/toggle-active`); load(); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm người dùng..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(['', 'STUDENT', 'INSTRUCTOR', 'ADMIN'] as const).map((r) => (
          <Button key={r} size="sm" variant={roleFilter === r ? 'default' : 'outline'} onClick={() => setRoleFilter(r)}>
            {r === '' ? 'Tất cả' : ROLE_LABEL[r]}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground ml-auto">{total} người dùng</span>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Người dùng</th>
                <th className="text-left px-4 py-2.5 font-medium">Vai trò</th>
                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Trạng thái</th>
                <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Ngày tạo</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">{u.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs border rounded px-2 py-1 bg-background"
                      value={u.role}
                      disabled={busy[u.id]}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="STUDENT">Học viên</option>
                      <option value="INSTRUCTOR">Giảng viên</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={u.isActive ? 'default' : 'destructive'} className="text-xs">
                      {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" disabled={busy[u.id]}
                      className={`h-7 w-7 p-0 ${u.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                      onClick={() => toggleActive(u.id)}
                      title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                    >
                      {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
