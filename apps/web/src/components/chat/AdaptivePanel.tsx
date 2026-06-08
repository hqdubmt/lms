'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Zap, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdaptiveSession {
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
  reason: string;
  nextChallenge: string;
  weakTopics: string[];
  strongTopics: string[];
  recommendation: string;
  avgMastery: number;
  currentTopic: string | null;
  level: string;
}

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Cơ bản',  color: 'bg-blue-100 text-blue-700 border-blue-200',   bar: 'bg-blue-500' },
  medium: { label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-500' },
  hard:   { label: 'Nâng cao', color: 'bg-red-100 text-red-700 border-red-200',     bar: 'bg-red-500' },
};

interface AdaptivePanelProps {
  subject: string;
  onSendMessage: (text: string) => void;
}

export function AdaptivePanel({ subject, onSendMessage }: AdaptivePanelProps) {
  const [data, setData] = useState<AdaptiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<AdaptiveSession>(`/ai/adaptive-session?subject=${subject}`);
      setData(res);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [subject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Đang phân tích học tập...
      </div>
    );
  }

  if (!data) return null;

  const diff = DIFFICULTY_CONFIG[data.difficulty];

  return (
    <div className="px-3 pt-2 pb-1 space-y-2 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-gray-700">Học cá nhân hóa</span>
        </div>
        <button
          onClick={load}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Làm mới"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Difficulty badge + mastery */}
      <div className="flex items-center gap-2">
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', diff.color)}>
          {diff.label}
        </span>
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div
            className={cn('h-1.5 rounded-full transition-all', diff.bar)}
            style={{ width: `${data.avgMastery}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{data.avgMastery}%</span>
      </div>

      {/* Weak topics */}
      {data.weakTopics.length > 0 && (
        <div className="flex items-start gap-1.5">
          <AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {data.weakTopics.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Next challenge quick-send */}
      <button
        onClick={() => onSendMessage(data.nextChallenge)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors text-left"
      >
        <Zap className="h-3 w-3 text-primary shrink-0" />
        <span className="text-[10px] text-primary font-medium truncate">{data.nextChallenge}</span>
      </button>
    </div>
  );
}
