import 'dotenv/config';
import cluster from 'cluster';
import os from 'os';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';

import { env } from './config/env';
import { prisma } from './services/prisma';
import { redis } from './services/redis';
import { connectMongo } from './services/mongo';
import { initMinioBuckets } from './services/minio';
import { setupSocket } from './websocket/socket';

import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import { lessonsRoutes } from './modules/lessons/lessons.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { classRoutes } from './modules/admin/class.routes';
import { liveSessionsRoutes } from './modules/admin/live-sessions.routes';
import { backupRoutes } from './modules/admin/backup.routes';
import { markitdownRoutes } from './modules/admin/markitdown.routes';
import { documentRoutes } from './modules/documents/document.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { todoRoutes } from './modules/todo/todo.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { languageRoutes } from './modules/language/language.routes';
import { mathRoutes } from './modules/math/math.routes';
import { vietRoutes } from './modules/viet/viet.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { siteSettingsRoutes } from './modules/site-settings/site-settings.routes';
import { announcementRoutes } from './modules/announcements/announcement.routes';
import { forumRoutes } from './modules/forum/forum.routes';
import { quizRoutes } from './modules/quiz/quiz.routes';
import { learningRoutes } from './modules/ai/learning.routes';
import { analyticsRoutes } from './modules/ai/analytics.routes';
import { knowledgeGraphRoutes } from './modules/ai/knowledge-graph.routes';
import { instructorToolsRoutes } from './modules/instructor/instructor-tools.routes';
import { classAnalyticsRoutes } from './modules/instructor/class-analytics.routes';
import { adminStatsRoutes } from './modules/ai/admin-stats.routes';
import { gamificationRoutes } from './modules/ai/gamification.routes';
import { studyPlanRoutes } from './modules/ai/study-plan.routes';
import { languageCoachRoutes } from './modules/ai/language-coach.routes';
import { revisionRoutes } from './modules/ai/revision.routes';
import { timelineRoutes } from './modules/ai/timeline.routes';
import { reportCardRoutes } from './modules/ai/report-card.routes';
import { xpGamificationRoutes } from './modules/ai/xp-gamification.routes';
import { pronunciationRoutes } from './modules/pronunciation/pronunciation.routes';
import { ieltsCoachRoutes } from './modules/ai/ielts-coach.routes';
import { adaptiveRoutes } from './modules/ai/adaptive.routes';
import { teacherAiRoutes } from './modules/instructor/teacher-ai.routes';
import { instructorStudentMgmtRoutes } from './modules/instructor/instructor-student-mgmt.routes';
import { platformRoutes } from './modules/ai/platform.routes';
import { courseGeneratorRoutes } from './modules/ai/course-generator.routes';
import { metricsRoutes } from './modules/admin/metrics.routes';
import { aiFeedbackRoutes } from './modules/ai/ai-feedback.routes';
import { learningDnaRoutes } from './modules/ai/learning-dna.routes';
import { marketplaceRoutes } from './modules/ai/marketplace.routes';
import { enterpriseRoutes } from './modules/admin/enterprise.routes';
import { ecosystemRoutes } from './modules/ai/ecosystem.routes';
import { guildRoutes } from './modules/ai/guild.routes';
import { learningFlowRoutes } from './modules/learning-flow/learning-flow.routes';

const NUM_WORKERS = Math.min(os.cpus().length, parseInt(process.env.CLUSTER_WORKERS || '2'));

