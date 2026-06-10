import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import * as XLSX from 'xlsx';
import { extractText, structureLangWithAI } from '../../services/file-import';
import { serveTTS } from '../../services/tts';
import { callAIForJSON, isAnyAIAvailable, aiChatOnce } from '../../services/ai-provider';
import { embedText, upsertEntry, getIndexStats, isEmbedModelAvailable } from '../../services/rag';
import { env } from '../../config/env';
import { LANG_GOLD_DATASET, validateDataset, toFullParserText } from '../../data/lang-gold-dataset';
import { getOrSet, cacheDelPattern } from '../../services/cache';

// ─── SM-2 Spaced Repetition Algorithm ─────────────────────────────────────────
function sm2(quality: number, repetitions: number, interval: number, easeFactor: number) {
  const q = Math.max(0, Math.min(5, quality));
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;

  if (q < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions += 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEase);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  return { repetitions: newRepetitions, interval: newInterval, easeFactor: newEase, nextReview, isLearned: newRepetitions >= 3 };
}


async function addXP(userId: string, xp: number) {
  const stats = await prisma.langUserStats.upsert({
    where: { userId },
    create: { userId, xp: 0, lastStudied: new Date() },
    update: {},
  });

  const today = new Date().toDateString();
  const lastDay = stats.lastStudied ? new Date(stats.lastStudied).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let newStreak = stats.streak;
  if (lastDay !== today) {
    newStreak = lastDay === yesterday ? stats.streak + 1 : 1;
  }

  const newXp = stats.xp + xp;
  const newLevel = Math.floor(newXp / 500) + 1;

  return prisma.langUserStats.update({
    where: { userId },
    data: {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastStudied: new Date(),
    },
  });
}

const LANG_DISPLAY_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French',
  zh: 'Chinese', de: 'German', es: 'Spanish', vi: 'Vietnamese',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
};
function getLangName(lang: string): string {
  return LANG_DISPLAY_NAMES[lang] ?? lang.toUpperCase();
}

async function updateSkillScore(userId: string, skill: string, newScore: number) {
  const existing = await prisma.langSkillScore.findUnique({ where: { userId_skill: { userId, skill } } });
  // Moving average: weight old score 70%, new score 30%
  const blended = existing ? Math.round(existing.score * 0.7 + newScore * 0.3) : newScore;
  await prisma.langSkillScore.upsert({
    where: { userId_skill: { userId, skill } },
    create: { userId, skill, score: blended, sessions: 1 },
    update: { score: blended, sessions: { increment: 1 } },
  });
}

// ─── Exercise generation helpers ─────────────────────────────────────────────

type VocabItemLike = {
  id: string; word: string; translation: string; pronunciation?: string | null;
  example?: string | null; exampleTrans?: string | null; notes?: string | null;
};

type RawQuestion = {
  content: string; options?: unknown; answer: unknown;
  explanation?: string; order: number; points: number;
};

const shuffleArr = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type ExerciseType = 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'MATCHING' | 'WORD_ORDER';

