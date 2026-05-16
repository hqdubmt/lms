import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth } from '../../middleware/auth';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.number().int().min(0).max(2).default(0),
});

const updateSchema = createSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export async function todoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { done } = req.query as { done?: string };

    const where: any = { userId: sub };
    if (done === 'true') where.isCompleted = true;
    if (done === 'false') where.isCompleted = false;

    return prisma.todoItem.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const body = createSchema.parse(req.body);
    const todo = await prisma.todoItem.create({
      data: { ...body, userId: sub, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
    });
    return reply.status(201).send(todo);
  });

  app.patch('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);

    const todo = await prisma.todoItem.findFirst({ where: { id, userId: sub } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });

    const data: any = { ...body };
    if (body.isCompleted !== undefined) {
      data.completedAt = body.isCompleted ? new Date() : null;
    }

    return prisma.todoItem.update({ where: { id }, data });
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const todo = await prisma.todoItem.findFirst({ where: { id, userId: sub } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    await prisma.todoItem.delete({ where: { id } });
    return { message: 'Deleted' };
  });
}
