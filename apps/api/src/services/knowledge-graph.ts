/**
 * Knowledge Graph — Feature 1 (chaiainc.md)
 * Biến markdown thành mạng tri thức (concept nodes + relationships).
 * Lưu Redis. Không thay đổi RAG hiện tại — đây là lớp bổ sung.
 *
 * Key: kg:{userId}:{subject}   TTL 30 days
 */

import { redis } from './redis';

const KG_TTL = 30 * 24 * 3600;

export interface KGNode {
  id: string;           // slug
  label: string;        // display name
  description?: string;
  children: string[];   // child node ids
  related: string[];    // peer node ids
  weight: number;       // importance 0–1 (frequency-based)
}

export interface KnowledgeGraph {
  subject: string;
  nodes: Record<string, KGNode>;
  rootIds: string[];    // top-level concept ids
  builtAt: number;
}

function kgKey(userId: string, subject: string) {
  return `kg:${userId}:${subject}`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ─── Concept Extractor ────────────────────────────────────────────────────────

const MATH_CONCEPTS: Array<{ label: string; keywords: RegExp; parent?: string }> = [
  { label: 'Phân số',         keywords: /phân số|fraction|tử số|mẫu số|numerator|denominator/i },
  { label: 'Tử số',           keywords: /tử số|numerator/i,              parent: 'Phân số' },
  { label: 'Mẫu số',          keywords: /mẫu số|denominator/i,           parent: 'Phân số' },
  { label: 'Rút gọn',         keywords: /rút gọn|simplif/i,              parent: 'Phân số' },
  { label: 'Phương trình',    keywords: /phương trình|equation/i },
  { label: 'Phương trình bậc nhất',  keywords: /bậc nhất|linear equation/i,  parent: 'Phương trình' },
  { label: 'Phương trình bậc hai',   keywords: /bậc hai|quadratic/i,          parent: 'Phương trình' },
  { label: 'Hệ phương trình', keywords: /hệ phương trình|system.*equation/i, parent: 'Phương trình' },
  { label: 'Hình học',        keywords: /hình học|geometry/i },
  { label: 'Tam giác',        keywords: /tam giác|triangle/i,            parent: 'Hình học' },
  { label: 'Hình chữ nhật',   keywords: /hình chữ nhật|rectangle/i,     parent: 'Hình học' },
  { label: 'Đường tròn',      keywords: /đường tròn|circle/i,            parent: 'Hình học' },
  { label: 'Đại số',          keywords: /đại số|algebra/i },
  { label: 'Xác suất',        keywords: /xác suất|probability/i },
  { label: 'Thống kê',        keywords: /thống kê|statistic/i,           parent: 'Xác suất' },
  { label: 'Hàm số',          keywords: /hàm số|function/i },
  { label: 'Đạo hàm',         keywords: /đạo hàm|derivative/i,          parent: 'Hàm số' },
  { label: 'Tích phân',       keywords: /tích phân|integral/i,           parent: 'Hàm số' },
  { label: 'Lượng giác',      keywords: /lượng giác|trigonometry|sin|cos|tan/i },
  { label: 'Logarit',         keywords: /logarit|logarithm|log/i },
  { label: 'Số học',          keywords: /số học|arithmetic/i },
  { label: 'Vector',          keywords: /vector/i },
  { label: 'Ma trận',         keywords: /ma trận|matrix/i },
  { label: 'Tổ hợp',          keywords: /tổ hợp|combinat/i },
];

const VIET_CONCEPTS: Array<{ label: string; keywords: RegExp; parent?: string }> = [
  { label: 'Ngữ pháp',        keywords: /ngữ pháp|grammar/i },
  { label: 'Câu',             keywords: /\bcâu\b|sentence/i,             parent: 'Ngữ pháp' },
  { label: 'Chủ ngữ',         keywords: /chủ ngữ|subject/i,             parent: 'Câu' },
  { label: 'Vị ngữ',          keywords: /vị ngữ|predicate/i,            parent: 'Câu' },
  { label: 'Từ vựng',         keywords: /từ vựng|vocabulary/i },
  { label: 'Chính tả',        keywords: /chính tả|spelling/i },
  { label: 'Tập làm văn',     keywords: /tập làm văn|composition|bài văn/i },
  { label: 'Đọc hiểu',        keywords: /đọc hiểu|reading comprehension/i },
];

const LANG_CONCEPTS: Array<{ label: string; keywords: RegExp; parent?: string }> = [
  { label: 'Grammar',         keywords: /grammar|ngữ pháp/i },
  { label: 'Tenses',          keywords: /tense|thì/i,                   parent: 'Grammar' },
  { label: 'Vocabulary',      keywords: /vocabulary|từ vựng/i },
  { label: 'Pronunciation',   keywords: /pronunciation|phát âm|IPA/i },
  { label: 'Reading',         keywords: /reading|đọc hiểu/i },
  { label: 'Writing',         keywords: /writing|bài viết/i },
  { label: 'Listening',       keywords: /listening|nghe hiểu/i },
  { label: 'Speaking',        keywords: /speaking|nói/i },
];

function getConceptMap(subject: string) {
  if (subject === 'math')     return MATH_CONCEPTS;
  if (subject === 'viet')     return VIET_CONCEPTS;
  if (subject === 'language') return LANG_CONCEPTS;
  return [...MATH_CONCEPTS, ...VIET_CONCEPTS];
}

// ─── Build Graph from Text ────────────────────────────────────────────────────

export async function buildKnowledgeGraph(
  userId: string,
  subject: string,
  text: string,
): Promise<KnowledgeGraph> {
  const existing = await getKnowledgeGraph(userId, subject);
  const nodes: Record<string, KGNode> = existing?.nodes ?? {};

  const concepts = getConceptMap(subject);
  const lines = text.split('\n');

  for (const concept of concepts) {
    const matchCount = lines.filter(l => concept.keywords.test(l)).length;
    if (matchCount === 0) continue;

    const id = slug(concept.label);
    const weight = Math.min(1, (nodes[id]?.weight ?? 0) + matchCount * 0.1);

    nodes[id] = {
      id,
      label: concept.label,
      children: nodes[id]?.children ?? [],
      related: nodes[id]?.related ?? [],
      weight,
    };

    // Wire parent → child
    if (concept.parent) {
      const parentId = slug(concept.parent);
      if (!nodes[parentId]) {
        nodes[parentId] = { id: parentId, label: concept.parent, children: [], related: [], weight: 0.1 };
      }
      if (!nodes[parentId].children.includes(id)) {
        nodes[parentId].children.push(id);
      }
    }
  }

  // Find root nodes (not a child of anyone)
  const allChildIds = new Set(Object.values(nodes).flatMap(n => n.children));
  const rootIds = Object.keys(nodes).filter(id => !allChildIds.has(id));

  const graph: KnowledgeGraph = { subject, nodes, rootIds, builtAt: Date.now() };
  await redis.set(kgKey(userId, subject), JSON.stringify(graph), 'EX', KG_TTL);
  return graph;
}

// ─── Query Graph ──────────────────────────────────────────────────────────────

export async function getKnowledgeGraph(userId: string, subject: string): Promise<KnowledgeGraph | null> {
  const raw = await redis.get(kgKey(userId, subject));
  if (!raw) return null;
  try { return JSON.parse(raw as string); } catch { return null; }
}

export async function getTopicSubgraph(
  userId: string,
  subject: string,
  topicLabel: string,
): Promise<{ node: KGNode; children: KGNode[]; siblings: KGNode[] } | null> {
  const graph = await getKnowledgeGraph(userId, subject);
  if (!graph) return null;

  const id = slug(topicLabel);
  const node = graph.nodes[id];
  if (!node) return null;

  const children = node.children.map(cid => graph.nodes[cid]).filter(Boolean);

  // Find siblings: nodes that share the same parent
  const siblings: KGNode[] = [];
  for (const parent of Object.values(graph.nodes)) {
    if (parent.children.includes(id)) {
      for (const sibId of parent.children) {
        if (sibId !== id && graph.nodes[sibId]) siblings.push(graph.nodes[sibId]);
      }
    }
  }

  return { node, children, siblings };
}

// ─── Get Top Concepts (by weight) ────────────────────────────────────────────

export async function getTopConcepts(
  userId: string,
  subject: string,
  limit = 10,
): Promise<KGNode[]> {
  const graph = await getKnowledgeGraph(userId, subject);
  if (!graph) return [];
  return Object.values(graph.nodes)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
