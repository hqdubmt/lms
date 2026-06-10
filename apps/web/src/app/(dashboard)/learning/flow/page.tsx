'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Zap, Brain, Gamepad2, TrendingUp, Star,
  ArrowRight, ChevronRight, CheckCircle2, Circle, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Recommendation {
  subject: string;
  topic: string;
  reason: string;
  nextAction: string;
}

interface SubjectMastery {
  subject: string;
  label: string;
  score: number;
  masteryLevel: string;
}

// ─── Flow step config ────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    key: 'lesson',
    label: 'Học bài',
    desc: 'Học bài học mới theo lộ trình',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'exercise',
    label: 'Làm bài tập',
    desc: 'Luyện tập sau khi học bài',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'ai_explain',
    label: 'AI giải thích',
    desc: 'Hỏi AI nếu có lỗi sai',
    icon: Brain,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    dotColor: 'bg-rose-400',
  },
  {
    key: 'game',
    label: 'Mini Game',
    desc: 'Ôn lại kiến thức qua trò chơi',
    icon: Gamepad2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'mastery',
    label: 'Tăng Mastery',
    desc: 'Hệ thống cập nhật tiến độ',
    icon: TrendingUp,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    key: 'next',
    label: 'Bài học tiếp theo',
    desc: 'AI đề xuất bước tiếp theo',
    icon: Star,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
];

const SUBJECTS = [
  { key: 'language', label: 'Ngoại ngữ', href: '/language', color: 'bg-blue-600', gameHref: '/language/game/vocab-hunter' },
  { key: 'math',     label: 'Toán học',  href: '/math',     color: 'bg-purple-600', gameHref: '/math/game/speed-math' },
  { key: 'viet',     label: 'Tiếng Việt', href: '/viet',    color: 'bg-red-600', gameHref: '/viet/game/chinh-ta' },
];

const MASTERY_COLOR = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-indigo-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-gray-500';
};

export default function LearningFlowPage() {
  const [activeSubject, setActiveSubject] = useState('language');
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [mastery, setMastery] = useState<SubjectMastery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Recommendation>(`/learning/recommendation?subject=${activeSubject}`).catch(() => null),
      api.get<{ subjects: SubjectMastery[] }>('/learning/mastery').catch(() => null),
    ]).then(([recData, masteryData]) => {
      if (recData) setRec(recData);
      if (masteryData?.subjects) setMastery(masteryData.subjects);
    }).finally(() => setLoading(false));
  }, [activeSubject]);

  const subjectInfo = SUBJECTS.find(s => s.key === activeSubject) ?? SUBJECTS[0];
  const subjectMastery = mastery.find(m => m.subject === activeSubject);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Lộ trình học tập</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo từng bước · Không bỏ sót · Không lạc đường
        </p>
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2">
        {SUBJECTS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSubject(s.key)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              activeSubject === s.key
                ? `${s.color} text-white`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Mastery card */}
      {!loading && subjectMastery && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">{subjectMastery.label}</span>
            <span className={cn('text-sm font-bold', MASTERY_COLOR(subjectMastery.score))}>
              {subjectMastery.masteryLevel}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${subjectMastery.score}%`,
                background: activeSubject === 'language' ? '#2563EB' : activeSubject === 'math' ? '#7C3AED' : '#DC2626',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mastery: {subjectMastery.score}/100</span>
            <span className="text-indigo-600 font-medium">
              {subjectMastery.score < 20 ? 'Beginner' : subjectMastery.score < 40 ? 'Basic' : subjectMastery.score < 60 ? 'Developing' : subjectMastery.score < 80 ? 'Proficient' : 'Mastered'}
            </span>
          </div>
        </div>
      )}

      {/* AI Recommendation */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rec ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-indigo-800">{rec.topic}</p>
              <p className="text-xs text-indigo-600 mt-0.5">{rec.reason}</p>
              <div className="mt-3">
                <Link
                  href={subjectInfo.href}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {rec.nextAction}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Learning Flow Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Luồng học chuẩn</h2>
        <div className="space-y-3">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-start gap-3">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center">
                <div className={cn('h-8 w-8 rounded-xl border flex items-center justify-center shrink-0', step.color)}>
                  <step.icon className="h-4 w-4" />
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="w-0.5 h-4 bg-gray-100 my-0.5" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions per subject */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Bắt đầu ngay</h2>
        <div className="space-y-2">
          <Link
            href={subjectInfo.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Học bài</p>
              <p className="text-xs text-muted-foreground">{subjectMastery?.label ?? 'Chọn bài học'}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          <Link
            href={`/${activeSubject}/exercises`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <Zap className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Làm bài tập</p>
              <p className="text-xs text-muted-foreground">Luyện tập kiến thức</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          <Link
            href="/learning/coach"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <Brain className="h-5 w-5 text-rose-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Hỏi AI Gia sư</p>
              <p className="text-xs text-muted-foreground">Giải thích bất kỳ điều gì</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          <Link
            href={subjectInfo.gameHref}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <Gamepad2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Chơi Mini Game</p>
              <p className="text-xs text-muted-foreground">Ôn tập qua trò chơi thú vị</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>
        </div>
      </div>

      {/* XP system */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Hệ thống XP
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: 'Hoàn thành bài học', xp: '+5 XP' },
            { label: 'Làm bài tập', xp: '+10 XP' },
            { label: 'Chơi Mini Game', xp: '+10 XP' },
            { label: 'Điểm hoàn hảo', xp: '+25 XP' },
            { label: 'Streak hàng ngày', xp: '+20 XP' },
          ].map(({ label, xp }) => (
            <div key={label} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-100">
              <span className="text-xs text-gray-600">{label}</span>
              <span className="text-xs font-bold text-amber-600">{xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
