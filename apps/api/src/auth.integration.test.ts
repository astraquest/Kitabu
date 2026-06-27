import assert from 'node:assert/strict';
import test from 'node:test';
import { buildServer } from './server.js';
import { db, redis } from './db.js';
import { hashOpaqueToken, signAccessToken } from './auth.js';

const app = buildServer({
  emailSender: async () => false,
  googleTokenVerifier: async idToken => ({
    subject: idToken,
    email: `${idToken}@example.com`,
    fullName: 'Google Test Parent'
  })
});

async function requestDistinctDevelopmentPhoneCode(
  payload: Record<string, unknown>,
  staleCode: string
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/phone/request',
      payload
    });
    assert.equal(response.statusCode, 200);
    const code = response.json().developmentCode;
    assert.match(code, /^\d{6}$/);
    if (code !== staleCode) {
      return code;
    }
  }
  throw new Error('Unable to generate a distinct development OTP for stale-code coverage');
}

test.after(async () => {
  await app.close();
  await redis.quit();
  await db.end();
});

test('verified phone login issues a usable session', async () => {
  const requestCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: { purpose: 'login', phoneNumber: '0700000001' }
  });
  assert.equal(requestCode.statusCode, 200);
  const code = requestCode.json().developmentCode;
  assert.match(code, /^\d{6}$/);

  const verifyCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'login', phoneNumber: '0700000001', code }
  });
  assert.equal(verifyCode.statusCode, 200);
  const session = verifyCode.json();
  assert.equal(session.user.phoneVerified, true);

  const protectedRoute = await app.inject({
    method: 'GET',
    url: '/learning/weekly-exam',
    headers: { authorization: `Bearer ${session.accessToken}` }
  });
  assert.equal(protectedRoute.statusCode, 200);

  const refresh = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    payload: { refreshToken: session.refreshToken }
  });
  assert.equal(refresh.statusCode, 200);
  const refreshedSession = refresh.json();
  assert.equal(refreshedSession.user.phoneVerified, true);

  const refreshedProtectedRoute = await app.inject({
    method: 'GET',
    url: '/learning/weekly-exam',
    headers: { authorization: `Bearer ${refreshedSession.accessToken}` }
  });
  assert.equal(refreshedProtectedRoute.statusCode, 200);
});

test('phone login does not enumerate accounts and locks a code after five failures', async () => {
  const missing = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: { purpose: 'login', phoneNumber: '0799999999' }
  });
  assert.equal(missing.statusCode, 200);
  assert.equal(missing.json().developmentCode, undefined);

  const requestCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: { purpose: 'login', phoneNumber: '0700000001' }
  });
  const code = requestCode.json().developmentCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failure = await app.inject({
      method: 'POST',
      url: '/auth/phone/verify',
      payload: { purpose: 'login', phoneNumber: '0700000001', code: '999999' }
    });
    assert.equal(failure.statusCode, 400);
  }
  const locked = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'login', phoneNumber: '0700000001', code }
  });
  assert.equal(locked.statusCode, 400);
});

test('phone login accepts only the latest requested OTP', async () => {
  const firstRequest = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: { purpose: 'login', phoneNumber: '0700000001' }
  });
  assert.equal(firstRequest.statusCode, 200);
  const staleCode = firstRequest.json().developmentCode;
  assert.match(staleCode, /^\d{6}$/);

  const latestCode = await requestDistinctDevelopmentPhoneCode(
    { purpose: 'login', phoneNumber: '0700000001' },
    staleCode
  );

  const staleVerify = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'login', phoneNumber: '0700000001', code: staleCode }
  });
  assert.equal(staleVerify.statusCode, 400);

  const latestVerify = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'login', phoneNumber: '0700000001', code: latestCode }
  });
  assert.equal(latestVerify.statusCode, 200);
});

test('phone signup requires OTP and rejects duplicate signup', async () => {
  const suffix = Date.now().toString().slice(-7);
  const phoneNumber = `071${suffix}`.slice(0, 10);
  const requestCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'signup',
      phoneNumber,
      fullName: 'OTP Test Parent',
      role: 'parent',
      acceptedTerms: true
    }
  });
  assert.equal(requestCode.statusCode, 200);

  const verifyCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: {
      purpose: 'signup',
      phoneNumber,
      code: requestCode.json().developmentCode
    }
  });
  assert.equal(verifyCode.statusCode, 200);
  const session = verifyCode.json();
  assert.equal(session.user.phoneVerified, true);
  assert.deepEqual(session.user.roles, ['parent']);

  const duplicate = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'signup',
      phoneNumber,
      fullName: 'Duplicate Parent',
      role: 'parent',
      acceptedTerms: true
    }
  });
  assert.equal(duplicate.statusCode, 409);

  const deletion = await app.inject({
    method: 'DELETE',
    url: '/me/account',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { confirmationText: 'DELETE MY ACCOUNT' }
  });
  assert.equal(deletion.statusCode, 200);
  assert.equal(deletion.json().deletionRequested, true);

  const refreshAfterDeletionRequest = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    payload: { refreshToken: session.refreshToken }
  });
  assert.equal(refreshAfterDeletionRequest.statusCode, 401);
});

