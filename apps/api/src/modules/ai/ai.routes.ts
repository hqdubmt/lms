import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { ollamaChat, ollamaStream, checkOllamaHealth, SYSTEM_PROMPTS, type ChatMessage } from '../../services/ollama';
import { transcribeWithWhisper } from '../../services/stt';

const chatBodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(20),
  subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
});

const explainBodySchema = z.object({
  question: z.string().max(2000),
  correctAnswer: z.string().max(500),
  subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
  userAnswer: z.string().max(500).optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  // ─── Health check ─────────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    const ok = await checkOllamaHealth();
    return reply.send({ available: ok, model: process.env.OLLAMA_MODEL || 'qwen2.5:7b' });
  });

  // ─── Streaming chat ───────────────────────────────────────────────────────────
  app.post('/chat', { preHandler: requireAuth }, async (req, reply) => {
    const body = chatBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { messages, subject } = body.data;
    const systemPrompt = SYSTEM_PROMPTS[subject] ?? SYSTEM_PROMPTS.general;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const token of ollamaStream(fullMessages)) {
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');
    } catch (err) {
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

  // ─── Explain a question (non-streaming) ──────────────────────────────────────
  app.post('/explain', { preHandler: requireAuth }, async (req, reply) => {
    const body = explainBodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { question, correctAnswer, subject, userAnswer } = body.data;
    const systemPrompt = SYSTEM_PROMPTS[subject] ?? SYSTEM_PROMPTS.general;

    let userMessage = `Câu hỏi: "${question}"\nĐáp án đúng: "${correctAnswer}"`;
    if (userAnswer) userMessage += `\nHọc sinh trả lời: "${userAnswer}"`;
    userMessage += '\n\nHãy giải thích tại sao đáp án đúng là vậy, ngắn gọn (2-4 câu).';

    try {
      const explanation = await ollamaChat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);
      return reply.send({ explanation });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng, vui lòng thử lại' });
    }
  });
}
