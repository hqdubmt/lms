'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Copy, Check, Film, FileText, Image as ImageIcon,
  Search, Filter, Loader2, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

function MediaCard({
  item, onDelete,
}: {
  item: MediaItem;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = `/api/media/${item.id}/file`;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Preview */}
      <div className="relative h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {item.type === 'IMAGE' ? (
          <img
            src={url}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : item.type === 'VIDEO' ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Film className="h-12 w-12" />
            <span className="text-xs">Video</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <FileText className="h-12 w-12" />
            <span className="text-xs">Tài liệu</span>
          </div>
        )}
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {item.type === 'VIDEO' && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-lg bg-white/90 text-gray-800 text-xs font-medium flex items-center gap-1 hover:bg-white"
            >
              <Film className="h-3.5 w-3.5" /> Xem
            </a>
          )}
          {item.type === 'IMAGE' && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-lg bg-white/90 text-gray-800 text-xs font-medium flex items-center gap-1 hover:bg-white"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Xem
            </a>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 truncate" title={item.name}>{item.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatBytes(item.fileSize)} · {fmtDate(item.createdAt)}
        </p>
        <p className="text-xs text-indigo-500 mt-0.5 truncate">bởi {item.uploader.name}</p>

        {/* URL bar */}
        <div className="mt-2 flex items-center gap-1.5">
          <input
            readOnly
            value={url}
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-500 truncate"
          />
          <button
            onClick={handleCopy}
            title="Sao chép URL"
            className={cn(
              'h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0',
              copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(item.id)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Xóa
        </button>
      </div>
    </div>
  );
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async (type?: string) => {
    setLoading(true);
    try {
      const params = type ? `?type=${type}` : '';
      const data = await api.get<MediaItem[]>(`/media${params}`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('Không tải được thư viện');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(typeFilter || undefined); }, [typeFilter]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        await api.upload('/media/upload', fd);
      }
      await fetchMedia(typeFilter || undefined);
    } catch (e: any) {
      setError(e?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/media/${deleteTarget.id}`);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((i) =>
    search ? i.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'IMAGE', label: 'Hình ảnh' },
    { value: 'DOCUMENT', label: 'Tài liệu' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Thư viện Media</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý video, hình ảnh và tài liệu</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Đang upload...' : 'Tải lên'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <X className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                typeFilter === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tên file..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <span className="text-sm text-gray-400">{filtered.length} file</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Chưa có file nào</p>
          <p className="text-sm text-gray-400 mt-1">Nhấn "Tải lên" để thêm media vào thư viện</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onDelete={(id) => setDeleteTarget(items.find((i) => i.id === id) || null)} />
          ))}
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900">Xóa file?</h3>
            <p className="text-sm text-gray-500 mt-2">
              File <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
