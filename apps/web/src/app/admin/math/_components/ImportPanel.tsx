'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Sparkles, ChevronDown, ChevronUp, ExternalLink,
  FileText, Trash2, FileSearch, RefreshCw, X,
  FileImage, File, CheckCircle2, AlertCircle, Clock, FileUp, Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SUBJECT_OPTIONS } from '@/constants/math';
import Link from 'next/link';
import { CopilotPanel } from '@/components/import/CopilotPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MathDoc {
  id: string;
  originalName: string;
  mimetype: string;
  size: number;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  grade?: string;
  subject?: string;
  errorMsg?: string;
  createdAt: string;
}

interface MathConcept { id: string; name: string; definition: string; formula?: string | null; example?: string | null }
interface ImportResultItem { topicId: string; title: string; conceptsCreated: number; exercisesGenerated: number; concepts: MathConcept[] }
interface ImportResult { imported: number; errors: { entry: string; error: string }[]; results: ImportResultItem[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPT = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp';

function fmtSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function DocIcon({ mimetype, size = 4 }: { mimetype: string; size?: number }) {
  const cls = `h-${size} w-${size} shrink-0`;
  if (mimetype.startsWith('image/')) return <FileImage className={cn(cls, 'text-pink-500')} />;
  if (mimetype === 'application/pdf') return <FileText className={cn(cls, 'text-red-500')} />;
  return <File className={cn(cls, 'text-blue-500')} />;
}

function StatusBadge({ status }: { status: MathDoc['status'] }) {
  if (status === 'analyzed') return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle2 className="h-2.5 w-2.5" />Đã phân tích
    </span>
  );
  if (status === 'analyzing') return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />Đang xử lý
    </span>
  );
  if (status === 'error') return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
      <AlertCircle className="h-2.5 w-2.5" />Lỗi
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
      <Clock className="h-2.5 w-2.5" />Chưa phân tích
    </span>
  );
}

// ─── Inline File Viewer ───────────────────────────────────────────────────────

