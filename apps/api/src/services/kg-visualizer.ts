/**
 * Knowledge Graph Visualizer — bổ sung độc lập, không sửa RAG/Qdrant
 * Feature flag: ENABLE_KNOWLEDGE_GRAPH=true
 * Đọc từ kg:{userId}:{subject} (được tạo bởi knowledge-graph.ts)
 */

import { redis } from './redis';

const ENABLED = process.env.ENABLE_KNOWLEDGE_GRAPH !== 'false';

export interface KGVisualizerNode {
  id: string;
  label: string;
  description?: string;
  weight: number;
  prerequisites: string[];
  related: string[];
  children: string[];
  depth: number;
}

export interface KGVisualizerData {
  nodes: KGVisualizerNode[];
  edges: Array<{ from: string; to: string; type: 'prerequisite' | 'child' | 'related' }>;
  rootIds: string[];
  subject: string;
  builtAt: number;
}

function kgKey(userId: string, subject: string): string {
  return `kg:${userId}:${subject}`;
}

function computeDepth(
  nodeId: string,
  nodes: Record<string, { children: string[] }>,
  rootIds: string[],
  memo: Map<string, number> = new Map(),
): number {
  if (memo.has(nodeId)) return memo.get(nodeId)!;
  if (rootIds.includes(nodeId)) { memo.set(nodeId, 0); return 0; }

  let minParentDepth = -1;
  for (const [id, node] of Object.entries(nodes)) {
    if (node.children.includes(nodeId)) {
      const d = computeDepth(id, nodes, rootIds, memo);
      if (minParentDepth === -1 || d < minParentDepth) minParentDepth = d;
    }
  }

  const depth = minParentDepth === -1 ? 0 : minParentDepth + 1;
  memo.set(nodeId, depth);
  return depth;
}

export async function getKGVisualization(
  userId: string,
  subject: string,
): Promise<KGVisualizerData | null> {
  if (!ENABLED) return null;

  const raw = await redis.get(kgKey(userId, subject));
  if (!raw) return null;

  let kg: {
    subject: string;
    nodes: Record<string, { id: string; label: string; description?: string; children: string[]; related: string[]; weight: number }>;
    rootIds: string[];
    builtAt: number;
  };

  try {
    kg = JSON.parse(raw);
  } catch {
    return null;
  }

  const depthMemo = new Map<string, number>();
  const vizNodes: KGVisualizerNode[] = Object.values(kg.nodes).map(n => ({
    id: n.id,
    label: n.label,
    description: n.description,
    weight: n.weight,
    prerequisites: Object.values(kg.nodes)
      .filter(other => other.children.includes(n.id))
      .map(other => other.id),
    related: n.related,
    children: n.children,
    depth: computeDepth(n.id, kg.nodes, kg.rootIds, depthMemo),
  }));

  const edges: KGVisualizerData['edges'] = [];
  for (const n of Object.values(kg.nodes)) {
    for (const childId of n.children) {
      edges.push({ from: n.id, to: childId, type: 'child' });
    }
    for (const relId of n.related) {
      if (n.id < relId) edges.push({ from: n.id, to: relId, type: 'related' });
    }
  }

  return {
    nodes: vizNodes.sort((a, b) => a.depth - b.depth || b.weight - a.weight),
    edges,
    rootIds: kg.rootIds,
    subject: kg.subject,
    builtAt: kg.builtAt,
  };
}

export async function getTopicsForSubject(
  userId: string,
  subject: string,
): Promise<Array<{ id: string; label: string; prerequisites: string[]; related: string[] }>> {
  const viz = await getKGVisualization(userId, subject);
  if (!viz) return [];
  return viz.nodes.map(n => ({
    id: n.id,
    label: n.label,
    prerequisites: n.prerequisites,
    related: n.related,
  }));
}
