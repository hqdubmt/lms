'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ChevronDown, ChevronUp, Star, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Career {
  title: string;
  description: string;
  skills: string[];
  roadmap: string[];
  matchScore: number;
}

interface CareerData {
  subject: string;
  subjectLabel: string;
  avgMastery: number;
  strongTopics: string[];
  careers: Career[];
}

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp',  color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { key: 'math',     label: 'Toán học',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'viet',     label: 'Tiếng Việt', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'language', label: 'Ngoại ngữ',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}%</span>
    </div>
  );
}

function CareerCard({ career }: { career: Career }) {
  const [expanded, setExpanded] = useState(false);
  const topScore = career.matchScore >= 80;

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden transition-all',
      topScore ? 'border-emerald-200 shadow-sm shadow-emerald-100' : 'border-gray-100',
    )}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
          topScore ? 'bg-emerald-100' : 'bg-gray-100',
        )}>
          <Briefcase className={cn('h-5 w-5', topScore ? 'text-emerald-600' : 'text-gray-500')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{career.title}</h3>
            {topScore && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400 shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{career.description}</p>
          <div className="mt-2">
            <ScoreBar score={career.matchScore} />
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kỹ năng cần có</p>
            <div className="flex flex-wrap gap-2">
              {career.skills.map(s => (
                <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lộ trình phát triển</p>
            <div className="flex flex-wrap gap-2 items-center">
              {career.roadmap.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs">{step}</span>
                  {i < career.roadmap.length - 1 && <span className="text-gray-300">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AICareerAdvisorPage() {
  useRequireAuth();

  const [subject, setSubject] = useState('general');
  const [data, setData] = useState<CareerData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (s = subject) => {
    setLoading(true);
    try {
      const res = await api.get<CareerData>(`/ai/career-advisor?subject=${s}`);
      setData(res);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubject = (s: string) => { setSubject(s); load(s); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-amber-600" /> AI Career Advisor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Định hướng nghề nghiệp dựa trên thế mạnh học tập của bạn</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
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
              subject === s.key ? s.color : 'border-gray-200 text-gray-600 hover:bg-gray-50',
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
          {/* Profile summary */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
            <p className="text-sm text-white/80">Thế mạnh của bạn trong {data.subjectLabel}</p>
            <p className="text-3xl font-bold mt-1">{data.avgMastery}%</p>
            {data.strongTopics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.strongTopics.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Career cards */}
          <div className="space-y-3">
            {data.careers.map((c, i) => (
              <CareerCard key={i} career={c} />
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Kết quả dựa trên dữ liệu học tập của bạn. Thay đổi môn học để xem gợi ý khác.
          </p>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-16">Không thể tải dữ liệu.</p>
      )}
    </div>
  );
}
