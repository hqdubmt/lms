'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Bot, Upload, Loader2, CheckCircle2, XCircle, Copy, Download,
  RefreshCw, FileText, ClipboardList, BookOpen, FileSearch, PenLine,
  ChevronRight, Settings2, GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type GenType = 'quiz' | 'lesson-plan' | 'exam' | 'answer-key' | 'worksheet' | 'study-guide';
type RunState = 'idle' | 'converting' | 'generating' | 'done' | 'error';

interface StreamLine {
  type: 'start' | 'chunk' | 'done' | 'error';
  text?: string;
  result?: unknown;
  raw?: string;
  message?: string;
}

const GEN_TYPES: { id: GenType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: 'quiz',        label: 'Trắc nghiệm',  desc: 'Câu hỏi MCQ kèm đáp án & giải thích',  icon: ClipboardList, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'lesson-plan', label: 'Giáo án',      desc: 'Mục tiêu, hoạt động dạy học chi tiết',  icon: BookOpen,      color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'exam',        label: 'Đề kiểm tra',  desc: 'Đề thi nhiều dạng câu, phân điểm rõ',   icon: FileSearch,    color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'answer-key',  label: 'Đáp án',       desc: 'Đáp án + giải thích chi tiết từng câu', icon: CheckCircle2,  color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'worksheet',   label: 'Phiếu bài tập', desc: 'Bài tập thực hành điền khuyết, ghép đôi', icon: PenLine,       color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'study-guide', label: 'Ôn tập',        desc: 'Tài liệu ôn tập, khái niệm, mẹo học',    icon: GraduationCap, color: 'text-teal-600 bg-teal-50 border-teal-200' },
];

const SUBJECTS = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'Chung'];

function stripAnsi(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
}

// ─── JSON Pretty Viewer ───────────────────────────────────────────────────────

