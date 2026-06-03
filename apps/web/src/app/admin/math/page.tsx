'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calculator, BookOpen, Target, Users, Loader2, Trash2,
  ChevronRight, FileUp, Bot, WifiOff, BarChart2, FlaskConical,
  Play, CheckCircle2, XCircle, TrendingUp, Database,
  Folder, FolderOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SUBJECT_COLOR, SUBJECT_LABEL, EXERCISE_TYPE_LABEL as TYPE_LABEL } from '@/constants/math';
import { MathImportPanel } from './_components/ImportPanel';

interface MathTopic {
  id: string; title: string; subject: string; grade: number; level: string;
  creator: { name: string }; _count: { concepts: number; exercises: number };
}
interface MathExercise {
  id: string; title: string; type: string; subject: string; grade: number;
  creator: { name: string }; _count: { questions: number; attempts: number };
}
interface ModuleData {
  topics: MathTopic[];
  exercises: MathExercise[];
  userStats: { _count: { userId: number }; _sum: { exercisesDone: number | null; conceptsLearned: number | null } };
}

interface Benchmark {
  id: string; name: string; totalFiles: number; parseOk: number;
  jsonValid: number; qualityPass: number; avgQuality: number; avgParser: number; createdAt: string;
}

interface ErrorTableRow {
  errorType: string; label: string; count: number; percentage: number; severity: 'high' | 'medium' | 'low';
}

interface BatchResult {
  benchmarkId: string; name: string; total: number;
  metrics: Record<string, string>; avgParser: number; avgQuality: number | null;
  errorTable?: ErrorTableRow[]; topError?: string | null; recommendation?: string | null;
}

interface CombinedStats {
  summary: { totalFilesProcessed: number; 'Parser Success %': number; 'JSON Valid %': number; 'Quality Score %': number };
  readiness: { stable: boolean; message: string };
}

interface RagStats { total: number; model: string; available: boolean }

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

