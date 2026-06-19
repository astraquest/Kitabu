import type { PoolClient, QueryResultRow } from 'pg';
import { db } from './db.js';
import type {
  AppRole,
  AuthenticatedUser,
  EmailVerificationTokenRecord,
  PasswordResetTokenRecord
} from './types.js';
import type { BillingPlanCode } from './payments.js';

type MaybeClient = PoolClient | typeof db;

function q<T extends QueryResultRow>(client: MaybeClient, text: string, values: unknown[] = []) {
  return client.query<T>(text, values);
}

export interface UserRecord {
  id: string;
  school_id: string | null;
  email: string;
  phone_number: string | null;
  phone_verified: boolean;
  phone_verified_at: Date | null;
  full_name: string;
  password_hash: string;
  email_verified: boolean;
  gender: 'male' | 'female' | 'not_specified';
  grade_level: string | null;
  onboarding_completed: boolean;
  terms_accepted_at: Date | null;
  terms_version: string | null;
  privacy_version: string | null;
  must_rotate_password: boolean;
  is_break_glass: boolean;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  session_id: string;
  session_binding_hash: string;
  device_label: string | null;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface SubscriptionPlanRecord {
  id: string;
  code: BillingPlanCode;
  name: string;
  billing_cycle: 'weekly' | 'monthly' | 'annual';
  price_ksh_cents: string;
  is_pro: boolean;
  is_hidden: boolean;
}

export interface BillingProfileRecord {
  user_id: string;
  mpesa_phone_number: string | null;
  updated_at: Date;
}

export interface PaymentRequestRecord {
  id: string;
  user_id: string;
  plan_id: string;
  plan_code: BillingPlanCode;
  status: string;
  amount_ksh_cents: string;
  phone_number: string;
  return_to: string;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  result_code: number | null;
  result_desc: string | null;
  expires_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

export interface SchoolDiscountRecord {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_ksh';
  amount: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SchoolRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  location: string;
  principal: string | null;
  phone: string | null;
  email: string | null;
  assigned_plan_id: string;
  assigned_plan_code: BillingPlanCode;
  assigned_plan_name: string;
  assigned_billing_cycle: 'weekly' | 'monthly' | 'annual';
  assigned_plan_price_ksh_cents: string;
  discount_id: string | null;
  discount_name: string | null;
  discount_type: 'percentage' | 'fixed_ksh' | null;
  discount_amount: number | null;
  total_students: number;
  grade_counts: Record<string, number>;
  pilot_status?: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
  pilot_start_date?: Date | null;
  pilot_end_date?: Date | null;
  pilot_target_students?: number;
  pilot_onboarding_stage?: number;
  pilot_notes?: string | null;
  pilot_onboarded_students?: number;
  pilot_engaged_students?: number;
  pilot_average_mastery?: number;
}

export interface BannerAnnouncementRecord {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_target: string;
  starts_at: Date;
  ends_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CurriculumStrandInput {
  number?: string;
  title: string;
  subTitle?: string;
  subStrands: Array<{
    number?: string;
    title: string;
    type: 'knowledge' | 'skill' | 'competence';
    description?: string;
    pages?: Array<{ title: string; content: string }>;
    outcomes?: Array<{ id?: string; text: string }>;
    inquiryQuestions?: Array<{ id?: string; text: string }>;
  }>;
}

export interface CurriculumStrandRecord {
  id: string;
  grade_level: string;
  subject_id: string;
  subject_name: string;
  number: string | null;
  title: string;
  sub_title: string;
  position: number;
}

export interface CurriculumSubStrandRecord {
  id: string;
  strand_id: string;
  number: string | null;
  title: string;
  type: 'knowledge' | 'skill' | 'competence';
  description: string | null;
  position: number;
  outcomes: Array<{ id?: string; text: string }>;
  inquiry_questions: Array<{ id?: string; text: string }>;
  pages: Array<{ title: string; content: string }>;
  lesson_generated_at: Date | null;
}

export interface CurriculumSubjectBundle {
  subjectId: string;
  subjectName: string;
  strands: Array<{
    id: string;
    title: string;
    subTitle: string;
    number?: string;
    subStrands: Array<{
      id: string;
      title: string;
      type: 'knowledge' | 'skill' | 'competence';
      description?: string;
      pages: Array<{ title: string; content: string }>;
      isLocked: boolean;
      isCompleted: boolean;
      needsRemediation: boolean;
      masteryScore: number | null;
      unlockReason?: string;
      number?: string;
      outcomes: Array<{ id: string; text: string }>;
      inquiryQuestions: Array<{ id: string; text: string }>;
    }>;
  }>;
}

export interface LibraryBookRecord {
  id: string;
  title: string;
  author: string;
  spine_color: string;
  text_color: string;
  height: string;
  spine_pattern: 'plain' | 'striped' | 'banded';
}

export interface LearningPodcastRecord {
  id: string;
  title: string;
  subject: string;
  type: 'audio' | 'video';
  duration: string;
  views: string;
  published_on: Date;
  author: string;
  thumbnail_url: string | null;
  media_url: string;
}

export interface TeacherStudentRecord {
  id: string;
  name: string;
  grade: string;
  assessment_score: number;
  homework_completion: number;
  last_active: string;
  trend: 'Improving' | 'Stable' | 'Excellent';
}

export interface TeacherAssignmentRecord {
  id: string;
  title: string;
  subject: string;
  description: string;
  grade_level: string;
  due_at: Date | null;
  created_at: Date;
  questions: Array<{
    id: number;
    type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
    text: string;
    options?: string[];
    correctAnswer?: string | boolean;
    explanation?: string;
  }>;
  submitted_count: number;
  total_students: number;
  average_score: number;
}

export interface SubmissionReviewRecord {
  assignment_id: string;
  student_id: string;
  student_name: string;
  score: number;
  status: 'Completed' | 'Late' | 'Pending';
  answers: Array<{
    questionId: number;
    question: string;
    answer: string;
    isCorrect: boolean;
  }>;
}

export interface StudentAssignmentRecord {
  id: string;
  title: string;
  subject: string;
  description: string;
  grade_level: string;
  due_at: Date | null;
  questions: Array<{
    id: number;
    type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
    text: string;
    options?: string[];
    correctAnswer?: string | boolean;
    explanation?: string;
  }>;
  status: 'pending' | 'completed';
  score: number | null;
  submitted_at: Date | null;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  grade: string;
  school: string;
  email: string;
  status: 'Online' | 'Offline' | 'Active';
  color: 'green' | 'gray';
}

export interface FeatureFlagRecord {
  key: string;
  enabled: boolean;
  description: string;
}

export interface UserNotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  channel: 'in_app' | 'sms' | 'push' | 'email';
  status: 'unread' | 'read';
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

export interface DiagnosticSessionRecord {
  id: string;
  user_id: string;
  kind: 'onboarding' | 'progressive';
  subjects: string[];
  status: 'in_progress' | 'completed';
  started_at: Date;
  completed_at: Date | null;
  result_summary: Record<string, unknown>;
}

export interface DiagnosticAnswerRecord {
  question_id: string;
  subject_id: string;
  sub_strand_key: string;
  is_correct: boolean;
  confidence_score: number;
  response_latency_ms: number;
}

export interface DueReviewRecord {
  id: string;
  user_id: string;
  subject_id: string;
  sub_strand_key: string;
  next_review_date: Date;
  interval_days: number;
  mastery_score: string;
}

export interface ParentChildDashboardRecord {
  id: string;
  name: string;
  email: string;
  grade: string;
  school: string | null;
  relationship: string;
  assessment_average: number;
  homework_completion: number;
  completed_lessons: number;
  total_lessons: number;
  mastery_average: number;
  due_reviews: number;
  last_active: string;
  diagnostic: {
    completed: boolean;
    percentage: number | null;
    completedAt: string | null;
  };
  recent_assignments: Array<{
    id: string;
    title: string;
    subject: string;
    status: 'pending' | 'completed';
    score: number | null;
    dueAt: string | null;
  }>;
  weekly_trends: Array<{
    weekStart: string;
    lessonsCompleted: number;
    assignmentsCompleted: number;
    assessmentAverage: number;
    weeklyExamScore: number | null;
  }>;
  weekly_report: {
    generatedAt: string;
    activeDays: number;
    lessonsCompleted: number;
    assignmentsCompleted: number;
    assessmentAverage: number;
    weeklyExamScore: number | null;
    strengths: string[];
    focusAreas: string[];
  };
}

export interface WeeklyExamQuestionRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  subStrandKey: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface WeeklyExamRecord {
  id: string;
  grade_level: string;
  week_start: Date;
  title: string;
  duration_minutes: number;
  questions: WeeklyExamQuestionRecord[];
  opens_at: Date;
  closes_at: Date;
  is_published: boolean;
}

export interface WeeklyExamAttemptRecord {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'in_progress' | 'completed';
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean }>;
  score: string | null;
  correct_count: number | null;
  total_questions: number | null;
  started_at: Date;
  submitted_at: Date | null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserByEmail(email: string): Promise<(UserRecord & { roles: AppRole[] }) | null> {
  const userResult = await db.query<UserRecord>(
    `SELECT id, school_id, email, phone_number, phone_verified, phone_verified_at, full_name, password_hash, email_verified, gender, grade_level,
            onboarding_completed, terms_accepted_at, terms_version, privacy_version,
            must_rotate_password, is_break_glass
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );
  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  const roleResult = await db.query<{ role: AppRole }>(
    `SELECT role FROM user_roles WHERE user_id = $1`,
    [user.id]
  );

  return {
    ...user,
    roles: roleResult.rows.map(row => row.role)
  };
}

export async function findUserByPhone(phoneNumber: string): Promise<(UserRecord & { roles: AppRole[] }) | null> {
  const userResult = await db.query<UserRecord>(
    `SELECT id, school_id, email, phone_number, phone_verified, phone_verified_at, full_name, password_hash, email_verified, gender, grade_level,
            onboarding_completed, terms_accepted_at, terms_version, privacy_version,
            must_rotate_password, is_break_glass
     FROM users
     WHERE phone_number = $1`,
    [phoneNumber]
  );
  const user = userResult.rows[0];
  if (!user) {
    return null;
  }
  const roleResult = await db.query<{ role: AppRole }>(
    `SELECT role FROM user_roles WHERE user_id = $1`,
    [user.id]
  );
  return {
    ...user,
    roles: roleResult.rows.map(row => row.role)
  };
}

export interface PhoneVerificationCodeRecord {
  id: string;
  phone_number: string;
  purpose: 'login' | 'signup';
  code_hash: string;
  role: 'student' | 'teacher' | 'parent' | null;
  full_name: string | null;
  email: string | null;
  password_hash: string | null;
  accepted_terms: boolean;
  expires_at: Date;
  used_at: Date | null;
  attempts: number;
}

export async function createPhoneVerificationCode(input: {
  phoneNumber: string;
  purpose: 'login' | 'signup';
  codeHash: string;
  role?: 'student' | 'teacher' | 'parent';
  fullName?: string;
  email?: string;
  passwordHash?: string;
  acceptedTerms?: boolean;
  expiresAt: Date;
}) {
  await withTransaction(async client => {
    await client.query(
      `UPDATE phone_verification_codes
       SET used_at = NOW()
       WHERE phone_number = $1 AND purpose = $2 AND used_at IS NULL`,
      [input.phoneNumber, input.purpose]
    );
    await client.query(
      `INSERT INTO phone_verification_codes (
         phone_number, purpose, code_hash, role, full_name, email, password_hash,
         accepted_terms, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.phoneNumber,
        input.purpose,
        input.codeHash,
        input.role ?? null,
        input.fullName ?? null,
        input.email?.toLowerCase() ?? null,
        input.passwordHash ?? null,
        input.acceptedTerms ?? false,
        input.expiresAt
      ]
    );
  });
}

export async function findActivePhoneVerificationCode(
  phoneNumber: string,
  purpose: 'login' | 'signup'
): Promise<PhoneVerificationCodeRecord | null> {
  const result = await db.query<PhoneVerificationCodeRecord>(
    `SELECT id, phone_number, purpose, code_hash, role, full_name, email, password_hash,
            accepted_terms, expires_at, used_at, attempts
     FROM phone_verification_codes
     WHERE phone_number = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phoneNumber, purpose]
  );
  return result.rows[0] ?? null;
}

export async function recordPhoneVerificationFailure(codeId: string) {
  await db.query(
    `UPDATE phone_verification_codes
     SET attempts = attempts + 1,
         used_at = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE used_at END
     WHERE id = $1`,
    [codeId]
  );
}

export async function consumePhoneVerificationCode(codeId: string) {
  const result = await db.query(
    `UPDATE phone_verification_codes
     SET used_at = NOW()
     WHERE id = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING id`,
    [codeId]
  );
  return result.rowCount === 1;
}

export async function markUserPhoneVerified(userId: string, phoneNumber: string) {
  await db.query(
    `UPDATE users
     SET phone_number = $2, phone_verified = TRUE, phone_verified_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [userId, phoneNumber]
  );
}

export async function findUserByAuthIdentity(
  provider: 'google',
  providerSubject: string
): Promise<(UserRecord & { roles: AppRole[] }) | null> {
  const result = await db.query<{ user_id: string }>(
    `SELECT user_id
     FROM user_auth_identities
     WHERE provider = $1 AND provider_subject = $2`,
    [provider, providerSubject]
  );
  const userId = result.rows[0]?.user_id;
  if (!userId) {
    return null;
  }

  const userResult = await db.query<UserRecord>(
    `SELECT id, school_id, email, phone_number, phone_verified, phone_verified_at,
            full_name, password_hash, email_verified, gender, grade_level,
            onboarding_completed, terms_accepted_at, terms_version, privacy_version,
            must_rotate_password, is_break_glass
     FROM users
     WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    return null;
  }
  const roles = await db.query<{ role: AppRole }>('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
  return { ...user, roles: roles.rows.map(row => row.role) };
}

export interface UserAuthIdentityRecord {
  id: string;
  user_id: string;
  provider: 'google';
  provider_subject: string;
  provider_email: string | null;
}

export async function findUserAuthIdentityForProvider(
  userId: string,
  provider: 'google'
): Promise<UserAuthIdentityRecord | null> {
  const result = await db.query<UserAuthIdentityRecord>(
    `SELECT id, user_id, provider, provider_subject, provider_email
     FROM user_auth_identities
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  return result.rows[0] ?? null;
}

export async function linkUserAuthIdentity(
  client: MaybeClient,
  input: {
    userId: string;
    provider: 'google';
    providerSubject: string;
    providerEmail: string;
  }
) {
  await q(
    client,
    `INSERT INTO user_auth_identities (
       user_id, provider, provider_subject, provider_email
     ) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, provider) DO UPDATE
     SET provider_subject = EXCLUDED.provider_subject,
         provider_email = EXCLUDED.provider_email,
         updated_at = NOW()`,
    [input.userId, input.provider, input.providerSubject, input.providerEmail.toLowerCase()]
  );
}

export async function findUserById(userId: string): Promise<AuthenticatedUser | null> {
  const userResult = await db.query<{
    id: string;
    school_id: string | null;
    email: string;
    phone_number: string | null;
    phone_verified: boolean;
    phone_verified_at: Date | null;
    full_name: string;
    email_verified: boolean;
    gender: 'male' | 'female' | 'not_specified';
    grade_level: string | null;
    onboarding_completed: boolean;
    terms_accepted_at: Date | null;
    terms_version: string | null;
    privacy_version: string | null;
    must_rotate_password: boolean;
    is_break_glass: boolean;
  }>(
    `SELECT id, school_id, email, phone_number, phone_verified, phone_verified_at, full_name, email_verified, gender, grade_level,
            onboarding_completed, terms_accepted_at, terms_version, privacy_version,
            must_rotate_password, is_break_glass
     FROM users
     WHERE id = $1`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  const roleResult = await db.query<{ role: AppRole }>('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
  return {
    id: user.id,
    schoolId: user.school_id,
    sessionId: null,
    email: user.email,
    phoneNumber: user.phone_number,
    phoneVerified: user.phone_verified,
    fullName: user.full_name,
    emailVerified: user.email_verified,
    roles: roleResult.rows.map(row => row.role),
    gender: user.gender,
    grade: user.grade_level,
    onboardingCompleted: user.onboarding_completed,
    termsAcceptedAt: user.terms_accepted_at?.toISOString() ?? null,
    termsVersion: user.terms_version,
    privacyVersion: user.privacy_version,
    stepUp: false,
    mustRotatePassword: user.must_rotate_password,
    isBreakGlass: user.is_break_glass
  };
}

export async function createSelfServiceUser(input: {
  schoolId: string | null;
  email: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  passwordHash: string;
  fullName: string;
  role: 'student' | 'teacher' | 'parent';
  gender?: 'male' | 'female' | 'not_specified';
  grade?: string | null;
  onboardingCompleted?: boolean;
  termsAcceptedAt: Date;
  termsVersion: string;
  privacyVersion: string;
}) {
  return withTransaction(async client => {
    const userResult = await q<{
      id: string;
      school_id: string | null;
      email: string;
      phone_number: string | null;
      phone_verified: boolean;
      phone_verified_at: Date | null;
      full_name: string;
      email_verified: boolean;
      gender: 'male' | 'female' | 'not_specified';
      grade_level: string | null;
      onboarding_completed: boolean;
      terms_accepted_at: Date | null;
      terms_version: string | null;
      privacy_version: string | null;
      must_rotate_password: boolean;
      is_break_glass: boolean;
    }>(
      client,
      `INSERT INTO users (
         school_id, email, phone_number, phone_verified, phone_verified_at, password_hash, full_name,
         gender, grade_level, onboarding_completed, terms_accepted_at, terms_version, privacy_version
       )
       VALUES ($1, $2, $3, $4, CASE WHEN $4::boolean THEN NOW() ELSE NULL END, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, school_id, email, phone_number, phone_verified, phone_verified_at, full_name, email_verified, gender, grade_level,
                 onboarding_completed, terms_accepted_at, terms_version, privacy_version,
                 must_rotate_password, is_break_glass`,
      [
        input.schoolId,
        input.email.toLowerCase(),
        input.phoneNumber ?? null,
        input.phoneVerified ?? false,
        input.passwordHash,
        input.fullName,
        input.gender ?? 'not_specified',
        input.grade ?? null,
        input.onboardingCompleted ?? false,
        input.termsAcceptedAt,
        input.termsVersion,
        input.privacyVersion
      ]
    );
    const user = userResult.rows[0];
    await q(
      client,
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [user.id, input.role]
    );
    await createAuditLog(client, user.id, user.school_id, 'auth.signup.succeeded', { role: input.role });
    return {
      id: user.id,
      schoolId: user.school_id,
      sessionId: null,
      email: user.email,
      phoneNumber: user.phone_number,
      phoneVerified: user.phone_verified,
      fullName: user.full_name,
      emailVerified: user.email_verified,
      roles: [input.role] as AppRole[],
      gender: user.gender,
      grade: user.grade_level,
      onboardingCompleted: user.onboarding_completed,
      termsAcceptedAt: user.terms_accepted_at?.toISOString() ?? null,
      termsVersion: user.terms_version,
      privacyVersion: user.privacy_version,
      stepUp: false,
      mustRotatePassword: user.must_rotate_password,
      isBreakGlass: user.is_break_glass
    };
  });
}

export async function deleteSelfServiceAccount(client: MaybeClient, userId: string) {
  await q(
    client,
    `DELETE FROM users
     WHERE id = $1`,
    [userId]
  );
}

export async function insertRefreshToken(
  client: MaybeClient,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  options: {
    replacedByTokenId?: string | null;
    sessionId: string;
    sessionBindingHash: string;
    deviceLabel?: string | null;
  }
): Promise<string> {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO refresh_tokens (
      user_id, token_hash, expires_at, replaced_by_token_id, session_id, session_binding_hash, device_label
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      tokenHash,
      expiresAt,
      options.replacedByTokenId ?? null,
      options.sessionId,
      options.sessionBindingHash,
      options.deviceLabel ?? null
    ]
  );
  return result.rows[0].id;
}

export async function revokeRefreshToken(client: MaybeClient, tokenHash: string, replacedByTokenId: string | null) {
  await q(
    client,
    `UPDATE refresh_tokens
     SET revoked_at = NOW(), replaced_by_token_id = $2
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash, replacedByTokenId]
  );
}

export async function findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
  const result = await db.query<RefreshTokenRecord>(
    `SELECT id, user_id, session_id, session_binding_hash, device_label, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function revokeAllRefreshTokensForUser(client: MaybeClient, userId: string) {
  await q(
    client,
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

export async function revokeRefreshTokensForSession(client: MaybeClient, userId: string, sessionId: string) {
  await q(
    client,
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND session_id = $2 AND revoked_at IS NULL`,
    [userId, sessionId]
  );
}

export async function invalidatePasswordResetTokensForUser(client: MaybeClient, userId: string) {
  await q(
    client,
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

export async function insertPasswordResetToken(client: MaybeClient, userId: string, tokenHash: string, expiresAt: Date) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0].id;
}

export async function findActivePasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
  const result = await db.query<PasswordResetTokenRecord>(
    `SELECT id, user_id, token_hash, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function consumePasswordResetToken(client: MaybeClient, tokenHash: string) {
  await q(
    client,
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );
}

export async function invalidateEmailVerificationTokensForUser(client: MaybeClient, userId: string) {
  await q(
    client,
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

export async function insertEmailVerificationToken(client: MaybeClient, userId: string, tokenHash: string, expiresAt: Date) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0].id;
}

export async function findActiveEmailVerificationToken(tokenHash: string): Promise<EmailVerificationTokenRecord | null> {
  const result = await db.query<EmailVerificationTokenRecord>(
    `SELECT id, user_id, token_hash, expires_at, used_at
     FROM email_verification_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function consumeEmailVerificationToken(client: MaybeClient, tokenHash: string) {
  await q(
    client,
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL`,
    [tokenHash]
  );
}

export async function markUserEmailVerified(client: MaybeClient, userId: string) {
  await q(
    client,
    `UPDATE users
     SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export async function getTotpSecret(userId: string): Promise<{ secret: string; enabled: boolean } | null> {
  const result = await db.query<{ secret: string; enabled: boolean }>(
    `SELECT secret, enabled FROM totp_credentials WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function upsertTotpSecret(client: MaybeClient, userId: string, secret: string, enabled: boolean) {
  await q(
    client,
    `INSERT INTO totp_credentials (user_id, secret, enabled, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET secret = EXCLUDED.secret, enabled = EXCLUDED.enabled, updated_at = NOW()`,
    [userId, secret, enabled]
  );
}

export async function enableTotp(client: MaybeClient, userId: string) {
  await q(client, `UPDATE totp_credentials SET enabled = TRUE, updated_at = NOW() WHERE user_id = $1`, [userId]);
}

export async function updateUserPassword(client: MaybeClient, userId: string, passwordHash: string) {
  await q(
    client,
    `UPDATE users
     SET password_hash = $2, must_rotate_password = FALSE, updated_at = NOW()
     WHERE id = $1`,
    [userId, passwordHash]
  );
}

export async function getUserTotpStatus(userId: string): Promise<boolean> {
  const credential = await getTotpSecret(userId);
  return Boolean(credential?.enabled);
}

export async function createAuditLog(
  client: MaybeClient,
  actorUserId: string | null,
  schoolId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
  targetType?: string,
  targetId?: string
) {
  await q(
    client,
    `INSERT INTO audit_logs (actor_user_id, school_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actorUserId, schoolId, action, targetType ?? null, targetId ?? null, JSON.stringify(metadata)]
  );
}

export async function listFeatureFlags(): Promise<FeatureFlagRecord[]> {
  const result = await db.query<FeatureFlagRecord>(
    `SELECT key, enabled, description
     FROM feature_flags
     ORDER BY key ASC`
  );

  return result.rows;
}

export async function isFeatureFlagEnabled(key: string): Promise<boolean> {
  const result = await db.query<{ enabled: boolean }>(
    `SELECT enabled
     FROM feature_flags
     WHERE key = $1`,
    [key]
  );

  return Boolean(result.rows[0]?.enabled);
}

export async function listUserNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<UserNotificationRecord[]> {
  const values: unknown[] = [userId, options.limit ?? 50];
  const filters = ['user_id = $1'];

  if (options.unreadOnly) {
    filters.push(`status = 'unread'`);
  }

  const result = await db.query<UserNotificationRecord>(
    `SELECT id, user_id, type, title, body, channel, status, metadata, read_at, created_at
     FROM user_notifications
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $2`,
    values
  );

  return result.rows;
}

export async function createUserNotification(
  client: MaybeClient,
  input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    channel?: 'in_app' | 'sms' | 'push' | 'email';
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO user_notifications (user_id, type, title, body, channel, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [
      input.userId,
      input.type,
      input.title,
      input.body,
      input.channel ?? 'in_app',
      JSON.stringify(input.metadata ?? {})
    ]
  );

  return result.rows[0].id;
}

export async function markUserNotificationRead(
  client: MaybeClient,
  userId: string,
  notificationId: string
) {
  await q(
    client,
    `UPDATE user_notifications
     SET status = 'read',
         read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

export async function markAllUserNotificationsRead(client: MaybeClient, userId: string) {
  await q(
    client,
    `UPDATE user_notifications
     SET status = 'read',
         read_at = COALESCE(read_at, NOW())
     WHERE user_id = $1 AND status = 'unread'`,
    [userId]
  );
}

export async function createNotificationDelivery(
  client: MaybeClient,
  input: {
    notificationId?: string | null;
    userId?: string | null;
    channel: 'sms' | 'push' | 'email';
    provider: string;
    status: 'sent' | 'skipped' | 'failed';
    providerMessageId?: string | null;
    errorMessage?: string | null;
  }
) {
  await q(
    client,
    `INSERT INTO notification_deliveries (
       notification_id, user_id, channel, provider, status, provider_message_id, error_message
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.notificationId ?? null,
      input.userId ?? null,
      input.channel,
      input.provider,
      input.status,
      input.providerMessageId ?? null,
      input.errorMessage ?? null
    ]
  );
}

export async function findCompletedDiagnosticSession(
  userId: string,
  kind: 'onboarding' | 'progressive',
  subjects: string[]
): Promise<DiagnosticSessionRecord | null> {
  const result = await db.query<DiagnosticSessionRecord>(
    `SELECT id, user_id, kind, subjects, status, started_at, completed_at, result_summary
     FROM diagnostic_sessions
     WHERE user_id = $1
       AND kind = $2
       AND status = 'completed'
       AND subjects @> $3::text[]
     ORDER BY completed_at DESC
     LIMIT 1`,
    [userId, kind, subjects]
  );

  return result.rows[0] ?? null;
}

export async function findActiveDiagnosticSession(
  userId: string,
  kind: 'onboarding' | 'progressive'
): Promise<DiagnosticSessionRecord | null> {
  const result = await db.query<DiagnosticSessionRecord>(
    `SELECT id, user_id, kind, subjects, status, started_at, completed_at, result_summary
     FROM diagnostic_sessions
     WHERE user_id = $1
       AND kind = $2
       AND status = 'in_progress'
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId, kind]
  );

  return result.rows[0] ?? null;
}

export async function findActiveDiagnosticSessionForSubjects(
  userId: string,
  kind: 'onboarding' | 'progressive',
  subjects: string[]
): Promise<DiagnosticSessionRecord | null> {
  const result = await db.query<DiagnosticSessionRecord>(
    `SELECT id, user_id, kind, subjects, status, started_at, completed_at, result_summary
     FROM diagnostic_sessions
     WHERE user_id = $1
       AND kind = $2
       AND status = 'in_progress'
       AND subjects @> $3::text[]
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId, kind, subjects]
  );

  return result.rows[0] ?? null;
}

export async function findDiagnosticSessionForUser(
  sessionId: string,
  userId: string
): Promise<DiagnosticSessionRecord | null> {
  const result = await db.query<DiagnosticSessionRecord>(
    `SELECT id, user_id, kind, subjects, status, started_at, completed_at, result_summary
     FROM diagnostic_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  return result.rows[0] ?? null;
}

export async function createDiagnosticSession(
  client: MaybeClient,
  input: {
    userId: string;
    kind: 'onboarding' | 'progressive';
    subjects: string[];
  }
): Promise<string> {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO diagnostic_sessions (user_id, kind, subjects)
     VALUES ($1, $2, $3::text[])
     RETURNING id`,
    [input.userId, input.kind, input.subjects]
  );

  return result.rows[0].id;
}

export async function listDiagnosticAnswers(sessionId: string): Promise<DiagnosticAnswerRecord[]> {
  const result = await db.query<DiagnosticAnswerRecord>(
    `SELECT question_id, subject_id, sub_strand_key, is_correct, confidence_score, response_latency_ms
     FROM diagnostic_answers
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return result.rows;
}

function calculateMasteryContribution(input: {
  isCorrect: boolean;
  confidenceScore: number;
  responseLatencyMs: number;
  retryCount: number;
}) {
  const correctness = input.isCorrect ? 1 : 0;
  const confidence = Math.min(1, Math.max(0.2, input.confidenceScore / 5));
  const latencyNormalized = Math.max(0.25, input.responseLatencyMs / 120_000);
  const retryFactor = 1 / Math.max(1, input.retryCount);
  const score =
    0.5 * correctness +
    0.2 * confidence +
    0.15 * Math.min(1, 1 / latencyNormalized) +
    0.15 * retryFactor;

  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

export async function recordDiagnosticAnswer(
  client: MaybeClient,
  input: {
    sessionId: string;
    userId: string;
    questionId: string;
    subjectId: string;
    subStrandKey: string;
    answer: string;
    isCorrect: boolean;
    confidenceScore: number;
    responseLatencyMs: number;
  }
) {
  const existingResult = await q<{ count: string }>(
    client,
    `SELECT COUNT(*)::text AS count
     FROM diagnostic_answers
     WHERE session_id = $1 AND question_id = $2`,
    [input.sessionId, input.questionId]
  );
  const retryCount = Number(existingResult.rows[0]?.count ?? 0) + 1;
  const masteryContribution = calculateMasteryContribution({
    isCorrect: input.isCorrect,
    confidenceScore: input.confidenceScore,
    responseLatencyMs: input.responseLatencyMs,
    retryCount
  });

  await q(
    client,
    `INSERT INTO diagnostic_answers (
       session_id, user_id, question_id, subject_id, sub_strand_key, answer,
       is_correct, confidence_score, response_latency_ms
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET
       answer = EXCLUDED.answer,
       is_correct = EXCLUDED.is_correct,
       confidence_score = EXCLUDED.confidence_score,
       response_latency_ms = EXCLUDED.response_latency_ms,
       created_at = NOW()`,
    [
      input.sessionId,
      input.userId,
      input.questionId,
      input.subjectId,
      input.subStrandKey,
      input.answer,
      input.isCorrect,
      input.confidenceScore,
      input.responseLatencyMs
    ]
  );

  await q(
    client,
    `INSERT INTO confidence_records (
       user_id, subject_id, sub_strand_key, question_id, confidence_score, response_latency_ms
     )
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      input.subjectId,
      input.subStrandKey,
      input.questionId,
      input.confidenceScore,
      input.responseLatencyMs
    ]
  );

  await q(
    client,
    `INSERT INTO mastery_scores (
       user_id, subject_id, sub_strand_key, mastery_score, correctness_history,
       confidence_history, avg_latency_ms, attempt_count, last_practiced_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, jsonb_build_array($5::boolean),
       jsonb_build_array($6::int), $7, 1, NOW(), NOW()
     )
     ON CONFLICT (user_id, subject_id, sub_strand_key)
     DO UPDATE SET
       mastery_score = ROUND(((mastery_scores.mastery_score::numeric * mastery_scores.attempt_count) + EXCLUDED.mastery_score::numeric) / (mastery_scores.attempt_count + 1), 4),
       correctness_history = (mastery_scores.correctness_history || jsonb_build_array($5::boolean)),
       confidence_history = (mastery_scores.confidence_history || jsonb_build_array($6::int)),
       avg_latency_ms = ROUND(((mastery_scores.avg_latency_ms::numeric * mastery_scores.attempt_count) + $7::numeric) / (mastery_scores.attempt_count + 1))::int,
       attempt_count = mastery_scores.attempt_count + 1,
       last_practiced_at = NOW(),
       updated_at = NOW()`,
    [
      input.userId,
      input.subjectId,
      input.subStrandKey,
      masteryContribution,
      input.isCorrect,
      input.confidenceScore,
      input.responseLatencyMs
    ]
  );

  const masteryResult = await q<{ mastery_score: string }>(
    client,
    `SELECT mastery_score::text AS mastery_score
     FROM mastery_scores
     WHERE user_id = $1 AND subject_id = $2 AND sub_strand_key = $3`,
    [input.userId, input.subjectId, input.subStrandKey]
  );
  const masteryScore = Number(masteryResult.rows[0]?.mastery_score ?? 0);
  if (masteryScore >= 0.85) {
    await q(
      client,
      `INSERT INTO spaced_repetition_schedules (
         user_id, subject_id, sub_strand_key, next_review_date, interval_days, ease_factor, updated_at
       )
       VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '1 day', 1, 2.5, NOW())
       ON CONFLICT (user_id, subject_id, sub_strand_key)
       DO UPDATE SET
         next_review_date = CASE
           WHEN spaced_repetition_schedules.next_review_date <= CURRENT_DATE
             THEN CURRENT_DATE + (spaced_repetition_schedules.interval_days || ' days')::interval
           ELSE spaced_repetition_schedules.next_review_date
         END,
         updated_at = NOW()`,
      [input.userId, input.subjectId, input.subStrandKey]
    );
  }
}

export async function completeDiagnosticSession(
  client: MaybeClient,
  sessionId: string,
  resultSummary: Record<string, unknown>
) {
  await q(
    client,
    `UPDATE diagnostic_sessions
     SET status = 'completed',
         completed_at = NOW(),
         result_summary = $2::jsonb
     WHERE id = $1 AND status = 'in_progress'`,
    [sessionId, JSON.stringify(resultSummary)]
  );
}

export async function listDueSpacedReviews(userId: string): Promise<DueReviewRecord[]> {
  const result = await db.query<DueReviewRecord>(
    `SELECT
       srs.id,
       srs.user_id,
       srs.subject_id,
       srs.sub_strand_key,
       srs.next_review_date,
       srs.interval_days,
       COALESCE(ms.mastery_score, 0)::text AS mastery_score
     FROM spaced_repetition_schedules srs
     LEFT JOIN mastery_scores ms
       ON ms.user_id = srs.user_id
      AND ms.subject_id = srs.subject_id
      AND ms.sub_strand_key = srs.sub_strand_key
     WHERE srs.user_id = $1
       AND srs.next_review_date <= CURRENT_DATE
     ORDER BY srs.next_review_date ASC, srs.subject_id ASC
     LIMIT 10`,
    [userId]
  );

  return result.rows;
}

export async function markSpacedReviewCompleted(
  client: MaybeClient,
  input: {
    userId: string;
    reviewId: string;
    passed: boolean;
  }
) {
  await q(
    client,
    `UPDATE spaced_repetition_schedules
     SET interval_days = CASE
           WHEN $3::boolean THEN LEAST(interval_days * 2, 30)
           ELSE 1
         END,
         next_review_date = CURRENT_DATE + (
           CASE WHEN $3::boolean THEN LEAST(interval_days * 2, 30) ELSE 1 END || ' days'
         )::interval,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $1`,
    [input.userId, input.reviewId, input.passed]
  );
}

export async function upsertPushToken(
  client: MaybeClient,
  input: {
    userId: string;
    platform: 'ios' | 'android' | 'web';
    token: string;
    deviceId?: string | null;
  }
) {
  await q(
    client,
    `INSERT INTO user_push_tokens (user_id, platform, token, device_id, enabled, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (platform, token)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       device_id = EXCLUDED.device_id,
       enabled = TRUE,
       updated_at = NOW()`,
    [input.userId, input.platform, input.token, input.deviceId ?? null]
  );
}

export async function getActiveSubscription(userId: string) {
  const result = await db.query<{
    id: string;
    user_id: string;
    plan_id: string;
    plan_code: BillingPlanCode;
    plan_name: string;
    billing_cycle: 'weekly' | 'monthly' | 'annual';
    price_ksh_cents: string;
    period_start: Date;
    period_end: Date;
    status: string;
  }>(
    `SELECT s.id, s.user_id, s.plan_id, p.code AS plan_code, p.name AS plan_name, s.billing_cycle, s.price_ksh_cents, s.period_start, s.period_end, s.status
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE user_id = $1
       AND status = 'active'
       AND NOW() BETWEEN period_start AND period_end
     ORDER BY period_end DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function listSubscriptionPlans(codes?: BillingPlanCode[]) {
  const values: unknown[] = [];
  const whereClauses: string[] = ['is_hidden = FALSE'];

  if (codes && codes.length > 0) {
    values.push(codes);
    whereClauses.push(`code = ANY($${values.length})`);
  }

  const result = await db.query<SubscriptionPlanRecord>(
    `SELECT id, code, name, billing_cycle, price_ksh_cents, is_pro, is_hidden
     FROM subscription_plans
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY CASE code
       WHEN 'weekly' THEN 1
       WHEN 'monthly' THEN 2
       WHEN 'annual' THEN 3
       WHEN 'admin_weekly' THEN 4
       WHEN 'trial_monthly_1bob' THEN 5
       ELSE 99
     END`,
    values
  );

  return result.rows;
}

export async function findSubscriptionPlanByCode(code: BillingPlanCode) {
  const result = await db.query<SubscriptionPlanRecord>(
    `SELECT id, code, name, billing_cycle, price_ksh_cents, is_pro, is_hidden
     FROM subscription_plans
     WHERE code = $1`,
    [code]
  );

  return result.rows[0] ?? null;
}

export async function getBillingProfile(userId: string) {
  const result = await db.query<BillingProfileRecord>(
    `SELECT user_id, mpesa_phone_number, updated_at
     FROM user_billing_profiles
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

function mapSchoolRows(
  schools: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    location: string;
    principal: string | null;
    phone: string | null;
    email: string | null;
    assigned_plan_id: string;
    assigned_plan_code: BillingPlanCode;
    assigned_plan_name: string;
    assigned_billing_cycle: 'weekly' | 'monthly' | 'annual';
    assigned_plan_price_ksh_cents: string;
    discount_id: string | null;
    discount_name: string | null;
    discount_type: 'percentage' | 'fixed_ksh' | null;
    discount_amount: number | null;
    total_students: number;
  }>,
  gradeRows: Array<{ school_id: string; grade_level: string | null; total: string }>
): SchoolRecord[] {
  const gradeCountsBySchool = new Map<string, Record<string, number>>();

  gradeRows.forEach(row => {
    const gradeKey = row.grade_level || 'Unassigned';
    const current = gradeCountsBySchool.get(row.school_id) ?? {};
    current[gradeKey] = Number(row.total);
    gradeCountsBySchool.set(row.school_id, current);
  });

  return schools.map(school => ({
    ...school,
    grade_counts: gradeCountsBySchool.get(school.id) ?? {}
  }));
}

export async function listSchools() {
  const [schoolsResult, gradeResult] = await Promise.all([
    db.query<{
      id: string;
      name: string;
      slug: string;
      status: string;
      location: string;
      principal: string | null;
      phone: string | null;
      email: string | null;
      assigned_plan_id: string;
      assigned_plan_code: BillingPlanCode;
      assigned_plan_name: string;
      assigned_billing_cycle: 'weekly' | 'monthly' | 'annual';
      assigned_plan_price_ksh_cents: string;
      discount_id: string | null;
      discount_name: string | null;
      discount_type: 'percentage' | 'fixed_ksh' | null;
      discount_amount: number | null;
      total_students: number;
      pilot_status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
      pilot_start_date: Date | null;
      pilot_end_date: Date | null;
      pilot_target_students: number;
      pilot_onboarding_stage: number;
      pilot_notes: string | null;
      pilot_onboarded_students: number;
      pilot_engaged_students: number;
      pilot_average_mastery: number;
    }>(
      `SELECT
         s.id,
         s.name,
         s.slug,
         s.status,
         s.location,
         s.principal,
         s.phone,
         s.email,
         s.pilot_status,
         s.pilot_start_date,
         s.pilot_end_date,
         s.pilot_target_students,
         s.pilot_onboarding_stage,
         s.pilot_notes,
         ap.id AS assigned_plan_id,
         ap.code AS assigned_plan_code,
         ap.name AS assigned_plan_name,
         ap.billing_cycle AS assigned_billing_cycle,
         ap.price_ksh_cents AS assigned_plan_price_ksh_cents,
         d.id AS discount_id,
         d.name AS discount_name,
         d.type AS discount_type,
         d.amount AS discount_amount,
         COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN u.id END)::int AS total_students,
         COUNT(DISTINCT CASE WHEN ur.role = 'student' AND u.onboarding_completed THEN u.id END)::int AS pilot_onboarded_students,
         (SELECT COUNT(DISTINCT active_user.id)::int
          FROM users active_user
          JOIN user_roles active_role ON active_role.user_id = active_user.id AND active_role.role = 'student'
          WHERE active_user.school_id = s.id
            AND (
              EXISTS (SELECT 1 FROM user_curriculum_progress p WHERE p.user_id = active_user.id AND p.updated_at >= NOW() - INTERVAL '7 days')
              OR EXISTS (SELECT 1 FROM submissions sub WHERE sub.student_id = active_user.id AND sub.submitted_at >= NOW() - INTERVAL '7 days')
              OR EXISTS (SELECT 1 FROM weekly_exam_attempts wa WHERE wa.user_id = active_user.id AND wa.started_at >= NOW() - INTERVAL '7 days')
            )) AS pilot_engaged_students,
         COALESCE((SELECT ROUND(AVG(ms.mastery_score) * 100, 0)::int
                   FROM mastery_scores ms
                   JOIN users mastery_user ON mastery_user.id = ms.user_id
                   WHERE mastery_user.school_id = s.id), 0) AS pilot_average_mastery
       FROM schools s
       JOIN subscription_plans ap ON ap.id = s.assigned_plan_id
       LEFT JOIN school_discounts d ON d.id = s.discount_id
       LEFT JOIN users u ON u.school_id = s.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
       GROUP BY
         s.id,
         ap.id,
         d.id
       ORDER BY s.name ASC`
    ),
    db.query<{ school_id: string; grade_level: string | null; total: string }>(
      `SELECT u.school_id, u.grade_level, COUNT(*)::bigint AS total
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
       WHERE u.school_id IS NOT NULL
       GROUP BY u.school_id, u.grade_level`
    )
  ]);

  return mapSchoolRows(schoolsResult.rows, gradeResult.rows);
}

export async function findSchoolById(schoolId: string) {
  const schools = await listSchools();
  return schools.find(school => school.id === schoolId) ?? null;
}

export async function findSchoolPricingForUser(userId: string) {
  const result = await db.query<{
    id: string;
    name: string;
    slug: string;
    status: string;
    location: string;
    principal: string | null;
    phone: string | null;
    email: string | null;
    assigned_plan_id: string;
    assigned_plan_code: BillingPlanCode;
    assigned_plan_name: string;
    assigned_billing_cycle: 'weekly' | 'monthly' | 'annual';
    assigned_plan_price_ksh_cents: string;
    discount_id: string | null;
    discount_name: string | null;
    discount_type: 'percentage' | 'fixed_ksh' | null;
    discount_amount: number | null;
  }>(
    `SELECT
       s.id,
       s.name,
       s.slug,
       s.status,
       s.location,
       s.principal,
       s.phone,
       s.email,
       ap.id AS assigned_plan_id,
       ap.code AS assigned_plan_code,
       ap.name AS assigned_plan_name,
       ap.billing_cycle AS assigned_billing_cycle,
       ap.price_ksh_cents AS assigned_plan_price_ksh_cents,
       d.id AS discount_id,
       d.name AS discount_name,
       d.type AS discount_type,
       d.amount AS discount_amount
     FROM users u
     JOIN schools s ON s.id = u.school_id
     JOIN subscription_plans ap ON ap.id = s.assigned_plan_id
     LEFT JOIN school_discounts d ON d.id = s.discount_id
     WHERE u.id = $1`,
    [userId]
  );

  const school = result.rows[0];
  if (!school) {
    return null;
  }

  return {
    ...school,
    total_students: 0,
    grade_counts: {}
  } satisfies SchoolRecord;
}

export async function createSchool(
  client: MaybeClient,
  input: {
    name: string;
    slug: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanId: string;
    discountId?: string | null;
  }
) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO schools (name, slug, location, principal, phone, email, assigned_plan_id, discount_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      input.name,
      input.slug,
      input.location,
      input.principal ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.assignedPlanId,
      input.discountId ?? null
    ]
  );

  return result.rows[0].id;
}

export async function updateSchool(
  client: MaybeClient,
  schoolId: string,
  input: {
    name: string;
    slug: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanId: string;
    discountId?: string | null;
    status?: string;
  }
) {
  await q(
    client,
    `UPDATE schools
     SET name = $2,
         slug = $3,
         location = $4,
         principal = $5,
         phone = $6,
         email = $7,
         assigned_plan_id = $8,
         discount_id = $9,
         status = COALESCE($10, status)
     WHERE id = $1`,
    [
      schoolId,
      input.name,
      input.slug,
      input.location,
      input.principal ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.assignedPlanId,
      input.discountId ?? null,
      input.status ?? null
    ]
  );
}

export async function updateSchoolPilot(
  client: MaybeClient,
  schoolId: string,
  input: {
    status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
    startDate?: string | null;
    endDate?: string | null;
    targetStudents: number;
    onboardingStage: number;
    notes?: string | null;
  }
) {
  await q(
    client,
    `UPDATE schools
     SET pilot_status = $2,
         pilot_start_date = $3::date,
         pilot_end_date = $4::date,
         pilot_target_students = $5,
         pilot_onboarding_stage = $6,
         pilot_notes = $7,
         updated_at = NOW()
     WHERE id = $1`,
    [
      schoolId,
      input.status,
      input.startDate ?? null,
      input.endDate ?? null,
      input.targetStudents,
      input.onboardingStage,
      input.notes ?? null
    ]
  );
}

export async function deleteSchool(client: MaybeClient, schoolId: string) {
  await q(client, `DELETE FROM schools WHERE id = $1`, [schoolId]);
}

export async function listSchoolDiscounts() {
  const result = await db.query<SchoolDiscountRecord>(
    `SELECT id, name, type, amount, is_active, created_at, updated_at
     FROM school_discounts
     ORDER BY is_active DESC, name ASC`
  );

  return result.rows;
}

export async function createSchoolDiscount(
  client: MaybeClient,
  input: { name: string; type: 'percentage' | 'fixed_ksh'; amount: number; isActive?: boolean }
) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO school_discounts (name, type, amount, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.name, input.type, input.amount, input.isActive ?? true]
  );

  return result.rows[0].id;
}

export async function updateSchoolDiscount(
  client: MaybeClient,
  discountId: string,
  input: { name: string; type: 'percentage' | 'fixed_ksh'; amount: number; isActive: boolean }
) {
  await q(
    client,
    `UPDATE school_discounts
     SET name = $2,
         type = $3,
         amount = $4,
         is_active = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [discountId, input.name, input.type, input.amount, input.isActive]
  );
}

export async function deleteSchoolDiscount(client: MaybeClient, discountId: string) {
  await q(client, `UPDATE schools SET discount_id = NULL WHERE discount_id = $1`, [discountId]);
  await q(client, `DELETE FROM school_discounts WHERE id = $1`, [discountId]);
}

export async function listBannerAnnouncements() {
  const result = await db.query<BannerAnnouncementRecord>(
    `SELECT id, title, message, cta_label, cta_target, starts_at, ends_at, is_active, created_at, updated_at
     FROM banner_announcements
     ORDER BY starts_at DESC, created_at DESC`
  );

  return result.rows;
}

export async function getActiveBannerAnnouncement() {
  const result = await db.query<BannerAnnouncementRecord>(
    `SELECT id, title, message, cta_label, cta_target, starts_at, ends_at, is_active, created_at, updated_at
     FROM banner_announcements
     WHERE is_active = TRUE
       AND starts_at <= NOW()
       AND (ends_at IS NULL OR ends_at >= NOW())
     ORDER BY starts_at DESC, created_at DESC
     LIMIT 1`
  );

  return result.rows[0] ?? null;
}

export async function createBannerAnnouncement(
  client: MaybeClient,
  input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: string;
    startsAt?: Date;
    endsAt?: Date | null;
    isActive?: boolean;
  }
) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO banner_announcements (title, message, cta_label, cta_target, starts_at, ends_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.title,
      input.message,
      input.ctaLabel ?? null,
      input.ctaTarget,
      input.startsAt ?? new Date(),
      input.endsAt ?? null,
      input.isActive ?? true
    ]
  );

  return result.rows[0].id;
}

export async function updateBannerAnnouncement(
  client: MaybeClient,
  announcementId: string,
  input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: string;
    startsAt: Date;
    endsAt?: Date | null;
    isActive: boolean;
  }
) {
  await q(
    client,
    `UPDATE banner_announcements
     SET title = $2,
         message = $3,
         cta_label = $4,
         cta_target = $5,
         starts_at = $6,
         ends_at = $7,
         is_active = $8,
         updated_at = NOW()
     WHERE id = $1`,
    [
      announcementId,
      input.title,
      input.message,
      input.ctaLabel ?? null,
      input.ctaTarget,
      input.startsAt,
      input.endsAt ?? null,
      input.isActive
    ]
  );
}

export async function deleteBannerAnnouncement(client: MaybeClient, announcementId: string) {
  await q(client, `DELETE FROM banner_announcements WHERE id = $1`, [announcementId]);
}

export async function updateUserOnboarding(
  client: MaybeClient,
  input: {
    userId: string;
    schoolId: string;
    gender: 'male' | 'female' | 'not_specified';
    grade: string;
    mpesaPhoneNumber?: string | null;
  }
) {
  await q(
    client,
    `UPDATE users
     SET school_id = $2,
         gender = $3,
         grade_level = $4,
         onboarding_completed = TRUE
     WHERE id = $1`,
    [input.userId, input.schoolId, input.gender, input.grade]
  );

  if (input.mpesaPhoneNumber) {
    await upsertBillingProfile(client, input.userId, input.mpesaPhoneNumber);
  }
}

export async function hasSuccessfulPayments(userId: string) {
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*)::bigint AS total
     FROM payment_requests
     WHERE user_id = $1
       AND status = 'paid'`,
    [userId]
  );

  return Number(result.rows[0]?.total ?? 0) > 0;
}

export async function upsertBillingProfile(client: MaybeClient, userId: string, mpesaPhoneNumber: string) {
  await q(
    client,
    `INSERT INTO user_billing_profiles (user_id, mpesa_phone_number, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET mpesa_phone_number = EXCLUDED.mpesa_phone_number, updated_at = NOW()`,
    [userId, mpesaPhoneNumber]
  );
}

export async function createPaymentRequest(
  client: MaybeClient,
  input: {
    userId: string;
    planId: string;
    planCode: BillingPlanCode;
    amountKshCents: number;
    phoneNumber: string;
    returnTo: string;
    expiresAt: Date;
  }
) {
  const result = await q<{ id: string }>(
    client,
    `INSERT INTO payment_requests (
      user_id, plan_id, plan_code, amount_ksh_cents, phone_number, return_to, status, expires_at
     ) VALUES (
      $1, $2, $3, $4, $5, $6, 'pending', $7
     )
     RETURNING id`,
    [
      input.userId,
      input.planId,
      input.planCode,
      input.amountKshCents,
      input.phoneNumber,
      input.returnTo,
      input.expiresAt
    ]
  );

  return result.rows[0].id;
}

export async function markPaymentRequestInitiated(
  client: MaybeClient,
  paymentRequestId: string,
  merchantRequestId: string,
  checkoutRequestId: string
) {
  await q(
    client,
    `UPDATE payment_requests
     SET status = 'initiated',
         merchant_request_id = $2,
         checkout_request_id = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [paymentRequestId, merchantRequestId, checkoutRequestId]
  );
}

export async function findPaymentRequestByIdForUser(paymentRequestId: string, userId: string) {
  const result = await db.query<PaymentRequestRecord>(
    `SELECT id, user_id, plan_id, plan_code, status, amount_ksh_cents, phone_number, return_to,
            merchant_request_id, checkout_request_id, mpesa_receipt_number, result_code, result_desc,
            expires_at, completed_at, created_at
     FROM payment_requests
     WHERE id = $1 AND user_id = $2`,
    [paymentRequestId, userId]
  );

  return result.rows[0] ?? null;
}

export async function findPaymentRequestByCheckoutRequestId(checkoutRequestId: string) {
  const result = await db.query<PaymentRequestRecord>(
    `SELECT id, user_id, plan_id, plan_code, status, amount_ksh_cents, phone_number, return_to,
            merchant_request_id, checkout_request_id, mpesa_receipt_number, result_code, result_desc,
            expires_at, completed_at, created_at
     FROM payment_requests
     WHERE checkout_request_id = $1`,
    [checkoutRequestId]
  );

  return result.rows[0] ?? null;
}

export async function markPaymentRequestSuccessful(
  client: MaybeClient,
  paymentRequestId: string,
  input: {
    receiptNumber: string | null;
    resultCode: number;
    resultDesc: string;
    rawCallback: Record<string, unknown>;
  }
) {
  await q(
    client,
    `UPDATE payment_requests
     SET status = 'paid',
         mpesa_receipt_number = $2,
         result_code = $3,
         result_desc = $4,
         raw_callback = $5::jsonb,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [paymentRequestId, input.receiptNumber, input.resultCode, input.resultDesc, JSON.stringify(input.rawCallback)]
  );
}

export async function markPaymentRequestFailed(
  client: MaybeClient,
  paymentRequestId: string,
  input: {
    status: 'failed' | 'cancelled' | 'expired';
    resultCode: number | null;
    resultDesc: string;
    rawCallback: Record<string, unknown>;
  }
) {
  await q(
    client,
    `UPDATE payment_requests
     SET status = $2,
         result_code = $3,
         result_desc = $4,
         raw_callback = $5::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [paymentRequestId, input.status, input.resultCode, input.resultDesc, JSON.stringify(input.rawCallback)]
  );
}

export async function expirePendingPaymentRequests(client: MaybeClient) {
  await q(
    client,
    `UPDATE payment_requests
     SET status = 'expired',
         updated_at = NOW()
     WHERE status IN ('pending', 'initiated')
       AND expires_at < NOW()`,
    []
  );
}

export async function replaceActiveSubscription(
  client: MaybeClient,
  input: {
    userId: string;
    planId: string;
    billingCycle: 'weekly' | 'monthly' | 'annual';
    priceKshCents: number;
    periodStart: Date;
    periodEnd: Date;
  }
) {
  await q(
    client,
    `UPDATE subscriptions
     SET status = 'replaced'
     WHERE user_id = $1 AND status = 'active'`,
    [input.userId]
  );

  const result = await q<{ id: string }>(
    client,
    `INSERT INTO subscriptions (user_id, plan_id, billing_cycle, price_ksh_cents, period_start, period_end, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING id`,
    [
      input.userId,
      input.planId,
      input.billingCycle,
      input.priceKshCents,
      input.periodStart,
      input.periodEnd
    ]
  );

  return result.rows[0].id;
}

export async function getSubscriptionAiSpendKshCents(subscriptionId: string): Promise<number> {
  const result = await db.query<{ total_spend: string }>(
    `SELECT COALESCE(SUM(estimated_cost_ksh_cents), 0)::bigint AS total_spend
     FROM ai_usage_events
     WHERE subscription_id = $1 AND status IN ('allowed', 'completed')`,
    [subscriptionId]
  );
  return Number(result.rows[0]?.total_spend ?? 0);
}

export async function createAiUsageEvent(
  client: MaybeClient,
  payload: {
    userId: string;
    schoolId: string | null;
    subscriptionId: string | null;
    feature: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsdMicros: number;
    fxRateKshPerUsd: number;
    estimatedCostKshCents: number;
    promptVersion: string;
    status: 'allowed' | 'blocked' | 'failed' | 'completed';
  }
) {
  await q(
    client,
    `INSERT INTO ai_usage_events (
      user_id, school_id, subscription_id, feature, provider, model,
      prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd_micros,
      fx_rate_ksh_per_usd, estimated_cost_ksh_cents, prompt_version, status
     ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14
     )`,
    [
      payload.userId,
      payload.schoolId,
      payload.subscriptionId,
      payload.feature,
      payload.provider,
      payload.model,
      payload.promptTokens,
      payload.completionTokens,
      payload.totalTokens,
      payload.estimatedCostUsdMicros,
      payload.fxRateKshPerUsd,
      payload.estimatedCostKshCents,
      payload.promptVersion,
      payload.status
    ]
  );
}

export async function getAdminAiAnalytics(user: AuthenticatedUser) {
  const schoolScoped = !user.roles.includes('platform_admin');
  const scopedParams: unknown[] = schoolScoped ? [user.schoolId] : [];
  const scopedWhere = schoolScoped ? 'WHERE school_id = $1' : '';

  const topUsers = await db.query(
    `SELECT u.id, u.full_name, u.email, COALESCE(SUM(a.estimated_cost_ksh_cents), 0)::bigint AS spend_ksh_cents
     FROM ai_usage_events a
     JOIN users u ON u.id = a.user_id
     ${scopedWhere}
     GROUP BY u.id, u.full_name, u.email
     ORDER BY spend_ksh_cents DESC
     LIMIT 10`,
    scopedParams
  );

  const topFeatures = await db.query(
    `SELECT feature, COALESCE(SUM(estimated_cost_ksh_cents), 0)::bigint AS spend_ksh_cents
     FROM ai_usage_events
     ${scopedWhere}
     GROUP BY feature
     ORDER BY spend_ksh_cents DESC
     LIMIT 10`,
    scopedParams
  );

  const blockedEvents = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM ai_usage_events
     ${schoolScoped ? "WHERE school_id = $1 AND status = 'blocked'" : "WHERE status = 'blocked'"}`,
    scopedParams
  );

  const costBySchool = await db.query(
    `SELECT s.id, s.name, COALESCE(SUM(a.estimated_cost_ksh_cents), 0)::bigint AS spend_ksh_cents
     FROM schools s
     LEFT JOIN ai_usage_events a ON a.school_id = s.id
     GROUP BY s.id, s.name
     ORDER BY spend_ksh_cents DESC`
  );

  const marginByUser = await db.query(
    `SELECT
       u.id,
       u.full_name,
       COALESCE(SUM(a.estimated_cost_ksh_cents), 0)::bigint AS spend_ksh_cents,
       COALESCE(MAX(su.price_ksh_cents), 0)::bigint AS subscription_price_ksh_cents
     FROM users u
     LEFT JOIN ai_usage_events a ON a.user_id = u.id
     LEFT JOIN subscriptions su ON su.user_id = u.id AND su.status = 'active' AND NOW() BETWEEN su.period_start AND su.period_end
     ${schoolScoped ? 'WHERE u.school_id = $1' : ''}
     GROUP BY u.id, u.full_name
     ORDER BY spend_ksh_cents DESC
     LIMIT 20`,
    scopedParams
  );

  return {
    topUsers: topUsers.rows,
    topFeatures: topFeatures.rows,
    blockedEvents: Number(blockedEvents.rows[0]?.total ?? 0),
    costBySchool: schoolScoped ? costBySchool.rows.filter(row => row.id === user.schoolId) : costBySchool.rows,
    marginByUser: marginByUser.rows
  };
}

export async function getBillingAnalytics(user: AuthenticatedUser) {
  const schoolScoped = !user.roles.includes('platform_admin');
  const scopedParams: unknown[] = schoolScoped ? [user.schoolId] : [];
  const userScopeClause = schoolScoped ? 'WHERE u.school_id = $1' : '';

  const activeSubscriptions = await db.query<{ total: string }>(
    `SELECT COUNT(*)::bigint AS total
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     ${userScopeClause}${schoolScoped ? " AND" : " WHERE"} s.status = 'active'
       AND NOW() BETWEEN s.period_start AND s.period_end`,
    scopedParams
  );

  const recentPayments = await db.query(
    `SELECT pr.id, pr.plan_code, pr.status, pr.amount_ksh_cents, pr.result_desc, pr.created_at, u.email
     FROM payment_requests pr
     JOIN users u ON u.id = pr.user_id
     ${userScopeClause}
     ORDER BY pr.created_at DESC
     LIMIT 15`,
    scopedParams
  );

  const revenueByPlan = await db.query(
    `SELECT pr.plan_code, COUNT(*)::int AS total_payments, COALESCE(SUM(pr.amount_ksh_cents), 0)::bigint AS revenue_ksh_cents
     FROM payment_requests pr
     JOIN users u ON u.id = pr.user_id
     ${userScopeClause}${schoolScoped ? " AND" : " WHERE"} pr.status = 'paid'
     GROUP BY pr.plan_code
     ORDER BY revenue_ksh_cents DESC`,
    scopedParams
  );

  const failedPayments = await db.query<{ total: string }>(
    `SELECT COUNT(*)::bigint AS total
     FROM payment_requests pr
     JOIN users u ON u.id = pr.user_id
     ${userScopeClause}${schoolScoped ? " AND" : " WHERE"} pr.status IN ('failed', 'cancelled', 'expired')`,
    scopedParams
  );

  return {
    activeSubscriptions: Number(activeSubscriptions.rows[0]?.total ?? 0),
    failedPayments: Number(failedPayments.rows[0]?.total ?? 0),
    recentPayments: recentPayments.rows,
    revenueByPlan: revenueByPlan.rows
  };
}

function normalizeCurriculumItems(
  items: Array<{ id?: string; text: string }> | null | undefined,
  prefix: string
) {
  return (items ?? [])
    .map((item, index) => ({
      id: item.id ?? `${prefix}-${index + 1}`,
      text: item.text
    }))
    .filter(item => item.text.trim().length > 0);
}

function buildCurriculumSubjectBundles(args: {
  strands: CurriculumStrandRecord[];
  subStrands: CurriculumSubStrandRecord[];
  progressBySubStrand: Map<string, { passed: boolean; quizScore: number | null; attemptCount: number }>;
}) {
  const subStrandsByStrand = new Map<string, CurriculumSubStrandRecord[]>();
  for (const subStrand of args.subStrands) {
    const bucket = subStrandsByStrand.get(subStrand.strand_id) ?? [];
    bucket.push(subStrand);
    subStrandsByStrand.set(subStrand.strand_id, bucket);
  }

  const subjectBundles = new Map<string, CurriculumSubjectBundle>();

  for (const strand of args.strands) {
    const subjectKey = `${strand.grade_level}:${strand.subject_id}`;
    const existingSubject = subjectBundles.get(subjectKey) ?? {
      subjectId: strand.subject_id,
      subjectName: strand.subject_name,
      strands: []
    };

    const strandSubStrands = (subStrandsByStrand.get(strand.id) ?? [])
      .sort((left, right) => left.position - right.position)
      .map((subStrand, index, ordered) => {
        const previous = ordered[index - 1];
        const progress = args.progressBySubStrand.get(subStrand.id);
        const previousProgress = previous ? args.progressBySubStrand.get(previous.id) : undefined;
        const isCompleted = progress?.passed ?? false;
        const isLocked =
          index > 0 && previous ? !(previousProgress?.passed ?? false) : false;

        return {
          id: subStrand.id,
          title: subStrand.title,
          type: subStrand.type,
          description: subStrand.description ?? undefined,
          pages: subStrand.pages ?? [],
          isLocked,
          isCompleted,
          needsRemediation: Boolean(progress && !progress.passed),
          masteryScore: progress?.quizScore ?? null,
          unlockReason: isLocked
            ? `Score 70% or higher on ${previous?.title ?? 'the previous topic'} to unlock.`
            : undefined,
          number: subStrand.number ?? undefined,
          outcomes: normalizeCurriculumItems(
            subStrand.outcomes,
            `${subStrand.id}-outcome`
          ),
          inquiryQuestions: normalizeCurriculumItems(
            subStrand.inquiry_questions,
            `${subStrand.id}-question`
          )
        };
      });

    existingSubject.strands.push({
      id: strand.id,
      title: strand.title,
      subTitle: strand.sub_title,
      number: strand.number ?? undefined,
      subStrands: strandSubStrands
    });

    subjectBundles.set(subjectKey, existingSubject);
  }

  return Array.from(subjectBundles.values()).map(subject => ({
    ...subject,
    strands: subject.strands.sort((left, right) => {
      const leftStrand = args.strands.find(strand => strand.id === left.id);
      const rightStrand = args.strands.find(strand => strand.id === right.id);
      return (leftStrand?.position ?? 0) - (rightStrand?.position ?? 0);
    })
  }));
}

export async function replaceCurriculumSubject(
  client: MaybeClient,
  input: {
    actorUserId: string | null;
    grade: string;
    subjectId: string;
    subjectName: string;
    strands: CurriculumStrandInput[];
  }
) {
  await q(
    client,
    `DELETE FROM curriculum_strands
     WHERE grade_level = $1 AND subject_id = $2`,
    [input.grade, input.subjectId]
  );

  for (const [strandIndex, strand] of input.strands.entries()) {
    const strandResult = await q<{ id: string }>(
      client,
      `INSERT INTO curriculum_strands (
        grade_level, subject_id, subject_name, number, title, sub_title, position, created_by_user_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        input.grade,
        input.subjectId,
        input.subjectName,
        strand.number ?? null,
        strand.title,
        strand.subTitle ?? '',
        strandIndex,
        input.actorUserId
      ]
    );

    const strandId = strandResult.rows[0].id;
    for (const [subIndex, subStrand] of strand.subStrands.entries()) {
      await q(
        client,
        `INSERT INTO curriculum_sub_strands (
          strand_id, number, title, type, description, position, outcomes, inquiry_questions, pages, lesson_generated_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, NOW())`,
        [
          strandId,
          subStrand.number ?? null,
          subStrand.title,
          subStrand.type,
          subStrand.description ?? null,
          subIndex,
          JSON.stringify(subStrand.outcomes ?? []),
          JSON.stringify(subStrand.inquiryQuestions ?? []),
          JSON.stringify(subStrand.pages ?? []),
          subStrand.pages && subStrand.pages.length > 0 ? new Date() : null
        ]
      );
    }
  }
}

export async function listCurriculumForGrade(
  grade: string,
  userId?: string | null
): Promise<CurriculumSubjectBundle[]> {
  const strandsResult = await db.query<CurriculumStrandRecord>(
    `SELECT id, grade_level, subject_id, subject_name, number, title, sub_title, position
     FROM curriculum_strands
     WHERE grade_level = $1
     ORDER BY subject_name ASC, position ASC`,
    [grade]
  );

  if (strandsResult.rows.length === 0) {
    return [];
  }

  const strandIds = strandsResult.rows.map(strand => strand.id);
  const subStrandsResult = await db.query<CurriculumSubStrandRecord>(
    `SELECT id, strand_id, number, title, type, description, position, outcomes, inquiry_questions, pages, lesson_generated_at
     FROM curriculum_sub_strands
     WHERE strand_id = ANY($1::uuid[])
     ORDER BY position ASC`,
    [strandIds]
  );

  const progressBySubStrand = new Map<string, { passed: boolean; quizScore: number | null; attemptCount: number }>();
  if (userId) {
    const progressResult = await db.query<{
      sub_strand_id: string;
      passed: boolean;
      quiz_score: string | null;
      attempt_count: number;
    }>(
      `SELECT sub_strand_id, passed, quiz_score::text AS quiz_score, attempt_count
       FROM user_curriculum_progress
       WHERE user_id = $1`,
      [userId]
    );
    for (const row of progressResult.rows) {
      progressBySubStrand.set(row.sub_strand_id, {
        passed: row.passed,
        quizScore: row.quiz_score === null ? null : Number(row.quiz_score),
        attemptCount: row.attempt_count
      });
    }
  }

  return buildCurriculumSubjectBundles({
    strands: strandsResult.rows,
    subStrands: subStrandsResult.rows,
    progressBySubStrand
  });
}

export async function findCurriculumSubStrandContext(subStrandId: string) {
  const result = await db.query<{
    sub_strand_id: string;
    sub_strand_title: string;
    sub_strand_type: 'knowledge' | 'skill' | 'competence';
    sub_strand_description: string | null;
    sub_strand_number: string | null;
    outcomes: Array<{ id?: string; text: string }>;
    inquiry_questions: Array<{ id?: string; text: string }>;
    pages: Array<{ title: string; content: string }>;
    lesson_generated_at: Date | null;
    strand_id: string;
    strand_title: string;
    strand_number: string | null;
    grade_level: string;
    subject_id: string;
    subject_name: string;
  }>(
    `SELECT
       css.id AS sub_strand_id,
       css.title AS sub_strand_title,
       css.type AS sub_strand_type,
       css.description AS sub_strand_description,
       css.number AS sub_strand_number,
       css.outcomes,
       css.inquiry_questions,
       css.pages,
       css.lesson_generated_at,
       cs.id AS strand_id,
       cs.title AS strand_title,
       cs.number AS strand_number,
       cs.grade_level,
       cs.subject_id,
       cs.subject_name
     FROM curriculum_sub_strands css
     JOIN curriculum_strands cs ON cs.id = css.strand_id
     WHERE css.id = $1`,
    [subStrandId]
  );

  return result.rows[0] ?? null;
}

export async function saveCurriculumSubStrandPages(
  client: MaybeClient,
  subStrandId: string,
  pages: Array<{ title: string; content: string }>
) {
  await q(
    client,
    `UPDATE curriculum_sub_strands
     SET pages = $2::jsonb,
         lesson_generated_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [subStrandId, JSON.stringify(pages)]
  );
}

export async function markCurriculumSubStrandCompleted(
  client: MaybeClient,
  userId: string,
  subStrandId: string,
  quizScore: number | null
) {
  await q(
    client,
    `INSERT INTO user_curriculum_progress (
       user_id, sub_strand_id, quiz_score, passed, attempt_count, completed_at, last_attempt_at, updated_at
     )
     VALUES ($1, $2, $3, COALESCE($3, 100) >= 70, 1, NOW(), NOW(), NOW())
     ON CONFLICT (user_id, sub_strand_id)
     DO UPDATE SET
       quiz_score = GREATEST(user_curriculum_progress.quiz_score, EXCLUDED.quiz_score),
       passed = user_curriculum_progress.passed OR EXCLUDED.passed,
       attempt_count = user_curriculum_progress.attempt_count + 1,
       completed_at = CASE WHEN EXCLUDED.passed THEN NOW() ELSE user_curriculum_progress.completed_at END,
       last_attempt_at = NOW(),
       updated_at = NOW()`,
    [userId, subStrandId, quizScore]
  );
}

function formatActivityLabel(value: Date | null) {
  if (!value) {
    return 'Recently';
  }

  const diffMs = Date.now() - value.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
  if (diffHours < 24) {
    return diffHours === 0 ? 'Today' : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return value.toISOString().slice(0, 10);
}

export async function linkParentStudentByEmail(
  client: MaybeClient,
  parentUserId: string,
  studentEmail: string
) {
  const studentResult = await q<{
    id: string;
    full_name: string;
    email: string;
  }>(
    client,
    `SELECT u.id, u.full_name, u.email
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
     WHERE LOWER(u.email) = LOWER($1)
       AND u.email_verified = TRUE
     LIMIT 1`,
    [studentEmail.trim()]
  );

  const student = studentResult.rows[0];
  if (!student) {
    return null;
  }

  await q(
    client,
    `INSERT INTO parent_students (parent_user_id, student_user_id, relationship)
     VALUES ($1, $2, 'guardian')
     ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
    [parentUserId, student.id]
  );

  return {
    id: student.id,
    name: student.full_name,
    email: student.email
  };
}

export async function linkParentStudentByPhone(
  client: MaybeClient,
  parentUserId: string,
  studentPhone: string
) {
  const studentResult = await q<{
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
  }>(
    client,
    `SELECT u.id, u.full_name, u.email, u.phone_number
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
     WHERE u.phone_number = $1
       AND u.phone_verified = TRUE
     LIMIT 1`,
    [studentPhone]
  );

  const student = studentResult.rows[0];
  if (!student) {
    return null;
  }

  await q(
    client,
    `INSERT INTO parent_students (parent_user_id, student_user_id, relationship)
     VALUES ($1, $2, 'guardian')
     ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
    [parentUserId, student.id]
  );

  return {
    id: student.id,
    name: student.full_name,
    email: student.email,
    phoneNumber: student.phone_number
  };
}

export async function unlinkParentStudent(
  client: MaybeClient,
  parentUserId: string,
  studentUserId: string
) {
  await q(
    client,
    `DELETE FROM parent_students
     WHERE parent_user_id = $1 AND student_user_id = $2`,
    [parentUserId, studentUserId]
  );
}

export async function listParentChildrenDashboard(
  parentUserId: string
): Promise<ParentChildDashboardRecord[]> {
  const summaryResult = await db.query<{
    id: string;
    name: string;
    email: string;
    grade: string | null;
    school: string | null;
    relationship: string;
    assessment_average: string | null;
    homework_completion: string | null;
    completed_lessons: string;
    total_lessons: string;
    mastery_average: string | null;
    due_reviews: string;
    last_activity: Date | null;
    diagnostic_completed: boolean | null;
    diagnostic_percentage: number | null;
    diagnostic_completed_at: Date | null;
  }>(
    `SELECT
       child.id,
       child.full_name AS name,
       child.email,
       child.grade_level AS grade,
       school.name AS school,
       ps.relationship,
       submission_stats.assessment_average,
       submission_stats.homework_completion,
       progress_stats.completed_lessons,
       curriculum_stats.total_lessons,
       mastery_stats.mastery_average,
       review_stats.due_reviews,
       GREATEST(
         COALESCE(submission_stats.last_activity, 'epoch'::timestamptz),
         COALESCE(progress_stats.last_activity, 'epoch'::timestamptz),
         COALESCE(mastery_stats.last_activity, 'epoch'::timestamptz),
         COALESCE(latest_diag.completed_at, 'epoch'::timestamptz)
       ) AS last_activity,
       (latest_diag.id IS NOT NULL) AS diagnostic_completed,
       (latest_diag.result_summary->>'percentage')::int AS diagnostic_percentage,
       latest_diag.completed_at AS diagnostic_completed_at
     FROM parent_students ps
     JOIN users child ON child.id = ps.student_user_id
     JOIN user_roles child_role ON child_role.user_id = child.id AND child_role.role = 'student'
     LEFT JOIN schools school ON school.id = child.school_id
     LEFT JOIN LATERAL (
       SELECT
         ROUND(AVG(score) FILTER (WHERE status IN ('Completed', 'Late')), 0)::text AS assessment_average,
         ROUND(
           COALESCE(
             100.0 * COUNT(*) FILTER (WHERE status IN ('Completed', 'Late'))
             / NULLIF(COUNT(*), 0),
             0
           ),
           0
         )::text AS homework_completion,
         MAX(submitted_at) AS last_activity
       FROM submissions
       WHERE student_id = child.id
     ) submission_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(DISTINCT sub_strand_id)::text AS completed_lessons, MAX(updated_at) AS last_activity
       FROM user_curriculum_progress
       WHERE user_id = child.id
     ) progress_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT ROUND(COALESCE(AVG(mastery_score), 0) * 100, 0)::text AS mastery_average,
              MAX(updated_at) AS last_activity
       FROM mastery_scores
       WHERE user_id = child.id
     ) mastery_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*) FILTER (WHERE next_review_date <= CURRENT_DATE)::text AS due_reviews
       FROM spaced_repetition_schedules
       WHERE user_id = child.id
     ) review_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(css.id)::text AS total_lessons
       FROM curriculum_strands cs
       JOIN curriculum_sub_strands css ON css.strand_id = cs.id
       WHERE cs.grade_level = child.grade_level
     ) curriculum_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT id, result_summary, completed_at
       FROM diagnostic_sessions
       WHERE user_id = child.id AND status = 'completed'
       ORDER BY completed_at DESC NULLS LAST
       LIMIT 1
     ) latest_diag ON TRUE
     WHERE ps.parent_user_id = $1
     ORDER BY child.full_name ASC`,
    [parentUserId]
  );

  const children: ParentChildDashboardRecord[] = [];
  for (const row of summaryResult.rows) {
    const assignmentsResult = await db.query<{
      id: string;
      title: string;
      subject: string;
      status: string | null;
      score: string | null;
      due_at: Date | null;
    }>(
      `SELECT
         a.id,
         a.title,
         a.subject,
         sub.status,
         sub.score::text AS score,
         a.due_at
       FROM assignments a
       LEFT JOIN submissions sub
         ON sub.assignment_id = a.id
        AND sub.student_id = $1
       WHERE a.school_id = (
         SELECT school_id FROM users WHERE id = $1
       )
         AND ($2::text IS NULL OR a.grade_level = $2)
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [row.id, row.grade]
    );

    const trendsResult = await db.query<{
      week_start: Date;
      lessons_completed: string;
      assignments_completed: string;
      assessment_average: string | null;
      weekly_exam_score: string | null;
    }>(
      `WITH weeks AS (
         SELECT generate_series(
           date_trunc('week', NOW()) - INTERVAL '5 weeks',
           date_trunc('week', NOW()),
           INTERVAL '1 week'
         ) AS week_start
       )
       SELECT
         weeks.week_start,
         (SELECT COUNT(*)::text
          FROM user_curriculum_progress progress
          WHERE progress.user_id = $1
            AND progress.passed = TRUE
            AND progress.completed_at >= weeks.week_start
            AND progress.completed_at < weeks.week_start + INTERVAL '1 week') AS lessons_completed,
         (SELECT COUNT(*)::text
          FROM submissions submission
          WHERE submission.student_id = $1
            AND submission.status IN ('Completed', 'Late')
            AND submission.submitted_at >= weeks.week_start
            AND submission.submitted_at < weeks.week_start + INTERVAL '1 week') AS assignments_completed,
         (SELECT ROUND(AVG(submission.score), 0)::text
          FROM submissions submission
          WHERE submission.student_id = $1
            AND submission.status IN ('Completed', 'Late')
            AND submission.submitted_at >= weeks.week_start
            AND submission.submitted_at < weeks.week_start + INTERVAL '1 week') AS assessment_average,
         (SELECT ROUND(AVG(attempt.score), 0)::text
          FROM weekly_exam_attempts attempt
          WHERE attempt.user_id = $1
            AND attempt.status = 'completed'
            AND attempt.submitted_at >= weeks.week_start
            AND attempt.submitted_at < weeks.week_start + INTERVAL '1 week') AS weekly_exam_score
       FROM weeks
       ORDER BY weeks.week_start ASC`,
      [row.id]
    );

    const masteryAreasResult = await db.query<{
      subject_id: string;
      sub_strand_key: string;
      mastery_score: string;
    }>(
      `SELECT subject_id, sub_strand_key, mastery_score::text AS mastery_score
       FROM mastery_scores
       WHERE user_id = $1
       ORDER BY mastery_score DESC, updated_at DESC`,
      [row.id]
    );

    const currentTrend = trendsResult.rows[trendsResult.rows.length - 1];
    const activeDaysResult = await db.query<{ active_days: string }>(
      `SELECT COUNT(DISTINCT activity_day)::text AS active_days
       FROM (
         SELECT submitted_at::date AS activity_day FROM submissions
         WHERE student_id = $1 AND submitted_at >= date_trunc('week', NOW())
         UNION
         SELECT updated_at::date FROM user_curriculum_progress
         WHERE user_id = $1 AND updated_at >= date_trunc('week', NOW())
         UNION
         SELECT submitted_at::date FROM weekly_exam_attempts
         WHERE user_id = $1 AND submitted_at >= date_trunc('week', NOW())
       ) activity`,
      [row.id]
    );

    const formatTopic = (value: string) => value
      .split(/[-_]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const strengths = masteryAreasResult.rows
      .filter(area => Number(area.mastery_score) >= 0.8)
      .slice(0, 3)
      .map(area => `${formatTopic(area.subject_id)}: ${formatTopic(area.sub_strand_key)}`);
    const focusAreas = masteryAreasResult.rows
      .filter(area => Number(area.mastery_score) < 0.7)
      .reverse()
      .slice(0, 3)
      .map(area => `${formatTopic(area.subject_id)}: ${formatTopic(area.sub_strand_key)}`);

    const lastActive =
      row.last_activity && row.last_activity.getTime() > 0
        ? formatActivityLabel(row.last_activity)
        : 'No activity yet';

    children.push({
      id: row.id,
      name: row.name,
      email: row.email,
      grade: row.grade || 'Unassigned',
      school: row.school,
      relationship: row.relationship,
      assessment_average: Number(row.assessment_average || 0),
      homework_completion: Number(row.homework_completion || 0),
      completed_lessons: Number(row.completed_lessons || 0),
      total_lessons: Number(row.total_lessons || 0),
      mastery_average: Number(row.mastery_average || 0),
      due_reviews: Number(row.due_reviews || 0),
      last_active: lastActive,
      diagnostic: {
        completed: Boolean(row.diagnostic_completed),
        percentage: row.diagnostic_percentage,
        completedAt: row.diagnostic_completed_at?.toISOString() ?? null
      },
      recent_assignments: assignmentsResult.rows.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        status: assignment.status?.toLowerCase() === 'completed' || assignment.status === 'Late'
          ? 'completed'
          : 'pending',
        score: assignment.score ? Number(assignment.score) : null,
        dueAt: assignment.due_at?.toISOString() ?? null
      })),
      weekly_trends: trendsResult.rows.map(trend => ({
        weekStart: trend.week_start.toISOString().slice(0, 10),
        lessonsCompleted: Number(trend.lessons_completed || 0),
        assignmentsCompleted: Number(trend.assignments_completed || 0),
        assessmentAverage: Number(trend.assessment_average || 0),
        weeklyExamScore: trend.weekly_exam_score === null ? null : Number(trend.weekly_exam_score)
      })),
      weekly_report: {
        generatedAt: new Date().toISOString(),
        activeDays: Number(activeDaysResult.rows[0]?.active_days || 0),
        lessonsCompleted: Number(currentTrend?.lessons_completed || 0),
        assignmentsCompleted: Number(currentTrend?.assignments_completed || 0),
        assessmentAverage: Number(currentTrend?.assessment_average || 0),
        weeklyExamScore: currentTrend?.weekly_exam_score === null || currentTrend?.weekly_exam_score === undefined
          ? null
          : Number(currentTrend.weekly_exam_score),
        strengths,
        focusAreas
      }
    });
  }

  return children;
}

