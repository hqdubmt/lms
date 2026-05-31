'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, BookOpen, Brain, Edit, Trash2, Globe,
  Loader2, X, Zap, Flame, Star,
  FolderOpen, Folder, ChevronDown, ChevronUp,
  Database, CheckCircle2, AlertTriangle, PlayCircle, Wand2, ChevronRight,
} from 'lucide-react';
import { EXERCISE_ICONS, EXERCISE_TYPE_LABEL, LEVELS, LANGUAGES, LANG_NAMES } from '@/constants/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LangStats {
  xp: number; level: number; streak: number; longestStreak: number;
  wordsLearned: number; exercisesDone: number; reviewsDue: number;
}
interface Analytics {
  wordStats: { total: number; seen: number; mastered: number; due: number };
  skillScores: Record<string, number>;
  levelBreakdown: { level: string; seen: number; mastered: number }[];
}
interface VocabSet {
  id: string; title: string; language: string; level: string; isPublic: boolean;
  _count: { items: number; children?: number }; creator: { name: string };
  children?: VocabSet[];
}
interface Exercise {
  id: string; title: string; type: string; language: string; level: string; isPublic: boolean;
  _count: { questions: number; attempts: number }; creator: { name: string };
}

const EXERCISE_TYPES = Object.keys(EXERCISE_TYPE_LABEL) as (keyof typeof EXERCISE_TYPE_LABEL)[];

function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500; const next = level * 500;
  return Math.round(((xp - base) / (next - base)) * 100);
}

// ─── Inline folder form ───────────────────────────────────────────────────────
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
      const created = await api.post<VocabSet>('/language/vocab-sets', { title, language: lang, level: 'A1', description: desc || null, isPublic: true });
      onCreated(created);
      onClose();
    } catch (err: any) { setError(err.message || 'Tạo thất bại'); }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-4 mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2"><Folder className="h-4 w-4" />Tạo thư mục mới</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên thư mục, VD: Tiếng Anh giao tiếp" required autoFocus />
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mô tả ngắn (tuỳ chọn)" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Folder className="h-4 w-4 mr-1" />}Tạo thư mục
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>Hủy</Button>
        </div>
      </form>
    </div>
  );
}

// ─── Inline child form ────────────────────────────────────────────────────────
function ChildSetForm({ folderId, onClose, onCreated }: { folderId: string; onClose: () => void; onCreated: (child: VocabSet) => void }) {
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
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên bộ từ vựng" required autoFocus className="h-8 text-sm flex-1" />
      <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-8 border border-input rounded-md px-2 text-sm bg-background w-20 shrink-0">
        {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <Button type="submit" size="sm" className="h-8 shrink-0" disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Tạo'}</Button>
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={onClose}>Hủy</Button>
      {error && <p className="text-xs text-red-500 shrink-0">{error}</p>}
    </form>
  );
}

// ─── Vocab row inside folder ──────────────────────────────────────────────────
function VocabRow({ set, onDelete, delBusy }: { set: VocabSet; onDelete: () => void; delBusy: boolean }) {
  const itemCount = set._count?.items ?? 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors group">
      <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{set.title}</p>
        <p className="text-xs text-muted-foreground">{itemCount} từ vựng · bởi {set.creator?.name}</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">{set.level}</Badge>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/admin/language/vocab/${set.id}`} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
          <Edit className="h-3.5 w-3.5" />
        </Link>
        <button onClick={onDelete} disabled={delBusy} className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50">
          {delBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <Link href={`/language/vocab/${set.id}`} className="text-xs text-indigo-600 hover:underline shrink-0">Xem</Link>
    </div>
  );
}

