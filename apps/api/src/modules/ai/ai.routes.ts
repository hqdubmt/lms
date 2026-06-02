import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { buildSystemPrompt, SUGGESTIONS, type Subject, type Mode } from '../../services/ollama';
import { aiChatOnce, aiChatStream, checkAllProviders, type ChatMessage } from '../../services/ai-provider';
import { transcribeWithWhisper } from '../../services/stt';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';
import { searchConcepts, getIndexStats, rewriteQuery } from '../../services/rag';
import {
  getBrain, updateBrain, updateMastery, deleteBrain,
  extractTopic, detectLevel, extractMistakes,
  buildBrainContext, buildSummary,
} from '../../services/conversation-brain';
import { buildResponseStrategy, strategyToPrompt } from '../../services/response-strategy';
import { orchestrate } from '../../services/orchestrator';

const CHAT_SESSION_TTL = 7 * 24 * 3600;
const MAX_HISTORY_MESSAGES = 20;
const RAG_MIN_SCORE = 0.45;

function chatSessionKey(userId: string, subject: string): string {
  return `ai:chat:${userId}:${subject}`;
}

// ─── Intent Engine — multi-label ─────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: Mode }> = [
  { pattern: /quiz|trắc nghiệm|kiểm tra nhanh|test\b/i,                   intent: 'quiz' },
  { pattern: /bài tập|cho.*bài|tập làm|luyện tập/i,                       intent: 'exercise' },
  { pattern: /chấm bài|sửa bài|chấm điểm|bài làm của em/i,                intent: 'homework' },
  { pattern: /giải thích|nghĩa là|là gì|tại sao|thế nào|how|what|why/i,   intent: 'tutor' },
];