export async function ensureWeeklyExam(
  client: MaybeClient,
  input: {
    gradeLevel: string;
    weekStart: string;
    title: string;
    durationMinutes: number;
    questions: WeeklyExamQuestionRecord[];
    opensAt: Date;
    closesAt: Date;
  }
) {
  const result = await q<WeeklyExamRecord>(
    client,
    `INSERT INTO weekly_exams (
       grade_level, week_start, title, duration_minutes, questions, opens_at, closes_at
     )
     VALUES ($1, $2::date, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (grade_level, week_start)
     DO UPDATE SET
       title = EXCLUDED.title,
       opens_at = LEAST(weekly_exams.opens_at, EXCLUDED.opens_at),
       closes_at = GREATEST(weekly_exams.closes_at, EXCLUDED.closes_at),
       updated_at = NOW()
     RETURNING id, grade_level, week_start, title, duration_minutes, questions,
               opens_at, closes_at, is_published`,
    [
      input.gradeLevel,
      input.weekStart,
      input.title,
      input.durationMinutes,
      JSON.stringify(input.questions),
      input.opensAt,
      input.closesAt
    ]
  );

  return result.rows[0];
}

export async function findWeeklyExamAttempt(examId: string, userId: string) {
  const result = await db.query<WeeklyExamAttemptRecord>(
    `SELECT id, exam_id, user_id, status, answers, score::text AS score,
            correct_count, total_questions, started_at, submitted_at
     FROM weekly_exam_attempts
     WHERE exam_id = $1 AND user_id = $2`,
    [examId, userId]
  );
  return result.rows[0] ?? null;
}

