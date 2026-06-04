'use client';

import { useEffect, useState } from 'react';
import {
  Check, AlertCircle, Lightbulb, HelpCircle,
  BookOpen, Map, ChevronRight, Clock, Zap, Network,
  CalendarDays, RotateCcw, Dumbbell, Gamepad2, Star, Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getStudyPlan, getXPData, type DayTask, type XPData } from '@/services/gamification';
import type { Subject, KnowledgeGap, Recommendation } from './types';

interface LearningStep {
  type: 'review' | 'lesson' | 'quiz' | 'practice' | 'milestone';
  title: string;
  id?: string;
  status: 'current' | 'next' | 'upcoming' | 'done';
  description?: string;
}

interface LearningPath {
  steps: LearningStep[];
  avgMastery: number;
  estimatedMinutes: number;
}

interface DifficultyResult {
  level: 'easy' | 'medium' | 'hard';
  avgMastery: number;
  reason: string;
  recommendation: string;
}

interface KGConcept {
  id: string;
  label: string;
  weight: number;
  children: string[];
}

interface BrainPanelProps {
  subject: Subject;
  onSendMessage: (text: string) => void;
}

type Tab = 'analysis' | 'path' | 'difficulty' | 'plan' | 'xp';

const TASK_ICON: Record<DayTask['type'], React.ElementType> = {
  review:   RotateCcw,
  practice: Dumbbell,
  quiz:     Gamepad2,
  new:      Star,
};
const TASK_COLOR: Record<DayTask['type'], string> = {
  review:   'text-orange-600 bg-orange-50 border-orange-200',
  practice: 'text-blue-600 bg-blue-50 border-blue-200',
  quiz:     'text-indigo-600 bg-indigo-50 border-indigo-200',
  new:      'text-green-600 bg-green-50 border-green-200',
};

const STEP_ICON: Record<string, React.ElementType> = {
  review:    AlertCircle,
  lesson:    BookOpen,
  quiz:      HelpCircle,
  practice:  ChevronRight,
  milestone: Check,
};

