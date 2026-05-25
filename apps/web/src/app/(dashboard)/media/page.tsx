'use client';

import { useEffect, useState } from 'react';
import { Film, FileText, Image as ImageIcon, Search, Loader2, Download } from 'lucide-react';
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
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'IMAGE', label: 'Hình ảnh' },
  { value: 'DOCUMENT', label: 'Tài liệu' },
];

const TYPE_ICON = { VIDEO: Film, IMAGE: ImageIcon, DOCUMENT: FileText };
const TYPE_COLOR: Record<string, string> = {
  VIDEO:    'bg-purple-100 text-purple-600',
  IMAGE:    'bg-green-100  text-green-600',
  DOCUMENT: 'bg-orange-100 text-orange-600',
};

export default function StudentMediaPage() {
  const { accessToken } = useAuthStore();
  const [items, setItems]     = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<MediaItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = typeFilter ? `?type=${typeFilter}` : '';
    api.get<MediaItem[]>(`/media/library${params}`)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setItems(arr);
        setSelected((prev) => arr.find((i) => i.id === prev?.id) ?? arr[0] ?? null);
      })
      .catch(() => { setItems([]); setSelected(null); })
      .finally(() => setLoading(false));
  }, [typeFilter]);

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const fileUrl = selected
    ? `/api/media/${selected.id}/file${accessToken ? `?token=${accessToken}` : ''}`
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thư viện học liệu</h1>
        <p className="text-sm text-gray-500 mt-1">Video bài giảng, hình ảnh và tài liệu từ giảng viên</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map((tab) => (
            <button key={tab.value} onClick={() => setTypeFilter(tab.value)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                typeFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tên file..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <span className="text-sm text-gray-400 shrink-0">{filtered.length} file</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white"
          style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}>

          {/* Left: file list */}
          <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-300 p-6 text-center">
                <Film className="h-10 w-10" />
                <p className="text-sm">Chưa có tài liệu nào</p>
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
                        <p className={cn('text-sm font-medium truncate', active ? 'text-indigo-700' : 'text-gray-800')}>
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {formatBytes(item.fileSize)} · {fmtDate(item.createdAt)}
                        </p>
                      </div>
                      {active && <div className="w-0.5 h-6 bg-indigo-500 rounded-full shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: viewer */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {selected ? (
              <>
                <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    {(() => { const Icon = TYPE_ICON[selected.type]; return <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', TYPE_COLOR[selected.type])}><Icon className="h-4 w-4" /></div>; })()}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{selected.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(selected.fileSize)} · {fmtDate(selected.createdAt)}</p>
                    </div>
                  </div>
                  <a href={fileUrl} download={selected.name}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    <Download className="h-3.5 w-3.5" />Tải xuống
                  </a>
                </div>
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
    </div>
  );
}