export async function startWeeklyExamAttempt(
  client: MaybeClient,
  examId: string,
  userId: string
) {
  const result = await q<WeeklyExamAttemptRecord>(
    client,
    `INSERT INTO weekly_exam_attempts (exam_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (exam_id, user_id) DO UPDATE SET exam_id = EXCLUDED.exam_id
     RETURNING id, exam_id, user_id, status, answers, score::text AS score,
               correct_count, total_questions, started_at, submitted_at`,
    [examId, userId]
  );
  return result.rows[0];
}

async function recordWeeklyExamMastery(
  client: MaybeClient,
  userId: string,
  question: WeeklyExamQuestionRecord,
  isCorrect: boolean
) {
  const contribution = isCorrect ? 0.9 : 0.15;
  await q(
    client,
    `INSERT INTO mastery_scores (
       user_id, subject_id, sub_strand_key, mastery_score, correctness_history,
       confidence_history, avg_latency_ms, attempt_count, last_practiced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, jsonb_build_array($5::boolean), '[]'::jsonb, 0, 1, NOW(), NOW())
     ON CONFLICT (user_id, subject_id, sub_strand_key)
     DO UPDATE SET
       mastery_score = ROUND(
         ((mastery_scores.mastery_score::numeric * mastery_scores.attempt_count) + $4::numeric)
         / (mastery_scores.attempt_count + 1),
         4
       ),
       correctness_history = mastery_scores.correctness_history || jsonb_build_array($5::boolean),
       attempt_count = mastery_scores.attempt_count + 1,
       last_practiced_at = NOW(),
       updated_at = NOW()`,
    [userId, question.subjectId, question.subStrandKey, contribution, isCorrect]
  );
}

