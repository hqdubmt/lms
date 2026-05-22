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
  'text/plain',
];

function detectType(mime: string): 'VIDEO' | 'IMAGE' | 'DOCUMENT' {
  if (ALLOWED_VIDEO.includes(mime)) return 'VIDEO';
  if (ALLOWED_IMAGE.includes(mime)) return 'IMAGE';
  return 'DOCUMENT';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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
        uploadedBy: sub,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });

    return media;
  });

  // List media
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

  // Stream file (authenticated)
  app.get('/:id/file', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return reply.status(404).send({ error: 'Không tìm thấy file' });

    try {
      const stat = await minioClient.statObject(env.MINIO_BUCKET_MEDIA, media.fileKey);
      const stream = await minioClient.getObject(env.MINIO_BUCKET_MEDIA, media.fileKey);

      reply.header('Content-Type', media.mimeType);
      reply.header('Content-Length', stat.size);
      reply.header('Cache-Control', 'private, max-age=3600');
      reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(media.name)}"`);

      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'File không tồn tại trong storage' });
    }
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
