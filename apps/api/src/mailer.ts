import nodemailer from 'nodemailer';
import { appConfig } from './config.js';

type TransactionalEmail = {
  kind?: 'authentication' | 'notification';
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
      from: appConfig.KITABU_TRANSACTIONAL_MAIL_FROM || appConfig.KITABU_MAIL_FROM,
      replyTo: appConfig.KITABU_TRANSACTIONAL_REPLY_TO,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      priority: 'high',
      headers: {
        'X-Kitabu-Message-Type': message.kind ?? 'notification'
      }
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

type MascotKey = 'rabbit' | 'lion' | 'elephant' | 'panda';

const MASCOT_EMAIL_CONTENT: Record<MascotKey, { file: string; name: string }> = {
  rabbit: { file: 'sungura-rabbit.png', name: 'Rafiki the Rabbit' },
  lion: { file: 'simba-lion.png', name: 'Rafiki the Lion' },
  elephant: { file: 'ndovu-elephant.png', name: 'Rafiki the Elephant' },
  panda: { file: 'panda.png', name: 'Rafiki the Panda' },
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstName(value?: string) {
  return value?.trim().split(/\s+/)[0] || 'there';
}

function renderKitabuEmail(args: {
  eyebrow: string;
  heading: string;
  intro: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote: string;
  mascotKey?: MascotKey;
}) {
  const mascot = MASCOT_EMAIL_CONTENT[args.mascotKey ?? 'rabbit'];
  const mascotUrl = `https://app.kitabu.ai/assets/mascot/${mascot.file}`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FFF7ED;font-family:Arial,'Segoe UI',sans-serif;color:#172033">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(args.intro)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFF7ED;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:28px;overflow:hidden;border:1px solid #FED7AA">
        <tr><td style="background:#F97316;padding:28px 32px 22px;color:#FFFFFF">
          <div style="font-size:14px;font-weight:800;letter-spacing:1.5px">KITABU AI</div>
          <div style="font-size:13px;margin-top:5px;color:#FFEDD5">${escapeHtml(args.eyebrow)}</div>
        </td></tr>
        <tr><td style="padding:30px 32px 10px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td style="vertical-align:top;padding-right:18px">
              <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#172033">${escapeHtml(args.heading)}</h1>
              <p style="margin:0;font-size:17px;line-height:1.65;color:#475569">${escapeHtml(args.intro)}</p>
            </td>
            <td width="118" style="vertical-align:top;text-align:right">
              <img src="${mascotUrl}" width="112" alt="${escapeHtml(mascot.name)}" style="display:block;width:112px;height:auto;margin-left:auto" />
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 32px 30px">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:18px 20px;font-size:16px;line-height:1.65;color:#334155">${escapeHtml(args.body)}</div>
          <div style="margin:24px 0">
            <a href="${escapeHtml(args.buttonUrl)}" style="display:inline-block;background:#168A62;color:#FFFFFF;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:14px">${escapeHtml(args.buttonLabel)} &rarr;</a>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748B">${escapeHtml(args.footnote)}</p>
        </td></tr>
        <tr><td style="background:#172033;padding:18px 32px;color:#CBD5E1;font-size:12px;line-height:1.6">
          Learning feels lighter with the right Rafiki.<br />Need help? Reply to this email or contact hello@kitabu.ai.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildPasswordResetEmail(args: { recipientEmail: string; recipientName?: string; resetUrl: string; ttlMinutes: number; mascotKey?: MascotKey }) {
  const subject = 'Reset your Kitabu AI password';
  const text = [
    'A password reset was requested for your Kitabu AI account.',
    '',
    `Use this secure link within ${args.ttlMinutes} minutes:`,
    args.resetUrl,
    '',
    'If you did not request this reset, you can ignore this email.',
    '',
    'Need help? Contact somakitabu254@gmail.com or call 0716175485.',
    'Kitabu AI'
  ].join('\n');

  const html = renderKitabuEmail({
    eyebrow: 'Account security',
    heading: 'Fresh password, fresh start 🔐',
    intro: `Hi ${firstName(args.recipientName)}, your Rafiki is ready to help you get back in.`,
    body: `Use the secure button below within ${args.ttlMinutes} minutes to choose a new password.`,
    buttonLabel: 'Reset my password',
    buttonUrl: args.resetUrl,
    footnote: 'Didn’t request this? You can safely ignore this email—your password will stay unchanged.',
    mascotKey: args.mascotKey,
  });

  return {
    kind: 'authentication' as const,
    to: args.recipientEmail,
    subject,
    text,
    html
  };
}

export function buildEmailVerificationEmail(args: {
  recipientEmail: string;
  recipientName?: string;
  verificationUrl: string;
  ttlMinutes: number;
  mascotKey?: MascotKey;
}) {
  const subject = 'Verify your email to finish setting up Kitabu AI';
  const text = [
    'You created a Kitabu AI account with this email address.',
    '',
    `Verify your email using this secure link within ${args.ttlMinutes} minutes:`,
    args.verificationUrl,
    '',
    'If you did not create this account, you can ignore this email.',
    '',
    'Need help? Contact somakitabu254@gmail.com or call 0716175485.',
    'Kitabu AI'
  ].join('\n');

  const html = renderKitabuEmail({
    eyebrow: 'One quick step',
    heading: 'Your learning adventure is ready! 🚀',
    intro: `Hi ${firstName(args.recipientName)}, your Rafiki saved you a seat.`,
    body: `Verify your email within ${args.ttlMinutes} minutes, then jump back into Kitabu AI and start learning your way.`,
    buttonLabel: 'Verify my email',
    buttonUrl: args.verificationUrl,
    footnote: 'Didn’t create this account? No worries—ignore this email and nothing will change.',
    mascotKey: args.mascotKey,
  });

  return {
    kind: 'authentication' as const,
    to: args.recipientEmail,
    subject,
    text,
    html
  };
}

const KITABU_ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=ai.kitabu2.twa';

export function buildWelcomeEmail(args: { recipientEmail: string }) {
  const subject = "You're in! 🥳";
  const text = [
    subject,
    '',
    'Hi!',
    '',
    "You got in! Your child is one of the first kids in the country to get access to Kitabu, and it's completely free to start!",
    "Kitabu is an app that teaches your child through personalized lessons in various subjects. It's fun and helps them learn!",
    '',
    "Here's how to get the app:",
    `If you’re using an Android device, use this link: ${KITABU_ANDROID_APP_URL}`,
    'If you’re using an Apple device, we are coming soon.',
    '',
    'A couple things to know:',
    'This is a new product, and as an early tester some of your usage data will be shared with the team to help us improve the product. You may also hit some bugs or half-finished features. Use it naturally with your child and tell us what you notice.',
    '',
    "Thanks for doing this, we can't wait to hear what you think of Kitabu AI.",
    '',
    'Warmly,',
    'Samora'
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#FFF7ED;font-family:Arial,'Segoe UI',sans-serif;color:#172033">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">You got in! Your child is one of the first kids in the country to get access to Kitabu.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFF7ED;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:28px;overflow:hidden;border:1px solid #FED7AA">
        <tr><td style="background:#F97316;padding:28px 32px 22px;color:#FFFFFF">
          <div style="font-size:14px;font-weight:800;letter-spacing:1.5px">KITABU AI</div>
          <div style="font-size:13px;margin-top:5px;color:#FFEDD5">Early access welcome</div>
        </td></tr>
        <tr><td style="padding:30px 32px 10px">
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#172033">You’re in! 🥳</h1>
          <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#475569">Hi!</p>
          <p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:#475569">You got in! Your child is one of the first kids in the country to get access to Kitabu, and it’s completely free to start!</p>
          <p style="margin:0;font-size:17px;line-height:1.65;color:#475569">Kitabu is an app that teaches your child through personalized lessons in various subjects. It’s fun and helps them learn!</p>
        </td></tr>
        <tr><td style="padding:12px 32px 30px">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:18px 20px;font-size:16px;line-height:1.65;color:#334155">
            <p style="margin:0 0 12px;font-weight:800;color:#172033">Here’s how to get the app:</p>
            <p style="margin:0 0 12px">If you’re using an Android device, use this link:</p>
            <a href="${KITABU_ANDROID_APP_URL}" style="display:inline-block;background:#168A62;color:#FFFFFF;text-decoration:none;font-size:17px;font-weight:800;padding:15px 24px;border-radius:14px">Get Kitabu on Android &rarr;</a>
            <p style="margin:16px 0 0">If you’re using an Apple device, we are coming soon.</p>
          </div>
          <div style="margin-top:24px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:18px;padding:18px 20px;font-size:16px;line-height:1.65;color:#334155">
            <p style="margin:0 0 12px;font-weight:800;color:#172033">A couple things to know:</p>
            <p style="margin:0">This is a new product, and as an early tester some of your usage data will be shared with the team to help us improve the product. You may also hit some bugs or half-finished features. Use it naturally with your child and tell us what you notice.</p>
          </div>
          <p style="margin:24px 0 0;font-size:16px;line-height:1.65;color:#334155">Thanks for doing this, we can’t wait to hear what you think of Kitabu AI.</p>
          <p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#334155">Warmly,<br />Samora</p>
        </td></tr>
        <tr><td style="background:#172033;padding:18px 32px;color:#CBD5E1;font-size:12px;line-height:1.6">
          Learning feels lighter with the right Rafiki.<br />Need help? Reply to this email or contact hello@kitabu.ai.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    kind: 'notification' as const,
    to: args.recipientEmail,
    subject,
    text,
    html
  };
}
