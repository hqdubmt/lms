/**
 * MATH PIPELINE — priority-weighted per toan.md
 *
 * Priority allocation:
 *   1. Parser Quality   35% — text extraction, formula preservation, lesson splitting, content richness
 *   2. Data Quality     30% — completeness, accuracy, self-critic, quality gate
 *   3. Validator        20% — schema check, repair, hallucination, duplicate removal
 *   4. Pipeline         10% — retry, cache, fallback routing, analytics
 *   5. AI Model          5% — model selection (minimal; just use what works)
 */

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { callAIForJSON } from './ai-provider';
import { redis } from './redis';
import type { MathConceptDraft, MathCurriculumEntry } from './file-import';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CurriculumInfo {
  grade: number | null;
  textbook: string | null;
  semester: number | null;
  subject: string | null;
}

export interface LessonChunk {
  title: string;
  text: string;
  index: number;
  parserScore: number;       // 0-1: how well-structured this chunk is
  formulaTokens: string[];   // formulas extracted before AI call
  mathSignals: string[];     // keywords/signals found by parser
}

export interface ToanLesson {
  subject: string;
  grade: number;
  lesson_type: string;
  topic: string;
  textbook?: string | null;
  knowledge: Array<{
    name: string; definition: string; formula: string;
    example: string; steps: string[]; hints: string[];
  }>;
  questions: Array<{
    question: string; answer: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'olympic';
  }>;
}

export interface PipelineAnalytics {
  totalLessons: number;
  validLessons: number;
  hallucinationCount: number;
  duplicateCount: number;
  repairCount: number;
  retryTotal: number;
  qualityScores: number[];
  avgQualityScore: number;
  avgParserScore: number;
  droppedByQualityGate: number;
  textbook: string | null;
  grade: number | null;
}

interface ValidationResult { valid: boolean; errors: string[] }

export const LESSON_TYPES = ['arithmetic', 'geometry', 'algebra', 'measurement', 'word_problem', 'logic'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'olympic'] as const;

export const LESSON_TYPE_TO_SUBJECT: Record<string, string> = {
  arithmetic: 'ARITHMETIC', geometry: 'GEOMETRY', algebra: 'ALGEBRA',
  measurement: 'MEASUREMENT', word_problem: 'WORD_PROBLEM', logic: 'LOGIC',
};

// Grade-subject compatibility (grade 1-2: only arithmetic/measurement/word_problem)
const GRADE_ALLOWED_TYPES: Record<number, string[]> = {
  1: ['arithmetic', 'measurement', 'word_problem'],
  2: ['arithmetic', 'measurement', 'word_problem'],
  3: ['arithmetic', 'measurement', 'word_problem', 'geometry'],
  4: ['arithmetic', 'measurement', 'word_problem', 'geometry'],
  5: ['arithmetic', 'measurement', 'word_problem', 'geometry'],
  6: ['arithmetic', 'algebra', 'geometry', 'measurement', 'word_problem', 'logic'],
  7: ['arithmetic', 'algebra', 'geometry', 'measurement', 'word_problem', 'logic'],
  8: ['arithmetic', 'algebra', 'geometry', 'measurement', 'word_problem', 'logic'],
  9: ['arithmetic', 'algebra', 'geometry', 'measurement', 'word_problem', 'logic'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: PARSER QUALITY (35%)
// Heaviest investment: clean text, extract formulas, score richness, split accurately
// ═══════════════════════════════════════════════════════════════════════════════

// 1a. Math Cleaner — comprehensive formula-aware cleaning
export function mathClean(text: string): string {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \t]+$/gm, '')
    // Normalize common OCR artifacts around operators
    .replace(/([0-9])\s*×\s*([0-9])/g, '$1 × $2')
    .replace(/([0-9])\s*÷\s*([0-9])/g, '$1 ÷ $2')
    .replace(/([0-9a-zA-Z])\s*=\s*([0-9a-zA-Z\-])/g, '$1 = $2')
    .replace(/([0-9a-zA-Z])\s*\+\s*([0-9a-zA-Z])/g, '$1 + $2')
    .replace(/([0-9a-zA-Z])\s*-\s*([0-9a-zA-Z])/g, '$1 - $2')
    // Normalize fraction-like patterns: 3/4 → 3/4 (preserve)
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2')
    // Normalize degree symbol
    .replace(/(\d)\s*°/g, '$1°')
    // Remove garbage chars but preserve math
    .replace(/[^\S\n]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    // Fix common OCR mistakes: 0 vs O, l vs 1 in math context
    .replace(/\bO\b(?=\s*[=+\-*/])/g, '0')
    .trim();
}

// 1b. Unicode Normalizer
export function unicodeNormalize(text: string): string {
  return text.normalize('NFC');
}

// 1c. Formula Token Extractor — extract before AI so formulas are never lost
export function extractFormulaTokens(text: string): string[] {
  const tokens: string[] = [];
  const patterns = [
    // Equations: x = ..., y = ..., S = ...
    /[A-ZĐÁÀẢÃẠ][a-záàảãạăâêôơưíìỉĩịéèẻẽẹúùủũụóòỏõọ]*\s*=\s*[^\n,;]{3,40}/g,
    // Fractions: 1/2, 3/4
    /\d+\/\d+/g,
    // Percentages
    /\d+(?:[.,]\d+)?\s*%/g,
    // Units with numbers
    /\d+(?:[.,]\d+)?\s*(?:cm|mm|dm|m|km|kg|g|mg|l|ml|°C|°|km²|m²|cm²)/g,
    // Arithmetic expressions
    /\d+\s*[+\-×÷*/]\s*\d+(?:\s*=\s*\d+)?/g,
    // Parenthesized expressions
    /\([^)]{3,30}\)/g,
  ];
  for (const pat of patterns) {
    const matches = text.match(pat) ?? [];
    tokens.push(...matches.filter((m) => m.trim().length > 2));
  }
  // Deduplicate
  return [...new Set(tokens)].slice(0, 30);
}

