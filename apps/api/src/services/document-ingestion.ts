/**
 * Document Ingestion Layer — PHASE K
 * Converts any file to Markdown before AI pipeline / RAG ingestion.
 * Per udmak.md: File → MarkItDown → Markdown → Cleaner → Subject → Parser → Embedding
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { prisma } from './prisma';
import { minioClient } from './minio';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

// ─── Types ────────────────────────────────────────────────────────────────────

export type Subject = 'math' | 'viet' | 'language' | 'general';

export interface ConversionResult {
  markdown: string;
  rawText: string;
  sourceType: string;
}

export interface QualityReport {
  score: number;          // 0–100
  length: number;
  headingCount: number;
  hasMath: boolean;
  hasVietnamese: boolean;
  hasVocab: boolean;
  chunkCount: number;
  warnings: string[];
}

export interface IngestedDocument {
  id: string;
  filename: string;
  subject: Subject;
  grade: number | null;
  sourceType: string;
  markdownContent: string;
  rawText: string;
  chunkCount: number;
  qualityScore: number;
  minioKey: string | null;
  metadata: Record<string, unknown>;
}

// ─── HTML → Markdown ──────────────────────────────────────────────────────────

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) =>
      '\n' + '#'.repeat(Number(level)) + ' ' + stripTags(content).trim() + '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, c) => `**${stripTags(c)}**`)
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, c) => `**${stripTags(c)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, c) => `*${stripTags(c)}*`)
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, c) => `*${stripTags(c)}*`)
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) =>
      `[${stripTags(text)}](${href})`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => '- ' + stripTags(c).trim() + '\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
      stripTags(c).trim().split('\n').map(l => '> ' + l).join('\n'))
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => '`' + stripTags(c) + '`')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => '```\n' + stripTags(c).trim() + '\n```')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => '\n' + stripTags(c).trim() + '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── CSV → Markdown ───────────────────────────────────────────────────────────

function csvToMarkdown(buffer: Buffer): string {
  const text = buffer.toString('utf-8');
  const rows = text.trim().split('\n').map(line => {
    const cells: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });
  if (!rows.length) return '';
  const colWidths = rows[0].map((_, ci) =>
    Math.max(...rows.map(r => (r[ci] ?? '').length), 3));
  const fmt = (row: string[]) =>
    '| ' + row.map((c, i) => (c ?? '').padEnd(colWidths[i])).join(' | ') + ' |';
  return [
    fmt(rows[0]),
    '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |',
    ...rows.slice(1).map(fmt),
  ].join('\n');
}

// ─── XLSX → Markdown ──────────────────────────────────────────────────────────

function xlsxToMarkdown(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
    if (!rows.length) continue;
    if (wb.SheetNames.length > 1) parts.push(`## ${sheetName}\n`);
    const colWidths = rows[0].map((_, ci) =>
      Math.max(...rows.map(r => String(r[ci] ?? '').length), 3));
    const fmt = (row: string[]) =>
      '| ' + row.map((c, i) => String(c ?? '').padEnd(colWidths[i])).join(' | ') + ' |';
    parts.push(fmt(rows[0]));
    parts.push('| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |');
    for (const row of rows.slice(1)) {
      parts.push(fmt(colWidths.map((_, i) => row[i] ?? '') as string[]));
    }
    parts.push('');
  }
  return parts.join('\n');
}

// ─── PPTX → Markdown ─────────────────────────────────────────────────────────

async function pptxToMarkdown(buffer: Buffer): Promise<string> {
  try {
    // @ts-ignore
    const JSZip = ((await import('jszip')) as any).default ?? (await import('jszip'));
    const zip = await JSZip.loadAsync(buffer);
    const slideKeys = Object.keys(zip.files)
      .filter((n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)/)![1]);
        const nb = parseInt(b.match(/slide(\d+)/)![1]);
        return na - nb;
      });
    const parts: string[] = [];
    for (let i = 0; i < slideKeys.length; i++) {
      const xml = await zip.files[slideKeys[i]].async('string');
      const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
        .map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .filter(Boolean);
      if (texts.length) {
        parts.push(`## Slide ${i + 1}`);
        parts.push(texts.join('\n'));
        parts.push('');
      }
    }
    return parts.join('\n');
  } catch {
    return '';
  }
}

// ─── PDF → Markdown ───────────────────────────────────────────────────────────

function pdfTextToMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (out.length && out[out.length - 1] !== '') out.push(''); continue; }
    // Heuristic: short ALL-CAPS lines = heading
    if (t.length < 80 && t.length > 2 && t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t)) {
      out.push(`## ${t}`);
    } else {
      out.push(t);
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Main conversion function ─────────────────────────────────────────────────

export async function convertToMarkdown(
  buffer: Buffer,
  filename: string,
  mimetype?: string,
): Promise<ConversionResult> {
  const ext = path.extname(filename).toLowerCase();
  const sourceType = ext.replace('.', '') || 'unknown';
  let markdown = '';
  let rawText = '';

  if (ext === '.pdf' || mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    rawText = data.text;
    markdown = pdfTextToMarkdown(data.text);

  } else if (['.docx', '.doc'].includes(ext) ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const rawResult = await mammoth.extractRawText({ buffer });
    rawText = rawResult.value;
    markdown = htmlToMarkdown(htmlResult.value);

  } else if (['.xlsx', '.xls'].includes(ext) ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    rawText = XLSX.utils.sheet_to_csv(
      XLSX.read(buffer, { type: 'buffer' }).Sheets[
        XLSX.read(buffer, { type: 'buffer' }).SheetNames[0]
      ]
    );
    markdown = xlsxToMarkdown(buffer);

  } else if (ext === '.csv') {
    rawText = buffer.toString('utf-8');
    markdown = csvToMarkdown(buffer);

  } else if (ext === '.pptx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    markdown = await pptxToMarkdown(buffer);
    rawText = markdown.replace(/^##.+$/gm, '').trim();

  } else if (['.html', '.htm'].includes(ext) || (mimetype ?? '').includes('html')) {
    rawText = stripTags(buffer.toString('utf-8'));
    markdown = htmlToMarkdown(buffer.toString('utf-8'));

  } else {
    // TXT, MD, plain text — pass through
    rawText = buffer.toString('utf-8');
    markdown = rawText;
  }

  return { markdown, rawText, sourceType };
}

// ─── Markdown Cleaner ─────────────────────────────────────────────────────────

export function cleanMarkdown(md: string): string {
  return md
    // Normalize heading spacing
    .replace(/^(#{1,6})\s*(.+?)\s*$/gm, '$1 $2')
    // Remove more than 2 blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Normalize list items
    .replace(/^[•●▪◦]\s*/gm, '- ')
    .replace(/^\*\s+/gm, '- ')
    // Collapse inline spaces (but not in code blocks)
    .replace(/[ \t]{2,}(?![\|])/g, ' ')
    // Remove trailing whitespace per line
    .split('\n').map(l => l.trimEnd()).join('\n')
    .trim();
}

