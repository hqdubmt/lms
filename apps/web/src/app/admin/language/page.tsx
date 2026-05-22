'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus, BookOpen, Brain,
  Edit, Trash2, Globe, ChevronRight, Loader2, X, Zap, Flame, Star,
} from 'lucide-react';
import { EXERCISE_ICONS, EXERCISE_TYPE_LABEL, LEVELS, LANGUAGES, LANG_NAMES } from '@/constants/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface LangStats {
  xp: number; level: number; streak: number; longestStreak: number;
  wordsLearned: number; exercisesDone: number; reviewsDue: number;
}
interface VocabSet {
  id: string; title: string; language: string; level: string; isPublic: boolean;
  _count: { items: number }; creator: { name: string };
  progresses: { wordsLearned: number; lastStudied: string }[];
}
interface Exercise {
  id: string; title: string; type: string; language: string; level: string; isPublic: boolean;
  _count: { questions: number; attempts: number }; creator: { name: string };
}

const EXERCISE_TYPES = Object.keys(EXERCISE_TYPE_LABEL) as (keyof typeof EXERCISE_TYPE_LABEL)[];

function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500;
  const next = level * 500;
  return Math.round(((xp - base) / (next - base)) * 100);
}

export default function AdminLanguagePage() {
  const [stats, setStats] = useState<LangStats | null>(null);
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [showVocabForm, setShowVocabForm] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vLang, setVLang] = useState('en');
  const [vLevel, setVLevel] = useState('A1');
  const [vDesc, setVDesc] = useState('');
  const [vCreating, setVCreating] = useState(false);
  const [vError, setVError] = useState('');

  const [showExForm, setShowExForm] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eLang, setELang] = useState('en');
  const [eLevel, setELevel] = useState('A1');
  const [eType, setEType] = useState<string>('MULTIPLE_CHOICE');
  const [eDesc, setEDesc] = useState('');
  const [eCreating, setECreating] = useState(false);
  const [eError, setEError] = useState('');

  const load = async () => {
    setLoading(true);
    const [s, v, e] = await Promise.all([
      api.get<LangStats>('/language/stats').catch(() => null),
      api.get<VocabSet[]>('/language/vocab-sets').catch(() => []),
      api.get<Exercise[]>('/language/exercises').catch(() => []),
    ]);
    setStats(s); setSets(v as VocabSet[]); setExercises(e as Exercise[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createVocabSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vTitle.trim()) return;
    setVCreating(true);
    setVError('');
    try {
      const created = await api.post<{ id: string }>('/language/vocab-sets', { title: vTitle, language: vLang, level: vLevel, description: vDesc });
      window.location.href = `/admin/language/vocab/${created.id}`;
    } catch (err: any) {
      setVError(err.message || 'Tạo bộ từ vựng thất bại');
    }
    setVCreating(false);
  };

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eTitle.trim()) return;
    setECreating(true);
    setEError('');
    try {
      const ex = await api.post<{ id: string }>('/language/exercises', { title: eTitle, language: eLang, level: eLevel, type: eType, description: eDesc, questions: [] });
      window.location.href = `/admin/language/exercise/${ex.id}`;
    } catch (err: any) {
      setEError(err.message || 'Tạo bài tập thất bại');
    }
    setECreating(false);
  };

  const deleteVocabSet = async (id: string) => {
    if (!confirm('Xóa bộ từ vựng này?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.delete(`/language/vocab-sets/${id}`); setSets(s => s.filter(x => x.id !== id)); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

  const deleteExercise = async (id: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try { await api.delete(`/language/exercises/${id}`); setExercises(s => s.filter(x => x.id !== id)); } catch { }
    setBusy(b => ({ ...b, [id]: false }));
  };

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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6 text-primary" />Ngoại ngữ</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý bộ từ vựng và bài tập cho học viên</p>
        </div>
      </div>

      {/* Stats */}
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
          <Card className={`border-0 text-white ${stats.reviewsDue > 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4" /><span className="text-xs font-medium opacity-80">Cần ôn tập</span></div>
              <div className="text-2xl font-bold">{stats.reviewsDue}</div>
              <div className="text-xs opacity-70 mt-1">{stats.reviewsDue > 0 ? 'Từ sắp quên!' : 'Đã ôn xong'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vocab Sets */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bộ từ vựng ({sets.length})</h2>
          <Button size="sm" onClick={() => { setShowVocabForm(v => !v); setShowExForm(false); }}>
            <Plus className="h-4 w-4 mr-1" />Tạo bộ từ vựng
          </Button>
        </div>

        {showVocabForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tạo bộ từ vựng mới</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowVocabForm(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={createVocabSet} className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Tên bộ từ vựng *</label>
                  <Input value={vTitle} onChange={e => setVTitle(e.target.value)} placeholder="VD: Từ vựng IELTS Band 6.0" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ngôn ngữ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={vLang} onChange={e => setVLang(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Trình độ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={vLevel} onChange={e => setVLevel(e.target.value)}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Mô tả</label>
                  <Input value={vDesc} onChange={e => setVDesc(e.target.value)} placeholder="Mô tả ngắn..." />
                </div>
                {vError && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{vError}</p>}
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={vCreating}>
                    {vCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo và thêm từ
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowVocabForm(false)}>Hủy</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {sets.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có bộ từ vựng nào.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.map((set) => {
              const prog = set.progresses?.[0];
              const pct = set._count.items > 0 ? Math.round(((prog?.wordsLearned || 0) / set._count.items) * 100) : 0;
              return (
                <Card key={set.id} className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold line-clamp-1">{set.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{LANG_NAMES[set.language] || set.language}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">{set.level}</Badge>
                        <Link href={`/admin/language/vocab/${set.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={busy[set.id]} onClick={() => deleteVocabSet(set.id)}>
                          {busy[set.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto">
                      <BookOpen className="h-3.5 w-3.5" />{set._count.items} từ
                    </div>
                    {set._count.items > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{prog?.wordsLearned || 0}/{set._count.items} đã học</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">bởi {set.creator.name}</span>
                      <Link href={`/language/vocab/${set.id}`} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        Học thử <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Exercises */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Bài tập ({exercises.length})</h2>
          <Button size="sm" onClick={() => { setShowExForm(v => !v); setShowVocabForm(false); }}>
            <Plus className="h-4 w-4 mr-1" />Tạo bài tập
          </Button>
        </div>

        {showExForm && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tạo bài tập mới</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowExForm(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={createExercise} className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Tên bài tập *</label>
                  <Input value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="VD: Trắc nghiệm từ vựng chủ đề Du lịch" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Loại bài tập</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eType} onChange={e => setEType(e.target.value)}>
                    {EXERCISE_TYPES.map(t => <option key={t} value={t}>{EXERCISE_TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ngôn ngữ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eLang} onChange={e => setELang(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Trình độ</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={eLevel} onChange={e => setELevel(e.target.value)}>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Mô tả</label>
                  <Input value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Mô tả bài tập..." />
                </div>
                {eError && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{eError}</p>}
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={eCreating}>
                    {eCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo và thêm câu hỏi
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowExForm(false)}>Hủy</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {exercises.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có bài tập nào.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {exercises.map((ex) => {
              const Icon = EXERCISE_ICONS[ex.type] || Brain;
              return (
                <Card key={ex.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{ex.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {EXERCISE_TYPE_LABEL[ex.type]} · {LANG_NAMES[ex.language] || ex.language} · {ex.level}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {ex._count.questions} câu · {ex._count.attempts} lượt làm
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link href={`/admin/language/exercise/${ex.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={busy[ex.id]} onClick={() => deleteExercise(ex.id)}>
                        {busy[ex.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
