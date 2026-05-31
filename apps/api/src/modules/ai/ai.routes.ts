import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { buildSystemPrompt, SUGGESTIONS, type Subject, type Mode } from '../../services/ollama';
import { aiChatOnce, aiChatStream, checkAllProviders, type ChatMessage } from '../../services/ai-provider';
import { transcribeWithWhisper } from '../../services/stt';
import { prisma } from '../../services/prisma';

const chatBodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(20),
  subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
  mode: z.enum(['tutor', 'exercise', 'homework', 'quiz']).optional().default('tutor'),
});

const explainBodySchema = z.object({
  question: z.string().max(2000),
  correctAnswer: z.string().max(500),
  subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
  userAnswer: z.string().max(500).optional(),
});

async function findSources(userMessage: string): Promise<{ lesson: string; topic: string }[]> {
  const words = userMessage
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);

  if (!words.length) return [];

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: words.map(w => ({ title: { contains: w, mode: 'insensitive' as const } })),
      },
      select: {
        title: true,
        section: { select: { course: { select: { title: true } } } },
      },
      take: 3,
    });

    return lessons.map(l => ({
      lesson: l.title,
      topic: l.section?.course?.title ?? '',
    }));
  } catch {
    return [];
  }
}

export async function aiRoutes(app: FastifyInstance) {
  // ─── Health check ─────────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    const status = await checkAllProviders();
    return reply.send(status);
  });

  // ─── Streaming chat ───────────────────────────────────────────────────────────
  app.post('/chat', { preHandler: requireAuth }, async (req, reply) => {
    const body = chatBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { messages, subject, mode } = body.data;
    const systemPrompt = buildSystemPrompt(subject as Subject, mode as Mode);

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content ?? '';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const token of aiChatStream(fullMessages)) {
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');

      // Send metadata: suggestions + sources
      const [sources, suggestions] = await Promise.all([
        findSources(lastUserMsg),
        Promise.resolve(SUGGESTIONS[subject as Subject]?.[mode as Mode] ?? SUGGESTIONS.general.tutor),
      ]);
      reply.raw.write(`data: ${JSON.stringify({ type: 'meta', suggestions, sources })}\n\n`);
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ error: 'AI không khả dụng' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // ─── Speech-to-text (OpenAI Whisper) ─────────────────────────────────────────
  app.post('/stt', { preHandler: requireAuth }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'audio file required' });
    const buf = await data.toBuffer();
    const mimeType = data.mimetype || 'audio/webm';
    const lang = typeof (req.query as any).lang === 'string' ? (req.query as any).lang : undefined;
    const transcript = await transcribeWithWhisper(buf, mimeType, lang);
    if (transcript === null) return reply.status(503).send({ error: 'STT không khả dụng' });
    return reply.send({ transcript });
  });

  // ─── Text-to-speech (browser-delegated, returns lang hint) ───────────────────
  app.post('/tts', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      text: z.string().max(1000),
      subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
    }).safeParse(req.body);

    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const lang = body.data.subject === 'language' ? 'en-US' : 'vi-VN';
    return reply.send({ lang, text: body.data.text, provider: 'browser' });
  });

  // ─── Explain a question (non-streaming) ──────────────────────────────────────
  app.post('/explain', { preHandler: requireAuth }, async (req, reply) => {
    const body = explainBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { question, correctAnswer, subject, userAnswer } = body.data;
    const systemPrompt = buildSystemPrompt(subject as Subject, 'tutor');

    let userMessage = `Câu hỏi: "${question}"\nĐáp án đúng: "${correctAnswer}"`;
    if (userAnswer) userMessage += `\nHọc sinh trả lời: "${userAnswer}"`;
    userMessage += '\n\nHãy giải thích tại sao đáp án đúng là vậy, ngắn gọn (2-4 câu).';

    try {
      const explanation = await aiChatOnce([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);
      return reply.send({ explanation });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng, vui lòng thử lại' });
    }
  });

  // ─── Homework grading ─────────────────────────────────────────────────────────
  app.post('/homework', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      content: z.string().max(3000),
      subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
    }).safeParse(req.body);

    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { content, subject } = body.data;
    const systemPrompt = buildSystemPrompt(subject as Subject, 'homework');

    try {
      const result = await aiChatOnce([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Đây là bài làm của em:\n\n${content}` },
      ]);

      const scoreMatch = result.match(/\*\*Điểm:\s*(\d+(?:\.\d+)?)\/10\*\*/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

      return reply.send({ feedback: result, score, mistakes: [] });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng, vui lòng thử lại' });
    }
  });
}
