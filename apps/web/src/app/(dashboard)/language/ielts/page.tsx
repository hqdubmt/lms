'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, PenLine, MessageCircle, Mic, MicOff, Loader2,
  Star, AlertCircle, CheckCircle2, Lightbulb, RefreshCw, BookOpen,
  TrendingUp, Volume2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type IeltsTab = 'writing1' | 'writing2' | 'speaking';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function BandBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? 'bg-green-100 text-green-800 border-green-300' :
    score >= 5.5 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
    'bg-red-100 text-red-800 border-red-300';
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full border', color)}>
      <Star className="h-3.5 w-3.5" />Band {score}
    </span>
  );
}

function CriteriaBar({ label, score, feedback }: { label: string; score: number; feedback?: string }) {
  const pct = (score / 9) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">{score}/9</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      {feedback && <p className="text-[11px] text-muted-foreground leading-relaxed">{feedback}</p>}
    </div>
  );
}

function PromptBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    chart: 'Bar Chart', graph: 'Line Graph', table: 'Table', process: 'Process', map: 'Map', diagram: 'Diagram',
    opinion: 'Opinion Essay', discussion: 'Discussion', problem_solution: 'Problem/Solution',
    advantages_disadvantages: 'Adv / Disadv', two_part: 'Two-Part Question',
  };
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      {map[type] ?? type}
    </span>
  );
}

// ─── Writing Task 1 ────────────────────────────────────────────────────────────

interface W1Result {
  bandScore: number; wordCount: number; minWordsMet: boolean;
  taskAchievement: { score: number; feedback: string };
  coherenceCohesion: { score: number; feedback: string };
  lexicalResource: { score: number; feedback: string; betterWords?: { original: string; better: string; why: string }[] };
  grammaticalRange: { score: number; feedback: string; errors?: { error: string; fix: string }[] };
  overview?: string; keyFeatures?: string;
  improvements: string[];
  modelSentence?: string;
  encouragement: string;
}

