'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, CheckCircle2, Circle, Flame, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  target: number;
  progress: number;
  unit: string;
  xpReward: number;
}

interface WeeklyGoalsData {
  subject: string;
  todayFocus: string;
  todayActivities: string[];
  goals: Goal[];
  streak: number;
}

interface StudyPlanPanelProps {
  subject: string;
  onSendMessage: (text: string) => void;
}

export function StudyPlanPanel({ subject, onSendMessage }: StudyPlanPanelProps) {
  const [data, setData] = useState<WeeklyGoalsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<WeeklyGoalsData>(`/ai/weekly-goals?subject=${subject}`);
      setData(res);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [subject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Đang tải kế hoạch...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="px-3 pt-2 pb-2 space-y-2 border-b border-gray-100 bg-gradient-to-b from-blue-50/50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-gray-700">Kế hoạch hôm nay</span>
          {data.streak > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-orange-600">
              <Flame className="h-3 w-3" /> {data.streak}
            </span>
          )}
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Today focus */}
      <button
        onClick={() => onSendMessage(`Hãy dạy em về: ${data.todayFocus}`)}
        className="w-full text-left px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
      >
        <p className="text-[10px] text-blue-500 font-medium">Chủ đề hôm nay</p>
        <p className="text-[11px] text-blue-800 font-semibold truncate">{data.todayFocus}</p>
      </button>

      {/* Weekly goals progress */}
      <div className="space-y-1.5">
        {data.goals.slice(0, 3).map(goal => {
          const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
          const done = goal.progress >= goal.target;
          return (
            <div key={goal.id} className="flex items-center gap-2">
              {done
                ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                : <Circle className="h-3 w-3 text-gray-300 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-gray-600 truncate">{goal.title}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">{goal.progress}/{goal.target}</span>
                </div>
                <div className="mt-0.5 bg-gray-100 rounded-full h-1">
                  <div
                    className={cn('h-1 rounded-full transition-all', done ? 'bg-emerald-500' : 'bg-blue-400')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className={cn('text-[9px] font-medium shrink-0', done ? 'text-emerald-600' : 'text-gray-400')}>
                +{goal.xpReward}XP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
