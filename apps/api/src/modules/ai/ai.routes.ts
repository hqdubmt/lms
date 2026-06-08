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
import { syncLearningStateFromBrain } from '../../services/learning-state';
import { runMultiAgent } from '../../services/multi-agent';
import { validateResponse } from '../../services/response-validator';
import { buildKnowledgeGraph } from '../../services/knowledge-graph';
import { trackLearningEvent, getLearningAnalytics } from '../../services/learning-analytics';
import { recordActiveDay } from '../../services/streak';
import { checkAndUnlockAchievements } from '../../services/achievement';
import { recordProviderCall, type Provider } from '../../services/provider-monitor';
import { recordAgentCall, type MonitoredAgent } from '../../services/agent-monitor';
import { awardXP } from '../../services/xp-gamification';
import { recordTimelineEvent } from '../../services/timeline';

const CHAT_SESSION_TTL = 7 * 24 * 3600;
const MAX_HISTORY_MESSAGES = 20;
const RAG_MIN_SCORE = 0.45;

function chatSessionKey(userId: string, subject: string): string {
  return `ai:chat:${userId}:${subject}`;
}

// ─── Intent Engine — multi-label ─────────────────────────────────────────────

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: Mode }> = [
  { pattern: /chấm bài|sửa bài|chấm điểm|bài làm của/i,                   intent: 'homework' }, // 1 — cụ thể nhất
  { pattern: /quiz|trắc nghiệm|kiểm tra nhanh|test\b/i,                   intent: 'quiz' },     // 2
  { pattern: /bài tập|cho.*bài|tập làm|luyện tập/i,                       intent: 'exercise' }, // 3
  { pattern: /giải thích|nghĩa là|là gì|tại sao|thế nào|how|what|why/i,   intent: 'tutor' },   // 4 — mặc định
];

// ─── Phase E — Language Agent intent patterns ─────────────────────────────────

type LangIntent = 'LANGUAGE_TRANSLATE' | 'LANGUAGE_GRAMMAR' | 'LANGUAGE_VOCABULARY'
  | 'LANGUAGE_SPEAKING' | 'LANGUAGE_WRITING' | 'LANGUAGE_LISTENING' | 'LANGUAGE_PRONUNCIATION';

const LANG_INTENT_PATTERNS: Array<{ pattern: RegExp; intent: LangIntent; hint: string }> = [
  {
    pattern: /dịch|translate|nghĩa là gì|how do you say|mean/i,
    intent: 'LANGUAGE_TRANSLATE',
    hint: 'Dịch và giải thích. Format: **Dịch:** ... → **Từ vựng:** ... → **Ngữ pháp:** ... → **Phát âm IPA:** ...',
  },
  {
    pattern: /ngữ pháp|grammar|cấu trúc câu|sentence structure|tense|thì/i,
    intent: 'LANGUAGE_GRAMMAR',
    hint: 'Giải thích ngữ pháp. Format: **Công thức:** ... → **Ví dụ:** ... → **Lưu ý:** ...',
  },
  {
    pattern: /từ vựng|vocabulary|từ mới|word meaning|synonym|antonym/i,
    intent: 'LANGUAGE_VOCABULARY',
    hint: 'Giải thích từ vựng. Format: **Nghĩa:** ... → **IPA:** ... → **Ví dụ:** ... → **Đồng nghĩa:** ...',
  },
  {
    pattern: /phát âm|pronunciation|đọc như thế nào|how to pronounce|IPA/i,
    intent: 'LANGUAGE_SPEAKING',
    hint: 'Hướng dẫn phát âm. Format: **IPA:** ... → **Cách đọc tiếng Việt:** ... → **Ví dụ câu:** ...',
  },
  {
    pattern: /sửa bài viết|check.*writing|viết.*sai|essay|paragraph|composition/i,
    intent: 'LANGUAGE_WRITING',
    hint: 'Kiểm tra bài viết. Format: **Lỗi:** ... → **Sửa:** ... → **Giải thích:** ... → **Điểm:** .../10',
  },
  {
    pattern: /nghe|listening|dictation|nghe hiểu/i,
    intent: 'LANGUAGE_LISTENING',
    hint: 'Hỗ trợ luyện nghe. Giải thích nội dung nghe và các điểm ngôn ngữ quan trọng.',
  },
  {
    pattern: /ipa|phiên âm|âm tiết|trọng âm|luyện nói|cách đọc|how to say|stress|syllable/i,
    intent: 'LANGUAGE_PRONUNCIATION',
    hint: 'Hướng dẫn phát âm chi tiết. Format: **IPA:** /.../ → **Trọng âm:** ... → **Âm tiết:** ... → **Gợi ý tiếng Việt:** ... → **Lỗi thường gặp:** ...',
  },
];

