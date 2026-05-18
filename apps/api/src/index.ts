import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

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
import { uploadRoutes } from './modules/upload/upload.routes';
import { todoRoutes } from './modules/todo/todo.routes';
import './workers/email.worker';

const app = Fastify({ logger: env.NODE_ENV === 'development' });

async function bootstrap() {
  // Plugins
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  // Cho phép body rỗng với Content-Type: application/json (tránh 400 trên DELETE/GET)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || (body as string).trim() === '') { done(null, {}); return; }
    try { done(null, JSON.parse(body as string)); } catch (e: any) { done(e, undefined); }
  });

  // Routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(coursesRoutes, { prefix: '/courses' });
  await app.register(lessonsRoutes, { prefix: '/lessons' });
  await app.register(uploadRoutes, { prefix: '/upload' });
  await app.register(todoRoutes, { prefix: '/todos' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(classRoutes, { prefix: '/admin' });
  await app.register(liveSessionsRoutes, { prefix: '/admin' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Error handler
  app.setErrorHandler((err, req, reply) => {
    app.log.error(err);
    if (err.name === 'ZodError') {
      return reply.status(400).send({ error: 'Validation error', details: err.message });
    }
    const status = err.statusCode || 500;
    reply.status(status).send({ error: err.message || 'Internal server error' });
  });

  // Connect services
  await redis.connect();
  await connectMongo();
  await initMinioBuckets();

  // Socket.IO
  setupSocket(app);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`🚀 MasterLMS API running on port ${env.PORT}`);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
