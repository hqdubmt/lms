/**
 * Provider / Cost Monitor — bổ sung độc lập, không sửa ai-provider.ts
 * Feature flag: ENABLE_COST_MONITOR=true
 * Redis key: provmon:{provider}:{date}   TTL 90 ngày
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_COST_MONITOR !== 'false';
const TTL = 90 * 24 * 3600;

export type Provider = 'groq' | 'gemini' | 'ollama';

export interface ProviderStats {
  provider: Provider;
  date: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

function provKey(provider: Provider, date: string): string {
  return `provmon:${provider}:${date}`;
}

async function getProviderStats(provider: Provider, date: string): Promise<ProviderStats> {
  const raw = await redis.get(provKey(provider, date));
  const base: ProviderStats = {
    provider,
    date,
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    totalTokens: 0,
    totalLatencyMs: 0,
    avgLatencyMs: 0,
  };
  if (!raw) return base;
  try {
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return base;
  }
}

export async function recordProviderCall(
  provider: Provider,
  opts: { latencyMs: number; tokens?: number; success: boolean },
): Promise<void> {
  if (!ENABLED) return;

  const today = new Date().toISOString().slice(0, 10);
  const stats = await getProviderStats(provider, today);

  stats.requestCount += 1;
  if (opts.success) stats.successCount += 1;
  else stats.errorCount += 1;
  stats.totalLatencyMs += opts.latencyMs;
  stats.avgLatencyMs = Math.round(stats.totalLatencyMs / stats.requestCount);
  if (opts.tokens) stats.totalTokens += opts.tokens;

  await redis.set(provKey(provider, today), JSON.stringify(stats), 'EX', TTL);
}

export async function getProviderDashboard(
  days = 7,
): Promise<Record<Provider, ProviderStats[]>> {
  if (!ENABLED) return { groq: [], gemini: [], ollama: [] };

  const providers: Provider[] = ['groq', 'gemini', 'ollama'];
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const result = {} as Record<Provider, ProviderStats[]>;
  await Promise.all(
    providers.map(async p => {
      result[p] = await Promise.all(dates.map(d => getProviderStats(p, d)));
    }),
  );

  return result;
}

export async function getTotalTokenUsage(days = 30): Promise<number> {
  if (!ENABLED) return 0;

  const providers: Provider[] = ['groq', 'gemini', 'ollama'];
  let total = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dayStats = await Promise.all(providers.map(p => getProviderStats(p, date)));
    total += dayStats.reduce((s, d) => s + d.totalTokens, 0);
  }

  return total;
}
