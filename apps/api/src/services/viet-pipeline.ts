/**
 * VIET PIPELINE — tiengviet.md ULTIMATE PIPELINE
 *
 * Priority allocation:
 *   1. Data Quality     35% — completeness, accuracy, Vietnamese preservation, self-critic
 *   2. Parser Quality   25% — text cleaning, diacritics, lesson splitting, vocab extraction
 *   3. Validator        20% — schema check, repair, hallucination, duplicate removal
 *   4. Pipeline         10% — retry, cache, fallback routing, analytics
 *   5. AI Model         10% — model selection (Vietnamese NLP needs good model)
 */

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { callAIForJSON } from './ai-provider';
import { redis } from './redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VietCurriculumInfo {
  grade: number | null;
  textbook: string | null;
  semester: number | null;
  category: string | null;
}

export interface VietLessonChunk {
  title: string;
  text: string;
  index: number;
  parserScore: number;
  vocabTokens: string[];
  lessonSignals: string[];
}

export interface VietLesson {
  subject: string;
  grade: number;
  lesson_type: string;
  topic: string;
  textbook?: string | null;
  knowledge: Array<{
    name: string;
    definition: string;
    example: string;
    steps: string[];
    hints: string[];
  }>;
  questions: Array<{
    question: string;
    answer: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}

export interface VietPipelineAnalytics {
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

export interface VietCurriculumEntry {
  title: string;
  category: string;
  lessonType?: string;
  textbook?: string;
  grade: number;
  level: string;
  generateExercises: boolean;
  items: Array<{ word: string; meaning: string; example?: string; note?: string; order: number }>;
}

interface ValidationResult { valid: boolean; errors: string[] }

export const VIET_LESSON_TYPES = ['vocabulary', 'grammar', 'dictation', 'reading', 'writing', 'poem', 'idiom', 'proverb'] as const;
export const VIET_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const LESSON_TYPE_TO_CATEGORY: Record<string, string> = {
  vocabulary: 'TU_VUNG',
  grammar: 'NGU_PHAP',
  dictation: 'CHINH_TA',
  reading: 'TAP_DOC',
  writing: 'VAN_HOC',
  poem: 'VAN_HOC',
  idiom: 'THANH_NGU',
  proverb: 'TUC_NGU',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2 (highest): DATA QUALITY — 35%
// Completeness, accuracy, Vietnamese preservation, self-critic at strict threshold
// ═══════════════════════════════════════════════════════════════════════════════

// 2a. Quality Scorer — weighted for Vietnamese content richness
export function scoreVietLesson(lesson: VietLesson): number {
  let score = 0;

  // Structural (20 pts)
  if (lesson.topic?.trim()) score += 8;
  if (lesson.grade >= 1 && lesson.grade <= 9) score += 6;
  if (VIET_LESSON_TYPES.includes(lesson.lesson_type as any)) score += 6;

  // Knowledge quality (50 pts) — DATA QUALITY is highest priority
  const kItems = lesson.knowledge ?? [];
  const kCount = kItems.length;
  score += Math.min(15, kCount * 4);

  if (kCount > 0) {
    // Definition quality — Vietnamese content must be rich
    const avgDefLen = kItems.reduce((s, k) => s + (k.definition?.length ?? 0), 0) / kCount;
    if (avgDefLen >= 60) score += 12;
    else if (avgDefLen >= 30) score += 7;
    else if (avgDefLen >= 10) score += 3;

    // Example presence — critical for language learning
    const withExample = kItems.filter((k) => k.example?.trim().length > 5).length;
    if (withExample / kCount >= 0.7) score += 12;
    else if (withExample / kCount >= 0.4) score += 6;

    // Steps/hints for active learning
    const withSteps = kItems.filter((k) => k.steps?.length >= 1).length;
    if (withSteps / kCount >= 0.4) score += 6;
    const withHints = kItems.filter((k) => k.hints?.length >= 1).length;
    if (withHints / kCount >= 0.4) score += 5;

    // Vietnamese diacritics preserved (không bị mất dấu)
    const allContent = kItems.map((k) => k.definition + k.example).join(' ');
    const hasVietChars = /[àáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđ]/i.test(allContent);
    if (hasVietChars) score += 0; // expected; deduct if missing
    else score -= 10; // penalize if no Vietnamese chars
  }

  // Question quality (30 pts)
  const qItems = lesson.questions ?? [];
  const qCount = qItems.length;
  score += Math.min(12, qCount * 3);

  if (qCount > 0) {
    const diffSet = new Set(qItems.map((q) => q.difficulty));
    score += Math.min(10, diffSet.size * 4);
    const withAnswer = qItems.filter((q) => q.answer?.trim().length >= 1).length;
    if (withAnswer === qCount) score += 8;
  }

  return Math.min(100, Math.round(score));
}

const VIET_QUALITY_GATE = 40;

// 2b. Completeness enforcer
function enforceVietCompleteness(lesson: VietLesson): VietLesson {
  return {
    ...lesson,
    knowledge: (lesson.knowledge ?? []).map((k) => ({
      name: k.name?.trim() || 'Từ/khái niệm',
      definition: k.definition?.trim() || k.example?.trim() || '(thiếu định nghĩa)',
      example: k.example?.trim() || '',
      steps: Array.isArray(k.steps) ? k.steps.filter(Boolean) : [],
      hints: Array.isArray(k.hints) ? k.hints.filter(Boolean) : [],
    })),
    questions: (lesson.questions ?? []).map((q) => ({
      question: q.question?.trim() || '',
      answer: q.answer?.trim() || '',
      difficulty: VIET_DIFFICULTIES.includes(q.difficulty as any) ? q.difficulty : 'easy',
    })),
  };
}

// 2c. Self-Critic Agent — strict threshold 70 (data quality priority)
async function selfCriticViet(lesson: VietLesson, chunk: VietLessonChunk, score: number): Promise<VietLesson> {
  if (score >= 70) return lesson;

  const issues: string[] = [];
  const kCount = lesson.knowledge?.length ?? 0;
  const qCount = lesson.questions?.length ?? 0;
  if (kCount < 3) issues.push(`knowledge chỉ có ${kCount} items (cần ≥3)`);
  if (qCount < 3) issues.push(`questions chỉ có ${qCount} items (cần ≥3)`);
  const noExample = (lesson.knowledge ?? []).filter((k) => !k.example?.trim()).length;
  if (noExample > 0) issues.push(`${noExample} knowledge thiếu example (bắt buộc với Tiếng Việt)`);
  const noDef = (lesson.knowledge ?? []).filter((k) => (k.definition?.length ?? 0) < 15).length;
  if (noDef > 0) issues.push(`${noDef} knowledge có definition quá ngắn (<15 ký tự)`);
  const allContent = (lesson.knowledge ?? []).map((k) => k.definition + k.example).join(' ');
  if (!/[àáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđ]/i.test(allContent))
    issues.push('output thiếu dấu tiếng Việt');

  if (issues.length === 0) return lesson;

  const vocabHint = chunk.vocabTokens.length > 0
    ? `\nCÁC TỪ ĐÃ PHÁT HIỆN: ${chunk.vocabTokens.slice(0, 10).join(', ')}`
    : '';

  const sys = 'Bạn là hệ thống cải thiện chất lượng bài học Tiếng Việt. Chỉ output JSON object hợp lệ. Giữ nguyên dấu tiếng Việt. Không giải thích.';
  const prompt = `Bài học Tiếng Việt sau có điểm chất lượng ${score}/100. Vấn đề: ${issues.join('; ')}.
Bổ sung từ TÀI LIỆU GỐC. KHÔNG bịa đặt. Giữ đúng dấu tiếng Việt.${vocabHint}

BÀI HIỆN TẠI:
${JSON.stringify(lesson, null, 2)}

TÀI LIỆU GỐC:
${chunk.text.slice(0, 2500)}

Output bài học cải thiện (cùng format, lesson_type="${lesson.lesson_type}", grade=${lesson.grade}):`;

  const raw = await callAIForJSON(sys, prompt, 3500);
  if (!raw) return lesson;
  const repaired = repairVietJSON(raw);
  if (!repaired) return lesson;
  try {
    const improved = JSON.parse(repaired) as VietLesson;
    if (scoreVietLesson(improved) > score) return enforceVietCompleteness(improved);
  } catch { /* ignore */ }
  return lesson;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: PARSER QUALITY — 25%
// Vietnamese-specific text cleaning, diacritics preservation, lesson splitting
// ═══════════════════════════════════════════════════════════════════════════════

// 1a. Vietnamese Cleaner — fix diacritics, OCR artifacts
export function vietClean(text: string): string {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \t]+$/gm, '')
    // Fix common OCR mistakes with Vietnamese characters
    .replace(/\b([Dd])d\b/g, 'đ')       // dd → đ
    .replace(/\b([Aa])a\b/g, 'â')       // aa → â
    .replace(/\b([Oo])o\b/g, 'ô')       // oo → ô
    .replace(/\b([Ee])e\b/g, 'ê')       // ee → ê
    // Normalize spacing around punctuation
    .replace(/\s*([,;:!?])\s*/g, '$1 ')
    .replace(/\s+([.!?])/g, '$1')
    // Remove garbage characters
    .replace(/[^\S\n]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// 1b. Unicode Normalizer — preserve full Vietnamese diacritics
export function vietUnicodeNormalize(text: string): string {
  return text.normalize('NFC');
}

// 1c. Vocabulary Token Extractor — pre-extract vocab before AI
export function extractVocabTokens(text: string): string[] {
  const tokens: string[] = [];
  // Word: meaning patterns
  const wordPatterns = [
    /([A-ZĐÁÀẢÃẠĂẮẶẲẴẰÂẤẬẨẪẦÈÉẺẼẸÊẾỆỂỄỀÌÍỈĨỊÒÓỎÕỌÔỐỘỔỖỒƠỚỢỞỠỜÙÚỦŨỤƯỨỰỬỮỪỲÝỶỸỴa-záàảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđ\s]{2,40})\s*[:–\-]\s*([^.!\n]{5,60})/g,
    // Quoted words
    /"([^"]{2,30})"/g,
    /«([^»]{2,30})»/g,
  ];
  for (const pat of wordPatterns) {
    const matches = [...text.matchAll(pat)];
    tokens.push(...matches.map((m) => m[1]?.trim()).filter((t) => t && t.length >= 2));
  }
  // Also extract lines that look like vocabulary entries
  const lines = text.split('\n');
  for (const line of lines) {
    const sep = line.match(/^(.{2,30}?)\s*[:–]\s*(.{5,})/);
    if (sep && sep[1].split(' ').length <= 5) tokens.push(sep[1].trim());
  }
  return [...new Set(tokens)].slice(0, 30);
}

// 1d. Lesson Type Detector
export function detectVietLessonType(text: string): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {
    vocabulary: 0, grammar: 0, dictation: 0, reading: 0,
    writing: 0, poem: 0, idiom: 0, proverb: 0,
  };
  if (/từ vựng|nghĩa của từ|từ đồng nghĩa|từ trái nghĩa|giải thích từ/.test(lower)) scores.vocabulary += 3;
  if (/ngữ pháp|câu|chủ ngữ|vị ngữ|danh từ|động từ|tính từ|cấu trúc câu/.test(lower)) scores.grammar += 3;
  if (/chính tả|viết đúng|lỗi chính tả|phân biệt|vần/.test(lower)) scores.dictation += 3;
  if (/đọc hiểu|đoạn văn|bài đọc|trả lời câu hỏi|ý chính|nội dung/.test(lower)) scores.reading += 3;
  if (/tập làm văn|viết đoạn|viết bài|lập dàn ý|mở bài|kết bài/.test(lower)) scores.writing += 3;
  if (/thơ|vần thơ|nhịp|câu thơ|khổ thơ|bài thơ/.test(lower)) scores.poem += 4;
  if (/thành ngữ|tục ngữ|ca dao|nghĩa bóng|ý nghĩa/.test(lower)) {
    if (/thành ngữ/.test(lower)) scores.idiom += 3;
    if (/tục ngữ/.test(lower)) scores.proverb += 3;
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'vocabulary';
}

// 1e. Curriculum Detector
export function detectVietCurriculum(text: string): VietCurriculumInfo {
  const gradePatterns = [
    /[Ll]ớp\s*(\d+)/, /[Tt]iếng [Vv]iệt\s*(\d+)\b/, /\b[Gg]rade\s*(\d+)\b/,
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
  if (/[Hh]ọc\s*kỳ\s*(?:I|1)\b|HKI\b/i.test(text)) semester = 1;
  else if (/[Hh]ọc\s*kỳ\s*(?:II|2)\b|HKII\b/i.test(text)) semester = 2;

  let category: string | null = null;
  if (/chính tả|spelling/.test(text.toLowerCase())) category = 'CHINH_TA';
  else if (/ngữ pháp|grammar/.test(text.toLowerCase())) category = 'NGU_PHAP';
  else if (/thành ngữ|idiom/.test(text.toLowerCase())) category = 'THANH_NGU';
  else if (/tục ngữ|proverb/.test(text.toLowerCase())) category = 'TUC_NGU';
  else if (/ca dao/.test(text.toLowerCase())) category = 'CA_DAO';

  return { grade, textbook, semester, category };
}

// 1f. Lesson Splitter
export function splitVietLessons(text: string): VietLessonChunk[] {
  const markers = [
    /^[Bb]ài\s+\d+[\s\.:]/,
    /^[Tt]iết\s+\d+[\s\.:]/,
    /^[Cc]hủ\s*đề\s*\d+/,
    /^[Cc]hương\s+[IVXLCDM\d]+/,
    /^[Uu]nit\s+\d+/,
    /^\d+\.\s+[A-ZĐÁÀẢÃẠ]/,
  ];

  const lines = text.split('\n');
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    for (const pat of markers) {
      if (pat.test(line)) { starts.push(i); break; }
    }
  }

  if (starts.length === 0) return enrichVietChunks(buildVietSemanticChunks(text)).filter((c) => isVietContentRich(c.text));

  const MAX = 3000;
  const raw: Array<Omit<VietLessonChunk, 'parserScore' | 'vocabTokens' | 'lessonSignals'>> = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const chunkText = lines.slice(start, end).join('\n').trim();
    if (chunkText.length < 60) continue;
    raw.push({ title: lines[start]?.trim() ?? `Bài ${i + 1}`, text: chunkText, index: i });
  }