// 1d. Content Richness Check — is this chunk worth processing?
export function isContentRich(text: string): boolean {
  const lower = text.toLowerCase();
  const mathSignals = [
    /\d/, // has numbers
    /[+\-×÷=\/]/, // has operators
    /[a-zđáàảãạ]{3,}/, // has Vietnamese/Latin words
  ];
  const signalCount = mathSignals.filter((p) => p.test(lower)).length;
  if (signalCount < 2) return false;
  if (text.trim().length < 80) return false; // too short
  // Must have at least some educational content keywords
  const eduKeywords = /định nghĩa|khái niệm|quy tắc|công thức|định lý|ví dụ|bài|lesson|tính|giải|số|hình/i;
  return eduKeywords.test(text);
}

// 1e. Parser Confidence Score — how well-structured is this chunk?
export function parserConfidenceScore(chunk: Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>): number {
  let score = 0;
  const text = chunk.text;
  // Has a clear title/heading
  if (/^[Bb]ài|^[Tt]iết|^§|^[Cc]hương|^\d+\./.test(chunk.title)) score += 0.2;
  // Has content of reasonable length
  const len = text.length;
  if (len >= 200) score += 0.15;
  if (len >= 500) score += 0.1;
  if (len <= 3000) score += 0.05; // not too long
  // Has math signals
  if (/\d/.test(text)) score += 0.1;
  if (/[=+\-×÷]/.test(text)) score += 0.1;
  if (/công thức|formula|định nghĩa|definition/i.test(text)) score += 0.15;
  if (/ví dụ|example|giải|solution/i.test(text)) score += 0.1;
  if (/bài tập|exercise|câu hỏi|question/i.test(text)) score += 0.05;
  return Math.min(1, score);
}

// 1f. Curriculum Detector — rich grade/textbook/semester detection
export function detectCurriculum(text: string): CurriculumInfo {
  const gradePatterns = [
    /[Ll]ớp\s*(\d+)/,
    /[Tt]oán\s*(\d+)\b/,
    /[Mm]ath\s+grade\s*(\d+)/i,
    /\b[Gg]rade\s*(\d+)\b/,
    /[Cc]lasse?\s*(\d+)/i,
  ];
  let grade: number | null = null;
  for (const pat of gradePatterns) {
    const m = text.match(pat);
    if (m) { const g = parseInt(m[1]); if (g >= 1 && g <= 9) { grade = g; break; } }
  }

  let textbook: string | null = null;
  if (/[Cc]hân\s*trời\s*sáng\s*tạo/.test(text)) textbook = 'Chân trời sáng tạo';
  else if (/[Kk]ết\s*nối\s*tri\s*thức/.test(text)) textbook = 'Kết nối tri thức';
  else if (/[Cc]ánh\s*diều/.test(text)) textbook = 'Cánh diều';

  let semester: number | null = null;
  if (/[Hh]ọc\s*kỳ\s*(?:I|1)\b|HKI\b|kì\s*(?:I|1)\b/i.test(text)) semester = 1;
  else if (/[Hh]ọc\s*kỳ\s*(?:II|2)\b|HKII\b|kì\s*(?:II|2)\b/i.test(text)) semester = 2;

  let subject: string | null = null;
  if (/[Hh]ình học|[Gg]eometry/.test(text)) subject = 'GEOMETRY';
  else if (/[Đđ]ại số|[Aa]lgebra/.test(text)) subject = 'ALGEBRA';
  else if (/[Ss]tatistics|[Tt]hống kê/.test(text)) subject = 'STATISTICS';

  return { grade, textbook, semester, subject };
}

