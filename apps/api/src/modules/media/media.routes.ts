import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import path from 'path';
import { prisma } from '../../services/prisma';
import { minioClient, deleteObject } from '../../services/minio';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { env } from '../../config/env';

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_DOC = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

function detectType(mime: string): 'VIDEO' | 'IMAGE' | 'DOCUMENT' {
  if (ALLOWED_VIDEO.includes(mime)) return 'VIDEO';
  if (ALLOWED_IMAGE.includes(mime)) return 'IMAGE';
  return 'DOCUMENT';
}

async function canAccessMedia(
  media: { access: string; uploadedBy: string; courseId: string | null; classId: string | null },
  userId: string,
  role: string,
): Promise<boolean> {
  if (role === 'ADMIN' || media.uploadedBy === userId) return true;
  if (media.access === 'PUBLIC') return true;
  if (media.access === 'COURSE' && media.courseId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: media.courseId, userId },
    });
    return !!enrollment;
  }
  if (media.access === 'CLASS' && media.classId) {
    const membership = await prisma.classMember.findFirst({
      where: { classId: media.classId, userId },
    });
    return !!membership;
  }
  return false;
}

// In-memory store for temporary PPTX/document view tokens (15-min TTL)
const viewTokens = new Map<string, { mediaId: string; expiry: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [t, d] of viewTokens) { if (d.expiry < now) viewTokens.delete(t); }
}, 5 * 60 * 1000);

