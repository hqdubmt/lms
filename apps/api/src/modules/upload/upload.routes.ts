import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { minioClient, getUploadUrl } from '../../services/minio';
import { env } from '../../config/env';
import { prisma } from '../../services/prisma';
import crypto from 'crypto';

export async function uploadRoutes(app: FastifyInstance) {
  // Get presigned URL to upload avatar
  app.post('/avatar-url', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { ext } = req.body as { ext: string };
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext.toLowerCase())) throw new Error('Invalid file type');

    const key = `avatars/${sub}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const url = await getUploadUrl(env.MINIO_BUCKET_AVATARS, key, 600);
    return { url, key };
  });

  // Confirm avatar upload and update user
  app.post('/avatar-confirm', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { key } = req.body as { key: string };
    const avatarUrl = `${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET_AVATARS}/${key}`;

    await prisma.user.update({ where: { id: sub }, data: { avatarUrl } });
    return { avatarUrl };
  });
}
