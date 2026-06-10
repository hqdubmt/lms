import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getXPData, awardXP, completeQuest } from '../../services/xp-gamification';
import { redis } from '../../services/redis';
import { prisma } from '../../services/prisma';

export async function xpGamificationRoutes(app: FastifyInstance) {
  app.get('/xp', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    return reply.send(await getXPData(sub));
  });

  app.post('/xp/award', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      activity: z.string(),
      xp: z.number().int().min(1).max(500).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    return reply.send(await awardXP(sub, body.data.activity, body.data.xp));
  });

  app.post('/xp/quest/complete', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      questId: z.string(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const result = await completeQuest(sub, body.data.questId);
    if (!result) return reply.status(400).send({ error: 'Quest không hợp lệ hoặc đã hoàn thành' });
    return reply.send(result);
  });

  // GET /ai/leaderboard — top users by total XP (Module 11: Leaderboard)
  app.get('/leaderboard', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const limit = Math.min(50, parseInt((req.query as any).limit ?? '20', 10));

    const raw = await redis.zrevrange('xp:global:leaderboard', 0, limit - 1, 'WITHSCORES');

    if (!raw.length) {
      const xp = await getXPData(sub);
      const me = await prisma.user.findUnique({ where: { id: sub }, select: { id: true, name: true, avatarUrl: true } });
      return reply.send({ entries: [{ rank: 1, userId: sub, name: me?.name ?? 'Bạn', avatarUrl: me?.avatarUrl ?? null, totalXP: xp.totalXP, isMe: true }], myRank: 1 });
    }

    const entries: Array<{ userId: string; totalXP: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ userId: raw[i], totalXP: parseInt(raw[i + 1], 10) });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: entries.map(e => e.userId) } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const myRankRaw = await redis.zrevrank('xp:global:leaderboard', sub);
    const myRank = myRankRaw !== null ? myRankRaw + 1 : null;

    const result = entries.map((e, idx) => ({
      rank: idx + 1,
      userId: e.userId,
      name: userMap[e.userId]?.name ?? 'Ẩn danh',
      avatarUrl: userMap[e.userId]?.avatarUrl ?? null,
      totalXP: e.totalXP,
      isMe: e.userId === sub,
    }));

    return reply.send({ entries: result, myRank });
  });

  // GET /ai/leaderboard/subject?subject=math|lang|viet&limit=20
  app.get('/leaderboard/subject', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { subject = 'math', limit: limitStr = '20' } = req.query as Record<string, string>;
    const limit = Math.min(50, parseInt(limitStr, 10));

    type Row = { rank: number; userId: string; name: string; avatarUrl: string | null; totalXP: number; isMe: boolean };

    const buildResult = async (rows: Array<{ userId: string; xp: number }>): Promise<{ entries: Row[]; myRank: number | null }> => {
      const uids = rows.map(r => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: uids } },
        select: { id: true, name: true, avatarUrl: true },
      });
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));
      const myIdx = rows.findIndex(r => r.userId === sub);
      return {
        entries: rows.map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          name: uMap[r.userId]?.name ?? 'Ẩn danh',
          avatarUrl: uMap[r.userId]?.avatarUrl ?? null,
          totalXP: r.xp,
          isMe: r.userId === sub,
        })),
        myRank: myIdx >= 0 ? myIdx + 1 : null,
      };
    };

    if (subject === 'math') {
      const rows = await prisma.mathUserStats.findMany({
        take: limit, orderBy: { xp: 'desc' }, select: { userId: true, xp: true },
      });
      return reply.send(await buildResult(rows));
    }
    if (subject === 'lang') {
      const rows = await prisma.langUserStats.findMany({
        take: limit, orderBy: { xp: 'desc' }, select: { userId: true, xp: true },
      });
      return reply.send(await buildResult(rows));
    }
    if (subject === 'viet') {
      const rows = await prisma.vietUserStats.findMany({
        take: limit, orderBy: { xp: 'desc' }, select: { userId: true, xp: true },
      });
      return reply.send(await buildResult(rows));
    }

    return reply.status(400).send({ error: 'subject phải là math, lang, hoặc viet' });
  });
}
