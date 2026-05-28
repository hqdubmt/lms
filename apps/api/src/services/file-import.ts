import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { callAIForJSON, isAnyAIAvailable } from './ai-provider';

// Chunk text theo khuyến nghị caitien.md: 500-1000 ký tự mỗi chunk
function chunkText(text: string, size = 800): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  for (const para of paragraphs) {
    if (current.length + para.length + 2 > size && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  // Nếu không tách được theo paragraph, cắt thô
  if (chunks.length <= 1 && text.length > size) {
    chunks.length = 0;
    for (let i = 0; i < text.length; i += size) {
      const chunk = text.slice(i, i + size).trim();
      if (chunk) chunks.push(chunk);
    }
  }
  return chunks;
}

// ─── Text extraction ──────────────────────────────────────────────────────────

export async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx' || ext === 'doc'
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    ext === 'xlsx' || ext === 'xls'
  ) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (Object.keys(sheet).length <= 1) continue;
      lines.push(`=== ${name} ===`);
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
      for (const row of rows) {
        const cells = row.map((c) => (c ?? '').toString().trim()).filter(Boolean);
        if (cells.length > 0) lines.push(cells.join('\t'));
      }
    }
    return lines.join('\n');
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    ext === 'pptx'
  ) {
    const JSZip = ((await import('jszip')) as any).default ?? (await import('jszip'));
    const zip = await JSZip.loadAsync(buffer);
    const slideKeys = Object.keys(zip.files)
      .filter((n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a: string, b: string) => {
        const na = parseInt(a.match(/\d+/)?.[0] ?? '0');
        const nb = parseInt(b.match(/\d+/)?.[0] ?? '0');
        return na - nb;
      });
    const texts: string[] = [];
    for (const key of slideKeys) {
      const xml: string = await zip.files[key].async('text');
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
      const slideText = matches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' ').trim();
      if (slideText) texts.push(slideText);
    }
    return texts.join('\n\n');
  }

  // txt / md / csv
  return buffer.toString('utf-8');
}

// ─── Math curriculum structuring ─────────────────────────────────────────────

export interface MathConceptDraft {
  name: string; definition: string; formula?: string;
  example?: string; solution?: string; hints: string[];
}
export interface MathCurriculumEntry {
  title: string; subject: string; grade: number; level: string;
  description?: string; generateExercises: boolean;
  concepts: MathConceptDraft[];
}

export async function structureMathWithAI(
  text: string,
  opts: { grade?: number; subject?: string; generateExercises?: boolean } = {},
): Promise<MathCurriculumEntry[]> {
  if (env.ANTHROPIC_API_KEY) return structureMathClaude(text, opts);
  if (await isAnyAIAvailable()) return structureMathWithOllama(text, opts);
  return structureMathRuleBased(text, opts);
}

async function structureMathClaude(
  text: string,
  opts: { grade?: number; subject?: string; generateExercises?: boolean },
): Promise<MathCurriculumEntry[]> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const truncated = text.slice(0, 30000);
  const gradeHint = opts.grade ? ` (lớp ${opts.grade})` : '';
  const subjectHint = opts.subject ? ` môn ${opts.subject}` : '';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `Phân tích tài liệu giáo trình Toán${subjectHint}${gradeHint} sau. Trích xuất TẤT CẢ chủ đề và khái niệm toán học.

Tài liệu:
${truncated}

Trả về CHỈ JSON (không giải thích):
[
  {
    "title": "Tên chủ đề toán (VD: Phân số, Hình học phẳng, Phương trình bậc 1)",
    "subject": "ARITHMETIC",
    "grade": ${opts.grade ?? 5},
    "level": "beginner",
    "description": "Mô tả ngắn 1 câu",
    "generateExercises": ${opts.generateExercises ?? true},
    "concepts": [
      {
        "name": "Tên khái niệm/định lý (ngắn gọn)",
        "definition": "Định nghĩa đầy đủ, rõ ràng",
        "formula": "Công thức (để trống '' nếu không có)",
        "example": "Ví dụ minh họa cụ thể",
        "solution": "Các bước thực hiện/chứng minh",
        "hints": ["Gợi ý 1", "Gợi ý 2"]
      }
    ]
  }
]

Quy tắc:
- subject: ARITHMETIC|ALGEBRA|GEOMETRY|TRIGONOMETRY|CALCULUS|STATISTICS|NUMBER_THEORY|COMBINATORICS
- level: beginner|intermediate|advanced
- Mỗi chủ đề có 3-10 khái niệm, trích xuất càng đầy đủ càng tốt
- Giữ nguyên ký hiệu toán học, không dịch thuật ngữ kỹ thuật`,
    }],
  });

  const raw = (response.content[0] as any).text as string;
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ');
  const result = JSON.parse(match[0]) as MathCurriculumEntry[];
  return result.map((e) => ({ ...e, generateExercises: opts.generateExercises ?? e.generateExercises ?? true }));
}

