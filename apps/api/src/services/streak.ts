/**
 * Study Streak — bổ sung độc lập, không sửa analytics.ts
 * Feature flag: ENABLE_STREAK=true
 * Redis key: streak:v2:{userId}   TTL 365 ngày
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_STREAK !== 'false';
const TTL = 365 * 24 * 3600;

function streakKey(userId: string): string {
  return `streak:v2:${userId}`;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  totalActiveDays: number;
}

const emptyStreak = (): StreakData => ({
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  totalActiveDays: 0,
});

export async function getStreak(userId: string): Promise<StreakData> {
  if (!ENABLED) return emptyStreak();
  const raw = await redis.get(streakKey(userId));
  if (!raw) return emptyStreak();
  try {
    return { ...emptyStreak(), ...JSON.parse(raw) };
  } catch {
    return emptyStreak();
  }
}

export async function recordActiveDay(userId: string): Promise<StreakData> {
  if (!ENABLED) return emptyStreak();

  const today = new Date().toISOString().slice(0, 10);
  const data = await getStreak(userId);

  if (data.lastActiveDate === today) return data;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (data.lastActiveDate === yesterday) {
    data.currentStreak += 1;
  } else if (data.lastActiveDate !== today) {
    data.currentStreak = 1;
  }

  if (data.currentStreak > data.bestStreak) {
    data.bestStreak = data.currentStreak;
  }

  data.lastActiveDate = today;
  data.totalActiveDays += 1;

  await redis.set(streakKey(userId), JSON.stringify(data), 'EX', TTL);
  return data;
}
