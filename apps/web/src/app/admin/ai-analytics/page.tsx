'use client';

import { useEffect, useState } from 'react';
import {
  BarChart2, Users, MessageSquare, Gamepad2, ClipboardList, Mic,
  Zap, Network, RefreshCw, Loader2, TrendingUp, Server, Bot,
  CheckCircle2, XCircle, AlertTriangle, Database, HardDrive, Cpu,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdminStats {
  users: { total: number; active: number };
  activity: { chatCount: number; quizCount: number; homeworkCount: number; voiceSessions: number };
  providers: {
    today: {
      groq: ProviderStat | null;
      gemini: ProviderStat | null;
      ollama: ProviderStat | null;
    };
    tokenUsage30d: number;
  };
  agents: {
    today: Record<string, AgentStat | null>;
  };
  generatedAt: string;
}

interface ProviderStat {
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  avgLatencyMs: number;
}

interface AgentStat {
  callCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
}

interface ProviderDetail {
  providers: Record<string, ProviderStat[]>;
  today: Record<string, ProviderStat | null>;
  totalTokens: number;
}

interface AgentDetail {
  agents: Record<string, AgentStat[]>;
  today: Record<string, AgentStat | null>;
}

type HealthStatus = 'ok' | 'degraded' | 'down' | 'unknown';

interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  detail?: string;
}

