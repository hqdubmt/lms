import { FastifyInstance } from 'fastify';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true, role: true };

function isModerator(role: string) {
  return role === 'ADMIN' || role === 'INSTRUCTOR';
}

export async function forumRoutes(app: FastifyInstance) {
  // ── Categories ──────────────────────────────────────────────────────────────

  app.get('/categories', async (req) => {
    const { role } = (req.user as any) || {};
    const showHidden = isModerator(role);
    const cats = await prisma.forumCategory.findMany({
      where: showHidden ? {} : { isHidden: false },
      orderBy: { order: 'asc' },
      include: { _count: { select: { posts: { where: { status: 'APPROVED', isHidden: false } } } } },
    });
    const withLatest = await Promise.all(
      cats.map(async (c) => {
        const latest = await prisma.forumPost.findFirst({
          where: { categoryId: c.id, status: 'APPROVED', isHidden: false },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, createdAt: true, author: { select: AUTHOR_SELECT } },
        });
        return { ...c, latestPost: latest };
      }),
    );
    return withLatest;
  });

  app.post('/categories', { preHandler: requireInstructor }, async (req, reply) => {
    const { role } = req.user as { sub: string; role: string };
    if (role !== 'ADMIN') return reply.status(403).send({ error: 'Chỉ admin mới có thể tạo chủ đề' });
    const { name, description, icon, color, order } = req.body as any;
    if (!name?.trim()) return reply.status(400).send({ error: 'Tên không được để trống' });
    return prisma.forumCategory.create({
      data: { name: name.trim(), description, icon, color: color || '#6366f1', order: order || 0 },
    });
  });

  app.patch('/categories/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { role } = req.user as { sub: string; role: string };
    if (role !== 'ADMIN') return reply.status(403).send({ error: 'Không có quyền' });
    const { id } = req.params as { id: string };
    const { name, description, icon, color, order, isHidden } = req.body as any;
    return prisma.forumCategory.update({
      where: { id },
      data: {
        ...(name && { name }), description, icon, color,
        ...(order !== undefined && { order }),
        ...(isHidden !== undefined && { isHidden }),
      },
    });
  });

  // Toggle hide/show category
  app.patch('/categories/:id/toggle-hidden', { preHandler: requireInstructor }, async (req, reply) => {
    const { role } = req.user as { sub: string; role: string };
    if (role !== 'ADMIN') return reply.status(403).send({ error: 'Không có quyền' });
    const { id } = req.params as { id: string };
    const cat = await prisma.forumCategory.findUniqueOrThrow({ where: { id } });
    return prisma.forumCategory.update({ where: { id }, data: { isHidden: !cat.isHidden } });
  });

  app.delete('/categories/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { role } = req.user as { sub: string; role: string };
    if (role !== 'ADMIN') return reply.status(403).send({ error: 'Không có quyền' });
    const { id } = req.params as { id: string };
    await prisma.forumCategory.delete({ where: { id } });
    return { ok: true };
  });

  // ── Posts ───────────────────────────────────────────────────────────────────

  app.get('/categories/:id/posts', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const q = req.query as { page?: string; search?: string };
    const page = Number(q.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = { categoryId: id };
    if (!isModerator(role)) {
      // Students see only APPROVED, non-hidden posts + their own PENDING
      where.isHidden = false;
      where.OR = [{ status: 'APPROVED' }, { status: 'PENDING', authorId: sub }];
    }
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          _count: { select: { replies: true, likes: true } },
        },
      }),
      prisma.forumPost.count({ where }),
    ]);
    return { posts, total, page, limit };
  });

  // Pending posts (moderators only)
  app.get('/posts/pending', { preHandler: requireInstructor }, async (req) => {
    const pending = await prisma.forumPost.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        author:   { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true } },
        _count:   { select: { replies: true } },
      },
    });
    return pending;
  });

  app.post('/posts', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { title, content, categoryId } = req.body as any;
    if (!title?.trim() || !content?.trim() || !categoryId)
      return reply.status(400).send({ error: 'Thiếu thông tin bắt buộc' });
    const cat = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
    if (!cat) return reply.status(404).send({ error: 'Chủ đề không tồn tại' });

    // Students create PENDING posts; instructors/admins are auto-approved
    const status = isModerator(role) ? 'APPROVED' : 'PENDING';

    return prisma.forumPost.create({
      data: { title: title.trim(), content: content.trim(), categoryId, authorId: sub, status: status as any },
      include: { author: { select: AUTHOR_SELECT } },
    });
  });

  app.get('/posts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    // increment views
    await prisma.forumPost.updateMany({ where: { id }, data: { views: { increment: 1 } } });
    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author:   { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true, color: true } },
        _count:   { select: { likes: true } },
        replies:  {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: AUTHOR_SELECT },
            _count: { select: { likes: true } },
          },
        },
      },
    });
    if (!post) return reply.status(404).send({ error: 'Không tìm thấy' });
    if ((post as any).isHidden && !isModerator(role))
      return reply.status(404).send({ error: 'Không tìm thấy' });
    if ((post as any).status !== 'APPROVED' && !isModerator(role) && post.authorId !== sub)
      return reply.status(403).send({ error: 'Bài viết chưa được duyệt' });
    return post;
  });

  app.patch('/posts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return reply.status(404).send({ error: 'Không tìm thấy' });
    const canEdit = role === 'ADMIN' || post.authorId === sub;
    const canModerate = isModerator(role);
    if (!canEdit && !canModerate) return reply.status(403).send({ error: 'Không có quyền' });
    const { title, content, isPinned, isClosed, isHidden } = req.body as any;
    return prisma.forumPost.update({
      where: { id },
      data: {
        ...(canEdit && title   && { title:   title.trim() }),
        ...(canEdit && content && { content: content.trim() }),
        ...(canModerate && isPinned  !== undefined && { isPinned }),
        ...(canModerate && isClosed  !== undefined && { isClosed }),
        ...(canModerate && isHidden  !== undefined && { isHidden }),
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
  });

  // Toggle hide/show post (moderators)
  app.patch('/posts/:id/toggle-hidden', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return reply.status(404).send({ error: 'Không tìm thấy' });
    return prisma.forumPost.update({
      where: { id },
      data: { isHidden: !post.isHidden },
      include: { author: { select: AUTHOR_SELECT } },
    });
  });

  // Approve / reject post (moderators)
  app.patch('/posts/:id/status', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: 'APPROVED' | 'REJECTED' };
    if (!['APPROVED', 'REJECTED'].includes(status))
      return reply.status(400).send({ error: 'Trạng thái không hợp lệ' });
    return prisma.forumPost.update({
      where: { id },
      data: { status: status as any },
      include: { author: { select: AUTHOR_SELECT }, category: { select: { id: true, name: true } } },
    });
  });

  app.delete('/posts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && post.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    await prisma.forumPost.delete({ where: { id } });
    return { ok: true };
  });

  // Like / unlike post
  app.post('/posts/:id/like', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const existing = await prisma.forumLike.findFirst({ where: { userId: sub, postId: id } });
    if (existing) {
      await prisma.forumLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await prisma.forumLike.create({ data: { userId: sub, postId: id } });
    return { liked: true };
  });

  // ── Replies ─────────────────────────────────────────────────────────────────

  app.post('/posts/:id/replies', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const { content } = req.body as any;
    if (!content?.trim()) return reply.status(400).send({ error: 'Nội dung không được để trống' });
    const post = await prisma.forumPost.findUnique({ where: { id } });
    if (!post) return reply.status(404).send({ error: 'Bài viết không tồn tại' });
    if (post.isClosed) return reply.status(403).send({ error: 'Bài viết đã đóng bình luận' });
    return prisma.forumReply.create({
      data: { content: content.trim(), postId: id, authorId: sub },
      include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true } } },
    });
  });

  app.patch('/replies/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const reply_ = await prisma.forumReply.findUnique({ where: { id } });
    if (!reply_) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && reply_.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    const { content } = req.body as any;
    return prisma.forumReply.update({
      where: { id },
      data: { ...(content && { content: content.trim() }) },
      include: { author: { select: AUTHOR_SELECT } },
    });
  });

  app.delete('/replies/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const r = await prisma.forumReply.findUnique({ where: { id } });
    if (!r) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (role !== 'ADMIN' && r.authorId !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    await prisma.forumReply.delete({ where: { id } });
    return { ok: true };
  });

  // Like / unlike reply
  app.post('/replies/:id/like', { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const { sub } = req.user as { sub: string };
    const existing = await prisma.forumLike.findFirst({ where: { userId: sub, replyId: id } });
    if (existing) {
      await prisma.forumLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await prisma.forumLike.create({ data: { userId: sub, replyId: id } });
    return { liked: true };
  });
}
