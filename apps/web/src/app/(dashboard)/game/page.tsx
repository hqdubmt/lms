'use client';

import Link from 'next/link';
import { Zap, Search, Volume2, Calculator, Globe, BookType, Lock, FlaskConical, Mic, PenLine, Sword, Bot, Map, Trophy, Users, Swords } from 'lucide-react';

const GAMES = [
  {
    phase: 1,
    title: 'Speed Math',
    description: '60 giây trả lời toán nhanh nhất có thể',
    icon: Zap,
    href: '/math/game/speed-math',
    color: 'from-yellow-400 to-orange-500',
    subject: 'Toán học',
    subjectIcon: Calculator,
    locked: false,
  },
  {
    phase: 1,
    title: 'Vocabulary Hunter',
    description: 'Đọc nghĩa, chọn từ đúng — săn từ vựng',
    icon: Search,
    href: '/language/game/vocab-hunter',
    color: 'from-emerald-400 to-teal-600',
    subject: 'Ngoại ngữ',
    subjectIcon: Globe,
    locked: false,
  },
  {
    phase: 1,
    title: 'Chính Tả Thần Tốc',
    description: 'Nghe câu — gõ lại chính xác để ghi điểm',
    icon: Volume2,
    href: '/viet/game/chinh-ta',
    color: 'from-violet-500 to-purple-700',
    subject: 'Tiếng Việt',
    subjectIcon: BookType,
    locked: false,
  },
  {
    phase: 2,
    title: 'Formula Hunt',
    description: 'Nhìn tên khái niệm — chọn đúng công thức',
    icon: FlaskConical,
    href: '/math/game/formula-hunt',
    color: 'from-blue-400 to-indigo-600',
    subject: 'Toán học',
    subjectIcon: Calculator,
    locked: false,
  },
  {
    phase: 2,
    title: 'Pronunciation Challenge',
    description: 'Nghe câu → ghi âm → AI chấm phát âm',
    icon: Mic,
    href: '/language/game/pronunciation-challenge',
    color: 'from-pink-400 to-rose-600',
    subject: 'Ngoại ngữ',
    subjectIcon: Globe,
    locked: false,
  },
  {
    phase: 2,
    title: 'Nhà Văn Nhí',
    description: 'AI cho chủ đề — viết đoạn văn — AI chấm điểm',
    icon: PenLine,
    href: '/viet/game/nhan-van-nhi',
    color: 'from-amber-400 to-orange-600',
    subject: 'Tiếng Việt',
    subjectIcon: BookType,
    locked: false,
  },
  {
    phase: 3,
    title: 'Math Boss Battle',
    description: 'Chiến đấu với Boss toán học — 10 câu hạ Boss',
    icon: Sword,
    href: '/math/game/boss-battle',
    color: 'from-red-600 to-rose-800',
    subject: 'Toán học',
    subjectIcon: Calculator,
    locked: false,
  },
  {
    phase: 3,
    title: 'AI Conversation',
    description: 'AI đóng vai — hội thoại bằng giọng nói hoặc văn bản',
    icon: Bot,
    href: '/language/game/ai-conversation',
    color: 'from-indigo-500 to-violet-700',
    subject: 'Ngoại ngữ',
    subjectIcon: Globe,
    locked: false,
  },
  {
    phase: 3,
    title: 'Adventure Map',
    description: 'Bản đồ học tập — khám phá từng chương theo lớp',
    icon: Map,
    href: '/math/game/adventure',
    color: 'from-teal-500 to-cyan-700',
    subject: 'Toán học',
    subjectIcon: Calculator,
    locked: false,
  },
  {
    phase: 4,
    title: 'Battle Quiz',
    description: 'Thách đấu bạn bè realtime — 10 câu tốc độ, XP thưởng',
    icon: Swords,
    href: '/game/battle',
    color: 'from-violet-600 to-purple-800',
    subject: 'Tất cả môn',
    subjectIcon: Trophy,
    locked: false,
  },
  {
    phase: 4,
    title: 'Guild',
    description: 'Lập đội học, gom XP cùng nhau leo bảng Guild',
    icon: Users,
    href: '/game/guild',
    color: 'from-rose-500 to-pink-700',
    subject: 'Tất cả môn',
    subjectIcon: Trophy,
    locked: false,
  },
  {
    phase: 4,
    title: 'Leaderboard Pro',
    description: 'Xếp hạng theo từng môn: Toán, Ngoại ngữ, Tiếng Việt, Guild',
    icon: Trophy,
    href: '/leaderboard',
    color: 'from-amber-500 to-orange-700',
    subject: 'Tất cả môn',
    subjectIcon: Trophy,
    locked: false,
  },
];