async function structureMathWithOllama(
  text: string,
  opts: { grade?: number; subject?: string; generateExercises?: boolean },
): Promise<MathCurriculumEntry[]> {
  const grade = opts.grade ?? 5;
  const subject = opts.subject ?? 'ARITHMETIC';
  const genEx = opts.generateExercises ?? true;

  const allChunks = chunkText(text, 800);
  const allEntries: MathCurriculumEntry[] = [];

  const systemPrompt = 'Bạn là giáo viên toán. Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích.';

  for (let i = 0; i < allChunks.length; i += 4) {
    const batch = allChunks.slice(i, i + 4);
    const truncated = batch.join('\n\n---\n\n');

    const userPrompt = `Bạn là giáo viên toán lớp ${grade}.
Phân tích nội dung sau. Tạo:
1. Chủ đề
2. Kiến thức chính
3. Khái niệm và công thức

Nội dung:
${truncated}

Chỉ trả về JSON array (không có gì khác):
[
  {
    "title": "Tên chủ đề",
    "subject": "${subject}",
    "grade": ${grade},
    "level": "beginner",
    "generateExercises": ${genEx},
    "concepts": [
      {
        "name": "Tên khái niệm",
        "definition": "Định nghĩa đầy đủ",
        "formula": "Công thức nếu có, để rỗng nếu không có",
        "example": "Ví dụ cụ thể",
        "solution": "Cách giải từng bước",
        "hints": ["Gợi ý 1", "Gợi ý 2"]
      }
    ]
  }
]

subject: ARITHMETIC|ALGEBRA|GEOMETRY|TRIGONOMETRY|CALCULUS|STATISTICS|NUMBER_THEORY|COMBINATORICS
level: beginner|intermediate|advanced
Mỗi chủ đề 2-6 khái niệm.`;

    try {
      const raw = await callAIForJSON(systemPrompt, userPrompt);
      if (!raw) continue;
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const result = JSON.parse(match[0]) as MathCurriculumEntry[];
      if (Array.isArray(result) && result.length > 0) {
        allEntries.push(...result.map((e) => ({ ...e, generateExercises: opts.generateExercises ?? e.generateExercises ?? true })));
      }
    } catch {
      continue;
    }
  }

  if (allEntries.length === 0) return structureMathRuleBased(text, opts);
  return allEntries;
}

