'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Brain, Flame, MessageSquare, FileText, Clock,
  ChevronRight, Loader2, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface StudentItem {
  id: string; name: string; email: string; avatarUrl?: string;
  avgMastery: number; weakTopics: string[]; level: string;
  currentTopic: string | null; chatCount: number; quizCount: number;
  studyMinutes: number; streak: number; pendingTasks: number; isActive: boolean;
}

interface ClassStudentsData {
  class: { id: string; name: string };
  subject: string;
  students: StudentItem[];
}

const SUBJECTS = [
  { value: 'general', label: 'Tổng hợp' },
  { value: 'math', label: 'Toán' },
  { value: 'language', label: 'Ngoại ngữ' },
  { value: 'viet', label: 'Tiếng Việt' },
];

export default function ClassStudentsPage() {
  useRequireAuth('INSTRUCTOR');
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();

  const [subject, setSubject] = useState('general');
  const [data, setData] = useState<ClassStudentsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ClassStudentsData>(
        `/instructor/students/in-class/${classId}?subject=${subject}`,
      );
      setData(res);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [classId, subject]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.push('/instructor/classes')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {data ? data.class.name : 'Đang tải...'}
          </h1>
          <p className="text-sm text-muted-foreground">Quản lý học sinh toàn diện</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="text-sm border rounded-xl px-3 py-2 outline-none"
          >
            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={load} className="p-2 rounded-lg border hover:bg-gray-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tổng học sinh', value: data.students.length },
            { label: 'Đang hoạt động', value: data.students.filter(s => s.isActive).length },
            { label: 'Trung bình thành thạo', value: data.students.length
              ? `${Math.round(data.students.reduce((s, u) => s + u.avgMastery, 0) / data.students.length)}%`
              : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data || data.students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Lớp này chưa có học sinh</p>
          <button onClick={() => router.push('/instructor/classes')} className="mt-3 text-sm text-blue-600 hover:underline">
            ← Quay lại để thêm học sinh
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.students.map(student => (
            <button
              key={student.id}
              onClick={() => router.push(`/instructor/students/${student.id}`)}
              className="w-full bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-blue-100 transition-all text-left"
            >
              {/* Avatar */}
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shrink-0',
                student.isActive
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500'
                  : 'bg-gradient-to-br from-gray-300 to-gray-400',
              )}>
                {student.name?.[0]?.toUpperCase() ?? '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{student.name}</p>
                  {student.isActive && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full shrink-0">Active</span>
                  )}
                  {student.pendingTasks > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full shrink-0">
                      {student.pendingTasks} bài chờ
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                {student.weakTopics.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {student.weakTopics.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className={cn(
                    'text-sm font-bold',
                    student.avgMastery >= 70 ? 'text-green-600' : student.avgMastery >= 40 ? 'text-yellow-500' : 'text-red-500',
                  )}>{student.avgMastery}%</p>
                  <p className="text-xs text-muted-foreground">Mastery</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-orange-500 flex items-center gap-0.5">
                    <Flame className="h-3 w-3" />{student.streak}
                  </p>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-blue-600">{student.chatCount}</p>
                  <p className="text-xs text-muted-foreground">Chat</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-purple-600">{student.quizCount}</p>
                  <p className="text-xs text-muted-foreground">Quiz</p>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
