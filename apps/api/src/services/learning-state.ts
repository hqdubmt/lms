import { redis } from './redis';

export interface LearningState {
  subject: string;
  grade?: string;
  currentLesson?: string;
  currentChapter?: string;
  progress: number; // 0-100
  weakTopics: string[];
  strongTopics: string[];
  updatedAt: number;
}

const STATE_TTL = 30 * 24 * 3600;

function stateKey(userId: string, subject: string) {
  return `learning-state:${userId}:${subject}`;
}

const defaultState = (subject: string): LearningState => ({
  subject,
  progress: 0,
  weakTopics: [],
  strongTopics: [],
  updatedAt: Date.now(),
});

export async function getLearningState(userId: string, subject: string): Promise<LearningState> {
  const raw = await redis.get(stateKey(userId, subject));
  if (!raw) return defaultState(subject);
  try {
    return { ...defaultState(subject), ...JSON.parse(raw) };
  } catch {
    return defaultState(subject);
  }
}

export async function updateLearningState(
  userId: string,
  subject: string,
  patch: Partial<Omit<LearningState, 'subject' | 'updatedAt'>>,
): Promise<LearningState> {
  const current = await getLearningState(userId, subject);
  const updated: LearningState = { ...current, ...patch, subject, updatedAt: Date.now() };
  await redis.set(stateKey(userId, subject), JSON.stringify(updated), 'EX', STATE_TTL);
  return updated;
}

export async function syncLearningStateFromBrain(
  userId: string,
  subject: string,
  brain: { topic: string | null; mistakes: Array<{ type: string; count: number }>; mastery: Record<string, number> },
): Promise<void> {
  const weakTopics = brain.mistakes
    .filter(m => m.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(m => m.type.slice(0, 40));

  const strongTopics = Object.entries(brain.mastery)
    .filter(([, v]) => v >= 0.7)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const patch: Partial<LearningState> = {};
  if (weakTopics.length > 0) patch.weakTopics = weakTopics;
  if (strongTopics.length > 0) patch.strongTopics = strongTopics;
  if (Object.keys(patch).length > 0) {
    await updateLearningState(userId, subject, patch);
  }
}
