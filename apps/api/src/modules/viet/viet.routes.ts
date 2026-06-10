import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { extractText, extractMarkdown, generateVietQuestionsWithAI } from '../../services/file-import';
import {
  processVietDocument, detectVietCurriculum, vietClean, vietUnicodeNormalize,
  generateVietVariations, computeVietProfileUpdate,
  splitVietLessons, isVietContentRich, vietParserScore,
  scoreKnowledgeItems,
  type VietProcessOpts,
} from '../../services/viet-pipeline';
import { VIET_GOLD_DATASET } from '../../data/viet-gold-dataset';
import {
  classifyItemErrors, buildBatchSummary,
  type ErrorType,
} from '../../services/error-classifier';
import { minioClient, getSignedUrl, deleteObject } from '../../services/minio';
import { embedText, upsertEntry, getIndexStats, isEmbedModelAvailable } from '../../services/rag';
import { env } from '../../config/env';
import crypto from 'crypto';
import { serveTTS } from '../../services/tts';
import { getOrSet, cacheDelPattern } from '../../services/cache';
import { aiChatOnce } from '../../services/ai-provider';

// ─── SM-2 Spaced Repetition ───────────────────────────────────────────────────
function sm2(quality: number, repetitions: number, interval: number, easeFactor: number) {
  const q = Math.max(0, Math.min(5, quality));
  let newRepetitions = repetitions, newInterval = interval;
  let newEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;
  if (q < 3) { newRepetitions = 0; newInterval = 1; }
  else {
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
  const stats = await prisma.vietUserStats.upsert({
    where: { userId },
    create: { userId, xp: 0, lastStudied: new Date() },
    update: {},
  });
  const today = new Date().toDateString();
  const lastDay = stats.lastStudied ? new Date(stats.lastStudied).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let newStreak = stats.streak;
  if (lastDay !== today) newStreak = lastDay === yesterday ? stats.streak + 1 : 1;
  const newXp = stats.xp + xp;
  return prisma.vietUserStats.update({
    where: { userId },
    data: {
      xp: newXp, level: Math.floor(newXp / 500) + 1,
      streak: newStreak, longestStreak: Math.max(stats.longestStreak, newStreak),
      lastStudied: new Date(),
    },
  });
}

// ─── Auto-generate questions from VietSet items ───────────────────────────────
const shuffleArr = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type VietItemLike = { id: string; word: string; meaning: string; example?: string | null; note?: string | null };

function buildVietQuestions(pool: VietItemLike[], type: string, count: number): any[] | { error: string } {
  if (pool.length < 2) return { error: 'Cần ít nhất 2 mục để tạo câu hỏi' };
  const items = shuffleArr(pool).slice(0, Math.min(pool.length, count));

  return items.map((item, i) => {
    if (type === 'MULTIPLE_CHOICE') {
      const others = pool.filter((x) => x.id !== item.id);
      const distractors = shuffleArr(others).slice(0, 3).map((x) => x.meaning);
      const options = shuffleArr([item.meaning, ...distractors]);
      return { content: `"${item.word}" có nghĩa là gì?`, options, answer: item.meaning, explanation: item.note || undefined, order: i, points: 1 };
    }
    if (type === 'SPELLING') {
      // Show meaning, user must type the word correctly
      return { content: `Gõ đúng từ/thành ngữ có nghĩa: "${item.meaning}"`, answer: item.word, explanation: item.example || undefined, order: i, points: 1 };
    }
    if (type === 'FILL_BLANK') {
      if (item.example) {
        const words = item.example.split(' ');
        const positions = words.map((w, idx) => w.toLowerCase().includes(item.word.toLowerCase().split(' ')[0]) ? idx : -1).filter((p) => p >= 0);
        if (positions.length > 0) {
          const pos = positions[0];
          const filled = [...words]; filled[pos] = '______';
          return { content: `Điền từ còn thiếu:\n${filled.join(' ')}`, answer: words[pos], explanation: `Từ cần điền: ${item.word}`, order: i, points: 1 };
        }
      }
      return { content: `Điền từ thích hợp: ${item.meaning.slice(0, 80)}`, answer: item.word, explanation: item.example || undefined, order: i, points: 1 };
    }
    if (type === 'MATCHING') {
      return { content: item.word, answer: item.meaning, order: i, points: 1 };
    }
    if (type === 'WORD_ORDER') {
      const sentence = item.example || item.meaning;
      const words = sentence.split(' ').filter((w) => w.trim());
      if (words.length < 3) return { content: `Sắp xếp từ để tạo câu có nghĩa về: "${item.word}"`, answer: sentence, options: shuffleArr(words), order: i, points: 2 };
      const shuffled = shuffleArr(words);
      return { content: `Sắp xếp thành câu đúng:`, options: shuffled, answer: words, order: i, points: 2 };
    }
    // READING — không auto-generate, cần passage
    return { content: `Giải thích ý nghĩa và đặt câu với: "${item.word}"`, answer: item.meaning, explanation: item.example || undefined, order: i, points: 2 };
  });
}

const CATEGORY_ENUM = ['CHINH_TA', 'TU_VUNG', 'NGU_PHAP', 'THANH_NGU', 'TUC_NGU', 'VAN_HOC', 'TAP_DOC', 'CA_DAO'] as const;
const EXERCISE_TYPE_ENUM = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER', 'READING'] as const;
const TYPE_IMPORT_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
  SPELLING: 'Chính tả', MATCHING: 'Ghép đôi', WORD_ORDER: 'Sắp xếp câu',
};