function structureMathRuleBased(
  text: string,
  opts: { grade?: number; subject?: string; generateExercises?: boolean },
): MathCurriculumEntry[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries: MathCurriculumEntry[] = [];
  let currentEntry: MathCurriculumEntry | null = null;
  let conceptBuf: string[] = [];

  const flushConcept = () => {
    if (!currentEntry || conceptBuf.length === 0) return;
    const content = conceptBuf.join(' ');
    const formulaMatch = content.match(/[a-zA-Z0-9][\s]*[=+\-*/^][=+\-*/^]?[\s]*[a-zA-Z0-9]/);
    currentEntry.concepts.push({
      name: conceptBuf[0].slice(0, 80),
      definition: content.slice(0, 400),
      formula: formulaMatch ? formulaMatch[0] : undefined,
      hints: [],
    });
    conceptBuf = [];
  };

  const flushEntry = () => {
    flushConcept();
    if (currentEntry && currentEntry.concepts.length > 0) entries.push(currentEntry);
  };

  for (const line of lines) {
    const isHeading = /^#{1,3}\s/.test(line) || /^\d+[\.\)]\s+[A-ZĐÁÀẢÃẠ]/.test(line);
    if (isHeading) {
      flushEntry();
      currentEntry = {
        title: line.replace(/^#+\s*/, '').replace(/^\d+[\.\)]\s+/, '').slice(0, 100),
        subject: (opts.subject as any) ?? 'ARITHMETIC',
        grade: opts.grade ?? 5, level: 'beginner',
        generateExercises: opts.generateExercises ?? true, concepts: [],
      };
      conceptBuf = [];
    } else if (currentEntry) {
      const isSub = /^[-•*]\s/.test(line) || /^\d+\.\s/.test(line);
      if (isSub && conceptBuf.length > 0) flushConcept();
      conceptBuf.push(line.replace(/^[-•*\d\.]\s+/, ''));
    }
  }
  flushEntry();

  if (entries.length === 0 && text.length > 100) {
    const chunks = text.match(/.{1,1500}/gs) ?? [];
    return [{
      title: 'Nội dung toán học',
      subject: (opts.subject as any) ?? 'ARITHMETIC',
      grade: opts.grade ?? 5, level: 'beginner',
      generateExercises: opts.generateExercises ?? true,
      concepts: chunks.slice(0, 8).map((c, i) => ({
        name: `Phần ${i + 1}`,
        definition: c.slice(0, 400),
        hints: [],
      })),
    }];
  }
  return entries;
}

// ─── Viet curriculum structuring ──────────────────────────────────────────────

export interface VietItemDraft {
  word: string; meaning: string; example?: string; note?: string; order: number;
}
export interface VietCurriculumEntry {
  title: string; category: string; grade: number; level: string;
  generateExercises: boolean; items: VietItemDraft[];
}

export async function structureVietWithAI(
  text: string,
  opts: { grade?: number; category?: string; generateExercises?: boolean } = {},
): Promise<VietCurriculumEntry[]> {
  if (env.ANTHROPIC_API_KEY) return structureVietClaude(text, opts);
  if (await isAnyAIAvailable()) return structureVietWithOllama(text, opts);
  return structureVietRuleBased(text, opts);
}

async function structureVietClaude(
  text: string,
  opts: { grade?: number; category?: string; generateExercises?: boolean },
): Promise<VietCurriculumEntry[]> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const truncated = text.slice(0, 30000);
  const gradeHint = opts.grade ? ` lớp ${opts.grade}` : '';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: `Phân tích tài liệu giáo trình Tiếng Việt${gradeHint} sau. Trích xuất từ vựng, thành ngữ, tục ngữ, ca dao, ngữ pháp và nội dung học tập.

Tài liệu:
${truncated}

Trả về CHỈ JSON (không giải thích):
[
  {
    "title": "Tên bộ (VD: Từ vựng chủ đề gia đình, Thành ngữ về lao động, Ngữ pháp câu đơn)",
    "category": "TU_VUNG",
    "grade": ${opts.grade ?? 3},
    "level": "co_ban",
    "generateExercises": ${opts.generateExercises ?? true},
    "items": [
      {
        "word": "từ/cụm từ/câu ca dao/thành ngữ",
        "meaning": "Nghĩa đầy đủ, giải thích rõ ràng",
        "example": "Câu ví dụ hoàn chỉnh có ý nghĩa",
        "note": "Ghi chú về nguồn gốc, vùng miền, sắc thái, dị bản..."
      }
    ]
  }
]

Quy tắc:
- category: CHINH_TA|TU_VUNG|NGU_PHAP|THANH_NGU|TUC_NGU|VAN_HOC|TAP_DOC|CA_DAO
- level: co_ban|trung_cap|nang_cao
- Nhóm các từ/thành ngữ cùng chủ đề vào một bộ (5-25 mục/bộ)
- Giữ nguyên chính tả tiếng Việt, dấu thanh đầy đủ
- Trích xuất TẤT CẢ nội dung, không bỏ sót`,
    }],
  });

  const raw = (response.content[0] as any).text as string;
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ');
  const result = JSON.parse(match[0]) as VietCurriculumEntry[];
  return result.map((e) => ({
    ...e,
    generateExercises: opts.generateExercises ?? e.generateExercises ?? true,
    items: e.items.map((it, i) => ({ ...it, order: i })),
  }));
}

