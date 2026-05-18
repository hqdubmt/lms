import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { minioClient } from '../../services/minio';
import { env } from '../../config/env';

const updateProgressSchema = z.object({
  isCompleted: z.boolean().optional(),
  watchTime: z.number().optional(),
  lastPosition: z.number().optional(),
});

async function checkLessonAccess(userId: string, role: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { section: { select: { courseId: true } } },
  });
  if (!lesson) return false;
  if (lesson.isFree) return true;
  if (role === 'ADMIN') return true;

  const courseId = lesson.section.courseId;

  // Instructor of this course
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  if (course?.instructorId === userId) return true;

  // Enrolled student
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  return !!enrollment;
}

export async function lessonsRoutes(app: FastifyInstance) {
  // Get lesson detail + signed video URL
  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub, role } = req.user as { sub: string; role: string };
    const { id } = req.params as { id: string };

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id },
      include: { section: { select: { courseId: true } } },
    });

    const hasAccess = await checkLessonAccess(sub, role, id);
    if (!hasAccess) return reply.status(403).send({ error: 'Bạn chưa có quyền truy cập bài học này' });

    // Prefer MinIO proxy for uploaded files; fall back to external videoUrl saved in DB
    let videoUrl: string | null = lesson.videoUrl || null;
    const videoKey = lesson.videoHlsKey || lesson.videoKey;
    if (videoKey) {
      videoUrl = `/api/lessons/${id}/video`;
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: sub, lessonId: id } },
    });

    return { ...lesson, videoUrl, progress };
  });

  // Stream video with range request support (no CORS issues — served via API)
  // Accepts token via ?token= query param so <video src> can play without custom headers
  app.get('/:id/video', async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { token?: string };

    let sub: string;
    let role: string;
    try {
      if (query.token) {
        const decoded = (app as any).jwt.verify(query.token) as { sub: string; role: string };
        sub = decoded.sub;
        role = decoded.role;
      } else {
        await req.jwtVerify();
        const u = req.user as { sub: string; role: string };
        sub = u.sub;
        role = u.role;
      }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const hasAccess = await checkLessonAccess(sub, role, id);
    if (!hasAccess) return reply.status(403).send({ error: 'Không có quyền truy cập' });

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id } });
    const key = lesson.videoHlsKey || lesson.videoKey;
    if (!key) return reply.status(404).send({ error: 'Bài học chưa có video' });

    const bucket = env.MINIO_BUCKET_VIDEOS;

    try {
      const stat = await minioClient.statObject(bucket, key);
      const fileSize = stat.size;
      const rangeHeader = (req.headers as any).range as string | undefined;

      const ext = key.split('.').pop()?.toLowerCase() || 'mp4';
      const mime: Record<string, string> = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
      };
      const contentType = mime[ext] || 'video/mp4';

      if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : Math.min(start + 5 * 1024 * 1024 - 1, fileSize - 1);
        const chunkSize = end - start + 1;

        const stream = await minioClient.getPartialObject(bucket, key, start, chunkSize);
        reply.status(206);
        reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        reply.header('Accept-Ranges', 'bytes');
        reply.header('Content-Length', String(chunkSize));
        reply.header('Content-Type', contentType);
        return reply.send(stream);
      } else {
        const stream = await minioClient.getObject(bucket, key);
        reply.header('Content-Length', String(fileSize));
        reply.header('Content-Type', contentType);
        reply.header('Accept-Ranges', 'bytes');
        return reply.send(stream);
      }
    } catch {
      return reply.status(404).send({ error: 'Không tìm thấy file video' });
    }
  });

  // Update lesson progress
  app.patch('/:id/progress', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const body = updateProgressSchema.parse(req.body);

    const data: any = { ...body };
    if (body.isCompleted) data.completedAt = new Date();

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: sub, lessonId: id } },
      update: data,
      create: { userId: sub, lessonId: id, ...data },
    });

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id },
      include: { section: { select: { courseId: true, course: { select: { totalLessons: true } } } } },
    });

    const completedCount = await prisma.lessonProgress.count({
      where: { userId: sub, isCompleted: true, lesson: { section: { courseId: lesson.section.courseId } } },
    });

    const total = lesson.section.course.totalLessons;
    if (total > 0) {
      const progressPct = Math.round((completedCount / total) * 100);
      await prisma.enrollment.update({
        where: { userId_courseId: { userId: sub, courseId: lesson.section.courseId } },
        data: {
          progress: progressPct,
          ...(progressPct >= 100 ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        },
      });
    }

    return progress;
  });

  // Instructor: get presigned upload URL for video
  app.post('/:id/upload-url', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { filename } = req.body as { filename: string };
    const key = `lessons/${id}/${Date.now()}-${filename}`;
    // Return key + direct upload via API (avoids MinIO CORS)
    return { key };
  });

  // Instructor: upload video through API server (avoids CORS)
  app.post('/:id/upload-video', { preHandler: requireInstructor }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowed.includes(data.mimetype)) {
      await data.file.resume();
      return reply.status(400).send({ error: 'Chỉ chấp nhận file video (mp4, webm, mov, avi)' });
    }

    const ext = (data.filename || 'video.mp4').split('.').pop()?.toLowerCase() || 'mp4';
    const key = `lessons/${id}/${Date.now()}.${ext}`;

    await minioClient.putObject(env.MINIO_BUCKET_VIDEOS, key, data.file, undefined as any, {
      'Content-Type': data.mimetype,
    } as any);

    await prisma.lesson.update({ where: { id }, data: { videoKey: key } });
    return { key, message: 'Upload thành công' };
  });

  // Instructor: save video key after upload
  app.patch('/:id/video-key', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { videoKey } = req.body as { videoKey: string };
    return prisma.lesson.update({ where: { id }, data: { videoKey } });
  });
}
