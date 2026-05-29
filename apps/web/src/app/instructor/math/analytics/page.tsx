'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BarChart2, AlertTriangle, Copy, Wrench, RefreshCw, Star, Loader2 } from 'lucide-react';
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
  avgQualityScore: number;
  textbook: string | null;
  grade: number | null;
  createdAt: string;
}

interface AnalyticsData {
  total: number;
  avgQualityScore: number;
  hallucinationRate: number;
  duplicateRate: number;
  logs: ImportLog[];
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', color)}>{score.toFixed(0)}/100</span>;
}

export default function MathAnalyticsPage() {
  const { ready } = useRequireAuth('INSTRUCTOR');
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.get<AnalyticsData>('/math/analytics').then(setData).finally(() => setLoading(false));
  }, [ready]);

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data || data.total === 0) return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900">
        <ChevronLeft className="h-4 w-4" />Quay lại
      </button>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-muted-foreground">
        Chưa có dữ liệu phân tích. Hãy import tài liệu để bắt đầu.
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />Analytics Pipeline — Toán
          </h1>
          <p className="text-sm text-muted-foreground">{data.total} lần import</p>
        </div>
      </div>

      {/* Summary cards */}
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
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Hallucination</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.hallucinationRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">trên tổng bài</div>
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

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Lịch sử import</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Thời gian</th>
                <th className="px-4 py-2 text-left font-medium">Bộ sách</th>
                <th className="px-4 py-2 text-center font-medium">Lớp</th>
                <th className="px-4 py-2 text-center font-medium">Bài hợp lệ</th>
                <th className="px-4 py-2 text-center font-medium">Chất lượng</th>
                <th className="px-4 py-2 text-center font-medium">
                  <AlertTriangle className="h-3 w-3 inline" /> Halluc.
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <Copy className="h-3 w-3 inline" /> Dup.
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <Wrench className="h-3 w-3 inline" /> Repair
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <RefreshCw className="h-3 w-3 inline" /> Retry
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
                    {log.validLessons}/{log.totalLessons}
                    {log.totalLessons > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ({Math.round(log.validLessons / log.totalLessons * 100)}%)
                      </span>
                    )}
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
                  <td className="px-4 py-2 text-center">
                    <span className={cn(log.retryTotal > 0 ? 'text-yellow-600 font-medium' : 'text-gray-400')}>{log.retryTotal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
