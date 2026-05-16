import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    ...opts,
  });
}

export function verifyEmailTemplate(name: string, otp: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Xác minh email - MasterLMS</h2>
      <p>Xin chào ${name},</p>
      <p>Mã OTP của bạn là:</p>
      <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
      <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
    </div>
  `;
}

export function resetPasswordTemplate(name: string, link: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Đặt lại mật khẩu - MasterLMS</h2>
      <p>Xin chào ${name},</p>
      <p>Click vào link dưới đây để đặt lại mật khẩu (hiệu lực 30 phút):</p>
      <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Đặt lại mật khẩu</a>
    </div>
  `;
}
