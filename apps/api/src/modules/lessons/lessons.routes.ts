import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../services/prisma';
import { requireAuth, requireInstructor } from '../../middleware/auth';
import { minioClient, getSignedUrl, getUploadUrl } from '../../services/minio';
import { env } from '../../config/env';

const updateProgressSchema = z.object({
  isCompleted: z.boolean().optional(),
  watchTime: z.number().optional(),
  lastPosition: z.number().optional(),
});

export async function lessonsRoutes(app: FastifyInstance) {
  // Get lesson (must be enrolled or lesson is free)
  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };

    const lesson = await prisma.lesson.findUniqueOrThrow({
      where: { id },
      include: { section: { select: { courseId: true } } },
    });

    if (!lesson.isFree) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: sub, courseId: lesson.section.courseId } },
      });
      if (!enrollment) return reply.status(403).send({ error: 'Bạn chưa đăng ký khóa học này' });
    }

    // Generate signed URL for video
    let videoUrl: string | null = null;
    if (lesson.videoHlsKey) {
      videoUrl = await getSignedUrl(env.MINIO_BUCKET_VIDEOS, lesson.videoHlsKey, 7200);
    } else if (lesson.videoKey) {
      videoUrl = await getSignedUrl(env.MINIO_BUCKET_VIDEOS, lesson.videoKey, 7200);
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: sub, lessonId: id } },
    });

    return { ...lesson, videoUrl, progress };
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

    // Update enrollment progress
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

  // Instructor: get upload URL for video
  app.post('/:id/upload-url', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { filename } = req.body as { filename: string };
    const key = `lessons/${id}/${Date.now()}-${filename}`;
    const url = await getUploadUrl(env.MINIO_BUCKET_VIDEOS, key, 3600);
    return { url, key };
  });

  // Instructor: save video key after upload
  app.patch('/:id/video-key', { preHandler: requireInstructor }, async (req) => {
    const { id } = req.params as { id: string };
    const { videoKey } = req.body as { videoKey: string };
    return prisma.lesson.update({ where: { id }, data: { videoKey } });
  });
}
