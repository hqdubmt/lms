'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import {
  ChevronLeft, ChevronRight, RotateCcw, Check, X, Volume2,
  BookOpen, Brain, Zap, Star, List, Eye, EyeOff, PenLine, Shuffle, Headphones,
  Mic, MicOff, Radio, ImageIcon, MessageSquare, Upload, FileJson, PhoneCall,
  Sparkles, AlertCircle, CheckCircle2, Loader2,
  Video, ExternalLink, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VocabItem {
  id: string; word: string; translation: string; pronunciation?: string;
  example?: string; exampleTrans?: string; notes?: string; audioUrl?: string; imageUrl?: string;
}
interface VocabSet {
  id: string; title: string; language: string; level: string;
  videoUrl?: string;
  items: VocabItem[];
  progressMap: Record<string, { isLearned: boolean; repetitions: number; nextReview: string }>;
  creator: { name: string };
}

function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
}

interface ImportedImageItem {
  word: string; imageUrl: string; translation?: string; pronunciation?: string;
}
interface ImportedDialogueItem {
  context: string; answer: string; options: string[]; translation?: string; explanation?: string;
}
interface VoiceChatTurn {
  ai: string;        // What AI says (TTS in target language)
  hint?: string;     // Hint shown to user in their language
  keywords: string[]; // Keywords to match in user's spoken response
  response?: string; // AI's positive response after correct answer
}
interface SmartImportResult {
  vocabCreated: number;
  exercisesGenerated: number;
  exercises: Array<{ id: string; type: string; title: string; questionCount: number }>;
  dialogueScript: ImportedDialogueItem[];
  voiceChatScript: VoiceChatTurn[];
}

type Mode = 'menu' | 'flashcard' | 'srs' | 'test' | 'list' | 'write' | 'pairs' | 'listen' | 'speak' | 'image' | 'dialogue' | 'voicechat';

function ss() {
  try { return typeof window !== 'undefined' && window.speechSynthesis || null; } catch { return null; }
}

function speak(text: string, lang: string, rate = 1) {
  // In Capacitor mobile iframe, delegate TTS to parent frame (cross-origin workaround)
  if (typeof window !== 'undefined' && window !== window.top) {
    try { window.parent.postMessage({ type: 'TTS_SPEAK', text, lang }, '*'); } catch {}
    return;
  }
  const synth = ss(); if (!synth) return;
  const doSpeak = () => {
    try {
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      if (rate !== 1) utt.rate = rate;
      synth.speak(utt);
    } catch {}
  };
  if (synth.getVoices().length > 0) { doSpeak(); }
  else { synth.addEventListener('voiceschanged', doSpeak, { once: true }); setTimeout(doSpeak, 500); }
}

function cancelSpeak() {
  if (typeof window !== 'undefined' && window !== window.top) {
    try { window.parent.postMessage({ type: 'TTS_CANCEL' }, '*'); } catch {}
    return;
  }
  try { ss()?.cancel(); } catch {}
}

