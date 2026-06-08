'use client';

import { useEffect, useState } from 'react';
import {
  BarChart2, Users, TrendingDown, RefreshCw, Loader2,
  ChevronDown, AlertTriangle, CheckCircle2, BookOpen, Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassInfo {
  id: string;
  name: string;
  memberCount?: number;
}

interface StudentStat {
  userId: string;
  avgProgress: number;
  completedLessons: number;
  totalLessons: number;
  quizAvg: number | null;
  weakTopics: string[];
}

interface WeakTopic {
  topic: string;
  affectedStudents: number;
}

interface ClassAnalytics {
  class: ClassInfo;
  allClasses: ClassInfo[];
  summary: {
    totalStudents: number;
    avgProgress: number;
    avgQuizScore: number | null;
    enrolledCourses: number;
  };
  students: StudentStat[];
  weakTopics: WeakTopic[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-sm font-semibold w-10 text-right">{value}%</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', color)}>{score}/100</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstructorAnalyticsPage() {
  useRequireAuth('INSTRUCTOR');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [showClassMenu, setShowClassMenu] = useState(false);

  const load = async (classId?: string) => {
    setLoading(true);
    try {
      const url = classId
        ? `/instructor/class-analytics?classId=${classId}`
        : '/instructor/class-analytics';
      const result = await api.get<ClassAnalytics>(url);
      setData(result);
      if (!selectedClassId && result.class?.id) setSelectedClassId(result.class.id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClassChange = (id: string) => {
    setSelectedClassId(id);
    setShowClassMenu(false);
    load(id);
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-blue-600" /> Phân tích lớp học
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Hiệu suất lớp, tiến độ và chủ đề yếu</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Class picker */}
          {data && data.allClasses.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowClassMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium hover:bg-gray-50"
              >
                {data.class.name}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showClassMenu && (
                <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg z-10 min-w-48">
                  {data.allClasses.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleClassChange(c.id)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl',
                        c.id === selectedClassId && 'bg-blue-50 text-blue-700',
                      )}
                    >
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">{c.memberCount} hs</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => load(selectedClassId)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {!data || data.summary.totalStudents === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Lớp chưa có học sinh nào</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Học sinh</span>
              </div>
              <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-muted-foreground">Tiến độ TB</span>
              </div>
              <p className="text-2xl font-bold">{data.summary.avgProgress}%</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-5 w-5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Điểm Quiz TB</span>
              </div>
              <p className="text-2xl font-bold">
                {data.summary.avgQuizScore !== null ? `${data.summary.avgQuizScore}/100` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
                <span className="text-xs text-muted-foreground">Khóa học</span>
              </div>
              <p className="text-2xl font-bold">{data.summary.enrolledCourses}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Weak topics */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" /> Chủ đề yếu của lớp
              </h2>
              {data.weakTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {data.weakTopics.map(wt => (
                    <div key={wt.topic} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                        <span>{wt.topic}</span>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {wt.affectedStudents} học sinh
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Class progress distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" /> Tiến độ học sinh
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {data.students
                  .sort((a, b) => b.avgProgress - a.avgProgress)
                  .map((s, i) => (
                    <div key={s.userId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Học sinh {i + 1}</span>
                        <ScoreBadge score={s.quizAvg} />
                      </div>
                      <ProgressBar
                        value={s.avgProgress}
                        color={s.avgProgress >= 70 ? 'bg-emerald-500' : s.avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-400'}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