function InlineViewer({ doc }: { doc: MathDoc }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const isPdf = doc.mimetype === 'application/pdf';
  const isImage = doc.mimetype.startsWith('image/');

  useEffect(() => {
    setLoading(true); setUrl(''); setText('');
    if (isPdf || isImage) {
      api.get<{ url: string }>(`/math/docs/${doc.id}/view-url`)
        .then((r) => { setUrl(r.url); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      api.get<{ text: string }>(`/math/docs/${doc.id}/text`)
        .then((r) => { setText(r.text || '(Tài liệu không có nội dung văn bản)'); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [doc.id, isPdf, isImage]);

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-2 text-blue-500">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Đang tải tài liệu...</span>
    </div>
  );

  if (isPdf && url) return (
    <iframe
      src={url}
      className="w-full h-full rounded-lg border-0"
      title={doc.originalName}
    />
  );

  if (isImage && url) return (
    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg p-4">
      <img src={url} alt={doc.originalName} className="max-w-full max-h-full object-contain rounded-lg shadow" />
    </div>
  );

  return (
    <pre className="w-full h-full overflow-auto text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-sans border border-gray-100">
      {text}
    </pre>
  );
}

// ─── Analyze Panel ────────────────────────────────────────────────────────────

function AnalyzePanel({ doc, onAnalyzed, onClose }: {
  doc: MathDoc; onAnalyzed: (r: ImportResult) => void; onClose: () => void;
}) {
  const [grade, setGrade] = useState(doc.grade || '');
  const [subject, setSubject] = useState(doc.subject || '');
  const [generateExercises, setGenerateExercises] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (subject) params.set('subject', subject);
      params.set('generateExercises', String(generateExercises));
      const res = await api.post<ImportResult>(`/math/docs/${doc.id}/analyze?${params}`, {});
      onAnalyzed(res);
    } catch (e: any) { setError(e.message || 'Phân tích thất bại'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">AI phân tích tài liệu</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 truncate">
          <FileText className="inline h-3 w-3 mr-1 text-gray-400" />{doc.originalName}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Môn học</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">AI tự phát hiện</option>
              {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lớp</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">AI tự phát hiện</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={String(g)}>Lớp {g}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={generateExercises} onChange={(e) => setGenerateExercises(e.target.checked)} className="rounded" />
          Tự động tạo bài tập sau khi phân tích
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-xl p-3">
            <Loader2 className="h-4 w-4 animate-spin" />AI đang phân tích... (15–60 giây)
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={run} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Đang xử lý...' : 'Bắt đầu phân tích'}
          </button>
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">Huỷ</button>
        </div>
      </div>
    </div>
  );
}

// ─── Result viewer ────────────────────────────────────────────────────────────

function TopicResult({ item }: { item: ImportResultItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-blue-200 bg-white overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-blue-900 truncate">{item.title}</span>
          <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{item.conceptsCreated} khái niệm</span>
          {item.exercisesGenerated > 0 && (
            <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{item.exercisesGenerated} bài tập</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/instructor/math/topic/${item.topicId}`} onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />Mở
          </Link>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {open && item.concepts.length > 0 && (
        <div className="border-t border-blue-100 divide-y divide-blue-50">
          {item.concepts.map((c) => (
            <div key={c.id} className="px-4 py-2.5 text-sm">
              <p className="font-medium text-gray-800">{c.name}</p>
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{c.definition}</p>
              {c.formula && <p className="text-xs text-blue-700 mt-1 font-mono bg-blue-50 rounded px-2 py-0.5 inline-block">{c.formula}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MathImportPanel({ onDone }: { onDone: (count: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<MathDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MathDoc | null>(null);
  const [analyzeDoc, setAnalyzeDoc] = useState<MathDoc | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<ImportResult | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'copilot'>('view');

  const loadDocs = useCallback(async () => {
    try {
      const list = await api.get<MathDoc[]>('/math/docs');
      setDocs(list);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const upload = async (file: File) => {
    setUploading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const doc = await api.upload<MathDoc>('/math/docs', fd);
      setDocs((prev) => [doc, ...prev]);
      setSelectedDoc(doc); setViewMode('view');
    } catch (e: any) { setUploadError(e.message || 'Upload thất bại'); }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  }, []);

  const handleDelete = async (doc: MathDoc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xóa "${doc.originalName}"?`)) return;
    try {
      await api.delete(`/math/docs/${doc.id}`);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch { }
  };

  const handleAnalyzed = (result: ImportResult) => {
    setDocs((prev) => prev.map((d) => d.id === analyzeDoc!.id ? { ...d, status: 'analyzed' } : d));
    if (selectedDoc?.id === analyzeDoc!.id) setSelectedDoc((d) => d ? { ...d, status: 'analyzed' } : d);
    setAnalyzeDoc(null);
    setAnalyzeResult(result);
    if (result.imported > 0) onDone(result.imported);
  };

  return (
    <div className="flex gap-4 h-[520px]">
      {/* ── Left: document list ── */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        {/* Upload zone */}
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer',
            uploading ? 'border-blue-400 bg-blue-50/50 cursor-not-allowed' :
              dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30',
          )}>
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600 py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Đang tải lên...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-1">
              <FileUp className="h-4 w-4" />
              <span className="text-xs font-medium">Tải lên tài liệu</span>
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">PDF, Word, Excel, PPT, ảnh · 30 MB</p>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </div>
        {uploadError && <p className="text-xs text-red-500 px-1">{uploadError}</p>}

        {/* List header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <FileSearch className="h-3.5 w-3.5" />
            <span>Tài liệu ({docs.length})</span>
          </div>
          <button onClick={loadDocs} className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">Chưa có tài liệu nào</div>
          ) : docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all group',
                selectedDoc?.id === doc.id
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30',
              )}>
              <DocIcon mimetype={doc.mimetype} size={4} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate leading-tight">{doc.originalName}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] text-gray-400">{fmtSize(doc.size)}</span>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(doc.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!doc.mimetype.startsWith('image/') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAnalyzeDoc(doc); }}
                    disabled={doc.status === 'analyzing'}
                    title="AI phân tích"
                    className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-purple-100 text-purple-500 disabled:opacity-40">
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(doc, e)}
                  title="Xóa"
                  className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* AI note */}
        <div className="flex items-start gap-1.5 bg-amber-50 rounded-xl p-2 text-[10px] text-amber-700">
          <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Nhấn <strong>✦</strong> để chạy AI phân tích. AI chỉ chạy khi bạn yêu cầu.</span>
        </div>
      </div>

      {/* ── Right: inline viewer ── */}
      <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
        {selectedDoc ? (
          <>
            {/* Viewer header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 shrink-0">
              <DocIcon mimetype={selectedDoc.mimetype} size={4} />
              <span className="text-sm font-medium text-gray-800 truncate flex-1">{selectedDoc.originalName}</span>
              <span className="text-xs text-gray-400 shrink-0">{fmtSize(selectedDoc.size)}</span>
              <StatusBadge status={selectedDoc.status} />
              {!selectedDoc.mimetype.startsWith('image/') && (
                <>
                  {/* View mode toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs shrink-0">
                    <button onClick={() => setViewMode('view')}
                      className={cn('px-2.5 py-1 transition-colors', viewMode === 'view' ? 'bg-gray-100 text-gray-700 font-medium' : 'text-gray-500 hover:bg-gray-50')}>
                      Xem
                    </button>
                    <button onClick={() => setViewMode('copilot')}
                      className={cn('flex items-center gap-1 px-2.5 py-1 transition-colors', viewMode === 'copilot' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50')}>
                      <Bot className="h-3 w-3" />Copilot
                    </button>
                  </div>
                  <button
                    onClick={() => setAnalyzeDoc(selectedDoc)}
                    disabled={selectedDoc.status === 'analyzing'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 shrink-0">
                    <Sparkles className="h-3 w-3" />AI phân tích
                  </button>
                </>
              )}
              <button onClick={() => setSelectedDoc(null)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Viewer body */}
            <div className="flex-1 overflow-hidden">
              {viewMode === 'view' ? (
                <div className="h-full p-2"><InlineViewer doc={selectedDoc} /></div>
              ) : (
                <CopilotPanel
                  textEndpoint={`/math/docs/${selectedDoc.id}/text`}
                  defaultGrade={selectedDoc.grade}
                  defaultSubject={selectedDoc.subject ? SUBJECT_OPTIONS.find(s => s.value === selectedDoc.subject)?.label : undefined}
                  accentClass="bg-blue-600"
                />
              )}
            </div>

            {/* Analysis result */}
            {analyzeResult && (
              <div className="shrink-0 border-t border-gray-200 bg-white p-3 max-h-48 overflow-y-auto space-y-2">
                <div className={cn('rounded-lg p-2.5 text-xs font-semibold',
                  analyzeResult.imported > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
                  {analyzeResult.imported > 0
                    ? `✓ AI đã tạo ${analyzeResult.imported} chủ đề`
                    : 'Phân tích thất bại'}
                  {analyzeResult.errors.map((e, i) => (
                    <p key={i} className="text-red-600 font-normal mt-0.5">✗ {e.entry}: {e.error}</p>
                  ))}
                </div>
                {analyzeResult.results.map((r) => <TopicResult key={r.topicId} item={r} />)}
                <button onClick={() => setAnalyzeResult(null)} className="text-xs text-blue-600 hover:underline">Đóng kết quả</button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileSearch className="h-8 w-8 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Chọn tài liệu để xem</p>
              <p className="text-xs mt-0.5">Hoặc tải lên tài liệu mới</p>
            </div>
          </div>
        )}
      </div>

      {/* Analyze modal */}
      {analyzeDoc && (
        <AnalyzePanel
          doc={analyzeDoc}
          onAnalyzed={handleAnalyzed}
          onClose={() => setAnalyzeDoc(null)}
        />
      )}
    </div>
  );
}
