'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, UserPlus, X, Loader2, Upload, Download, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: { enrollments: number };
}

const ROLE_LABEL: Record<string, string> = { STUDENT: 'Học viên', INSTRUCTOR: 'Giảng viên', ADMIN: 'Admin' };
const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  STUDENT: 'outline', INSTRUCTOR: 'secondary', ADMIN: 'default',
};
const ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Create single user form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Bulk import
  const [showBulk, setShowBulk] = useState(false);
  type BulkRow = { name: string; email: string; password: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'; error?: string };
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; results: { email: string; status: string; reason?: string }[] } | null>(null);
  const limit = 20;

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await api.get<{ users: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch { }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleRoleFilter = (r: string) => { setRoleFilter(r === roleFilter ? '' : r); setPage(1); };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setCreating(true); setCreateError('');
    try {
      await api.post('/admin/users', { name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole });
      setShowForm(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('STUDENT');
      await load();
    } catch (err: any) {
      setCreateError(err.message || 'Tạo tài khoản thất bại');
    }
    setCreating(false);
  };

  const downloadTemplate = () => {
    const csv = 'name,email,password,role\nNguyễn Văn A,user1@example.com,password123,STUDENT\nTrần Thị B,user2@example.com,password123,INSTRUCTOR';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'template_users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): BulkRow[] => {
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].toLowerCase().split(',').map(s => s.trim().replace(/^﻿/, ''));
    const iName = header.indexOf('name');
    const iEmail = header.indexOf('email');
    const iPass = header.indexOf('password');
    const iRole = header.indexOf('role');
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(s => s.trim());
      const role = (['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes((cols[iRole] || '').toUpperCase())
        ? (cols[iRole] || '').toUpperCase()
        : 'STUDENT') as BulkRow['role'];
      const row: BulkRow = {
        name: iName >= 0 ? cols[iName] || '' : '',
        email: iEmail >= 0 ? cols[iEmail] || '' : '',
        password: iPass >= 0 ? cols[iPass] || '' : '',
        role,
      };
      if (!row.name) row.error = 'Thiếu tên';
      else if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.error = 'Email không hợp lệ';
      else if (!row.password || row.password.length < 6) row.error = 'Mật khẩu < 6 ký tự';
      return row;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBulkRows(parseCsv(text));
      setBulkResult(null);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    const valid = bulkRows.filter(r => !r.error);
    if (valid.length === 0) return;
    setBulkImporting(true); setBulkResult(null);
    try {
      const result = await api.post<{ created: number; skipped: number; results: { email: string; status: string; reason?: string }[] }>(
        '/admin/users/bulk', { users: valid }
      );
      setBulkResult(result);
      await load();
    } catch (err: any) {
      setBulkResult({ created: 0, skipped: valid.length, results: [{ email: '', status: 'skipped', reason: err.message }] });
    }
    setBulkImporting(false);
  };

  const handleChangeRole = async (userId: string, role: string) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as any } : u));
    } catch { }
    setBusy((b) => ({ ...b, [userId]: false }));
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetPass.length < 6) return;
    setResetting(true); setResetError(''); setResetSuccess('');
    try {
      await api.patch(`/users/${resetTarget.id}/reset-password`, { newPassword: resetPass });
      setResetSuccess('Đặt lại mật khẩu thành công!');
      setResetPass('');
    } catch (err: any) {
      setResetError(err.message || 'Có lỗi xảy ra');
    }
    setResetting(false);
  };

  const handleToggleActive = async (userId: string) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    try {
      const res = await api.patch<{ id: string; isActive: boolean }>(`/admin/users/${userId}/toggle-active`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: res.isActive } : u));
    } catch { }
    setBusy((b) => ({ ...b, [userId]: false }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Người dùng</h1>
          <p className="text-sm text-muted-foreground">{total} tài khoản</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowBulk(true); setBulkRows([]); setBulkResult(null); }}>
            <Upload className="h-4 w-4 mr-2" />Import hàng loạt
          </Button>
          <Button onClick={() => { setShowForm(true); setCreateError(''); }}>
            <UserPlus className="h-4 w-4 mr-2" />Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Create user form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tạo tài khoản mới</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Họ tên <span className="text-destructive">*</span></label>
                <Input placeholder="Nguyễn Văn A" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email <span className="text-destructive">*</span></label>
                <Input type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mật khẩu <span className="text-destructive">*</span></label>
                <Input type="password" placeholder="Tối thiểu 6 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Vai trò</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              {createError && <p className="text-sm text-destructive sm:col-span-2">{createError}</p>}
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Tạo tài khoản
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk import */}
      {showBulk && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Import người dùng hàng loạt</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBulk(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: download template + upload */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Tải file mẫu CSV
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" />Chọn file CSV
                </span>
              </label>
              <span className="text-xs text-muted-foreground">Cột: name, email, password, role (STUDENT/INSTRUCTOR/ADMIN)</span>
            </div>

            {/* Preview table */}
            {bulkRows.length > 0 && !bulkResult && (
              <>
                <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Họ tên</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Mật khẩu</th>
                        <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Vai trò</th>
                        <th className="text-left px-3 py-2 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, i) => (
                        <tr key={i} className={row.error ? 'bg-destructive/5' : i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="px-3 py-2">{row.name || <span className="text-muted-foreground italic">trống</span>}</td>
                          <td className="px-3 py-2">{row.email || <span className="text-muted-foreground italic">trống</span>}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{row.password ? '••••••' : <span className="text-muted-foreground italic">trống</span>}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{ROLE_LABEL[row.role] || row.role}</td>
                          <td className="px-3 py-2">
                            {row.error
                              ? <span className="flex items-center gap-1 text-destructive text-xs"><AlertCircle className="h-3.5 w-3.5" />{row.error}</span>
                              : <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Hợp lệ</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-green-600 font-medium">{bulkRows.filter(r => !r.error).length} hợp lệ</span>
                    {bulkRows.some(r => r.error) && <span className="text-destructive font-medium ml-2">{bulkRows.filter(r => r.error).length} lỗi (bỏ qua)</span>}
                  </p>
                  <Button onClick={handleBulkImport} disabled={bulkImporting || bulkRows.filter(r => !r.error).length === 0}>
                    {bulkImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Tạo {bulkRows.filter(r => !r.error).length} tài khoản
                  </Button>
                </div>
              </>
            )}

            {/* Result */}
            {bulkResult && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 px-4 py-3 flex gap-6 text-sm">
                  <span className="text-green-600 font-semibold">✓ Tạo thành công: {bulkResult.created}</span>
                  {bulkResult.skipped > 0 && <span className="text-muted-foreground">Bỏ qua: {bulkResult.skipped}</span>}
                </div>
                {bulkResult.results.some(r => r.status === 'skipped') && (
                  <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {bulkResult.results.filter(r => r.status === 'skipped').map((r, i) => (
                      <div key={i} className="text-muted-foreground">⚠ {r.email} — {r.reason}</div>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => { setBulkRows([]); setBulkResult(null); }}>Import thêm</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {ROLES.map((r) => (
          <Button key={r} variant={roleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => handleRoleFilter(r)}>
            {ROLE_LABEL[r]}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Không tìm thấy người dùng nào
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Người dùng</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Vai trò</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Khóa học</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ngày tạo</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">{user?.name?.[0]?.toUpperCase() || 'U'?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      className="text-xs border rounded px-2 py-1 bg-background"
                      value={user.role}
                      disabled={busy[user.id]}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">
                    {user._count?.enrollments ?? 0}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Đặt lại mật khẩu"
                        onClick={() => { setResetTarget({ id: user.id, name: user.name }); setResetPass(''); setResetError(''); setResetSuccess(''); setShowResetPass(false); }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        disabled={busy[user.id]}
                        className={`h-8 w-8 p-0 ${user.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                        onClick={() => handleToggleActive(user.id)}
                        title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            Trang {page} / {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setResetTarget(null); }}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />Đặt lại mật khẩu
              </h2>
              <button onClick={() => setResetTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Đặt mật khẩu mới cho <strong>{resetTarget.name}</strong></p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <div className="relative">
                <Input
                  type={showResetPass ? 'text' : 'password'}
                  value={resetPass}
                  onChange={(e) => setResetPass(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="pr-10"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword(); }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowResetPass(!showResetPass)}
                >
                  {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            {resetSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />{resetSuccess}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1" onClick={handleResetPassword}
                disabled={resetting || resetPass.length < 6}
              >
                {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Đặt lại mật khẩu
              </Button>
              <Button variant="outline" onClick={() => setResetTarget(null)}>Hủy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
