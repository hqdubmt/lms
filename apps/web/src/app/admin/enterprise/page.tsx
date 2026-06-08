'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Users, BookOpen, DollarSign, TrendingUp, TrendingDown,
  GraduationCap, BarChart3, Loader2, RefreshCw, School,
  CheckCircle2, Award, Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface KpiData {
  users:       { total: number; thisMonth: number; growth: string };
  courses:     { total: number; published: number };
  enrollments: { total: number; thisMonth: number; growth: string; completionRate: string };
  revenue:     { total: number; thisMonth: number; growth: string; currency: string };
  classes:     { total: number; active: number };
}

interface RevenueData {
  monthlyTrend: { month: string; revenue: number; transactions: number }[];
  byMethod: { method: string; revenue: number; count: number }[];
}

interface CourseAnalytics {
  byLevel: { level: string; count: number }[];
  topCourses: { id: string; title: string; totalStudents: number; avgRating: number; instructor: { name: string } }[];
}

const LEVEL_LABELS: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao' };
const LEVEL_COLORS: Record<string, string> = { BEGINNER: 'bg-green-100 text-green-700', INTERMEDIATE: 'bg-blue-100 text-blue-700', ADVANCED: 'bg-purple-100 text-purple-700' };

function GrowthBadge({ value }: { value: string }) {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
      num >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
      {num >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(num)}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, badge }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="p-2 bg-primary/10 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>
        {badge}
      </div>
      <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function EnterpriseDashboardPage() {
  const [kpi, setKpi]             = useState<KpiData | null>(null);
  const [revenue, setRevenue]     = useState<RevenueData | null>(null);
  const [courseAn, setCourseAn]   = useState<CourseAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [k, r, c] = await Promise.all([
        api.get<KpiData>('/admin/enterprise/kpi'),
        api.get<RevenueData>('/admin/enterprise/revenue'),
        api.get<CourseAnalytics>('/admin/enterprise/courses/analytics'),
      ]);
      setKpi(k);
      setRevenue(r);
      setCourseAn(c);
    } catch (e: any) {
      setError(e?.message ?? 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-red-500">{error}</p>
      <button onClick={loadAll} className="flex items-center gap-2 text-sm text-primary hover:underline">
        <RefreshCw className="h-4 w-4" />Thử lại
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Building2 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Enterprise Dashboard</h1>
            <p className="text-sm text-gray-500">KPI · Analytics · Reports</p>
          </div>
        </div>
        <button onClick={loadAll}
          className="flex items-center gap-2 text-sm bg-white border rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" />Làm mới
        </button>
      </div>

      {/* KPI Grid */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={Users} label="Tổng người dùng"
            value={kpi.users.total}
            sub={`+${kpi.users.thisMonth} tháng này`}
            badge={<GrowthBadge value={kpi.users.growth} />} />
          <KpiCard icon={BookOpen} label="Khóa học"
            value={kpi.courses.total}
            sub={`${kpi.courses.published} đã xuất bản`} />
          <KpiCard icon={GraduationCap} label="Lượt đăng ký"
            value={kpi.enrollments.total}
            sub={`+${kpi.enrollments.thisMonth} tháng này`}
            badge={<GrowthBadge value={kpi.enrollments.growth} />} />
          <KpiCard icon={DollarSign} label="Doanh thu tháng"
            value={`${(kpi.revenue.thisMonth / 1_000_000).toFixed(1)}M₫`}
            sub={`Tổng: ${(kpi.revenue.total / 1_000_000).toFixed(0)}M₫`}
            badge={<GrowthBadge value={kpi.revenue.growth} />} />
          <KpiCard icon={School} label="Lớp học"
            value={kpi.classes.total}
            sub={`${kpi.classes.active} đang hoạt động`} />
        </div>
      )}

      {/* Completion Rate Banner */}
      {kpi && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{kpi.enrollments.completionRate}%</p>
              <p className="text-sm text-green-600">Tỉ lệ hoàn thành khóa học</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">Mục tiêu: 70%</span>
            </div>
          </div>
          <div className="mt-3 bg-white/60 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(kpi.enrollments.completionRate), 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        {revenue && revenue.monthlyTrend.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Doanh thu theo tháng</h2>
            </div>
            <div className="space-y-2">
              {revenue.monthlyTrend.slice(-6).map(r => {
                const max = Math.max(...revenue.monthlyTrend.slice(-6).map(x => x.revenue));
                const pct = max > 0 ? (r.revenue / max) * 100 : 0;
                return (
                  <div key={r.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 shrink-0">{r.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-20 text-right">
                      {(r.revenue / 1_000_000).toFixed(1)}M₫
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Courses */}
        {courseAn && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold">Top khóa học phổ biến</h2>
            </div>
            <div className="space-y-3">
              {courseAn.topCourses.slice(0, 8).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-500',
                  )}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.instructor.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-primary">{c.totalStudents.toLocaleString()} HS</p>
                    <p className="text-xs text-yellow-600">★ {c.avgRating.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course Distribution + Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courseAn && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-4">Phân bổ cấp độ khóa học</h2>
            <div className="space-y-3">
              {courseAn.byLevel.map(l => (
                <div key={l.level} className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded w-24 text-center', LEVEL_COLORS[l.level] ?? 'bg-gray-100 text-gray-600')}>
                    {LEVEL_LABELS[l.level] ?? l.level}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full"
                      style={{ width: `${courseAn.byLevel.length > 0 ? (l.count / Math.max(...courseAn.byLevel.map(x => x.count))) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{l.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {revenue && revenue.byMethod.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-4">Phương thức thanh toán</h2>
            <div className="space-y-3">
              {revenue.byMethod.map(m => (
                <div key={m.method} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{m.method}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{(m.revenue / 1_000_000).toFixed(1)}M₫</p>
                    <p className="text-xs text-gray-500">{m.count} giao dịch</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
