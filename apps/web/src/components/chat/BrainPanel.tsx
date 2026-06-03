'use client';

import { useEffect, useState } from 'react';
import {
  Check, AlertCircle, Lightbulb, HelpCircle,
  BookOpen, Map, ChevronRight, Clock, Zap, Network,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Subject, KnowledgeGap, Recommendation } from './types';

interface LearningStep {
  type: 'review' | 'lesson' | 'quiz' | 'practice' | 'milestone';
  title: string;
  id?: string;
  status: 'current' | 'next' | 'upcoming' | 'done';
  description?: string;
}

interface LearningPath {
  steps: LearningStep[];
  avgMastery: number;
  estimatedMinutes: number;
}

interface DifficultyResult {
  level: 'easy' | 'medium' | 'hard';
  avgMastery: number;
  reason: string;
  recommendation: string;
}

interface KGConcept {
  id: string;
  label: string;
  weight: number;
  children: string[];
}

interface BrainPanelProps {
  subject: Subject;
  onSendMessage: (text: string) => void;
}

type Tab = 'analysis' | 'path' | 'difficulty';

const STEP_ICON: Record<string, React.ElementType> = {
  review:    AlertCircle,
  lesson:    BookOpen,
  quiz:      HelpCircle,
  practice:  ChevronRight,
  milestone: Check,
};

const STATUS_STYLE: Record<string, string> = {
  current:  'border-primary bg-primary/5 text-primary',
  next:     'border-blue-300 bg-blue-50 text-blue-700',
  upcoming: 'border-gray-200 bg-gray-50 text-gray-500',
  done:     'border-green-300 bg-green-50 text-green-700',
};

