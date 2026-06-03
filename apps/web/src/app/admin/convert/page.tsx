'use client';

import { useCallback, useRef, useState } from 'react';
import {
  FileText, Upload, Copy, Download, CheckCircle2, XCircle,
  Loader2, RefreshCw, FileType2, Eye, Code2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvertResult {
  markdown: string;
  filename: string;
  format: string;
  chars: number;
  lines: number;
}

const FORMAT_ICONS: Record<string, string> = {
  '.docx': '📝', '.doc': '📝',
  '.pdf': '📄',
  '.xlsx': '📊', '.xls': '📊', '.csv': '📊',
  '.html': '🌐', '.htm': '🌐',
  '.txt': '📃', '.md': '📃',
};

const SUPPORTED = [
  { ext: '.pdf',  label: 'PDF' },
  { ext: '.docx', label: 'Word' },
  { ext: '.xlsx', label: 'Excel' },
  { ext: '.csv',  label: 'CSV' },
  { ext: '.html', label: 'HTML' },
  { ext: '.txt',  label: 'Text' },
  { ext: '.md',   label: 'Markdown' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConvertPage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'preview'>('raw');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = api.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/convert/file', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Lỗi ${res.status}`);
        return;
      }
      setResult(json);
    } catch (e: any) {
      setError(e.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) convert(file);
  }, [convert]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { convert(file); e.target.value = ''; }
  };

  const copyMarkdown = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const base = result.filename.replace(/\.[^.]+$/, '');
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${base}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  // Simple markdown → HTML preview (basic only)
  const previewHtml = result?.markdown
    .replace(/^#{1,6} (.+)$/gm, (_, text, offset, str) => {
      const level = (str.slice(offset).match(/^#+/)![0].length);
      const sizes = ['', 'text-2xl font-bold', 'text-xl font-bold', 'text-lg font-semibold', 'text-base font-semibold', 'text-sm font-semibold', 'text-xs font-semibold'];
      return `<div class="${sizes[level] || 'font-semibold'} mt-4 mb-1">${text}</div>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^\| .+/gm, line => `<div class="font-mono text-xs overflow-x-auto">${line}</div>`)
    .replace(/^> (.+)/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 text-gray-600 italic">$1</blockquote>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileType2 className="h-6 w-6 text-primary" />
          Chuyển đổi file sang Markdown
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Hỗ trợ PDF, Word, Excel, CSV, HTML và văn bản thuần
        </p>
      </div>

      {/* Supported formats */}
      <div className="flex flex-wrap gap-2">
        {SUPPORTED.map(f => (
          <span key={f.ext} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {FORMAT_ICONS[f.ext]}{f.label}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
          'transition-all cursor-pointer py-14 px-6 text-center',
          dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50',
          loading && 'pointer-events-none opacity-60',
        )}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange}
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.html,.htm,.txt,.md" />

        {loading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-600">Đang chuyển đổi…</p>
          </>
        ) : (
          <>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {dragging ? 'Thả file vào đây' : 'Kéo & thả file hoặc nhấn để chọn'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF · DOCX · XLSX · CSV · HTML · TXT · MD
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm font-semibold truncate">{result.filename}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {result.format} · {result.lines.toLocaleString()} dòng · {result.chars.toLocaleString()} ký tự
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button onClick={() => setViewMode('raw')}
                  className={cn('flex items-center gap-1 px-2.5 py-1.5 transition-colors',
                    viewMode === 'raw' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50')}>
                  <Code2 className="h-3.5 w-3.5" />Raw
                </button>
                <button onClick={() => setViewMode('preview')}
                  className={cn('flex items-center gap-1 px-2.5 py-1.5 transition-colors',
                    viewMode === 'preview' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50')}>
                  <Eye className="h-3.5 w-3.5" />Preview
                </button>
              </div>
              <button onClick={copyMarkdown}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Đã copy' : 'Copy'}
              </button>
              <button onClick={downloadMarkdown}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <Download className="h-3.5 w-3.5" />Tải .md
              </button>
              <button onClick={() => { setResult(null); setError(''); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {viewMode === 'raw' ? (
              <textarea
                readOnly
                value={result.markdown}
                className="w-full h-96 font-mono text-xs text-gray-800 bg-gray-50 rounded-xl p-4 resize-none outline-none border border-gray-100 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
              />
            ) : (
              <div
                className="prose prose-sm max-w-none min-h-40 max-h-96 overflow-y-auto px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml || '' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {!result && !loading && !error && (
        <div className="text-center py-4 text-xs text-muted-foreground space-y-1">
          <p>Kéo file vào ô trên để bắt đầu chuyển đổi</p>
          <p className="font-medium">Dữ liệu không được lưu — chỉ xử lý trong bộ nhớ</p>
        </div>
      )}
    </div>
  );
}