if (cluster.isPrimary) {
  console.log(`[Primary ${process.pid}] Forking ${NUM_WORKERS} workers`);
  for (let i = 0; i < NUM_WORKERS; i++) cluster.fork();

  cluster.on('exit', (worker) => {
    if (!worker.exitedAfterDisconnect) {
      console.log(`[Primary] Worker ${worker.process.pid} died — restarting`);
      cluster.fork();
    }
  });
} else {
  // BullMQ workers: each process runs its own instance (parallel job processing)
  import('./workers/email.worker');
  import('./workers/video.worker');

  const app = Fastify({ logger: env.NODE_ENV === 'development' });

  process.on('SIGTERM', async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  async function bootstrap() {
    // Redis must connect first — used by rate limiter and Socket.IO adapter
    await redis.connect();

    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    });

    const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean);
    await app.register(cors, { origin: allowedOrigins, credentials: true });
    await app.register(cookie);

    // Redis-backed rate limit: shared counter across all worker processes
    await app.register(rateLimit, {
      max: 600,
      timeWindow: '1 minute',
      redis,
      keyGenerator: (req) => {
        // req.user is not set yet at this hook (JWT verify happens in preHandler).
        // Decode the JWT payload directly (no signature verify) to get user ID for rate-limit key.
        // Full auth verification still happens in route preHandlers.
        const auth = (req.headers as any).authorization as string | undefined;
        if (auth?.startsWith('Bearer ')) {
          try {
            const payload = JSON.parse(
              Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString('utf8'),
            ) as { sub?: string } | null;
            if (payload?.sub) return `user:${payload.sub}`;
          } catch { /* fall through to IP */ }
        }
        return `ip:${req.ip}`;
      },
      errorResponseBuilder: (_req, context) => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
      }),
    });

    await app.register(compress, { global: true, threshold: 1024 });
    await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });
    await app.register(jwt, {
      secret: env.JWT_ACCESS_SECRET,
      cookie: { cookieName: 'auth_token', signed: false },
    });

    app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
      if (!body || (body as string).trim() === '') { done(null, {}); return; }
      try { done(null, JSON.parse(body as string)); } catch (e: any) { done(e, undefined); }
    });

    // Must be registered BEFORE routes so it applies to all of them
    app.setErrorHandler((err: any, _req, reply) => {
      app.log.error(err);
      if (err.name === 'ZodError' || Array.isArray(err.issues)) {
        return reply.status(400).send({ error: 'Validation error', details: err.issues ?? JSON.parse(err.message) });
      }
      const status = err.statusCode || 500;
      reply.status(status).send({ error: err.message || 'Internal server error' });
    });

    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(usersRoutes, { prefix: '/users' });
    await app.register(coursesRoutes, { prefix: '/courses' });
    await app.register(lessonsRoutes, { prefix: '/lessons' });
    await app.register(uploadRoutes, { prefix: '/upload' });
    await app.register(todoRoutes, { prefix: '/todos' });
    await app.register(notificationRoutes, { prefix: '/notifications' });
    await app.register(languageRoutes, { prefix: '/language' });
    await app.register(mathRoutes, { prefix: '/math' });
    await app.register(vietRoutes, { prefix: '/viet' });
    await app.register(aiRoutes, { prefix: '/ai' });
    await app.register(learningRoutes, { prefix: '/ai' });
    await app.register(analyticsRoutes, { prefix: '/ai/analytics' });
    await app.register(knowledgeGraphRoutes, { prefix: '/ai' });
    await app.register(mediaRoutes, { prefix: '/media' });
    await app.register(siteSettingsRoutes, { prefix: '/site-settings' });
    await app.register(announcementRoutes, { prefix: '/announcements' });
    await app.register(forumRoutes, { prefix: '/forum' });
    await app.register(quizRoutes, { prefix: '/quiz' });
    await app.register(adminRoutes, { prefix: '/admin' });
    await app.register(classRoutes, { prefix: '/admin' });
    await app.register(liveSessionsRoutes, { prefix: '/admin' });
    await app.register(backupRoutes, { prefix: '/admin' });
    await app.register(markitdownRoutes, { prefix: '/admin' });
    await app.register(documentRoutes, { prefix: '/admin/documents' });
    await app.register(instructorToolsRoutes, { prefix: '/instructor' });
    await app.register(classAnalyticsRoutes, { prefix: '/instructor' });
    await app.register(adminStatsRoutes, { prefix: '/ai' });
    await app.register(gamificationRoutes, { prefix: '/ai' });
    await app.register(studyPlanRoutes, { prefix: '/ai' });
    await app.register(languageCoachRoutes, { prefix: '/ai' });
    await app.register(revisionRoutes, { prefix: '/ai' });
    await app.register(timelineRoutes, { prefix: '/ai' });
    await app.register(reportCardRoutes, { prefix: '/ai' });
    await app.register(xpGamificationRoutes, { prefix: '/ai' });
    await app.register(pronunciationRoutes, { prefix: '/ai' });
    await app.register(ieltsCoachRoutes, { prefix: '/ai' });
    await app.register(adaptiveRoutes, { prefix: '/ai' });
    await app.register(teacherAiRoutes, { prefix: '/instructor' });
    await app.register(instructorStudentMgmtRoutes, { prefix: '/instructor' });
    await app.register(platformRoutes, { prefix: '/ai' });
    await app.register(courseGeneratorRoutes, { prefix: '/ai' });
    await app.register(metricsRoutes);
    await app.register(aiFeedbackRoutes, { prefix: '/ai' });
    await app.register(learningDnaRoutes, { prefix: '/ai' });
    await app.register(marketplaceRoutes, { prefix: '/marketplace' });
    await app.register(enterpriseRoutes, { prefix: '/admin' });
    await app.register(ecosystemRoutes, { prefix: '/ai' });
    await app.register(guildRoutes, { prefix: '/ai' });
    await app.register(learningFlowRoutes, { prefix: '/learning' });

    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    await connectMongo();
    await initMinioBuckets();
    setupSocket(app);

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`[Worker ${process.pid}] MasterLMS API running on port ${env.PORT}`);
  }

  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
