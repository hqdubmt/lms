import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireAuth } from '../../middleware/auth';
import { redis } from '../../services/redis';
import { prisma } from '../../services/prisma';

const gKey = (id: string) => `guild:${id}`;
const gMembersKey = (id: string) => `guild:members:${id}`;
const gCodeKey = (code: string) => `guild:code:${code}`;
const gMemberKey = (uid: string) => `guild:member:${uid}`;
const GUILD_TTL = 60 * 60 * 24 * 365; // 1 year

async function getGuildTotalXP(guildId: string): Promise<number> {
  const members = await redis.smembers(gMembersKey(guildId));
  if (!members.length) return 0;
  const scores = await Promise.all(members.map(uid => redis.zscore('xp:global:leaderboard', uid)));
  return scores.reduce((sum, s) => sum + parseInt(s ?? '0', 10), 0);
}

export async function guildRoutes(app: FastifyInstance) {
  // POST /ai/guild/create
  app.post('/guild/create', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      name: z.string().min(2).max(30),
      description: z.string().max(100).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Tên guild phải 2-30 ký tự' });

    const { sub } = req.user as { sub: string };
    const existing = await redis.get(gMemberKey(sub));
    if (existing) return reply.status(400).send({ error: 'Bạn đã ở trong một guild rồi' });

    const guildId = randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    await redis.hmset(gKey(guildId), {
      id: guildId,
      name: body.data.name,
      description: body.data.description ?? '',
      code,
      ownerId: sub,
      createdAt: Date.now().toString(),
    });
    await redis.expire(gKey(guildId), GUILD_TTL);
    await redis.sadd(gMembersKey(guildId), sub);
    await redis.expire(gMembersKey(guildId), GUILD_TTL);
    await redis.set(gCodeKey(code), guildId, 'EX', GUILD_TTL);
    await redis.set(gMemberKey(sub), guildId, 'EX', GUILD_TTL);

    return reply.send({ guildId, code, name: body.data.name });
  });

  // POST /ai/guild/join
  app.post('/guild/join', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({ code: z.string().min(4).max(8) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Mã guild không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const existing = await redis.get(gMemberKey(sub));
    if (existing) return reply.status(400).send({ error: 'Bạn đã ở trong một guild rồi' });

    const guildId = await redis.get(gCodeKey(body.data.code.toUpperCase()));
    if (!guildId) return reply.status(404).send({ error: 'Không tìm thấy guild với mã này' });

    const memberCount = await redis.scard(gMembersKey(guildId));
    if (memberCount >= 20) return reply.status(400).send({ error: 'Guild đã đầy (tối đa 20 thành viên)' });

    await redis.sadd(gMembersKey(guildId), sub);
    await redis.expire(gMembersKey(guildId), GUILD_TTL);
    await redis.set(gMemberKey(sub), guildId, 'EX', GUILD_TTL);

    const info = await redis.hgetall(gKey(guildId));
    return reply.send({ success: true, guildId, name: info?.name ?? 'Guild' });
  });

  // GET /ai/guild/my
  app.get('/guild/my', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const guildId = await redis.get(gMemberKey(sub));
    if (!guildId) return reply.send(null);

    const info = await redis.hgetall(gKey(guildId));
    if (!info || !info.id) return reply.send(null);

    const members = await redis.smembers(gMembersKey(guildId));
    const users = await prisma.user.findMany({
      where: { id: { in: members } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const xpList = await Promise.all(
      members.map(async uid => ({ uid, xp: parseInt((await redis.zscore('xp:global:leaderboard', uid)) ?? '0', 10) }))
    );
    const xpMap = Object.fromEntries(xpList.map(x => [x.uid, x.xp]));
    const totalXP = xpList.reduce((s, x) => s + x.xp, 0);

    await redis.zadd('guild:xp:leaderboard', totalXP, guildId);

    const memberList = users
      .map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, xp: xpMap[u.id] ?? 0, isOwner: info.ownerId === u.id, isMe: u.id === sub }))
      .sort((a, b) => b.xp - a.xp);

    return reply.send({
      id: guildId,
      name: info.name,
      description: info.description,
      code: info.code,
      ownerId: info.ownerId,
      totalXP,
      members: memberList,
    });
  });

  // GET /ai/guild/leaderboard
  app.get('/guild/leaderboard', { preHandler: requireAuth }, async (req, reply) => {
    // Refresh XP for any guilds in the leaderboard before returning
    const raw = await redis.zrevrange('guild:xp:leaderboard', 0, 19, 'WITHSCORES');
    if (!raw.length) return reply.send({ guilds: [] });

    const guilds = [];
    for (let i = 0; i < raw.length; i += 2) {
      const gId = raw[i];
      const xp = await getGuildTotalXP(gId); // fresh XP
      const info = await redis.hgetall(gKey(gId));
      const memberCount = await redis.scard(gMembersKey(gId));
      if (info?.name) {
        guilds.push({ rank: guilds.length + 1, guildId: gId, name: info.name, memberCount, totalXP: xp });
      }
    }
    guilds.sort((a, b) => b.totalXP - a.totalXP).forEach((g, i) => { g.rank = i + 1; });
    return reply.send({ guilds });
  });

  // DELETE /ai/guild/leave
  app.delete('/guild/leave', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const guildId = await redis.get(gMemberKey(sub));
    if (!guildId) return reply.status(404).send({ error: 'Bạn không ở trong guild nào' });

    await redis.srem(gMembersKey(guildId), sub);
    await redis.del(gMemberKey(sub));

    // If owner leaves and members remain, transfer ownership
    const info = await redis.hgetall(gKey(guildId));
    if (info?.ownerId === sub) {
      const remaining = await redis.smembers(gMembersKey(guildId));
      if (remaining.length > 0) {
        await redis.hset(gKey(guildId), 'ownerId', remaining[0]);
      }
    }

    return reply.send({ success: true });
  });
}
