'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Trophy, Medal, Star, Crown } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalXP: number;
  isMe: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  myRank: number | null;
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-gray-400 w-5 text-center">{rank}</span>;
};

const RANK_BG = (rank: number, isMe: boolean) => {
  if (isMe) return 'bg-blue-50 border border-blue-200';
  if (rank === 1) return 'bg-yellow-50 border border-yellow-200';
  if (rank === 2) return 'bg-gray-50 border border-gray-200';
  if (rank === 3) return 'bg-amber-50 border border-amber-200';
  return 'bg-white border border-gray-100';
};

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LeaderboardData>('/ai/leaderboard?limit=20')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng xếp hạng</h1>
          <p className="text-sm text-gray-500">Top học sinh theo tổng XP tích lũy</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {data.myRank && (
            <div className="mb-4 px-4 py-2 bg-blue-100 rounded-lg text-sm text-blue-700 font-medium">
              Xếp hạng của bạn: #{data.myRank}
            </div>
          )}

          <div className="space-y-2">
            {data.entries.map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl ${RANK_BG(entry.rank, entry.isMe)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {RANK_ICON(entry.rank)}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                  ) : (
                    entry.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {entry.name}{entry.isMe && <span className="ml-2 text-xs text-blue-600 font-normal">(bạn)</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Star className="w-4 h-4" />
                  {entry.totalXP.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>

          {data.entries.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có dữ liệu. Hãy chat với AI để tích lũy XP đầu tiên!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
