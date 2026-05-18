import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { minioClient, getUploadUrl } from '../../services/minio';
import { env } from '../../config/env';
import { prisma } from '../../services/prisma';
import crypto from 'crypto';

export async function uploadRoutes(app: FastifyInstance) {
  // Upload avatar directly through API server (no browser-MinIO CORS needed)
  app.post('/avatar', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const ext = data.filename.split('.').pop()?.toLowerCase() || '';
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) return reply.status(400).send({ error: 'Chỉ hỗ trợ JPG, PNG, WebP' });

    const key = `avatars/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;

    await minioClient.putObject(env.MINIO_BUCKET_AVATARS, key, data.file, undefined as any, {
      'Content-Type': data.mimetype,
    } as any);

    const avatarUrl = `/api/upload/avatar-file/${env.MINIO_BUCKET_AVATARS}/${key}`;
    await prisma.user.update({ where: { id: sub }, data: { avatarUrl } });
    return { avatarUrl };
  });

  // Serve avatar files proxied through API (avoids MinIO public access requirement)
  app.get('/avatar-file/*', async (req, reply) => {
    const wildcard = (req.params as any)['*'] as string;
    const parts = wildcard.split('/');
    const bucket = parts[0];
    const objectKey = parts.slice(1).join('/');

    try {
      const stream = await minioClient.getObject(bucket, objectKey);
      const ext = objectKey.split('.').pop()?.toLowerCase() || 'jpg';
      const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      reply.header('Content-Type', mime[ext] || 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  // Legacy presigned URL endpoints (kept for other use cases)
  app.post('/avatar-url', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { ext } = req.body as { ext: string };
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext.toLowerCase())) throw new Error('Invalid file type');

    const key = `avatars/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const url = await getUploadUrl(env.MINIO_BUCKET_AVATARS, key, 600);
    return { url, key };
  });

  app.post('/avatar-confirm', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { key } = req.body as { key: string };
    const avatarUrl = `/api/upload/avatar-file/${env.MINIO_BUCKET_AVATARS}/${key}`;
    await prisma.user.update({ where: { id: sub }, data: { avatarUrl } });
    return { avatarUrl };
  });
}