export async function submitWeeklyExamAttempt(
  client: MaybeClient,
  input: {
    exam: WeeklyExamRecord;
    attemptId: string;
    userId: string;
    answers: Array<{ questionId: string; answer: string }>;
  }
) {
  const attemptResult = await q<WeeklyExamAttemptRecord>(
    client,
    `SELECT id, exam_id, user_id, status, answers, score::text AS score,
            correct_count, total_questions, started_at, submitted_at
     FROM weekly_exam_attempts
     WHERE id = $1 AND exam_id = $2 AND user_id = $3
     FOR UPDATE`,
    [input.attemptId, input.exam.id, input.userId]
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) {
    return null;
  }
  if (attempt.status === 'completed') {
    return attempt;
  }

  const answerMap = new Map(input.answers.map(answer => [answer.questionId, answer.answer.trim()]));
  const scoredAnswers = input.exam.questions.map(question => {
    const answer = answerMap.get(question.id) ?? '';
    return {
      questionId: question.id,
      answer,
      isCorrect: answer.toLowerCase() === question.correctAnswer.trim().toLowerCase()
    };
  });
  const correctCount = scoredAnswers.filter(answer => answer.isCorrect).length;
  const totalQuestions = input.exam.questions.length;
  const score = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

  const result = await q<WeeklyExamAttemptRecord>(
    client,
    `UPDATE weekly_exam_attempts
     SET status = 'completed', answers = $2::jsonb, score = $3,
         correct_count = $4, total_questions = $5, submitted_at = NOW()
     WHERE id = $1
     RETURNING id, exam_id, user_id, status, answers, score::text AS score,
               correct_count, total_questions, started_at, submitted_at`,
    [input.attemptId, JSON.stringify(scoredAnswers), score, correctCount, totalQuestions]
  );

  for (let index = 0; index < input.exam.questions.length; index += 1) {
    await recordWeeklyExamMastery(
      client,
      input.userId,
      input.exam.questions[index],
      scoredAnswers[index].isCorrect
    );
  }

  return result.rows[0];
}

