'use client';

import { useState, useRef, useCallback } from 'react';
import { PenLine, Headphones, MessageCircle, ChevronLeft, Loader2, Star, CheckCircle2, AlertCircle, Lightbulb, Mic, MicOff, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type CoachTab = 'writing' | 'listening' | 'conversation' | 'speaking';

// ─── Writing Coach ─────────────────────────────────────────────────────────────

interface WritingResult {
  score: number;
  overall: string;
  grammar: { error: string; fix: string; explanation: string }[];
  vocabulary: string[];
  style: string;
  encouragement: string;
}

function WritingCoach() {
  const [text, setText] = useState('');
  const [type, setType] = useState<'essay' | 'email' | 'paragraph' | 'story' | 'free'>('free');
  const [language, setLanguage] = useState<string>('en');
  const [result, setResult] = useState<WritingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<WritingResult>('/ai/writing-coach', { text, type, language });
      setResult(r);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['en', 'vi', 'ja', 'ko', 'fr', 'de'] as const).map(l => (
          <button key={l} onClick={() => setLanguage(l)}
            className={cn('text-xs px-3 py-1 rounded-full border font-medium transition-all',
              language === l ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {({ en: 'English', vi: 'Tiếng Việt', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German' } as Record<string, string>)[l]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['free', 'paragraph', 'essay', 'email', 'story'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={cn('text-xs px-3 py-1 rounded-full border font-medium transition-all',
              type === t ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {({ free: 'Tự do', paragraph: 'Đoạn văn', essay: 'Bài luận', email: 'Email', story: 'Câu chuyện' } as Record<string, string>)[t]}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Nhập bài viết của bạn vào đây..."
        className="w-full h-40 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{text.length}/2000 ký tự</span>
        <button
          onClick={submit}
          disabled={!text.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          Chấm bài
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Score */}
          <div className="flex items-center gap-3">
            <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0',
              result.score >= 8 ? 'bg-green-100 text-green-700' : result.score >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
              {result.score}/10
            </div>
            <div>
              <p className="text-sm font-medium">{result.overall}</p>
              <p className="text-xs text-primary mt-0.5 italic">{result.encouragement}</p>
            </div>
          </div>

          {/* Grammar errors */}
          {result.grammar.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Lỗi ngữ pháp ({result.grammar.length})</p>
              {result.grammar.map((g, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="line-through text-red-500">{g.error}</p>
                  <p className="text-green-700 font-medium">→ {g.fix}</p>
                  <p className="text-muted-foreground">{g.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Vocabulary */}
          {result.vocabulary.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2"><Star className="h-3.5 w-3.5" />Gợi ý từ vựng</p>
              <ul className="space-y-1">
                {result.vocabulary.map((v, i) => (
                  <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />{v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Style */}
          {result.style && (
            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{result.style}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Listening Coach ───────────────────────────────────────────────────────────

interface ListeningResult {
  score: number;
  comprehension: string;
  missed: string[];
  correct: string[];
  tip: string;
  encouragement: string;
}

function ListeningCoach() {
  const [transcript, setTranscript] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<ListeningResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!transcript.trim() || !userAnswer.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<ListeningResult>('/ai/listening-coach', { transcript, userAnswer, language });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['en', 'vi', 'ja', 'ko', 'fr', 'de'] as const).map(l => (
          <button key={l} onClick={() => setLanguage(l)}
            className={cn('text-xs px-3 py-1 rounded-full border font-medium transition-all',
              language === l ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {({ en: 'English', vi: 'Tiếng Việt', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German' } as Record<string, string>)[l]}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Đoạn văn cần nghe hiểu</label>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
          placeholder="Dán đoạn văn bản gốc (đoạn audio) vào đây..."
          className="w-full h-28 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Câu trả lời / tóm tắt của bạn</label>
        <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
          placeholder="Nhập những gì bạn đã nghe và hiểu được..."
          className="w-full h-24 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="flex justify-end">
        <button onClick={submit} disabled={!transcript.trim() || !userAnswer.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}
          Đánh giá
        </button>
      </div>

      {result && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3">
            <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0',
              result.score >= 8 ? 'bg-green-100 text-green-700' : result.score >= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
              {result.score}/10
            </div>
            <div>
              <p className="text-sm font-medium">{result.comprehension}</p>
              <p className="text-xs text-primary mt-0.5 italic">{result.encouragement}</p>
            </div>
          </div>
          {result.correct.length > 0 && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Hiểu đúng</p>
              {result.correct.map((c, i) => <p key={i} className="text-xs text-green-700">· {c}</p>)}
            </div>
          )}
          {result.missed.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-1.5"><AlertCircle className="h-3.5 w-3.5" />Bỏ sót</p>
              {result.missed.map((m, i) => <p key={i} className="text-xs text-red-700">· {m}</p>)}
            </div>
          )}
          {result.tip && (
            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{result.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Conversation Coach ────────────────────────────────────────────────────────

interface ConvMessage { role: 'user' | 'ai'; content: string }

interface ConversationResult {
  fluency: number;
  accuracy: number;
  naturalness: number;
  overall: string;
  improvements: string[];
  betterPhrases: { original: string; better: string }[];
  nextTopic: string;
  encouragement: string;
}

function ConversationCoach() {
  const [messages, setMessages] = useState<ConvMessage[]>([
    { role: 'user', content: '' },
    { role: 'ai', content: '' },
  ]);
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<ConversationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const addRow = (role: 'user' | 'ai') => setMessages(m => [...m, { role, content: '' }]);
  const updateMsg = (i: number, content: string) => setMessages(m => m.map((x, idx) => idx === i ? { ...x, content } : x));
  const removeRow = (i: number) => setMessages(m => m.filter((_, idx) => idx !== i));

  const validMsgs = messages.filter(m => m.content.trim());

  const submit = async () => {
    if (validMsgs.length < 1 || loading) return;
    setLoading(true);
    try {
      const r = await api.post<ConversationResult>('/ai/conversation-coach', { messages: validMsgs, language, topic: topic || undefined });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['en', 'vi', 'ja', 'ko', 'fr', 'de'] as const).map(l => (
          <button key={l} onClick={() => setLanguage(l)}
            className={cn('text-xs px-3 py-1 rounded-full border font-medium transition-all',
              language === l ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {({ en: 'English', vi: 'Tiếng Việt', ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German' } as Record<string, string>)[l]}
          </button>
        ))}
      </div>

      <input value={topic} onChange={e => setTopic(e.target.value)}
        placeholder="Chủ đề hội thoại (không bắt buộc)"
        className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />

      {/* Conversation rows */}
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2">
            <button
              onClick={() => updateMsg(i, messages[i].content)} // cycle role
              className={cn('shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border mt-2 transition-colors cursor-default',
                msg.role === 'user' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500')}
            >
              {msg.role === 'user' ? 'Học sinh' : 'AI'}
            </button>
            <input
              value={msg.content}
              onChange={e => updateMsg(i, e.target.value)}
              placeholder={msg.role === 'user' ? 'Câu của học sinh...' : 'Câu của AI...'}
              className="flex-1 p-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {messages.length > 2 && (
              <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-400 transition-colors mt-2.5">✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => addRow('user')} className="text-xs px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">+ Học sinh</button>
        <button onClick={() => addRow('ai')} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">+ AI</button>
        <button onClick={submit} disabled={validMsgs.length < 1 || loading}
          className="ml-auto flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Phân tích
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-2">
            {([['Trôi chảy', result.fluency], ['Chính xác', result.accuracy], ['Tự nhiên', result.naturalness]] as [string, number][]).map(([label, score]) => (
              <div key={label} className={cn('rounded-xl p-3 text-center border',
                score >= 8 ? 'bg-green-50 border-green-200' : score >= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200')}>
                <p className={cn('text-xl font-bold', score >= 8 ? 'text-green-700' : score >= 6 ? 'text-yellow-700' : 'text-red-700')}>{score}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm">{result.overall}</p>
          {result.improvements.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5"><Lightbulb className="h-3.5 w-3.5" />Cải thiện</p>
              {result.improvements.map((imp, i) => <p key={i} className="text-xs text-amber-700">· {imp}</p>)}
            </div>
          )}
          {result.betterPhrases.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" />Cách nói tự nhiên hơn</p>
              {result.betterPhrases.map((bp, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="line-through text-gray-400">{bp.original}</p>
                  <p className="text-blue-700 font-medium">→ {bp.better}</p>
                </div>
              ))}
            </div>
          )}
          {result.nextTopic && (
            <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary"><strong>Chủ đề tiếp theo:</strong> {result.nextTopic}</p>
            </div>
          )}
          <p className="text-xs text-primary italic text-center">{result.encouragement}</p>
        </div>
      )}
    </div>
  );
}

// ─── Speaking Coach ────────────────────────────────────────────────────────────

interface SpeakingAiResult {
  transcript: string;
  score: number;
  feedback: string;
  corrections: string[];
  encouragement: string;
}

const SPEAKING_PROMPTS = [
  { en: 'Tell me about your daily routine and what you enjoy most about it.', target: '' },
  { en: 'Describe a memorable trip you have taken.', target: '' },
  { en: 'What are the advantages of learning a foreign language?', target: '' },
  { en: "Talk about your favorite hobby and why you enjoy it.", target: '' },
  { en: 'How has technology changed the way people communicate?', target: '' },
];

function SpeakingCoach() {
  const [targetPhrase, setTargetPhrase] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<SpeakingAiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const canRecord = typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let full = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) full += t + ' ';
        else interim = t;
      }
      setTranscript(full + interim);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const randomPrompt = () => {
    const p = SPEAKING_PROMPTS[Math.floor(Math.random() * SPEAKING_PROMPTS.length)];
    setTargetPhrase(p.en);
    setTranscript('');
    setResult(null);
  };

  const submit = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<SpeakingAiResult>('/ai/speaking-practice', {
        transcript: transcript.trim(),
        subject: 'language',
        targetPhrase: targetPhrase.trim() || undefined,
      });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Nói tiếng Anh rồi nhận phản hồi từ AI giáo viên</p>
        <button onClick={randomPrompt}
          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
          Câu hỏi ngẫu nhiên
        </button>
      </div>

      {/* Target phrase */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Chủ đề / câu mục tiêu (không bắt buộc)</label>
        <input
          value={targetPhrase}
          onChange={e => setTargetPhrase(e.target.value)}
          placeholder="Ví dụ: Tell me about yourself..."
          className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Recording */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Câu trả lời của bạn</label>
          {canRecord && (
            <button
              onClick={listening ? stopListening : startListening}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all',
                listening
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100',
              )}>
              {listening ? <><MicOff className="h-3.5 w-3.5" />Dừng</> : <><Mic className="h-3.5 w-3.5" />Ghi âm</>}
            </button>
          )}
          {listening && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />Đang nghe...
            </span>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Nói hoặc gõ câu trả lời tiếng Anh vào đây..."
          className="w-full h-28 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={!transcript.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          Đánh giá
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Score */}
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-16 w-16 rounded-2xl flex flex-col items-center justify-center shrink-0',
              result.score >= 8 ? 'bg-green-100' : result.score >= 6 ? 'bg-yellow-100' : 'bg-red-100',
            )}>
              <span className={cn('text-2xl font-bold', result.score >= 8 ? 'text-green-700' : result.score >= 6 ? 'text-yellow-700' : 'text-red-700')}>
                {result.score}
              </span>
              <span className="text-[10px] text-gray-400">/10</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{result.feedback}</p>
              <p className="text-xs text-primary mt-0.5 italic">{result.encouragement}</p>
            </div>
          </div>

          {/* Corrections */}
          {result.corrections.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Cần cải thiện</p>
              {result.corrections.map((c, i) => (
                <p key={i} className="text-xs text-amber-700">· {c}</p>
              ))}
            </div>
          )}

          {result.corrections.length === 0 && (
            <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-700 font-medium">Tuyệt vời! Không có lỗi đáng kể.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { key: CoachTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'writing',      label: 'Writing Coach',      icon: PenLine,       desc: 'Chấm bài viết, sửa ngữ pháp & từ vựng' },
  { key: 'listening',    label: 'Listening Coach',    icon: Headphones,    desc: 'Đánh giá kỹ năng nghe hiểu' },
  { key: 'conversation', label: 'Conversation Coach', icon: MessageCircle, desc: 'Phân tích hội thoại, gợi ý cách nói tự nhiên' },
  { key: 'speaking',     label: 'Speaking Coach',     icon: Mic,           desc: 'Luyện nói tiếng Anh với AI, nhận phản hồi tức thì' },
];

export default function LanguageCoachPage() {
  const [tab, setTab] = useState<CoachTab>('writing');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/language" className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Language Coach AI</h1>
          <p className="text-xs text-muted-foreground">Luyện kỹ năng ngôn ngữ cùng AI giáo viên</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-2 gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50',
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs text-muted-foreground mb-4">{TABS.find(t => t.key === tab)?.desc}</p>
        {tab === 'writing'      && <WritingCoach />}
        {tab === 'listening'    && <ListeningCoach />}
        {tab === 'conversation' && <ConversationCoach />}
        {tab === 'speaking'     && <SpeakingCoach />}
      </div>
    </div>
  );
}
