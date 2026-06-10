// Phase 1 — Danh sách agent được kích hoạt
// Agent cũ vẫn tồn tại trong code, chỉ không được gọi nếu không có trong list này.

export const ENABLED_AGENTS = [
  'tutor',
  'review',
  'planner',
  'language',
] as const;

export type EnabledAgent = (typeof ENABLED_AGENTS)[number];

export function isAgentEnabled(agent: string): agent is EnabledAgent {
  return (ENABLED_AGENTS as readonly string[]).includes(agent);
}
