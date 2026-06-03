import { redis } from './redis';
import { getBrain } from './conversation-brain';
import { getLearningState } from './learning-state';

const ANALYTICS_TTL = 90 * 24 * 3600; // 90 days

function analyticsKey(userId: string, subject: string): string {
  return `analytics:${userId}:${subject}`;
}

function studyTimeKey(userId: string): string {
  return `analytics:studytime:${userId}`;
}

export interface LearningEvent {
  type: 'quiz_completed' | 'lesson_viewed' | 'homework_submitted' | 'chat_session' | 'voice_session';
  subject: string;
  score?: number;       // 0-100
  durationSeconds?: number;
  topic?: string;
  correct?: number;
  total?: number;
}

export interface DailyAnalytics {
  date: string;       // YYYY-MM-DD
  studyMinutes: number;
  quizCount: number;
  quizAccuracy: number;
  chatCount: number;
  voiceCount: number;
  topicsStudied: string[];
}

export interface AnalyticsSummary {
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  quizAccuracy: number;
  homeworkAccuracy: number;
  masteryGrowth: number;
  topicsCompleted: number;
  currentStreak: number;
  dailyData: DailyAnalytics[];
  weakTopics: string[];
  strongTopics: string[];
  avgMastery: number;
}

export async function recordEvent(userId: string, event: LearningEvent): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${analyticsKey(userId, event.subject)}:${today}`;

  const existing = await redis.get(key);
  const day: DailyAnalytics = existing ? JSON.parse(existing) : {
    date: today,
    studyMinutes: 0,
    quizCount: 0,
    quizAccuracy: 0,
    chatCount: 0,
    voiceCount: 0,
    topicsStudied: [],
  };

  if (event.durationSeconds) day.studyMinutes += Math.round(event.durationSeconds / 60);
  if (event.topic && !day.topicsStudied.includes(event.topic)) day.topicsStudied.push(event.topic);

  switch (event.type) {
    case 'quiz_completed':
      if (event.correct !== undefined && event.total) {
        const newAccuracy = Math.round((event.correct / event.total) * 100);
        day.quizAccuracy = day.quizCount === 0
          ? newAccuracy
          : Math.round((day.quizAccuracy * day.quizCount + newAccuracy) / (day.quizCount + 1));
        day.quizCount += 1;
      }
      break;
    case 'chat_session':
      day.chatCount += 1;
      break;
    case 'voice_session':
      day.voiceCount += 1;
      break;
  }

  await redis.set(key, JSON.stringify(day), 'EX', ANALYTICS_TTL);
}

export async function getAnalyticsSummary(userId: string, subject: string, window: 7 | 30 | 90 = 30): Promise<AnalyticsSummary> {
  const today = new Date();
  const days: DailyAnalytics[] = [];

  // Fetch requested window (max 90 days)
  const fetchDays = Math.min(window, 90);
  const keys = Array.from({ length: fetchDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return `${analyticsKey(userId, subject)}:${d.toISOString().slice(0, 10)}`;
  });

  const values = await Promise.all(keys.map(k => redis.get(k)));
  for (const v of values) {
    if (v) days.push(JSON.parse(v as string));
  }

  const totalStudyMinutes = days.reduce((s, d) => s + d.studyMinutes, 0);
  const weeklyDays = days.slice(0, 7);
  const weeklyStudyMinutes = weeklyDays.reduce((s, d) => s + d.studyMinutes, 0);

  const quizDays = days.filter(d => d.quizCount > 0);
  const quizAccuracy = quizDays.length > 0
    ? Math.round(quizDays.reduce((s, d) => s + d.quizAccuracy, 0) / quizDays.length)
    : 0;

  // Streak calculation
  let currentStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayData = days.find(day => day.date === dateStr);
    if (dayData && dayData.studyMinutes > 0) currentStreak++;
    else if (i > 0) break;
  }

  // Brain data for mastery
  const brain = await getBrain(userId, subject);
  const masteryEntries = Object.entries(brain.mastery);
  const avgMastery = masteryEntries.length > 0
    ? Math.round(masteryEntries.reduce((s, [, v]) => s + (v as number), 0) / masteryEntries.length * 100)
    : 0;

  const state = await getLearningState(userId, subject);

  return {
    totalStudyMinutes,
    weeklyStudyMinutes,
    quizAccuracy,
    homeworkAccuracy: 0,
    masteryGrowth: avgMastery,
    topicsCompleted: (state.strongTopics ?? []).length,
    currentStreak,
    dailyData: days.reverse(),
    weakTopics: state.weakTopics ?? [],
    strongTopics: state.strongTopics ?? [],
    avgMastery,
  };
}