function detectLangIntent(text: string): { intent: LangIntent; hint: string } | null {
  for (const { pattern, intent, hint } of LANG_INTENT_PATTERNS) {
    if (pattern.test(text)) return { intent, hint };
  }
  return null;
}

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
  mode: z.enum(['tutor', 'exercise', 'homework', 'quiz', 'voice']).optional().default('tutor'),
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

    const { messages, subject, mode: rawMode } = body.data;
    // 'voice' là UI-only mode — backend xử lý như 'tutor'
    const mode = rawMode === 'voice' ? 'tutor' : rawMode;
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

    // ── Phase E — Language Agent intent enrichment ────────────────────────────
    const langResult = subject === 'language' ? detectLangIntent(lastUserMsg) : null;

    // ── Phase 3 — Multi-Agent System ──────────────────────────────────────────
    const agentResults = await runMultiAgent({
      subject,
      mode: effectiveMode,
      brain,
      message: lastUserMsg,
      ragHits: ragSources.length,
      userId: sub,
    });

    const systemParts = [basePrompt, strategyPrompt];
    if (brainContext) systemParts.push(`\nTrạng thái học tập:\n${brainContext}`);
    if (ragContextBlock) systemParts.push(`\nNội dung giáo trình liên quan:\n${ragContextBlock}`);
    if (langResult) systemParts.push(`\nYêu cầu format phản hồi: ${langResult.hint}`);
    if (agentResults.length > 0) {
      systemParts.push(`\nHướng dẫn từ Multi-Agent System:\n${agentResults.map(r => r.hint).join('\n')}`);
    }
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
    const streamBeginAt = Date.now();
    try {
      // ── LLM Router — dùng preferred provider từ Orchestrator ─────────────
      // Language agent cần nhiều tokens hơn để trả về IPA + dịch + ngữ pháp + ví dụ
      const streamMaxTokens = langResult ? 1024 : 768;
      for await (const token of aiChatStream(fullMessages, { prefer: orch.preferredProvider ?? undefined, maxTokens: streamMaxTokens })) {
        aiFullContent += token;
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      reply.raw.write('data: [DONE]\n\n');

      const suggestions = SUGGESTIONS[subject as Subject]?.[effectiveMode as Mode] ?? SUGGESTIONS.general.tutor;
      const sources = ragSources.length > 0 ? ragSources : await findSources(lastUserMsg);
      const activeAgents = agentResults.map(r => r.agent);

      // Feature 6: Knowledge Validation (warn only, never block)
      const validation = validateResponse(aiFullContent, subject, effectiveMode);

      reply.raw.write(`data: ${JSON.stringify({ type: 'meta', suggestions, sources, langIntent: langResult?.intent ?? null, activeAgents, validation: validation.ok ? null : validation.warnings })}\n\n`);

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

        const mergedMistakes = [...brain.mistakes, ...mistakes].slice(-6);
        updateBrain(sub, subject, {
          topic,
          level,
          mode: effectiveMode,
          mistakes,
          summary,
          messageCount: newCount,
          goal: brain.goal ?? (newCount === 1 ? lastUserMsg.slice(0, 100) : undefined),
        }).catch(() => {});

        // Phase B — sync learning state từ brain (async, non-blocking)
        syncLearningStateFromBrain(sub, subject, {
          topic,
          mistakes: mergedMistakes,
          mastery: brain.mastery,
        }).catch(() => {});

        // Feature 1 — Build Knowledge Graph từ AI response (async, non-blocking)
        if (aiFullContent.length > 100) {
          buildKnowledgeGraph(sub, subject, lastUserMsg + '\n' + aiFullContent).catch(() => {});
        }

        // ── Mastery update khi chấm bài ─────────────────────────────────────
        if (effectiveMode === 'homework' && brain.topic) {
          const scoreMatch = aiFullContent.match(/\*\*Điểm:\s*(\d+(?:\.\d+)?)\/10\*\*/i);
          if (scoreMatch) {
            const score01 = parseFloat(scoreMatch[1]) / 10;
            updateMastery(sub, subject, brain.topic, score01).catch(() => {});
          }
        }

        // ── Module 1/2/3: Analytics + Streak + Achievements (async) ──────────
        const masteryAvg = Object.keys(brain.mastery).length > 0
          ? Object.values(brain.mastery).reduce((s: number, v) => s + (v as number), 0) / Object.keys(brain.mastery).length
          : undefined;

        ;(async () => {
          try {
            const modeStr = effectiveMode as string;
            const eventType = modeStr === 'homework' ? 'homework'
              : modeStr === 'quiz' ? 'quiz'
              : modeStr === 'voice' ? 'voice'
              : 'chat';
            await trackLearningEvent(sub, eventType, { masteryAvg });
            const streak = await recordActiveDay(sub);
            const la = await getLearningAnalytics(sub);
            await checkAndUnlockAchievements(sub, {
              chatCount: la.chatCount,
              quizCount: la.quizCount,
              homeworkCount: la.homeworkCount,
              currentStreak: streak.currentStreak,
              topMastery: masteryAvg,
            });
            // XP + Timeline (fire-and-forget)
            await awardXP(sub, eventType).catch(() => {});
            await recordTimelineEvent(sub, {
              type: eventType as 'chat' | 'quiz' | 'homework' | 'voice',
              title: eventType === 'chat' ? 'Chat với AI Tutor'
                : eventType === 'quiz' ? 'Làm quiz AI'
                : eventType === 'homework' ? 'Nộp bài tập'
                : 'Phiên Voice AI',
              description: `Chủ đề: ${topic ?? subject}`,
              subject: subject as string,
              time: Date.now(),
            }).catch(() => {});
          } catch { /* fire-and-forget */ }
        })();

        // ── Module 7: Provider Monitor (async) ───────────────────────────────
        const usedProvider: Provider = (orch.preferredProvider ?? 'groq') as Provider;
        const approxTokens = Math.round((aiFullContent.length + lastUserMsg.length) / 4);
        recordProviderCall(usedProvider, { latencyMs: Date.now() - streamBeginAt, tokens: approxTokens, success: true }).catch(() => {});

        // ── Module 8: Agent Monitor (async) ──────────────────────────────────
        if (agentResults.length > 0) {
          for (const r of agentResults) {
            const agentName = r.agent.toLowerCase().replace(/ /g, '_') as MonitoredAgent;
            const knownAgents: MonitoredAgent[] = ['tutor', 'math', 'quiz', 'homework', 'knowledge_graph'];
            if (knownAgents.includes(agentName)) {
              recordAgentCall(agentName, 0, true).catch(() => {});
            }
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
      topic: z.string().max(80).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { content, subject, topic } = body.data;
    const { sub } = req.user as { sub: string };

    const rubricInstructions: Record<string, string> = {
      math: 'Chấm theo tiêu chí: (1) Cách đặt vấn đề (2) Tính toán đúng (3) Kết quả chính xác (4) Trình bày rõ ràng',
      viet: 'Chấm theo tiêu chí: (1) Chính tả (2) Ngữ pháp (3) Diễn đạt (4) Nội dung phù hợp',
      language: 'Grade by: (1) Grammar (2) Vocabulary (3) Coherence (4) Accuracy',
      general: 'Chấm theo tiêu chí: (1) Hiểu đúng yêu cầu (2) Nội dung đầy đủ (3) Trình bày rõ ràng',
    };

    const systemPrompt = `${buildSystemPrompt(subject as Subject, 'homework')}

${rubricInstructions[subject] || rubricInstructions.general}

Trả về JSON theo đúng định dạng sau (không có markdown):
{
  "score": <số từ 0-10>,
  "rubric": [
    { "criterion": "<tên tiêu chí>", "score": <điểm>, "max": <điểm tối đa>, "comment": "<nhận xét ngắn>" }
  ],
  "mistakes": ["<lỗi 1>", "<lỗi 2>"],
  "suggestions": ["<gợi ý 1>", "<gợi ý 2>"],
  "summary": "<nhận xét tổng thể>"
}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Đây là bài làm của em:\n\n${content}` },
      ], { prefer: 'gemini' });

      let parsed: { score: number; rubric: any[]; mistakes: string[]; suggestions: string[]; summary: string } | null = null;
      try {
        const jsonStr = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch { /* fallback to text */ }

      const score = parsed?.score ?? (() => {
        const m = raw.match(/\*\*Điểm:\s*(\d+(?:\.\d+)?)\/10\*\*/i) || raw.match(/"score":\s*(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
      })();

      const mistakes = parsed?.mistakes ?? extractMistakes(raw).map(m => m.type);
      const suggestions = parsed?.suggestions ?? [];

      // Sync mistakes → brain → learning state (fire-and-forget)
      if (mistakes.length > 0 || (score !== null && score < 6)) {
        const mistakeTopic = topic || (subject === 'math' ? 'Toán' : subject === 'viet' ? 'Tiếng Việt' : subject === 'language' ? 'Ngoại ngữ' : 'Bài tập');
        (async () => {
          try {
            await updateBrain(sub, subject, {
              mistakes: mistakes.slice(0, 3).map(m => ({ type: m.slice(0, 80), count: 1, lastSeen: Date.now() })),
            });
            if (score !== null) await updateMastery(sub, subject, mistakeTopic, score / 10);
            const brain = await getBrain(sub, subject);
            await syncLearningStateFromBrain(sub, subject, brain);
          } catch { /* fire-and-forget */ }
        })();
      }

      // Module 1/2/3: track homework event async
      ;(async () => {
        try {
          await trackLearningEvent(sub, 'homework');
          const sk = await recordActiveDay(sub);
          const la = await getLearningAnalytics(sub);
          await checkAndUnlockAchievements(sub, {
            homeworkCount: la.homeworkCount,
            currentStreak: sk.currentStreak,
          });
          await awardXP(sub, 'homework').catch(() => {});
          await recordTimelineEvent(sub, {
            type: 'homework',
            title: 'Nộp bài tập',
            description: `Điểm: ${score !== null ? score + '/10' : 'chưa chấm'} · ${topic ?? subject}`,
            subject: subject as string,
            score: score ?? undefined,
            time: Date.now(),
          }).catch(() => {});
        } catch { /* fire-and-forget */ }
      })();

      return reply.send({
        feedback: parsed?.summary ?? raw,
        score,
        rubric: parsed?.rubric ?? [],
        mistakes,
        suggestions,
      });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng, vui lòng thử lại' });
    }
  });

  // ─── Learning Path ────────────────────────────────────────────────────────────
  app.get('/learning-path', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';

    const [brain, gap, rec] = await Promise.all([
      getBrain(sub, subject),
      (async () => {
        const { analyzeKnowledgeGap } = await import('../../services/knowledge-gap');
        return analyzeKnowledgeGap(sub, subject);
      })(),
      (async () => {
        const { getRecommendations } = await import('../../services/recommendation');
        return getRecommendations(sub, subject);
      })(),
    ]);

    const steps: Array<{ type: string; title: string; id?: string; status: string; description?: string }> = [];

    // Step 1: Current topic or review weak areas
    if (gap.weak.length > 0) {
      steps.push({
        type: 'review',
        title: `Ôn lại: ${gap.weak[0]}`,
        status: 'current',
        description: `AI phát hiện bạn cần ôn thêm về ${gap.weak.slice(0, 2).join(', ')}`,
      });
    } else if (brain.topic) {
      steps.push({
        type: 'review',
        title: `Tiếp tục: ${brain.topic}`,
        status: 'current',
        description: 'Chủ đề bạn đang học',
      });
    }

    // Step 2: Recommended lesson
    if (rec.lesson) {
      steps.push({
        type: 'lesson',
        title: rec.lesson.title,
        id: rec.lesson.id,
        status: 'next',
        description: rec.lesson.courseTitle,
      });
    }

    // Step 3: Quiz
    if (rec.quiz) {
      steps.push({
        type: 'quiz',
        title: rec.quiz.title,
        id: rec.quiz.id,
        status: 'next',
        description: 'Kiểm tra kiến thức',
      });
    } else {
      steps.push({
        type: 'quiz',
        title: 'Làm quiz luyện tập',
        status: 'upcoming',
        description: 'Kiểm tra sau khi học bài',
      });
    }

    // Step 4: Practice exercise
    if (rec.exercise) {
      steps.push({
        type: 'practice',
        title: rec.exercise,
        status: 'upcoming',
        description: 'Bài tập thực hành',
      });
    }

    // Step 5: Next milestone
    if (gap.strong.length > 0) {
      steps.push({
        type: 'milestone',
        title: `Thành thạo: ${gap.strong.slice(0, 2).join(', ')}`,
        status: 'done',
        description: 'Đã hoàn thành tốt',
      });
    }

    const masteryEntries = Object.entries(brain.mastery);
    const avgMastery = masteryEntries.length > 0
      ? Math.round(masteryEntries.reduce((s, [, v]) => s + v, 0) / masteryEntries.length * 100)
      : 0;

    return reply.send({
      steps,
      weakTopics: gap.weak,
      strongTopics: gap.strong,
      avgMastery,
      estimatedMinutes: (gap.weak.length * 15) + (rec.lesson ? 20 : 0) + 10,
    });
  });

  // ─── Speaking Practice — evaluate spoken English/Vietnamese ─────────────────
  app.post('/speaking-practice', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      transcript: z.string().min(1).max(500),
      subject: z.enum(['math', 'language', 'viet', 'general']).default('language'),
      targetPhrase: z.string().max(200).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { transcript, subject, targetPhrase } = body.data;
    const isEnglish = subject === 'language';

    let prompt: string;
    if (isEnglish) {
      prompt = targetPhrase
        ? `Học sinh muốn luyện nói câu: "${targetPhrase}"\nHọc sinh đã nói: "${transcript}"\n\nHãy đánh giá:\n1. Độ chính xác (so với câu mục tiêu)\n2. Ngữ pháp\n3. Từ vựng\n\nFormat JSON:\n{"score": <0-10>, "feedback": "...", "corrections": ["..."], "encouragement": "..."}`
        : `Học sinh nói tiếng Anh: "${transcript}"\n\nHãy đánh giá nói tiếng Anh:\n1. Ngữ pháp\n2. Từ vựng\n3. Tự nhiên\n\nFormat JSON:\n{"score": <0-10>, "feedback": "...", "corrections": ["..."], "encouragement": "..."}`;
    } else {
      prompt = `Học sinh nói: "${transcript}"\n\nHãy đánh giá cách dùng từ và ngữ pháp tiếng Việt.\nFormat JSON:\n{"score": <0-10>, "feedback": "...", "corrections": ["..."], "encouragement": "..."}`;
    }

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: 'Bạn là giáo viên ngôn ngữ. Đánh giá ngắn gọn, khích lệ học sinh. Chỉ trả về JSON.' },
        { role: 'user', content: prompt },
      ]);

      // Parse JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({ transcript, score: 7, feedback: raw, corrections: [], encouragement: 'Tiếp tục luyện tập!' });
      }
      const result = JSON.parse(jsonMatch[0]);
      return reply.send({ transcript, ...result });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });
}
