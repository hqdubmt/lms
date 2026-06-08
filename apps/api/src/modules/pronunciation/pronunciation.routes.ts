import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { analyzePronunciation } from './pronunciation.service';
import { scorePronunciation } from './pronunciation-score.service';
import { IPA_GUIDE, buildIpaGuideText } from './ipa.service';
import { redis } from '../../services/redis';

const PRONUNCIATION_CACHE_TTL = 24 * 3600; // 24 hours

function pronunciationCacheKey(userId: string): string {
  return `pronunciation:v1:${userId}`;
}

export async function pronunciationRoutes(app: FastifyInstance) {

  // POST /ai/pronunciation — IPA + stress + tips for any text
  app.post('/pronunciation', { preHandler: requireAuth }, async (req, reply) => {
    const { text } = z.object({
      text: z.string().min(1).max(500),
    }).parse(req.body);

    const { sub } = req.user as { sub: string };

    const result = await analyzePronunciation(text.trim());

    // Append to user history (async)
    redis.get(pronunciationCacheKey(sub)).then(async (raw) => {
      const history: any[] = raw ? JSON.parse(raw) : [];
      history.push({ text, result, at: new Date().toISOString() });
      await redis.set(pronunciationCacheKey(sub), JSON.stringify(history.slice(-50)), 'EX', PRONUNCIATION_CACHE_TTL);
    }).catch(() => {});

    return reply.send(result);
  });

  // POST /ai/pronunciation-score — compare expected vs spoken text
  app.post('/pronunciation-score', { preHandler: requireAuth }, async (req, reply) => {
    const { expected, spoken } = z.object({
      expected: z.string().min(1).max(500),
      spoken: z.string().min(1).max(500),
    }).parse(req.body);

    const { sub } = req.user as { sub: string };

    const result = scorePronunciation(expected, spoken);

    // Track weak sounds (async)
    if (result.mistakes.length > 0) {
      redis.get(pronunciationCacheKey(sub)).then(async (raw) => {
        const cache: any = raw ? JSON.parse(raw) : {};
        const history = Array.isArray(cache) ? cache : [];
        history.push({
          type: 'score',
          expected,
          spoken,
          score: result.score,
          mistakes: result.mistakes,
          at: new Date().toISOString(),
        });
        await redis.set(pronunciationCacheKey(sub), JSON.stringify(history.slice(-50)), 'EX', PRONUNCIATION_CACHE_TTL);
      }).catch(() => {});
    }

    return reply.send(result);
  });

  // GET /ai/ipa-guide — full IPA reference table
  app.get('/ipa-guide', { preHandler: requireAuth }, async (_req, reply) => {
    return reply.send({
      guide: IPA_GUIDE,
      text: buildIpaGuideText(),
    });
  });

  // GET /ai/pronunciation-history — user's score history
  app.get('/pronunciation-history', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const raw = await redis.get(pronunciationCacheKey(sub));
    const history = raw ? JSON.parse(raw) : [];
    const scores = history.filter((h: any) => h.type === 'score');
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s: number, h: any) => s + h.score, 0) / scores.length)
      : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores.map((h: any) => h.score)) : 0;
    return reply.send({
      history: history.slice(-20),
      pronunciationCount: history.length,
      averagePronunciationScore: avgScore,
      bestPronunciationScore: bestScore,
    });
  });
}