// ─── Flashcard Mode ─────────────────────────────────────────────────────────
function FlashcardMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const items = set.items;
  const item = items[idx];

  const next = (markKnown: boolean) => {
    if (markKnown) setKnown(prev => new Set([...prev, item.id]));
    if (idx < items.length - 1) { setIdx(i => i + 1); setFlipped(false); }
    else setDone(true);
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold">Hoàn thành!</h2>
      <p className="text-muted-foreground">{known.size}/{items.length} từ đã thuộc</p>
      <div className="flex gap-3">
        <Button onClick={() => { setIdx(0); setFlipped(false); setKnown(new Set()); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Học lại
        </Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1} / {items.length}</span>
        <span className="text-sm text-green-600 font-medium">{known.size} ✓</span>
      </div>

      <div className="w-full max-w-lg h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${((idx) / items.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-lg h-64 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div className={cn(
          'relative w-full h-full transition-transform duration-500',
          'transform-gpu',
          flipped && '[transform:rotateY(180deg)]'
        )} style={{ transformStyle: 'preserve-3d' }}>
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-card border-2 border-border shadow-lg p-8 backface-hidden">
            <div className="text-4xl font-bold text-center">{item.word}</div>
            {item.pronunciation && <div className="text-muted-foreground mt-2 text-lg">[{item.pronunciation}]</div>}
            {item.audioUrl && (
              <button onClick={(e) => { e.stopPropagation(); speak(item.word, set.language); }}
                className="mt-4 text-muted-foreground hover:text-primary">
                <Volume2 className="h-5 w-5" />
              </button>
            )}
            <p className="text-xs text-muted-foreground mt-6">Nhấn để xem nghĩa</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground border-2 border-primary shadow-lg p-8 [transform:rotateY(180deg)] backface-hidden">
            <div className="text-3xl font-bold text-center">{item.translation}</div>
            {item.example && (
              <div className="mt-4 text-center text-sm opacity-90">
                <p className="italic">"{item.example}"</p>
                {item.exampleTrans && <p className="mt-1 opacity-75">{item.exampleTrans}</p>}
              </div>
            )}
            {item.notes && <p className="mt-3 text-xs opacity-70 text-center">{item.notes}</p>}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4 w-full max-w-lg">
          <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => next(false)}>
            <X className="h-5 w-5 mr-2" />Chưa thuộc
          </Button>
          <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => next(true)}>
            <Check className="h-5 w-5 mr-2" />Đã thuộc
          </Button>
        </div>
      )}
      {!flipped && (
        <div className="flex gap-3">
          <Button variant="outline" disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setFlipped(false); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setFlipped(true)}>Lật thẻ</Button>
          <Button variant="outline" onClick={() => next(false)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── SRS Review Mode ─────────────────────────────────────────────────────────
function SRSMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    api.get<{ items: VocabItem[] }>(`/language/vocab-sets/${set.id}/review`).then(r => {
      setQueue(r.items);
      if (r.items.length === 0) setDone(true);
    });
  }, [set.id]);

  const submitReview = async (quality: number) => {
    const item = queue[idx];
    await api.post(`/language/vocab-items/${item.id}/review`, { quality });
    if (quality >= 3) setXpEarned(x => x + 5);
    if (idx < queue.length - 1) { setIdx(i => i + 1); setFlipped(false); }
    else setDone(true);
  };

  if (queue.length === 0 && done) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <Star className="h-16 w-16 text-yellow-400" />
      <h2 className="text-xl font-bold">Không có từ nào cần ôn!</h2>
      <p className="text-muted-foreground">Bạn đã ôn tập đầy đủ hôm nay.</p>
      <Button onClick={onExit}>Quay lại</Button>
    </div>
  );
  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="text-5xl">⭐</div>
      <h2 className="text-xl font-bold">Ôn tập hoàn thành!</h2>
      <p className="text-muted-foreground">+{xpEarned} XP kiếm được</p>
      <Button onClick={onExit}>Quay lại</Button>
    </div>
  );
  if (!queue[idx]) return null;
  const item = queue[idx];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1} / {queue.length}</span>
        <span className="text-sm text-yellow-600 font-medium">+{xpEarned} XP</span>
      </div>
      <div className="w-full max-w-lg cursor-pointer" onClick={() => setFlipped(f => !f)}>
        <Card className="h-64 flex flex-col items-center justify-center p-8 shadow-lg border-2">
          {!flipped ? (
            <>
              <div className="text-4xl font-bold text-center">{item.word}</div>
              {item.pronunciation && <div className="text-muted-foreground mt-2">[{item.pronunciation}]</div>}
              <p className="text-xs text-muted-foreground mt-6">Nhớ nghĩa chưa? Nhấn để xem</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-center text-primary">{item.translation}</div>
              {item.example && <p className="mt-3 text-sm italic text-muted-foreground text-center">"{item.example}"</p>}
            </>
          )}
        </Card>
      </div>
      {flipped && (
        <div className="grid grid-cols-4 gap-2 w-full max-w-lg">
          {[
            { q: 0, label: 'Quên hẳn', color: 'border-red-300 text-red-600 hover:bg-red-50' },
            { q: 2, label: 'Khó nhớ', color: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
            { q: 3, label: 'Nhớ được', color: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
            { q: 5, label: 'Dễ dàng', color: 'border-green-300 text-green-600 hover:bg-green-50' },
          ].map(({ q, label, color }) => (
            <Button key={q} variant="outline" className={cn('flex-col h-auto py-2 text-xs', color)} onClick={() => submitReview(q)}>
              <span>{label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Test Mode (Multiple choice) ─────────────────────────────────────────────
function TestMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const [{ items, allOptions }] = useState(() => {
    const shuffledItems = [...set.items].sort(() => Math.random() - 0.5).slice(0, Math.min(10, set.items.length));
    const opts = shuffledItems.map(it => {
      const others = set.items.filter(i => i.id !== it.id);
      return [it, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    });
    return { items: shuffledItems, allOptions: opts };
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (items.length < 4) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Cần ít nhất 4 từ để làm bài test. Bộ từ vựng này có {set.items.length} từ.</p>
      <Button className="mt-4" variant="outline" onClick={onExit}>Quay lại</Button>
    </div>
  );

  const item = items[idx];
  const shuffled = allOptions[idx];

  const handleSelect = (answer: string) => {
    if (selected !== null) return;
    setSelected(answer);
    if (answer === item.translation) setCorrect(c => c + 1);
  };
  const next = () => {
    if (idx < items.length - 1) { setIdx(i => i + 1); setSelected(null); }
    else setDone(true);
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="text-5xl">{correct >= items.length * 0.8 ? '🏆' : '📚'}</div>
      <h2 className="text-2xl font-bold">Kết quả: {correct}/{items.length}</h2>
      <div className="text-4xl font-bold text-primary">{Math.round((correct / items.length) * 100)}%</div>
      <p className="text-muted-foreground">{correct >= items.length * 0.8 ? 'Xuất sắc!' : 'Cần luyện thêm!'}</p>
      <div className="flex gap-3">
        <Button onClick={() => { setIdx(0); setSelected(null); setCorrect(0); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Làm lại
        </Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1}/{items.length} · {correct} đúng</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <Card className="p-6 shadow-md text-center">
        <p className="text-sm text-muted-foreground mb-2">Từ này có nghĩa là gì?</p>
        <div className="text-3xl font-bold">{item.word}</div>
        {item.pronunciation && <div className="text-muted-foreground mt-1">[{item.pronunciation}]</div>}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {shuffled.map((opt) => {
          const isCorrectOpt = opt.translation === item.translation;
          const isSelectedWrong = selected === opt.translation && !isCorrectOpt;
          let cls = 'border-2 text-sm font-medium py-3 h-auto gap-2';
          if (selected === null) cls += ' hover:border-primary hover:bg-primary/5 cursor-pointer';
          if (selected !== null && isCorrectOpt) cls += ' border-green-500 bg-green-50 text-green-700';
          else if (isSelectedWrong) cls += ' border-red-500 bg-red-50 text-red-700';
          else if (selected !== null) cls += ' opacity-40';
          return (
            <Button key={opt.id} variant="outline" className={cls} onClick={() => handleSelect(opt.translation)}>
              {selected !== null && isCorrectOpt && <Check className="h-4 w-4 shrink-0" />}
              {isSelectedWrong && <X className="h-4 w-4 shrink-0" />}
              {opt.translation}
            </Button>
          );
        })}
      </div>
      {selected !== null && selected !== item.translation && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><X className="h-4 w-4" />Chưa đúng!</p>
          <p className="text-sm text-gray-700">Đáp án đúng: <strong className="text-green-700">{item.translation}</strong></p>
          {item.example && <p className="text-xs text-muted-foreground italic">"{item.example}"</p>}
        </div>
      )}
      {selected !== null && selected === item.translation && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5"><Check className="h-4 w-4" />Chính xác!</p>
          {item.example && <p className="text-xs text-muted-foreground italic mt-1">"{item.example}"</p>}
        </div>
      )}
      {selected !== null && (
        <div className="flex justify-center">
          <Button onClick={next}>{idx < items.length - 1 ? 'Tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Write Mode ───────────────────────────────────────────────────────────────
function WriteMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const [items] = useState(() => [...set.items].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = items[idx];

  const check = () => {
    if (!input.trim()) return;
    const isCorrect = input.trim().toLowerCase() === item.translation.toLowerCase();
    setCorrect(isCorrect);
    setChecked(true);
    if (isCorrect) setScore(s => s + 1);
    api.post(`/language/vocab-items/${item.id}/review`, { quality: isCorrect ? 5 : 1 }).catch(() => {});
  };

  const next = () => {
    if (idx < items.length - 1) { setIdx(i => i + 1); setInput(''); setChecked(false); }
    else setDone(true);
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">{score >= items.length * 0.8 ? '🏆' : '📚'}</div>
      <h2 className="text-2xl font-bold">Hoàn thành!</h2>
      <div className="text-4xl font-bold text-primary">{Math.round((score / items.length) * 100)}%</div>
      <p className="text-muted-foreground">{score}/{items.length} từ đúng</p>
      <div className="flex gap-3">
        <Button onClick={() => { setIdx(0); setInput(''); setChecked(false); setScore(0); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Làm lại
        </Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1} / {items.length}</span>
        <span className="text-sm text-green-600 font-medium">{score} đúng</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <Card className="w-full shadow-md">
        <CardContent className="p-8 text-center space-y-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dịch từ này sang tiếng Việt</p>
          <div className="text-4xl font-bold">{item.word}</div>
          {item.pronunciation && <div className="text-muted-foreground">[{item.pronunciation}]</div>}
          {item.example && !checked && (
            <p className="text-sm italic text-muted-foreground">"{item.example}"</p>
          )}
          <div className="space-y-3">
            <Input
              className={cn('text-center text-lg h-12',
                checked && correct ? 'border-green-500 bg-green-50 text-green-700' :
                checked && !correct ? 'border-red-500 bg-red-50 text-red-700' : '')}
              placeholder="Nhập đáp án..."
              value={input}
              onChange={e => !checked && setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !checked && check()}
              disabled={checked}
              autoFocus
            />
            {checked && !correct && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                Đáp án đúng: <strong>{item.translation}</strong>
              </p>
            )}
            {checked && correct && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Chính xác!
              </p>
            )}
          </div>
          {!checked ? (
            <Button className="w-full" onClick={check} disabled={!input.trim()}>Kiểm tra</Button>
          ) : (
            <Button className="w-full" onClick={next}>{idx < items.length - 1 ? 'Tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Match Pairs Mode ─────────────────────────────────────────────────────────
function MatchPairsMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const count = Math.min(8, set.items.length);
  const [items] = useState(() => [...set.items].sort(() => Math.random() - 0.5).slice(0, count));
  const [cards, setCards] = useState<{ id: string; text: string; type: 'word' | 'trans'; itemId: string; matched: boolean }[]>(() => {
    const wordCards = items.map(i => ({ id: `w-${i.id}`, text: i.word, type: 'word' as const, itemId: i.id, matched: false }));
    const transCards = items.map(i => ({ id: `t-${i.id}`, text: i.translation, type: 'trans' as const, itemId: i.id, matched: false }));
    return [...wordCards, ...transCards].sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);

  const handleSelect = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.matched || wrong) return;

    if (!selected) { setSelected(cardId); return; }
    if (selected === cardId) { setSelected(null); return; }

    const selCard = cards.find(c => c.id === selected)!;
    if (selCard.itemId === card.itemId && selCard.type !== card.type) {
      setCards(prev => prev.map(c => c.id === cardId || c.id === selected ? { ...c, matched: true } : c));
      setSelected(null);
      const newCount = matchedCount + 1;
      setMatchedCount(newCount);
      if (newCount === count) setDone(true);
    } else {
      setErrors(e => e + 1);
      setWrong([selected, cardId]);
      setTimeout(() => { setWrong(null); setSelected(null); }, 800);
    }
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">🎊</div>
      <h2 className="text-2xl font-bold">Ghép đôi hoàn thành!</h2>
      <p className="text-muted-foreground">{errors} lần sai · {count} cặp đúng</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}><RotateCcw className="h-4 w-4 mr-2" />Chơi lại</Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{matchedCount}/{count} cặp · {errors} sai</span>
      </div>
      <p className="text-center text-sm text-muted-foreground">Chọn 2 thẻ khớp nhau (từ + nghĩa)</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => {
          const isSelected = selected === card.id;
          const isWrong = wrong?.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleSelect(card.id)}
              disabled={card.matched}
              className={cn(
                'min-h-16 rounded-xl border-2 text-sm font-medium p-2 text-center transition-all duration-200',
                card.matched ? 'border-green-400 bg-green-50 text-green-700 opacity-60' :
                isWrong ? 'border-red-400 bg-red-50 text-red-700 scale-95' :
                isSelected ? 'border-primary bg-primary/10 scale-105 shadow-md' :
                'border-border bg-background hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
              )}>
              {card.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Listen Mode ──────────────────────────────────────────────────────────────
function ListenMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const [items] = useState(() => [...set.items].sort(() => Math.random() - 0.5).slice(0, Math.min(15, set.items.length)));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = items[idx];
  const [options] = useState(() => items.map(item => {
    const others = set.items.filter(i => i.id !== item.id);
    return [item, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  }));

  const playWord = useCallback(() => {
    speak(item.word, set.language);
  }, [item.word, set.language]);

  // Auto-play chỉ trên Electron desktop (đã có autoplay policy); mobile WebView chặn auto-play
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (!done && isElectron) playWord();
  }, [idx, done, playWord]);

  const handleSelect = (translation: string) => {
    if (selected !== null) return;
    setSelected(translation);
    if (translation === item.translation) setScore(s => s + 1);
  };

  const next = () => {
    if (idx < items.length - 1) { setIdx(i => i + 1); setSelected(null); }
    else setDone(true);
  };

  if (set.items.length < 4) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Cần ít nhất 4 từ để dùng chế độ này.</p>
      <Button className="mt-4" variant="outline" onClick={onExit}>Quay lại</Button>
    </div>
  );

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">{score >= items.length * 0.8 ? '🏆' : '📚'}</div>
      <h2 className="text-2xl font-bold">Hoàn thành!</h2>
      <div className="text-4xl font-bold text-primary">{Math.round((score / items.length) * 100)}%</div>
      <p className="text-muted-foreground">{score}/{items.length} từ đúng</p>
      <div className="flex gap-3">
        <Button onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Làm lại
        </Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  const opts = options[idx];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1}/{items.length} · {score} đúng</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <Card className="p-8 shadow-md text-center">
        <p className="text-sm text-muted-foreground mb-4">Từ này có nghĩa là gì?</p>
        <button onClick={playWord}
          className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-primary/10 border-2 border-primary/20 hover:bg-primary/20 active:scale-95 transition-all mx-auto">
          <Volume2 className="h-12 w-12 text-primary" />
          <span className="font-bold text-primary">Nhấn để nghe</span>
        </button>
        {item.pronunciation && <div className="mt-3 text-muted-foreground text-sm">[{item.pronunciation}]</div>}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {opts.map((opt) => {
          let cls = 'border-2 text-sm font-medium py-4 h-auto';
          if (selected === null) cls += ' hover:border-primary hover:bg-primary/5 cursor-pointer';
          if (selected !== null && opt.translation === item.translation) cls += ' border-green-500 bg-green-50 text-green-700';
          else if (selected === opt.translation && opt.translation !== item.translation) cls += ' border-red-500 bg-red-50 text-red-700';
          else if (selected !== null) cls += ' opacity-50';
          return (
            <Button key={opt.id} variant="outline" className={cls} onClick={() => handleSelect(opt.translation)}>
              {opt.translation}
              {selected !== null && opt.translation === item.translation && <Check className="h-4 w-4 ml-2 text-green-600" />}
            </Button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="flex justify-center">
          <Button onClick={next}>{idx < items.length - 1 ? 'Tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Pronunciation helpers ────────────────────────────────────────────────────
const LANG_BCP47: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR',
  de: 'de-DE', zh: 'zh-CN', es: 'es-ES', vi: 'vi-VN',
};

function pronounceSimilarity(expected: string, heard: string): number {
  const a = expected.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  const b = heard.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  if (a === b) return 100;
  const m = a.length, n = b.length;
  if (m === 0 || n === 0) return 0;
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

function CharDiff({ expected, heard }: { expected: string; heard: string }) {
  const exp = expected.toLowerCase().split('');
  const hrd = heard.toLowerCase().split('');
  return (
    <span className="font-mono text-base tracking-wider">
      {exp.map((ch, i) => (
        <span key={i} className={hrd[i] === ch ? 'text-green-600' : 'text-red-500 underline decoration-dotted'}>
          {ch}
        </span>
      ))}
      {hrd.length > exp.length && (
        <span className="text-orange-500">{hrd.slice(exp.length).join('')}</span>
      )}
    </span>
  );
}

// ─── Speak Mode ───────────────────────────────────────────────────────────────
function SpeakMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const items = set.items;
  const langCode = LANG_BCP47[set.language] || 'en-US';

  const [idx, setIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  const item = items[idx];

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const playWord = (rate = 1) => {
    speak(item.word, langCode, rate);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    cancelSpeak();
    const rec = new SR();
    recRef.current = rec;
    rec.lang = langCode;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setTranscript('');
    setScore(null);
    rec.onresult = (e: any) => {
      const heard = e.results[0][0].transcript;
      setTranscript(heard);
      setScore(pronounceSimilarity(item.word, heard));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const next = () => {
    if (score !== null) setScores(s => [...s, score]);
    if (idx < items.length - 1) {
      setIdx(i => i + 1);
      setTranscript(''); setScore(null);
    } else {
      setDone(true);
    }
  };

  const restart = () => {
    setIdx(0); setTranscript(''); setScore(null); setScores([]); setDone(false);
  };

  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-md mx-auto">
      <div className="text-6xl">{avgScore >= 80 ? '🎉' : avgScore >= 60 ? '👍' : '💪'}</div>
      <h2 className="text-2xl font-bold">Hoàn thành luyện phát âm!</h2>
      <div className="w-28 h-28 rounded-full border-8 flex items-center justify-center"
        style={{ borderColor: avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#f59e0b' : '#ef4444' }}>
        <span className="text-3xl font-bold" style={{ color: avgScore >= 80 ? '#16a34a' : avgScore >= 60 ? '#d97706' : '#dc2626' }}>
          {avgScore}%
        </span>
      </div>
      <p className="text-muted-foreground">
        {avgScore >= 80 ? 'Phát âm rất chuẩn! Tiếp tục duy trì nhé.' : avgScore >= 60 ? 'Khá tốt! Luyện thêm để hoàn thiện hơn.' : 'Hãy nghe kỹ và luyện thêm. Bạn sẽ tiến bộ thôi!'}
      </p>
      <div className="flex gap-3">
        <Button onClick={restart}><RotateCcw className="h-4 w-4 mr-2" />Luyện lại</Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  const scoreColor = score === null ? '' : score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = score === null ? '' : score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1} / {items.length}</span>
        <span className="text-sm text-muted-foreground">{set.language.toUpperCase()} · {langCode}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      {!supported && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          📱 Thiết bị không hỗ trợ nhận dạng giọng nói. Bạn có thể tự luyện: nghe phát âm rồi tự đánh giá bên dưới.
        </div>
      )}

      {/* Word card */}
      <div className="rounded-2xl border-2 bg-card shadow-md p-6 text-center space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Đọc từ này</p>
        <div className="text-4xl font-bold">{item.word}</div>
        {item.pronunciation && (
          <div className="text-muted-foreground text-lg">[{item.pronunciation}]</div>
        )}
        {item.translation && (
          <div className="text-sm text-muted-foreground">{item.translation}</div>
        )}
        {item.example && (
          <div className="text-xs italic text-muted-foreground border-t pt-2 mt-2">"{item.example}"</div>
        )}
        {/* TTS buttons */}
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => playWord(1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
            <Volume2 className="h-4 w-4" />Nghe
          </button>
          <button onClick={() => playWord(0.7)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm transition-colors">
            <Volume2 className="h-3.5 w-3.5" />Chậm
          </button>
        </div>
      </div>

      {/* Record button */}
      {supported && (
        <div className="flex justify-center">
          {!listening ? (
            <button onClick={startListening}
              className="flex flex-col items-center gap-3 px-10 py-6 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all group">
              <div className="h-16 w-16 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">Nhấn để nói</span>
            </button>
          ) : (
            <button onClick={stopListening}
              className="flex flex-col items-center gap-3 px-10 py-6 rounded-2xl border-2 border-red-400 bg-red-50 animate-pulse">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <Radio className="h-8 w-8 text-red-500" />
              </div>
              <span className="text-sm font-medium text-red-600">Đang nghe... (nhấn để dừng)</span>
            </button>
          )}
        </div>
      )}

      {/* Self-assessment khi không có STT */}
      {!supported && score === null && (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted-foreground">Sau khi nghe và tự luyện đọc, bạn thấy mình phát âm:</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => { setScore(95); setTranscript(item.word); setScores(s => [...s, 95]); }}
              className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 active:scale-95 transition-all text-green-700">
              <span className="text-2xl">😊</span>
              <span className="text-xs font-semibold">Rất chuẩn</span>
            </button>
            <button onClick={() => { setScore(70); setTranscript(item.word); setScores(s => [...s, 70]); }}
              className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-yellow-300 bg-yellow-50 hover:bg-yellow-100 active:scale-95 transition-all text-yellow-700">
              <span className="text-2xl">🙂</span>
              <span className="text-xs font-semibold">Tạm được</span>
            </button>
            <button onClick={() => { setScore(30); setTranscript(''); setScores(s => [...s, 30]); }}
              className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-700">
              <span className="text-2xl">😅</span>
              <span className="text-xs font-semibold">Cần luyện</span>
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {score !== null && (
        <div className={`rounded-xl border-2 p-4 space-y-3 ${scoreBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Kết quả phát âm</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Bạn nói:</span>
              <span className="font-medium">{transcript}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16 shrink-0">Đúng là:</span>
              <CharDiff expected={item.word} heard={transcript} />
            </div>
          </div>

          {score < 80 && (
            <div className="text-xs text-muted-foreground bg-white/60 rounded-lg px-3 py-2 space-y-1">
              <p className="font-medium">💡 Gợi ý:</p>
              {item.pronunciation && <p>· Phiên âm chuẩn: <strong>[{item.pronunciation}]</strong></p>}
              <p>· Nhấn "Nghe chậm" để nghe từng âm tiết rõ hơn</p>
              {score < 50 && <p>· Tập trung vào phần bôi đỏ trong từ</p>}
            </div>
          )}

          {score >= 80 && (
            <p className="text-xs text-green-700">✓ {score === 100 ? 'Hoàn hảo! Phát âm chính xác 100%.' : 'Phát âm rất tốt!'}</p>
          )}
        </div>
      )}

      {/* Next */}
      {score !== null && (
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={startListening}><Mic className="h-4 w-4 mr-1" />Thử lại</Button>
          <Button onClick={next}>{idx < items.length - 1 ? 'Từ tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── List Mode ────────────────────────────────────────────────────────────────
function ListView({ set }: { set: VocabSet }) {
  const [showTrans, setShowTrans] = useState(true);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowTrans(s => !s)}>
          {showTrans ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showTrans ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 font-medium">Từ</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Phiên âm</th>
              <th className="text-left px-4 py-3 font-medium">Nghĩa</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Ví dụ</th>
            </tr>
          </thead>
          <tbody>
            {set.items.map((item, i) => {
              const prog = set.progressMap[item.id];
              return (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {item.word}
                      {prog?.isLearned && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.pronunciation || '—'}</td>
                  <td className="px-4 py-3">
                    {showTrans ? item.translation : <span className="text-muted-foreground italic">•••</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{item.example || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Image Game (inner) ────────────────────────────────────────────────────────
function ImageGame({ gameItems, pool, onExit, onReimport }: {
  gameItems: VocabItem[]; pool: VocabItem[]; onExit: () => void; onReimport: () => void;
}) {
  const [{ items, allOptions }] = useState(() => {
    const shuffled = [...gameItems].sort(() => Math.random() - 0.5).slice(0, Math.min(10, gameItems.length));
    const opts = shuffled.map(it => {
      const others = pool.filter(i => i.id !== it.id && i.word !== it.word);
      return [it, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    });
    return { items: shuffled, allOptions: opts };
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = items[idx];
  const shuffled = allOptions[idx];

  const handleSelect = (word: string) => {
    if (selected !== null) return;
    setSelected(word);
    if (word === item.word) setScore(s => s + 1);
  };
  const next = () => {
    if (idx < items.length - 1) { setIdx(i => i + 1); setSelected(null); }
    else setDone(true);
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">{score >= items.length * 0.8 ? '🏆' : '📚'}</div>
      <h2 className="text-2xl font-bold">Hoàn thành!</h2>
      <div className="text-4xl font-bold text-primary">{Math.round((score / items.length) * 100)}%</div>
      <p className="text-muted-foreground">{score}/{items.length} từ đúng</p>
      <div className="flex gap-3">
        <Button onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Làm lại
        </Button>
        <Button variant="outline" size="sm" onClick={onReimport}>
          <Upload className="h-3.5 w-3.5 mr-1" />Import khác
        </Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1}/{items.length} · {score} đúng</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReimport}>
          <Upload className="h-3 w-3 mr-1" />Import
        </Button>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <Card className="shadow-md overflow-hidden">
        <div className="aspect-video bg-muted flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Đây là từ nào?</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {shuffled.map((opt) => {
          const isCorrect = opt.word === item.word;
          const isSelectedWrong = selected === opt.word && !isCorrect;
          let cls = 'border-2 text-sm font-medium py-3 h-auto gap-2';
          if (selected === null) cls += ' hover:border-primary hover:bg-primary/5 cursor-pointer';
          if (selected !== null && isCorrect) cls += ' border-green-500 bg-green-50 text-green-700';
          else if (isSelectedWrong) cls += ' border-red-500 bg-red-50 text-red-700';
          else if (selected !== null) cls += ' opacity-40';
          return (
            <Button key={opt.id} variant="outline" className={cls} onClick={() => handleSelect(opt.word)}>
              {selected !== null && isCorrect && <Check className="h-4 w-4 shrink-0" />}
              {isSelectedWrong && <X className="h-4 w-4 shrink-0" />}
              <span>{opt.word}</span>
              {item.pronunciation && selected !== null && isCorrect && (
                <span className="text-xs opacity-70 ml-1">[{item.pronunciation}]</span>
              )}
            </Button>
          );
        })}
      </div>
      {selected !== null && selected !== item.word && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><X className="h-4 w-4" />Chưa đúng!</p>
          <p className="text-sm text-gray-700">Đáp án đúng: <strong className="text-green-700">{item.word}</strong>
            {item.pronunciation && <span className="text-muted-foreground font-normal ml-1">[{item.pronunciation}]</span>}
          </p>
          <p className="text-xs text-muted-foreground">{item.translation}</p>
        </div>
      )}
      {selected !== null && selected === item.word && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5"><Check className="h-4 w-4" />Chính xác!</p>
          <p className="text-sm text-muted-foreground">{item.translation}</p>
        </div>
      )}
      {selected !== null && (
        <div className="flex justify-center">
          <Button onClick={next}>{idx < items.length - 1 ? 'Tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Image Mode ───────────────────────────────────────────────────────────────
function ImageMode({ set, onExit }: { set: VocabSet; onExit: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<ImportedImageItem[] | null>(null);
  const [importError, setImportError] = useState('');
  const [gameKey, setGameKey] = useState(0);

  const vocabImageItems = set.items.filter(i => i.imageUrl);

  const effectiveItems: VocabItem[] = imported
    ? imported.map((d, i) => ({ id: `img-${i}`, word: d.word, translation: d.translation ?? '', pronunciation: d.pronunciation, imageUrl: d.imageUrl }))
    : vocabImageItems;

  const pool: VocabItem[] = [
    ...effectiveItems,
    ...set.items.filter(s => !effectiveItems.find(e => e.word === s.word)),
  ];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ImportedImageItem[];
        if (!Array.isArray(data) || !data[0]?.word || !data[0]?.imageUrl) throw new Error();
        setImported(data);
        setImportError('');
        setGameKey(k => k + 1);
      } catch {
        setImportError('File không hợp lệ. Xem định dạng bên dưới.');
      }
    };
    reader.readAsText(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (effectiveItems.length < 1 || pool.length < 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 max-w-md mx-auto text-center">
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
          <ImageIcon className="h-10 w-10 text-cyan-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Import file hình ảnh</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {vocabImageItems.length < 1 ? 'Bộ từ vựng chưa có hình ảnh.' : 'Hoặc import file JSON để dùng hình ảnh tùy chỉnh.'}
          </p>
        </div>
        {importError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">{importError}</p>}
        <div className="w-full bg-muted/60 rounded-xl p-4 text-left space-y-1">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><FileJson className="h-3.5 w-3.5" />Định dạng file JSON:</p>
          <pre className="text-xs text-muted-foreground overflow-x-auto">{`[
  {
    "word": "apple",
    "imageUrl": "https://example.com/apple.jpg",
    "translation": "quả táo",
    "pronunciation": "ˈæpəl"
  }
]`}</pre>
        </div>
        <div className="flex gap-3 w-full">
          <Button className="flex-1" onClick={openFilePicker}><Upload className="h-4 w-4 mr-2" />Chọn file JSON</Button>
          <Button variant="outline" onClick={onExit}>Quay lại</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
      <ImageGame key={gameKey} gameItems={effectiveItems} pool={pool} onExit={onExit} onReimport={openFilePicker} />
    </>
  );
}

// ─── Dialogue Game (inner) ─────────────────────────────────────────────────────
function DialogueGame({ questions, onExit, onReimport }: {
  questions: ImportedDialogueItem[]; onExit: () => void; onReimport: () => void;
}) {
  const [items] = useState(() => [...questions].sort(() => Math.random() - 0.5).slice(0, Math.min(10, questions.length)));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = items[idx];
  const contextParts = q.context.split('___');
  const transParts = q.translation ? q.translation.split('___') : null;

  const handleSelect = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    if (opt === q.answer) setScore(s => s + 1);
  };
  const next = () => {
    if (idx < items.length - 1) { setIdx(i => i + 1); setSelected(null); }
    else setDone(true);
  };

  const BlankLine = ({ parts, filled }: { parts: string[]; filled?: string }) => (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            filled
              ? <strong className="text-primary">{filled}</strong>
              : <span className="inline-block px-3 py-0.5 mx-1 bg-primary/15 border-b-2 border-primary rounded font-bold text-primary min-w-[3rem] text-center">___</span>
          )}
        </span>
      ))}
    </span>
  );

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-5xl">{score >= items.length * 0.8 ? '🏆' : '📚'}</div>
      <h2 className="text-2xl font-bold">Hoàn thành!</h2>
      <div className="text-4xl font-bold text-primary">{Math.round((score / items.length) * 100)}%</div>
      <p className="text-muted-foreground">{score}/{items.length} câu đúng</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Button onClick={() => { setIdx(0); setSelected(null); setScore(0); setDone(false); }}>
          <RotateCcw className="h-4 w-4 mr-2" />Làm lại
        </Button>
        <Button variant="outline" size="sm" onClick={onReimport}><Upload className="h-3.5 w-3.5 mr-1" />Import khác</Button>
        <Button variant="outline" onClick={onExit}>Thoát</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground">{idx + 1}/{items.length} · {score} đúng</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReimport}>
          <Upload className="h-3 w-3 mr-1" />Import
        </Button>
      </div>
      <div className="h-1.5 bg-muted rounded-full">
        <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>
      <Card className="shadow-md">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <MessageSquare className="h-3.5 w-3.5" />Hội thoại
          </div>
          <div className="bg-muted/40 rounded-xl p-4 space-y-2 border-l-4 border-primary/30">
            {contextParts.length > 0 && (
              <p className="text-base leading-relaxed whitespace-pre-line">
                <BlankLine parts={contextParts} filled={selected ?? undefined} />
              </p>
            )}
            {transParts && (
              <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-line">
                <BlankLine parts={transParts} filled={selected ?? undefined} />
              </p>
            )}
          </div>
          <p className="text-sm text-center text-muted-foreground font-medium">Từ nào điền vào chỗ trống?</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isCorrect = opt === q.answer;
          const isSelectedWrong = selected === opt && !isCorrect;
          let cls = 'border-2 text-sm font-medium py-3 h-auto gap-2';
          if (selected === null) cls += ' hover:border-primary hover:bg-primary/5 cursor-pointer';
          if (selected !== null && isCorrect) cls += ' border-green-500 bg-green-50 text-green-700';
          else if (isSelectedWrong) cls += ' border-red-500 bg-red-50 text-red-700';
          else if (selected !== null) cls += ' opacity-40';
          return (
            <Button key={i} variant="outline" className={cls} onClick={() => handleSelect(opt)}>
              {selected !== null && isCorrect && <Check className="h-4 w-4 shrink-0" />}
              {isSelectedWrong && <X className="h-4 w-4 shrink-0" />}
              {opt}
            </Button>
          );
        })}
      </div>
      {selected !== null && selected !== q.answer && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><X className="h-4 w-4" />Chưa đúng!</p>
          <p className="text-sm text-gray-700">Đáp án đúng: <strong className="text-green-700">{q.answer}</strong></p>
          {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
        </div>
      )}
      {selected !== null && selected === q.answer && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5"><Check className="h-4 w-4" />Chính xác!</p>
          {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
        </div>
      )}
      {selected !== null && (
        <div className="flex justify-center">
          <Button onClick={next}>{idx < items.length - 1 ? 'Tiếp theo' : 'Xem kết quả'} <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Dialogue Mode (wrapper) ───────────────────────────────────────────────────
function DialogueMode({ set, onExit, initialImport }: {
  set: VocabSet; onExit: () => void; initialImport?: ImportedDialogueItem[] | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<ImportedDialogueItem[] | null>(initialImport ?? null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  // Build fallback questions from vocab example sentences
  const vocabQuestions: ImportedDialogueItem[] = set.items
    .filter(i => i.example)
    .map(it => {
      const wordRegex = new RegExp(`(?<![\\w])${it.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'gi');
      const context = it.example!.replace(wordRegex, '___');
      const translation = it.exampleTrans
        ? it.exampleTrans.replace(new RegExp(`(?<![\\w])${it.translation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`, 'gi'), '___')
        : undefined;
      const otherWords = set.items.filter(i => i.id !== it.id).sort(() => Math.random() - 0.5).slice(0, 3).map(i => i.word);
      return { context, answer: it.word, options: [it.word, ...otherWords].sort(() => Math.random() - 0.5), translation };
    });

  const effectiveQuestions = imported ?? vocabQuestions;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true); setImportError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.upload<{ dialogueScript: ImportedDialogueItem[] }>(
        `/language/vocab-sets/${set.id}/import-smart`, fd,
      );
      if (!res.dialogueScript?.length) throw new Error('File không chứa nội dung hội thoại.');
      setImported(res.dialogueScript);
      setGameKey(k => k + 1);
    } catch (err: any) {
      setImportError(err?.message || 'Import thất bại');
    }
    setImporting(false);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (effectiveQuestions.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 max-w-md mx-auto text-center">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md" className="hidden" onChange={handleFile} />
        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
          <MessageSquare className="h-10 w-10 text-violet-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Import giáo trình hội thoại</h3>
          <p className="text-sm text-muted-foreground mt-1">Upload bất kỳ file giáo trình — AI tự tạo câu hội thoại.</p>
        </div>
        {importing && (
          <div className="flex items-center gap-2 text-violet-600 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />AI đang phân tích file…
          </div>
        )}
        {importError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">{importError}</p>}
        <div className="flex gap-3 w-full">
          <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={openFilePicker} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />Chọn file (PDF/Word/Excel/PPTX)
          </Button>
          <Button variant="outline" onClick={onExit}>Quay lại</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md" className="hidden" onChange={handleFile} />
      {imported && (
        <div className="max-w-xl mx-auto mb-3 flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
          <span className="text-xs text-violet-700 font-medium flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />{imported.length} câu hội thoại từ file
          </span>
          <button onClick={() => { setImported(null); setGameKey(k => k + 1); }} className="text-xs text-muted-foreground hover:text-red-600">Xóa</button>
        </div>
      )}
      {importing && (
        <div className="max-w-xl mx-auto mb-3 flex items-center justify-center gap-2 text-violet-600 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />AI đang phân tích file…
        </div>
      )}
      <DialogueGame key={gameKey} questions={effectiveQuestions} onExit={onExit} onReimport={openFilePicker} />
    </>
  );
}

// ─── VoiceChat Game (inner) ──────────────────────────────────────────────────
function VoiceChatGame({ turns, langCode, onExit, onReimport }: {
  turns: VoiceChatTurn[]; langCode: string; onExit: () => void; onReimport: () => void;
}) {
  type Phase = 'ready' | 'ai_speaking' | 'user_turn' | 'listening' | 'feedback' | 'done';
  const [phase, setPhase] = useState<Phase>('ready');
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const [chatLog, setChatLog] = useState<Array<{ role: 'ai' | 'user'; text: string; ok?: boolean }>>([]);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const idxRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  idxRef.current = idx;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => { cancelSpeak(); recRef.current?.stop(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const doAISpeak = (text: string, onDone?: () => void) => {
    if (typeof window !== 'undefined' && window !== window.top) {
      try { window.parent.postMessage({ type: 'TTS_SPEAK', text, lang: langCode }, '*'); } catch {}
      // Estimate speech duration: ~400ms per word, min 1.5s
      const ms = Math.max(1500, text.split(' ').length * 400);
      if (onDone) setTimeout(onDone, ms);
      return;
    }
    const synth = ss();
    if (!synth) { onDone?.(); return; }
    try {
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = langCode; utt.rate = 0.9;
      if (onDone) utt.onend = onDone;
      synth.speak(utt);
    } catch { onDone?.(); }
  };

  const speakTurn = (turnIdx: number) => {
    const turn = turns[turnIdx];
    if (!turn) return;
    setPhase('ai_speaking');
    setChatLog(h => [...h, { role: 'ai', text: turn.ai }]);
    doAISpeak(turn.ai, () => setPhase('user_turn'));
  };

  // Ref avoids stale closures in async speech callbacks
  const handleResponseRef = useRef<(heard: string) => void>();
  handleResponseRef.current = (heard: string) => {
    const turn = turns[idxRef.current];
    const ok = turn.keywords.some(kw => heard.toLowerCase().includes(kw.toLowerCase()));
    setCorrect(ok);
    setScores(s => [...s, ok]);
    setChatLog(h => [...h, { role: 'user', text: heard, ok }]);
    setPhase('feedback');
    const reply = ok
      ? (turn.response || 'Well done!')
      : `Not quite. Key words: "${turn.keywords.slice(0, 2).join('", "')}"`;
    setTimeout(() => {
      setChatLog(h => [...h, { role: 'ai', text: reply }]);
      doAISpeak(reply);
    }, 300);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    cancelSpeak();
    const rec = new SR();
    recRef.current = rec;
    rec.lang = langCode; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 3;
    setPhase('listening');
    let handled = false;
    rec.onresult = (e: any) => {
      if (handled) return; handled = true;
      handleResponseRef.current?.(e.results[0][0].transcript);
    };
    rec.onerror = () => { if (!handled) { handled = true; setPhase('user_turn'); } };
    rec.onend = () => { if (!handled) { handled = true; setPhase('user_turn'); } };
    rec.start();
  };

  const goNext = () => {
    cancelSpeak();
    const next = idxRef.current + 1;
    if (next >= turns.length) { setPhase('done'); return; }
    idxRef.current = next;
    setIdx(next);
    speakTurn(next);
  };

  const restart = () => {
    cancelSpeak();
    idxRef.current = 0;
    setPhase('ready'); setIdx(0); setScores([]); setChatLog([]); setCorrect(false);
  };

  const correctCount = scores.filter(Boolean).length;

  if (phase === 'done') {
    const pct = turns.length > 0 ? Math.round((correctCount / turns.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-md mx-auto">
        <div className="text-6xl">{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold">Kết thúc hội thoại!</h2>
        <div className="w-28 h-28 rounded-full border-8 flex items-center justify-center"
          style={{ borderColor: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>
          <span className="text-3xl font-bold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>
            {pct}%
          </span>
        </div>
        <p className="text-muted-foreground">{correctCount}/{turns.length} câu trả lời đúng</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={restart}><RotateCcw className="h-4 w-4 mr-2" />Làm lại</Button>
          <Button variant="outline" size="sm" onClick={onReimport}><Upload className="h-3.5 w-3.5 mr-1" />Import khác</Button>
          <Button variant="outline" onClick={onExit}>Thoát</Button>
        </div>
      </div>
    );
  }

  const currentTurn = turns[idx];

  return (
    <div className="flex flex-col max-w-xl mx-auto" style={{ height: 'calc(100vh - 9rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft className="h-4 w-4 mr-1" />Thoát</Button>
        <span className="text-sm text-muted-foreground font-medium">{idx + 1} / {turns.length}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReimport}>
          <Upload className="h-3 w-3 mr-1" />Import
        </Button>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-muted rounded-full mb-3 shrink-0">
        <div className="h-1.5 bg-amber-400 rounded-full transition-all" style={{ width: `${(idx / turns.length) * 100}%` }} />
      </div>

      {/* Chat bubbles */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 pr-1">
        {chatLog.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground py-12">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <PhoneCall className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-gray-700">Sẵn sàng trò chuyện bằng giọng nói?</p>
              <p className="text-sm mt-1">AI sẽ nói trước, bạn trả lời bằng mic</p>
            </div>
          </div>
        )}
        {chatLog.map((msg, i) => (
          <div key={i} className={cn('flex items-end gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'rounded-2xl px-4 py-2.5 text-sm max-w-[78%]',
              msg.role === 'ai'
                ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                : msg.ok
                  ? 'bg-green-500 text-white rounded-tr-sm'
                  : 'bg-red-400 text-white rounded-tr-sm',
            )}>
              {msg.text}
              {msg.role === 'user' && (
                <span className="ml-2 text-xs opacity-75">{msg.ok ? '✓' : '✗'}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="shrink-0 pt-3 border-t space-y-3">
        {!supported && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge.
          </p>
        )}
        {currentTurn?.hint && phase === 'user_turn' && (
          <p className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            💡 {currentTurn.hint}
          </p>
        )}
        <div className="flex justify-center">
          {phase === 'ready' && (
            <Button onClick={() => speakTurn(0)} className="bg-amber-500 hover:bg-amber-600 text-white px-8">
              <PhoneCall className="h-4 w-4 mr-2" />Bắt đầu hội thoại
            </Button>
          )}
          {phase === 'ai_speaking' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
              <Volume2 className="h-5 w-5 text-amber-500 animate-pulse" />AI đang nói...
            </div>
          )}
          {phase === 'user_turn' && supported && (
            <button onClick={startListening}
              className="flex flex-col items-center gap-2 px-10 py-5 rounded-2xl border-2 border-dashed border-amber-400 hover:border-amber-500 hover:bg-amber-50 transition-all">
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Mic className="h-7 w-7 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-amber-700">Nhấn để trả lời</span>
            </button>
          )}
          {phase === 'user_turn' && !supported && (
            <p className="text-sm text-muted-foreground py-3">Không hỗ trợ STT trên trình duyệt này</p>
          )}
          {phase === 'listening' && (
            <button onClick={() => recRef.current?.stop()}
              className="flex flex-col items-center gap-2 px-10 py-5 rounded-2xl border-2 border-red-400 bg-red-50 animate-pulse">
              <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                <Radio className="h-7 w-7 text-red-500" />
              </div>
              <span className="text-sm font-medium text-red-600">Đang nghe... (nhấn để dừng)</span>
            </button>
          )}
          {phase === 'feedback' && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium w-full text-center',
                correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200',
              )}>
                {correct ? '✓ Chính xác!' : '✗ Chưa đúng — hãy luyện thêm'}
              </div>
              <Button onClick={goNext} className="px-8">
                {idx < turns.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VoiceChat Mode (wrapper) ────────────────────────────────────────────────
function VoiceChatMode({ set, onExit, initialImport }: {
  set: VocabSet; onExit: () => void; initialImport?: VoiceChatTurn[] | null;
}) {
  const langCode = LANG_BCP47[set.language] || 'en-US';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<VoiceChatTurn[] | null>(initialImport ?? null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const defaultTurns: VoiceChatTurn[] = set.items.slice(0, 10).map(item => ({
    ai: `Can you use the word "${item.word}" in a sentence?`,
    hint: `Dùng từ "${item.word}" trong một câu. (Nghĩa: ${item.translation})`,
    keywords: [item.word.toLowerCase()],
    response: item.example ? `Good! For example: "${item.example}"` : `Well done! Keep it up!`,
  }));

  const turns = imported ?? defaultTurns;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true); setImportError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.upload<{ voiceChatScript: VoiceChatTurn[] }>(
        `/language/vocab-sets/${set.id}/import-smart`, fd,
      );
      if (!res.voiceChatScript?.length) throw new Error('File không chứa kịch bản voice chat.');
      setImported(res.voiceChatScript);
      setGameKey(k => k + 1);
    } catch (err: any) {
      setImportError(err?.message || 'Import thất bại');
    }
    setImporting(false);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  if (turns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 max-w-md mx-auto text-center">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md" className="hidden" onChange={handleFile} />
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <PhoneCall className="h-10 w-10 text-amber-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Import giáo trình voice chat</h3>
          <p className="text-sm text-muted-foreground mt-1">Upload bất kỳ file giáo trình — AI tự tạo kịch bản trò chuyện.</p>
        </div>
        {importing && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />AI đang phân tích file…
          </div>
        )}
        {importError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 w-full">{importError}</p>
        )}
        <div className="flex gap-3 w-full">
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={openFilePicker} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />Chọn file (PDF/Word/Excel/PPTX)
          </Button>
          <Button variant="outline" onClick={onExit}>Quay lại</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md" className="hidden" onChange={handleFile} />
      {imported && (
        <div className="max-w-xl mx-auto mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <span className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />{imported.length} lượt từ file
          </span>
          <button onClick={() => { setImported(null); setGameKey(k => k + 1); }}
            className="text-xs text-muted-foreground hover:text-red-600">Xóa</button>
        </div>
      )}
      {importing && (
        <div className="max-w-xl mx-auto mb-3 flex items-center justify-center gap-2 text-amber-600 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />AI đang phân tích file…
        </div>
      )}
      <VoiceChatGame key={gameKey} turns={turns} langCode={langCode} onExit={onExit} onReimport={openFilePicker} />
    </>
  );
}

// ─── Main View (embeddable) ───────────────────────────────────────────────────
function VocabSetView({ id, onBack }: { id: string; onBack?: () => void }) {
  const { user } = useAuthStore();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const [set, setSet] = useState<VocabSet | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [loading, setLoading] = useState(true);

  // Video state
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  // Smart Import state
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImporting, setSmartImporting] = useState(false);
  const [smartResult, setSmartResult] = useState<SmartImportResult | null>(null);
  const [smartError, setSmartError] = useState('');
  const [smartDragOver, setSmartDragOver] = useState(false);
  const [smartDialogue, setSmartDialogue] = useState<ImportedDialogueItem[] | null>(null);
  const [smartVoiceChat, setSmartVoiceChat] = useState<VoiceChatTurn[] | null>(null);
  const smartFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<VocabSet>(`/language/vocab-sets/${id}`);
      setSet(data);
    } catch { onBack?.(); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const updated = await api.patch<VocabSet>(`/language/vocab-sets/${id}`, { videoUrl: videoInput.trim() || null });
      setSet(prev => prev ? { ...prev, videoUrl: updated.videoUrl } : prev);
      setEditingVideo(false);
    } catch {}
    setSavingVideo(false);
  };

  const handleSmartImport = async (file: File) => {
    setSmartImporting(true);
    setSmartError('');
    setSmartResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<SmartImportResult>(`/language/vocab-sets/${id}/import-smart`, fd);
      setSmartResult(res);
      if (res.dialogueScript?.length) setSmartDialogue(res.dialogueScript);
      if (res.voiceChatScript?.length) setSmartVoiceChat(res.voiceChatScript);
      await load();
    } catch (err: any) {
      setSmartError(err?.message || 'Import thất bại');
    }
    setSmartImporting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!set) return null;

  const learnedCount = Object.values(set.progressMap).filter(p => p.isLearned).length;
  const pct = set.items.length > 0 ? Math.round((learnedCount / set.items.length) * 100) : 0;

  if (mode === 'flashcard') return <FlashcardMode set={set} onExit={() => { setMode('menu'); load(); }} />;
  if (mode === 'srs') return <SRSMode set={set} onExit={() => { setMode('menu'); load(); }} />;
  if (mode === 'test') return <TestMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'write') return <WriteMode set={set} onExit={() => { setMode('menu'); load(); }} />;
  if (mode === 'pairs') return <MatchPairsMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'listen') return <ListenMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'speak') return <SpeakMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'image') return <ImageMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'dialogue') return <DialogueMode set={set} onExit={() => setMode('menu')} initialImport={smartDialogue} />;
  if (mode === 'voicechat') return <VoiceChatMode set={set} onExit={() => setMode('menu')} initialImport={smartVoiceChat} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
      </div>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{set.title}</h1>
            <p className="text-muted-foreground mt-1">bởi {set.creator.name}</p>
          </div>
          <Badge variant="outline">{set.level}</Badge>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-muted-foreground"><BookOpen className="h-4 w-4 inline mr-1" />{set.items.length} từ</span>
          <span className="text-sm text-green-600"><Check className="h-4 w-4 inline mr-1" />{learnedCount} đã học</span>
        </div>
        <div className="mt-3 h-2 bg-muted rounded-full max-w-xs">
          <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{pct}% hoàn thành</p>
      </div>

      {/* Video panel */}
      {(set.videoUrl || isInstructor) && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          {set.videoUrl && !editingVideo && (() => {
            const ytId = parseYouTubeId(set.videoUrl);
            return (
              <div>
                {ytId ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-3 bg-gray-50">
                    <Video className="h-5 w-5 text-primary shrink-0" />
                    <a href={set.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1">{set.videoUrl}</a>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                  <a href={set.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80">
                    <ExternalLink className="h-3.5 w-3.5" />Xem trên YouTube
                  </a>
                  {isInstructor && (
                    <button onClick={() => { setVideoInput(set.videoUrl || ''); setEditingVideo(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-700">
                      <Pencil className="h-3 w-3" />Sửa link
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          {(!set.videoUrl || editingVideo) && isInstructor && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-gray-800">
                  {editingVideo ? 'Sửa link video' : 'Thêm video bài giảng'}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/30 outline-none"
                />
                <button onClick={handleSaveVideo} disabled={savingVideo}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                {editingVideo && (
                  <button onClick={() => setEditingVideo(false)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Hỗ trợ YouTube, hoặc bất kỳ link video nào</p>
            </div>
          )}
        </div>
      )}

      {/* Mode selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { mode: 'flashcard' as Mode, icon: BookOpen, label: 'Flashcard', desc: 'Lật thẻ, đánh dấu đã thuộc', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
          { mode: 'srs' as Mode, icon: Zap, label: 'Ôn tập SRS', desc: 'Ôn từ sắp quên theo AI', color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
          { mode: 'test' as Mode, icon: Brain, label: 'Trắc nghiệm', desc: 'Chọn đáp án từ ngẫu nhiên', color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' },
          { mode: 'write' as Mode, icon: PenLine, label: 'Gõ đáp án', desc: 'Nhập bản dịch đúng', color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
          { mode: 'listen' as Mode, icon: Headphones, label: 'Luyện nghe', desc: 'Nghe TTS, chọn nghĩa', color: 'text-pink-600 bg-pink-50 border-pink-200 hover:bg-pink-100' },
          { mode: 'pairs' as Mode, icon: Shuffle, label: 'Ghép đôi', desc: 'Game ghép từ với nghĩa', color: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100' },
          { mode: 'speak' as Mode, icon: Mic, label: 'Luyện phát âm', desc: 'Nói và kiểm tra độ chuẩn', color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
          { mode: 'image' as Mode, icon: ImageIcon, label: 'Nhận biết hình', desc: 'Xem ảnh, chọn từ đúng', color: 'text-cyan-600 bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
          { mode: 'dialogue' as Mode, icon: MessageSquare, label: 'Hội thoại', desc: 'Điền từ vào câu hội thoại', color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
          { mode: 'voicechat' as Mode, icon: PhoneCall, label: 'Trò chuyện voice', desc: 'Nói chuyện với AI bằng giọng', color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
          { mode: 'list' as Mode, icon: List, label: 'Danh sách', desc: 'Xem toàn bộ từ vựng', color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100' },
        ].map(({ mode: m, icon: Icon, label, desc, color }) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn('flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all', color)}>
            <Icon className="h-6 w-6" />
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs opacity-70">{desc}</div>
          </button>
        ))}
      </div>

      {/* Smart Import (instructor only) */}
      {isInstructor && (
        <div className="border-2 border-emerald-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSmartImport(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <div className="text-left">
                <p className="font-semibold text-emerald-800 text-sm">Smart Import AI</p>
                <p className="text-xs text-emerald-600">Upload giáo trình → AI tạo từ vựng, bài tập, hội thoại, voice chat</p>
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-emerald-500 transition-transform', showSmartImport && 'rotate-90')} />
          </button>

          {showSmartImport && (
            <div className="p-5 space-y-4 bg-white">
              <input
                ref={smartFileRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleSmartImport(f); }}
              />

              {!smartResult && !smartImporting && (
                <div
                  onDragOver={e => { e.preventDefault(); setSmartDragOver(true); }}
                  onDragLeave={() => setSmartDragOver(false)}
                  onDrop={e => { e.preventDefault(); setSmartDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleSmartImport(f); }}
                  onClick={() => smartFileRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                    smartDragOver ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
                  )}
                >
                  <Upload className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">Kéo thả hoặc nhấn để chọn file</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PPTX, TXT</p>
                </div>
              )}

              {smartImporting && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                  <p className="text-sm font-medium text-emerald-700">AI đang phân tích và tạo nội dung… (15–60 giây)</p>
                </div>
              )}

              {smartError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{smartError}</p>
                </div>
              )}

              {smartResult && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-emerald-800">Import thành công!</p>
                      <p className="text-xs text-emerald-700">
                        {smartResult.vocabCreated} từ vựng · {smartResult.exercisesGenerated} bài tập
                        {smartResult.dialogueScript?.length ? ` · ${smartResult.dialogueScript.length} câu hội thoại` : ''}
                        {smartResult.voiceChatScript?.length ? ` · ${smartResult.voiceChatScript.length} lượt voice chat` : ''}
                      </p>
                    </div>
                  </div>

                  {(smartResult.dialogueScript?.length > 0 || smartResult.voiceChatScript?.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {smartResult.dialogueScript?.length > 0 && (
                        <Button
                          className="bg-violet-600 hover:bg-violet-700 text-white h-auto py-3 flex flex-col gap-0.5"
                          onClick={() => setMode('dialogue')}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs">Mở Hội thoại</span>
                          <span className="text-[10px] opacity-80">{smartResult.dialogueScript.length} câu</span>
                        </Button>
                      )}
                      {smartResult.voiceChatScript?.length > 0 && (
                        <Button
                          className="bg-amber-500 hover:bg-amber-600 text-white h-auto py-3 flex flex-col gap-0.5"
                          onClick={() => setMode('voicechat')}
                        >
                          <PhoneCall className="h-4 w-4" />
                          <span className="text-xs">Mở Voice Chat</span>
                          <span className="text-[10px] opacity-80">{smartResult.voiceChatScript.length} lượt</span>
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => { setSmartResult(null); setSmartImporting(false); setSmartError(''); }}
                  >
                    <Upload className="h-4 w-4 mr-2" />Import file khác
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'list' && <ListView set={set} />}
    </div>
  );
}

export default function VocabSetPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  return <VocabSetView id={id} onBack={() => router.push('/language')} />;
}
