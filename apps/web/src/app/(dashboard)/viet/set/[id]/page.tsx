'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Brain, CheckCircle2, Circle, Loader2,
  RotateCcw, CheckCircle, XCircle, Shuffle, Target, Mic, MicOff,
  Video, ExternalLink, Pencil, X, Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL } from '@/constants/viet';

function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
}

interface VietItem {
  id: string; word: string; meaning: string; example?: string; note?: string; order: number;
  progress: { isLearned: boolean; repetitions: number; interval: number; nextReview: string } | null;
}
interface VietSet {
  id: string; title: string; category: string; grade: number; level: string;
  description?: string; videoUrl?: string; creator: { name: string };
  items: VietItem[];
  progressMap: Record<string, { isLearned: boolean; repetitions: number }>;
  _count: { items: number; exercises: number };
}


type Mode = 'menu' | 'flashcard' | 'quiz' | 'spelling';

// ─── Flashcard Mode ───────────────────────────────────────────────────────────
function FlashcardMode({ set, onExit, onComplete }: { set: VietSet; onExit: () => void; onComplete: (results: { itemId: string; quality: number }[]) => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ itemId: string; quality: number }[]>([]);
  const [done, setDone] = useState(false);
  const items = set.items;
  const current = items[idx];

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'vi-VN'; utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  };

  const rate = (quality: number) => {
    const nr = [...results, { itemId: current.id, quality }];
    if (idx + 1 >= items.length) { setResults(nr); setDone(true); }
    else { setResults(nr); setIdx(idx + 1); setFlipped(false); }
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold">Hoàn thành!</h2>
      <p className="text-muted-foreground">Đã ôn {items.length} mục</p>
      <div className="flex gap-3">
        <button onClick={() => onComplete(results)} className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Lưu kết quả</button>
        <button onClick={onExit} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200">Thoát</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onExit} className="flex items-center gap-1 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Thoát</button>
        <span>{idx + 1}/{items.length}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <div onClick={() => { setFlipped(!flipped); if (!flipped) speak(current.word); }}
        className="bg-white rounded-2xl border border-gray-200 p-8 min-h-[280px] flex flex-col justify-center cursor-pointer hover:shadow-md transition-all select-none">
        {!flipped ? (
          <div className="text-center space-y-3">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">{CATEGORY_LABEL[set.category]}</p>
            <h2 className="text-3xl font-bold text-gray-900">{current.word}</h2>
            <p className="text-muted-foreground text-sm">Nhấn để xem nghĩa</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Nghĩa</p>
            <p className="text-gray-900 text-lg leading-relaxed font-medium">{current.meaning}</p>
            {current.example && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Ví dụ</p>
                <p className="text-sm text-gray-700 italic">{current.example}</p>
              </div>
            )}
            {current.note && <p className="text-xs text-muted-foreground">{current.note}</p>}
          </div>
        )}
      </div>

      {flipped && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Bạn nhớ tốt đến mức nào?</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ q: 0, label: 'Quên', cls: 'bg-red-100 text-red-700 hover:bg-red-200' }, { q: 2, label: 'Khó', cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200' }, { q: 3, label: 'Ổn', cls: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' }, { q: 5, label: 'Dễ', cls: 'bg-green-100 text-green-700 hover:bg-green-200' }].map((r) => (
              <button key={r.q} onClick={() => rate(r.q)} className={cn('py-2.5 rounded-xl text-sm font-semibold transition-colors', r.cls)}>{r.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Mode (Trắc nghiệm) ──────────────────────────────────────────────────
function QuizMode({ set, onExit }: { set: VietSet; onExit: () => void }) {
  const items = set.items;
  const makeQ = useCallback((item: VietItem) => {
    const others = items.filter((x) => x.id !== item.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [item.meaning, ...others.map((o) => o.meaning)].sort(() => Math.random() - 0.5);
    return { item, options, answer: item.meaning };
  }, [items]);
  const [questions] = useState(() => items.map(makeQ));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (items.length < 2) return <div className="text-center py-20"><p className="text-muted-foreground">Cần ít nhất 2 mục</p><button onClick={onExit} className="mt-4 text-red-600 hover:underline">Quay lại</button></div>;

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-xl font-bold">Kết quả: {score}/{questions.length}</h2>
      <p className="text-muted-foreground">{Math.round((score / questions.length) * 100)}% chính xác</p>
      <button onClick={onExit} className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl">Xong</button>
    </div>
  );

  const current = questions[idx];
  const choose = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    if (opt === current.answer) setScore(score + 1);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onExit} className="flex items-center gap-1 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Thoát</button>
        <span>Câu {idx + 1}/{questions.length} · Đúng: {score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-xs text-red-600 font-semibold mb-3">"<strong>{current.item.word}</strong>" có nghĩa là gì?</p>
        {current.item.example && <p className="text-sm text-muted-foreground italic mb-3">Ví dụ: {current.item.example}</p>}
      </div>
      <div className="space-y-2">
        {current.options.map((opt) => {
          let cls = 'bg-white border-gray-200 hover:border-red-300';
          if (selected !== null) {
            if (opt === current.answer) cls = 'bg-green-50 border-green-400';
            else if (opt === selected) cls = 'bg-red-50 border-red-400';
          }
          return <button key={opt} onClick={() => choose(opt)} className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors', cls)}>{opt}</button>;
        })}
      </div>
      {selected !== null && (
        <button onClick={() => { if (idx + 1 >= questions.length) setDone(true); else { setIdx(idx + 1); setSelected(null); } }}
          className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">
          {idx + 1 < questions.length ? 'Câu tiếp' : 'Xem kết quả'}
        </button>
      )}
    </div>
  );
}

// ─── Spelling Mode (Chính tả) ─────────────────────────────────────────────────
function SpellingMode({ set, onExit }: { set: VietSet; onExit: () => void }) {
  const items = set.items;
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const speak = (text: string, slow = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'vi-VN'; utt.rate = slow ? 0.5 : 0.85;
    window.speechSynthesis.speak(utt);
  };

  const current = items[idx];

  useEffect(() => {
    if (current) setTimeout(() => speak(current.word), 400);
  }, [idx]);

  const check = () => {
    const isCorrect = input.trim().toLowerCase() === current.word.toLowerCase();
    setCorrect(isCorrect);
    setChecked(true);
    if (isCorrect) setScore(s => s + 1);
  };

  const next = () => {
    if (idx + 1 >= items.length) setDone(true);
    else { setIdx(i => i + 1); setInput(''); setChecked(false); }
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <h2 className="text-xl font-bold">Kết quả: {score}/{items.length}</h2>
      <p className="text-muted-foreground">{Math.round((score / items.length) * 100)}% chính tả đúng</p>
      <button onClick={onExit} className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl">Xong</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onExit} className="flex items-center gap-1 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Thoát</button>
        <span>Câu {idx + 1}/{items.length} · Đúng: {score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <p className="text-xs text-red-600 font-semibold">Viết đúng từ/thành ngữ vừa nghe:</p>
        <p className="text-sm text-muted-foreground">{current.meaning}</p>
        <div className="flex gap-2">
          <button onClick={() => speak(current.word)} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100">
            <Mic className="h-4 w-4" />Nghe lại
          </button>
          <button onClick={() => speak(current.word, true)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200">
            Nghe chậm
          </button>
        </div>
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !checked) check(); }}
          placeholder="Gõ từ bạn nghe được..."
          disabled={checked}
          className={cn('w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500', checked ? correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50' : 'border-gray-200')}
        />
        {checked && (
          <div className={cn('flex items-center gap-2 text-sm font-medium', correct ? 'text-green-700' : 'text-red-700')}>
            {correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {correct ? 'Chính xác!' : `Đáp án đúng: ${current.word}`}
          </div>
        )}
        {current.example && checked && <p className="text-xs text-muted-foreground italic">Ví dụ: {current.example}</p>}
      </div>

      {!checked ? (
        <button onClick={check} className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Kiểm tra</button>
      ) : (
        <button onClick={next} className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">
          {idx + 1 < items.length ? 'Tiếp theo' : 'Xem kết quả'}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function VietSetView({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuthStore();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const [set, setSet] = useState<VietSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('menu');
  const [toast, setToast] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<VietSet>(`/viet/sets/${id}`)
      .then(setSet).catch(onBack).finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async (results: { itemId: string; quality: number }[]) => {
    try {
      await api.post(`/viet/sets/${id}/study-session`, { results });
      setToast('Đã lưu kết quả ôn tập!');
      setTimeout(() => setToast(null), 3000);
    } catch {}
    setMode('menu');
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const updated = await api.patch<VietSet>(`/viet/sets/${id}`, { videoUrl: videoInput.trim() || null });
      setSet(prev => prev ? { ...prev, videoUrl: updated.videoUrl } : prev);
      setEditingVideo(false);
    } catch {}
    setSavingVideo(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!set) return null;

  if (mode === 'flashcard') return <FlashcardMode set={set} onExit={() => setMode('menu')} onComplete={handleComplete} />;
  if (mode === 'quiz') return <QuizMode set={set} onExit={() => setMode('menu')} />;
  if (mode === 'spelling') return <SpellingMode set={set} onExit={() => setMode('menu')} />;

  const learnedCount = Object.values(set.progressMap).filter((p) => p.isLearned).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 inline mr-2" />{toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[set.category]} · Lớp {set.grade} · {set.creator.name}</p>
          <h1 className="font-bold text-gray-900 truncate">{set.title}</h1>
        </div>
        {set._count.exercises > 0 && (
          <Link href={`/viet/exercises?setId=${set.id}`} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors shrink-0">
            <Target className="h-3.5 w-3.5" />{set._count.exercises} bài tập
          </Link>
        )}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Tiến độ học</p>
          <p className="text-sm font-bold text-red-600">{learnedCount}/{set.items.length} đã thuộc</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: set.items.length ? `${(learnedCount / set.items.length) * 100}%` : '0%' }} />
        </div>
      </div>

      {/* Video panel */}
      {(set.videoUrl || isInstructor) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                    <Video className="h-5 w-5 text-red-500 shrink-0" />
                    <a href={set.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-red-600 hover:underline truncate flex-1">{set.videoUrl}</a>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                  <a href={set.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700">
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
                <Video className="h-4 w-4 text-red-500" />
                <p className="text-sm font-semibold text-gray-800">
                  {editingVideo ? 'Sửa link video' : 'Thêm video bài giảng'}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-300 outline-none"
                />
                <button onClick={handleSaveVideo} disabled={savingVideo}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60">
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

      {/* Study modes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { mode: 'flashcard', icon: BookOpen, label: 'Thẻ ghi nhớ', desc: 'SRS từng mục', color: 'bg-red-600', disabled: set.items.length === 0 },
          { mode: 'quiz', icon: Brain, label: 'Trắc nghiệm', desc: 'Chọn đúng nghĩa', color: 'bg-rose-600', disabled: set.items.length < 2 },
          { mode: 'spelling', icon: Mic, label: 'Chính tả', desc: 'Nghe và viết', color: 'bg-orange-600', disabled: set.items.length === 0 },
        ].map((m) => (
          <button key={m.mode} onClick={() => !m.disabled && setMode(m.mode as Mode)} disabled={m.disabled}
            className={cn('bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0')}>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white mb-3', m.color)}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Items list */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Nội dung ({set.items.length})</h2>
        {set.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-muted-foreground">Chưa có mục nào trong bộ này</p>
          </div>
        ) : (
          <div className="space-y-2">
            {set.items.map((item) => {
              const p = set.progressMap[item.id];
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', p?.isLearned ? 'bg-green-100' : 'bg-gray-100')}>
                      {p?.isLearned ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{item.word}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.meaning}</p>
                      {item.example && <p className="text-xs text-gray-500 mt-1 italic">{item.example}</p>}
                      {item.note && <p className="text-xs text-amber-700 mt-1">📝 {item.note}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VietSetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return <VietSetView id={id} onBack={() => router.push('/viet')} />;
}
