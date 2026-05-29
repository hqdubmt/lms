'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Calculator, Zap, Flame, Trophy, Star, ChevronRight,
  BookOpen, Brain,
  Settings, Target, TrendingUp,
  Upload, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { SUBJECT_LABEL, SUBJECT_COLOR, SUBJECT_OPTIONS, EXERCISE_ICONS, EXERCISE_TYPE_LABEL as EXERCISE_LABEL } from '@/constants/math';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface MathStats {
  xp: number; level: number; streak: number; longestStreak: number;
  conceptsLearned: number; exercisesDone: number; reviewsDue: number;
}
interface MathTopic {
  id: string; title: string; subject: string; grade: number; level: string;
  _count: { concepts: number; exercises: number };
  creator: { name: string };
}
interface MathExercise {
  id: string; title: string; type: string; subject: string; grade: number;
  _count: { questions: number; attempts: number };
  creator: { name: string };
}

interface ImportResult {
  imported: number;
  errors: Array<{ entry: string; error: string }>;
  results: Array<{ topicId: string; title: string; conceptsCreated: number; exercisesGenerated: number }>;
}



function xpToNextLevel(level: number) { return level * 500; }
function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500;
  const next = level * 500;
  return Math.round(((xp - base) / (next - base)) * 100);
}