export async function mediaRoutes(app: FastifyInstance) {
  // Upload file
  app.post('/upload', { preHandler: requireInstructor }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const allowed = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE, ...ALLOWED_DOC];
    if (!allowed.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Định dạng file không được hỗ trợ' });
    }

    // parse access fields from multipart fields
    const fields = data.fields as Record<string, any>;
    const access = (fields?.access?.value as string) || 'PUBLIC';
    const courseId = (fields?.courseId?.value as string) || null;
    const classId = (fields?.classId?.value as string) || null;

    const validAccess = ['PUBLIC', 'COURSE', 'CLASS', 'PRIVATE'];
    const resolvedAccess = validAccess.includes(access) ? access : 'PUBLIC';

    const ext = path.extname(data.filename).toLowerCase() || '';
    const key = `${sub}/${crypto.randomBytes(12).toString('hex')}${ext}`;
    const type = detectType(data.mimetype);

    await minioClient.putObject(env.MINIO_BUCKET_MEDIA, key, data.file, undefined as any, {
      'Content-Type': data.mimetype,
    } as any);

    const stat = await minioClient.statObject(env.MINIO_BUCKET_MEDIA, key);

    const media = await prisma.media.create({
      data: {
        name: data.filename,
        fileKey: key,
        fileSize: stat.size,
        mimeType: data.mimetype,
        type,
        access: resolvedAccess as any,
        courseId: resolvedAccess === 'COURSE' ? courseId : null,
        classId: resolvedAccess === 'CLASS' ? classId : null,
        uploadedBy: sub,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });

    return media;
  });

  // List media (instructor/admin)
  app.get('/', { preHandler: requireInstructor }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { type } = req.query as { type?: string };

    const where: any = {};
    if (role !== 'ADMIN') where.uploadedBy = sub;
    if (type && ['VIDEO', 'IMAGE', 'DOCUMENT'].includes(type)) where.type = type;

    const media = await prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { id: true, name: true } } },
    });

    return media;
  });

  // Stream file — accepts ?token= for <video src> / <img src> compatibility
  app.get('/:id/file', async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { token?: string };

    let userId: string;
    let role: string;
    try {
      let payload: any;
      if (query.token) {
        payload = (app as any).jwt.verify(query.token);
      } else {
        await req.jwtVerify();
        payload = req.user;
      }
      userId = payload.sub;
      role = payload.role;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });

    const allowed = await canAccessMedia(media, userId, role);
    if (!allowed) return reply.status(403).send({ error: 'Không có quyền truy cập file này' });

    try {
      const stat = await minioClient.statObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
      const fileSize = stat.size;
      const rangeHeader = (req.headers as any).range as string | undefined;

      reply.header('Content-Type', media.mimeType);
      reply.header('Cache-Control', 'private, max-age=3600');
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(media.name)}"`);
      reply.header('Accept-Ranges', 'bytes');

      if (rangeHeader && media.type === 'VIDEO') {
        const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1);
        const chunkSize = end - start + 1;
        const stream = await minioClient.getPartialObject(env.MINIO_BUCKET_MEDIA, media.fileKey, start, chunkSize);
        reply.status(206);
        reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        reply.header('Content-Length', String(chunkSize));
        return reply.send(stream);
      }

      const stream = await minioClient.getObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
      reply.header('Content-Length', String(fileSize));
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'File không tồn tại trong storage' });
    }
  });

  // List media for students — filtered by access rights
  app.get('/library', { preHandler: requireAuth }, async (req) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { type } = req.query as { type?: string };

    const where: any = { OR: [] as any[] };

    // Admin / instructor see their own files regardless
    if (role === 'ADMIN') {
      delete where.OR;
    } else {
      // PUBLIC
      where.OR.push({ access: 'PUBLIC' });
      // Own files
      where.OR.push({ uploadedBy: sub });
      // COURSE: enrolled courses
      const enrollments = await prisma.enrollment.findMany({ where: { userId: sub }, select: { courseId: true } });
      if (enrollments.length) {
        where.OR.push({ access: 'COURSE', courseId: { in: enrollments.map((e) => e.courseId) } });
      }
      // CLASS: class memberships
      const memberships = await prisma.classMember.findMany({ where: { userId: sub }, select: { classId: true } });
      if (memberships.length) {
        where.OR.push({ access: 'CLASS', classId: { in: memberships.map((m) => m.classId) } });
      }
    }

    if (type && ['VIDEO', 'IMAGE', 'DOCUMENT'].includes(type)) where.type = type;

    return prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, fileSize: true, mimeType: true, type: true, access: true, createdAt: true },
    });
  });

  // Generate short-lived view token (for Office Online PPTX preview)
  app.post('/:id/view-token', async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { token?: string };
    let userId: string, role: string;
    try {
      let payload: any;
      if (query.token) payload = (app as any).jwt.verify(query.token);
      else { await req.jwtVerify(); payload = req.user; }
      userId = payload.sub; role = payload.role;
    } catch { return reply.status(401).send({ error: 'Unauthorized' }); }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });
    const allowed = await canAccessMedia(media, userId, role);
    if (!allowed) return reply.status(403).send({ error: 'Không có quyền' });

    const token = crypto.randomBytes(32).toString('hex');
    viewTokens.set(token, { mediaId: id, expiry: Date.now() + 15 * 60 * 1000 });
    return { token, viewUrl: `/api/media/view-doc/${token}` };
  });

  // Serve file via view token — no auth required (for Office Online)
  app.get('/view-doc/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const entry = viewTokens.get(token);
    if (!entry || entry.expiry < Date.now()) {
      viewTokens.delete(token);
      return reply.status(410).send({ error: 'Link đã hết hạn' });
    }
    const media = await prisma.media.findUnique({ where: { id: entry.mediaId } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy' });
    try {
      const stat = await minioClient.statObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
      const stream = await minioClient.getObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
      reply.header('Content-Type', media.mimeType);
      reply.header('Content-Length', String(stat.size));
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(media.name)}"`);
      reply.header('Cache-Control', 'private, max-age=900');
      return reply.send(stream);
    } catch { return reply.status(500).send({ error: 'Lỗi tải file' }); }
  });

  // Rename media
  app.patch('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const { name } = req.body as { name?: string };
    if (!name?.trim()) return reply.status(400).send({ error: 'Tên không được để trống' });
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });
    if (role !== 'ADMIN' && media.uploadedBy !== sub) return reply.status(403).send({ error: 'Không có quyền' });
    return prisma.media.update({ where: { id }, data: { name: name.trim() } });
  });

  // Update access settings
  app.patch('/:id/access', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };
    const { access, courseId, classId } = req.body as {
      access?: string;
      courseId?: string | null;
      classId?: string | null;
    };

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });
    if (role !== 'ADMIN' && media.uploadedBy !== sub) return reply.status(403).send({ error: 'Không có quyền' });

    const validAccess = ['PUBLIC', 'COURSE', 'CLASS', 'PRIVATE'];
    if (access && !validAccess.includes(access)) return reply.status(400).send({ error: 'Quyền truy cập không hợp lệ' });

    const resolvedAccess = (access || media.access) as any;
    return prisma.media.update({
      where: { id },
      data: {
        access: resolvedAccess,
        courseId: resolvedAccess === 'COURSE' ? (courseId ?? media.courseId) : null,
        classId: resolvedAccess === 'CLASS' ? (classId ?? media.classId) : null,
      },
    });
  });

  // Delete media
  app.delete('/:id', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, role } = req.user as { sub: string; role: string };

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });
    if (role !== 'ADMIN' && media.uploadedBy !== sub) {
      return reply.status(403).send({ error: 'Không có quyền xóa file này' });
    }

    await deleteObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
    await prisma.media.delete({ where: { id } });

    return { message: `Đã xóa "${media.name}"` };
  });
}
