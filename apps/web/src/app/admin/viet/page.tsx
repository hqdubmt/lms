'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Target, Users, Loader2, Trash2,
  ChevronRight, FileUp, Brain, Bot, WifiOff,
  FlaskConical, Play, CheckCircle2, XCircle, TrendingUp, BarChart2,
  Folder, FolderOpen, ChevronDown, ChevronUp,
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

interface ErrorTableRow {
  errorType: string; label: string; count: number; percentage: number; severity: 'high' | 'medium' | 'low';
}

interface BatchResult {
  benchmarkId: string; name: string; total: number;
  metrics: Record<string, string>; avgParser: number; avgQuality: number | null;
  avgKnowledgeQuality: number | null;
  errorTable: ErrorTableRow[]; topError: string | null; recommendation: string | null;
}

interface Benchmark {
  id: string; name: string; totalFiles: number; parseOk: number;
  jsonValid: number; qualityPass: number; avgQuality: number; avgParser: number; createdAt: string;
}

interface CombinedStats {
  summary: { totalFilesProcessed: number; 'Parser Success %': number; 'JSON Valid %': number; 'Quality Score %': number };
  readiness: { stable: boolean; message: string };
}

const SEVERITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

function groupByGrade<T extends { grade: number }>(items: T[]): Record<number, T[]> {
  return items.reduce<Record<number, T[]>>((acc, item) => {
    (acc[item.grade] ??= []).push(item);
    return acc;
  }, {});
}

