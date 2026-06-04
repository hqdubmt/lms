/**
 * Module J — Language Coach Suite
 * Writing Coach, Listening Coach, Conversation Coach
 * Existing /ai/speaking-practice is NOT modified.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { aiChatOnce } from '../../services/ai-provider';
import { trackLearningEvent } from '../../services/learning-analytics';
import { recordActiveDay } from '../../services/streak';

const COACH_SYSTEM = `Bạn là giáo viên ngôn ngữ chuyên nghiệp. Phản hồi ngắn gọn, khích lệ và thực tế. Chỉ trả về JSON hợp lệ, không markdown.`;

export async function languageCoachRoutes(app: FastifyInstance) {
  // ─── Writing Coach ─────────────────────────────────────────────────────────
  app.post('/writing-coach', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      text: z.string().min(10).max(2000),
      language: z.enum(['en', 'vi', 'ja', 'ko', 'fr', 'de', 'zh', 'es']).default('en'),
      type: z.enum(['essay', 'email', 'paragraph', 'story', 'free']).default('free'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { text, language, type } = body.data;
    const { sub } = req.user as { sub: string };

    const langNames: Record<string, string> = {
      en: 'English', vi: 'Vietnamese', ja: 'Japanese', ko: 'Korean',
      fr: 'French', de: 'German', zh: 'Chinese', es: 'Spanish',
    };
    const langName = langNames[language] ?? 'English';

    const prompt = `Check this ${langName} ${type} writing and return JSON:
{
  "score": <0-10>,
  "overall": "<1-2 sentence overall feedback>",
  "grammar": [{"error": "<original>", "fix": "<corrected>", "explanation": "<why>"}],
  "vocabulary": ["<word or phrase improvement suggestion>"],
  "style": "<1 sentence style tip>",
  "encouragement": "<motivating closing remark>"
}

Text to evaluate:
${text}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: COACH_SYSTEM },
        { role: 'user', content: prompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({ score: 7, overall: raw, grammar: [], vocabulary: [], style: '', encouragement: 'Tiếp tục luyện viết!' });
      }
      const result = JSON.parse(jsonMatch[0]);

      ;(async () => {
        try {
          await trackLearningEvent(sub, 'chat');
          await recordActiveDay(sub);
        } catch { /* fire-and-forget */ }
      })();

      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  // ─── Listening Coach ───────────────────────────────────────────────────────
  app.post('/listening-coach', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      transcript: z.string().min(5).max(2000),
      userAnswer: z.string().min(1).max(1000),
      language: z.enum(['en', 'vi', 'ja', 'ko', 'fr', 'de', 'zh', 'es']).default('en'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { transcript, userAnswer, language } = body.data;
    const { sub } = req.user as { sub: string };

    const prompt = `Evaluate this listening comprehension answer and return JSON:
{
  "score": <0-10>,
  "comprehension": "<how well they understood the text>",
  "missed": ["<key point they missed>"],
  "correct": ["<what they got right>"],
  "tip": "<listening strategy tip>",
  "encouragement": "<motivating closing remark>"
}

Original text (${language}): ${transcript}
Student answer: ${userAnswer}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: COACH_SYSTEM },
        { role: 'user', content: prompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({ score: 7, comprehension: raw, missed: [], correct: [], tip: '', encouragement: '' });
      }
      const result = JSON.parse(jsonMatch[0]);

      ;(async () => {
        try {
          await trackLearningEvent(sub, 'chat');
          await recordActiveDay(sub);
        } catch { /* fire-and-forget */ }
      })();

      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  // ─── Conversation Coach ────────────────────────────────────────────────────
  app.post('/conversation-coach', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'ai']),
        content: z.string().max(500),
      })).min(1).max(20),
      language: z.enum(['en', 'vi', 'ja', 'ko', 'fr', 'de', 'zh', 'es']).default('en'),
      topic: z.string().max(100).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { messages, language, topic } = body.data;
    const { sub } = req.user as { sub: string };

    const convoText = messages.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n');

    const prompt = `Evaluate this ${language} conversation${topic ? ` about "${topic}"` : ''} and return JSON:
{
  "fluency": <0-10>,
  "accuracy": <0-10>,
  "naturalness": <0-10>,
  "overall": "<1-2 sentence overall feedback>",
  "improvements": ["<specific improvement suggestion>"],
  "betterPhrases": [{"original": "<what student said>", "better": "<more natural version>"}],
  "nextTopic": "<suggested conversation topic to practice next>",
  "encouragement": "<motivating closing remark>"
}

Conversation:
${convoText}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: COACH_SYSTEM },
        { role: 'user', content: prompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({ fluency: 7, accuracy: 7, naturalness: 7, overall: raw, improvements: [], betterPhrases: [], nextTopic: '', encouragement: '' });
      }
      const result = JSON.parse(jsonMatch[0]);

      ;(async () => {
        try {
          await trackLearningEvent(sub, 'voice');
          await recordActiveDay(sub);
        } catch { /* fire-and-forget */ }
      })();

      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });
}