export async function listWeeklyExamHistory(userId: string) {
  const result = await db.query<{
    id: string;
    exam_id: string;
    title: string;
    week_start: Date;
    score: string;
    correct_count: number;
    total_questions: number;
    submitted_at: Date;
  }>(
    `SELECT a.id, a.exam_id, e.title, e.week_start, a.score::text AS score,
            a.correct_count, a.total_questions, a.submitted_at
     FROM weekly_exam_attempts a
     JOIN weekly_exams e ON e.id = a.exam_id
     WHERE a.user_id = $1 AND a.status = 'completed'
     ORDER BY e.week_start DESC
     LIMIT 12`,
    [userId]
  );
  return result.rows;
}

export async function listLibraryBooksForUser(user: AuthenticatedUser): Promise<LibraryBookRecord[]> {
  const result = await db.query<LibraryBookRecord>(
    `SELECT id, title, author, spine_color, text_color, height, spine_pattern
     FROM library_books
     WHERE is_active = TRUE
       AND (school_id IS NULL OR school_id = $1)
       AND ($2::text IS NULL OR grade_level IS NULL OR grade_level = $2)
     ORDER BY position ASC, title ASC`,
    [user.schoolId, user.grade ?? null]
  );

  return result.rows;
}

export async function listLearningPodcastsForUser(user: AuthenticatedUser): Promise<LearningPodcastRecord[]> {
  const result = await db.query<LearningPodcastRecord>(
    `SELECT id, title, subject, type, duration, views, published_on, author, thumbnail_url, media_url
     FROM learning_podcasts
     WHERE is_active = TRUE
       AND (school_id IS NULL OR school_id = $1)
       AND ($2::text IS NULL OR grade_level IS NULL OR grade_level = $2)
     ORDER BY position ASC, published_on DESC, title ASC`,
    [user.schoolId, user.grade ?? null]
  );

  return result.rows;
}

