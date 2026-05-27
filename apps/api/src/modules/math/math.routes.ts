import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { extractText, structureMathWithAI, generateMathQuestionsWithAI } from '../../services/file-import';
import { minioClient, getSignedUrl, deleteObject } from '../../services/minio';
import { env } from '../../config/env';
import crypto from 'crypto';

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
  const stats = await prisma.mathUserStats.upsert({
    where: { userId },
    create: { userId, xp, lastStudied: new Date() },
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
  return prisma.mathUserStats.update({
    where: { userId },
    data: {
      xp: newXp,
      level: Math.floor(newXp / 500) + 1,
      streak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastStudied: new Date(),
    },
  });
}

// ─── Auto-generate questions from topic concepts ──────────────────────────────
const shuffleArr = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Concept = { id: string; name: string; definition: string; formula?: string | null; example?: string | null; solution?: string | null; hints: string[] };

function buildMathQuestions(concepts: Concept[], type: string, count: number): any[] | { error: string } {
  if (concepts.length < 2) return { error: 'Cần ít nhất 2 khái niệm để tạo câu hỏi' };
  const pool = shuffleArr(concepts).slice(0, Math.min(concepts.length, count));

  return pool.map((c, i) => {
    if (type === 'MULTIPLE_CHOICE') {
      const others = concepts.filter((x) => x.id !== c.id);
      const distractors = shuffleArr(others).slice(0, 3).map((x) => x.name);
      const options = shuffleArr([c.name, ...distractors]);
      return {
        content: `Khái niệm/công thức nào sau đây mô tả: "${c.definition.slice(0, 150)}${c.definition.length > 150 ? '...' : ''}"?`,
        options, answer: c.name,
        solution: c.formula ? `Công thức: ${c.formula}` : c.definition,
        hints: c.hints, order: i, points: 1, difficulty: 1,
      };
    }
    if (type === 'TRUE_FALSE') {
      const useTrue = Math.random() > 0.5;
      let content: string, answer: string;
      if (useTrue) {
        content = `Đúng hay Sai: "${c.name}" — ${c.definition.slice(0, 120)}`;
        answer = 'Đúng';
      } else {
        const other = shuffleArr(concepts.filter((x) => x.id !== c.id))[0];
        content = `Đúng hay Sai: "${c.name}" — ${other?.definition.slice(0, 120) ?? 'định nghĩa không chính xác'}`;
        answer = 'Sai';
      }
      return { content, options: ['Đúng', 'Sai'], answer, solution: c.definition, hints: c.hints, order: i, points: 1, difficulty: 1 };
    }
    if (type === 'FILL_BLANK') {
      const text = c.formula || c.name;
      const words = text.split(' ');
      if (words.length < 2) {
        return { content: `Điền tên khái niệm: ${c.definition.slice(0, 100)}`, answer: c.name, solution: c.definition, hints: c.hints, order: i, points: 1, difficulty: 2 };
      }
      const blankIdx = Math.floor(Math.random() * words.length);
      const answer = words[blankIdx];
      const filled = [...words]; filled[blankIdx] = '___';
      return { content: `Điền vào chỗ trống (${c.name}):\n${filled.join(' ')}`, answer, solution: text, hints: c.hints, order: i, points: 1, difficulty: 2 };
    }
    // PROOF_STEP — open-ended
    return {
      content: c.example ? `Giải bài toán:\n${c.example}` : `Giải thích và trình bày: ${c.name}`,
      answer: c.solution || c.definition,
      solution: c.solution,
      hints: c.hints, order: i, points: 2, difficulty: 3,
    };
  });
}

const SUBJECT_ENUM = ['ARITHMETIC', 'ALGEBRA', 'GEOMETRY', 'TRIGONOMETRY', 'CALCULUS', 'STATISTICS', 'NUMBER_THEORY', 'COMBINATORICS'] as const;
const EXERCISE_TYPE_ENUM = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'CALCULATION', 'PROOF_STEP'] as const;
const TYPE_IMPORT_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền số',
  TRUE_FALSE: 'Đúng/Sai', PROOF_STEP: 'Chứng minh',
};

