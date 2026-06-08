'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Library, Upload, Trash2, Zap, RefreshCw, CheckCircle2,
  XCircle, Clock, Loader2, FileText, Eye, Filter, ChevronDown,
  FileType2, Database, Youtube, Link2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Doc {
  id: string; filename: string; subject: string; grade: number | null;
  sourceType: string; embeddingStatus: string; chunkCount: number;
  qualityScore: number | null; importedAt: string;
}

interface DocList { docs: Doc[]; total: number; page: number; limit: number }

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Toán', viet: 'Tiếng Việt', language: 'Ngoại ngữ', general: 'Chung',
};
const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-100 text-blue-700', viet: 'bg-green-100 text-green-700',
  language: 'bg-purple-100 text-purple-700', general: 'bg-gray-100 text-gray-600',
};
const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Chờ', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  processing: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  done:       { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:     { label: 'Lỗi', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
};

const EXT_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', xlsx: '📊', xls: '📊',
  csv: '📊', pptx: '📑', html: '🌐', txt: '📃', md: '📃',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DocumentsPage() {
  const [list, setList] = useState<DocList>({ docs: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: '', status: '' });
  const [embedding, setEmbedding] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Doc & { markdown?: string } | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytImporting, setYtImporting] = useState(false);
  const [ytMsg, setYtMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filter.subject) params.set('subject', filter.subject);
    if (filter.status) params.set('status', filter.status);
    try {
      const d = await api.get<DocList>(`/admin/documents?${params}`);
      setList(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const importFile = useCallback(async (file: File) => {
    setImporting(true);
    setImportMsg('Đang nhập...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = api.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/documents/import?saveToMinio=false', {
        method: 'POST', headers, credentials: 'include', body: formData,
      });
      const d = await res.json();
      if (!res.ok) { setImportMsg(`Lỗi: ${d.error}`); return; }
      setImportMsg(`✓ Nhập thành công: ${d.filename} [${d.subject}]`);
      load();
    } catch (e: any) {
      setImportMsg(`Lỗi: ${e.message}`);
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(''), 4000);
    }
  }, [load]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => importFile(f));
  };

  const importYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setYtImporting(true);
    setYtMsg('Đang tải transcript YouTube...');
    try {
      const d = await api.post<{ filename: string; subject: string }>('/admin/documents/youtube', { url: youtubeUrl.trim() });
      setYtMsg(`✓ Nhập thành công: ${d.filename} [${d.subject}]`);
      setYoutubeUrl('');
      load();
    } catch (e: any) {
      setYtMsg(`Lỗi: ${e?.message || 'Không thể lấy transcript'}`);
    } finally {
      setYtImporting(false);
      setTimeout(() => setYtMsg(''), 5000);
    }
  };

  const embed = async (id: string) => {
    setEmbedding(b => ({ ...b, [id]: true }));
    try {
      const r = await api.post<{ embeddedChunks: number }>(`/admin/documents/embed/${id}`, {});
      setList(prev => ({
        ...prev,
        docs: prev.docs.map(d => d.id === id
          ? { ...d, embeddingStatus: 'done', chunkCount: r.embeddedChunks } : d),
      }));
    } catch { /* ignore */ }
    setEmbedding(b => ({ ...b, [id]: false }));
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa tài liệu này?')) return;
    setDeleting(b => ({ ...b, [id]: true }));
    try {
      await api.delete(`/admin/documents/${id}`);
      setList(prev => ({ ...prev, docs: prev.docs.filter(d => d.id !== id), total: prev.total - 1 }));
    } catch { /* ignore */ }
    setDeleting(b => ({ ...b, [id]: false }));
  };

  const loadMarkdown = async (doc: Doc) => {
    const full = await api.get<{ markdownContent: string; rawText: string }>(
      `/admin/documents/status/${doc.id}`
    ).then(d => d).catch(() => null);
    setPreviewDoc({ ...doc, markdown: (full as any)?.markdownContent ?? '' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" />
            Thư viện tài liệu
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý và nhúng tài liệu vào hệ thống RAG
          </p>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !importing && fileInputRef.current?.click()}
        className={cn(
          'flex items-center gap-4 px-6 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
          dragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50',
          importing && 'pointer-events-none opacity-60',
        )}
      >
        <input ref={fileInputRef} type="file" className="hidden" multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.html,.txt,.md"
          onChange={e => Array.from(e.target.files ?? []).forEach(f => importFile(f))} />
        {importing
          ? <Loader2 className="h-8 w-8 text-primary animate-spin shrink-0" />
          : <Upload className="h-8 w-8 text-primary shrink-0" />}
        <div>
          <p className="text-sm font-semibold">
            {importMsg || (dragging ? 'Thả file vào đây' : 'Kéo thả hoặc nhấn để nhập tài liệu')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF · DOCX · XLSX · PPTX · CSV · HTML · TXT · MD — hỗ trợ nhiều file
          </p>
        </div>
      </div>

      {/* YouTube URL import (Module 3) */}
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
        <Youtube className="h-5 w-5 text-red-500 shrink-0" />
        <input
          type="url"
          value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && importYoutube()}
          placeholder="Dán URL YouTube để trích xuất transcript..."
          className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-red-300"
          disabled={ytImporting}
        />
        {ytMsg && <span className="text-xs text-red-600 shrink-0 max-w-[200px] truncate">{ytMsg}</span>}
        <button
          onClick={importYoutube}
          disabled={ytImporting || !youtubeUrl.trim()}
          className="flex items-center gap-1 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 shrink-0"
        >
          {ytImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          Nhập
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select value={filter.subject} onChange={e => setFilter(f => ({ ...f, subject: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30">
          <option value="">Tất cả môn</option>
          {Object.entries(SUBJECT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30">
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ nhúng</option>
          <option value="done">Đã nhúng</option>
          <option value="failed">Lỗi</option>
        </select>
        {(filter.subject || filter.status) && (
          <button onClick={() => setFilter({ subject: '', status: '' })}
            className="text-xs text-muted-foreground hover:text-foreground">
            Xóa bộ lọc
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{list.total} tài liệu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-5">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : list.docs.length === 0 ? (
          <div className="text-center py-14 text-sm text-muted-foreground">
            <Library className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            Chưa có tài liệu — kéo thả file bên trên để bắt đầu
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {list.docs.map(doc => {
              const sm = STATUS_META[doc.embeddingStatus] ?? STATUS_META.pending;
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <span className="text-xl shrink-0">{EXT_ICONS[doc.sourceType] ?? '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{doc.filename}</span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', SUBJECT_COLORS[doc.subject] ?? SUBJECT_COLORS.general)}>
                        {SUBJECT_LABELS[doc.subject] ?? doc.subject}
                      </span>
                      {doc.grade && (
                        <span className="text-[10px] text-muted-foreground">Lớp {doc.grade}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{fmtDate(doc.importedAt)}</span>
                      {doc.chunkCount > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Database className="h-3 w-3" />{doc.chunkCount} chunks
                        </span>
                      )}
                      {doc.qualityScore != null && (
                        <span className="text-xs text-muted-foreground">
                          Chất lượng: {doc.qualityScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status badge */}
                    <span className={cn('flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg', sm.color)}>
                      {sm.icon}{sm.label}
                    </span>
                    {/* Preview */}
                    <button onClick={() => loadMarkdown(doc)} title="Xem markdown"
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {/* Embed */}
                    {doc.embeddingStatus !== 'done' && (
                      <button onClick={() => embed(doc.id)} disabled={embedding[doc.id]} title="Nhúng vào RAG"
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
                        {embedding[doc.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        Nhúng
                      </button>
                    )}
                    {/* Delete */}
                    <button onClick={() => remove(doc.id)} disabled={deleting[doc.id]}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                      {deleting[doc.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {list.total > list.limit && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-50">
            <button onClick={() => load(list.page - 1)} disabled={list.page <= 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              ← Trước
            </button>
            <span className="text-xs text-muted-foreground">
              Trang {list.page} / {Math.ceil(list.total / list.limit)}
            </span>
            <button onClick={() => load(list.page + 1)} disabled={list.page >= Math.ceil(list.total / list.limit)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* Markdown Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold truncate">{previewDoc.filename}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)}
                className="text-muted-foreground hover:text-foreground text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Đóng
              </button>
            </div>
            <textarea readOnly value={previewDoc.markdown ?? ''}
              className="flex-1 font-mono text-xs text-gray-700 p-5 resize-none outline-none overflow-y-auto bg-gray-50/50" />
          </div>
        </div>
      )}
    </div>
  );
}