// 1g. Book Structure + Lesson Splitter — comprehensive Vietnamese textbook patterns
export function splitIntoLessons(text: string): LessonChunk[] {
  const lessonMarkers = [
    /^[Bb]ài\s+\d+[\s\.:]/,
    /^[Tt]iết\s+\d+[\s\.:]/,
    /^§\s*\d+[\s\.:]/,
    /^[Cc]hương\s+[IVXLCDM\d]+/,
    /^\d+\.\s+[A-ZĐÁÀẢÃẠĂÂÊÔƠƯÍÌỈĨỊÉÈẺẼẸÚÙỦŨỤÓÒỎÕỌ]/,
    /^[Ll]esson\s+\d+/,
    /^[Uu]nit\s+\d+/,
    // Bold-like (all caps line that looks like heading)
    /^[A-ZĐÁÀẢÃẠĂÂÊÔƠƯÍÌỈĨỊÉÈẺẼẸÚÙỦŨỤÓÒỎÕỌ\s]{10,50}$/,
  ];

  const lines = text.split('\n');
  const lessonStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    for (const pat of lessonMarkers) {
      if (pat.test(line)) { lessonStarts.push(i); break; }
    }
  }

  if (lessonStarts.length === 0) return enrichChunks(buildSemanticChunks(text)).filter((c) => isContentRich(c.text));

  const MAX_CHUNK = 3000;
  const MIN_CHUNK = 80;
  const raw: Array<Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>> = [];
  for (let i = 0; i < lessonStarts.length; i++) {
    const start = lessonStarts[i];
    const end = i + 1 < lessonStarts.length ? lessonStarts[i + 1] : lines.length;
    const chunkText = lines.slice(start, end).join('\n').trim();
    if (chunkText.length < MIN_CHUNK) continue;
    raw.push({ title: lines[start]?.trim() ?? `Bài ${i + 1}`, text: chunkText, index: i });
  }

  // Force-split oversized chunks
  const split: Array<Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>> = [];
  for (const chunk of raw) {
    if (chunk.text.length <= MAX_CHUNK) split.push(chunk);
    else {
      for (let s = 0, sub = 0; s < chunk.text.length; s += MAX_CHUNK, sub++) {
        split.push({
          title: sub === 0 ? chunk.title : `${chunk.title} (${sub + 1})`,
          text: chunk.text.slice(s, s + MAX_CHUNK),
          index: chunk.index * 100 + sub,
        });
      }
    }
  }

  const result = split.length > 0 ? split : buildSemanticChunks(text);
  return enrichChunks(result).filter((c) => isContentRich(c.text));
}

function enrichChunks(raw: Array<Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>>): LessonChunk[] {
  return raw.map((c): LessonChunk => ({
    ...c,
    parserScore: parserConfidenceScore(c),
    formulaTokens: extractFormulaTokens(c.text),
    mathSignals: detectMathSignals(c.text),
  }));
}

