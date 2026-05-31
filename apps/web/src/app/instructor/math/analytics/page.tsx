'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, BarChart2, AlertTriangle, Copy, Wrench, RefreshCw,
  Star, Loader2, CheckCircle2, XCircle, ShieldCheck, FlaskConical,
  Play, FlameKindling, Database, Search, Zap, Layers, TerminalSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';

interface ImportLog {
  id: string;
  totalLessons: number;
  validLessons: number;
  hallucinationCount: number;
  duplicateCount: number;
  repairCount: number;
  retryTotal: number;
  droppedByQualityGate: number;
  avgQualityScore: number;
  avgParserScore: number;
  textbook: string | null;
  grade: number | null;
  createdAt: string;
}

interface AnalyticsData {
  total: number;
  parserSuccessRate: number;
  jsonValidRate: number;
  qualityGatePassRate: number;
  hallucinationRate: number;
  avgQualityScore: number;
  avgParserScore: number;
  duplicateRate: number;
  logs: ImportLog[];
}

interface Benchmark {
  id: string;
  name: string;
  totalFiles: number;
  parseOk: number;
  jsonValid: number;
  qualityPass: number;
  hallucCount: number;
  avgQuality: number;
  avgParser: number;
  notes: string | null;
  createdAt: string;
}

interface ErrorTableRow {
  errorType: string; label: string; count: number; percentage: number; severity: 'high' | 'medium' | 'low';
}

interface RagStats { total: number; model: string; available: boolean }
interface RagSearchResult { score: number; conceptName: string; topicTitle: string; grade: number; subject: string; text: string }
interface ParserChunk { title: string; textLength: number; parserScore: number; isRich: boolean; formulaTokens: string[]; mathSignals: string[] }
interface ParserReport { curriculum: { grade?: number; textbook?: string; subject?: string }; totalChunks: number; avgParserScore: number; chunks: ParserChunk[]; checks: Record<string, boolean> }

interface BatchResult {
  benchmarkId: string;
  name: string;
  total: number;
  metrics: Record<string, string>;
  avgParser: number;
  avgQuality: number | null;
  errorTable?: ErrorTableRow[];
  topError?: string | null;
  recommendation?: string | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700'
    : score >= 60 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', color)}>{score.toFixed(0)}/100</span>;
}

function RateCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{pct.toFixed(1)}%</div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MathAnalyticsPage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<BatchResult | null>(null);

  // ── RAG Index ──
  const [ragStats, setRagStats] = useState<RagStats | null>(null);
  const [ragEmbedRunning, setRagEmbedRunning] = useState(false);
  const [ragEmbedResult, setRagEmbedResult] = useState<{ embedded: number; failed: number; topics: number } | null>(null);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragSearchRunning, setRagSearchRunning] = useState(false);
  const [ragSearchResults, setRagSearchResults] = useState<RagSearchResult[] | null>(null);

  // ── Test Parser ──
  const [parserText, setParserText] = useState('');
  const [parserRunning, setParserRunning] = useState(false);
  const [parserReport, setParserReport] = useState<ParserReport | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      api.get<AnalyticsData>('/math/analytics'),
      api.get<Benchmark[]>('/math/benchmarks'),
    ]).then(([a, b]) => { setData(a); setBenchmarks(b); }).finally(() => setLoading(false));
    api.get<RagStats>('/math/rag/stats').then(setRagStats).catch(() => {});
  }, [ready]);

  const runRagEmbed = async () => {
    setRagEmbedRunning(true); setRagEmbedResult(null);
    try {
      const res = await api.post<{ embedded: number; failed: number; topics: number }>('/math/rag/embed', { limit: 200 });
      setRagEmbedResult(res);
      api.get<RagStats>('/math/rag/stats').then(setRagStats).catch(() => {});
    } catch (e: any) { alert(e.message || 'Embed thất bại'); }
    setRagEmbedRunning(false);
  };

  const runRagSearch = async () => {
    if (!ragSearchQuery.trim()) return;
    setRagSearchRunning(true); setRagSearchResults(null);
    try {
      const res = await api.post<{ results: RagSearchResult[] }>('/math/rag/search', { query: ragSearchQuery, topK: 5 });
      setRagSearchResults(res.results);
    } catch (e: any) { alert(e.message || 'Search thất bại'); }
    setRagSearchRunning(false);
  };

  const runTestParser = async () => {
    if (!parserText.trim()) return;
    setParserRunning(true); setParserReport(null);
    try {
      const res = await api.post<ParserReport>('/math/test-parser', { text: parserText });
      setParserReport(res);
    } catch (e: any) { alert(e.message || 'Test parser thất bại'); }
    setParserRunning(false);
  };

  const runBatch = async (runAI: boolean) => {
    setRunning(true); setRunResult(null);
    try {
      const res = await api.post<BatchResult>('/math/benchmarks/run-batch', {
        name: `Benchmark ${new Date().toLocaleDateString('vi-VN')} ${runAI ? '(AI)' : '(Parser)'}`,
        useSeed: true,
        runAI,
      });
      setRunResult(res);
      const updated = await api.get<Benchmark[]>('/math/benchmarks');
      setBenchmarks(updated);
    } catch (e: any) {
      alert(e.message || 'Chạy benchmark thất bại');
    }
    setRunning(false);
  };

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />Analytics Pipeline — Toán
          </h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} lần import · {benchmarks.length} benchmark run</p>
        </div>
      </div>

      {/* ── 4 Chỉ số ketthuctoan.md ── */}
      {data && data.total > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            4 Chỉ số chất lượng pipeline
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <RateCard label="Parse thành công" value={data.parserSuccessRate} icon={CheckCircle2} color="text-emerald-600" />
            <RateCard label="JSON hợp lệ" value={data.jsonValidRate} icon={ShieldCheck} color="text-blue-600" />
            <RateCard label="Quality Gate pass" value={data.qualityGatePassRate} icon={Star} color="text-yellow-500" />
            <RateCard label="Hallucination" value={data.hallucinationRate} icon={AlertTriangle} color="text-orange-500" />
          </div>
        </div>
      )}

      {/* ── Summary stats ── */}
      {data && data.total > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tổng quan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Chất lượng TB</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.avgQualityScore.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Parser Score TB</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{(data.avgParserScore).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">độ tự tin</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Copy className="h-4 w-4 text-violet-500" />
                <span className="text-xs text-muted-foreground">Duplicate</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.duplicateRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">trên tổng bài</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Tổng import</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.total}</div>
              <div className="text-xs text-muted-foreground">lần</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Benchmark Runner ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Benchmark — Gold Dataset (30 bài chuẩn)
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Chạy pipeline trên bộ 30 bài Toán chuẩn (lớp 1–9) để đo 4 chỉ số.
            Mỗi lần sửa hệ thống → chạy lại → so sánh điểm tăng hay giảm.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => runBatch(false)}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Parser only (nhanh)
            </button>
            <button
              onClick={() => runBatch(true)}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlameKindling className="h-4 w-4" />}
              Full AI (đầy đủ 4 chỉ số, tốn API)
            </button>
          </div>

          {runResult && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Benchmark hoàn thành — {runResult.total} bài
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(runResult.metrics).map(([label, val]) => (
                    <div key={label} className="bg-white rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error table */}
              {runResult.errorTable && runResult.errorTable.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b flex items-center justify-between bg-gray-50">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />Bảng lỗi (xếp hạng)
                    </span>
                    {runResult.topError && (
                      <span className="text-[10px] text-red-600 font-medium">Top: {runResult.topError}</span>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-50">
                      {runResult.errorTable.map((row) => (
                        <tr key={row.errorType} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-gray-700">{row.label}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', SEVERITY_COLOR[row.severity])}>
                              {row.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold">{row.count}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={cn('font-bold', row.percentage >= 30 ? 'text-red-600' : row.percentage >= 15 ? 'text-yellow-600' : 'text-gray-500')}>
                              {row.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-2 w-20">
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div
                                className={cn('h-full rounded-full', row.percentage >= 30 ? 'bg-red-500' : row.percentage >= 15 ? 'bg-yellow-500' : 'bg-gray-400')}
                                style={{ width: `${Math.min(100, row.percentage)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {runResult.recommendation && (
                    <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                      <p className="text-xs text-amber-800 font-medium">{runResult.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Benchmark history ── */}
      {benchmarks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lịch sử benchmark
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Tên</th>
                    <th className="px-4 py-2.5 text-center font-medium">Files</th>
                    <th className="px-4 py-2.5 text-center font-medium">Parse ✓</th>
                    <th className="px-4 py-2.5 text-center font-medium">JSON ✓</th>
                    <th className="px-4 py-2.5 text-center font-medium">Quality ✓</th>
                    <th className="px-4 py-2.5 text-center font-medium">Avg Quality</th>
                    <th className="px-4 py-2.5 text-center font-medium">Avg Parser</th>
                    <th className="px-4 py-2.5 text-left font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {benchmarks.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">{b.name}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{b.totalFiles}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('font-medium', b.parseOk === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600')}>
                          {b.parseOk}/{b.totalFiles}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('font-medium', b.jsonValid === b.totalFiles ? 'text-emerald-600' : 'text-yellow-600')}>
                          {b.jsonValid}/{b.totalFiles}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('font-medium', b.qualityPass >= b.totalFiles * 0.8 ? 'text-emerald-600' : 'text-red-600')}>
                          {b.qualityPass}/{b.totalFiles}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {b.avgQuality > 0 ? <ScoreBadge score={b.avgQuality} /> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600">
                        {b.avgParser > 0 ? `${(b.avgParser * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Import log ── */}
      {data && data.total > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lịch sử import
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Thời gian</th>
                    <th className="px-4 py-2 text-left font-medium">Bộ sách</th>
                    <th className="px-4 py-2 text-center font-medium">Lớp</th>
                    <th className="px-4 py-2 text-center font-medium">Hợp lệ</th>
                    <th className="px-4 py-2 text-center font-medium">Bị loại (QG)</th>
                    <th className="px-4 py-2 text-center font-medium">Chất lượng</th>
                    <th className="px-4 py-2 text-center font-medium">
                      <AlertTriangle className="h-3 w-3 inline" /> H.
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      <Copy className="h-3 w-3 inline" /> D.
                    </th>
                    <th className="px-4 py-2 text-center font-medium">
                      <Wrench className="h-3 w-3 inline" /> R.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2">{log.textbook ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-2 text-center">{log.grade ?? '—'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn('font-medium', log.validLessons > 0 ? 'text-emerald-700' : 'text-red-500')}>
                          {log.validLessons}/{log.totalLessons}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(log.droppedByQualityGate > 0 ? 'text-orange-600 font-medium' : 'text-gray-400')}>
                          {log.droppedByQualityGate ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center"><ScoreBadge score={log.avgQualityScore} /></td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(log.hallucinationCount > 0 ? 'text-orange-600 font-medium' : 'text-gray-400')}>{log.hallucinationCount}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(log.duplicateCount > 0 ? 'text-violet-600 font-medium' : 'text-gray-400')}>{log.duplicateCount}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(log.repairCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-400')}>{log.repairCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(!data || data.total === 0) && benchmarks.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-muted-foreground">
          <FlaskConical className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="font-medium">Chưa có dữ liệu</p>
          <p className="text-sm mt-1">Import tài liệu hoặc chạy benchmark để xem số liệu.</p>
        </div>
      )}

      {/* ── RAG Index ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-violet-600" />RAG Index — Vector Search
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            {ragStats ? (
              <>
                <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium',
                  ragStats.available ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500')}>
                  <Database className="h-3.5 w-3.5" />
                  {ragStats.total.toLocaleString('vi-VN')} vectors · {ragStats.model}
                  {ragStats.available ? ' · Online' : ' · Offline'}
                </div>
                <button onClick={runRagEmbed} disabled={ragEmbedRunning || !ragStats.available}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
                  {ragEmbedRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                  {ragEmbedRunning ? 'Đang embed...' : 'Embed tất cả chủ đề'}
                </button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />Đang kiểm tra RAG index...
              </div>
            )}
          </div>

          {ragEmbedResult && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 text-violet-600" />
              Đã embed <strong>{ragEmbedResult.embedded}</strong> vectors từ <strong>{ragEmbedResult.topics}</strong> chủ đề
              {ragEmbedResult.failed > 0 && <span className="text-orange-600"> · {ragEmbedResult.failed} thất bại</span>}
            </div>
          )}

          {/* Semantic search test */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Thử tìm kiếm ngữ nghĩa</p>
            <div className="flex gap-2">
              <input
                value={ragSearchQuery}
                onChange={(e) => setRagSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runRagSearch()}
                placeholder="Ví dụ: phân số, phương trình bậc 2..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button onClick={runRagSearch} disabled={ragSearchRunning || !ragSearchQuery.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {ragSearchRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Tìm
              </button>
            </div>
          </div>

          {ragSearchResults && ragSearchResults.length === 0 && (
            <p className="text-sm text-muted-foreground">Không tìm thấy kết quả — thử embed index trước.</p>
          )}
          {ragSearchResults && ragSearchResults.length > 0 && (
            <div className="space-y-2">
              {ragSearchResults.map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">{r.conceptName}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', r.score >= 0.8 ? 'bg-emerald-100 text-emerald-700' : r.score >= 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600')}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-gray-500">{r.topicTitle} · Lớp {r.grade}</p>
                  <p className="text-gray-600 line-clamp-2">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Test Parser ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-blue-600" />Test Parser — Kiểm tra tài liệu trước khi import
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <textarea
            value={parserText}
            onChange={(e) => setParserText(e.target.value)}
            placeholder="Dán nội dung giáo trình Toán vào đây để kiểm tra parser (tối thiểu 80 ký tự)..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono"
          />
          <button onClick={runTestParser} disabled={parserRunning || parserText.trim().length < 80}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {parserRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {parserRunning ? 'Đang phân tích...' : 'Chạy parser'}
          </button>

          {parserReport && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                <p className="text-sm font-semibold text-blue-800">
                  {parserReport.totalChunks} bài học · Parser avg {parserReport.avgParserScore}%
                  {parserReport.curriculum.grade && ` · Lớp ${parserReport.curriculum.grade}`}
                  {parserReport.curriculum.textbook && ` · ${parserReport.curriculum.textbook}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parserReport.checks).map(([label, ok]) => (
                    <span key={label} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200')}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {parserReport.chunks.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Bài học</th>
                        <th className="px-3 py-2 text-center font-medium">Parser %</th>
                        <th className="px-3 py-2 text-center font-medium">Độ dài</th>
                        <th className="px-3 py-2 text-center font-medium">Nội dung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {parserReport.chunks.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">{c.title}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn('font-bold', c.parserScore >= 0.7 ? 'text-emerald-600' : c.parserScore >= 0.4 ? 'text-yellow-600' : 'text-red-500')}>
                              {(c.parserScore * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{c.textLength}</td>
                          <td className="px-3 py-2 text-center">
                            {c.isRich
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                              : <XCircle className="h-3.5 w-3.5 text-red-400 inline" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
