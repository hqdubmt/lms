import { api } from '@/lib/api';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlockedAt: number | null;
}

export interface LearningAnalyticsV2 {
  chatCount: number;
  quizCount: number;
  homeworkCount: number;
  voiceCount: number;
  studyMinutes: number;
  masteryHistory: Array<{ date: string; avg: number }>;
  lastUpdated: number;
}

export interface AdaptiveResult {
  level: 'easy' | 'medium' | 'hard';
  confidence: number;
  reason: string;
  nextChallenge: string;
  adjustedMastery: number;
}

export async function getStreak(): Promise<StreakData | null> {
  try {
    return await api.get<StreakData>('/ai/streak');
  } catch {
    return null;
  }
}

export async function getAchievements(): Promise<Achievement[]> {
  try {
    return await api.get<Achievement[]>('/ai/achievements');
  } catch {
    return [];
  }
}

export async function getAnalyticsV2(): Promise<LearningAnalyticsV2 | null> {
  try {
    return await api.get<LearningAnalyticsV2>('/ai/analytics-v2');
  } catch {
    return null;
  }
}

export async function getAdaptiveV2(subject = 'general'): Promise<AdaptiveResult | null> {
  try {
    return await api.get<AdaptiveResult>(`/ai/adaptive-v2?subject=${subject}`);
  } catch {
    return null;
  }
}

export interface DayTask {
  day: number;
  date: string;
  focus: string;
  activities: string[];
  type: 'review' | 'practice' | 'quiz' | 'new';
}

export interface StudyPlan {
  days: number;
  subject: string;
  plan: DayTask[];
  weakTopics: string[];
  generatedAt: number;
}

export async function getStudyPlan(subject = 'general', days: 7 | 14 | 30 = 7): Promise<StudyPlan | null> {
  try {
    return await api.get<StudyPlan>(`/ai/study-plan?subject=${subject}&days=${days}`);
  } catch {
    return null;
  }
}

export interface StudentProfile {
  level: string;
  masteryAverage: number;
  strongestTopics: string[];
  weakestTopics: string[];
  achievements: Achievement[];
  streak: StreakData;
  activity: {
    chatCount: number;
    quizCount: number;
    homeworkCount: number;
    voiceCount: number;
    studyMinutes: number;
  };
  subject: string;
}

export async function getStudentProfile(subject = 'general'): Promise<StudentProfile | null> {
  try {
    return await api.get<StudentProfile>(`/ai/profile?subject=${subject}`);
  } catch {
    return null;
  }
}

export interface KGNode {
  id: string;
  label: string;
  description?: string;
  weight: number;
  depth: number;
  prerequisites: string[];
  related: string[];
  children: string[];
}

export interface KGVizData {
  nodes: KGNode[];
  edges: Array<{ from: string; to: string; type: 'prerequisite' | 'child' | 'related' }>;
  rootIds: string[];
  subject: string;
  builtAt: number | null;
}

export async function getKGViz(subject = 'general'): Promise<KGVizData | null> {
  try {
    return await api.get<KGVizData>(`/ai/kg-viz?subject=${subject}`);
  } catch {
    return null;
  }
}

// ── Revision (Module B) ────────────────────────────────────────────────────

export interface RevisionItem {
  id: string;
  topic: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReview: string | null;
  addedAt: number;
}

export interface RevisionQueue {
  due: RevisionItem[];
  upcoming: RevisionItem[];
  stats: { total: number; due: number; mastered: number };
}

export async function getRevisionQueue(): Promise<RevisionQueue | null> {
  try {
    return await api.get<RevisionQueue>('/ai/revision');
  } catch {
    return null;
  }
}

export async function completeRevision(itemId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<RevisionItem | null> {
  try {
    return await api.post<RevisionItem>('/ai/revision/complete', { itemId, quality });
  } catch {
    return null;
  }
}

// ── Timeline (Module C) ────────────────────────────────────────────────────

export type TimelineEventType = 'chat' | 'quiz' | 'homework' | 'voice' | 'achievement' | 'streak';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  subject: string;
  score?: number;
  date: string;
  time: number;
  badge?: string;
}

export interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

export interface TimelineData {
  timeline: TimelineDay[];
  stats: Record<TimelineEventType, number>;
}

export async function getTimeline(days = 30): Promise<TimelineData | null> {
  try {
    return await api.get<TimelineData>(`/ai/timeline?days=${days}`);
  } catch {
    return null;
  }
}

// ── Report Card (Module E) ─────────────────────────────────────────────────

export interface ReportCard {
  subject: string;
  grade: string;
  masteryAvg: number;
  strongTopics: Array<{ topic: string; score: number }>;
  weakTopics: Array<{ topic: string; score: number }>;
  mistakeSummary: Array<{ type: string; count: number }>;
  activity: {
    chatCount: number;
    quizCount: number;
    homeworkCount: number;
    voiceCount: number;
    studyMinutes: number;
  };
  streak: { current: number; best: number; totalDays: number };
  achievements: {
    total: number;
    unlocked: number;
    recent: Array<{ id: string; label: string; description: string; unlockedAt: number | null }>;
  };
  generatedAt: string;
}

export async function getReportCard(subject = 'general'): Promise<ReportCard | null> {
  try {
    return await api.get<ReportCard>(`/ai/report-card?subject=${subject}`);
  } catch {
    return null;
  }
}

// ── XP Gamification (Module H) ────────────────────────────────────────────

export interface Quest {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  target: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  completedAt: number | null;
  expiresAt: number;
}

export interface XPData {
  totalXP: number;
  level: number;
  rank: string;
  rankColor: string;
  xpToNextLevel: number;
  xpProgress: number;
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
  history: Array<{ date: string; xp: number; reason: string }>;
  lastUpdated: number;
}

export async function getXPData(): Promise<XPData | null> {
  try {
    return await api.get<XPData>('/ai/xp');
  } catch {
    return null;
  }
}

export async function awardXP(activity: string, xp?: number): Promise<{ xpGained: number; newTotal: number; levelUp: boolean; newLevel: number } | null> {
  try {
    return await api.post('/ai/xp/award', { activity, xp });
  } catch {
    return null;
  }
}

// ── Weekly Goals (Module A) ────────────────────────────────────────────────

export interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  unit: string;
  xpReward: number;
}

export interface WeeklyGoalsData {
  subject: string;
  weekOf: string;
  todayFocus: string;
  todayActivities: string[];
  goals: WeeklyGoal[];
  weekPlan: DayTask[];
  streak: number;
}

export async function getWeeklyGoals(subject = 'general'): Promise<WeeklyGoalsData | null> {
  try {
    return await api.get<WeeklyGoalsData>(`/ai/weekly-goals?subject=${subject}`);
  } catch {
    return null;
  }
}

export interface MonthlyProgressData {
  subject: string;
  progressPct: number;
  avgMastery: number;
  masteryHistory: Array<{ date: string; avg: number }>;
  totalStudyDays: number;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    reached: boolean;
    target: number;
    progress: number;
  }>;
  activity: {
    chatCount: number;
    quizCount: number;
    homeworkCount: number;
    voiceCount: number;
    studyMinutes: number;
  };
  streak: { current: number; best: number };
}

export async function getMonthlyProgress(subject = 'general'): Promise<MonthlyProgressData | null> {
  try {
    return await api.get<MonthlyProgressData>(`/ai/monthly-progress?subject=${subject}`);
  } catch {
    return null;
  }
}