// ─── Folder accordion ─────────────────────────────────────────────────────────
function FolderAccordion({ folder, busy, onDeleteFolder, onDeleteChild, onChildCreated }: {
  folder: VocabSet; busy: Record<string, boolean>;
  onDeleteFolder: (id: string) => void;
  onDeleteChild: (folderId: string, childId: string) => void;
  onChildCreated: (folderId: string, child: VocabSet) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showChildForm, setShowChildForm] = useState(false);
  const children: VocabSet[] = folder.children ?? [];

  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <FolderOpen className="h-5 w-5 text-indigo-500 shrink-0" /> : <Folder className="h-5 w-5 text-indigo-400 shrink-0" />}
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
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {showChildForm && (
            <ChildSetForm folderId={folder.id} onClose={() => setShowChildForm(false)}
              onCreated={(child) => { onChildCreated(folder.id, child); setShowChildForm(false); }} />
          )}
          {children.length === 0 && !showChildForm && (
            <div className="text-center py-4 text-sm text-gray-400">Thư mục trống — nhấn "Thêm bộ từ vựng" để bắt đầu</div>
          )}
          {children.map((child) => (
            <VocabRow key={child.id} set={child} delBusy={busy[child.id]}
              onDelete={() => onDeleteChild(folder.id, child.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLanguagePage() {
  const [stats, setStats] = useState<LangStats | null>(null);
  const [folders, setFolders] = useState<VocabSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showFolderForm, setShowFolderForm] = useState(false);

  // Sample data state
  const [showSamplePanel, setShowSamplePanel] = useState(false);
  const [sampleInfo, setSampleInfo] = useState<{
    sets: { level: string; title: string; description: string; wordCount: number }[];
    validation: { total: number; avgScore: number; perfect: number; byLevel: Record<string, { count: number; avgScore: number }> };
  } | null>(null);
  const [sampleInfoLoading, setSampleInfoLoading] = useState(false);
  const [seedLevels, setSeedLevels] = useState<string[]>(['A1', 'A2', 'B1', 'B2']);
  const [seedWithEx, setSeedWithEx] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ seeded: number; totalWords: number; totalExercises: number } | null>(null);
  const [validateReport, setValidateReport] = useState<{
    summary: { totalWords: number; totalParsed: number; totalFailed: number; parseRate: number };
    sets: { level: string; setTitle: string; wordCount: number; failedCount: number; parseRate: number; failedSamples: string[] }[];
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number } | null>(null);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [showExForm, setShowExForm] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eLang, setELang] = useState('en');
  const [eLevel, setELevel] = useState('A1');
  const [eType, setEType] = useState<string>('MULTIPLE_CHOICE');
  const [eDesc, setEDesc] = useState('');
  const [eCreating, setECreating] = useState(false);
  const [eError, setEError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [s, v, e, a] = await Promise.all([
      api.get<LangStats>('/language/stats').catch(() => null),
      api.get<VocabSet[]>('/language/vocab-sets/tree').catch(() => []),
      api.get<Exercise[]>('/language/exercises').catch(() => []),
      api.get<Analytics>('/language/analytics').catch(() => null),
    ]);
    setStats(s); setFolders(v as VocabSet[]); setExercises(e as Exercise[]); setAnalytics(a);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFolderCreated = (folder: VocabSet) => {
    setFolders((prev) => [{ ...folder, children: [] }, ...prev]);
  };

  const handleChildCreated = (folderId: string, child: VocabSet) => {
    setFolders((prev) => prev.map((f) => {
      if (f.id !== folderId) return f;
      return { ...f, children: [...(f.children ?? []), { ...child, _count: { items: 0 } }] };
    }));
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Xóa thư mục này? Tất cả bộ từ vựng bên trong cũng sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/language/vocab-sets/${id}`); setFolders((prev) => prev.filter((f) => f.id !== id)); } catch { }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteChild = async (folderId: string, childId: string) => {
    if (!confirm('Xóa bộ từ vựng này?')) return;
    setBusy((b) => ({ ...b, [childId]: true }));
    try {
      await api.delete(`/language/vocab-sets/${childId}`);
      setFolders((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, children: (f.children ?? []).filter((c) => c.id !== childId) }));
    } catch { }
    setBusy((b) => ({ ...b, [childId]: false }));
  };

  const loadSampleInfo = async () => {
    if (sampleInfo) return;
    setSampleInfoLoading(true);
    try {
      const data = await api.get<typeof sampleInfo>('/language/sample-data');
      setSampleInfo(data);
    } catch {}
    setSampleInfoLoading(false);
  };

  const handleShowSamplePanel = () => {
    setShowSamplePanel(v => !v);
    if (!sampleInfo) loadSampleInfo();
  };

  const handleValidate = async () => {
    setValidating(true); setValidateReport(null);
    try {
      const data = await api.get<typeof validateReport>('/language/sample-data/validate');
      setValidateReport(data);
    } catch {}
    setValidating(false);
  };

  const handleSeed = async () => {
    if (!confirm(`Seed ${seedLevels.join(', ')} — bộ từ mẫu sẽ được tạo. Tiếp tục?`)) return;
    setSeeding(true); setSeedResult(null);
    try {
      const data = await api.post<typeof seedResult>('/language/sample-data/seed', {
        levels: seedLevels, withExercises: seedWithEx,
      });
      setSeedResult(data);
      await load();
    } catch (e: any) { alert(e.message || 'Seed thất bại'); }
    setSeeding(false);
  };

  const handleCleanup = async () => {
    if (!confirm('Xóa tất cả dữ liệu mẫu [Mẫu] của bạn?')) return;
    setCleaning(true); setCleanResult(null);
    try {
      const data = await api.delete<typeof cleanResult>('/language/sample-data/cleanup');
      setCleanResult(data);
      await load();
    } catch {}
    setCleaning(false);
  };

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eTitle.trim()) return;
    setECreating(true); setEError('');
    try {
      const ex = await api.post<{ id: string }>('/language/exercises', { title: eTitle, language: eLang, level: eLevel, type: eType, description: eDesc, questions: [] });
      window.location.href = `/admin/language/exercise/${ex.id}`;
    } catch (err: any) { setEError(err.message || 'Tạo bài tập thất bại'); }
    setECreating(false);
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/language/exercises/${id}`); setExercises((s) => s.filter((x) => x.id !== id)); } catch { }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted" />)}</div>
  );

  const progress = stats ? xpProgress(stats.xp, stats.level) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" />Ngoại ngữ</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý bộ từ vựng và bài tập cho học viên</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShowSamplePanel}
          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
          <Database className="h-4 w-4 mr-1.5 text-indigo-500" />Dữ liệu mẫu (500 từ)
        </Button>
      </div>

      {/* ── Sample Data Panel ── */}
      {showSamplePanel && (
        <Card className="border-indigo-200">
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                Bộ dữ liệu mẫu — Test Parser với 100 từ/cấp độ
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSamplePanel(false)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 space-y-1.5">
              <p className="font-semibold">Gold Dataset — 500 từ · 15 set · 4 cấp độ</p>
              <div className="grid grid-cols-2 gap-1.5 text-indigo-700 pl-1">
                <div>🔵 <strong>A1</strong> (201 từ) — Gia đình, màu sắc, nhà cửa, quần áo, thể thao, tháng/ngày</div>
                <div>🟢 <strong>A2</strong> (153 từ) — Trường học, du lịch, mua sắm, công nghệ, sức khỏe</div>
                <div>🟡 <strong>B1</strong> (66 từ) — Thiên nhiên, xã hội, khoa học, nghệ thuật</div>
                <div>🟠 <strong>B2</strong> (80 từ) — Học thuật, nghề nghiệp, môi trường, tư duy phản biện</div>
              </div>
              <p className="text-indigo-600 text-xs">Mỗi từ: word · translation · pronunciation · example · exampleTrans · synonyms · hints · topic · itemLevel</p>
            </div>

            {/* Validation report */}
            {sampleInfo && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{sampleInfo.validation.total}</p>
                  <p className="text-xs text-muted-foreground">Tổng từ</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{sampleInfo.validation.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Điểm TB</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{sampleInfo.validation.perfect}</p>
                  <p className="text-xs text-muted-foreground">Từ hoàn chỉnh 100%</p>
                </div>
                {Object.entries(sampleInfo.validation.byLevel).map(([lvl, stat]) => (
                  <div key={lvl} className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stat.avgScore}%</p>
                    <p className="text-xs text-muted-foreground">{lvl} ({stat.count} từ)</p>
                  </div>
                ))}
              </div>
            )}
            {sampleInfoLoading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>}

            {/* Parser Validate */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating}
                className="border-amber-300 text-amber-700 hover:bg-amber-50">
                {validating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Test Parser
              </Button>
              <span className="text-xs text-muted-foreground">Kiểm tra tỷ lệ parse thành công của 300 từ</span>
            </div>

            {validateReport && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Tổng', value: validateReport.summary.totalWords, color: 'text-gray-700' },
                    { label: 'Parse OK', value: validateReport.summary.totalParsed, color: 'text-green-600' },
                    { label: 'Thất bại', value: validateReport.summary.totalFailed, color: 'text-red-500' },
                    { label: 'Tỷ lệ', value: `${validateReport.summary.parseRate}%`, color: validateReport.summary.parseRate >= 95 ? 'text-green-600' : 'text-amber-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border rounded-lg p-2 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {validateReport.sets.map(s => (
                    <div key={s.setTitle} className="flex items-center gap-3 bg-white rounded-lg border px-3 py-2">
                      <span className="text-xs font-bold w-8 shrink-0 text-center bg-indigo-100 text-indigo-700 rounded px-1 py-0.5">{s.level}</span>
                      <span className="text-sm flex-1 truncate">{s.setTitle.replace('[Mẫu] ', '')}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{s.wordCount} từ</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${s.parseRate >= 95 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.parseRate}%</span>
                        {s.failedCount > 0 && <span className="text-xs text-red-500">{s.failedCount} lỗi</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seed Controls */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Nhập dữ liệu mẫu vào database</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Cấp độ:</span>
                  {['A1', 'A2', 'B1', 'B2'].map(lvl => (
                    <button key={lvl} onClick={() => setSeedLevels(prev => prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl])}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${seedLevels.includes(lvl) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={seedWithEx} onChange={e => setSeedWithEx(e.target.checked)} className="rounded" />
                  Tạo bài tập tự động
                </label>
              </div>

              {seedResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-700">Seed thành công!</p>
                    <p className="text-green-600">{seedResult.seeded} bộ từ vựng · {seedResult.totalWords} từ · {seedResult.totalExercises} bài tập</p>
                  </div>
                </div>
              )}

              {cleanResult && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
                  Đã xóa {cleanResult.deleted} bộ dữ liệu mẫu.
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleSeed} disabled={seeding || seedLevels.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700">
                  {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                  Seed {seedLevels.join('+')} vào database
                </Button>
                <Button variant="outline" onClick={handleCleanup} disabled={cleaning}
                  className="border-red-200 text-red-600 hover:bg-red-50">
                  {cleaning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Xóa data mẫu
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Level {stats.level}</span></div>
              <div className="text-2xl font-bold">{stats.xp} XP</div>
              <div className="mt-2 h-1.5 bg-white/30 rounded-full"><div className="h-1.5 bg-white rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="text-xs opacity-70 mt-1">{progress}% → Level {stats.level + 1}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Chuỗi ngày</span></div>
              <div className="text-2xl font-bold">{stats.streak} ngày</div>
              <div className="text-xs opacity-70 mt-1">Kỷ lục: {stats.longestStreak} ngày</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Từ đã học</span></div>
              <div className="text-2xl font-bold">{stats.wordsLearned}</div>
              <div className="text-xs opacity-70 mt-1">{stats.exercisesDone} bài tập hoàn thành</div>
            </CardContent>
          </Card>
          <Card className={`border-0 text-white ${stats.reviewsDue > 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Cần ôn tập</span></div>
              <div className="text-2xl font-bold">{stats.reviewsDue}</div>
              <div className="text-xs opacity-70 mt-1">{stats.reviewsDue > 0 ? 'Từ sắp quên!' : 'Đã ôn xong'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics mini - word stats + skill scores + level breakdown */}
      {analytics && analytics.wordStats.total > 0 && (
        <Card className="border-violet-100 bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-violet-800">
                <ChevronRight className="h-4 w-4 text-violet-500" />Phân tích học tập học viên
              </h3>
              <Link href="/language/analytics">
                <Button variant="ghost" size="sm" className="text-xs text-violet-600 h-7">Xem chi tiết →</Button>
              </Link>
            </div>
            {/* Word stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Tổng từ gặp', v: analytics.wordStats.seen, color: 'text-blue-600' },
                { label: 'Đã thuộc', v: analytics.wordStats.mastered, color: 'text-green-600' },
                { label: 'Cần ôn', v: analytics.wordStats.due, color: analytics.wordStats.due > 0 ? 'text-amber-600' : 'text-gray-400' },
                { label: 'Tổng trong DB', v: analytics.wordStats.total, color: 'text-violet-600' },
              ].map(({ label, v, color }) => (
                <div key={label} className="text-center bg-white/70 rounded-lg p-2">
                  <p className={`text-xl font-bold ${color}`}>{v}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {/* Level breakdown */}
            {analytics.levelBreakdown.length > 0 && (
              <div className="space-y-1.5">
                {analytics.levelBreakdown.map(({ level, seen, mastered }) => {
                  const pct = seen > 0 ? Math.round((mastered / seen) * 100) : 0;
                  return (
                    <div key={level} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-8 text-center bg-indigo-100 text-indigo-700 rounded px-1">{level}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-24 text-right">{mastered}/{seen} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Folders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Folder className="h-5 w-5 text-indigo-500" />Thư mục từ vựng ({folders.length})</h2>
          <Button size="sm" onClick={() => setShowFolderForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />Tạo thư mục
          </Button>
        </div>

        {showFolderForm && <FolderForm onClose={() => setShowFolderForm(false)} onCreated={handleFolderCreated} />}

        {folders.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            <Folder className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">Chưa có thư mục nào</p>
            <p className="text-sm mt-1">Nhấn "Tạo thư mục" để bắt đầu tổ chức bộ từ vựng</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => (
              <FolderAccordion key={folder.id} folder={folder} busy={busy}
                onDeleteFolder={deleteFolder} onDeleteChild={deleteChild} onChildCreated={handleChildCreated} />
            ))}
          </div>
        )}
      </section>

      {/* Exercises */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bài tập ({exercises.length})</h2>
          <Button size="sm" onClick={() => setShowExForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />Tạo bài tập
          </Button>
        </div>

        {showExForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tạo bài tập mới</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowExForm(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={createExercise} className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Tên bài tập *</label>
                  <Input value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="VD: Trắc nghiệm từ vựng chủ đề Du lịch" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Loại bài tập</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eType} onChange={(e) => setEType(e.target.value)}>
                    {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{EXERCISE_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ngôn ngữ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eLang} onChange={(e) => setELang(e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Trình độ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eLevel} onChange={(e) => setELevel(e.target.value)}>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Mô tả</label>
                  <Input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Mô tả bài tập..." />
                </div>
                {eError && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{eError}</p>}
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={eCreating}>{eCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo và thêm câu hỏi</Button>
                  <Button type="button" variant="outline" onClick={() => setShowExForm(false)}>Hủy</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {exercises.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có bài tập nào.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {exercises.map((ex) => {
              const Icon = EXERCISE_ICONS[ex.type] || Brain;
              return (
                <Card key={ex.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{ex.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{EXERCISE_TYPE_LABEL[ex.type]} · {LANG_NAMES[ex.language] || ex.language} · {ex.level}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ex._count.questions} câu · {ex._count.attempts} lượt làm</div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link href={`/admin/language/exercise/${ex.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={busy[ex.id]} onClick={() => deleteExercise(ex.id)}>
                        {busy[ex.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
