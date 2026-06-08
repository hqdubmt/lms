'use client';

import { useEffect, useState } from 'react';
import {
  Users, Flame, Clock, Brain, BookOpen, CheckCircle2,
  TrendingDown, Loader2, RefreshCw, MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectReport {
  subject: string;
  avgMastery: number;
  topicCount: number;
  currentTopic: string | null;
  weakTopics: string[];
}

interface ParentReport {
  generatedAt: string;
  streak: { current: number; best: number; totalDays: number };
  activity: {
    chatCount: number;
    quizCount: number;
    homeworkCount: number;
    voiceCount: number;
    studyMinutes: number;
  };
  subjects: SubjectReport[];
  weeklyTrend: { date: string; avg: number }[];
  todayFocus: string;
  weakTopicsAll: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_LABEL: Record<string, string> = {
  math: 'Toán học', language: 'Ngoại ngữ', viet: 'Tiếng Việt', general: 'Tổng hợp',
};
const SUBJECT_COLOR: Record<string, string> = {
  math: 'text-violet-700 bg-violet-50 border-violet-200',
  language: 'text-blue-700 bg-blue-50 border-blue-200',
  viet: 'text-red-700 bg-red-50 border-red-200',
  general: 'text-gray-700 bg-gray-50 border-gray-200',
};
const MASTERY_BAR: Record<string, string> = {
  math: 'bg-violet-500', language: 'bg-blue-500', viet: 'bg-red-500', general: 'bg-gray-500',
};

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParentReportPage() {
  useRequireAuth();
  const [data, setData] = useState<ParentReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ParentReport>('/ai/parent-report');
      setData(res);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const generated = data?.generatedAt ? new Date(data.generatedAt).toLocaleString('vi-VN') : '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Báo cáo học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng hợp tiến độ AI — {generated}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Activity stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Ngày học liên tiếp" value={`${data.streak.current} ngày`}
              icon={Flame} color="bg-orange-100 text-orange-600" sub={`Tốt nhất: ${data.streak.best}`} />
            <StatCard label="Phút học tổng cộng" value={data.activity.studyMinutes}
              icon={Clock} color="bg-blue-100 text-blue-600" />
            <StatCard label="Quiz đã làm" value={data.activity.quizCount}
              icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
            <StatCard label="Chat với AI" value={data.activity.chatCount}
              icon={MessageSquare} color="bg-purple-100 text-purple-600"
              sub={`Voice: ${data.activity.voiceCount}`} />
          </div>

          {/* Today focus */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-blue-600 mb-1">Chủ đề hôm nay</p>
            <p className="text-base font-bold text-blue-900">{data.todayFocus}</p>
          </div>

          {/* Subject mastery */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" /> Mức thành thạo theo môn
            </h2>
            <div className="space-y-4">
              {data.subjects.filter(s => s.avgMastery > 0 || s.topicCount > 0).map(s => (
                <div key={s.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 text-xs rounded-full border font-medium', SUBJECT_COLOR[s.subject])}>
                        {SUBJECT_LABEL[s.subject]}
                      </span>
                      {s.currentTopic && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          · {s.currentTopic}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'text-sm font-bold',
                      s.avgMastery >= 70 ? 'text-emerald-600' : s.avgMastery >= 40 ? 'text-yellow-600' : 'text-red-500',
                    )}>
                      {s.avgMastery}%
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full transition-all', MASTERY_BAR[s.subject])}
                      style={{ width: `${s.avgMastery}%` }}
                    />
                  </div>
                  {s.weakTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.weakTopics.map(t => (
                        <span key={t} className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly trend sparkline */}
          {data.weeklyTrend.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-blue-500" /> Xu hướng 7 ngày gần nhất
              </h2>
              <div className="flex items-end gap-1 h-16">
                {data.weeklyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-blue-400 transition-all"
                      style={{ height: `${Math.max(4, d.avg)}%` }}
                      title={`${d.date}: ${d.avg}%`}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak topics overall */}
          {data.weakTopicsAll.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4" /> Chủ đề cần ôn luyện thêm
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.weakTopicsAll.map(t => (
                  <span key={t} className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-16">Không có dữ liệu</p>
      )}
    </div>
  );
}
