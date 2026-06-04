/**
 * Gamification 2.0 — XP, Level, Rank, Daily Quest, Weekly Quest
 * Module H: không sửa achievement/streak hiện tại
 * Redis key: xp:v1:{userId}   TTL 365 days
 */

import { redis } from './redis';

const TTL = 365 * 24 * 3600;
const XP_KEY = (userId: string) => `xp:v1:${userId}`;

// XP per activity
const XP_TABLE: Record<string, number> = {
  chat:     5,
  quiz:     20,
  homework: 25,
  voice:    15,
  study:    10,
};

// Level thresholds (total XP needed)
const LEVELS = [
  0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4500,
  6000, 7800, 10000, 12500, 15500, 19000, 23000, 28000, 34000, 41000,
];

// Rank tiers
const RANKS = [
  { minLevel: 0,  rank: 'Tập sự',     color: '#94a3b8' },
  { minLevel: 3,  rank: 'Học sinh',   color: '#22c55e' },
  { minLevel: 6,  rank: 'Siêng học',  color: '#3b82f6' },
  { minLevel: 9,  rank: 'Xuất sắc',   color: '#a855f7' },
  { minLevel: 13, rank: 'Tinh hoa',   color: '#f59e0b' },
  { minLevel: 17, rank: 'Huyền thoại', color: '#ef4444' },
];

export type QuestType = 'daily' | 'weekly';

export interface Quest {
  id: string;
  type: QuestType;
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
  xpProgress: number;      // 0-1
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
  history: Array<{ date: string; xp: number; reason: string }>;
  lastUpdated: number;
}

function getLevel(totalXP: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i]) return i;
  }
  return 0;
}

