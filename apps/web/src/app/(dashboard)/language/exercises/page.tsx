'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, ChevronRight, Filter, Gamepad2, Headphones, Mic, PenLine, Shuffle, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { EXERCISE_ICONS, EXERCISE_TYPE_LABEL, LANG_NAMES, LEVELS } from '@/constants/language';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  title: string;
  type: string;
  language: string;
  level: string;
  vocabSetId: string | null;
  _count: { questions: number; attempts: number };
  creator: { name: string };
}

// ── Derived mappings ────────────────────────────────────────────────
const TYPE_TO_SKILL: Record<string, string> = {
  DICTATION:        'listening',
  WORD_ORDER:       'speaking',
  MULTIPLE_CHOICE:  'reading',
  MATCHING:         'reading',
  FILL_BLANK:       'writing',
};

const LEVEL_TO_AGE: Record<string, string> = {
  A1: 'kids',
  A2: 'teen',
  B1: 'teen',
  B2: 'adult',
  C1: 'adult',
  C2: 'adult',
};

// ── Filter options ──────────────────────────────────────────────────
const SKILL_OPTS = [
  { key: '', label: 'Tất cả', icon: Filter },
  { key: 'listening', label: 'Nghe',  icon: Headphones },
  { key: 'speaking',  label: 'Nói',   icon: Mic },
  { key: 'reading',   label: 'Đọc',   icon: Brain },
  { key: 'writing',   label: 'Viết',  icon: PenLine },
];

