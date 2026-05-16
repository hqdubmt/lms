import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/prisma';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    const { role, sub } = req.user as { role: string; sub: string };
    if (role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const user = await prisma.user.findUnique({ where: { id: sub }, select: { isActive: true } });
    if (!user?.isActive) {
      return reply.status(403).send({ error: 'Account suspended' });
    }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireInstructor(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    const { role, sub } = req.user as { role: string; sub: string };
    if (!['ADMIN', 'INSTRUCTOR'].includes(role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const user = await prisma.user.findUnique({ where: { id: sub }, select: { isActive: true } });
    if (!user?.isActive) {
      return reply.status(403).send({ error: 'Account suspended' });
    }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
