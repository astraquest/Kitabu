import nodemailer from 'nodemailer';
import { appConfig } from './config.js';

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function buildTransport() {
  if (!appConfig.KITABU_SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: appConfig.KITABU_SMTP_HOST,
    port: appConfig.KITABU_SMTP_PORT,
    secure: appConfig.KITABU_SMTP_SECURE,
    connectionTimeout: appConfig.KITABU_SMTP_TIMEOUT_MS,
    greetingTimeout: appConfig.KITABU_SMTP_TIMEOUT_MS,
    socketTimeout: appConfig.KITABU_SMTP_TIMEOUT_MS,
    auth:
      appConfig.KITABU_SMTP_USER && appConfig.KITABU_SMTP_PASS
        ? {
            user: appConfig.KITABU_SMTP_USER,
            pass: appConfig.KITABU_SMTP_PASS
          }
        : undefined
  });
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const transport = buildTransport();
  if (!transport) {
    return false;
  }

  let timeout: NodeJS.Timeout | null = null;
  try {
    const delivery = transport.sendMail({
      from: appConfig.KITABU_MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    const deliveryTimeout = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        transport.close();
        reject(new Error('SMTP delivery timed out'));
      }, appConfig.KITABU_SMTP_TIMEOUT_MS);
    });
    await Promise.race([delivery, deliveryTimeout]);
  } catch {
    return false;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    transport.close();
  }

  return true;
}

export function buildPasswordResetEmail(args: { recipientEmail: string; resetUrl: string; ttlMinutes: number }) {
  const subject = 'Reset your Kitabu AI password';
  const text = [
    'We received a request to reset your Kitabu AI password.',
    '',
    `Use this secure link within ${args.ttlMinutes} minutes:`,
    args.resetUrl,
    '',
    'If you did not request this reset, you can ignore this email.',
    '',
    'Need help? Contact somakitabu254@gmail.com or call 0716175485.',
    'Kitabu AI'
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 16px">Reset your Kitabu AI password</h2>
      <p>We received a request to reset your Kitabu AI password.</p>
      <p>
        <a href="${args.resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f7f5f;color:#ffffff;text-decoration:none;font-weight:700">
          Reset Password
        </a>
      </p>
      <p>This link expires in ${args.ttlMinutes} minutes.</p>
      <p>If you did not request this reset, you can ignore this email.</p>
      <p>Need help? Email <a href="mailto:somakitabu254@gmail.com">somakitabu254@gmail.com</a> or call 0716175485.</p>
      <p style="margin-top:24px">Kitabu AI</p>
    </div>
  `;

  return {
    to: args.recipientEmail,
    subject,
    text,
    html
  };
}

export function buildEmailVerificationEmail(args: {
  recipientEmail: string;
  verificationUrl: string;
  ttlMinutes: number;
}) {
  const subject = 'Verify your Kitabu AI email';
  const text = [
    'Welcome to Kitabu AI.',
    '',
    `Verify your email using this secure link within ${args.ttlMinutes} minutes:`,
    args.verificationUrl,
    '',
    'If you did not create this account, you can ignore this email.',
    '',
    'Need help? Contact somakitabu254@gmail.com or call 0716175485.',
    'Kitabu AI'
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 16px">Verify your Kitabu AI email</h2>
      <p>Welcome to Kitabu AI.</p>
      <p>
        <a href="${args.verificationUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f7f5f;color:#ffffff;text-decoration:none;font-weight:700">
          Verify Email
        </a>
      </p>
      <p>This link expires in ${args.ttlMinutes} minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
      <p>Need help? Email <a href="mailto:somakitabu254@gmail.com">somakitabu254@gmail.com</a> or call 0716175485.</p>
      <p style="margin-top:24px">Kitabu AI</p>
    </div>
  `;

  return {
    to: args.recipientEmail,
    subject,
    text,
    html
  };
}
