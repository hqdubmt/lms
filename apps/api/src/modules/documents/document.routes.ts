/**
 * Document Ingestion API — PHASE K
 * POST /documents/convert   — preview only (no save)
 * POST /documents/preview   — convert + analyze (no save)
 * POST /documents/import    — full ingestion (save DB + MinIO)
 * POST /documents/embed/:id — trigger embedding
 * GET  /documents/status/:id
 * GET  /documents
 */

import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import {
  convertToMarkdown, cleanMarkdown, detectSubject, qualityCheck, ingestDocument,
  fetchYouTubeTranscript, extractYouTubeId,
  type Subject, type IngestOpts,
} from '../../services/document-ingestion';
import { embedText, upsertEntry } from '../../services/rag';
import { callAIForJSON, aiChatStream, isAnyAIAvailable } from '../../services/ai-provider';

export async function documentRoutes(app: FastifyInstance) {

  // ── POST /documents/convert — markdown preview (no save) ──────────────────
  app.post('/convert', { preHandler: requireAdmin }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const chunks: Buffer[] = [];
    for await (const c of file.file) chunks.push(c);
    const buffer = Buffer.concat(chunks);

    const { markdown: raw, sourceType } = await convertToMarkdown(buffer, file.filename, file.mimetype);
    const markdown = cleanMarkdown(raw);

    return reply.send({
      markdown,
      filename: file.filename,
      sourceType,
      chars: markdown.length,
      lines: markdown.split('\n').length,
    });
  });

  // ── POST /documents/preview — convert + full analysis (no save) ───────────
  app.post('/preview', { preHandler: requireAdmin }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const chunks: Buffer[] = [];
    for await (const c of file.file) chunks.push(c);
    const buffer = Buffer.concat(chunks);

    const { markdown: raw, rawText, sourceType } = await convertToMarkdown(buffer, file.filename, file.mimetype);
    const markdown = cleanMarkdown(raw);
    const subject = detectSubject(markdown);
    const quality = qualityCheck(markdown);
    const gradeMatch = markdown.match(/lớp\s+(\d+)|grade\s+(\d+)/i);
    const grade = gradeMatch ? parseInt(gradeMatch[1] ?? gradeMatch[2]) : null;

    return reply.send({
      markdown,
      rawText,
      filename: file.filename,
      sourceType,
      subject,
      grade,
      quality,
    });
  });

  // ── POST /documents/import — full ingestion pipeline ─────────────────────
  app.post('/import', { preHandler: requireAdmin }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const file = await req.file({
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    });
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const qs = req.query as Record<string, string>;
    const grade = qs.grade ? parseInt(qs.grade) : undefined;
    const subject = (qs.subject as Subject) || undefined;
    const saveToMinio = qs.saveToMinio !== 'false';

    const chunks: Buffer[] = [];
    for await (const c of file.file) chunks.push(c);
    const buffer = Buffer.concat(chunks);

    const opts: IngestOpts = { importedBy: sub, grade, subject, saveToMinio };
    const doc = await ingestDocument(buffer, file.filename, file.mimetype, opts);

    return reply.status(201).send(doc);
  });

  // ── POST /documents/youtube — YouTube transcript ingestion (Module 3) ───────
  app.post('/youtube', { preHandler: requireAdmin }, async (req, reply) => {
    const body = req.body as { url?: string; subject?: string };
    const url = body?.url?.trim();
    if (!url) return reply.status(400).send({ error: 'Vui lòng cung cấp URL YouTube' });

    const videoId = extractYouTubeId(url);
    if (!videoId) return reply.status(400).send({ error: 'URL YouTube không hợp lệ' });

    const { sub } = req.user as { sub: string };

    try {
      const { markdown: raw, rawText } = await fetchYouTubeTranscript(url);
      const markdown = cleanMarkdown(raw);
      const subject = (body?.subject as Subject) || detectSubject(markdown);
      const quality = qualityCheck(markdown);

      const opts: IngestOpts = {
        importedBy: sub,
        subject,
        saveToMinio: false,
      };
      const doc = await ingestDocument(
        Buffer.from(markdown, 'utf-8'),
        `youtube-${videoId}.md`,
        'text/markdown',
        opts,
      );

      return reply.status(201).send({ ...doc, videoId, quality });
    } catch (err: any) {
      return reply.status(422).send({ error: err?.message || 'Không thể lấy transcript từ YouTube' });
    }
  });

  // ── POST /documents/embed/:id — trigger RAG embedding ────────────────────
  app.post('/embed/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return reply.status(404).send({ error: 'Không tìm thấy tài liệu' });
    if (!doc.markdownContent) return reply.status(400).send({ error: 'Tài liệu chưa có nội dung' });

    await prisma.document.update({ where: { id }, data: { embeddingStatus: 'processing' } });

    // Chunk by headings or paragraph blocks
    const sections = doc.markdownContent.split(/\n(?=#{1,3}\s)/).filter(s => s.trim());
    let embedded = 0;
    const ragSubject = (['math', 'viet', 'language'].includes(doc.subject)
      ? doc.subject : 'math') as 'math' | 'viet' | 'language';

    for (const section of sections) {
      const vec = await embedText(section);
      if (!vec) continue;
      const heading = section.split('\n')[0].replace(/^#+\s*/, '').slice(0, 100);
      await upsertEntry(
        {
          id: `doc:${id}:${embedded}`,
          text: section,
          vector: vec,
          metadata: {
            topicId: id,
            topicTitle: heading || doc.filename,
            conceptName: heading || `chunk_${embedded}`,
            grade: doc.grade ?? 0,
            subject: ragSubject,
          },
        },
        ragSubject,
      );
      embedded++;
    }

    await prisma.document.update({
      where: { id },
      data: {
        embeddingStatus: embedded > 0 ? 'done' : 'failed',
        chunkCount: embedded,
      },
    });

    return reply.send({ ok: true, embeddedChunks: embedded, docId: id });
  });

  // ── GET /documents/status/:id ─────────────────────────────────────────────
  app.get('/status/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true, filename: true, subject: true, grade: true,
        sourceType: true, embeddingStatus: true, chunkCount: true,
        qualityScore: true, metadata: true, importedAt: true,
        markdownContent: true, rawText: true,
      },
    });
    if (!doc) return reply.status(404).send({ error: 'Không tìm thấy' });
    return reply.send(doc);
  });

  // ── GET /documents — list with filter ────────────────────────────────────
  app.get('/', { preHandler: requireAdmin }, async (req, reply) => {
    const qs = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(qs.page ?? '1'));
    const limit = Math.min(50, parseInt(qs.limit ?? '20'));
    const subject = qs.subject || undefined;
    const status = qs.status || undefined;

    const where = {
      ...(subject ? { subject } : {}),
      ...(status ? { embeddingStatus: status } : {}),
    };

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true, filename: true, subject: true, grade: true, sourceType: true,
          embeddingStatus: true, chunkCount: true, qualityScore: true, importedAt: true,
        },
        orderBy: { importedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return reply.send({ docs, total, page, limit });
  });

  // ── DELETE /documents/:id ─────────────────────────────────────────────────
  app.delete('/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.document.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ── POST /documents/generate — Teacher Copilot (SSE streaming) ────────────
  // Body: { docId?, markdown?, type, grade?, subject?, count?, language? }
  app.post('/generate', { preHandler: requireAdmin }, async (req, reply) => {
    if (!await isAnyAIAvailable()) {
      return reply.status(503).send({ error: 'Không có AI provider khả dụng' });
    }

    const body = req.body as {
      docId?: string; markdown?: string;
      type: 'quiz' | 'lesson-plan' | 'exam' | 'answer-key' | 'worksheet' | 'study-guide';
      grade?: number; subject?: string; count?: number; language?: string;
    };

    let markdown = body.markdown ?? '';

    // Load from DB if docId provided
    if (body.docId && !markdown) {
      const doc = await prisma.document.findUnique({ where: { id: body.docId } });
      if (!doc) return reply.status(404).send({ error: 'Không tìm thấy tài liệu' });
      markdown = doc.markdownContent ?? doc.rawText ?? '';
    }

    if (!markdown.trim()) return reply.status(400).send({ error: 'Không có nội dung để xử lý' });

    const type = body.type;
    const grade = body.grade;
    const subject = body.subject ?? 'chung';
    const count = body.count ?? 5;
    const lang = body.language ?? 'vi';
    const langNote = lang === 'vi' ? 'Trả lời bằng tiếng Việt.' : 'Reply in English.';

    // Truncate content to avoid token overflow
    const content = markdown.length > 8000 ? markdown.slice(0, 8000) + '\n...(đã cắt)' : markdown;

    const PROMPTS: Record<string, { system: string; user: string }> = {
      quiz: {
        system: `Bạn là giáo viên chuyên tạo câu hỏi trắc nghiệm. ${langNote}
Tạo JSON array gồm ${count} câu hỏi trắc nghiệm từ nội dung tài liệu.
Schema mỗi câu: { "question": string, "options": string[4], "answer": number (0-3), "explanation": string }
Chỉ trả JSON thuần, không markdown, không giải thích thêm.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
      'lesson-plan': {
        system: `Bạn là giáo viên giàu kinh nghiệm. ${langNote}
Tạo giáo án chi tiết dạng JSON từ nội dung tài liệu.
Schema: { "title": string, "grade": number, "subject": string, "duration": string, "objectives": string[], "materials": string[], "steps": [{ "phase": string, "duration": string, "activity": string, "teacherActions": string[], "studentActions": string[] }], "assessment": string, "homework": string }
Chỉ trả JSON thuần.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
      exam: {
        system: `Bạn là giáo viên chuyên ra đề thi. ${langNote}
Tạo đề thi gồm ${count} câu hỏi dạng JSON từ nội dung tài liệu.
Schema: { "title": string, "duration": string, "sections": [{ "name": string, "questions": [{ "id": string, "type": "multiple-choice"|"fill-blank"|"essay", "question": string, "points": number, "options"?: string[], "answer"?: string }] }] }
Chỉ trả JSON thuần.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
      'answer-key': {
        system: `Bạn là giáo viên. ${langNote}
Tạo đáp án chi tiết dạng JSON cho các câu hỏi trong tài liệu.
Schema: { "answers": [{ "id": string|number, "question": string, "answer": string, "explanation": string, "points": number }] }
Chỉ trả JSON thuần.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
      worksheet: {
        system: `Bạn là giáo viên. ${langNote}
Tạo phiếu bài tập thực hành dạng JSON gồm ${count} bài tập từ nội dung tài liệu.
Schema: { "title": string, "instructions": string, "exercises": [{ "id": number, "type": "fill-blank"|"matching"|"true-false"|"short-answer", "question": string, "blanks"?: string[], "answer": string }] }
Chỉ trả JSON thuần.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
      'study-guide': {
        system: `Bạn là giáo viên chuyên tạo tài liệu ôn tập. ${langNote}
Tạo hướng dẫn học tập toàn diện dạng JSON từ nội dung tài liệu.
Schema: { "title": string, "summary": string, "keyConcepts": [{ "term": string, "definition": string, "example": string }], "mainPoints": string[], "formulasOrRules": [{ "name": string, "formula": string, "whenToUse": string }], "reviewQuestions": [{ "question": string, "answer": string }], "studyTips": string[], "commonMistakes": string[] }
Chỉ trả JSON thuần.`,
        user: `Môn: ${subject}${grade ? `, Lớp ${grade}` : ''}\n\nNội dung:\n${content}`,
      },
    };

    const prompt = PROMPTS[type];
    if (!prompt) return reply.status(400).send({ error: `Loại tạo không hợp lệ: ${type}` });

    // SSE streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: object) => {
      try { reply.raw.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* disconnected */ }
    };

    send({ type: 'start', genType: type, time: new Date().toISOString() });

    try {
      const messages = [
        { role: 'system' as const, content: prompt.system },
        { role: 'user' as const, content: prompt.user },
      ];

      let full = '';
      for await (const chunk of aiChatStream(messages, { maxTokens: 4096 })) {
        full += chunk;
        send({ type: 'chunk', text: chunk });
      }

      // Try to parse as JSON
      let parsed: unknown = null;
      try {
        const jsonMatch = full.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* raw text fallback */ }

      send({ type: 'done', ok: true, result: parsed, raw: full });
    } catch (err: any) {
      send({ type: 'error', message: err.message });
    } finally {
      reply.raw.end();
    }
  });
}
