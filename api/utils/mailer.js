// api/utils/mailer.js
import nodemailer from 'nodemailer';
import mustache from 'mustache'; // optional; if not installed, use template strings
import fs from 'fs';
import path from 'path';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 465;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT == 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || `Assessly <${SMTP_USER}>`;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn('⚠️ SMTP credentials not fully set. Emails will fail until SMTP_HOST/SMTP_USER/SMTP_PASS are configured.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Optional: verify transporter on startup (non-blocking)
transporter.verify().then(() => {
  console.log('✅ SMTP transporter verified');
}).catch(err => {
  console.warn('⚠️ SMTP verify failed:', err.message);
});

export async function sendMail({ to, subject, html, text }) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    text: text || htmlToPlain(html),
    html,
  };
  return transporter.sendMail(mailOptions);
}

function htmlToPlain(html) {
  return html.replace(/<\/?[^>]+(>|$)/g, ""); // simple fallback
}

/* Helper templates (can be moved to /templates) */
export function verificationEmailTemplate({ name, verifyUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#1e88e5">Verify your email</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for signing up for Assessly. Please verify your email by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#1e88e5;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy & paste this link into your browser:</p>
      <p style="word-break:break-all;"><small>${verifyUrl}</small></p>
      <hr/>
      <p style="font-size:12px;color:#666;">If you didn't create an account, you can ignore this email.</p>
    </div>
  `;
  return html;
}

export function passwordResetEmailTemplate({ name, resetUrl }) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color:#e53935">Password reset request</h2>
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your password. Click the link below to reset it. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#e53935;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
      <p style="word-break:break-all;"><small>${resetUrl}</small></p>
    </div>
  `;
  return html;
}
