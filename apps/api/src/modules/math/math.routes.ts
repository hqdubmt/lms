import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { extractText, extractMarkdown, generateMathQuestionsWithAI } from '../../services/file-import';
import {
  detectCurriculum, mathClean, unicodeNormalize,
  processMathDocument, generateQuestionVariations,
  computeProfileUpdate, scoreLesson, lessonToEntry,
  splitIntoLessons, isContentRich, parserConfidenceScore,
  type ProcessOpts,
} from '../../services/math-pipeline';
import { MATH_GOLD_DATASET } from '../../data/math-gold-dataset';
import {
  classifyItemErrors, buildBatchSummary,
  type ErrorType,
} from '../../services/error-classifier';
import {
  embedText, upsertEntry, searchConcepts, ragGenerate,
  getIndexStats, isEmbedModelAvailable,
} from '../../services/rag';
import { aiChatOnce } from '../../services/ai-provider';
import { getOrSet, cacheDelPattern } from '../../services/cache';
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
      // Prefer example-based question over pure definition recall
      const questionText = c.example
        ? `Ví dụ sau thuộc khái niệm nào? "${c.example.slice(0, 150)}"`
        : `Công thức/khái niệm nào phù hợp với: "${c.definition.slice(0, 120)}${c.definition.length > 120 ? '...' : ''}"?`;
      return {
        content: questionText,
        options, answer: c.name,
        solution: c.formula ? `${c.name}: ${c.formula}` : c.definition,
        hints: c.hints, order: i, points: 1, difficulty: 1,
      };
    }
    if (type === 'TRUE_FALSE') {
      const useTrue = Math.random() > 0.5;
      let content: string, answer: string;
      if (useTrue) {
        // Use formula or example for true statement — more useful than definition repeat
        const stmt = c.formula ? `Công thức: ${c.formula}` : c.definition.slice(0, 120);
        content = `Đúng hay Sai: "${c.name}" có ${stmt}`;
        answer = 'Đúng';
      } else {
        const other = shuffleArr(concepts.filter((x) => x.id !== c.id))[0];
        const wrongStmt = other?.formula ? `công thức: ${other.formula}` : (other?.definition.slice(0, 100) ?? 'định nghĩa không chính xác');
        content = `Đúng hay Sai: "${c.name}" có ${wrongStmt}`;
        answer = 'Sai';
      }
      return { content, options: ['Đúng', 'Sai'], answer, solution: c.formula ? `Công thức đúng: ${c.formula}` : c.definition, hints: c.hints, order: i, points: 1, difficulty: 1 };
    }
    if (type === 'FILL_BLANK') {
      // Prefer formula blanks — they test actual math knowledge
      if (c.formula) {
        const parts = c.formula.split(/([=+\-×÷*/^()\s]+)/);
        const tokenIndices = parts
          .map((p, idx) => (/\d|[a-zA-Z]/.test(p) ? idx : -1))
          .filter((idx) => idx >= 0);
        if (tokenIndices.length >= 2) {
          const pick = Math.floor(Math.random() * tokenIndices.length);
          const partIdx = tokenIndices[pick];
          const answer = parts[partIdx];
          // Replace only the specific position in parts — no ambiguity with repeated tokens
          const filledParts = [...parts];
          filledParts[partIdx] = '___';
          const filled = filledParts.join('');
          return { content: `Điền vào công thức (${c.name}):\n${filled}`, answer, solution: `Công thức đầy đủ: ${c.formula}`, hints: c.hints, order: i, points: 1, difficulty: 2 };
        }
      }
      if (c.example) {
        return { content: `Hoàn thành ví dụ (${c.name}):\n${c.example.replace(/\d+(?:\.\d+)?$/, '___')}`, answer: c.example.match(/\d+(?:\.\d+)?$/)?.[0] ?? c.name, solution: c.example, hints: c.hints, order: i, points: 1, difficulty: 2 };
      }
      return { content: `Điền tên khái niệm: ${c.definition.slice(0, 100)}`, answer: c.name, solution: c.definition, hints: c.hints, order: i, points: 1, difficulty: 1 };
    }
    if (type === 'CALCULATION') {
      // Only generate CALCULATION questions when example has numeric content
      if (c.example) {
        const numMatch = c.example.match(/\d+(?:\.\d+)?/g);
        const lastNum = numMatch?.[numMatch.length - 1];
        if (lastNum) {
          // Replace the last number in example with '?' using exact string replacement
          const lastIdx = c.example.lastIndexOf(lastNum);
          const content = c.example.slice(0, lastIdx) + '?' + c.example.slice(lastIdx + lastNum.length);
          return {
            content: `Tính (áp dụng ${c.name}):\n${content}`,
            answer: lastNum,
            solution: c.example,
            hints: c.hints, order: i, points: 2, difficulty: 2,
          };
        }
      }
      // Fall back to PROOF_STEP when no numeric content available — CALCULATION needs numbers
      return {
        content: c.example ? `Giải bài toán:\n${c.example}` : `Giải thích và trình bày: ${c.name}`,
        answer: c.solution || c.definition,
        solution: c.solution,
        hints: c.hints, order: i, points: 2, difficulty: 3,
      };
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

const SUBJECT_ENUM = ['ARITHMETIC', 'ALGEBRA', 'GEOMETRY', 'TRIGONOMETRY', 'CALCULUS', 'STATISTICS', 'NUMBER_THEORY', 'COMBINATORICS', 'MEASUREMENT', 'WORD_PROBLEM', 'LOGIC'] as const;
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
    return getOrSet('math:leaderboard', 300, () =>
      prisma.mathUserStats.findMany({
        orderBy: { xp: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      })
    );
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
    const isMine = q.mine === 'true';
    const cacheKey = isMine
      ? `math:topics:mine:${sub}`
      : `math:topics:pub:${q.subject ?? ''}:${q.grade ?? ''}:${q.courseId ?? ''}`;
    return getOrSet(cacheKey, 60, () =>
      prisma.mathTopic.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true } }, _count: { select: { concepts: true, exercises: true } } },
      })
    );
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
      lessonType: z.string().optional(),
      textbook: z.string().optional(),
      grade: z.number().min(1).max(9).default(1),
      level: z.string().default('beginner'),
      coverUrl: z.string().optional(),
      isPublic: z.boolean().default(true),
      courseId: z.string().optional(),
    }).parse(req.body);
    const topic = await prisma.mathTopic.create({ data: { ...body, createdBy: sub } });
    await cacheDelPattern('math:topics:*');
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
      lessonType: z.string().nullable().optional(),
      textbook: z.string().nullable().optional(),
      grade: z.number().min(1).max(9).optional(),
      level: z.string().optional(),
      coverUrl: z.string().nullable().optional(),
      isPublic: z.boolean().optional(),
      courseId: z.string().nullable().optional(),
    }).parse(req.body);
    const updated = await prisma.mathTopic.update({ where: { id }, data: body });
    await cacheDelPattern('math:topics:*');
    return updated;
  });

  app.delete('/topics/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const topic = await prisma.mathTopic.findUniqueOrThrow({ where: { id } });
    if (topic.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.mathTopic.delete({ where: { id } });
    await cacheDelPattern('math:topics:*');
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
    const isMine = q.mine === 'true';
    const cacheKey = isMine
      ? `math:exercises:mine:${sub}`
      : `math:exercises:pub:${q.subject ?? ''}:${q.type ?? ''}:${q.grade ?? ''}:${q.courseId ?? ''}:${q.topicId ?? ''}`;
    return getOrSet(cacheKey, 60, () =>
      prisma.mathExercise.findMany({
        where, orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true } }, _count: { select: { questions: true, attempts: true } } },
      })
    );
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
    await cacheDelPattern('math:exercises:*');
    return reply.status(201).send(exercise);
  });

  // Auto-generate exercises from topic
  app.post('/exercises/generate', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      topicId: z.string(),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'CALCULATION', 'PROOF_STEP'] as const),
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

    const types: Array<'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'TRUE_FALSE' | 'CALCULATION' | 'PROOF_STEP'> = ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'CALCULATION', 'PROOF_STEP'];
    const generated: any[] = [];
    const errors: any[] = [];

    for (const type of types) {
      // Thử AI trước, fallback sang rule-based
      const aiQ = await generateMathQuestionsWithAI(topic.concepts as any, type, body.questionCount);
      const questions = (aiQ && aiQ.length > 0) ? aiQ : buildMathQuestions(topic.concepts, type, body.questionCount);
      if ('error' in (questions as any)) { errors.push({ type, error: (questions as any).error }); continue; }
      try {
        const typeLabel: Record<string, string> = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền số', TRUE_FALSE: 'Đúng/Sai', CALCULATION: 'Tính toán', PROOF_STEP: 'Chứng minh' };
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
    const updated = await prisma.mathExercise.update({ where: { id }, data: body });
    await cacheDelPattern('math:exercises:*');
    return updated;
  });

  app.delete('/exercises/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const ex = await prisma.mathExercise.findUniqueOrThrow({ where: { id } });
    if (ex.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.mathExercise.delete({ where: { id } });
    await cacheDelPattern('math:exercises:*');
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

      const hasOptions = Array.isArray((q as any).options) && (q as any).options.length > 0;
      if (exercise.type === 'MULTIPLE_CHOICE' || exercise.type === 'TRUE_FALSE' || hasOptions) {
        correct = given === expected;
      } else if (exercise.type === 'FILL_BLANK' || exercise.type === 'CALCULATION') {
        const numA = parseFloat(expected), numB = parseFloat(given);
        correct = !isNaN(numA) && !isNaN(numB) ? Math.abs(numA - numB) < 0.001 : given === expected;
      } else {
        // PROOF_STEP open-ended: credit if answered with >= 10 chars
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
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
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
      lessonType: z.string().optional(),
      textbook: z.string().optional(),
      grade: z.number().min(1).max(9).default(1),
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
        steps: z.array(z.string()).optional(),
        hints: z.array(z.string()).default([]),
      })).default([]),
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of curriculum) {
      try {
        const { concepts, generateExercises, ...topicData } = entrySchema.parse(entry);
        const topic = await prisma.mathTopic.create({
          data: {
            ...topicData, createdBy: sub,
            concepts: {
              create: concepts.map((c, i) => {
                const { steps, ...conceptData } = c as any;
                return { ...conceptData, order: i };
              }),
            },
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
    try { text = await extractMarkdown(buffer, data.mimetype, data.filename); }
    catch (e: any) { throw { statusCode: 400, message: `Không đọc được file: ${e.message}` }; }
    if (!text?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };
    // Auto-detect curriculum on preview so UI can pre-fill grade/textbook
    const normalized = unicodeNormalize(mathClean(text));
    const curriculum = detectCurriculum(normalized);
    return reply.send({ text: normalized.trim(), filename: data.filename, curriculum });
  });

  // ─── Smart Import (PDF / DOCX / XLSX / PPTX → AI structured) ─────────────
  app.post('/import-smart', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await req.file({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB
    if (!data) throw { statusCode: 400, message: 'Không có file' };

    const q = req.query as { grade?: string; subject?: string; generateExercises?: string };

    const buffer = await data.toBuffer();
    let rawText: string;
    try {
      rawText = await extractMarkdown(buffer, data.mimetype, data.filename);
    } catch (e: any) {
      throw { statusCode: 400, message: `Không đọc được file: ${e.message}` };
    }

    if (!rawText?.trim()) throw { statusCode: 400, message: 'File không có nội dung văn bản' };

    // Curriculum Detector + full pipeline
    const normalizedText = unicodeNormalize(mathClean(rawText));
    const detectedCurriculum = detectCurriculum(normalizedText);
    const pipelineOpts: ProcessOpts = {
      grade: q.grade ? parseInt(q.grade) : (detectedCurriculum.grade ?? undefined),
      subject: q.subject || detectedCurriculum.subject || undefined,
      generateExercises: q.generateExercises !== 'false',
      userId: sub,
    };

    let pipelineResult: Awaited<ReturnType<typeof processMathDocument>>;
    try {
      pipelineResult = await processMathDocument(rawText, pipelineOpts);
    } catch (e: any) {
      throw { statusCode: 500, message: `Pipeline thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of pipelineResult.entries) {
      try {
        const { concepts, generateExercises, lessonType, textbook, ...topicData } = entry;
        const validConcepts = (concepts ?? []).filter((c) => c.name && c.definition);
        const topic = await prisma.mathTopic.create({
          data: {
            title: topicData.title,
            subject: (topicData.subject as any) ?? 'ARITHMETIC',
            lessonType: lessonType ?? null,
            textbook: textbook ?? null,
            grade: topicData.grade ?? pipelineOpts.grade ?? 5,
            level: topicData.level ?? 'beginner',
            description: topicData.description,
            isPublic: true, createdBy: sub,
            concepts: { create: validConcepts.map((c, i) => {
              const { steps, ...rest } = c as any;
              return { ...rest, order: i, hints: c.hints ?? [] };
            }) },
          },
          include: { concepts: true, _count: { select: { concepts: true } } },
        });
        let exercisesGenerated = 0;
        if (generateExercises && topic.concepts.length >= 2) {
          for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const) {
            const questions = buildMathQuestions(topic.concepts, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.mathExercise.create({
                data: {
                  title: `${topic.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, subject: topic.subject, grade: topic.grade,
                  level: topic.level, isPublic: true, topicId: topic.id, createdBy: sub,
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

    // Analytics Engine — persist import log
    await (prisma as any).mathImportLog.create({
      data: {
        totalLessons: pipelineResult.analytics.totalLessons,
        validLessons: pipelineResult.analytics.validLessons,
        hallucinationCount: pipelineResult.analytics.hallucinationCount,
        duplicateCount: pipelineResult.analytics.duplicateCount,
        repairCount: pipelineResult.analytics.repairCount,
        retryTotal: pipelineResult.analytics.retryTotal,
        droppedByQualityGate: pipelineResult.analytics.droppedByQualityGate,
        avgQualityScore: pipelineResult.analytics.avgQualityScore,
        avgParserScore: pipelineResult.analytics.avgParserScore,
        textbook: pipelineResult.curriculum.textbook,
        grade: pipelineResult.curriculum.grade,
        createdBy: sub,
      },
    });

    return reply.status(201).send({
      imported: results.length, errors, results,
      curriculum: pipelineResult.curriculum,
      analytics: pipelineResult.analytics,
    });
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
      const text = await extractMarkdown(buffer, data.mimetype, data.filename);
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
    const normalizedText = unicodeNormalize(mathClean(doc.extractedText));
    const detected = detectCurriculum(normalizedText);
    const pipelineOpts: ProcessOpts = {
      grade: q.grade ? parseInt(q.grade) : (detected.grade ?? undefined),
      subject: q.subject || doc.subject || detected.subject || undefined,
      generateExercises: q.generateExercises !== 'false',
      userId: sub,
    };

    await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'analyzing', updatedAt: new Date() } });

    let pipelineResult: Awaited<ReturnType<typeof processMathDocument>>;
    try {
      pipelineResult = await processMathDocument(doc.extractedText, pipelineOpts);
    } catch (e: any) {
      await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'error', errorMsg: e.message, updatedAt: new Date() } });
      throw { statusCode: 500, message: `Pipeline thất bại: ${e.message}` };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const entry of pipelineResult.entries) {
      try {
        const { concepts, generateExercises, lessonType, textbook, ...topicData } = entry;
        const validConcepts = (concepts ?? []).filter((c: any) => c.name && c.definition);
        const topic = await prisma.mathTopic.create({
          data: {
            title: topicData.title,
            subject: (topicData.subject as any) ?? 'ARITHMETIC',
            lessonType: lessonType ?? null, textbook: textbook ?? null,
            grade: topicData.grade ?? pipelineOpts.grade ?? 5,
            level: topicData.level ?? 'beginner',
            description: topicData.description,
            isPublic: true, createdBy: sub,
            concepts: { create: validConcepts.map((c: any, i: number) => {
              const { steps, ...rest } = c;
              return { ...rest, order: i, hints: c.hints ?? [] };
            }) },
          },
          include: { concepts: true, _count: { select: { concepts: true } } },
        });
        let exercisesGenerated = 0;
        if (generateExercises && topic.concepts.length >= 2) {
          for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'PROOF_STEP'] as const) {
            const questions = buildMathQuestions(topic.concepts, type, 10);
            if (!('error' in (questions as any))) {
              await prisma.mathExercise.create({
                data: {
                  title: `${topic.title} — ${TYPE_IMPORT_LABEL[type]}`,
                  type: type as any, subject: topic.subject, grade: topic.grade,
                  level: topic.level, isPublic: true, topicId: topic.id, createdBy: sub,
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

    // Analytics Engine
    await (prisma as any).mathImportLog.create({
      data: {
        documentId: id,
        totalLessons: pipelineResult.analytics.totalLessons,
        validLessons: pipelineResult.analytics.validLessons,
        hallucinationCount: pipelineResult.analytics.hallucinationCount,
        duplicateCount: pipelineResult.analytics.duplicateCount,
        repairCount: pipelineResult.analytics.repairCount,
        retryTotal: pipelineResult.analytics.retryTotal,
        droppedByQualityGate: pipelineResult.analytics.droppedByQualityGate,
        avgQualityScore: pipelineResult.analytics.avgQualityScore,
        avgParserScore: pipelineResult.analytics.avgParserScore,
        textbook: pipelineResult.curriculum.textbook,
        grade: pipelineResult.curriculum.grade,
        createdBy: sub,
      },
    });

    await (prisma as any).mathDocument.update({ where: { id }, data: { status: 'analyzed', updatedAt: new Date() } });
    return reply.status(201).send({
      imported: results.length, errors, results,
      curriculum: pipelineResult.curriculum,
      analytics: pipelineResult.analytics,
    });
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

  // ─── ANALYTICS ENGINE (Giai đoạn 2 — toantiep.md) ───────────────────────

  app.get('/analytics', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const logs = await (prisma as any).mathImportLog.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

    // toantiep.md Giai đoạn 2 — 4 key rates
    const parserSuccessRate = Math.round(((totalChunks - totalRepair) / totalChunks) * 1000) / 10;
    const jsonValidRate = Math.round(((totalChunks - totalDropped) / totalChunks) * 1000) / 10;
    const qualityGatePassRate = Math.round((totalValid / totalChunks) * 1000) / 10;
    const hallucinationRate = Math.round((totalHalluc / totalChunks) * 1000) / 10;
    const duplicateRate = Math.round((totalDup / totalChunks) * 1000) / 10;

    return reply.send({
      total,
      // 4 rates — toantiep.md Giai đoạn 2
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
    const profile = await (prisma as any).studentMathProfile.findUnique({ where: { userId: sub } });
    return reply.send(profile ?? { userId: sub, weakTopics: [], strongTopics: [], avgScore: 0, totalAttempts: 0 });
  });

  // ─── SYNTHETIC DATA ENGINE ───────────────────────────────────────────────

  app.post('/topics/:id/generate-variations', { preHandler: requireInstructor }, async (req, reply) => {
    const { id: topicId } = req.params as { id: string };
    const { count } = z.object({ count: z.number().min(1).max(10).default(3) }).parse(req.body);

    const topic = await prisma.mathTopic.findUniqueOrThrow({
      where: { id: topicId },
      include: { concepts: { take: 5 } },
    });

    // Build a ToanLesson-like object from DB topic for variation generation
    const lessonForVariation = {
      subject: 'Toán', grade: topic.grade,
      lesson_type: topic.lessonType ?? 'arithmetic',
      topic: topic.title,
      textbook: topic.textbook,
      knowledge: topic.concepts.map((c) => ({
        name: c.name, definition: c.definition,
        formula: c.formula ?? '', example: c.example ?? '',
        steps: [], hints: c.hints ?? [],
      })),
      questions: [],
    } as any;

    const variations = await generateQuestionVariations(lessonForVariation, count);
    return reply.send({ topicId, count: variations.length, questions: variations });
  });

  // ─── Update Student Profile on attempt ───────────────────────────────────
  // (Hooks into existing attempt scoring)
  app.post('/profile/update', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { lessonType, score } = z.object({
      lessonType: z.string(),
      score: z.number().min(0).max(100),
    }).parse(req.body);

    const current = await (prisma as any).studentMathProfile.findUnique({ where: { userId: sub } }) ??
      { weakTopics: [], strongTopics: [], avgScore: 0, totalAttempts: 0 };

    const update = computeProfileUpdate(current, lessonType, score);
    const profile = await (prisma as any).studentMathProfile.upsert({
      where: { userId: sub },
      create: { userId: sub, ...update },
      update,
    });
    return reply.send(profile);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // muctieutoan.md — Step 1: TEST PARSER
  // POST /math/test-parser  { text } or file upload
  // Returns: chunks, parsed concepts, validation report
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/test-parser', { preHandler: requireInstructor }, async (req, reply) => {
    const { text, grade } = z.object({
      text: z.string().min(10),
      grade: z.number().min(1).max(9).optional(),
    }).parse(req.body);

    const cleaned = unicodeNormalize(mathClean(text));
    const curriculum = detectCurriculum(cleaned);
    if (grade) curriculum.grade = grade;

    const chunks = splitIntoLessons(cleaned);

    const report = chunks.map((chunk) => {
      const dummyLesson = {
        subject: 'Toán',
        grade: curriculum.grade ?? 5,
        lesson_type: 'arithmetic',
        topic: chunk.title,
        knowledge: [],
        questions: [],
      } as any;

      return {
        title: chunk.title,
        textLength: chunk.text.length,
        parserScore: chunk.parserScore,
        formulaTokens: chunk.formulaTokens,
        mathSignals: chunk.mathSignals,
        isRich: chunk.text.length >= 80,
      };
    });

    return reply.send({
      curriculum,
      totalChunks: chunks.length,
      avgParserScore: chunks.length
        ? Math.round(chunks.reduce((s, c) => s + c.parserScore, 0) / chunks.length * 100)
        : 0,
      chunks: report,
      checks: {
        '✓ Tách đúng bài học': chunks.length > 0,
        '✓ Có công thức': chunks.some(c => c.formulaTokens.length > 0),
        '✓ Parser score ≥ 0.5': chunks.some(c => c.parserScore >= 0.5),
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // muctieutoan.md — Step 4: TEST OLLAMA
  // POST /math/topics/:id/test-ollama
  // Feeds topic's JSON concepts to Ollama: explain + generate 10 exercises
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/topics/:id/test-ollama', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { count } = z.object({ count: z.number().min(1).max(20).default(10) }).parse(req.body ?? {});

    const topic = await prisma.mathTopic.findUniqueOrThrow({
      where: { id },
      include: { concepts: { orderBy: { order: 'asc' } } },
    });

    if (!topic.concepts.length) throw { statusCode: 400, message: 'Topic không có concept nào' };

    const jsonContext = JSON.stringify({
      subject: 'Toán',
      grade: topic.grade,
      topic: topic.title,
      knowledge: topic.concepts.map(c => ({
        name: c.name,
        definition: c.definition,
        formula: c.formula ?? '',
        example: c.example ?? '',
        hints: c.hints,
      })),
    }, null, 2);

    const prompt = `Dựa vào JSON này:\n\n${jsonContext}\n\nHãy:\n1. Giải thích lại từng khái niệm theo cách đơn giản cho học sinh lớp ${topic.grade}\n2. Tạo ${count} bài tập mới (khác với ví dụ có sẵn)\n3. Tạo đáp án cho mỗi bài\n\nOutput JSON:\n{\n  "explanations": [{"name":"...","explanation":"..."}],\n  "exercises": [{"question":"...","answer":"...","difficulty":"easy|medium|hard"}]\n}`;

    const raw = await aiChatOnce([
      { role: 'system', content: 'Bạn là giáo viên Toán Việt Nam. Chỉ output JSON hợp lệ. Không giải thích thêm.' },
      { role: 'user', content: prompt },
    ]);

    let parsed: any = null;
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { parsed = JSON.parse(objMatch[0]); } catch { /* keep null */ }
    }

    return reply.send({
      topicId: id,
      topicTitle: topic.title,
      grade: topic.grade,
      conceptCount: topic.concepts.length,
      ollamaResult: parsed,
      rawOutput: parsed ? undefined : raw.slice(0, 500),
      checks: {
        '✓ Parser OK': true,
        '✓ Data OK': !!parsed,
        '✓ Có explanations': !!(parsed?.explanations?.length),
        '✓ Có exercises': !!(parsed?.exercises?.length),
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // muctieutoan.md — Step 5: RAG PIPELINE
  // POST /math/rag/embed   — embed all public topics into vector store
  // GET  /math/rag/stats   — index stats
  // POST /math/rag/search  — semantic search
  // POST /math/rag/generate — RAG-based exercise generation
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/rag/embed', { preHandler: requireInstructor }, async (req, reply) => {
    const { grade, subject, limit: lim } = z.object({
      grade: z.number().min(1).max(9).optional(),
      subject: z.string().optional(),
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
    if (subject) where.subject = subject;

    const topics = await prisma.mathTopic.findMany({
      where,
      include: { concepts: true },
      take: lim,
      orderBy: { createdAt: 'desc' },
    });

    let embedded = 0, failed = 0;
    for (const topic of topics) {
      for (const concept of topic.concepts) {
        const text = [
          concept.name,
          concept.definition,
          concept.formula ?? '',
          concept.example ?? '',
          concept.hints.join(' '),
        ].filter(Boolean).join('. ');

        const vector = await embedText(text);
        if (!vector) { failed++; continue; }

        await upsertEntry({
          id: concept.id,
          text,
          vector,
          metadata: {
            topicId: topic.id,
            topicTitle: topic.title,
            conceptName: concept.name,
            grade: topic.grade,
            subject: topic.subject,
          },
        });
        embedded++;
      }
    }

    return reply.send({ ok: true, embedded, failed, topics: topics.length });
  });

  app.get('/rag/stats', { preHandler: requireInstructor }, async (_req, reply) => {
    const stats = await getIndexStats();
    return reply.send(stats);
  });

  app.post('/rag/search', { preHandler: requireAuth }, async (req, reply) => {
    const { query, topK, grade, subject } = z.object({
      query: z.string().min(2),
      topK: z.number().min(1).max(20).default(5),
      grade: z.number().min(1).max(9).optional(),
      subject: z.string().optional(),
    }).parse(req.body);

    const results = await searchConcepts(query, topK, { grade, subject });
    return reply.send({
      query,
      total: results.length,
      results: results.map(r => ({
        score: Math.round(r.score * 1000) / 1000,
        conceptName: r.entry.metadata.conceptName,
        topicTitle: r.entry.metadata.topicTitle,
        grade: r.entry.metadata.grade,
        subject: r.entry.metadata.subject,
        text: r.entry.text.slice(0, 200),
      })),
    });
  });

  app.post('/rag/generate', { preHandler: requireAuth }, async (req, reply) => {
    const { query, grade, subject, count } = z.object({
      query: z.string().min(2),
      grade: z.number().min(1).max(9).optional(),
      subject: z.string().optional(),
      count: z.number().min(1).max(20).default(10),
    }).parse(req.body);

    const result = await ragGenerate(query, grade, subject, count);
    if (!result) throw { statusCode: 503, message: 'RAG generate thất bại — embed index trống hoặc AI không khả dụng' };

    return reply.send({
      query,
      sources: result.sources,
      questionCount: result.questions.length,
      questions: result.questions,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // toantiep.md Giai đoạn 6 — BENCHMARK ENGINE
  // POST /math/benchmarks         — tạo benchmark run
  // GET  /math/benchmarks         — list all
  // GET  /math/benchmarks/:id     — detail
  // DELETE /math/benchmarks/:id  — xóa
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/benchmarks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      name: z.string().min(2).max(200),
      totalFiles: z.number().min(1),
      parseOk: z.number().min(0),
      jsonValid: z.number().min(0),
      qualityPass: z.number().min(0),
      hallucCount: z.number().min(0).default(0),
      avgQuality: z.number().min(0).max(100).default(0),
      avgParser: z.number().min(0).max(1).default(0),
      notes: z.string().optional(),
    }).parse(req.body);

    const benchmark = await (prisma as any).mathBenchmark.create({
      data: { ...body, createdBy: sub },
    });
    return reply.status(201).send(benchmark);
  });

  app.get('/benchmarks', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const benchmarks = await (prisma as any).mathBenchmark.findMany({
      where: role === 'ADMIN' ? {} : { createdBy: sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send(benchmarks);
  });

  app.get('/benchmarks/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const b = await (prisma as any).mathBenchmark.findUnique({ where: { id } });
    if (!b) throw { statusCode: 404, message: 'Không tìm thấy benchmark' };
    if (role !== 'ADMIN' && b.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    return reply.send(b);
  });

  app.delete('/benchmarks/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const b = await (prisma as any).mathBenchmark.findUnique({ where: { id } });
    if (!b) throw { statusCode: 404, message: 'Không tìm thấy benchmark' };
    if (role !== 'ADMIN' && b.createdBy !== sub) throw { statusCode: 403, message: 'Không có quyền' };
    await (prisma as any).mathBenchmark.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ketthuctoan.md — BATCH BENCHMARK RUNNER
  // POST /math/benchmarks/run-batch
  //
  // Chạy pipeline trên nhiều bài cùng lúc, ghi lại 4 chỉ số:
  //   - Parse thành công (parserScore >= 0.3 và isContentRich)
  //   - JSON hợp lệ (validateToanLesson qua)
  //   - Quality > 70 (scoreLesson >= 70, chỉ khi runAI=true)
  //   - AI Generate tốt (AI trả kết quả, chỉ khi runAI=true)
  //
  // Dùng useSeed=true để test với gold dataset chuẩn (30 bài mặc định).
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/benchmarks/run-batch', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const body = z.object({
      name: z.string().min(2).max(200).default(`Benchmark ${new Date().toLocaleDateString('vi-VN')}`),
      useSeed: z.boolean().default(false),
      runAI: z.boolean().default(false),
      notes: z.string().optional(),
      items: z.array(z.object({
        label: z.string().min(1),
        text: z.string().min(10),
        grade: z.number().min(1).max(9).default(5),
      })).optional(),
    }).parse(req.body);

    const items = body.useSeed
      ? MATH_GOLD_DATASET
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
      // testtoatiengviet.md Bước 3
      errors: ErrorType[];
      errorLabels: string[];
      error?: string;
    }> = [];

    for (const item of items) {
      try {
        const cleaned = unicodeNormalize(mathClean(item.text));
        const curriculum = detectCurriculum(cleaned);
        if (item.grade) curriculum.grade = item.grade;

        const chunks = splitIntoLessons(cleaned);
        const richChunks = chunks.filter(c => isContentRich(c.text));
        const avgParser = richChunks.length > 0
          ? richChunks.reduce((s, c) => s + c.parserScore, 0) / richChunks.length
          : 0;
        const parseOk = richChunks.length > 0 && avgParser >= 0.3;

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
            errors: errReport.errors,
            errorLabels: errReport.errorLabels,
          });
          continue;
        }

        // Full AI pipeline
        const result = await processMathDocument(item.text, {
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
    const parseOkCount = report.filter(r => r.parseOk).length;
    const jsonValidCount = report.filter(r => r.jsonValid === true).length;
    const qualityPassCount = report.filter(r => r.qualityPass === true).length;
    const aiOkCount = report.filter(r => r.aiOk === true).length;
    const avgParser = total > 0
      ? Math.round(report.reduce((s, r) => s + r.parserScore, 0) / total * 100) / 100
      : 0;
    const avgQuality = body.runAI && total > 0
      ? Math.round(report.filter(r => r.qualityScore != null).reduce((s, r) => s + (r.qualityScore ?? 0), 0) / Math.max(1, report.filter(r => r.qualityScore != null).length))
      : 0;

    // testtoatiengviet.md Bước 3: Error table
    const batchSummary = buildBatchSummary({
      total,
      parserSuccessCount: parseOkCount,
      jsonValidCount: body.runAI ? jsonValidCount : parseOkCount,
      qualityPassCount,
      errorReports: report.map(r => ({ errors: r.errors })),
    });

    // Ghi kết quả vào MathBenchmark
    const benchmark = await (prisma as any).mathBenchmark.create({
      data: {
        name: body.name,
        totalFiles: total,
        parseOk: parseOkCount,
        jsonValid: body.runAI ? jsonValidCount : parseOkCount,
        qualityPass: qualityPassCount,
        hallucCount: 0,
        avgQuality,
        avgParser,
        notes: [
          body.notes,
          `useSeed=${body.useSeed}`,
          `runAI=${body.runAI}`,
          `items=${total}`,
          batchSummary.topError ? `topError=${batchSummary.topError}` : null,
        ].filter(Boolean).join(' | '),
        createdBy: sub,
      },
    });

    // Metrics — testtoatiengviet.md Bước 2
    const metrics: Record<string, string> = {
      'Parser Success %': `${parseOkCount}/${total} (${batchSummary.parserSuccessPct}%)`,
      'JSON Valid %': body.runAI
        ? `${jsonValidCount}/${total} (${batchSummary.jsonValidPct}%)`
        : 'chưa chạy AI',
      'Quality Score %': body.runAI
        ? `${qualityPassCount}/${total} (${batchSummary.qualityPassPct}%)`
        : 'chưa chạy AI',
    };

    return reply.status(201).send({
      benchmarkId: benchmark.id,
      name: body.name,
      total,
      // testtoatiengviet.md Bước 2
      metrics,
      avgParser,
      avgQuality: body.runAI ? avgQuality : null,
      // testtoatiengviet.md Bước 3: bảng lỗi xếp hạng
      errorTable: batchSummary.errorTable,
      topError: batchSummary.topError,
      recommendation: batchSummary.recommendation,
      report,
    });
  });

  // ─── SPEED MATH GAME ─────────────────────────────────────────────────────

  type SpeedMathQ = { id: string; expression: string; answer: number; options: number[] };

  function generateSpeedMathQuestions(grade: number, count: number): SpeedMathQ[] {
    const qs: SpeedMathQ[] = [];
    const rng = () => Math.floor(Math.random() * 100);

    for (let i = 0; i < count; i++) {
      let a = rng(), b = rng(), expression = '', answer = 0;
      const op = grade <= 3 ? ['+', '-'][i % 2] : ['+', '-', '*', '/'][i % 4];

      if (op === '+') { expression = `${a} + ${b}`; answer = a + b; }
      else if (op === '-') { a = Math.max(a, b); b = Math.min(a, b); expression = `${a} - ${b}`; answer = a - b; }
      else if (op === '*') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; expression = `${a} × ${b}`; answer = a * b; }
      else { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; expression = `${a * b} ÷ ${b}`; answer = a; }

      const wrongs = new Set<number>();
      while (wrongs.size < 3) {
        const delta = Math.floor(Math.random() * 10) - 5;
        const w = answer + delta;
        if (w !== answer && w >= 0) wrongs.add(w);
      }
      const options = [...wrongs, answer].sort(() => Math.random() - 0.5);
      qs.push({ id: `q${i}`, expression, answer, options });
    }
    return qs;
  }

  app.get('/game/speed-math', { preHandler: requireAuth }, async (req) => {
    const { grade = '6', count = '20' } = req.query as { grade?: string; count?: string };
    const questions = generateSpeedMathQuestions(parseInt(grade, 10), Math.min(parseInt(count, 10), 30));
    return { questions, timeLimit: 60 };
  });

  app.post('/game/speed-math/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      answers: z.record(z.number()),
      questions: z.array(z.object({ id: z.string(), answer: z.number() })),
      streak: z.number().int().min(0).default(0),
      timeTaken: z.number().optional(),
    }).parse(req.body);

    let correct = 0;
    for (const q of body.questions) {
      if (body.answers[q.id] === q.answer) correct++;
    }

    const total = body.questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    let xpEarned = correct * 10;
    if (body.streak >= 10) xpEarned += 50;
    else if (body.streak >= 5) xpEarned += 20;
    if (score === 100) xpEarned += 100;

    await addXP(sub, xpEarned);
    await prisma.mathUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return { correct, total, score, xpEarned, streak: body.streak };
  });

  // ─── FORMULA HUNT GAME ───────────────────────────────────────────────────

  app.get('/game/formula-hunt', { preHandler: requireAuth }, async (req) => {
    const { grade, subject, count = '10' } = req.query as { grade?: string; subject?: string; count?: string };
    const take = Math.min(parseInt(count, 10), 20);

    const where: any = { NOT: { formula: null } };
    if (grade) where.topic = { grade: parseInt(grade, 10) };
    if (subject) where.topic = { ...(where.topic ?? {}), subject };

    const concepts = await prisma.mathConcept.findMany({
      where,
      take: take * 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, formula: true, definition: true },
    });

    const withFormula = concepts.filter(c => c.formula && c.formula.trim().length > 0);
    if (withFormula.length < 4) {
      return { questions: [], message: 'Chưa đủ công thức. Giáo viên cần thêm khái niệm có công thức.' };
    }

    const pool = withFormula.sort(() => Math.random() - 0.5).slice(0, take);

    const questions = pool.map((c, i) => {
      const others = withFormula.filter(x => x.id !== c.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...others.map(o => o.formula!), c.formula!].sort(() => Math.random() - 0.5);
      return {
        id: `fh${i}`,
        conceptId: c.id,
        prompt: c.name,
        hint: c.definition.slice(0, 100),
        answer: c.formula!,
        options,
      };
    });

    return { questions, timeLimit: 180 };
  });

  app.post('/game/formula-hunt/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      answers: z.record(z.string()),
      questions: z.array(z.object({ id: z.string(), answer: z.string() })),
      streak: z.number().int().min(0).default(0),
    }).parse(req.body);

    let correct = 0;
    for (const q of body.questions) {
      if ((body.answers[q.id] ?? '').trim() === q.answer.trim()) correct++;
    }

    const total = body.questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    let xpEarned = correct * 10;
    if (body.streak >= 10) xpEarned += 50;
    else if (body.streak >= 5) xpEarned += 20;
    if (score === 100) xpEarned += 100;

    await addXP(sub, xpEarned);
    await prisma.mathUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    return { correct, total, score, xpEarned };
  });

  // ─── MATH BOSS BATTLE ────────────────────────────────────────────────────

  const BOSSES: Record<string, { name: string; emoji: string; hp: number; subjectKey: string }> = {
    ARITHMETIC:  { name: 'Quái Vật Số Học',    emoji: '🔢', hp: 100, subjectKey: 'ARITHMETIC'  },
    ALGEBRA:     { name: 'Ác Ma Đại Số',        emoji: '🧮', hp: 120, subjectKey: 'ALGEBRA'     },
    GEOMETRY:    { name: 'Rồng Hình Học',        emoji: '📐', hp: 110, subjectKey: 'GEOMETRY'    },
    STATISTICS:  { name: 'Tinh Linh Xác Suất',   emoji: '🎲', hp: 100, subjectKey: 'STATISTICS'  },
  };

  app.get('/game/boss-battle', { preHandler: requireAuth }, async (req) => {
    const { subject = 'ARITHMETIC', grade } = req.query as { subject?: string; grade?: string };
    const boss = BOSSES[subject] ?? BOSSES.ARITHMETIC;

    const topicWhere: any = { subject: boss.subjectKey };
    if (grade) topicWhere.grade = parseInt(grade, 10);

    const topics = await prisma.mathTopic.findMany({
      where: topicWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { concepts: { take: 20 } },
    });

    const allConcepts = topics.flatMap(t => t.concepts);
    if (allConcepts.length < 2) {
      return {
        boss, questions: [],
        message: 'Chưa có đủ kiến thức. Giáo viên cần thêm chủ đề cho môn này.',
      };
    }

    const questions = buildMathQuestions(allConcepts as any, 'MULTIPLE_CHOICE', 10);
    if ('error' in (questions as any)) {
      return { boss, questions: [], message: (questions as any).error };
    }

    return {
      boss,
      questions: (questions as any[]).map((q, i) => ({ id: `bb${i}`, ...q })),
    };
  });

  app.post('/game/boss-battle/submit', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const body = z.object({
      subject: z.string().default('ARITHMETIC'),
      answers: z.record(z.string()),
      questions: z.array(z.object({ id: z.string(), answer: z.string() })),
    }).parse(req.body);

    let correct = 0;
    for (const q of body.questions) {
      const given = String(body.answers[q.id] ?? '').toLowerCase().trim();
      const expected = String(q.answer).toLowerCase().trim();
      if (given === expected) correct++;
    }

    const total = body.questions.length;
    const bossDefeated = correct >= Math.ceil(total * 0.7);
    let xpEarned = correct * 10;
    if (bossDefeated) xpEarned += 100;

    await addXP(sub, xpEarned);
    await prisma.mathUserStats.upsert({
      where: { userId: sub },
      create: { userId: sub, exercisesDone: 1, lastStudied: new Date() },
      update: { exercisesDone: { increment: 1 } },
    });

    const boss = BOSSES[body.subject] ?? BOSSES.ARITHMETIC;
    const damageDealt = Math.round((correct / total) * boss.hp);

    return { correct, total, bossDefeated, damageDealt, bossHp: boss.hp, xpEarned };
  });
}
