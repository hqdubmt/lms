'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Gamepad2, BookOpen, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Recommendation {
  subject: string;
  topic: string;
  reason: string;
  nextAction: string;
}

interface MasteryResult {
  newProgress: number;
  masteryDelta: number;
  masteryLevel: string;
  reviewRequired: boolean;
}

interface FlowNextStepProps {
  subject?: 'language' | 'math' | 'viet' | 'general';
  score: number;           // 0-100
  xpEarned: number;
  activityType?: 'lesson' | 'exercise' | 'game';
  topic?: string;
  className?: string;
}

const GAME_LINKS: Record<string, string> = {
  language: '/language/game/sentence-builder',
  math: '/math/game/speed-math',
  viet: '/viet/game/ghep-tu',
  general: '/game',
};

const AI_EXPLAIN_LINK = '/learning/coach';

const STEP_AFTER: Record<string, { label: string; icon: React.ElementType; color: string; href: (subject: string) => string }> = {
  lesson: {
    label: 'Làm bài tập ngay',
    icon: Zap,
    color: 'bg-indigo-600 hover:bg-indigo-700',
    href: (s) => s === 'language' ? '/language/exercises' : s === 'math' ? '/math/exercises' : s === 'viet' ? '/viet/exercises' : '/quiz',
  },
  exercise_failed: {
    label: 'Hỏi AI Gia sư',
    icon: Brain,
    color: 'bg-rose-600 hover:bg-rose-700',
    href: () => AI_EXPLAIN_LINK,
  },
  exercise_passed: {
    label: 'Chơi Mini Game',
    icon: Gamepad2,
    color: 'bg-emerald-600 hover:bg-emerald-700',
    href: (s) => GAME_LINKS[s] ?? '/game',
  },
  game: {
    label: 'Xem đề xuất học',
    icon: TrendingUp,
    color: 'bg-purple-600 hover:bg-purple-700',
    href: () => '/learning',
  },
};

export function FlowNextStep({ subject = 'general', score, xpEarned, activityType = 'game', topic, className }: FlowNextStepProps) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [mastery, setMastery] = useState<MasteryResult | null>(null);

  useEffect(() => {
    // Cập nhật mastery
    api.post<MasteryResult>('/learning/mastery/update', {
      subject,
      topic,
      score,
    }).then(setMastery).catch(() => {});

    // Lấy recommendation
    api.get<Recommendation>(`/learning/recommendation?subject=${subject}`)
      .then(setRec)
      .catch(() => {});
  }, [subject, score, topic]);

  // Xác định bước tiếp theo
  let stepKey: string;
  if (activityType === 'lesson') stepKey = 'lesson';
  else if (activityType === 'exercise') stepKey = score >= 50 ? 'exercise_passed' : 'exercise_failed';
  else stepKey = 'game';

  const step = STEP_AFTER[stepKey];

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 p-5 space-y-4', className)}>
      {/* Score + XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-semibold text-sm">Hoàn thành!</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-600 font-bold">
          <Zap className="h-4 w-4" /> +{xpEarned} XP
        </div>
      </div>

      {/* Mastery update */}
      {mastery && (
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Mastery cập nhật</p>
            <p className="text-sm font-semibold">{mastery.masteryLevel} · {mastery.newProgress}%</p>
          </div>
          {mastery.masteryDelta > 0 && (
            <span className="text-xs font-bold text-green-600">+{mastery.masteryDelta}</span>
          )}
          {mastery.reviewRequired && (
            <span className="text-xs font-bold text-rose-600">Cần ôn tập</span>
          )}
        </div>
      )}

      {/* Divider + Next step label */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Bước tiếp theo trong lộ trình</p>

        {/* AI recommendation */}
        {rec && (
          <div className="bg-indigo-50 rounded-xl p-3 mb-3 text-sm">
            <p className="font-medium text-indigo-800 truncate">{rec.topic}</p>
            <p className="text-xs text-indigo-600 mt-0.5">{rec.reason}</p>
          </div>
        )}

        {/* Primary CTA */}
        <Link
          href={step.href(subject)}
          className={cn('w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition-colors', step.color)}
        >
          <step.icon className="h-4 w-4" />
          {step.label}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Link>

        {/* Secondary: if exercise failed, also show game after AI */}
        {activityType === 'exercise' && score < 50 && (
          <Link
            href={GAME_LINKS[subject] ?? '/game'}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Gamepad2 className="h-4 w-4" />
            Hoặc luyện tập qua Game
          </Link>
        )}

        {/* Dashboard link */}
        <Link
          href="/dashboard"
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-gray-700 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Về Dashboard
        </Link>
      </div>
    </div>
  );
}
