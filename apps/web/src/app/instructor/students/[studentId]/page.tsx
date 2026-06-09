'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Brain, BookOpen, Target, Activity, Plus, Trash2, X, Loader2,
  CheckCircle2, Clock, AlertCircle, RefreshCw, Edit3, Save, RotateCcw,
  ChevronDown, Flame, Star, MessageSquare, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'study-plan' | 'tasks' | 'activity';
type Level = 'basic' | 'intermediate' | 'advanced';

interface BrainInfo {
  subject: string;
  brain: {
    topic: string | null; level: Level; mastery: Record<string, number>;
    mistakes: Array<{ type: string; count: number }>; messageCount: number;
  };
}

interface StudentProfile {
  student: { id: string; name: string; email: string; avatarUrl?: string; createdAt: string };
  class: { id: string; name: string };
  brains: BrainInfo[];
  activity: { chatCount: number; quizCount: number; homeworkCount: number; studyMinutes: number };
  streak: { currentStreak: number; bestStreak: number; totalActiveDays: number };
  quizAttempts: Array<{ id: string; score: number; createdAt: string }>;
  enrollments: Array<{ progress: number; status: string; course: { id: string; title: string } }>;
  assignedTasks: Array<{ id: string; title: string; status: string; dueDate?: string }>;
}

interface StudyPlan {
  days: number; subject: string; isOverride: boolean;
  plan: Array<{ day: number; date: string; focus: string; activities: string[]; type: string }>;
  weakTopics: string[];
}

interface Task {
  id: string; title: string; description?: string; status: string;
  priority: number; dueDate?: string; createdAt: string;
  assigneeConfirmed: boolean; resultNote?: string;
}

const SUBJECTS = [
  { value: 'general', label: 'Tổng hợp' },
  { value: 'math', label: 'Toán' },
  { value: 'language', label: 'Ngoại ngữ' },
  { value: 'viet', label: 'Tiếng Việt' },
];