function buildSemanticChunks(text: string): Array<Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>> {
  const paragraphs = text.split(/\n\n+/);
  const chunks: Array<Omit<LessonChunk, 'parserScore' | 'formulaTokens' | 'mathSignals'>> = [];
  let current = '', idx = 0;
  for (const para of paragraphs) {
    if (current.length + para.length > 2500 && current.length > 0) {
      chunks.push({ title: `Phần ${idx + 1}`, text: current.trim(), index: idx++ });
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push({ title: `Phần ${idx + 1}`, text: current.trim(), index: idx });
  return chunks.filter((c) => c.text.length > 50);
}

// 1h. Math Signal Detector — for prompt enrichment
function detectMathSignals(text: string): string[] {
  const signals: string[] = [];
  const lower = text.toLowerCase();
  if (/cộng|trừ|nhân|chia|tổng|hiệu|tích|thương/.test(lower)) signals.push('arithmetic');
  if (/hình|tam giác|tứ giác|đường tròn|chu vi|diện tích/.test(lower)) signals.push('geometry');
  if (/phương trình|ẩn số|biểu thức|hệ số/.test(lower)) signals.push('algebra');
  if (/cm|mm|km|kg|gam|lít|giờ|phút|đơn vị/.test(lower)) signals.push('measurement');
  if (/bài toán|hỏi rằng|tìm số|bao nhiêu/.test(lower)) signals.push('word_problem');
  if (/suy luận|chứng minh|lập luận/.test(lower)) signals.push('logic');
  return signals;
}

// 1i. Math Type Detector — multi-signal with grade-aware filtering
export function detectMathType(text: string, grade?: number | null): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {
    geometry: 0, algebra: 0, measurement: 0, word_problem: 0, logic: 0, arithmetic: 0,
  };
  if (/hình|tam giác|tứ giác|đường tròn|chu vi|diện tích|thể tích|góc|cạnh|đỉnh/.test(lower)) scores.geometry += 3;
  if (/phương trình|ẩn số|nghiệm|biểu thức|hệ số|biến số|đại số/.test(lower)) scores.algebra += 3;
  if (/đơn vị|cm|mm|km|kg|gam|lít|giờ|phút|giây|nhiệt độ|chiều dài|khối lượng/.test(lower)) scores.measurement += 3;
  if (/bài toán có lời|hỏi rằng|tìm số|bao nhiêu|còn lại|tất cả/.test(lower)) scores.word_problem += 3;
  if (/suy luận|chứng minh|lập luận|nếu.*thì|tổng quát hóa/.test(lower)) scores.logic += 3;
  if (/cộng|trừ|nhân|chia|tổng|hiệu|tích|thương|phân số|số thập phân|số nguyên/.test(lower)) scores.arithmetic += 2;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'arithmetic';

  // Grade-content alignment: enforce allowed types per grade
  if (grade && GRADE_ALLOWED_TYPES[grade]) {
    const allowed = GRADE_ALLOWED_TYPES[grade];
    if (!allowed.includes(best)) {
      // Fall back to first allowed type with a score
      const fallback = allowed.find((t) => scores[t] > 0) ?? allowed[0];
      return fallback;
    }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: DATA QUALITY (30%)
// Self-critic always runs, completeness enforced, quality gate at 45
// ═══════════════════════════════════════════════════════════════════════════════

// 2a. Quality Scorer — weighted 0-100
export function scoreLesson(lesson: ToanLesson): number {
  let score = 0;

  // Structural validity (20 pts)
  if (lesson.topic?.trim()) score += 8;
  if (lesson.grade >= 1 && lesson.grade <= 9) score += 6;
  if (LESSON_TYPES.includes(lesson.lesson_type as any)) score += 6;

  // Knowledge completeness (50 pts) — DATA QUALITY is most of the score
  const kItems = lesson.knowledge ?? [];
  const kCount = kItems.length;
  score += Math.min(15, kCount * 4);  // up to 15 for ≥4 items

  if (kCount > 0) {
    // Definition quality
    const avgDefLen = kItems.reduce((s, k) => s + (k.definition?.length ?? 0), 0) / kCount;
    if (avgDefLen >= 80) score += 12;
    else if (avgDefLen >= 40) score += 8;
    else if (avgDefLen >= 15) score += 4;

    // Formula presence (proves content depth)
    const withFormula = kItems.filter((k) => k.formula?.trim()).length;
    if (withFormula / kCount >= 0.5) score += 8;
    else if (withFormula / kCount >= 0.25) score += 4;

    // Steps presence (proves pedagogical quality)
    const withSteps = kItems.filter((k) => Array.isArray(k.steps) && k.steps.length >= 2).length;
    if (withSteps / kCount >= 0.5) score += 8;
    else if (withSteps / kCount >= 0.25) score += 4;

    // Hints presence
    const withHints = kItems.filter((k) => Array.isArray(k.hints) && k.hints.length > 0).length;
    if (withHints / kCount >= 0.5) score += 7;
  }

  // Question quality (30 pts)
  const qItems = lesson.questions ?? [];
  const qCount = qItems.length;
  score += Math.min(12, qCount * 3);   // up to 12 for ≥4 questions

  if (qCount > 0) {
    // Difficulty diversity
    const diffSet = new Set(qItems.map((q) => q.difficulty));
    score += Math.min(10, diffSet.size * 3);

    // All answers non-empty
    const withAnswer = qItems.filter((q) => q.answer?.trim().length >= 1).length;
    if (withAnswer === qCount) score += 8;

    // Answer != question (no copy-paste)
    const coherent = qItems.filter((q) => q.answer?.trim() !== q.question?.trim()).length;
    if (coherent === qCount) score += 0; // already counted above, bonus only if all coherent
  }

  return Math.min(100, Math.round(score));
}

// 2b. Minimum quality gate — below 45 means data is too poor to save
const QUALITY_GATE = 45;

// 2c. Data Completeness Enforcer — fix obvious gaps before self-critic
function enforceCompleteness(lesson: ToanLesson): ToanLesson {
  return {
    ...lesson,
    knowledge: (lesson.knowledge ?? []).map((k) => ({
      name: k.name?.trim() || 'Khái niệm',
      definition: k.definition?.trim() || k.example?.trim() || '(thiếu định nghĩa)',
      formula: k.formula ?? '',
      example: k.example ?? '',
      steps: Array.isArray(k.steps) ? k.steps.filter(Boolean) : [],
      hints: Array.isArray(k.hints) ? k.hints.filter(Boolean) : [],
    })),
    questions: (lesson.questions ?? []).map((q) => ({
      question: q.question?.trim() || '',
      answer: q.answer?.trim() || '',
      difficulty: DIFFICULTIES.includes(q.difficulty as any) ? q.difficulty : 'easy',
    })),
  };
}

// 2d. Self-Critic Agent — always runs when score < 75 (strict threshold)
async function selfCritic(lesson: ToanLesson, chunk: LessonChunk, score: number): Promise<ToanLesson> {
  if (score >= 75) return lesson;

  const issues: string[] = [];
  const kCount = lesson.knowledge?.length ?? 0;
  const qCount = lesson.questions?.length ?? 0;
  if (kCount < 3) issues.push(`knowledge chỉ có ${kCount} items (cần ≥3)`);
  if (qCount < 3) issues.push(`questions chỉ có ${qCount} items (cần ≥3)`);
  const noSteps = (lesson.knowledge ?? []).filter((k) => !k.steps?.length).length;
  if (noSteps > 0) issues.push(`${noSteps} knowledge items thiếu steps`);
  const noDef = (lesson.knowledge ?? []).filter((k) => (k.definition?.length ?? 0) < 20).length;
  if (noDef > 0) issues.push(`${noDef} knowledge items có definition quá ngắn`);
  const diffSet = new Set((lesson.questions ?? []).map((q) => q.difficulty));
  if (diffSet.size < 2) issues.push('questions thiếu đa dạng difficulty (cần ≥2 mức)');
  if (chunk.formulaTokens.length > 0) {
    const formulaInLesson = (lesson.knowledge ?? []).some((k) => k.formula?.trim());
    if (!formulaInLesson) issues.push(`có ${chunk.formulaTokens.length} công thức trong tài liệu nhưng không được trích xuất`);
  }

  if (issues.length === 0) return lesson;

  const formulaHint = chunk.formulaTokens.length > 0
    ? `\nCÁC CÔNG THỨC TRONG TÀI LIỆU: ${chunk.formulaTokens.slice(0, 8).join(' | ')}`
    : '';

  const sys = 'Bạn là hệ thống cải thiện chất lượng bài học Toán. Chỉ output JSON object hợp lệ. Không giải thích.';
  const prompt = `Bài học Toán sau có điểm chất lượng ${score}/100. Vấn đề: ${issues.join('; ')}.
Bổ sung và cải thiện từ TÀI LIỆU GỐC. KHÔNG bịa đặt.${formulaHint}

BÀI HIỆN TẠI:
${JSON.stringify(lesson, null, 2)}

TÀI LIỆU GỐC:
${chunk.text.slice(0, 2500)}

Output bài học đã cải thiện (cùng JSON format, cùng lesson_type="${lesson.lesson_type}", grade=${lesson.grade}):`;

  const raw = await callAIForJSON(sys, prompt, 3500);
  if (!raw) return lesson;
  const repaired = repairToanJSON(raw);
  if (!repaired) return lesson;
  try {
    const improved = JSON.parse(repaired) as ToanLesson;
    const newScore = scoreLesson(improved);
    if (newScore > score) {
      return enforceCompleteness(improved);
    }
  } catch { /* keep original */ }
  return lesson;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 3: VALIDATOR QUALITY (20%)
// Thorough schema check, smart repair, hallucination + duplicate removal
// ═══════════════════════════════════════════════════════════════════════════════

// 3a. Validator Agent — comprehensive rules
export function validateToanLesson(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['not an object'] };

  if (!data.topic || typeof data.topic !== 'string' || !data.topic.trim())
    errors.push('topic: missing');
  if (typeof data.grade !== 'number' || data.grade < 1 || data.grade > 9)
    errors.push(`grade: must be 1-9, got ${data.grade}`);
  if (!LESSON_TYPES.includes(data.lesson_type))
    errors.push(`lesson_type: invalid "${data.lesson_type}"`);

  // Grade-lessonType alignment
  if (data.grade && data.lesson_type && GRADE_ALLOWED_TYPES[data.grade]) {
    if (!GRADE_ALLOWED_TYPES[data.grade].includes(data.lesson_type))
      errors.push(`lesson_type "${data.lesson_type}" not appropriate for grade ${data.grade}`);
  }

  if (!Array.isArray(data.knowledge) || data.knowledge.length === 0)
    errors.push('knowledge: empty array');

  const knowledgeNames = new Set<string>();
  for (let i = 0; i < (data.knowledge ?? []).length; i++) {
    const k = data.knowledge[i];
    if (!k?.name?.trim()) { errors.push(`knowledge[${i}].name: missing`); continue; }
    if (knowledgeNames.has(k.name.trim().toLowerCase()))
      errors.push(`knowledge[${i}].name: duplicate "${k.name}"`);
    knowledgeNames.add(k.name.trim().toLowerCase());
    if (!k?.definition || (k.definition?.length ?? 0) < 10)
      errors.push(`knowledge[${i}].definition: too short (<10 chars)`);
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0)
    errors.push('questions: empty array');

  for (let i = 0; i < (data.questions ?? []).length; i++) {
    const q = data.questions[i];
    if (!q?.question?.trim()) errors.push(`questions[${i}].question: missing`);
    if (!q?.answer?.trim()) errors.push(`questions[${i}].answer: missing`);
    // Answer-question coherence: answer must not equal question
    if (q?.answer?.trim() === q?.question?.trim())
      errors.push(`questions[${i}]: answer identical to question`);
    if (q?.difficulty && !DIFFICULTIES.includes(q.difficulty))
      errors.push(`questions[${i}].difficulty: invalid "${q.difficulty}"`);
  }

  return { valid: errors.length === 0, errors };
}

// 3b. Repair Agent — smart JSON repair
export function repairToanJSON(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim();

  // Strip markdown code blocks
  text = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim();

  // Prefer single JSON object
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    // Try array, take first element
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (!arrMatch) return null;
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) return JSON.stringify(arr[0]);
    } catch { /* fall through */ }
    return null;
  }

  text = objMatch[0];
  // Fix trailing commas
  text = text.replace(/,(\s*[}\]])/g, '$1');
  // Fix undefined values
  text = text.replace(/:\s*undefined/g, ': null');
  // Remove non-printable control characters (preserve \n \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  // Fix unquoted keys (basic)
  text = text.replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3');
  // Remove duplicate commas
  text = text.replace(/,\s*,/g, ',');

  try { JSON.parse(text); return text; } catch { return null; }
}

