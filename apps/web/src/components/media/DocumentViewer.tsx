'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Loader2, FileText, AlertCircle } from 'lucide-react';

interface Props {
  id: string;
  name: string;
  mimeType: string;
  fileUrl: string; // URL already includes ?token=...
  onClose: () => void;
}

type ViewState = 'loading' | 'loaded' | 'error' | 'unsupported';

function isDocx(mime: string, name: string) {
  return (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.toLowerCase().endsWith('.docx')
  );
}

function isExcel(mime: string, name: string) {
  return (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    name.toLowerCase().endsWith('.xlsx') ||
    name.toLowerCase().endsWith('.xls')
  );
}

function isPdf(mime: string, name: string) {
  return mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

function isText(mime: string, name: string) {
  return mime === 'text/plain' || name.toLowerCase().endsWith('.txt');
}

export function DocumentViewer({ id, name, mimeType, fileUrl, onClose }: Props) {
  const [state, setState] = useState<ViewState>('loading');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (isPdf(mimeType, name) || isText(mimeType, name)) {
          // Browser handles these natively — mark loaded immediately
          setState('loaded');
          return;
        }

        if (isDocx(mimeType, name)) {
          const mammoth = await import('mammoth');
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error('fetch failed');
          const ab = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer: ab });
          if (!cancelled) {
            setHtmlContent(result.value);
            setState('loaded');
          }
          return;
        }

        if (isExcel(mimeType, name)) {
          const XLSX = await import('xlsx');
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error('fetch failed');
          const ab = await res.arrayBuffer();
          const wb = XLSX.read(ab, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const html = XLSX.utils.sheet_to_html(wb.Sheets[sheetName]);
          if (!cancelled) {
            setHtmlContent(html);
            setState('loaded');
          }
          return;
        }

        setState('unsupported');
      } catch {
        if (!cancelled) setState('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fileUrl, mimeType, name]);

  // Fetch text content once state is loaded for text files
  useEffect(() => {
    if (!isText(mimeType, name) || state !== 'loaded') return;
    let cancelled = false;
    fetch(fileUrl)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setTextContent(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state, fileUrl, mimeType, name]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 text-orange-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a
              href={fileUrl}
              download={name}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" />Tải xuống
            </a>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {state === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm">Đang tải tài liệu...</span>
            </div>
          )}

          {state === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm font-medium">Không thể hiển thị tài liệu</p>
              <a href={fileUrl} download={name}
                className="text-xs text-indigo-600 underline">
                Tải xuống để xem
              </a>
            </div>
          )}

          {state === 'unsupported' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <FileText className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium">Định dạng chưa hỗ trợ xem trực tiếp</p>
              <a href={fileUrl} download={name}
                className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">
                <Download className="h-3.5 w-3.5" />Tải xuống
              </a>
            </div>
          )}

          {state === 'loaded' && (
            <>
              {/* PDF */}
              {isPdf(mimeType, name) && (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={name}
                />
              )}

              {/* Plain text */}
              {isText(mimeType, name) && (
                <div className="h-full overflow-auto p-6">
                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {textContent || <span className="text-gray-400 italic">Tệp trống</span>}
                  </pre>
                </div>
              )}

              {/* Word / Excel HTML */}
              {(isDocx(mimeType, name) || isExcel(mimeType, name)) && (
                <div className="h-full overflow-auto p-6">
                  {isExcel(mimeType, name) ? (
                    <div
                      className="doc-viewer-excel text-sm"
                      /* eslint-disable-next-line react/no-danger */
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  ) : (
                    <div
                      className="doc-viewer-word prose prose-sm max-w-none text-gray-800"
                      /* eslint-disable-next-line react/no-danger */
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
