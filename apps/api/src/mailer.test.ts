import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

const testJwtKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env.KITABU_RUNTIME_ENV = 'test';
process.env.KITABU_NODE_ENV = 'test';
process.env.KITABU_DATABASE_URL ??= 'postgresql://kitabu:kitabu@127.0.0.1:5432/kitabu_test';
process.env.KITABU_REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.KITABU_JWT_ISSUER ??= 'kitabu-test';
process.env.KITABU_JWT_AUDIENCE ??= 'kitabu-test';
process.env.KITABU_JWT_PRIVATE_KEY = testJwtKeys.privateKey
  .export({ format: 'pem', type: 'pkcs8' })
  .toString();
process.env.KITABU_JWT_PUBLIC_KEY = testJwtKeys.publicKey
  .export({ format: 'pem', type: 'spki' })
  .toString();

const { buildEmailVerificationEmail, buildPasswordResetEmail } = await import('./mailer.js');

test('authentication emails remain transactional and free of marketing metadata', () => {
  const messages = [
    buildEmailVerificationEmail({
      recipientEmail: 'parent@example.com',
      verificationUrl: 'https://app.kitabu.ai/verify-email?token=test',
      ttlMinutes: 60,
    }),
    buildPasswordResetEmail({
      recipientEmail: 'parent@example.com',
      resetUrl: 'https://app.kitabu.ai/reset-password?token=test',
      ttlMinutes: 30,
    }),
  ];

  for (const message of messages) {
    assert.equal(message.kind, 'authentication');
    assert.doesNotMatch(`${message.subject}\n${message.text}\n${message.html}`, /unsubscribe|promotion|offer/i);
  }
});

test('verification email clearly describes the requested account action', () => {
  const message = buildEmailVerificationEmail({
    recipientEmail: 'parent@example.com',
    verificationUrl: 'https://app.kitabu.ai/verify-email?token=test',
    ttlMinutes: 60,
  });

  assert.match(message.subject, /^Verify your email/);
  assert.match(message.text, /You created a Kitabu AI account/);
  assert.match(message.html, /Your learning adventure is ready/);
  assert.match(message.html, /sungura-rabbit\.png/);
});

test('verification email uses the selected mascot and recipient first name', () => {
  const message = buildEmailVerificationEmail({
    recipientEmail: 'parent@example.com',
    recipientName: 'Amina Kamau',
    mascotKey: 'lion',
    verificationUrl: 'https://app.kitabu.ai/verify-email?token=test',
    ttlMinutes: 60,
  });

  assert.match(message.html, /Hi Amina/);
  assert.match(message.html, /simba-lion\.png/);
  assert.doesNotMatch(message.html, /sungura-rabbit\.png/);
});