  const split: Array<Omit<VietLessonChunk, 'parserScore' | 'vocabTokens' | 'lessonSignals'>> = [];
  for (const chunk of raw) {
    if (chunk.text.length <= MAX) split.push(chunk);
    else {
      for (let s = 0, sub = 0; s < chunk.text.length; s += MAX, sub++) {
        split.push({
          title: sub === 0 ? chunk.title : `${chunk.title} (${sub + 1})`,
          text: chunk.text.slice(s, s + MAX), index: chunk.index * 100 + sub,
        });
      }
    }
  }

  const result = split.length > 0 ? split : buildVietSemanticChunks(text);
  return enrichVietChunks(result).filter((c) => isVietContentRich(c.text));
}

function buildVietSemanticChunks(text: string): Array<Omit<VietLessonChunk, 'parserScore' | 'vocabTokens' | 'lessonSignals'>> {
  const paragraphs = text.split(/\n\n+/);
  const chunks: Array<Omit<VietLessonChunk, 'parserScore' | 'vocabTokens' | 'lessonSignals'>> = [];
  let current = '', idx = 0;
  for (const para of paragraphs) {
    if (current.length + para.length > 2500 && current.length > 0) {
      chunks.push({ title: `Phần ${idx + 1}`, text: current.trim(), index: idx++ });
      current = para;
    } else { current = current ? `${current}\n\n${para}` : para; }
  }
  if (current.trim()) chunks.push({ title: `Phần ${idx + 1}`, text: current.trim(), index: idx });
  return chunks.filter((c) => c.text.length > 50);
}

function enrichVietChunks(raw: Array<Omit<VietLessonChunk, 'parserScore' | 'vocabTokens' | 'lessonSignals'>>): VietLessonChunk[] {
  return raw.map((c): VietLessonChunk => ({
    ...c,
    parserScore: vietParserScore(c.text),
    vocabTokens: extractVocabTokens(c.text),
    lessonSignals: detectLessonSignals(c.text),
  }));
}

function vietParserScore(text: string): number {
  let score = 0;
  if (text.length >= 150) score += 0.2;
  if (text.length >= 400) score += 0.1;
  if (/[àáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđ]/i.test(text)) score += 0.2;
  if (/[:–\-]/.test(text)) score += 0.15;
  if (/ví dụ|vd|example|nghĩa là|có nghĩa/i.test(text)) score += 0.2;
  if (/câu hỏi|bài tập|luyện tập|exercise/i.test(text)) score += 0.15;
  return Math.min(1, score);
}

function detectLessonSignals(text: string): string[] {
  const signals: string[] = [];
  const lower = text.toLowerCase();
  if (/từ vựng|từ mới|giải thích từ/.test(lower)) signals.push('vocabulary');
  if (/ngữ pháp|cấu trúc câu|chủ ngữ/.test(lower)) signals.push('grammar');
  if (/chính tả|viết đúng/.test(lower)) signals.push('dictation');
  if (/đọc hiểu|ý chính|nội dung bài/.test(lower)) signals.push('reading');
  if (/làm văn|viết đoạn|lập dàn ý/.test(lower)) signals.push('writing');
  if (/thơ|vần thơ/.test(lower)) signals.push('poem');
  if (/thành ngữ/.test(lower)) signals.push('idiom');
  if (/tục ngữ|ca dao/.test(lower)) signals.push('proverb');
  return signals;
}

function isVietContentRich(text: string): boolean {
  if (text.trim().length < 60) return false;
  // Must have Vietnamese content
  const hasViet = /[àáảãạăắặẳẵằâấậẩẫầèéẻẽẹêếệểễềìíỉĩịòóỏõọôốộổỗồơớợởỡờùúủũụưứựửữừỳýỷỹỵđ]/i.test(text);
  const hasWords = text.split(/\s+/).length >= 10;
  const hasEduKeywords = /bài|học|nghĩa|câu|từ|văn|tiếng việt|đọc|viết|ngữ pháp/i.test(text);
  return hasViet && hasWords && hasEduKeywords;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 3: VALIDATOR QUALITY — 20%
// ═══════════════════════════════════════════════════════════════════════════════

// 3a. Validator Agent
export function validateVietLesson(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['not an object'] };

  if (!data.topic || typeof data.topic !== 'string' || !data.topic.trim())
    errors.push('topic: missing');
  if (typeof data.grade !== 'number' || data.grade < 1 || data.grade > 9)
    errors.push(`grade: must be 1-9, got ${data.grade}`);
  if (!VIET_LESSON_TYPES.includes(data.lesson_type))
    errors.push(`lesson_type: invalid "${data.lesson_type}"`);
  if (!Array.isArray(data.knowledge) || data.knowledge.length === 0)
    errors.push('knowledge: empty array');

  const knameSet = new Set<string>();
  for (let i = 0; i < (data.knowledge ?? []).length; i++) {
    const k = data.knowledge[i];
    if (!k?.name?.trim()) { errors.push(`knowledge[${i}].name: missing`); continue; }
    if (knameSet.has(k.name.trim().toLowerCase())) errors.push(`knowledge[${i}].name: duplicate`);
    knameSet.add(k.name.trim().toLowerCase());
    if (!k?.definition || (k.definition?.length ?? 0) < 5)
      errors.push(`knowledge[${i}].definition: too short`);
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0)
    errors.push('questions: empty array');

  for (let i = 0; i < (data.questions ?? []).length; i++) {
    const q = data.questions[i];
    if (!q?.question?.trim()) errors.push(`questions[${i}].question: missing`);
    if (!q?.answer?.trim()) errors.push(`questions[${i}].answer: missing`);
    if (q?.answer?.trim() === q?.question?.trim()) errors.push(`questions[${i}]: answer = question`);
    if (q?.difficulty && !VIET_DIFFICULTIES.includes(q.difficulty))
      errors.push(`questions[${i}].difficulty: invalid "${q.difficulty}" (phải là easy|medium|hard)`);
  }

  return { valid: errors.length === 0, errors };
}

// 3b. Repair Agent
export function repairVietJSON(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim()
    .replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim();

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (!arrMatch) return null;
    try {
      const arr = JSON.parse(arrMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) return JSON.stringify(arr[0]);
    } catch { return null; }
    return null;
  }

