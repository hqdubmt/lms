'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, BarChart2, AlertTriangle, Copy, Wrench, RefreshCw,
  Star, Loader2, CheckCircle2, ShieldCheck, FlaskConical,
  Play, FlameKindling, XCircle, TrendingUp, BookOpen,
  TerminalSquare, Zap, Award, ListChecks,
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
  avgQuality: number;
  avgParser: number;
  notes: string | null;
  createdAt: string;
}

interface ErrorTableRow {
  errorType: string;
  label: string;
  count: number;
  percentage: number;
  severity: 'high' | 'medium' | 'low';
}

interface BatchResult {
  benchmarkId: string;
  name: string;
  total: number;
  metrics: Record<string, string>;
  avgParser: number;
  avgQuality: number | null;
  avgKnowledgeQuality: number | null;
  errorTable: ErrorTableRow[];
  topError: string | null;
  recommendation: string | null;
}

interface ParserChunk { title: string; textLength: number; parserScore: number; isRich: boolean; vocabTokens: string[]; lessonSignals: string[] }
interface ParserReport { curriculum: any; totalChunks: number; richChunks: number; avgParserScore: number; chunks: ParserChunk[]; checks: Record<string, boolean> }
interface QualityItem { name: string; score: number; flags: string[] }
interface QualityReport { avgScore: number; totalItems: number; passCount: number; failCount: number; items: QualityItem[]; rubric: Record<string, string> }
interface GoldQualityReport { totalLessons: number; overallAvgScore: number; allPass: boolean; lessons: Array<{ label: string; grade: number; itemCount: number; avgScore: number }> }

interface CombinedStats {
  summary: {
    label: string;
    totalFilesProcessed: number;
    'Parser Success %': number;
    'JSON Valid %': number;
    'Quality Score %': number;
  };
  math: { total: number; parserSuccessPct: number; jsonValidPct: number; qualityPassPct: number; avgQuality: number; runs: number };
  viet: { total: number; parserSuccessPct: number; jsonValidPct: number; qualityPassPct: number; avgQuality: number; runs: number };
  readiness: { stable: boolean; message: string; targets: Record<string, string> };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700'
    : score >= 60 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', color)}>{score.toFixed(0)}/100</span>;
}

function RateCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
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

const SEVERITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function VietAnalyticsPage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [combined, setCombined] = useState<CombinedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<BatchResult | null>(null);

  // ── Test Parser ──
  const [parserText, setParserText] = useState('');
  const [parserRunning, setParserRunning] = useState(false);
  const [parserReport, setParserReport] = useState<ParserReport | null>(null);

  // ── Quality Check ──
  const [qualityText, setQualityText] = useState('');
  const [qualityRunning, setQualityRunning] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [goldRunning, setGoldRunning] = useState(false);
  const [goldReport, setGoldReport] = useState<GoldQualityReport | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      api.get<AnalyticsData>('/viet/analytics').catch(() => null),
      api.get<Benchmark[]>('/viet/benchmarks').catch(() => []),
      api.get<CombinedStats>('/viet/combined-stats').catch(() => null),
    ]).then(([a, b, c]) => {
      setData(a);
      setBenchmarks(b ?? []);
      setCombined(c);
    }).finally(() => setLoading(false));
  }, [ready]);

  const runBatch = async (runAI: boolean) => {
    setRunning(true); setRunResult(null);
    try {
      const res = await api.post<BatchResult>('/viet/benchmarks/run-batch', {
        name: `Benchmark Viet ${new Date().toLocaleDateString('vi-VN')} ${runAI ? '(AI)' : '(Parser)'}`,
        useSeed: true,
        runAI,
      });
      setRunResult(res);
      const updated = await api.get<Benchmark[]>('/viet/benchmarks');
      setBenchmarks(updated);
      const updatedCombined = await api.get<CombinedStats>('/viet/combined-stats').catch(() => null);
      if (updatedCombined) setCombined(updatedCombined);
    } catch (e: any) {
      alert(e.message || 'Chạy benchmark thất bại');
    }
    setRunning(false);
  };

  const runTestParser = async () => {
    if (!parserText.trim()) return;
    setParserRunning(true); setParserReport(null);
    try {
      const res = await api.post<ParserReport>('/viet/test-parser', { text: parserText });
      setParserReport(res);
    } catch (e: any) { alert(e.message || 'Test parser thất bại'); }
    setParserRunning(false);
  };

  const runQualityCheck = async () => {
    if (!qualityText.trim()) return;
    setQualityRunning(true); setQualityReport(null);
    try {
      let items: any[];
      try { items = JSON.parse(qualityText); }
      catch { alert('JSON không hợp lệ — nhập array JSON gồm { name, definition, example, hints }'); setQualityRunning(false); return; }
      const res = await api.post<QualityReport>('/viet/quality-check', { items });
      setQualityReport(res);
    } catch (e: any) { alert(e.message || 'Quality check thất bại'); }
    setQualityRunning(false);
  };

  const runGoldQuality = async () => {
    setGoldRunning(true); setGoldReport(null);
    try {
      const res = await api.post<GoldQualityReport>('/viet/quality-check/gold', {});
      setGoldReport(res);
    } catch (e: any) { alert(e.message || 'Gold quality check thất bại'); }
    setGoldRunning(false);
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
            <BarChart2 className="h-5 w-5 text-red-600" />Analytics Pipeline — Tiếng Việt
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} lần import · {benchmarks.length} benchmark run
          </p>
        </div>
      </div>

      {/* ── Combined Stats (Toán + Tiếng Việt) ── */}
      {combined && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />Tổng hợp hệ thống — Toán + Tiếng Việt
          </h2>
          <div className={cn(
            'rounded-2xl border p-4 space-y-3',
            combined.readiness.stable
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-orange-50 border-orange-200',
          )}>
            <p className={cn(
              'text-sm font-semibold flex items-center gap-2',
              combined.readiness.stable ? 'text-emerald-800' : 'text-orange-800',
            )}>
              {combined.readiness.stable
                ? <CheckCircle2 className="h-4 w-4" />
                : <AlertTriangle className="h-4 w-4" />}
              {combined.readiness.message}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'Parser Success %', label: 'Parser' },
                { key: 'JSON Valid %', label: 'JSON' },
                { key: 'Quality Score %', label: 'Quality' },
              ].map(({ key, label }) => {
                const val = combined.summary[key as keyof typeof combined.summary] as number ?? 0;
                return (
                  <div key={key} className="bg-white rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={cn('text-xl font-bold', val >= 85 ? 'text-emerald-700' : val >= 70 ? 'text-yellow-600' : 'text-red-600')}>
                      {val}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">mục tiêu {combined.readiness.targets[`${label.toLowerCase()}Success`] ?? '≥85%'}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Toán: {combined.math.total} file · {combined.math.runs} runs</span>
              <span>·</span>
              <span>Tiếng Việt: {combined.viet.total} file · {combined.viet.runs} runs</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 Chỉ số pipeline ── */}
      {data && data.total > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            4 Chỉ số chất lượng pipeline — Tiếng Việt
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
            {[
              { label: 'Chất lượng TB', value: `${data.avgQualityScore.toFixed(1)}/100`, sub: 'điểm', icon: Star, color: 'text-yellow-500' },
              { label: 'Parser Score TB', value: `${data.avgParserScore.toFixed(1)}%`, sub: 'độ tự tin', icon: BarChart2, color: 'text-red-500' },
              { label: 'Duplicate', value: `${data.duplicateRate.toFixed(1)}%`, sub: 'trên tổng bài', icon: Copy, color: 'text-violet-500' },
              { label: 'Tổng import', value: data.total, sub: 'lần', icon: RefreshCw, color: 'text-blue-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <s.icon className={cn('h-4 w-4', s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Benchmark Runner ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Benchmark — Gold Dataset (20 bài Tiếng Việt chuẩn)
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Chạy pipeline trên 20 bài Tiếng Việt chuẩn (lớp 1–5) để đo chỉ số. Mỗi lần sửa hệ thống → chạy lại → so sánh tăng giảm.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => runBatch(false)}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Parser only (nhanh)
            </button>
            <button
              onClick={() => runBatch(true)}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlameKindling className="h-4 w-4" />}
              Full AI (đầy đủ, tốn API)
            </button>
          </div>

          {runResult && (
            <div className="space-y-3">
              {/* Metrics */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Benchmark hoàn thành — {runResult.total} bài
                  {runResult.avgKnowledgeQuality != null && (
                    <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-lg">
                      Knowledge Quality: {runResult.avgKnowledgeQuality}/100
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(runResult.metrics).map(([label, val]) => (
                    <div key={label} className="bg-white rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Table — testtoatiengviet.md Bước 3 */}
              {runResult.errorTable && runResult.errorTable.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Bảng lỗi (xếp hạng theo tần suất)
                    </h3>
                    {runResult.topError && (
                      <span className="text-xs text-red-600 font-medium">
                        Top lỗi: {runResult.topError}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Loại lỗi</th>
                        <th className="px-4 py-2 text-center font-medium">Mức</th>
                        <th className="px-4 py-2 text-center font-medium">Số lần</th>
                        <th className="px-4 py-2 text-center font-medium">Tỉ lệ</th>
                        <th className="px-4 py-2 text-left font-medium">Thanh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {runResult.errorTable.map((row) => (
                        <tr key={row.errorType} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 font-medium text-gray-800">{row.label}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', SEVERITY_COLOR[row.severity])}>
                              {row.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-gray-900">{row.count}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={cn('font-bold', row.percentage >= 30 ? 'text-red-600' : row.percentage >= 15 ? 'text-yellow-600' : 'text-gray-600')}>
                              {row.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="h-1.5 bg-gray-100 rounded-full w-24">
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
                    <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
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
                    <th className="px-4 py-2 text-center font-medium"><AlertTriangle className="h-3 w-3 inline" /></th>
                    <th className="px-4 py-2 text-center font-medium"><Copy className="h-3 w-3 inline" /></th>
                    <th className="px-4 py-2 text-center font-medium"><Wrench className="h-3 w-3 inline" /></th>
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

      {/* ── Test Parser ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-red-600" />Test Parser — Kiểm tra tài liệu Tiếng Việt
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <textarea
            value={parserText}
            onChange={(e) => setParserText(e.target.value)}
            placeholder="Dán nội dung bài học Tiếng Việt vào đây để kiểm tra parser (tối thiểu 30 ký tự)..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none font-mono"
          />
          <button onClick={runTestParser} disabled={parserRunning || parserText.trim().length < 30}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
            {parserRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {parserRunning ? 'Đang phân tích...' : 'Chạy parser'}
          </button>

          {parserReport && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-sm font-semibold text-red-800">
                  {parserReport.totalChunks} bài · {parserReport.richChunks} giàu nội dung · Parser avg {(parserReport.avgParserScore * 100).toFixed(0)}%
                  {parserReport.curriculum?.grade && ` · Lớp ${parserReport.curriculum.grade}`}
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
                        <th className="px-3 py-2 text-left font-medium">Bài</th>
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

      {/* ── Quality Check (Tiếng Việt đặc thù) ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-orange-600" />Quality Check — Rubric chấm điểm knowledge items
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />Rubric chấm điểm (tổng 100 điểm/mục)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              {[['JSON hợp lệ', '+10'], ['definition ≥ 30 ký tự', '+40'], ['example có dữ liệu', '+30'], ['hints ≥ 2 mục', '+20']].map(([k, v]) => (
                <span key={k}>{v} {k}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-muted-foreground mb-1.5">Nhập JSON array để kiểm tra thủ công:</p>
              <textarea
                value={qualityText}
                onChange={(e) => setQualityText(e.target.value)}
                placeholder='[{"name":"từ vựng","definition":"định nghĩa...","example":"ví dụ...","hints":["gợi ý 1","gợi ý 2"]}]'
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={runQualityCheck} disabled={qualityRunning || !qualityText.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-60 transition-colors">
              {qualityRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
              {qualityRunning ? 'Đang chấm...' : 'Chấm JSON'}
            </button>
            <button onClick={runGoldQuality} disabled={goldRunning}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-60 transition-colors">
              {goldRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
              {goldRunning ? 'Đang chấm...' : 'Chấm Gold Dataset'}
            </button>
          </div>

          {qualityReport && (
            <div className="space-y-2">
              <div className={cn('rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2',
                qualityReport.avgScore >= 80 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : qualityReport.avgScore >= 60 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-red-50 border border-red-200 text-red-800')}>
                <Award className="h-4 w-4" />
                Trung bình: {qualityReport.avgScore.toFixed(0)}/100 · {qualityReport.passCount}/{qualityReport.totalItems} mục đạt (≥80)
              </div>
              {qualityReport.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Mục</th>
                        <th className="px-3 py-2 text-center font-medium">Điểm</th>
                        <th className="px-3 py-2 text-left font-medium">Vấn đề</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {qualityReport.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[140px] truncate">{item.name || `Mục ${i + 1}`}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn('font-bold', item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-yellow-600' : 'text-red-500')}>
                              {item.score}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.flags?.length > 0 ? item.flags.join(' · ') : <span className="text-emerald-600">✓ Đầy đủ</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {goldReport && (
            <div className="space-y-2">
              <div className={cn('rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2',
                goldReport.allPass ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800')}>
                {goldReport.allPass ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                Gold Dataset: {goldReport.overallAvgScore}/100 TB · {goldReport.totalLessons} bài
                {goldReport.allPass ? ' · Tất cả đạt ≥80' : ` · Một số bài dưới 80`}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Bài</th>
                      <th className="px-3 py-2 text-center font-medium">Lớp</th>
                      <th className="px-3 py-2 text-center font-medium">Mục</th>
                      <th className="px-3 py-2 text-center font-medium">Điểm TB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {goldReport.lessons.map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{l.label}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{l.grade}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{l.itemCount}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn('font-bold', l.avgScore >= 80 ? 'text-emerald-600' : l.avgScore >= 60 ? 'text-yellow-600' : 'text-red-500')}>
                            {l.avgScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