async function structureVietWithOllama(
  text: string,
  opts: { grade?: number; category?: string; generateExercises?: boolean },
): Promise<VietCurriculumEntry[]> {
  const grade = opts.grade ?? 3;
  const category = opts.category ?? 'TU_VUNG';
  const genEx = opts.generateExercises ?? true;

  const allChunks = chunkText(text, 800);
  const allEntries: VietCurriculumEntry[] = [];

  const systemPrompt = 'Bạn là giáo viên Tiếng Việt. Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích.';

  for (let i = 0; i < allChunks.length; i += 4) {
    const batch = allChunks.slice(i, i + 4);
    const truncated = batch.join('\n\n---\n\n');

    const userPrompt = `Bạn là giáo viên Tiếng Việt lớp ${grade}.
Phân tích nội dung sau. Tạo:
1. Bộ từ vựng / thành ngữ / ca dao / ngữ pháp
2. Nghĩa đầy đủ của từng mục
3. Câu ví dụ minh họa

Nội dung:
${truncated}

Chỉ trả về JSON array (không có gì khác):
[
  {
    "title": "Tên bộ học",
    "category": "${category}",
    "grade": ${grade},
    "level": "co_ban",
    "generateExercises": ${genEx},
    "items": [
      {
        "word": "Từ hoặc cụm từ hoặc câu ca dao/thành ngữ",
        "meaning": "Nghĩa đầy đủ, rõ ràng",
        "example": "Câu ví dụ hoàn chỉnh",
        "note": "Ghi chú về nguồn gốc hoặc cách dùng",
        "order": 0
      }
    ]
  }
]

category: CHINH_TA|TU_VUNG|NGU_PHAP|THANH_NGU|TUC_NGU|VAN_HOC|TAP_DOC|CA_DAO
level: co_ban|trung_cap|nang_cao
Mỗi bộ 5-20 mục, nhóm cùng chủ đề vào một bộ. Giữ nguyên dấu thanh tiếng Việt.`;

    try {
      const raw = await callAIForJSON(systemPrompt, userPrompt);
      if (!raw) continue;
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const result = JSON.parse(match[0]) as VietCurriculumEntry[];
      if (Array.isArray(result) && result.length > 0) {
        allEntries.push(...result.map((e) => ({
          ...e,
          generateExercises: opts.generateExercises ?? e.generateExercises ?? true,
          items: e.items.map((it, i) => ({ ...it, order: it.order ?? i })),
        })));
      }
    } catch {
      continue;
    }
  }

  if (allEntries.length === 0) return structureVietRuleBased(text, opts);
  return allEntries;
}

function structureVietRuleBased(
  text: string,
  opts: { grade?: number; category?: string; generateExercises?: boolean },
): VietCurriculumEntry[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: VietItemDraft[] = [];
  let currentTitle = 'Từ vựng';

  for (const line of lines) {
    // Detect word: meaning pattern (colon, dash, tab, pipe separators)
    const sepMatch = line.match(/^(.+?)\s*[:—\-|]\s*(.+)$/);
    if (sepMatch && sepMatch[1].split(' ').length <= 8) {
      items.push({ word: sepMatch[1].trim(), meaning: sepMatch[2].trim(), order: items.length });
    } else if (/^#{1,3}\s/.test(line)) {
      currentTitle = line.replace(/^#+\s*/, '').slice(0, 100);
    }
  }

  if (items.length === 0) {
    // Treat every 2 consecutive non-empty lines as word/meaning pair
    for (let i = 0; i < lines.length - 1; i += 2) {
      items.push({ word: lines[i].slice(0, 100), meaning: lines[i + 1].slice(0, 300), order: i / 2 });
    }
  }

  const chunkSize = 20;
  const entries: VietCurriculumEntry[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    entries.push({
      title: i === 0 ? currentTitle : `${currentTitle} (${Math.floor(i / chunkSize) + 1})`,
      category: (opts.category as any) ?? 'TU_VUNG',
      grade: opts.grade ?? 3, level: 'co_ban',
      generateExercises: opts.generateExercises ?? true,
      items: items.slice(i, i + chunkSize),
    });
  }
  return entries.length > 0 ? entries : [{
    title: currentTitle, category: (opts.category as any) ?? 'TU_VUNG',
    grade: opts.grade ?? 3, level: 'co_ban',
    generateExercises: opts.generateExercises ?? true, items: [],
  }];
}

// ─── AI Question Generation (Math) ───────────────────────────────────────────

export async function generateMathQuestionsWithAI(
  concepts: MathConceptDraft[],
  type: string,
  count: number,
): Promise<any[] | null> {
  if (!await isAnyAIAvailable()) return null;

  const conceptList = concepts.slice(0, 10).map((c, i) =>
    `${i + 1}. ${c.name}: ${c.definition}${c.formula ? ` [Công thức: ${c.formula}]` : ''}${c.example ? ` [Ví dụ: ${c.example}]` : ''}`
  ).join('\n');

  const typeMap: Record<string, string> = {
    MULTIPLE_CHOICE: 'trắc nghiệm 4 lựa chọn (options gồm 4 đáp án, answer là đáp án đúng)',
    FILL_BLANK: 'điền vào chỗ trống (content có ___, options để [], answer là từ/số cần điền)',
    TRUE_FALSE: 'đúng/sai (options là ["Đúng","Sai"], answer là "Đúng" hoặc "Sai")',
    PROOF_STEP: 'tự luận (options để [], answer là lời giải đầy đủ từng bước)',
  };

  const systemPrompt = 'Bạn là giáo viên toán. Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích.';
  const userPrompt = `Bạn là giáo viên toán.
Tạo ${count} câu hỏi loại ${typeMap[type] ?? type} từ các khái niệm sau:

${conceptList}

Chỉ trả về JSON array (không có gì khác):
[
  {
    "content": "Nội dung câu hỏi rõ ràng",
    "options": [],
    "answer": "Đáp án đúng",
    "solution": "Giải thích/lời giải chi tiết",
    "hints": ["Gợi ý ngắn"],
    "difficulty": 1,
    "points": 1
  }
]

Đáp án (answer) phải chính xác và có trong options nếu là trắc nghiệm.`;

  const raw = await callAIForJSON(systemPrompt, userPrompt, 1024);
  if (!raw) return null;

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const result = JSON.parse(match[0]) as any[];
    if (!Array.isArray(result) || result.length === 0) return null;
    return result.map((q, i) => ({
      content: q.content ?? '',
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer ?? '',
      solution: q.solution ?? undefined,
      hints: Array.isArray(q.hints) ? q.hints : [],
      difficulty: typeof q.difficulty === 'number' ? Math.min(5, Math.max(1, q.difficulty)) : 1,
      points: typeof q.points === 'number' ? q.points : 1,
      order: i,
    }));
  } catch {
    return null;
  }
}

