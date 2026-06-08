/**
 * Prometheus Metrics — Phase 13
 * Expose /metrics endpoint in Prometheus text format.
 * No external lib needed — build metrics string manually.
 */

import os from 'os';
import { redis } from './redis';
import { prisma } from './prisma';

interface Counter {
  value: number;
  labels: Record<string, string>;
}

// In-memory counters (reset on restart; Prometheus scrapes frequently enough)
const counters: Record<string, number> = {
  ai_requests_total: 0,
  ai_errors_total: 0,
  ai_feedback_positive: 0,
  ai_feedback_negative: 0,
  http_requests_total: 0,
  http_errors_total: 0,
};

export function incCounter(name: keyof typeof counters, by = 1) {
  if (name in counters) counters[name] += by;
}

function gauge(name: string, help: string, value: number | string): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name} ${value}\n`;
}

function counter(name: string, help: string, value: number): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} counter\n${name}_total ${value}\n`;
}

async function getRedisInfo(): Promise<{ memory: number; connected_clients: number; ops_per_sec: number }> {
  try {
    const info = await redis.info('all');
    const parse = (key: string) => {
      const m = info.match(new RegExp(`${key}:(\\d+)`));
      return m ? parseInt(m[1]) : 0;
    };
    return {
      memory: parse('used_memory'),
      connected_clients: parse('connected_clients'),
      ops_per_sec: parse('instantaneous_ops_per_sec'),
    };
  } catch {
    return { memory: 0, connected_clients: 0, ops_per_sec: 0 };
  }
}

async function getDbStats(): Promise<{ user_count: number; course_count: number; enrollment_count: number }> {
  try {
    const [users, courses, enrollments] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
    ]);
    return { user_count: users, course_count: courses, enrollment_count: enrollments };
  } catch {
    return { user_count: 0, course_count: 0, enrollment_count: 0 };
  }
}

export async function buildMetrics(): Promise<string> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const uptime = process.uptime();

  const [redisInfo, dbStats] = await Promise.all([getRedisInfo(), getDbStats()]);

  const parts: string[] = [
    // System
    gauge('node_process_uptime_seconds', 'API process uptime in seconds', Math.round(uptime)),
    gauge('node_process_memory_bytes', 'RSS memory used by API process', process.memoryUsage().rss),
    gauge('system_cpu_load_1m', 'System CPU load average 1 minute', loadAvg[0].toFixed(4)),
    gauge('system_cpu_load_5m', 'System CPU load average 5 minutes', loadAvg[1].toFixed(4)),
    gauge('system_cpu_count', 'Number of CPU cores', cpus.length),
    gauge('system_memory_total_bytes', 'Total system memory', totalMem),
    gauge('system_memory_used_bytes', 'Used system memory', usedMem),
    gauge('system_memory_free_bytes', 'Free system memory', freeMem),

    // Redis
    gauge('redis_memory_bytes', 'Redis used memory in bytes', redisInfo.memory),
    gauge('redis_connected_clients', 'Redis connected clients', redisInfo.connected_clients),
    gauge('redis_ops_per_sec', 'Redis operations per second', redisInfo.ops_per_sec),

    // DB
    gauge('db_user_count', 'Total registered users', dbStats.user_count),
    gauge('db_course_count', 'Total courses', dbStats.course_count),
    gauge('db_enrollment_count', 'Total enrollments', dbStats.enrollment_count),

    // Application counters
    counter('ai_requests', 'Total AI chat requests', counters.ai_requests_total),
    counter('ai_errors', 'Total AI errors', counters.ai_errors_total),
    counter('ai_feedback_positive', 'Total positive AI feedback', counters.ai_feedback_positive),
    counter('ai_feedback_negative', 'Total negative AI feedback', counters.ai_feedback_negative),
    counter('http_requests', 'Total HTTP requests', counters.http_requests_total),
    counter('http_errors', 'Total HTTP 5xx errors', counters.http_errors_total),
  ];

  return parts.join('\n');
}