const DIFFICULTY_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  easy:   { label: 'Dễ', color: 'text-green-700', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' },
  medium: { label: 'Trung bình', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', bar: 'bg-yellow-500' },
  hard:   { label: 'Khó', color: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' },
};

export function BrainPanel({ subject, onSendMessage }: BrainPanelProps) {
  const [tab, setTab] = useState<Tab>('analysis');
  const [gap, setGap] = useState<KnowledgeGap | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyResult | null>(null);
  const [kgConcepts, setKgConcepts] = useState<KGConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    setLoading(true);
    Promise.all([
      api.get<KnowledgeGap>(`/ai/knowledge-gap?subject=${subject}`).catch(() => null),
      api.get<Recommendation>(`/ai/recommendations?subject=${subject}`).catch(() => null),
      api.get<LearningPath>(`/ai/learning-path?subject=${subject}`).catch(() => null),
      api.get<DifficultyResult>(`/ai/difficulty?subject=${subject}`).catch(() => null),
      api.get<{ concepts: KGConcept[] }>(`/ai/knowledge-graph/topic?subject=${subject}`).catch(() => null),
    ]).then(([g, r, p, d, kg]) => {
      setGap(g);
      setRec(r);
      setPath(p);
      setDifficulty(d);
      setKgConcepts(kg?.concepts ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subject, loaded]);

  if (loading) {
    return <div className="px-3 py-2 text-xs text-gray-400 text-center">Đang phân tích tiến độ...</div>;
  }

  const hasAnalysis = (gap?.weak.length ?? 0) > 0 || (gap?.strong.length ?? 0) > 0 || rec?.reasons.length;
  const hasPath = (path?.steps?.length ?? 0) > 0;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('analysis')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'analysis' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <AlertCircle className="h-3 w-3" />Phân tích
        </button>
        <button
          onClick={() => setTab('path')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'path' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Map className="h-3 w-3" />Lộ trình
        </button>
        <button
          onClick={() => setTab('difficulty')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors',
            tab === 'difficulty' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600',
          )}
        >
          <Zap className="h-3 w-3" />Độ khó
        </button>
      </div>

      {/* Analysis tab */}
      {tab === 'analysis' && (
        <div className="space-y-2 px-3 py-2">
          {!hasAnalysis ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI phân tích điểm mạnh/yếu của bạn.
            </div>
          ) : (
            <>
              {gap && gap.weak.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-500 mb-1">
                    <AlertCircle className="h-3 w-3" />Cần ôn lại
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gap.weak.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => onSendMessage(`Giải thích cho em về: ${w}`)}
                        className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-full px-2 py-0.5 hover:bg-red-100 transition-colors"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {gap && gap.strong.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-green-600 mb-1">
                    <Check className="h-3 w-3" />Đã thành thạo
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gap.strong.map((s, i) => (
                      <span key={i} className="text-xs bg-green-50 border border-green-100 text-green-600 rounded-full px-2 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rec && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mb-1">
                    <Lightbulb className="h-3 w-3" />Gợi ý tiếp theo
                  </div>
                  <div className="space-y-1">
                    {rec.exercise && (
                      <button
                        onClick={() => onSendMessage(rec.exercise!)}
                        className="w-full text-left text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2 py-1.5 hover:bg-blue-100 transition-colors"
                      >
                        {rec.exercise}
                      </button>
                    )}
                    {rec.quiz && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 shrink-0" />
                        Quiz: {rec.quiz.title}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Knowledge Graph tags in analysis tab */}
      {tab === 'analysis' && kgConcepts.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 mb-1.5">
            <Network className="h-3 w-3" />Knowledge Graph
          </div>
          <div className="flex flex-wrap gap-1">
            {kgConcepts.slice(0, 8).map(c => (
              <button
                key={c.id}
                onClick={() => onSendMessage(`Giải thích về ${c.label}`)}
                className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-full px-2 py-0.5 hover:bg-violet-100 transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Learning Path tab */}
      {tab === 'path' && (
        <div className="px-3 py-2 space-y-1.5">
          {!hasPath ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI tạo lộ trình học cá nhân hoá.
            </div>
          ) : (
            <>
              {path!.avgMastery > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                      style={{ width: `${path!.avgMastery}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{path!.avgMastery}%</span>
                </div>
              )}

              {path!.steps.map((step, i) => {
                const Icon = STEP_ICON[step.type] ?? ChevronRight;
                return (
                  <div
                    key={i}
                    className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs', STATUS_STYLE[step.status])}
                  >
                    <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{step.title}</div>
                      {step.description && (
                        <div className="text-gray-400 mt-0.5 leading-tight">{step.description}</div>
                      )}
                    </div>
                    {step.status === 'current' && (
                      <span className="ml-auto shrink-0 text-primary font-semibold">◀</span>
                    )}
                  </div>
                );
              })}

              {path!.estimatedMinutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-400 pt-1">
                  <Clock className="h-3 w-3" />
                  Ước tính: ~{path!.estimatedMinutes} phút
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Difficulty tab */}
      {tab === 'difficulty' && (
        <div className="px-3 py-3 space-y-3">
          {!difficulty ? (
            <div className="text-xs text-gray-400 text-center py-2">
              Hãy học thêm để AI đánh giá độ khó phù hợp.
            </div>
          ) : (
            <>
              {/* Level badge */}
              <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', DIFFICULTY_META[difficulty.level].bg)}>
                <Zap className={cn('h-4 w-4 shrink-0', DIFFICULTY_META[difficulty.level].color)} />
                <div className="flex-1 min-w-0">
                  <div className={cn('text-xs font-bold', DIFFICULTY_META[difficulty.level].color)}>
                    Độ khó: {DIFFICULTY_META[difficulty.level].label}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight mt-0.5">{difficulty.reason}</div>
                </div>
              </div>

              {/* Mastery bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Mức thành thạo</span>
                  <span className="font-semibold">{difficulty.avgMastery}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', DIFFICULTY_META[difficulty.level].bar)}
                    style={{ width: `${difficulty.avgMastery}%` }}
                  />
                </div>
              </div>

              {/* Recommendation */}
              <button
                onClick={() => onSendMessage(difficulty.recommendation)}
                className="w-full text-left text-xs bg-gray-50 border border-gray-100 text-gray-700 rounded-lg px-2.5 py-2 hover:bg-gray-100 transition-colors flex items-start gap-2"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                {difficulty.recommendation}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
