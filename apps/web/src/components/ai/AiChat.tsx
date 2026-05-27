'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X, Send, Loader2, RotateCcw, Minimize2, Maximize2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { startSTT, isSTTAvailable, type STTHandle } from '@/lib/stt';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

type Subject = 'math' | 'language' | 'viet' | 'general';

const SUBJECT_META: Record<Subject, { label: string; color: string; hint: string }> = {
  math: { label: 'Toán học', color: 'from-violet-600 to-indigo-600', hint: 'Hỏi tôi về bài toán, công thức, cách giải...' },
  language: { label: 'Ngoại ngữ', color: 'from-blue-600 to-cyan-500', hint: 'Hỏi về từ vựng, ngữ pháp, phát âm...' },
  viet: { label: 'Tiếng Việt', color: 'from-red-600 to-orange-500', hint: 'Hỏi về từ vựng, thành ngữ, tục ngữ...' },
  general: { label: 'Học tập', color: 'from-primary to-primary/70', hint: 'Hỏi bất cứ điều gì về bài học...' },
};

function detectSubject(pathname: string): Subject {
  if (pathname.startsWith('/math')) return 'math';
  if (pathname.startsWith('/language')) return 'language';
  if (pathname.startsWith('/viet')) return 'viet';
  return 'general';
}

export function AiChat() {
  const pathname = usePathname();
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [aiLabel, setAiLabel] = useState<string>('');
  const [micListening, setMicListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sttRef = useRef<STTHandle | null>(null);

  const subject = detectSubject(pathname);
  const meta = SUBJECT_META[subject];

  useEffect(() => {
    fetch('/api/ai/health')
      .then(r => r.json())
      .then(d => {
        setAiOk(d.available);
        const providerNames: Record<string, string> = { groq: 'Groq · llama-3.3-70b', gemini: 'Gemini · Flash 2.0', ollama: d.model || 'Ollama' };
        setAiLabel(d.provider ? (providerNames[d.provider] ?? d.model ?? '') : '');
      })
      .catch(() => setAiOk(false));
    setMicAvailable(isSTTAvailable());
  }, []);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages([...newMessages, { role: 'assistant', content: '', loading: true }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          subject,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('Lỗi kết nối');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { aiContent = parsed.error; break; }
            if (parsed.token) {
              aiContent += parsed.token;
              setMessages([
                ...newMessages,
                { role: 'assistant', content: aiContent, loading: false },
              ]);
            }
          } catch { /* skip */ }
        }
      }

      if (!aiContent) aiContent = 'Xin lỗi, tôi không thể trả lời lúc này.';
      setMessages([...newMessages, { role: 'assistant', content: aiContent }]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages([...newMessages, { role: 'assistant', content: 'Không thể kết nối tới AI. Vui lòng thử lại.' }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

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
      sttRef.current?.stop(); sttRef.current = null;
      setMicListening(false);
      return;
    }
    setMicListening(true);
    const lang = subject === 'viet' ? 'vi-VN' : subject === 'language' ? 'en-US' : 'vi-VN';
    startSTT({
      lang,
      maxSeconds: 10,
      onResult: (t) => setInput(prev => prev ? `${prev} ${t}` : t),
      onEnd: () => { setMicListening(false); sttRef.current = null; },
      onError: () => { setMicListening(false); sttRef.current = null; },
    }).then(h => { sttRef.current = h; });
  };

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

  return (
    <div className={cn(
      'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
      'flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100',
      'w-[340px] sm:w-[380px] transition-all duration-200',
      minimized ? 'h-[52px]' : 'h-[520px]',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-t-2xl shrink-0 cursor-pointer',
        'bg-gradient-to-r', meta.color,
      )} onClick={() => setMinimized(m => !m)}>
        <Bot className="h-5 w-5 text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">AI Trợ lý · {meta.label}</div>
          {!minimized && aiOk !== null && (
            <div className="text-xs text-white/70">{aiOk ? `${aiLabel} · Sẵn sàng` : 'AI không khả dụng'}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
            className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors">
            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button onClick={e => { e.stopPropagation(); setOpen(false); handleStop(); }}
            className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className={cn('h-14 w-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br', meta.color)}>
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Xin chào! Tôi là AI Trợ lý</p>
                <p className="text-xs text-gray-400">{meta.hint}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className={cn('h-7 w-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', meta.color)}>
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm',
                )}>
                  {msg.loading ? (
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-xs">Đang suy nghĩ...</span>
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={meta.hint}
                disabled={streaming || aiOk === false}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <div className="flex flex-col gap-1 shrink-0">
                {micAvailable && !streaming && (
                  <button onClick={handleMic}
                    className={cn('h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                      micListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200')}>
                    {micListening
                      ? <MicOff className="h-4 w-4 text-white" />
                      : <Mic className="h-4 w-4 text-gray-600" />}
                  </button>
                )}
                {streaming ? (
                  <button onClick={handleStop}
                    className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors">
                    <X className="h-4 w-4 text-white" />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={!input.trim() || aiOk === false}
                    className={cn('h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                      'bg-gradient-to-br', meta.color,
                      'disabled:opacity-40 hover:opacity-90')}>
                    <Send className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1.5 transition-colors">
                <RotateCcw className="h-3 w-3" />Xoá hội thoại
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