// 3c. Hallucination Detector — per-item checks
export function detectHallucination(lesson: ToanLesson, sourceText: string): string[] {
  const flags: string[] = [];
  const source = sourceText.toLowerCase();

  // Topic must relate to source
  const topicWords = (lesson.topic ?? '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (topicWords.length > 0 && !topicWords.some((w) => source.includes(w)))
    flags.push(`topic "${lesson.topic}" not found in source`);

  if (lesson.grade < 1 || lesson.grade > 9) flags.push(`grade ${lesson.grade} out of range`);

  for (const k of lesson.knowledge ?? []) {
    if ((k.definition?.length ?? 0) < 5) flags.push(`empty definition: ${k.name}`);
    if (k.formula && k.formula.length > 200) flags.push(`suspiciously long formula: ${k.name}`);
    // Check if definition keywords appear in source (loose check)
    if (k.definition && k.definition.length > 30) {
      const defWords = k.definition.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const hit = defWords.filter((w) => source.includes(w)).length;
      if (hit < Math.min(2, defWords.length * 0.2))
        flags.push(`definition may be hallucinated: ${k.name}`);
    }
  }

  for (const q of lesson.questions ?? []) {
    if (!q.answer?.trim()) flags.push(`empty answer: ${q.question?.slice(0, 40)}`);
    if (q.answer?.trim() === q.question?.trim()) flags.push(`answer = question: ${q.question?.slice(0, 40)}`);
  }

  return flags;
}

// 3d. Duplicate Agent — deduplicate questions AND knowledge names
export function removeDuplicates(lesson: ToanLesson): { lesson: ToanLesson; count: number } {
  let count = 0;

  const seenQ = new Set<string>();
  const uniqueQ = (lesson.questions ?? []).filter((q) => {
    const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
    if (seenQ.has(key)) { count++; return false; }
    seenQ.add(key);
    return true;
  });

  const seenK = new Set<string>();
  const uniqueK = (lesson.knowledge ?? []).filter((k) => {
    const key = k.name.toLowerCase().trim();
    if (seenK.has(key)) { count++; return false; }
    seenK.add(key);
    return true;
  });

  return { lesson: { ...lesson, questions: uniqueQ, knowledge: uniqueK }, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4: PIPELINE (10%)
// Retry, cache, fallback routing — simple and reliable
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_RETRIES = 2;
const CACHE_TTL = 86400;

function cacheKey(text: string): string {
  return `math:v2:${crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
}

async function getCached(text: string): Promise<ToanLesson | null> {
  try {
    const v = await redis.get(cacheKey(text));
    return v ? (JSON.parse(v) as ToanLesson) : null;
  } catch { return null; }
}

async function setCache(text: string, lesson: ToanLesson): Promise<void> {
  try { await redis.setex(cacheKey(text), CACHE_TTL, JSON.stringify(lesson)); } catch { /* ignore */ }
}

// Output Normalizer
function normalizeLesson(lesson: ToanLesson, curriculum: CurriculumInfo): ToanLesson {
  const grade = lesson.grade ?? curriculum.grade ?? 5;
  const rawType = lesson.lesson_type;
  const lesson_type = LESSON_TYPES.includes(rawType as any)
    ? rawType
    : detectMathType('', grade);
  return {
    subject: 'Toán',
    grade,
    lesson_type,
    topic: (lesson.topic ?? '').trim().slice(0, 200) || chunk_title(lesson),
    textbook: lesson.textbook ?? curriculum.textbook ?? null,
    knowledge: (lesson.knowledge ?? []).map((k) => ({
      name: (k.name ?? '').trim().slice(0, 200),
      definition: (k.definition ?? '').trim(),
      formula: (k.formula ?? '').trim(),
      example: (k.example ?? '').trim(),
      steps: Array.isArray(k.steps) ? k.steps.filter(Boolean) : [],
      hints: Array.isArray(k.hints) ? k.hints.filter(Boolean) : [],
    })).filter((k) => k.name && k.definition),
    questions: (lesson.questions ?? []).map((q) => ({
      question: (q.question ?? '').trim(),
      answer: (q.answer ?? '').trim(),
      difficulty: DIFFICULTIES.includes(q.difficulty as any) ? q.difficulty : 'easy',
    })).filter((q) => q.question && q.answer),
  };
}

function chunk_title(lesson: ToanLesson): string {
  return `Bài học Toán lớp ${lesson.grade ?? '?'}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 5: AI MODEL (5%)
// Just use what's available — Claude primary, Groq/Gemini/Ollama fallback
// ═══════════════════════════════════════════════════════════════════════════════

function buildPrompt(chunk: LessonChunk, curriculum: CurriculumInfo): string {
  const grade = curriculum.grade ?? 5;
  const type = detectMathType(chunk.text, grade);
  const tbHint = curriculum.textbook ? `Bộ sách: ${curriculum.textbook}.` : '';
  const formulaHint = chunk.formulaTokens.length > 0
    ? `\nCÁC CÔNG THỨC ĐÃ PHÁT HIỆN: ${chunk.formulaTokens.slice(0, 10).join(' | ')}`
    : '';
  const signalHint = chunk.mathSignals.length > 0
    ? `\nTÍN HIỆU TOÁN: ${chunk.mathSignals.join(', ')}`
    : '';

  return `Bạn là hệ thống AI giáo dục Toán tiểu học và THCS Việt Nam (lớp 1-9).
${tbHint}${formulaHint}${signalHint}
Phân tích bài học Toán lớp ${grade}. Process ONE LESSON ONLY. Chỉ trích xuất nội dung CÓ TRONG tài liệu.

=== BÀI HỌC (parser score: ${(chunk.parserScore * 100).toFixed(0)}%) ===
${chunk.text}
=== HẾT ===

Output CHỈ một JSON object:
{
  "subject": "Toán",
  "grade": ${grade},
  "lesson_type": "${type}",
  "topic": "Tên bài học ngắn gọn trích từ tài liệu",
  "textbook": ${curriculum.textbook ? `"${curriculum.textbook}"` : 'null'},
  "knowledge": [
    {
      "name": "Tên khái niệm/quy tắc/định lý",
      "definition": "Định nghĩa ≥30 ký tự, rõ ràng, phù hợp lớp ${grade}",
      "formula": "Công thức nếu có, rỗng '' nếu không",
      "example": "Ví dụ cụ thể với số thực",
      "steps": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
      "hints": ["Gợi ý 1", "Gợi ý 2"]
    }
  ],
  "questions": [
    { "question": "Câu hỏi", "answer": "Đáp án chính xác ≠ câu hỏi", "difficulty": "easy" },
    { "question": "Câu hỏi", "answer": "Đáp án", "difficulty": "medium" },
    { "question": "Câu hỏi", "answer": "Đáp án", "difficulty": "hard" }
  ]
}
RULES: lesson_type ∈ {${LESSON_TYPES.join('|')}}. difficulty ∈ {easy|medium|hard|olympic}.
knowledge: 3-8 items. questions: 3-6 items. Không duplicate. Đáp án ≠ câu hỏi.`;
}

const AI_SYSTEM = 'Bạn là hệ thống AI giáo dục Toán tiểu học THCS Việt Nam. Chỉ output JSON object hợp lệ. Không markdown. Không bịa đặt.';

async function callWithClaude(chunk: LessonChunk, curriculum: CurriculumInfo, analytics: PipelineAnalytics): Promise<ToanLesson | null> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const prompt = buildPrompt(chunk, curriculum);
  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) analytics.retryTotal++;
    const retryHint = attempt > 0 ? `\n\n[RETRY ${attempt}] Lỗi trước: ${lastError}. Sửa JSON.` : '';
    try {
      const res = await client.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
        system: AI_SYSTEM,
        messages: [{ role: 'user', content: prompt + retryHint }],
      });
      const raw = (res.content[0] as any).text as string;
      const result = processRawAIOutput(raw, chunk, curriculum, analytics);
      if (result) return result;
      lastError = 'validation failed';
    } catch (e: any) { lastError = e.message; }
  }
  return null;
}

