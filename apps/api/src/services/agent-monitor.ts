/**
 * Agent Monitor — bổ sung độc lập, không sửa multi-agent.ts
 * Feature flag: ENABLE_AGENT_MONITOR=true
 * Redis key: agentmon:{agent}:{date}   TTL 30 ngày
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_AGENT_MONITOR !== 'false';
const TTL = 30 * 24 * 3600;

export type MonitoredAgent =
  | 'tutor'
  | 'math'
  | 'quiz'
  | 'homework'
  | 'knowledge_graph'
  | 'reflection'
  | 'self_correction'
  | 'critic'
  | 'planner';

export interface AgentStats {
  agent: MonitoredAgent;
  date: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

function agentKey(agent: MonitoredAgent, date: string): string {
  return `agentmon:${agent}:${date}`;
}

async function getAgentStats(agent: MonitoredAgent, date: string): Promise<AgentStats> {
  const raw = await redis.get(agentKey(agent, date));
  const base: AgentStats = {
    agent,
    date,
    callCount: 0,
    successCount: 0,
    errorCount: 0,
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

export async function recordAgentCall(
  agent: MonitoredAgent,
  latencyMs: number,
  success: boolean,
): Promise<void> {
  if (!ENABLED) return;

  const today = new Date().toISOString().slice(0, 10);
  const stats = await getAgentStats(agent, today);

  stats.callCount += 1;
  if (success) stats.successCount += 1;
  else stats.errorCount += 1;
  stats.totalLatencyMs += latencyMs;
  stats.avgLatencyMs = Math.round(stats.totalLatencyMs / stats.callCount);

  await redis.set(agentKey(agent, today), JSON.stringify(stats), 'EX', TTL);
}

export async function getAgentDashboard(
  days = 7,
): Promise<Record<MonitoredAgent, AgentStats[]>> {
  if (!ENABLED) {
    return {
      tutor: [], math: [], quiz: [], homework: [], knowledge_graph: [], reflection: [], self_correction: [], critic: [], planner: [],
    };
  }

  const agents: MonitoredAgent[] = ['tutor', 'math', 'quiz', 'homework', 'knowledge_graph', 'reflection', 'self_correction', 'critic', 'planner'];
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const result = {} as Record<MonitoredAgent, AgentStats[]>;
  await Promise.all(
    agents.map(async agent => {
      result[agent] = await Promise.all(dates.map(d => getAgentStats(agent, d)));
    }),
  );

  return result;
}
