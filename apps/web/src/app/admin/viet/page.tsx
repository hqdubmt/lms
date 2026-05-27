'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Target, Users, Loader2, Trash2,
  ChevronRight, FileUp, Brain, Bot, WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CATEGORY_COLOR, CATEGORY_LABEL, EXERCISE_TYPE_LABEL as TYPE_LABEL } from '@/constants/viet';
import { VietImportPanel } from './_components/ImportPanel';

interface VietSet {
  id: string; title: string; category: string; grade: number; level: string;
  creator: { name: string }; _count: { items: number; exercises: number };
}
interface VietExercise {
  id: string; title: string; type: string; category: string; grade: number;
  creator: { name: string }; _count: { questions: number; attempts: number };
}
interface ModuleData {
  sets: VietSet[];
  exercises: VietExercise[];
  userStats: { _count: { userId: number }; _sum: { exercisesDone: number | null; wordsLearned: number | null } };
}

export default function AdminVietPage() {
  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [aiLabel, setAiLabel] = useState('AI');

  const load = () => {
    api.get<ModuleData>('/viet/all')
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<{ available: boolean; provider: string; model: string }>('/ai/health')
      .then((r) => {
        setAiOnline(r.available);
        const names: Record<string, string> = { groq: 'Groq · llama-3.3-70b', gemini: 'Gemini · Flash 2.0', ollama: `Ollama · ${r.model}` };
        setAiLabel(names[r.provider] ?? r.model ?? 'AI');
      })
      .catch(() => setAiOnline(false));
  }, []);

  const deleteSet = async (id: string) => {
    if (!confirm('Xóa bộ bài này? Tất cả mục và bài tập sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/viet/sets/${id}`); setData((d) => d ? { ...d, sets: d.sets.filter((s) => s.id !== id) } : d); } catch {}
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/viet/exercises/${id}`); setData((d) => d ? { ...d, exercises: d.exercises.filter((e) => e.id !== id) } : d); } catch {}
    setBusy((b) => ({ ...b, [id]: false }));
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}</div>
  );

  const sets = (data?.sets || []).filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  const exercises = (data?.exercises || []).filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-xl">🇻🇳</span>Tiếng Việt
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý toàn bộ nội dung module tiếng Việt</p>
        </div>
        <button onClick={() => setShowImport((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors">
          <FileUp className="h-4 w-4" />Nhập giáo trình
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Bộ bài', value: data?.sets.length ?? 0, icon: BookOpen, color: 'bg-red-100 text-red-700' },
          { label: 'Bài tập', value: data?.exercises.length ?? 0, icon: Target, color: 'bg-orange-100 text-orange-700' },
          { label: 'Học viên', value: data?.userStats._count.userId ?? 0, icon: Users, color: 'bg-green-100 text-green-700' },
          { label: 'Lượt làm bài', value: data?.userStats._sum.exercisesDone ?? 0, icon: Brain, color: 'bg-amber-100 text-amber-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-2', s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{(s.value as number).toLocaleString('vi-VN')}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Status */}
      {aiOnline !== null && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border',
          aiOnline
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700',
        )}>
          {aiOnline ? <Bot className="h-4 w-4 shrink-0" /> : <WifiOff className="h-4 w-4 shrink-0" />}
          {aiOnline
            ? `${aiLabel} · Sẵn sàng tạo bài tập và phân tích tài liệu`
            : 'Tất cả AI offline — Hệ thống dùng rule-based để tạo bài tập'}
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <VietImportPanel onDone={() => { setShowImport(false); setLoading(true); load(); }} />
      )}

      {/* Search */}
      <input placeholder="Tìm kiếm bộ bài hoặc bài tập..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />

      {/* Sets */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Bộ bài ({sets.length})</h2>
        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <span className="text-4xl block mb-2">🇻🇳</span>
            <p className="text-sm text-muted-foreground">Chưa có bộ bài nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sets.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', CATEGORY_COLOR[s.category] || 'bg-gray-100 text-gray-600')}>
                      {CATEGORY_LABEL[s.category] || s.category}
                    </span>
                    <span className="text-xs text-muted-foreground">Lớp {s.grade} · {s.creator.name}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s._count.items} mục · {s._count.exercises} bài tập</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/instructor/viet/set/${s.id}`}
                    className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />Xem
                  </Link>
                  <button onClick={() => deleteSet(s.id)} disabled={busy[s.id]}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                    {busy[s.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercises */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Bài tập ({exercises.length})</h2>
        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có bài tập nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex) => (
              <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{TYPE_LABEL[ex.type] || ex.type}</span>
                    <span className="text-xs text-muted-foreground">Lớp {ex.grade} · {ex.creator.name}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{ex.title}</p>
                  <p className="text-xs text-muted-foreground">{ex._count.questions} câu · {ex._count.attempts} lần làm</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/viet/exercise/${ex.id}`}
                    className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />Xem
                  </Link>
                  <button onClick={() => deleteExercise(ex.id)} disabled={busy[ex.id]}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                    {busy[ex.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
