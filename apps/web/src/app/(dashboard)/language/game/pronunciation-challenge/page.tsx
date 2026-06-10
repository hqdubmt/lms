'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, MicOff, Volume2, Trophy, CheckCircle2, SkipForward, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { fetchPronunciationScore, type ScoreResult } from '@/services/pronunciationApi';

interface Sentence {
  id: string;
  text: string;
}

interface SessionScore {
  id: string;
  score: number;
}

type GameState = 'idle' | 'playing' | 'done';
type RecordState = 'idle' | 'listening' | 'scoring';

const LANG_OPTIONS = [
  { value: 'en', label: 'English', tts: 'en-US', speech: 'en-US' },
  { value: 'fr', label: 'Français', tts: 'fr-FR', speech: 'fr-FR' },
  { value: 'ja', label: '日本語', tts: 'ja-JP', speech: 'ja-JP' },
  { value: 'ko', label: '한국어', tts: 'ko-KR', speech: 'ko-KR' },
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 55 ? 'text-yellow-600' : 'text-red-500';
  const bg = score >= 80 ? 'bg-green-50 border-green-300' : score >= 55 ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300';
  const label = score >= 80 ? 'Xuất sắc!' : score >= 55 ? 'Khá tốt!' : 'Thử lại!';
  return (
    <div className={cn('rounded-2xl border-2 flex flex-col items-center justify-center w-24 h-24 shrink-0', bg)}>
      <span className={cn('text-3xl font-bold', color)}>{score}</span>
      <span className="text-[10px] text-gray-400">/100</span>
      <span className={cn('text-xs font-medium mt-0.5', color)}>{label}</span>
    </div>
  );
}