test('phone signup accepts only the latest requested OTP', async () => {
  const suffix = Date.now().toString().slice(-7);
  const phoneNumber = `074${suffix}`.slice(0, 10);
  const firstRequest = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'signup',
      phoneNumber,
      fullName: 'Stale OTP Parent',
      role: 'parent',
      acceptedTerms: true
    }
  });
  assert.equal(firstRequest.statusCode, 200);
  const staleCode = firstRequest.json().developmentCode;
  assert.match(staleCode, /^\d{6}$/);

  const latestCode = await requestDistinctDevelopmentPhoneCode(
    {
      purpose: 'signup',
      phoneNumber,
      fullName: 'Latest OTP Parent',
      role: 'parent',
      acceptedTerms: true
    },
    staleCode
  );

  const staleVerify = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'signup', phoneNumber, code: staleCode }
  });
  assert.equal(staleVerify.statusCode, 400);

  const latestVerify = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: { purpose: 'signup', phoneNumber, code: latestCode }
  });
  assert.equal(latestVerify.statusCode, 200);
  assert.equal(latestVerify.json().user.fullName, 'Latest OTP Parent');

  const deletion = await app.inject({
    method: 'DELETE',
    url: '/me/account',
    headers: { authorization: `Bearer ${latestVerify.json().accessToken}` },
    payload: { confirmationText: 'DELETE MY ACCOUNT' }
  });
  assert.equal(deletion.statusCode, 200);
  assert.equal(deletion.json().deletionRequested, true);
});

test('phone signup validation fails cleanly before issuing an OTP', async () => {
  const missingTerms = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'signup',
      phoneNumber: '0712345000',
      fullName: 'Missing Terms Parent',
      role: 'parent'
    }
  });
  assert.equal(missingTerms.statusCode, 400);
  assert.equal(missingTerms.json().error, 'Bad Request');
  assert.match(missingTerms.json().message, /Check the submitted details/);
  assert.ok(
    missingTerms.json().issues.some((issue: { path: string[] }) => issue.path.includes('acceptedTerms'))
  );

  const invalidPhone = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'login',
      phoneNumber: '123'
    }
  });
  assert.equal(invalidPhone.statusCode, 400);
  assert.equal(invalidPhone.json().error, 'Bad Request');
  assert.match(invalidPhone.json().message, /Check the submitted details/);
  assert.ok(
    invalidPhone.json().issues.some((issue: { path: string[] }) => issue.path.includes('phoneNumber'))
  );
});

test('unverified email sessions cannot access product routes', async () => {
  const email = `unverified-${Date.now()}@example.com`;
  const created = await db.query<{ id: string }>(
    `WITH user_row AS (
       INSERT INTO users (
         email, password_hash, full_name, status, email_verified, gender, grade_level,
         onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES ($1, 'test-hash', 'Unverified Test User', 'active', FALSE, 'not_specified', NULL, TRUE, NOW(), 'test', 'test')
       RETURNING id
     ), role_row AS (
       INSERT INTO user_roles (user_id, role)
       SELECT id, 'parent'::user_role FROM user_row
       RETURNING user_id
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
    fullName: 'Unverified Test User',
    emailVerified: false,
    roles: ['parent'],
    gender: 'not_specified',
    grade: null,
    onboardingCompleted: true,
    stepUp: false,
    mustRotatePassword: false,
    isBreakGlass: false
  });

  const protectedRoute = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${accessToken}` }
  });
  assert.equal(protectedRoute.statusCode, 403);

  await db.query('DELETE FROM users WHERE id = $1', [userId]);
});

