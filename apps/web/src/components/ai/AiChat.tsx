'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Bot, X, Send, RotateCcw, Minimize2, Maximize2, Mic, MicOff,
  Copy, Check, Volume2, VolumeX, BookOpen, PenLine, CheckSquare, HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { startSTT, isSTTAvailable, type STTHandle } from '@/lib/stt';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Source {
  lesson: string;
  topic: string;
}

interface QuizQ {
  num: number;
  text: string;
  options: { key: string; text: string }[];
  answer: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: boolean;
  sources?: Source[];
  suggestions?: string[];
}

type Subject = 'math' | 'language' | 'viet' | 'general';
type Mode = 'tutor' | 'exercise' | 'homework' | 'quiz';

// ─── Quiz parser ──────────────────────────────────────────────────────────────

function parseQuiz(content: string): QuizQ[] {
  const questions: QuizQ[] = [];
  const blocks = content.split(/(?=\*\*Câu\s+\d+)/);

  for (const block of blocks) {
    const numMatch = block.match(/\*\*Câu\s+(\d+)/);
    if (!numMatch) continue;
    const answerMatch = block.match(/\*\*Đáp án[:\s]*([A-D])\*\*/i);
    if (!answerMatch) continue;

    // Lấy text câu hỏi: từ sau "**Câu N:**" đến trước option đầu tiên
    const questionMatch = block.match(/\*\*Câu\s+\d+[:\.]?\*\*\s*([\s\S]+?)(?=\n?[A-D][.:]\s)/);
    if (!questionMatch) continue;
    const text = questionMatch[1].trim();

    // Phần options: sau câu hỏi, trước **Đáp án**
    const optSection = block.slice(block.search(/[A-D][.:]\s/)).split('**Đáp án')[0];

    // Hỗ trợ cả inline (A. text B. text...) lẫn multiline (A. text\nB. text...)
    const options: { key: string; text: string }[] = [];
    for (const key of ['A', 'B', 'C', 'D']) {
      // Dừng tại option tiếp theo ([B-D].) hoặc hết chuỗi
      const re = new RegExp(`\\b${key}[.:]\\s*([\\s\\S]+?)(?=\\s[B-D][.:]\\s|\\n[A-D][.:]\\s|$)`);
      const m = optSection.match(re);
      if (m) options.push({ key, text: m[1].replace(/\n/g, ' ').trim() });
    }

    if (options.length < 2) continue;
    questions.push({ num: parseInt(numMatch[1]), text, options, answer: answerMatch[1].toUpperCase() });
  }
  return questions;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_META: Record<Subject, { label: string; color: string; hint: string }> = {
  math:     { label: 'Toán học',   color: 'from-violet-600 to-indigo-600',  hint: 'Hỏi về bài toán, công thức, cách giải...' },
  language: { label: 'Ngoại ngữ', color: 'from-blue-600 to-cyan-500',      hint: 'Hỏi về từ vựng, ngữ pháp, phát âm...' },
  viet:     { label: 'Tiếng Việt', color: 'from-red-600 to-orange-500',    hint: 'Hỏi về từ vựng, ngữ pháp tiếng Việt...' },
  general:  { label: 'Học tập',    color: 'from-primary to-primary/70',    hint: 'Hỏi bất cứ điều gì về bài học...' },
};

const MODES: { id: Mode; label: string; icon: React.ElementType }[] = [
  { id: 'tutor',    label: 'Giải thích', icon: BookOpen    },
  { id: 'exercise', label: 'Bài tập',    icon: PenLine     },
  { id: 'homework', label: 'Chấm bài',   icon: CheckSquare },
  { id: 'quiz',     label: 'Quiz',       icon: HelpCircle  },
];

const MODE_HINTS: Record<Mode, string> = {
  tutor:    'Hỏi để hiểu kiến thức...',
  exercise: 'Yêu cầu tạo bài tập...',
  homework: 'Gửi bài làm để chấm...',
  quiz:     'Yêu cầu kiểm tra nhanh...',
};

function detectSubject(pathname: string): Subject {
  if (pathname.startsWith('/math')) return 'math';
  if (pathname.startsWith('/language')) return 'language';
  if (pathname.startsWith('/viet')) return 'viet';
  return 'general';
}

const INTENT_PATTERNS: Array<{ pattern: RegExp; mode: Mode }> = [
  { pattern: /quiz|trắc nghiệm|kiểm tra nhanh/i, mode: 'quiz' },
  { pattern: /bài tập|cho.*bài|tập làm|luyện tập/i, mode: 'exercise' },
  { pattern: /chấm bài|sửa bài|chấm điểm|bài làm của/i, mode: 'homework' },
];

function inferMode(text: string): Mode | null {
  for (const { pattern, mode } of INTENT_PATTERNS) {
    if (pattern.test(text)) return mode;
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function QuizRenderer({ questions }: { questions: QuizQ[] }) {
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const score = Object.keys(revealed).filter(n => selected[+n] === questions.find(q => q.num === +n)?.answer).length;

  return (
    <div className="space-y-3 w-full">
      {questions.map(q => (
        <div key={q.num} className="bg-white rounded-xl border border-gray-200 p-3 text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2">Câu {q.num}: {q.text}</p>
          <div className="space-y-1.5">
            {q.options.map(opt => {
              const isSelected = selected[q.num] === opt.key;
              const isRev = revealed[q.num];
              const isCorrect = opt.key === q.answer;
              return (
                <button
                  key={opt.key}
                  disabled={isRev}
                  onClick={() => {
                    setSelected(s => ({ ...s, [q.num]: opt.key }));
                    setRevealed(r => ({ ...r, [q.num]: true }));
                  }}
                  className={cn(
                    'w-full text-left text-xs rounded-lg px-2.5 py-1.5 border transition-colors',
                    !isRev && 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer',
                    isRev && isCorrect && 'border-green-400 bg-green-50 text-green-700 font-medium',
                    isRev && isSelected && !isCorrect && 'border-red-400 bg-red-50 text-red-700',
                    isRev && !isSelected && !isCorrect && 'border-gray-100 text-gray-400',
                  )}
                >
                  <span className="font-medium">{opt.key}.</span> {opt.text}
                </button>
              );
            })}
          </div>
          {revealed[q.num] && selected[q.num] !== q.answer && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">Đáp án: {q.answer}</p>
          )}
        </div>
      ))}
      {Object.keys(revealed).length === questions.length && (
        <p className="text-xs text-center text-gray-500 font-medium">
          Kết quả: <span className="text-primary">{score}/{questions.length}</span> câu đúng
        </p>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const questions = parseQuiz(content);
  if (questions.length > 0) return <QuizRenderer questions={questions} />;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath] as any}
      rehypePlugins={[rehypeKatex] as any}
      components={{
        pre({ children }) {
          return (
            <pre className="bg-gray-800 rounded-lg p-3 overflow-x-auto my-2 text-left">
              {children}
            </pre>
          );
        },
        code({ className, children }) {
          const isBlock = !!className;
          if (isBlock) {
            return <code className="text-green-300 text-xs font-mono">{children}</code>;
          }
          return <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
        },
        p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal ml-4 mb-2 space-y-0.5">{children}</ol>; },
        li({ children }) { return <li>{children}</li>; },
        strong({ children }) { return <strong className="font-semibold">{children}</strong>; },
        h1({ children }) { return <h1 className="text-base font-bold mb-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-sm font-bold mb-1.5">{children}</h2>; },
        h3({ children }) { return <h3 className="text-sm font-semibold mb-1">{children}</h3>; },
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-500 my-2">{children}</blockquote>;
        },
      }}
      className="text-sm leading-relaxed"
    >
      {content}
    </ReactMarkdown>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
      title="Sao chép"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function TtsButton({ text, lang }: { text: string; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = useCallback(() => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.95;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  }, [playing, text, lang]);

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  return (
    <button
      onClick={toggle}
      className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
      title={playing ? 'Dừng đọc' : 'Nghe đọc'}
    >
      {playing
        ? <VolumeX className="h-3.5 w-3.5 text-primary" />
        : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<Mode>('tutor');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [aiLabel, setAiLabel] = useState('');
  const [micListening, setMicListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sttRef = useRef<STTHandle | null>(null);
  const historyLoadedRef = useRef<string | null>(null);

  const subject = detectSubject(pathname);
  const meta = SUBJECT_META[subject];
  const ttsLang = subject === 'language' ? 'en-US' : 'vi-VN';

  // Refresh access token nếu hết hạn, trả về token mới nhất
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const current = api.getToken();
    if (current) return current;
    // Token bị xóa khỏi api client — thử refresh qua cookie
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const { accessToken: newToken } = await res.json();
      if (newToken) {
        api.setToken(newToken);
        useAuthStore.getState().setToken(newToken);
      }
      return newToken ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetch('/api/ai/health')
      .then(r => r.json())
      .then(d => {
        setAiOk(d.available);
        const names: Record<string, string> = {
          groq: 'Groq · llama-3.3-70b',
          gemini: 'Gemini · Flash 2.0',
          ollama: d.model || 'Ollama',
        };
        setAiLabel(d.provider ? (names[d.provider] ?? d.model ?? '') : '');
      })
      .catch(() => setAiOk(false));
    setMicAvailable(isSTTAvailable());
  }, []);

  // Load lịch sử khi mở chat (mỗi subject load một lần)
  useEffect(() => {
    if (!open || minimized) return;
    if (historyLoadedRef.current === subject) return;
    historyLoadedRef.current = subject;
    setHistoryLoading(true);
    api.get<{ messages: Array<{ role: string; content: string }> }>(`/ai/history?subject=${subject}`)
      .then(data => {
        if (data.messages.length > 0 && messages.length === 0) {
          setMessages(data.messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })));
        }
      })
      .catch(() => { /* bỏ qua nếu lỗi */ })
      .finally(() => setHistoryLoading(false));
  }, [open, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput('');

    // Intent auto-detection: tự động switch mode nếu phát hiện intent từ text
    const inferred = inferMode(text);
    const effectiveMode = inferred ?? mode;
    if (inferred && inferred !== mode) setMode(inferred);

    const newMessages: Message[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages([...newMessages, { role: 'assistant', content: '', loading: true }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Dùng token mới nhất từ api client (đã auto-refresh bởi background calls)
      const token = api.getToken();
      let res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          subject,
          mode: effectiveMode,
        }),
        signal: ctrl.signal,
      });

      // Token hết hạn: thử refresh rồi gửi lại
      if (res.status === 401) {
        const newToken = await getValidToken();
        if (!newToken) throw new Error('AUTH_EXPIRED');
        res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
          credentials: 'include',
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            subject,
            mode: effectiveMode,
          }),
          signal: ctrl.signal,
        });
      }

      if (!res.ok || !res.body) throw new Error('Lỗi kết nối');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';
      let receivedFirstToken = false;
      let metaData: { suggestions?: string[]; sources?: Source[] } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              aiContent = parsed.error;
              break;
            }

            if (parsed.type === 'meta') {
              metaData = { suggestions: parsed.suggestions, sources: parsed.sources };
              continue;
            }

            if (parsed.token) {
              aiContent += parsed.token;
              receivedFirstToken = true;
              setMessages([
                ...newMessages,
                { role: 'assistant', content: aiContent, loading: false },
              ]);
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!aiContent) aiContent = 'Xin lỗi, tôi không thể trả lời lúc này.';

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: aiContent,
          loading: false,
          sources: metaData.sources,
          suggestions: metaData.suggestions,
        },
      ]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const msg = err.message === 'AUTH_EXPIRED'
          ? 'Phiên đăng nhập hết hạn. Vui lòng tải lại trang.'
          : 'Không thể kết nối tới AI. Vui lòng thử lại.';
        setMessages([...newMessages, { role: 'assistant', content: msg, error: true }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, subject, mode, getValidToken]);

  const handleSend = () => sendMessage(input);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMic = () => {
    if (micListening) {
      sttRef.current?.stop();
      sttRef.current = null;
      setMicListening(false);
      return;
    }
    setMicListening(true);
    const lang = subject === 'viet' ? 'vi-VN' : subject === 'language' ? 'en-US' : 'vi-VN';
    startSTT({
      lang,
      maxSeconds: 10,
      onResult: t => setInput(prev => prev ? `${prev} ${t}` : t),
      onEnd: () => { setMicListening(false); sttRef.current = null; },
      onError: () => { setMicListening(false); sttRef.current = null; },
    }).then(h => { sttRef.current = h; });
  };

  const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.loading);
  const currentHint = MODE_HINTS[mode];

  // ─── Collapsed FAB ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="AI Trợ lý học tập"
        className={cn(
          'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
          'h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center',
          'bg-gradient-to-br', meta.color,
          'hover:scale-105 active:scale-95 transition-all duration-200',
          aiOk === false && 'opacity-60',
        )}
      >
        <Bot className="h-6 w-6 text-white" />
        {aiOk && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
        )}
      </button>
    );
  }

  // ─── Chat Window ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
      'flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100',
      'w-[360px] sm:w-[400px] transition-all duration-200',
      minimized ? 'h-[52px]' : 'h-[560px]',
    )}>

      {/* Header */}
      <div
        className={cn('flex items-center gap-2 px-4 py-3 rounded-t-2xl shrink-0 cursor-pointer bg-gradient-to-r', meta.color)}
        onClick={() => setMinimized(m => !m)}
      >
        <Bot className="h-5 w-5 text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">AI Trợ lý · {meta.label}</div>
          {!minimized && aiOk !== null && (
            <div className="text-xs text-white/70">{aiOk ? `${aiLabel} · Sẵn sàng` : 'AI không khả dụng'}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
            className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); handleStop(); }}
            className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Mode selector */}
          <div className="flex border-b border-gray-100 shrink-0 bg-gray-50 rounded-none">
            {MODES.map(m => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
                    active
                      ? 'text-primary border-b-2 border-primary bg-white'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className={cn('h-14 w-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br', meta.color)}>
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">AI Trợ lý · {meta.label}</p>
                {historyLoading
                  ? <p className="text-xs text-gray-400 mb-3">Đang tải lịch sử...</p>
                  : <p className="text-xs text-gray-400 mb-3">{currentHint}</p>
                }
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className={cn('h-7 w-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', meta.color)}>
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 max-w-[82%]">
                  {/* Bubble */}
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : msg.error
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                  )}>
                    {msg.loading && !msg.content ? (
                      <TypingDots />
                    ) : msg.role === 'assistant' ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>

                  {/* AI message actions */}
                  {msg.role === 'assistant' && !msg.loading && msg.content && !msg.error && (
                    <div className="flex items-center gap-0.5 px-1">
                      <CopyButton text={msg.content} />
                      <TtsButton text={msg.content} lang={ttsLang} />
                    </div>
                  )}

                  {/* Retry button khi lỗi */}
                  {msg.error && i === messages.length - 1 && (
                    <button
                      onClick={() => {
                        const lastUser = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUser) {
                          setMessages(messages.slice(0, -1));
                          sendMessage(lastUser.content);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-1 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />Thử lại
                    </button>
                  )}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="px-1">
                      <p className="text-xs text-gray-400 mb-1 font-medium">Nguồn tham khảo:</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s, si) => (
                          <span
                            key={si}
                            className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5"
                          >
                            ✓ {s.lesson}{s.topic ? ` · ${s.topic}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && !streaming && (
                    <div className="px-1 flex flex-wrap gap-1">
                      {msg.suggestions.map((s, si) => (
                        <button
                          key={si}
                          onClick={() => sendMessage(s)}
                          disabled={streaming}
                          className="text-xs bg-white border border-gray-200 hover:border-primary hover:text-primary rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentHint}
                disabled={streaming || aiOk === false}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <div className="flex flex-col gap-1 shrink-0">
                {micAvailable && !streaming && (
                  <button
                    onClick={handleMic}
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                      micListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200',
                    )}
                  >
                    {micListening
                      ? <MicOff className="h-4 w-4 text-white" />
                      : <Mic className="h-4 w-4 text-gray-600" />}
                  </button>
                )}
                {streaming ? (
                  <button
                    onClick={handleStop}
                    className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || aiOk === false}
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center transition-colors bg-gradient-to-br',
                      meta.color,
                      'disabled:opacity-40 hover:opacity-90',
                    )}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  historyLoadedRef.current = null;
                  api.delete(`/ai/history?subject=${subject}`).catch(() => {});
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1.5 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />Xoá hội thoại
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
