'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Globe, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { VocabSet, LangExercise as Exercise } from '@/types/language';
import { VocabSetForm } from './_components/VocabSetForm';
import { ExerciseForm } from './_components/ExerciseForm';
import { GenExerciseForm } from './_components/GenExerciseForm';
import { VocabSetCard } from './_components/VocabSetCard';
import { ExerciseCard } from './_components/ExerciseCard';

export default function InstructorLanguagePage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState('');
  const [showVocabForm, setShowVocabForm] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [v, e] = await Promise.all([
        api.get<VocabSet[]>('/language/vocab-sets?mine=true'),
        api.get<Exercise[]>('/language/exercises?mine=true'),
      ]);
      setSets(v); setExercises(e);
    } catch (err: any) {
      setLoadError(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteVocabSet = async (id: string) => {
    if (!confirm('Xóa bộ từ vựng này? Tất cả từ sẽ bị mất.')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.delete(`/language/vocab-sets/${id}`); setSets(s => s.filter(x => x.id !== id)); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.delete(`/language/exercises/${id}`); setExercises(s => s.filter(x => x.id !== id)); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

  if (!ready || loading) return (
    <div className="space-y-4 animate-pulse p-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted" />)}
    </div>
  );

  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-destructive text-sm">{loadError}</p>
      <button onClick={load} className="text-sm text-primary underline">Thử lại</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}
        className="px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/language" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
            <ChevronLeft className="h-4 w-4 text-white" />
          </Link>
          <div className="flex-1">
            <p className="text-white/50 text-xs mb-0.5">Giảng viên</p>
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />Quản lý ngoại ngữ
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* ── Vocab Sets ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">Bộ từ vựng ({sets.length})</h2>
            <Button size="sm" onClick={() => { setShowVocabForm(v => !v); setShowExForm(false); setShowGenForm(false); }}>
              <Plus className="h-4 w-4 mr-1" />Tạo bộ từ vựng
            </Button>
          </div>

          {showVocabForm && <VocabSetForm onClose={() => setShowVocabForm(false)} />}

          {sets.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Bạn chưa tạo bộ từ vựng nào.</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sets.map(set => (
                <VocabSetCard key={set.id} set={set} busy={busy[set.id]} onDelete={() => deleteVocabSet(set.id)} />
              ))}
            </div>
          )}
        </section>

        {/* ── Exercises ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">Bài tập ({exercises.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowGenForm(v => !v); setShowExForm(false); }}>
                <Sparkles className="h-4 w-4 mr-1 text-violet-500" />Tạo tự động
              </Button>
              <Button size="sm" onClick={() => { setShowExForm(v => !v); setShowGenForm(false); }}>
                <Plus className="h-4 w-4 mr-1" />Tạo thủ công
              </Button>
            </div>
          </div>

          {showExForm && <ExerciseForm onClose={() => setShowExForm(false)} />}
          {showGenForm && <GenExerciseForm sets={sets} onClose={() => setShowGenForm(false)} />}

          {exercises.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Bạn chưa tạo bài tập nào.</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {exercises.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} busy={busy[ex.id]} onDelete={() => deleteExercise(ex.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