test('email signup requires verification before product access and refreshes after confirmation', async () => {
  const suffix = Date.now().toString();
  const email = `email-verification-parent-${suffix}@example.com`;
  const signup = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: {
      fullName: 'Email Verification Parent',
      email,
      password: 'ParentPass123!',
      role: 'parent',
      acceptedTerms: true
    }
  });
  assert.equal(signup.statusCode, 201);
  const signupSession = signup.json();
  assert.equal(signupSession.user.emailVerified, false);

  const blocked = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${signupSession.accessToken}` }
  });
  assert.equal(blocked.statusCode, 403);

  const rawVerificationToken = `email-verification-token-${suffix}`;
  await db.query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [signupSession.user.id]
  );
  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [signupSession.user.id, hashOpaqueToken(rawVerificationToken)]
  );

  const confirmed = await app.inject({
    method: 'POST',
    url: '/auth/email-verification/confirm',
    payload: { token: rawVerificationToken }
  });
  assert.equal(confirmed.statusCode, 200);
  assert.match(confirmed.json().message, /Email verified/);

  const refresh = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    payload: { refreshToken: signupSession.refreshToken }
  });
  assert.equal(refresh.statusCode, 200);
  const refreshedSession = refresh.json();
  assert.equal(refreshedSession.user.emailVerified, true);

  const protectedRoute = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${refreshedSession.accessToken}` }
  });
  assert.equal(protectedRoute.statusCode, 200);

  const deletion = await app.inject({
    method: 'DELETE',
    url: '/me/account',
    headers: { authorization: `Bearer ${refreshedSession.accessToken}` },
    payload: { confirmationText: 'DELETE MY ACCOUNT' }
  });
  assert.equal(deletion.statusCode, 200);
  assert.equal(deletion.json().deletionRequested, true);
});