const PHASE_LABELS: Record<number, string> = {
  1: 'Giai đoạn 1 — Đang mở',
  2: 'Giai đoạn 2 — Đang mở',
  3: 'Giai đoạn 3 — Đang mở',
  4: 'Giai đoạn 4 — Cộng đồng & Đấu trường',
};

export default function GamePage() {
  const phases = [...new Set(GAMES.map(g => g.phase))].sort();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gray-900">Mini Games</h1>
        <p className="text-gray-500">Học mà chơi — chơi mà học. Tích lũy XP và leo hạng!</p>
      </div>

      {/* Quick-link: Battle & Guild */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/game/battle"
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 hover:opacity-90 transition group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base leading-tight">Battle Quiz</p>
            <p className="text-violet-200 text-xs mt-0.5">Thách đấu realtime · +80 XP thắng</p>
          </div>
          <span className="text-white/60 group-hover:text-white transition text-lg">→</span>
        </Link>

        <Link href="/game/guild"
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-700 p-4 hover:opacity-90 transition group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base leading-tight">Guild</p>
            <p className="text-rose-200 text-xs mt-0.5">Lập đội · gom XP · leo bảng Guild</p>
          </div>
          <span className="text-white/60 group-hover:text-white transition text-lg">→</span>
        </Link>
      </div>

      {phases.map(phase => (
        <div key={phase} className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">
            {PHASE_LABELS[phase] || `Giai đoạn ${phase}`}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {GAMES.filter(g => g.phase === phase).map(game => {
              const Icon = game.icon;
              const SubjectIcon = game.subjectIcon;
              const card = (
                <div className={`rounded-2xl overflow-hidden shadow-sm border ${game.locked ? 'opacity-60' : 'hover:shadow-md transition-shadow'}`}>
                  <div className={`bg-gradient-to-br ${game.color} p-5 text-white`}>
                    <div className="flex items-start justify-between">
                      <Icon className="w-8 h-8" />
                      {game.locked && <Lock className="w-5 h-5 text-white/60" />}
                    </div>
                    <h3 className="text-xl font-black mt-3">{game.title}</h3>
                    <p className="text-white/80 text-sm mt-1">{game.description}</p>
                  </div>
                  <div className="bg-white px-5 py-3 flex items-center gap-2">
                    <SubjectIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{game.subject}</span>
                    {!game.locked && (
                      <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Chơi ngay</span>
                    )}
                    {game.locked && (
                      <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sắp ra mắt</span>
                    )}
                  </div>
                </div>
              );

              return game.locked ? (
                <div key={game.title}>{card}</div>
              ) : (
                <Link key={game.title} href={game.href}>{card}</Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border bg-gray-50 p-6 text-center space-y-2">
        <h3 className="font-bold text-gray-700">Hệ thống XP & Level</h3>
        <div className="grid grid-cols-5 gap-2 text-xs mt-3">
          {[['1–10', 'Beginner', 'bg-gray-200'], ['11–20', 'Explorer', 'bg-green-200'], ['21–30', 'Scholar', 'bg-blue-200'], ['31–50', 'Master', 'bg-purple-200'], ['50+', 'Legend', 'bg-yellow-200']].map(([range, label, bg]) => (
            <div key={label} className={`rounded-lg p-2 ${bg}`}>
              <div className="font-bold text-gray-700">{label}</div>
              <div className="text-gray-500 mt-0.5">Lv {range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
