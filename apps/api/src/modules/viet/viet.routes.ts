import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { extractText, structureVietWithAI } from '../../services/file-import';

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
    create: { userId, xp, lastStudied: new Date() },
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
    return prisma.vietUserStats.findMany({
      orderBy: { xp: 'desc' }, take: 20,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
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
    return prisma.vietSet.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    });
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
    return prisma.vietSet.update({ where: { id }, data: body });
  });

  app.delete('/sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const set = await prisma.vietSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vietSet.delete({ where: { id } });
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
    return prisma.vietExercise.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } }, _count: { select: { questions: true, attempts: true } } },
    });
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
    const questions = buildVietQuestions(set.items, body.type, body.questionCount);
    if ('error' in (questions as any)) throw { statusCode: 400, message: (questions as any).error };

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
      const questions = buildVietQuestions(set.items, type, body.questionCount);
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
    return prisma.vietExercise.update({ where: { id }, data: body });
  });

  app.delete('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const ex = await prisma.vietExercise.findUniqueOrThrow({ where: { id } });
    if (ex.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vietExercise.delete({ where: { id } });
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
        const ua = userAnswer as Record<string, string>;
        const ea = q.answer as Record<string, string>;
        correct = JSON.stringify(ua) === JSON.stringify(ea);
      } else if (exercise.type === 'WORD_ORDER') {
        correct = JSON.stringify(userAnswer) === JSON.stringify(q.answer);
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
      create: { userId: sub, exercisesDone: 1, xp: xpEarned, lastStudied: new Date() },
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

  // ─── Smart Import (PDF / DOCX / XLSX / PPTX → AI structured) ─────────────
  app.post('/import-smart', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } });
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const q = req.query as { grade?: string; category?: string; generateExercises?: string };
    const opts = {
      grade: q.grade ? parseInt(q.grade) : undefined,
      category: q.category,
      generateExercises: q.generateExercises !== 'false',
    };

    const buffer = await data.toBuffer();
    let rawText: string;
    try {
      rawText = await extractText(buffer, data.mimetype, data.filename);
    } catch (e: any) {
      throw { statusCode: 400, message: `Không đọc được file: ${e.message}` };
    }

    if (!rawText?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };

    let curriculum: Awaited<ReturnType<typeof structureVietWithAI>>;
    try {
      curriculum = await structureVietWithAI(rawText, opts);
    } catch (e: any) {
      throw { statusCode: 500, message: `AI phân tích thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { items, generateExercises, ...setData } = entry;
        const validItems = (items ?? []).filter((it) => it.word && it.meaning);
        if (validItems.length === 0) continue;
        const set = await prisma.vietSet.create({
          data: {
            title: setData.title,
            category: (setData.category as any) ?? 'TU_VUNG',
            grade: setData.grade ?? opts.grade ?? 3,
            level: setData.level ?? 'co_ban',
            isPublic: true,
            createdBy: sub,
            items: { create: validItems.map((it, i) => ({ ...it, order: it.order ?? i })) },
          },
          include: { items: true, _count: { select: { items: true } } },
        });

        let exercisesGenerated = 0;
        if (generateExercises && set.items.length >= 2) {
          const genTypes: Array<'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'SPELLING' | 'MATCHING' | 'WORD_ORDER'> =
            ['MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER'];
          for (const type of genTypes) {
            const questions = buildVietQuestions(set.items, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.vietExercise.create({
                data: {
                  title: `${set.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, category: set.category, grade: set.grade,
                  level: set.level, isPublic: true,
                  setId: set.id, createdBy: sub,
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
}