test('parent links multiple verified students by email and phone and sees real dashboard stats', async () => {
  const suffix = Date.now().toString();
  const parentPhone = `072${suffix.slice(-7)}`;
  const emailStudentEmail = `parent-email-child-${suffix}@example.com`;
  const phoneStudentEmail = `parent-phone-child-${suffix}@example.com`;
  const phoneStudentNumber = `25473${suffix.slice(-7)}`;

  const requestCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/request',
    payload: {
      purpose: 'signup',
      phoneNumber: parentPhone,
      fullName: 'Parent Dashboard Tester',
      role: 'parent',
      acceptedTerms: true
    }
  });
  assert.equal(requestCode.statusCode, 200);

  const verifyCode = await app.inject({
    method: 'POST',
    url: '/auth/phone/verify',
    payload: {
      purpose: 'signup',
      phoneNumber: parentPhone,
      code: requestCode.json().developmentCode
    }
  });
  assert.equal(verifyCode.statusCode, 200);
  const parentSession = verifyCode.json();

  const inserted = await db.query<{
    email_student_id: string;
    phone_student_id: string;
    assignment_id: string;
    strand_id: string;
    sub_strand_id: string;
  }>(
    `WITH email_student AS (
       INSERT INTO users (
         school_id, email, password_hash, full_name, status, email_verified, email_verified_at,
         gender, grade_level, onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES (
         '11111111-1111-4111-8111-111111111111', $1, 'test-hash', 'Email Linked Student',
         'active', TRUE, NOW(), 'not_specified', 'Grade 8', TRUE, NOW(), 'test', 'test'
       )
       RETURNING id
     ), phone_student AS (
       INSERT INTO users (
         school_id, email, password_hash, full_name, status, email_verified, email_verified_at,
         phone_number, phone_verified, phone_verified_at, gender, grade_level, onboarding_completed,
         terms_accepted_at, terms_version, privacy_version
       )
       VALUES (
         '11111111-1111-4111-8111-111111111111', $2, 'test-hash', 'Phone Linked Student',
         'active', TRUE, NOW(), $3, TRUE, NOW(), 'not_specified', 'Grade 8', TRUE, NOW(), 'test', 'test'
       )
       RETURNING id
     ), roles AS (
       INSERT INTO user_roles (user_id, role)
       SELECT id, 'student'::user_role FROM email_student
       UNION ALL
       SELECT id, 'student'::user_role FROM phone_student
       RETURNING user_id
     ), strand AS (
       INSERT INTO curriculum_strands (grade_level, subject_id, subject_name, number, title, sub_title, position)
       VALUES ('Grade 8', 'parent-test-' || $4, 'Parent Test', '1', 'Parent Test Strand', '', 9100)
       ON CONFLICT (grade_level, subject_id, position) DO UPDATE SET title = EXCLUDED.title
       RETURNING id
     ), sub_strand AS (
       INSERT INTO curriculum_sub_strands (strand_id, number, title, type, position)
       SELECT id, '1.1', 'Parent Test Lesson', 'knowledge', 1 FROM strand
       ON CONFLICT (strand_id, position) DO UPDATE SET title = EXCLUDED.title
       RETURNING id
     ), assignment AS (
       INSERT INTO assignments (school_id, teacher_id, title, description, due_at, grade_level, subject)
       VALUES (
         '11111111-1111-4111-8111-111111111111',
         '20000000-0000-0000-0000-000000000002',
         'Parent Dashboard Assignment',
         'Regression coverage',
         NOW() + INTERVAL '2 days',
         'Grade 8',
         'Mathematics'
       )
       RETURNING id
     ), submission AS (
       INSERT INTO submissions (assignment_id, student_id, score, submitted_at, status, answers)
       SELECT assignment.id, email_student.id, 84, NOW(), 'Completed', '[]'::jsonb
       FROM assignment, email_student
       RETURNING id
     ), progress AS (
       INSERT INTO user_curriculum_progress (user_id, sub_strand_id, quiz_score, completed_at, updated_at, passed)
       SELECT email_student.id, sub_strand.id, 88, NOW(), NOW(), TRUE
       FROM email_student, sub_strand
       RETURNING user_id
     ), mastery AS (
       INSERT INTO mastery_scores (user_id, subject_id, sub_strand_key, mastery_score, attempt_count, last_practiced_at)
       SELECT email_student.id, 'mathematics', 'fractions', 0.86, 3, NOW()
       FROM email_student
       RETURNING user_id
     ), review AS (
       INSERT INTO spaced_repetition_schedules (user_id, subject_id, sub_strand_key, next_review_date)
       SELECT email_student.id, 'english', 'grammar', CURRENT_DATE
       FROM email_student
       RETURNING user_id
     ), diagnostic AS (
       INSERT INTO diagnostic_sessions (user_id, kind, subjects, status, completed_at, result_summary)
       SELECT email_student.id, 'onboarding', ARRAY['mathematics'], 'completed', NOW(), '{"percentage": 82}'::jsonb
       FROM email_student
       RETURNING user_id
     )
     SELECT
       (SELECT id FROM email_student) AS email_student_id,
       (SELECT id FROM phone_student) AS phone_student_id,
       (SELECT id FROM assignment) AS assignment_id,
       (SELECT id FROM strand) AS strand_id,
       (SELECT id FROM sub_strand) AS sub_strand_id`,
    [emailStudentEmail, phoneStudentEmail, phoneStudentNumber, suffix]
  );

  const emailLink = await app.inject({
    method: 'POST',
    url: '/parent/children/link',
    headers: { authorization: `Bearer ${parentSession.accessToken}` },
    payload: { studentEmail: emailStudentEmail.toUpperCase() }
  });
  assert.equal(emailLink.statusCode, 201);

  const phoneLink = await app.inject({
    method: 'POST',
    url: '/parent/children/link',
    headers: { authorization: `Bearer ${parentSession.accessToken}` },
    payload: { studentPhone: `073${suffix.slice(-7)}` }
  });
  assert.equal(phoneLink.statusCode, 201);

  const dashboard = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${parentSession.accessToken}` }
  });
  assert.equal(dashboard.statusCode, 200);
  const children = dashboard.json().children;
  assert.equal(children.length, 2);

  const emailChild = children.find((child: { email: string }) => child.email === emailStudentEmail);
  const phoneChild = children.find((child: { email: string }) => child.email === phoneStudentEmail);
  assert.ok(emailChild);
  assert.ok(phoneChild);
  assert.equal(emailChild.assessment_average, 84);
  assert.equal(emailChild.homework_completion, 100);
  assert.equal(emailChild.completed_lessons, 1);
  assert.equal(emailChild.mastery_average, 86);
  assert.equal(emailChild.due_reviews, 1);
  assert.equal(emailChild.diagnostic.completed, true);
  assert.equal(emailChild.diagnostic.percentage, 82);
  assert.equal(emailChild.recent_assignments[0].title, 'Parent Dashboard Assignment');
  assert.equal(emailChild.weekly_report.assessmentAverage, 84);
  assert.equal(phoneChild.assessment_average, 0);

  const unlink = await app.inject({
    method: 'DELETE',
    url: `/parent/children/${inserted.rows[0].phone_student_id}`,
    headers: { authorization: `Bearer ${parentSession.accessToken}` }
  });
  assert.equal(unlink.statusCode, 200);

  const afterUnlink = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${parentSession.accessToken}` }
  });
  assert.equal(afterUnlink.statusCode, 200);
  assert.equal(afterUnlink.json().children.length, 1);

  await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
    [parentSession.user.id, inserted.rows[0].email_student_id, inserted.rows[0].phone_student_id]
  ]);
  await db.query('DELETE FROM assignments WHERE id = $1', [inserted.rows[0].assignment_id]);
  await db.query('DELETE FROM curriculum_strands WHERE id = $1', [inserted.rows[0].strand_id]);
});