// ─── AI Question Generation (Viet) ───────────────────────────────────────────

export async function generateVietQuestionsWithAI(
  items: VietItemDraft[],
  type: string,
  count: number,
): Promise<any[] | null> {
  if (!await isAnyAIAvailable()) return null;

  const itemList = items.slice(0, 15).map((it, i) =>
    `${i + 1}. "${it.word}" — ${it.meaning}${it.example ? ` (VD: ${it.example})` : ''}`
  ).join('\n');

  const typeMap: Record<string, string> = {
    MULTIPLE_CHOICE: 'trắc nghiệm: hỏi nghĩa của từ, options gồm 4 nghĩa, answer là nghĩa đúng',
    FILL_BLANK: 'điền từ vào câu: content là câu có ___, answer là từ cần điền',
    SPELLING: 'chính tả: hỏi cách viết đúng của từ, options gồm 4 cách viết, answer là cách đúng',
    MATCHING: 'ghép đôi: content là từ, answer là nghĩa tương ứng',
    WORD_ORDER: 'sắp xếp câu: options là mảng các từ xáo trộn, answer là mảng các từ theo thứ tự đúng (ví dụ: ["Tôi","yêu","tiếng","Việt"])',
  };

  const systemPrompt = 'Bạn là giáo viên Tiếng Việt. Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích.';
  const userPrompt = `Bạn là giáo viên Tiếng Việt.
Tạo ${count} câu hỏi loại ${typeMap[type] ?? type} từ bộ từ vựng sau:

${itemList}

Chỉ trả về JSON array (không có gì khác):
[
  {
    "content": "Nội dung câu hỏi",
    "options": [],
    "answer": ${type === 'WORD_ORDER' ? '["từ1","từ2","từ3"]' : '"Đáp án đúng"'},
    "explanation": "Giải thích ngắn",
    "order": 0,
    "points": ${type === 'WORD_ORDER' ? 2 : 1}
  }
]

Giữ nguyên dấu thanh tiếng Việt. Đáp án phải chính xác.`;

  const raw = await callAIForJSON(systemPrompt, userPrompt, 1024);
  if (!raw) return null;

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const result = JSON.parse(match[0]) as any[];
    if (!Array.isArray(result) || result.length === 0) return null;
    return result.map((q, i) => ({
      content: q.content ?? '',
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer ?? '',
      explanation: q.explanation ?? undefined,
      order: typeof q.order === 'number' ? q.order : i,
      points: typeof q.points === 'number' ? q.points : 1,
    }));
  } catch {
    return null;
  }
}

// ─── Language curriculum structuring ─────────────────────────────────────────

