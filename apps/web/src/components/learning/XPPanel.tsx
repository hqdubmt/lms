'use client';

import { useEffect, useState } from 'react';
import { Zap, Star, Trophy, CheckCircle2, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getXPData, type XPData, type Quest } from '@/services/gamification';
import { api } from '@/lib/api';

function QuestCard({ quest, onComplete }: { quest: Quest; onComplete: (id: string) => void }) {
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));
  const expired = quest.expiresAt < Date.now();
  return (
    <div className={cn(
      'p-3 rounded-xl border',
      quest.completed ? 'bg-emerald-50 border-emerald-200 opacity-70' : expired ? 'opacity-40 bg-gray-50 border-gray-100' : 'bg-white border-gray-100',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {quest.completed
              ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="text-sm font-semibold truncate">{quest.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{quest.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', quest.completed ? 'bg-emerald-500' : 'bg-primary')}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{quest.progress}/{quest.target}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs font-bold text-amber-600">+{quest.xpReward} XP</span>
          {!quest.completed && !expired && quest.progress >= quest.target && (
            <button onClick={() => onComplete(quest.id)}
              className="block mt-1 text-xs bg-primary text-white px-2 py-0.5 rounded-lg hover:bg-primary/90 transition-colors">
              Nhận
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function XPPanel() {
  const [data, setData] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await getXPData()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = async (questId: string) => {
    await api.post('/ai/xp/quest/complete', { questId });
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  if (!data) return null;

  const lvlPct = Math.round(data.xpProgress * 100);

  return (
    <div className="space-y-4">
      {/* XP + Level hero */}
      <div className="bg-gradient-to-r from-violet-500/10 to-primary/10 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: data.rankColor }}>
              {data.level}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cấp độ {data.level}</p>
              <p className="text-sm font-bold" style={{ color: data.rankColor }}>{data.rank}</p>
            </div>
          </div>
          <button onClick={load} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-bold text-amber-600">
              <Zap className="h-3.5 w-3.5" />{data.totalXP} XP
            </span>
            <span className="text-muted-foreground">+{data.xpToNextLevel} XP đến cấp sau</span>
          </div>
          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${lvlPct}%`, background: data.rankColor }} />
          </div>
        </div>
      </div>

      {/* Daily quests */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-amber-500" />Nhiệm vụ hôm nay
        </h2>
        {data.dailyQuests.map(q => (
          <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
        ))}
      </div>

      {/* Weekly quests */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-violet-500" />Nhiệm vụ tuần
        </h2>
        {data.weeklyQuests.map(q => (
          <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
        ))}
      </div>

      {/* XP history */}
      {data.history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">XP gần đây</h3>
          <div className="space-y-1">
            {data.history.slice(-5).reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{h.date} · {h.reason}</span>
                <span className="font-semibold text-amber-600">+{h.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