const LEVELS: Record<Level, { label: string; color: string }> = {
  basic: { label: 'Cơ bản', color: 'text-blue-600 bg-blue-50' },
  intermediate: { label: 'Trung cấp', color: 'text-yellow-600 bg-yellow-50' },
  advanced: { label: 'Nâng cao', color: 'text-green-600 bg-green-50' },
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'text-blue-600 bg-blue-50',
  IN_PROGRESS: 'text-yellow-600 bg-yellow-50',
  DONE: 'text-green-600 bg-green-50',
  CANCELLED: 'text-gray-400 bg-gray-50',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành', CANCELLED: 'Đã huỷ',
};

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Study plan
  const [planSubject, setPlanSubject] = useState('general');
  const [planDays, setPlanDays] = useState(7);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editFocus, setEditFocus] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [resetingPlan, setResetingPlan] = useState(false);

  // Brain edit
  const [editBrainSubject, setEditBrainSubject] = useState('general');
  const [brainEditing, setBrainEditing] = useState(false);
  const [masteryEdits, setMasteryEdits] = useState<Record<string, number>>({});
  const [levelEdit, setLevelEdit] = useState<Level>('basic');
  const [savingBrain, setSavingBrain] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<StudentProfile>(`/instructor/students/${studentId}`);
      setProfile(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [studentId]);

  const loadPlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const data = await api.get<StudyPlan>(
        `/instructor/students/${studentId}/study-plan?subject=${planSubject}&days=${planDays}`,
      );
      setPlan(data);
    } catch { /* ignore */ }
    finally { setPlanLoading(false); }
  }, [studentId, planSubject, planDays]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await api.get<Task[]>(`/instructor/students/${studentId}/tasks`);
      setTasks(data);
    } catch { /* ignore */ }
    finally { setTasksLoading(false); }
  }, [studentId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (tab === 'study-plan') loadPlan(); }, [tab, loadPlan]);
  useEffect(() => { if (tab === 'tasks') loadTasks(); }, [tab, loadTasks]);

  const handleSavePlanDay = async () => {
    if (editingDay === null || !plan) return;
    setSavingPlan(true);
    const updatedPlan = plan.plan.map(d =>
      d.day === editingDay ? { ...d, focus: editFocus } : d,
    );
    try {
      await api.post(`/instructor/students/${studentId}/study-plan/override`, {
        subject: planSubject,
        days: planDays,
        plan: updatedPlan,
      });
      await loadPlan();
      setEditingDay(null);
    } catch { /* ignore */ }
    finally { setSavingPlan(false); }
  };

  const handleResetPlan = async () => {
    if (!confirm('Reset kế hoạch? AI sẽ tạo lại kế hoạch mới cho học sinh này.')) return;
    setResetingPlan(true);
    try {
      await api.delete(`/instructor/students/${studentId}/study-plan/cache?subject=${planSubject}`);
      await loadPlan();
    } catch { /* ignore */ }
    finally { setResetingPlan(false); }
  };

  const handleSaveBrain = async () => {
    setSavingBrain(true);
    try {
      await api.patch(`/instructor/students/${studentId}/brain`, {
        subject: editBrainSubject,
        mastery: masteryEdits,
        level: levelEdit,
      });
      await loadProfile();
      setBrainEditing(false);
    } catch { /* ignore */ }
    finally { setSavingBrain(false); }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setAddingTask(true);
    try {
      await api.post(`/instructor/students/${studentId}/tasks`, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        dueDate: taskDue || undefined,
      });
      setTaskTitle(''); setTaskDesc(''); setTaskDue(''); setShowAddTask(false);
      await loadTasks();
    } catch { /* ignore */ }
    finally { setAddingTask(false); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Xoá bài tập này?')) return;
    try {
      await api.delete(`/instructor/students/${studentId}/tasks/${taskId}`);
      await loadTasks();
    } catch { /* ignore */ }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.patch(`/instructor/students/${studentId}/tasks/${taskId}`, { status });
      await loadTasks();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Không tìm thấy học sinh hoặc không có quyền truy cập.
      </div>
    );
  }

  const { student, brains, activity, streak, quizAttempts, enrollments } = profile;
  const avgQuizScore = quizAttempts.length
    ? Math.round(quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length)
    : null;

  const activeBrain = brains.find(b => b.subject === editBrainSubject)?.brain;
  const masteryEntries = Object.entries(activeBrain?.mastery ?? {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
            {student.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{student.name}</h1>
            <p className="text-xs text-muted-foreground">{student.email} · Lớp: <span className="text-blue-600">{profile.class.name}</span></p>
          </div>
        </div>
        <button onClick={loadProfile} className="p-2 rounded-lg border hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Flame, label: 'Streak', value: `${streak.currentStreak} ngày`, color: 'text-orange-500' },
          { icon: MessageSquare, label: 'Hỏi AI', value: `${activity.chatCount} lần`, color: 'text-blue-500' },
          { icon: FileText, label: 'Quiz', value: avgQuizScore != null ? `${avgQuizScore}%` : '—', color: 'text-green-500' },
          { icon: Clock, label: 'Học', value: `${activity.studyMinutes} phút`, color: 'text-purple-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <s.icon className={cn('h-5 w-5 shrink-0', s.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-semibold text-sm">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'overview', label: 'Tổng quan', icon: Brain },
          { key: 'study-plan', label: 'Kế hoạch học', icon: BookOpen },
          { key: 'tasks', label: 'Bài tập giao', icon: Target },
          { key: 'activity', label: 'Hoạt động', icon: Activity },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-gray-700',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Brain per subject */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /> Trạng thái AI Brain</h3>
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={editBrainSubject}
                  onChange={e => { setEditBrainSubject(e.target.value); setBrainEditing(false); }}
                  className="text-xs border rounded-lg px-2 py-1.5 outline-none"
                >
                  {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {!brainEditing ? (
                  <button
                    onClick={() => {
                      setMasteryEdits({ ...activeBrain?.mastery });
                      setLevelEdit(activeBrain?.level ?? 'basic');
                      setBrainEditing(true);
                    }}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
                  >
                    <Edit3 className="h-3 w-3" /> Chỉnh sửa
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => setBrainEditing(false)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">Huỷ</button>
                    <button
                      onClick={handleSaveBrain}
                      disabled={savingBrain}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {savingBrain ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Lưu
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeBrain && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-muted-foreground">Cấp độ:</span>
                  {brainEditing ? (
                    <select
                      value={levelEdit}
                      onChange={e => setLevelEdit(e.target.value as Level)}
                      className="text-xs border rounded-lg px-2 py-1 outline-none"
                    >
                      {Object.entries(LEVELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', LEVELS[activeBrain.level]?.color)}>
                      {LEVELS[activeBrain.level]?.label}
                    </span>
                  )}
                  {activeBrain.topic && (
                    <span className="text-xs text-muted-foreground">Chủ đề: <strong>{activeBrain.topic}</strong></span>
                  )}
                </div>

                {masteryEntries.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Mức độ thành thạo</p>
                    {(brainEditing ? Object.entries(masteryEdits) : masteryEntries).map(([concept, score]) => (
                      <div key={concept} className="flex items-center gap-3">
                        <span className="text-sm flex-1 truncate">{concept}</span>
                        {brainEditing ? (
                          <input
                            type="range" min={0} max={100} step={5}
                            value={Math.round((masteryEdits[concept] ?? 0) * 100)}
                            onChange={e => setMasteryEdits(prev => ({ ...prev, [concept]: parseInt(e.target.value) / 100 }))}
                            className="w-24"
                          />
                        ) : (
                          <div className="w-24 bg-gray-100 rounded-full h-2">
                            <div
                              className={cn('h-2 rounded-full', score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-yellow-400' : 'bg-red-400')}
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </div>
                        )}
                        <span className={cn('text-xs font-mono w-8 text-right', score >= 0.7 ? 'text-green-600' : score >= 0.4 ? 'text-yellow-600' : 'text-red-500')}>
                          {Math.round((brainEditing ? (masteryEdits[concept] ?? 0) : score) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu mastery cho môn này</p>
                )}

                {activeBrain.mistakes.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Lỗi thường gặp</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeBrain.mistakes.slice(0, 6).map(m => (
                        <span key={m.type} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                          {m.type} ×{m.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Enrollments */}
          {enrollments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3"><BookOpen className="h-4 w-4 text-blue-500" /> Khoá học đang học</h3>
              <div className="space-y-2">
                {enrollments.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex-1 text-sm truncate">{e.course.title}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{e.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Study Plan ── */}
      {tab === 'study-plan' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={planSubject} onChange={e => setPlanSubject(e.target.value)} className="text-sm border rounded-xl px-3 py-2 outline-none">
              {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={planDays} onChange={e => setPlanDays(parseInt(e.target.value))} className="text-sm border rounded-xl px-3 py-2 outline-none">
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
            <button onClick={loadPlan} className="flex items-center gap-1.5 text-sm px-3 py-2 border rounded-xl hover:bg-gray-50">
              <RefreshCw className={cn('h-4 w-4', planLoading && 'animate-spin')} /> Tải lại
            </button>
            <button
              onClick={handleResetPlan}
              disabled={resetingPlan}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
            >
              {resetingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset AI
            </button>
            {plan?.isOverride && (
              <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                ✏️ Đã chỉnh sửa bởi giảng viên
              </span>
            )}
          </div>

          {planLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : plan ? (
            <div className="space-y-2">
              {plan.plan.slice(0, planDays).map(day => (
                <div key={day.day} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5',
                      day.type === 'quiz' ? 'bg-red-50 text-red-600' :
                      day.type === 'new' ? 'bg-blue-50 text-blue-600' :
                      day.type === 'practice' ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-600',
                    )}>
                      Ngày {day.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">{day.date}</p>
                      {editingDay === day.day ? (
                        <div className="flex gap-2">
                          <input
                            value={editFocus}
                            onChange={e => setEditFocus(e.target.value)}
                            className="flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-200"
                            autoFocus
                          />
                          <button onClick={handleSavePlanDay} disabled={savingPlan}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                            {savingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </button>
                          <button onClick={() => setEditingDay(null)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm flex-1">{day.focus}</p>
                          <button
                            onClick={() => { setEditingDay(day.day); setEditFocus(day.focus); }}
                            className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <ul className="mt-1.5 space-y-0.5">
                        {day.activities.map((a, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-gray-300 shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {editingDay !== day.day && (
                      <button
                        onClick={() => { setEditingDay(day.day); setEditFocus(day.focus); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 shrink-0"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Chưa có kế hoạch</p>
          )}
        </div>
      )}

      {/* ── Tab: Tasks ── */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Giao bài tập
            </button>
          </div>

          {tasksLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Chưa có bài tập nào được giao</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{task.title}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[task.status] ?? 'bg-gray-50 text-gray-600')}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                      {task.assigneeConfirmed && (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">Học sinh xác nhận</span>
                      )}
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                    {task.resultNote && (
                      <p className="text-xs text-blue-600 mt-1">Kết quả: {task.resultNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.status !== 'DONE' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'DONE')}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50"
                        title="Đánh dấu hoàn thành"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal giao bài */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Giao bài tập</h3>
                  <button onClick={() => setShowAddTask(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                    <input
                      value={taskTitle} onChange={e => setTaskTitle(e.target.value)} autoFocus
                      placeholder="VD: Làm bài tập Toán chương 3"
                      className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Mô tả</label>
                    <textarea
                      value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3}
                      placeholder="Hướng dẫn chi tiết..."
                      className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Hạn nộp</label>
                    <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Huỷ</button>
                  <button
                    onClick={handleAddTask} disabled={addingTask || !taskTitle.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingTask && <Loader2 className="h-4 w-4 animate-spin" />}
                    Giao bài
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Activity ── */}
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Tổng chat AI', value: activity.chatCount, icon: MessageSquare, color: 'text-blue-500' },
              { label: 'Bài quiz', value: activity.quizCount, icon: FileText, color: 'text-green-500' },
              { label: 'Bài tập', value: activity.homeworkCount, icon: BookOpen, color: 'text-purple-500' },
              { label: 'Phút học', value: activity.studyMinutes, icon: Clock, color: 'text-orange-500' },
              { label: 'Streak hiện tại', value: `${streak.currentStreak} ngày`, icon: Flame, color: 'text-red-500' },
              { label: 'Streak tốt nhất', value: `${streak.bestStreak} ngày`, icon: Star, color: 'text-yellow-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={cn('h-4 w-4', s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {quizAttempts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-green-500" /> Quiz gần đây</h3>
              <div className="space-y-2">
                {quizAttempts.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={cn('h-2 rounded-full', a.score >= 70 ? 'bg-green-500' : a.score >= 50 ? 'bg-yellow-400' : 'bg-red-400')} style={{ width: `${Math.min(100, a.score)}%` }} />
                    </div>
                    <span className={cn('text-xs font-mono font-bold', a.score >= 70 ? 'text-green-600' : a.score >= 50 ? 'text-yellow-600' : 'text-red-500')}>
                      {a.score}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
