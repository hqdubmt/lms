'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Mic, Headphones, PenLine, Brain, Globe, Star, Zap, Flame, Trophy, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Analytics {
  stats: {
    xp: number; level: number; streak: number; longestStreak: number;
    wordsLearned: number; exercisesDone: number;
  };
  wordStats: {
    total: number; seen: number; mastered: number; due: number;
    avgSpeakScore: number; avgListenScore: number;
  };
  skillScores: {
    vocabulary: number; grammar: number; listening: number;
    speaking: number; reading: number; writing: number;
  };
  exerciseStats: { total: number; avgScore: number };
  topicBreakdown: { topic: string; seen: number; mastered: number }[];
  levelBreakdown: { level: string; seen: number; mastered: number }[];
}

const SKILLS = [
  { key: 'vocabulary', label: 'Từ vựng', icon: BookOpen, color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', text: 'text-indigo-700', desc: 'Từ đã ghi nhớ trong SRS' },
  { key: 'listening', label: 'Nghe', icon: Headphones, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-700', desc: 'Nghe và chọn nghĩa đúng' },
  { key: 'speaking', label: 'Phát âm', icon: Mic, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-700', desc: 'Điểm phát âm trung bình' },
  { key: 'reading', label: 'Đọc', icon: Brain, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', desc: 'Hoàn thành bài tập đọc hiểu' },
  { key: 'writing', label: 'Viết', icon: PenLine, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700', desc: 'Điền từ và viết lại' },
  { key: 'grammar', label: 'Ngữ pháp', icon: Globe, color: 'from-teal-500 to-green-600', bg: 'bg-teal-50', text: 'text-teal-700', desc: 'Sắp xếp câu, cấu trúc' },
] as const;

function SkillBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-bold w-10 text-right tabular-nums">{score}%</span>
    </div>
  );
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

export default function LanguageAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Analytics>('/language/analytics')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4 animate-pulse p-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted" />)}
    </div>
  );

  if (!data) return (
    <div className="max-w-3xl mx-auto py-20 text-center text-muted-foreground">
      Không thể tải dữ liệu. <Link href="/language" className="underline text-primary">Quay lại</Link>
    </div>
  );

  const { stats, wordStats, skillScores, exerciseStats, topicBreakdown, levelBreakdown } = data;
  const overallScore = Math.round(Object.values(skillScores).reduce((a, b) => a + b, 0) / 6);
  const masteredPct = wordStats.total > 0 ? Math.round((wordStats.mastered / wordStats.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/language">
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Quay lại</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Phân tích học tập</h1>
          <p className="text-xs text-muted-foreground">Tiến độ & kỹ năng ngôn ngữ của bạn</p>
        </div>
      </div>

      {/* Overall score + key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="col-span-2 sm:col-span-1 bg-gradient-to-br from-violet-500 to-purple-700 text-white border-0">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1">
            <div className="relative">
              <ScoreRing score={overallScore} size={76} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{overallScore}</span>
              </div>
            </div>
            <p className="text-xs font-semibold opacity-80 mt-1">Điểm tổng</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1"><Flame className="h-3.5 w-3.5" /><span className="text-xs font-medium opacity-80">Streak</span></div>
            <div className="text-2xl font-bold">{stats.streak}</div>
            <div className="text-xs opacity-70">Kỷ lục: {stats.longestStreak} ngày</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-400 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1"><BookOpen className="h-3.5 w-3.5" /><span className="text-xs font-medium opacity-80">Đã học</span></div>
            <div className="text-2xl font-bold">{wordStats.mastered}</div>
            <div className="text-xs opacity-70">/ {wordStats.total} từ · {masteredPct}%</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1"><Zap className="h-3.5 w-3.5" /><span className="text-xs font-medium opacity-80">XP</span></div>
            <div className="text-2xl font-bold">{stats.xp}</div>
            <div className="text-xs opacity-70">Level {stats.level}</div>
          </CardContent>
        </Card>
      </div>

      {/* Word stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Từ vựng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tổng từ đã gặp', value: wordStats.seen, color: 'text-blue-600 bg-blue-50' },
              { label: 'Đã thuộc', value: wordStats.mastered, color: 'text-green-600 bg-green-50' },
              { label: 'Cần ôn hôm nay', value: wordStats.due, color: wordStats.due > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50' },
              { label: 'Bài tập xong', value: exerciseStats.total, color: 'text-violet-600 bg-violet-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-xl p-3 text-center', color.split(' ')[1])}>
                <div className={cn('text-2xl font-bold', color.split(' ')[0])}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar for mastery */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Tiến độ thuộc từ</span>
              <span>{masteredPct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${masteredPct}%` }}
              />
            </div>
          </div>

          {wordStats.due > 0 && (
            <Link href="/language/review">
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors cursor-pointer">
                <Star className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-amber-800">{wordStats.due} từ cần ôn ngay!</span>
                  <span className="text-amber-600 ml-1">Nhấn để ôn tập</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-amber-500 rotate-180" />
              </div>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Skill scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Điểm kỹ năng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SKILLS.map(({ key, label, icon: Icon, color, bg, text, desc }) => {
            const score = skillScores[key as keyof typeof skillScores] ?? 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
                  <Icon className={cn('h-4 w-4', text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{label}</span>
                    <Badge variant="outline" className={cn('text-xs', score >= 70 ? 'border-green-200 text-green-700' : score >= 40 ? 'border-amber-200 text-amber-700' : score > 0 ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-400')}>
                      {score > 0 ? (score >= 70 ? 'Tốt' : score >= 40 ? 'Trung bình' : 'Cần luyện') : 'Chưa học'}
                    </Badge>
                  </div>
                  <SkillBar score={score} color={color} />
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            );
          })}

          {Object.values(skillScores).every(s => s === 0) && (
            <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-xl">
              Chưa có dữ liệu kỹ năng. Hãy học flashcard, nghe, nói để xem điểm của bạn!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level breakdown */}
      {levelBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tiến độ theo cấp độ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {levelBreakdown.map(({ level, seen, mastered }) => {
                const pct = seen > 0 ? Math.round((mastered / seen) * 100) : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <Badge className="w-10 shrink-0 justify-center text-xs">{level}</Badge>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">{mastered}/{seen} từ</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link href="/language/review">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <p className="text-sm font-semibold">Ôn tập SRS</p>
              <p className="text-xs text-muted-foreground">{wordStats.due} từ hôm nay</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/language">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-indigo-200">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-sm font-semibold">Học từ vựng</p>
              <p className="text-xs text-muted-foreground">Flashcard & Quiz</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/language/leaderboard">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-violet-200">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-violet-500 mx-auto mb-1" />
              <p className="text-sm font-semibold">Bảng xếp hạng</p>
              <p className="text-xs text-muted-foreground">XP: {stats.xp}</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
