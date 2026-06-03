'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain, TrendingUp, AlertCircle, CheckCircle2, Lightbulb,
  Gamepad2, BookOpen, Target, HelpCircle, RefreshCw, Loader2,
  Trophy, BarChart2, Zap, ChevronRight, Map, Clock,
  BookMarked, Star, PlayCircle, Flame, MessageSquare, Mic,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getAnalyticsSummary, type AnalyticsSummary } from '@/services/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeGap { weak: string[]; strong: string[] }

interface Recommendation {
  lesson?: { id: string; title: string; courseTitle: string };
  quiz?: { id: string; title: string };
  exercise?: string;
  reasons: string[];
}

interface QuizAnalytics {
  totalQuizzes: number;
  avgScore: number;
  bestScore: number;
  byTopic: { topic: string; attempts: number; avgScore: number; bestScore: number }[];
  recentAttempts: { id: string; title: string; topic: string; score: number; timeTaken?: number; createdAt: string }[];
}

interface LearningPath {
  steps: { type: string; title: string; id?: string; status: string; description?: string }[];
  weakTopics: string[];
  strongTopics: string[];
  avgMastery: number;
  estimatedMinutes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp',   color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { key: 'math',     label: 'Toán học',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'viet',     label: 'Tiếng Việt',  color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'language', label: 'Ngoại ngữ',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const STEP_META: Record<string, { icon: React.ElementType; color: string }> = {
  review:    { icon: BookMarked, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  lesson:    { icon: PlayCircle, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  quiz:      { icon: Gamepad2,   color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  practice:  { icon: Zap,        color: 'text-amber-500 bg-amber-50 border-amber-200' },
  milestone: { icon: Star,       color: 'text-green-500 bg-green-50 border-green-200' },
};

const STATUS_META: Record<string, { label: string; dot: string }> = {
  current:  { label: 'Đang học', dot: 'bg-orange-400 animate-pulse' },
  next:     { label: 'Tiếp theo', dot: 'bg-blue-400' },
  upcoming: { label: 'Sắp tới',  dot: 'bg-gray-300' },
  done:     { label: 'Đã xong',  dot: 'bg-green-400' },
};

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600';
  if (s >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-100';
  if (s >= 60) return 'bg-yellow-100';
  return 'bg-red-100';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type DaysWindow = 7 | 30 | 90;

export default function LearningPage() {
  const [subject, setSubject] = useState('general');
  const [analyticsWindow, setAnalyticsWindow] = useState<DaysWindow>(7);
  const [gap, setGap] = useState<KnowledgeGap | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [aiAnalytics, setAiAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const load = async (sub: string, win: DaysWindow = analyticsWindow) => {
    setLoading(true);
    try {
      const [g, r, a, p, ai] = await Promise.all([
        api.get<KnowledgeGap>(`/ai/knowledge-gap?subject=${sub}`).catch(() => null),
        api.get<Recommendation>(`/ai/recommendations?subject=${sub}`).catch(() => null),
        api.get<QuizAnalytics>('/quiz/analytics').catch(() => null),
        api.get<LearningPath>(`/ai/learning-path?subject=${sub}`).catch(() => null),
        getAnalyticsSummary(sub, win),
      ]);
      setGap(g);
      setRec(r);
      setAnalytics(a);
      setPath(p);
      setAiAnalytics(ai);
    } finally {
      setLoading(false);
    }
  };

  const switchWindow = async (win: DaysWindow) => {
    setAnalyticsWindow(win);
    setAnalyticsLoading(true);
    try {
      const ai = await getAnalyticsSummary(subject, win);
      setAiAnalytics(ai);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => { load(subject); }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const subjectMeta = SUBJECTS.find(s => s.key === subject)!;
  const hasData = (analytics?.totalQuizzes ?? 0) > 0 || (gap?.weak.length ?? 0) > 0 || (gap?.strong.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Bảng tiến độ học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI phân tích điểm mạnh, điểm yếu và lộ trình học cá nhân hoá
          </p>
        </div>
        <button
          onClick={() => load(subject)} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Cập nhật
        </button>
      </div>

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button key={s.key} onClick={() => setSubject(s.key)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              subject === s.key ? s.color + ' ring-2 ring-offset-1 ring-current/30' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang phân tích...
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Brain className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-semibold text-gray-600">AI chưa có đủ dữ liệu</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Làm quiz hoặc chat với AI Tutor để nhận phân tích cá nhân hoá
          </p>
          <Link href="/quiz"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
            <Gamepad2 className="h-4 w-4" />Làm quiz ngay
          </Link>
        </div>
      ) : (
        <>
          {/* AI Learning Analytics */}
          {aiAnalytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Phút học tuần này" value={aiAnalytics.weeklyStudyMinutes} icon={Clock} color="bg-blue-100 text-blue-600" />
              <StatCard label="Chuỗi ngày học" value={`${aiAnalytics.currentStreak} ngày`} icon={Flame} color="bg-orange-100 text-orange-600" />
              <StatCard label="Chat với AI" value={aiAnalytics.dailyData.reduce((s, d) => s + d.chatCount, 0)} icon={MessageSquare} color="bg-violet-100 text-violet-600" />
              <StatCard label="Luyện giọng nói" value={aiAnalytics.dailyData.reduce((s, d) => s + d.voiceCount, 0)} icon={Mic} color="bg-cyan-100 text-cyan-600" />
            </div>
          )}

          {/* Daily activity bar chart with 7/30/90 tabs */}
          {aiAnalytics && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />Thời gian học tập
                </h2>
                <div className="flex gap-1">
                  {([7, 30, 90] as DaysWindow[]).map(w => (
                    <button
                      key={w}
                      onClick={() => switchWindow(w)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                        analyticsWindow === w
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-gray-100',
                      )}
                    >
                      {w} ngày
                    </button>
                  ))}
                </div>
              </div>
              {analyticsLoading ? (
                <div className="h-16 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : aiAnalytics.dailyData.length === 0 ? (
                <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">Chưa có dữ liệu trong khoảng thời gian này</div>
              ) : (
                <div className="flex items-end gap-0.5 h-16">
                  {aiAnalytics.dailyData.map((d, i) => {
                    const maxMin = Math.max(...aiAnalytics.dailyData.map(x => x.studyMinutes), 1);
                    const pct = Math.max((d.studyMinutes / maxMin) * 100, d.studyMinutes > 0 ? 8 : 0);
                    const showLabel = analyticsWindow === 7 || (analyticsWindow === 30 && i % 5 === 0) || (analyticsWindow === 90 && i % 15 === 0);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full rounded-sm bg-primary/80 hover:bg-primary transition-all"
                          style={{ height: `${pct}%`, minHeight: d.studyMinutes > 0 ? '4px' : '2px' }}
                          title={`${d.date}: ${d.studyMinutes} phút`}
                        />
                        {showLabel && (
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Tổng: <strong className="text-foreground">{aiAnalytics.totalStudyMinutes} phút</strong></span>
                <span>Tuần này: <strong className="text-foreground">{aiAnalytics.weeklyStudyMinutes} phút</strong></span>
              </div>
            </div>
          )}

          {/* Quiz stats */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Tổng quiz đã làm" value={analytics.totalQuizzes} icon={Gamepad2} color="bg-indigo-100 text-indigo-600" />
              <StatCard label="Điểm trung bình" value={`${analytics.avgScore}%`} icon={BarChart2} color="bg-amber-100 text-amber-600" />
              <StatCard label="Điểm cao nhất" value={`${analytics.bestScore}%`} icon={Trophy} color="bg-green-100 text-green-600" />
            </div>
          )}

          {/* Mastery */}
          {path && path.avgMastery > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Mức thành thạo {subjectMeta.label}
                </div>
                <span className="text-sm font-bold text-primary">{path.avgMastery}%</span>
              </div>
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${path.avgMastery}%` }}
                />
              </div>
            </div>
          )}

          {/* Knowledge gap */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-3">
                <AlertCircle className="h-4 w-4" />Cần ôn lại
              </div>
              {(gap?.weak.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa phát hiện điểm yếu — tiếp tục học!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gap!.weak.map((w, i) => (
                    <span key={i} className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-full px-3 py-1">{w}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-3">
                <CheckCircle2 className="h-4 w-4" />Đã thành thạo
              </div>
              {(gap?.strong.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">Làm thêm quiz để AI ghi nhận thành tích!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gap!.strong.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 border border-green-100 text-green-600 rounded-full px-3 py-1">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Learning Path */}
          {path && path.steps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Map className="h-4 w-4 text-muted-foreground" />Lộ trình học tập cá nhân
                </h2>
                {path.estimatedMinutes > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />~{path.estimatedMinutes} phút
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {path.steps.map((step, i) => {
                  const meta = STEP_META[step.type] ?? STEP_META.lesson;
                  const statusMeta = STATUS_META[step.status] ?? STATUS_META.upcoming;
                  const Icon = meta.icon;
                  const isLink = step.id && (step.type === 'lesson' || step.type === 'quiz');
                  const href = step.type === 'lesson' ? `/learn/${step.id}` : `/quiz/${step.id}`;

                  const inner = (
                    <div className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                      step.status === 'current' ? meta.color + ' ring-2 ring-offset-1 ring-orange-200' :
                      step.status === 'done' ? 'bg-gray-50 border-gray-100 opacity-60' :
                      'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                    )}>
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <div className={cn('h-8 w-8 rounded-lg border flex items-center justify-center shrink-0', meta.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{step.title}</p>
                        {step.description && <p className="text-xs text-muted-foreground truncate">{step.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                          <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
                          {statusMeta.label}
                        </span>
                        {isLink && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );

                  return isLink ? (
                    <Link key={i} href={href}>{inner}</Link>
                  ) : (
                    <div key={i}>{inner}</div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {rec && rec.reasons.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-4">
                <Lightbulb className="h-4 w-4" />Gợi ý từ AI Tutor
              </div>
              <div className="space-y-3">
                {rec.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Zap className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />{r}
                  </div>
                ))}
                {rec.lesson && (
                  <Link href={`/learn/${rec.lesson.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-700 truncate">{rec.lesson.title}</p>
                        <p className="text-[10px] text-blue-500 truncate">{rec.lesson.courseTitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
                  </Link>
                )}
                {rec.quiz && (
                  <Link href={`/quiz/${rec.quiz.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-700">{rec.quiz.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-indigo-400" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Quiz history by topic */}
          {analytics && analytics.byTopic.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />Kết quả theo chủ đề
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {analytics.byTopic.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.topic}</p>
                      <p className="text-xs text-muted-foreground">{t.attempts} lần làm</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">TB</p>
                        <p className={cn('font-bold', scoreColor(t.avgScore))}>{t.avgScore}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Cao nhất</p>
                        <p className={cn('font-bold', scoreColor(t.bestScore))}>{t.bestScore}%</p>
                      </div>
                    </div>
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={cn('h-full rounded-full', t.avgScore >= 80 ? 'bg-green-500' : t.avgScore >= 60 ? 'bg-yellow-500' : 'bg-red-400')}
                        style={{ width: `${t.avgScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent quiz attempts */}
          {analytics && analytics.recentAttempts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />Quiz gần đây
                </h2>
                <Link href="/quiz" className="text-xs text-primary hover:underline">Xem tất cả</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {analytics.recentAttempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0', scoreBg(a.score), scoreColor(a.score))}>
                      {a.score}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.topic} · {fmtDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