export interface LangVocabItemDraft {
  word: string; translation: string; pronunciation?: string;
  example?: string; exampleTrans?: string; notes?: string;
}
export interface LangDialogueDraft {
  context: string; answer: string; options: string[];
  translation?: string; explanation?: string;
}
export interface LangVoiceChatTurnDraft {
  ai: string; hint?: string; keywords: string[]; response?: string;
}
export interface LangCurriculumDraft {
  items: LangVocabItemDraft[];
  dialogues: LangDialogueDraft[];
  voiceChat: LangVoiceChatTurnDraft[];
}

export async function structureLangWithAI(
  text: string,
  opts: { language?: string; level?: string } = {},
): Promise<LangCurriculumDraft> {
  if (env.ANTHROPIC_API_KEY) return structureLangClaude(text, opts);
  if (await isAnyAIAvailable()) return structureLangWithOllama(text, opts);
  return structureLangRuleBased(text, opts);
}

async function structureLangClaude(
  text: string,
  opts: { language?: string; level?: string },
): Promise<LangCurriculumDraft> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const truncated = text.slice(0, 30000);
  const lang = opts.language || 'en';
  const langName = lang === 'en' ? 'English' : lang === 'ja' ? 'Japanese' : lang === 'ko' ? 'Korean' : lang === 'fr' ? 'French' : lang === 'zh' ? 'Chinese' : lang.toUpperCase();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are a language curriculum parser. Analyze this ${langName} learning material and extract structured content for Vietnamese learners.

Material:
${truncated}

Return ONLY valid JSON (no other text) in this exact format:
{
  "items": [
    {
      "word": "target language word or phrase",
      "translation": "Vietnamese translation",
      "pronunciation": "IPA or phonetic spelling (empty string if not available)",
      "example": "example sentence in target language",
      "exampleTrans": "Vietnamese translation of the example sentence",
      "notes": "grammar note, register, usage context (empty string if none)"
    }
  ],
  "dialogues": [
    {
      "context": "Dialogue snippet where one word is replaced with ___\\nA: How ___ you?\\nB: I'm fine, thanks!",
      "answer": "are",
      "options": ["are", "is", "am", "were"],
      "translation": "Vietnamese version with ___ matching the blank\\nA: Bạn ___ thế nào?\\nB: Tôi ổn, cảm ơn!",
      "explanation": "Grammar explanation in Vietnamese: Dùng 'are' với chủ ngữ 'you'"
    }
  ],
  "voiceChat": [
    {
      "ai": "Conversational prompt in ${langName}",
      "hint": "Gợi ý bằng tiếng Việt: nói gì và nói thế nào",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "response": "AI positive feedback in ${langName} after correct answer"
    }
  ]
}

Rules:
- Extract ALL vocabulary from the material (up to 50 items), keep original language forms
- Create 5-10 dialogue exercises: pick sentences/dialogues, remove one key word and replace with ___
  - options array must have exactly 4 choices including the correct answer
- Create 5-10 voice chat turns: each turn is a natural conversation question about topics in the material
  - keywords should be 3-8 words/phrases the user might say in a correct answer
- Preserve original ${langName} spelling and diacritics exactly
- Return ONLY the JSON object, no markdown, no explanation`,
    }],
  });

  const raw = (response.content[0] as any).text as string;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ');
  const result = JSON.parse(match[0]) as LangCurriculumDraft;
  return {
    items: (result.items ?? []).filter((it) => it.word && it.translation),
    dialogues: (result.dialogues ?? []).filter((d) => d.context && d.answer && Array.isArray(d.options) && d.options.length >= 2),
    voiceChat: (result.voiceChat ?? []).filter((t) => t.ai && Array.isArray(t.keywords) && t.keywords.length > 0),
  };
}

async function structureLangWithOllama(
  text: string,
  opts: { language?: string; level?: string },
): Promise<LangCurriculumDraft> {
  const truncated = text.slice(0, 5000);
  const lang = opts.language || 'en';
  const langName = lang === 'en' ? 'English' : lang === 'ja' ? 'Japanese' : lang === 'ko' ? 'Korean' : lang === 'fr' ? 'French' : lang === 'zh' ? 'Chinese' : lang.toUpperCase();

  const systemPrompt = 'You are a JSON generator for language learning content. Return ONLY valid JSON, no explanations, no markdown.';
  const userPrompt = `Analyze this ${langName} learning material and extract vocabulary for Vietnamese learners.

