'use client';

import { useState, useRef } from 'react';
import {
  Bot, Loader2, CheckCircle2, XCircle, Copy, Download,
  ClipboardList, BookOpen, FileSearch, PenLine, Settings2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type GenType = 'quiz' | 'lesson-plan' | 'exam' | 'answer-key' | 'worksheet';
type RunState = 'idle' | 'loading-text' | 'generating' | 'done' | 'error';

interface StreamLine {
  type: 'start' | 'chunk' | 'done' | 'error';
  text?: string;
  result?: unknown;
  raw?: string;
  message?: string;
}

const GEN_TYPES: { id: GenType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'quiz',        label: 'Trắc nghiệm', icon: ClipboardList, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'lesson-plan', label: 'Giáo án',      icon: BookOpen,      color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'exam',        label: 'Đề kiểm tra', icon: FileSearch,    color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'answer-key',  label: 'Đáp án',       icon: CheckCircle2,  color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'worksheet',   label: 'Phiếu BT',     icon: PenLine,       color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const SUBJECTS = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Lý', 'Hóa', 'Sinh', 'Chung'];

function stripAnsi(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** API path to GET document text, e.g. /math/docs/:id/text */
  textEndpoint: string;
  /** Default subject hint */
  defaultSubject?: string;
  /** Default grade hint */
  defaultGrade?: string;
  /** Accent color class for buttons/borders */
  accentClass?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CopilotPanel({ textEndpoint, defaultSubject, defaultGrade, accentClass = 'bg-primary' }: Props) {
  const [state, setState] = useState<RunState>('idle');
  const [genType, setGenType] = useState<GenType>('quiz');
  const [grade, setGrade] = useState(defaultGrade ?? '');
  const [subject, setSubject] = useState(defaultSubject ?? 'Chung');
  const [count, setCount] = useState('5');
  const [streamText, setStreamText] = useState('');
  const [resultData, setResultData] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (state === 'generating') { abortRef.current?.abort(); return; }

    setState('loading-text');
    setStreamText(''); setResultData(null); setErrorMsg('');

    let markdown = '';
    try {
      const r = await api.get<{ text: string }>(textEndpoint);
      markdown = r.text ?? '';
    } catch (e: any) {
      setErrorMsg('Không lấy được nội dung tài liệu'); setState('error'); return;
    }

    if (!markdown.trim()) {
      setErrorMsg('Tài liệu không có nội dung văn bản'); setState('error'); return;
    }

    setState('generating');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const token = api.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/instructor/documents/generate', {
        method: 'POST', headers, credentials: 'include', signal: ctrl.signal,
        body: JSON.stringify({
          markdown,
          type: genType,
          grade: grade ? parseInt(grade) : undefined,
          subject,
          count: parseInt(count) || 5,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed: StreamLine = JSON.parse(line.slice(6));
            if (parsed.type === 'chunk' && parsed.text) setStreamText(p => p + parsed.text);
            if (parsed.type === 'done') {
              setResultData(parsed.result);
              if (!parsed.result) setStreamText(stripAnsi(parsed.raw ?? ''));
              setState('done');
            }
            if (parsed.type === 'error') { setErrorMsg(parsed.message ?? 'Lỗi'); setState('error'); }
          } catch { /* skip */ }
        }
      }
      if (state !== 'done') setState('done');
    } catch (e: any) {
      if (e.name !== 'AbortError') { setErrorMsg(e.message); setState('error'); }
      else setState('idle');
    } finally {
      abortRef.current = null;
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const resultStr = resultData ? JSON.stringify(resultData, null, 2) : streamText;

  const reset = () => {
    setState('idle'); setStreamText(''); setResultData(null); setErrorMsg('');
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      {/* Type selector */}
      <div className="grid grid-cols-5 gap-1.5">
        {GEN_TYPES.map(gt => {
          const Icon = gt.icon;
          return (
            <button key={gt.id} onClick={() => { setGenType(gt.id); reset(); }}
              title={gt.label}
              className={cn(
                'flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl border-2 text-center transition-all text-[10px] font-semibold',
                genType === gt.id ? gt.color + ' border-current/40' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-500',
              )}>
              <Icon className="h-3.5 w-3.5" />
              {gt.label}
            </button>
          );
        })}
      </div>

      {/* Options row */}
      <div className="flex gap-2 flex-wrap">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 flex-1 min-w-0">
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={grade} onChange={e => setGrade(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 w-24">
          <option value="">Lớp...</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Lớp {g}</option>)}
        </select>
        {['quiz', 'exam', 'worksheet'].includes(genType) && (
          <select value={count} onChange={e => setCount(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 w-20">
            {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} câu</option>)}
          </select>
        )}
      </div>

      {/* Generate button */}
      <button onClick={generate}
        className={cn(
          'flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-colors',
          state === 'generating' ? 'bg-red-500 hover:bg-red-600' : `${accentClass} hover:opacity-90`,
          (state === 'loading-text') && 'opacity-70 cursor-not-allowed',
        )}
        disabled={state === 'loading-text'}
      >
        {state === 'loading-text' && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tải nội dung...</>}
        {state === 'generating' && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Dừng</>}
        {(state === 'idle' || state === 'error') && <><Bot className="h-3.5 w-3.5" />Tạo {GEN_TYPES.find(g => g.id === genType)?.label}</>}
        {state === 'done' && <><Bot className="h-3.5 w-3.5" />Tạo lại</>}
      </button>

      {/* Error */}
      {state === 'error' && errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <XCircle className="h-3.5 w-3.5 shrink-0" />{errorMsg}
        </div>
      )}

      {/* Streaming output */}
      {state === 'generating' && !resultData && (
        <div className="bg-gray-950 rounded-xl p-3 font-mono text-[10px] text-gray-300 flex-1 overflow-y-auto min-h-20 max-h-48">
          {streamText || <span className="text-gray-500 animate-pulse">Đang tạo...</span>}
        </div>
      )}

      {/* Result */}
      {state === 'done' && resultStr && (
        <div className="flex-1 flex flex-col rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />Hoàn thành
            </span>
            <div className="flex gap-1">
              <button onClick={() => copy(resultStr)}
                className={cn('flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors',
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {copied ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                {copied ? 'Đã copy' : 'Copy'}
              </button>
              <button onClick={() => download(resultStr, `${genType}.json`)}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors">
                <Download className="h-2.5 w-2.5" />JSON
              </button>
            </div>
          </div>
          <pre className="text-[10px] p-3 text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-48 bg-white">
            {resultStr}
          </pre>
        </div>
      )}
    </div>
  );
}
