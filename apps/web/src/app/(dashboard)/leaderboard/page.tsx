'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Trophy, Medal, Star, Crown, Calculator, Globe, BookType, Users, Swords } from 'lucide-react';

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

interface Guild {
  rank: number;
  guildId: string;
  name: string;
  memberCount: number;
  totalXP: number;
}

type Tab = 'overall' | 'math' | 'lang' | 'viet' | 'guild';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overall', label: 'Tổng hợp', icon: Trophy },
  { id: 'math',    label: 'Toán học', icon: Calculator },
  { id: 'lang',    label: 'Ngoại ngữ', icon: Globe },
  { id: 'viet',    label: 'Tiếng Việt', icon: BookType },
  { id: 'guild',   label: 'Guild', icon: Users },
];

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
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
  const [tab, setTab] = useState<Tab>('overall');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setGuilds([]);
    if (tab === 'guild') {
      api.get<{ guilds: Guild[] }>('/ai/guild/leaderboard')
        .then(r => setGuilds(r.guilds))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (tab === 'overall') {
      api.get<LeaderboardData>('/ai/leaderboard?limit=20')
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      const subjectMap: Record<string, string> = { math: 'math', lang: 'lang', viet: 'viet' };
      api.get<LeaderboardData>(`/ai/leaderboard/subject?subject=${subjectMap[tab]}&limit=20`)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const tabDesc: Record<Tab, string> = {
    overall:  'Top học sinh theo tổng XP tích lũy',
    math:     'Xếp hạng Toán học',
    lang:     'Xếp hạng Ngoại ngữ',
    viet:     'Xếp hạng Tiếng Việt',
    guild:    'Xếp hạng các Guild theo tổng XP',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng xếp hạng</h1>
          <p className="text-sm text-gray-500">{tabDesc[tab]}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex-1 justify-center
                ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Players leaderboard */}
      {!loading && tab !== 'guild' && data && (
        <>
          {data.myRank && (
            <div className="mb-4 px-4 py-2 bg-blue-100 rounded-lg text-sm text-blue-700 font-medium">
              Xếp hạng của bạn: #{data.myRank}
            </div>
          )}

          <div className="space-y-2">
            {data.entries.map(entry => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl ${RANK_BG(entry.rank, entry.isMe)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {RANK_ICON(entry.rank)}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                  {entry.avatarUrl
                    ? <img src={entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                    : entry.name.charAt(0).toUpperCase()}
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
              <p>Chưa có dữ liệu. Hãy chơi game để tích lũy XP!</p>
            </div>
          )}
        </>
      )}

      {/* Guild leaderboard */}
      {!loading && tab === 'guild' && (
        <div className="space-y-2">
          {guilds.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có guild nào. Tạo guild đầu tiên!</p>
            </div>
          )}
          {guilds.map(g => (
            <div key={g.guildId} className={`flex items-center gap-4 px-4 py-3 rounded-xl ${RANK_BG(g.rank, false)}`}>
              <div className="flex items-center justify-center w-8">{RANK_ICON(g.rank)}</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {g.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{g.name}</div>
                <div className="text-xs text-gray-400">{g.memberCount} thành viên</div>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                <Star className="w-4 h-4" />
                {g.totalXP.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA for Battle */}
      <div className="mt-8 rounded-2xl border bg-gradient-to-br from-violet-50 to-purple-50 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shrink-0">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-800">Battle Quiz</p>
          <p className="text-sm text-gray-500">Thách đấu bạn bè realtime để leo bảng</p>
        </div>
        <a href="/game/battle" className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition whitespace-nowrap">
          Thách đấu
        </a>
      </div>
    </div>
  );
}
