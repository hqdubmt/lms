'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Volume2, Mic, MicOff, BookOpen, ChevronLeft, Loader2,
  CheckCircle2, XCircle, History, BarChart2, RefreshCw, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePronunciation } from '@/hooks/usePronunciation';
import { IpaGuideModal } from '@/components/pronunciation/IpaGuideModal';
import {
  fetchPronunciation, fetchPronunciationScore, fetchPronunciationHistory,
  type PronunciationResult, type ScoreResult, type HistoryEntry,
} from '@/services/pronunciationApi';

// ─── Practice sentences ────────────────────────────────────────────────────────

const PRACTICE_SENTENCES = [
  'The weather is beautiful today.',
  'She sells seashells by the seashore.',
  'How much wood would a woodchuck chuck?',
  'I would like a cup of coffee, please.',
  'Can you help me find the nearest station?',
  'The quick brown fox jumps over the lazy dog.',
  'I enjoy learning English every day.',
  'Practice makes perfect.',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? 'text-green-600' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  const bg = score >= 85 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const label = score >= 85 ? 'Xuất sắc!' : score >= 60 ? 'Khá tốt!' : 'Cần luyện thêm';
  return (
    <div className={cn('rounded-2xl border-2 flex flex-col items-center justify-center p-4 w-28 h-28 shrink-0', bg)}>
      <span className={cn('text-3xl font-bold', color)}>{score}</span>
      <span className="text-[10px] text-gray-400">/100</span>
      <span className={cn('text-xs font-medium mt-1', color)}>{label}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'analyze' | 'practice' | 'history';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'analyze',  label: 'Phân tích IPA',  icon: Volume2 },
  { id: 'practice', label: 'Luyện nói',       icon: Mic     },
  { id: 'history',  label: 'Lịch sử',         icon: History },
];

// ─── Analyze Tab ──────────────────────────────────────────────────────────────

