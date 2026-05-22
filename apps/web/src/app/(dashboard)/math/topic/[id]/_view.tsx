'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Brain, ChevronRight, CheckCircle2, Circle,
  Loader2, RotateCcw, Sparkles, Calculator, Lightbulb, Eye, EyeOff,
  CheckCircle, XCircle, ChevronLeft, Target, Video, ExternalLink, Pencil, X, Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

function parseYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
}

interface Concept {
  id: string; name: string; definition: string; formula?: string; example?: string;
  solution?: string; hints: string[]; imageUrl?: string; order: number;
  progress: { interval: number; easeFactor: number; repetitions: number; isLearned: boolean; nextReview: string } | null;
}
interface Topic {
  id: string; title: string; subject: string; grade: number; level: string;
  description?: string; videoUrl?: string; creator: { name: string };
  concepts: Concept[];
  _count: { exercises: number };
}

type Mode = 'menu' | 'flashcard' | 'quiz' | 'review';

// ─── Flashcard Mode ───────────────────────────────────────────────────────────
function FlashcardMode({ topic, onExit, onComplete }: { topic: Topic; onExit: () => void; onComplete: (results: { conceptId: string; quality: number }[]) => void }) {
  const concepts = topic.concepts;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ conceptId: string; quality: number }[]>([]);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const current = concepts[idx];

  const rate = (quality: number) => {
    const newResults = [...results, { conceptId: current.id, quality }];
    if (idx + 1 >= concepts.length) {
      setResults(newResults);
      setDone(true);
    } else {
      setResults(newResults);
      setIdx(idx + 1);
      setFlipped(false);
      setShowHint(false);
    }
  };

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold">Hoàn thành!</h2>
      <p className="text-muted-foreground">Bạn đã ôn {concepts.length} khái niệm</p>
      <div className="flex gap-3">
        <button onClick={() => onComplete(results)}
          className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Lưu kết quả
        </button>
        <button onClick={onExit} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          Thoát
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onExit} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />Thoát
        </button>
        <span>{idx + 1} / {concepts.length}</span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${((idx) / concepts.length) * 100}%` }} />
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="bg-white rounded-2xl border border-gray-200 p-8 min-h-[300px] flex flex-col justify-center cursor-pointer hover:shadow-md transition-all select-none"
      >
        {!flipped ? (
          <div className="text-center space-y-3">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Khái niệm</p>
            <h2 className="text-2xl font-bold text-gray-900">{current.name}</h2>
            {current.formula && (
              <div className="mt-4 bg-blue-50 rounded-xl px-4 py-3 font-mono text-blue-800 text-sm">
                {current.formula}
              </div>
            )}
            <p className="text-muted-foreground text-sm mt-4">Nhấn để xem định nghĩa</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Định nghĩa</p>
            <p className="text-gray-900 text-lg leading-relaxed">{current.definition}</p>
            {current.example && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Ví dụ</p>
                <p className="text-sm text-gray-700">{current.example}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {current.hints.length > 0 && (
        <button onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
          <Lightbulb className="h-4 w-4" />{showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
        </button>
      )}
      {showHint && current.hints.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          {current.hints[0]}
        </div>
      )}

      {flipped && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">Bạn nhớ tốt đến mức nào?</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { q: 0, label: 'Quên', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
              { q: 2, label: 'Khó', cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
              { q: 3, label: 'Ổn', cls: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
              { q: 5, label: 'Dễ', cls: 'bg-green-100 text-green-700 hover:bg-green-200' },
            ].map((r) => (
              <button key={r.q} onClick={() => rate(r.q)}
                className={cn('py-2.5 rounded-xl text-sm font-semibold transition-colors', r.cls)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Mode ────────────────────────────────────────────────────────────────
function QuizMode({ topic, onExit }: { topic: Topic; onExit: () => void }) {
  const concepts = topic.concepts;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const makeQuestion = useCallback((c: Concept) => {
    const others = concepts.filter((x) => x.id !== c.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [c.name, ...others.map((o) => o.name)].sort(() => Math.random() - 0.5);
    return { concept: c, options, answer: c.name };
  }, [concepts]);

  const [questions] = useState(() => concepts.map(makeQuestion));
  const current = questions[idx];

  const choose = (opt: string) => {
    if (selected !== null) return;
    setSelected(opt);
    if (opt === current.answer) setScore(score + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) setDone(true);
    else { setIdx(idx + 1); setSelected(null); setShowSolution(false); }
  };

  if (concepts.length < 2) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Cần ít nhất 2 khái niệm để làm trắc nghiệm</p>
      <button onClick={onExit} className="mt-4 text-blue-600 hover:underline">Quay lại</button>
    </div>
  );

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
        <Target className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold">Kết quả: {score}/{questions.length}</h2>
      <p className="text-muted-foreground">{Math.round((score / questions.length) * 100)}% chính xác</p>
      <div className="flex gap-3">
        <button onClick={onExit} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Xong
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button onClick={onExit} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />Thoát
        </button>
        <span>Câu {idx + 1}/{questions.length} · Đúng: {score}</span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-xs text-blue-600 font-semibold mb-3">Tên khái niệm nào sau đây đúng với định nghĩa?</p>
        <p className="text-gray-900 font-medium text-base leading-relaxed mb-2">{current.concept.definition}</p>
        {current.concept.formula && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 font-mono text-blue-800 text-sm mb-4">{current.concept.formula}</div>
        )}
      </div>

      <div className="space-y-2">
        {current.options.map((opt) => {
          let cls = 'bg-white border-gray-200 hover:border-blue-300';
          if (selected !== null) {
            if (opt === current.answer) cls = 'bg-green-50 border-green-400';
            else if (opt === selected) cls = 'bg-red-50 border-red-400';
          }
          return (
            <button key={opt} onClick={() => choose(opt)}
              className={cn('w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors', cls)}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="space-y-3">
          {current.concept.solution && (
            <button onClick={() => setShowSolution(!showSolution)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
              <Eye className="h-4 w-4" />{showSolution ? 'Ẩn lời giải' : 'Xem lời giải'}
            </button>
          )}
          {showSolution && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">{current.concept.solution}</div>
          )}
          <button onClick={next}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            {idx + 1 < questions.length ? 'Câu tiếp' : 'Xem kết quả'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TopicView (embeddable) ───────────────────────────────────────────────────
export function TopicView({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuthStore();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('menu');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Topic>(`/math/topics/${id}`)
      .then(setTopic)
      .catch(onBack)
      .finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async (results: { conceptId: string; quality: number }[]) => {
    setSaving(true);
    try {
      await api.post(`/math/topics/${id}/study-session`, { results });
      setToast('Đã lưu kết quả!');
      setTimeout(() => setToast(null), 3000);
    } catch {}
    setSaving(false);
    setMode('menu');
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const updated = await api.patch<Topic>(`/math/topics/${id}`, { videoUrl: videoInput.trim() || null });
      setTopic(prev => prev ? { ...prev, videoUrl: updated.videoUrl } : prev);
      setEditingVideo(false);
    } catch {}
    setSavingVideo(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!topic) return null;

  const learnedCount = topic.concepts.filter((c) => c.progress?.isLearned).length;

  if (mode === 'flashcard') return <FlashcardMode topic={topic} onExit={() => setMode('menu')} onComplete={handleComplete} />;
  if (mode === 'quiz') return <QuizMode topic={topic} onExit={() => setMode('menu')} />;

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
          <p className="text-xs text-muted-foreground">Lớp {topic.grade} · {topic.creator.name}</p>
          <h1 className="font-bold text-gray-900 truncate">{topic.title}</h1>
        </div>
        {topic._count.exercises > 0 && (
          <Link href={`/math/exercises?topicId=${topic.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
            <Target className="h-3.5 w-3.5" />{topic._count.exercises} bài tập
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Tiến độ học</p>
          <p className="text-sm font-bold text-blue-600">{learnedCount}/{topic.concepts.length} đã thuộc</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: topic.concepts.length ? `${(learnedCount / topic.concepts.length) * 100}%` : '0%' }} />
        </div>
      </div>

      {(topic.videoUrl || isInstructor) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {topic.videoUrl && !editingVideo && (() => {
            const ytId = parseYouTubeId(topic.videoUrl);
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
                    <Video className="h-5 w-5 text-blue-500 shrink-0" />
                    <a href={topic.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate flex-1">{topic.videoUrl}</a>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                  <a href={topic.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
                    <ExternalLink className="h-3.5 w-3.5" />Xem trên YouTube
                  </a>
                  {isInstructor && (
                    <button onClick={() => { setVideoInput(topic.videoUrl || ''); setEditingVideo(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-700">
                      <Pencil className="h-3 w-3" />Sửa link
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          {(!topic.videoUrl || editingVideo) && isInstructor && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-semibold text-gray-800">
                  {editingVideo ? 'Sửa link video' : 'Thêm video bài giảng'}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none"
                />
                <button onClick={handleSaveVideo} disabled={savingVideo}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
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

      <div className="grid grid-cols-2 gap-3">
        {[
          { mode: 'flashcard', icon: BookOpen, label: 'Thẻ ghi nhớ', desc: 'Học công thức theo SRS', color: 'bg-blue-600', disabled: topic.concepts.length === 0 },
          { mode: 'quiz', icon: Brain, label: 'Trắc nghiệm', desc: 'Kiểm tra hiểu biết', color: 'bg-violet-600', disabled: topic.concepts.length < 2 },
        ].map((m) => (
          <button key={m.mode} onClick={() => !m.disabled && setMode(m.mode as Mode)} disabled={m.disabled}
            className={cn('bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none')}>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white mb-3', m.color)}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-bold text-gray-900 mb-3">Khái niệm ({topic.concepts.length})</h2>
        {topic.concepts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Calculator className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có khái niệm nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topic.concepts.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', c.progress?.isLearned ? 'bg-green-100' : 'bg-gray-100')}>
                    {c.progress?.isLearned
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      : <Circle className="h-3.5 w-3.5 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    {c.formula && <p className="font-mono text-blue-700 text-xs bg-blue-50 rounded px-2 py-0.5 mt-1 inline-block">{c.formula}</p>}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.definition}</p>
                    {c.example && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer font-medium">Xem ví dụ</summary>
                        <div className="mt-1.5 bg-gray-50 rounded-lg p-3 text-xs text-gray-700">{c.example}</div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
