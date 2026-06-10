'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Sentence {
  id: string;
  text: string;
}

interface SubmitResult {
  results: Array<{ id: string; correct: boolean; similarity: number; expected: string; typed: string }>;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
}

type GameState = 'idle' | 'playing' | 'done';

const LEVEL_LABELS: Record<string, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };

export default function ChinhTaPage() {
  const [level, setLevel] = useState('easy');
  const [state, setState] = useState<GameState>('idle');
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ttsBase, setTtsBase] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startGame = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ sentences: Sentence[]; ttsUrl: string }>(`/viet/game/chinh-ta?level=${level}&count=10`);
      setSentences(data.sentences);
      setTyped({});
      setCurrent(0);
      setStreak(0);
      setMaxStreak(0);
      setResult(null);
      setRevealed(false);
      setTtsBase(data.ttsUrl || '/viet/tts?lang=vi-VN&text=');
      setState('playing');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (text: string) => {
    const url = `/api/proxy-tts?text=${encodeURIComponent(text)}&lang=vi-VN`;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = `${ttsBase}${encodeURIComponent(text)}`;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNext = async () => {
    const s = sentences[current];
    const userText = typed[s.id] ?? '';
    const isCorrect = normalize(userText) === normalize(s.text);

    const newStreak = isCorrect ? streak + 1 : 0;
    const newMax = Math.max(maxStreak, newStreak);
    setStreak(newStreak);
    setMaxStreak(newMax);
    setRevealed(false);

    if (current + 1 >= sentences.length) {
      setState('done');
      setLoading(true);
      try {
        const res = await api.post<SubmitResult>('/viet/game/chinh-ta/submit', {
          typed, sentences, streak: newMax,
        });
        setResult(res);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrent(c => c + 1);
    }
  };

  function normalize(s: string) {
    return s.trim().toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ');
  }

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/viet" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Tiếng Việt
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-8 text-white text-center shadow-xl">
          <Volume2 className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Chính Tả Thần Tốc</h1>
          <p className="text-white/80 mt-1">Nghe câu — gõ lại thật chính xác!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
            <div className="grid grid-cols-3 gap-2">
              {['easy', 'medium', 'hard'].map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={cn('py-2 rounded-lg border-2 text-sm font-medium transition',
                    level === l ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Nghe câu — gõ lại chính xác để ghi điểm</p>
            <p>✦ Mỗi câu đúng: <span className="font-semibold text-purple-600">+10 XP</span></p>
            <p>✦ 90% trở lên được tính đúng</p>
          </div>
          <button onClick={startGame} disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg transition disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Bắt đầu!'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/viet" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Tiếng Việt
        </Link>
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {result && (
          <>
            <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
              result.score === 100 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : result.score >= 60 ? 'bg-gradient-to-br from-violet-500 to-purple-700'
              : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
              <Trophy className="w-14 h-14 mx-auto mb-3" />
              <div className="text-5xl font-black">{result.score}%</div>
              <p className="text-white/80 mt-1">{result.correct}/{result.total} câu đúng</p>
              <p className="text-white/70 text-sm mt-1">+{result.xpEarned} XP</p>
            </div>

            <div className="space-y-3">
              {result.results.map((r) => (
                <div key={r.id} className={cn('rounded-xl border p-4', r.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                  <div className="flex items-start gap-2">
                    {r.correct ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600"><span className="font-medium">Gốc:</span> {r.expected}</p>
                      {!r.correct && <p className="text-red-600"><span className="font-medium">Bạn:</span> {r.typed || '(bỏ trống)'}</p>}
                      {!r.correct && <p className="text-gray-400 text-xs">Độ chính xác: {r.similarity}%</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
                Chọn lại
              </button>
              <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition">
                Chơi lại!
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const s = sentences[current];
  if (!s) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <audio ref={audioRef} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-purple-500" />
          <span className="text-sm font-medium text-gray-600">{current + 1}/{sentences.length}</span>
          {streak >= 3 && <span className="text-sm font-bold text-orange-500">🔥 ×{streak}</span>}
        </div>
        <span className="text-sm text-gray-400 font-medium">{LEVEL_LABELS[level]}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(current / sentences.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-center space-y-4">
        <button onClick={() => playAudio(s.text)}
          className="mx-auto flex items-center gap-2 px-6 py-3 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition">
          <Volume2 className="w-5 h-5" />
          Nghe câu
        </button>
        {revealed && (
          <p className="text-sm text-gray-500 italic border-t pt-3">{s.text}</p>
        )}
        <button onClick={() => setRevealed(r => !r)}
          className="text-xs text-gray-400 underline hover:text-gray-600">
          {revealed ? 'Ẩn câu' : 'Xem câu (bỏ điểm)'}
        </button>
      </div>

      <textarea
        value={typed[s.id] ?? ''}
        onChange={e => setTyped(prev => ({ ...prev, [s.id]: e.target.value }))}
        placeholder="Gõ câu vừa nghe vào đây..."
        rows={3}
        className="w-full rounded-xl border-2 border-gray-200 p-4 text-base focus:outline-none focus:border-purple-400 resize-none"
        autoFocus
      />

      <button onClick={handleNext}
        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg transition">
        {current + 1 >= sentences.length ? 'Nộp bài' : 'Câu tiếp theo →'}
      </button>
    </div>
  );
}
