'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, X, Search, Trash2, Edit2, CheckCircle2, Clock, AlertCircle,
  ClipboardList, Flag, Paperclip, Link2,
  Upload, FileText, Image as ImageIcon, File, ExternalLink, GripVertical,
  SendHorizonal, Eye, ZoomIn, UserCheck, MessageCircle, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type TodoStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_STUDENT' | 'DONE' | 'CANCELLED';

interface Attachment { name: string; key: string; size: number; type: string; }

interface TodoUser { id: string; name: string; avatarUrl?: string; }

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: number;
  dueDate?: string;
  attachments: Attachment[];
  links: string[];
  resultNote?: string;
  resultAttachments: Attachment[];
  resultLinks: string[];
  completedAt?: string;
  creatorConfirmed: boolean;
  assigneeConfirmed: boolean;
  createdAt: string;
  createdBy: TodoUser;
  assignedTo?: TodoUser;
}

interface Stats { total: number; overdue: number; today: number; done7d: number; done: number; }

interface Assignee { id: string; name: string; email: string; avatarUrl?: string; }

// ─── Kanban Column Config ─────────────────────────────────────────────────────

const COLUMNS: { status: TodoStatus; label: string; color: string; bg: string; border: string; dot: string }[] = [
  { status: 'NEW', label: 'Mới', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  { status: 'WAITING_STUDENT', label: 'Đã xác nhận', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  { status: 'IN_PROGRESS', label: 'Đang làm', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  { status: 'DONE', label: 'Hoàn thành', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
];

const PRIORITY_LABEL = ['Thấp', 'Trung bình', 'Cao'];
const PRIORITY_COLOR = ['text-gray-400', 'text-yellow-600', 'text-red-500'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isOverdue(dueDate?: string, status?: TodoStatus) {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="h-3 w-3" />;
  if (type === 'application/pdf') return <FileText className="h-3 w-3 text-red-500" />;
  return <File className="h-3 w-3" />;
}

function hasResult(todo: Todo) {
  return !!(todo.resultNote || todo.resultAttachments?.length || todo.resultLinks?.length);
}

// ─── File Preview Modal ───────────────────────────────────────────────────────

const OFFICE_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function FilePreviewModal({ file, onClose }: { file: Attachment; onClose: () => void }) {
  const authUrl = `/api/todos/file/${file.key}`;
  const isImage = file.type.startsWith('image/');
  const isPdf   = file.type === 'application/pdf';
  const isOffice = OFFICE_TYPES.has(file.type);
  const isText  = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.md');

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isImage);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isImage) return;
    let objectUrl = '';
    (async () => {
      try {
        const res = await fetch(authUrl, { credentials: 'include' });
        if (!res.ok) throw new Error('Lỗi tải file');
        if (isText) {
          setTextContent(await res.text());
        } else {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch (e: any) {
        setErr(e.message ?? 'Không thể tải file');
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [authUrl, isImage, isText]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400 shrink-0">{fileIcon(file.type)}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{file.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{fmtSize(file.size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Tải về dùng blob URL nếu có, nếu không dùng auth URL */}
            <a href={blobUrl ?? authUrl} download={file.name}
              className="text-xs text-indigo-600 hover:underline px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
              Tải về
            </a>
            <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden rounded-b-2xl bg-gray-50 min-h-0">
          {/* Ảnh — dùng trực tiếp URL (cookie auth) */}
          {isImage && (
            <div className="h-full flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={authUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-xl shadow" />
            </div>
          )}

          {/* Loading spinner */}
          {!isImage && loading && (
            <div className="h-full flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Lỗi */}
          {err && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
              <File className="h-14 w-14 text-gray-300" />
              <p className="text-red-500 text-sm">{err}</p>
            </div>
          )}

          {/* PDF — blob URL trong iframe (browser PDF viewer) */}
          {isPdf && blobUrl && (
            <iframe src={blobUrl} className="w-full h-full border-0" title={file.name} />
          )}

          {/* Office — không thể xem trực tiếp trong browser, hiện download UI */}
          {isOffice && blobUrl && (
            <div className="h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="h-20 w-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <FileText className="h-10 w-10 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtSize(file.size)}</p>
              </div>
              <p className="text-xs text-gray-400 max-w-xs">
                Định dạng này cần ứng dụng hỗ trợ để xem. Nhấn tải về để mở bằng Word/Excel/PowerPoint.
              </p>
              <a href={blobUrl} download={file.name}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                <File className="h-4 w-4" />Tải về để xem
              </a>
            </div>
          )}

          {/* Text / Markdown */}
          {isText && textContent !== null && (
            <div className="h-full overflow-auto p-5">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {textContent}
              </pre>
            </div>
          )}

          {/* Định dạng khác */}
          {!isImage && !loading && !err && !isPdf && !isOffice && !isText && blobUrl && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <File className="h-16 w-16 text-gray-300" />
              <p className="text-gray-500 text-sm">Trình duyệt không hỗ trợ xem trực tiếp định dạng này.</p>
              <a href={blobUrl} download={file.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Tải về để xem
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attachment List (with inline preview) ────────────────────────────────────

function AttachmentList({ attachments, label }: { attachments: Attachment[]; label?: string }) {
  const [preview, setPreview] = useState<Attachment | null>(null);

  if (!attachments.length) return null;

  return (
    <>
      {label && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>}
      <div className="space-y-2">
        {attachments.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setPreview(f)}
            className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group text-left"
          >
            <span className="text-gray-400 group-hover:text-indigo-500 shrink-0">{fileIcon(f.type)}</span>
            <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-indigo-700">{f.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{fmtSize(f.size)}</span>
            <ZoomIn className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 shrink-0" />
          </button>
        ))}
      </div>
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

// ─── Attachment Upload ────────────────────────────────────────────────────────

function AttachmentUpload({ attachments, uploading, onFilePick, onRemove }: {
  attachments: Attachment[]; uploading: boolean;
  onFilePick: (files: FileList) => void; onRemove: (key: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); e.dataTransfer.files.length && onFilePick(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-1 cursor-pointer transition-colors
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
      >
        <Upload className={`h-5 w-5 ${dragging ? 'text-indigo-500' : 'text-gray-300'}`} />
        <p className="text-xs text-gray-500">{uploading ? 'Đang tải lên...' : 'Kéo thả hoặc click để chọn file'}</p>
        <p className="text-[10px] text-gray-400">PDF, Word, Excel, Ảnh... (tối đa 20 MB)</p>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={(e) => e.target.files && onFilePick(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.gif,.zip,.rar" />
      </div>
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((f) => (
            <div key={f.key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-400 shrink-0">{fileIcon(f.type)}</span>
              <span className="flex-1 text-xs text-gray-700 truncate">{f.name}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{fmtSize(f.size)}</span>
              <button type="button" onClick={() => onRemove(f.key)}
                className="h-5 w-5 shrink-0 rounded hover:bg-red-100 flex items-center justify-center">
                <X className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Links Section ────────────────────────────────────────────────────────────

function LinksSection({ links, onAdd, onRemove }: {
  links: string[]; onAdd: (url: string) => void; onRemove: (i: number) => void;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    let url = input.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); onAdd(url); setInput(''); setError(''); } catch { setError('URL không hợp lệ'); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder="https://example.com"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button type="button" onClick={handleAdd}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Thêm</button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {links.map((url, i) => (
        <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
          <Link2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-xs text-blue-600 truncate hover:underline">{url}</a>
          <button type="button" onClick={() => onRemove(i)}
            className="h-5 w-5 shrink-0 rounded hover:bg-red-100 flex items-center justify-center">
            <X className="h-3 w-3 text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Submit Result Modal ──────────────────────────────────────────────────────

function SubmitResultModal({ todo, onClose, onSubmitted, targetStatus = 'DONE', submitLabel }: {
  todo: Todo; onClose: () => void; onSubmitted: (updated: Todo) => void;
  targetStatus?: 'DONE' | 'WAITING_STUDENT';
  submitLabel?: string;
}) {
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const handleFilePick = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.upload<Attachment>('/todos/upload', fd);
        setAttachments((prev) => [...prev, result]);
      } catch (e: any) { setError(e?.message ?? 'Upload thất bại'); }
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<Todo>(`/todos/${todo.id}/status`, {
        status: targetStatus,
        resultNote: note.trim() || undefined,
        resultAttachments: attachments,
        resultLinks: links,
      });
      onSubmitted(updated);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nộp kết quả</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[320px]">{todo.title}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Result note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ghi chú kết quả <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Mô tả những gì bạn đã làm, kết quả đạt được..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Result attachments */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Paperclip className="h-3.5 w-3.5" />File kết quả <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <AttachmentUpload
              attachments={attachments}
              uploading={uploading}
              onFilePick={handleFilePick}
              onRemove={(key) => setAttachments((prev) => prev.filter((f) => f.key !== key))}
            />
            {/* Preview uploaded files inline */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((f) => (
                  <button key={f.key} type="button" onClick={() => setPreviewFile(f)}
                    className="w-full flex items-center gap-2 text-xs text-indigo-600 hover:underline px-1">
                    <ZoomIn className="h-3 w-3 shrink-0" />
                    <span className="truncate">Xem: {f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Result links */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Link2 className="h-3.5 w-3.5" />Link kết quả <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <LinksSection
              links={links}
              onAdd={(url) => setLinks((prev) => [...prev, url])}
              onRemove={(i) => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Đang lưu...' : uploading ? 'Đang upload...' : (submitLabel ?? 'Hoàn thành & Nộp')}
          </button>
        </div>
      </div>
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}

// ─── Result Detail Modal ──────────────────────────────────────────────────────

function ResultDetailModal({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-gray-900">Kết quả nộp</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[320px]">{todo.title}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {todo.assignedTo && (
              <span>Người nộp: <span className="font-semibold text-gray-700">{todo.assignedTo.name}</span></span>
            )}
            {todo.completedAt && (
              <span>Nộp lúc: <span className="font-semibold text-gray-700">{new Date(todo.completedAt).toLocaleString('vi-VN')}</span></span>
            )}
          </div>

          {/* Note */}
          {todo.resultNote ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ghi chú kết quả</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {todo.resultNote}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Không có ghi chú kết quả.</p>
          )}

          {/* Result attachments */}
          {todo.resultAttachments?.length > 0 && (
            <div>
              <AttachmentList attachments={todo.resultAttachments} label="File đính kèm" />
            </div>
          )}

          {/* Result links */}
          {todo.resultLinks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link kết quả</p>
              <div className="space-y-2">
                {todo.resultLinks.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-sm text-blue-600 truncate hover:underline">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!hasResult(todo) && (
            <p className="text-sm text-gray-400 italic text-center py-4">Chưa có kết quả được nộp.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discussion Panel ─────────────────────────────────────────────────────────

interface TodoComment {
  id: string;
  content: string;
  attachments: Attachment[];
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

function DiscussionPanel({ todoId, currentUserId }: { todoId: string; currentUserId: string }) {
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    try {
      const data = await api.get<TodoComment[]>(`/todos/${todoId}/comments`);
      setComments(data);
    } catch {}
    setLoading(false);
  }, [todoId]);

  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  const handleFilePick = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.upload<Attachment>('/todos/upload', fd);
        setAttachments((prev) => [...prev, result]);
      } catch {}
    }
    setUploading(false);
  };

  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      const comment = await api.post<TodoComment>(`/todos/${todoId}/comments`, {
        content: text.trim() || '📎',
        attachments,
      });
      setComments((prev) => [...prev, comment]);
      setText('');
      setAttachments([]);
    } catch {}
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/todos/${todoId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Chưa có bình luận nào</p>
            <p className="text-xs text-gray-300 mt-1">Hãy bắt đầu cuộc thảo luận!</p>
          </div>
        ) : (
          comments.map((c) => {
            const isMine = c.user.id === currentUserId;
            return (
              <div key={c.id} className={`flex gap-2.5 group ${isMine ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5
                  ${isMine ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                  {c.user.avatarUrl
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={c.user.avatarUrl} alt={c.user.name} className="h-7 w-7 rounded-full object-cover" />
                    : c.user.name.charAt(0).toUpperCase()}
                </div>

                <div className={`flex-1 min-w-0 ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-semibold text-gray-700">{isMine ? 'Bạn' : c.user.name}</span>
                    <span className="text-[10px] text-gray-400">{fmtTime(c.createdAt)}</span>
                  </div>

                  {/* Bubble */}
                  <div className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                    ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {c.content !== '📎' && <p className="whitespace-pre-wrap break-words">{c.content}</p>}

                    {/* Attachments inside bubble */}
                    {c.attachments?.length > 0 && (
                      <div className={`mt-2 space-y-1.5 ${c.content !== '📎' ? 'pt-2 border-t border-white/20' : ''}`}>
                        {c.attachments.map((f) => (
                          <button key={f.key} type="button" onClick={() => setPreview(f)}
                            className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:opacity-80 transition-opacity
                              ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-white border border-gray-200'}`}>
                            <span className={isMine ? 'text-white/80' : 'text-gray-400'}>{fileIcon(f.type)}</span>
                            <span className={`text-xs truncate flex-1 font-medium ${isMine ? 'text-white' : 'text-gray-700'}`}>{f.name}</span>
                            <span className={`text-[10px] shrink-0 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{fmtSize(f.size)}</span>
                            <ZoomIn className={`h-3 w-3 shrink-0 ${isMine ? 'text-white/50' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  {isMine && (
                    <button onClick={() => handleDelete(c.id)}
                      className="text-[10px] text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 px-1">
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-2">
          {attachments.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
              <span className="text-indigo-500">{fileIcon(f.type)}</span>
              <span className="text-xs text-indigo-700 max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((a) => a.key !== f.key))}
                className="h-4 w-4 rounded hover:bg-red-100 flex items-center justify-center">
                <X className="h-2.5 w-2.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Nhập bình luận... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={1}
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: '100px', overflowY: 'auto' }}
            />
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50">
            {uploading
              ? <div className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              : <Paperclip className="h-4 w-4 text-gray-500" />}
          </button>
          <button onClick={handleSend} disabled={sending || uploading || (!text.trim() && attachments.length === 0)}
            className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50">
            <SendHorizonal className="h-4 w-4 text-white" />
          </button>
        </div>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={(e) => e.target.files && handleFilePick(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.gif,.zip,.rar" />
      </div>

      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function FormModal({ editing, isTeacher, assignees, onClose, onSaved }: {
  editing?: Todo | null; isTeacher: boolean; assignees: Assignee[];
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    priority: editing?.priority ?? 0,
    dueDate: editing?.dueDate ? new Date(editing.dueDate).toISOString().slice(0, 10) : '',
    assignedToId: editing?.assignedTo?.id ?? '',
  });
  const [attachments, setAttachments] = useState<Attachment[]>(editing?.attachments ?? []);
  const [links, setLinks] = useState<string[]>(editing?.links ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleFilePick = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.upload<Attachment>('/todos/upload', fd);
        setAttachments((prev) => [...prev, result]);
      } catch (e: any) { setError(e?.message ?? 'Upload thất bại'); }
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: any = {
        title: form.title,
        description: form.description || undefined,
        priority: Number(form.priority),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        assignedToId: form.assignedToId || undefined,
        attachments,
        links,
      };
      if (editing) {
        if (!form.dueDate) body.dueDate = null;
        if (!form.assignedToId) body.assignedToId = null;
        await api.patch(`/todos/${editing.id}`, body);
      } else {
        await api.post('/todos', body);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{editing ? 'Chỉnh sửa task' : 'Thêm task mới'}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tiêu đề *</label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Nhập tiêu đề task..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mô tả <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              placeholder="Mô tả chi tiết..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Độ ưu tiên</label>
              <select value={form.priority} onChange={(e) => set('priority', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value={0}>Thấp</option>
                <option value={1}>Trung bình</option>
                <option value={2}>Cao</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hạn chót</label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {assignees.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {isTeacher ? 'Giao cho học viên' : 'Gửi cho thầy/cô'}
                {' '}<span className="text-gray-400 font-normal">(tuỳ chọn)</span>
              </label>
              <select value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{isTeacher ? '-- Không giao --' : '-- Tự làm --'}</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Paperclip className="h-3.5 w-3.5" />File đính kèm
            </label>
            <AttachmentUpload attachments={attachments} uploading={uploading} onFilePick={handleFilePick}
              onRemove={(key) => setAttachments((prev) => prev.filter((f) => f.key !== key))} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Link2 className="h-3.5 w-3.5" />Link tham khảo
            </label>
            <LinksSection links={links}
              onAdd={(url) => setLinks((prev) => [...prev, url])}
              onRemove={(i) => setLinks((prev) => prev.filter((_, idx) => idx !== i))} />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Hủy</button>
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Đang lưu...' : uploading ? 'Đang upload...' : editing ? 'Cập nhật' : 'Tạo task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({ todo, userId, isTeacher, onClose, onEdit, onSubmitResult, onViewResult, onAccept }: {
  todo: Todo; userId: string; isTeacher: boolean;
  onClose: () => void;
  onEdit: (t: Todo) => void;
  onSubmitResult: (t: Todo) => void;
  onViewResult: (t: Todo) => void;
  onAccept: (t: Todo) => void;
}) {
  const [tab, setTab] = useState<'content' | 'discussion'>('content');
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const canEdit = isTeacher || todo.createdBy.id === userId;
  const isAssignee = todo.assignedTo?.id === userId;
  const isCreatorUser = todo.createdBy.id === userId;
  // Cùng logic với KanbanCard
  const showAssigneeAcceptBtn = isAssignee && !isCreatorUser && (
    todo.status === 'NEW' ||
    (todo.status === 'WAITING_STUDENT' && !todo.assigneeConfirmed && !hasResult(todo))
  );
  const isActuallyWorking = isAssignee && !isCreatorUser && todo.assigneeConfirmed && !hasResult(todo) &&
    (todo.status === 'IN_PROGRESS' || todo.status === 'WAITING_STUDENT');
  const showSubmitBtn = !isTeacher && isActuallyWorking;
  const showTeacherSubmitBtn = isTeacher && isAssignee && isActuallyWorking;
  const showConfirmDoneBtn = isCreatorUser && !isAssignee && todo.status === 'WAITING_STUDENT' && hasResult(todo);
  const showResultBadge = (todo.status === 'DONE' || (todo.status === 'WAITING_STUDENT' && isCreatorUser && !isAssignee && hasResult(todo))) && hasResult(todo);
  const overdue = isOverdue(todo.dueDate, todo.status);

  const images = todo.attachments.filter((f) => f.type.startsWith('image/'));
  const docs = todo.attachments.filter((f) => !f.type.startsWith('image/'));
  const col = COLUMNS.find((c) => c.status === todo.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100 shrink-0 gap-3">
          <div className="flex-1 min-w-0">
            {col && (
              <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${col.bg} ${col.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                {col.label}
              </div>
            )}
            <h2 className="text-base font-bold text-gray-900 leading-snug">{todo.title}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-400">
              <span>Bởi: <span className="text-gray-600 font-medium">{todo.createdBy.name}</span></span>
              {todo.assignedTo && <span>→ <span className="text-gray-600 font-medium">{todo.assignedTo.name}</span></span>}
              {todo.dueDate && (
                <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                  {overdue ? 'Quá hạn · ' : 'Hạn: '}{fmtDate(todo.dueDate)}
                </span>
              )}
              <span className={PRIORITY_COLOR[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button onClick={() => { onClose(); onEdit(todo); }}
                className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
                <Edit2 className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-gray-100 px-6">
          {([
            { key: 'content', label: 'Nội dung', icon: ChevronRight },
            { key: 'discussion', label: 'Thảo luận', icon: MessageCircle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-1 py-3 text-sm font-semibold border-b-2 mr-6 transition-colors
                ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'content' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {todo.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mô tả</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{todo.description}</p>
              </div>
            )}
            {images.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hình ảnh đính kèm</p>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((f) => (
                    <button key={f.key} type="button" onClick={() => setPreviewFile(f)}
                      className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 hover:ring-2 hover:ring-indigo-400 transition-all group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/todos/file/${f.key}`} alt={f.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {docs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">File đính kèm</p>
                <AttachmentList attachments={docs} />
              </div>
            )}
            {todo.links.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Link tham khảo</p>
                <div className="space-y-2">
                  {todo.links.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 hover:bg-blue-100 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm text-blue-600 truncate">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {!todo.description && images.length === 0 && docs.length === 0 && todo.links.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4">Không có nội dung đính kèm.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <DiscussionPanel todoId={todo.id} currentUserId={userId} />
          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-2">
          {showResultBadge && (
            <button onClick={() => { onClose(); onViewResult(todo); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 hover:bg-emerald-100 transition-colors">
              <Eye className="h-4 w-4" />{todo.status === 'WAITING_STUDENT' ? 'Xem kết quả gửi về' : 'Xem kết quả đã nộp'}
            </button>
          )}
          {showAssigneeAcceptBtn && (
            <button onClick={() => { onClose(); onAccept(todo); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-yellow-500 rounded-xl py-2.5 hover:bg-yellow-600 transition-colors">
              <UserCheck className="h-4 w-4" />Xác nhận nhận việc
            </button>
          )}
          {showSubmitBtn && (
            <button onClick={() => { onClose(); onSubmitResult(todo); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl py-2.5 hover:bg-emerald-700 transition-colors">
              <SendHorizonal className="h-4 w-4" />Nộp kết quả & Hoàn thành
            </button>
          )}
          {showTeacherSubmitBtn && (
            <button onClick={() => { onClose(); onSubmitResult(todo); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl py-2.5 hover:bg-indigo-700 transition-colors">
              <SendHorizonal className="h-4 w-4" />Gửi kết quả về
            </button>
          )}
          {showConfirmDoneBtn && (
            <button onClick={() => { onClose(); onAccept(todo); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl py-2.5 hover:bg-emerald-700 transition-colors">
              <CheckCircle2 className="h-4 w-4" />Xác nhận hoàn thành
            </button>
          )}
          <button onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
            Đóng
          </button>
        </div>
      </div>
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}

// ─── Kanban Task Card ─────────────────────────────────────────────────────────

function KanbanCard({ todo, userId, isTeacher, onEdit, onDelete, onDragStart, onSubmitResult, onViewResult, onAccept }: {
  todo: Todo; userId: string; isTeacher: boolean;
  onEdit: (t: Todo) => void; onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSubmitResult: (t: Todo) => void;
  onViewResult: (t: Todo) => void;
  onAccept: (t: Todo) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const overdue = isOverdue(todo.dueDate, todo.status);
  const canEdit = isTeacher || todo.createdBy.id === userId;
  const canDelete = isTeacher;
  const isAssignee = todo.assignedTo?.id === userId;
  const isCreator = todo.createdBy.id === userId;

  // Bên nhận xác nhận: status=NEW HOẶC WAITING_STUDENT chưa confirm (task cũ)
  const showAssigneeAcceptBtn = isAssignee && !isCreator && (
    todo.status === 'NEW' ||
    (todo.status === 'WAITING_STUDENT' && !todo.assigneeConfirmed && !hasResult(todo))
  );
  // Đang làm thực tế: IN_PROGRESS hoặc WAITING_STUDENT đã confirm (role-based display)
  const isActuallyWorking = isAssignee && !isCreator && todo.assigneeConfirmed && !hasResult(todo) &&
    (todo.status === 'IN_PROGRESS' || todo.status === 'WAITING_STUDENT');
  // Nộp kết quả
  const showSubmitBtn = !isTeacher && isActuallyWorking;
  const showTeacherSubmitBtn = isTeacher && isAssignee && isActuallyWorking;
  // Xác nhận hoàn thành: creator thấy result từ assignee
  const showConfirmDoneBtn = isCreator && !isAssignee && todo.status === 'WAITING_STUDENT' && hasResult(todo);

  const showResultBadge = (todo.status === 'DONE' || (todo.status === 'WAITING_STUDENT' && isCreator && !isAssignee && hasResult(todo))) && hasResult(todo);

  const images = todo.attachments.filter((f) => f.type.startsWith('image/'));
  const docs = todo.attachments.filter((f) => !f.type.startsWith('image/'));

  return (
    <>
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, todo.id); }}
      onClick={() => setShowDetail(true)}
      className={`bg-white rounded-xl border p-3 cursor-pointer shadow-sm hover:shadow-md transition-all group
        ${overdue ? 'border-red-200' : 'border-gray-100'}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          {/* Title + actions */}
          <div className="flex items-start justify-between gap-1">
            <p className="flex-1 text-left text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {todo.title}
            </p>
            {(canEdit || canDelete) && (
              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit(todo); }}
                    className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                    <Edit2 className="h-3 w-3 text-gray-400" />
                  </button>
                )}
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
                    className="h-6 w-6 rounded-lg hover:bg-red-50 flex items-center justify-center">
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {todo.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{todo.description}</p>
          )}

          {/* Image thumbnails */}
          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-1">
              {images.slice(0, 3).map((f, idx) => (
                <div key={f.key} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group/img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/todos/file/${f.key}`}
                    alt={f.name}
                    className="w-full h-full object-cover"
                  />
                  {idx === 2 && images.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="mt-2 space-y-1">
            {todo.dueDate && (
              <div className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {overdue ? 'Quá hạn · ' : ''}{fmtDate(todo.dueDate)}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px]">
              <Flag className={`h-2.5 w-2.5 ${PRIORITY_COLOR[todo.priority]}`} />
              <span className={PRIORITY_COLOR[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</span>
            </div>
            {todo.assignedTo && (
              <div className="text-[11px] text-gray-400 truncate">→ {todo.assignedTo.name}</div>
            )}
            {isTeacher && todo.createdBy.id !== userId && (
              <div className="text-[11px] text-gray-400 truncate">bởi {todo.createdBy.name}</div>
            )}
          </div>

          {/* Doc file cards — hiển thị trực tiếp trên card */}
          {docs.length > 0 && (
            <div className="mt-2 space-y-1">
              {docs.slice(0, 2).map((f) => {
                const ext = f.name.split('.').pop()?.toUpperCase() ?? 'FILE';
                const colorMap: Record<string, string> = {
                  PDF: 'bg-red-50 border-red-200 text-red-600',
                  DOCX: 'bg-blue-50 border-blue-200 text-blue-600',
                  DOC: 'bg-blue-50 border-blue-200 text-blue-600',
                  XLSX: 'bg-green-50 border-green-200 text-green-600',
                  XLS: 'bg-green-50 border-green-200 text-green-600',
                  PPTX: 'bg-orange-50 border-orange-200 text-orange-600',
                  PPT: 'bg-orange-50 border-orange-200 text-orange-600',
                  MD: 'bg-purple-50 border-purple-200 text-purple-600',
                  TXT: 'bg-gray-50 border-gray-200 text-gray-500',
                };
                const colorCls = colorMap[ext] ?? 'bg-gray-50 border-gray-200 text-gray-500';
                return (
                  <button key={f.key} type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full flex items-center gap-2 border rounded-lg px-2 py-1.5 text-left hover:opacity-80 transition-opacity ${colorCls}`}>
                    <span className="text-[9px] font-black shrink-0 w-7 text-center">{ext}</span>
                    <span className="text-[10px] font-medium truncate flex-1">{f.name.replace(`.${f.name.split('.').pop()}`, '')}</span>
                    <span className="text-[9px] shrink-0 opacity-60">{fmtSize(f.size)}</span>
                  </button>
                );
              })}
              {docs.length > 2 && (
                <button type="button" onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-gray-400 hover:text-indigo-500 transition-colors px-1">
                  +{docs.length - 2} file khác...
                </button>
              )}
            </div>
          )}

          {/* Links summary */}
          {todo.links.length > 0 && (
            <div className="mt-1">
              <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                <Link2 className="h-2.5 w-2.5" />{todo.links.length} link tham khảo
              </span>
            </div>
          )}

          {/* Kết quả badge */}
          {showResultBadge && (
            <button onClick={(e) => { e.stopPropagation(); onViewResult(todo); }}
              className="mt-2 w-full flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 hover:bg-emerald-100 transition-colors">
              <Eye className="h-3 w-3 shrink-0" />
              {todo.status === 'WAITING_STUDENT' ? 'Xem kết quả gửi về' : 'Xem kết quả đã nộp'}
            </button>
          )}

          {/* Bên nhận xác nhận */}
          {showAssigneeAcceptBtn && (
            <button onClick={(e) => { e.stopPropagation(); onAccept(todo); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-yellow-500 rounded-lg px-2 py-1.5 hover:bg-yellow-600 transition-colors">
              <UserCheck className="h-3 w-3 shrink-0" />Xác nhận nhận việc
            </button>
          )}

          {/* Nộp kết quả */}
          {showSubmitBtn && (
            <button onClick={(e) => { e.stopPropagation(); onSubmitResult(todo); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-emerald-600 rounded-lg px-2 py-1.5 hover:bg-emerald-700 transition-colors">
              <SendHorizonal className="h-3 w-3 shrink-0" />Nộp kết quả & Hoàn thành
            </button>
          )}
          {showTeacherSubmitBtn && (
            <button onClick={(e) => { e.stopPropagation(); onSubmitResult(todo); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-indigo-600 rounded-lg px-2 py-1.5 hover:bg-indigo-700 transition-colors">
              <SendHorizonal className="h-3 w-3 shrink-0" />Gửi kết quả về
            </button>
          )}

          {/* Xác nhận hoàn thành */}
          {showConfirmDoneBtn && (
            <button onClick={(e) => { e.stopPropagation(); onAccept(todo); }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-emerald-600 rounded-lg px-2 py-1.5 hover:bg-emerald-700 transition-colors">
              <CheckCircle2 className="h-3 w-3 shrink-0" />Xác nhận hoàn thành
            </button>
          )}
        </div>
      </div>
    </div>

    {showDetail && (
      <TaskDetailModal
        todo={todo}
        userId={userId}
        isTeacher={isTeacher}
        onClose={() => setShowDetail(false)}
        onEdit={onEdit}
        onSubmitResult={onSubmitResult}
        onViewResult={onViewResult}
        onAccept={onAccept}
      />
    )}
    </>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, todos, userId, isTeacher, dragOverCol, onDragOver, onDrop, onEdit, onDelete, onDragStart, onSubmitResult, onViewResult, onAccept }: {
  col: typeof COLUMNS[0];
  todos: Todo[];
  userId: string;
  isTeacher: boolean;
  dragOverCol: TodoStatus | null;
  onDragOver: (e: React.DragEvent, status: TodoStatus) => void;
  onDrop: (e: React.DragEvent, status: TodoStatus) => void;
  onEdit: (t: Todo) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onSubmitResult: (t: Todo) => void;
  onViewResult: (t: Todo) => void;
  onAccept: (t: Todo) => void;
}) {
  const isOver = dragOverCol === col.status;

  return (
    <div
      onDragOver={(e) => onDragOver(e, col.status)}
      onDrop={(e) => onDrop(e, col.status)}
      className={`flex flex-col rounded-2xl border transition-all min-w-0
        ${isOver ? `${col.bg} ${col.border} border-2 shadow-md` : 'bg-gray-50 border-gray-200'}`}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${isOver ? col.bg : 'bg-white'} border-b ${col.border}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
          <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color}`}>
          {todos.length}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-2.5 min-h-[120px]">
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs font-medium" style={{ color: '#BDBDBD' }}>Chưa có todo</p>
          </div>
        ) : (
          todos.map((todo) => (
            <KanbanCard key={todo.id} todo={todo} userId={userId} isTeacher={isTeacher}
              onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart}
              onSubmitResult={onSubmitResult} onViewResult={onViewResult} onAccept={onAccept} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, overdue: 0, today: 0, done7d: 0, done: 0 });
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  // Submit result modal
  const [submitResultTodo, setSubmitResultTodo] = useState<Todo | null>(null);
  const [submitResultTarget, setSubmitResultTarget] = useState<'DONE' | 'WAITING_STUDENT'>('DONE');
  const [submitResultLabel, setSubmitResultLabel] = useState<string>('Hoàn thành & Nộp');
  // View result modal
  const [viewResultTodo, setViewResultTodo] = useState<Todo | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TodoStatus | null>(null);

  const loadStats = useCallback(async () => {
    try { setStats(await api.get<Stats>('/todos/stats')); } catch {}
  }, []);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const data = await api.get<Todo[]>(`/todos?${params}`);
      setTodos(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadStats();
    // Cả teacher lẫn student đều load assignees (teacher → ds student, student → ds teacher)
    api.get<Assignee[]>('/todos/assignees').then(setAssignees).catch(() => {});
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadTodos, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadTodos, search]);

  const onSaved = () => { loadTodos(); loadStats(); };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa task này?')) return;
    try { await api.delete(`/todos/${id}`); await Promise.all([loadTodos(), loadStats()]); } catch {}
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  };

  const handleDrop = async (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggingId) return;
    const todo = todos.find((t) => t.id === draggingId);
    if (!todo || todo.status === status) { setDraggingId(null); return; }

    setDraggingId(null);

    const isAssigneeDrag = todo.assignedTo?.id === user?.id;
    const isCreatorDrag = todo.createdBy.id === user?.id;

    // Assignee kéo sang DONE → mở submit result
    if (status === 'DONE' && !isTeacher && isAssigneeDrag && !isCreatorDrag) {
      setSubmitResultTodo(todo);
      return;
    }
    // Assignee không được kéo sang IN_PROGRESS (phải để creator bắt đầu)
    if (status === 'IN_PROGRESS' && !isTeacher && isAssigneeDrag && !isCreatorDrag) {
      return;
    }

    // Optimistic update
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, status } : t));
    try {
      await api.patch(`/todos/${todo.id}/status`, { status });
      loadStats();
    } catch {
      loadTodos();
    }
  };

  const handleResultSubmitted = (updated: Todo) => {
    setTodos((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    loadStats();
  };

  const handleAccept = async (todo: Todo) => {
    const uid = user?.id ?? '';
    const isCreatorUser = todo.createdBy.id === uid;
    const isAssigneeUser = todo.assignedTo?.id === uid;

    // Bước 1: Assignee xác nhận nhận việc
    // - NEW → WAITING_STUDENT (task mới)
    // - WAITING_STUDENT + !assigneeConfirmed → chỉ set assigneeConfirmed=true (task cũ)
    if (isAssigneeUser && !isCreatorUser && (
      todo.status === 'NEW' ||
      (todo.status === 'WAITING_STUDENT' && !todo.assigneeConfirmed && !hasResult(todo))
    )) {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? {
        ...t,
        status: 'WAITING_STUDENT',
        assigneeConfirmed: true,
      } : t));
      try {
        await api.patch(`/todos/${todo.id}/status`, { status: 'WAITING_STUDENT' });
        loadStats();
      } catch { loadTodos(); }
      return;
    }

    // Bước 2: Creator xác nhận hoàn thành (WAITING_STUDENT có result → DONE)
    if (isCreatorUser && !isAssigneeUser && todo.status === 'WAITING_STUDENT' && hasResult(todo)) {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, status: 'DONE', completedAt: new Date().toISOString() } : t));
      try {
        await api.patch(`/todos/${todo.id}/status`, { status: 'DONE' });
        loadStats();
      } catch { loadTodos(); }
    }
  };

  // Role-based column: assignee thấy task đã xác nhận (WAITING_STUDENT + assigneeConfirmed + !result) ở cột "Đang làm"
  const byStatus = (status: TodoStatus) => {
    const uid = user?.id ?? '';
    return todos.filter((t) => {
      const iAmAssignee = t.assignedTo?.id === uid && t.createdBy.id !== uid;
      const confirmedWorking = iAmAssignee && t.status === 'WAITING_STUDENT' && t.assigneeConfirmed && !hasResult(t);
      if (confirmedWorking) return status === 'IN_PROGRESS'; // assignee thấy ở "Đang làm"
      return t.status === status;
    });
  };
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Hero ── */}
      <div className="px-4 sm:px-6 py-6 sm:py-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}>
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />Todo của tôi
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {stats.total} task · {stats.overdue > 0 ? `${stats.overdue} quá hạn` : 'Không có task quá hạn'}
            </p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm shrink-0">
            <Plus className="h-4 w-4" />Thêm task
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng', value: stats.total, color: 'text-indigo-600', bg: 'bg-indigo-50', Icon: ClipboardList },
            { label: 'Quá hạn', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50', Icon: AlertCircle },
            { label: 'Hôm nay', value: stats.today, color: 'text-amber-600', bg: 'bg-amber-50', Icon: Clock },
            { label: 'Done 7D', value: stats.done7d, color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle2 },
          ].map(({ label, value, color, bg, Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Progress ── */}
        {stats.total > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700 shrink-0">Tiến độ</span>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-sm font-bold text-indigo-600 shrink-0">{stats.done}/{stats.total}</span>
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề, mô tả..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>

        {/* ── Workflow Guide ── */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Luồng xử lý task</p>
          <div className="flex items-center flex-wrap gap-y-2">
            {[
              { step: '1', label: 'Giao việc → hiện ở', sub: 'Mới', dot: 'bg-blue-500', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              { step: '2', label: 'Bên nhận bấm', sub: 'Xác nhận nhận việc', dot: 'bg-yellow-500', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
              { step: '3', label: 'Bên giao bấm', sub: 'Bắt đầu làm việc', dot: 'bg-orange-500', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
              { step: '4', label: 'Làm xong bấm', sub: 'Nộp kết quả', dot: 'bg-emerald-500', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            ].map((s, i, arr) => (
              <div key={s.step} className="flex items-center">
                <div className={`flex items-center gap-2.5 border rounded-xl px-3 py-2 ${s.bg}`}>
                  <span className={`h-5 w-5 rounded-full ${s.dot} flex items-center justify-center text-[10px] font-black text-white shrink-0`}>
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs text-gray-600 leading-tight">{s.label}</p>
                    <p className={`text-xs font-bold ${s.color}`}>"{s.sub}"</p>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <svg className="h-4 w-8 text-gray-300 shrink-0" viewBox="0 0 32 16" fill="none">
                    <path d="M0 8h28M22 2l8 6-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Kanban Board ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                col={col}
                todos={byStatus(col.status)}
                userId={user?.id ?? ''}
                isTeacher={isTeacher}
                dragOverCol={dragOverCol}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onEdit={(t) => { setEditing(t); setShowForm(true); }}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onSubmitResult={(t) => {
                  const isTeacherAssignee = isTeacher && t.assignedTo?.id === user?.id;
                  setSubmitResultTarget(isTeacherAssignee ? 'WAITING_STUDENT' : 'DONE');
                  setSubmitResultLabel(isTeacherAssignee ? 'Gửi kết quả về cho học viên' : 'Hoàn thành & Nộp');
                  setSubmitResultTodo(t);
                }}
                onViewResult={(t) => setViewResultTodo(t)}
                onAccept={handleAccept}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Add Button ── */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 h-14 w-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40"
        title="Thêm task mới"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showForm && (
        <FormModal editing={editing} isTeacher={isTeacher} assignees={assignees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onSaved} />
      )}

      {submitResultTodo && (
        <SubmitResultModal
          todo={submitResultTodo}
          onClose={() => setSubmitResultTodo(null)}
          onSubmitted={handleResultSubmitted}
          targetStatus={submitResultTarget}
          submitLabel={submitResultLabel}
        />
      )}

      {viewResultTodo && (
        <ResultDetailModal
          todo={viewResultTodo}
          onClose={() => setViewResultTodo(null)}
        />
      )}
    </div>
  );
}