function GradeSetAccordion({ grade, sets, busy, onDelete }: {
  grade: number; sets: VietSet[];
  busy: Record<string, boolean>; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-red-200 bg-red-50/20' : 'border-gray-200 bg-white')}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open ? <FolderOpen className="h-5 w-5 text-red-500 shrink-0" /> : <Folder className="h-5 w-5 text-red-400 shrink-0" />}
        <span className="font-semibold text-sm text-gray-900 flex-1">Lớp {grade}</span>
        <span className="text-xs text-gray-400 mr-2">{sets.length} bộ bài</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {sets.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 group hover:border-red-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', CATEGORY_COLOR[s.category] || 'bg-gray-100 text-gray-600')}>
                    {CATEGORY_LABEL[s.category] || s.category}
                  </span>
                  <span className="text-xs text-muted-foreground">· {s.creator.name}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s._count.items} mục · {s._count.exercises} bài tập</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/instructor/viet/set/${s.id}`}
                  className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />Xem
                </Link>
                <button onClick={() => onDelete(s.id)} disabled={busy[s.id]}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                  {busy[s.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GradeExerciseAccordion({ grade, exercises, busy, onDelete }: {
  grade: number; exercises: VietExercise[];
  busy: Record<string, boolean>; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-orange-200 bg-orange-50/20' : 'border-gray-200 bg-white')}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open ? <FolderOpen className="h-5 w-5 text-orange-500 shrink-0" /> : <Folder className="h-5 w-5 text-orange-400 shrink-0" />}
        <span className="font-semibold text-sm text-gray-900 flex-1">Lớp {grade}</span>
        <span className="text-xs text-gray-400 mr-2">{exercises.length} bài tập</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 group hover:border-orange-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{TYPE_LABEL[ex.type] || ex.type}</span>
                  <span className="text-xs text-muted-foreground">· {ex.creator.name}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{ex.title}</p>
                <p className="text-xs text-muted-foreground">{ex._count.questions} câu · {ex._count.attempts} lần làm</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/viet/exercise/${ex.id}`}
                  className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />Xem
                </Link>
                <button onClick={() => onDelete(ex.id)} disabled={busy[ex.id]}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                  {busy[ex.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminVietPage() {
  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [aiLabel, setAiLabel] = useState('AI');
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [bRunning, setBRunning] = useState(false);
  const [bResult, setBResult] = useState<BatchResult | null>(null);
  const [combined, setCombined] = useState<CombinedStats | null>(null);

  const load = () => {
    api.get<ModuleData>('/viet/all').then(setData).finally(() => setLoading(false));
    api.get<Benchmark[]>('/viet/benchmarks').then(setBenchmarks).catch(() => {});
    api.get<CombinedStats>('/viet/combined-stats').then(setCombined).catch(() => {});
  };

  const runBenchmark = async () => {
    setBRunning(true); setBResult(null);
    try {
      const res = await api.post<BatchResult>('/viet/benchmarks/run-batch', {
        name: `Admin Viet ${new Date().toLocaleDateString('vi-VN')}`,
        useSeed: true, runAI: false,
      });
      setBResult(res);
      api.get<Benchmark[]>('/viet/benchmarks').then(setBenchmarks).catch(() => {});
      api.get<CombinedStats>('/viet/combined-stats').then(setCombined).catch(() => {});
    } catch (e: any) { alert(e.message || 'Benchmark thất bại'); }
    setBRunning(false);
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

      {/* Combined Stats */}
      {combined && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-start gap-3',
          combined.readiness.stable ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200',
        )}>
          <TrendingUp className={cn('h-5 w-5 mt-0.5 shrink-0', combined.readiness.stable ? 'text-emerald-600' : 'text-orange-500')} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold', combined.readiness.stable ? 'text-emerald-800' : 'text-orange-800')}>
              {combined.readiness.message}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Parser: <strong className={combined.summary['Parser Success %'] >= 85 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['Parser Success %']}%</strong></span>
              <span>JSON: <strong className={combined.summary['JSON Valid %'] >= 85 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['JSON Valid %']}%</strong></span>
              <span>Quality: <strong className={combined.summary['Quality Score %'] >= 80 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['Quality Score %']}%</strong></span>
              <span className="ml-auto"><BarChart2 className="h-3.5 w-3.5 inline mr-1" />{combined.summary.totalFilesProcessed} file đã xử lý</span>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-600" />Benchmark Pipeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gold dataset — 20 bài Tiếng Việt chuẩn (lớp 1–5)</p>
          </div>
          <button onClick={runBenchmark} disabled={bRunning}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
            {bRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Chạy Parser Test
          </button>
        </div>

        {bResult && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4" />Kết quả — {bResult.total} bài
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(bResult.metrics).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{k}</p>
                    <p className="text-sm font-bold text-gray-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {bResult.errorTable?.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />Bảng lỗi
                  </span>
                  {bResult.topError && <span className="text-[10px] text-red-600 font-medium">Top: {bResult.topError}</span>}
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-50">
                    {bResult.errorTable.slice(0, 5).map((row) => (
                      <tr key={row.errorType} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-700">{row.label}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', SEVERITY_COLOR[row.severity])}>
                            {row.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-bold text-gray-900">{row.count}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={row.percentage >= 30 ? 'text-red-600 font-bold' : row.percentage >= 15 ? 'text-yellow-600 font-bold' : 'text-gray-500'}>
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bResult.recommendation && (
                  <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-800 font-medium">{bResult.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {benchmarks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Run</th>
                  <th className="px-3 py-2 text-center font-medium">Files</th>
                  <th className="px-3 py-2 text-center font-medium">Parse ✓</th>
                  <th className="px-3 py-2 text-center font-medium">JSON ✓</th>
                  <th className="px-3 py-2 text-center font-medium">Quality ✓</th>
                  <th className="px-3 py-2 text-left font-medium">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {benchmarks.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-700 max-w-[140px] truncate">{b.name}</td>
                    <td className="px-3 py-2 text-center">{b.totalFiles}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('font-medium', b.parseOk === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600')}>{b.parseOk}/{b.totalFiles}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('font-medium', b.jsonValid === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600')}>{b.jsonValid}/{b.totalFiles}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('font-medium', b.qualityPass >= b.totalFiles * 0.8 ? 'text-emerald-600' : 'text-red-600')}>{b.qualityPass}/{b.totalFiles}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Search */}
      <input placeholder="Tìm kiếm bộ bài hoặc bài tập..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />

      {/* Sets grouped by grade */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Folder className="h-5 w-5 text-red-500" />Bộ bài ({sets.length})
        </h2>
        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <span className="text-4xl block mb-2">🇻🇳</span>
            <p className="text-sm text-muted-foreground">Chưa có bộ bài nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupByGrade(sets))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, gradeSets]) => (
                <GradeSetAccordion key={grade} grade={Number(grade)} sets={gradeSets} busy={busy} onDelete={deleteSet} />
              ))}
          </div>
        )}
      </div>

      {/* Exercises grouped by grade */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Folder className="h-5 w-5 text-orange-500" />Bài tập ({exercises.length})
        </h2>
        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có bài tập nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupByGrade(exercises))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, gradeExercises]) => (
                <GradeExerciseAccordion key={grade} grade={Number(grade)} exercises={gradeExercises} busy={busy} onDelete={deleteExercise} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
