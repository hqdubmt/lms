'use client';

import { useEffect, useState } from 'react';
import { HeartHandshake, Star, Flame, Clock, CheckCircle2, Circle, Target, Loader2, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Milestone {
  label: string;
  target: number;
  current: number;
  done: boolean;
}

interface MentorData {
  motivation: string;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  weeklyGoal: string;
  stats: {
    streak: number;
    bestStreak: number;
    level: number;
    rank: string;
    totalXP: number;
    studyMinutes: number;
    avgMastery: number;
  };
}

interface GoalData {
  goal: string;
  subject: string;
  targetDays: number;
  createdAt: string;
  deadline: string;
}

const SUBJECTS = [
  { key: 'general', label: 'Tổng hợp' },
  { key: 'math', label: 'Toán học' },
  { key: 'viet', label: 'Tiếng Việt' },
  { key: 'language', label: 'Ngoại ngữ' },
];

export default function AIMentorPage() {
  useRequireAuth();

  const [data, setData] = useState<MentorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalText, setGoalText] = useState('');
  const [goalSubject, setGoalSubject] = useState('general');
  const [goalDays, setGoalDays] = useState(7);
  const [currentGoal, setCurrentGoal] = useState<GoalData | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMentor = async () => {
    setLoading(true);
    try {
      const [mentorRes, goalRes] = await Promise.all([
        api.get<MentorData>('/ai/mentor'),
        api.get<{ goal: GoalData | null }>('/ai/mentor/goal'),
      ]);
      setData(mentorRes);
      setCurrentGoal(goalRes.goal);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMentor(); }, []);

  const saveGoal = async () => {
    if (!goalText.trim()) return;
    setSaving(true);
    try {
      const res = await api.post<{ goal: GoalData }>('/ai/mentor/goal', {
        goal: goalText.trim(),
        subject: goalSubject,
        targetDays: goalDays,
      });
      setCurrentGoal(res.goal);
      setGoalText('');
    } catch { /* noop */ } finally {
      setSaving(false);
    }
  };

  const daysLeft = currentGoal
    ? Math.max(0, Math.ceil((new Date(currentGoal.deadline).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-rose-500" /> AI Mentor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Người hướng dẫn học tập cá nhân của bạn</p>
        </div>
        <button onClick={loadMentor} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <>
          {/* Motivation card */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <HeartHandshake className="h-6 w-6 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed font-medium">{data.motivation}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-white/70">Chuỗi học</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Flame className="h-4 w-4" /> {data.stats.streak}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Level</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Star className="h-4 w-4" /> {data.stats.level}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Tổng XP</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Zap className="h-4 w-4" /> {data.stats.totalXP.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/70">Phút học</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {data.stats.studyMinutes}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly goal */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Mục tiêu tuần này</h2>
            </div>
            <p className="text-sm text-gray-700">{data.weeklyGoal}</p>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Cột mốc hành trình
            </h2>
            <div className="space-y-3">
              {data.milestones.map((m, i) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                return (
                  <div key={i} className="flex items-center gap-3">
                    {m.done
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className={cn('text-sm', m.done ? 'line-through text-gray-400' : 'text-gray-700')}>{m.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{m.current}/{m.target}</span>
                      </div>
                      <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full transition-all', m.done ? 'bg-emerald-500' : 'bg-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {data.nextMilestone && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-muted-foreground mb-1">Cột mốc tiếp theo</p>
                <p className="text-sm font-semibold text-primary flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" /> {data.nextMilestone.label}
                </p>
              </div>
            )}
          </div>

          {/* Current goal */}
          {currentGoal && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <h2 className="font-semibold text-sm text-blue-700 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" /> Mục tiêu đang theo đuổi
              </h2>
              <p className="text-sm text-blue-800 font-medium">{currentGoal.goal}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-blue-600">
                <span>Môn: {currentGoal.subject}</span>
                <span>·</span>
                <span className={cn('font-semibold', daysLeft <= 1 && 'text-red-500')}>
                  Còn {daysLeft} ngày
                </span>
              </div>
            </div>
          )}

          {/* Set new goal */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Đặt mục tiêu mới
            </h2>
            <input
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
              placeholder="Ví dụ: Thành thạo phương trình bậc 2 trong 7 ngày..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-3">
              <select
                value={goalSubject}
                onChange={e => setGoalSubject(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                {SUBJECTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select
                value={goalDays}
                onChange={e => setGoalDays(Number(e.target.value))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} ngày</option>)}
              </select>
            </div>
            <button
              onClick={saveGoal}
              disabled={saving || !goalText.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang lưu...' : 'Lưu mục tiêu'}
            </button>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-16">Không thể tải dữ liệu.</p>
      )}
    </div>
  );
}
