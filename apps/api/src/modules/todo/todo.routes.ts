import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../services/prisma';
import { minioClient } from '../../services/minio';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';

const BUCKET = env.MINIO_BUCKET_ATTACHMENTS;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per file
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/zip', 'application/x-rar-compressed',
];

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.number().int().min(0).max(2).default(0),
  assignedToId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    key: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional().default([]),
  links: z.array(z.string().url()).optional().default([]),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(2).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    key: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  links: z.array(z.string().url()).optional(),
});

const statusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING_STUDENT', 'DONE', 'CANCELLED']),
  resultNote: z.string().max(5000).optional(),
  resultAttachments: z.array(z.object({
    name: z.string(),
    key: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  resultLinks: z.array(z.string().url()).optional(),
});

type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

function isTeacher(role: Role) {
  return role === 'INSTRUCTOR' || role === 'ADMIN';
}

const todoSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  attachments: true,
  links: true,
  resultNote: true,
  resultAttachments: true,
  resultLinks: true,
  completedAt: true,
  creatorConfirmed: true,
  assigneeConfirmed: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  assignedTo: { select: { id: true, name: true, avatarUrl: true } },
} as const;

async function deleteMinioFiles(attachments: any[]) {
  for (const f of attachments) {
    try { await minioClient.removeObject(BUCKET, f.key); } catch {}
  }
}

async function createNotification(userId: string, type: string, title: string, body: string, data?: object) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, data } });
  } catch {}
}