function detectIntent(text: string): { primary: Mode; secondary: Mode[]; confidence: number } {
  const matched: Mode[] = [];
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(text)) matched.push(intent);
  }
  if (!matched.length) return { primary: 'tutor', secondary: [], confidence: 0.6 };
  const [primary, ...secondary] = matched;
  return { primary, secondary, confidence: 0.85 };
}

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
  const words = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 4);
  if (!words.length) return [];
  try {
    const lessons = await prisma.lesson.findMany({
      where: { OR: words.map(w => ({ title: { contains: w, mode: 'insensitive' as const } })) },
      select: { title: true, section: { select: { course: { select: { title: true } } } } },
      take: 3,
    });
    return lessons.map(l => ({ lesson: l.title, topic: l.section?.course?.title ?? '' }));
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
    const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content ?? '';
    const { sub } = req.user as { sub: string };

    // ── Intent Engine ────────────────────────────────────────────────────────
    const intent = detectIntent(lastUserMsg);
    const effectiveMode = intent.primary !== 'tutor' ? intent.primary : mode;

    // ── Conversation Brain ───────────────────────────────────────────────────
    const brain = await getBrain(sub, subject);

    // ── AI Orchestrator ──────────────────────────────────────────────────────
    const ragSubject = (subject === 'language' || subject === 'viet') ? subject : 'math';
    const indexStats = await getIndexStats(ragSubject as any).catch(() => ({ total: 0 }));
    const orch = orchestrate({
      subject,
      mode: effectiveMode,
      brain,
      messageLen: lastUserMsg.length,
      ragIndexSize: indexStats.total,
    });

    // ── RAG — subject-specific index + optional query rewrite ─────────────────
    let ragSources: Array<{ lesson: string; topic: string }> = [];
    let ragContextBlock = '';
    if (orch.useRAG) {
      try {
        const query = orch.expandQuery ? rewriteQuery(lastUserMsg, brain.topic) : lastUserMsg;
        const hits = await searchConcepts(query, 3, undefined, ragSubject as any);
        const relevant = hits.filter(h => h.score > RAG_MIN_SCORE);
        if (relevant.length > 0) {
          ragContextBlock = relevant.map(h => h.entry.text).join('\n\n');
          ragSources = relevant.map(h => ({
            lesson: h.entry.metadata.conceptName,
            topic: h.entry.metadata.topicTitle,
          }));
        }
      } catch { /* RAG không khả dụng */ }
    }

    // ── Response Strategy Engine ──────────────────────────────────────────────
    const strategy = buildResponseStrategy(effectiveMode, brain, lastUserMsg.length);
    const strategyPrompt = strategyToPrompt(strategy);

    // ── Context Compiler ──────────────────────────────────────────────────────
    const basePrompt = buildSystemPrompt(subject as Subject, effectiveMode as Mode);
    const brainContext = buildBrainContext(brain);

    const systemParts = [basePrompt, strategyPrompt];
    if (brainContext) systemParts.push(`\nTrạng thái học tập:\n${brainContext}`);
    if (ragContextBlock) systemParts.push(`\nNội dung giáo trình liên quan:\n${ragContextBlock}`);
    const systemPrompt = systemParts.join('\n\n');

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

    let aiFullContent = '';
    try {
      // ── LLM Router — dùng preferred provider từ Orchestrator ─────────────
      for await (const token of aiChatStream(fullMessages, { prefer: orch.preferredProvider ?? undefined })) {
        aiFullContent += token;
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');

      const suggestions = SUGGESTIONS[subject as Subject]?.[effectiveMode as Mode] ?? SUGGESTIONS.general.tutor;
      const sources = ragSources.length > 0 ? ragSources : await findSources(lastUserMsg);
      reply.raw.write(`data: ${JSON.stringify({ type: 'meta', suggestions, sources })}\n\n`);

      if (lastUserMsg && aiFullContent) {
        // ── Redis history ───────────────────────────────────────────────────
        const key = chatSessionKey(sub, subject);
        const existing = await redis.get(key);
        const prev: Array<{ role: string; content: string }> = existing ? JSON.parse(existing) : [];
        const updated = [
          ...prev,
          { role: 'user', content: lastUserMsg },
          { role: 'assistant', content: aiFullContent },
        ].slice(-MAX_HISTORY_MESSAGES);
        await redis.set(key, JSON.stringify(updated), 'EX', CHAT_SESSION_TTL);

        // ── Memory Update Loop (async) ──────────────────────────────────────
        const newCount = brain.messageCount + 1;
        const topic = extractTopic(lastUserMsg) ?? brain.topic;
        const level = detectLevel(lastUserMsg, brain.level);
        const mistakes = effectiveMode === 'homework' ? extractMistakes(aiFullContent) : [];
        const summary = newCount > 8 ? buildSummary({ ...brain, topic, level, mistakes: brain.mistakes }, lastUserMsg) : brain.summary;

        updateBrain(sub, subject, {
          topic,
          level,
          mode: effectiveMode,
          mistakes,
          summary,
          messageCount: newCount,
          goal: brain.goal ?? (newCount === 1 ? lastUserMsg.slice(0, 100) : undefined),
        }).catch(() => {});

        // ── Mastery update khi chấm bài ─────────────────────────────────────
        if (effectiveMode === 'homework' && brain.topic) {
          const scoreMatch = aiFullContent.match(/\*\*Điểm:\s*(\d+(?:\.\d+)?)\/10\*\*/i);
          if (scoreMatch) {
            const score01 = parseFloat(scoreMatch[1]) / 10;
            updateMastery(sub, subject, brain.topic, score01).catch(() => {});
          }
        }
      }
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ error: 'AI không khả dụng' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // ─── Intent detection (multi-label) ──────────────────────────────────────────
  app.post('/intent', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({ message: z.string().max(500) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });
    return reply.send(detectIntent(body.data.message));
  });

  // ─── Conversation Brain — xem trạng thái học tập ─────────────────────────────
  app.get('/brain', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    return reply.send(await getBrain(sub, subject));
  });

  // ─── Lịch sử chat ─────────────────────────────────────────────────────────────
  app.get('/history', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    const data = await redis.get(chatSessionKey(sub, subject));
    const messages: Array<{ role: string; content: string }> = data ? JSON.parse(data) : [];
    return reply.send({ messages });
  });

  app.delete('/history', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';
    await redis.del(chatSessionKey(sub, subject));
    await deleteBrain(sub, subject);
    return reply.send({ ok: true });
  });

  // ─── Speech-to-text ───────────────────────────────────────────────────────────
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

  // ─── Text-to-speech (browser-delegated) ──────────────────────────────────────
  app.post('/tts', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      text: z.string().max(1000),
      subject: z.enum(['math', 'language', 'viet', 'general']).optional().default('general'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });
    const lang = body.data.subject === 'language' ? 'en-US' : 'vi-VN';
    return reply.send({ lang, text: body.data.text, provider: 'browser' });
  });

  // ─── Explain a question ───────────────────────────────────────────────────────
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
      ], { prefer: 'gemini' });

      const scoreMatch = result.match(/\*\*Điểm:\s*(\d+(?:\.\d+)?)\/10\*\*/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
      return reply.send({ feedback: result, score, mistakes: [] });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng, vui lòng thử lại' });
    }
  });
}
