/**
 * Smart Revision — Spaced Repetition system
 * Module B: GET /ai/revision, POST /ai/revision/complete
 * Redis key: revision:v1:{userId}   TTL 365 days
 * Không sửa Brain hiện tại.
 */

import { redis } from './redis';

const TTL = 365 * 24 * 3600;

function revKey(userId: string): string {
  return `revision:v1:${userId}`;
}

export interface RevisionItem {
  id: string;
  topic: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  easeFactor: number;      // SM-2 ease factor (min 1.3)
  interval: number;        // days until next review
  repetitions: number;     // times reviewed successfully
  dueDate: string;         // YYYY-MM-DD
  lastReview: string | null;
  addedAt: number;
}

export interface RevisionStore {
  items: RevisionItem[];
  lastUpdated: number;
}

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getStore(userId: string): Promise<RevisionStore> {
  const raw = await redis.get(revKey(userId)).catch(() => null);
  if (!raw) return { items: [], lastUpdated: Date.now() };
  try {
    return JSON.parse(raw);
  } catch {
    return { items: [], lastUpdated: Date.now() };
  }
}

async function saveStore(userId: string, store: RevisionStore): Promise<void> {
  store.lastUpdated = Date.now();
  await redis.set(revKey(userId), JSON.stringify(store), 'EX', TTL).catch(() => {});
}

export async function getRevisionQueue(userId: string): Promise<{
  due: RevisionItem[];
  upcoming: RevisionItem[];
  stats: { total: number; due: number; mastered: number };
}> {
  const store = await getStore(userId);
  const tod = today();

  const due = store.items.filter(i => i.dueDate <= tod).sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate),
  );
  const upcoming = store.items
    .filter(i => i.dueDate > tod)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 10);

  const mastered = store.items.filter(i => i.repetitions >= 5 && i.interval >= 21).length;

  return {
    due,
    upcoming,
    stats: { total: store.items.length, due: due.length, mastered },
  };
}

// quality: 0-5 (SM-2 scale)
// 0-2 = forgot, reset
// 3   = recalled with difficulty
// 4   = recalled well
// 5   = perfect recall
export async function completeRevision(
  userId: string,
  itemId: string,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): Promise<RevisionItem | null> {
  const store = await getStore(userId);
  const idx = store.items.findIndex(i => i.id === itemId);
  if (idx === -1) return null;

  const item = { ...store.items[idx] };
  const tod = today();

  // SM-2 algorithm
  if (quality < 3) {
    item.repetitions = 0;
    item.interval = 1;
  } else {
    if (item.repetitions === 0) item.interval = 1;
    else if (item.repetitions === 1) item.interval = 6;
    else item.interval = Math.round(item.interval * item.easeFactor);

    item.repetitions += 1;
  }

  // Update ease factor
  item.easeFactor = Math.max(
    MIN_EASE,
    item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  item.lastReview = tod;
  item.dueDate = addDays(tod, item.interval);

  store.items[idx] = item;
  await saveStore(userId, store);
  return item;
}

export async function addRevisionItem(
  userId: string,
  topic: string,
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
): Promise<RevisionItem> {
  const store = await getStore(userId);

  // Avoid duplicates
  const exists = store.items.find(
    i => i.topic.toLowerCase() === topic.toLowerCase() && i.subject === subject,
  );
  if (exists) return exists;

  const item: RevisionItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    topic,
    subject,
    difficulty,
    easeFactor: DEFAULT_EASE,
    interval: 1,
    repetitions: 0,
    dueDate: today(),
    lastReview: null,
    addedAt: Date.now(),
  };

  store.items.push(item);
  await saveStore(userId, store);
  return item;
}
