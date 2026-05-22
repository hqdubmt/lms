import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/prisma';
import { redis } from '../services/redis';

async function checkUserActive(sub: string): Promise<boolean> {
  const cacheKey = `user:active:${sub}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === '1';
  const user = await prisma.user.findUnique({ where: { id: sub }, select: { isActive: true } });
  const active = user?.isActive ?? false;
  await redis.setex(cacheKey, 300, active ? '1' : '0');
  return active;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { sub } = req.user as { sub: string };
  try {
    const active = await checkUserActive(sub);
    if (!active) return reply.status(403).send({ error: 'Account suspended' });
  } catch {
    return reply.status(500).send({ error: 'Lỗi server' });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { role, sub } = req.user as { role: string; sub: string };
  if (role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  try {
    const active = await checkUserActive(sub);
    if (!active) return reply.status(403).send({ error: 'Account suspended' });
  } catch {
    return reply.status(500).send({ error: 'Lỗi server' });
  }
}

export async function requireInstructor(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { role, sub } = req.user as { role: string; sub: string };
  if (!['ADMIN', 'INSTRUCTOR'].includes(role)) {
    return reply.status(403).send({ error: 'Bạn không có quyền giảng viên' });
  }
  try {
    const active = await checkUserActive(sub);
    if (!active) return reply.status(403).send({ error: 'Tài khoản đã bị khoá' });
  } catch {
    return reply.status(500).send({ error: 'Lỗi server' });
  }
}
