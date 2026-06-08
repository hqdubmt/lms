'use client';

import { useEffect, useState } from 'react';
import {
  Bot, Users, Brain, TrendingDown, RefreshCw, Loader2,
  Flame, CheckCircle2, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassInfo { id: string; name: string }

interface StudentAiStat {
  userId: string;
  name: string;
  email: string;
  avgMastery: number;
  weakTopics: string[];
  currentTopic: string | null;
  level: string;
  chatCount: number;
  quizCount: number;
  homeworkCount: number;
  studyMinutes: number;
  streak: number;
  totalActivity: number;
  isActive: boolean;
}

interface TeacherAiData {
  classes: ClassInfo[];
  class: ClassInfo | null;
  subject: string;
  subjectLabel: string;
  students: StudentAiStat[];
  summary: { totalStudents: number; avgMastery: number; activeStudents: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { id: 'general', label: 'Tổng hợp' },
  { id: 'math', label: 'Toán học' },
  { id: 'language', label: 'Ngoại ngữ' },
  { id: 'viet', label: 'Tiếng Việt' },
];

function MasteryBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn(
        'text-xs font-semibold w-8 text-right',
        value >= 70 ? 'text-emerald-600' : value >= 40 ? 'text-yellow-600' : 'text-red-500',
      )}>{value}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherAiStudentsPage() {
  useRequireAuth();
  const [data, setData] = useState<TeacherAiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('general');

  const load = async (cId = classId, sub = subject) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ subject: sub });
      if (cId) params.set('classId', cId);
      const res = await api.get<TeacherAiData>(`/instructor/ai-students?${params}`);
      setData(res);
      if (!cId && res.class) setClassId(res.class.id);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClass = (id: string) => { setClassId(id); load(id, subject); };
  const handleSubject = (sub: string) => { setSubject(sub); load(classId, sub); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Dashboard — Học sinh
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi tiến độ AI của học sinh trong lớp
          </p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {/* Class + Subject selectors */}
      <div className="flex flex-wrap gap-3">
        {data?.classes && data.classes.length > 1 && (
          <div className="relative">
            <select
              value={classId}
              onChange={e => handleClass(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm border rounded-lg appearance-none bg-white cursor-pointer"
            >
              {data.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        )}

        <div className="flex gap-1 flex-wrap">
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSubject(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                subject === s.id ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          {data.summary && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Tổng học sinh
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold">{data.summary.avgMastery}%</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-purple-500" /> Mastery TB
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{data.summary.activeStudents}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Đang hoạt động
                </p>
              </div>
            </div>
          )}

          {/* Student table */}
          {data.students.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Chưa có học sinh trong lớp</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3 font-medium">Học sinh</th>
                      <th className="text-left px-4 py-3 font-medium w-36">Mastery</th>
                      <th className="text-center px-3 py-3 font-medium">Chat</th>
                      <th className="text-center px-3 py-3 font-medium">Quiz</th>
                      <th className="text-center px-3 py-3 font-medium">Bài tập</th>
                      <th className="text-center px-3 py-3 font-medium">Streak</th>
                      <th className="text-left px-4 py-3 font-medium">Điểm yếu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s, i) => (
                      <tr key={s.userId} className={cn(
                        'border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50',
                        !s.isActive && 'opacity-60',
                      )}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
                            )}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[120px]">{s.name}</p>
                              {s.currentTopic && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {s.currentTopic}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <MasteryBar value={s.avgMastery} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-medium">{s.chatCount}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-medium">{s.quizCount}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-medium">{s.homeworkCount}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s.streak > 0 ? (
                            <span className="flex items-center justify-center gap-0.5 text-orange-600">
                              <Flame className="h-3.5 w-3.5" /> {s.streak}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.weakTopics.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {s.weakTopics.slice(0, 2).map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] max-w-[80px] truncate">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Tốt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students with no activity warning */}
          {data.students.some(s => !s.isActive) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                {data.students.filter(s => !s.isActive).length} học sinh chưa bắt đầu sử dụng AI Tutor.
                Hãy khuyến khích các em bắt đầu chat với AI để cải thiện kết quả học tập.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
