import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import * as XLSX from 'xlsx';
import { extractText, structureLangWithAI } from '../../services/file-import';
import { serveTTS } from '../../services/tts';

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
    create: { userId, xp, lastStudied: new Date() },
    update: {},
  });

  const today = new Date().toDateString();
  const lastDay = stats.lastStudied ? new Date(stats.lastStudied).toDateString() : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let streakDelta = 0;
  if (lastDay !== today) {
    if (lastDay === yesterday) streakDelta = 1;
    else if (lastDay !== today) streakDelta = -(stats.streak); // reset
  }

  const newStreak = Math.max(0, stats.streak + streakDelta) + (lastDay !== today ? 1 : 0);
  const newXp = stats.xp + xp;
  const newLevel = Math.floor(newXp / 500) + 1;

  return prisma.langUserStats.update({
    where: { userId },
    data: {
      xp: newXp,
      level: newLevel,
      streak: lastDay === today ? stats.streak : newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastStudied: new Date(),
    },
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
    const stats = await prisma.langUserStats.findUnique({ where: { userId: sub } });
    const reviewCount = await prisma.vocabItemProgress.count({
      where: { userId: sub, nextReview: { lte: new Date() }, isLearned: false },
    });
    return { ...(stats || { xp: 0, level: 1, streak: 0, wordsLearned: 0, exercisesDone: 0 }), reviewsDue: reviewCount };
  });

  app.get('/leaderboard', { preHandler: requireAuth }, async () => {
    return prisma.langUserStats.findMany({
      take: 20,
      orderBy: { xp: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
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

    const sets = await prisma.vocabSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { items: true, children: true } },
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

  // List vocab sets as tree (parent sets with children)
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
    return prisma.vocabSet.update({ where: { id }, data: body });
  });

  app.delete('/vocab-sets/:id', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const set = await prisma.vocabSet.findUniqueOrThrow({ where: { id } });
    if (set.createdBy !== sub && role !== 'ADMIN') throw { statusCode: 403, message: 'Không có quyền' };
    await prisma.vocabSet.delete({ where: { id } });
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
    const { quality } = z.object({ quality: z.number().min(0).max(5) }).parse(req.body);

    const existing = await prisma.vocabItemProgress.findUnique({ where: { userId_itemId: { userId: sub, itemId } } });
    const prev = existing || { repetitions: 0, interval: 1, easeFactor: 2.5 };
    const next = sm2(quality, prev.repetitions, prev.interval, prev.easeFactor);

    const progress = await prisma.vocabItemProgress.upsert({
      where: { userId_itemId: { userId: sub, itemId } },
      create: { userId: sub, itemId, ...next },
      update: { ...next, lastReview: new Date() },
    });

    if (!existing && quality >= 3) {
      await prisma.langUserStats.upsert({
        where: { userId: sub },
        create: { userId: sub, wordsLearned: 1, lastStudied: new Date() },
        update: { wordsLearned: { increment: 1 } },
      });
    }

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

    return prisma.langExercise.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
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
    return prisma.langExercise.update({ where: { id }, data: body });
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
        correct = JSON.stringify(userAnswer) === JSON.stringify(q.answer);
      } else if (exercise.type === 'MATCHING') {
        const ua = userAnswer as Record<string, string>;
        const ea = q.answer as Record<string, string>;
        correct = JSON.stringify(ua) === JSON.stringify(ea);
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
      create: { userId: sub, exercisesDone: 1, xp: xpEarned, lastStudied: new Date() },
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

}
