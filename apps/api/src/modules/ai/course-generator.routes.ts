/**
 * Module 4 — AI Course Generator Routes
 * POST /ai/generate-course — tạo khóa học tự động bằng AI
 * GET  /ai/generate-course/templates — mẫu topic gợi ý
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { generateCourse } from '../../services/course-generator';

const generateSchema = z.object({
  topic:          z.string().min(2).max(100),
  level:          z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  targetAudience: z.string().min(2).max(100).default('học sinh phổ thông'),
  durationWeeks:  z.number().int().min(1).max(12).default(4),
  language:       z.enum(['vi', 'en']).default('vi'),
});

const TOPIC_TEMPLATES = [
  { topic: 'Đại số cơ bản', level: 'BEGINNER',      audience: 'học sinh lớp 8-9',    subject: 'math'     },
  { topic: 'Hình học phẳng', level: 'INTERMEDIATE',  audience: 'học sinh lớp 10',      subject: 'math'     },
  { topic: 'English Grammar A2', level: 'BEGINNER',  audience: 'người mới học tiếng Anh', subject: 'language' },
  { topic: 'IELTS Writing Task 2', level: 'ADVANCED', audience: 'học sinh thi IELTS',  subject: 'language' },
  { topic: 'Văn nghị luận xã hội', level: 'INTERMEDIATE', audience: 'học sinh lớp 11-12', subject: 'viet' },
  { topic: 'Lập trình Python cơ bản', level: 'BEGINNER', audience: 'người mới học lập trình', subject: 'general' },
  { topic: 'Xác suất và thống kê', level: 'INTERMEDIATE', audience: 'học sinh lớp 11', subject: 'math' },
  { topic: 'Speaking & Pronunciation', level: 'INTERMEDIATE', audience: 'học sinh muốn cải thiện phát âm', subject: 'language' },
];

export async function courseGeneratorRoutes(app: FastifyInstance) {
  // GET /ai/generate-course/templates
  app.get('/generate-course/templates', { preHandler: requireAuth }, async (_req, reply) => {
    return reply.send({ templates: TOPIC_TEMPLATES });
  });

  // POST /ai/generate-course
  app.post('/generate-course', { preHandler: requireAuth }, async (req, reply) => {
    const body = generateSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ', details: body.error.errors });

    const { sub } = req.user as { sub: string };

    try {
      const result = await generateCourse({
        ...body.data,
        instructorId: sub,
      });
      return reply.send({ ok: true, ...result });
    } catch (err: any) {
      const msg = err?.message?.includes('không hợp lệ')
        ? err.message
        : 'AI không khả dụng, vui lòng thử lại';
      return reply.status(503).send({ error: msg });
    }
  });
}