function JsonViewer({ data, raw }: { data: unknown; raw: string }) {
  const [mode, setMode] = useState<'pretty' | 'raw'>('pretty');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(mode === 'pretty' ? JSON.stringify(data, null, 2) : raw);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const content = mode === 'pretty' ? JSON.stringify(data, null, 2) : raw;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'result.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['pretty', 'raw'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn('px-2.5 py-1 transition-colors capitalize',
                mode === m ? 'bg-white text-gray-700 font-medium' : 'text-gray-500 hover:bg-gray-100')}>
              {m === 'pretty' ? 'Đẹp' : 'Raw'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={copy}
            className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
              copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Đã copy' : 'Copy'}
          </button>
          <button onClick={download}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            <Download className="h-3 w-3" />JSON
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {mode === 'pretty' && data ? (
          <pre className="text-xs p-4 text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <pre className="text-xs p-4 text-gray-600 whitespace-pre-wrap font-mono leading-relaxed bg-gray-950 text-gray-300">
            {raw}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<RunState>('idle');
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [subject, setDetectedSubject] = useState('');
  const [quality, setQuality] = useState<number | null>(null);

  // Gen options
  const [genType, setGenType] = useState<GenType>('quiz');
  const [grade, setGrade] = useState('');
  const [subjectOpt, setSubjectOpt] = useState('Chung');
  const [count, setCount] = useState('5');

  // Output
  const [streamText, setStreamText] = useState('');
  const [resultData, setResultData] = useState<unknown>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertFile = useCallback(async (file: File) => {
    setState('converting');
    setMarkdown(''); setStreamText(''); setResultData(null); setErrorMsg('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = api.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/documents/preview', {
        method: 'POST', headers, credentials: 'include', body: formData,
      });
      const d = await res.json();
      if (!res.ok) { setErrorMsg(d.error); setState('error'); return; }
      setMarkdown(d.markdown ?? '');
      setFilename(d.filename ?? file.name);
      setDetectedSubject(d.subject ?? '');
      setQuality(d.quality?.score ?? null);
      setState('idle');
      setStep(2);
    } catch (e: any) {
      setErrorMsg(e.message); setState('error');
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) convertFile(f);
  };

  const generate = async () => {
    if (!markdown.trim()) return;
    if (state === 'generating') { abortRef.current?.abort(); return; }

    setState('generating'); setStreamText(''); setResultData(null); setErrorMsg('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const token = api.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/documents/generate', {
        method: 'POST', headers, credentials: 'include', signal: ctrl.signal,
        body: JSON.stringify({
          markdown,
          type: genType,
          grade: grade ? parseInt(grade) : undefined,
          subject: subjectOpt,
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
            if (parsed.type === 'chunk' && parsed.text) {
              setStreamText(prev => prev + parsed.text);
            }
            if (parsed.type === 'done') {
              setResultData(parsed.result);
              if (!parsed.result) setStreamText(stripAnsi(parsed.raw ?? ''));
              setState('done');
            }
            if (parsed.type === 'error') {
              setErrorMsg(parsed.message ?? 'Lỗi');
              setState('error');
            }
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

  const reset = () => {
    setStep(1); setState('idle'); setMarkdown(''); setFilename(''); setStreamText('');
    setResultData(null); setErrorMsg(''); setDetectedSubject(''); setQuality(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Teacher Copilot
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload tài liệu → AI tạo trắc nghiệm, giáo án, đề thi, đáp án
          </p>
        </div>
        {step > 1 && (
          <button onClick={reset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />Tải lại
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(['Upload', 'Xem trước', 'Tạo nội dung'] as const).map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              step > i + 1 ? 'bg-green-500 text-white' :
              step === i + 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400',
            )}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={step === i + 1 ? 'text-foreground font-medium' : ''}>{label}</span>
            {i < 2 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => state !== 'converting' && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-4 py-16 px-8 rounded-2xl border-2 border-dashed',
            'cursor-pointer transition-all text-center',
            dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50',
            state === 'converting' && 'pointer-events-none opacity-60',
          )}
        >
          <input ref={fileInputRef} type="file" className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.csv,.html,.txt,.md"
            onChange={e => { const f = e.target.files?.[0]; if (f) convertFile(f); e.target.value = ''; }} />
          {state === 'converting' ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm font-medium">Đang chuyển đổi sang Markdown...</p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700">
                  {dragging ? 'Thả tài liệu vào đây' : 'Kéo & thả tài liệu của bạn'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF · DOCX · PPTX · XLSX · CSV · HTML · TXT
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {state === 'error' && step === 1 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <XCircle className="h-4 w-4 shrink-0" />{errorMsg}
        </div>
      )}

      {/* ── STEP 2: Preview markdown ── */}
      {step >= 2 && markdown && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold truncate">{filename}</span>
              {subject && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                  {subject}
                </span>
              )}
              {quality != null && (
                <span className="text-xs text-muted-foreground shrink-0">Chất lượng: {quality}/100</span>
              )}
            </div>
            <button onClick={() => setStep(3)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shrink-0">
              Tiếp theo <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea readOnly value={markdown}
            className="w-full h-48 font-mono text-xs text-gray-700 p-5 resize-none outline-none bg-gray-50/50" />
        </div>
      )}

      {/* ── STEP 3: Generate ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Gen type selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {GEN_TYPES.map(gt => {
              const Icon = gt.icon;
              return (
                <button key={gt.id} onClick={() => setGenType(gt.id)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 text-left transition-all',
                    genType === gt.id ? gt.color + ' border-current/30' : 'border-gray-100 hover:border-gray-200 bg-white',
                  )}>
                  <Icon className={cn('h-4 w-4', genType === gt.id ? '' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-xs font-semibold">{gt.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{gt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
              <Settings2 className="h-4 w-4 text-muted-foreground" />Tùy chọn
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Môn học</label>
                <select value={subjectOpt} onChange={e => setSubjectOpt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Lớp</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Không chọn</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
              {['quiz', 'exam', 'worksheet'].includes(genType) && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Số câu hỏi</label>
                  <select value={count} onChange={e => setCount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {[3,5,8,10,15,20].map(n => <option key={n} value={n}>{n} câu</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button onClick={generate}
              className={cn(
                'flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white transition-colors',
                state === 'generating' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90',
              )}>
              {state === 'generating'
                ? <><Loader2 className="h-4 w-4 animate-spin" />Dừng</>
                : <><Bot className="h-4 w-4" />Tạo {GEN_TYPES.find(g => g.id === genType)?.label}</>}
            </button>
            {state === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {state === 'error' && <span className="text-sm text-red-500">{errorMsg}</span>}
          </div>

          {/* Streaming output */}
          {(state === 'generating' || state === 'done') && (
            <div className="space-y-3">
              {state === 'generating' && !resultData && (
                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-300 max-h-60 overflow-y-auto">
                  {streamText || <span className="text-gray-500 animate-pulse">Đang tạo...</span>}
                </div>
              )}
              {state === 'done' && (
                <JsonViewer data={resultData} raw={streamText} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