export async function listTeacherStudents(user: AuthenticatedUser): Promise<TeacherStudentRecord[]> {
  if (!user.schoolId) {
    return [];
  }

  const result = await db.query<{
    id: string;
    name: string;
    grade: string | null;
    assessment_score: string | null;
    homework_completion: string | null;
    last_activity: Date | null;
  }>(
    `SELECT
       u.id,
       u.full_name AS name,
       u.grade_level AS grade,
       ROUND(COALESCE(AVG(sub.score), 0), 0)::text AS assessment_score,
       ROUND(
         COALESCE(
           100.0 * COUNT(*) FILTER (WHERE sub.status = 'Completed')
           / NULLIF(COUNT(sub.id), 0),
           0
         ),
         0
       )::text AS homework_completion,
       GREATEST(MAX(sub.submitted_at), MAX(ucp.updated_at)) AS last_activity
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
     LEFT JOIN submissions sub ON sub.student_id = u.id
     LEFT JOIN assignments a ON a.id = sub.assignment_id AND a.school_id = u.school_id
     LEFT JOIN user_curriculum_progress ucp ON ucp.user_id = u.id
     WHERE u.school_id = $1
     GROUP BY u.id, u.full_name, u.grade_level
     ORDER BY u.full_name ASC`,
    [user.schoolId]
  );

  return result.rows.map(row => {
    const assessmentScore = Number(row.assessment_score || 0);
    return {
      id: row.id,
      name: row.name,
      grade: row.grade || 'Unassigned',
      assessment_score: assessmentScore,
      homework_completion: Number(row.homework_completion || 0),
      last_active: formatActivityLabel(row.last_activity),
      trend: assessmentScore >= 80 ? 'Excellent' : assessmentScore >= 60 ? 'Improving' : 'Stable'
    };
  });
}