export default function MathPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<MathStats | null>(null);
  const [topics, setTopics] = useState<MathTopic[]>([]);
  const [exercises, setExercises] = useState<MathExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  // ── Smart Import state ──
  const [showSmart, setShowSmart] = useState(false);
  const [smartImporting, setSmartImporting] = useState(false);
  const [smartResult, setSmartResult] = useState<ImportResult | null>(null);
  const [smartError, setSmartError] = useState('');
  const [smartDragOver, setSmartDragOver] = useState(false);
  const [smartGrade, setSmartGrade] = useState('');
  const [smartSubject, setSmartSubject] = useState('');
  const [smartGen, setSmartGen] = useState(true);
  const smartFileRef = useRef<HTMLInputElement>(null);

  const refreshData = () =>
    Promise.all([api.get<MathTopic[]>('/math/topics'), api.get<MathExercise[]>('/math/exercises')])
      .then(([t, e]) => { setTopics(t); setExercises(e); });

  const handleSmartImport = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'txt', 'md'];
    if (!ext || !allowed.includes(ext)) {
      setSmartError(`Định dạng không hỗ trợ. Chấp nhận: ${allowed.join(', ')}`); return;
    }
    setSmartImporting(true); setSmartResult(null); setSmartError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const params = new URLSearchParams();
      if (smartGrade) params.set('grade', smartGrade);
      if (smartSubject) params.set('subject', smartSubject);
      params.set('generateExercises', String(smartGen));
      const result = await api.upload<ImportResult>(`/math/import-smart?${params}`, formData);
      setSmartResult(result);
      await refreshData();
    } catch (e: any) { setSmartError(e.message || 'Smart Import thất bại'); }
    setSmartImporting(false);
  };

  useEffect(() => {
    Promise.all([
      api.get<MathStats>('/math/stats'),
      api.get<MathTopic[]>('/math/topics'),
      api.get<MathExercise[]>('/math/exercises'),
    ]).then(([s, t, e]) => {
      setStats(s); setTopics(t); setExercises(e);
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
      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)' }}
        className="rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-400/10 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="absolute right-16 bottom-0 w-32 h-32 bg-indigo-400/10 rounded-full translate-y-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-5 w-5 text-blue-300" />
              <span className="text-blue-300 text-sm font-semibold">Toán học</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Xin chào, {user?.name?.split(' ').at(-1)}!</h1>
            <p className="text-white/60 text-sm">Học toán theo phương pháp SRS — hiểu sâu, nhớ lâu</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {stats && (
              <>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="font-bold text-lg">{stats.streak}</span>
                  </div>
                  <p className="text-white/50 text-[10px]">Ngày liên tiếp</p>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="font-bold text-lg">{stats.xp}</span>
                  </div>
                  <p className="text-white/50 text-[10px]">XP</p>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5">
                    <Star className="h-4 w-4 text-blue-300" />
                    <span className="font-bold text-lg">Lv.{stats.level}</span>
                  </div>
                  <p className="text-white/50 text-[10px]">Cấp độ</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* XP bar */}
        {stats && (
          <div className="relative z-10 mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Cấp {stats.level}</span>
              <span>{stats.xp % 500}/{xpToNextLevel(stats.level)} XP → Cấp {stats.level + 1}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/math/review', icon: Brain, label: 'Ôn tập SRS', desc: stats?.reviewsDue ? `${stats.reviewsDue} khái niệm` : 'Tất cả ổn!', color: 'bg-blue-600', hot: (stats?.reviewsDue ?? 0) > 0 },
          { href: '/math/topics', icon: BookOpen, label: 'Chủ đề', desc: `${topics.length} chủ đề`, color: 'bg-indigo-600' },
          { href: '/math/exercises', icon: Target, label: 'Bài tập', desc: `${exercises.length} bài tập`, color: 'bg-violet-600' },
          { href: '/math/leaderboard', icon: Trophy, label: 'Bảng xếp hạng', desc: 'Top học viên', color: 'bg-amber-600' },
          { href: '/math/profile', icon: TrendingUp, label: 'Hồ sơ học tập', desc: 'Điểm mạnh / yếu', color: 'bg-emerald-600' },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="relative bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 group">
            {a.hot && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white', a.color)}>
              <a.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{a.label}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Khái niệm đã học', value: stats.conceptsLearned, icon: BookOpen, color: 'text-blue-600' },
            { label: 'Bài tập đã làm', value: stats.exercisesDone, icon: Target, color: 'text-violet-600' },
            { label: 'Streak dài nhất', value: stats.longestStreak, icon: TrendingUp, color: 'text-orange-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={cn('h-4 w-4', s.color)} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Smart Import Panel (instructor only) ── */}
      {isInstructor && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-violet-100/50 transition-colors"
            onClick={() => { setShowSmart(v => !v); setSmartResult(null); setSmartError(''); }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-violet-900">Smart Import (AI) — PDF / Word / Excel / PowerPoint</p>
                <p className="text-xs text-violet-600">Upload bất kỳ file giáo trình → AI tự động tạo chủ đề + bài tập</p>
              </div>
            </div>
            {showSmart ? <ChevronUp className="h-4 w-4 text-violet-500" /> : <ChevronDown className="h-4 w-4 text-violet-500" />}
          </button>

          {showSmart && (
            <div className="px-5 pb-5 space-y-4 border-t border-violet-200 pt-4">
              <input ref={smartFileRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.md" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleSmartImport(f); e.target.value = ''; }} />

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setSmartDragOver(true); }}
                onDragLeave={() => setSmartDragOver(false)}
                onDrop={e => { e.preventDefault(); setSmartDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleSmartImport(f); }}
                onClick={() => !smartImporting && smartFileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  smartDragOver ? 'border-violet-500 bg-violet-100' : 'border-violet-300 bg-white hover:border-violet-400 hover:bg-violet-50',
                  smartImporting && 'pointer-events-none opacity-60',
                )}
              >
                {smartImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                    <p className="text-sm font-medium text-violet-700">AI đang phân tích và tạo nội dung…</p>
                    <p className="text-xs text-muted-foreground">Có thể mất 15–60 giây tuỳ kích thước file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-violet-400">
                      <Upload className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Kéo thả file giáo trình vào đây</p>
                    <p className="text-xs text-muted-foreground">PDF · Word (.docx) · Excel (.xlsx) · PowerPoint (.pptx) · TXT</p>
                    <p className="text-xs text-violet-600 font-medium">Không cần theo mẫu — AI tự hiểu nội dung</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Lớp (gợi ý cho AI)</label>
                  <select value={smartGrade} onChange={e => setSmartGrade(e.target.value)}
                    className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-300 outline-none">
                    <option value="">Tự động nhận diện</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Môn (gợi ý cho AI)</label>
                  <select value={smartSubject} onChange={e => setSmartSubject(e.target.value)}
                    className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-violet-300 outline-none">
                    <option value="">Tự động nhận diện</option>
                    {Object.entries(SUBJECT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={smartGen} onChange={e => setSmartGen(e.target.checked)}
                      className="h-4 w-4 rounded accent-violet-600" />
                    <span className="text-sm font-medium text-gray-700">Tạo bài tập</span>
                  </label>
                </div>
              </div>

              {/* Error */}
              {smartError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{smartError}</p>
                </div>
              )}

              {/* Result */}
              {smartResult && (
                <div className="bg-white border border-green-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-800">
                      AI tạo {smartResult.imported} chủ đề
                      {smartResult.results.reduce((s, r) => s + r.exercisesGenerated, 0) > 0 &&
                        `, ${smartResult.results.reduce((s, r) => s + r.exercisesGenerated, 0)} bài tập`}
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {smartResult.results.map((r, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium truncate mr-2">{r.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {r.conceptsCreated} khái niệm · {r.exercisesGenerated} bài tập
                        </span>
                      </li>
                    ))}
                  </ul>
                  {smartResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-red-600">{smartResult.errors.length} lỗi:</p>
                      {smartResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{e.entry}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Topics grouped by subject (folder-first) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Chủ đề toán học</h2>
          <div className="flex items-center gap-2">
            {isInstructor && (
              <Link href="/instructor/math"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                <Settings className="h-3.5 w-3.5" />Quản lý
              </Link>
            )}
            <Link href="/math/topics" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
              Xem tất cả<ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <Calculator className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Chưa có chủ đề nào</p>
            {isInstructor && (
              <Link href="/instructor/math" className="mt-2 inline-block text-sm text-blue-600 hover:underline font-medium">
                + Tạo chủ đề đầu tiên
              </Link>
            )}
          </div>
        ) : (() => {
          // Group topics by subject
          const subjectMap: Record<string, number> = {};
          topics.forEach(t => { subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1; });
          // Show subjects that have topics first, then the rest
          const orderedSubjects = SUBJECT_OPTIONS.filter(s => subjectMap[s.value] > 0);
          return (
            <div className="space-y-2">
              {orderedSubjects.map((subj) => (
                <Link key={subj.value} href={`/math/topics?subject=${subj.value}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{subj.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{subjectMap[subj.value]} chủ đề</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg', SUBJECT_COLOR[subj.value] || 'bg-gray-100 text-gray-600')}>
                      {subjectMap[subj.value]} chủ đề
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── Exercises ── */}
      {exercises.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bài tập nổi bật</h2>
            <Link href="/math/exercises" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
              Xem tất cả<ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercises.slice(0, 4).map((ex) => {
              const Icon = EXERCISE_ICONS[ex.type] || Brain;
              return (
                <Link key={ex.id} href={`/math/exercise/${ex.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">{EXERCISE_LABEL[ex.type]} · {ex._count.questions} câu · {ex._count.attempts} lần làm</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-blue-600 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
