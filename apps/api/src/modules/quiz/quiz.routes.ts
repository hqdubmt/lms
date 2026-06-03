import { FastifyInstance } from 'fastify';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { ollamaChat } from '../../services/ollama';
import { getBrain, updateBrain, updateMastery } from '../../services/conversation-brain';
import { syncLearningStateFromBrain } from '../../services/learning-state';

function topicToSubject(topic: string): string {
  const t = topic.toLowerCase();
  if (/toán|math|số|đại số|hình học|tích phân|lượng giác/.test(t)) return 'math';
  if (/tiếng việt|viet|văn|ngữ|chính tả|từ vựng tiếng việt/.test(t)) return 'viet';
  if (/english|tiếng anh|language|grammar|vocabulary/.test(t)) return 'language';
  return 'general';
}

export async function quizRoutes(app: FastifyInstance) {
  // List quiz sets
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { topic, mine } = req.query as { topic?: string; mine?: string };

    const where: any = {};
    if (mine === '1' || role === 'INSTRUCTOR') {
      if (mine === '1') where.authorId = sub;
      else if (role === 'INSTRUCTOR') where.OR = [{ isPublic: true }, { authorId: sub }];
    } else if (role !== 'ADMIN') {
      where.isPublic = true;
    }
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };

    return prisma.quizSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
  });

  // Get quiz set with questions (for play)
  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const quiz = await prisma.quizSet.findUnique({
      where: { id },
      include: {
        author:    { select: { id: true, name: true } },
        questions: { orderBy: { order: 'asc' } },
        _count:    { select: { attempts: true } },
      },
    });
    if (!quiz) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (!quiz.isPublic && quiz.authorId !== sub && role !== 'ADMIN')
      return reply.status(403).send({ error: 'Quiz chưa được công khai' });
    return quiz;
  });

  // Create quiz set
  app.post('/', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { title, description, topic, isPublic, timeLimit, questions } = req.body as {
      title: string; description?: string; topic: string;
      isPublic?: boolean; timeLimit?: number;
      questions?: Array<{
        question: string; type?: string; options?: string[];
        correctIndex?: number; correctText?: string; explanation?: string; order?: number;
      }>;
    };
    if (!title?.trim() || !topic?.trim())
      return reply.status(400).send({ error: 'Tên và chủ đề không được để trống' });

    const quiz = await prisma.quizSet.create({
      data: {
        title: title.trim(),
        description,
        topic: topic.trim(),
        authorId: sub,
        isPublic: isPublic ?? true,
        timeLimit,
        questions: questions?.length
          ? {
              create: questions.map((q, i) => ({
                question:     q.question,
                type:         (q.type as any) || 'MULTIPLE_CHOICE',
                options:      q.options || [],
                correctIndex: q.correctIndex ?? null,
                correctText:  q.correctText  || null,
                explanation:  q.explanation  || null,
                order:        q.order ?? i,
              })),
            }
          : undefined,
      },
      include: { questions: { orderBy: { order: 'asc' } }, _count: { select: { questions: true } } },
    });
    return quiz;
  });

  // Update quiz set
  app.patch('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const quiz = await prisma.quizSet.findUnique({ where: { id } });
    if (!quiz) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && quiz.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    const { title, description, topic, isPublic, timeLimit } = req.body as any;
    return prisma.quizSet.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(topic && { topic: topic.trim() }),
        ...(isPublic !== undefined && { isPublic }),
        ...(timeLimit !== undefined && { timeLimit }),
      },
    });
  });

  // Delete quiz set
  app.delete('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const quiz = await prisma.quizSet.findUnique({ where: { id } });
    if (!quiz) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && quiz.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    await prisma.quizSet.delete({ where: { id } });
    return { ok: true };
  });

  // Replace all questions for a quiz set
  app.put('/:id/questions', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const quiz = await prisma.quizSet.findUnique({ where: { id } });
    if (!quiz) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && quiz.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });

    const { questions } = req.body as {
      questions: Array<{
        question: string; type?: string; options?: string[];
        correctIndex?: number; correctText?: string; explanation?: string; order?: number;
      }>;
    };

    await prisma.quizQuestion.deleteMany({ where: { quizSetId: id } });
    if (questions?.length) {
      await prisma.quizQuestion.createMany({
        data: questions.map((q, i) => ({
          quizSetId:    id,
          question:     q.question,
          type:         (q.type as any) || 'MULTIPLE_CHOICE',
          options:      q.options || [],
          correctIndex: q.correctIndex ?? null,
          correctText:  q.correctText  || null,
          explanation:  q.explanation  || null,
          order:        q.order ?? i,
        })),
      });
    }
    return prisma.quizQuestion.findMany({ where: { quizSetId: id }, orderBy: { order: 'asc' } });
  });

  // Submit attempt
  app.post('/:id/submit', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { answers, timeTaken } = req.body as {
      answers: Record<string, number | string>;
      timeTaken?: number;
    };

    const quiz = await prisma.quizSet.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) return reply.status(404).send({ error: 'Không tìm thấy quiz' });

    // Grade
    let correct = 0;
    const graded = quiz.questions.map((q) => {
      const ans = answers[q.id];
      let isCorrect = false;
      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        isCorrect = q.correctIndex !== null && Number(ans) === q.correctIndex;
      } else if (q.type === 'FILL_BLANK') {
        isCorrect = typeof ans === 'string' &&
          q.correctText !== null &&
          ans.trim().toLowerCase() === q.correctText!.trim().toLowerCase();
      }
      if (isCorrect) correct++;
      return { questionId: q.id, userAnswer: ans, isCorrect, explanation: q.explanation };
    });

    const score = quiz.questions.length > 0 ? Math.round((correct / quiz.questions.length) * 100) : 0;

    const attempt = await prisma.quizAttempt.create({
      data: { quizSetId: id, userId: sub, score, answers: graded as any, timeTaken },
    });

    // Async: sync quiz result → AI brain → learning state
    const subject = topicToSubject(quiz.topic);
    (async () => {
      try {
        await updateMastery(sub, subject, quiz.topic, score / 100);
        if (score < 60) {
          await updateBrain(sub, subject, {
            mistakes: [{ type: `Quiz "${quiz.title}": điểm thấp (${score}%)`, count: 1, lastSeen: Date.now() }],
          });
        }
        const brain = await getBrain(sub, subject);
        await syncLearningStateFromBrain(sub, subject, brain);
      } catch { /* fire-and-forget */ }
    })();

    return { attemptId: attempt.id, score, correct, total: quiz.questions.length, graded };
  });

  // Leaderboard
  app.get('/:id/leaderboard', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const top = await prisma.quizAttempt.findMany({
      where: { quizSetId: id },
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }, { createdAt: 'asc' }],
      take: 20,
      distinct: ['userId'],
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return top.map((a, i) => ({ rank: i + 1, user: a.user, score: a.score, timeTaken: a.timeTaken, createdAt: a.createdAt }));
  });

  // My attempts
  app.get('/:id/my-attempts', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    return prisma.quizAttempt.findMany({
      where: { quizSetId: id, userId: sub },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });

  // ── Auto-generate quiz from module sources ───────────────────────────────────
  app.post('/generate', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { source, sourceId, title, timeLimit } = req.body as {
      source: 'vocab' | 'math' | 'viet' | 'lesson' | 'course';
      sourceId: string;
      title?: string;
      timeLimit?: number;
    };

    if (!source || !sourceId) return reply.status(400).send({ error: 'Thiếu source hoặc sourceId' });

    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    type QInput = {
      question: string; type: 'MULTIPLE_CHOICE'; options: string[];
      correctIndex: number; explanation: string | null; order: number;
    };

    let questions: QInput[] = [];
    let quizTitle = title || '';

    if (source === 'vocab') {
      const set = await prisma.vocabSet.findUnique({
        where: { id: sourceId },
        include: { items: { orderBy: { order: 'asc' } } },
      });
      if (!set) return reply.status(404).send({ error: 'Không tìm thấy bộ từ vựng' });
      if (set.items.length < 4) return reply.status(400).send({ error: 'Cần ít nhất 4 từ để tạo quiz' });
      quizTitle = quizTitle || `Quiz: ${set.title}`;

      const items = shuffle(set.items).slice(0, 20);
      items.forEach((item, i) => {
        const others = set.items.filter((x) => x.id !== item.id);
        const wrong3 = shuffle(others).slice(0, 3).map((x) => x.translation);
        const opts = shuffle([item.translation, ...wrong3]);
        questions.push({
          question: `Từ "${item.word}" có nghĩa là gì?`,
          type: 'MULTIPLE_CHOICE',
          options: opts,
          correctIndex: opts.indexOf(item.translation),
          explanation: item.example ? `Ví dụ: ${item.example}` : null,
          order: i,
        });
      });
    } else if (source === 'viet') {
      const set = await prisma.vietSet.findUnique({
        where: { id: sourceId },
        include: { items: { orderBy: { order: 'asc' } } },
      });
      if (!set) return reply.status(404).send({ error: 'Không tìm thấy bộ tiếng Việt' });
      if (set.items.length < 4) return reply.status(400).send({ error: 'Cần ít nhất 4 mục để tạo quiz' });
      quizTitle = quizTitle || `Quiz: ${set.title}`;

      const items = shuffle(set.items).slice(0, 20);
      items.forEach((item, i) => {
        const others = set.items.filter((x) => x.id !== item.id);
        const wrong3 = shuffle(others).slice(0, 3).map((x) => x.meaning);
        const opts = shuffle([item.meaning, ...wrong3]);
        questions.push({
          question: `"${item.word}" có nghĩa là gì?`,
          type: 'MULTIPLE_CHOICE',
          options: opts,
          correctIndex: opts.indexOf(item.meaning),
          explanation: item.example ? `Ví dụ: ${item.example}` : null,
          order: i,
        });
      });
    } else if (source === 'math') {
      const topic = await prisma.mathTopic.findUnique({
        where: { id: sourceId },
        include: { concepts: { orderBy: { order: 'asc' } } },
      });
      if (!topic) return reply.status(404).send({ error: 'Không tìm thấy chủ đề toán' });
      if (topic.concepts.length < 4) return reply.status(400).send({ error: 'Cần ít nhất 4 khái niệm để tạo quiz' });
      quizTitle = quizTitle || `Quiz Toán: ${topic.title}`;

      const concepts = shuffle(topic.concepts).slice(0, 20);
      concepts.forEach((c, i) => {
        const others = topic.concepts.filter((x) => x.id !== c.id);
        const wrong3 = shuffle(others).slice(0, 3).map((x) => x.definition);
        const opts = shuffle([c.definition, ...wrong3]);
        questions.push({
          question: `Định nghĩa của "${c.name}" là gì?`,
          type: 'MULTIPLE_CHOICE',
          options: opts,
          correctIndex: opts.indexOf(c.definition),
          explanation: c.example ? `Ví dụ: ${c.example}` : null,
          order: i,
        });
      });
    }

    if (source === 'lesson') {
      const lesson = await prisma.lesson.findUnique({
        where: { id: sourceId },
        select: { title: true, textContent: true },
      });
      if (!lesson) return reply.status(404).send({ error: 'Không tìm thấy bài học' });
      if (!lesson.textContent?.trim()) return reply.status(400).send({ error: 'Bài học chưa có nội dung văn bản' });

      quizTitle = quizTitle || `Quiz: ${lesson.title}`;
      const aiResponse = await ollamaChat([
        {
          role: 'system',
          content: 'Bạn là giáo viên tạo câu hỏi trắc nghiệm. Trả về JSON array với format: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]. Tạo đúng 10 câu từ nội dung bài giảng. Chỉ trả về JSON thuần, không có markdown.',
        },
        {
          role: 'user',
          content: `Tạo 10 câu hỏi trắc nghiệm từ nội dung bài học "${lesson.title}":\n\n${lesson.textContent.slice(0, 4000)}`,
        },
      ]);

      try {
        const jsonStr = aiResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const parsed: Array<{ question: string; options: string[]; correctIndex: number; explanation?: string }> = JSON.parse(jsonStr);
        parsed.slice(0, 20).forEach((item, i) => {
          if (item.question && Array.isArray(item.options) && item.options.length >= 2) {
            questions.push({
              question: item.question,
              type: 'MULTIPLE_CHOICE',
              options: item.options,
              correctIndex: item.correctIndex ?? 0,
              explanation: item.explanation ?? null,
              order: i,
            });
          }
        });
      } catch {
        return reply.status(503).send({ error: 'AI không tạo được câu hỏi, thử lại sau' });
      }
    } else if (source === 'course') {
      const course = await prisma.course.findUnique({
        where: { id: sourceId },
        select: {
          title: true,
          sections: {
            include: {
              lessons: {
                where: { textContent: { not: null } },
                select: { title: true, textContent: true },
                take: 5,
              },
            },
            take: 3,
          },
        },
      });
      if (!course) return reply.status(404).send({ error: 'Không tìm thấy khóa học' });

      const combinedText = course.sections
        .flatMap((s) => s.lessons)
        .map((l) => `## ${l.title}\n${l.textContent}`)
        .join('\n\n')
        .slice(0, 4000);

      if (!combinedText.trim()) return reply.status(400).send({ error: 'Khóa học chưa có bài giảng văn bản' });

      quizTitle = quizTitle || `Quiz: ${course.title}`;
      const aiResponse = await ollamaChat([
        {
          role: 'system',
          content: 'Bạn là giáo viên tạo câu hỏi trắc nghiệm. Trả về JSON array với format: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]. Tạo đúng 10 câu từ nội dung bài giảng. Chỉ trả về JSON thuần, không có markdown.',
        },
        {
          role: 'user',
          content: `Tạo 10 câu hỏi trắc nghiệm từ nội dung khóa học "${course.title}":\n\n${combinedText}`,
        },
      ]);

      try {
        const jsonStr = aiResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const parsed: Array<{ question: string; options: string[]; correctIndex: number; explanation?: string }> = JSON.parse(jsonStr);
        parsed.slice(0, 20).forEach((item, i) => {
          if (item.question && Array.isArray(item.options) && item.options.length >= 2) {
            questions.push({
              question: item.question,
              type: 'MULTIPLE_CHOICE',
              options: item.options,
              correctIndex: item.correctIndex ?? 0,
              explanation: item.explanation ?? null,
              order: i,
            });
          }
        });
      } catch {
        return reply.status(503).send({ error: 'AI không tạo được câu hỏi, thử lại sau' });
      }
    }

    if (questions.length === 0) return reply.status(400).send({ error: 'Không tạo được câu hỏi' });

    const quiz = await prisma.quizSet.create({
      data: {
        title: quizTitle,
        topic: source === 'vocab' ? 'Từ vựng' : source === 'viet' ? 'Tiếng Việt' : source === 'math' ? 'Toán' : source === 'lesson' ? 'Bài giảng' : 'Khóa học',
        authorId: sub,
        isPublic: true,
        timeLimit: timeLimit ?? 30,
        questions: { create: questions },
      },
      include: {
        _count: { select: { questions: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return quiz;
  });

  // ── Analytics for current user ────────────────────────────────────────────────
  app.get('/analytics', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { quizSet: { select: { title: true, topic: true } } },
    });

    const total = attempts.length;
    const avgScore = total > 0 ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / total) : 0;
    const bestScore = total > 0 ? Math.max(...attempts.map(a => a.score)) : 0;

    const topicMap: Record<string, { topic: string; count: number; totalScore: number; best: number }> = {};
    for (const a of attempts) {
      const t = a.quizSet.topic || 'general';
      if (!topicMap[t]) topicMap[t] = { topic: t, count: 0, totalScore: 0, best: 0 };
      topicMap[t].count++;
      topicMap[t].totalScore += a.score;
      topicMap[t].best = Math.max(topicMap[t].best, a.score);
    }

    return {
      totalQuizzes: total,
      avgScore,
      bestScore,
      byTopic: Object.values(topicMap)
        .map(t => ({ topic: t.topic, attempts: t.count, avgScore: Math.round(t.totalScore / t.count), bestScore: t.best }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 8),
      recentAttempts: attempts.slice(0, 5).map(a => ({
        id: a.id, title: a.quizSet.title, topic: a.quizSet.topic,
        score: a.score, timeTaken: a.timeTaken, createdAt: a.createdAt.toISOString(),
      })),
    };
  });
}