function getRank(level: number): { rank: string; color: string } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return { rank: RANKS[i].rank, color: RANKS[i].color };
  }
  return { rank: RANKS[0].rank, color: RANKS[0].color };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function endOfDay(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function endOfWeek(): number {
  const d = new Date();
  const daysUntilSunday = 7 - d.getDay();
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function generateDailyQuests(date: string): Quest[] {
  const seed = date.replace(/-/g, '');
  const n = parseInt(seed.slice(-2), 10);
  return [
    {
      id: `dq-chat-${date}`,
      type: 'daily',
      title: 'Chat với AI',
      description: 'Gửi 3 tin nhắn cho AI Tutor hôm nay',
      target: 3,
      progress: 0,
      xpReward: 30,
      completed: false,
      completedAt: null,
      expiresAt: endOfDay(),
    },
    {
      id: `dq-quiz-${date}`,
      type: 'daily',
      title: n % 2 === 0 ? 'Làm quiz' : 'Luyện tập',
      description: n % 2 === 0 ? 'Hoàn thành 1 bài quiz hôm nay' : 'Làm 1 bài tập hôm nay',
      target: 1,
      progress: 0,
      xpReward: 40,
      completed: false,
      completedAt: null,
      expiresAt: endOfDay(),
    },
    {
      id: `dq-study-${date}`,
      type: 'daily',
      title: 'Học 10 phút',
      description: 'Học trong ít nhất 10 phút hôm nay',
      target: 10,
      progress: 0,
      xpReward: 20,
      completed: false,
      completedAt: null,
      expiresAt: endOfDay(),
    },
  ];
}

function generateWeeklyQuests(weekDate: string): Quest[] {
  return [
    {
      id: `wq-streak-${weekDate}`,
      type: 'weekly',
      title: 'Streak 5 ngày',
      description: 'Học liên tiếp 5 ngày trong tuần này',
      target: 5,
      progress: 0,
      xpReward: 150,
      completed: false,
      completedAt: null,
      expiresAt: endOfWeek(),
    },
    {
      id: `wq-quiz-${weekDate}`,
      type: 'weekly',
      title: 'Quiz Champion',
      description: 'Hoàn thành 5 bài quiz trong tuần',
      target: 5,
      progress: 0,
      xpReward: 200,
      completed: false,
      completedAt: null,
      expiresAt: endOfWeek(),
    },
    {
      id: `wq-chat-${weekDate}`,
      type: 'weekly',
      title: 'Trợ lý AI',
      description: 'Chat với AI Tutor 15 lần trong tuần',
      target: 15,
      progress: 0,
      xpReward: 100,
      completed: false,
      completedAt: null,
      expiresAt: endOfWeek(),
    },
  ];
}

async function getXPStore(userId: string): Promise<XPData> {
  const raw = await redis.get(XP_KEY(userId)).catch(() => null);
  const tod = todayStr();
  const week = weekStart();

  if (raw) {
    try {
      const data: XPData = JSON.parse(raw);

      // Refresh expired quests
      const now = Date.now();
      const activeDailyDate = data.dailyQuests[0]?.id?.includes(tod);
      if (!activeDailyDate) {
        data.dailyQuests = generateDailyQuests(tod);
      }
      const activeWeekDate = data.weeklyQuests[0]?.id?.includes(week);
      if (!activeWeekDate) {
        data.weeklyQuests = generateWeeklyQuests(week);
      }

      return data;
    } catch { /* fall through */ }
  }

  const level = 0;
  const rankInfo = getRank(0);
  return {
    totalXP: 0,
    level,
    rank: rankInfo.rank,
    rankColor: rankInfo.color,
    xpToNextLevel: LEVELS[1],
    xpProgress: 0,
    dailyQuests: generateDailyQuests(tod),
    weeklyQuests: generateWeeklyQuests(week),
    history: [],
    lastUpdated: Date.now(),
  };
}

async function saveXPStore(userId: string, data: XPData): Promise<void> {
  const level = getLevel(data.totalXP);
  const rankInfo = getRank(level);
  const xpAtLevel = LEVELS[level] ?? 0;
  const xpAtNext = LEVELS[level + 1] ?? LEVELS[LEVELS.length - 1];
  const xpProgress = xpAtNext > xpAtLevel
    ? (data.totalXP - xpAtLevel) / (xpAtNext - xpAtLevel)
    : 1;

  data.level = level;
  data.rank = rankInfo.rank;
  data.rankColor = rankInfo.color;
  data.xpToNextLevel = Math.max(0, xpAtNext - data.totalXP);
  data.xpProgress = Math.min(1, Math.max(0, xpProgress));
  data.lastUpdated = Date.now();

  await redis.set(XP_KEY(userId), JSON.stringify(data), 'EX', TTL).catch(() => {});
}

export async function getXPData(userId: string): Promise<XPData> {
  return getXPStore(userId);
}

export async function awardXP(
  userId: string,
  activity: string,
  customXP?: number,
): Promise<{ xpGained: number; newTotal: number; levelUp: boolean; newLevel: number }> {
  const data = await getXPStore(userId);
  const oldLevel = data.level;
  const xpGained = customXP ?? (XP_TABLE[activity] ?? 5);

  data.totalXP += xpGained;

  const today = todayStr();
  const lastEntry = data.history[data.history.length - 1];
  if (lastEntry && lastEntry.date === today) {
    lastEntry.xp += xpGained;
  } else {
    data.history.push({ date: today, xp: xpGained, reason: activity });
    if (data.history.length > 90) data.history.shift();
  }

  // Update quest progress
  updateQuestProgress(data, activity);

  await saveXPStore(userId, data);
  return {
    xpGained,
    newTotal: data.totalXP,
    levelUp: data.level > oldLevel,
    newLevel: data.level,
  };
}

function updateQuestProgress(data: XPData, activity: string): void {
  const now = Date.now();
  for (const q of [...data.dailyQuests, ...data.weeklyQuests]) {
    if (q.completed || q.expiresAt < now) continue;

    let relevant = false;
    if (q.id.includes('chat') && activity === 'chat') relevant = true;
    if (q.id.includes('quiz') && activity === 'quiz') relevant = true;
    if ((q.id.includes('study') || q.id.includes('luyenTap')) && activity === 'study') relevant = true;
    if (q.id.includes('streak') && activity === 'streak') relevant = true;
    if (q.id.includes('homework') && activity === 'homework') relevant = true;

    if (relevant) {
      q.progress = Math.min(q.target, q.progress + 1);
      if (q.progress >= q.target && !q.completed) {
        q.completed = true;
        q.completedAt = now;
        data.totalXP += q.xpReward;
      }
    }
  }
}

export async function completeQuest(
  userId: string,
  questId: string,
): Promise<{ ok: boolean; xpGained: number } | null> {
  const data = await getXPStore(userId);
  const quest = [...data.dailyQuests, ...data.weeklyQuests].find(q => q.id === questId);
  if (!quest || quest.completed || quest.expiresAt < Date.now()) return null;

  quest.completed = true;
  quest.completedAt = Date.now();
  data.totalXP += quest.xpReward;

  await saveXPStore(userId, data);
  return { ok: true, xpGained: quest.xpReward };
}
