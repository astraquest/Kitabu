import assert from 'node:assert/strict';
import test from 'node:test';
import { signAccessToken } from './auth.js';
import { appConfig } from './config.js';
import { db, redis } from './db.js';
import { buildServer } from './server.js';

const app = buildServer();

async function createStudentSession() {
  const email = `assessment-narration-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const created = await db.query<{ id: string }>(
    `WITH user_row AS (
       INSERT INTO users (
         email, password_hash, full_name, status, email_verified, email_verified_at,
         gender, grade_level, onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES ($1, 'test-hash', 'Assessment Narration Tester', 'active', TRUE, NOW(), 'not_specified', NULL, TRUE, NOW(), 'test', 'test')
       RETURNING id
     ), role_row AS (
       INSERT INTO user_roles (user_id, role)
       SELECT id, 'student'::user_role FROM user_row
     )
     SELECT id FROM user_row`,
    [email]
  );
  const userId = created.rows[0].id;
  const accessToken = await signAccessToken({
    sub: userId,
    schoolId: null,
    email,
    phoneNumber: null,
    phoneVerified: false,
    fullName: 'Assessment Narration Tester',
    emailVerified: true,
    roles: ['student'],
    gender: 'not_specified',
    grade: null,
    onboardingCompleted: true,
    stepUp: false,
    mustRotatePassword: false,
    isBreakGlass: false
  });
  return { userId, accessToken };
}

test.after(async () => {
  await app.close();
  await redis.quit();
  await db.end();
});

test('assessment narration route rejects arbitrary locales before descriptor lookup', async () => {
  const session = await createStudentSession();
  try {
    const rejected = await app.inject({
      method: 'POST',
      url: '/tts/resolve',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { descriptorId: 'diagnostic:missing', segment: 'question', languageCode: 'fr-FR' }
    });
    assert.equal(rejected.statusCode, 400);
  } finally {
    await db.query('DELETE FROM users WHERE id = $1', [session.userId]);
  }
});

test('assessment narration route applies the authenticated per-user AI rate limit', async () => {
  const session = await createStudentSession();
  const otherSession = await createStudentSession();
  try {
    for (let attempt = 0; attempt < appConfig.KITABU_AI_RATE_LIMIT_MAX; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/tts/resolve',
        headers: { authorization: `Bearer ${session.accessToken}` },
        payload: { descriptorId: 'diagnostic:missing', segment: 'question', languageCode: 'not-supported' }
      });
      assert.equal(response.statusCode, 400);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/tts/resolve',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { descriptorId: 'diagnostic:missing', segment: 'question', languageCode: 'not-supported' }
    });
    assert.equal(limited.statusCode, 429);

    const otherUserResponse = await app.inject({
      method: 'POST',
      url: '/tts/resolve',
      headers: { authorization: `Bearer ${otherSession.accessToken}` },
      payload: { descriptorId: 'diagnostic:missing', segment: 'question', languageCode: 'not-supported' }
    });
    assert.equal(otherUserResponse.statusCode, 400);
  } finally {
    await db.query('DELETE FROM users WHERE id = $1', [session.userId]);
    await db.query('DELETE FROM users WHERE id = $1', [otherSession.userId]);
  }
});