Material:
${truncated}

Return ONLY this JSON (nothing else):
{
  "items": [
    {
      "word": "word or phrase in ${langName}",
      "translation": "Vietnamese translation",
      "pronunciation": "phonetic or IPA (empty string if unknown)",
      "example": "example sentence in ${langName}",
      "exampleTrans": "Vietnamese translation of example",
      "notes": "grammar or usage note (empty string if none)"
    }
  ],
  "dialogues": [
    {
      "context": "Short dialogue where one word is replaced with ___",
      "answer": "the missing word",
      "options": ["answer", "wrong1", "wrong2", "wrong3"],
      "translation": "Vietnamese version with ___",
      "explanation": "Giải thích bằng tiếng Việt"
    }
  ],
  "voiceChat": [
    {
      "ai": "Conversational question in ${langName}",
      "hint": "Gợi ý tiếng Việt",
      "keywords": ["keyword1", "keyword2"],
      "response": "Positive feedback in ${langName}"
    }
  ]
}

Rules: extract up to 30 vocabulary items, 3-5 dialogues, 3-5 voice chat turns. Keep original spelling.`;

  const raw = await callAIForJSON(systemPrompt, userPrompt);
  if (!raw) return structureLangRuleBased(text, opts);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return structureLangRuleBased(text, opts);

  try {
    const result = JSON.parse(match[0]) as LangCurriculumDraft;
    const items = (result.items ?? []).filter((it) => it.word && it.translation);
    const dialogues = (result.dialogues ?? []).filter((d) => d.context && d.answer && Array.isArray(d.options) && d.options.length >= 2);
    const voiceChat = (result.voiceChat ?? []).filter((t) => t.ai && Array.isArray(t.keywords) && t.keywords.length > 0);
    if (items.length === 0 && dialogues.length === 0) return structureLangRuleBased(text, opts);
    return { items, dialogues, voiceChat };
  } catch {
    return structureLangRuleBased(text, opts);
  }
}

function structureLangRuleBased(
  text: string,
  _opts: { language?: string; level?: string },
): LangCurriculumDraft {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: LangVocabItemDraft[] = [];
  const dialogues: LangDialogueDraft[] = [];
  const voiceChat: LangVoiceChatTurnDraft[] = [];

  for (const line of lines) {
    // word: translation or word - translation or word | translation or word\ttranslation
    const sepMatch = line.match(/^(.+?)\s*(?:[:—\-|]|\t)\s*(.+)$/);
    if (sepMatch && sepMatch[1].trim().split(/\s+/).length <= 6) {
      const word = sepMatch[1].trim();
      const translation = sepMatch[2].trim();
      items.push({ word, translation });
    }
    // Lines with blank (___) → potential dialogue
    if (line.includes('___') && line.length > 10) {
      const words = line.replace('___', '').match(/\b\w{2,}\b/g) ?? [];
      if (words.length >= 2) {
        dialogues.push({
          context: line,
          answer: '___',
          options: ['___', words[0]!, words[1]!, words[2] ?? words[0]!],
          explanation: '',
        });
      }
    }
  }

  // Generate basic voice chat from first 5 vocab items
  items.slice(0, 5).forEach((it) => {
    voiceChat.push({
      ai: `Can you use "${it.word}" in a sentence?`,
      hint: `Dùng từ "${it.word}" (nghĩa: ${it.translation}) trong một câu`,
      keywords: [it.word.toLowerCase()],
      response: `Well done! "${it.word}" means "${it.translation}".`,
    });
  });

  return { items: items.slice(0, 50), dialogues: dialogues.slice(0, 10), voiceChat: voiceChat.slice(0, 10) };
}

// ─── AI structuring ───────────────────────────────────────────────────────────

export interface LessonDraft {
  title: string;
  type: 'TEXT' | 'VIDEO';
  textContent: string;
}

export interface SectionDraft {
  title: string;
  lessons: LessonDraft[];
}

export async function structureWithAI(text: string, courseTitle: string): Promise<SectionDraft[]> {
  if (env.ANTHROPIC_API_KEY) return structureWithClaude(text, courseTitle);
  if (await isAnyAIAvailable()) return structureWithOllama(text, courseTitle);
  return structureRuleBased(text);
}

async function structureWithOllama(text: string, courseTitle: string): Promise<SectionDraft[]> {
  const truncated = text.slice(0, 5000);

  const systemPrompt = 'Bạn là AI phân tích giáo trình. Chỉ trả về JSON hợp lệ, không giải thích, không markdown.';
  const userPrompt = `Phân tích tài liệu sau và chia thành các chương và bài học cho khoá học "${courseTitle}".

