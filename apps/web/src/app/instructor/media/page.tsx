'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Copy, Check, FileText, Image as ImageIcon,
  Search, Loader2, X, Play, Lock, Globe, BookOpen, Users,
  ChevronDown, Pencil, Save, Film,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { InlineFileViewer } from '@/components/media/InlineFileViewer';

type AccessLevel = 'PUBLIC' | 'COURSE' | 'CLASS' | 'PRIVATE';

interface MediaItem {
  id: string;
  name: string;
  fileSize: number;
  mimeType: string;
  type: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  access: AccessLevel;
  courseId?: string | null;
  classId?: string | null;
  createdAt: string;
}

interface CourseOption { id: string; title: string; }
interface ClassOption  { id: string; name: string; }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ACCESS_OPTIONS: { value: AccessLevel; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'PRIVATE',  label: 'Riêng tư',     desc: 'Chỉ bạn và admin',           icon: <Lock    className="h-3.5 w-3.5" /> },
  { value: 'PUBLIC',   label: 'Công khai',     desc: 'Mọi học viên đã đăng nhập',  icon: <Globe   className="h-3.5 w-3.5" /> },
  { value: 'COURSE',   label: 'Theo khóa học', desc: 'Chỉ học viên đã đăng ký',    icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: 'CLASS',    label: 'Theo lớp',      desc: 'Chỉ thành viên trong lớp',   icon: <Users   className="h-3.5 w-3.5" /> },
];

const ACCESS_COLORS: Record<AccessLevel, string> = {
  PUBLIC:  'bg-green-50  text-green-700  border-green-200',
  COURSE:  'bg-blue-50   text-blue-700   border-blue-200',
  CLASS:   'bg-purple-50 text-purple-700 border-purple-200',
  PRIVATE: 'bg-gray-50   text-gray-600   border-gray-200',
};

function AccessBadge({ access }: { access: AccessLevel }) {
  const opt = ACCESS_OPTIONS.find((o) => o.value === access)!;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5', ACCESS_COLORS[access])}>
      {opt.icon}{opt.label}
    </span>
  );
}

function AccessPicker({
  value, onChange, courses, classes, courseId, onCourseId, classId, onClassId,
}: {
  value: AccessLevel; onChange: (v: AccessLevel) => void;
  courses: CourseOption[]; classes: ClassOption[];
  courseId: string; onCourseId: (v: string) => void;
  classId: string; onClassId: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {ACCESS_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left text-xs transition-colors',
              value === opt.value ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            <span className="shrink-0">{opt.icon}</span><span>{opt.label}</span>
          </button>
        ))}
      </div>
      {value === 'COURSE' && (
        <select value={courseId} onChange={(e) => onCourseId(e.target.value)}
          className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">-- Chọn khóa học --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
      {value === 'CLASS' && (
        <select value={classId} onChange={(e) => onClassId(e.target.value)}
          className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">-- Chọn lớp --</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}

function UploadModal({ files, onConfirm, onClose, uploading, courses, classes }: {
  files: File[];
  onConfirm: (names: string[], access: AccessLevel, courseId: string, classId: string) => void;
  onClose: () => void;
  uploading: boolean;
  courses: CourseOption[];
  classes: ClassOption[];
}) {
  const [names, setNames]   = useState<string[]>(files.map((f) => f.name.replace(/\.[^.]+$/, '')));
  const [access, setAccess] = useState<AccessLevel>('PUBLIC');
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId]   = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Cài đặt trước khi tải lên</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
          {files.map((file, i) => (
            <div key={i}>
              <label className="text-xs font-medium text-gray-500 block mb-1 truncate">File: {file.name} ({formatBytes(file.size)})</label>
              <input autoFocus={i === 0} value={names[i]}
                onChange={(e) => { const next = [...names]; next[i] = e.target.value; setNames(next); }}
                placeholder="Nhập tên hiển thị..."
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          ))}
        </div>
        <AccessPicker value={access} onChange={setAccess} courses={courses} classes={classes}
          courseId={courseId} onCourseId={setCourseId} classId={classId} onClassId={setClassId} />
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(names, access, courseId, classId)}
            disabled={uploading || names.some((n) => !n.trim()) || (access === 'COURSE' && !courseId) || (access === 'CLASS' && !classId)}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Đang tải lên...' : 'Tải lên'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
        </div>
      </div>
    </div>
  );
}

const TYPE_ICON = { VIDEO: Film, IMAGE: ImageIcon, DOCUMENT: FileText };
const TYPE_COLOR: Record<string, string> = {
  VIDEO:    'bg-purple-100 text-purple-600',
  IMAGE:    'bg-green-100  text-green-600',
  DOCUMENT: 'bg-orange-100 text-orange-600',
};

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'IMAGE', label: 'Hình ảnh' },
  { value: 'DOCUMENT', label: 'Tài liệu' },
];