async function callWithFallback(chunk: LessonChunk, curriculum: CurriculumInfo, analytics: PipelineAnalytics): Promise<ToanLesson | null> {
  const prompt = buildPrompt(chunk, curriculum);
  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) analytics.retryTotal++;
    const raw = await callAIForJSON(AI_SYSTEM, prompt + (attempt > 0 ? `\n[RETRY ${attempt}] Lỗi: ${lastError}` : ''), 4000);
    if (!raw) { lastError = 'no response'; continue; }
    const result = processRawAIOutput(raw, chunk, curriculum, analytics);
    if (result) return result;
    lastError = 'validation failed';
  }
  return null;
}

// Shared post-processing for both AI paths (Tier 2 + 3 applied here)
function processRawAIOutput(
  raw: string,
  chunk: LessonChunk,
  curriculum: CurriculumInfo,
  analytics: PipelineAnalytics,
): ToanLesson | null {
  // Tier 3: Repair
  const repaired = repairToanJSON(raw);
  if (!repaired) { analytics.repairCount++; return null; }

  let parsed: any;
  try { parsed = JSON.parse(repaired); } catch { return null; }

  // Tier 3: Validate
  const v = validateToanLesson(parsed);
  if (!v.valid) return null;

  // Tier 3: Hallucination check
  const hFlags = detectHallucination(parsed, chunk.text);
  if (hFlags.length > 3) { analytics.hallucinationCount++; return null; }
  if (hFlags.length > 0) analytics.hallucinationCount++;

  // Tier 3: Deduplicate
  const { lesson: deduped, count: dupCount } = removeDuplicates(parsed);
  analytics.duplicateCount += dupCount;

  // Tier 4: Normalize
  const normalized = normalizeLesson(deduped, curriculum);

  // Tier 2: Completeness enforcer
  return enforceCompleteness(normalized);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProcessOpts {
  grade?: number;
  subject?: string;
  generateExercises?: boolean;
  userId?: string;
}

export interface ProcessResult {
  entries: MathCurriculumEntry[];
  analytics: PipelineAnalytics;
  curriculum: CurriculumInfo;
}

export async function processMathDocument(
  rawText: string,
  opts: ProcessOpts = {},
): Promise<ProcessResult> {
  // Tier 1: Parser — clean + normalize
  const cleaned = unicodeNormalize(mathClean(rawText));

  // Tier 1: Curriculum Detector
  const curriculum = detectCurriculum(cleaned);
  if (opts.grade) curriculum.grade = opts.grade;

  const analytics: PipelineAnalytics = {
    totalLessons: 0, validLessons: 0,
    hallucinationCount: 0, duplicateCount: 0,
    repairCount: 0, retryTotal: 0,
    qualityScores: [], avgQualityScore: 0, avgParserScore: 0,
    droppedByQualityGate: 0,
    textbook: curriculum.textbook, grade: curriculum.grade,
  };

  // Tier 1: Lesson Splitter (one lesson at a time)
  const chunks = splitIntoLessons(cleaned);
  analytics.totalLessons = chunks.length;

  if (chunks.length > 0) {
    analytics.avgParserScore = chunks.reduce((s, c) => s + c.parserScore, 0) / chunks.length;
  }

  const entries: MathCurriculumEntry[] = [];

  for (const chunk of chunks) {
    // Tier 4: Cache check
    const cached = await getCached(chunk.text);
    if (cached) {
      const score = scoreLesson(cached);
      if (score >= QUALITY_GATE) {
        analytics.qualityScores.push(score);
        analytics.validLessons++;
        entries.push(lessonToEntry(cached, opts.generateExercises ?? true));
        continue;
      }
    }

    // Tier 5: AI (Claude primary → fallback)
    let lesson: ToanLesson | null = null;
    if (env.ANTHROPIC_API_KEY) lesson = await callWithClaude(chunk, curriculum, analytics);
    if (!lesson) lesson = await callWithFallback(chunk, curriculum, analytics);
    if (!lesson) continue;

    // Tier 2: Self-Critic (always runs when score < 75)
    let score = scoreLesson(lesson);
    lesson = await selfCritic(lesson, chunk, score);
    score = scoreLesson(lesson);

    // Tier 2: Quality Gate
    if (score < QUALITY_GATE) {
      analytics.droppedByQualityGate++;
      continue;
    }

    analytics.qualityScores.push(score);
    analytics.validLessons++;

    // Tier 4: Cache
    await setCache(chunk.text, lesson);
    entries.push(lessonToEntry(lesson, opts.generateExercises ?? true));
  }

  analytics.avgQualityScore = analytics.qualityScores.length > 0
    ? Math.round(analytics.qualityScores.reduce((a, b) => a + b, 0) / analytics.qualityScores.length)
    : 0;

  return { entries, analytics, curriculum };
}

// ─── Convert ToanLesson → MathCurriculumEntry ────────────────────────────────

export function lessonToEntry(lesson: ToanLesson, generateExercises: boolean): MathCurriculumEntry {
  return {
    title: lesson.topic,
    subject: LESSON_TYPE_TO_SUBJECT[lesson.lesson_type] ?? 'ARITHMETIC',
    lessonType: lesson.lesson_type,
    textbook: lesson.textbook ?? undefined,
    grade: lesson.grade,
    level: 'beginner',
    generateExercises,
    concepts: lesson.knowledge.map((k) => ({
      name: k.name,
      definition: k.definition,
      formula: k.formula || undefined,
      example: k.example || undefined,
      solution: k.steps?.length ? k.steps.join('\n') : undefined,
      steps: k.steps,
      hints: k.hints ?? [],
    })),
  };
}

// ─── Synthetic Data Engine ────────────────────────────────────────────────────

export async function generateQuestionVariations(lesson: ToanLesson, count = 3): Promise<ToanLesson['questions']> {
  const sys = 'Bạn là giáo viên Toán. Chỉ output JSON array hợp lệ.';
  const existing = lesson.questions.map((q) => q.question).join('\n');
  const prompt = `Tạo thêm ${count} câu hỏi KHÁC BIỆT (không trùng lặp) cho bài "${lesson.topic}" lớp ${lesson.grade}.
Câu đã có:\n${existing}
Knowledge:\n${lesson.knowledge.slice(0, 3).map((k) => `- ${k.name}: ${k.definition}${k.formula ? ` [${k.formula}]` : ''}`).join('\n')}
Output JSON array: [{ "question": "...", "answer": "...", "difficulty": "easy" }]
difficulty: easy|medium|hard|olympic. Đáp án chính xác, không trùng câu hỏi.`;
  const raw = await callAIForJSON(sys, prompt, 1500);
  if (!raw) return [];
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const result = JSON.parse(match[0]) as ToanLesson['questions'];
    return result.filter((q) => q.question?.trim() && q.answer?.trim() && DIFFICULTIES.includes(q.difficulty));
  } catch { return []; }
}

// ─── Student Profile Engine ───────────────────────────────────────────────────

export interface StudentProfile {
  weakTopics: string[];
  strongTopics: string[];
  avgScore: number;
  totalAttempts: number;
}

export function computeProfileUpdate(current: StudentProfile, lessonType: string, score: number): Partial<StudentProfile> {
  const newTotal = current.totalAttempts + 1;
  const newAvg = (current.avgScore * current.totalAttempts + score) / newTotal;
  let weakTopics = [...current.weakTopics];
  let strongTopics = [...current.strongTopics];
  if (lessonType) {
    if (score < 60) {
      if (!weakTopics.includes(lessonType)) weakTopics.push(lessonType);
      strongTopics = strongTopics.filter((t) => t !== lessonType);
    } else if (score >= 80) {
      if (!strongTopics.includes(lessonType)) strongTopics.push(lessonType);
      weakTopics = weakTopics.filter((t) => t !== lessonType);
    }
  }
  return { weakTopics, strongTopics, avgScore: Math.round(newAvg * 10) / 10, totalAttempts: newTotal };
}

// ─── Re-exports (for backward compat) ────────────────────────────────────────

export { scoreLesson as qualityScore };
