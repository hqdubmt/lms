/**
 * Achievement System — bổ sung độc lập, không sửa learning-state.ts
 * Feature flag: ENABLE_ACHIEVEMENT=true
 * Redis key: achievement:v2:{userId}   TTL 365 ngày
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_ACHIEVEMENT !== 'false';
const TTL = 365 * 24 * 3600;

function achievementKey(userId: string): string {
  return `achievement:v2:${userId}`;
}

export type AchievementId =
  | 'FIRST_CHAT'
  | 'FIRST_QUIZ'
  | 'FIRST_HOMEWORK'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'MASTERY_80'
  | 'MASTERY_100'
  | 'CHAT_100'
  | 'QUIZ_100'
  | 'HOMEWORK_HERO'
  | 'MATH_MASTER'
  | 'LANGUAGE_EXPERT';

export interface Achievement {
  id: AchievementId;
  label: string;
  description: string;
  unlockedAt: number | null;
}

const ACHIEVEMENT_DEFS: Record<AchievementId, { label: string; description: string }> = {
  FIRST_CHAT:      { label: 'Khởi đầu',         description: 'Gửi tin nhắn đầu tiên cho AI Tutor' },
  FIRST_QUIZ:      { label: 'Làm bài đầu tiên',  description: 'Hoàn thành bài quiz đầu tiên' },
  FIRST_HOMEWORK:  { label: 'Bài tập đầu tiên',  description: 'Nộp bài tập đầu tiên' },
  STREAK_7:        { label: 'Kiên trì 7 ngày',   description: 'Học liên tiếp 7 ngày' },
  STREAK_30:       { label: 'Học đều 30 ngày',   description: 'Học liên tiếp 30 ngày' },
  MASTERY_80:      { label: 'Thành thạo 80%',    description: 'Đạt mức thành thạo ≥80% một chủ đề' },
  MASTERY_100:     { label: 'Xuất sắc',           description: 'Đạt mức thành thạo 100% một chủ đề' },
  CHAT_100:        { label: '100 câu hỏi',        description: 'Gửi 100 tin nhắn cho AI Tutor' },
  QUIZ_100:        { label: 'Quiz Master',        description: 'Hoàn thành 100 bài quiz' },
  HOMEWORK_HERO:   { label: 'Homework Hero',      description: 'Nộp 10 bài tập về nhà' },
  MATH_MASTER:     { label: 'Math Master',        description: 'Đạt thành thạo ≥80% trong Toán học' },
  LANGUAGE_EXPERT: { label: 'Language Expert',   description: 'Đạt thành thạo ≥80% trong Ngoại ngữ' },
};

export interface AchievementStore {
  unlocked: Partial<Record<AchievementId, number>>;
}

async function getStore(userId: string): Promise<AchievementStore> {
  if (!ENABLED) return { unlocked: {} };
  const raw = await redis.get(achievementKey(userId));
  if (!raw) return { unlocked: {} };
  try {
    return { unlocked: {}, ...JSON.parse(raw) };
  } catch {
    return { unlocked: {} };
  }
}

export async function getAchievements(userId: string): Promise<Achievement[]> {
  if (!ENABLED) return [];
  const store = await getStore(userId);
  return (Object.keys(ACHIEVEMENT_DEFS) as AchievementId[]).map(id => ({
    id,
    ...ACHIEVEMENT_DEFS[id],
    unlockedAt: store.unlocked[id] ?? null,
  }));
}

export async function unlockAchievement(
  userId: string,
  id: AchievementId,
): Promise<{ newlyUnlocked: boolean; achievement: Achievement }> {
  if (!ENABLED) {
    return { newlyUnlocked: false, achievement: { id, ...ACHIEVEMENT_DEFS[id], unlockedAt: null } };
  }

  const store = await getStore(userId);
  const alreadyUnlocked = !!store.unlocked[id];

  if (!alreadyUnlocked) {
    store.unlocked[id] = Date.now();
    await redis.set(achievementKey(userId), JSON.stringify(store), 'EX', TTL);
  }

  return {
    newlyUnlocked: !alreadyUnlocked,
    achievement: { id, ...ACHIEVEMENT_DEFS[id], unlockedAt: store.unlocked[id] ?? null },
  };
}

export async function checkAndUnlockAchievements(
  userId: string,
  context: {
    chatCount?: number;
    quizCount?: number;
    homeworkCount?: number;
    currentStreak?: number;
    topMastery?: number;
    subject?: string;
  },
): Promise<AchievementId[]> {
  if (!ENABLED) return [];

  const store = await getStore(userId);
  const newlyUnlocked: AchievementId[] = [];

  const check = (id: AchievementId, condition: boolean) => {
    if (condition && !store.unlocked[id]) {
      store.unlocked[id] = Date.now();
      newlyUnlocked.push(id);
    }
  };

  check('FIRST_CHAT',      (context.chatCount ?? 0) >= 1);
  check('FIRST_QUIZ',      (context.quizCount ?? 0) >= 1);
  check('FIRST_HOMEWORK',  (context.homeworkCount ?? 0) >= 1);
  check('STREAK_7',        (context.currentStreak ?? 0) >= 7);
  check('STREAK_30',       (context.currentStreak ?? 0) >= 30);
  check('MASTERY_80',      (context.topMastery ?? 0) >= 0.8);
  check('MASTERY_100',     (context.topMastery ?? 0) >= 1.0);
  check('CHAT_100',        (context.chatCount ?? 0) >= 100);
  check('QUIZ_100',        (context.quizCount ?? 0) >= 100);
  check('HOMEWORK_HERO',   (context.homeworkCount ?? 0) >= 10);
  check('MATH_MASTER',     context.subject === 'math' && (context.topMastery ?? 0) >= 0.8);
  check('LANGUAGE_EXPERT', context.subject === 'language' && (context.topMastery ?? 0) >= 0.8);

  if (newlyUnlocked.length > 0) {
    await redis.set(achievementKey(userId), JSON.stringify(store), 'EX', TTL);
  }

  return newlyUnlocked;
}
