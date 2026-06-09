'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Trash2, X, Loader2, UserPlus,
  ChevronRight, BookOpen, RefreshCw, ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface ClassItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: { members: number; courses: number };
}

export default function InstructorClassesPage() {
  useRequireAuth('INSTRUCTOR');
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create class modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Add students modal
  const [addTarget, setAddTarget] = useState<ClassItem | null>(null);
  const [emailText, setEmailText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ added: number; notFound: string[] } | null>(null);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<ClassItem[]>('/instructor/classes/list');
      setClasses(data);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/instructor/classes', { name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName(''); setNewDesc(''); setShowCreate(false);
      await load();
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleAddStudents = async () => {
    if (!addTarget) return;
    const emails = emailText.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setAdding(true);
    try {
      const res = await api.post<{ added: number; notFound: string[] }>(
        `/instructor/classes/${addTarget.id}/members`,
        { emails },
      );
      setAddResult(res);
      setEmailText('');
      await load();
    } catch { /* ignore */ }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá lớp này? Học sinh sẽ bị xoá khỏi lớp.')) return;
    setDeleting(id);
    try {
      await api.delete(`/instructor/classes/${id}`);
      await load();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Quản lý lớp học
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tạo lớp, thêm học sinh và theo dõi tiến độ</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border hover:bg-gray-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Tạo lớp mới
          </button>
        </div>
      </div>

      {/* Class list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground mb-4">Bạn chưa có lớp học nào</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Tạo lớp đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
                {cls.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{cls.description}</p>}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {cls._count.members} học sinh
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {cls._count.courses} khóa học
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/instructor/classes/${cls.id}/students`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                >
                  <Users className="h-3.5 w-3.5" /> Quản lý HS
                </button>
                <button
                  onClick={() => { setAddTarget(cls); setEmailText(''); setAddResult(null); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Thêm HS
                </button>
                <button
                  onClick={() => handleDelete(cls.id)}
                  disabled={deleting === cls.id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  {deleting === cls.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal tạo lớp */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Tạo lớp mới</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tên lớp <span className="text-red-500">*</span></label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="VD: Lớp 10A1, Nhóm Anh văn..."
                  className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Mô tả (tuỳ chọn)</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="VD: Học kỳ 1 năm 2025-2026"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Huỷ</button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm học sinh */}
      {addTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Thêm học sinh — <span className="text-blue-600">{addTarget.name}</span></h3>
              <button onClick={() => setAddTarget(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Nhập email học sinh, mỗi dòng hoặc cách nhau bởi dấu phẩy</p>
            <textarea
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              rows={5}
              placeholder="student1@school.edu&#10;student2@school.edu"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none font-mono"
              autoFocus
            />
            {addResult && (
              <div className={cn('text-sm p-3 rounded-lg', addResult.added > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600')}>
                Đã thêm <strong>{addResult.added}</strong> học sinh.
                {addResult.notFound.length > 0 && (
                  <p className="text-red-600 mt-1">Không tìm thấy: {addResult.notFound.join(', ')}</p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddTarget(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Đóng</button>
              <button
                onClick={handleAddStudents}
                disabled={adding || !emailText.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                Thêm vào lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