export async function todoRoutes(app: FastifyInstance) {
  // POST /todos/upload — upload file đính kèm, trả về thông tin file
  app.post('/upload', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string; role: Role };
    const data = await req.file({ limits: { fileSize: MAX_FILE_SIZE } });
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    if (!ALLOWED_MIMES.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Định dạng file không được hỗ trợ' });
    }

    const ext = data.filename.split('.').pop()?.toLowerCase() ?? 'bin';
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `todo-files/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) return reply.status(400).send({ error: 'File rỗng' });

    await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': data.mimetype,
    } as any);

    return reply.status(201).send({
      name: safeName,
      key,
      size: buffer.length,
      type: data.mimetype,
    });
  });

  // GET /todos/file/* — serve file từ MinIO (yêu cầu đăng nhập)
  app.get('/file/*', { preHandler: requireAuth }, async (req, reply) => {
    const key = (req.params as any)['*'] as string;
    if (key.includes('..') || key.startsWith('/')) {
      return reply.status(400).send({ error: 'Invalid path' });
    }
    try {
      const stream = await minioClient.getObject(BUCKET, key);
      const ext = key.split('.').pop()?.toLowerCase() ?? '';
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
        zip: 'application/zip',
      };
      reply.header('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
      reply.header('Cache-Control', 'private, max-age=3600');
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // GET /todos/presign?key=... — sinh presigned URL tạm thời (5 phút) để viewer bên ngoài truy cập
  app.get('/presign', { preHandler: requireAuth }, async (req, reply) => {
    const { key } = req.query as { key?: string };
    if (!key || key.includes('..') || key.startsWith('/')) {
      return reply.status(400).send({ error: 'Invalid key' });
    }
    try {
      const url = await minioClient.presignedGetObject(BUCKET, key, 300); // 5 phút
      return { url };
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // GET /todos/stats
  app.get('/stats', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);

    const base = isTeacher(role)
      ? {}
      : { OR: [{ createdById: sub }, { assignedToId: sub }] };

    const [total, overdue, todayCount, done7d, done] = await Promise.all([
      prisma.todo.count({ where: base }),
      prisma.todo.count({
        where: { ...base, dueDate: { lt: today }, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      prisma.todo.count({ where: { ...base, dueDate: { gte: today, lt: tomorrow } } }),
      prisma.todo.count({ where: { ...base, status: 'DONE', updatedAt: { gte: sevenDaysAgo } } }),
      prisma.todo.count({ where: { ...base, status: 'DONE' } }),
    ]);

    return { total, overdue, today: todayCount, done7d, done };
  });

  // GET /todos/assignees — teacher lấy ds student, student lấy ds teacher
  app.get('/assignees', { preHandler: requireAuth }, async (req) => {
    const { role } = req.user as { sub: string; role: Role };
    const targetRole = isTeacher(role) ? 'STUDENT' : 'INSTRUCTOR';
    return prisma.user.findMany({
      where: { role: targetRole as any, isActive: true },
      select: { id: true, name: true, avatarUrl: true, email: true },
      orderBy: { name: 'asc' },
    });
  });

  // GET /todos
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { search, status } = req.query as { search?: string; status?: string };

    const base: any = isTeacher(role)
      ? {}
      : { OR: [{ createdById: sub }, { assignedToId: sub }] };

    if (search?.trim()) {
      const q = search.trim();
      base.AND = [{
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }];
    }

    if (status && status !== 'ALL') base.status = status;

    return prisma.todo.findMany({
      where: base,
      select: todoSelect,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  });

  // POST /todos
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const body = createSchema.parse(req.body);
    // Mọi task đều bắt đầu từ NEW; bên nhận xác nhận → WAITING_STUDENT; bên giao bắt đầu → IN_PROGRESS
    const todo = await prisma.todo.create({
      data: {
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        priority: body.priority ?? 0,
        createdById: sub,
        assignedToId: body.assignedToId,
        status: 'NEW',
        attachments: body.attachments ?? [],
        links: body.links ?? [],
        resultLinks: [],
        resultAttachments: [],
        creatorConfirmed: true,
        assigneeConfirmed: false,
      },
      select: { ...todoSelect, createdBy: { select: { id: true, name: true, avatarUrl: true } } },
    });

    if (body.assignedToId && body.assignedToId !== sub) {
      const isCreatorTeacher = isTeacher(role);
      createNotification(
        body.assignedToId,
        'TODO_ASSIGNED',
        isCreatorTeacher ? 'Bạn có công việc mới' : 'Học viên gửi yêu cầu',
        isCreatorTeacher
          ? `${todo.createdBy.name} giao cho bạn: "${body.title}"`
          : `${todo.createdBy.name} gửi yêu cầu: "${body.title}"`,
        { todoId: todo.id },
      );
    }

    return reply.status(201).send(todo);
  });

  // GET /todos/:id
  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const todo = await prisma.todo.findUnique({ where: { id }, select: todoSelect });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && todo.createdBy.id !== sub && todo.assignedTo?.id !== sub) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return todo;
  });

  // PATCH /todos/:id
  app.patch('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);

    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && todo.createdById !== sub) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('assignedToId' in body) data.assignedToId = body.assignedToId ?? null;
    if (body.attachments !== undefined) {
      // Clean up removed files from MinIO
      const old = (todo.attachments as any[]) ?? [];
      const newKeys = new Set(body.attachments.map((a: any) => a.key));
      const removed = old.filter((a: any) => !newKeys.has(a.key));
      deleteMinioFiles(removed);
      data.attachments = body.attachments;
    }
    if (body.links !== undefined) data.links = body.links;

    const updated = await prisma.todo.update({ where: { id }, data, select: todoSelect });

    // Notify new assignee if changed
    const newAssigneeId = 'assignedToId' in body ? body.assignedToId : undefined;
    if (newAssigneeId && newAssigneeId !== todo.assignedToId && newAssigneeId !== sub) {
      const creator = await prisma.user.findUnique({ where: { id: sub }, select: { name: true } });
      createNotification(
        newAssigneeId,
        'TODO_ASSIGNED',
        'Bạn có công việc mới',
        `${creator?.name ?? 'Ai đó'} giao cho bạn: "${updated.title}"`,
        { todoId: id },
      );
    }

    return updated;
  });

  // DELETE /todos/:id
  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    deleteMinioFiles((todo.attachments as any[]) ?? []);
    await prisma.todo.delete({ where: { id } });
    return { message: 'Deleted' };
  });

  // PATCH /todos/:id/status
  app.patch('/:id/status', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const { status, resultNote, resultAttachments, resultLinks } = statusSchema.parse(req.body);

    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && todo.createdById !== sub && todo.assignedToId !== sub) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const teacher = isTeacher(role);
    const isCreator = todo.createdById === sub;
    const isAssignee = todo.assignedToId === sub;

    // Luồng tuần tự: NEW → (assignee xác nhận) → WAITING_STUDENT → (creator bắt đầu) → IN_PROGRESS → DONE
    const allowed = (() => {
      if (status === 'CANCELLED') return teacher || isCreator;
      if (status === 'NEW') return teacher || isCreator;
      // Assignee xác nhận nhận việc: NEW → WAITING_STUDENT
      if (status === 'WAITING_STUDENT') return teacher || isAssignee;
      // Chỉ creator/teacher mới được bắt đầu (sau khi assignee đã xác nhận)
      if (status === 'IN_PROGRESS') return teacher || isCreator;
      if (status === 'DONE') return teacher || isAssignee || isCreator;
      return false;
    })();

    if (!allowed) return reply.status(403).send({ error: 'Transition not allowed' });

    const data: any = { status };

    // Assignee xác nhận → đánh dấu assigneeConfirmed
    if (status === 'WAITING_STUDENT' && isAssignee) data.assigneeConfirmed = true;
    // Creator bắt đầu → đánh dấu creatorConfirmed
    if (status === 'IN_PROGRESS' && isCreator) data.creatorConfirmed = true;

    // Lưu kết quả khi DONE hoặc khi assignee gửi kết quả về (WAITING_STUDENT trong luồng ngược)
    if (status === 'DONE' || status === 'WAITING_STUDENT') {
      if (status === 'DONE') data.completedAt = new Date();
      if (resultNote !== undefined) data.resultNote = resultNote;
      if (resultAttachments !== undefined) data.resultAttachments = resultAttachments;
      if (resultLinks !== undefined) data.resultLinks = resultLinks;
    }

    const result = await prisma.todo.update({ where: { id }, data, select: todoSelect });

    const actor = await prisma.user.findUnique({ where: { id: sub }, select: { name: true } });
    const actorName = actor?.name ?? 'Người dùng';

    // Assignee xác nhận nhận việc (NEW → WAITING_STUDENT) → notify creator
    if (status === 'WAITING_STUDENT' && isAssignee && todo.createdById !== sub && !resultNote && !resultAttachments?.length) {
      createNotification(
        todo.createdById,
        'TODO_ACCEPTED',
        teacher ? 'Thầy/cô đã nhận yêu cầu' : 'Học viên đã nhận việc',
        `${actorName} đã xác nhận nhận: "${todo.title}" — hãy bắt đầu`,
        { todoId: id },
      );
    }

    // Creator bắt đầu (WAITING_STUDENT → IN_PROGRESS) → notify assignee
    if (status === 'IN_PROGRESS' && isCreator && todo.assignedToId && todo.assignedToId !== sub) {
      createNotification(
        todo.assignedToId,
        'TODO_STARTED',
        'Công việc đã bắt đầu',
        `${actorName} đã bắt đầu: "${todo.title}"`,
        { todoId: id },
      );
    }

    // Assignee gửi kết quả về (IN_PROGRESS → WAITING_STUDENT trong luồng ngược)
    if (status === 'WAITING_STUDENT' && isAssignee && todo.createdById !== sub && (resultNote || resultAttachments?.length)) {
      createNotification(
        todo.createdById,
        'TODO_RESULT_READY',
        'Thầy/cô đã gửi kết quả',
        `${actorName} đã xử lý xong: "${todo.title}" — hãy xác nhận`,
        { todoId: id },
      );
    }

    // Hoàn thành bởi người không phải creator → notify creator
    if (status === 'DONE' && todo.createdById !== sub) {
      createNotification(
        todo.createdById,
        'TODO_COMPLETED',
        'Công việc đã hoàn thành',
        `${actorName} đã hoàn thành: "${todo.title}"`,
        { todoId: id },
      );
    }
    // Luồng ngược: student xác nhận hoàn thành → notify teacher (assignee)
    if (status === 'DONE' && isCreator && todo.assignedToId && todo.assignedToId !== sub) {
      createNotification(
        todo.assignedToId,
        'TODO_CONFIRMED',
        'Học viên đã xác nhận',
        `${actorName} đã xác nhận hoàn thành: "${todo.title}"`,
        { todoId: id },
      );
    }

    return result;
  });

  // ── Comments ──────────────────────────────────────────────────────────────

  const commentSelect = {
    id: true,
    content: true,
    attachments: true,
    createdAt: true,
    user: { select: { id: true, name: true, avatarUrl: true } },
  } as const;

  // GET /todos/:id/comments
  app.get('/:id/comments', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const todo = await prisma.todo.findUnique({ where: { id }, select: { createdById: true, assignedToId: true } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && todo.createdById !== sub && todo.assignedToId !== sub) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return prisma.todoComment.findMany({
      where: { todoId: id },
      select: commentSelect,
      orderBy: { createdAt: 'asc' },
    });
  });

  // POST /todos/:id/comments
  app.post('/:id/comments', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id } = req.params as { id: string };
    const { content, attachments } = z.object({
      content: z.string().min(1).max(5000),
      attachments: z.array(z.object({
        name: z.string(),
        key: z.string(),
        size: z.number(),
        type: z.string(),
      })).optional().default([]),
    }).parse(req.body);

    const todo = await prisma.todo.findUnique({ where: { id }, select: { createdById: true, assignedToId: true, title: true } });
    if (!todo) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && todo.createdById !== sub && todo.assignedToId !== sub) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const comment = await prisma.todoComment.create({
      data: { content, attachments, todoId: id, userId: sub },
      select: commentSelect,
    });

    // Notify the other party
    const otherId = sub === todo.createdById ? todo.assignedToId : todo.createdById;
    if (otherId && otherId !== sub) {
      createNotification(otherId, 'TODO_COMMENT', 'Bình luận mới', `${comment.user.name} đã bình luận trong: "${todo.title}"`, { todoId: id });
    }

    return reply.status(201).send(comment);
  });

  // DELETE /todos/:id/comments/:commentId
  app.delete('/:id/comments/:commentId', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: Role };
    const { id, commentId } = req.params as { id: string; commentId: string };
    const comment = await prisma.todoComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.todoId !== id) return reply.status(404).send({ error: 'Not found' });
    if (!isTeacher(role) && comment.userId !== sub) return reply.status(403).send({ error: 'Forbidden' });
    deleteMinioFiles((comment.attachments as any[]) ?? []);
    await prisma.todoComment.delete({ where: { id: commentId } });
    return { message: 'Deleted' };
  });
}