const STATUS_STYLE: Record<string, string> = {
  current:  'border-primary bg-primary/5 text-primary',
  next:     'border-blue-300 bg-blue-50 text-blue-700',
  upcoming: 'border-gray-200 bg-gray-50 text-gray-500',
  done:     'border-green-300 bg-green-50 text-green-700',
};

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  easy:   { label: 'Dễ', color: 'text-green-700', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' },
  medium: { label: 'Trung bình', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', bar: 'bg-yellow-500' },
  hard:   { label: 'Khó', color: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' },
};

export function BrainPanel({ subject, onSendMessage }: BrainPanelProps) {
  const [tab, setTab] = useState<Tab>('analysis');
  const [gap, setGap] = useState<KnowledgeGap | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyResult | null>(null);
  const [kgConcepts, setKgConcepts] = useState<KGConcept[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayTask[]>([]);
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    setLoading(true);
    Promise.all([
      api.get<KnowledgeGap>(`/ai/knowledge-gap?subject=${subject}`).catch(() => null),
      api.get<Recommendation>(`/ai/recommendations?subject=${subject}`).catch(() => null),
      api.get<LearningPath>(`/ai/learning-path?subject=${subject}`).catch(() => null),
      api.get<DifficultyResult>(`/ai/difficulty?subject=${subject}`).catch(() => null),
      api.get<{ concepts: KGConcept[] }>(`/ai/knowledge-graph/topic?subject=${subject}`).catch(() => null),
      getStudyPlan(subject, 7).catch(() => null),
      getXPData().catch(() => null),
    ]).then(([g, r, p, d, kg, plan, xp]) => {
      setGap(g);
      setRec(r);
      setPath(p);
      setDifficulty(d);
      setKgConcepts(kg?.concepts ?? []);
      setXpData(xp);
      if (plan?.plan) {
        const today = new Date().toISOString().slice(0, 10);
        const todayIdx = plan.plan.findIndex(t => t.date === today);
        // Show today + next 2 days
        setTodayPlan(plan.plan.slice(todayIdx >= 0 ? todayIdx : 0, (todayIdx >= 0 ? todayIdx : 0) + 3));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subject, loaded]);

  if (loading) {
    return <div className="px-3 py-2 text-xs text-gray-400 text-center">Đang phân tích tiến độ...</div>;
  }

  const hasAnalysis = (gap?.weak.length ?? 0) > 0 || (gap?.strong.length ?? 0) > 0 || rec?.reasons.length;
  const hasPath = (path?.steps?.length ?? 0) > 0;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('analysis')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'analysis' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <AlertCircle className="h-3 w-3" />Phân tích
        </button>
        <button
          onClick={() => setTab('path')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'path' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Map className="h-3 w-3" />Lộ trình
        </button>
        <button
          onClick={() => setTab('difficulty')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'difficulty' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Zap className="h-3 w-3" />Độ khó
        </button>
        <button
          onClick={() => setTab('plan')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'plan' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <CalendarDays className="h-3 w-3" />Kế hoạch
        </button>
        <button
          onClick={() => setTab('xp')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'xp' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Star className="h-3 w-3" />XP
        </button>
      </div>

      {/* Analysis tab */}
      {tab === 'analysis' && (
        <div className="space-y-2 px-3 py-2">
          {!hasAnalysis ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI phân tích điểm mạnh/yếu của bạn.
            </div>
          ) : (
            <>
              {gap && gap.weak.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-500 mb-1">
                    <AlertCircle className="h-3 w-3" />Cần ôn lại
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gap.weak.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => onSendMessage(`Giải thích cho em về: ${w}`)}
                        className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-full px-2 py-0.5 hover:bg-red-100 transition-colors"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {gap && gap.strong.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green-600 mb-1">
                    <Check className="h-3 w-3" />Đã thành thạo
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gap.strong.map((s, i) => (
                      <span key={i} className="text-xs bg-green-50 border border-green-100 text-green-600 rounded-full px-2 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rec && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mb-1">
                    <Lightbulb className="h-3 w-3" />Gợi ý tiếp theo
                  </div>
                  <div className="space-y-1">
                    {rec.exercise && (
                      <button
                        onClick={() => onSendMessage(rec.exercise!)}
                        className="w-full text-left text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2 py-1.5 hover:bg-blue-100 transition-colors"
                      >
                        {rec.exercise}
                      </button>
                    )}
                    {rec.quiz && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 shrink-0" />
                        Quiz: {rec.quiz.title}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Knowledge Graph tags in analysis tab */}
      {tab === 'analysis' && kgConcepts.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 mb-1.5">
            <Network className="h-3 w-3" />Knowledge Graph
          </div>
          <div className="flex flex-wrap gap-1">
            {kgConcepts.slice(0, 8).map(c => (
              <button
                key={c.id}
                onClick={() => onSendMessage(`Giải thích về ${c.label}`)}
                className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-full px-2 py-0.5 hover:bg-violet-100 transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Learning Path tab */}
      {tab === 'path' && (
        <div className="px-3 py-2 space-y-1.5">
          {!hasPath ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI tạo lộ trình học cá nhân hoá.
            </div>
          ) : (
            <>
              {path!.avgMastery > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                      style={{ width: `${path!.avgMastery}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{path!.avgMastery}%</span>
                </div>
              )}

              {path!.steps.map((step, i) => {
                const Icon = STEP_ICON[step.type] ?? ChevronRight;
                return (
                  <div
                    key={i}
                    className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs', STATUS_STYLE[step.status])}
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{step.title}</div>
                      {step.description && (
                        <div className="text-gray-400 mt-0.5 leading-tight">{step.description}</div>
                      )}
                    </div>
                    {step.status === 'current' && (
                      <span className="ml-auto shrink-0 text-primary font-semibold">◀</span>
                    )}
                  </div>
                );
              })}

              {path!.estimatedMinutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-400 pt-1">
                  <Clock className="h-3 w-3" />
                  Ước tính: ~{path!.estimatedMinutes} phút
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Difficulty tab */}
      {tab === 'difficulty' && (
        <div className="px-3 py-3 space-y-3">
          {!difficulty ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI đánh giá độ khó phù hợp.
            </div>
          ) : (
            <>
              {/* Level badge */}
              <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', DIFFICULTY_META[difficulty.level].bg)}>
                <Zap className={cn('h-4 w-4 shrink-0', DIFFICULTY_META[difficulty.level].color)} />
                <div className="flex-1 min-w-0">
                  <div className={cn('text-xs font-bold', DIFFICULTY_META[difficulty.level].color)}>
                    Độ khó: {DIFFICULTY_META[difficulty.level].label}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight mt-0.5">{difficulty.reason}</div>
                </div>
              </div>

              {/* Mastery bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Mức thành thạo</span>
                  <span className="font-semibold">{difficulty.avgMastery}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', DIFFICULTY_META[difficulty.level].bar)}
                    style={{ width: `${difficulty.avgMastery}%` }}
                  />
                </div>
              </div>

              {/* Recommendation */}
              <button
                onClick={() => onSendMessage(difficulty.recommendation)}
                className="w-full text-left text-xs bg-gray-50 border border-gray-100 text-gray-700 rounded-lg px-2.5 py-2 hover:bg-gray-100 transition-colors flex items-start gap-2"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                {difficulty.recommendation}
              </button>
            </>
          )}
        </div>
      )}
      {/* Study Plan tab */}
      {tab === 'plan' && (
        <div className="px-3 py-2 space-y-2">
          {todayPlan.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-3">
              Chưa có kế hoạch học. Hãy mở trang{' '}
              <span className="text-primary font-medium">Tiến độ AI</span> để tạo.
            </div>
          ) : (
            todayPlan.map((task, i) => {
              const Icon = TASK_ICON[task.type];
              const isToday = task.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={i} className={cn('rounded-xl border px-2.5 py-2', TASK_COLOR[task.type], isToday && 'ring-2 ring-offset-1 ring-current/30')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {isToday ? 'HÔM NAY' : `Ngày ${task.day}`}
                    </span>
                    <span className="text-[10px] ml-auto opacity-60">{task.date.slice(5)}</span>
                  </div>
                  <p className="text-xs font-semibold truncate mb-1.5">{task.focus}</p>
                  <div className="space-y-1">
                    {task.activities.map((act, j) => (
                      <button
                        key={j}
                        onClick={() => onSendMessage(`${act} về chủ đề: ${task.focus}`)}
                        className="w-full text-left text-[10px] opacity-80 hover:opacity-100 flex items-center gap-1 hover:underline transition-opacity"
                      >
                        <span className="h-1 w-1 rounded-full bg-current shrink-0" />
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* XP / Gamification tab */}
      {tab === 'xp' && (
        <div className="px-3 py-2 space-y-2">
          {!xpData ? (
            <div className="text-xs text-gray-400 text-center py-3">Chưa có dữ liệu XP.</div>
          ) : (
            <>
              {/* Level + XP bar */}
              <div className="bg-gradient-to-r from-violet-50 to-primary/5 rounded-xl border border-primary/20 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Star className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-bold">Lv.{xpData.level}</span>
                    <span className="text-xs font-semibold text-primary">{xpData.totalXP} XP</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: xpData.rankColor || '#7c3aed', background: `${xpData.rankColor || '#7c3aed'}20` }}>
                    {xpData.rank}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all"
                    style={{ width: `${Math.round(xpData.xpProgress * 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                  Còn {xpData.xpToNextLevel} XP → Lv.{xpData.level + 1}
                </p>
              </div>

              {/* Daily quests */}
              {xpData.dailyQuests.filter(q => !q.completed).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">NHIỆM VỤ HÔM NAY</p>
                  <div className="space-y-1.5">
                    {xpData.dailyQuests.filter(q => !q.completed).slice(0, 2).map(q => {
                      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                      return (
                        <div key={q.id} className="rounded-lg border border-gray-100 bg-white p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{q.title}</span>
                            <span className="text-[10px] font-bold text-amber-600 shrink-0 ml-1">+{q.xpReward} XP</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{q.progress}/{q.target} {q.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weekly quests */}
              {xpData.weeklyQuests.filter(q => !q.completed).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">NHIỆM VỤ TUẦN</p>
                  <div className="space-y-1.5">
                    {xpData.weeklyQuests.filter(q => !q.completed).slice(0, 2).map(q => {
                      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                      return (
                        <div key={q.id} className="rounded-lg border border-gray-100 bg-white p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{q.title}</span>
                            <span className="text-[10px] font-bold text-violet-600 shrink-0 ml-1">+{q.xpReward} XP</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{q.progress}/{q.target} {q.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {xpData.dailyQuests.filter(q => !q.completed).length === 0 &&
               xpData.weeklyQuests.filter(q => !q.completed).length === 0 && (
                <div className="text-center py-2">
                  <Trophy className="h-6 w-6 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Tất cả nhiệm vụ đã hoàn thành!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick nav footer */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-gray-50 px-2 py-1 flex items-center">
        <Link href="/learning/coach" className="flex-1 text-center text-[10px] text-muted-foreground hover:text-primary transition-colors py-0.5">
          Study Coach
        </Link>
        <span className="text-gray-200 text-[10px]">|</span>
        <Link href="/learning/revision" className="flex-1 text-center text-[10px] text-muted-foreground hover:text-primary transition-colors py-0.5">
          Ôn tập
        </Link>
        <span className="text-gray-200 text-[10px]">|</span>
        <Link href="/learning/report-card" className="flex-1 text-center text-[10px] text-muted-foreground hover:text-primary transition-colors py-0.5">
          Bảng điểm
        </Link>
        <span className="text-gray-200 text-[10px]">|</span>
        <Link href="/learning/timeline" className="flex-1 text-center text-[10px] text-muted-foreground hover:text-primary transition-colors py-0.5">
          Timeline
        </Link>
      </div>
    </div>
  );
}
