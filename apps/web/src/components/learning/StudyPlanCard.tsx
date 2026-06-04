'use client';

import { useState } from 'react';
import { CalendarDays, BookOpen, Zap, Gamepad2, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudyPlan, type StudyPlan, type DayTask } from '@/services/gamification';

const TYPE_META: Record<DayTask['type'], { icon: React.ElementType; color: string; label: string }> = {
  review:   { icon: BookOpen,    color: 'bg-orange-50 border-orange-200 text-orange-700', label: 'Ôn tập' },
  practice: { icon: Zap,         color: 'bg-blue-50 border-blue-200 text-blue-700',       label: 'Luyện tập' },
  quiz:     { icon: Gamepad2,    color: 'bg-indigo-50 border-indigo-200 text-indigo-700', label: 'Kiểm tra' },
  new:      { icon: Star,        color: 'bg-green-50 border-green-200 text-green-700',    label: 'Kiến thức mới' },
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

interface Props {
  subject: string;
}

export function StudyPlanCard({ subject }: Props) {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async (d: 7 | 14 | 30) => {
    setDays(d);
    setLoading(true);
    try {
      const p = await getStudyPlan(subject, d);
      setPlan(p);
      setExpanded(true);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!loaded) { load(days); return; }
    setExpanded(v => !v);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Kế hoạch học tập AI
          {plan && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              — {plan.days} ngày
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loaded && (
            <span className="text-xs text-primary font-medium">Tạo ngay</span>
          )}
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            : expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {expanded && plan && (
        <div className="border-t border-gray-50">
          {/* Day selector */}
          <div className="flex gap-1 px-5 pt-3 pb-2">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => load(d)}
                disabled={loading}
                className={cn(
                  'text-xs px-3 py-1 rounded-full font-medium transition-all',
                  days === d ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-gray-100',
                )}
              >
                {d} ngày
              </button>
            ))}
          </div>

          {/* Weak topics */}
          {plan.weakTopics.length > 0 && (
            <div className="px-5 pb-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground self-center">Ưu tiên:</span>
              {plan.weakTopics.map((t, i) => (
                <span key={i} className="text-[10px] bg-red-50 border border-red-100 text-red-600 rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}

          {/* Plan list — show first 7 days by default */}
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {plan.plan.slice(0, days === 7 ? 7 : days === 14 ? 14 : 30).map((task) => {
              const meta = TYPE_META[task.type];
              const Icon = meta.icon;
              const isToday = task.date === today;
              return (
                <div
                  key={task.day}
                  className={cn(
                    'flex items-start gap-3 px-5 py-3',
                    isToday && 'bg-primary/5',
                  )}
                >
                  <div className={cn('h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-muted-foreground">{fmt(task.date)}</span>
                      {isToday && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">HÔM NAY</span>}
                      <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full border', meta.color)}>{meta.label}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 truncate">{task.focus}</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {task.activities.map((a, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-gray-300 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
