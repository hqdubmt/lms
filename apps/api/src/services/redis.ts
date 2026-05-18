import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// BullMQ requires maxRetriesPerRequest: null for blocking commands (Worker)
export function createBullMQConnection() {
  const conn = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  conn.on('error', (err) => console.error('BullMQ Redis error:', err));
  return conn;
}
