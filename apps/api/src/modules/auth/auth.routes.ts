import crypto from 'crypto';
import { z } from 'zod';
import { FastifyInstance } from 'fastify';
import {
  register, login, createTokens, refreshTokens,
  logout, sendVerificationOtp, verifyEmail,
  forgotPassword, resetPassword, googleOAuth,
} from './auth.service';
import {
  registerSchema, loginSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema,
} from './auth.schema';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';
import { redis } from '../../services/redis';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', {
    config: { rateLimit: { max: 50, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const user = await register(body);
    return reply.status(201).send({ message: 'Đăng ký thành công. Vui lòng xác minh email.', user });
  });

  app.post('/login', {
    config: { rateLimit: { max: 150, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    let user: Awaited<ReturnType<typeof login>>;
    try {
      user = await login(body, req.headers['user-agent'], req.ip);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'Account suspended') return reply.status(403).send({ error: 'Tài khoản đã bị khoá' });
      return reply.status(401).send({ error: 'Email hoặc mật khẩu không đúng' });
    }
    const tokens = await createTokens(app, user.id, user.role, user.name, req.headers['user-agent'], req.ip);

    return reply
      .setCookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS)
      .send({
        accessToken: tokens.accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
      });
  });

  app.post('/refresh', async (req, reply) => {
    const cookieToken = (req.cookies as any)?.refreshToken;
    const bodyToken = (req.body as any)?.refreshToken;
    const token = cookieToken || bodyToken;
    if (!token) return reply.status(401).send({ error: 'No refresh token' });

    const tokens = await refreshTokens(app, token);
    return reply
      .setCookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS)
      .send({ accessToken: tokens.accessToken });
  });

  app.post('/logout', { preHandler: requireAuth }, async (req, reply) => {
    const token = (req.cookies as any)?.refreshToken;
    if (token) await logout(token);
    return reply
      .clearCookie('refreshToken', { path: '/' })
      .send({ message: 'Đã đăng xuất' });
  });

  app.post('/verify-email', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, _reply) => {
    const body = verifyEmailSchema.parse(req.body);
    await verifyEmail(body.email, body.otp);
    return { message: 'Email đã được xác minh' };
  });

  app.post('/resend-otp', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (req, _reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const { prisma } = await import('../../services/prisma');
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond the same way — don't reveal if email exists
    if (user) {
      try { await sendVerificationOtp(user.id, user.email, user.name); } catch {}
    }
    return { message: 'Nếu email tồn tại, OTP đã được gửi lại' };
  });

  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (req, _reply) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    await forgotPassword(email);
    return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi' };
  });

  app.post('/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, _reply) => {
    const body = resetPasswordSchema.parse(req.body);
    await resetPassword(body.token, body.password);
    return { message: 'Mật khẩu đã được đặt lại' };
  });

  app.get('/google', async (req, reply) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
      return reply.status(503).send({ error: 'Google OAuth not configured' });
    }
    const state = crypto.randomBytes(16).toString('hex');
    await redis.setex(`oauth:state:${state}`, 600, '1');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'online');

    return reply.redirect(url.toString());
  });

  app.get('/google/callback', async (req, reply) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    const frontendLogin = `${env.FRONTEND_URL}/login`;

    if (error || !code || !state) {
      return reply.redirect(`${frontendLogin}?error=oauth_cancelled`);
    }

    const valid = await redis.get(`oauth:state:${state}`);
    if (!valid) return reply.redirect(`${frontendLogin}?error=invalid_state`);
    await redis.del(`oauth:state:${state}`);

    try {
      const user = await googleOAuth(code, env.GOOGLE_REDIRECT_URI!);
      const tokens = await createTokens(app, user.id, user.role, user.name);

      reply.setCookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS);

      // Store access token in Redis for short-lived exchange — avoids exposing token in URL
      const exchangeCode = crypto.randomBytes(24).toString('hex');
      await redis.setex(
        `oauthcode:${exchangeCode}`,
        60,
        JSON.stringify({ accessToken: tokens.accessToken, role: user.role }),
      );

      return reply.redirect(`${env.FRONTEND_URL}/oauth/callback?code=${exchangeCode}`);
    } catch {
      return reply.redirect(`${frontendLogin}?error=oauth_failed`);
    }
  });

  // Exchange short-lived OAuth code for access token (one-time use, 60s TTL)
  app.post('/oauth/exchange', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
    const raw = await redis.get(`oauthcode:${code}`);
    if (!raw) return reply.status(400).send({ error: 'Code không hợp lệ hoặc đã hết hạn' });
    await redis.del(`oauthcode:${code}`);
    const { accessToken, role } = JSON.parse(raw) as { accessToken: string; role: string };
    return { accessToken, role };
  });

  app.get('/me', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { prisma } = await import('../../services/prisma');
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: sub },
      select: {
        id: true, email: true, name: true, username: true,
        avatarUrl: true, bio: true, role: true,
        isVerified: true, twoFAEnabled: true,
        createdAt: true,
      },
    });
    return user;
  });

  // ─── SESSION MANAGEMENT ───────────────────────────────────────────────────

  app.get('/sessions', { preHandler: requireAuth }, async (req) => {
    const { sub } = req.user as { sub: string };
    const { prisma } = await import('../../services/prisma');
    const currentToken = (req.cookies as any)?.refreshToken;
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true, token: true },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentToken,
    }));
  });

  app.delete('/sessions/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const { prisma } = await import('../../services/prisma');
    const session = await prisma.refreshToken.findUnique({ where: { id } });
    if (!session || session.userId !== sub) return reply.status(404).send({ error: 'Phiên không tồn tại' });
    await prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
    return { message: 'Đã đăng xuất phiên' };
  });

  app.delete('/sessions', { preHandler: requireAuth }, async (req, _reply) => {
    const { sub } = req.user as { sub: string };
    const { prisma } = await import('../../services/prisma');
    const currentToken = (req.cookies as any)?.refreshToken;
    await prisma.refreshToken.updateMany({
      where: { userId: sub, revokedAt: null, ...(currentToken ? { token: { not: currentToken } } : {}) },
      data: { revokedAt: new Date() },
    });
    return { message: 'Đã đăng xuất tất cả thiết bị khác' };
  });
}
