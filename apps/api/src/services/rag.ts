/**
 * RAG Service — muctieutoan.md Step 5
 * Flow: JSON → Embedding (Ollama) → Redis vector store → Cosine search → Ollama generate
 */

import { redis } from './redis';
import { callAIForJSON } from './ai-provider';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const EMBED_TTL = 7 * 24 * 3600; // 7 days

type RagSubject = 'math' | 'language' | 'viet';

function ragIndexKey(subject: RagSubject = 'math') { return `rag:${subject}:index`; }
function ragPrefix(subject: RagSubject = 'math') { return `rag:${subject}:concept:`; }

export interface RagEntry {
  id: string;
  text: string;
  vector: number[];
  metadata: {
    topicId: string;
    topicTitle: string;
    conceptName: string;
    grade: number;
    subject: string;
  };
}

// ─── Ollama embedding ─────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

export async function isEmbedModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json() as { models?: { name: string }[] };
    return (data.models ?? []).some(m => m.name.startsWith(EMBED_MODEL.split(':')[0]));
  } catch {
    return false;
  }
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Vector store (Redis) ─────────────────────────────────────────────────────

export async function upsertEntry(entry: RagEntry, subject: RagSubject = 'math'): Promise<void> {
  const key = `${ragPrefix(subject)}${entry.id}`;
  await redis.setex(key, EMBED_TTL, JSON.stringify(entry));
  await redis.sadd(ragIndexKey(subject), entry.id);
}

export async function deleteEntry(id: string, subject: RagSubject = 'math'): Promise<void> {
  await redis.del(`${ragPrefix(subject)}${id}`);
  await redis.srem(ragIndexKey(subject), id);
}

export async function searchConcepts(
  query: string,
  topK = 5,
  filter?: { grade?: number; subject?: string },
  ragSubject: RagSubject = 'math',
): Promise<Array<{ entry: RagEntry; score: number }>> {
  const queryVec = await embedText(query);
  if (!queryVec) return [];

  const ids = await redis.smembers(ragIndexKey(ragSubject));
  if (!ids.length) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(`${ragPrefix(ragSubject)}${id}`);
  const results = await pipeline.exec();

  const scored: Array<{ entry: RagEntry; score: number }> = [];
  for (const [, raw] of (results ?? [])) {
    if (!raw) continue;
    try {
      const entry = JSON.parse(raw as string) as RagEntry;
      if (filter?.grade && entry.metadata.grade !== filter.grade) continue;
      if (filter?.subject && entry.metadata.subject !== filter.subject) continue;
      const score = cosineSim(queryVec, entry.vector);
      scored.push({ entry, score });
    } catch { /* skip corrupt */ }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function getIndexStats(subject: RagSubject = 'math'): Promise<{ total: number; model: string; available: boolean }> {
  const total = await redis.scard(ragIndexKey(subject));
  const available = await isEmbedModelAvailable();
  return { total, model: EMBED_MODEL, available };
}

// ─── RAG Generate ─────────────────────────────────────────────────────────────

export async function ragGenerate(
  query: string,
  grade?: number,
  subject?: string,
  count = 10,
  ragSubject: RagSubject = 'math',
): Promise<{ questions: any[]; context: string; sources: string[] } | null> {
  const hits = await searchConcepts(query, 5, { grade, subject }, ragSubject);
  if (!hits.length) return null;

  const context = hits.map(h =>
    `[${h.entry.metadata.conceptName}] ${h.entry.text}`,
  ).join('\n\n');
  const sources = hits.map(h => h.entry.metadata.conceptName);

  const sys = 'Bạn là giáo viên Toán Việt Nam. Chỉ output JSON array hợp lệ. Không giải thích.';
  const prompt = `Dựa vào kiến thức Toán sau đây:

${context}

Hãy tạo ${count} bài tập đa dạng (easy/medium/hard/olympic) phù hợp với nội dung trên.
Output JSON array:
[
  {
    "question": "Câu hỏi cụ thể",
    "answer": "Đáp án chính xác",
    "difficulty": "easy",
    "hint": "Gợi ý ngắn"
  }
]
Đáp án ≠ câu hỏi. Không duplicate.`;

  const raw = await callAIForJSON(sys, prompt, 3000);
  if (!raw) return null;

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const questions = JSON.parse(match[0]);
    return { questions, context, sources };
  } catch {
    return null;
  }
}
