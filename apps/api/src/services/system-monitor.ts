/**
 * System Monitor — Module 6
 * Kiểm tra sức khỏe: API / Redis / MinIO / Qdrant (optional)
 * Không sửa bất kỳ service hiện tại nào.
 */

import { redis } from './redis';
import { minioClient } from './minio';
import { env } from '../config/env';

export type ComponentStatus = 'ok' | 'degraded' | 'down' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface SystemHealth {
  status: ComponentStatus;
  components: ComponentHealth[];
  uptimeSeconds: number;
  checkedAt: string;
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    const latencyMs = Date.now() - start;
    return {
      name: 'Redis',
      status: pong === 'PONG' ? 'ok' : 'degraded',
      latencyMs,
      detail: pong === 'PONG' ? undefined : `Unexpected response: ${pong}`,
    };
  } catch (err: any) {
    return { name: 'Redis', status: 'down', latencyMs: null, detail: err?.message ?? 'Connection failed' };
  }
}

async function checkMinio(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await Promise.race([
      minioClient.listBuckets(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    return { name: 'MinIO', status: 'ok', latencyMs: Date.now() - start };
  } catch (err: any) {
    return { name: 'MinIO', status: 'down', latencyMs: null, detail: err?.message ?? 'Connection failed' };
  }
}

async function checkQdrant(): Promise<ComponentHealth> {
  const qdrantUrl = process.env.QDRANT_URL;
  if (!qdrantUrl) {
    return { name: 'Qdrant', status: 'unknown', latencyMs: null, detail: 'QDRANT_URL not configured' };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${qdrantUrl}/healthz`, {
      signal: AbortSignal.timeout(3000),
    });
    const latencyMs = Date.now() - start;
    return {
      name: 'Qdrant',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { name: 'Qdrant', status: 'down', latencyMs: null, detail: err?.message ?? 'Connection failed' };
  }
}

function checkApi(): ComponentHealth {
  return {
    name: 'API',
    status: 'ok',
    latencyMs: 0,
    detail: `uptime ${Math.round(process.uptime())}s, pid ${process.pid}`,
  };
}

function aggregateStatus(components: ComponentHealth[]): ComponentStatus {
  if (components.some(c => c.status === 'down')) return 'down';
  if (components.some(c => c.status === 'degraded')) return 'degraded';
  if (components.every(c => c.status === 'ok')) return 'ok';
  return 'unknown';
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [apiHealth, redisHealth, minioHealth, qdrantHealth] = await Promise.all([
    Promise.resolve(checkApi()),
    checkRedis(),
    checkMinio(),
    checkQdrant(),
  ]);

  const components = [apiHealth, redisHealth, minioHealth, qdrantHealth];
  return {
    status: aggregateStatus(components),
    components,
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
  };
}
