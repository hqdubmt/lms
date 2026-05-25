'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, Plus, Trash2, Pencil, X, Loader2, Clock, Eye, EyeOff, Check, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type GenSource = 'vocab' | 'viet' | 'math' | 'lesson' | 'course';
interface GenItem { id: string; title: string }
interface VocabSet { id: string; title: string }
interface CourseItem { id: string; title: string; sections?: { id: string; title: string; lessons: { id: string; title: string }[] }[] }

type QType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK';

interface QuizQ {
  id?: string;
  question: string;
  type: QType;
  options: string[];
  correctIndex?: number;
  correctText?: string;
  explanation?: string;
  order: number;
}

interface QuizSet {
  id: string; title: string; description?: string; topic: string;
  isPublic: boolean; timeLimit?: number; createdAt: string;
  author: { id: string; name: string };
  _count: { questions: number; attempts: number };
}

const Q_TYPE_LABELS: Record<QType, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  TRUE_FALSE: 'Đúng/Sai',
  FILL_BLANK: 'Điền vào chỗ trống',
};

function QuestionEditor({ q, index, onChange, onDelete }: {
  q: QuizQ; index: number; onChange: (q: QuizQ) => void; onDelete: () => void;
}) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500">Câu {index + 1}</span>
        <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-red-500">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <select value={q.type} onChange={(e) => onChange({ ...q, type: e.target.value as QType, options: e.target.value === 'TRUE_FALSE' ? ['Đúng', 'Sai'] : q.options, correctIndex: undefined })}
        className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-indigo-300">
        {Object.entries(Q_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <input value={q.question} onChange={(e) => onChange({ ...q, question: e.target.value })}
        placeholder="Nội dung câu hỏi..." className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" />

      {q.type === 'MULTIPLE_CHOICE' && (
        <div className="space-y-1.5">
          {(q.options.length ? q.options : ['', '', '', '']).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => onChange({ ...q, correctIndex: i })}
                className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors', q.correctIndex === i ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-emerald-400')}>
                {q.correctIndex === i && <Check className="h-3 w-3 text-white" />}
              </button>
              <input value={opt}
                onChange={(e) => { const opts = [...(q.options.length ? q.options : ['', '', '', ''])]; opts[i] = e.target.value; onChange({ ...q, options: opts }); }}
                placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                className="flex-1 h-8 rounded-lg border border-gray-200 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300" />
            </div>
          ))}
          <p className="text-[10px] text-gray-400">Nhấn ● để chọn đáp án đúng</p>
        </div>
      )}

      {q.type === 'TRUE_FALSE' && (
        <div className="flex gap-2">
          {['Đúng', 'Sai'].map((opt, i) => (
            <button key={i} onClick={() => onChange({ ...q, correctIndex: i, options: ['Đúng', 'Sai'] })}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors', q.correctIndex === i ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-300')}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'FILL_BLANK' && (
        <input value={q.correctText || ''} onChange={(e) => onChange({ ...q, correctText: e.target.value })}
          placeholder="Đáp án đúng..." className="w-full h-9 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
      )}

      <input value={q.explanation || ''} onChange={(e) => onChange({ ...q, explanation: e.target.value })}
        placeholder="Giải thích (tùy chọn)..." className="w-full h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
    </div>
  );
}

