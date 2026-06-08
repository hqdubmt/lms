'use client';

import { useEffect, useState } from 'react';
import {
  BarChart2, BookOpen, Target, Clock, TrendingDown,
  RefreshCw, Loader2, Brain, Flame, CheckCircle2,
  MessageSquare, ClipboardCheck, FileText, Mic, Zap, Star, Server, Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectStat {
  subject: string;
  avgMastery: number;
  topicCount: number;
  quizCount: number;
  studyMinutes: number;
}

interface MasteryEntry {
  topic: string;
  score: number;
}

interface AnalyticsSummary {
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  quizAccuracy: number;
  currentStreak: number;
  weakTopics: string[];
  strongTopics: string[];
  avgMastery: number;
}

interface DashboardData {
  activity: {
    chatCount: number;
    quizCount: number;
    homeworkCount: number;
    voiceCount: number;
    studyMinutes: number;
  };
  xp: {
    totalXP: number;
    level: number;
    rank: string;
    rankColor: string;
    xpProgress: number;
    xpToNextLevel: number;
    history: Array<{ date: string; xp: number }>;
  };
  providers: Array<{ name: string; totalRequests: number; totalSuccess: number }>;
  agents: Array<{ name: string; totalCalls: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_LABEL: Record<string, string> = {
  general: 'Tổng hợp',
  math: 'Toán học',
  viet: 'Tiếng Việt',
  language: 'Tiếng Anh',
};

const SUBJECT_COLOR: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  math: 'bg-blue-100 text-blue-700',
  viet: 'bg-green-100 text-green-700',
  language: 'bg-purple-100 text-purple-700',
};

const PROVIDER_COLOR: Record<string, string> = {
  groq: 'bg-orange-500',
  gemini: 'bg-blue-500',
  ollama: 'bg-gray-500',
};

const AGENT_LABEL: Record<string, string> = {
  tutor: 'Gia sư',
  math: 'Toán',
  quiz: 'Quiz',
  homework: 'Bài tập',
  knowledge_graph: 'Đồ thị KT',
};

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function MasteryBar({ topic, score }: { topic: string; score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm w-40 truncate shrink-0">{topic}</p>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-sm font-semibold w-10 text-right">{score}%</p>
    </div>
  );
}

function UsageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm w-28 truncate shrink-0 capitalize">{label}</p>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm font-semibold w-8 text-right text-gray-600">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentAnalyticsPage() {
  useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectStat[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [mastery, setMastery] = useState<MasteryEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('general');
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const load = async (subject = selectedSubject, d = days) => {
    setLoading(true);
    try {
      const [subjectData, summaryData, masteryData, dashData] = await Promise.all([
        api.get<{ subjects: SubjectStat[] }>('/ai/analytics/subject'),
        api.get<AnalyticsSummary>(`/ai/analytics/summary?subject=${subject}&days=${d}`),
        api.get<{ topicMastery: MasteryEntry[] }>(`/ai/analytics/mastery?subject=${subject}`),
        api.get<DashboardData>('/ai/analytics/dashboard'),
      ]);
      setSubjects(subjectData.subjects ?? []);
      setSummary(summaryData);
      setMastery(masteryData.topicMastery ?? []);
      setDashboard(dashData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubject = (s: string) => {
    setSelectedSubject(s);
    load(s, days);
  };

  const handleDays = (d: 7 | 30 | 90) => {
    setDays(d);
    load(selectedSubject, d);
  };

  const maxProviderReq = Math.max(1, ...(dashboard?.providers.map(p => p.totalRequests) ?? [1]));
  const maxAgentCalls = Math.max(1, ...(dashboard?.agents.map(a => a.totalCalls) ?? [1]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-600" /> Phân tích học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Theo dõi tiến độ, điểm số và chủ đề của bạn</p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Row 1: Primary stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Phút học tổng"
              value={summary?.totalStudyMinutes ?? 0}
              icon={Clock}
              color="bg-blue-100 text-blue-600"
              sub="toàn bộ thời gian"
            />
            <StatCard
              label="Độ chính xác Quiz"
              value={`${Math.round(summary?.quizAccuracy ?? 0)}%`}
              icon={Target}
              color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              label="Mastery trung bình"
              value={`${Math.round(summary?.avgMastery ?? 0)}%`}
              icon={Brain}
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              label="Chuỗi ngày học"
              value={`${summary?.currentStreak ?? 0} ngày`}
              icon={Flame}
              color="bg-orange-100 text-orange-600"
            />
          </div>

          {/* ── Row 2: Activity counts (Phase 6) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Lượt chat AI"
              value={dashboard?.activity.chatCount ?? 0}
              icon={MessageSquare}
              color="bg-cyan-100 text-cyan-600"
            />
            <StatCard
              label="Bài quiz"
              value={dashboard?.activity.quizCount ?? 0}
              icon={ClipboardCheck}
              color="bg-indigo-100 text-indigo-600"
            />
            <StatCard
              label="Bài homework"
              value={dashboard?.activity.homeworkCount ?? 0}
              icon={FileText}
              color="bg-rose-100 text-rose-600"
            />
            <StatCard
              label="Luyện giọng nói"
              value={dashboard?.activity.voiceCount ?? 0}
              icon={Mic}
              color="bg-teal-100 text-teal-600"
            />
          </div>

          {/* ── Row 3: XP Growth + Provider/Agent usage (Phase 6) ── */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* XP Growth */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> XP &amp; Cấp độ
              </h2>
              {dashboard?.xp ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shrink-0">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{dashboard.xp.totalXP.toLocaleString()} XP</p>
                      <p className="text-xs text-muted-foreground">Level {dashboard.xp.level} · {dashboard.xp.rank}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Tiến độ level</span>
                      <span>{Math.round(dashboard.xp.xpProgress * 100)}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
                        style={{ width: `${Math.round(dashboard.xp.xpProgress * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Cần thêm {dashboard.xp.xpToNextLevel} XP để lên cấp
                    </p>
                  </div>
                  {dashboard.xp.history.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">XP gần đây</p>
                      <div className="flex items-end gap-1 h-10">
                        {dashboard.xp.history.map((h, i) => {
                          const maxXP = Math.max(1, ...dashboard.xp.history.map(x => x.xp));
                          const pct = Math.max(4, Math.round((h.xp / maxXP) * 100));
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-yellow-400 to-orange-300 rounded-sm"
                              style={{ height: `${pct}%` }}
                              title={`${h.date}: +${h.xp} XP`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>
              )}
            </div>

            {/* Provider Usage */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-gray-500" /> Provider AI (7 ngày)
              </h2>
              {dashboard?.providers && dashboard.providers.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.providers.map(p => (
                    <UsageBar
                      key={p.name}
                      label={p.name}
                      value={p.totalRequests}
                      max={maxProviderReq}
                      color={PROVIDER_COLOR[p.name] ?? 'bg-gray-400'}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>
              )}
            </div>

            {/* Agent Usage */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Agent AI (7 ngày)
              </h2>
              {dashboard?.agents && dashboard.agents.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.agents.map(a => (
                    <UsageBar
                      key={a.name}
                      label={AGENT_LABEL[a.name] ?? a.name}
                      value={a.totalCalls}
                      max={maxAgentCalls}
                      color="bg-primary"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Subject selector */}
          <div className="flex flex-wrap gap-2 items-center">
            {['general', 'math', 'viet', 'language'].map(s => (
              <button
                key={s}
                onClick={() => handleSubject(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  selectedSubject === s ? SUBJECT_COLOR[s] + ' border-current' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {SUBJECT_LABEL[s]}
              </button>
            ))}
            <div className="ml-auto flex gap-1">
              {([7, 30, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => handleDays(d)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium',
                    days === d ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {d === 7 ? '7 ngày' : d === 30 ? '30 ngày' : '90 ngày'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Mastery by topic */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" /> Mastery theo chủ đề
              </h2>
              {mastery.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {mastery.slice(0, 8).map(m => (
                    <MasteryBar key={m.topic} topic={m.topic} score={m.score} />
                  ))}
                </div>
              )}
            </div>

            {/* Subject breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" /> Tổng quan môn học
              </h2>
              <div className="space-y-3">
                {subjects.map(s => (
                  <div key={s.subject} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SUBJECT_COLOR[s.subject])}>
                        {SUBJECT_LABEL[s.subject] ?? s.subject}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span><b className="text-gray-900">{s.studyMinutes}</b>ph</span>
                      <span><b className="text-gray-900">{s.quizCount}</b> quiz</span>
                      <span><b className={cn(s.avgMastery >= 70 ? 'text-emerald-600' : 'text-red-500')}>{s.avgMastery}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weak / Strong topics */}
          {(summary?.weakTopics?.length || summary?.strongTopics?.length) ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h2 className="font-semibold text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Chủ đề cần cải thiện
                </h2>
                {summary?.weakTopics?.map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h2 className="font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Chủ đề đã thành thạo
                </h2>
                {summary?.strongTopics?.map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </>
      )}
    </div>
  );
}