export async function listTeacherAssignments(user: AuthenticatedUser): Promise<TeacherAssignmentRecord[]> {
  if (!user.schoolId) {
    return [];
  }

  const result = await db.query<{
    id: string;
    title: string;
    subject: string;
    description: string | null;
    grade_level: string;
    due_at: Date | null;
    created_at: Date;
    questions: Array<{
      id: number;
      type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
      text: string;
      options?: string[];
      correctAnswer?: string | boolean;
      explanation?: string;
    }>;
    submitted_count: number;
    total_students: number;
    average_score: string | null;
  }>(
    `SELECT
       a.id,
       a.title,
       a.subject,
       a.description,
       a.grade_level,
       a.due_at,
       a.created_at,
       a.questions,
       COUNT(sub.id) FILTER (WHERE sub.status = 'Completed')::int AS submitted_count,
       COUNT(sub.id)::int AS total_students,
       ROUND(COALESCE(AVG(sub.score), 0), 0)::text AS average_score
     FROM assignments a
     LEFT JOIN submissions sub ON sub.assignment_id = a.id
     WHERE a.school_id = $1
       AND a.teacher_id = $2
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [user.schoolId, user.id]
  );

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    description: row.description ?? '',
    grade_level: row.grade_level,
    due_at: row.due_at,
    created_at: row.created_at,
    questions: row.questions ?? [],
    submitted_count: row.submitted_count,
    total_students: row.total_students,
    average_score: Number(row.average_score || 0)
  }));
}

export async function listAssignmentSubmissionsForTeacher(
  user: AuthenticatedUser
): Promise<SubmissionReviewRecord[]> {
  if (!user.schoolId) {
    return [];
  }

  const result = await db.query<SubmissionReviewRecord>(
    `SELECT
       a.id AS assignment_id,
       u.id AS student_id,
       u.full_name AS student_name,
       COALESCE(sub.score, 0)::int AS score,
       COALESCE(sub.status, 'Pending')::text AS status,
       sub.answers
     FROM assignments a
     JOIN submissions sub ON sub.assignment_id = a.id
     JOIN users u ON u.id = sub.student_id
     WHERE a.school_id = $1
       AND a.teacher_id = $2
     ORDER BY a.created_at DESC, u.full_name ASC`,
    [user.schoolId, user.id]
  );

  return result.rows.map(row => ({
    ...row,
    answers: row.answers ?? []
  }));
}

export async function createTeacherAssignment(
  client: MaybeClient,
  user: AuthenticatedUser,
  input: {
    title: string;
    subject: string;
    description: string;
    gradeLevel: string;
    dueAt?: Date | null;
    questions: Array<{
      id: number;
      type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
      text: string;
      options?: string[];
      correctAnswer?: string | boolean;
      explanation?: string;
    }>;
  }
) {
  if (!user.schoolId) {
    throw new Error('Teacher must belong to a school');
  }

  const assignmentResult = await q<{ id: string }>(
    client,
    `INSERT INTO assignments (
       school_id,
       class_id,
       teacher_id,
       title,
       description,
       due_at,
       grade_level,
       subject,
       questions
     )
     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id`,
    [
      user.schoolId,
      user.id,
      input.title,
      input.description,
      input.dueAt ?? null,
      input.gradeLevel,
      input.subject,
      JSON.stringify(input.questions)
    ]
  );

  const assignmentId = assignmentResult.rows[0].id;

  const studentRows = await q<{ id: string }>(
    client,
    `SELECT u.id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'student'
     WHERE u.school_id = $1
       AND ($2::text IS NULL OR u.grade_level = $2)`,
    [user.schoolId, input.gradeLevel || null]
  );

  for (const student of studentRows.rows) {
    await q(
      client,
      `INSERT INTO submissions (assignment_id, student_id, status, answers)
       VALUES ($1, $2, 'Pending', '[]'::jsonb)
       ON CONFLICT DO NOTHING`,
      [assignmentId, student.id]
    );
  }

  return assignmentId;
}

export async function listStudentAssignments(user: AuthenticatedUser): Promise<StudentAssignmentRecord[]> {
  if (!user.schoolId) {
    return [];
  }

  const result = await db.query<{
    id: string;
    title: string;
    subject: string;
    description: string | null;
    grade_level: string;
    due_at: Date | null;
    questions: Array<{
      id: number;
      type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
      text: string;
      options?: string[];
      correctAnswer?: string | boolean;
      explanation?: string;
    }>;
    submission_status: string | null;
    score: string | null;
    submitted_at: Date | null;
  }>(
    `SELECT
       a.id,
       a.title,
       a.subject,
       a.description,
       a.grade_level,
       a.due_at,
       a.questions,
       sub.status AS submission_status,
       sub.score::text AS score,
       sub.submitted_at
     FROM assignments a
     LEFT JOIN submissions sub
       ON sub.assignment_id = a.id
      AND sub.student_id = $2
     WHERE a.school_id = $1
       AND ($3::text IS NULL OR a.grade_level = $3)
     ORDER BY a.created_at DESC`,
    [user.schoolId, user.id, user.grade ?? null]
  );

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    description: row.description ?? '',
    grade_level: row.grade_level,
    due_at: row.due_at,
    questions: row.questions ?? [],
    status: row.submission_status?.toLowerCase() === 'completed' ? 'completed' : 'pending',
    score: row.score ? Number(row.score) : null,
    submitted_at: row.submitted_at
  }));
}

export async function submitStudentAssignment(
  client: MaybeClient,
  user: AuthenticatedUser,
  assignmentId: string,
  input: {
    score: number;
    answers: Array<{
      questionId: number;
      question: string;
      answer: string;
      isCorrect: boolean;
    }>;
  }
) {
  const assignmentResult = await q<{
    id: string;
    due_at: Date | null;
    school_id: string;
  }>(
    client,
    `SELECT id, due_at, school_id
     FROM assignments
     WHERE id = $1`,
    [assignmentId]
  );

  const assignment = assignmentResult.rows[0];
  if (!assignment) {
    throw new Error('Assignment not found');
  }

  if (assignment.school_id !== user.schoolId) {
    throw new Error('Assignment does not belong to the current school');
  }

  const status =
    assignment.due_at && assignment.due_at.getTime() < Date.now() ? 'Late' : 'Completed';

  await q(
    client,
    `INSERT INTO submissions (assignment_id, student_id, score, submitted_at, status, answers)
     VALUES ($1, $2, $3, NOW(), $4, $5::jsonb)
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET
       score = EXCLUDED.score,
       submitted_at = EXCLUDED.submitted_at,
       status = EXCLUDED.status,
       answers = EXCLUDED.answers`,
    [assignmentId, user.id, input.score, status, JSON.stringify(input.answers)]
  );
}

export async function listAdminUsers(user: AuthenticatedUser): Promise<AdminUserRecord[]> {
  const schoolScoped = !user.roles.includes('platform_admin');
  const result = await db.query<{
    id: string;
    full_name: string;
    grade_level: string | null;
    school_name: string | null;
    email: string;
    email_verified: boolean;
  }>(
    `SELECT
       u.id,
       u.full_name,
       u.grade_level,
       s.name AS school_name,
       u.email,
       u.email_verified
     FROM users u
     LEFT JOIN schools s ON s.id = u.school_id
     WHERE ($1::boolean = FALSE OR u.school_id = $2)
     ORDER BY u.full_name ASC`,
    [schoolScoped, user.schoolId]
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.full_name,
    grade: row.grade_level || 'N/A',
    school: row.school_name || 'No School',
    email: row.email,
    status: row.email_verified ? 'Active' : 'Offline',
    color: row.email_verified ? 'green' : 'gray'
  }));
}
