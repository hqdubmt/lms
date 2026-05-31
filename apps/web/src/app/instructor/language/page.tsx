'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Plus, Globe, Loader2, Sparkles,
  FolderOpen, Folder, Trash2, ChevronDown, ChevronUp,
  BookOpen, Edit, Gamepad2, Database, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { VocabSet, LangExercise as Exercise } from '@/types/language';
import { ExerciseForm } from './_components/ExerciseForm';
import { GenExerciseForm } from './_components/GenExerciseForm';
import { ExerciseCard } from './_components/ExerciseCard';
import { LANG_NAMES, LANGUAGES, LEVELS } from '@/constants/language';
import { cn } from '@/lib/utils';

// ─── Inline folder creation form ─────────────────────────────────────────────
function FolderForm({ onClose, onCreated }: { onClose: () => void; onCreated: (set: VocabSet) => void }) {
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState('en');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setError('');
    try {
      const created = await api.post<VocabSet>('/language/vocab-sets', {
        title, language: lang, level: 'A1', description: desc || null, isPublic: true,
      });
      onCreated(created);
      onClose();
    } catch (err: any) { setError(err.message || 'Tạo thất bại'); }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
          <Folder className="h-4 w-4" />Tạo thư mục mới
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên thư mục, VD: Tiếng Anh giao tiếp" required autoFocus />
          </div>
          <div>
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả ngắn (tuỳ chọn)" />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Folder className="h-4 w-4 mr-1" />}
            Tạo thư mục
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Hủy</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Inline child vocab set creation form ────────────────────────────────────
function ChildSetForm({ folderId, onClose, onCreated }: {
  folderId: string; onClose: () => void; onCreated: (child: VocabSet) => void;
}) {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('A1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setError('');
    try {
      const created = await api.post<VocabSet>(`/language/vocab-sets/${folderId}/children`, { title, level });
      onCreated(created);
      onClose();
    } catch (err: any) { setError(err.message || 'Tạo thất bại'); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3 p-3 bg-white rounded-xl border border-indigo-200">
      <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên bộ từ vựng, VD: Unit 1 - Greetings"
        required autoFocus className="h-8 text-sm flex-1" />
      <select value={level} onChange={(e) => setLevel(e.target.value)}
        className="h-8 border border-input rounded-md px-2 text-sm bg-background w-20 shrink-0">
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <Button type="submit" size="sm" className="h-8 shrink-0" disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Tạo'}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={onClose}>Hủy</Button>
      {error && <p className="text-xs text-red-500 shrink-0">{error}</p>}
    </form>
  );
}

// ─── Vocab set row inside folder ──────────────────────────────────────────────
function VocabRow({ set, onDelete, onGenerateQuiz, quizBusy, delBusy }: {
  set: VocabSet; onDelete: () => void; onGenerateQuiz: () => void; quizBusy: boolean; delBusy: boolean;
}) {
  const itemCount = set._count?.items ?? 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors group">
      <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{set.title}</p>
        <p className="text-xs text-muted-foreground">{itemCount} từ vựng</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">{set.level}</Badge>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onGenerateQuiz} disabled={quizBusy || itemCount < 4}
          title={itemCount < 4 ? 'Cần ít nhất 4 từ' : 'Tạo Quiz'}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-50 disabled:opacity-40">
          {quizBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gamepad2 className="h-3.5 w-3.5" />}
        </button>
        <Link href={`/instructor/language/vocab/${set.id}`}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
          <Edit className="h-3.5 w-3.5" />
        </Link>
        <button onClick={onDelete} disabled={delBusy}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50">
          {delBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <Link href={`/language/vocab/${set.id}`} className="text-xs text-indigo-600 hover:underline shrink-0">Xem</Link>
    </div>
  );
}

// ─── Folder accordion ─────────────────────────────────────────────────────────
function FolderAccordion({ folder, busy, onDeleteFolder, onDeleteChild, onGenerateQuiz, onChildCreated }: {
  folder: VocabSet;
  busy: Record<string, boolean>;
  onDeleteFolder: (id: string) => void;
  onDeleteChild: (folderId: string, childId: string) => void;
  onGenerateQuiz: (setId: string, title: string) => void;
  onChildCreated: (folderId: string, child: VocabSet) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showChildForm, setShowChildForm] = useState(false);
  const children: VocabSet[] = (folder as any).children ?? [];

  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white')}>
      {/* Folder header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open
            ? <FolderOpen className="h-5 w-5 text-indigo-500 shrink-0" />
            : <Folder className="h-5 w-5 text-indigo-400 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-gray-900">{folder.title}</span>
            <span className="ml-2 text-xs text-gray-400">{LANG_NAMES[folder.language] || folder.language}</span>
          </div>
          <span className="text-xs text-gray-400 mr-2">{children.length} bộ từ vựng</span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setShowChildForm((v) => !v); setOpen(true); }}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors">
            <Plus className="h-3.5 w-3.5" />Thêm bộ từ vựng
          </button>
          <button onClick={() => onDeleteFolder(folder.id)} disabled={busy[folder.id]}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors ml-1">
            {busy[folder.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Folder contents */}
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {showChildForm && (
            <ChildSetForm
              folderId={folder.id}
              onClose={() => setShowChildForm(false)}
              onCreated={(child) => onChildCreated(folder.id, child)}
            />
          )}

          {children.length === 0 && !showChildForm && (
            <div className="text-center py-4 text-sm text-gray-400">
              Thư mục trống — nhấn "Thêm bộ từ vựng" để bắt đầu
            </div>
          )}

          {children.map((child) => (
            <VocabRow
              key={child.id}
              set={child}
              quizBusy={busy[`quiz-${child.id}`]}
              delBusy={busy[child.id]}
              onDelete={() => onDeleteChild(folder.id, child.id)}
              onGenerateQuiz={() => onGenerateQuiz(child.id, child.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstructorLanguagePage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [folders, setFolders] = useState<VocabSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ seeded: number; totalWords: number; totalExercises: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [v, e] = await Promise.all([
        api.get<VocabSet[]>('/language/vocab-sets/tree'),
        api.get<Exercise[]>('/language/exercises'),
      ]);
      setFolders(Array.isArray(v) ? v : []);
      setExercises(Array.isArray(e) ? e : []);
    } catch (err: any) { setLoadError(err.message || 'Không thể tải dữ liệu.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFolderCreated = (folder: VocabSet) => {
    setFolders((prev) => [{ ...folder, children: [] } as any, ...prev]);
  };

  const handleChildCreated = (folderId: string, child: VocabSet) => {
    setFolders((prev) => prev.map((f) => {
      if (f.id !== folderId) return f;
      const children = [...((f as any).children ?? []), { ...child, _count: { items: 0 } }];
      return { ...f, children } as any;
    }));
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Xóa thư mục này? Tất cả bộ từ vựng bên trong cũng sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/language/vocab-sets/${id}`); setFolders((prev) => prev.filter((f) => f.id !== id)); }
    catch { }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteChild = async (folderId: string, childId: string) => {
    if (!confirm('Xóa bộ từ vựng này?')) return;
    setBusy((b) => ({ ...b, [childId]: true }));
    try {
      await api.delete(`/language/vocab-sets/${childId}`);
      setFolders((prev) => prev.map((f) => {
        if (f.id !== folderId) return f;
        return { ...f, children: ((f as any).children ?? []).filter((c: VocabSet) => c.id !== childId) } as any;
      }));
    } catch { }
    setBusy((b) => ({ ...b, [childId]: false }));
  };

  const seedSampleData = async () => {
    if (!confirm('Seed ~500 từ vựng mẫu (A1, A2, B1, B2) vào tài khoản của bạn?')) return;
    setSeeding(true); setSeedResult(null);
    try {
      const result = await api.post<{ seeded: number; totalWords: number; totalExercises: number }>(
        '/language/sample-data/seed',
        { levels: ['A1', 'A2', 'B1', 'B2'], withExercises: true },
      );
      setSeedResult(result);
      await load();
    } catch (e: any) {
      alert(e.message || 'Seed thất bại');
    }
    setSeeding(false);
  };

  const generateQuiz = async (setId: string, setTitle: string) => {
    setBusy((b) => ({ ...b, [`quiz-${setId}`]: true }));
    try {
      await api.post('/quiz/generate', { source: 'vocab', sourceId: setId, title: `Quiz: ${setTitle}`, timeLimit: 30 });
      alert(`Đã tạo Quiz Game từ "${setTitle}"!`);
    } catch (e: any) { alert(e.message || 'Tạo quiz thất bại'); }
    setBusy((b) => ({ ...b, [`quiz-${setId}`]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/language/exercises/${id}`); setExercises((s) => s.filter((x) => x.id !== id)); } catch { }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  // Flatten folder → children so GenExerciseForm shows child sets (which actually have vocab items)
  const allSets: (VocabSet & { parentTitle?: string })[] = folders.flatMap(f => {
    const children: VocabSet[] = (f as any).children ?? [];
    if (children.length > 0) return children.map(c => ({ ...c, parentTitle: f.title }));
    return [f];
  });

  if (!ready || loading) return (
    <div className="space-y-4 animate-pulse p-6">
      {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}
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
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }} className="px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/language" className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
            <ChevronLeft className="h-4 w-4 text-white" />
          </Link>
          <div className="flex-1">
            <p className="text-white/50 text-xs mb-0.5">Giảng viên</p>
            <h1 className="text-white font-bold text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />Ngoại ngữ
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* ── Folders section ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Folder className="h-5 w-5 text-indigo-500" />
              Thư mục từ vựng ({folders.length})
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                onClick={seedSampleData} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
                Seed mẫu
              </Button>
              <Button size="sm" onClick={() => { setShowFolderForm((v) => !v); }}>
                <Plus className="h-4 w-4 mr-1" />Tạo thư mục
              </Button>
            </div>
          </div>

          {showFolderForm && (
            <FolderForm
              onClose={() => setShowFolderForm(false)}
              onCreated={handleFolderCreated}
            />
          )}

          {seedResult && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Đã seed <strong>{seedResult.seeded}</strong> bộ từ với <strong>{seedResult.totalWords}</strong> từ vựng và <strong>{seedResult.totalExercises}</strong> bài tập!</span>
            </div>
          )}

          {folders.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Folder className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">Chưa có thư mục nào</p>
                <p className="text-sm mt-1">Nhấn "Tạo thư mục" để bắt đầu, hoặc seed ~500 từ mẫu</p>
                <Button size="sm" variant="outline" className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  onClick={seedSampleData} disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Seed dữ liệu mẫu (~500 từ)
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {folders.map((folder) => (
                <FolderAccordion
                  key={folder.id}
                  folder={folder}
                  busy={busy}
                  onDeleteFolder={deleteFolder}
                  onDeleteChild={deleteChild}
                  onGenerateQuiz={generateQuiz}
                  onChildCreated={handleChildCreated}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Exercises ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">Bài tập ({exercises.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowGenForm((v) => !v); setShowExForm(false); }}>
                <Sparkles className="h-4 w-4 mr-1 text-violet-500" />Tạo tự động
              </Button>
              <Button size="sm" onClick={() => { setShowExForm((v) => !v); setShowGenForm(false); }}>
                <Plus className="h-4 w-4 mr-1" />Tạo thủ công
              </Button>
            </div>
          </div>

          {showExForm && <ExerciseForm onClose={() => setShowExForm(false)} />}
          {showGenForm && <GenExerciseForm sets={allSets} onClose={() => setShowGenForm(false)} />}

          {exercises.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Bạn chưa tạo bài tập nào.</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} busy={busy[ex.id]} onDelete={() => deleteExercise(ex.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
