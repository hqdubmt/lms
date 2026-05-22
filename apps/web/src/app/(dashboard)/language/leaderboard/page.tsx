'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trophy, Zap, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface LBEntry {
  id: string; xp: number; level: number; streak: number;
  user: { id: string; name: string; avatarUrl?: string };
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LBEntry[]>('/language/leaderboard').then(setEntries).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/language"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Quay lại</Button></Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-500" />Bảng xếp hạng</h1>
          <p className="text-sm text-muted-foreground">Top học viên theo điểm XP</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <Card key={entry.id} className={cn(
              'transition-all',
              entry.user.id === user?.id ? 'border-primary bg-primary/5' : '',
              i === 0 ? 'border-yellow-300 bg-yellow-50/50' : i === 1 ? 'border-gray-300 bg-gray-50/50' : i === 2 ? 'border-amber-300 bg-amber-50/50' : ''
            )}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-8 text-center">
                  {i < 3 ? <span className="text-2xl">{medals[i]}</span> : <span className="text-muted-foreground font-semibold">{i + 1}</span>}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {entry.user.avatarUrl
                    ? <img src={entry.user.avatarUrl} className="h-10 w-10 rounded-full object-cover" alt="" />
                    : <span className="text-sm font-semibold text-primary">{entry.user.name[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {entry.user.name}
                    {entry.user.id === user?.id && <span className="ml-2 text-xs text-primary">(Bạn)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Level {entry.level}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {entry.streak > 0 && (
                    <span className="flex items-center gap-1 text-orange-500"><Flame className="h-4 w-4" />{entry.streak}</span>
                  )}
                  <span className="flex items-center gap-1 font-bold text-primary"><Zap className="h-4 w-4" />{entry.xp}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