function buildQuestions(pool: VocabItemLike[], type: ExerciseType, count: number): RawQuestion[] | { error: string } {
  const sh = shuffleArr(pool);

  if (type === 'MULTIPLE_CHOICE') {
    if (pool.length < 4) return { error: `Cần ít nhất 4 từ cho trắc nghiệm. Hiện có: ${pool.length}` };
    return sh.slice(0, count).map((item, i) => {
      const wrong = shuffleArr(pool.filter(x => x.id !== item.id)).slice(0, 3).map(x => x.translation);
      return {
        content: `"${item.word}"${item.pronunciation ? ` (${item.pronunciation})` : ''} có nghĩa là gì?`,
        options: shuffleArr([item.translation, ...wrong]),
        answer: item.translation,
        explanation: item.example ? `${item.example}${item.exampleTrans ? ' → ' + item.exampleTrans : ''}` : undefined,
        order: i, points: 1,
      };
    });
  }

  if (type === 'FILL_BLANK') {
    if (pool.length < 3) return { error: `Cần ít nhất 3 từ cho điền từ. Hiện có: ${pool.length}` };
    const withEx = sh.filter(x => x.example);
    const ordered = [...withEx, ...sh.filter(x => !x.example)].slice(0, count);
    return ordered.map((item, i) => {
      let content: string;
      if (item.example) {
        const regex = new RegExp(`\\b${item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const replaced = item.example.replace(regex, '___');
        content = replaced.includes('___') ? replaced : `___ : ${item.translation}`;
      } else {
        content = `___ : ${item.translation}${item.pronunciation ? ` (${item.pronunciation})` : ''}`;
      }
      return { content, answer: item.word, explanation: item.exampleTrans || item.translation, order: i, points: 1 };
    });
  }

  if (type === 'MATCHING') {
    if (pool.length < 2) return { error: `Cần ít nhất 2 từ cho ghép cặp. Hiện có: ${pool.length}` };
    const BATCH = 6;
    const selected = sh.slice(0, Math.min(count * BATCH, 60));
    const questions: RawQuestion[] = [];
    let qIdx = 0;
    for (let start = 0; start < selected.length && questions.length < count; start += BATCH) {
      const batch = selected.slice(start, start + BATCH);
      if (batch.length < 2) break;
      questions.push({
        content: `Ghép ${batch.length} từ với nghĩa tương ứng`,
        options: shuffleArr(batch.map(x => x.word)),
        answer: Object.fromEntries(batch.map(x => [x.word, x.translation])),
        order: qIdx++, points: batch.length,
      });
    }
    return questions.length ? questions : { error: 'Không tạo được câu hỏi ghép cặp.' };
  }

  if (type === 'WORD_ORDER') {
    const withEx = sh.filter(x => x.example && x.example.trim().split(/\s+/).length >= 3);
    if (withEx.length < 3) return { error: 'Cần ít nhất 3 từ có câu ví dụ (≥3 từ) cho sắp xếp câu.' };
    return withEx.slice(0, count).map((item, i) => {
      const words = item.example!.trim().split(/\s+/);
      return {
        content: item.exampleTrans
          ? `Sắp xếp thành câu: "${item.exampleTrans}"`
          : `Sắp xếp các từ thành câu hoàn chỉnh (từ khoá: ${item.word})`,
        options: shuffleArr(words),
        answer: words,
        explanation: `${item.word}: ${item.translation}`,
        order: i, points: 1,
      };
    });
  }

  return { error: 'Loại bài tập không hỗ trợ.' };
}

export async function languageRoutes(app: FastifyInstance) {

  // ─── TTS PROXY ────────────────────────────────────────────────────────────
  // Proxies to Google Translate TTS so clients on http:// can play audio
  // without needing a secure context or browser speech synthesis support.
  app.get('/tts', async (req, reply) => {
    const { text, lang, slow } = req.query as { text?: string; lang?: string; slow?: string };
    if (!text) return reply.status(400).send({ error: 'text required' });
    const safeLang = /^[a-z]{2}(-[A-Z]{2,4})?$/i.test(lang || '') ? lang! : 'en-US';
    const result = await serveTTS(text, safeLang, slow === '1');
    if (!result) return reply.status(503).send({ error: 'TTS service unavailable' });
    reply.header('Content-Type', result.contentType);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.send(result.audio);
  });

  // ─── STATS ────────────────────────────────────────────────────────────────

  app.get('/stats', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return getOrSet(`lang:stats:${sub}`, 30, async () => {
      const stats = await prisma.langUserStats.findUnique({ where: { userId: sub } });
      const reviewCount = await prisma.vocabItemProgress.count({
        where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
      });
      return { ...(stats || { xp: 0, level: 1, streak: 0, longestStreak: 0, wordsLearned: 0, exercisesDone: 0 }), reviewsDue: reviewCount };
    });
  });

  app.get('/leaderboard', { preHandler: requireAuth }, async () => {
    return getOrSet('lang:leaderboard', 300, () =>
      prisma.langUserStats.findMany({
        take: 20,
        orderBy: { xp: 'desc' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      })
    );
  });

  // ─── ANALYTICS ───────────────────────────────────────────────────────────────

  app.get('/analytics', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const now = new Date();
    return getOrSet(`lang:analytics:${sub}`, 30, async () => {

    const [stats, skillScores, wordStats, exerciseStats] = await Promise.all([
      prisma.langUserStats.findUnique({ where: { userId: sub } }),

      prisma.langSkillScore.findMany({ where: { userId: sub } }),

      prisma.vocabItemProgress.aggregate({
        where: { userId: sub },
        _count: { id: true },
      }).then(async (total) => {
        const [learned, mastered, due, avgSpeak, avgListen] = await Promise.all([
          prisma.vocabItemProgress.count({ where: { userId: sub, repetitions: { gte: 1 } } }),
          prisma.vocabItemProgress.count({ where: { userId: sub, isLearned: true } }),
          prisma.vocabItemProgress.count({ where: { userId: sub, nextReview: { lte: now }, isLearned: false } }),
          prisma.vocabItemProgress.aggregate({
            where: { userId: sub, speakScore: { not: null } },
            _avg: { speakScore: true },
          }),
          prisma.vocabItemProgress.aggregate({
            where: { userId: sub, listenScore: { not: null } },
            _avg: { listenScore: true },
          }),
        ]);
        return {
          total: total._count.id,
          seen: learned,
          mastered,
          due,
          avgSpeakScore: Math.round(avgSpeak._avg.speakScore ?? 0),
          avgListenScore: Math.round(avgListen._avg.listenScore ?? 0),
        };
      }),

      prisma.exerciseAttempt.aggregate({
        where: { userId: sub },
        _count: { id: true },
        _avg: { score: true },
      }),
    ]);

    // Build skill map
    const skillMap: Record<string, number> = {
      vocabulary: 0, grammar: 0, listening: 0, speaking: 0, reading: 0, writing: 0,
    };
    const trackedSkills = new Set(skillScores.map(s => s.skill));
    skillScores.forEach(s => { if (s.skill in skillMap) skillMap[s.skill] = Math.round(s.score); });

    // Infer scores from computed data only when no tracked record exists yet
    if (wordStats.total > 0 && !trackedSkills.has('vocabulary')) {
      skillMap.vocabulary = Math.round((wordStats.mastered / wordStats.total) * 100);
    }
    if (wordStats.avgSpeakScore > 0 && !trackedSkills.has('speaking')) skillMap.speaking = wordStats.avgSpeakScore;
    if (wordStats.avgListenScore > 0 && !trackedSkills.has('listening')) skillMap.listening = wordStats.avgListenScore;
    if (exerciseStats._avg.score != null && !trackedSkills.has('reading')) {
      skillMap.reading = Math.round(exerciseStats._avg.score);
    }

    // Topic/level breakdown — select only needed fields to avoid full-row materialisation
    const topicBreakdown = await prisma.vocabItemProgress.findMany({
      where: { userId: sub },
      select: {
        isLearned: true,
        item: { select: { topic: true, itemLevel: true, set: { select: { level: true } } } },
      },
      take: 200,
    });
    const topicMap: Record<string, { seen: number; mastered: number }> = {};
    const levelMap: Record<string, { seen: number; mastered: number }> = {};
    for (const p of topicBreakdown) {
      const topic = p.item.topic || p.item.set.level || 'Other';
      const level = p.item.itemLevel || p.item.set.level || 'A1';
      if (!topicMap[topic]) topicMap[topic] = { seen: 0, mastered: 0 };
      if (!levelMap[level]) levelMap[level] = { seen: 0, mastered: 0 };
      topicMap[topic].seen++;
      levelMap[level].seen++;
      if (p.isLearned) { topicMap[topic].mastered++; levelMap[level].mastered++; }
    }

    return {
      stats: stats ?? { xp: 0, level: 1, streak: 0, longestStreak: 0, wordsLearned: 0, exercisesDone: 0 },
      wordStats,
      skillScores: skillMap,
      exerciseStats: {
        total: exerciseStats._count.id,
        avgScore: Math.round(exerciseStats._avg.score ?? 0),
      },
      topicBreakdown: Object.entries(topicMap).map(([topic, v]) => ({ topic, ...v })).slice(0, 10),
      levelBreakdown: Object.entries(levelMap).map(([level, v]) => ({ level, ...v })).sort((a, b) => a.level.localeCompare(b.level)),
    };
    }); // end getOrSet
  });

  // ─── VOCAB SETS ───────────────────────────────────────────────────────────

  app.get('/vocab-sets', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { language?: string; level?: string; courseId?: string; search?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.language) where.language = q.language;
    if (q.level) where.level = q.level;
    if (q.courseId) where.courseId = q.courseId;
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }

    // Skip cache for search and per-user queries
    if (q.search || q.mine === 'true') {
      return prisma.vocabSet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { items: true, children: true } },
          progresses: { where: { userId: sub }, select: { wordsLearned: true, lastStudied: true } },
        },
      });
    }
    // Cache per-user so progress data is always fresh and consistent
    const setsCacheKey = `lang:vocab-sets:${sub}:${q.language ?? ''}:${q.level ?? ''}:${q.courseId ?? ''}`;
    return getOrSet(setsCacheKey, 60, async () => {
      const sets = await prisma.vocabSet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { items: true, children: true } },
        },
      });
      const progresses = await prisma.vocabProgress.findMany({
        where: { userId: sub, setId: { in: sets.map((s) => s.id) } },
        select: { setId: true, wordsLearned: true, lastStudied: true },
      });
      const progressMap = Object.fromEntries(progresses.map((p) => [p.setId, p]));
      return sets.map((s) => ({
        ...s,
        progresses: progressMap[s.id] ? [progressMap[s.id]] : [],
      }));
    });
  });

  // List vocab sets as tree — MUST be registered before /:id to avoid being shadowed
  app.get('/vocab-sets/tree', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { language?: string; mine?: string; courseId?: string };
    const where: any = { isPublic: true, parentId: null };
    if (q.language) where.language = q.language;
    if (q.courseId) where.courseId = q.courseId;
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }

    const sets = await prisma.vocabSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { items: true, children: true } },
        children: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { items: true } },
            exercises: {
              select: { id: true, title: true, type: true, isPublic: true },
            },
            progresses: { where: { userId: sub }, select: { wordsLearned: true, lastStudied: true } },
          },
        },
        progresses: { where: { userId: sub }, select: { wordsLearned: true, lastStudied: true } },
      },
    });
    return sets;
  });

  app.get('/vocab-sets/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        items: { orderBy: { order: 'asc' } },
        _count: { select: { items: true, children: true } },
        parent: { select: { id: true, title: true } },
        children: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { items: true } },
            exercises: { select: { id: true, title: true, type: true, isPublic: true } },
          },
        },
        exercises: { select: { id: true, title: true, type: true, isPublic: true } },
      },
    });
    const itemIds = set.items.map(i => i.id);
    const progresses = await prisma.vocabItemProgress.findMany({
      where: { userId: sub, itemId: { in: itemIds } },
    });
    const progressMap = Object.fromEntries(progresses.map(p => [p.itemId, p]));
    return { ...set, progressMap };
  });

  // Create vocab set (instructor/admin)
  app.post('/vocab-sets', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      title: z.string().min(2).max(200),
      description: z.string().optional().nullable(),
      language: z.string().min(2).max(10),
      targetLang: z.string().default('vi'),
      level: z.string().default('A1'),
      coverUrl: z.string().optional().nullable(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional().nullable(),
      parentId: z.string().optional().nullable(),
    }).parse(req.body);
    const set = await prisma.vocabSet.create({ data: { ...body, createdBy: sub } });
    await cacheDelPattern('lang:vocab-sets:*');
    return reply.status(201).send(set);
  });

  // Create child vocab set (sub-topic inside a parent set)
  app.post('/vocab-sets/:id/children', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: parentId } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const parent = await prisma.vocabSet.findUniqueOrThrow({ where: { id: parentId }, select: { createdBy: true, language: true, targetLang: true } });
    if (parent.createdBy !== sub && role !== 'ADMIN') return reply.status(403).send({ error: 'Không có quyền' });
    const body = z.object({
      title: z.string().min(2).max(200),
      description: z.string().optional().nullable(),
      level: z.string().default('A1'),
      isPublic: z.boolean().default(true),
    }).parse(req.body);
    const child = await prisma.vocabSet.create({
      data: { ...body, language: parent.language, targetLang: parent.targetLang, createdBy: sub, parentId },
    });
    return reply.status(201).send(child);
  });

  app.patch('/vocab-sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const set = await prisma.vocabSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    const body = z.object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().optional().nullable(),
      language: z.string().optional(),
      targetLang: z.string().optional(),
      level: z.string().optional(),
      coverUrl: z.string().optional().nullable(),
      videoUrl: z.string().url().optional().nullable(),
      isPublic: z.boolean().optional(),
      courseId: z.string().nullable().optional(),
      parentId: z.string().nullable().optional(),
    }).parse(req.body);
    const updated = await prisma.vocabSet.update({ where: { id }, data: body });
    await cacheDelPattern('lang:vocab-sets:*');
    return updated;
  });

  app.delete('/vocab-sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const set = await prisma.vocabSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vocabSet.delete({ where: { id } });
    await cacheDelPattern('lang:vocab-sets:*');
    return { message: 'Đã xóa bộ từ vựng' };
  });

  // ─── VOCAB ITEMS ──────────────────────────────────────────────────────────

  app.post('/vocab-sets/:id/items', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const body = z.object({
      word: z.string().min(1),
      translation: z.string().min(1),
      pronunciation: z.string().optional(),
      audioUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      example: z.string().optional(),
      exampleTrans: z.string().optional(),
      synonyms: z.array(z.string()).default([]),
      hints: z.array(z.string()).default([]),
      notes: z.string().optional(),
      order: z.number().default(0),
    }).parse(req.body);
    const item = await prisma.vocabItem.create({ data: { ...body, setId } });
    return reply.status(201).send(item);
  });

  app.post('/vocab-sets/:id/items/bulk', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { items } = z.object({
      items: z.array(z.object({
        word: z.string().min(1),
        translation: z.string().min(1),
        pronunciation: z.string().optional(),
        example: z.string().optional(),
        exampleTrans: z.string().optional(),
        synonyms: z.array(z.string()).default([]),
        hints: z.array(z.string()).default([]),
      })).min(1).max(500),
    }).parse(req.body);

    const maxOrder = await prisma.vocabItem.count({ where: { setId } });
    const created = await prisma.vocabItem.createMany({
      data: items.map((item, i) => ({ ...item, setId, order: maxOrder + i })),
    });
    return reply.status(201).send({ created: created.count });
  });

  // Import vocab from file (CSV / Excel / TSV)
  app.post('/vocab-sets/:id/import-file', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };

    const set = await prisma.vocabSet.findUniqueOrThrow({ where: { id: setId }, select: { createdBy: true } });
    if (set.createdBy !== sub) return reply.status(403).send({ error: 'Không có quyền' });

    const file = await req.file();
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 5 * 1024 * 1024) return reply.status(400).send({ error: 'File tối đa 5MB' });

    const ext = file.filename.split('.').pop()?.toLowerCase() || '';
    let rows: string[][] = [];

    if (['xlsx', 'xls', 'ods'].includes(ext)) {
      // Parse Excel / ODS
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
      rows = (data as string[][]).map(r => r.map(c => String(c ?? '').trim()));
    } else {
      // CSV / TSV / TXT — auto detect delimiter
      const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = text.split('\n').filter(l => l.trim());
      const sampleLine = lines[0] || '';
      const delimiter = sampleLine.includes('\t') ? '\t' : sampleLine.includes(';') ? ';' : ',';
      rows = lines.map(line => {
        if (delimiter === ',') {
          // Handle quoted CSV properly
          const cells: string[] = [];
          let current = '';
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
              else inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
              cells.push(current.trim()); current = '';
            } else current += ch;
          }
          cells.push(current.trim());
          return cells;
        }
        return line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      });
    }

    // Skip header row if first cell looks like a label
    const headerKeywords = ['word', 'từ', 'term', 'vocab', 'expression'];
    const firstCell = (rows[0]?.[0] || '').toLowerCase();
    if (headerKeywords.some(k => firstCell.includes(k))) rows = rows.slice(1);

    // Map columns: word, translation, pronunciation, example, exampleTrans, notes
    const COL = {
      word: 0,
      translation: 1,
      pronunciation: 2,
      example: 3,
      exampleTrans: 4,
      notes: 5,
    };

    const items = rows
      .filter(r => r[COL.word]?.trim() && r[COL.translation]?.trim())
      .slice(0, 500)
      .map(r => ({
        word: r[COL.word].trim(),
        translation: r[COL.translation].trim(),
        pronunciation: r[COL.pronunciation]?.trim() || undefined,
        example: r[COL.example]?.trim() || undefined,
        exampleTrans: r[COL.exampleTrans]?.trim() || undefined,
        notes: r[COL.notes]?.trim() || undefined,
      }));

    if (items.length === 0) {
      return reply.status(400).send({ error: 'Không tìm thấy từ nào hợp lệ. Định dạng: cột 1 = từ, cột 2 = nghĩa' });
    }

    const maxOrder = await prisma.vocabItem.count({ where: { setId } });
    const created = await prisma.vocabItem.createMany({
      data: items.map((item, i) => ({ ...item, setId, order: maxOrder + i })),
    });

    // Auto-generate exercises for all 4 types from the full updated vocab pool
    const fullSet = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    const TYPE_LABELS: Record<string, string> = {
      MULTIPLE_CHOICE: 'Trắc nghiệm',
      FILL_BLANK: 'Điền từ',
      MATCHING: 'Ghép cặp',
      WORD_ORDER: 'Sắp xếp câu',
    };

    const generatedExercises: { id: string; type: string; title: string; questionCount: number }[] = [];
    const genErrors: { type: string; error: string }[] = [];

    for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER'] as const) {
      const questionsOrErr = buildQuestions(fullSet.items, type, 20);
      if ('error' in questionsOrErr) {
        genErrors.push({ type, error: questionsOrErr.error });
        continue;
      }
      const title = `[Auto] ${fullSet.title} - ${TYPE_LABELS[type]}`;
      const exercise = await prisma.langExercise.create({
        data: {
          title,
          description: `Tạo tự động khi import file vào bộ từ vựng "${fullSet.title}"`,
          type,
          language: fullSet.language,
          level: fullSet.level,
          isPublic: true,
          createdBy: sub,
          questions: { create: questionsOrErr as any },
        },
        select: { id: true, type: true, title: true, _count: { select: { questions: true } } },
      });
      generatedExercises.push({
        id: exercise.id,
        type: exercise.type,
        title: exercise.title,
        questionCount: exercise._count.questions,
      });
    }

    return reply.status(201).send({
      created: created.count,
      total: items.length,
      exercises: generatedExercises,
      exerciseErrors: genErrors,
    });
  });

  app.patch('/vocab-items/:itemId', { preHandler: requireInstructor }, async (req) => {
    const { itemId } = req.params as { itemId: string };
    const body = z.object({
      word: z.string().optional(),
      translation: z.string().optional(),
      pronunciation: z.string().optional(),
      audioUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      example: z.string().optional(),
      exampleTrans: z.string().optional(),
      synonyms: z.array(z.string()).optional(),
      hints: z.array(z.string()).optional(),
      notes: z.string().optional(),
      order: z.number().optional(),
    }).parse(req.body);
    return prisma.vocabItem.update({ where: { id: itemId }, data: body });
  });

  app.delete('/vocab-items/:itemId', { preHandler: requireInstructor }, async (req) => {
    const { itemId } = req.params as { itemId: string };
    await prisma.vocabItem.delete({ where: { id: itemId } });
    return { message: 'Đã xóa từ' };
  });

  // ─── SRS REVIEW ───────────────────────────────────────────────────────────

  // Get due items for SRS review
  app.get('/vocab-sets/:id/review', { preHandler: requireAuth }, async (req) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    const now = new Date();
    const progresses = await prisma.vocabItemProgress.findMany({
      where: { userId: sub, itemId: { in: set.items.map(i => i.id) } },
    });
    const progressMap = Object.fromEntries(progresses.map(p => [p.itemId, p]));

    // Items due for review OR never studied
    const dueItems = set.items.filter(item => {
      const p = progressMap[item.id];
      if (!p) return true;
      return !p.isLearned && p.nextReview <= now;
    });

    return { items: dueItems, total: set.items.length, due: dueItems.length };
  });

  // Submit SRS review result for one item
  app.post('/vocab-items/:itemId/review', { preHandler: requireAuth }, async (req) => {
    const { itemId } = req.params as { itemId: string };
    const { sub } = req.user as { sub: string };
    const { quality, mode, speakScore, listenScore } = z.object({
      quality: z.number().min(0).max(5),
      mode: z.enum(['srs', 'speak', 'listen', 'write', 'quiz']).optional(),
      speakScore: z.number().min(0).max(100).optional(),
      listenScore: z.number().min(0).max(100).optional(),
    }).parse(req.body);

    const existing = await prisma.vocabItemProgress.findUnique({ where: { userId_itemId: { userId: sub, itemId } } });
    const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
    const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);

    const updateData: any = { ...next, lastReview: new Date() };
    if (speakScore !== undefined) updateData.speakScore = speakScore;
    if (listenScore !== undefined) updateData.listenScore = listenScore;

    const progress = await prisma.vocabItemProgress.upsert({
      where: { userId_itemId: { userId: sub, itemId } },
      create: { userId: sub, itemId, ...next, speakScore, listenScore },
      update: updateData,
    });

    if (next.isLearned && !existing?.isLearned) {
      await prisma.langUserStats.upsert({
        where: { userId: sub },
        create: { userId: sub, wordsLearned: 1, lastStudied: new Date() },
        update: { wordsLearned: { increment: 1 } },
      });
    }

    // Update skill scores based on mode
    const vocabScore = Math.round((quality / 5) * 100);
    if (mode === 'srs' || !mode) await updateSkillScore(sub, 'vocabulary', vocabScore);
    if (mode === 'speak' && speakScore !== undefined) await updateSkillScore(sub, 'speaking', speakScore);
    if (mode === 'listen' && listenScore !== undefined) await updateSkillScore(sub, 'listening', listenScore);
    if (mode === 'write') await updateSkillScore(sub, 'writing', vocabScore);
    if (mode === 'quiz') await updateSkillScore(sub, 'vocabulary', vocabScore);

    if (quality >= 3) await addXP(sub, 5);
    return progress;
  });

  // Mark entire set as studied (update VocabProgress)
  app.post('/vocab-sets/:id/study-session', { preHandler: requireAuth }, async (req) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { wordsStudied } = z.object({ wordsStudied: z.number().min(0) }).parse(req.body);

    await prisma.vocabProgress.upsert({
      where: { userId_setId: { userId: sub, setId } },
      create: { userId: sub, setId, wordsLearned: wordsStudied, lastStudied: new Date() },
      update: { wordsLearned: { increment: wordsStudied }, lastStudied: new Date() },
    });
    await addXP(sub, wordsStudied * 3);
    return { xpEarned: wordsStudied * 3 };
  });

  // ─── GLOBAL SRS REVIEW ────────────────────────────────────────────────────────

  app.get('/review', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const now = new Date();

    const dueProgresses = await prisma.vocabItemProgress.findMany({
      where: { userId: sub, nextReview: { lte: now }, isLearned: false },
      include: {
        item: {
          include: { set: { select: { id: true, title: true, language: true } } },
        },
      },
      take: 50,
      orderBy: { nextReview: 'asc' },
    });

    return dueProgresses.map(p => ({
      ...p.item,
      setTitle: p.item.set.title,
      setLanguage: p.item.set.language,
      setId: p.item.set.id,
    }));
  });

  // ─── EXERCISES ────────────────────────────────────────────────────────────

  app.get('/exercises', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { language?: string; type?: string; level?: string; courseId?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.language) where.language = q.language;
    if (q.type) where.type = q.type;
    if (q.level) where.level = q.level;
    if (q.courseId) where.courseId = q.courseId;
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }

    const isMine = q.mine === 'true';
    const cacheKey = isMine
      ? `lang:exercises:mine:${sub}`
      : `lang:exercises:pub:${q.language ?? ''}:${q.type ?? ''}:${q.level ?? ''}:${q.courseId ?? ''}`;
    return getOrSet(cacheKey, 60, () =>
      prisma.langExercise.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      })
    );
  });

  app.get('/exercises/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.langExercise.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        questions: { orderBy: { order: 'asc' } },
      },
    });
  });

  // Create exercise (instructor/admin)
  app.post('/exercises', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER', 'DICTATION']),
      language: z.string().min(2),
      level: z.string().default('A1'),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
      vocabSetId: z.string().optional(),
      questions: z.array(z.object({
        content: z.string().min(1),
        audioUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        options: z.any().optional(),
        answer: z.any(),
        explanation: z.string().optional(),
        order: z.number().default(0),
        points: z.number().default(1),
      })).default([]),
    }).parse(req.body);

    const { questions, ...exerciseData } = body;
    const exercise = await prisma.langExercise.create({
      data: {
        ...exerciseData,
        createdBy: sub,
        questions: { create: questions as any },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return reply.status(201).send(exercise);
  });

  // ─── AUTO-GENERATE EXERCISE FROM VOCAB SET ───────────────────────────────────

  app.post('/exercises/generate', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const body = z.object({
      vocabSetId: z.string(),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER']),
      questionCount: z.number().min(3).max(50).default(10),
      title: z.string().min(2),
      description: z.string().optional(),
      level: z.string().default('A1'),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
      keyword: z.string().optional(),
    }).parse(req.body);

    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: body.vocabSetId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    let pool = set.items;
    if (body.keyword?.trim()) {
      const kw = body.keyword.trim().toLowerCase();
      pool = pool.filter(item =>
        item.word.toLowerCase().includes(kw) ||
        item.translation.toLowerCase().includes(kw) ||
        item.notes?.toLowerCase().includes(kw) ||
        item.example?.toLowerCase().includes(kw),
      );
    }

    const result = buildQuestions(pool, body.type, body.questionCount);
    if ('error' in result) return reply.status(400).send(result);

    const exercise = await prisma.langExercise.create({
      data: {
        title: body.title,
        description: body.description ?? `Tạo tự động từ bộ từ vựng: ${set.title}`,
        type: body.type,
        language: set.language,
        level: body.level,
        timeLimit: body.timeLimit,
        isPublic: body.isPublic,
        courseId: body.courseId,
        vocabSetId: body.vocabSetId,
        createdBy: sub,
        questions: { create: result as any },
      },
      include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { questions: true } } },
    });

    return reply.status(201).send(exercise);
  });

  app.patch('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      timeLimit: z.number().nullable().optional(),
      isPublic: z.boolean().optional(),
      level: z.string().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    const updated = await prisma.langExercise.update({ where: { id }, data: body });
    await cacheDelPattern('lang:exercises:*');
    return updated;
  });

  // ─── COURSE LANGUAGE CONTENT ──────────────────────────────────────────────

  app.get('/course/:courseId/content', { preHandler: requireAuth }, async (req) => {
    const { courseId } = req.params as { courseId: string };
    const [vocabSets, exercises] = await Promise.all([
      prisma.vocabSet.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      prisma.langExercise.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { questions: true } } },
      }),
    ]);
    return { vocabSets, exercises };
  });

  // Get ALL vocab sets and exercises (for linking picker)
  app.get('/mine', { preHandler: requireInstructor }, async (req) => {
    const { sub } = req.user as { sub: string };
    const [vocabSets, exercises] = await Promise.all([
      prisma.vocabSet.findMany({
        where: { createdBy: sub },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, language: true, courseId: true, _count: { select: { items: true } } },
      }),
      prisma.langExercise.findMany({
        where: { createdBy: sub },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, language: true, courseId: true, _count: { select: { questions: true } } },
      }),
    ]);
    return { vocabSets, exercises };
  });

  app.delete('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const ex = await prisma.langExercise.findUniqueOrThrow({ where: { id } });
    if (ex.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.langExercise.delete({ where: { id } });
    await cacheDelPattern('lang:exercises:*');
    return { message: 'Đã xóa bài tập' };
  });

  // Manage questions
  app.post('/exercises/:id/questions', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: exerciseId } = req.params as { id: string };
    const body = z.object({
      content: z.string().min(1),
      audioUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      options: z.any().optional(),
      answer: z.any(),
      explanation: z.string().optional(),
      order: z.number().default(0),
      points: z.number().default(1),
    }).parse(req.body);
    const q = await prisma.exerciseQuestion.create({ data: { ...body, exerciseId } as any });
    return reply.status(201).send(q);
  });

  app.patch('/questions/:qid', { preHandler: requireInstructor }, async (req) => {
    const { qid } = req.params as { qid: string };
    const body = z.object({
      content: z.string().optional(),
      audioUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      options: z.any().optional(),
      answer: z.any().optional(),
      explanation: z.string().optional(),
      order: z.number().optional(),
      points: z.number().optional(),
    }).parse(req.body);
    return prisma.exerciseQuestion.update({ where: { id: qid }, data: body });
  });

  app.delete('/questions/:qid', { preHandler: requireInstructor }, async (req) => {
    const { qid } = req.params as { qid: string };
    await prisma.exerciseQuestion.delete({ where: { id: qid } });
    return { message: 'Đã xóa câu hỏi' };
  });

  // ─── SUBMIT EXERCISE ──────────────────────────────────────────────────────

  app.post('/exercises/:id/attempt', { preHandler: requireAuth }, async (req) => {
    const { id: exerciseId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { answers, timeTaken } = z.object({
      answers: z.record(z.any()),
      timeTaken: z.number().optional(),
    }).parse(req.body);

    const exercise = await prisma.langExercise.findUniqueOrThrow({
      where: { id: exerciseId },
      include: { questions: true },
    });

    let totalPoints = 0;
    let earnedPoints = 0;
    const results: Record<string, { correct: boolean; correctAnswer: any }> = {};

    for (const q of exercise.questions) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      let correct = false;

      if (exercise.type === 'MULTIPLE_CHOICE' || exercise.type === 'FILL_BLANK' || exercise.type === 'DICTATION') {
        const expected = String(q.answer).toLowerCase().trim();
        correct = String(userAnswer || '').toLowerCase().trim() === expected;
      } else if (exercise.type === 'WORD_ORDER') {
        // Parse stored answer — may be array or JSON-stringified array
        let parsedAnswer: any = q.answer;
        if (typeof parsedAnswer === 'string' && parsedAnswer.startsWith('[')) {
          try { parsedAnswer = JSON.parse(parsedAnswer); } catch { /* keep as string */ }
        }
        const expectedArr = Array.isArray(parsedAnswer)
          ? (parsedAnswer as string[]).map((w: string) => String(w).trim().normalize('NFC')).filter(Boolean)
          : String(q.answer).split(/\s+/).map((w) => w.normalize('NFC')).filter(Boolean);
        const givenArr = Array.isArray(userAnswer)
          ? (userAnswer as string[]).map((w: string) => String(w).trim().normalize('NFC')).filter(Boolean)
          : String(userAnswer ?? '').split(/\s+/).map((w) => w.normalize('NFC')).filter(Boolean);
        correct = givenArr.length === expectedArr.length && givenArr.every((w, i) => w === expectedArr[i]);
      } else if (exercise.type === 'MATCHING') {
        const ua = (userAnswer ?? {}) as Record<string, string>;
        const ea = q.answer as Record<string, string>;
        if (ea && typeof ea === 'object' && !Array.isArray(ea)) {
          const eaKeys = Object.keys(ea);
          correct = eaKeys.length === Object.keys(ua).length && eaKeys.every((k) => ua[k] === ea[k]);
        }
      }

      if (correct) earnedPoints += q.points;
      results[q.id] = { correct, correctAnswer: q.answer };
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const xpEarned = Math.round(score / 10);

    const attempt = await prisma.exerciseAttempt.create({
      data: { userId: sub, exerciseId, answers, score, timeTaken, xpEarned },
    });

    await prisma.langUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });
    await addXP(sub, xpEarned);

    return { attempt, score, results, xpEarned };
  });

  // History of attempts
  app.get('/exercises/:id/attempts', { preHandler: requireAuth }, async (req) => {
    const { id: exerciseId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    return prisma.exerciseAttempt.findMany({
      where: { exerciseId, userId: sub },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });
  });

  // ─── Text Parser: "word - meaning" lines → JSON vocab items ─────────────────

  app.post('/parse-text', { preHandler: requireInstructor }, async (req, reply) => {
    const { text, language } = z.object({
      text: z.string().min(1).max(50000),
      language: z.string().default('en'),
    }).parse(req.body);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items: Array<{ word: string; translation: string; pronunciation?: string; example?: string; exampleTrans?: string; synonyms: string[]; hints: string[] }> = [];
    const failed: string[] = [];

    for (const line of lines) {
      // Hỗ trợ nhiều định dạng: "word - meaning", "word: meaning", "word = meaning", "word\tmeaning"
      const match = line.match(/^(.+?)(?:\s*[-:=\t]\s*)(.+)$/);
      if (!match) { if (line.length > 0) failed.push(line); continue; }
      const word = match[1].trim().replace(/^["'`]|["'`]$/g, '');
      const rest = match[2].trim();
      // Tách pronunciation nếu có dạng "meaning /phiêm âm/"
      const pronMatch = rest.match(/^(.*?)\s*\/([^/]+)\/\s*$/);
      if (pronMatch) {
        items.push({ word, translation: pronMatch[1].trim(), pronunciation: pronMatch[2].trim(), synonyms: [], hints: [] });
      } else {
        items.push({ word, translation: rest, synonyms: [], hints: [] });
      }
    }

    return reply.send({ items, failed, total: items.length });
  });

  // ─── Quality Validator ────────────────────────────────────────────────────────

  app.get('/vocab-sets/:id/quality', { preHandler: requireInstructor }, async (req) => {
    const { id: setId } = req.params as { id: string };

    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    const WEIGHTS = { word: 25, translation: 25, pronunciation: 20, example: 20, exampleTrans: 5, synonyms: 3, hints: 2 };

    const itemReports = set.items.map(item => {
      const missing: string[] = [];
      let score = 0;

      if (item.word) score += WEIGHTS.word; else missing.push('word');
      if (item.translation) score += WEIGHTS.translation; else missing.push('translation');
      if (item.pronunciation) score += WEIGHTS.pronunciation; else missing.push('pronunciation');
      if (item.example) score += WEIGHTS.example; else missing.push('example');
      if (item.exampleTrans) score += WEIGHTS.exampleTrans; else missing.push('exampleTrans');
      if ((item.synonyms as string[]).length > 0) score += WEIGHTS.synonyms; else missing.push('synonyms');
      if ((item.hints as string[]).length > 0) score += WEIGHTS.hints; else missing.push('hints');

      return { id: item.id, word: item.word, score, missing };
    });

    const totalItems = itemReports.length;
    const avgScore = totalItems > 0 ? Math.round(itemReports.reduce((s, i) => s + i.score, 0) / totalItems) : 0;
    const perfect = itemReports.filter(i => i.score === 100).length;
    const incomplete = itemReports.filter(i => i.score < 70).length;

    const fieldStats: Record<string, number> = {};
    for (const field of Object.keys(WEIGHTS)) {
      fieldStats[field] = itemReports.filter(i => !i.missing.includes(field)).length;
    }

    return { setId, title: set.title, totalItems, avgScore, perfect, incomplete, fieldStats, items: itemReports };
  });

  // ─── AI Enrich: từ 1 từ, AI sinh pronunciation, example, synonyms, hints ─────

  app.post('/vocab-items/:itemId/ai-enrich', { preHandler: requireInstructor }, async (req, reply) => {
    const { itemId } = req.params as { itemId: string };

    const item = await prisma.vocabItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { set: { select: { language: true, level: true } } },
    });

    const lang = item.set.language || 'en';
    const langName = getLangName(lang);

    const prompt = `You are a ${langName} language teacher creating learning materials for Vietnamese students.

Word: "${item.word}"
Vietnamese meaning: "${item.translation}"
Level: ${item.set.level || 'A1'}

Generate rich vocabulary data. Return ONLY valid JSON:
{
  "pronunciation": "IPA phonetic transcription (e.g. /ˈæp.əl/)",
  "example": "A natural example sentence using this word in ${langName}",
  "exampleTrans": "Vietnamese translation of the example sentence",
  "synonyms": ["synonym1", "synonym2"],
  "hints": ["Hint 1 in Vietnamese to remember this word", "Hint 2 in Vietnamese (mnemonic, visual, story)"]
}

Rules:
- pronunciation: use IPA format
- example: natural, level-appropriate sentence (not too complex)
- synonyms: 1-3 words with similar meaning in ${langName}
- hints: 2 creative memory tricks in Vietnamese to help remember the word`;

    let enriched: { pronunciation?: string; example?: string; exampleTrans?: string; synonyms?: string[]; hints?: string[] } = {};

    try {
      if (env.ANTHROPIC_API_KEY) {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) enriched = JSON.parse(jsonMatch[0]);
      } else if (await isAnyAIAvailable()) {
        const raw = await callAIForJSON('You are a language learning assistant. Return only valid JSON.', prompt, 1024);
        if (raw) { const m = raw.match(/\{[\s\S]*\}/); if (m) enriched = JSON.parse(m[0]); }
      } else {
        return reply.status(503).send({ error: 'Không có AI nào khả dụng. Cần cấu hình ANTHROPIC_API_KEY hoặc Ollama.' });
      }
    } catch (e: any) {
      return reply.status(500).send({ error: `AI thất bại: ${e.message}` });
    }

    // Chỉ cập nhật các field còn trống để không ghi đè dữ liệu đã có
    const updateData: Record<string, any> = {};
    if (enriched.pronunciation && !item.pronunciation) updateData.pronunciation = enriched.pronunciation;
    if (enriched.example && !item.example) updateData.example = enriched.example;
    if (enriched.exampleTrans && !item.exampleTrans) updateData.exampleTrans = enriched.exampleTrans;
    if (Array.isArray(enriched.synonyms) && enriched.synonyms.length > 0 && (item.synonyms as string[]).length === 0) {
      updateData.synonyms = enriched.synonyms;
    }
    if (Array.isArray(enriched.hints) && enriched.hints.length > 0 && (item.hints as string[]).length === 0) {
      updateData.hints = enriched.hints;
    }

    const updated = Object.keys(updateData).length > 0
      ? await prisma.vocabItem.update({ where: { id: itemId }, data: updateData })
      : item;

    return reply.send({ item: updated, enriched, fieldsUpdated: Object.keys(updateData) });
  });

  // ─── AI Enrich Batch: enrich nhiều từ trong 1 set ────────────────────────────

  app.post('/vocab-sets/:id/ai-enrich-batch', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { onlyMissing } = z.object({ onlyMissing: z.boolean().default(true) }).parse(req.body);

    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    const lang = set.language || 'en';
    const langName = getLangName(lang);

    const toEnrich = onlyMissing
      ? set.items.filter(it => !it.pronunciation || !it.example || (it.synonyms as string[]).length === 0 || (it.hints as string[]).length === 0)
      : set.items;

    if (toEnrich.length === 0) return reply.send({ enriched: 0, message: 'Tất cả từ đã đầy đủ dữ liệu.' });

    const batchLimit = Math.min(toEnrich.length, 20);
    const batch = toEnrich.slice(0, batchLimit);

    const wordList = batch.map(it => `"${it.word}" (${it.translation})`).join(', ');
    const prompt = `You are a ${langName} language teacher. Generate vocabulary data for ${batchLimit} words for Vietnamese learners at ${set.level || 'A1'} level.

Words: ${wordList}

Return ONLY valid JSON array, one object per word in the same order:
[
  {
    "word": "exact word from input",
    "pronunciation": "IPA phonetic",
    "example": "example sentence in ${langName}",
    "exampleTrans": "Vietnamese translation of example",
    "synonyms": ["synonym1", "synonym2"],
    "hints": ["Vietnamese memory hint 1", "Vietnamese memory hint 2"]
  }
]`;

    let results: Array<{ word: string; pronunciation?: string; example?: string; exampleTrans?: string; synonyms?: string[]; hints?: string[] }> = [];

    try {
      if (env.ANTHROPIC_API_KEY) {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) results = JSON.parse(jsonMatch[0]);
      } else if (await isAnyAIAvailable()) {
        const raw = await callAIForJSON('You are a language learning assistant. Return only valid JSON array.', prompt, 4000);
        if (raw) { const m = raw.match(/\[[\s\S]*\]/); if (m) results = JSON.parse(m[0]); }
      } else {
        return reply.status(503).send({ error: 'Không có AI nào khả dụng.' });
      }
    } catch (e: any) {
      return reply.status(500).send({ error: `AI thất bại: ${e.message}` });
    }

    // Match by position (AI returns results in same order as prompt input)
    const updatePromises: Promise<void>[] = [];
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const original = batch[i];
      if (!original) continue;
      const updateData: Record<string, any> = {};
      if (res.pronunciation && !original.pronunciation) updateData.pronunciation = res.pronunciation;
      if (res.example && !original.example) updateData.example = res.example;
      if (res.exampleTrans && !original.exampleTrans) updateData.exampleTrans = res.exampleTrans;
      if (Array.isArray(res.synonyms) && res.synonyms.length > 0 && (original.synonyms as string[]).length === 0) updateData.synonyms = res.synonyms;
      if (Array.isArray(res.hints) && res.hints.length > 0 && (original.hints as string[]).length === 0) updateData.hints = res.hints;
      if (Object.keys(updateData).length > 0) {
        updatePromises.push(prisma.vocabItem.update({ where: { id: original.id }, data: updateData }).then(() => {}));
      }
    }
    await Promise.all(updatePromises);
    const enrichedCount = updatePromises.length;

    return reply.send({ enriched: enrichedCount, total: batchLimit, skipped: toEnrich.length - batchLimit });
  });

  // ─── Smart Import: any file → AI extracts vocab + dialogue + voice chat ──────
  app.post('/vocab-sets/:id/import-smart', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };

    const set = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      select: { createdBy: true, title: true, language: true, level: true },
    });
    if (set.createdBy !== sub) return reply.status(403).send({ error: 'Không có quyền' });

    const file = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } });
    if (!file) return reply.status(400).send({ error: 'Không có file' });

    const buffer = await file.toBuffer();
    let rawText: string;
    try {
      rawText = await extractText(buffer, file.mimetype, file.filename);
    } catch (e: any) {
      return reply.status(400).send({ error: `Không đọc được file: ${e.message}` });
    }

    if (!rawText?.trim()) return reply.status(400).send({ error: 'File không có nội dung văn bản' });

    let curriculum: Awaited<ReturnType<typeof structureLangWithAI>>;
    try {
      curriculum = await structureLangWithAI(rawText, { language: set.language, level: set.level });
    } catch (e: any) {
      return reply.status(500).send({ error: `AI phân tích thất bại: ${e.message}` });
    }

    // Persist vocab items
    const maxOrder = await prisma.vocabItem.count({ where: { setId } });
    let vocabCreated = 0;
    const validItems = curriculum.items.filter((it) => it.word && it.translation);
    if (validItems.length > 0) {
      const created = await prisma.vocabItem.createMany({
        data: validItems.map((item, i) => ({ ...item, setId, order: maxOrder + i })),
      });
      vocabCreated = created.count;
    }

    // Auto-generate exercises from full updated pool
    const fullSet = await prisma.vocabSet.findUniqueOrThrow({
      where: { id: setId },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    const TYPE_LABELS: Record<string, string> = {
      MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
      MATCHING: 'Ghép cặp', WORD_ORDER: 'Sắp xếp câu',
    };
    const generatedExercises: any[] = [];
    if (fullSet.items.length >= 2) {
      for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER'] as const) {
        const questionsOrErr = buildQuestions(fullSet.items, type, 20);
        if ('error' in questionsOrErr) continue;
        const exercise = await prisma.langExercise.create({
          data: {
            title: `[Smart] ${set.title} — ${TYPE_LABELS[type]}`,
            description: `Tạo tự động từ Smart Import cho "${set.title}"`,
            type, language: set.language, level: set.level, isPublic: true, createdBy: sub,
            questions: { create: questionsOrErr as any },
          },
          select: { id: true, type: true, title: true, _count: { select: { questions: true } } },
        });
        generatedExercises.push({
          id: exercise.id, type: exercise.type, title: exercise.title,
          questionCount: exercise._count.questions,
        });
      }
    }

    return reply.status(201).send({
      vocabCreated,
      exercisesGenerated: generatedExercises.length,
      exercises: generatedExercises,
      dialogueScript: curriculum.dialogues,
      voiceChatScript: curriculum.voiceChat,
    });
  });

  // ─── Gold Dataset: xem danh sách sets mẫu có thể seed ────────────────────────

  app.get('/sample-data', { preHandler: requireInstructor }, async () => {
    const report = validateDataset();
    return {
      sets: LANG_GOLD_DATASET.map(s => ({
        level: s.level,
        title: s.title,
        description: s.description,
        topic: s.topic,
        wordCount: s.words.length,
      })),
      validation: report,
    };
  });

  // ─── Gold Dataset: validate parser với toàn bộ data ──────────────────────────

  app.get('/sample-data/validate', { preHandler: requireInstructor }, async () => {
    const allWords = LANG_GOLD_DATASET.flatMap(s =>
      s.words.map(w => ({ ...w, level: s.level, setTitle: s.title })),
    );

    // Chạy parser text qua từng set
    const parserResults: Array<{
      level: string; setTitle: string; text: string;
      parsed: { items: { word: string; translation: string }[]; failed: string[] };
    }> = [];

    for (const set of LANG_GOLD_DATASET) {
      const text = toFullParserText(set.words);
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const items: { word: string; translation: string; pronunciation?: string }[] = [];
      const failed: string[] = [];

      for (const line of lines) {
        const match = line.match(/^(.+?)(?:\s*[-:=\t]\s*)(.+)$/);
        if (!match) { if (line.length > 0) failed.push(line); continue; }
        const word = match[1].trim().replace(/^["'`]|["'`]$/g, '');
        const rest = match[2].trim();
        const pronMatch = rest.match(/^(.*?)\s*\/([^/]+)\/\s*$/);
        if (pronMatch) {
          items.push({ word, translation: pronMatch[1].trim(), pronunciation: pronMatch[2].trim() });
        } else {
          items.push({ word, translation: rest });
        }
      }
      parserResults.push({ level: set.level, setTitle: set.title, text: text.slice(0, 200) + '...', parsed: { items, failed } });
    }

    const totalWords = allWords.length;
    const totalParsed = parserResults.reduce((s, r) => s + r.parsed.items.length, 0);
    const totalFailed = parserResults.reduce((s, r) => s + r.parsed.failed.length, 0);
    const parseRate = Math.round((totalParsed / totalWords) * 100);

    return {
      summary: { totalWords, totalParsed, totalFailed, parseRate },
      sets: parserResults.map(r => ({
        level: r.level,
        setTitle: r.setTitle,
        wordCount: r.parsed.items.length,
        failedCount: r.parsed.failed.length,
        parseRate: Math.round((r.parsed.items.length / (r.parsed.items.length + r.parsed.failed.length || 1)) * 100),
        failedSamples: r.parsed.failed.slice(0, 3),
      })),
    };
  });

  // ─── Gold Dataset: seed vocab sets mẫu vào database ─────────────────────────

  app.post('/sample-data/seed', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { levels, withExercises } = z.object({
      levels: z.array(z.enum(['A1', 'A2', 'B1', 'B2'])).default(['A1', 'A2', 'B1', 'B2']),
      withExercises: z.boolean().default(true),
    }).parse(req.body);

    const setsToSeed = LANG_GOLD_DATASET.filter(s => levels.includes(s.level as any));
    const results: Array<{
      setId: string; title: string; level: string; wordCount: number;
      exercises: { id: string; type: string; questionCount: number }[];
    }> = [];

    // Tạo folder cha cho mỗi level
    const folderMap: Record<string, string> = {};
    for (const level of levels) {
      const folder = await prisma.vocabSet.create({
        data: {
          title: `[Mẫu] Tiếng Anh ${level}`,
          description: `Bộ từ vựng mẫu trình độ ${level} — ${level === 'A1' ? 'Từ cơ bản lớp 1-2' : level === 'A2' ? 'Từ sơ cấp lớp 3-4' : level === 'B1' ? 'Từ trung cấp lớp 5-6' : 'Từ nâng cao B2'}`,
          language: 'en',
          targetLang: 'vi',
          level,
          isPublic: true,
          createdBy: sub,
        },
      });
      folderMap[level] = folder.id;
    }

    // Seed từng set
    for (const gset of setsToSeed) {
      const parentId = folderMap[gset.level];
      const vocabSet = await prisma.vocabSet.create({
        data: {
          title: gset.title,
          description: gset.description,
          language: 'en',
          targetLang: 'vi',
          level: gset.level,
          isPublic: true,
          createdBy: sub,
          parentId,
        },
      });

      // Bulk insert từ vựng
      await prisma.vocabItem.createMany({
        data: gset.words.map((w, i) => ({
          setId: vocabSet.id,
          word: w.word,
          translation: w.translation,
          pronunciation: w.pronunciation || undefined,
          example: w.example || undefined,
          exampleTrans: w.exampleTrans || undefined,
          synonyms: w.synonyms || [],
          hints: w.hints || [],
          order: i,
        })),
      });

      const exercises: { id: string; type: string; questionCount: number }[] = [];

      if (withExercises && gset.words.length >= 4) {
        const pool = gset.words.map((w, i) => ({
          id: `tmp-${i}`, word: w.word, translation: w.translation,
          pronunciation: w.pronunciation, example: w.example, exampleTrans: w.exampleTrans, notes: null,
        }));

        const TYPE_LABELS: Record<string, string> = {
          MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
          MATCHING: 'Ghép cặp', WORD_ORDER: 'Sắp xếp câu',
        };

        for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER'] as const) {
          const questionsOrErr = buildQuestions(pool, type, 20);
          if ('error' in questionsOrErr) continue;
          const ex = await prisma.langExercise.create({
            data: {
              title: `[Mẫu] ${gset.title.replace('[Mẫu] ', '')} — ${TYPE_LABELS[type]}`,
              description: `Bài tập ${TYPE_LABELS[type]} tự động từ bộ từ vựng mẫu ${gset.level}`,
              type,
              language: 'en',
              level: gset.level,
              isPublic: true,
              createdBy: sub,
              vocabSetId: vocabSet.id,
              questions: { create: questionsOrErr as any },
            },
            select: { id: true, type: true, _count: { select: { questions: true } } },
          });
          exercises.push({ id: ex.id, type: ex.type, questionCount: ex._count.questions });
        }
      }

      results.push({
        setId: vocabSet.id,
        title: vocabSet.title,
        level: gset.level,
        wordCount: gset.words.length,
        exercises,
      });
    }

    const totalWords = results.reduce((s, r) => s + r.wordCount, 0);
    const totalExercises = results.reduce((s, r) => s + r.exercises.length, 0);

    return reply.status(201).send({
      seeded: results.length,
      totalWords,
      totalExercises,
      folders: Object.entries(folderMap).map(([level, id]) => ({ level, id })),
      sets: results,
    });
  });

  // ─── RAG: Embed VocabItems vào vector store ───────────────────────────────────

  app.post('/rag/embed', { preHandler: requireInstructor }, async (req, reply) => {
    const { language, level, limit: lim } = z.object({
      language: z.string().optional(),
      level: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
    }).parse(req.body ?? {});

    const available = await isEmbedModelAvailable();
    if (!available) {
      return reply.status(503).send({
        ok: false,
        message: `Ollama embed model "${process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text'}" chưa sẵn sàng. Chạy: ollama pull nomic-embed-text`,
      });
    }

    const where: any = { isPublic: true };
    if (language) where.language = language;
    if (level) where.level = level;

    const sets = await prisma.vocabSet.findMany({
      where,
      include: { items: true },
      take: lim,
      orderBy: { createdAt: 'desc' },
    });

    let embedded = 0, failed = 0;
    for (const set of sets) {
      for (const item of set.items) {
        const text = [
          item.word,
          item.translation,
          item.pronunciation ?? '',
          item.example ?? '',
          item.exampleTrans ?? '',
          item.synonyms.join(', '),
          item.hints.join(' '),
          item.notes ?? '',
        ].filter(Boolean).join('. ');

        const vector = await embedText(text);
        if (!vector) { failed++; continue; }

        await upsertEntry({
          id: item.id,
          text,
          vector,
          metadata: {
            topicId: set.id,
            topicTitle: set.title,
            conceptName: item.word,
            grade: 0,
            subject: `language:${set.language}`,
          },
        }, 'language');
        embedded++;
      }
    }

    return reply.send({ ok: true, embedded, failed, sets: sets.length });
  });

  app.get('/rag/stats', { preHandler: requireInstructor }, async (_req, reply) => {
    const stats = await getIndexStats('language');
    return reply.send(stats);
  });

  // ─── Gold Dataset: xóa tất cả data mẫu (cleanup) ─────────────────────────────

  app.delete('/sample-data/cleanup', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const sampleSets = await prisma.vocabSet.findMany({
      where: {
        createdBy: sub,
        title: { startsWith: '[Mẫu]' },
      },
      select: { id: true, title: true },
    });

    if (sampleSets.length === 0) return reply.send({ deleted: 0, message: 'Không có dữ liệu mẫu nào.' });

    await prisma.vocabSet.deleteMany({
      where: { id: { in: sampleSets.map(s => s.id) } },
    });

    return reply.send({ deleted: sampleSets.length, sets: sampleSets.map(s => s.title) });
  });

  // ─── VOCABULARY HUNTER GAME ───────────────────────────────────────────────

  app.get('/game/vocab-hunter', { preHandler: requireAuth }, async (req) => {
    const { lang, count = '10', setId } = req.query as { lang?: string; count?: string; setId?: string };
    const take = Math.min(parseInt(count, 10), 20);

    const where: any = { isPublic: true };
    if (lang) where.language = lang;
    if (setId) where.setId = setId;

    const items = await prisma.vocabItem.findMany({
      where,
      take: take * 4,
      orderBy: { createdAt: 'desc' },
      select: { id: true, word: true, translation: true, imageUrl: true, example: true },
    });

    if (items.length < 4) return { questions: [] };

    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, take);
    const questions = shuffled.map((item, i) => {
      const others = items.filter(x => x.id !== item.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...others.map(o => o.word), item.word].sort(() => Math.random() - 0.5);
      return {
        id: `vq${i}`,
        itemId: item.id,
        translation: item.translation,
        imageUrl: item.imageUrl ?? null,
        example: item.example ?? null,
        answer: item.word,
        options,
      };
    });

    return { questions, timeLimit: 120 };
  });

  app.post('/game/vocab-hunter/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      answers: z.record(z.string()),
      questions: z.array(z.object({ id: z.string(), answer: z.string() })),
      streak: z.number().int().min(0).default(0),
    }).parse(req.body);

    let correct = 0;
    for (const q of body.questions) {
      if ((body.answers[q.id] ?? '').toLowerCase().trim() === q.answer.toLowerCase().trim()) correct++;
    }

    const total = body.questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    let xpEarned = correct * 10;
    if (body.streak >= 10) xpEarned += 50;
    else if (body.streak >= 5) xpEarned += 20;
    if (score === 100) xpEarned += 100;

    await addXP(sub, xpEarned);
    await prisma.langUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return { correct, total, score, xpEarned };
  });

  // ─── PRONUNCIATION CHALLENGE GAME ────────────────────────────────────────

  const PRON_SENTENCES: Record<string, string[]> = {
    en: [
      'How are you today?',
      'The weather is beautiful outside.',
      'I would like a cup of coffee, please.',
      'Can you help me find the nearest station?',
      'She sells seashells by the seashore.',
      'The quick brown fox jumps over the lazy dog.',
      'Practice makes perfect.',
      'I enjoy learning English every day.',
      'What time does the next train leave?',
      'Thank you very much for your help.',
    ],
    fr: [
      'Bonjour, comment allez-vous?',
      'Je voudrais un café, s\'il vous plaît.',
      'Où est la bibliothèque?',
      'Merci beaucoup pour votre aide.',
      'Parlez-vous français?',
    ],
    ja: [
      'おはようございます',
      'ありがとうございます',
      'すみません、駅はどこですか',
      'よろしくお願いします',
    ],
    ko: [
      '안녕하세요',
      '감사합니다',
      '도와주세요',
      '잘 부탁드립니다',
    ],
  };

  const PRON_LANG_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', ja: 'ja-JP', ko: 'ko-KR' };

  app.get('/game/pronunciation-challenge', { preHandler: requireAuth }, async (req) => {
    const { lang = 'en', count = '8' } = req.query as { lang?: string; count?: string };
    const pool = PRON_SENTENCES[lang] ?? PRON_SENTENCES.en;
    const take = Math.min(parseInt(count, 10), pool.length);
    const sentences = pool.sort(() => Math.random() - 0.5).slice(0, take);
    const ttsLang = PRON_LANG_MAP[lang] ?? 'en-US';

    return {
      sentences: sentences.map((s, i) => ({ id: `pc${i}`, text: s })),
      lang,
      ttsLang,
    };
  });

  app.post('/game/pronunciation-challenge/submit', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      scores: z.array(z.object({ id: z.string(), score: z.number().min(0).max(100) })),
      totalSentences: z.number().int().min(1),
    }).parse(req.body);

    const avgScore = body.scores.length > 0
      ? Math.round(body.scores.reduce((s, x) => s + x.score, 0) / body.scores.length)
      : 0;

    let xpEarned = Math.round(avgScore * 0.5) + body.scores.length * 5;
    if (avgScore >= 90) xpEarned += 50;
    else if (avgScore >= 70) xpEarned += 20;

    await addXP(sub, xpEarned);
    await prisma.langUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return reply.send({ avgScore, xpEarned, practiced: body.scores.length });
  });

  // ─── AI CONVERSATION GAME ────────────────────────────────────────────────

  const ROLES: Record<string, { vi: string; systemPrefix: string }> = {
    teacher:    { vi: 'Giáo viên',       systemPrefix: 'You are a friendly language teacher helping a student practice.' },
    shopkeeper: { vi: 'Người bán hàng',  systemPrefix: 'You are a shopkeeper at a market. Customer wants to buy things.' },
    tourist:    { vi: 'Khách du lịch',   systemPrefix: 'You are a tourist asking for directions and local tips.' },
    friend:     { vi: 'Bạn bè',          systemPrefix: 'You are a friendly peer having a casual conversation.' },
  };

  const LANG_FULL: Record<string, string> = {
    en: 'English', fr: 'French', ja: 'Japanese', ko: 'Korean',
    vi: 'Vietnamese', de: 'German', zh: 'Chinese', es: 'Spanish',
  };

  app.post('/game/ai-conversation/chat', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      role: z.enum(['teacher', 'shopkeeper', 'tourist', 'friend']).default('friend'),
      language: z.enum(['en', 'fr', 'ja', 'ko', 'vi', 'de', 'zh', 'es']).default('en'),
      messages: z.array(z.object({
        role: z.enum(['user', 'ai']),
        content: z.string().max(500),
      })).min(1).max(30),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { role, language, messages } = body.data;
    const roleInfo = ROLES[role] ?? ROLES.friend;
    const langName = LANG_FULL[language] ?? 'English';

    const systemPrompt = `${roleInfo.systemPrefix}
- Speak ONLY in ${langName}.
- Keep responses short (1-3 sentences).
- Stay in character at all times.
- If the student makes a grammar error, gently model the correct form in your reply.
- DO NOT break character or add meta-commentary.`;

    const chatMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    try {
      const reply_text = await aiChatOnce([
        { role: 'system', content: systemPrompt },
        ...chatMessages,
      ], { maxTokens: 200 });
      return reply.send({ reply: reply_text.trim() });
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  app.post('/game/ai-conversation/score', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      language: z.string().default('en'),
      role: z.string().default('friend'),
      messages: z.array(z.object({ role: z.enum(['user', 'ai']), content: z.string() })).min(2),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { language, role, messages } = body.data;
    const userTurns = messages.filter(m => m.role === 'user').length;
    const convoText = messages.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n');

    const prompt = `Evaluate this ${LANG_FULL[language] ?? language} conversation (role: ${role}) and return JSON:
{"fluency":7,"accuracy":7,"naturalness":7,"overall":"...(1 sentence)","encouragement":"..."}

Conversation:
${convoText.slice(0, 1200)}`;

    let scoreData = { fluency: 7, accuracy: 7, naturalness: 7, overall: 'Good effort!', encouragement: 'Keep practicing!' };
    try {
      const raw = await aiChatOnce([{ role: 'user', content: prompt }], { maxTokens: 200 });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) scoreData = { ...scoreData, ...JSON.parse(m[0]) };
    } catch { /* default */ }

    const avgScore = Math.round((scoreData.fluency + scoreData.accuracy + scoreData.naturalness) / 3 * 10);
    let xpEarned = userTurns * 5 + Math.round(avgScore * 0.3);
    if (avgScore >= 80) xpEarned += 30;

    await addXP(sub, xpEarned);
    await prisma.langUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return reply.send({ ...scoreData, avgScore, xpEarned, turns: userTurns });
  });

  // ─── SENTENCE BUILDER GAME ────────────────────────────────────────────────
  // ch.md: Sentence Builder — sắp xếp từ thành câu đúng

  app.get('/game/sentence-builder', { preHandler: requireAuth }, async (req) => {
    const { lang, count = '8', setId } = req.query as { lang?: string; count?: string; setId?: string };
    const take = Math.min(parseInt(count, 10), 15);

    const where: any = { isPublic: true };
    if (lang) where.language = lang;
    if (setId) where.setId = setId;

    const items = await prisma.vocabItem.findMany({
      where: { ...where, example: { not: null } },
      take: take * 3,
      orderBy: { createdAt: 'desc' },
      select: { id: true, word: true, translation: true, example: true },
    });

    const usable = items.filter(i => {
      const ws = (i.example ?? '').split(' ').filter(w => w.trim().length > 0);
      return ws.length >= 3;
    }).slice(0, take);

    const questions = usable.map((item, i) => {
      const words = (item.example ?? '').split(' ').filter(w => w.trim().length > 0);
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      return {
        id: `sb${i}`,
        hint: item.translation ?? item.word,
        keyword: item.word,
        words: shuffled,
        answer: words,
      };
    });

    return { questions, timeLimit: 180 };
  });

  app.post('/game/sentence-builder/submit', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      answers: z.record(z.array(z.string())),
      questions: z.array(z.object({ id: z.string(), answer: z.array(z.string()) })),
    }).parse(req.body);

    let correct = 0;
    const results = body.questions.map(q => {
      const given = (body.answers[q.id] ?? []).join(' ').toLowerCase().trim();
      const expected = q.answer.join(' ').toLowerCase().trim();
      const isCorrect = given === expected;
      if (isCorrect) correct++;
      return { id: q.id, correct: isCorrect, expected: q.answer.join(' '), given: (body.answers[q.id] ?? []).join(' ') };
    });

    const total = body.questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    let xpEarned = correct * 12;
    if (score === 100) xpEarned += 50;
    if (score >= 80) xpEarned += 20;

    await addXP(sub, xpEarned);
    await prisma.langUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return reply.send({ results, correct, total, score, xpEarned });
  });
}