function AnalyzeTab() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetchPronunciation(input.trim());
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi phân tích');
    } finally {
      setLoading(false);
    }
  };

  const playTts = (text: string) => {
    const url = `/api/language/tts?text=${encodeURIComponent(text)}&lang=en-US`;
    new Audio(url).play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="Nhập từ hoặc câu tiếng Anh để phân tích..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={() => input.trim() && playTts(input.trim())}
          className="px-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 shrink-0"
          title="Nghe phát âm mẫu"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          onClick={analyze}
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Phân tích'}
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-3 py-3 rounded-xl border border-gray-200 hover:bg-blue-50 text-gray-500 hover:text-blue-600 shrink-0"
          title="Bảng IPA"
        >
          <BookOpen className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          <XCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {/* IPA */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">IPA</span>
              <button onClick={() => playTts(input)} className="text-blue-400 hover:text-blue-600">
                <Play className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="font-mono text-2xl text-blue-800 font-semibold">{result.ipa}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
            {result.stress && (
              <div className="px-5 py-3">
                <span className="text-xs text-gray-400 font-medium block mb-1">Trọng âm</span>
                <span className="font-bold text-gray-800">{result.stress}</span>
              </div>
            )}
            {result.syllables && (
              <div className="px-5 py-3">
                <span className="text-xs text-gray-400 font-medium block mb-1">Âm tiết</span>
                <span className="text-gray-700">{result.syllables}</span>
              </div>
            )}
          </div>

          {result.vietnameseHint && (
            <div className="px-5 py-3">
              <span className="text-xs text-gray-400 font-medium block mb-1">Đọc gần giống tiếng Việt</span>
              <span className="text-orange-600 font-semibold text-base">{result.vietnameseHint}</span>
            </div>
          )}

          {result.linking && (
            <div className="px-5 py-3">
              <span className="text-xs text-gray-400 font-medium block mb-1">Nối âm</span>
              <span className="text-gray-700">{result.linking}</span>
            </div>
          )}

          {result.reduction && (
            <div className="px-5 py-3">
              <span className="text-xs text-gray-400 font-medium block mb-1">Giảm âm</span>
              <span className="text-gray-700">{result.reduction}</span>
            </div>
          )}

          {result.commonMistakes && result.commonMistakes.length > 0 && (
            <div className="px-5 py-4 bg-orange-50">
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide block mb-2">Lỗi thường gặp</span>
              <ul className="space-y-1">
                {result.commonMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.tips.length > 0 && (
            <div className="px-5 py-4 bg-green-50">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide block mb-2">Mẹo luyện tập</span>
              <ul className="space-y-1">
                {result.tips.map((t, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />{t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showGuide && <IpaGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

// ─── Practice Tab (mic + score) ───────────────────────────────────────────────

function PracticeTab() {
  const [expected, setExpected] = useState(PRACTICE_SENTENCES[0]);
  const [transcript, setTranscript] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [listening, setListening] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState('');
  const [micSupported] = useState(() => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
  const recognitionRef = useRef<any>(null);

  const playTts = (text: string) => {
    const url = `/api/language/tts?text=${encodeURIComponent(text)}&lang=en-US`;
    new Audio(url).play().catch(() => {});
  };

  const startListening = useCallback(() => {
    if (!micSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
    };
    rec.onerror = () => { setError('Không nhận được giọng nói. Kiểm tra micro.'); setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [micSupported]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const score = async () => {
    if (!expected.trim() || !transcript.trim()) return;
    setScoring(true); setError(''); setScoreResult(null);
    try {
      const r = await fetchPronunciationScore(expected, transcript);
      setScoreResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi chấm điểm');
    } finally {
      setScoring(false);
    }
  };

  const randomSentence = () => {
    const others = PRACTICE_SENTENCES.filter(s => s !== expected);
    setExpected(others[Math.floor(Math.random() * others.length)]);
    setTranscript(''); setScoreResult(null); setError('');
  };

  return (
    <div className="space-y-5">
      {/* Câu mẫu */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Câu cần đọc</span>
          <div className="flex items-center gap-2">
            <button
              onClick={randomSentence}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />Câu khác
            </button>
            <button
              onClick={() => playTts(expected)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <Volume2 className="h-3.5 w-3.5" />Nghe mẫu
            </button>
          </div>
        </div>
        <p className="text-base font-medium text-gray-800 bg-blue-50 rounded-xl px-4 py-3">{expected}</p>
        <textarea
          value={expected}
          onChange={e => { setExpected(e.target.value); setScoreResult(null); }}
          placeholder="Hoặc nhập câu tùy chỉnh..."
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>

      {/* Ghi âm */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <span className="text-sm font-semibold text-gray-700">Ghi âm giọng của bạn</span>

        {!micSupported && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            Trình duyệt chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={listening ? stopListening : startListening}
            disabled={!micSupported}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all',
              listening
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-40',
            )}
          >
            {listening ? (
              <><MicOff className="h-4 w-4" />Dừng ghi âm</>
            ) : (
              <><Mic className="h-4 w-4" />Bắt đầu nói</>
            )}
          </button>
          {listening && (
            <span className="text-xs text-red-500 animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
              Đang nghe...
            </span>
          )}
        </div>

        {/* Transcript */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Bạn đã nói (tự sửa nếu cần)</label>
          <textarea
            value={transcript}
            onChange={e => { setTranscript(e.target.value); setScoreResult(null); }}
            placeholder="Kết quả nhận diện giọng nói sẽ hiện ở đây..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 resize-none"
          />
        </div>

        <button
          onClick={score}
          disabled={scoring || !expected.trim() || !transcript.trim()}
          className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
          Chấm điểm phát âm
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
          <XCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Score result */}
      {scoreResult && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-5">
            <ScoreRing score={scoreResult.score} />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-gray-700">
                {scoreResult.mistakes.length === 0 ? 'Hoàn hảo! Không có lỗi nào.' : `${scoreResult.mistakes.length} từ cần cải thiện`}
              </p>
              <p className="text-xs text-gray-400">So sánh với câu mẫu</p>
            </div>
          </div>

          {scoreResult.mistakes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Từ sai / thiếu</span>
              {scoreResult.mistakes.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-red-700">
                    Vị trí {m.position + 1}: kỳ vọng <strong>{m.expected}</strong>, bạn nói <strong>{m.spoken}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {scoreResult.tips.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Gợi ý</span>
              {scoreResult.tips.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />{t}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [data, setData] = useState<{
    history: HistoryEntry[];
    pronunciationCount: number;
    averagePronunciationScore: number;
    bestPronunciationScore: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchPronunciationHistory();
      setData(r);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  if (!data || data.pronunciationCount === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-muted-foreground">
      <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p>Chưa có lịch sử luyện tập</p>
      <p className="text-xs mt-1">Hãy phân tích hoặc luyện nói để tích lũy dữ liệu</p>
    </div>
  );

  const scores = data.history.filter((h: any) => h.type === 'score');

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{data.pronunciationCount}</p>
          <p className="text-xs text-gray-400 mt-1">Lần luyện tập</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{data.averagePronunciationScore || '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Điểm TB</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{data.bestPronunciationScore || '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Điểm cao nhất</p>
        </div>
      </div>

      {/* Score history */}
      {scores.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Lịch sử chấm điểm</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {scores.reverse().map((h: any, i: number) => {
              const scoreColor = h.score >= 85 ? 'text-green-600 bg-green-50' : h.score >= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className={cn('text-sm font-bold px-2.5 py-1 rounded-lg min-w-[3rem] text-center', scoreColor)}>
                    {h.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{h.expected}</p>
                    <p className="text-xs text-gray-400 truncate">Bạn nói: {h.spoken}</p>
                  </div>
                  <span className="text-xs text-gray-300 shrink-0">{new Date(h.at).toLocaleDateString('vi-VN')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={load}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />Tải lại
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PronunciationPage() {
  const [tab, setTab] = useState<Tab>('analyze');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/language" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" />Học ngoại ngữ
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Volume2 className="h-6 w-6 text-blue-600" />
          Luyện phát âm
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Phân tích IPA, luyện nói với mic và theo dõi tiến độ</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all',
                tab === t.id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'analyze'  && <AnalyzeTab />}
      {tab === 'practice' && <PracticeTab />}
      {tab === 'history'  && <HistoryTab />}
    </div>
  );
}
