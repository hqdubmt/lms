import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';
import { sendMail, verifyEmailTemplate, resetPasswordTemplate } from '../../services/mail';
import { env } from '../../config/env';
import type { RegisterInput, LoginInput } from './auth.schema';

const OTP_TTL = 60 * 10; // 10 minutes
const RESET_TTL = 60 * 30; // 30 minutes
const BCRYPT_ROUNDS = 12;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, isVerified: true, isActive: true },
  });

  // Send OTP if email is configured — don't block registration if mail fails
  try { await sendVerificationOtp(user.id, user.email, user.name); } catch {}
  return { id: user.id, email: user.email, name: user.name };
}

export async function login(input: LoginInput, userAgent?: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account suspended');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  return user;
}

export async function createTokens(
  fastify: any,
  userId: string,
  role: string,
  name?: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const accessToken = fastify.jwt.sign(
    { sub: userId, role, name },
    { expiresIn: env.JWT_ACCESS_EXPIRES },
  );

  const rawRefresh = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: rawRefresh,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    },
  });

  return { accessToken, refreshToken: rawRefresh };
}

export async function refreshTokens(fastify: any, rawToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Invalid refresh token');
  }

  // Rotate: revoke old, create new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
  return createTokens(fastify, user.id, user.role, user.name);
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });
}

export async function sendVerificationOtp(userId: string, email: string, name: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(`otp:verify:${email}`, OTP_TTL, otp);
  await sendMail({ to: email, subject: 'Xác minh email - MasterLMS', html: verifyEmailTemplate(name, otp) });
}

export async function verifyEmail(email: string, otp: string) {
  const stored = await redis.get(`otp:verify:${email}`);
  if (!stored || stored !== otp) throw new Error('Invalid or expired OTP');

  await Promise.all([
    prisma.user.update({ where: { email }, data: { isVerified: true } }),
    redis.del(`otp:verify:${email}`),
  ]);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent – don't leak user existence

  const token = crypto.randomBytes(32).toString('hex');
  await redis.setex(`reset:${token}`, RESET_TTL, user.id);

  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Đặt lại mật khẩu - MasterLMS',
    html: resetPasswordTemplate(user.name, link),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const userId = await redis.get(`reset:${token}`);
  if (!userId) throw new Error('Invalid or expired token');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
    redis.del(`reset:${token}`),
  ]);
}

export async function googleOAuth(code: string, redirectUri: string) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) throw new Error('Failed to exchange Google code');
  const { access_token } = await tokenRes.json() as { access_token: string };

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) throw new Error('Failed to get Google user info');
  const gUser = await userRes.json() as { id: string; email: string; name: string; picture: string };

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: gUser.id }, { email: gUser.email }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: gUser.email,
        name: gUser.name,
        googleId: gUser.id,
        avatarUrl: gUser.picture,
        isVerified: true,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: gUser.id, avatarUrl: user.avatarUrl || gUser.picture },
    });
  }

  if (!user.isActive) throw new Error('Account suspended');
  return user;
}