export default function InstructorQuizPage() {
  const { user } = useAuthStore();
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSet, setEditingSet] = useState<QuizSet | null>(null);

  // Auto generate state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genSource, setGenSource] = useState<GenSource>('vocab');
  const [genItems, setGenItems] = useState<GenItem[]>([]);
  const [genLessons, setGenLessons] = useState<GenItem[]>([]);
  const [genSourceId, setGenSourceId] = useState('');
  const [genLoadingItems, setGenLoadingItems] = useState(false);
  const [genGenerating, setGenGenerating] = useState(false);
  const [genTitle, setGenTitle] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [timeLimit, setTimeLimit] = useState('');
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [savingForm, setSavingForm] = useState(false);

  const load = () => {
    api.get<QuizSet[]>('/quiz?mine=1').then((d) => setSets(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingSet(null); setTitle(''); setDesc(''); setTopic(''); setIsPublic(true); setTimeLimit('');
    setQuestions([{ question: '', type: 'MULTIPLE_CHOICE', options: ['', '', '', ''], correctIndex: undefined, order: 0 }]);
    setShowForm(true);
  };

  const openEdit = async (s: QuizSet) => {
    setEditingSet(s);
    setTitle(s.title); setDesc(s.description || ''); setTopic(s.topic); setIsPublic(s.isPublic); setTimeLimit(s.timeLimit ? String(s.timeLimit) : '');
    const full = await api.get<{ questions: QuizQ[] }>(`/quiz/${s.id}`).catch(() => null);
    setQuestions(full?.questions || []);
    setShowForm(true);
  };

  const addQ = () => setQuestions((p) => [...p, { question: '', type: 'MULTIPLE_CHOICE', options: ['', '', '', ''], order: p.length }]);

  const handleSave = async () => {
    if (!title.trim() || !topic.trim()) return;
    setSavingForm(true);
    try {
      const body = {
        title: title.trim(), description: desc, topic: topic.trim(),
        isPublic, timeLimit: timeLimit ? Number(timeLimit) : undefined,
      };
      if (editingSet) {
        await api.patch(`/quiz/${editingSet.id}`, body);
        await api.put(`/quiz/${editingSet.id}/questions`, { questions });
        load();
      } else {
        await api.post('/quiz', { ...body, questions });
        load();
      }
      setShowForm(false);
    } catch {}
    setSavingForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa quiz này?')) return;
    await api.delete(`/quiz/${id}`);
    setSets((p) => p.filter((s) => s.id !== id));
  };

  const handleTogglePublic = async (s: QuizSet) => {
    await api.patch(`/quiz/${s.id}`, { isPublic: !s.isPublic });
    setSets((p) => p.map((q) => q.id === s.id ? { ...q, isPublic: !q.isPublic } : q));
  };

  const loadGenItems = async (src: GenSource) => {
    setGenSource(src); setGenSourceId(''); setGenItems([]); setGenLessons([]);
    setGenLoadingItems(true);
    try {
      if (src === 'vocab') {
        const d = await api.get<VocabSet[]>('/language/vocab-sets?mine=1').catch(() => []);
        setGenItems(Array.isArray(d) ? d.map((x) => ({ id: x.id, title: x.title })) : []);
      } else if (src === 'viet') {
        const d = await api.get<VocabSet[]>('/viet/sets?mine=1').catch(() => []);
        setGenItems(Array.isArray(d) ? d.map((x) => ({ id: x.id, title: x.title })) : []);
      } else if (src === 'math') {
        const d = await api.get<VocabSet[]>('/math/topics?mine=1').catch(() => []);
        setGenItems(Array.isArray(d) ? d.map((x) => ({ id: x.id, title: x.title })) : []);
      } else if (src === 'lesson' || src === 'course') {
        const d = await api.get<CourseItem[]>('/courses/mine').catch(() => []);
        if (src === 'course') {
          setGenItems(Array.isArray(d) ? d.map((x) => ({ id: x.id, title: x.title })) : []);
        } else {
          const all: GenItem[] = [];
          for (const c of Array.isArray(d) ? d : []) {
            const detail = await api.get<CourseItem>(`/courses/${c.id}/manage`).catch(() => null);
            detail?.sections?.forEach((sec) =>
              sec.lessons?.forEach((l) => all.push({ id: l.id, title: `${c.title} / ${sec.title} / ${l.title}` })),
            );
          }
          setGenLessons(all);
        }
      }
    } finally {
      setGenLoadingItems(false);
    }
  };

  const handleGenerate = async () => {
    if (!genSourceId) return;
    setGenGenerating(true);
    try {
      const res = await api.post<QuizSet>('/quiz/generate', {
        source: genSource,
        sourceId: genSourceId,
        title: genTitle.trim() || undefined,
        timeLimit: 30,
      });
      setSets((p) => [res, ...p]);
      setShowGenModal(false);
      setGenTitle(''); setGenSourceId('');
    } catch (e: any) {
      alert(e?.message || 'Tạo quiz thất bại');
    } finally {
      setGenGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý Quiz</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tạo và quản lý bộ câu hỏi trò chơi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowGenModal(true); loadGenItems('vocab'); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
            <Sparkles className="h-4 w-4" />Tạo tự động AI
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />Tạo quiz
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : sets.length === 0 ? (
        <div className="text-center py-20">
          <Gamepad2 className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có quiz nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">{s.topic}</p>
                </div>
                <button onClick={() => handleTogglePublic(s)} title={s.isPublic ? 'Ẩn' : 'Công khai'}
                  className={cn('h-7 w-7 rounded-lg flex items-center justify-center ml-2 shrink-0 transition-colors', s.isPublic ? 'text-emerald-500 bg-emerald-50' : 'text-gray-400 bg-gray-100')}>
                  {s.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{s._count.questions} câu</span>
                {s.timeLimit && <span><Clock className="h-3 w-3 inline" /> {s.timeLimit}s</span>}
                <span>{s._count.attempts} lượt</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEdit(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />Sửa
                </button>
                <button onClick={() => handleDelete(s.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">{editingSet ? 'Sửa quiz' : 'Tạo quiz mới'}</h3>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên quiz *"
                  className="col-span-2 h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Chủ đề *"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="Thời gian/câu (giây)" type="number"
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả (tùy chọn)"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <span className="text-sm text-gray-700">Công khai (học viên có thể xem)</span>
              </label>

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Câu hỏi ({questions.length})</p>
                  <button onClick={addQ} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    <Plus className="h-3.5 w-3.5" />Thêm câu
                  </button>
                </div>
                {questions.map((q, i) => (
                  <QuestionEditor key={i} q={q} index={i}
                    onChange={(updated) => setQuestions((p) => p.map((_, j) => j === i ? updated : _))}
                    onDelete={() => setQuestions((p) => p.filter((_, j) => j !== i))} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={savingForm || !title.trim() || !topic.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                {savingForm && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSet ? 'Cập nhật' : 'Tạo quiz'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h3 className="font-bold text-gray-900">Tạo Quiz tự động bằng AI</h3>
              </div>
              <button onClick={() => setShowGenModal(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nguồn dữ liệu</label>
                <div className="grid grid-cols-5 gap-1">
                  {(['vocab', 'viet', 'math', 'lesson', 'course'] as GenSource[]).map((s) => (
                    <button key={s} onClick={() => loadGenItems(s)}
                      className={cn('py-1.5 px-1 rounded-lg text-xs font-medium transition-colors', genSource === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                      {s === 'vocab' ? 'Từ vựng' : s === 'viet' ? 'Tiếng Việt' : s === 'math' ? 'Toán' : s === 'lesson' ? 'Bài học' : 'Khóa học'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  {genSource === 'lesson' ? 'Chọn bài học' : genSource === 'course' ? 'Chọn khóa học' : 'Chọn bộ dữ liệu'}
                </label>
                {genLoadingItems ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
                ) : (
                  <select value={genSourceId} onChange={(e) => setGenSourceId(e.target.value)}
                    className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300">
                    <option value="">-- Chọn --</option>
                    {(genSource === 'lesson' ? genLessons : genItems).map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tên quiz (tùy chọn)</label>
                <input value={genTitle} onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="Để trống AI sẽ tự đặt tên..."
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>

              <div className="bg-violet-50 rounded-lg p-3 text-xs text-violet-700">
                AI sẽ tự động tạo 10-20 câu hỏi trắc nghiệm từ dữ liệu bạn chọn.
                {(genSource === 'lesson' || genSource === 'course') && ' Bài học cần có nội dung văn bản.'}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={handleGenerate} disabled={!genSourceId || genGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                {genGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Đang tạo...</> : <><Sparkles className="h-4 w-4" />Tạo Quiz</>}
              </button>
              <button onClick={() => setShowGenModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