export async function vietRoutes(app: FastifyInstance) {
  // ─── TTS PROXY ────────────────────────────────────────────────────────────
  app.get('/tts', async (req, reply) => {
    const { text, lang, slow } = req.query as { text?: string; lang?: string; slow?: string };
    if (!text) return reply.status(400).send({ error: 'text required' });
    const safeLang = /^[a-z]{2}(-[A-Z]{2,4})?$/i.test(lang || '') ? lang! : 'vi-VN';
    const result = await serveTTS(text, safeLang, slow === '1');
    if (!result) return reply.status(503).send({ error: 'TTS service unavailable' });
    reply.header('Content-Type', result.contentType);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.send(result.audio);
  });

  // ─── STATS & LEADERBOARD ──────────────────────────────────────────────────

  app.get('/stats', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const stats = await prisma.vietUserStats.findUnique({ where: { userId: sub } });
    const reviewsDue = await prisma.vietItemProgress.count({
      where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
    });
    return { ...(stats || { xp: 0, level: 1, streak: 0, longestStreak: 0, wordsLearned: 0, exercisesDone: 0 }), reviewsDue };
  });

  app.get('/leaderboard', { preHandler: requireAuth }, async () => {
    return getOrSet('viet:leaderboard', 300, () =>
      prisma.vietUserStats.findMany({
        orderBy: { xp: 'desc' }, take: 20,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      })
    );
  });

  // ─── VIET SETS ────────────────────────────────────────────────────────────

  app.get('/sets', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { category?: string; grade?: string; courseId?: string; search?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.category) where.category = q.category;
    if (q.grade) where.grade = parseInt(q.grade);
    if (q.courseId) where.courseId = q.courseId;
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }
    const isMine = q.mine === 'true';
    // Skip cache for search queries (too many variants)
    if (q.search) {
      return prisma.vietSet.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      });
    }
    const cacheKey = isMine
      ? `viet:sets:mine:${sub}`
      : `viet:sets:pub:${q.category ?? ''}:${q.grade ?? ''}:${q.courseId ?? ''}`;
    return getOrSet(cacheKey, 60, () =>
      prisma.vietSet.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      })
    );
  });

  app.get('/sets/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vietSet.findUniqueOrThrow({
      where: { id },
      include: { creator: { select: { id: true, name: true } }, items: { orderBy: { order: 'asc' } }, _count: { select: { items: true, exercises: true } } },
    });
    const progresses = await prisma.vietItemProgress.findMany({ where: { userId: sub, itemId: { in: set.items.map((i) => i.id) } } });
    const progressMap = Object.fromEntries(progresses.map((p) => [p.itemId, p]));
    return { ...set, progressMap };
  });

  app.post('/sets', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      title: z.string().min(2).max(200),
      description: z.string().optional().nullable(),
      category: z.enum(CATEGORY_ENUM).default('TU_VUNG'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('co_ban'),
      coverUrl: z.string().optional().nullable(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional().nullable(),
    }).parse(req.body);
    const set = await prisma.vietSet.create({ data: { ...body, createdBy: sub } });
    await cacheDelPattern('viet:sets:*');
    return reply.status(201).send(set);
  });

  app.patch('/sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    const body = z.object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().nullable().optional(),
      category: z.enum(CATEGORY_ENUM).optional(),
      grade: z.number().min(1).max(12).optional(),
      level: z.string().optional(),
      coverUrl: z.string().nullable().optional(),
      isPublic: z.boolean().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    const updated = await prisma.vietSet.update({ where: { id }, data: body });
    await cacheDelPattern('viet:sets:*');
    return updated;
  });

  app.delete('/sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vietSet.delete({ where: { id } });
    await cacheDelPattern('viet:sets:*');
    return { message: 'Đã xóa bộ bài' };
  });

  // ─── VIET ITEMS ───────────────────────────────────────────────────────────

  app.post('/sets/:id/items', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const body = z.object({
      word: z.string().min(1).max(300),
      meaning: z.string().min(1),
      example: z.string().optional(),
      note: z.string().optional(),
      imageUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      order: z.number().default(0),
    }).parse(req.body);
    const item = await prisma.vietItem.create({ data: { ...body, setId } });
    return reply.status(201).send(item);
  });

  app.post('/sets/:id/items/bulk', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const body = z.object({
      items: z.array(z.object({
        word: z.string().min(1).max(300),
        meaning: z.string().min(1),
        example: z.string().optional(),
        note: z.string().optional(),
        imageUrl: z.string().optional(),
        order: z.number().default(0),
      })).min(1),
    }).parse(req.body);
    const created = await prisma.vietItem.createMany({ data: body.items.map((item, i) => ({ ...item, setId, order: item.order ?? i })) });
    return reply.status(201).send({ created: created.count });
  });

  app.patch('/items/:itemId', { preHandler: requireInstructor }, async (req) => {
    const { itemId } = req.params as { itemId: string };
    const body = z.object({
      word: z.string().min(1).optional(),
      meaning: z.string().optional(),
      example: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      audioUrl: z.string().nullable().optional(),
      order: z.number().optional(),
    }).parse(req.body);
    return prisma.vietItem.update({ where: { id: itemId }, data: body });
  });

  app.delete('/items/:itemId', { preHandler: requireInstructor }, async (req) => {
    const { itemId } = req.params as { itemId: string };
    await prisma.vietItem.delete({ where: { id: itemId } });
    return { message: 'Đã xóa mục' };
  });

  // ─── SRS REVIEW ───────────────────────────────────────────────────────────

  app.get('/sets/:id/review', { preHandler: requireAuth }, async (req) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id: setId }, include: { items: { orderBy: { order: 'asc' } } } });
    const progresses = await prisma.vietItemProgress.findMany({ where: { userId: sub, itemId: { in: set.items.map((i) => i.id) } } });
    const progressMap = Object.fromEntries(progresses.map((p) => [p.itemId, p]));
    return set.items.map((item) => ({ ...item, progress: progressMap[item.id] || null }));
  });

  app.get('/review/due', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.vietItemProgress.findMany({
      where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
      include: { item: { include: { set: { select: { title: true, category: true } } } } },
      orderBy: { nextReview: 'asc' },
      take: 50,
    }).then((items) => items.map((p) => ({ ...p.item, progress: p })));
  });

  app.post('/sets/:id/study-session', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { results } = z.object({
      results: z.array(z.object({ itemId: z.string(), quality: z.number().min(0).max(5) })),
    }).parse(req.body);

    let xpEarned = 0;
    for (const { itemId, quality } of results) {
      const existing = await prisma.vietItemProgress.findUnique({ where: { userId_itemId: { userId: sub, itemId } } });
      const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
      const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);
      await prisma.vietItemProgress.upsert({
        where: { userId_itemId: { userId: sub, itemId } },
        create: { userId: sub, itemId, ...next },
        update: next,
      });
      if (next.isLearned && !existing?.isLearned) {
        await prisma.vietUserStats.upsert({
          where: { userId: sub },
          create: { userId: sub, wordsLearned: 1, lastStudied: new Date() },
          update: { wordsLearned: { increment: 1 } },
        });
      }
      xpEarned += quality >= 3 ? 5 : 2;
    }
    await addXP(sub, xpEarned);
    return { xpEarned, reviewed: results.length };
  });

  app.post('/review/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { results } = z.object({
      results: z.array(z.object({ itemId: z.string(), quality: z.number().min(0).max(5) })),
    }).parse(req.body);

    let xpEarned = 0;
    for (const { itemId, quality } of results) {
      const existing = await prisma.vietItemProgress.findUnique({ where: { userId_itemId: { userId: sub, itemId } } });
      const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
      const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);
      await prisma.vietItemProgress.upsert({
        where: { userId_itemId: { userId: sub, itemId } },
        create: { userId: sub, itemId, ...next },
        update: next,
      });
      if (next.isLearned && !existing?.isLearned) {
        await prisma.vietUserStats.upsert({
          where: { userId: sub },
          create: { userId: sub, wordsLearned: 1, lastStudied: new Date() },
          update: { wordsLearned: { increment: 1 } },
        });
      }
      xpEarned += quality >= 3 ? 5 : 2;
    }
    await addXP(sub, xpEarned);
    return { xpEarned, reviewed: results.length };
  });

  // ─── EXERCISES ────────────────────────────────────────────────────────────

  app.get('/exercises', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { category?: string; type?: string; grade?: string; courseId?: string; setId?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.category) where.category = q.category;
    if (q.type) where.type = q.type;
    if (q.grade) where.grade = parseInt(q.grade);
    if (q.courseId) where.courseId = q.courseId;
    if (q.setId) where.setId = q.setId;
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }
    const isMine = q.mine === 'true';
    const cacheKey = isMine
      ? `viet:exercises:mine:${sub}`
      : `viet:exercises:pub:${q.category ?? ''}:${q.type ?? ''}:${q.grade ?? ''}:${q.courseId ?? ''}:${q.setId ?? ''}`;
    return getOrSet(cacheKey, 60, () =>
      prisma.vietExercise.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true } }, _count: { select: { questions: true, attempts: true } } },
      })
    );
  });

  app.get('/exercises/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.vietExercise.findUniqueOrThrow({
      where: { id },
      include: { creator: { select: { id: true, name: true } }, questions: { orderBy: { order: 'asc' } } },
    });
  });

  app.post('/exercises', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      type: z.enum(EXERCISE_TYPE_ENUM),
      category: z.enum(CATEGORY_ENUM).default('TU_VUNG'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('co_ban'),
      passage: z.string().optional(),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      setId: z.string().optional(),
      courseId: z.string().optional(),
      questions: z.array(z.object({
        content: z.string().min(1),
        imageUrl: z.string().optional(),
        options: z.any().optional(),
        answer: z.any(),
        explanation: z.string().optional(),
        order: z.number().default(0),
        points: z.number().default(1),
      })).default([]),
    }).parse(req.body);
    const { questions, ...exerciseData } = body;
    const exercise = await prisma.vietExercise.create({
      data: { ...exerciseData, createdBy: sub, questions: { create: questions as any } },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    await cacheDelPattern('viet:exercises:*');
    return reply.status(201).send(exercise);
  });

  // Auto-generate from set
  app.post('/exercises/generate', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      setId: z.string(),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'] as const),
      questionCount: z.number().min(2).max(50).default(10),
      title: z.string().min(2),
      description: z.string().optional(),
      level: z.string().default('co_ban'),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);

    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id: body.setId }, include: { items: true } });

    // Thử AI trước, fallback sang rule-based nếu thất bại
    let questions: any[] | { error: string };
    const aiQuestions = await generateVietQuestionsWithAI(set.items as any, body.type, body.questionCount);
    if (aiQuestions && aiQuestions.length > 0) {
      questions = aiQuestions;
    } else {
      questions = buildVietQuestions(set.items, body.type, body.questionCount);
      if ('error' in (questions as any)) throw { statusCode: 400, message: (questions as any).error };
    }

    const exercise = await prisma.vietExercise.create({
      data: {
        title: body.title, description: body.description, type: body.type as any,
        category: set.category, grade: set.grade, level: body.level,
        timeLimit: body.timeLimit, isPublic: body.isPublic,
        setId: body.setId, courseId: body.courseId, createdBy: sub,
        questions: { create: questions as any },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return reply.status(201).send(exercise);
  });

  // Auto-generate all types at once
  app.post('/sets/:id/generate-all', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const body = z.object({
      questionCount: z.number().min(2).max(20).default(10),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);

    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id: setId }, include: { items: true } });
    if (set.items.length < 2) throw { statusCode: 400, message: 'Cần ít nhất 2 mục để tạo bài tập' };

    const types: Array<'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'SPELLING' | 'MATCHING' | 'WORD_ORDER'> = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'];
    const TYPE_LABEL: Record<string, string> = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ', SPELLING: 'Chính tả', MATCHING: 'Ghép đôi', WORD_ORDER: 'Sắp xếp câu' };
    const generated: any[] = [];
    const errors: any[] = [];

    for (const type of types) {
      // Thử AI trước, fallback sang rule-based
      const aiQ = await generateVietQuestionsWithAI(set.items as any, type, body.questionCount);
      const questions = (aiQ && aiQ.length > 0) ? aiQ : buildVietQuestions(set.items, type, body.questionCount);
      if ('error' in (questions as any)) { errors.push({ type, error: (questions as any).error }); continue; }
      try {
        const ex = await prisma.vietExercise.create({
          data: {
            title: `${set.title} — ${TYPE_LABEL[type]}`,
            type: type as any, category: set.category, grade: set.grade, level: set.level,
            isPublic: body.isPublic, setId, courseId: body.courseId, createdBy: sub,
            questions: { create: questions as any },
          },
          select: { id: true, title: true, type: true, _count: { select: { questions: true } } },
        });
        generated.push(ex);
      } catch (e: any) { errors.push({ type, error: e.message }); }
    }
    return reply.status(201).send({ generated, errors });
  });

  app.patch('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      passage: z.string().nullable().optional(),
      timeLimit: z.number().nullable().optional(),
      isPublic: z.boolean().optional(),
      level: z.string().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    const updated = await prisma.vietExercise.update({ where: { id }, data: body });
    await cacheDelPattern('viet:exercises:*');
    return updated;
  });

  app.delete('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const ex = await prisma.vietExercise.findUniqueOrThrow({ where: { id } });
    if (ex.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vietExercise.delete({ where: { id } });
    await cacheDelPattern('viet:exercises:*');
    return { message: 'Đã xóa bài tập' };
  });

  // ─── ATTEMPT ──────────────────────────────────────────────────────────────

  app.post('/exercises/:id/attempt', { preHandler: requireAuth }, async (req) => {
    const { id: exerciseId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { answers, timeTaken } = z.object({
      answers: z.record(z.any()),
      timeTaken: z.number().optional(),
    }).parse(req.body);

    const exercise = await prisma.vietExercise.findUniqueOrThrow({ where: { id: exerciseId }, include: { questions: true } });

    let totalPoints = 0, earnedPoints = 0;
    const results: Record<string, { correct: boolean; correctAnswer: any }> = {};

    for (const q of exercise.questions) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      let correct = false;

      if (exercise.type === 'MULTIPLE_CHOICE' || exercise.type === 'SPELLING' || exercise.type === 'FILL_BLANK') {
        const expected = String(q.answer).toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
        const given = String(userAnswer ?? '').toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
        correct = given === expected;
      } else if (exercise.type === 'MATCHING') {
        const ua = (userAnswer ?? {}) as Record<string, string>;
        const ea = q.answer as Record<string, string>;
        if (ea && typeof ea === 'object' && !Array.isArray(ea)) {
          const eaKeys = Object.keys(ea);
          correct = eaKeys.length === Object.keys(ua).length && eaKeys.every((k) => ua[k] === ea[k]);
        }
      } else if (exercise.type === 'WORD_ORDER') {
        // Handle answer stored as array, stringified JSON array, or space-delimited string
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
        correct = givenArr.length === expectedArr.length &&
          givenArr.every((w, i) => w === expectedArr[i]);
      } else if (exercise.type === 'READING') {
        const expected = String(q.answer).toLowerCase().trim();
        correct = String(userAnswer ?? '').toLowerCase().trim() === expected;
      }

      if (correct) earnedPoints += q.points;
      results[q.id] = { correct, correctAnswer: q.answer };
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const xpEarned = Math.round(score / 10);

    const attempt = await prisma.vietAttempt.create({ data: { userId: sub, exerciseId, answers, score, timeTaken, xpEarned } });
    await prisma.vietUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });
    await addXP(sub, xpEarned);
    return { attempt, score, results, xpEarned };
  });

  app.get('/exercises/:id/attempts', { preHandler: requireAuth }, async (req) => {
    const { id: exerciseId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    return prisma.vietAttempt.findMany({ where: { exerciseId, userId: sub }, orderBy: { completedAt: 'desc' }, take: 10 });
  });

  // ─── COURSE CONTENT ───────────────────────────────────────────────────────

  app.get('/course/:courseId/content', { preHandler: requireAuth }, async (req) => {
    const { courseId } = req.params as { courseId: string };
    const [sets, exercises] = await Promise.all([
      prisma.vietSet.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { items: true } } } }),
      prisma.vietExercise.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { questions: true } } } }),
    ]);
    return { sets, exercises };
  });

  app.get('/mine', { preHandler: requireInstructor }, async (req) => {
    const { sub } = req.user as { sub: string };
    const [sets, exercises] = await Promise.all([
      prisma.vietSet.findMany({ where: { createdBy: sub }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, category: true, grade: true, courseId: true, _count: { select: { items: true } } } }),
      prisma.vietExercise.findMany({ where: { createdBy: sub }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, type: true, category: true, courseId: true, _count: { select: { questions: true } } } }),
    ]);
    return { sets, exercises };
  });

  // ─── ADMIN ALL ────────────────────────────────────────────────────────────

  app.get('/all', { preHandler: requireAuth }, async () => {
    const [sets, exercises, userStats] = await Promise.all([
      prisma.vietSet.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } }, _count: { select: { items: true, exercises: true } } },
      }),
      prisma.vietExercise.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } }, _count: { select: { questions: true, attempts: true } } },
      }),
      prisma.vietUserStats.aggregate({ _count: { userId: true }, _sum: { exercisesDone: true, wordsLearned: true } }),
    ]);
    return { sets, exercises, userStats };
  });

  // ─── CURRICULUM FILE IMPORT ───────────────────────────────────────────────

  app.post('/import', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file();
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const content = (await data.toBuffer()).toString('utf-8');
    const filename = data.filename.toLowerCase();

    let curriculum: any[];

    if (filename.endsWith('.csv') || data.mimetype === 'text/csv') {
      // CSV: rows are word,meaning,example,note — create single set from query params
      const q = req.query as { title?: string; category?: string; grade?: string; level?: string };
      const title = q.title || 'Bộ nhập từ CSV';
      const category = (q.category || 'TU_VUNG') as any;
      const grade = parseInt(q.grade || '1');
      const level = q.level || 'co_ban';

      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      const header = lines[0].toLowerCase();
      const startIdx = header.includes('word') || header.includes('từ') ? 1 : 0;

      const items = lines.slice(startIdx).map((line, i) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return { word: cols[0] || '', meaning: cols[1] || '', example: cols[2] || undefined, note: cols[3] || undefined, order: i };
      }).filter((it) => it.word && it.meaning);

      curriculum = [{ title, category, grade, level, generateExercises: true, items }];
    } else {
      // JSON
      try {
        const parsed = JSON.parse(content);
        curriculum = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        throw { statusCode: 400, message: 'File phải có định dạng JSON hoặc CSV hợp lệ' };
      }
    }

    const entrySchema = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      category: z.enum(CATEGORY_ENUM).default('TU_VUNG'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('co_ban'),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
      generateExercises: z.boolean().default(false),
      items: z.array(z.object({
        word: z.string().min(1),
        meaning: z.string().min(1),
        example: z.string().optional(),
        note: z.string().optional(),
        order: z.number().default(0),
      })).default([]),
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { items, generateExercises, ...setData } = entrySchema.parse(entry);
        const set = await prisma.vietSet.create({
          data: { ...setData, createdBy: sub, items: { create: items.map((it, i) => ({ ...it, order: it.order ?? i })) } },
          include: { items: true, _count: { select: { items: true } } },
        });

        let exercisesGenerated = 0;
        if (generateExercises && set.items.length >= 2) {
          const genTypes: Array<'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'SPELLING' | 'MATCHING' | 'WORD_ORDER'> = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'];
          for (const type of genTypes) {
            const questions = buildVietQuestions(set.items, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.vietExercise.create({
                data: {
                  title: `${set.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, category: set.category, grade: set.grade,
                  level: set.level, isPublic: set.isPublic,
                  setId: set.id, courseId: set.courseId ?? undefined, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }

        results.push({ setId: set.id, title: set.title, itemsCreated: set._count.items, exercisesGenerated });
      } catch (e: any) {
        errors.push({ entry: entry?.title || '(không rõ)', error: e.message });
      }
    }

    return reply.status(201).send({ imported: results.length, errors, results });
  });

  // ─── Extract text only (preview before AI) ───────────────────────────────
  app.post('/extract-preview', { preHandler: requireInstructor }, async (req, reply) => {
    const data = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } });
    if (!data) throw { statusCode: 400, message: 'Không có file' };
    const buffer = await data.toBuffer();
    let text: string;
    try { text = await extractMarkdown(buffer, data.mimetype, data.filename); }
    catch (e: any) { throw { statusCode: 400, message: `Không đọc được file: ${e.message}` }; }
    if (!text?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };
    const normalized = vietUnicodeNormalize(vietClean(text));
    const curriculum = detectVietCurriculum(normalized);
    return reply.send({ text: normalized.trim(), filename: data.filename, curriculum });
  });

  // ─── Smart Import (PDF / DOCX / XLSX / PPTX → AI structured) ─────────────
  app.post('/import-smart', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } });
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const q = req.query as { grade?: string; category?: string; generateExercises?: string };
    const buffer = await data.toBuffer();
    let rawText: string;
    try { rawText = await extractMarkdown(buffer, data.mimetype, data.filename); }
    catch (e: any) { throw { statusCode: 400, message: `Không đọc được file: ${e.message}` }; }
    if (!rawText?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };

    // Curriculum Detector
    const normalizedText = vietUnicodeNormalize(vietClean(rawText));
    const detectedCurriculum = detectVietCurriculum(normalizedText);
    const pipelineOpts: VietProcessOpts = {
      grade: q.grade ? parseInt(q.grade) : (detectedCurriculum.grade ?? undefined),
      category: q.category || detectedCurriculum.category || undefined,
      generateExercises: q.generateExercises !== 'false',
      userId: sub,
    };

    let pipelineResult: Awaited<ReturnType<typeof processVietDocument>>;
    try { pipelineResult = await processVietDocument(rawText, pipelineOpts); }
    catch (e: any) { throw { statusCode: 500, message: `Pipeline thất bại: ${e.message}` }; }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of pipelineResult.entries) {
      try {
        const { items, generateExercises, lessonType, textbook, ...setData } = entry;
        const validItems = (items ?? []).filter((it) => it.word && it.meaning);
        if (validItems.length === 0) continue;
        const set = await prisma.vietSet.create({
          data: {
            title: setData.title, category: (setData.category as any) ?? 'TU_VUNG',
            lessonType: lessonType ?? null, textbook: textbook ?? null,
            grade: setData.grade ?? pipelineOpts.grade ?? 3,
            level: setData.level ?? 'co_ban', isPublic: true, createdBy: sub,
            items: { create: validItems.map((it, i) => ({ ...it, order: it.order ?? i })) },
          },
          include: { items: true, _count: { select: { items: true } } },
        });
        let exercisesGenerated = 0;
        if (generateExercises && set.items.length >= 2) {
          for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'] as const) {
            const questions = buildVietQuestions(set.items, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.vietExercise.create({
                data: {
                  title: `${set.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, category: set.category, grade: set.grade,
                  level: set.level, isPublic: true, setId: set.id, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }
        results.push({ setId: set.id, title: set.title, itemsCreated: set._count.items, exercisesGenerated, items: set.items });
      } catch (e: any) {
        errors.push({ entry: entry?.title || '(không rõ)', error: e.message });
      }
    }

    // Analytics Engine
    await (prisma as any).vietImportLog.create({
      data: {
        totalLessons: pipelineResult.analytics.totalLessons,
        validLessons: pipelineResult.analytics.validLessons,
        hallucinationCount: pipelineResult.analytics.hallucinationCount,
        duplicateCount: pipelineResult.analytics.duplicateCount,
        repairCount: pipelineResult.analytics.repairCount,
        retryTotal: pipelineResult.analytics.retryTotal,
        avgQualityScore: pipelineResult.analytics.avgQualityScore,
        droppedByQualityGate: pipelineResult.analytics.droppedByQualityGate,
        avgParserScore: pipelineResult.analytics.avgParserScore,
        textbook: pipelineResult.curriculum.textbook,
        grade: pipelineResult.curriculum.grade,
        createdBy: sub,
      },
    });

    return reply.status(201).send({
      imported: results.length, errors, results,
      curriculum: detectedCurriculum,
      analytics: pipelineResult.analytics,
    });
  });

  // ─── DOCUMENT LIBRARY (upload, view, on-demand AI) ───────────────────────

  app.post('/docs', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file({ limits: { fileSize: 30 * 1024 * 1024 } });
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (!allowedMimes.includes(data.mimetype)) {
      throw { statusCode: 400, message: 'Định dạng file không được hỗ trợ' };
    }

    const buffer = await data.toBuffer();
    const ext = data.filename.split('.').pop()?.toLowerCase() || 'bin';
    const key = `viet-docs/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const bucket = env.MINIO_BUCKET_MATH_DOCS;

    await minioClient.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': data.mimetype });

    let extractedText: string | null = null;
    try {
      const text = await extractMarkdown(buffer, data.mimetype, data.filename);
      extractedText = text?.trim() || null;
    } catch { /* image or unsupported */ }

    const doc = await (prisma as any).vietDocument.create({
      data: {
        id: crypto.randomUUID(),
        originalName: data.filename,
        storedKey: key,
        mimetype: data.mimetype,
        size: buffer.length,
        bucket,
        extractedText,
        createdBy: sub,
        updatedAt: new Date(),
      },
    });

    return reply.status(201).send(doc);
  });

  app.get('/docs', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const docs = await (prisma as any).vietDocument.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, originalName: true, mimetype: true, size: true,
        status: true, grade: true, category: true, errorMsg: true,
        createdAt: true, updatedAt: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    return reply.send(docs);
  });

  app.get('/docs/:id/view-url', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).vietDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    const url = await getSignedUrl(doc.bucket, doc.storedKey, 1800);
    return reply.send({ url, mimetype: doc.mimetype, originalName: doc.originalName });
  });

  app.get('/docs/:id/text', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).vietDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    return reply.send({ text: doc.extractedText, originalName: doc.originalName });
  });

  app.post('/docs/:id/analyze', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).vietDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    if (doc.status === 'analyzing') throw { statusCode: 409, message: 'Đang phân tích, vui lòng chờ' };
    if (!doc.extractedText?.trim()) throw { statusCode: 400, message: 'Tài liệu không có nội dung văn bản để phân tích' };

    const q = req.query as { grade?: string; category?: string; generateExercises?: string };
    const normalized = vietUnicodeNormalize(vietClean(doc.extractedText));
    const detected = detectVietCurriculum(normalized);
    const pipelineOpts: VietProcessOpts = {
      grade: q.grade ? parseInt(q.grade) : (detected.grade ?? undefined),
      category: q.category || doc.category || detected.category || undefined,
      generateExercises: q.generateExercises !== 'false',
      userId: sub,
    };

    await (prisma as any).vietDocument.update({ where: { id }, data: { status: 'analyzing', updatedAt: new Date() } });

    let pipelineResult: Awaited<ReturnType<typeof processVietDocument>>;
    try {
      pipelineResult = await processVietDocument(doc.extractedText, pipelineOpts);
    } catch (e: any) {
      await (prisma as any).vietDocument.update({ where: { id }, data: { status: 'error', errorMsg: e.message, updatedAt: new Date() } });
      throw { statusCode: 500, message: `Pipeline thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];
    for (const entry of pipelineResult.entries) {
      try {
        const { items, generateExercises, lessonType, textbook, ...setData } = entry;
        const validItems = (items ?? []).filter((it: any) => it.word && it.meaning);
        if (validItems.length === 0) continue;
        const set = await prisma.vietSet.create({
          data: {
            title: setData.title, category: (setData.category as any) ?? 'TU_VUNG',
            lessonType: lessonType ?? null, textbook: textbook ?? null,
            grade: setData.grade ?? pipelineOpts.grade ?? 3,
            level: setData.level ?? 'co_ban', isPublic: true, createdBy: sub,
            items: { create: validItems.map((it: any, i: number) => ({ ...it, order: it.order ?? i })) },
          },
          include: { items: true, _count: { select: { items: true } } },
        });
        let exercisesGenerated = 0;
        if (generateExercises && set.items.length >= 2) {
          for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'] as const) {
            const questions = buildVietQuestions(set.items, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.vietExercise.create({
                data: {
                  title: `${set.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, category: set.category, grade: set.grade,
                  level: set.level, isPublic: true, setId: set.id, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }
        results.push({ setId: set.id, title: set.title, itemsCreated: set._count.items, exercisesGenerated, items: set.items });
      } catch (e: any) { errors.push({ entry: entry?.title || '(không rõ)', error: e.message }); }
    }

    // Analytics Engine
    await (prisma as any).vietImportLog.create({
      data: {
        documentId: id,
        totalLessons: pipelineResult.analytics.totalLessons,
        validLessons: pipelineResult.analytics.validLessons,
        hallucinationCount: pipelineResult.analytics.hallucinationCount,
        duplicateCount: pipelineResult.analytics.duplicateCount,
        repairCount: pipelineResult.analytics.repairCount,
        retryTotal: pipelineResult.analytics.retryTotal,
        avgQualityScore: pipelineResult.analytics.avgQualityScore,
        droppedByQualityGate: pipelineResult.analytics.droppedByQualityGate,
        avgParserScore: pipelineResult.analytics.avgParserScore,
        textbook: pipelineResult.curriculum.textbook,
        grade: pipelineResult.curriculum.grade,
        createdBy: sub,
      },
    });

    await (prisma as any).vietDocument.update({ where: { id }, data: { status: 'analyzed', updatedAt: new Date() } });
    return reply.status(201).send({ imported: results.length, errors, results, curriculum: detected, analytics: pipelineResult.analytics });
  });

  app.delete('/docs/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).vietDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    try { await deleteObject(doc.bucket, doc.storedKey); } catch { /* minio may not have it */ }
    await (prisma as any).vietDocument.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ─── ANALYTICS ENGINE ────────────────────────────────────────────────────

  app.get('/analytics', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const logs = await (prisma as any).vietImportLog.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    const total = logs.length;
    if (total === 0) return reply.send({ total: 0, logs: [] });

    const totalChunks = Math.max(1, logs.reduce((s: number, l: any) => s + l.totalLessons, 0));
    const totalValid = logs.reduce((s: number, l: any) => s + l.validLessons, 0);
    const totalRepair = logs.reduce((s: number, l: any) => s + l.repairCount, 0);
    const totalDropped = logs.reduce((s: number, l: any) => s + (l.droppedByQualityGate ?? 0), 0);
    const totalHalluc = logs.reduce((s: number, l: any) => s + l.hallucinationCount, 0);
    const totalDup = logs.reduce((s: number, l: any) => s + l.duplicateCount, 0);
    const avgQuality = logs.reduce((s: number, l: any) => s + l.avgQualityScore, 0) / total;
    const avgParser = logs.reduce((s: number, l: any) => s + (l.avgParserScore ?? 0), 0) / total;

    // tieptiengviet.md — 4 key rates
    const parserSuccessRate = Math.round(((totalChunks - totalRepair) / totalChunks) * 1000) / 10;
    const jsonValidRate = Math.round(((totalChunks - totalDropped) / totalChunks) * 1000) / 10;
    const qualityGatePassRate = Math.round((totalValid / totalChunks) * 1000) / 10;
    const hallucinationRate = Math.round((totalHalluc / totalChunks) * 1000) / 10;
    const duplicateRate = Math.round((totalDup / totalChunks) * 1000) / 10;

    return reply.send({
      total,
      // 4 rates — tieptiengviet.md
      parserSuccessRate,
      jsonValidRate,
      qualityGatePassRate,
      hallucinationRate,
      // existing
      avgQualityScore: Math.round(avgQuality * 10) / 10,
      avgParserScore: Math.round(avgParser * 1000) / 10,
      duplicateRate,
      logs,
    });
  });

  // ─── STUDENT PROFILE ENGINE ──────────────────────────────────────────────

  app.get('/student-profile', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const profile = await (prisma as any).studentVietProfile.findUnique({ where: { userId: sub } });
    return reply.send(profile ?? { userId: sub, weakTopics: [], strongTopics: [], avgScore: 0, totalAttempts: 0 });
  });

  app.post('/profile/update', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { lessonType, score } = z.object({ lessonType: z.string(), score: z.number().min(0).max(100) }).parse(req.body);
    const current = await (prisma as any).studentVietProfile.findUnique({ where: { userId: sub } }) ??
      { weakTopics: [], strongTopics: [], avgScore: 0, totalAttempts: 0 };
    const update = computeVietProfileUpdate(current, lessonType, score);
    const profile = await (prisma as any).studentVietProfile.upsert({
      where: { userId: sub },
      create: { userId: sub, ...update },
      update,
    });
    return reply.send(profile);
  });

  // ─── SYNTHETIC DATA ENGINE ───────────────────────────────────────────────

  app.post('/sets/:id/generate-variations', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: setId } = req.params as { id: string };
    const { count } = z.object({ count: z.number().min(1).max(10).default(3) }).parse(req.body);
    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id: setId }, include: { items: { take: 5 } } });
    const lessonForVariation = {
      subject: 'Tiếng Việt', grade: set.grade,
      lesson_type: (set as any).lessonType ?? 'vocabulary', topic: set.title, textbook: (set as any).textbook,
      knowledge: set.items.map((it) => ({ name: it.word, definition: it.meaning, example: it.example ?? '', hints: [] })),
      questions: [],
    } as any;
    const variations = await generateVietVariations(lessonForVariation, count);
    return reply.send({ setId, count: variations.length, questions: variations });
  });

  // ─── TEST PARSER (tieptiengviet.md Bước 5) ───────────────────────────────

  app.post('/test-parser', { preHandler: requireInstructor }, async (req, reply) => {
    const body = z.object({
      text: z.string().min(1),
      grade: z.number().min(1).max(9).optional(),
    }).parse(req.body);

    const cleaned = vietUnicodeNormalize(vietClean(body.text));
    const curriculum = detectVietCurriculum(cleaned);
    if (body.grade) curriculum.grade = body.grade;

    const chunks = splitVietLessons(cleaned);
    const richChunks = chunks.filter((c) => isVietContentRich(c.text));

    const avgParserScore = richChunks.length > 0
      ? Math.round(richChunks.reduce((s, c) => s + c.parserScore, 0) / richChunks.length * 100) / 100
      : 0;

    const chunkDetails = chunks.map((c) => ({
      title: c.title,
      textLength: c.text.length,
      parserScore: c.parserScore,
      vocabTokens: c.vocabTokens,
      lessonSignals: c.lessonSignals,
      isRich: isVietContentRich(c.text),
    }));

    const checks: Record<string, boolean> = {
      '✓ Tách đúng bài học': richChunks.length > 0,
      '✓ Có từ vựng': chunks.some((c) => c.vocabTokens.length > 0),
      '✓ Parser score ≥ 0.5': avgParserScore >= 0.5,
    };

    return reply.send({
      curriculum,
      totalChunks: chunks.length,
      richChunks: richChunks.length,
      avgParserScore,
      chunks: chunkDetails,
      checks,
    });
  });

  // ─── BENCHMARKS CRUD ─────────────────────────────────────────────────────

  // GET /viet/benchmarks — list
  app.get('/benchmarks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const benchmarks = await (prisma as any).vietBenchmark.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send(benchmarks);
  });

  // POST /viet/benchmarks — create manually
  app.post('/benchmarks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      name: z.string().min(2).max(200),
      totalFiles: z.number().default(0),
      parseOk: z.number().default(0),
      jsonValid: z.number().default(0),
      qualityPass: z.number().default(0),
      avgQuality: z.number().default(0),
      avgParser: z.number().default(0),
      notes: z.string().optional(),
    }).parse(req.body);
    const benchmark = await (prisma as any).vietBenchmark.create({
      data: { ...body, createdBy: sub },
    });
    return reply.status(201).send(benchmark);
  });

  // GET /viet/benchmarks/:id
  app.get('/benchmarks/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const benchmark = await (prisma as any).vietBenchmark.findUnique({ where: { id } });
    if (!benchmark) throw { statusCode: 404, message: 'Không tìm thấy benchmark' };
    if (role !== 'ADMIN' && benchmark.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    return reply.send(benchmark);
  });

  // DELETE /viet/benchmarks/:id
  app.delete('/benchmarks/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const benchmark = await (prisma as any).vietBenchmark.findUnique({ where: { id } });
    if (!benchmark) throw { statusCode: 404, message: 'Không tìm thấy benchmark' };
    if (role !== 'ADMIN' && benchmark.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    await (prisma as any).vietBenchmark.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ─── QUALITY CHECK (tieptiengviet1.md Bước 3) ────────────────────────────
  //
  // Chấm điểm từng knowledge item theo rubric đơn giản:
  //   JSON hợp lệ           +10
  //   definition >= 30 ký tự +40
  //   example có dữ liệu    +30
  //   hints >= 2 mục        +20
  //   Tổng: 100 điểm/item

  // ─── COMBINED STATS (testtoatiengviet.md Bước 2) ─────────────────────────
  //
  // Tổng hợp 3 chỉ số chính cho CẢ 2 MÔN (Toán + Tiếng Việt):
  //   Parser Success %
  //   JSON Valid %
  //   Quality Score %

  app.get('/combined-stats', { preHandler: requireInstructor }, async (req, reply) => {
    const { role, sub } = req.user as { role: string; sub: string };
    const q = req.query as { limit?: string };
    const limit = Math.min(parseInt(q.limit ?? '50'), 200);

    const [mathLogs, vietLogs] = await Promise.all([
      (prisma as any).mathBenchmark.findMany({
        where: role === 'ADMIN' ? {} : { createdBy: sub },
        orderBy: { createdAt: 'desc' }, take: limit,
        select: {
          id: true, name: true, totalFiles: true, parseOk: true,
          jsonValid: true, qualityPass: true, avgQuality: true,
          avgParser: true, notes: true, createdAt: true,
        },
      }),
      (prisma as any).vietBenchmark.findMany({
        where: role === 'ADMIN' ? {} : { createdBy: sub },
        orderBy: { createdAt: 'desc' }, take: limit,
        select: {
          id: true, name: true, totalFiles: true, parseOk: true,
          jsonValid: true, qualityPass: true, avgQuality: true,
          avgParser: true, notes: true, createdAt: true,
        },
      }),
    ]);

    const summarize = (logs: any[]) => {
      const total = logs.reduce((s: number, l: any) => s + (l.totalFiles ?? 0), 0);
      if (total === 0) return { total: 0, parserSuccessPct: 0, jsonValidPct: 0, qualityPassPct: 0, avgQuality: 0, runs: 0 };
      const parseOk = logs.reduce((s: number, l: any) => s + (l.parseOk ?? 0), 0);
      const jsonValid = logs.reduce((s: number, l: any) => s + (l.jsonValid ?? 0), 0);
      const qualityPass = logs.reduce((s: number, l: any) => s + (l.qualityPass ?? 0), 0);
      const avgQ = logs.reduce((s: number, l: any) => s + (l.avgQuality ?? 0), 0) / logs.length;
      return {
        total,
        parserSuccessPct: Math.round(parseOk / total * 100),
        jsonValidPct: Math.round(jsonValid / total * 100),
        qualityPassPct: Math.round(qualityPass / total * 100),
        avgQuality: Math.round(avgQ),
        runs: logs.length,
      };
    };

    const mathStats = summarize(mathLogs);
    const vietStats = summarize(vietLogs);
    const grandTotal = mathStats.total + vietStats.total;

    // Combined weighted averages
    const combined = grandTotal === 0 ? null : {
      total: grandTotal,
      parserSuccessPct: grandTotal > 0
        ? Math.round((mathStats.parserSuccessPct * mathStats.total + vietStats.parserSuccessPct * vietStats.total) / grandTotal)
        : 0,
      jsonValidPct: grandTotal > 0
        ? Math.round((mathStats.jsonValidPct * mathStats.total + vietStats.jsonValidPct * vietStats.total) / grandTotal)
        : 0,
      qualityPassPct: grandTotal > 0
        ? Math.round((mathStats.qualityPassPct * mathStats.total + vietStats.qualityPassPct * vietStats.total) / grandTotal)
        : 0,
    };

    return reply.send({
      // testtoatiengviet.md Bước 2: 3 chỉ số chính
      summary: {
        label: 'Tổng hợp Toán + Tiếng Việt',
        totalFilesProcessed: grandTotal,
        'Parser Success %': combined?.parserSuccessPct ?? 0,
        'JSON Valid %': combined?.jsonValidPct ?? 0,
        'Quality Score %': combined?.qualityPassPct ?? 0,
      },
      math: { ...mathStats, recentRuns: mathLogs.slice(0, 5) },
      viet: { ...vietStats, recentRuns: vietLogs.slice(0, 5) },
      // testtoatiengviet.md Bước 5: gợi ý khi nào nên làm tính năng mới
      readiness: {
        stable: (combined?.parserSuccessPct ?? 0) >= 85 &&
                (combined?.jsonValidPct ?? 0) >= 85 &&
                (combined?.qualityPassPct ?? 0) >= 80,
        message: (combined?.parserSuccessPct ?? 0) >= 85 &&
                 (combined?.jsonValidPct ?? 0) >= 85 &&
                 (combined?.qualityPassPct ?? 0) >= 80
          ? '✓ Hệ thống ổn định — có thể bắt đầu RAG / Student Profile'
          : '⚠ Hệ thống chưa ổn định — cần test thêm file thật và sửa lỗi trước khi làm tính năng mới',
        targets: { parserSuccess: '≥85%', jsonValid: '≥85%', qualityScore: '≥80%' },
      },
    });
  });

  app.post('/quality-check', { preHandler: requireInstructor }, async (req, reply) => {
    const body = z.object({
      items: z.array(z.object({
        name: z.string().optional(),
        definition: z.string().optional(),
        example: z.string().optional(),
        hints: z.array(z.string()).optional(),
      })).min(1).max(50),
    }).parse(req.body);

    const result = scoreKnowledgeItems(body.items);
    const passCount = result.items.filter((i) => i.score >= 80).length;
    const failCount = result.items.length - passCount;

    return reply.send({
      avgScore: result.avgScore,
      totalItems: result.items.length,
      passCount,
      failCount,
      items: result.items,
      rubric: {
        'JSON hợp lệ': '+10',
        'definition >= 30 ký tự': '+40',
        'example có dữ liệu': '+30',
        'hints >= 2 mục': '+20',
        'Tổng tối đa': '100 điểm',
      },
    });
  });

  // POST /viet/quality-check/gold — chấm điểm toàn bộ gold dataset
  app.post('/quality-check/gold', { preHandler: requireInstructor }, async (_req, reply) => {
    const allResults = VIET_GOLD_DATASET.map((entry) => {
      const result = scoreKnowledgeItems(entry.expectedKnowledge);
      return {
        label: entry.label,
        grade: entry.grade,
        itemCount: entry.expectedKnowledge.length,
        avgScore: result.avgScore,
        items: result.items,
      };
    });

    const overallAvg = allResults.length > 0
      ? Math.round(allResults.reduce((s, r) => s + r.avgScore, 0) / allResults.length)
      : 0;

    const allPass = allResults.every((r) => r.avgScore >= 80);

    return reply.send({
      totalLessons: allResults.length,
      overallAvgScore: overallAvg,
      allPass,
      lessons: allResults,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /viet/benchmarks/run-batch (tieptiengviet.md Bước 5)
  //
  // Chạy pipeline trên nhiều bài cùng lúc, ghi lại 4 chỉ số:
  //   - Parse thành công (parserScore ≥ 0.3 và isVietContentRich)
  //   - JSON hợp lệ (qua validator, chỉ khi runAI=true)
  //   - Quality > 70 (chỉ khi runAI=true)
  //   - AI Generate tốt (AI trả kết quả, chỉ khi runAI=true)
  //
  // Dùng useSeed=true để test với VIET_GOLD_DATASET (20 bài mặc định).
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/benchmarks/run-batch', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const body = z.object({
      name: z.string().min(2).max(200).default(`Benchmark Viet ${new Date().toLocaleDateString('vi-VN')}`),
      useSeed: z.boolean().default(false),
      runAI: z.boolean().default(false),
      notes: z.string().optional(),
      items: z.array(z.object({
        label: z.string().min(1),
        text: z.string().min(10),
        grade: z.number().min(1).max(9).default(3),
      })).optional(),
    }).parse(req.body);

    const items = body.useSeed
      ? VIET_GOLD_DATASET
      : (body.items ?? []);

    if (items.length === 0) {
      throw { statusCode: 400, message: 'Cần ít nhất 1 item hoặc dùng useSeed=true để dùng gold dataset' };
    }

    const report: Array<{
      label: string;
      grade: number;
      parseOk: boolean;
      parserScore: number;
      chunkCount: number;
      jsonValid?: boolean;
      qualityScore?: number;
      qualityPass?: boolean;
      aiOk?: boolean;
      knowledgeQualityScore?: number;
      knowledgeItemCount?: number;
      // testtoatiengviet.md Bước 3: error classification
      errors: ErrorType[];
      errorLabels: string[];
      error?: string;
    }> = [];

    for (const item of items) {
      try {
        const cleaned = vietUnicodeNormalize(vietClean(item.text));
        const curriculum = detectVietCurriculum(cleaned);
        if (item.grade) curriculum.grade = item.grade;

        const chunks = splitVietLessons(cleaned);
        const richChunks = chunks.filter((c) => isVietContentRich(c.text));
        const avgParser = richChunks.length > 0
          ? richChunks.reduce((s, c) => s + c.parserScore, 0) / richChunks.length
          : 0;
        const parseOk = richChunks.length > 0 && avgParser >= 0.3;

        // Knowledge quality — gold dataset only
        let knowledgeQualityScore: number | undefined;
        let knowledgeItemCount: number | undefined;
        const goldItem = item as any;
        if (body.useSeed && Array.isArray(goldItem.expectedKnowledge) && goldItem.expectedKnowledge.length > 0) {
          const kResult = scoreKnowledgeItems(goldItem.expectedKnowledge);
          knowledgeQualityScore = kResult.avgScore;
          knowledgeItemCount = goldItem.expectedKnowledge.length;
        }

        // Error classification — parser stage
        const errReport = classifyItemErrors({
          text: item.text,
          richChunkCount: richChunks.length,
          totalChunkCount: chunks.length,
        });

        if (!body.runAI) {
          report.push({
            label: item.label,
            grade: item.grade,
            parseOk,
            parserScore: Math.round(avgParser * 100) / 100,
            chunkCount: richChunks.length,
            knowledgeQualityScore,
            knowledgeItemCount,
            errors: errReport.errors,
            errorLabels: errReport.errorLabels,
          });
          continue;
        }

        // Full AI pipeline
        const result = await processVietDocument(item.text, {
          grade: item.grade,
          generateExercises: false,
          userId: sub,
        });

        const validEntries = result.entries;
        const jsonValid = validEntries.length > 0;
        const avgQuality = result.analytics.avgQualityScore;
        const qualityPass = avgQuality >= 70;

        // Error classification — AI stage
        const errReportAI = classifyItemErrors({
          text: item.text,
          richChunkCount: richChunks.length,
          totalChunkCount: chunks.length,
          jsonRepairFailed: result.analytics.repairCount > 0 && !jsonValid,
          qualityScore: avgQuality,
          qualityGate: 40,
          hallucinationCount: result.analytics.hallucinationCount,
        });

        report.push({
          label: item.label,
          grade: item.grade,
          parseOk,
          parserScore: Math.round(avgParser * 100) / 100,
          chunkCount: richChunks.length,
          jsonValid,
          qualityScore: avgQuality,
          qualityPass,
          aiOk: jsonValid,
          knowledgeQualityScore,
          knowledgeItemCount,
          errors: errReportAI.errors,
          errorLabels: errReportAI.errorLabels,
        });
      } catch (e: any) {
        const errReport = classifyItemErrors({
          text: item.text,
          richChunkCount: 0,
          totalChunkCount: 0,
        });
        report.push({
          label: item.label,
          grade: item.grade,
          parseOk: false,
          parserScore: 0,
          chunkCount: 0,
          errors: errReport.errors,
          errorLabels: errReport.errorLabels,
          error: e.message,
        });
      }
    }

    const total = report.length;
    const parseOkCount = report.filter((r) => r.parseOk).length;
    const jsonValidCount = report.filter((r) => r.jsonValid === true).length;
    const qualityPassCount = report.filter((r) => r.qualityPass === true).length;
    const aiOkCount = report.filter((r) => r.aiOk === true).length;
    const avgParser = total > 0
      ? Math.round(report.reduce((s, r) => s + r.parserScore, 0) / total * 100) / 100
      : 0;
    const avgQuality = body.runAI && total > 0
      ? Math.round(report.filter((r) => r.qualityScore != null).reduce((s, r) => s + (r.qualityScore ?? 0), 0) / Math.max(1, report.filter((r) => r.qualityScore != null).length))
      : 0;

    // Knowledge quality summary
    const kqItems = report.filter((r) => r.knowledgeQualityScore != null);
    const avgKnowledgeQuality = kqItems.length > 0
      ? Math.round(kqItems.reduce((s, r) => s + (r.knowledgeQualityScore ?? 0), 0) / kqItems.length)
      : null;
    const kqPassCount = kqItems.filter((r) => (r.knowledgeQualityScore ?? 0) >= 80).length;

    // testtoatiengviet.md Bước 3: Error table
    const batchSummary = buildBatchSummary({
      total,
      parserSuccessCount: parseOkCount,
      jsonValidCount: body.runAI ? jsonValidCount : parseOkCount,
      qualityPassCount,
      errorReports: report.map((r) => ({ errors: r.errors })),
    });

    // Ghi kết quả vào VietBenchmark
    const benchmark = await (prisma as any).vietBenchmark.create({
      data: {
        name: body.name,
        totalFiles: total,
        parseOk: parseOkCount,
        jsonValid: body.runAI ? jsonValidCount : parseOkCount,
        qualityPass: qualityPassCount,
        avgQuality: body.useSeed && avgKnowledgeQuality != null ? avgKnowledgeQuality : avgQuality,
        avgParser,
        notes: [
          body.notes,
          `useSeed=${body.useSeed}`,
          `runAI=${body.runAI}`,
          `items=${total}`,
          avgKnowledgeQuality != null ? `knowledgeAvgScore=${avgKnowledgeQuality}` : null,
          batchSummary.topError ? `topError=${batchSummary.topError}` : null,
        ].filter(Boolean).join(' | '),
        createdBy: sub,
      },
    });

    // Metrics hiển thị
    const metrics: Record<string, string> = {
      'Parser Success %': `${parseOkCount}/${total} (${batchSummary.parserSuccessPct}%)`,
      'JSON Valid %': body.runAI
        ? `${jsonValidCount}/${total} (${batchSummary.jsonValidPct}%)`
        : 'chưa chạy AI',
      'Quality Score %': body.runAI
        ? `${qualityPassCount}/${total} (${batchSummary.qualityPassPct}%)`
        : 'chưa chạy AI',
    };
    if (avgKnowledgeQuality != null) {
      metrics['Knowledge Quality'] = `avg ${avgKnowledgeQuality}/100 — ${kqPassCount}/${kqItems.length} bài đạt ≥80`;
    }

    return reply.status(201).send({
      benchmarkId: benchmark.id,
      name: body.name,
      total,
      // testtoatiengviet.md Bước 2
      metrics,
      avgParser,
      avgQuality: body.runAI ? avgQuality : null,
      avgKnowledgeQuality,
      // testtoatiengviet.md Bước 3: bảng lỗi xếp hạng
      errorTable: batchSummary.errorTable,
      topError: batchSummary.topError,
      recommendation: batchSummary.recommendation,
      report,
    });
  });

  // ─── RAG: Embed VietItems vào vector store ────────────────────────────────────

  app.post('/rag/embed', { preHandler: requireInstructor }, async (req, reply) => {
    const { grade, category, limit: lim } = z.object({
      grade: z.number().min(1).max(12).optional(),
      category: z.string().optional(),
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
    if (grade) where.grade = grade;
    if (category) where.category = category;

    const sets = await prisma.vietSet.findMany({
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
          item.meaning,
          item.example ?? '',
          item.note ?? '',
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
            grade: set.grade,
            subject: `viet:${set.category}`,
          },
        }, 'viet');
        embedded++;
      }
    }

    return reply.send({ ok: true, embedded, failed, sets: sets.length });
  });

  app.get('/rag/stats', { preHandler: requireInstructor }, async (_req, reply) => {
    const stats = await getIndexStats('viet');
    return reply.send(stats);
  });

  // ─── CHÍNH TẢ THẦN TỐC GAME ──────────────────────────────────────────────

  const CHINH_TA_SENTENCES: Record<string, string[]> = {
    easy: [
      'Con mèo ngồi trên mái nhà.',
      'Trời hôm nay trong xanh và đẹp.',
      'Bạn ơi, đi học thôi nào.',
      'Mẹ nấu cơm thơm ngon lắm.',
      'Em học bài rất chăm chỉ.',
      'Cây tre xanh mướt bên dòng sông.',
      'Hoa đào nở rộ vào mùa xuân.',
      'Bé chơi đùa vui vẻ ngoài sân.',
      'Chị gái tôi rất hiền và tốt bụng.',
      'Ông bà sống ở quê rất vui.',
    ],
    medium: [
      'Những chiếc lá vàng rơi nhẹ theo từng cơn gió thu.',
      'Học sinh cần rèn luyện thói quen đọc sách mỗi ngày.',
      'Đất nước Việt Nam có nhiều danh lam thắng cảnh tuyệt đẹp.',
      'Chăm chỉ học tập là chìa khóa dẫn đến thành công.',
      'Trẻ em cần được chăm sóc và giáo dục đúng cách.',
      'Bảo vệ môi trường là trách nhiệm của mỗi công dân.',
      'Ngôn ngữ là công cụ giao tiếp quan trọng nhất của con người.',
      'Mùa hè đến mang theo nắng vàng và tiếng ve kêu rộn ràng.',
      'Người Việt Nam luôn trân trọng truyền thống văn hóa dân tộc.',
      'Các em học sinh hãy cố gắng học tốt để xây dựng đất nước.',
    ],
    hard: [
      'Tổ quốc Việt Nam anh hùng đã trải qua bao thăng trầm lịch sử để giành lại độc lập.',
      'Nguyễn Du, đại thi hào của dân tộc, đã để lại cho đời kiệt tác Truyện Kiều bất hủ.',
      'Sự nghiệp giáo dục và đào tạo là nền tảng để phát triển nguồn nhân lực chất lượng cao.',
      'Văn học dân gian phản ánh tâm tư, tình cảm và triết lý sống của người Việt qua nhiều thế hệ.',
      'Công nghệ thông tin đang thay đổi mạnh mẽ cách chúng ta học tập và làm việc trong thời đại mới.',
    ],
  };

  app.get('/game/chinh-ta', { preHandler: requireAuth }, async (req) => {
    const { level = 'easy', count = '10' } = req.query as { level?: string; count?: string };
    const lvl = ['easy', 'medium', 'hard'].includes(level) ? level : 'easy';
    const pool = CHINH_TA_SENTENCES[lvl];
    const take = Math.min(parseInt(count, 10), pool.length);
    const sentences = pool.sort(() => Math.random() - 0.5).slice(0, take);

    return {
      sentences: sentences.map((s, i) => ({ id: `ct${i}`, text: s })),
      level: lvl,
      ttsUrl: `/viet/tts?lang=vi-VN&text=`,
    };
  });

  app.post('/game/chinh-ta/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      typed: z.record(z.string()),
      sentences: z.array(z.object({ id: z.string(), text: z.string() })),
      streak: z.number().int().min(0).default(0),
    }).parse(req.body);

    function normalize(s: string) {
      return s.trim().toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ');
    }

    function similarity(a: string, b: string) {
      const na = normalize(a), nb = normalize(b);
      if (na === nb) return 1;
      const la = na.split(' '), lb = nb.split(' ');
      const matched = la.filter(w => lb.includes(w)).length;
      return la.length > 0 ? matched / Math.max(la.length, lb.length) : 0;
    }

    const results = body.sentences.map(s => {
      const typed = body.typed[s.id] ?? '';
      const sim = similarity(s.text, typed);
      const correct = sim >= 0.9;
      return { id: s.id, correct, similarity: Math.round(sim * 100), expected: s.text, typed };
    });

    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    let xpEarned = correct * 10;
    if (body.streak >= 10) xpEarned += 50;
    else if (body.streak >= 5) xpEarned += 20;
    if (score === 100) xpEarned += 100;

    await addXP(sub, xpEarned);
    await prisma.vietUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return { results, correct, total, score, xpEarned };
  });

  // ─── NHÀ VĂN NHÍ GAME ────────────────────────────────────────────────────

  const NHV_TOPICS = [
    'Mùa hè', 'Gia đình', 'Trường học', 'Con vật yêu thích',
    'Ước mơ của em', 'Mùa xuân', 'Ngày nghỉ lễ', 'Người thân yêu quý',
    'Thiên nhiên', 'Một ngày đi chơi', 'Bữa cơm gia đình', 'Kỷ niệm đáng nhớ',
  ];

  app.get('/game/nhan-van-nhi/topics', { preHandler: requireAuth }, async () => {
    const shuffled = NHV_TOPICS.sort(() => Math.random() - 0.5);
    return { topics: shuffled.slice(0, 4) };
  });

  app.post('/game/nhan-van-nhi/grade', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      topic: z.string().min(1).max(100),
      text: z.string().min(20).max(2000),
    }).parse(req.body);

    const prompt = `Bạn là giáo viên Tiếng Việt chấm bài viết của học sinh tiểu học/THCS.

Chủ đề: "${body.topic}"
Bài viết:
"""
${body.text}
"""

Hãy chấm theo 4 tiêu chí, mỗi tiêu chí từ 0–25 điểm:
1. chinhTa: Lỗi chính tả (dấu hỏi/ngã, ch/tr, s/x...)
2. nguPhap: Ngữ pháp, cấu trúc câu
3. yTuong: Ý tưởng, nội dung phù hợp chủ đề
4. dienDat: Diễn đạt, văn phong

Trả về JSON (KHÔNG markdown):
{"chinhTa":20,"nguPhap":18,"yTuong":22,"dienDat":19,"nhanXet":"Nhận xét ngắn 2-3 câu","goiY":"Gợi ý cải thiện 1-2 câu"}`;

    let grading = { chinhTa: 15, nguPhap: 15, yTuong: 15, dienDat: 15, nhanXet: 'Bài viết khá tốt!', goiY: 'Hãy chú ý thêm dấu câu.' };

    try {
      const raw = await aiChatOnce([{ role: 'user', content: prompt }], { maxTokens: 300 });
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) grading = { ...grading, ...JSON.parse(match[0]) };
    } catch { /* dùng default */ }

    const total = Math.min(100, (grading.chinhTa ?? 15) + (grading.nguPhap ?? 15) + (grading.yTuong ?? 15) + (grading.dienDat ?? 15));
    const xpEarned = Math.round(total * 0.8) + (total >= 90 ? 50 : total >= 70 ? 20 : 0);

    await addXP(sub, xpEarned);
    await prisma.vietUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return reply.send({ ...grading, total, xpEarned });
  });
}
