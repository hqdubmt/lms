'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen, Zap, Flame, Trophy, Star, ChevronRight, Plus, Brain,
  PlayCircle, Settings, TrendingUp, Target, BookMarked,
  Upload, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_COLOR, EXERCISE_ICONS, EXERCISE_TYPE_LABEL as EXERCISE_LABEL } from '@/constants/viet';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { VietSetView } from './set/[id]/page';

interface VietStats {
  xp: number; level: number; streak: number; longestStreak: number;
  wordsLearned: number; exercisesDone: number; reviewsDue: number;
}

interface ImportResult {
  imported: number;
  errors: Array<{ entry: string; error: string }>;
  results: Array<{ setId: string; title: string; itemsCreated: number; exercisesGenerated: number }>;
}


interface VietSet {
  id: string; title: string; category: string; grade: number; level: string;
  _count: { items: number };
  creator: { name: string };
}
interface VietExercise {
  id: string; title: string; type: string; category: string; grade: number;
  _count: { questions: number; attempts: number };
  creator: { name: string };
}


function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500, next = level * 500;
  return Math.round(((xp - base) / (next - base)) * 100);
}

export default function VietPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<VietStats | null>(null);
  const [sets, setSets] = useState<VietSet[]>([]);
  const [exercises, setExercises] = useState<VietExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // ── Smart Import state ──
  const [showSmart, setShowSmart] = useState(false);
  const [smartImporting, setSmartImporting] = useState(false);
  const [smartResult, setSmartResult] = useState<ImportResult | null>(null);
  const [smartError, setSmartError] = useState('');
  const [smartDragOver, setSmartDragOver] = useState(false);
  const [smartGrade, setSmartGrade] = useState('');
  const [smartCategory, setSmartCategory] = useState('');
  const [smartGen, setSmartGen] = useState(true);
  const smartFileRef = useRef<HTMLInputElement>(null);

  const refreshData = () =>
    Promise.all([api.get<VietSet[]>('/viet/sets'), api.get<VietExercise[]>('/viet/exercises')])
      .then(([v, e]) => { setSets(v); setExercises(e); });

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
      if (smartCategory) params.set('category', smartCategory);
      params.set('generateExercises', String(smartGen));
      const result = await api.upload<ImportResult>(`/viet/import-smart?${params}`, formData);
      setSmartResult(result);
      await refreshData();
    } catch (e: any) { setSmartError(e.message || 'Smart Import thất bại'); }
    setSmartImporting(false);
  };

  useEffect(() => {
    Promise.all([
      api.get<VietStats>('/viet/stats'),
      api.get<VietSet[]>('/viet/sets'),
      api.get<VietExercise[]>('/viet/exercises'),
    ]).then(([s, v, e]) => { setStats(s); setSets(v); setExercises(e); }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted" />)}</div>
  );

  if (selectedSetId) return <VietSetView id={selectedSetId} onBack={() => setSelectedSetId(null)} />;

  const progress = stats ? xpProgress(stats.xp, stats.level) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg,#7c1f0e 0%,#b91c1c 55%,#dc2626 100%)' }}
        className="rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-red-200/10 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="absolute right-16 bottom-0 w-32 h-32 bg-red-200/10 rounded-full translate-y-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🇻🇳</span>
              <span className="text-red-200 text-sm font-semibold">Tiếng Việt</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Xin chào, {user?.name?.split(' ').at(-1)}!</h1>
            <p className="text-white/60 text-sm">Học tiếng Việt theo phương pháp SRS — chính tả, ngữ pháp, từ vựng</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {stats && (
              <>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5"><Flame className="h-4 w-4 text-orange-300" /><span className="font-bold text-lg">{stats.streak}</span></div>
                  <p className="text-white/50 text-[10px]">Ngày liên tiếp</p>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5"><Zap className="h-4 w-4 text-yellow-300" /><span className="font-bold text-lg">{stats.xp}</span></div>
                  <p className="text-white/50 text-[10px]">XP</p>
                </div>
                <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5"><Star className="h-4 w-4 text-red-200" /><span className="font-bold text-lg">Lv.{stats.level}</span></div>
                  <p className="text-white/50 text-[10px]">Cấp độ</p>
                </div>
              </>
            )}
          </div>
        </div>
        {stats && (
          <div className="relative z-10 mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Cấp {stats.level}</span>
              <span>{stats.xp % 500}/500 XP → Cấp {stats.level + 1}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-300 to-orange-300 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/viet/review', icon: Brain, label: 'Ôn tập SRS', desc: stats?.reviewsDue ? `${stats.reviewsDue} mục` : 'Tất cả ổn!', color: 'bg-red-600', hot: (stats?.reviewsDue ?? 0) > 0 },
          { href: '/viet/sets', icon: BookMarked, label: 'Bộ bài học', desc: `${sets.length} bộ`, color: 'bg-rose-600' },
          { href: '/viet/exercises', icon: Target, label: 'Bài tập', desc: `${exercises.length} bài`, color: 'bg-orange-600' },
          { href: '/viet/leaderboard', icon: Trophy, label: 'Bảng xếp hạng', desc: 'Top học viên', color: 'bg-amber-600' },
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
            { label: 'Từ/thành ngữ đã thuộc', value: stats.wordsLearned, icon: BookOpen, color: 'text-red-600' },
            { label: 'Bài tập đã làm', value: stats.exercisesDone, icon: Target, color: 'text-orange-600' },
            { label: 'Streak dài nhất', value: stats.longestStreak, icon: TrendingUp, color: 'text-amber-500' },
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
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-orange-100/50 transition-colors"
            onClick={() => { setShowSmart(v => !v); setSmartResult(null); setSmartError(''); }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-orange-900">Smart Import (AI) — PDF / Word / Excel / PowerPoint</p>
                <p className="text-xs text-orange-600">Upload bất kỳ file giáo trình → AI tự động tạo bộ từ vựng + bài tập</p>
              </div>
            </div>
            {showSmart ? <ChevronUp className="h-4 w-4 text-orange-500" /> : <ChevronDown className="h-4 w-4 text-orange-500" />}
          </button>

          {showSmart && (
            <div className="px-5 pb-5 space-y-4 border-t border-orange-200 pt-4">
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
                  smartDragOver ? 'border-orange-500 bg-orange-100' : 'border-orange-300 bg-white hover:border-orange-400 hover:bg-orange-50',
                  smartImporting && 'pointer-events-none opacity-60',
                )}
              >
                {smartImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                    <p className="text-sm font-medium text-orange-700">AI đang phân tích và tạo nội dung…</p>
                    <p className="text-xs text-muted-foreground">Có thể mất 15–60 giây tuỳ kích thước file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-7 w-7 text-orange-400" />
                    <p className="text-sm font-medium text-gray-700">Kéo thả file giáo trình vào đây</p>
                    <p className="text-xs text-muted-foreground">PDF · Word (.docx) · Excel (.xlsx) · PowerPoint (.pptx) · TXT</p>
                    <p className="text-xs text-orange-600 font-medium">Không cần theo mẫu — AI tự hiểu nội dung</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Lớp (gợi ý cho AI)</label>
                  <select value={smartGrade} onChange={e => setSmartGrade(e.target.value)}
                    className="w-full text-sm border border-orange-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-orange-300 outline-none">
                    <option value="">Tự động nhận diện</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Thể loại (gợi ý cho AI)</label>
                  <select value={smartCategory} onChange={e => setSmartCategory(e.target.value)}
                    className="w-full text-sm border border-orange-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-orange-300 outline-none">
                    <option value="">Tự động nhận diện</option>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={smartGen} onChange={e => setSmartGen(e.target.checked)}
                      className="h-4 w-4 rounded accent-orange-600" />
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
                      AI tạo {smartResult.imported} bộ bài học
                      {smartResult.results.reduce((s, r) => s + r.exercisesGenerated, 0) > 0 &&
                        `, ${smartResult.results.reduce((s, r) => s + r.exercisesGenerated, 0)} bài tập`}
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {smartResult.results.map((r, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium truncate mr-2">{r.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(r as any).itemsCreated ?? (r as any).conceptsCreated} mục · {r.exercisesGenerated} bài tập
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

      {/* ── Sets ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Bộ bài học</h2>
          <div className="flex items-center gap-2">
            {isInstructor && (
              <Link href="/instructor/viet" className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors">
                <Settings className="h-3.5 w-3.5" />Quản lý
              </Link>
            )}
            <Link href="/viet/sets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
              Xem tất cả<ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <span className="text-4xl mb-3 block">🇻🇳</span>
            <p className="text-muted-foreground text-sm">Chưa có bộ bài học nào</p>
            {isInstructor && (
              <Link href="/instructor/viet" className="mt-2 inline-block text-sm text-red-600 hover:underline font-medium">+ Tạo bộ bài học đầu tiên</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.slice(0, 6).map((set) => (
              <button key={set.id} type="button" onClick={() => setSelectedSetId(set.id)}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 group text-left">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('text-xs font-semibold px-2 py-1 rounded-lg', CATEGORY_COLOR[set.category] || 'bg-gray-100 text-gray-600')}>
                    {CATEGORY_LABEL[set.category] || set.category}
                  </div>
                  <span className="text-xs text-muted-foreground">Lớp {set.grade}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">{set.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>{set._count.items} mục</span>
                  <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" />Học ngay</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Exercises ── */}
      {exercises.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bài tập nổi bật</h2>
            <Link href="/viet/exercises" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
              Xem tất cả<ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercises.slice(0, 4).map((ex) => {
              const Icon = EXERCISE_ICONS[ex.type] || Brain;
              return (
                <Link key={ex.id} href={`/viet/exercise/${ex.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-red-600 transition-colors">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">{EXERCISE_LABEL[ex.type]} · {ex._count.questions} câu · {ex._count.attempts} lần làm</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-red-600 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Categories ── */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Khám phá theo chủ đề</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
            <Link key={key} href={`/viet/sets?category=${key}`}
              className={cn('rounded-xl px-3 py-2.5 text-center text-sm font-semibold hover:opacity-90 transition-opacity', CATEGORY_COLOR[key] || 'bg-gray-100 text-gray-600')}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
