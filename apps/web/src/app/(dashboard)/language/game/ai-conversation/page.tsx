'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Mic, MicOff, Send, Trophy, Volume2, Loader2, StopCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ScoreResult {
  fluency: number;
  accuracy: number;
  naturalness: number;
  overall: string;
  encouragement: string;
  avgScore: number;
  xpEarned: number;
  turns: number;
}

type GameState = 'setup' | 'chat' | 'scoring' | 'done';

const ROLES = [
  { key: 'teacher',    label: 'Giáo viên',       emoji: '👩‍🏫', desc: 'Luyện hỏi đáp về học tập' },
  { key: 'shopkeeper', label: 'Người bán hàng',   emoji: '🛒',  desc: 'Thực hành mua sắm' },
  { key: 'tourist',    label: 'Khách du lịch',    emoji: '🌍',  desc: 'Hỏi đường, giới thiệu' },
  { key: 'friend',     label: 'Bạn bè',           emoji: '😊',  desc: 'Trò chuyện tự nhiên' },
];

const LANGS = [
  { value: 'en', label: 'English', tts: 'en-US', speech: 'en-US' },
  { value: 'fr', label: 'Français', tts: 'fr-FR', speech: 'fr-FR' },
  { value: 'ja', label: '日本語', tts: 'ja-JP', speech: 'ja-JP' },
  { value: 'ko', label: '한국어', tts: 'ko-KR', speech: 'ko-KR' },
];

const MIN_TURNS = 3;