Tài liệu:
${truncated}

Trả về JSON array (không có gì khác):
[
  {
    "title": "Tên chương",
    "lessons": [
      {
        "title": "Tên bài học",
        "type": "TEXT",
        "textContent": "Tóm tắt nội dung bài học (tối đa 300 từ)"
      }
    ]
  }
]

Quy tắc: tạo 2-6 chương, mỗi chương 1-5 bài học, type luôn là TEXT.`;

  const raw = await callAIForJSON(systemPrompt, userPrompt);
  if (!raw) return structureRuleBased(text);

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return structureRuleBased(text);

  try {
    const result = JSON.parse(match[0]) as SectionDraft[];
    if (!Array.isArray(result) || result.length === 0) return structureRuleBased(text);
    return result;
  } catch {
    return structureRuleBased(text);
  }
}

async function structureWithClaude(text: string, courseTitle: string): Promise<SectionDraft[]> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Truncate to ~15k chars to stay within token budget
  const truncated = text.slice(0, 15000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Phân tích tài liệu sau và chia thành các chương (section) và bài học (lesson) cho khoá học "${courseTitle}".

Tài liệu:
${truncated}

Trả về JSON theo đúng định dạng sau, KHÔNG thêm bất kỳ văn bản nào khác:
[
  {
    "title": "Tên chương 1",
    "lessons": [
      {
        "title": "Tên bài học 1",
        "type": "TEXT",
        "textContent": "Nội dung bài học tóm tắt (tối đa 500 từ)"
      }
    ]
  }
]

Quy tắc:
- Tạo 2-8 chương, mỗi chương 1-6 bài học
- Tên chương và bài học rõ ràng, tiếng Việt hoặc giữ nguyên ngôn ngữ gốc
- textContent là tóm tắt nội dung chính của bài, không quá dài
- type luôn là "TEXT"`,
      },
    ],
  });

  const raw = (response.content[0] as any).text as string;
  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ');
  return JSON.parse(match[0]) as SectionDraft[];
}

// Rule-based fallback: split by headings
function structureRuleBased(text: string): SectionDraft[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections: SectionDraft[] = [];
  let currentSection: SectionDraft | null = null;
  let currentLesson: LessonDraft | null = null;
  const contentBuffer: string[] = [];

  const flushLesson = () => {
    if (currentLesson && currentSection) {
      currentLesson.textContent = contentBuffer.join('\n').slice(0, 2000);
      currentSection.lessons.push(currentLesson);
      currentLesson = null;
      contentBuffer.length = 0;
    }
  };

  const flushSection = () => {
    flushLesson();
    if (currentSection && currentSection.lessons.length > 0) {
      sections.push(currentSection);
    }
  };

  for (const line of lines) {
    // Detect H1/H2 as section headers (lines starting with # or ALL CAPS > 4 words or very short lines)
    const isH1 = /^#{1,2}\s/.test(line) || /^[A-ZĐÀÁẢÃẠ][^a-z]{10,}$/.test(line);
    const isH2 = /^#{3,4}\s/.test(line);

    if (isH1) {
      flushSection();
      currentSection = { title: line.replace(/^#+\s*/, ''), lessons: [] };
      currentLesson = null;
    } else if (isH2 && currentSection) {
      flushLesson();
      currentLesson = { title: line.replace(/^#+\s*/, ''), type: 'TEXT', textContent: '' };
    } else if (currentSection) {
      if (!currentLesson) {
        currentLesson = { title: `Bài học ${currentSection.lessons.length + 1}`, type: 'TEXT', textContent: '' };
      }
      contentBuffer.push(line);
    }
  }

  flushSection();

  // If no sections were detected, create one big section with chunked lessons
  if (sections.length === 0) {
    const words = text.split(/\s+/);
    const chunkSize = Math.ceil(words.length / 5);
    const section: SectionDraft = { title: 'Nội dung khoá học', lessons: [] };
    for (let i = 0; i < 5 && i * chunkSize < words.length; i++) {
      const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
      section.lessons.push({
        title: `Bài học ${i + 1}`,
        type: 'TEXT',
        textContent: chunk.slice(0, 2000),
      });
    }
    sections.push(section);
  }

  return sections;
}
