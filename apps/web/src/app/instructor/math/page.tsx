'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import {
  Plus, Loader2, X, Sparkles,
  Search, Calculator, Brain, FileUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { MathTopic, MathExercise } from '@/types/math';
import { Toast } from '@/components/common/Toast';
import { MathImportPanel } from './_components/ImportPanel';
import { TopicForm } from './_components/TopicForm';
import { GenExerciseForm } from './_components/GenExerciseForm';
import { TopicCard } from './_components/TopicCard';
import { ExerciseCard } from './_components/ExerciseCard';

export default function InstructorMathPage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [topics, setTopics] = useState<MathTopic[]>([]);
  const [exercises, setExercises] = useState<MathExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);

  const load = async () => {
    try {
      const [t, e] = await Promise.all([
        api.get<MathTopic[]>('/math/topics?mine=true'),
        api.get<MathExercise[]>('/math/exercises?mine=true'),
      ]);
      setTopics(t); setExercises(e);
    } catch (e: any) {
      setToast({ msg: e.message || 'Không thể tải dữ liệu', type: 'error' });
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

  const filteredTopics = topics.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  const filteredExercises = exercises.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

  const deleteTopic = async (id: string) => {
    if (!confirm('Xóa chủ đề này? Tất cả khái niệm sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.delete(`/math/topics/${id}`);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setToast({ msg: 'Đã xóa chủ đề', type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Xóa thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.delete(`/math/exercises/${id}`);
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setToast({ msg: 'Đã xóa bài tập', type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Xóa thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const generateAll = async (topicId: string, topicTitle: string) => {
    setBusy((b) => ({ ...b, [`gen-${topicId}`]: true }));
    try {
      const res = await api.post<{ generated: MathExercise[]; errors: any[] }>(`/math/topics/${topicId}/generate-all`, { questionCount: 10 });
      setExercises((prev) => [...res.generated, ...prev]);
      setToast({ msg: `Đã tạo ${res.generated.length} bài tập từ "${topicTitle}"!`, type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Tạo thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [`gen-${topicId}`]: false }));
  };

  const generateQuiz = async (topicId: string, topicTitle: string) => {
    setBusy((b) => ({ ...b, [`quiz-${topicId}`]: true }));
    try {
      await api.post('/quiz/generate', { source: 'math', sourceId: topicId, title: `Quiz Toán: ${topicTitle}`, timeLimit: 30 });
      setToast({ msg: `Đã tạo Quiz Game từ "${topicTitle}"! Vào mục Quiz Game để xem.`, type: 'success' });
    } catch (e: any) { setToast({ msg: e.message || 'Tạo quiz thất bại', type: 'error' }); }
    setBusy((b) => ({ ...b, [`quiz-${topicId}`]: false }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)' }}
        className="rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-400/10 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-300" />Toán học
            </h1>
            <p className="text-white/60 text-sm mt-0.5">{topics.length} chủ đề · {exercises.length} bài tập</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowTopicForm(true); setShowGenForm(false); setShowImport(false); }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <Plus className="h-4 w-4" />Chủ đề
            </button>
            <button onClick={() => { setShowGenForm(true); setShowTopicForm(false); setShowImport(false); }}
              className="flex items-center gap-1.5 bg-blue-500/30 hover:bg-blue-500/50 border border-blue-400/40 text-blue-100 hover:text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <Sparkles className="h-4 w-4" />Tạo bài tập
            </button>
            <button onClick={() => { setShowImport((v) => !v); setShowTopicForm(false); setShowGenForm(false); }}
              className="flex items-center gap-1.5 bg-green-500/30 hover:bg-green-500/50 border border-green-400/40 text-green-100 hover:text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              <FileUp className="h-4 w-4" />Nhập file
            </button>
          </div>
        </div>
      </div>

      {/* ── Import panel ── */}
      {showImport && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Nhập giáo trình thông minh</h3>
            </div>
            <button onClick={() => setShowImport(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <MathImportPanel onDone={(count) => {
            setShowImport(false);
            setToast({ msg: `Đã nhập ${count} chủ đề!`, type: 'success' });
            setLoading(true); load();
          }} />
        </div>
      )}

      {/* ── Create topic form ── */}
      {showTopicForm && (
        <TopicForm
          onCreated={(t) => { setTopics((prev) => [t, ...prev]); setShowTopicForm(false); setToast({ msg: 'Đã tạo chủ đề!', type: 'success' }); }}
          onClose={() => setShowTopicForm(false)}
        />
      )}

      {/* ── Generate exercise form ── */}
      {showGenForm && (
        <GenExerciseForm
          topics={topics}
          onCreated={(ex) => { setExercises((prev) => [ex, ...prev]); setShowGenForm(false); setToast({ msg: `Đã tạo "${ex.title}"!`, type: 'success' }); }}
          onClose={() => setShowGenForm(false)}
        />
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm kiếm chủ đề hoặc bài tập..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* ── Topics ── */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Chủ đề ({filteredTopics.length})</h2>
        {filteredTopics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Calculator className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có chủ đề nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                busy={busy[topic.id]}
                genBusy={busy[`gen-${topic.id}`]}
                quizBusy={busy[`quiz-${topic.id}`]}
                onDelete={() => deleteTopic(topic.id)}
                onGenerateAll={() => generateAll(topic.id, topic.title)}
                onGenerateQuiz={() => generateQuiz(topic.id, topic.title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Exercises ── */}
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