export default function AiConversationPage() {
  const [role, setRole] = useState('friend');
  const [lang, setLang] = useState('en');
  const [state, setState] = useState<GameState>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const micSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const langInfo = LANGS.find(l => l.value === lang) ?? LANGS[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  const startChat = async () => {
    setState('chat');
    setMessages([]);
    setAiTyping(true);
    try {
      const roleInfo = ROLES.find(r => r.key === role)!;
      const opening = await api.post<{ reply: string }>('/language/game/ai-conversation/chat', {
        role, language: lang,
        messages: [{ role: 'user', content: `Hello! Let's start our conversation. I'm ready.` }],
      });
      setMessages([
        { role: 'user', content: 'Hello! Let\'s start.' },
        { role: 'ai', content: opening.reply },
      ]);
    } catch {
      setMessages([{ role: 'ai', content: 'Hello! How can I help you today?' }]);
    }
    setAiTyping(false);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || aiTyping) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setAiTyping(true);
    try {
      const res = await api.post<{ reply: string }>('/language/game/ai-conversation/chat', {
        role, language: lang, messages: newMessages,
      });
      setMessages(prev => [...prev, { role: 'ai', content: res.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '...' }]);
    }
    setAiTyping(false);
  };

  const startListening = useCallback(() => {
    if (!micSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = langInfo.speech;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => {
      setListening(false);
      sendMessage(e.results[0][0].transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [micSupported, langInfo.speech, sendMessage]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const playTts = (text: string) => {
    const url = `/api/language/tts?text=${encodeURIComponent(text)}&lang=${langInfo.tts}`;
    new Audio(url).play().catch(() => {});
  };

  const endConversation = async () => {
    setState('scoring');
    try {
      const res = await api.post<ScoreResult>('/language/game/ai-conversation/score', {
        language: lang, role, messages,
      });
      setScoreResult(res);
    } catch {
      setScoreResult({ fluency: 7, accuracy: 7, naturalness: 7, overall: 'Tốt lắm!', encouragement: 'Tiếp tục luyện tập!', avgScore: 70, xpEarned: 30, turns: messages.filter(m => m.role === 'user').length });
    }
    setState('done');
  };

  const userTurns = messages.filter(m => m.role === 'user').length;

  if (state === 'setup') {
    const roleInfo = ROLES.find(r => r.key === role)!;
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 p-8 text-white text-center shadow-xl">
          <Bot className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">AI Conversation</h1>
          <p className="text-white/80 mt-1">Trò chuyện thực tế với AI — nói hay viết đều được!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-5 bg-white">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI đóng vai</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button key={r.key} onClick={() => setRole(r.key)}
                  className={cn('p-3 rounded-xl border-2 text-left transition',
                    role === r.key ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300')}>
                  <div className="text-xl mb-1">{r.emoji}</div>
                  <div className="font-bold text-sm text-gray-800">{r.label}</div>
                  <div className="text-xs text-gray-500">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
            <div className="grid grid-cols-4 gap-2">
              {LANGS.map(l => (
                <button key={l.value} onClick={() => setLang(l.value)}
                  className={cn('py-2 rounded-xl border-2 text-sm font-medium transition',
                    lang === l.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Tối thiểu {MIN_TURNS} lượt hội thoại để nhận điểm</p>
            <p>✦ AI chấm: Fluency, Accuracy, Naturalness</p>
            <p>✦ Mỗi lượt: <span className="font-semibold text-violet-600">+5 XP</span></p>
          </div>
          <button onClick={startChat}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg transition">
            Bắt đầu hội thoại!
          </button>
        </div>
      </div>
    );
  }

  if (state === 'scoring') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
        <p className="font-medium text-gray-700">AI đang chấm điểm hội thoại...</p>
      </div>
    );
  }

  if (state === 'done' && scoreResult) {
    const roleInfo = ROLES.find(r => r.key === role)!;
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        <div className={cn('rounded-2xl p-7 text-white text-center shadow-xl',
          scoreResult.avgScore >= 80 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
          : scoreResult.avgScore >= 55 ? 'bg-gradient-to-br from-indigo-500 to-violet-700'
          : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
          <Trophy className="w-12 h-12 mx-auto mb-2" />
          <div className="text-5xl font-black">{scoreResult.avgScore}</div>
          <p className="text-white/80 mt-1">Điểm hội thoại / 100</p>
          <p className="text-white/70 text-sm mt-1">{roleInfo.emoji} {roleInfo.label} · {scoreResult.turns} lượt · +{scoreResult.xpEarned} XP</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          {[['Fluency', scoreResult.fluency], ['Accuracy', scoreResult.accuracy], ['Naturalness', scoreResult.naturalness]].map(([label, val]) => (
            <div key={label as string} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full">
                <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${(val as number) * 10}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-700 w-8 text-right">{val}/10</span>
            </div>
          ))}
          <div className="border-t pt-3 text-sm text-gray-600 space-y-1.5">
            <p>{scoreResult.overall}</p>
            <p className="text-violet-600 font-medium">{scoreResult.encouragement}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setState('setup'); setMessages([]); setScoreResult(null); }}
            className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
            Chọn vai khác
          </button>
          <button onClick={startChat}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition">
            Chat lại!
          </button>
        </div>
      </div>
    );
  }

  // Chat state
  const roleInfo = ROLES.find(r => r.key === role)!;
  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/language" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xl">{roleInfo.emoji}</span>
          <div>
            <p className="font-bold text-sm text-gray-800">{roleInfo.label}</p>
            <p className="text-xs text-gray-400">{langInfo.label} · {userTurns} lượt</p>
          </div>
        </div>
        {userTurns >= MIN_TURNS && (
          <button onClick={endConversation}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-medium transition">
            <StopCircle className="w-4 h-4" />
            Kết thúc
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
              m.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            )}>
              {m.role === 'ai' && (
                <button onClick={() => playTts(m.content)} className="float-right ml-2 mt-0.5 opacity-50 hover:opacity-100">
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {aiTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400 flex items-center gap-1.5">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce [animation-delay:0.1s]">●</span>
              <span className="animate-bounce [animation-delay:0.2s]">●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-2 mt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
          placeholder={`Nhập tin nhắn ${langInfo.label}...`}
          disabled={aiTyping}
          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 disabled:opacity-50"
        />
        {micSupported && (
          <button onClick={listening ? stopListening : startListening} disabled={aiTyping}
            className={cn('p-2.5 rounded-xl border-2 transition shrink-0',
              listening ? 'border-red-400 bg-red-50 text-red-500 animate-pulse' : 'border-gray-200 hover:border-violet-400 text-gray-500')}>
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || aiTyping}
          className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition disabled:opacity-50 shrink-0">
          <Send className="w-5 h-5" />
        </button>
      </div>
      {userTurns < MIN_TURNS && userTurns > 0 && (
        <p className="text-xs text-center text-gray-400 mt-1.5">
          Cần thêm {MIN_TURNS - userTurns} lượt nữa để kết thúc và nhận điểm
        </p>
      )}
    </div>
  );
}
