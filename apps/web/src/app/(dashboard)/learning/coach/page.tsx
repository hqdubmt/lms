'use client';

import { useEffect, useState } from 'react';
import { Target, Calendar, TrendingUp, CheckCircle2, Clock, Flame, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWeeklyGoals, getMonthlyProgress, type WeeklyGoalsData, type MonthlyProgressData } from '@/services/gamification';

const SUBJECTS = [
  { key: 'general', label: 'Tổng hợp' },
  { key: 'math',    label: 'Toán' },
  { key: 'viet',    label: 'Tiếng Việt' },
  { key: 'language', label: 'Ngoại ngữ' },
];

const DAY_TYPE_COLORS = {
  review:   'bg-blue-100 text-blue-700 border-blue-200',
  practice: 'bg-violet-100 text-violet-700 border-violet-200',
  quiz:     'bg-red-100 text-red-700 border-red-200',
  new:      'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const DAY_TYPE_LABELS = { review: 'Ôn tập', practice: 'Luyện tập', quiz: 'Kiểm tra', new: 'Học mới' };

function GoalBar({ goal }: { goal: { title: string; description: string; progress: number; target: number; unit: string; xpReward: number } }) {
  const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  const done = pct >= 100;
  return (
    <div className={cn('p-3 rounded-xl border', done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100')}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Target className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{goal.title}</span>
        </div>
        <span className="text-xs text-muted-foreground">{goal.progress}/{goal.target} {goal.unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{goal.description}</span>
        <span className="text-xs font-semibold text-amber-600">+{goal.xpReward} XP</span>
      </div>
    </div>
  );
}

function MilestoneCard({ m }: { m: { title: string; description: string; reached: boolean; progress: number; target: number } }) {
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
  return (
    <div className={cn('p-3 rounded-xl border', m.reached ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100')}>
      <div className="flex items-center gap-2 mb-1">
        {m.reached ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold">{m.title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{m.progress}/{m.target}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', m.reached ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
    </div>
  );
}

type Tab = 'week' | 'month';

export default function StudyCoachPage() {
  const [subject, setSubject] = useState('general');
  const [tab, setTab] = useState<Tab>('week');
  const [weekData, setWeekData] = useState<WeeklyGoalsData | null>(null);
  const [monthData, setMonthData] = useState<MonthlyProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (s: string, t: Tab) => {
    setLoading(true);
    try {
      if (t === 'week') {
        setWeekData(await getWeeklyGoals(s));
      } else {
        setMonthData(await getMonthlyProgress(s));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(subject, tab); }, [subject, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            AI Study Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kế hoạch và mục tiêu học tập cá nhân hoá</p>
        </div>
        <button onClick={() => load(subject, tab)} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button key={s.key} onClick={() => setSubject(s.key)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              subject === s.key ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex border border-gray-200 rounded-xl p-1 bg-gray-50 w-fit">
        {(['week', 'month'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-5 py-1.5 text-sm font-medium rounded-lg transition-all',
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-gray-700',
            )}>
            {t === 'week' ? 'Tuần này' : 'Tháng này'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải kế hoạch...
        </div>
      ) : tab === 'week' && weekData ? (
        <div className="space-y-4">
          {/* Today's focus */}
          <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-primary">Hôm nay</span>
              {weekData.streak > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  <Flame className="h-3 w-3" />{weekData.streak} ngày streak
                </span>
              )}
            </div>
            <p className="text-base font-bold text-gray-900">{weekData.todayFocus}</p>
            <div className="mt-2 space-y-1">
              {weekData.todayActivities.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                  <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />Mục tiêu tuần
            </h2>
            {weekData.goals.map(g => <GoalBar key={g.id} goal={g} />)}
          </div>

          {/* Week plan */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Lịch tuần
            </h2>
            <div className="space-y-1.5">
              {weekData.weekPlan.map(day => {
                const isToday = day.date === today;
                const isPast = day.date < today;
                return (
                  <div key={day.date}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-xl border',
                      isToday ? 'border-primary/30 bg-primary/5' : isPast ? 'border-gray-100 opacity-60' : 'border-gray-100 bg-white',
                    )}>
                    <div className="text-center shrink-0 w-10">
                      <p className="text-xs text-muted-foreground">{new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}</p>
                      <p className={cn('text-sm font-bold', isToday ? 'text-primary' : 'text-gray-700')}>
                        {new Date(day.date).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{day.focus}</p>
                    </div>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border shrink-0', DAY_TYPE_COLORS[day.type])}>
                      {DAY_TYPE_LABELS[day.type]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : tab === 'month' && monthData ? (
        <div className="space-y-4">
          {/* Progress overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Tiến độ tháng này</h2>
              <span className="text-2xl font-bold text-primary">{monthData.progressPct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all"
                style={{ width: `${monthData.progressPct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{monthData.avgMastery}%</p>
                <p className="text-xs text-muted-foreground">Thành thạo</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{monthData.totalStudyDays}</p>
                <p className="text-xs text-muted-foreground">Ngày học</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{monthData.streak.best}</p>
                <p className="text-xs text-muted-foreground">Streak tốt nhất</p>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Cột mốc tháng này
            </h2>
            {monthData.milestones.map(m => <MilestoneCard key={m.id} m={m} />)}
          </div>

          {/* Mastery history chart (simple) */}
          {monthData.masteryHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold mb-3">Lịch sử thành thạo</h2>
              <div className="flex items-end gap-1 h-20">
                {monthData.masteryHistory.slice(-30).map((h, i) => {
                  const pct = Math.round(h.avg * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.date}: ${pct}%`}>
                      <div className="w-full rounded-t bg-primary/20 relative overflow-hidden" style={{ height: '60px' }}>
                        <div className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                          style={{ height: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{monthData.masteryHistory.slice(-30)[0]?.date?.slice(5) ?? ''}</span>
                <span>{monthData.masteryHistory.slice(-1)[0]?.date?.slice(5) ?? ''}</span>
              </div>
            </div>
          )}

          {/* Activity summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold mb-3">Hoạt động tháng này</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Chat AI',   value: monthData.activity.chatCount,     unit: 'lần' },
                { label: 'Quiz',      value: monthData.activity.quizCount,     unit: 'bài' },
                { label: 'Bài tập',   value: monthData.activity.homeworkCount, unit: 'bài' },
                { label: 'Voice',     value: monthData.activity.voiceCount,    unit: 'phiên' },
              ].map(item => (
                <div key={item.label} className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label} ({item.unit})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