function GradeAccordion({ grade, topics, busy, onDelete }: {
  grade: number;
  topics: MathTopic[];
  busy: Record<string, boolean>;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white')}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open
          ? <FolderOpen className="h-5 w-5 text-blue-500 shrink-0" />
          : <Folder className="h-5 w-5 text-blue-400 shrink-0" />}
        <span className="font-semibold text-sm text-gray-900 flex-1">Lớp {grade}</span>
        <span className="text-xs text-gray-400 mr-2">{topics.length} chủ đề</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {topics.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 group hover:border-blue-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', SUBJECT_COLOR[t.subject] || 'bg-gray-100 text-gray-600')}>
                    {SUBJECT_LABEL[t.subject] || t.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">· {t.creator.name}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t._count.concepts} khái niệm · {t._count.exercises} bài tập</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/instructor/math/topic/${t.id}`}
                  className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />Xem
                </Link>
                <button onClick={() => onDelete(t.id)} disabled={busy[t.id]}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                  {busy[t.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
  grade: number;
  exercises: MathExercise[];
  busy: Record<string, boolean>;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-violet-200 bg-violet-50/20' : 'border-gray-200 bg-white')}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open
          ? <FolderOpen className="h-5 w-5 text-violet-500 shrink-0" />
          : <Folder className="h-5 w-5 text-violet-400 shrink-0" />}
        <span className="font-semibold text-sm text-gray-900 flex-1">Lớp {grade}</span>
        <span className="text-xs text-gray-400 mr-2">{exercises.length} bài tập</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 group hover:border-violet-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{TYPE_LABEL[ex.type] || ex.type}</span>
                  <span className="text-xs text-muted-foreground">· {ex.creator.name}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{ex.title}</p>
                <p className="text-xs text-muted-foreground">{ex._count.questions} câu · {ex._count.attempts} lần làm</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/math/exercise/${ex.id}`}
                  className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
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

export default function AdminMathPage() {
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
  const [ragStats, setRagStats] = useState<RagStats | null>(null);

  const load = () => {
    api.get<ModuleData>('/math/all').then(setData).finally(() => setLoading(false));
    api.get<Benchmark[]>('/math/benchmarks').then(setBenchmarks).catch(() => {});
    api.get<CombinedStats>('/viet/combined-stats').then(setCombined).catch(() => {});
    api.get<RagStats>('/math/rag/stats').then(setRagStats).catch(() => {});
  };

  const runBenchmark = async () => {
    setBRunning(true); setBResult(null);
    try {
      const res = await api.post<BatchResult>('/math/benchmarks/run-batch', {
        name: `Admin benchmark ${new Date().toLocaleDateString('vi-VN')}`,
        useSeed: true,
        runAI: false,
      });
      setBResult(res);
      api.get<Benchmark[]>('/math/benchmarks').then(setBenchmarks).catch(() => {});
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

  const deleteTopic = async (id: string) => {
    if (!confirm('Xóa chủ đề này? Tất cả khái niệm và bài tập liên quan sẽ bị xóa.')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/math/topics/${id}`); setData((d) => d ? { ...d, topics: d.topics.filter((t) => t.id !== id) } : d); } catch {}
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try { await api.delete(`/math/exercises/${id}`); setData((d) => d ? { ...d, exercises: d.exercises.filter((e) => e.id !== id) } : d); } catch {}
    setBusy((b) => ({ ...b, [id]: false }));
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}</div>
  );

  const topics = (data?.topics || []).filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  const exercises = (data?.exercises || []).filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-blue-600" />Toán học</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý toàn bộ nội dung module toán</p>
        </div>
        <button onClick={() => setShowImport((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <FileUp className="h-4 w-4" />Nhập giáo trình
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Chủ đề', value: data?.topics.length ?? 0, icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
          { label: 'Bài tập', value: data?.exercises.length ?? 0, icon: Target, color: 'bg-violet-100 text-violet-700' },
          { label: 'Học viên', value: data?.userStats._count.userId ?? 0, icon: Users, color: 'bg-green-100 text-green-700' },
          { label: 'Lượt làm bài', value: data?.userStats._sum.exercisesDone ?? 0, icon: Calculator, color: 'bg-orange-100 text-orange-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-2', s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString('vi-VN')}</p>
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

      {/* RAG Index status */}
      {ragStats && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium border',
          ragStats.available
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-gray-50 border-gray-200 text-gray-500',
        )}>
          <Database className="h-4 w-4 shrink-0" />
          <span>RAG Index: <strong>{ragStats.total.toLocaleString('vi-VN')}</strong> vectors · {ragStats.model}</span>
          {ragStats.available ? (
            <span className="ml-auto text-[11px] bg-violet-100 px-2 py-0.5 rounded-full font-semibold">Online</span>
          ) : (
            <span className="ml-auto text-[11px] bg-gray-200 px-2 py-0.5 rounded-full font-semibold text-gray-500">Offline</span>
          )}
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <MathImportPanel onDone={() => { setShowImport(false); setLoading(true); load(); }} />
      )}

      {/* Combined Stats Toán + Tiếng Việt */}
      {combined && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-start gap-3',
          combined.readiness.stable ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200',
        )}>
          <TrendingUp className={cn('h-5 w-5 mt-0.5 shrink-0', combined.readiness.stable ? 'text-emerald-600' : 'text-orange-500')} />
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', combined.readiness.stable ? 'text-emerald-800' : 'text-orange-800')}>
              {combined.readiness.message}
            </p>
            <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span>Parser: <strong className={combined.summary['Parser Success %'] >= 85 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['Parser Success %']}%</strong></span>
              <span>JSON: <strong className={combined.summary['JSON Valid %'] >= 85 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['JSON Valid %']}%</strong></span>
              <span>Quality: <strong className={combined.summary['Quality Score %'] >= 80 ? 'text-emerald-700' : 'text-orange-700'}>{combined.summary['Quality Score %']}%</strong></span>
              <span className="ml-auto">{combined.summary.totalFilesProcessed} file đã xử lý</span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <input placeholder="Tìm kiếm chủ đề hoặc bài tập..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {/* Topics grouped by grade */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Folder className="h-5 w-5 text-blue-500" />Chủ đề ({topics.length})
        </h2>
        {topics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Calculator className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có chủ đề nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupByGrade(topics))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, gradeTopics]) => (
                <GradeAccordion
                  key={grade}
                  grade={Number(grade)}
                  topics={gradeTopics}
                  busy={busy}
                  onDelete={deleteTopic}
                />
              ))}
          </div>
        )}
      </div>

      {/* ── Benchmark ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-violet-600" />Benchmark Pipeline
          </h2>
          <Link href="/instructor/math/analytics"
            className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
            <BarChart2 className="h-3.5 w-3.5" />Analytics đầy đủ
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={runBenchmark} disabled={bRunning}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {bRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Chạy Gold Dataset (30 bài)
            </button>
            <p className="text-xs text-muted-foreground">Parser-only · nhanh · không tốn API</p>
          </div>

          {bResult && (
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />{bResult.total} bài · parser avg {(bResult.avgParser * 100).toFixed(0)}%
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(bResult.metrics).map(([label, val]) => (
                    <div key={label} className="bg-white rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-xs font-bold text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              {bResult.errorTable && bResult.errorTable.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />Bảng lỗi
                    </span>
                    {bResult.topError && <span className="text-[10px] text-red-600 font-medium">{bResult.topError}</span>}
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-50">
                      {bResult.errorTable.slice(0, 4).map((row) => (
                        <tr key={row.errorType} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1.5 text-gray-700">{row.label}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={cn('text-[10px] font-bold px-1 py-0.5 rounded border', SEVERITY_COLOR[row.severity])}>
                              {row.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold">{row.count}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={cn('font-bold', row.percentage >= 30 ? 'text-red-600' : row.percentage >= 15 ? 'text-yellow-600' : 'text-gray-500')}>
                              {row.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bResult.recommendation && (
                    <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                      <p className="text-[11px] text-amber-800 font-medium">{bResult.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {benchmarks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center">
                <thead className="text-muted-foreground bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Tên</th>
                    <th className="px-3 py-1.5 font-medium">Files</th>
                    <th className="px-3 py-1.5 font-medium">Parse</th>
                    <th className="px-3 py-1.5 font-medium">JSON</th>
                    <th className="px-3 py-1.5 font-medium">Quality</th>
                    <th className="px-3 py-1.5 text-left font-medium">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {benchmarks.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-1.5 text-left font-medium text-gray-800 max-w-[140px] truncate">{b.name}</td>
                      <td className="px-3 py-1.5">{b.totalFiles}</td>
                      <td className="px-3 py-1.5">
                        <span className={cn(b.parseOk === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600', 'font-medium')}>
                          {b.parseOk}/{b.totalFiles}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={cn(b.jsonValid === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600', 'font-medium')}>
                          {b.jsonValid}/{b.totalFiles}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        {b.avgQuality > 0
                          ? <span className={cn('font-bold', b.avgQuality >= 70 ? 'text-emerald-600' : 'text-red-500')}>{b.avgQuality.toFixed(0)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-left text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Exercises grouped by grade */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Folder className="h-5 w-5 text-violet-500" />Bài tập ({exercises.length})
        </h2>
        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có bài tập nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupByGrade(exercises))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, gradeExercises]) => (
                <GradeExerciseAccordion
                  key={grade}
                  grade={Number(grade)}
                  exercises={gradeExercises}
                  busy={busy}
                  onDelete={deleteExercise}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