// ─── Subject Detector ─────────────────────────────────────────────────────────

const MATH_KEYWORDS = /toán|phương trình|hình học|số học|đại số|giải tích|tích phân|đạo hàm|tổ hợp|xác suất|thống kê|bài toán|tính|vectơ|ma trận|lượng giác|mệnh đề/i;
const VIET_KEYWORDS = /tiếng việt|văn bản|đọc hiểu|từ vựng|ngữ pháp|chính tả|tập làm văn|câu chủ đề|đoạn văn|thơ|truyện|văn học|tác phẩm/i;
const LANG_KEYWORDS = /\benglish\b|vocabulary|grammar|listening|speaking|reading|writing|pronunciation|phrase|sentence|dialogue|exercise|lesson unit/i;

export function detectSubject(markdown: string): Subject {
  const sample = markdown.slice(0, 3000).toLowerCase();
  const mathScore = (sample.match(MATH_KEYWORDS) || []).length;
  const vietScore = (sample.match(VIET_KEYWORDS) || []).length;
  const langScore = (sample.match(LANG_KEYWORDS) || []).length;

  const max = Math.max(mathScore, vietScore, langScore);
  if (max === 0) return 'general';
  if (mathScore === max) return 'math';
  if (vietScore === max) return 'viet';
  return 'language';
}

// ─── Quality Check ────────────────────────────────────────────────────────────