const TYPE_OPTS = [
  { key: '', label: 'Tất cả' },
  { key: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm' },
  { key: 'FILL_BLANK',      label: 'Điền từ' },
  { key: 'MATCHING',        label: 'Ghép cặp' },
  { key: 'WORD_ORDER',      label: 'Sắp xếp câu' },
  { key: 'DICTATION',       label: 'Nghe viết' },
];

const LEVEL_OPTS = [{ key: '', label: 'Tất cả' }, ...LEVELS.map(l => ({ key: l, label: l }))];

const AGE_OPTS = [
  { key: '',      label: 'Tất cả',    emoji: '' },
  { key: 'kids',  label: 'Thiếu nhi', emoji: '🧒' },
  { key: 'teen',  label: 'Thiếu niên',emoji: '🧑' },
  { key: 'adult', label: 'Người lớn', emoji: '👩‍💼' },
];

const GAME_OPTS = [
  { key: '',     label: 'Tất cả' },
  { key: 'game', label: '🎮 Có gamification' },
];

// ── Filter chip row component ──────────────────────────────────────
function FilterRow<T extends { key: string; label: string }>({
  label, options, value, onChange,
}: {
  label: string;
  options: T[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-gray-400 shrink-0 w-16">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {options.map(o => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border',
              value === o.key
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600'
            )}
          >
            {'emoji' in o && (o as any).emoji ? `${(o as any).emoji} ` : ''}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Skill badge colors ─────────────────────────────────────────────
const SKILL_COLOR: Record<string, string> = {
  listening: 'bg-blue-100 text-blue-700',
  speaking:  'bg-green-100 text-green-700',
  reading:   'bg-amber-100 text-amber-700',
  writing:   'bg-rose-100 text-rose-700',
};
const SKILL_LABEL: Record<string, string> = {
  listening: 'Nghe', speaking: 'Nói', reading: 'Đọc', writing: 'Viết',
};

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-sky-100 text-sky-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-purple-100 text-purple-700',
  C2: 'bg-rose-100 text-rose-700',
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [fSkill,  setFSkill]  = useState('');
  const [fType,   setFType]   = useState('');
  const [fLevel,  setFLevel]  = useState('');
  const [fAge,    setFAge]    = useState('');
  const [fGame,   setFGame]   = useState('');

  useEffect(() => {
    api.get<Exercise[]>('/language/exercises')
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const skill = TYPE_TO_SKILL[ex.type] ?? 'reading';
      const age   = LEVEL_TO_AGE[ex.level] ?? 'adult';
      const isGame = ex.vocabSetId !== null;

      if (fSkill && skill !== fSkill) return false;
      if (fType  && ex.type !== fType) return false;
      if (fLevel && ex.level !== fLevel) return false;
      if (fAge   && age !== fAge) return false;
      if (fGame === 'game' && !isGame) return false;
      return true;
    });
  }, [exercises, fSkill, fType, fLevel, fAge, fGame]);

  const activeCount = [fSkill, fType, fLevel, fAge, fGame].filter(Boolean).length;

  const resetAll = () => {
    setFSkill(''); setFType(''); setFLevel(''); setFAge(''); setFGame('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/language" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Bài tập Ngoại ngữ</h1>
          <p className="text-sm text-gray-500">{filtered.length} bài tập</p>
        </div>
        {activeCount > 0 && (
          <button onClick={resetAll}
            className="ml-auto text-xs text-violet-600 font-semibold hover:underline">
            Xoá filter ({activeCount})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <FilterRow label="Kỹ năng" options={SKILL_OPTS} value={fSkill} onChange={setFSkill} />
        <FilterRow label="Dạng bài" options={TYPE_OPTS}  value={fType}  onChange={setFType} />
        <FilterRow label="Trình độ" options={LEVEL_OPTS} value={fLevel} onChange={setFLevel} />
        <FilterRow label="Độ tuổi"  options={AGE_OPTS}   value={fAge}   onChange={setFAge} />
        <FilterRow label="AI Game"  options={GAME_OPTS}  value={fGame}  onChange={setFGame} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Không có bài tập nào khớp với filter.</p>
          <button onClick={resetAll} className="mt-3 text-sm text-violet-600 hover:underline">
            Xoá filter
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(ex => {
            const Icon = EXERCISE_ICONS[ex.type] || Brain;
            const skill = TYPE_TO_SKILL[ex.type] ?? 'reading';
            const isGame = ex.vocabSetId !== null;
            return (
              <Link key={ex.id} href={`/language/exercise/${ex.id}`}>
                <div className="rounded-2xl border bg-white p-4 hover:shadow-md transition-shadow flex items-start gap-3 h-full">
                  <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{ex.title}</p>

                    {/* Tag row */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', SKILL_COLOR[skill])}>
                        {SKILL_LABEL[skill]}
                      </span>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', LEVEL_COLOR[ex.level] ?? 'bg-gray-100 text-gray-600')}>
                        {ex.level}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {EXERCISE_TYPE_LABEL[ex.type] ?? ex.type}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {LANG_NAMES[ex.language] ?? ex.language}
                      </span>
                      {isGame && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5">
                          <Gamepad2 className="w-2.5 h-2.5" />Game
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {ex._count.questions} câu · {ex._count.attempts} lượt · {ex.creator.name}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Summary by group */}
      {!loading && filtered.length > 0 && !fSkill && !fType && !fLevel && !fAge && !fGame && (
        <div className="rounded-2xl border bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Tổng quan</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {(['listening','speaking','reading','writing'] as const).map(sk => {
              const count = exercises.filter(e => TYPE_TO_SKILL[e.type] === sk).length;
              return (
                <button key={sk} onClick={() => setFSkill(sk)}
                  className="rounded-xl bg-white border p-3 hover:border-violet-300 transition">
                  <p className="text-xl font-black text-gray-800">{count}</p>
                  <p className={cn('text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full inline-block', SKILL_COLOR[sk])}>
                    {SKILL_LABEL[sk]}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center mt-3">
            {AGE_OPTS.slice(1).map(a => {
              const count = exercises.filter(e => LEVEL_TO_AGE[e.level] === a.key).length;
              return (
                <button key={a.key} onClick={() => setFAge(a.key)}
                  className="rounded-xl bg-white border p-3 hover:border-violet-300 transition">
                  <p className="text-xl font-black text-gray-800">{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.emoji} {a.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