export default function PronunciationChallengePage() {
  const [lang, setLang] = useState('en');
  const [state, setState] = useState<GameState>('idle');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [current, setCurrent] = useState(0);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [transcript, setTranscript] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [sessionScores, setSessionScores] = useState<SessionScore[]>([]);
  const [finalResult, setFinalResult] = useState<{ avgScore: number; xpEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ttsLang, setTtsLang] = useState('en-US');
  const recognitionRef = useRef<any>(null);

  const micSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const langOpt = LANG_OPTIONS.find(l => l.value === lang) ?? LANG_OPTIONS[0];

  const startGame = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ sentences: Sentence[]; ttsLang: string }>(`/language/game/pronunciation-challenge?lang=${lang}&count=8`);
      setSentences(data.sentences);
      setTtsLang(data.ttsLang ?? langOpt.tts);
      setCurrent(0);
      setSessionScores([]);
      setFinalResult(null);
      setTranscript('');
      setScoreResult(null);
      setState('playing');
    } finally {
      setLoading(false);
    }
  };

  const playTts = (text: string) => {
    const url = `/api/language/tts?text=${encodeURIComponent(text)}&lang=${ttsLang}`;
    new Audio(url).play().catch(() => {});
  };

  const startListening = useCallback(() => {
    if (!micSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = langOpt.speech;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setRecordState('listening');
    rec.onresult = (e: any) => {
      setTranscript(e.results[0][0].transcript);
      setRecordState('scoring');
    };
    rec.onerror = () => setRecordState('idle');
    rec.onend = () => { if (recordState === 'listening') setRecordState('idle'); };
    recognitionRef.current = rec;
    setTranscript('');
    setScoreResult(null);
    rec.start();
  }, [micSupported, langOpt.speech, recordState]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setRecordState('idle');
  };

  const handleScoreTranscript = async (expected: string, spoken: string) => {
    setRecordState('scoring');
    try {
      const r = await fetchPronunciationScore(expected, spoken);
      setScoreResult(r);
    } catch {
      setScoreResult({ score: 0, mistakes: [], tips: ['Không thể chấm điểm. Thử lại.'] });
    }
    setRecordState('idle');
  };

  // When transcript is ready, auto-score
  const prevTranscript = useRef('');
  if (transcript && transcript !== prevTranscript.current && recordState === 'scoring') {
    prevTranscript.current = transcript;
    const s = sentences[current];
    if (s) handleScoreTranscript(s.text, transcript);
  }

  const handleNext = async (skip = false) => {
    const s = sentences[current];
    const score = skip ? 0 : (scoreResult?.score ?? 0);
    const newScores = [...sessionScores, { id: s.id, score }];
    setSessionScores(newScores);
    setTranscript('');
    setScoreResult(null);
    setRecordState('idle');
    prevTranscript.current = '';

    if (current + 1 >= sentences.length) {
      setState('done');
      try {
        const res = await api.post<{ avgScore: number; xpEarned: number }>(
          '/language/game/pronunciation-challenge/submit',
          { scores: newScores, totalSentences: sentences.length }
        );
        setFinalResult(res);
      } catch {
        const avg = Math.round(newScores.reduce((a, b) => a + b.score, 0) / newScores.length);
        setFinalResult({ avgScore: avg, xpEarned: avg * 2 });
      }
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-8 text-white text-center shadow-xl">
          <Mic className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Pronunciation Challenge</h1>
          <p className="text-white/80 mt-1">Nghe → Nói → AI chấm điểm phát âm!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          {!micSupported && (
            <div className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              Trình duyệt không hỗ trợ ghi âm. Bạn có thể dùng chế độ gõ thay thế.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ luyện</label>
            <div className="grid grid-cols-2 gap-2">
              {LANG_OPTIONS.map(l => (
                <button key={l.value} onClick={() => setLang(l.value)}
                  className={cn('py-2.5 rounded-xl border-2 text-sm font-medium transition',
                    lang === l.value ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Nghe câu mẫu → ghi âm giọng nói → nhận điểm</p>
            <p>✦ Điểm trung bình ≥90: <span className="font-semibold text-rose-600">+50 XP bonus</span></p>
            <p>✦ Mỗi câu luyện: <span className="font-semibold text-rose-600">+5 XP</span></p>
          </div>
          <button onClick={startGame} disabled={loading}
            className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg transition disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Bắt đầu luyện!'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/language" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Ngoại ngữ
        </Link>
        {finalResult ? (
          <>
            <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
              finalResult.avgScore >= 80 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : finalResult.avgScore >= 55 ? 'bg-gradient-to-br from-pink-500 to-rose-600'
              : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
              <Trophy className="w-14 h-14 mx-auto mb-3" />
              <div className="text-5xl font-black">{finalResult.avgScore}</div>
              <p className="text-white/80 mt-1">Điểm trung bình / 100</p>
              <p className="text-white/70 text-sm mt-1">+{finalResult.xpEarned} XP · {sentences.length} câu</p>
            </div>
            <div className="space-y-2">
              {sessionScores.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-500 w-24 shrink-0 truncate">Câu {i + 1}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className={cn('h-2 rounded-full', s.score >= 80 ? 'bg-green-500' : s.score >= 55 ? 'bg-yellow-400' : 'bg-red-400')}
                      style={{ width: `${s.score}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-10 text-right">{s.score}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
                Chọn lại
              </button>
              <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition">
                Chơi lại!
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  const s = sentences[current];
  if (!s) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-rose-500" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{sentences.length}</span>
        </div>
        <span className="text-sm text-gray-400 font-medium">{langOpt.label}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${(current / sentences.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-rose-200 p-6 space-y-4">
        <p className="text-xl font-bold text-gray-800 text-center">{s.text}</p>
        <div className="flex justify-center">
          <button onClick={() => playTts(s.text)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium transition text-sm">
            <Volume2 className="w-4 h-4" />
            Nghe mẫu
          </button>
        </div>
      </div>

      {/* Recording area */}
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center space-y-3">
        {!micSupported ? (
          <>
            <p className="text-sm text-gray-500">Gõ những gì bạn sẽ nói:</p>
            <input value={transcript} onChange={e => setTranscript(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-rose-400"
              placeholder={s.text} />
            {transcript && (
              <button onClick={() => handleScoreTranscript(s.text, transcript)}
                className="px-5 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium">
                Chấm điểm
              </button>
            )}
          </>
        ) : (
          <>
            {recordState === 'idle' && !scoreResult && (
              <button onClick={startListening}
                className="mx-auto flex items-center gap-2 px-6 py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold transition">
                <Mic className="w-5 h-5" />
                Nhấn để ghi âm
              </button>
            )}
            {recordState === 'listening' && (
              <button onClick={stopListening}
                className="mx-auto flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse transition">
                <MicOff className="w-5 h-5" />
                Đang nghe... Nhấn dừng
              </button>
            )}
            {recordState === 'scoring' && (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Đang chấm điểm...</span>
              </div>
            )}
          </>
        )}

        {transcript && <p className="text-sm text-gray-500 italic">"{transcript}"</p>}
      </div>

      {/* Score result */}
      {scoreResult && (
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          <div className="flex items-center gap-4">
            <ScoreRing score={scoreResult.score} />
            <div className="flex-1 space-y-2">
              {scoreResult.tips.slice(0, 2).map((tip, i) => (
                <p key={i} className="text-sm text-gray-600">• {tip}</p>
              ))}
              {scoreResult.mistakes.length === 0 && (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Phát âm chính xác!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {scoreResult ? (
          <button onClick={() => handleNext(false)}
            className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition">
            {current + 1 >= sentences.length ? 'Xem kết quả' : 'Câu tiếp →'}
          </button>
        ) : (
          <button onClick={() => handleNext(true)}
            className="flex-1 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium transition flex items-center justify-center gap-2">
            <SkipForward className="w-4 h-4" />
            Bỏ qua
          </button>
        )}
        {scoreResult && (
          <button onClick={() => { setTranscript(''); setScoreResult(null); prevTranscript.current = ''; }}
            className="px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-600 font-medium transition text-sm">
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