function RightPanel({
  item, fileUrl, onDelete, onRename, onAccessChange, courses, classes,
}: {
  item: MediaItem; fileUrl: string;
  onDelete: () => void;
  onRename: (id: string, name: string) => void;
  onAccessChange: (id: string, access: AccessLevel, courseId: string | null, classId: string | null) => void;
  courses: CourseOption[]; classes: ClassOption[];
}) {
  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState(item.name);
  const [savingName, setSavingName]     = useState(false);
  const [showAccess, setShowAccess]     = useState(false);
  const [access, setAccess]             = useState<AccessLevel>(item.access);
  const [courseId, setCourseId]         = useState(item.courseId || '');
  const [classId, setClassId]           = useState(item.classId || '');
  const [savingAccess, setSavingAccess] = useState(false);
  const [copied, setCopied]             = useState(false);
  const copyUrl = `/api/media/${item.id}/file`;

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === item.name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await api.patch(`/media/${item.id}`, { name: nameInput.trim() });
      onRename(item.id, nameInput.trim());
      setEditingName(false);
    } catch {}
    setSavingName(false);
  };

  const handleSaveAccess = async () => {
    setSavingAccess(true);
    try {
      await api.patch(`/media/${item.id}/access`, {
        access,
        courseId: access === 'COURSE' ? courseId || null : null,
        classId:  access === 'CLASS'  ? classId  || null : null,
      });
      onAccessChange(item.id, access,
        access === 'COURSE' ? courseId || null : null,
        access === 'CLASS'  ? classId  || null : null,
      );
      setShowAccess(false);
    } catch {}
    setSavingAccess(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.origin + copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Info bar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50 space-y-1.5">
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setNameInput(item.name); setEditingName(false); } }}
              className="flex-1 text-sm border-b border-indigo-400 bg-transparent outline-none min-w-0" />
            <button onClick={handleSaveName} disabled={savingName} className="text-indigo-600 hover:text-indigo-800 shrink-0">
              {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => { setNameInput(item.name); setEditingName(false); }} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{item.name}</p>
            <button onClick={() => { setNameInput(item.name); setEditingName(true); }} title="Đổi tên"
              className="shrink-0 text-gray-400 hover:text-indigo-600 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleCopy} title="Sao chép URL"
              className={cn('shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-colors',
                copied ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-indigo-600')}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onDelete} title="Xóa file"
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">{formatBytes(item.fileSize)} · {fmtDate(item.createdAt)}</p>
          <button onClick={() => setShowAccess((v) => !v)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <AccessBadge access={item.access} />
            <ChevronDown className={cn('h-3 w-3 text-gray-400 transition-transform', showAccess && 'rotate-180')} />
          </button>
        </div>
        {showAccess && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
            <AccessPicker value={access} onChange={setAccess} courses={courses} classes={classes}
              courseId={courseId} onCourseId={setCourseId} classId={classId} onClassId={setClassId} />
            <div className="flex gap-2">
              <button onClick={handleSaveAccess}
                disabled={savingAccess || (access === 'COURSE' && !courseId) || (access === 'CLASS' && !classId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                {savingAccess ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Lưu
              </button>
              <button onClick={() => { setAccess(item.access); setCourseId(item.courseId || ''); setClassId(item.classId || ''); setShowAccess(false); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        <InlineFileViewer item={item} fileUrl={fileUrl} />
      </div>
    </>
  );
}

export default function InstructorMediaPage() {
  const { accessToken } = useAuthStore();
  const [items, setItems]         = useState<MediaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');
  const [courses, setCourses]     = useState<CourseOption[]>([]);
  const [classes, setClasses]     = useState<ClassOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async (type?: string) => {
    setLoading(true);
    try {
      const params = type ? `?type=${type}` : '';
      const data = await api.get<MediaItem[]>(`/media${params}`);
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setSelected((prev) => arr.find((i) => i.id === prev?.id) ?? arr[0] ?? null);
    } catch { setError('Không tải được thư viện'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMedia(typeFilter || undefined); }, [typeFilter]);

  useEffect(() => {
    api.get<{ id: string; title: string }[]>('/courses/mine')
      .then((d) => { if (Array.isArray(d)) setCourses(d.map((c) => ({ id: c.id, title: c.title }))); })
      .catch(() => {});
    api.get<{ classes: { id: string; name: string }[] }>('/admin/classes')
      .then((d) => { if (d?.classes) setClasses(d.classes.map((c) => ({ id: c.id, name: c.name }))); })
      .catch(() => {});
  }, []);

  const handleUploadConfirm = async (names: string[], access: AccessLevel, courseId: string, classId: string) => {
    if (!pendingFiles) return;
    setUploading(true); setError('');
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const customName = names[i]?.trim();
        const fd = new FormData();
        fd.append('file', customName ? new File([file], customName + ext, { type: file.type }) : file);
        fd.append('access', access);
        if (access === 'COURSE' && courseId) fd.append('courseId', courseId);
        if (access === 'CLASS'  && classId)  fd.append('classId',  classId);
        await api.upload('/media/upload', fd);
      }
      setPendingFiles(null);
      if (inputRef.current) inputRef.current.value = '';
      await fetchMedia(typeFilter || undefined);
    } catch (e: any) { setError(e?.message || 'Upload thất bại'); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/media/${deleteTarget.id}`);
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== deleteTarget.id);
        if (selected?.id === deleteTarget.id) setSelected(next[0] ?? null);
        return next;
      });
      setDeleteTarget(null);
    } catch (e: any) { setError(e?.message || 'Xóa thất bại'); }
    finally { setDeleting(false); }
  };

  const filtered = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  const fileUrl = selected
    ? `/api/media/${selected.id}/file${accessToken ? `?token=${accessToken}` : ''}`
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thư viện của tôi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lưu trữ và quản lý video, hình ảnh, tài liệu</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          <Upload className="h-4 w-4" />Tải lên
        </button>
        <input ref={inputRef} type="file" multiple
          accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.ppt,.txt"
          className="hidden" onChange={(e) => { if (e.target.files?.length) setPendingFiles(Array.from(e.target.files)); }} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <X className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button key={tab.value} onClick={() => setTypeFilter(tab.value)}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                typeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tên file..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <span className="text-sm text-gray-400">{filtered.length} file</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="flex border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white"
          style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>

          {/* Left: file list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 p-6 text-center">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">Chưa có file nào</p>
                <p className="text-xs">Nhấn "Tải lên" để thêm</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filtered.map((item) => {
                  const Icon = TYPE_ICON[item.type];
                  const active = selected?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => setSelected(item)}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0 group/item',
                        active ? 'bg-indigo-50' : 'hover:bg-gray-50')}>
                      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', TYPE_COLOR[item.type])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', active ? 'text-indigo-700' : 'text-gray-800')}>{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-400">{formatBytes(item.fileSize)}</p>
                          <AccessBadge access={item.access} />
                        </div>
                      </div>
                      {active && <div className="w-0.5 h-6 bg-indigo-500 rounded-full shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: viewer + info */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {selected ? (
              <RightPanel
                key={selected.id}
                item={selected}
                fileUrl={fileUrl}
                onDelete={() => setDeleteTarget(selected)}
                onRename={(id, name) => {
                  setItems((prev) => prev.map((i) => i.id === id ? { ...i, name } : i));
                  setSelected((prev) => prev?.id === id ? { ...prev, name } : prev);
                }}
                onAccessChange={(id, access, courseId, classId) => {
                  setItems((prev) => prev.map((i) => i.id === id ? { ...i, access, courseId, classId } : i));
                  setSelected((prev) => prev?.id === id ? { ...prev, access, courseId, classId } : prev);
                }}
                courses={courses}
                classes={classes}
              />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-300">
                <Play className="h-16 w-16" />
                <p className="text-sm">Chọn một file để xem</p>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingFiles && (
        <UploadModal files={pendingFiles} uploading={uploading}
          onConfirm={handleUploadConfirm}
          onClose={() => { setPendingFiles(null); if (inputRef.current) inputRef.current.value = ''; }}
          courses={courses} classes={classes} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900">Xóa file?</h3>
            <p className="text-sm text-gray-500 mt-2">
              File <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