test('Google signup links a verified identity and supports subsequent login', async () => {
  const idToken = `google-${Date.now()}-${'x'.repeat(100)}`;
  const signup = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken, role: 'parent', acceptedTerms: true }
  });
  assert.equal(signup.statusCode, 200);
  const firstSession = signup.json();
  assert.equal(firstSession.user.emailVerified, true);
  assert.deepEqual(firstSession.user.roles, ['parent']);

  const login = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken }
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().user.id, firstSession.user.id);

  const deletion = await app.inject({
    method: 'DELETE',
    url: '/me/account',
    headers: { authorization: `Bearer ${login.json().accessToken}` },
    payload: { confirmationText: 'DELETE MY ACCOUNT' }
  });
  assert.equal(deletion.statusCode, 200);
  assert.equal(deletion.json().deletionRequested, true);
});

test('Google login links an existing email account and satisfies verification gate', async () => {
  const suffix = Date.now();
  const idToken = `google-existing-${suffix}-${'x'.repeat(100)}`;
  const email = `${idToken}@example.com`;
  const created = await db.query<{ id: string }>(
    `WITH user_row AS (
       INSERT INTO users (
         email, password_hash, full_name, status, email_verified, gender, grade_level,
         onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES ($1, 'test-hash', 'Existing Google Parent', 'active', FALSE, 'not_specified', NULL, TRUE, NOW(), 'test', 'test')
       RETURNING id
     ), role_row AS (
       INSERT INTO user_roles (user_id, role)
       SELECT id, 'parent'::user_role FROM user_row
       RETURNING user_id
     )
     SELECT id FROM user_row`,
    [email]
  );

  const login = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken }
  });
  assert.equal(login.statusCode, 200);
  const session = login.json();
  assert.equal(session.user.id, created.rows[0].id);
  assert.equal(session.user.emailVerified, true);
  assert.deepEqual(session.user.roles, ['parent']);

  const protectedRoute = await app.inject({
    method: 'GET',
    url: '/parent/dashboard',
    headers: { authorization: `Bearer ${session.accessToken}` }
  });
  assert.equal(protectedRoute.statusCode, 200);

  await db.query('DELETE FROM users WHERE id = $1', [created.rows[0].id]);
});

test('Google login cannot replace an existing Google identity on the same email account', async () => {
  const suffix = Date.now();
  const originalToken = `google-original-${suffix}-${'x'.repeat(100)}`;
  const replacementToken = `google-replacement-${suffix}-${'x'.repeat(100)}`;
  const email = `${replacementToken}@example.com`;
  const created = await db.query<{ id: string }>(
    `WITH user_row AS (
       INSERT INTO users (
         email, password_hash, full_name, status, email_verified, gender, grade_level,
         onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES ($1, 'test-hash', 'Existing Linked Google Parent', 'active', TRUE, 'not_specified', NULL, TRUE, NOW(), 'test', 'test')
       RETURNING id
     ), role_row AS (
       INSERT INTO user_roles (user_id, role)
       SELECT id, 'parent'::user_role FROM user_row
       RETURNING user_id
     ), identity_row AS (
       INSERT INTO user_auth_identities (user_id, provider, provider_subject, provider_email)
       SELECT id, 'google', $2, $1 FROM user_row
       RETURNING user_id
     )
     SELECT id FROM user_row`,
    [email, originalToken]
  );

  const replacement = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: replacementToken }
  });
  assert.equal(replacement.statusCode, 409);
  assert.match(replacement.json().message, /already linked/);

  const original = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: originalToken }
  });
  assert.equal(original.statusCode, 200);
  assert.equal(original.json().user.id, created.rows[0].id);

  await db.query('DELETE FROM users WHERE id = $1', [created.rows[0].id]);
});

test('Google signup requires role and accepted terms for a new identity', async () => {
  const missingRoleToken = `google-missing-role-${Date.now()}-${'x'.repeat(100)}`;
  const missingRole = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: missingRoleToken, acceptedTerms: true }
  });
  assert.equal(missingRole.statusCode, 400);
  assert.match(missingRole.json().message, /Choose an account role/);

  const missingTermsToken = `google-missing-terms-${Date.now()}-${'x'.repeat(100)}`;
  const missingTerms = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: missingTermsToken, role: 'parent' }
  });
  assert.equal(missingTerms.statusCode, 400);
  assert.match(missingTerms.json().message, /accept the Terms/);
});
