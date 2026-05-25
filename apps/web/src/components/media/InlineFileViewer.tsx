'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, AlertCircle, Download } from 'lucide-react';

export interface ViewerItem {
  id: string;
  name: string;
  mimeType: string;
  type: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
}

const isPdf  = (m: string, n: string) => m === 'application/pdf' || n.toLowerCase().endsWith('.pdf');
const isText = (m: string, n: string) => m === 'text/plain' || n.toLowerCase().endsWith('.txt');
const isDocx = (m: string, n: string) =>
  m.includes('wordprocessingml') || n.toLowerCase().endsWith('.docx') || n.toLowerCase().endsWith('.doc');
const isXls  = (m: string, n: string) =>
  m.includes('spreadsheetml') || m.includes('ms-excel') ||
  n.toLowerCase().endsWith('.xlsx') || n.toLowerCase().endsWith('.xls');
const isPptx = (m: string, n: string) =>
  m.includes('presentationml') || m.includes('ms-powerpoint') ||
  n.toLowerCase().endsWith('.pptx') || n.toLowerCase().endsWith('.ppt');

// ─── Shared states ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
    </div>
  );
}

function ErrView({ fileUrl, name }: { fileUrl: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm">Không thể hiển thị tài liệu</p>
      <a href={fileUrl} download={name} className="text-xs text-indigo-600 underline">Tải xuống</a>
    </div>
  );
}

// ─── Per-type viewers ──────────────────────────────────────────────────────────

function PdfViewer({ fileUrl, name }: { fileUrl: string; name: string }) {
  return (
    <iframe
      src={fileUrl}
      className="w-full h-full border-0"
      title={name}
      style={{ display: 'block', minHeight: '100%' }}
    />
  );
}

function TextViewer({ fileUrl, name }: { fileUrl: string; name: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContent(null); setError(false);
    fetch(fileUrl)
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((t) => { if (!cancelled) setContent(t); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (error) return <ErrView fileUrl={fileUrl} name={name} />;
  if (content === null) return <Spinner />;
  return (
    <div className="h-full overflow-auto p-4 bg-white">
      <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
        {content || <span className="text-gray-400 italic">Tệp trống</span>}
      </pre>
    </div>
  );
}

function DocxViewer({ fileUrl, name }: { fileUrl: string; name: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null); setError(false);
    (async () => {
      try {
        const mammoth = await import('mammoth');
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        if (!cancelled) setHtml(result.value || '<p class="text-gray-400">Tài liệu trống</p>');
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (error) return <ErrView fileUrl={fileUrl} name={name} />;
  if (html === null) return <Spinner />;
  return (
    <div className="h-full overflow-auto p-5 bg-white">
      <div
        className="doc-viewer-word prose prose-sm max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function XlsxViewer({ fileUrl, name }: { fileUrl: string; name: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null); setError(false);
    (async () => {
      try {
        const XLSX = await import('xlsx');
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const sheetHtml = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
        if (!cancelled) setHtml(sheetHtml);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (error) return <ErrView fileUrl={fileUrl} name={name} />;
  if (html === null) return <Spinner />;
  return (
    <div className="h-full overflow-auto p-2 bg-white">
      <div className="doc-viewer-excel text-sm" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function PptxViewer({ fileUrl, name }: { fileUrl: string; name: string }) {
  const [officeUrl, setOfficeUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const abs = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
      setOfficeUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}`);
    }
  }, [fileUrl]);

  if (!officeUrl) return <Spinner />;
  return (
    <iframe
      key={officeUrl}
      src={officeUrl}
      className="w-full h-full border-0"
      title={name}
      style={{ display: 'block', minHeight: '100%' }}
    />
  );
}

function UnsupportedView({ fileUrl, name }: { fileUrl: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6 text-center">
      <FileText className="h-12 w-12 text-gray-300" />
      <div>
        <p className="text-sm font-medium text-gray-600">Không hỗ trợ xem trực tiếp</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{name}</p>
      </div>
      <div className="flex gap-2">
        <a href={fileUrl} download={name}
          className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
          <Download className="h-3.5 w-3.5" />Tải xuống
        </a>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
          Mở tab mới
        </a>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function InlineFileViewer({ item, fileUrl }: { item: ViewerItem; fileUrl: string }) {
  const { name, mimeType } = item;

  if (item.type === 'VIDEO') {
    return (
      <video
        src={fileUrl}
        controls
        className="w-full h-full bg-black"
        style={{ display: 'block', maxHeight: '100%' }}
      />
    );
  }

  if (item.type === 'IMAGE') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <img src={fileUrl} alt={name} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  // DOCUMENT — each sub-component has its own loading state; key forces remount on URL change
  if (isPdf(mimeType, name))  return <PdfViewer  key={fileUrl} fileUrl={fileUrl} name={name} />;
  if (isText(mimeType, name)) return <TextViewer  key={fileUrl} fileUrl={fileUrl} name={name} />;
  if (isDocx(mimeType, name)) return <DocxViewer  key={fileUrl} fileUrl={fileUrl} name={name} />;
  if (isXls(mimeType, name))  return <XlsxViewer  key={fileUrl} fileUrl={fileUrl} name={name} />;
  if (isPptx(mimeType, name)) return <PptxViewer  key={fileUrl} fileUrl={fileUrl} name={name} />;

  return <UnsupportedView fileUrl={fileUrl} name={name} />;
}
