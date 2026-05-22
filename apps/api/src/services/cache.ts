import { redis } from './redis';

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached) as T;
  const result = await fn();
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
  return result;
}

export async function cacheDel(...keys: string[]) {
  if (keys.length) await redis.del(...keys);
}

export async function cacheDelPattern(pattern: string) {
  let cursor = '0';
  const toDelete: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    toDelete.push(...keys);
  } while (cursor !== '0');
  if (toDelete.length) await redis.del(...toDelete);
}
