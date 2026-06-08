'use client';

import { useEffect, useState } from 'react';
import { Map, CheckCircle2, Circle, Clock, BookOpen, HelpCircle, Dumbbell, Star, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Link from 'next/link';

interface PathStep {
  type: string;
  title: string;
  id?: string;
  status: 'done' | 'current' | 'next' | 'upcoming';
  description?: string;
}

interface LearningPathData {
  steps: PathStep[];
  weakTopics: string[];
  strongTopics: string[];
  avgMastery: number;
  estimatedMinutes: number;
}

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp',  color: 'bg-gray-100 text-gray-700' },
  { key: 'math',     label: 'Toán học',   color: 'bg-blue-100 text-blue-700' },
  { key: 'viet',     label: 'Tiếng Việt', color: 'bg-green-100 text-green-700' },
  { key: 'language', label: 'Ngoại ngữ',  color: 'bg-purple-100 text-purple-700' },
];

const STEP_ICON: Record<string, React.ElementType> = {
  review: BookOpen, lesson: BookOpen, quiz: HelpCircle, practice: Dumbbell, milestone: Star,
};

const STEP_COLOR: Record<string, string> = {
  done:     'bg-emerald-100 text-emerald-600 border-emerald-200',
  current:  'bg-primary text-white border-primary',
  next:     'bg-blue-100 text-blue-600 border-blue-200',
  upcoming: 'bg-gray-100 text-gray-400 border-gray-200',
};

export default function LearningPathPage() {
  useRequireAuth();

  const [subject, setSubject] = useState('general');
  const [data, setData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (s = subject) => {
    setLoading(true);
    try {
      const res = await api.get<LearningPathData>(`/ai/learning-path?subject=${s}`);
      setData(res);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubject = (s: string) => { setSubject(s); load(s); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" /> Lộ trình học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI cá nhân hóa bước học tiếp theo</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Làm mới
        </button>
      </div>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button
            key={s.key}
            onClick={() => handleSubject(s.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              subject === s.key ? s.color + ' border-current' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <>
          {/* Summary bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Mastery hiện tại</p>
              <p className="text-2xl font-bold text-primary">{data.avgMastery}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thời gian ước tính</p>
              <p className="text-xl font-bold flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" /> {data.estimatedMinutes} phút
              </p>
            </div>
            {data.strongTopics.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Đã thành thạo</p>
                <div className="flex flex-wrap gap-1">
                  {data.strongTopics.slice(0, 3).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Steps timeline */}
          <div className="space-y-3">
            {data.steps.map((step, i) => {
              const Icon = STEP_ICON[step.type] ?? BookOpen;
              const isCurrent = step.status === 'current';
              const isDone = step.status === 'done';
              return (
                <div key={i} className={cn(
                  'bg-white rounded-2xl border p-4 flex items-start gap-4 transition-all',
                  isCurrent ? 'border-primary shadow-sm shadow-primary/10' : 'border-gray-100',
                  isDone && 'opacity-70',
                )}>
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border', STEP_COLOR[step.status])}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-semibold text-sm', isCurrent ? 'text-primary' : isDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
                        {step.title}
                      </p>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">TIẾP THEO</span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </div>
                  {step.status !== 'done' && step.status !== 'upcoming' && (
                    <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                  )}
                  {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />}
                  {step.status === 'upcoming' && <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>

          {data.weakTopics.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
              <p className="text-sm font-semibold text-amber-700 mb-2">Chủ đề cần ôn tập</p>
              <div className="flex flex-wrap gap-2">
                {data.weakTopics.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/learning"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Bắt đầu học <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-16">Không thể tải lộ trình. Thử lại sau.</p>
      )}
    </div>
  );
}