  text = objMatch[0];
  text = text.replace(/,(\s*[}\]])/g, '$1');
  text = text.replace(/:\s*undefined/g, ': null');
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  text = text.replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3');

  try { JSON.parse(text); return text; } catch { return null; }
}

// 3c. Hallucination Detector — Vietnamese-specific: fake meanings, wrong grammar
export function detectVietHallucination(lesson: VietLesson, sourceText: string): string[] {
  const flags: string[] = [];
  const source = sourceText.toLowerCase();

  const topicWords = (lesson.topic ?? '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (topicWords.length > 0 && !topicWords.some((w) => source.includes(w)))
    flags.push(`topic "${lesson.topic}" không tìm thấy trong tài liệu`);

  if (lesson.grade < 1 || lesson.grade > 9)
    flags.push(`grade ${lesson.grade} ngoài phạm vi 1-9`);

  for (const k of lesson.knowledge ?? []) {
    if ((k.definition?.length ?? 0) < 3) flags.push(`definition quá ngắn: "${k.name}"`);
    // Check fake meanings: definition word overlap with source
    if (k.definition && k.definition.length > 20) {
      const defWords = k.definition.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const hit = defWords.filter((w) => source.includes(w)).length;
      if (defWords.length > 3 && hit < Math.max(1, defWords.length * 0.15))
        flags.push(`definition có thể bịa: "${k.name}"`);
    }
  }

  for (const q of lesson.questions ?? []) {
    if (!q.answer?.trim()) flags.push(`câu hỏi thiếu đáp án: "${q.question?.slice(0, 40)}"`);
  }

  return flags;
}

// 3d. Duplicate Agent — deduplicate both questions and knowledge
export function removeVietDuplicates(lesson: VietLesson): { lesson: VietLesson; count: number } {
  let count = 0;
  const seenQ = new Set<string>();
  const uniqueQ = (lesson.questions ?? []).filter((q) => {
    const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
    if (seenQ.has(key)) { count++; return false; }
    seenQ.add(key); return true;
  });
  const seenK = new Set<string>();
  const uniqueK = (lesson.knowledge ?? []).filter((k) => {
    const key = k.name.toLowerCase().trim();
    if (seenK.has(key)) { count++; return false; }
    seenK.add(key); return true;
  });
  return { lesson: { ...lesson, questions: uniqueQ, knowledge: uniqueK }, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4: PIPELINE — 10%
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_RETRIES = 2;
const CACHE_TTL = 86400;

const cacheKey = (text: string) =>
  `viet:v2:${crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)}`;

async function getCachedViet(text: string): Promise<VietLesson | null> {
  try { const v = await redis.get(cacheKey(text)); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

async function setCacheViet(text: string, lesson: VietLesson): Promise<void> {
  try { await redis.setex(cacheKey(text), CACHE_TTL, JSON.stringify(lesson)); }
  catch { /* ignore */ }
}

// Output Normalizer
function normalizeVietLesson(lesson: VietLesson, curriculum: VietCurriculumInfo): VietLesson {
  return {
    subject: 'Tiếng Việt',
    grade: lesson.grade ?? curriculum.grade ?? 3,
    lesson_type: VIET_LESSON_TYPES.includes(lesson.lesson_type as any) ? lesson.lesson_type : 'vocabulary',
    topic: (lesson.topic ?? '').trim().slice(0, 200) || 'Bài học Tiếng Việt',
    textbook: lesson.textbook ?? curriculum.textbook ?? null,
    knowledge: (lesson.knowledge ?? []).map((k) => ({
      name: (k.name ?? '').trim().slice(0, 200),
      definition: (k.definition ?? '').trim(),
      example: (k.example ?? '').trim(),
      steps: Array.isArray(k.steps) ? k.steps.filter(Boolean) : [],
      hints: Array.isArray(k.hints) ? k.hints.filter(Boolean) : [],
    })).filter((k) => k.name && k.definition),
    questions: (lesson.questions ?? []).map((q) => ({
      question: (q.question ?? '').trim(),
      answer: (q.answer ?? '').trim(),
      difficulty: VIET_DIFFICULTIES.includes(q.difficulty as any) ? q.difficulty : 'easy',
    })).filter((q) => q.question && q.answer),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 5: AI MODEL — 10%
// ═══════════════════════════════════════════════════════════════════════════════

function buildVietPrompt(chunk: VietLessonChunk, curriculum: VietCurriculumInfo): string {
  const grade = curriculum.grade ?? 3;
  const type = detectVietLessonType(chunk.text);
  const tbHint = curriculum.textbook ? `Bộ sách: ${curriculum.textbook}.` : '';
  const vocabHint = chunk.vocabTokens.length > 0
    ? `\nCÁC TỪ ĐÃ PHÁT HIỆN: ${chunk.vocabTokens.slice(0, 10).join(', ')}`
    : '';
  const signalHint = chunk.lessonSignals.length > 0
    ? `\nTÍN HIỆU BÀI: ${chunk.lessonSignals.join(', ')}`
    : '';

  return `Bạn là hệ thống AI giáo dục Tiếng Việt tiểu học và THCS Việt Nam (lớp 1-9).
${tbHint}${vocabHint}${signalHint}
Phân tích bài học Tiếng Việt lớp ${grade}. Process ONE LESSON ONLY. Chỉ trích xuất nội dung CÓ TRONG tài liệu. Giữ đúng dấu tiếng Việt.

=== BÀI HỌC ===
${chunk.text}
=== HẾT ===

Output CHỈ một JSON object:
{
  "subject": "Tiếng Việt",
  "grade": ${grade},
  "lesson_type": "${type}",
  "topic": "Tên bài học ngắn gọn",
  "textbook": ${curriculum.textbook ? `"${curriculum.textbook}"` : 'null'},
  "knowledge": [
    {
      "name": "Từ/khái niệm/quy tắc ngữ pháp",
      "definition": "Định nghĩa/giải thích đầy đủ ≥15 ký tự",
      "example": "Câu ví dụ hoàn chỉnh bằng tiếng Việt",
      "steps": ["Bước 1: ...", "Bước 2: ..."],
      "hints": ["Gợi ý 1", "Gợi ý 2"]
    }
  ],
  "questions": [
    { "question": "Câu hỏi dễ", "answer": "Đáp án chính xác ≠ câu hỏi", "difficulty": "easy" },
    { "question": "Câu hỏi trung bình", "answer": "Đáp án", "difficulty": "medium" },
    { "question": "Câu hỏi khó", "answer": "Đáp án", "difficulty": "hard" }
  ]
}
lesson_type: ${VIET_LESSON_TYPES.join('|')}
difficulty: easy|medium|hard (KHÔNG được dùng "olympic")
knowledge: 3-8 items, example KHÔNG được để trống
questions: 3-6 items, không duplicate, đáp án ≠ câu hỏi
Giữ nguyên dấu tiếng Việt (à á ả ã ạ ă â ê ô ơ ư đ...)`;
}

const VIET_AI_SYSTEM = 'Bạn là hệ thống AI giáo dục Tiếng Việt tiểu học THCS. Chỉ output JSON object hợp lệ. Không markdown. Không bịa đặt. Giữ đúng dấu tiếng Việt.';

function processVietRawOutput(
  raw: string, chunk: VietLessonChunk, curriculum: VietCurriculumInfo, analytics: VietPipelineAnalytics,
): VietLesson | null {
  const repaired = repairVietJSON(raw);
  if (!repaired) { analytics.repairCount++; return null; }
  let parsed: any;
  try { parsed = JSON.parse(repaired); } catch { return null; }
  const v = validateVietLesson(parsed);
  if (!v.valid) return null;
  const hFlags = detectVietHallucination(parsed, chunk.text);
  if (hFlags.length > 3) { analytics.hallucinationCount++; return null; }
  if (hFlags.length > 0) analytics.hallucinationCount++;
  const { lesson: deduped, count } = removeVietDuplicates(parsed);
  analytics.duplicateCount += count;
  const normalized = normalizeVietLesson(deduped, curriculum);
  return enforceVietCompleteness(normalized);
}

async function callVietClaude(chunk: VietLessonChunk, curriculum: VietCurriculumInfo, analytics: VietPipelineAnalytics): Promise<VietLesson | null> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const prompt = buildVietPrompt(chunk, curriculum);
  let lastError = '';
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) analytics.retryTotal++;
    try {
      const res = await client.messages.create({
        model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
        system: VIET_AI_SYSTEM,
        messages: [{ role: 'user', content: prompt + (attempt > 0 ? `\n[RETRY ${attempt}] Lỗi: ${lastError}. Sửa JSON, giữ dấu tiếng Việt.` : '') }],
      });
      const raw = (res.content[0] as any).text as string;
      const result = processVietRawOutput(raw, chunk, curriculum, analytics);
      if (result) return result;
      lastError = 'validation failed';
    } catch (e: any) { lastError = e.message; }
  }
  return null;
}

async function callVietFallback(chunk: VietLessonChunk, curriculum: VietCurriculumInfo, analytics: VietPipelineAnalytics): Promise<VietLesson | null> {
  const prompt = buildVietPrompt(chunk, curriculum);
  let lastError = '';
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) analytics.retryTotal++;
    const raw = await callAIForJSON(VIET_AI_SYSTEM, prompt + (attempt > 0 ? `\n[RETRY] Lỗi: ${lastError}` : ''), 4000);
    if (!raw) { lastError = 'no response'; continue; }
    const result = processVietRawOutput(raw, chunk, curriculum, analytics);
    if (result) return result;
    lastError = 'validation failed';
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface VietProcessOpts {
  grade?: number;
  category?: string;
  generateExercises?: boolean;
  userId?: string;
}

export interface VietProcessResult {
  entries: VietCurriculumEntry[];
  analytics: VietPipelineAnalytics;
  curriculum: VietCurriculumInfo;
}

export async function processVietDocument(
  rawText: string,
  opts: VietProcessOpts = {},
): Promise<VietProcessResult> {
  // Tier 1: Parser — clean + normalize
  const cleaned = vietUnicodeNormalize(vietClean(rawText));

  // Tier 1: Curriculum Detector
  const curriculum = detectVietCurriculum(cleaned);
  if (opts.grade) curriculum.grade = opts.grade;

  const analytics: VietPipelineAnalytics = {
    totalLessons: 0, validLessons: 0,
    hallucinationCount: 0, duplicateCount: 0,
    repairCount: 0, retryTotal: 0,
    qualityScores: [], avgQualityScore: 0, avgParserScore: 0,
    droppedByQualityGate: 0,
    textbook: curriculum.textbook, grade: curriculum.grade,
  };

  // Tier 1: Lesson Splitter — one lesson at a time
  const chunks = splitVietLessons(cleaned);
  analytics.totalLessons = chunks.length;
  if (chunks.length > 0)
    analytics.avgParserScore = chunks.reduce((s, c) => s + c.parserScore, 0) / chunks.length;

  const entries: VietCurriculumEntry[] = [];

  for (const chunk of chunks) {
    // Tier 4: Cache check
    const cached = await getCachedViet(chunk.text);
    if (cached) {
      const score = scoreVietLesson(cached);
      if (score >= VIET_QUALITY_GATE) {
        analytics.qualityScores.push(score);
        analytics.validLessons++;
        entries.push(vietLessonToEntry(cached, opts.generateExercises ?? true));
        continue;
      }
    }

    // Tier 5: AI (Claude → fallback)
    let lesson: VietLesson | null = null;
    if (env.ANTHROPIC_API_KEY) lesson = await callVietClaude(chunk, curriculum, analytics);
    if (!lesson) lesson = await callVietFallback(chunk, curriculum, analytics);
    if (!lesson) continue;

    // Tier 2: Self-Critic (threshold 70 — strict for data quality)
    let score = scoreVietLesson(lesson);
    lesson = await selfCriticViet(lesson, chunk, score);
    score = scoreVietLesson(lesson);

    // Tier 2: Quality Gate
    if (score < VIET_QUALITY_GATE) { analytics.droppedByQualityGate++; continue; }

    analytics.qualityScores.push(score);
    analytics.validLessons++;
    await setCacheViet(chunk.text, lesson);
    entries.push(vietLessonToEntry(lesson, opts.generateExercises ?? true));
  }

  analytics.avgQualityScore = analytics.qualityScores.length > 0
    ? Math.round(analytics.qualityScores.reduce((a, b) => a + b, 0) / analytics.qualityScores.length)
    : 0;

  return { entries, analytics, curriculum };
}

// ─── Convert VietLesson → VietCurriculumEntry ────────────────────────────────

export function vietLessonToEntry(lesson: VietLesson, generateExercises: boolean): VietCurriculumEntry {
  return {
    title: lesson.topic,
    category: LESSON_TYPE_TO_CATEGORY[lesson.lesson_type] ?? 'TU_VUNG',
    lessonType: lesson.lesson_type,
    textbook: lesson.textbook ?? undefined,
    grade: lesson.grade,
    level: 'co_ban',
    generateExercises,
    items: lesson.knowledge.map((k, i) => ({
      word: k.name,
      meaning: k.definition,
      example: k.example || undefined,
      note: k.hints?.join('; ') || undefined,
      order: i,
    })),
  };
}

// ─── Synthetic Data Engine ────────────────────────────────────────────────────

export async function generateVietVariations(lesson: VietLesson, count = 3): Promise<VietLesson['questions']> {
  const sys = 'Bạn là giáo viên Tiếng Việt. Chỉ output JSON array. Giữ dấu tiếng Việt.';
  const existing = lesson.questions.map((q) => q.question).join('\n');
  const prompt = `Tạo thêm ${count} câu hỏi KHÁC BIỆT cho bài "${lesson.topic}" lớp ${lesson.grade}.
Câu đã có:\n${existing}
Knowledge:\n${lesson.knowledge.slice(0, 3).map((k) => `- ${k.name}: ${k.definition}`).join('\n')}
Output JSON array: [{ "question": "...", "answer": "...", "difficulty": "easy" }]
difficulty: easy|medium|hard. Đáp án chính xác, không trùng câu hỏi.`;
  const raw = await callAIForJSON(sys, prompt, 1500);
  if (!raw) return [];
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const result = JSON.parse(match[0]) as VietLesson['questions'];
    return result.filter((q) => q.question?.trim() && q.answer?.trim() && VIET_DIFFICULTIES.includes(q.difficulty));
  } catch { return []; }
}

// ─── Student Profile Engine ───────────────────────────────────────────────────

export interface VietStudentProfile {
  weakTopics: string[];
  strongTopics: string[];
  avgScore: number;
  totalAttempts: number;
}

export function computeVietProfileUpdate(
  current: VietStudentProfile, lessonType: string, score: number,
): Partial<VietStudentProfile> {
  const newTotal = current.totalAttempts + 1;
  const newAvg = (current.avgScore * current.totalAttempts + score) / newTotal;
  let weak = [...current.weakTopics];
  let strong = [...current.strongTopics];
  if (lessonType) {
    if (score < 60) { if (!weak.includes(lessonType)) weak.push(lessonType); strong = strong.filter((t) => t !== lessonType); }
    else if (score >= 80) { if (!strong.includes(lessonType)) strong.push(lessonType); weak = weak.filter((t) => t !== lessonType); }
  }
  return { weakTopics: weak, strongTopics: strong, avgScore: Math.round(newAvg * 10) / 10, totalAttempts: newTotal };
}