export function qualityCheck(markdown: string): QualityReport {
  const warnings: string[] = [];
  const length = markdown.length;
  const headingCount = (markdown.match(/^#{1,6}\s/gm) || []).length;
  const hasMath = /[$$\\]|\\frac|\\sqrt|\\int|≤|≥|→|∈|∑|∏/.test(markdown);
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(markdown);
  const hasVocab = /^- .{3,}$/m.test(markdown);

  // Chunk by ~1500 chars on paragraph boundaries
  const chunks = markdown.split(/\n\n+/).reduce<string[]>((acc, para) => {
    const last = acc[acc.length - 1] ?? '';
    if (last.length + para.length < 1500) {
      acc[acc.length - 1] = last ? last + '\n\n' + para : para;
    } else {
      acc.push(para);
    }
    return acc;
  }, ['']);
  const chunkCount = chunks.filter(c => c.trim()).length;

  if (length < 100) warnings.push('Nội dung quá ngắn');
  if (headingCount === 0) warnings.push('Không có tiêu đề');
  if (!hasVietnamese && !LANG_KEYWORDS.test(markdown)) warnings.push('Không phát hiện tiếng Việt');

  // Score: length (40) + headings (20) + math/vocab (20) + vietnamese (20)
  let score = 0;
  if (length > 500) score += 20;
  if (length > 2000) score += 20;
  if (headingCount > 0) score += 10;
  if (headingCount > 3) score += 10;
  if (hasMath || hasVocab) score += 20;
  if (hasVietnamese) score += 20;

  return { score, length, headingCount, hasMath, hasVietnamese, hasVocab, chunkCount, warnings };
}

// ─── Full ingestion pipeline ──────────────────────────────────────────────────

export interface IngestOpts {
  importedBy: string;
  grade?: number;
  subject?: Subject;
  saveToMinio?: boolean;
}

export async function ingestDocument(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  opts: IngestOpts,
): Promise<IngestedDocument> {
  // 1. Convert to Markdown
  const { markdown: raw, rawText, sourceType } = await convertToMarkdown(buffer, filename, mimetype);

  // 2. Clean Markdown
  const markdown = cleanMarkdown(raw);

  // 3. Detect Subject
  const subject = opts.subject ?? detectSubject(markdown);

  // 4. Quality check
  const quality = qualityCheck(markdown);

  // 5. Detect grade (heuristic from content)
  const gradeMatch = markdown.match(/lớp\s+(\d+)|grade\s+(\d+)|class\s+(\d+)/i);
  const grade = opts.grade ?? (gradeMatch ? parseInt(gradeMatch[1] ?? gradeMatch[2] ?? gradeMatch[3]) : null);

  // 6. Store file in MinIO (optional)
  let minioKey: string | null = null;
  if (opts.saveToMinio) {
    try {
      const key = `documents/${opts.importedBy}/${Date.now()}_${filename}`;
      await minioClient.putObject(env.MINIO_BUCKET_MATH_DOCS ?? 'lms-math-docs', key, buffer, buffer.length, {
        'Content-Type': mimetype || 'application/octet-stream',
        'X-Original-Name': filename,
      } as any);
      minioKey = key;
    } catch { /* MinIO optional */ }
  }

  // 7. Save metadata to DB
  const doc = await prisma.document.create({
    data: {
      filename,
      subject,
      grade,
      sourceType,
      markdownContent: markdown,
      rawText,
      minioKey,
      chunkCount: quality.chunkCount,
      embeddingStatus: 'pending',
      qualityScore: quality.score,
      importedBy: opts.importedBy,
      metadata: {
        headingCount: quality.headingCount,
        hasMath: quality.hasMath,
        hasVietnamese: quality.hasVietnamese,
        hasVocab: quality.hasVocab,
        warnings: quality.warnings,
        originalMimetype: mimetype,
      },
    },
  });

  return {
    id: doc.id,
    filename: doc.filename,
    subject: doc.subject as Subject,
    grade: doc.grade,
    sourceType: doc.sourceType,
    markdownContent: markdown,
    rawText,
    chunkCount: quality.chunkCount,
    qualityScore: quality.score,
    minioKey,
    metadata: doc.metadata as Record<string, unknown>,
  };
}
