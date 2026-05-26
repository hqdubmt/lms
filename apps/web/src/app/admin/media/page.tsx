'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Copy, Check, Film, FileText, Image as ImageIcon,
  Search, Loader2, X, Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { InlineFileViewer } from '@/components/media/InlineFileViewer';

interface MediaItem {
  id: string;
  name: string;
  fileSize: number;
  mimeType: string;
  type: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  createdAt: string;
  uploader: { id: string; name: string };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export default function AdminMediaPage() {
  const { accessToken } = useAuthStore();
  const [items, setItems]         = useState<MediaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);
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

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        await api.upload('/media/upload', fd);
      }
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

  const copyUrl = selected ? `/api/media/${selected.id}/file` : '';

  const handleCopy = () => {
    if (!copyUrl) return;
    navigator.clipboard.writeText(window.location.origin + copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thư viện Media</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý video, hình ảnh và tài liệu</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Đang upload...' : 'Tải lên'}
        </button>
        <input ref={inputRef} type="file" multiple
          accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.ppt,.txt"
          className="hidden" onChange={(e) => handleUpload(e.target.files)} />
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
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white"
          style={{ height: 'calc(100vh - 270px)', minHeight: 500 }}>

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
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-0',
                        active ? 'bg-indigo-50' : 'hover:bg-gray-50')}>
                      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', TYPE_COLOR[item.type])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', active ? 'text-indigo-700' : 'text-gray-800')}>{item.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {formatBytes(item.fileSize)} · {item.uploader.name}
                        </p>
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
              <>
                {/* Info bar */}
                <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', TYPE_COLOR[selected.type])}>
                    {(() => { const Icon = TYPE_ICON[selected.type]; return <Icon className="h-4 w-4" />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{selected.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(selected.fileSize)} · {fmtDate(selected.createdAt)} · bởi {selected.uploader.name}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button onClick={handleCopy} title="Sao chép URL"
                      className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                        copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <a href={fileUrl} download={selected.name}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors" title="Tải xuống">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => setDeleteTarget(selected)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 transition-colors" title="Xóa">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Viewer */}
                <div className="flex-1 overflow-hidden">
                  <InlineFileViewer item={selected} fileUrl={fileUrl} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-300">
                <ImageIcon className="h-16 w-16" />
                <p className="text-sm">Chọn một file để xem</p>
              </div>
            )}
          </div>
        </div>
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
