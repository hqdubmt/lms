'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy, Flame, Star, Medal } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string; xp: number; level: number; streak: number;
  user: { id: string; name: string; avatarUrl?: string };
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-50 border-yellow-200',
  2: 'bg-gray-50 border-gray-200',
  3: 'bg-orange-50 border-orange-200',
};

const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-500', 2: 'text-gray-400', 3: 'text-orange-500',
};

export default function MathLeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LeaderboardEntry[]>('/math/leaderboard')
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />Bảng xếp hạng Toán
          </h1>
          <p className="text-sm text-muted-foreground">Top 20 học viên xuất sắc nhất</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Chưa có dữ liệu xếp hạng</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            return (
              <div key={entry.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                  RANK_STYLES[rank] || 'bg-white border-gray-100'
                )}>
                <div className="w-8 flex-shrink-0 text-center">
                  {rank <= 3 ? (
                    <Medal className={cn('h-5 w-5 mx-auto', MEDAL_COLORS[rank])} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {entry.user.avatarUrl ? (
                    <img src={entry.user.avatarUrl} alt={entry.user.name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow">
                      <span className="text-sm font-bold text-blue-600">
                        {entry.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{entry.user.name}</p>
                  <p className="text-xs text-muted-foreground">Cấp {entry.level}</p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-semibold">{entry.streak}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-bold">{entry.xp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
