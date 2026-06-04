/**
 * Learning Timeline — Module C
 * GET /ai/timeline
 * Đọc từ các Redis key hiện có để tổng hợp timeline.
 */

import { redis } from './redis';
import { getStreak } from './streak';
import { getAchievements } from './achievement';

export type TimelineEventType = 'chat' | 'quiz' | 'homework' | 'voice' | 'achievement' | 'streak';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  subject: string;
  score?: number;
  date: string;   // YYYY-MM-DD
  time: number;   // timestamp ms
  badge?: string;
}

export interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

const TL_KEY = (userId: string) => `timeline:v1:${userId}`;
const TL_TTL = 90 * 24 * 3600;

async function getTimelineStore(userId: string): Promise<TimelineEvent[]> {
  const raw = await redis.get(TL_KEY(userId)).catch(() => null);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveTimelineStore(userId: string, events: TimelineEvent[]): Promise<void> {
  // Keep last 500 events
  const trimmed = events.sort((a, b) => b.time - a.time).slice(0, 500);
  await redis.set(TL_KEY(userId), JSON.stringify(trimmed), 'EX', TL_TTL).catch(() => {});
}

export async function recordTimelineEvent(
  userId: string,
  event: Omit<TimelineEvent, 'id' | 'date'>,
): Promise<void> {
  const events = await getTimelineStore(userId);
  const date = new Date(event.time).toISOString().slice(0, 10);
  events.push({
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date,
  });
  await saveTimelineStore(userId, events);
}

export async function getTimeline(
  userId: string,
  days = 30,
): Promise<{ timeline: TimelineDay[]; stats: Record<TimelineEventType, number> }> {
  const events = await getTimelineStore(userId);

  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const recent = events.filter(e => e.time >= cutoff);

  // Merge achievement events (from achievement store)
  try {
    const achievements = await getAchievements(userId);
    for (const ach of achievements) {
      if (ach.unlockedAt && ach.unlockedAt >= cutoff) {
        const existing = recent.find(
          e => e.type === 'achievement' && e.badge === ach.id,
        );
        if (!existing) {
          const date = new Date(ach.unlockedAt).toISOString().slice(0, 10);
          recent.push({
            id: `ach-${ach.id}`,
            type: 'achievement',
            title: `Mở khóa: ${ach.label}`,
            description: ach.description,
            subject: 'general',
            date,
            time: ach.unlockedAt,
            badge: ach.id,
          });
        }
      }
    }
  } catch { /* achievements optional */ }

  // Group by date
  const byDate: Record<string, TimelineEvent[]> = {};
  for (const e of recent) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  const timeline: TimelineDay[] = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, evs]) => ({
      date,
      events: evs.sort((a, b) => b.time - a.time),
    }));

  // Stats
  const stats: Record<TimelineEventType, number> = {
    chat: 0, quiz: 0, homework: 0, voice: 0, achievement: 0, streak: 0,
  };
  for (const e of recent) {
    stats[e.type] = (stats[e.type] ?? 0) + 1;
  }

  return { timeline, stats };
}
