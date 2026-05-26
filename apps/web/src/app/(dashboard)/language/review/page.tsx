'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Star, Zap, Brain, Layers, Mic, Radio, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ReviewItem {
  id: string; word: string; translation: string; pronunciation?: string;
  example?: string; exampleTrans?: string; setTitle: string; setLanguage: string; setId: string;
}

const LANG_BCP47: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR',
  de: 'de-DE', zh: 'zh-CN', es: 'es-ES', vi: 'vi-VN',
};

function pronounceSimilarity(expected: string, heard: string): number {
  const a = expected.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  const b = heard.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  if (a === b) return 100;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let j = 1; j <= m; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= n; i++) {
      const tmp = dp[i];
      dp[i] = a[j - 1] === b[i - 1] ? prev : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return Math.max(0, Math.round((1 - dp[n] / Math.max(m, n)) * 100));
}

function sm2Quality(label: string): number {
  if (label === 'Quên hẳn') return 0;
  if (label === 'Khó nhớ') return 2;
  if (label === 'Nhớ được') return 3;
  return 5;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoices(current: ReviewItem, all: ReviewItem[]): string[] {
  const wrong = shuffle(all.filter(x => x.id !== current.id)).slice(0, 3).map(x => x.translation);
  return shuffle([current.translation, ...wrong]);
}

export default function GlobalReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [mode, setMode] = useState<'flash' | 'quiz' | 'speak'>('flash');

  // Quiz mode state
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // Speak mode state
  const [spListening, setSpListening] = useState(false);
  const [spTranscript, setSpTranscript] = useState('');
  const [spScore, setSpScore] = useState<number | null>(null);
  const [spSupported, setSpSupported] = useState(true);
  const spRecRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSpSupported(false);
  }, []);

  useEffect(() => {
    api.get<ReviewItem[]>('/language/review')
      .then(data => { setItems(data); if (data.length === 0) setDone(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (items.length > 0 && mode === 'quiz') {
      setChoices(buildChoices(items[idx], items));
      setSelected(null);
    }
  }, [idx, mode, items]);

  const submitReview = async (quality: number) => {
    const item = items[idx];
    await api.post(`/language/vocab-items/${item.id}/review`, { quality }).catch(() => {});
    if (quality >= 3) setXpEarned(x => x + 5);
    if (idx < items.length - 1) { setIdx(i => i + 1); setFlipped(false); setSelected(null); }
    else setDone(true);
  };

  const handleFlashRate = async (label: string) => {
    await submitReview(sm2Quality(label));
  };

  const handleQuizAnswer = async (choice: string) => {
    if (selected) return;
    setSelected(choice);
    const correct = choice === items[idx].translation;
    await submitReview(correct ? 5 : 1);
  };

  const switchMode = (m: 'flash' | 'quiz' | 'speak') => {
    setMode(m);
    setFlipped(false);
    setSelected(null);
    setSpTranscript(''); setSpScore(null); setSpListening(false);
    spRecRef.current?.stop();
    if (m === 'quiz' && items.length > 0) setChoices(buildChoices(items[idx], items));
  };

  const spPlayWord = () => {
    if (!items[idx]) return;
    const lang = LANG_BCP47[items[idx].setLanguage] || 'en-US';
    // In Capacitor mobile iframe, delegate TTS to parent frame
    if (typeof window !== 'undefined' && window !== window.top) {
      try { window.parent.postMessage({ type: 'TTS_SPEAK', text: items[idx].word, lang }, '*'); } catch {}
      return;
    }
    try {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      if (!synth) return;
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(items[idx].word);
      utt.lang = lang;
      utt.rate = 0.85;
      synth.speak(utt);
    } catch {}
  };

  const spStartListening = () => {
    const item = items[idx];
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !item) return;
    if (typeof window !== 'undefined' && window !== window.top) {
      try { window.parent.postMessage({ type: 'TTS_CANCEL' }, '*'); } catch {}
    } else {
      try { window.speechSynthesis?.cancel(); } catch {}
    }
    const rec = new SR();
    spRecRef.current = rec;
    rec.lang = LANG_BCP47[item.setLanguage] || 'en-US';
    rec.continuous = false; rec.interimResults = false;
    setSpListening(true); setSpTranscript(''); setSpScore(null);
    rec.onresult = (e: any) => {
      const heard = e.results[0][0].transcript;
      setSpTranscript(heard);
      setSpScore(pronounceSimilarity(item.word, heard));
      setSpListening(false);
    };
    rec.onerror = () => setSpListening(false);
    rec.onend = () => setSpListening(false);
    rec.start();
  };

  const spSubmit = async (score: number) => {
    const quality = score >= 80 ? 5 : score >= 60 ? 3 : score >= 40 ? 2 : 0;
    await submitReview(quality);
    setSpTranscript(''); setSpScore(null);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (done && items.length === 0) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <Star className="h-16 w-16 text-yellow-400" />
      <h2 className="text-2xl font-bold">Không có từ nào cần ôn!</h2>
      <p className="text-muted-foreground">Bạn đã ôn tập đầy đủ hôm nay. Quay lại sau nhé.</p>
      <Button onClick={() => router.push('/language')}><ChevronLeft className="h-4 w-4 mr-1" />Quay lại</Button>
    </div>
  );

  if (done) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-6xl">⭐</div>
      <h2 className="text-2xl font-bold">Ôn tập hoàn thành!</h2>
      <p className="text-muted-foreground">{items.length} từ đã ôn tập</p>
      <div className="flex items-center gap-2 text-yellow-600 font-semibold text-lg">
        <Zap className="h-5 w-5" />+{xpEarned} XP
      </div>
      <Button onClick={() => router.push('/language')}><ChevronLeft className="h-4 w-4 mr-1" />Quay lại</Button>
    </div>
  );

  const item = items[idx];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/language')}>
          <ChevronLeft className="h-4 w-4 mr-1" />Thoát
        </Button>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{idx + 1} / {items.length} từ</p>
          <p className="text-xs text-muted-foreground">{item.setTitle}</p>
        </div>
        <span className="text-sm text-yellow-600 font-medium flex items-center gap-1">
          <Zap className="h-4 w-4" />+{xpEarned}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      {/* Mode toggle */}
      <div className="flex bg-muted rounded-lg p-1 gap-1">
        {([
          { key: 'flash', icon: Layers, label: 'Thẻ ghi nhớ' },
          { key: 'quiz', icon: Brain, label: 'Trắc nghiệm' },
          { key: 'speak', icon: Mic, label: 'Phát âm' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button key={key}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all',
              mode === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
            onClick={() => switchMode(key)}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Flashcard mode ── */}
      {mode === 'flash' && (
        <>
          <div className="cursor-pointer" onClick={() => setFlipped(f => !f)}>
            <Card className="h-64 flex flex-col items-center justify-center p-8 shadow-lg border-2 transition-all">
              {!flipped ? (
                <>
                  <div className="text-4xl font-bold text-center">{item.word}</div>
                  {item.pronunciation && <div className="text-muted-foreground mt-2 text-lg">[{item.pronunciation}]</div>}
                  <p className="text-xs text-muted-foreground mt-6">Nhớ nghĩa chưa? Nhấn để xem</p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-center text-primary">{item.translation}</div>
                  {item.example && (
                    <p className="mt-3 text-sm italic text-muted-foreground text-center">"{item.example}"</p>
                  )}
                  {item.exampleTrans && (
                    <p className="mt-1 text-xs text-muted-foreground text-center">{item.exampleTrans}</p>
                  )}
                </>
              )}
            </Card>
          </div>

          {flipped && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Quên hẳn', color: 'border-red-300 text-red-600 hover:bg-red-50' },
                { label: 'Khó nhớ', color: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
                { label: 'Nhớ được', color: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
                { label: 'Dễ dàng', color: 'border-green-300 text-green-600 hover:bg-green-50' },
              ].map(({ label, color }) => (
                <Button key={label} variant="outline" className={cn('h-auto py-2 text-xs flex-col', color)}
                  onClick={() => handleFlashRate(label)}>
                  {label}
                </Button>
              ))}
            </div>
          )}

          {!flipped && (
            <p className="text-center text-sm text-muted-foreground">Nhấn vào thẻ để lật và đánh giá</p>
          )}
        </>
      )}

      {/* ── Quiz mode ── */}
      {mode === 'quiz' && (
        <>
          <Card className="p-6 shadow-lg border-2">
            <p className="text-sm text-muted-foreground mb-2">Từ này có nghĩa là gì?</p>
            <div className="text-3xl font-bold mb-1">{item.word}</div>
            {item.pronunciation && (
              <div className="text-muted-foreground text-base">[{item.pronunciation}]</div>
            )}
            {item.example && (
              <p className="mt-3 text-sm italic text-muted-foreground">"{item.example}"</p>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-2">
            {choices.map((choice, i) => {
              const isCorrect = choice === item.translation;
              const isSelected = selected === choice;
              let cls = 'border-2 text-left px-4 py-3 rounded-lg font-medium transition-all ';
              if (!selected) {
                cls += 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer';
              } else if (isCorrect) {
                cls += 'border-green-500 bg-green-50 text-green-700';
              } else if (isSelected) {
                cls += 'border-red-400 bg-red-50 text-red-600';
              } else {
                cls += 'border-border opacity-50';
              }
              return (
                <button key={i} className={cls} onClick={() => handleQuizAnswer(choice)} disabled={!!selected}>
                  <span className="mr-3 text-muted-foreground font-normal">{String.fromCharCode(65 + i)}.</span>
                  {choice}
                  {selected && isCorrect && <span className="ml-2 text-green-600 text-sm">✓ Đúng</span>}
                  {selected && isSelected && !isCorrect && <span className="ml-2 text-red-500 text-sm">✗ Sai</span>}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className={cn('rounded-lg p-3 text-sm font-medium text-center',
              selected === item.translation ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {selected === item.translation
                ? '🎉 Chính xác! Tiếp tục nhé.'
                : `Đáp án đúng: ${item.translation}`}
            </div>
          )}
        </>
      )}

      {/* ── Speak / Pronunciation mode ── */}
      {mode === 'speak' && (
        <>
          <Card className="p-6 shadow-lg border-2 space-y-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Đọc to từ này</p>
            <div className="text-4xl font-bold">{item.word}</div>
            {item.pronunciation && <div className="text-muted-foreground">[{item.pronunciation}]</div>}
            <div className="text-sm text-muted-foreground">{item.translation}</div>
            {item.example && <p className="text-xs italic text-muted-foreground">"{item.example}"</p>}
            <div className="flex justify-center gap-2 pt-1">
              <button onClick={spPlayWord}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
                <Volume2 className="h-4 w-4" />Nghe mẫu
              </button>
            </div>
          </Card>

          {spSupported ? (
            <div className="flex justify-center">
              {!spListening ? (
                <button onClick={spStartListening}
                  className="flex flex-col items-center gap-3 px-10 py-6 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all group">
                  <div className="h-14 w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Mic className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">Nhấn để nói</span>
                </button>
              ) : (
                <button onClick={() => { spRecRef.current?.stop(); setSpListening(false); }}
                  className="flex flex-col items-center gap-3 px-10 py-6 rounded-2xl border-2 border-red-400 bg-red-50 animate-pulse">
                  <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                    <Radio className="h-7 w-7 text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-red-600">Đang nghe... nhấn để dừng</span>
                </button>
              )}
            </div>
          ) : spScore === null && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">Nghe mẫu rồi tự luyện đọc, bạn đánh giá:</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setSpScore(95); setSpTranscript(item.word); }}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 active:scale-95 transition-all text-green-700">
                  <span className="text-2xl">😊</span>
                  <span className="text-xs font-semibold">Rất chuẩn</span>
                </button>
                <button onClick={() => { setSpScore(70); setSpTranscript(item.word); }}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-yellow-300 bg-yellow-50 hover:bg-yellow-100 active:scale-95 transition-all text-yellow-700">
                  <span className="text-2xl">🙂</span>
                  <span className="text-xs font-semibold">Tạm được</span>
                </button>
                <button onClick={() => { setSpScore(30); setSpTranscript(''); }}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-700">
                  <span className="text-2xl">😅</span>
                  <span className="text-xs font-semibold">Cần luyện</span>
                </button>
              </div>
            </div>
          )}

          {spScore !== null && (
            <div className={cn('rounded-xl border-2 p-4 space-y-2',
              spScore >= 80 ? 'bg-green-50 border-green-200' : spScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kết quả</span>
                <span className={cn('text-2xl font-bold', spScore >= 80 ? 'text-green-600' : spScore >= 60 ? 'text-amber-600' : 'text-red-600')}>
                  {spScore}%
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex gap-2"><span className="text-muted-foreground w-16">Bạn nói:</span><span className="font-medium">{spTranscript}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-16">Đúng là:</span><span className="font-mono">{item.word}</span></div>
              </div>
              {spScore < 80 && item.pronunciation && (
                <p className="text-xs text-muted-foreground">💡 Phiên âm chuẩn: <strong>[{item.pronunciation}]</strong> · Nghe mẫu và nói lại chậm hơn.</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={spStartListening}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 hover:bg-background transition-colors">
                  <Mic className="h-4 w-4" />Thử lại
                </button>
                <button onClick={() => spSubmit(spScore)}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors">
                  Tiếp theo <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!spListening && spScore === null && (
            <p className="text-center text-sm text-muted-foreground">Nhấn nút mic để bắt đầu nói</p>
          )}
        </>
      )}
    </div>
  );
}
