/**
 * Learning Analytics v2 — bổ sung độc lập, không sửa analytics.ts
 * Feature flag: ENABLE_ANALYTICS=true
 * Redis key: la:v2:{userId}   TTL 90 ngày
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_ANALYTICS !== 'false';
const TTL = 90 * 24 * 3600;

function laKey(userId: string): string {
  return `la:v2:${userId}`;
}

export interface LearningAnalyticsData {
  chatCount: number;
  quizCount: number;
  homeworkCount: number;
  voiceCount: number;
  studyMinutes: number;
  masteryHistory: Array<{ date: string; avg: number }>;
  lastUpdated: number;
}

const emptyData = (): LearningAnalyticsData => ({
  chatCount: 0,
  quizCount: 0,
  homeworkCount: 0,
  voiceCount: 0,
  studyMinutes: 0,
  masteryHistory: [],
  lastUpdated: Date.now(),
});

export async function getLearningAnalytics(userId: string): Promise<LearningAnalyticsData> {
  if (!ENABLED) return emptyData();
  const raw = await redis.get(laKey(userId));
  if (!raw) return emptyData();
  try {
    return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    return emptyData();
  }
}

export type LearningEvent = 'chat' | 'quiz' | 'homework' | 'voice' | 'study';

export async function trackLearningEvent(
  userId: string,
  event: LearningEvent,
  extra?: { minutes?: number; masteryAvg?: number },
): Promise<void> {
  if (!ENABLED) return;

  const data = await getLearningAnalytics(userId);

  if (event === 'chat') data.chatCount += 1;
  else if (event === 'quiz') data.quizCount += 1;
  else if (event === 'homework') data.homeworkCount += 1;
  else if (event === 'voice') data.voiceCount += 1;

  if (extra?.minutes) data.studyMinutes += extra.minutes;

  if (extra?.masteryAvg !== undefined) {
    const today = new Date().toISOString().slice(0, 10);
    const last = data.masteryHistory.at(-1);
    if (last?.date === today) {
      last.avg = Math.round((last.avg + extra.masteryAvg) / 2 * 100) / 100;
    } else {
      data.masteryHistory.push({ date: today, avg: Math.round(extra.masteryAvg * 100) / 100 });
      if (data.masteryHistory.length > 90) data.masteryHistory.shift();
    }
  }

  data.lastUpdated = Date.now();
  await redis.set(laKey(userId), JSON.stringify(data), 'EX', TTL);
}

export async function resetLearningAnalytics(userId: string): Promise<void> {
  if (!ENABLED) return;
  await redis.del(laKey(userId));
}