interface SystemHealth {
  status: HealthStatus;
  components: ComponentHealth[];
  uptimeSeconds: number;
  checkedAt: string;
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function pct(success: number, total: number) {
  if (!total) return '—';
  return `${Math.round(success / total * 100)}%`;
}

const PROVIDER_COLOR: Record<string, string> = {
  groq: 'bg-blue-100 text-blue-700',
  gemini: 'bg-purple-100 text-purple-700',
  ollama: 'bg-emerald-100 text-emerald-700',
};

const AGENT_COLOR: Record<string, string> = {
  tutor:           'bg-indigo-100 text-indigo-700',
  math:            'bg-blue-100 text-blue-700',
  quiz:            'bg-amber-100 text-amber-700',
  homework:        'bg-rose-100 text-rose-700',
  knowledge_graph: 'bg-violet-100 text-violet-700',
  reflection:      'bg-slate-100 text-slate-700',
  self_correction: 'bg-orange-100 text-orange-700',
  critic:          'bg-red-100 text-red-700',
  planner:         'bg-teal-100 text-teal-700',
  motivation:      'bg-yellow-100 text-yellow-700',
  career:          'bg-green-100 text-green-700',
  language:        'bg-cyan-100 text-cyan-700',
  learning_coach:  'bg-pink-100 text-pink-700',
};

const STATUS_ICON: Record<HealthStatus, React.ElementType> = {
  ok: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
  unknown: AlertTriangle,
};

const STATUS_COLOR: Record<HealthStatus, string> = {
  ok: 'text-emerald-600',
  degraded: 'text-yellow-600',
  down: 'text-red-600',
  unknown: 'text-gray-400',
};

const COMPONENT_ICON: Record<string, React.ElementType> = {
  API: Cpu,
  Redis: Database,
  MinIO: HardDrive,
  Qdrant: Database,
};

export default function AdminAiAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [provDetail, setProvDetail] = useState<ProviderDetail | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [sysHealth, setSysHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, a, h] = await Promise.all([
        api.get<AdminStats>('/ai/admin/stats').catch(() => null),
        api.get<ProviderDetail>('/ai/admin/provider-stats?days=7').catch(() => null),
        api.get<AgentDetail>('/ai/admin/agent-stats?days=7').catch(() => null),
        api.get<SystemHealth>('/ai/admin/system-health').catch(() => null),
      ]);
      setStats(s);
      setProvDetail(p);
      setAgentDetail(a);
      setSysHealth(h);
      if (!s) setError('Bạn không có quyền xem thống kê này');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải thống kê AI...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error ?? 'Không thể tải dữ liệu'}
      </div>
    );
  }

  const todayProv = stats.providers.today;
  const todayAgent = stats.agents.today;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            AI Analytics — Teacher Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cập nhật lúc {new Date(stats.generatedAt).toLocaleTimeString('vi-VN')}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />Làm mới
        </button>
      </div>

      {/* Student Overview */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Học sinh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Tổng học sinh" value={stats.users.total} icon={Users} color="bg-blue-100 text-blue-600" />
          <StatCard label="Đang hoạt động" value={stats.users.active} icon={TrendingUp} color="bg-green-100 text-green-600" sub="có dữ liệu AI" />
          <StatCard label="Phiên chat" value={stats.activity.chatCount} icon={MessageSquare} color="bg-violet-100 text-violet-600" />
          <StatCard label="Giọng nói" value={stats.activity.voiceSessions} icon={Mic} color="bg-cyan-100 text-cyan-600" />
        </div>
      </section>

      {/* Learning Activity */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hoạt động học tập</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Bài quiz đã làm" value={stats.activity.quizCount} icon={Gamepad2} color="bg-amber-100 text-amber-600" />
          <StatCard label="Bài tập đã nộp" value={stats.activity.homeworkCount} icon={ClipboardList} color="bg-rose-100 text-rose-600" />
        </div>
      </section>

      {/* Provider Stats */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Server className="h-4 w-4" />Provider AI hôm nay
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Provider</th>
                <th className="text-right px-4 py-3 font-medium">Requests</th>
                <th className="text-right px-4 py-3 font-medium">Thành công</th>
                <th className="text-right px-4 py-3 font-medium">Tokens</th>
                <th className="text-right px-5 py-3 font-medium">Latency TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(['groq', 'gemini', 'ollama'] as const).map(p => {
                const s = (provDetail?.today[p] ?? todayProv[p]) as ProviderStat | null;
                return (
                  <tr key={p} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', PROVIDER_COLOR[p])}>
                        {p.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3.5 font-mono text-sm">{s?.requestCount ?? 0}</td>
                    <td className="text-right px-4 py-3.5">
                      <span className={cn('text-xs font-medium', (s?.successCount ?? 0) > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                        {pct(s?.successCount ?? 0, s?.requestCount ?? 0)}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3.5 font-mono text-sm">{(s?.totalTokens ?? 0).toLocaleString()}</td>
                    <td className="text-right px-5 py-3.5 text-sm">{s?.avgLatencyMs ? `${s.avgLatencyMs}ms` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Token tổng 30 ngày:</span>
            <span className="font-semibold text-foreground">{(stats.providers.tokenUsage30d).toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Agent Stats */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" />Multi-Agent hôm nay
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Agent</th>
                <th className="text-right px-4 py-3 font-medium">Lần gọi</th>
                <th className="text-right px-4 py-3 font-medium">Thành công</th>
                <th className="text-right px-5 py-3 font-medium">Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(['tutor', 'math', 'quiz', 'homework', 'knowledge_graph'] as const).map(agent => {
                const s = (agentDetail?.today[agent] ?? todayAgent[agent]) as AgentStat | null;
                return (
                  <tr key={agent} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', AGENT_COLOR[agent])}>
                        {agent.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3.5 font-mono">{s?.callCount ?? 0}</td>
                    <td className="text-right px-4 py-3.5">
                      <span className={cn('text-xs font-medium', (s?.successCount ?? 0) > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                        {pct(s?.successCount ?? 0, s?.callCount ?? 0)}
                      </span>
                    </td>
                    <td className="text-right px-5 py-3.5">
                      <span className={cn('text-xs font-medium', (s?.errorCount ?? 0) > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                        {s?.errorCount ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* System Monitor — Module 6 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Server className="h-4 w-4" />System Monitor
        </h2>
        {sysHealth ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = STATUS_ICON[sysHealth.status];
                  return <Icon className={cn('h-5 w-5', STATUS_COLOR[sysHealth.status])} />;
                })()}
                <span className="font-semibold capitalize">{sysHealth.status === 'ok' ? 'Tất cả hoạt động bình thường' : `Hệ thống: ${sysHealth.status}`}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                uptime {Math.floor(sysHealth.uptimeSeconds / 3600)}h {Math.floor((sysHealth.uptimeSeconds % 3600) / 60)}m
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sysHealth.components.map(c => {
                const Icon = COMPONENT_ICON[c.name] ?? Database;
                const StatusIcon = STATUS_ICON[c.status];
                return (
                  <div key={c.name} className="rounded-xl border border-gray-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                      <StatusIcon className={cn('h-4 w-4', STATUS_COLOR[c.status])} />
                    </div>
                    <p className={cn('text-xs font-semibold capitalize', STATUS_COLOR[c.status])}>{c.status}</p>
                    {c.latencyMs !== null && (
                      <p className="text-[10px] text-muted-foreground">{c.latencyMs}ms</p>
                    )}
                    {c.detail && (
                      <p className="text-[10px] text-muted-foreground truncate" title={c.detail}>{c.detail}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-sm text-muted-foreground text-center">
            Không thể tải system health
          </div>
        )}
      </section>

      {/* KG visualization link */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-semibold text-indigo-700">Knowledge Graph Visualization</p>
            <p className="text-xs text-indigo-500">Xem biểu đồ kiến thức của từng học sinh</p>
          </div>
        </div>
        <Zap className="h-4 w-4 text-indigo-400" />
      </div>
    </div>
  );
}
