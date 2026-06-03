import { api } from '@/lib/api';

export interface LearningEventPayload {
  type: 'quiz_completed' | 'lesson_viewed' | 'homework_submitted' | 'chat_session' | 'voice_session';
  subject: string;
  score?: number;
  durationSeconds?: number;
  topic?: string;
  correct?: number;
  total?: number;
}

export interface DailyAnalytics {
  date: string;
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

export async function recordLearningEvent(event: LearningEventPayload): Promise<void> {
  try {
    await api.post('/ai/analytics/record', event);
  } catch {
    // fire-and-forget
  }
}

export async function getAnalyticsSummary(subject = 'general', days: 7 | 30 | 90 = 30): Promise<AnalyticsSummary | null> {
  try {
    return await api.get<AnalyticsSummary>(`/ai/analytics/summary?subject=${subject}&days=${days}`);
  } catch {
    return null;
  }
}