function WritingTask1() {
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [type, setType] = useState<'chart' | 'graph' | 'table' | 'process' | 'map' | 'diagram'>('chart');
  const [result, setResult] = useState<W1Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const r = await api.get<{ prompt: string; type: string }>('/ai/ielts/prompt?task=1');
      setPrompt(r.prompt);
      setType((r.type as any) ?? 'chart');
    } catch { /* noop */ } finally { setLoadingPrompt(false); }
  };

  const submit = async () => {
    if (!essay.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<W1Result>('/ai/ielts/writing1', { prompt: prompt || undefined, essay, type });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Mô tả biểu đồ, bảng, quy trình, bản đồ (tối thiểu 150 từ)</p>
        <button onClick={fetchPrompt} disabled={loadingPrompt}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
          {loadingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Đề ngẫu nhiên
        </button>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5">
        {(['chart', 'graph', 'table', 'process', 'map', 'diagram'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={cn('text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
              type === t ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {({ chart: 'Bar Chart', graph: 'Line Graph', table: 'Table', process: 'Process', map: 'Map', diagram: 'Diagram' })[t]}
          </button>
        ))}
      </div>

      {prompt && (
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed border border-blue-100">
          <p className="font-semibold text-blue-700 mb-1 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />Task Prompt:</p>
          {prompt}
        </div>
      )}
      {!prompt && (
        <input value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Dán đề bài vào đây (không bắt buộc)..."
          className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
      )}

      <div className="relative">
        <textarea value={essay} onChange={e => setEssay(e.target.value)}
          placeholder="Viết bài Task 1 của bạn vào đây..."
          className="w-full h-48 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          <span className={cn('text-xs font-medium', wordCount >= 150 ? 'text-green-600' : 'text-red-500')}>
            {wordCount} / 150 từ
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={!essay.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          Chấm điểm
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Band Score */}
          <div className="flex items-center justify-between">
            <div>
              <BandBadge score={result.bandScore} />
              <p className="text-xs text-muted-foreground mt-1">{result.wordCount} từ · {result.minWordsMet ? '✓ Đủ độ dài' : '✗ Chưa đủ 150 từ'}</p>
            </div>
            <p className="text-xs text-primary italic max-w-[200px] text-right">{result.encouragement}</p>
          </div>

          {/* Criteria */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <CriteriaBar label="Task Achievement" score={result.taskAchievement.score} feedback={result.taskAchievement.feedback} />
            <CriteriaBar label="Coherence & Cohesion" score={result.coherenceCohesion.score} feedback={result.coherenceCohesion.feedback} />
            <CriteriaBar label="Lexical Resource" score={result.lexicalResource.score} feedback={result.lexicalResource.feedback} />
            <CriteriaBar label="Grammatical Range" score={result.grammaticalRange.score} feedback={result.grammaticalRange.feedback} />
          </div>

          {/* Grammar errors */}
          {result.grammaticalRange.errors && result.grammaticalRange.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Lỗi ngữ pháp</p>
              {result.grammaticalRange.errors.map((e, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="line-through text-red-500">{e.error}</p>
                  <p className="text-green-700 font-medium">→ {e.fix}</p>
                </div>
              ))}
            </div>
          )}

          {/* Better words */}
          {result.lexicalResource.betterWords && result.lexicalResource.betterWords.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" />Từ vựng nâng cao</p>
              {result.lexicalResource.betterWords.map((w, i) => (
                <div key={i} className="text-xs">
                  <span className="text-gray-500 line-through">{w.original}</span>
                  <span className="mx-1 text-blue-600 font-medium">→ {w.better}</span>
                  {w.why && <span className="text-gray-400">({w.why})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Model sentence */}
          {result.modelSentence && (
            <div className="bg-green-50 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Câu mẫu Band 7+</p>
                <p className="text-xs text-green-800 italic">{result.modelSentence}</p>
              </div>
            </div>
          )}

          {/* Improvements */}
          {result.improvements.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Cải thiện</p>
              {result.improvements.map((imp, i) => (
                <p key={i} className="text-xs text-amber-700">· {imp}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Writing Task 2 ────────────────────────────────────────────────────────────

interface W2Result {
  bandScore: number; wordCount: number; minWordsMet: boolean;
  taskResponse: { score: number; feedback: string; thesis?: string };
  coherenceCohesion: { score: number; feedback: string; structure?: string };
  lexicalResource: { score: number; feedback: string; advanced?: string[]; betterWords?: { original: string; better: string }[] };
  grammaticalRange: { score: number; feedback: string; errors?: { error: string; fix: string }[] };
  paragraphStructure?: { intro: string; body: string; conclusion: string };
  improvements: string[];
  sampleThesis?: string;
  encouragement: string;
}

function WritingTask2() {
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [type, setType] = useState<'opinion' | 'discussion' | 'problem_solution' | 'advantages_disadvantages' | 'two_part'>('opinion');
  const [result, setResult] = useState<W2Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const r = await api.get<{ prompt: string; type: string }>('/ai/ielts/prompt?task=2');
      setPrompt(r.prompt);
      setType((r.type as any) ?? 'opinion');
    } catch { /* noop */ } finally { setLoadingPrompt(false); }
  };

  const submit = async () => {
    if (!essay.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<W2Result>('/ai/ielts/writing2', { prompt: prompt || undefined, essay, type });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Bài luận argumentative/discussion (tối thiểu 250 từ)</p>
        <button onClick={fetchPrompt} disabled={loadingPrompt}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
          {loadingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Đề ngẫu nhiên
        </button>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5">
        {([
          ['opinion', 'Opinion'],
          ['discussion', 'Discussion'],
          ['problem_solution', 'Problem/Solution'],
          ['advantages_disadvantages', 'Adv/Disadv'],
          ['two_part', 'Two-Part'],
        ] as const).map(([val, label]) => (
          <button key={val} onClick={() => setType(val)}
            className={cn('text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
              type === val ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50')}>
            {label}
          </button>
        ))}
      </div>

      {prompt && (
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-blue-700 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />Task Prompt:</p>
            <PromptBadge type={type} />
          </div>
          {prompt}
        </div>
      )}
      {!prompt && (
        <input value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Dán đề bài vào đây (không bắt buộc)..."
          className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
      )}

      <div className="relative">
        <textarea value={essay} onChange={e => setEssay(e.target.value)}
          placeholder="Viết bài Task 2 của bạn vào đây..."
          className="w-full h-56 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="absolute bottom-2 right-3">
          <span className={cn('text-xs font-medium', wordCount >= 250 ? 'text-green-600' : 'text-red-500')}>
            {wordCount} / 250 từ
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={!essay.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          Chấm điểm
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <BandBadge score={result.bandScore} />
              <p className="text-xs text-muted-foreground mt-1">{result.wordCount} từ · {result.minWordsMet ? '✓ Đủ độ dài' : '✗ Chưa đủ 250 từ'}</p>
            </div>
            <p className="text-xs text-primary italic max-w-[200px] text-right">{result.encouragement}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <CriteriaBar label="Task Response" score={result.taskResponse.score} feedback={result.taskResponse.feedback} />
            <CriteriaBar label="Coherence & Cohesion" score={result.coherenceCohesion.score} feedback={result.coherenceCohesion.feedback} />
            <CriteriaBar label="Lexical Resource" score={result.lexicalResource.score} feedback={result.lexicalResource.feedback} />
            <CriteriaBar label="Grammatical Range" score={result.grammaticalRange.score} feedback={result.grammaticalRange.feedback} />
          </div>

          {/* Paragraph structure */}
          {result.paragraphStructure && (
            <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Cấu trúc bài viết</p>
              {(['intro', 'body', 'conclusion'] as const).map(key => (
                <div key={key} className="text-xs">
                  <span className="font-medium text-indigo-600 capitalize">{({ intro: 'Giới thiệu', body: 'Thân bài', conclusion: 'Kết luận' })[key]}: </span>
                  <span className="text-gray-600">{result.paragraphStructure![key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sample thesis */}
          {result.sampleThesis && (
            <div className="bg-green-50 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Thesis statement mẫu Band 7+</p>
                <p className="text-xs text-green-800 italic">{result.sampleThesis}</p>
              </div>
            </div>
          )}

          {/* Grammar errors */}
          {result.grammaticalRange.errors && result.grammaticalRange.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Lỗi ngữ pháp</p>
              {result.grammaticalRange.errors.map((e, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="line-through text-red-500">{e.error}</p>
                  <p className="text-green-700 font-medium">→ {e.fix}</p>
                </div>
              ))}
            </div>
          )}

          {/* Advanced vocab */}
          {result.lexicalResource.advanced && result.lexicalResource.advanced.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-1.5"><Star className="h-3.5 w-3.5" />Từ vựng hay đã dùng</p>
              <div className="flex flex-wrap gap-1.5">
                {result.lexicalResource.advanced.map((w, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{w}</span>
                ))}
              </div>
            </div>
          )}

          {result.improvements.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Cải thiện</p>
              {result.improvements.map((imp, i) => (
                <p key={i} className="text-xs text-amber-700">· {imp}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Speaking Practice ─────────────────────────────────────────────────────────

interface SpeakingResult {
  bandScore: number;
  fluencyCoherence: { score: number; feedback: string };
  lexicalResource: { score: number; feedback: string; goodPhrases?: string[]; suggestions?: string[] };
  grammaticalRange: { score: number; feedback: string; errors?: { original: string; better: string }[] };
  pronunciation: { score: number; feedback: string };
  responseLength?: string;
  topicRelevance?: string;
  improvements: string[];
  modelAnswer?: string;
  encouragement: string;
}

function SpeakingCoach() {
  const [part, setPart] = useState<'1' | '2' | '3'>('1');
  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const r = await api.get<{ question: string; part: string }>('/ai/ielts/prompt?task=speaking');
      setQuestion(r.question);
      setPart((r.part as '1' | '2' | '3') ?? '1');
    } catch { /* noop */ } finally { setLoadingPrompt(false); }
  };

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

  const submit = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    try {
      const r = await api.post<SpeakingResult>('/ai/ielts/speaking', {
        part,
        question: question || undefined,
        transcript,
      });
      setResult(r);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  const canRecord = typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Luyện nói IELTS với AI examiner</p>
        <button onClick={fetchPrompt} disabled={loadingPrompt}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors">
          {loadingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Câu hỏi ngẫu nhiên
        </button>
      </div>

      {/* Part selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['1', '2', '3'] as const).map(p => (
          <button key={p} onClick={() => setPart(p)}
            className={cn('py-2 rounded-xl text-xs font-semibold border transition-all',
              part === p ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            Part {p}
            <p className={cn('text-[10px] font-normal mt-0.5', part === p ? 'text-white/80' : 'text-muted-foreground')}>
              {p === '1' ? 'Personal Qs' : p === '2' ? 'Long Turn' : 'Discussion'}
            </p>
          </button>
        ))}
      </div>

      {question && (
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed border border-blue-100">
          <p className="font-semibold text-blue-700 mb-1">Part {part} Question:</p>
          {question}
        </div>
      )}
      {!question && (
        <input value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="Nhập câu hỏi (không bắt buộc)..."
          className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
      )}

      {/* Recording area */}
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
              {listening ? (
                <><MicOff className="h-3.5 w-3.5" />Dừng</>
              ) : (
                <><Mic className="h-3.5 w-3.5" />Ghi âm</>
              )}
            </button>
          )}
          {listening && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />Đang nghe...
            </span>
          )}
        </div>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
          placeholder="Nói hoặc gõ câu trả lời của bạn vào đây..."
          className="w-full h-32 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-[11px] text-muted-foreground">{transcript.trim().split(/\s+/).filter(Boolean).length} từ</p>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} disabled={!transcript.trim() || loading}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          Chấm điểm
        </button>
      </div>

      {result && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <BandBadge score={result.bandScore} />
            <p className="text-xs text-primary italic max-w-[200px] text-right">{result.encouragement}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <CriteriaBar label="Fluency & Coherence" score={result.fluencyCoherence.score} feedback={result.fluencyCoherence.feedback} />
            <CriteriaBar label="Lexical Resource" score={result.lexicalResource.score} feedback={result.lexicalResource.feedback} />
            <CriteriaBar label="Grammatical Range" score={result.grammaticalRange.score} feedback={result.grammaticalRange.feedback} />
            <CriteriaBar label="Pronunciation" score={result.pronunciation.score} feedback={result.pronunciation.feedback} />
          </div>

          {result.lexicalResource.goodPhrases && result.lexicalResource.goodPhrases.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-1.5"><Star className="h-3.5 w-3.5" />Cụm từ tốt đã dùng</p>
              <div className="flex flex-wrap gap-1.5">
                {result.lexicalResource.goodPhrases.map((p, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                ))}
              </div>
            </div>
          )}

          {result.grammaticalRange.errors && result.grammaticalRange.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Cần sửa</p>
              {result.grammaticalRange.errors.map((e, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="line-through text-red-400">{e.original}</p>
                  <p className="text-green-700 font-medium">→ {e.better}</p>
                </div>
              ))}
            </div>
          )}

          {result.modelAnswer && (
            <div className="bg-green-50 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Câu trả lời mẫu Band 7+</p>
                <p className="text-xs text-green-800 italic leading-relaxed">{result.modelAnswer}</p>
              </div>
            </div>
          )}

          {result.improvements.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Cải thiện</p>
              {result.improvements.map((imp, i) => (
                <p key={i} className="text-xs text-amber-700">· {imp}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { key: IeltsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'writing1', label: 'Writing Task 1', icon: PenLine,       desc: 'Biểu đồ, bảng, quy trình, bản đồ' },
  { key: 'writing2', label: 'Writing Task 2', icon: BookOpen,      desc: 'Bài luận argumentative / discussion' },
  { key: 'speaking', label: 'Speaking',       icon: Mic,           desc: 'Luyện nói Part 1, 2 & 3' },
];

export default function IeltsCoachPage() {
  const [tab, setTab] = useState<IeltsTab>('writing1');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/language" className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            IELTS Coach AI
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Beta</span>
          </h1>
          <p className="text-xs text-muted-foreground">Luyện thi IELTS Writing & Speaking với AI examiner</p>
        </div>
      </div>

      {/* Band score guide */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        {[
          { band: '9', label: 'Expert', color: 'bg-emerald-100 text-emerald-700' },
          { band: '7–8', label: 'Good', color: 'bg-green-100 text-green-700' },
          { band: '5.5–6.5', label: 'Competent', color: 'bg-yellow-100 text-yellow-700' },
          { band: '≤5', label: 'Developing', color: 'bg-red-100 text-red-700' },
        ].map(({ band, label, color }) => (
          <div key={band} className={cn('rounded-xl p-2 border', color.replace('text-', 'border-').replace(/\d+$/, '200'))}>
            <p className={cn('text-sm font-bold', color.split(' ')[1])}>Band {band}</p>
            <p className="text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50',
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs text-muted-foreground mb-4">{TABS.find(t => t.key === tab)?.desc}</p>
        {tab === 'writing1' && <WritingTask1 />}
        {tab === 'writing2' && <WritingTask2 />}
        {tab === 'speaking' && <SpeakingCoach />}
      </div>

      {/* Tips footer */}
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-800 leading-relaxed border border-blue-100">
        <p className="font-semibold mb-1.5 flex items-center gap-1.5"><Star className="h-3.5 w-3.5" />Mẹo luyện IELTS hiệu quả</p>
        <ul className="space-y-1 text-blue-700">
          <li>· Writing Task 1: Luôn có câu overview tổng quát</li>
          <li>· Writing Task 2: Trả lời đúng câu hỏi, có thesis rõ ràng</li>
          <li>· Speaking: Nói chi tiết, dùng từ nối (however, therefore, moreover)</li>
          <li>· Aim for Band 7+: Dùng từ vựng học thuật, tránh lặp từ</li>
        </ul>
      </div>
    </div>
  );
}
