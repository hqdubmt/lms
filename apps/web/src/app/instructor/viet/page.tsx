'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Loader2, X, Sparkles,
  Search, Brain, FileUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { VietSet, VietExercise } from '@/types/viet';
import { Toast } from '@/components/common/Toast';
import { VietImportPanel } from './_components/ImportPanel';
import { SetForm } from './_components/SetForm';
import { GenExerciseForm } from './_components/GenExerciseForm';
import { SetCard } from './_components/SetCard';
import { ExerciseCard } from './_components/ExerciseCard';

export default function InstructorVietPage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [sets, setSets] = useState<VietSet[]>([]);
  const [exercises, setExercises] = useState<VietExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSetForm, setShowSetForm] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);

  const load = async () => {
    try {
      const [s, e] = await Promise.all([
        api.get<VietSet[]>('/viet/sets?mine=true'),
        api.get<VietExercise[]>('/viet/exercises?mine=true'),
      ]);
      setSets(s); setExercises(e);
    } catch {
      // silently fail — user stays on page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ready) load(); }, [ready]);

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const filteredSets = sets.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  const filteredExercises = exercises.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

  const deleteSet = async (id: string) => {
    if (!confirm('Xóa bộ bài này? Tất cả mục sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.delete(`/viet/sets/${id}`);
      setSets((prev) => prev.filter((s) => s.id !== id));
      setToast({ msg: 'Đã xóa bộ bài', type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Xóa thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.delete(`/viet/exercises/${id}`);
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setToast({ msg: 'Đã xóa bài tập', type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Xóa thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const generateAll = async (setId: string, setTitle: string) => {
    setBusy((b) => ({ ...b, [`gen-${setId}`]: true }));
    try {
      const res = await api.post<{ generated: VietExercise[]; errors: any[] }>(`/viet/sets/${setId}/generate-all`, { questionCount: 10 });
      setExercises((prev) => [...(res.generated as any[]), ...prev]);
      setToast({ msg: `Đã tạo ${res.generated.length} bài tập từ "${setTitle}"!`, type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Tạo thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [`gen-${setId}`]: false }));
  };

  const generateQuiz = async (setId: string, setTitle: string) => {
    setBusy((b) => ({ ...b, [`quiz-${setId}`]: true }));
    try {
      await api.post('/quiz/generate', { source: 'viet', sourceId: setId, title: `Quiz: ${setTitle}`, timeLimit: 30 });
      setToast({ msg: `Đã tạo Quiz Game từ "${setTitle}"! Vào mục Quiz Game để xem.`, type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Tạo quiz thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [`quiz-${setId}`]: false }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#7c1f0e 0%,#b91c1c 55%,#dc2626 100%)' }}
        className="rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-red-200/10 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-xl">🇻🇳</span>Tiếng Việt
            </h1>
            <p className="text-white/60 text-sm mt-0.5">{sets.length} bộ bài · {exercises.length} bài tập</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowSetForm(true); setShowGenForm(false); setShowImport(false); }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <Plus className="h-4 w-4" />Bộ bài
            </button>
            <button onClick={() => { setShowGenForm(true); setShowSetForm(false); setShowImport(false); }}
              className="flex items-center gap-1.5 bg-red-800/40 hover:bg-red-800/60 border border-red-400/40 text-red-100 hover:text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <Sparkles className="h-4 w-4" />Tạo bài tập
            </button>
            <button onClick={() => { setShowImport((v) => !v); setShowSetForm(false); setShowGenForm(false); }}
              className="flex items-center gap-1.5 bg-green-800/40 hover:bg-green-800/60 border border-green-400/40 text-green-100 hover:text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <FileUp className="h-4 w-4" />Nhập file
            </button>
          </div>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Nhập giáo trình từ file</h3>
            </div>
            <button onClick={() => setShowImport(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <VietImportPanel onDone={(count) => {
            setShowImport(false);
            setToast({ msg: `Đã nhập ${count} bộ bài!`, type: 'success' });
            setLoading(true); load();
          }} />
        </div>
      )}

      {/* Create set form */}
      {showSetForm && (
        <SetForm
          onCreated={(s) => { setSets((prev) => [s, ...prev]); setShowSetForm(false); setToast({ msg: 'Đã tạo bộ bài!', type: 'success' }); }}
          onClose={() => setShowSetForm(false)}
        />
      )}

      {/* Generate exercise form */}
      {showGenForm && (
        <GenExerciseForm
          sets={sets}
          onCreated={(ex) => { setExercises((prev) => [ex, ...prev]); setShowGenForm(false); setToast({ msg: `Đã tạo "${ex.title}"!`, type: 'success' }); }}
          onClose={() => setShowGenForm(false)}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm kiếm bộ bài hoặc bài tập..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Sets */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Bộ bài ({filteredSets.length})</h2>
        {filteredSets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <span className="text-4xl block mb-2">🇻🇳</span>
            <p className="text-sm text-muted-foreground">Chưa có bộ bài nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                busy={busy[set.id]}
                genBusy={busy[`gen-${set.id}`]}
                quizBusy={busy[`quiz-${set.id}`]}
                onDelete={() => deleteSet(set.id)}
                onGenerateAll={() => generateAll(set.id, set.title)}
                onGenerateQuiz={() => generateQuiz(set.id, set.title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Exercises */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Bài tập ({filteredExercises.length})</h2>
        {filteredExercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có bài tập nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                busy={busy[ex.id]}
                onDelete={() => deleteExercise(ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
