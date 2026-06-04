import { FastifyInstance } from 'fastify';
import * as path from 'path';
import { requireInstructor } from '../../middleware/auth';
import {
  convertToMarkdown, cleanMarkdown, detectSubject, qualityCheck,
} from '../../services/document-ingestion';
import { aiChatStream, isAnyAIAvailable } from '../../services/ai-provider';

const SUPPORTED_EXTS: Record<string, string> = {
  '.docx': 'Word Document', '.doc': 'Word Document (legacy)',
  '.pdf': 'PDF', '.pptx': 'PowerPoint',
  '.xlsx': 'Excel', '.xls': 'Excel (legacy)', '.csv': 'CSV',
  '.html': 'HTML', '.htm': 'HTML',
  '.txt': 'Plain Text', '.md': 'Markdown',
};

export async function instructorToolsRoutes(app: FastifyInstance) {

  // ── POST /instructor/convert/file — markdown conversion ─────────────────────
  app.post('/convert/file', { preHandler: requireInstructor }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const origName = data.filename || 'file';
    const ext = path.extname(origName).toLowerCase();

    if (!SUPPORTED_EXTS[ext]) {
      return reply.status(400).send({
        error: `Định dạng "${ext || '(không rõ)'}" chưa được hỗ trợ`,
        supported: Object.keys(SUPPORTED_EXTS),
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const { markdown: raw, sourceType } = await convertToMarkdown(buffer, origName, data.mimetype);
    const markdown = cleanMarkdown(raw);
    const subject = detectSubject(markdown);
    const quality = qualityCheck(markdown);

    return reply.send({
      markdown,
      filename: origName,
      format: SUPPORTED_EXTS[ext] ?? sourceType,
      subject,
      qualityScore: quality.score,
      chars: markdown.length,
      lines: markdown.split('\n').length,
    });
  });

  // ── POST /instructor/documents/preview — convert + analyze ──────────────────
  app.post('/documents/preview', { preHandler: requireInstructor }, async (req, reply) => {
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

    return reply.send({ markdown, rawText, filename: file.filename, sourceType, subject, grade, quality });
  });

  // ── POST /instructor/documents/generate — Teacher Copilot (SSE) ─────────────
  app.post('/documents/generate', { preHandler: requireInstructor }, async (req, reply) => {
    if (!await isAnyAIAvailable()) {
      return reply.status(503).send({ error: 'Không có AI provider khả dụng' });
    }

    const body = req.body as {
      markdown?: string;
      type: 'quiz' | 'lesson-plan' | 'exam' | 'answer-key' | 'worksheet' | 'study-guide';
      grade?: number; subject?: string; count?: number; language?: string;
    };

    const markdown = body.markdown ?? '';
    if (!markdown.trim()) return reply.status(400).send({ error: 'Không có nội dung để xử lý' });

    const type = body.type;
    const grade = body.grade;
    const subject = body.subject ?? 'chung';
    const count = body.count ?? 5;
    const lang = body.language ?? 'vi';
    const langNote = lang === 'vi' ? 'Trả lời bằng tiếng Việt.' : 'Reply in English.';
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
