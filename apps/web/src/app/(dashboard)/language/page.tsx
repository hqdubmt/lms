'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Zap, Flame, Trophy, Star, ChevronRight,
  Plus, Brain, Globe, PlayCircle, Settings, FolderOpen, TrendingUp, GraduationCap, Volume2,
} from 'lucide-react';
import { EXERCISE_ICONS, EXERCISE_TYPE_LABEL as EXERCISE_LABEL, LANG_NAMES } from '@/constants/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface LangStats {
  xp: number; level: number; streak: number; longestStreak: number;
  wordsLearned: number; exercisesDone: number; reviewsDue: number;
}

interface VocabSet {
  id: string; title: string; language: string; level: string;
  _count: { items: number; children?: number };
  creator: { name: string };
  progresses: { wordsLearned: number; lastStudied: string }[];
  children?: any[];
}

interface Exercise {
  id: string; title: string; type: string; language: string; level: string;
  _count: { questions: number; attempts: number };
  creator: { name: string };
}


function xpToNextLevel(level: number) { return level * 500; }
function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500;
  const next = level * 500;
  return Math.round(((xp - base) / (next - base)) * 100);
}

export default function LanguagePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<LangStats | null>(null);
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  useEffect(() => {
    Promise.all([
      api.get<LangStats>('/language/stats'),
      api.get<VocabSet[]>('/language/vocab-sets/tree'),
      api.get<Exercise[]>('/language/exercises'),
    ]).then(([s, v, e]) => {
      setStats(s); setSets(v); setExercises(e);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted" />)}
    </div>
  );


  const progress = stats ? xpProgress(stats.xp, stats.level) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" />Học ngoại ngữ</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Từ vựng, bài tập tương tác, và ôn tập thông minh</p>
        </div>
        {isInstructor && (
          <Link href="/instructor/language">
            <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Quản lý nội dung</Button>
          </Link>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Level {stats.level}</span>
              </div>
              <div className="text-2xl font-bold">{stats.xp} XP</div>
              <div className="mt-2 h-1.5 bg-white/30 rounded-full">
                <div className="h-1.5 bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs opacity-70 mt-1">{progress}% → Level {stats.level + 1}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Chuỗi ngày</span></div>
              <div className="text-2xl font-bold">{stats.streak} ngày</div>
              <div className="text-xs opacity-70 mt-1">Kỷ lục: {stats.longestStreak} ngày</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Từ đã học</span></div>
              <div className="text-2xl font-bold">{stats.wordsLearned}</div>
              <div className="text-xs opacity-70 mt-1">{stats.exercisesDone} bài tập hoàn thành</div>
            </CardContent>
          </Card>
          <Link href={stats.reviewsDue > 0 ? '/language/review' : '#'} className={stats.reviewsDue > 0 ? '' : 'pointer-events-none'}>
            <Card className={`border-0 text-white h-full transition-opacity ${stats.reviewsDue > 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 hover:opacity-90' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Cần ôn tập</span></div>
                <div className="text-2xl font-bold">{stats.reviewsDue}</div>
                <div className="text-xs opacity-70 mt-1">{stats.reviewsDue > 0 ? 'Nhấn để ôn ngay!' : 'Bạn đã ôn xong'}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Quick review banner */}
      {stats && stats.reviewsDue > 0 && (
        <Link href="/language/review">
          <Card className="bg-gradient-to-r from-amber-500 to-yellow-400 border-0 text-white hover:opacity-95 transition-opacity cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <PlayCircle className="h-9 w-9 shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-base">Bắt đầu ôn tập hôm nay</div>
                <div className="text-sm opacity-90">Bạn có <strong>{stats.reviewsDue}</strong> từ sắp quên cần ôn lại ngay!</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Language Coach + IELTS + Pronunciation */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/language/pronunciation">
          <Card className="bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <Volume2 className="h-8 w-8 text-blue-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Luyện phát âm</div>
                <div className="text-sm text-muted-foreground">IPA · Luyện nói · Chấm điểm</div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/language/coach">
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <GraduationCap className="h-8 w-8 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Language Coach AI</div>
                <div className="text-sm text-muted-foreground">Writing · Listening · Speaking · Conversation</div>
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/language/ielts">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-4">
              <Star className="h-8 w-8 text-blue-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  IELTS Coach AI
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Beta</span>
                </div>
                <div className="text-sm text-muted-foreground">Writing Task 1 & 2 · Speaking Parts 1–3</div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Vocab Sets - Folder-first navigation */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bộ từ vựng</h2>
          <div className="flex gap-2">
            {isInstructor && (
              <Link href="/instructor/language">
                <Button size="sm" variant="outline"><Settings className="h-4 w-4 mr-1" />Quản lý</Button>
              </Link>
            )}
          </div>
        </div>
        {sets.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có bộ từ vựng nào. Giảng viên sẽ tạo và chia sẻ cho bạn.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {sets.map((set) => {
              const childCount = set._count.children ?? set.children?.length ?? 0;
              const prog = set.progresses[0];
              const totalItems = set._count.items;
              const learned = prog?.wordsLearned || 0;
              const pct = totalItems > 0 ? Math.round((learned / totalItems) * 100) : 0;
              return (
                <button key={set.id} type="button" onClick={() => router.push(`/language/folder/${set.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FolderOpen className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{set.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{LANG_NAMES[set.language] || set.language}</p>
                    {totalItems > 0 && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                          <span>{learned}/{totalItems} từ đã học</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full w-40">
                          <div className="h-1 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">{childCount} bộ</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Exercises */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bài tập</h2>
        </div>
        {exercises.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có bài tập nào.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {exercises.map((ex) => {
              const Icon = EXERCISE_ICONS[ex.type] || Brain;
              return (
                <Link key={ex.id} href={`/language/exercise/${ex.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold line-clamp-1">{ex.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {EXERCISE_LABEL[ex.type]} · {LANG_NAMES[ex.language] || ex.language} · {ex.level}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {ex._count.questions} câu · {ex._count.attempts} lượt làm
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Analytics + Leaderboard */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/language/analytics">
          <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-violet-600 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Phân tích học tập</div>
                <div className="text-sm text-muted-foreground">Điểm kỹ năng & tiến độ chi tiết</div>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-500 shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/language/leaderboard">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <Trophy className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Bảng xếp hạng</div>
                <div className="text-sm text-muted-foreground">Thứ hạng XP so với học viên khác</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