export async function mathRoutes(app: FastifyInstance) {
  // ─── STATS ────────────────────────────────────────────────────────────────

  app.get('/stats', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const stats = await prisma.mathUserStats.findUnique({ where: { userId: sub } });
    const reviewsDue = await prisma.conceptProgress.count({
      where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
    });
    return { ...(stats || { xp: 0, level: 1, streak: 0, longestStreak: 0, conceptsLearned: 0, exercisesDone: 0 }), reviewsDue };
  });

  app.get('/leaderboard', { preHandler: requireAuth }, async () => {
    return prisma.mathUserStats.findMany({
      orderBy: { xp: 'desc' },
      take: 20,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  });

  // ─── TOPICS ───────────────────────────────────────────────────────────────

  app.get('/topics', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { subject?: string; grade?: string; courseId?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.subject) where.subject = q.subject;
    if (q.grade) where.grade = parseInt(q.grade);
    if (q.courseId) where.courseId = q.courseId;
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }
    return prisma.mathTopic.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } }, _count: { select: { concepts: true, exercises: true } } },
    });
  });

  app.get('/topics/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.mathTopic.findUniqueOrThrow({
      where: { id },
      include: { creator: { select: { id: true, name: true } }, concepts: { orderBy: { order: 'asc' } }, _count: { select: { exercises: true } } },
    });
  });

  app.post('/topics', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      title: z.string().min(2).max(200),
      description: z.string().optional(),
      subject: z.enum(SUBJECT_ENUM).default('ARITHMETIC'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('beginner'),
      coverUrl: z.string().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);
    const topic = await prisma.mathTopic.create({ data: { ...body, createdBy: sub } });
    return reply.status(201).send(topic);
  });

  app.patch('/topics/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const topic = await prisma.mathTopic.findUniqueOrThrow({ where: { id } });
    if (topic.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    const body = z.object({
      title: z.string().min(2).max(200).optional(),
      description: z.string().nullable().optional(),
      subject: z.enum(SUBJECT_ENUM).optional(),
      grade: z.number().min(1).max(12).optional(),
      level: z.string().optional(),
      coverUrl: z.string().nullable().optional(),
      isPublic: z.boolean().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    return prisma.mathTopic.update({ where: { id }, data: body });
  });

  app.delete('/topics/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const topic = await prisma.mathTopic.findUniqueOrThrow({ where: { id } });
    if (topic.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.mathTopic.delete({ where: { id } });
    return { message: 'Đã xóa chủ đề' };
  });

  // ─── CONCEPTS ─────────────────────────────────────────────────────────────

  app.post('/topics/:id/concepts', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: topicId } = req.params as { id: string };
    const body = z.object({
      name: z.string().min(1).max(200),
      definition: z.string().min(1),
      formula: z.string().optional(),
      example: z.string().optional(),
      solution: z.string().optional(),
      hints: z.array(z.string()).default([]),
      imageUrl: z.string().optional(),
      order: z.number().default(0),
    }).parse(req.body);
    const concept = await prisma.mathConcept.create({ data: { ...body, topicId } });
    return reply.status(201).send(concept);
  });

  app.post('/topics/:id/concepts/bulk', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: topicId } = req.params as { id: string };
    const body = z.object({
      concepts: z.array(z.object({
        name: z.string().min(1),
        definition: z.string().min(1),
        formula: z.string().optional(),
        example: z.string().optional(),
        solution: z.string().optional(),
        hints: z.array(z.string()).default([]),
        imageUrl: z.string().optional(),
        order: z.number().default(0),
      })).min(1),
    }).parse(req.body);
    const created = await prisma.mathConcept.createMany({ data: body.concepts.map((c) => ({ ...c, topicId })) });
    return reply.status(201).send({ created: created.count });
  });

  app.patch('/concepts/:cid', { preHandler: requireInstructor }, async (req) => {
    const { cid } = req.params as { cid: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      definition: z.string().optional(),
      formula: z.string().nullable().optional(),
      example: z.string().nullable().optional(),
      solution: z.string().nullable().optional(),
      hints: z.array(z.string()).optional(),
      imageUrl: z.string().nullable().optional(),
      order: z.number().optional(),
    }).parse(req.body);
    return prisma.mathConcept.update({ where: { id: cid }, data: body });
  });

  app.delete('/concepts/:cid', { preHandler: requireInstructor }, async (req) => {
    const { cid } = req.params as { cid: string };
    await prisma.mathConcept.delete({ where: { id: cid } });
    return { message: 'Đã xóa khái niệm' };
  });

  // ─── SRS REVIEW ───────────────────────────────────────────────────────────

  app.get('/topics/:id/review', { preHandler: requireAuth }, async (req) => {
    const { id: topicId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const topic = await prisma.mathTopic.findUniqueOrThrow({
      where: { id: topicId },
      include: { concepts: { orderBy: { order: 'asc' } } },
    });
    const progresses = await prisma.conceptProgress.findMany({
      where: { userId: sub, conceptId: { in: topic.concepts.map((c) => c.id) } },
    });
    const progressMap = new Map(progresses.map((p) => [p.conceptId, p]));
    return topic.concepts.map((c) => ({ ...c, progress: progressMap.get(c.id) || null }));
  });

  app.get('/review/due', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    return prisma.conceptProgress.findMany({
      where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
      include: { concept: { include: { topic: { select: { title: true, subject: true } } } } },
      orderBy: { nextReview: 'asc' },
      take: 50,
    }).then((items) => items.map((p) => ({ ...p.concept, progress: p })));
  });

  app.post('/topics/:id/study-session', { preHandler: requireAuth }, async (req) => {
    const { id: topicId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { results } = z.object({
      results: z.array(z.object({ conceptId: z.string(), quality: z.number().min(0).max(5) })),
    }).parse(req.body);

    let xpEarned = 0;
    for (const { conceptId, quality } of results) {
      const existing = await prisma.conceptProgress.findUnique({ where: { userId_conceptId: { userId: sub, conceptId } } });
      const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
      const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);
      await prisma.conceptProgress.upsert({
        where: { userId_conceptId: { userId: sub, conceptId } },
        create: { userId: sub, conceptId, ...next },
        update: next,
      });
      if (next.isLearned && !existing?.isLearned) {
        await prisma.mathUserStats.upsert({
          where: { userId: sub },
          create: { userId: sub, conceptsLearned: 1, lastStudied: new Date() },
          update: { conceptsLearned: { increment: 1 } },
        });
      }
      xpEarned += quality >= 3 ? 5 : 2;
    }
    await addXP(sub, xpEarned);
    return { xpEarned, reviewed: results.length };
  });

  // Global review session (cross-topic SRS)
  app.post('/review/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { results } = z.object({
      results: z.array(z.object({ conceptId: z.string(), quality: z.number().min(0).max(5) })),
    }).parse(req.body);

    let xpEarned = 0;
    for (const { conceptId, quality } of results) {
      const existing = await prisma.conceptProgress.findUnique({ where: { userId_conceptId: { userId: sub, conceptId } } });
      const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
      const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);
      await prisma.conceptProgress.upsert({
        where: { userId_conceptId: { userId: sub, conceptId } },
        create: { userId: sub, conceptId, ...next },
        update: next,
      });
      if (next.isLearned && !existing?.isLearned) {
        await prisma.mathUserStats.upsert({
          where: { userId: sub },
          create: { userId: sub, conceptsLearned: 1, lastStudied: new Date() },
          update: { conceptsLearned: { increment: 1 } },
        });
      }
      xpEarned += quality >= 3 ? 5 : 2;
    }
    await addXP(sub, xpEarned);
    return { xpEarned, reviewed: results.length };
  });

  // ─── EXERCISES ────────────────────────────────────────────────────────────

  app.get('/exercises', { preHandler: requireAuth }, async (req) => {
    const q = req.query as { subject?: string; type?: string; grade?: string; courseId?: string; topicId?: string; mine?: string };
    const { sub } = req.user as { sub: string };
    const where: any = { isPublic: true };
    if (q.subject) where.subject = q.subject;
    if (q.type) where.type = q.type;
    if (q.grade) where.grade = parseInt(q.grade);
    if (q.courseId) where.courseId = q.courseId;
    if (q.topicId) where.topicId = q.topicId;
    if (q.mine === 'true') { delete where.isPublic; where.createdBy = sub; }
    return prisma.mathExercise.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } }, _count: { select: { questions: true, attempts: true } } },
    });
  });

  app.get('/exercises/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    return prisma.mathExercise.findUniqueOrThrow({
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
      subject: z.enum(SUBJECT_ENUM).default('ARITHMETIC'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('beginner'),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      topicId: z.string().optional(),
      courseId: z.string().optional(),
      questions: z.array(z.object({
        content: z.string().min(1),
        imageUrl: z.string().optional(),
        options: z.any().optional(),
        answer: z.any(),
        solution: z.string().optional(),
        hints: z.array(z.string()).default([]),
        difficulty: z.number().min(1).max(5).default(1),
        order: z.number().default(0),
        points: z.number().default(1),
      })).default([]),
    }).parse(req.body);
    const { questions, ...exerciseData } = body;
    const exercise = await prisma.mathExercise.create({
      data: { ...exerciseData, createdBy: sub, questions: { create: questions as any } },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return reply.status(201).send(exercise);
  });

  // Auto-generate exercises from topic
  app.post('/exercises/generate', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      topicId: z.string(),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const),
      questionCount: z.number().min(2).max(50).default(10),
      title: z.string().min(2),
      description: z.string().optional(),
      level: z.string().default('beginner'),
      timeLimit: z.number().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);

    const topic = await prisma.mathTopic.findUniqueOrThrow({
      where: { id: body.topicId },
      include: { concepts: true },
    });

    // Thử AI trước, fallback sang rule-based nếu thất bại
    let questions: any[] | { error: string };
    const aiQuestions = await generateMathQuestionsWithAI(topic.concepts as any, body.type, body.questionCount);
    if (aiQuestions && aiQuestions.length > 0) {
      questions = aiQuestions;
    } else {
      questions = buildMathQuestions(topic.concepts, body.type, body.questionCount);
      if ('error' in (questions as any)) throw { statusCode: 400, message: (questions as any).error };
    }

    const exercise = await prisma.mathExercise.create({
      data: {
        title: body.title, description: body.description, type: body.type as any,
        subject: topic.subject, grade: topic.grade, level: body.level,
        timeLimit: body.timeLimit, isPublic: body.isPublic,
        topicId: body.topicId, courseId: body.courseId, createdBy: sub,
        questions: { create: questions as any },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    return reply.status(201).send(exercise);
  });

  // Auto-generate all types at once from topic
  app.post('/topics/:id/generate-all', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: topicId } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const body = z.object({
      questionCount: z.number().min(2).max(20).default(10),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);

    const topic = await prisma.mathTopic.findUniqueOrThrow({
      where: { id: topicId },
      include: { concepts: true },
    });

    if (topic.concepts.length < 2) throw { statusCode: 400, message: 'Cần ít nhất 2 khái niệm để tạo bài tập' };

    const types: Array<'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'TRUE_FALSE' | 'PROOF_STEP'> = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'];
    const generated: any[] = [];
    const errors: any[] = [];

    for (const type of types) {
      // Thử AI trước, fallback sang rule-based
      const aiQ = await generateMathQuestionsWithAI(topic.concepts as any, type, body.questionCount);
      const questions = (aiQ && aiQ.length > 0) ? aiQ : buildMathQuestions(topic.concepts, type, body.questionCount);
      if ('error' in (questions as any)) { errors.push({ type, error: (questions as any).error }); continue; }
      try {
        const typeLabel: Record<string, string> = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền số', TRUE_FALSE: 'Đúng/Sai', PROOF_STEP: 'Chứng minh' };
        const ex = await prisma.mathExercise.create({
          data: {
            title: `${topic.title} — ${typeLabel[type]}`,
            type: type as any, subject: topic.subject, grade: topic.grade,
            level: topic.level, isPublic: body.isPublic,
            topicId, courseId: body.courseId, createdBy: sub,
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
      timeLimit: z.number().nullable().optional(),
      isPublic: z.boolean().optional(),
      level: z.string().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    return prisma.mathExercise.update({ where: { id }, data: body });
  });

  app.delete('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const ex = await prisma.mathExercise.findUniqueOrThrow({ where: { id } });
    if (ex.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.mathExercise.delete({ where: { id } });
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

    const exercise = await prisma.mathExercise.findUniqueOrThrow({
      where: { id: exerciseId }, include: { questions: true },
    });

    let totalPoints = 0, earnedPoints = 0;
    const results: Record<string, { correct: boolean; correctAnswer: any; solution?: string | null }> = {};

    for (const q of exercise.questions) {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      let correct = false;
      const expected = String(q.answer).toLowerCase().trim();
      const given = String(userAnswer ?? '').toLowerCase().trim();

      if (exercise.type === 'MULTIPLE_CHOICE' || exercise.type === 'TRUE_FALSE') {
        correct = given === expected;
      } else if (exercise.type === 'FILL_BLANK' || exercise.type === 'CALCULATION') {
        const numA = parseFloat(expected), numB = parseFloat(given);
        correct = !isNaN(numA) && !isNaN(numB) ? Math.abs(numA - numB) < 0.001 : given === expected;
      } else {
        // PROOF_STEP: credit if answered with >= 10 chars
        correct = given.length >= 10;
      }
      if (correct) earnedPoints += q.points;
      results[q.id] = { correct, correctAnswer: q.answer, solution: q.solution };
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const xpEarned = Math.round(score / 10);

    const attempt = await prisma.mathAttempt.create({
      data: { userId: sub, exerciseId, answers, score, timeTaken, xpEarned },
    });
    await prisma.mathUserStats.upsert({
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
    return prisma.mathAttempt.findMany({
      where: { exerciseId, userId: sub },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });
  });

  // ─── COURSE CONTENT ───────────────────────────────────────────────────────

  app.get('/course/:courseId/content', { preHandler: requireAuth }, async (req) => {
    const { courseId } = req.params as { courseId: string };
    const [topics, exercises] = await Promise.all([
      prisma.mathTopic.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { concepts: true } } } }),
      prisma.mathExercise.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { questions: true } } } }),
    ]);
    return { topics, exercises };
  });

  app.get('/mine', { preHandler: requireInstructor }, async (req) => {
    const { sub } = req.user as { sub: string };
    const [topics, exercises] = await Promise.all([
      prisma.mathTopic.findMany({ where: { createdBy: sub }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, subject: true, grade: true, courseId: true, _count: { select: { concepts: true } } } }),
      prisma.mathExercise.findMany({ where: { createdBy: sub }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, type: true, subject: true, courseId: true, _count: { select: { questions: true } } } }),
    ]);
    return { topics, exercises };
  });

  // ─── ADMIN ALL ────────────────────────────────────────────────────────────

  app.get('/all', { preHandler: requireAuth }, async (req) => {
    const [topics, exercises, userStats] = await Promise.all([
      prisma.mathTopic.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } }, _count: { select: { concepts: true, exercises: true } } },
      }),
      prisma.mathExercise.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } }, _count: { select: { questions: true, attempts: true } } },
      }),
      prisma.mathUserStats.aggregate({ _count: { userId: true }, _sum: { exercisesDone: true, conceptsLearned: true } }),
    ]);
    return { topics, exercises, userStats };
  });

  // ─── CURRICULUM FILE IMPORT ───────────────────────────────────────────────

  app.post('/import', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file();
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const content = (await data.toBuffer()).toString('utf-8');

    let curriculum: any[];
    try {
      const parsed = JSON.parse(content);
      curriculum = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw { statusCode: 400, message: 'File phải có định dạng JSON hợp lệ' };
    }

    const entrySchema = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      subject: z.enum(SUBJECT_ENUM).default('ARITHMETIC'),
      grade: z.number().min(1).max(12).default(1),
      level: z.string().default('beginner'),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
      generateExercises: z.boolean().default(false),
      concepts: z.array(z.object({
        name: z.string().min(1),
        definition: z.string().min(1),
        formula: z.string().optional(),
        example: z.string().optional(),
        solution: z.string().optional(),
        hints: z.array(z.string()).default([]),
      })).default([]),
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { concepts, generateExercises, ...topicData } = entrySchema.parse(entry);
        const topic = await prisma.mathTopic.create({
          data: { ...topicData, createdBy: sub, concepts: { create: concepts.map((c, i) => ({ ...c, order: i })) } },
          include: { concepts: true, _count: { select: { concepts: true } } },
        });

        let exercisesGenerated = 0;
        if (generateExercises && topic.concepts.length >= 2) {
          const genTypes = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const;
          for (const type of genTypes) {
            const questions = buildMathQuestions(topic.concepts, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.mathExercise.create({
                data: {
                  title: `${topic.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, subject: topic.subject, grade: topic.grade,
                  level: topic.level, isPublic: topic.isPublic,
                  topicId: topic.id, courseId: topic.courseId ?? undefined, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }

        results.push({ topicId: topic.id, title: topic.title, conceptsCreated: topic._count.concepts, exercisesGenerated });
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
    try { text = await extractText(buffer, data.mimetype, data.filename); }
    catch (e: any) { throw { statusCode: 400, message: `Không đọc được file: ${e.message}` }; }
    if (!text?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };
    return reply.send({ text: text.trim(), filename: data.filename });
  });

  // ─── Smart Import (PDF / DOCX / XLSX / PPTX → AI structured) ─────────────
  app.post('/import-smart', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const q = req.query as { grade?: string; subject?: string; generateExercises?: string };
    const opts = {
      grade: q.grade ? parseInt(q.grade) : undefined,
      subject: q.subject,
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

    let curriculum: ReturnType<typeof structureMathWithAI> extends Promise<infer T> ? T : never;
    try {
      curriculum = await structureMathWithAI(rawText, opts);
    } catch (e: any) {
      throw { statusCode: 500, message: `AI phân tích thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { concepts, generateExercises, ...topicData } = entry;
        const validConcepts = (concepts ?? []).filter((c) => c.name && c.definition);
        const topic = await prisma.mathTopic.create({
          data: {
            title: topicData.title,
            subject: (topicData.subject as any) ?? 'ARITHMETIC',
            grade: topicData.grade ?? opts.grade ?? 5,
            level: topicData.level ?? 'beginner',
            description: topicData.description,
            isPublic: true,
            createdBy: sub,
            concepts: { create: validConcepts.map((c, i) => ({ ...c, order: i, hints: c.hints ?? [] })) },
          },
          include: { concepts: true, _count: { select: { concepts: true } } },
        });

        let exercisesGenerated = 0;
        if (generateExercises && topic.concepts.length >= 2) {
          const genTypes = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const;
          for (const type of genTypes) {
            const questions = buildMathQuestions(topic.concepts, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.mathExercise.create({
                data: {
                  title: `${topic.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, subject: topic.subject, grade: topic.grade,
                  level: topic.level, isPublic: true,
                  topicId: topic.id, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }
        results.push({ topicId: topic.id, title: topic.title, conceptsCreated: topic._count.concepts, exercisesGenerated, concepts: topic.concepts });
      } catch (e: any) {
        errors.push({ entry: entry?.title || '(không rõ)', error: e.message });
      }
    }

    return reply.status(201).send({ imported: results.length, errors, results });
  });

  // ─── DOCUMENT LIBRARY (upload, view, on-demand AI) ───────────────────────

  // Upload doc → store in MinIO, extract text, save record
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
      throw { statusCode: 400, message: 'Định dạng file không được hỗ trợ (PDF, Word, Excel, PowerPoint, ảnh)' };
    }

    const buffer = await data.toBuffer();
    const ext = data.filename.split('.').pop()?.toLowerCase() || 'bin';
    const key = `math-docs/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const bucket = env.MINIO_BUCKET_MATH_DOCS;

    await minioClient.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': data.mimetype });

    let extractedText: string | null = null;
    try {
      const text = await extractText(buffer, data.mimetype, data.filename);
      extractedText = text?.trim() || null;
    } catch { /* image or unsupported — text stays null */ }

    const doc = await (prisma as any).mathDocument.create({
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

  // List documents
  app.get('/docs', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const docs = await (prisma as any).mathDocument.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, originalName: true, mimetype: true, size: true,
        status: true, grade: true, subject: true, errorMsg: true,
        createdAt: true, updatedAt: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    return reply.send(docs);
  });

  // Get signed view URL
  app.get('/docs/:id/view-url', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).mathDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    const url = await getSignedUrl(doc.bucket, doc.storedKey, 1800);
    return reply.send({ url, mimetype: doc.mimetype, originalName: doc.originalName });
  });

  // Get extracted text
  app.get('/docs/:id/text', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).mathDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    return reply.send({ text: doc.extractedText, originalName: doc.originalName });
  });

  // Trigger AI analysis on stored document
  app.post('/docs/:id/analyze', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).mathDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    if (doc.status === 'analyzing') throw { statusCode: 409, message: 'Đang phân tích, vui lòng chờ' };
    if (!doc.extractedText?.trim()) throw { statusCode: 400, message: 'Tài liệu không có nội dung văn bản để phân tích' };

    const q = req.query as { grade?: string; subject?: string; generateExercises?: string };
    const opts = {
      grade: q.grade ? parseInt(q.grade) : undefined,
      subject: q.subject || doc.subject || undefined,
      generateExercises: q.generateExercises !== 'false',
    };

    await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'analyzing', updatedAt: new Date() } });

    let curriculum: any[];
    try {
      curriculum = await structureMathWithAI(doc.extractedText, opts);
    } catch (e: any) {
      await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'error', errorMsg: e.message, updatedAt: new Date() } });
      throw { statusCode: 500, message: `AI phân tích thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { concepts, generateExercises, ...topicData } = entry;
        const validConcepts = (concepts ?? []).filter((c: any) => c.name && c.definition);
        const topic = await prisma.mathTopic.create({
          data: {
            title: topicData.title,
            subject: (topicData.subject as any) ?? 'ARITHMETIC',
            grade: topicData.grade ?? opts.grade ?? 5,
            level: topicData.level ?? 'beginner',
            description: topicData.description,
            isPublic: true,
            createdBy: sub,
            concepts: { create: validConcepts.map((c: any, i: number) => ({ ...c, order: i, hints: c.hints ?? [] })) },
          },
          include: { concepts: true, _count: { select: { concepts: true } } },
        });

        let exercisesGenerated = 0;
        if (generateExercises && topic.concepts.length >= 2) {
          const genTypes = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const;
          for (const type of genTypes) {
            const questions = buildMathQuestions(topic.concepts, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.mathExercise.create({
                data: {
                  title: `${topic.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, subject: topic.subject, grade: topic.grade,
                  level: topic.level, isPublic: true,
                  topicId: topic.id, createdBy: sub,
                  questions: { create: questions as any },
                },
              });
              exercisesGenerated++;
            }
          }
        }
        results.push({ topicId: topic.id, title: topic.title, conceptsCreated: topic._count.concepts, exercisesGenerated, concepts: topic.concepts });
      } catch (e: any) {
        errors.push({ entry: entry?.title || '(không rõ)', error: e.message });
      }
    }

    await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'analyzed', updatedAt: new Date() } });
    return reply.status(201).send({ imported: results.length, errors, results });
  });

  // Delete document
  app.delete('/docs/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const doc = await (prisma as any).mathDocument.findUnique({ where: { id } });
    if (!doc) throw { statusCode: 404, message: 'Không tìm thấy tài liệu' };
    if (role !== 'ADMIN' && doc.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    try { await deleteObject(doc.bucket, doc.storedKey); } catch { /* minio may not have it */ }
    await (prisma as any).mathDocument.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
