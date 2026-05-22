import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import path from 'path';
import { prisma } from '../../services/prisma';
import { minioClient } from '../../services/minio';
import { redis } from '../../services/redis';
import { requireAdmin } from '../../middleware/auth';
import { env } from '../../config/env';

const CACHE_KEY = 'site:settings';
const CACHE_TTL = 300; // 5 minutes
const BRANDING_PREFIX = 'branding/';

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

export async function siteSettingsRoutes(app: FastifyInstance) {
  // Public: return all settings as key-value object
  app.get('/', async () => {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const rows = await prisma.siteSetting.findMany();
    const obj: Record<string, string> = {};
    for (const r of rows) obj[r.key] = r.value;

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(obj));
    return obj;
  });

  // Public: serve branding image
  app.get('/branding/image', async (req, reply) => {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'logoBgKey' } });
    if (!setting) return reply.status(404).send({ error: 'Chưa có ảnh branding' });

    try {
      const stat = await minioClient.statObject(env.MINIO_BUCKET_MEDIA, setting.value);
      const stream = await minioClient.getObject(env.MINIO_BUCKET_MEDIA, setting.value);
      const ext = path.extname(setting.value).slice(1).toLowerCase();
      const mime: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
      };
      reply.header('Content-Type', mime[ext] || 'image/png');
      reply.header('Content-Length', stat.size);
      reply.header('Cache-Control', 'public, max-age=60');
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: 'File không tồn tại' });
    }
  });

  // Admin: upload branding logo image
  app.post('/branding/upload', { preHandler: requireAdmin }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Chỉ hỗ trợ JPG, PNG, WebP, GIF, SVG' });
    }

    const ext = path.extname(data.filename).toLowerCase() || '.png';
    const key = `${BRANDING_PREFIX}logo-banner-${crypto.randomBytes(6).toString('hex')}${ext}`;

    // Delete old branding image if exists
    const old = await prisma.siteSetting.findUnique({ where: { key: 'logoBgKey' } });
    if (old) {
      try { await minioClient.removeObject(env.MINIO_BUCKET_MEDIA, old.value); } catch {}
    }

    await minioClient.putObject(env.MINIO_BUCKET_MEDIA, key, data.file, undefined as any, {
      'Content-Type': data.mimetype,
    } as any);

    // Save key (MinIO path) and public URL value
    await prisma.siteSetting.upsert({
      where: { key: 'logoBgKey' },
      create: { key: 'logoBgKey', value: key },
      update: { value: key },
    });
    await prisma.siteSetting.upsert({
      where: { key: 'logoBg' },
      create: { key: 'logoBg', value: '/api/site-settings/branding/image' },
      update: { value: '/api/site-settings/branding/image' },
    });

    await invalidateCache();
    return { message: 'Đã cập nhật ảnh branding', url: '/api/site-settings/branding/image' };
  });

  // Admin: delete branding logo
  app.delete('/branding', { preHandler: requireAdmin }, async (req, reply) => {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'logoBgKey' } });
    if (setting) {
      try { await minioClient.removeObject(env.MINIO_BUCKET_MEDIA, setting.value); } catch {}
      await prisma.siteSetting.deleteMany({ where: { key: { in: ['logoBgKey', 'logoBg'] } } });
    }
    await invalidateCache();
    return { message: 'Đã xóa ảnh branding' };
  });

  // Admin: set/update any setting (key-value)
  app.patch('/:key', { preHandler: requireAdmin }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const { value } = req.body as { value: string };
    if (!value && value !== '') return reply.status(400).send({ error: 'Thiếu value' });

    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await invalidateCache();
    return { key, value };
  });
}
