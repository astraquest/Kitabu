import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { appConfig } from './config.js';
import { checkDatabaseHealth, checkRedisHealth, redis, db } from './db.js';
import {
  listGeneratedBooksForUser,
  openGeneratedBookAssetForUser,
  readGeneratedBookManifestForUser
} from './generatedBooks.js';
import {
  type AiExecutionPlan,
  type AiProviderAttempt,
  type AudioTranscriptionPlan,
  estimateCostUsdMicros,
  generateTextWithFallback,
  resolveAiExecutionPlans,
  resolveAudioTranscriptionPlans,
  synthesizeSpeechWithGroq,
  transcribeAudio,
  usdMicrosToKshCents
} from './ai.js';
import {
  buildFeatureSystemInstruction,
  getFeatureCachePolicy,
  getFeatureSchemaVersion,
  resolveAiPromptVersion
} from './aiFeatures.js';
import {
  buildTotpUri,
  deriveSessionBindingFingerprint,
  generateRefreshToken,
  generateTotpSecret,
  hashOpaqueToken,
  hashPassword,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
  verifyTotpToken
} from './auth.js';
import { registerLiveAudioStreamRoutes } from './liveAudioStream.js';
import {
  type CurriculumStrandInput,
  createAdminManagedUser,
  createAiGenerationRun,
  createBannerAnnouncement,
  createTeacherAssignment,
  createSelfServiceUser,
  createAiUsageEvent,
  createAuditLog,
  createContentReport,
  createOnboardingSelectionEvent,
  createSubjectEngagementEvent,
  ensureWeeklyExam,
  createDiagnosticSession,
  createParentTeacherMessage,
  createTeacherLessonPlan,
  createTeacherParentMessages,
  createPaymentRequest,
  createPhoneVerificationCode,
  createEmptyCurriculumSubject,
  createSchool,
  createSchoolDiscount,
  deleteBannerAnnouncement,
  deleteSchool,
  deleteSchoolDiscount,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  expirePendingPaymentRequests,
  enableTotp,
  findActiveEmailVerificationToken,
  findActiveRefreshToken,
  findActivePasswordResetToken,
  findSchoolById,
  findSchoolPricingForUser,
  findPaymentRequestByCheckoutRequestId,
  findCurriculumSubStrandContext,
  findPaymentRequestByIdForUser,
  findActiveDiagnosticSession,
  findActiveDiagnosticSessionForSubjects,
  findCompletedDiagnosticSession,
  findDiagnosticSessionForUser,
  findUserAuthIdentityForProvider,
  findSubscriptionPlanByCode,
  findUserByEmail,
  findUserByAuthIdentity,
  findUserStatus,
  findUserByPhone,
  findUserById,
  findWeeklyExamAttempt,
  findActivePhoneVerificationCode,
  listFeatureFlags,
  listUserNotifications,
  getBillingProfile,
  getBillingAnalytics,
  getActiveSubscription,
  getActiveBannerAnnouncement,
  getAdminAiAnalytics,
  getAdminOnboardingAnalytics,
  getAdminSubjectEngagementAnalytics,
  getAiGenerationCacheEntry,
  listAdminUsers,
  listChessMatches,
  listChessMoves,
  listChessOnlineOpponents,
  getSubscriptionAiSpendKshCents,
  getTotpSecret,
  getUserTotpStatus,
  hasSuccessfulPayments,
  invalidateEmailVerificationTokensForUser,
  invalidatePasswordResetTokensForUser,
  insertEmailVerificationToken,
  insertPasswordResetToken,
  insertRefreshToken,
  listBannerAnnouncements,
  listDiagnosticAnswers,
  listDueSpacedReviews,
  linkParentStudentByEmail,
  linkParentStudentByPhone,
  linkUserAuthIdentity,
  findTeacherParentMessageForReport,
  listAdminNotificationRecipientsForSchool,
  listParentChildrenDashboard,
  listParentTeacherMessages,
  listTeacherParentMessages,
  listTeacherParents,
  listAssignmentSubmissionsForTeacher,
  listLearningPodcastsForUser,
  listQuizBankQuestions,
  listSchoolDiscounts,
  listSchools,
  listStudentAssignments,
  listSubscriptionPlans,
  listTeacherAssignments,
  listTeacherStudents,
  listWeeklyExamHistory,
  listCurriculumForGrade,
  markPaymentRequestFailed,
  markPaymentRequestInitiated,
  markPaymentRequestSuccessful,
  markCurriculumSubStrandCompleted,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  markUserEmailVerified,
  markSpacedReviewCompleted,
  recordDiagnosticAnswer,
  recordAiGenerationAttempt,
  recordUserPresence,
  createChessMatch,
  findChessMatchForUser,
  recordPhoneVerificationFailure,
  replaceCurriculumSubject,
  requestSelfServiceAccountDeletion,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokensForSession,
  replaceActiveSubscription,
  replaceTeacherTeachingScopes,
  replaceUserSubjectPreferences,
  unlinkParentStudent,
  completeDiagnosticSession,
  saveCurriculumSubStrandPages,
  setAiGenerationCacheEntry,
  submitStudentAssignment,
  submitChessMove,
  startWeeklyExamAttempt,
  submitWeeklyExamAttempt,
  consumePhoneVerificationCode,
  updateBannerAnnouncement,
  updateSchool,
  updateSchoolPilot,
  updateSchoolDiscount,
  updateAdminStudentProfile,
  setAdminStudentSubscriptionStatus,
  updateUserOnboarding,
  updateUserPassword,
  upsertPushToken,
  upsertBillingProfile,
  upsertTotpSecret,
  createSchoolOnboardingRequest,
  markSchoolOnboardingEmailDelivered,
  withTransaction
} from './repositories.js';
import type { WeeklyExamQuestionRecord, WeeklyExamRecord } from './repositories.js';
import { isSmsConfigured, notifyUser, sendSmsMessage } from './notifications.js';
import {
  getGoogleClientIds,
  verifyGoogleIdToken,
  type VerifiedGoogleIdentity
} from './googleAuth.js';
import { hasAnyRole, requireAuthenticated, requireRoles, requireSchoolContext } from './rbac.js';
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  sendTransactionalEmail
} from './mailer.js';
import {
  buildSubscriptionReference,
  formatKenyanPhoneNumber,
  initiateStkPush,
  maskKenyanPhoneNumber,
  MpesaProviderError,
  normalizeSchoolPlanSelection,
  SCHOOL_BILLING_PLAN_CODES,
  schoolManagedPlanPriceKshCents,
  type BillingPlanCode,
  type SchoolBillingPlanCode
} from './payments.js';
import { buildPaymentTelemetry, emitMufasaTelemetry } from './mufasaTelemetry.js';

const LEGAL_PAGE_DIR = process.env.KITABU_LEGAL_PAGE_DIR?.trim() || join(process.cwd(), 'legal');
const LEGAL_PAGE_PATHS = {
  '/privacy': join(LEGAL_PAGE_DIR, 'privacy', 'index.html'),
  '/policy': join(LEGAL_PAGE_DIR, 'policy', 'index.html'),
  '/terms': join(LEGAL_PAGE_DIR, 'terms', 'index.html'),
  '/deletion': join(LEGAL_PAGE_DIR, 'deletion', 'index.html')
} as const;
const LEGAL_ASSET_PATHS = {
  '/legal.css': {
    path: join(LEGAL_PAGE_DIR, 'legal.css'),
    contentType: 'text/css; charset=utf-8'
  },
  '/assets/kitabu-icon-bold-192.png': {
    path: join(LEGAL_PAGE_DIR, 'assets', 'kitabu-icon-bold-192.png'),
    contentType: 'image/png'
  },
  '/assets/kitabu-favicon-bold.ico': {
    path: join(LEGAL_PAGE_DIR, 'assets', 'kitabu-favicon-bold.ico'),
    contentType: 'image/x-icon'
  },
  '/assets/fonts/bricolage-grotesque-latin.woff2': {
    path: join(LEGAL_PAGE_DIR, 'assets', 'fonts', 'bricolage-grotesque-latin.woff2'),
    contentType: 'font/woff2'
  },
  '/assets/fonts/plus-jakarta-sans-latin.woff2': {
    path: join(LEGAL_PAGE_DIR, 'assets', 'fonts', 'plus-jakarta-sans-latin.woff2'),
    contentType: 'font/woff2'
  }
} as const;
const legalPageCache = new Map<string, string>();
const legalAssetCache = new Map<string, Buffer>();

const LEGAL_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'none'",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "img-src 'self'",
  "object-src 'none'",
  "script-src 'none'",
  "style-src 'self'"
].join('; ');

async function readLegalPage(route: keyof typeof LEGAL_PAGE_PATHS): Promise<string> {
  const cached = legalPageCache.get(route);
  if (cached) {
    return cached;
  }

  const html = await readFile(LEGAL_PAGE_PATHS[route], 'utf8');
  legalPageCache.set(route, html);
  return html;
}

async function readLegalAsset(route: keyof typeof LEGAL_ASSET_PATHS): Promise<Buffer> {
  const cached = legalAssetCache.get(route);
  if (cached) {
    return cached;
  }

  const asset = await readFile(LEGAL_ASSET_PATHS[route].path);
  legalAssetCache.set(route, asset);
  return asset;
}

function applyLegalPageHeaders(reply: FastifyReply): FastifyReply {
  return reply
    .header('Cache-Control', 'public, max-age=0, must-revalidate')
    .header('Content-Security-Policy', LEGAL_CONTENT_SECURITY_POLICY)
    .header('Cross-Origin-Opener-Policy', 'same-origin')
    .header('Cross-Origin-Resource-Policy', 'same-origin')
    .header('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    .header('Referrer-Policy', 'no-referrer')
    .header('X-Content-Type-Options', 'nosniff')
    .header('X-Frame-Options', 'DENY');
}

async function sendLegalAsset(
  route: keyof typeof LEGAL_ASSET_PATHS,
  reply: FastifyReply
): Promise<FastifyReply> {
  const asset = LEGAL_ASSET_PATHS[route];
  return reply
    .header('Cache-Control', 'public, max-age=300, must-revalidate')
    .header('Cross-Origin-Resource-Policy', 'same-origin')
    .header('X-Content-Type-Options', 'nosniff')
    .type(asset.contentType)
    .send(await readLegalAsset(route));
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const personNameSchema = z.string().trim().min(2).max(120).refine(
  value => /[A-Za-z]/.test(value) && !/\d/.test(value),
  'Name cannot include numbers'
);

const phoneAuthRequestSchema = z.discriminatedUnion('purpose', [
  z.object({
    purpose: z.literal('login'),
    phoneNumber: z.string().trim().min(9).max(20)
  }),
  z.object({
    purpose: z.literal('signup'),
    phoneNumber: z.string().trim().min(9).max(20),
    fullName: personNameSchema,
    role: z.enum(['student', 'teacher', 'parent']),
    acceptedTerms: z.literal(true)
  })
]);

const phoneAuthVerifySchema = z.object({
  purpose: z.enum(['login', 'signup']),
  phoneNumber: z.string().trim().min(9).max(20),
  code: z.string().regex(/^\d{6}$/)
});

const googleAuthSchema = z.object({
  idToken: z.string().min(100),
  role: z.enum(['student', 'teacher', 'parent']).optional(),
  acceptedTerms: z.boolean().optional()
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const presenceSchema = z.object({
  status: z.enum(['online', 'offline']),
  reason: z.string().trim().max(80).optional()
});

const chessMatchParamsSchema = z.object({
  matchId: z.string().uuid()
});

const chessCreateMatchSchema = z.object({
  opponentUserId: z.string().uuid()
});

const chessMoveSchema = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const signupSchema = z.object({
  fullName: personNameSchema,
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'teacher', 'parent']),
  acceptedTerms: z.literal(true),
  schoolId: z.string().uuid().nullable().optional(),
  gender: z.enum(['male', 'female', 'not_specified']).optional(),
  grade: z.string().trim().min(2).max(40).nullable().optional(),
  mpesaPhoneNumber: z.string().trim().min(9).max(20).nullable().optional(),
  onboardingCompleted: z.boolean().optional()
});

const totpSchema = z.object({
  token: z.string().length(6)
});

const rotatePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(10)
});

const completePasswordResetSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(10)
});

const verificationEmailSchema = z.object({
  email: z.string().email()
});

const completeEmailVerificationSchema = z.object({
  token: z.string().min(32)
});

const deleteAccountSchema = z.object({
  confirmationText: z.literal('DELETE MY ACCOUNT')
});

const contentReportSchema = z.object({
  source: z.string().trim().min(2).max(80),
  contentRole: z.enum(['model', 'user', 'message', 'attachment', 'other']).default('model'),
  reason: z.enum(['unsafe_ai_content', 'inaccurate', 'privacy', 'abuse', 'other']).default('unsafe_ai_content'),
  contentText: z.string().trim().min(1).max(8000),
  context: z.record(z.string(), z.unknown()).optional()
});

const tokenQuerySchema = z.object({
  token: z.string().min(32)
});

const mpesaCheckoutSchema = z.object({
  planCode: z.enum(['weekly', 'monthly', 'annual', 'admin_weekly', 'trial_monthly_1bob']),
  phoneNumber: z.string().min(9),
  returnTo: z.string().min(1).max(160).default('dashboard')
});

const schoolPlanCodeSchema = z.enum(SCHOOL_BILLING_PLAN_CODES);
const schoolPlanPricesSchema = z.object({
  weekly: z.number().int().min(0).optional(),
  monthly: z.number().int().min(0).optional(),
  annual: z.number().int().min(0).optional()
}).strict();

const schoolSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  schoolType: z.enum(['day_school', 'boarding_school', 'day_and_boarding']).optional(),
  principal: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  salesAgentUserId: z.string().uuid().nullable().optional(),
  availableGrades: z.array(z.string().trim().min(2).max(40)).max(24).default([]),
  availablePlanCodes: z.array(schoolPlanCodeSchema).min(1).max(3),
  planPricesKsh: schoolPlanPricesSchema.optional(),
  subscriptionPriceKsh: z.number().int().min(0).nullable().optional(),
  assignedPlanCode: schoolPlanCodeSchema.optional(),
  discountId: z.string().uuid().nullable().optional()
});

const schoolUpdateSchema = schoolSchema.extend({
  adminPassword: z.string().min(8)
});

const schoolParamsSchema = z.object({
  schoolId: z.string().uuid()
});

const adminStudentParamsSchema = z.object({ userId: z.string().uuid() });
const adminStudentProfileSchema = z.object({
  fullName: personNameSchema,
  grade: z.string().trim().min(2).max(40).nullable(),
  schoolId: z.string().uuid().nullable(),
  email: z.string().email(),
  phone: z.string().trim().max(20).nullable(),
  county: z.string().trim().max(80).nullable(),
  adminPassword: z.string().min(8)
});
const adminStudentSubscriptionSchema = z.object({
  active: z.boolean(),
  planCode: schoolPlanCodeSchema.optional(),
  adminPassword: z.string().min(8)
});

const salesAgentCreateSchema = z.object({
  fullName: personNameSchema,
  email: z.string().email(),
  phoneNumber: z.string().trim().min(9).max(20).nullable().optional(),
  county: z.string().trim().min(2).max(80).nullable().optional()
});

const salesAgentParamsSchema = z.object({
  agentId: z.string().uuid()
});

const salesAgentMessageSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  message: z.string().trim().min(2).max(1000)
});

const parentMessageSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  message: z.string().trim().min(2).max(1000),
  parentIds: z.array(z.string().uuid()).max(500).optional()
});

const schoolPilotSchema = z.object({
  status: z.enum(['not_enrolled', 'onboarding', 'active', 'paused', 'completed']),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  targetStudents: z.number().int().min(0).max(100000),
  onboardingStage: z.number().int().min(0).max(4),
  notes: z.string().trim().max(2000).nullable().optional()
}).refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'Pilot end date must be on or after the start date'
});

const schoolDiscountSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['percentage', 'fixed_ksh']),
  amount: z.number().int().min(1),
  isActive: z.boolean().default(true)
});

const discountParamsSchema = z.object({
  discountId: z.string().uuid()
});

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(4).max(240),
  ctaLabel: z.string().trim().max(40).nullable().optional(),
  ctaTarget: z.enum(['ask_tutor', 'manage_subscription', 'homework_list', 'bookshelf_view']),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true)
});

const announcementParamsSchema = z.object({
  announcementId: z.string().uuid()
});

const onboardingSchema = z.object({
  schoolId: z.string().uuid(),
  gender: z.enum(['male', 'female', 'not_specified']),
  grade: z.string().trim().min(2).max(40),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  mpesaPhoneNumber: z.string().trim().min(9).max(20).nullable().optional()
});

const onboardingSelectionEventSchema = z.object({
  sessionId: z.string().trim().min(8).max(160),
  stepKey: z.string().trim().min(1).max(80),
  optionKey: z.string().trim().min(1).max(160),
  optionLabel: z.string().trim().min(1).max(240),
  role: z.string().trim().max(40).nullable().optional(),
  county: z.string().trim().max(120).nullable().optional(),
  grade: z.string().trim().max(40).nullable().optional(),
  countryCode: z.string().trim().max(10).nullable().optional(),
  curriculumCode: z.string().trim().max(120).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const teacherAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subject: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(2000),
  gradeLevel: z.string().trim().min(2).max(40),
  dueDate: z.string().datetime().optional(),
  targetStudentId: z.string().uuid().optional(),
  questions: z.array(z.object({
    id: z.number().int(),
    type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
    text: z.string().trim().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.string(), z.boolean()]).optional(),
    explanation: z.string().optional()
  })).min(1)
});

const teachingScopeSchema = z.object({
  grades: z.array(z.string().trim().min(2).max(40)).max(20).default([]),
  subjects: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  subjectsByGrade: z.record(z.string(), z.array(z.string().trim().min(1).max(80))).optional()
});

const databaseUuidString = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID');

const teacherParentMessageQuerySchema = z.object({
  gradeLevel: z.string().trim().min(2).max(40).optional(),
  parentUserId: databaseUuidString.optional()
});

const teacherParentMessageSchema = z.object({
  gradeLevel: z.string().trim().min(2).max(40),
  parentUserId: databaseUuidString.nullable().optional(),
  body: z.string().trim().min(1).max(2000)
});

const parentTeacherMessageSchema = z.object({
  teacherUserId: databaseUuidString,
  body: z.string().trim().min(1).max(2000)
});

const teacherParentMessageReportParamsSchema = z.object({
  messageId: databaseUuidString
});

const teacherParentMessageReportSchema = z.object({
  reason: z.enum(['unsafe_ai_content', 'inaccurate', 'privacy', 'abuse', 'other']).default('abuse'),
  note: z.string().trim().max(1000).optional()
});

const teacherLessonPlanSchema = z.object({
  gradeLevel: z.string().trim().min(2).max(40),
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(1).max(240),
  outcome: z.string().trim().min(1).max(1000),
  durationMinutes: z.number().int().min(10).max(240),
  style: z.string().trim().min(1).max(80),
  plan: z.unknown()
});

const assignmentParamsSchema = z.object({
  assignmentId: z.string().uuid()
});

const studentAssignmentSubmissionSchema = z.object({
  score: z.number().min(0).max(100),
  answers: z.array(z.object({
    questionId: z.number().int(),
    question: z.string().trim().min(1),
    answer: z.string(),
    isCorrect: z.boolean()
  }))
});

const ONBOARDING_DIAGNOSTIC_SUBJECTS = ['mathematics', 'english'] as const;

const ONBOARDING_DIAGNOSTIC_QUESTIONS = [
  { id: 'math-fractions-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'fractions', prompt: 'What is 1/2 + 1/4?', options: ['1/6', '2/6', '3/4', '1/8'], correctAnswer: '3/4', difficulty: 2 },
  { id: 'math-arithmetic-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'arithmetic-fluency', prompt: 'A shop has 36 pencils. If 9 students share them equally, how many pencils does each student get?', options: ['3', '4', '6', '9'], correctAnswer: '4', difficulty: 1 },
  { id: 'math-ratios-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'ratios', prompt: 'The ratio of boys to girls is 2:3. If there are 10 boys, how many girls are there?', options: ['12', '15', '20', '30'], correctAnswer: '15', difficulty: 3 },
  { id: 'math-algebra-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'algebra', prompt: 'Solve for x: 3x + 2 = 14', options: ['3', '4', '5', '12'], correctAnswer: '4', difficulty: 3 },
  { id: 'math-place-value-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'number-sense', prompt: 'What is the value of 7 in 4,753?', options: ['7', '70', '700', '7000'], correctAnswer: '700', difficulty: 1 },
  { id: 'math-decimals-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'decimals', prompt: 'Which number is greater?', options: ['0.45', '0.5', '0.405', '0.045'], correctAnswer: '0.5', difficulty: 2 },
  { id: 'math-geometry-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'geometry', prompt: 'A rectangle is 8 cm long and 3 cm wide. What is its area?', options: ['11 cm2', '22 cm2', '24 cm2', '48 cm2'], correctAnswer: '24 cm2', difficulty: 2 },
  { id: 'math-percent-1', subjectId: 'mathematics', subjectName: 'Mathematics', subStrandKey: 'percentages', prompt: 'What is 25% of 80?', options: ['10', '15', '20', '25'], correctAnswer: '20', difficulty: 3 },
  { id: 'eng-vocab-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'vocabulary', prompt: 'Choose the word closest in meaning to "brave".', options: ['afraid', 'courageous', 'quiet', 'tired'], correctAnswer: 'courageous', difficulty: 1 },
  { id: 'eng-grammar-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'grammar', prompt: 'Choose the correct sentence.', options: ['She go to school.', 'She goes to school.', 'She going to school.', 'She gone to school.'], correctAnswer: 'She goes to school.', difficulty: 1 },
  { id: 'eng-comprehension-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'reading-comprehension', prompt: 'Amina watered the plant every morning. Soon it grew taller. Why did the plant grow?', options: ['It was ignored.', 'It received water.', 'It was hidden.', 'It was cold.'], correctAnswer: 'It received water.', difficulty: 2 },
  { id: 'eng-punctuation-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'punctuation', prompt: 'Which sentence uses punctuation correctly?', options: ['Where are you going.', 'Where are you going?', 'Where are you going,', 'Where are you going!'], correctAnswer: 'Where are you going?', difficulty: 1 },
  { id: 'eng-tense-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'tenses', prompt: 'Choose the past tense of "write".', options: ['writed', 'wrote', 'written', 'writing'], correctAnswer: 'wrote', difficulty: 2 },
  { id: 'eng-main-idea-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'main-idea', prompt: 'A paragraph describes how bees collect nectar and make honey. What is the main idea?', options: ['Bees can fly.', 'How bees make honey.', 'Honey is sweet.', 'Flowers are colorful.'], correctAnswer: 'How bees make honey.', difficulty: 3 },
  { id: 'eng-writing-1', subjectId: 'english', subjectName: 'English', subStrandKey: 'sentence-structure', prompt: 'Which is a complete sentence?', options: ['Because it rained.', 'The boy with a red bag.', 'We finished our homework.', 'Running very fast.'], correctAnswer: 'We finished our homework.', difficulty: 2 }
] as const;

const PROGRESSIVE_DIAGNOSTIC_QUESTIONS = {
  science: [
    { id: 'science-living-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'living-things', prompt: 'Which process do plants use to make their own food?', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Evaporation'], correctAnswer: 'Photosynthesis', difficulty: 2 },
    { id: 'science-matter-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'matter', prompt: 'Water changing into steam is an example of what?', options: ['Melting', 'Freezing', 'Evaporation', 'Condensation'], correctAnswer: 'Evaporation', difficulty: 1 },
    { id: 'science-force-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'forces', prompt: 'What force pulls objects toward Earth?', options: ['Friction', 'Gravity', 'Magnetism', 'Electricity'], correctAnswer: 'Gravity', difficulty: 1 },
    { id: 'science-health-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'health', prompt: 'Which nutrient mainly helps build and repair body tissues?', options: ['Proteins', 'Water', 'Sugar', 'Salt'], correctAnswer: 'Proteins', difficulty: 2 },
    { id: 'science-energy-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'energy', prompt: 'Which item changes electrical energy into light energy?', options: ['Bulb', 'Spoon', 'Book', 'Cup'], correctAnswer: 'Bulb', difficulty: 1 },
    { id: 'science-earth-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'earth-science', prompt: 'Soil erosion is most likely caused by:', options: ['Wind and moving water', 'Quiet air', 'Stored seeds', 'Clean bottles'], correctAnswer: 'Wind and moving water', difficulty: 2 },
    { id: 'science-ecosystem-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'ecosystems', prompt: 'In a food chain, grass is usually a:', options: ['Producer', 'Consumer', 'Decomposer', 'Predator'], correctAnswer: 'Producer', difficulty: 3 },
    { id: 'science-lab-1', subjectId: 'science', subjectName: 'Science', subStrandKey: 'scientific-method', prompt: 'A fair test changes how many variables at a time?', options: ['One', 'Two', 'Three', 'As many as possible'], correctAnswer: 'One', difficulty: 3 }
  ],
  kiswahili: [
    { id: 'kiswahili-msamiati-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'msamiati', prompt: 'Neno "mwalimu" lina maana gani kwa Kiingereza?', options: ['Teacher', 'Doctor', 'Farmer', 'Driver'], correctAnswer: 'Teacher', difficulty: 1 },
    { id: 'kiswahili-sarufi-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'sarufi', prompt: 'Chagua sentensi sahihi.', options: ['Mimi ni mwanafunzi.', 'Mimi ni wanafunzi.', 'Mimi ni someni.', 'Mimi ni kitabu.'], correctAnswer: 'Mimi ni mwanafunzi.', difficulty: 1 },
    { id: 'kiswahili-vitenzi-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'vitenzi', prompt: 'Kitenzi katika sentensi "Amina anakimbia haraka" ni:', options: ['Amina', 'anakimbia', 'haraka', 'sentensi'], correctAnswer: 'anakimbia', difficulty: 2 },
    { id: 'kiswahili-nyakati-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'nyakati', prompt: 'Kiambishi "-li-" huonyesha wakati gani?', options: ['Uliopita', 'Ujao', 'Sasa', 'Amri'], correctAnswer: 'Uliopita', difficulty: 2 },
    { id: 'kiswahili-ufahamu-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'ufahamu', prompt: 'Ukisoma kifungu, jambo kuu unalotafuta kwanza ni:', options: ['Wazo kuu', 'Rangi ya karatasi', 'Idadi ya kurasa', 'Bei ya kitabu'], correctAnswer: 'Wazo kuu', difficulty: 2 },
    { id: 'kiswahili-nomino-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'nomino', prompt: 'Ni neno lipi ni nomino?', options: ['kitabu', 'kimbia', 'haraka', 'zuri'], correctAnswer: 'kitabu', difficulty: 1 },
    { id: 'kiswahili-vivumishi-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'vivumishi', prompt: 'Katika "mtoto mzuri", neno "mzuri" ni:', options: ['Kivumishi', 'Kitenzi', 'Nomino', 'Kielezi'], correctAnswer: 'Kivumishi', difficulty: 3 },
    { id: 'kiswahili-methali-1', subjectId: 'kiswahili', subjectName: 'Kiswahili', subStrandKey: 'methali', prompt: 'Methali "Haraka haraka haina baraka" inashauri nini?', options: ['Usifanye mambo kwa pupa', 'Kimbia kila wakati', 'Soma usiku pekee', 'Cheza zaidi'], correctAnswer: 'Usifanye mambo kwa pupa', difficulty: 3 }
  ],
  social: [
    { id: 'social-citizenship-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'citizenship', prompt: 'Which document identifies a Kenyan citizen as a member of the country?', options: ['National ID', 'Shopping list', 'Exercise book', 'Bus ticket'], correctAnswer: 'National ID', difficulty: 1 },
    { id: 'social-map-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'map-skills', prompt: 'A compass rose on a map helps you find:', options: ['Direction', 'Price', 'Population', 'Weather only'], correctAnswer: 'Direction', difficulty: 1 },
    { id: 'social-counties-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'counties', prompt: 'Kenya is divided into how many counties?', options: ['8', '21', '47', '54'], correctAnswer: '47', difficulty: 2 },
    { id: 'social-resources-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'resources', prompt: 'Which is a natural resource?', options: ['River', 'Plastic ruler', 'School bell', 'Road sign'], correctAnswer: 'River', difficulty: 1 },
    { id: 'social-history-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'history', prompt: 'A museum mainly helps preserve:', options: ['Historical items', 'Fresh food', 'Rain water', 'Traffic jams'], correctAnswer: 'Historical items', difficulty: 2 },
    { id: 'social-climate-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'climate', prompt: 'Long-term weather patterns of a place are called:', options: ['Climate', 'Noise', 'Transport', 'Trade'], correctAnswer: 'Climate', difficulty: 2 },
    { id: 'social-economy-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'economic-activities', prompt: 'Growing tea for sale is an example of:', options: ['Agriculture', 'Mining', 'Fishing', 'Manufacturing only'], correctAnswer: 'Agriculture', difficulty: 2 },
    { id: 'social-leadership-1', subjectId: 'social', subjectName: 'Social Studies', subStrandKey: 'leadership', prompt: 'The leader of a county government is the:', options: ['Governor', 'Head teacher', 'Class monitor', 'Chief Justice'], correctAnswer: 'Governor', difficulty: 3 }
  ],
  ai_education: [
    { id: 'ai-digital-safety-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'digital-safety', prompt: 'What should you avoid sharing with an AI tutor?', options: ['Your password', 'A math question', 'A story idea', 'A science topic'], correctAnswer: 'Your password', difficulty: 1 },
    { id: 'ai-prompting-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'prompting', prompt: 'Which prompt is most useful for getting help with homework?', options: ['Help.', 'Explain photosynthesis for Grade 8 with one example.', 'Do everything.', 'Answer fast.'], correctAnswer: 'Explain photosynthesis for Grade 8 with one example.', difficulty: 2 },
    { id: 'ai-verification-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'verification', prompt: 'If an AI answer sounds surprising, what should you do?', options: ['Believe it immediately', 'Check it with a trusted source', 'Delete your notes', 'Share it as a fact'], correctAnswer: 'Check it with a trusted source', difficulty: 2 },
    { id: 'ai-bias-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'bias', prompt: 'AI bias means an AI system may:', options: ['Always be correct', 'Treat some groups unfairly', 'Never use data', 'Only speak one language'], correctAnswer: 'Treat some groups unfairly', difficulty: 3 },
    { id: 'ai-data-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'data-literacy', prompt: 'AI tools learn patterns mainly from:', options: ['Data', 'Rain', 'Battery size', 'Screen brightness'], correctAnswer: 'Data', difficulty: 1 },
    { id: 'ai-creativity-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'creative-use', prompt: 'A good way to use AI for writing is to:', options: ['Copy without reading', 'Ask for ideas, then write in your own words', 'Submit fake sources', 'Ignore teacher instructions'], correctAnswer: 'Ask for ideas, then write in your own words', difficulty: 2 },
    { id: 'ai-limits-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'limitations', prompt: 'Why can an AI tutor make mistakes?', options: ['It predicts answers from patterns', 'It is always joking', 'It cannot show text', 'It only works on Mondays'], correctAnswer: 'It predicts answers from patterns', difficulty: 3 },
    { id: 'ai-ethics-1', subjectId: 'ai_education', subjectName: 'AI Education', subStrandKey: 'ethics', prompt: 'Which is responsible AI use in school?', options: ['Using AI to understand a topic', 'Using AI to impersonate a classmate', 'Using AI to hide cheating', 'Sharing private photos'], correctAnswer: 'Using AI to understand a topic', difficulty: 2 }
  ]
} as const;

const DAILY_QUOTES = [
  'Small lessons every day become big wins.',
  'Consistency beats cramming.',
  'Curiosity is your real superpower.',
  'Every question you ask makes you sharper.',
  'Progress feels small until you look back.'
] as const;

function getWeekStart(date = new Date()) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset));
  return start;
}

function buildWeeklyExamQuestions(gradeLevel: string): WeeklyExamQuestionRecord[] {
  const grade = Math.min(10, Math.max(4, Number(gradeLevel.match(/\d+/)?.[0] ?? 8)));
  const factor = grade + 2;
  const product = factor * (grade + 1);
  return [
    {
      id: `weekly-math-number-${grade}`,
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      subStrandKey: 'number-operations',
      prompt: `What is ${factor} × ${grade + 1}?`,
      options: [String(product - factor), String(product), String(product + grade), String(product + factor)],
      correctAnswer: String(product),
      explanation: `Multiply ${factor} by ${grade + 1} to get ${product}.`
    },
    {
      id: `weekly-math-fraction-${grade}`,
      subjectId: 'mathematics',
      subjectName: 'Mathematics',
      subStrandKey: 'fractions',
      prompt: 'Which fraction is equivalent to 1/2?',
      options: ['2/3', '2/4', '3/5', '4/6'],
      correctAnswer: '2/4',
      explanation: 'Multiplying the numerator and denominator of 1/2 by 2 gives 2/4.'
    },
    {
      id: `weekly-english-grammar-${grade}`,
      subjectId: 'english',
      subjectName: 'English',
      subStrandKey: 'grammar',
      prompt: 'Choose the sentence with correct subject-verb agreement.',
      options: ['The students studies daily.', 'The students study daily.', 'The students is studying daily.', 'The students was study daily.'],
      correctAnswer: 'The students study daily.',
      explanation: 'The plural subject “students” takes the plural verb “study”.'
    },
    {
      id: `weekly-english-reading-${grade}`,
      subjectId: 'english',
      subjectName: 'English',
      subStrandKey: 'reading-comprehension',
      prompt: 'Amina carried an umbrella because dark clouds were gathering. What did she expect?',
      options: ['Strong sunshine', 'Rain', 'A football match', 'A visitor'],
      correctAnswer: 'Rain',
      explanation: 'Dark clouds and an umbrella are clues that Amina expected rain.'
    },
    {
      id: `weekly-science-${grade}`,
      subjectId: 'science',
      subjectName: 'Science',
      subStrandKey: 'living-things',
      prompt: 'Which process allows green plants to make food?',
      options: ['Digestion', 'Photosynthesis', 'Respiration only', 'Germination'],
      correctAnswer: 'Photosynthesis',
      explanation: 'Green plants use light energy to make food through photosynthesis.'
    },
    {
      id: `weekly-social-${grade}`,
      subjectId: 'social',
      subjectName: 'Social Studies',
      subStrandKey: 'citizenship',
      prompt: 'Which action shows responsible citizenship?',
      options: ['Ignoring community rules', 'Protecting public property', 'Wasting water', 'Damaging road signs'],
      correctAnswer: 'Protecting public property',
      explanation: 'Responsible citizens care for resources shared by the community.'
    },
    {
      id: `weekly-kiswahili-${grade}`,
      subjectId: 'kiswahili',
      subjectName: 'Kiswahili',
      subStrandKey: 'msamiati',
      prompt: 'Kinyume cha neno “haraka” ni kipi?',
      options: ['Polepole', 'Juu', 'Karibu', 'Safi'],
      correctAnswer: 'Polepole',
      explanation: '“Polepole” ni kinyume cha “haraka”.'
    },
    {
      id: `weekly-ai-safety-${grade}`,
      subjectId: 'ai_education',
      subjectName: 'AI Education',
      subStrandKey: 'digital-safety',
      prompt: 'What should you do before trusting an important answer from an AI tool?',
      options: ['Share it immediately', 'Verify it with a trusted source', 'Enter your password', 'Assume it is always correct'],
      correctAnswer: 'Verify it with a trusted source',
      explanation: 'AI can make mistakes, so important information should be checked.'
    }
  ];
}

function serializeWeeklyExam(exam: WeeklyExamRecord, includeAnswers = false) {
  return {
    id: exam.id,
    title: exam.title,
    gradeLevel: exam.grade_level,
    weekStart: exam.week_start instanceof Date ? exam.week_start.toISOString().slice(0, 10) : String(exam.week_start),
    durationMinutes: exam.duration_minutes,
    opensAt: exam.opens_at.toISOString(),
    closesAt: exam.closes_at.toISOString(),
    questions: exam.questions.map(question => ({
      id: question.id,
      subjectId: question.subjectId,
      subjectName: question.subjectName,
      subStrandKey: question.subStrandKey,
      prompt: question.prompt,
      options: question.options,
      ...(includeAnswers
        ? { correctAnswer: question.correctAnswer, explanation: question.explanation }
        : {})
    }))
  };
}

const TEST_ACCOUNT_EMAILS = new Set([
  'student@kitabu.ai',
  'teacher@kitabu.ai',
  'admin@kitabu.ai'
]);
const DEMO_STUDENT_EMAIL = 'student@kitabu.ai';

const checkoutParamsSchema = z.object({
  paymentRequestId: z.string().uuid()
});

const libraryBooksQuerySchema = z.object({
  grade: z.string().trim().min(1).max(40).optional()
});

const queryBoolean = z.preprocess(value => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return value;
}, z.boolean());

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: queryBoolean.default(false)
});

const notificationParamsSchema = z.object({
  notificationId: z.string().uuid()
});

const pushTokenSchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  token: z.string().trim().min(10).max(512),
  deviceId: z.string().trim().max(160).nullable().optional()
});

const diagnosticAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(500),
  confidenceScore: z.number().int().min(1).max(5),
  responseLatencyMs: z.number().int().min(0).max(10 * 60 * 1000)
});

const diagnosticParamsSchema = z.object({
  sessionId: z.string().uuid()
});

const progressiveSubjectParamsSchema = z.object({
  subjectId: z.enum(['science', 'kiswahili', 'social', 'ai_education'])
});

const progressiveDiagnosticParamsSchema = z.object({
  subjectId: z.enum(['science', 'kiswahili', 'social', 'ai_education']),
  sessionId: z.string().uuid()
});

const reviewParamsSchema = z.object({
  reviewId: z.string().uuid()
});

const completeReviewSchema = z.object({
  passed: z.boolean()
});

const weeklyExamParamsSchema = z.object({
  examId: z.string().uuid()
});

const weeklyExamSubmitSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().min(1).max(120),
    answer: z.string().trim().max(500)
  })).max(50),
  timedOut: z.boolean().default(false)
});

const parentChildLinkSchema = z.object({
  studentEmail: z.string().trim().email().optional(),
  studentPhone: z.string().trim().min(9).max(20).optional()
}).refine(value => Number(Boolean(value.studentEmail)) + Number(Boolean(value.studentPhone)) === 1, {
  message: 'Provide either studentEmail or studentPhone'
});

const parentChildParamsSchema = z.object({
  studentId: z.string().uuid()
});

const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z
            .array(
              z.object({
                Name: z.string(),
                Value: z.union([z.string(), z.number()]).optional()
              })
            )
            .default([])
        })
        .optional()
    })
  })
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const SENSITIVE_QUERY_KEYS = new Set([
  'access_token',
  'code',
  'id_token',
  'newpassword',
  'password',
  'refresh_token',
  'refreshtoken',
  'secret',
  'token'
]);

function redactRequestUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl, 'http://kitabu.local');
    parsed.searchParams.forEach((_value, key) => {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[redacted]');
      }
    });
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return rawUrl.includes('?') ? `${rawUrl.slice(0, rawUrl.indexOf('?'))}?[redacted]` : rawUrl;
  }
}

function parseOriginList(value: string) {
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function getAllowedCorsOrigins() {
  const origins = new Set([
    appConfig.KITABU_ADMIN_WEB_ORIGIN,
    'https://kitabu.ai',
    'https://www.kitabu.ai',
    ...parseOriginList(appConfig.KITABU_WEB_APP_ORIGINS)
  ]);

  if (appConfig.KITABU_NODE_ENV !== 'production') {
    origins.add('http://localhost:8081');
    origins.add('http://127.0.0.1:8081');
  }

  return Array.from(origins);
}

function renderHandoffPage(args: {
  title: string;
  message: string;
  detail?: string;
  status: 'success' | 'error';
  nonce: string;
  deepLink?: string;
  buttonLabel?: string;
  bodyHtml?: string;
}) {
  const deepLink = args.deepLink ? escapeHtml(args.deepLink) : '';
  const button = deepLink
    ? `<a class="primary" href="${deepLink}">${escapeHtml(args.buttonLabel ?? 'Open Kitabu App')}</a>`
    : '';
  const script = deepLink
    ? `<script nonce="${args.nonce}">
         const target = ${JSON.stringify(args.deepLink)};
         setTimeout(() => { window.location.href = target; }, 250);
       </script>`
    : '';

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(args.title)}</title>
      <style nonce="${args.nonce}">
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-family: "Segoe UI", Arial, sans-serif;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 30%),
            linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
          color: #0f172a;
        }
        .card {
          width: min(92vw, 540px);
          background: rgba(255,255,255,0.86);
          border: 1px solid rgba(148,163,184,0.28);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 24px 60px rgba(15,23,42,0.12);
          backdrop-filter: blur(14px);
        }
        .eyebrow {
          margin: 0 0 12px;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 12px;
          font-weight: 800;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 32px;
          line-height: 1.05;
        }
        p {
          margin: 0 0 14px;
          color: #475569;
          line-height: 1.7;
        }
        .success { color: #166534; }
        .error { color: #b91c1c; }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }
        .primary, button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          border: 0;
          background: #0f172a;
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
          text-decoration: none;
          cursor: pointer;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          padding: 14px;
          font: inherit;
          margin: 6px 0 14px;
        }
        label {
          display: block;
          font-weight: 700;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <main class="card">
        <p class="eyebrow">Kitabu AI</p>
        <h1>${escapeHtml(args.title)}</h1>
        <p class="${args.status}">${escapeHtml(args.message)}</p>
        ${args.detail ? `<p>${escapeHtml(args.detail)}</p>` : ''}
        ${args.bodyHtml ?? ''}
        <div class="actions">${button}</div>
      </main>
      ${script}
    </body>
  </html>`;
}

function buildHandoffCsp(nonce: string) {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

type HandoffPageArgs = Omit<Parameters<typeof renderHandoffPage>[0], 'nonce' | 'bodyHtml'> & {
  bodyHtml?: string | ((nonce: string) => string);
};

function sendHandoffPage(reply: FastifyReply, args: HandoffPageArgs) {
  const nonce = randomBytes(16).toString('base64url');
  const bodyHtml = typeof args.bodyHtml === 'function' ? args.bodyHtml(nonce) : args.bodyHtml;
  return reply
    .header('Content-Security-Policy', buildHandoffCsp(nonce))
    .type('text/html')
    .send(renderHandoffPage({ ...args, bodyHtml, nonce }));
}

const generateTextSchema = z.object({
  prompt: z.string().min(1),
  systemInstruction: z.string().optional(),
  responseMimeType: z.string().optional(),
  feature: z.string().min(1).default('chat'),
  context: z.record(z.string(), z.unknown()).optional(),
  attachment: z
    .object({
      mimeType: z.string().min(1),
      data: z.string().min(1),
      name: z.string().min(1).optional(),
      type: z.enum(['image', 'file'])
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().min(1)
      })
    )
    .optional()
});

type GenerateTextBody = z.infer<typeof generateTextSchema>;

type AiGenerationMetadata = {
  id?: string;
  feature: string;
  promptVersion: string;
  schemaVersion: string;
  provider: string;
  model: string;
  cacheStatus: 'hit' | 'miss' | 'stored' | 'bypassed' | 'not_checked';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
};

function sha256Text(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJsonStringify(value: unknown): string {
  if (value === undefined) {
    return '"__undefined__"';
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableJsonStringify(item)).join(',')}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: unknown) {
  return sha256Text(stableJsonStringify(value));
}

function summarizeAttachmentForHash(attachment: GenerateTextBody['attachment']) {
  if (!attachment) {
    return null;
  }

  return {
    type: attachment.type,
    mimeType: attachment.mimeType,
    name: attachment.name ?? null,
    dataHash: sha256Text(attachment.data),
    dataLength: attachment.data.length
  };
}

function buildGenerationInputFingerprint(body: GenerateTextBody) {
  return {
    prompt: body.prompt,
    systemInstruction: body.systemInstruction ?? null,
    responseMimeType: body.responseMimeType ?? null,
    feature: body.feature,
    context: body.context ?? null,
    history: body.history ?? [],
    attachment: summarizeAttachmentForHash(body.attachment)
  };
}

function buildGenerationCacheKey(args: {
  feature: string;
  promptVersion: string;
  schemaVersion: string;
  inputHash: string;
}) {
  return `kitabu-ai:${args.feature}:${args.promptVersion}:${args.schemaVersion}:${args.inputHash}`;
}

function hydrateCachedGenerationText(valueJson: unknown | null, valueText: string | null) {
  if (valueText !== null) {
    return valueText;
  }

  return JSON.stringify(valueJson);
}

function parseJsonResponseForCache(text: string, responseMimeType?: string) {
  if (!responseMimeType?.toLowerCase().includes('json')) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function truncateAiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

function getAiProviderAttempts(error: unknown) {
  if (error && typeof error === 'object' && 'attempts' in error) {
    const attempts = (error as { attempts?: unknown }).attempts;
    return Array.isArray(attempts) ? (attempts as AiProviderAttempt[]) : [];
  }

  return [];
}

function estimateAttemptCostUsdMicros(attempt: AiProviderAttempt) {
  return estimateCostUsdMicros(
    {
      provider: attempt.provider,
      model: attempt.model
    },
    attempt.promptTokens,
    attempt.completionTokens
  );
}

function buildFallbackCompletedAttempt(
  plan: AiExecutionPlan,
  result: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
): AiProviderAttempt {
  return {
    provider: plan.provider,
    model: plan.model,
    status: 'completed',
    latencyMs: 0,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens
  };
}

const transcribeAudioSchema = z.object({
  base64Audio: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().min(1).optional(),
  language: z.string().min(2).max(16).optional(),
  prompt: z.string().min(1).max(400).optional()
});

const synthesizeSpeechSchema = z.object({
  text: z.string().trim().min(1).max(200),
  voice: z.string().trim().min(1).max(40).optional()
});

const curriculumItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1)
});

const contentPageSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1)
});

const curriculumSubStrandSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(['knowledge', 'skill', 'competence']).default('knowledge'),
  description: z.string().optional(),
  pages: z.array(contentPageSchema).default([]),
  outcomes: z.array(curriculumItemSchema).default([]),
  inquiryQuestions: z.array(curriculumItemSchema).default([])
});

const curriculumStrandSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  subTitle: z.string().optional(),
  subStrands: z.array(curriculumSubStrandSchema).default([])
});

const curriculumSubjectParamsSchema = z.object({
  subjectId: z.string().min(1)
});

const curriculumQuerySchema = z.object({
  grade: z.string().min(1),
  subjectId: z.string().min(1).optional()
});

const curriculumReplaceSchema = z.object({
  grade: z.string().min(1),
  subjectName: z.string().min(1),
  strands: z.array(curriculumStrandSchema)
});

const curriculumCreateSubjectSchema = z.object({
  grade: z.string().trim().min(1),
  subjectName: z.string().trim().min(1).max(80)
});

function subjectIdFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const curriculumImportSchema = z.object({
  grade: z.string().min(1),
  subjectId: z.string().min(1),
  subjectName: z.string().min(1),
  fileName: z.string().optional(),
  mimeType: z.string().default('application/pdf'),
  base64Data: z.string().min(1)
});

const subjectEngagementFeatureSchema = z.enum(['lets_learn', 'library', 'take_quiz', 'quizme']);

const subjectEngagementSchema = z.object({
  grade: z.string().trim().min(1),
  subjectId: z.string().trim().min(1).max(120),
  subjectName: z.string().trim().min(1).max(120),
  feature: subjectEngagementFeatureSchema,
  eventType: z.string().trim().min(1).max(60).default('interaction'),
  durationSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const subjectEngagementQuerySchema = z.object({
  grade: z.string().trim().min(1).optional()
});

const importedCurriculumItemSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.string().optional(),
    text: z.string().min(1)
  })
]);

const importedCurriculumSubStrandSchema = z
  .object({
    number: z.string().optional(),
    title: z.string().min(1),
    outcomes: z.array(importedCurriculumItemSchema).default([]),
    inquiryQuestions: z.array(importedCurriculumItemSchema).default([])
  })
  .passthrough();

const importedCurriculumStrandSchema = z
  .object({
    number: z.string().optional(),
    title: z.string().min(1),
    subStrands: z.array(importedCurriculumSubStrandSchema).default([])
  })
  .passthrough();

const curriculumImportAiResponseSchema = z
  .object({
    strands: z.array(importedCurriculumStrandSchema).default([])
  })
  .passthrough();

const subStrandParamsSchema = z.object({
  subStrandId: z.string().uuid()
});

const subStrandQuizSchema = z.object({
  questionCount: z.number().int().min(3).max(20).default(10)
});

const subStrandCompletionSchema = z.object({
  quizScore: z.number().min(0).max(100).optional(),
  durationSeconds: z.number().int().min(0).max(24 * 60 * 60).optional()
});

const quizBankQuerySchema = z.object({
  grade: z.string().min(1),
  subjectId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100)
});

export interface BuildServerOptions {
  googleTokenVerifier?: (idToken: string) => Promise<VerifiedGoogleIdentity>;
  emailSender?: typeof sendTransactionalEmail;
}

export function buildServer(options: BuildServerOptions = {}) {
  const googleTokenVerifier = options.googleTokenVerifier ?? verifyGoogleIdToken;
  const emailSender = options.emailSender ?? sendTransactionalEmail;
  const app = Fastify({
    logger: {
      level: appConfig.KITABU_NODE_ENV === 'production' ? 'info' : 'debug',
      base: {
        service: 'kitabu-api',
        env: appConfig.KITABU_RUNTIME_ENV
      },
      serializers: {
        req(request) {
          return {
            id: request.id,
            method: request.method,
            url: redactRequestUrl(request.url),
            route: request.routeOptions?.url,
            remoteAddress: request.ip
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode
          };
        }
      }
    },
    trustProxy: appConfig.KITABU_TRUST_PROXY,
    bodyLimit: appConfig.KITABU_BODY_LIMIT_BYTES
  });

  registerLiveAudioStreamRoutes(app);

  app.register(cors, {
    origin: getAllowedCorsOrigins()
  });
  app.register(helmet);
  app.register(sensible);
  app.register(rateLimit, {
    global: false,
    redis
  });
  if (appConfig.KITABU_ENABLE_API_DOCS || appConfig.KITABU_NODE_ENV !== 'production') {
    app.register(swagger, {
      openapi: {
        info: {
          title: 'Kitabu API',
          version: '1.0.0'
        }
      }
    });
    app.register(swaggerUi, {
      routePrefix: '/docs'
    });
  }

  app.decorateRequest('user', undefined);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) {
      request.log.warn({ error }, 'Request validation failed');
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Check the submitted details and try again',
        issues: error.issues.map(issue => ({
          code: issue.code,
          path: issue.path,
          message: issue.message
        }))
      });
    }

    const httpError = error as { statusCode?: number; name?: string; message?: string };
    const statusCode = typeof httpError.statusCode === 'number' ? httpError.statusCode : 500;
    if (statusCode < 500) {
      return reply.status(statusCode).send({
        error: httpError.name || 'Request Error',
        message: httpError.message || 'Request failed'
      });
    }

    request.log.error({ error }, 'Unhandled request error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again.'
    });
  });

  app.addHook('onRequest', async (request) => {
    request.log = request.log.child({
      requestId: request.id
    });
  });

  app.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return;
    }
    const token = authHeader.slice('Bearer '.length);
    try {
      request.user = await verifyAccessToken(token);
    } catch {
      request.user = undefined;
      return;
    }

    const userStatus = await findUserStatus(request.user.id);
    if (userStatus !== 'active') {
      request.user = undefined;
      return reply.unauthorized('Account is not active');
    }

    const verificationExemptRoutes = new Set([
      '/auth/refresh',
      '/auth/email-verification/resend',
      '/auth/email-verification/confirm',
      '/me/account',
      '/onboarding/selection-events',
      '/privacy',
      '/policy',
      '/deletion'
    ]);
    if (
      request.user &&
      !request.user.emailVerified &&
      !request.user.phoneVerified &&
      !verificationExemptRoutes.has(request.routeOptions.url ?? '')
    ) {
      return reply.forbidden('Verify your email or phone number to continue');
    }
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      requestId: request.id,
      userId: request.user?.id ?? null,
      schoolId: request.user?.schoolId ?? null,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime
    }, 'request completed');
  });

  app.get('/health', async (request, reply) => {
    const [database, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    if (database.status !== 'ok') {
      request.log.error({ database }, 'Database health check failed');
      return reply.status(503).send({
        status: 'unhealthy',
        checks: {
          database,
          redis: redisHealth
        }
      });
    }

    const status = redisHealth.status === 'ok' ? 'ok' : 'degraded';
    if (status === 'degraded') {
      request.log.warn({ redis: redisHealth }, 'Redis health check degraded');
    }

    return {
      status,
      checks: {
        database,
        redis: redisHealth
      }
    };
  });

  app.get('/privacy', async (_request, reply) => {
    return applyLegalPageHeaders(reply)
      .type('text/html; charset=utf-8')
      .send(await readLegalPage('/privacy'));
  });

  app.get('/policy', async (_request, reply) => {
    return applyLegalPageHeaders(reply)
      .type('text/html; charset=utf-8')
      .send(await readLegalPage('/policy'));
  });

  app.get('/terms', async (_request, reply) => {
    return applyLegalPageHeaders(reply)
      .type('text/html; charset=utf-8')
      .send(await readLegalPage('/terms'));
  });

  app.get('/deletion', async (_request, reply) => {
    return applyLegalPageHeaders(reply)
      .type('text/html; charset=utf-8')
      .send(await readLegalPage('/deletion'));
  });

  app.get('/privacy/', async (_request, reply) => {
    return applyLegalPageHeaders(reply).code(308).header('Location', '/privacy').send();
  });

  app.get('/policy/', async (_request, reply) => {
    return applyLegalPageHeaders(reply).code(308).header('Location', '/policy').send();
  });

  app.get('/terms/', async (_request, reply) => {
    return applyLegalPageHeaders(reply).code(308).header('Location', '/terms').send();
  });

  app.get('/deletion/', async (_request, reply) => {
    return applyLegalPageHeaders(reply).code(308).header('Location', '/deletion').send();
  });

  app.get('/legal.css', async (_request, reply) => {
    return sendLegalAsset('/legal.css', reply);
  });

  app.get('/assets/kitabu-icon-bold-192.png', async (_request, reply) => {
    return sendLegalAsset('/assets/kitabu-icon-bold-192.png', reply);
  });

  app.get('/assets/kitabu-favicon-bold.ico', async (_request, reply) => {
    return sendLegalAsset('/assets/kitabu-favicon-bold.ico', reply);
  });

  app.get('/assets/fonts/bricolage-grotesque-latin.woff2', async (_request, reply) => {
    return sendLegalAsset('/assets/fonts/bricolage-grotesque-latin.woff2', reply);
  });

  app.get('/assets/fonts/plus-jakarta-sans-latin.woff2', async (_request, reply) => {
    return sendLegalAsset('/assets/fonts/plus-jakarta-sans-latin.woff2', reply);
  });

  app.post('/content-reports', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 hour'
      }
    }
  }, async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = contentReportSchema.parse(request.body);
    const currentUser = request.user!;
    const reportId = await withTransaction(async client => {
      const createdReportId = await createContentReport(client, {
        reporterUserId: currentUser.id,
        schoolId: currentUser.schoolId,
        source: body.source,
        contentRole: body.contentRole,
        reason: body.reason,
        contentText: body.contentText,
        context: body.context ?? {}
      });

      await createAuditLog(client, currentUser.id, currentUser.schoolId, 'content.report.created', {
        source: body.source,
        reason: body.reason,
        contentRole: body.contentRole
      }, 'content_report', createdReportId);

      return createdReportId;
    });

    return reply.status(201).send({
      reportId,
      message: 'Thanks. The Kitabu safety team will review this report.'
    });
  });

  function buildAuthResponse(args: {
    user: Awaited<ReturnType<typeof findUserByEmail>> | Awaited<ReturnType<typeof findUserById>>;
    accessToken: string;
    refreshToken: string;
    totpEnabled: boolean;
    sessionId?: string | null;
  }) {
    if (!args.user) {
      throw new Error('User is required');
    }

    const normalizedUser = 'schoolId' in args.user
      ? {
          id: args.user.id,
          schoolId: args.user.schoolId,
          status: args.user.status ?? 'active',
          sessionId: args.sessionId ?? args.user.sessionId,
          email: args.user.email,
          phoneNumber: args.user.phoneNumber ?? null,
          phoneVerified: Boolean(args.user.phoneVerified),
          fullName: args.user.fullName,
          emailVerified: args.user.emailVerified,
          roles: args.user.roles,
          gender: args.user.gender ?? 'not_specified',
          grade: args.user.grade ?? null,
          countryCode: args.user.countryCode ?? 'KEN',
          curriculumCode: args.user.curriculumCode ?? 'CBC',
          onboardingCompleted: Boolean(args.user.onboardingCompleted),
          mustRotatePassword: Boolean(args.user.mustRotatePassword),
          isBreakGlass: Boolean(args.user.isBreakGlass)
        }
      : {
          id: args.user.id,
          schoolId: args.user.school_id,
          status: args.user.status,
          sessionId: args.sessionId ?? null,
          email: args.user.email,
          phoneNumber: args.user.phone_number,
          phoneVerified: args.user.phone_verified,
          fullName: args.user.full_name,
          emailVerified: args.user.email_verified,
          roles: args.user.roles,
          gender: args.user.gender,
          grade: args.user.grade_level,
          countryCode: args.user.country_code,
          curriculumCode: args.user.curriculum_code,
          onboardingCompleted: args.user.onboarding_completed,
          mustRotatePassword: args.user.must_rotate_password,
          isBreakGlass: args.user.is_break_glass
        };

    const requiresPlatformTotp = normalizedUser.roles.includes('platform_admin') && !args.totpEnabled;
    const enforceProductionBreakGlassPolicy = appConfig.KITABU_NODE_ENV === 'production';
    return {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      user: {
        id: normalizedUser.id,
        schoolId: normalizedUser.schoolId,
        sessionId: normalizedUser.sessionId,
        email: normalizedUser.email,
        phoneNumber: normalizedUser.phoneNumber,
        phoneVerified: normalizedUser.phoneVerified,
        fullName: normalizedUser.fullName,
        emailVerified: normalizedUser.emailVerified,
        roles: normalizedUser.roles,
        gender: normalizedUser.gender,
        grade: normalizedUser.grade,
        countryCode: normalizedUser.countryCode,
        curriculumCode: normalizedUser.curriculumCode,
        onboardingCompleted: normalizedUser.onboardingCompleted
      },
      authState: {
        mustRotatePassword: enforceProductionBreakGlassPolicy
          ? normalizedUser.mustRotatePassword
          : false,
        requiresPlatformTotp: enforceProductionBreakGlassPolicy ? requiresPlatformTotp : false,
        isBreakGlass: normalizedUser.isBreakGlass
      }
    };
  }

  async function issueAuthSession(
    request: FastifyRequest,
    reply: FastifyReply,
    user: NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>,
    auditEvent: string
  ) {
    if (user.status !== 'active') {
      return reply.unauthorized('Account is not active');
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + appConfig.KITABU_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    const sessionContext = getSessionContext(request);
    const sessionId = randomBytes(16).toString('hex');

    await withTransaction(async client => {
      await insertRefreshToken(client, user.id, refreshTokenHash, refreshExpiresAt, {
        sessionId,
        sessionBindingHash: sessionContext.sessionBindingHash,
        deviceLabel: sessionContext.deviceLabel
      });
      await createAuditLog(client, user.id, user.school_id, auditEvent);
    });

    const totpEnabled = await getUserTotpStatus(user.id);
    const shouldBypassStepUp =
      appConfig.KITABU_NODE_ENV !== 'production' &&
      !totpEnabled &&
      user.roles.includes('platform_admin');
    const accessToken = await signAccessToken({
      sub: user.id,
      schoolId: user.school_id,
      sid: sessionId,
      email: user.email,
      phoneNumber: user.phone_number,
      phoneVerified: user.phone_verified,
      fullName: user.full_name,
      emailVerified: user.email_verified,
      roles: user.roles,
      gender: user.gender,
      grade: user.grade_level,
      countryCode: user.country_code,
      curriculumCode: user.curriculum_code,
      onboardingCompleted: user.onboarding_completed,
      stepUp: shouldBypassStepUp,
      mustRotatePassword: user.must_rotate_password,
      isBreakGlass: user.is_break_glass
    });

    return buildAuthResponse({ user, accessToken, refreshToken, totpEnabled, sessionId });
  }

  function getDeepLink(path: string, params: Record<string, string> = {}) {
    const base = appConfig.KITABU_APP_DEEP_LINK_BASE.replace(/\/$/, '');
    const search = new URLSearchParams(params).toString();
    return `${base}/${path}${search ? `?${search}` : ''}`;
  }

  function getSessionContext(request: FastifyRequest) {
    const deviceIdHeader = request.headers['x-kitabu-device-id'];
    const userAgentHeader = request.headers['user-agent'];
    const acceptLanguageHeader = request.headers['accept-language'];
    const deviceLabelHeader = request.headers['x-kitabu-device-label'];

    const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : deviceIdHeader;
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;
    const acceptLanguage = Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader;
    const deviceLabel = Array.isArray(deviceLabelHeader) ? deviceLabelHeader[0] : deviceLabelHeader;

    return {
      deviceLabel: deviceLabel?.slice(0, 120) ?? null,
      sessionBindingHash: deriveSessionBindingFingerprint({
        deviceId: deviceId?.slice(0, 200),
        userAgent,
        acceptLanguage
      })
    };
  }

  function getAllowedPlanCodesForUser(user: NonNullable<FastifyRequest['user']>): BillingPlanCode[] {
    if (user.roles.includes('platform_admin') || user.roles.includes('school_admin')) {
      return ['admin_weekly'];
    }

    return ['weekly', 'monthly', 'annual'];
  }

  function isTestAccountUser(user: NonNullable<FastifyRequest['user']>) {
    return TEST_ACCOUNT_EMAILS.has(user.email.trim().toLowerCase());
  }

  function isDemoStudentUser(user: NonNullable<FastifyRequest['user']>) {
    return user.email.trim().toLowerCase() === DEMO_STUDENT_EMAIL && user.roles.includes('student');
  }

  function resolvePromptVersion(feature: string) {
    return resolveAiPromptVersion(feature);
  }

  function slugifySchoolName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function applyDiscount(priceKshCents: number, discount: {
    type: 'percentage' | 'fixed_ksh' | null;
    amount: number | null;
    isActive?: boolean;
  }) {
    if (!discount.type || !discount.amount || discount.isActive === false) {
      return priceKshCents;
    }

    if (discount.type === 'percentage') {
      return Math.max(100, Math.round(priceKshCents * (1 - discount.amount / 100)));
    }

    return Math.max(100, priceKshCents - discount.amount * 100);
  }

  function serializePlan(args: {
    code: BillingPlanCode;
    name: string;
    billingCycle: 'weekly' | 'monthly' | 'annual';
    priceKshCents: number;
    originalPriceKshCents?: number;
    isPopular?: boolean;
    isSchoolManaged?: boolean;
    discountName?: string | null;
  }) {
    return {
      code: args.code,
      name: args.name,
      billingCycle: args.billingCycle,
      priceKsh: args.priceKshCents / 100,
      priceKshCents: args.priceKshCents,
      originalPriceKsh: args.originalPriceKshCents ? args.originalPriceKshCents / 100 : null,
      originalPriceKshCents: args.originalPriceKshCents ?? null,
      isPopular: Boolean(args.isPopular),
      isSchoolManaged: Boolean(args.isSchoolManaged),
      discountLabel: args.discountName ?? null
    };
  }

  function serializeDemoStudentSubscription() {
    return {
      id: '00000000-0000-4000-8000-000000000001',
      code: 'monthly' as const,
      name: 'Demo Student Access',
      billingCycle: 'monthly' as const,
      priceKsh: 0,
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2099-12-31T23:59:59.000Z',
      status: 'active'
    };
  }

  function getPublicOriginalPriceKshCents(planCode: BillingPlanCode) {
    if (planCode === 'monthly') {
      return 50000;
    }

    if (planCode === 'annual') {
      return 600000;
    }

    return undefined;
  }

  function serializeSchool(school: NonNullable<Awaited<ReturnType<typeof findSchoolById>>>) {
    const basePriceKshCents = Number(school.assigned_plan_price_ksh_cents);
    const effectivePriceKshCents = applyDiscount(basePriceKshCents, {
      type: school.discount_type,
      amount: school.discount_amount
    });
    const planPricesKsh = Object.fromEntries(
      Object.entries(school.plan_prices_ksh_cents || {}).map(([code, priceKshCents]) => [
        code,
        Number(priceKshCents) / 100
      ])
    );

    return {
      id: school.id,
      name: school.name,
      status: school.status,
      location: school.location,
      schoolType: school.school_type,
      principal: school.principal,
      phone: school.phone,
      email: school.email,
      salesAgentUserId: school.sales_agent_user_id,
      availableGrades: school.available_grades,
      availablePlanCodes: school.available_plan_codes,
      planPricesKsh,
      subscriptionPriceKsh: school.subscription_price_ksh_cents === null ? null : Number(school.subscription_price_ksh_cents) / 100,
      subscriptionPriceKshCents: school.subscription_price_ksh_cents === null ? null : Number(school.subscription_price_ksh_cents),
      totalStudents: school.total_students,
      gradeCounts: school.grade_counts,
      pilot: {
        status: school.pilot_status ?? 'not_enrolled',
        startDate: school.pilot_start_date?.toISOString().slice(0, 10) ?? null,
        endDate: school.pilot_end_date?.toISOString().slice(0, 10) ?? null,
        targetStudents: school.pilot_target_students ?? 0,
        onboardingStage: school.pilot_onboarding_stage ?? 0,
        notes: school.pilot_notes ?? null,
        metrics: {
          onboardedStudents: school.pilot_onboarded_students ?? 0,
          engagedStudents: school.pilot_engaged_students ?? 0,
          averageMastery: school.pilot_average_mastery ?? 0
        }
      },
      pricing: {
        assignedPlanCode: school.assigned_plan_code,
        availablePlanCodes: school.available_plan_codes,
        planPricesKsh,
        assignedPlanName: school.assigned_plan_name,
        billingCycle: school.assigned_billing_cycle,
        basePriceKsh: basePriceKshCents / 100,
        basePriceKshCents,
        effectivePriceKsh: effectivePriceKshCents / 100,
        effectivePriceKshCents,
        discount: school.discount_id
          ? {
              id: school.discount_id,
              name: school.discount_name,
              type: school.discount_type,
              amount: school.discount_amount
            }
          : null
      }
    };
  }

function buildQuoteOfTheDay() {
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
}

type DiagnosticQuestionDefinition = {
  id: string;
  subjectId: string;
  subjectName: string;
  subStrandKey: string;
  prompt: string;
  options: readonly string[];
  correctAnswer: string;
  difficulty: number;
};

function serializeDiagnosticQuestion(question: DiagnosticQuestionDefinition) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    subjectName: question.subjectName,
    subStrandKey: question.subStrandKey,
    prompt: question.prompt,
    options: question.options,
    difficulty: question.difficulty,
    timeLimitSeconds: 120
  };
}

function serializeQuizBankQuestion(
  question: Awaited<ReturnType<typeof listQuizBankQuestions>>[number],
  index: number
) {
  return {
    id: index + 1,
    bankId: question.id,
    countryCode: question.country_code,
    curriculumCode: question.curriculum_code,
    gradeLevel: question.grade_level,
    subjectId: question.subject_id,
    subjectName: question.subject_name,
    strand: question.strand_title,
    subStrand: question.sub_strand_title,
    learningOutcome: question.learning_outcome,
    type: question.type,
    text: question.prompt,
    options: question.options,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitive_level,
    featureTags: question.feature_tags
  };
}

function findDiagnosticQuestion(questionId: string) {
  return ONBOARDING_DIAGNOSTIC_QUESTIONS.find(question => question.id === questionId) ?? null;
}

function getProgressiveDiagnosticQuestions(subjectId: keyof typeof PROGRESSIVE_DIAGNOSTIC_QUESTIONS) {
  return PROGRESSIVE_DIAGNOSTIC_QUESTIONS[subjectId];
}

function findProgressiveDiagnosticQuestion(
  subjectId: keyof typeof PROGRESSIVE_DIAGNOSTIC_QUESTIONS,
  questionId: string
) {
  return getProgressiveDiagnosticQuestions(subjectId).find(question => question.id === questionId) ?? null;
}

function buildDiagnosticResultSummary(answers: Awaited<ReturnType<typeof listDiagnosticAnswers>>) {
  const bySubject = new Map<string, { correct: number; total: number; confidenceTotal: number }>();
  for (const answer of answers) {
    const current = bySubject.get(answer.subject_id) ?? { correct: 0, total: 0, confidenceTotal: 0 };
    current.total += 1;
    current.correct += answer.is_correct ? 1 : 0;
    current.confidenceTotal += answer.confidence_score;
    bySubject.set(answer.subject_id, current);
  }

  const subjects = Array.from(bySubject.entries()).map(([subjectId, value]) => ({
    subjectId,
    correct: value.correct,
    total: value.total,
    percentage: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
    averageConfidence: value.total > 0 ? Number((value.confidenceTotal / value.total).toFixed(2)) : 0
  }));

  const total = answers.length;
  const correct = answers.filter(answer => answer.is_correct).length;
  return {
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    subjects
  };
}

  function getPlanPeriodEnd(start: Date, billingCycle: 'weekly' | 'monthly' | 'annual') {
    const next = new Date(start);

    if (billingCycle === 'weekly') {
      next.setDate(next.getDate() + 7);
      return next;
    }

    if (billingCycle === 'monthly') {
      next.setMonth(next.getMonth() + 1);
      return next;
    }

    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  function getCallbackItemValue(items: Array<{ Name: string; Value?: string | number }>, name: string) {
    const item = items.find(entry => entry.Name === name);
    return item?.Value;
  }

  function normalizeImportedCurriculum(
    args: {
      grade: string;
      subjectId: string;
      subjectName: string;
    },
    payload: Array<{
      number?: string;
      title: string;
      subStrands: Array<{
        number?: string;
        title: string;
        outcomes?: Array<{ id?: string; text: string } | string>;
        inquiryQuestions?: Array<{ id?: string; text: string } | string>;
      }>;
    }>
  ): CurriculumStrandInput[] {
    return payload
      .map((strand, strandIndex) => ({
        number: strand.number || `${strandIndex + 1}.0`,
        title: strand.title.trim(),
        subTitle: `${args.subjectName} imported curriculum`,
        subStrands: (strand.subStrands || [])
          .map((subStrand, subIndex) => ({
            number: subStrand.number || `${strandIndex + 1}.${subIndex + 1}`,
            title: subStrand.title.trim(),
            type: 'knowledge' as const,
            pages: [],
            outcomes: (subStrand.outcomes || [])
              .map((item, itemIndex) => ({
                id:
                  typeof item === 'string'
                    ? `${args.grade}-${args.subjectId}-${strandIndex + 1}-${subIndex + 1}-outcome-${itemIndex + 1}`
                    : item.id,
                text: typeof item === 'string' ? item.trim() : item.text.trim()
              }))
              .filter(item => item.text.length > 0),
            inquiryQuestions: (subStrand.inquiryQuestions || [])
              .map((item, itemIndex) => ({
                id:
                  typeof item === 'string'
                    ? `${args.grade}-${args.subjectId}-${strandIndex + 1}-${subIndex + 1}-question-${itemIndex + 1}`
                    : item.id,
                text: typeof item === 'string' ? item.trim() : item.text.trim()
              }))
              .filter(item => item.text.length > 0)
          }))
          .filter(subStrand => subStrand.title.length > 0 && subStrand.outcomes.length > 0)
      }))
      .filter(strand => strand.title.length > 0 && strand.subStrands.length > 0);
  }

  function isImportableCurriculum(strands: CurriculumStrandInput[]) {
    return (
      strands.length > 0 &&
      strands.some(strand =>
        strand.subStrands.some(subStrand => (subStrand.outcomes ?? []).some(outcome => outcome.text.trim().length > 0))
      )
    );
  }

  async function requireActiveSubscriptionForAi(
    reply: FastifyReply,
    user: NonNullable<FastifyRequest['user']>
  ) {
    if (isDemoStudentUser(user)) {
      return { error: null, subscription: null };
    }

    const subscription = await getActiveSubscription(user.id);
    if (!subscription) {
      reply.status(402);
      return { error: { message: 'Active subscription required' }, subscription: null };
    }

    return { error: null, subscription };
  }

  function canBypassAiSubscription(user: NonNullable<FastifyRequest['user']>, feature: string) {
    if (isDemoStudentUser(user)) {
      return true;
    }

    const operationalAiFeatures = new Set([
      'assignment_generation',
      'lesson_plan_generation',
      'remedial_analysis',
      'curriculum_extraction',
      'curriculum_document_processing',
      'curriculum_import_processing'
    ]);
    if (operationalAiFeatures.has(feature) && hasAnyRole(user, ['teacher', 'school_admin', 'platform_admin'])) {
      return true;
    }

    // Parents do not hold their own subscriptions (children do), so the parent
    // progress assistant is gated by role plus the per-user AI rate limit instead.
    return feature === 'parent_progress_assistant' && hasAnyRole(user, ['parent']);
  }

  function buildLessonGenerationPrompt(context: NonNullable<Awaited<ReturnType<typeof findCurriculumSubStrandContext>>>) {
    const outcomes = (context.outcomes ?? []).map(item => `- ${item.text}`).join('\n') || '- No explicit outcomes provided';
    const inquiryQuestions =
      (context.inquiry_questions ?? []).map(item => `- ${item.text}`).join('\n') ||
      '- No explicit inquiry questions provided';

    return `Create a rich textbook-style lesson for a learner.

Grade: ${context.grade_level}
Subject: ${context.subject_name}
Strand: ${context.strand_title}
Sub-strand: ${context.sub_strand_title}
Learning outcomes:
${outcomes}

Inquiry questions:
${inquiryQuestions}

Return valid JSON with this shape:
{
  "pages": [
    {
      "title": "string",
      "content": "string"
    }
  ]
}

Requirements:
- Generate 4 to 6 lesson pages.
- Each page must feel like a real learner-friendly book page, not a short note.
- Use clear paragraphs, short examples, and bullets where helpful.
- The lesson must teach the learner enough to understand the outcomes.
- Do not include markdown fences.
- The final page should contain a short recap and a transition into the quiz.`;
  }

  function buildLessonQuizPrompt(context: NonNullable<Awaited<ReturnType<typeof findCurriculumSubStrandContext>>>, questionCount: number) {
    const outcomes = (context.outcomes ?? []).map(item => `- ${item.text}`).join('\n') || '- No explicit outcomes provided';
    const inquiryQuestions =
      (context.inquiry_questions ?? []).map(item => `- ${item.text}`).join('\n') ||
      '- No explicit inquiry questions provided';
    const lessonPages =
      (context.pages ?? [])
        .map(page => `${page.title}\n${page.content}`)
        .join('\n\n') || 'No generated lesson pages are stored yet.';

    return `Generate ${questionCount} quiz questions for a learner after finishing a lesson.

Grade: ${context.grade_level}
Subject: ${context.subject_name}
Strand: ${context.strand_title}
Sub-strand: ${context.sub_strand_title}

Learning outcomes:
${outcomes}

Inquiry questions:
${inquiryQuestions}

Lesson content:
${lessonPages}

Return valid JSON with this shape:
{
  "questions": [
    {
      "id": 1,
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
      "text": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}

Requirements:
- Questions must directly test the stated outcomes.
- Mix the question types when appropriate.
- Keep explanations learner-friendly and concise.
- Do not include markdown fences.`;
  }

  async function runSubscriptionScopedAiText(args: {
    request: FastifyRequest;
    reply: FastifyReply;
    body: GenerateTextBody;
  }) {
    const currentUser = args.request.user!;
    const feature = args.body.feature;
    const featureSystemInstruction = buildFeatureSystemInstruction(feature, args.body.context);
    const effectiveBody: GenerateTextBody = {
      ...args.body,
      systemInstruction: featureSystemInstruction ?? args.body.systemInstruction
    };
    const promptVersion = resolvePromptVersion(feature);
    const schemaVersion = getFeatureSchemaVersion(feature);
    const promptHash = hashStableJson({
      feature,
      promptVersion,
      schemaVersion,
      systemInstruction: effectiveBody.systemInstruction ?? null
    });
    const inputFingerprint = buildGenerationInputFingerprint(effectiveBody);
    const inputHash = hashStableJson(inputFingerprint);
    const cacheKey =
      getFeatureCachePolicy(feature) === 'deterministic'
        ? buildGenerationCacheKey({ feature, promptVersion, schemaVersion, inputHash })
        : null;

    const subscriptionCheck = canBypassAiSubscription(currentUser, args.body.feature)
      ? { error: null, subscription: null }
      : await requireActiveSubscriptionForAi(args.reply, currentUser);
    if (subscriptionCheck.error) {
      return {
        error: subscriptionCheck.error,
        text: null,
        subscription: null
      };
    }

    const subscription = subscriptionCheck.subscription;

    if (cacheKey) {
      const cachedEntry = await withTransaction(client => getAiGenerationCacheEntry(client, cacheKey));
      if (cachedEntry) {
        const cachedText = hydrateCachedGenerationText(cachedEntry.value_json, cachedEntry.value_text);
        const cachedProvider =
          typeof cachedEntry.metadata.provider === 'string' ? cachedEntry.metadata.provider : 'cache';
        const cachedModel = typeof cachedEntry.metadata.model === 'string' ? cachedEntry.metadata.model : 'cache';
        const outputHash = sha256Text(cachedText);

        const run = await withTransaction(async client => {
          const generationRun = await createAiGenerationRun(client, {
            userId: currentUser.id,
            schoolId: currentUser.schoolId,
            subscriptionId: subscription?.id ?? null,
            feature,
            promptVersion,
            provider: cachedProvider,
            model: cachedModel,
            status: 'completed',
            latencyMs: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCostUsdMicros: 0,
            estimatedCostKshCents: 0,
            cacheStatus: 'hit',
            cacheKey,
            promptHash,
            inputHash,
            outputHash
          });
          await createAiUsageEvent(client, {
            userId: currentUser.id,
            schoolId: currentUser.schoolId,
            subscriptionId: subscription?.id ?? null,
            feature,
            provider: cachedProvider,
            model: cachedModel,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCostUsdMicros: 0,
            fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
            estimatedCostKshCents: 0,
            promptVersion,
            status: 'completed'
          });
          return generationRun;
        });

        const generation: AiGenerationMetadata = {
          id: run.id,
          feature,
          promptVersion,
          schemaVersion,
          provider: cachedProvider,
          model: cachedModel,
          cacheStatus: 'hit',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs: 0
        };

        return {
          error: null,
          text: cachedText,
          subscription,
          generation
        };
      }
    }

    let executionPlans: AiExecutionPlan[];
    try {
      executionPlans = resolveAiExecutionPlans(effectiveBody);
    } catch (error) {
      args.reply.status(503);
      return {
        error: {
          message:
            error instanceof Error && error.message === 'No AI provider is configured'
              ? 'No AI provider is configured. Set KITABU_NVIDIA_API_KEY, KITABU_OPENAI_API_KEY, or another supported provider key on the API server.'
              : 'AI assistance is currently unavailable. Please try again later.'
        },
        text: null,
        subscription: subscriptionCheck.subscription
      };
    }
    const executionPlan = executionPlans[0];
    const existingSpend = subscription ? await getSubscriptionAiSpendKshCents(subscription.id) : 0;
    const provisionalTokenEstimate = Math.max(Math.ceil(stableJsonStringify(inputFingerprint).length / 4), 150);
    const provisionalCostUsdMicros = estimateCostUsdMicros(executionPlan, provisionalTokenEstimate, 0);
    const provisionalCostKshCents = usdMicrosToKshCents(provisionalCostUsdMicros, appConfig.KITABU_KSH_PER_USD);
    const budgetKshCents = subscription ? Number(subscription.price_ksh_cents) : Number.MAX_SAFE_INTEGER;
    const uncachedCacheStatus = cacheKey ? 'miss' : 'bypassed';

    if (subscription && existingSpend + provisionalCostKshCents > budgetKshCents) {
      await withTransaction(async client => {
        await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription.id,
          feature,
          promptVersion,
          provider: executionPlan.provider,
          model: executionPlan.model,
          status: 'blocked',
          latencyMs: 0,
          promptTokens: provisionalTokenEstimate,
          completionTokens: 0,
          totalTokens: provisionalTokenEstimate,
          estimatedCostUsdMicros: provisionalCostUsdMicros,
          estimatedCostKshCents: provisionalCostKshCents,
          cacheStatus: uncachedCacheStatus,
          cacheKey,
          promptHash,
          inputHash
        });
        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: executionPlan.provider,
          model: executionPlan.model,
          promptTokens: provisionalTokenEstimate,
          completionTokens: 0,
          totalTokens: provisionalTokenEstimate,
          estimatedCostUsdMicros: provisionalCostUsdMicros,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: provisionalCostKshCents,
          promptVersion,
          status: 'blocked'
        });
        await createAuditLog(client, currentUser.id, currentUser.schoolId, 'ai.limit.blocked', {
          feature,
          budgetKshCents,
          existingSpendKshCents: existingSpend
        });
      });

      args.reply.status(402);
      return {
        error: {
          message: 'AI usage limit reached for the current subscription period',
          showProPlan: true
        },
        text: null,
        subscription
      };
    }

    try {
      const startedAt = Date.now();
      const result = await generateTextWithFallback(effectiveBody, executionPlans);
      const completedPlan = result.plan ?? executionPlan;
      const latencyMs = Date.now() - startedAt;
      const costUsdMicros = estimateCostUsdMicros(completedPlan, result.promptTokens, result.completionTokens);
      const costKshCents = usdMicrosToKshCents(costUsdMicros, appConfig.KITABU_KSH_PER_USD);
      const outputHash = sha256Text(result.text);
      const attempts = result.attempts?.length
        ? result.attempts
        : [buildFallbackCompletedAttempt(completedPlan, result)];

      const run = await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: completedPlan.provider,
          model: completedPlan.model,
          status: 'completed',
          latencyMs,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
          estimatedCostUsdMicros: costUsdMicros,
          estimatedCostKshCents: costKshCents,
          cacheStatus: cacheKey ? 'stored' : 'bypassed',
          cacheKey,
          promptHash,
          inputHash,
          outputHash
        });

        let attemptNumber = 1;
        for (const attempt of attempts) {
          const attemptCostUsdMicros = estimateAttemptCostUsdMicros(attempt);
          await recordAiGenerationAttempt(client, {
            runId: generationRun.id,
            attemptNumber,
            provider: attempt.provider,
            model: attempt.model,
            status: attempt.status,
            latencyMs: attempt.latencyMs,
            promptTokens: attempt.promptTokens,
            completionTokens: attempt.completionTokens,
            totalTokens: attempt.totalTokens,
            estimatedCostUsdMicros: attemptCostUsdMicros,
            estimatedCostKshCents: usdMicrosToKshCents(attemptCostUsdMicros, appConfig.KITABU_KSH_PER_USD),
            errorSummary: attempt.errorMessage ?? null
          });
          attemptNumber += 1;
        }

        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: completedPlan.provider,
          model: completedPlan.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
          estimatedCostUsdMicros: costUsdMicros,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: costKshCents,
          promptVersion,
          status: 'completed'
        });

        if (cacheKey) {
          await setAiGenerationCacheEntry(client, {
            cacheKey,
            feature,
            promptVersion,
            schemaVersion,
            valueJson: parseJsonResponseForCache(result.text, effectiveBody.responseMimeType),
            valueText: result.text,
            metadata: {
              provider: completedPlan.provider,
              model: completedPlan.model,
              responseMimeType: effectiveBody.responseMimeType ?? null,
              promptHash,
              inputHash,
              outputHash,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              totalTokens: result.totalTokens
            },
            expiresAt: null
          });
        }

        return generationRun;
      });

      const generation: AiGenerationMetadata = {
        id: run.id,
        feature,
        promptVersion,
        schemaVersion,
        provider: completedPlan.provider,
        model: completedPlan.model,
        cacheStatus: cacheKey ? 'stored' : 'bypassed',
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        latencyMs
      };

      return {
        error: null,
        text: result.text,
        subscription,
        generation
      };
    } catch (error) {
      const attempts = getAiProviderAttempts(error);
      const failedLatencyMs = attempts.reduce((total, attempt) => total + attempt.latencyMs, 0);
      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: executionPlan.provider,
          model: executionPlan.model,
          status: 'failed',
          latencyMs: failedLatencyMs,
          promptTokens: provisionalTokenEstimate,
          completionTokens: 0,
          totalTokens: provisionalTokenEstimate,
          estimatedCostUsdMicros: provisionalCostUsdMicros,
          estimatedCostKshCents: provisionalCostKshCents,
          cacheStatus: uncachedCacheStatus,
          cacheKey,
          promptHash,
          inputHash
        });

        let attemptNumber = 1;
        for (const attempt of attempts) {
          const attemptCostUsdMicros = estimateAttemptCostUsdMicros(attempt);
          await recordAiGenerationAttempt(client, {
            runId: generationRun.id,
            attemptNumber,
            provider: attempt.provider,
            model: attempt.model,
            status: attempt.status,
            latencyMs: attempt.latencyMs,
            promptTokens: attempt.promptTokens,
            completionTokens: attempt.completionTokens,
            totalTokens: attempt.totalTokens,
            estimatedCostUsdMicros: attemptCostUsdMicros,
            estimatedCostKshCents: usdMicrosToKshCents(attemptCostUsdMicros, appConfig.KITABU_KSH_PER_USD),
            errorSummary: attempt.errorMessage ?? null
          });
          attemptNumber += 1;
        }

        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: executionPlan.provider,
          model: executionPlan.model,
          promptTokens: provisionalTokenEstimate,
          completionTokens: 0,
          totalTokens: provisionalTokenEstimate,
          estimatedCostUsdMicros: provisionalCostUsdMicros,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: provisionalCostKshCents,
          promptVersion,
          status: 'failed'
        });
      });

      args.request.log.error({ err: error }, 'AI generation failed');
      args.reply.status(500);
      return {
        error: {
          message: 'AI request failed',
          detail: truncateAiError(error)
        },
        text: null,
        subscription
      };
    }
  }

  async function runSubscriptionScopedAudioTranscription(args: {
    request: FastifyRequest;
    reply: FastifyReply;
    body: z.infer<typeof transcribeAudioSchema>;
  }) {
    const currentUser = args.request.user!;
    const subscriptionCheck = await requireActiveSubscriptionForAi(args.reply, currentUser);
    if (subscriptionCheck.error) {
      return {
        error: subscriptionCheck.error,
        text: null,
        subscription: null
      };
    }

    const subscription = subscriptionCheck.subscription;
    const feature = 'audio_transcription';
    const promptVersion = resolvePromptVersion(feature);
    const schemaVersion = getFeatureSchemaVersion(feature);
    const promptHash = hashStableJson({
      feature,
      promptVersion,
      schemaVersion,
      prompt: args.body.prompt ?? null
    });
    const inputHash = hashStableJson({
      mimeType: args.body.mimeType,
      fileName: args.body.fileName ?? null,
      language: args.body.language ?? null,
      prompt: args.body.prompt ?? null,
      audioHash: sha256Text(args.body.base64Audio),
      audioLength: args.body.base64Audio.length
    });
    let transcriptionPlans: AudioTranscriptionPlan[];
    try {
      transcriptionPlans = resolveAudioTranscriptionPlans();
    } catch (error) {
      args.reply.status(503);
      return {
        error: {
          message:
            error instanceof Error && error.message === 'No audio transcription provider is configured'
              ? 'No audio transcription provider is configured. Set KITABU_OPENAI_API_KEY or KITABU_GROQ_API_KEY on the API server.'
              : 'Audio transcription is currently unavailable. Please try again later.'
        },
        text: null,
        subscription
      };
    }
    const primaryPlan = transcriptionPlans[0];

    try {
      const startedAt = Date.now();
      const result = await transcribeAudio(args.body, transcriptionPlans);
      const latencyMs = Date.now() - startedAt;
      const outputHash = sha256Text(result.text);

      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: result.plan.provider,
          model: result.plan.model,
          status: 'completed',
          latencyMs,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          cacheStatus: 'bypassed',
          cacheKey: null,
          promptHash,
          inputHash,
          outputHash
        });
        await recordAiGenerationAttempt(client, {
          runId: generationRun.id,
          attemptNumber: 1,
          provider: result.plan.provider,
          model: result.plan.model,
          status: 'completed',
          latencyMs,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          errorSummary: null
        });
        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: result.plan.provider,
          model: result.plan.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: 0,
          promptVersion,
          status: 'completed'
        });
      });

      return {
        error: null,
        text: result.text,
        subscription
      };
    } catch (error) {
      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: primaryPlan.provider,
          model: primaryPlan.model,
          status: 'failed',
          latencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          cacheStatus: 'bypassed',
          cacheKey: null,
          promptHash,
          inputHash
        });
        await recordAiGenerationAttempt(client, {
          runId: generationRun.id,
          attemptNumber: 1,
          provider: primaryPlan.provider,
          model: primaryPlan.model,
          status: 'failed',
          latencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          errorSummary: truncateAiError(error)
        });
        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: primaryPlan.provider,
          model: primaryPlan.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsdMicros: 0,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: 0,
          promptVersion,
          status: 'failed'
        });
      });

      args.request.log.error({ err: error }, 'Audio transcription failed');
      args.reply.status(500);
      return {
        error: {
          message: 'Audio transcription failed'
        },
        text: null,
        subscription
      };
    }
  }

  async function runSubscriptionScopedSpeechSynthesis(args: {
    request: FastifyRequest;
    reply: FastifyReply;
    body: z.infer<typeof synthesizeSpeechSchema>;
  }) {
    const currentUser = args.request.user!;
    const subscriptionCheck = await requireActiveSubscriptionForAi(args.reply, currentUser);
    if (subscriptionCheck.error) {
      return {
        error: subscriptionCheck.error,
        audio: null,
        subscription: null
      };
    }

    const subscription = subscriptionCheck.subscription;
    const feature = 'speech_synthesis';
    const promptVersion = resolvePromptVersion(feature);
    const schemaVersion = getFeatureSchemaVersion(feature);
    const model = appConfig.KITABU_GROQ_TTS_ENGLISH_MODEL;
    const promptHash = hashStableJson({
      feature,
      promptVersion,
      schemaVersion,
      voice: args.body.voice ?? null
    });
    const inputHash = hashStableJson({
      textHash: sha256Text(args.body.text),
      textLength: args.body.text.length,
      voice: args.body.voice ?? null
    });

    try {
      const startedAt = Date.now();
      const result = await synthesizeSpeechWithGroq({
        text: args.body.text,
        voice: args.body.voice
      });
      const latencyMs = Date.now() - startedAt;
      const outputHash = sha256Text(result.base64Audio);

      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: 'groq',
          model: result.model,
          status: 'completed',
          latencyMs,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          cacheStatus: 'bypassed',
          cacheKey: null,
          promptHash,
          inputHash,
          outputHash
        });
        await recordAiGenerationAttempt(client, {
          runId: generationRun.id,
          attemptNumber: 1,
          provider: 'groq',
          model: result.model,
          status: 'completed',
          latencyMs,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          errorSummary: null
        });
        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: 'groq',
          model: result.model,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: 0,
          promptVersion,
          status: 'completed'
        });
      });

      return {
        error: null,
        audio: result,
        subscription
      };
    } catch (error) {
      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          promptVersion,
          provider: 'groq',
          model,
          status: 'failed',
          latencyMs: 0,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          cacheStatus: 'bypassed',
          cacheKey: null,
          promptHash,
          inputHash
        });
        await recordAiGenerationAttempt(client, {
          runId: generationRun.id,
          attemptNumber: 1,
          provider: 'groq',
          model,
          status: 'failed',
          latencyMs: 0,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          errorSummary: truncateAiError(error)
        });
        await createAiUsageEvent(client, {
          userId: currentUser.id,
          schoolId: currentUser.schoolId,
          subscriptionId: subscription?.id ?? null,
          feature,
          provider: 'groq',
          model,
          promptTokens: args.body.text.length,
          completionTokens: 0,
          totalTokens: args.body.text.length,
          estimatedCostUsdMicros: 0,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: 0,
          promptVersion,
          status: 'failed'
        });
      });

      args.request.log.error({ err: error }, 'Speech synthesis failed');
      args.reply.status(500);
      return {
        error: {
          message: 'Speech synthesis failed'
        },
        audio: null,
        subscription
      };
    }
  }

  async function confirmEmailVerificationToken(rawToken: string, reply: FastifyReply) {
    const tokenHash = hashOpaqueToken(rawToken);
    const verificationToken = await findActiveEmailVerificationToken(tokenHash);

    if (!verificationToken || verificationToken.used_at || verificationToken.expires_at < new Date()) {
      reply.code(400);
      return {
        ok: false as const,
        message: 'This verification link is invalid or has expired'
      };
    }

    const user = await findUserById(verificationToken.user_id);
    if (!user) {
      reply.code(400);
      return {
        ok: false as const,
        message: 'This verification link is invalid or has expired'
      };
    }

    await withTransaction(async client => {
      await markUserEmailVerified(client, user.id);
      await consumeEmailVerificationToken(client, tokenHash);
      await invalidateEmailVerificationTokensForUser(client, user.id);
      await createAuditLog(client, user.id, user.schoolId, 'auth.email_verification.completed');
    });

    return {
      ok: true as const,
      user
    };
  }

  const schoolOnboardingSchema = z.object({
    schoolName: z.string().trim().min(2).max(200),
    country: z.enum(['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia']),
    county: z.string().trim().max(80).optional(),
    schoolLevel: z.enum(['junior', 'senior', 'junior_and_senior']),
    boardingType: z.enum(['day', 'boarding', 'day_and_boarding']),
    studentCount: z.coerce.number().int().min(1).max(100000),
    contactPhone: z.string().trim().min(7).max(20),
    contactEmail: z.string().trim().max(160).email().optional().or(z.literal('')),
    source: z.string().trim().max(60).optional()
  });

  // Public lead-capture endpoint for the marketing site (kitabu.ai/schools/demo).
  app.post(
    '/public/school-onboarding',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = schoolOnboardingSchema.parse(request.body);
      const county = body.county?.length ? body.county : null;
      const contactEmail = body.contactEmail?.length ? body.contactEmail : null;

      const record = await withTransaction(async client => {
        const created = await createSchoolOnboardingRequest(client, {
          schoolName: body.schoolName,
          country: body.country,
          county,
          schoolLevel: body.schoolLevel,
          boardingType: body.boardingType,
          studentCount: body.studentCount,
          contactPhone: body.contactPhone,
          contactEmail,
          source: body.source?.length ? body.source : 'website'
        });
        await createAuditLog(client, null, null, 'school.onboarding.requested', {
          requestId: created.id,
          country: body.country,
          studentCount: body.studentCount
        });
        return created;
      });

      const levelLabel = {
        junior: 'Junior school',
        senior: 'Senior school',
        junior_and_senior: 'Junior & senior school'
      }[body.schoolLevel];
      const boardingLabel = {
        day: 'Day',
        boarding: 'Boarding',
        day_and_boarding: 'Day & boarding'
      }[body.boardingType];
      const detailPairs: Array<[string, string]> = [
        ['School', body.schoolName],
        ['Country', body.country],
        ['County / region', county ?? '—'],
        ['Level', levelLabel],
        ['Type', boardingLabel],
        ['Students', String(body.studentCount)],
        ['Phone / WhatsApp', body.contactPhone],
        ['Email', contactEmail ?? '—'],
        ['Request ID', record.id]
      ];
      const emailDelivered = await sendTransactionalEmail({
        to: appConfig.KITABU_SCHOOL_LEADS_EMAIL,
        subject: `New school onboarding request: ${body.schoolName} (${body.country})`,
        text: detailPairs.map(([label, value]) => `${label}: ${value}`).join('\n'),
        html: `
          <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#0f172a">
            <h2 style="margin:0 0 16px">New school onboarding request</h2>
            <table style="border-collapse:collapse">
              ${detailPairs
                .map(
                  ([label, value]) =>
                    `<tr><td style="padding:4px 16px 4px 0;font-weight:700">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`
                )
                .join('')}
            </table>
            <p style="margin-top:20px">Same-day follow-up SLA: call the school today.</p>
          </div>
        `
      });
      if (emailDelivered) {
        await withTransaction(client => markSchoolOnboardingEmailDelivered(client, record.id));
      } else {
        request.log.warn({ requestId: record.id }, 'school onboarding email delivery failed');
      }

      reply.code(201);
      return { ok: true as const, requestId: record.id };
    }
  );

  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await findUserByEmail(body.email);

    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      await withTransaction(client => createAuditLog(client, null, null, 'auth.login.failed', { email: body.email }));
      return reply.unauthorized('Invalid credentials');
    }

    if (user.status !== 'active') {
      await withTransaction(client => createAuditLog(client, user.id, user.school_id, 'auth.login.blocked', {
        reason: 'inactive_account'
      }));
      return reply.unauthorized('Account is not active');
    }

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + appConfig.KITABU_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const sessionContext = getSessionContext(request);
    const sessionId = randomBytes(16).toString('hex');

    await withTransaction(async client => {
      await insertRefreshToken(client, user.id, refreshTokenHash, refreshExpiresAt, {
        sessionId,
        sessionBindingHash: sessionContext.sessionBindingHash,
        deviceLabel: sessionContext.deviceLabel
      });
      await createAuditLog(client, user.id, user.school_id, 'auth.login.succeeded');
    });

    const totpEnabled = await getUserTotpStatus(user.id);
    const shouldBypassStepUp =
      appConfig.KITABU_NODE_ENV !== 'production' &&
      !totpEnabled &&
      user.roles.some(role => role === 'platform_admin');

      const accessToken = await signAccessToken({
        sub: user.id,
        schoolId: user.school_id,
        sid: sessionId,
        email: user.email,
        phoneNumber: user.phone_number,
        phoneVerified: user.phone_verified,
        fullName: user.full_name,
        emailVerified: user.email_verified,
        roles: user.roles,
        gender: user.gender,
        grade: user.grade_level,
        countryCode: user.country_code,
        curriculumCode: user.curriculum_code,
        onboardingCompleted: user.onboarding_completed,
        stepUp: shouldBypassStepUp,
        mustRotatePassword: user.must_rotate_password,
        isBreakGlass: user.is_break_glass
      });

    return buildAuthResponse({ user, accessToken, refreshToken, totpEnabled, sessionId });
  });

  app.post('/auth/phone/request', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = phoneAuthRequestSchema.parse(request.body);
    let phoneNumber: string;
    try {
      phoneNumber = formatKenyanPhoneNumber(body.phoneNumber);
    } catch {
      return reply.badRequest('Enter a valid Kenyan mobile number');
    }

    const existingUser = await findUserByPhone(phoneNumber);
    if (body.purpose === 'signup' && existingUser) {
      return reply.conflict('An account with that phone number already exists. Sign in instead.');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const eligibleForDelivery = body.purpose === 'signup' || Boolean(existingUser?.phone_verified);
    if (eligibleForDelivery && appConfig.KITABU_NODE_ENV === 'production' && !isSmsConfigured()) {
      return reply.serviceUnavailable('Phone verification is temporarily unavailable');
    }
    const passwordHash = body.purpose === 'signup'
      ? await hashPassword(randomBytes(32).toString('base64url'))
      : undefined;

    await createPhoneVerificationCode({
      phoneNumber,
      purpose: body.purpose,
      codeHash: hashOpaqueToken(code),
      role: body.purpose === 'signup' ? body.role : undefined,
      fullName: body.purpose === 'signup' ? body.fullName : undefined,
      email: body.purpose === 'signup' ? `phone-${phoneNumber}@accounts.kitabu.invalid` : undefined,
      passwordHash,
      acceptedTerms: body.purpose === 'signup' ? body.acceptedTerms : undefined,
      expiresAt: new Date(Date.now() + appConfig.KITABU_PHONE_VERIFICATION_TTL_MINUTES * 60 * 1000)
    });

    if (eligibleForDelivery && appConfig.KITABU_NODE_ENV === 'production') {
      try {
        await sendSmsMessage({
          to: `+${phoneNumber}`,
          message: `Your Kitabu AI verification code is ${code}. It expires in ${appConfig.KITABU_PHONE_VERIFICATION_TTL_MINUTES} minutes.`
        });
      } catch (error) {
        const verification = await findActivePhoneVerificationCode(phoneNumber, body.purpose);
        if (verification) {
          await consumePhoneVerificationCode(verification.id);
        }
        request.log.error({ error }, 'Phone verification SMS delivery failed');
        return reply.serviceUnavailable('Phone verification is temporarily unavailable');
      }
    }

    await withTransaction(client => createAuditLog(
      client,
      existingUser?.id ?? null,
      existingUser?.school_id ?? null,
      'auth.phone_verification.requested',
      { purpose: body.purpose, delivered: eligibleForDelivery }
    ));

    return {
      message: 'If the phone number is eligible, a verification code has been sent.',
      expiresInSeconds: appConfig.KITABU_PHONE_VERIFICATION_TTL_MINUTES * 60,
      ...(appConfig.KITABU_NODE_ENV !== 'production' && eligibleForDelivery
        ? { developmentCode: code }
        : {})
    };
  });

  app.post('/auth/phone/verify', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = phoneAuthVerifySchema.parse(request.body);
    let phoneNumber: string;
    try {
      phoneNumber = formatKenyanPhoneNumber(body.phoneNumber);
    } catch {
      return reply.badRequest('Invalid or expired verification code');
    }

    const verification = await findActivePhoneVerificationCode(phoneNumber, body.purpose);
    const suppliedHash = hashOpaqueToken(body.code);
    const codeMatches = verification
      ? timingSafeEqual(Buffer.from(verification.code_hash, 'hex'), Buffer.from(suppliedHash, 'hex'))
      : false;
    if (!verification || verification.attempts >= 5 || !codeMatches) {
      if (verification) {
        await recordPhoneVerificationFailure(verification.id);
      }
      return reply.badRequest('Invalid or expired verification code');
    }

    let user = await findUserByPhone(phoneNumber);
    let signupDetails: {
      fullName: string;
      email: string;
      passwordHash: string;
      role: 'student' | 'teacher' | 'parent';
    } | null = null;
    if (body.purpose === 'login') {
      if (!user?.phone_verified) {
        await consumePhoneVerificationCode(verification.id);
        return reply.badRequest('Invalid or expired verification code');
      }
    } else {
      if (user) {
        return reply.conflict('An account with that phone number already exists. Sign in instead.');
      }
      if (
        !verification.full_name ||
        !verification.role ||
        !verification.email ||
        !verification.password_hash ||
        !verification.accepted_terms
      ) {
        return reply.badRequest('Invalid or expired verification code');
      }
      signupDetails = {
        fullName: verification.full_name,
        email: verification.email,
        passwordHash: verification.password_hash,
        role: verification.role
      };
    }

    if (!(await consumePhoneVerificationCode(verification.id))) {
      return reply.badRequest('Invalid or expired verification code');
    }

    if (body.purpose === 'signup') {
      if (!signupDetails) {
        return reply.badRequest('Invalid or expired verification code');
      }
      await createSelfServiceUser({
        schoolId: null,
        email: signupDetails.email,
        phoneNumber,
        phoneVerified: true,
        passwordHash: signupDetails.passwordHash,
        fullName: signupDetails.fullName,
        role: signupDetails.role,
        onboardingCompleted: signupDetails.role !== 'student',
        termsAcceptedAt: new Date(),
        termsVersion: appConfig.KITABU_TERMS_VERSION,
        privacyVersion: appConfig.KITABU_PRIVACY_VERSION
      });
      user = await findUserByPhone(phoneNumber);
    }

    if (!user) {
      return reply.badRequest('Invalid or expired verification code');
    }

    return issueAuthSession(request, reply, user, `auth.phone.${body.purpose}.succeeded`);
  });

  app.post('/auth/google', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (request, reply) => {
    const body = googleAuthSchema.parse(request.body);
    if (!options.googleTokenVerifier && getGoogleClientIds().length === 0) {
      return reply.serviceUnavailable('Google authentication is not configured');
    }

    let identity: Awaited<ReturnType<typeof verifyGoogleIdToken>>;
    try {
      identity = await googleTokenVerifier(body.idToken);
    } catch (error) {
      request.log.warn({ error }, 'Google ID token verification failed');
      return reply.unauthorized('Google authentication failed');
    }

    let user = await findUserByAuthIdentity('google', identity.subject);
    if (!user) {
      user = await findUserByEmail(identity.email);
      if (!user) {
        if (!body.role || body.acceptedTerms !== true) {
          return reply.badRequest('Choose an account role and accept the Terms and Privacy Policy to create an account.');
        }
        await createSelfServiceUser({
          schoolId: null,
          email: identity.email,
          passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
          fullName: identity.fullName,
          role: body.role,
          onboardingCompleted: body.role !== 'student',
          termsAcceptedAt: new Date(),
          termsVersion: appConfig.KITABU_TERMS_VERSION,
          privacyVersion: appConfig.KITABU_PRIVACY_VERSION
        });
        user = await findUserByEmail(identity.email);
      }

      if (!user) {
        throw new Error('Unable to create Google account');
      }

      const existingGoogleIdentity = await findUserAuthIdentityForProvider(user.id, 'google');
      if (
        existingGoogleIdentity &&
        existingGoogleIdentity.provider_subject !== identity.subject
      ) {
        await withTransaction(client => createAuditLog(
          client,
          user!.id,
          user!.school_id,
          'auth.google.identity_link_conflict'
        ));
        return reply.conflict('This account is already linked to a different Google account.');
      }

      await withTransaction(async client => {
        await linkUserAuthIdentity(client, {
          userId: user!.id,
          provider: 'google',
          providerSubject: identity.subject,
          providerEmail: identity.email
        });
        if (!user!.email_verified) {
          await markUserEmailVerified(client, user!.id);
        }
        await createAuditLog(client, user!.id, user!.school_id, 'auth.google.identity_linked');
      });
      user = await findUserByEmail(identity.email);
    }

    if (!user) {
      throw new Error('Unable to load Google account');
    }
    return issueAuthSession(request, reply, user, 'auth.google.login.succeeded');
  });

  app.post('/auth/signup', { config: { rateLimit: { max: 15, timeWindow: '5 minutes' } } }, async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const existingUser = await findUserByEmail(body.email);
    if (existingUser) {
      return reply.conflict('An account with that email already exists');
    }

    const passwordHash = await hashPassword(body.password);
      const user = await createSelfServiceUser({
        schoolId: body.schoolId ?? null,
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        role: body.role,
        gender: body.gender,
        grade: body.grade ?? null,
        onboardingCompleted: body.onboardingCompleted ?? body.role !== 'student',
        termsAcceptedAt: new Date(),
        termsVersion: appConfig.KITABU_TERMS_VERSION,
        privacyVersion: appConfig.KITABU_PRIVACY_VERSION
      });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashOpaqueToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + appConfig.KITABU_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const sessionContext = getSessionContext(request);
    const sessionId = randomBytes(16).toString('hex');

    await withTransaction(async client => {
      await insertRefreshToken(client, user.id, refreshTokenHash, refreshExpiresAt, {
        sessionId,
        sessionBindingHash: sessionContext.sessionBindingHash,
        deviceLabel: sessionContext.deviceLabel
      });
      if (body.mpesaPhoneNumber) {
        await upsertBillingProfile(client, user.id, formatKenyanPhoneNumber(body.mpesaPhoneNumber));
      }
    });

      const accessToken = await signAccessToken({
        sub: user.id,
        schoolId: user.schoolId,
        sid: sessionId,
        email: user.email,
        phoneNumber: user.phoneNumber ?? null,
        phoneVerified: user.phoneVerified,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        roles: user.roles,
        gender: user.gender,
        grade: user.grade ?? null,
        countryCode: user.countryCode ?? 'KEN',
        curriculumCode: user.curriculumCode ?? 'CBC',
        onboardingCompleted: user.onboardingCompleted,
        stepUp: false,
        mustRotatePassword: false,
        isBreakGlass: false
      });

    const rawVerificationToken = randomBytes(32).toString('hex');
    const verificationTokenHash = hashOpaqueToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + appConfig.KITABU_EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
    const verificationUrl = `${appConfig.KITABU_EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(rawVerificationToken)}`;

    await withTransaction(async client => {
      await invalidateEmailVerificationTokensForUser(client, user.id);
      await insertEmailVerificationToken(client, user.id, verificationTokenHash, verificationExpiresAt);
      await createAuditLog(client, user.id, user.schoolId, 'auth.email_verification.requested', {
        email: user.email
      });
    });

    const delivered = await emailSender(
      buildEmailVerificationEmail({
        recipientEmail: user.email,
        verificationUrl,
        ttlMinutes: appConfig.KITABU_EMAIL_VERIFICATION_TTL_MINUTES
      })
    );

    if (!delivered) {
      app.log.warn(
        {
          userId: user.id
        },
        'Verification email not sent because SMTP is not configured'
      );
    }

    return reply.status(201).send(buildAuthResponse({ user, accessToken, refreshToken, totpEnabled: false, sessionId }));
  });

  app.post('/auth/email-verification/resend', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    const body = verificationEmailSchema.parse(request.body);
    const user = await findUserByEmail(body.email);

    if (user && !user.email_verified) {
      const rawVerificationToken = randomBytes(32).toString('hex');
      const verificationTokenHash = hashOpaqueToken(rawVerificationToken);
      const verificationExpiresAt = new Date(Date.now() + appConfig.KITABU_EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
      const verificationUrl = `${appConfig.KITABU_EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(rawVerificationToken)}`;

      await withTransaction(async client => {
        await invalidateEmailVerificationTokensForUser(client, user.id);
        await insertEmailVerificationToken(client, user.id, verificationTokenHash, verificationExpiresAt);
        await createAuditLog(client, user.id, user.school_id, 'auth.email_verification.requested', {
          email: user.email,
          reason: 'resend'
        });
      });

      const delivered = await emailSender(
        buildEmailVerificationEmail({
          recipientEmail: user.email,
          verificationUrl,
          ttlMinutes: appConfig.KITABU_EMAIL_VERIFICATION_TTL_MINUTES
        })
      );

      if (!delivered) {
        app.log.warn(
          {
            userId: user.id
          },
          'Verification email not sent because SMTP is not configured'
        );
      }
    } else {
      await withTransaction(async client => {
        await createAuditLog(client, user?.id ?? null, user?.school_id ?? null, 'auth.email_verification.requested.ignored', {
          email: body.email.toLowerCase()
        });
      });
    }

    return {
      message: 'If an unverified account exists for that email, a verification email will be sent.'
    };
  });

  app.get('/config/legal', async () => {
    return {
      termsOfServiceUrl: appConfig.KITABU_TERMS_OF_SERVICE_URL,
      privacyPolicyUrl: appConfig.KITABU_PRIVACY_POLICY_URL,
      termsVersion: appConfig.KITABU_TERMS_VERSION,
      privacyVersion: appConfig.KITABU_PRIVACY_VERSION
    };
  });

  app.get('/config/features', async () => {
    return {
      flags: await listFeatureFlags()
    };
  });

  app.post('/auth/email-verification/confirm', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = completeEmailVerificationSchema.parse(request.body);
    const result = await confirmEmailVerificationToken(body.token, reply);
    if (!result.ok) {
      return { message: result.message };
    }

    return {
      message: 'Email verified. You can continue using Kitabu AI.'
    };
  });

  app.get('/verify-email', async (request, reply) => {
    const query = tokenQuerySchema.safeParse(request.query);
    if (!query.success) {
      return sendHandoffPage(reply, {
        title: 'Verification failed',
        message: 'This verification link is missing or invalid.',
        status: 'error'
      });
    }

    const result = await confirmEmailVerificationToken(query.data.token, reply);
    if (!result.ok) {
      return sendHandoffPage(reply, {
        title: 'Verification failed',
        message: result.message,
        status: 'error'
      });
    }

    return sendHandoffPage(reply, {
      title: 'Email verified',
      message: 'Your email is confirmed. Opening the Kitabu AI login screen now.',
      detail: 'If the app is installed, we will hand you back to Kitabu AI. Otherwise open the app and sign in with your email and password.',
      status: 'success',
      deepLink: getDeepLink('email-verified', {
        email: result.user.email,
        mode: 'login'
      }),
      buttonLabel: 'Open Kitabu AI Login'
    });
  });

  app.get('/reset-password', async (request, reply) => {
    const query = tokenQuerySchema.safeParse(request.query);
    if (!query.success) {
      return sendHandoffPage(reply, {
        title: 'Reset link unavailable',
        message: 'This password reset link is missing or invalid.',
        detail: 'Request a new password reset from the Kitabu AI app, then open the latest email link.',
        status: 'error'
      });
    }

    const token = query.success ? query.data.token : '';
    const bodyHtml = (nonce: string) => `
      <form id="reset-form">
        <label for="new-password">New password</label>
        <input id="new-password" name="new-password" type="password" minlength="10" required />
        <button type="submit">Update password</button>
        <p id="status"></p>
      </form>
      <script nonce="${nonce}">
        const form = document.getElementById('reset-form');
        const status = document.getElementById('status');
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          status.textContent = 'Updating password...';
          const response = await fetch('/auth/password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: ${JSON.stringify(token)},
              newPassword: document.getElementById('new-password').value
            })
          });
          let payload = {};
          try {
            payload = await response.json();
          } catch {
            payload = {};
          }
          if (!response.ok) {
            status.textContent = payload.message || 'Password reset failed';
            status.className = 'error';
            return;
          }
          status.textContent = payload.message || 'Password updated. Opening Kitabu App.';
          status.className = 'success';
          setTimeout(() => { window.location.href = ${JSON.stringify(getDeepLink('password-reset-complete'))}; }, 250);
        });
      </script>`;

    return sendHandoffPage(reply, {
      title: 'Reset your password',
      message: 'Choose a new password to finish account recovery.',
      detail: 'After reset, Kitabu App will reopen so you can sign in again.',
      status: query.success ? 'success' : 'error',
      bodyHtml
    });
  });

  app.get('/.well-known/assetlinks.json', async (_request, reply) => {
    const fingerprints = appConfig.KITABU_ANDROID_SHA256_CERT_FINGERPRINTS
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    return reply.send([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: appConfig.KITABU_ANDROID_PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints
        }
      }
    ]);
  });

  app.post('/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request) => {
    const body = forgotPasswordSchema.parse(request.body);
    const user = await findUserByEmail(body.email);

    if (user) {
      const rawResetToken = randomBytes(32).toString('hex');
      const tokenHash = hashOpaqueToken(rawResetToken);
      const resetExpiresAt = new Date(Date.now() + appConfig.KITABU_PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
      const resetUrl = `${appConfig.KITABU_PASSWORD_RESET_URL}?token=${encodeURIComponent(rawResetToken)}`;

      await withTransaction(async client => {
        await invalidatePasswordResetTokensForUser(client, user.id);
        await insertPasswordResetToken(client, user.id, tokenHash, resetExpiresAt);
        await createAuditLog(client, user.id, user.school_id, 'auth.password.reset.requested', {
          email: body.email.toLowerCase()
        });
      });

      const delivered = await emailSender(
        buildPasswordResetEmail({
          recipientEmail: user.email,
          resetUrl,
          ttlMinutes: appConfig.KITABU_PASSWORD_RESET_TTL_MINUTES
        })
      );

      if (!delivered) {
        app.log.warn(
          {
            userId: user.id
          },
          'Password reset email not sent because SMTP is not configured'
        );
      }
    } else {
      await withTransaction(async client => {
        await createAuditLog(client, null, null, 'auth.password.reset.requested.unknown', {
          email: body.email.toLowerCase()
        });
      });
    }

    return {
      message: 'If an account exists for that email, password reset help will be sent.'
    };
  });

  app.post('/auth/password/reset', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const body = completePasswordResetSchema.parse(request.body);
    const tokenHash = hashOpaqueToken(body.token);
    const resetToken = await findActivePasswordResetToken(tokenHash);

    if (!resetToken || resetToken.used_at || resetToken.expires_at < new Date()) {
      return reply.badRequest('This password reset link is invalid or has expired');
    }

    const user = await findUserById(resetToken.user_id);
    if (!user) {
      return reply.badRequest('This password reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(body.newPassword);
    await withTransaction(async client => {
      await updateUserPassword(client, user.id, passwordHash);
      await consumePasswordResetToken(client, tokenHash);
      await invalidatePasswordResetTokensForUser(client, user.id);
      await revokeAllRefreshTokensForUser(client, user.id);
      await createAuditLog(client, user.id, user.schoolId, 'auth.password.reset.completed');
    });

    return {
      message: 'Password updated. You can now sign in with your new password.'
    };
  });

  app.post('/auth/refresh', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_REFRESH_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_REFRESH_RATE_LIMIT_WINDOW
      }
    }
  }, async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokenHash = hashOpaqueToken(body.refreshToken);
    const currentToken = await findActiveRefreshToken(tokenHash);
    if (!currentToken || currentToken.revoked_at || currentToken.expires_at < new Date()) {
      return reply.unauthorized('Refresh token is invalid');
    }

    const user = await findUserById(currentToken.user_id);
    if (!user) {
      return reply.unauthorized('User not found');
    }
    if (user.status !== 'active') {
      await withTransaction(async client => {
        await revokeRefreshTokensForSession(client, currentToken.user_id, currentToken.session_id);
        await createAuditLog(client, user.id, user.schoolId, 'auth.refresh.blocked', {
          reason: 'inactive_account',
          sessionId: currentToken.session_id
        });
      });
      return reply.unauthorized('Account is not active');
    }

    const sessionContext = getSessionContext(request);
    if (currentToken.session_binding_hash !== sessionContext.sessionBindingHash) {
      await withTransaction(async client => {
        await revokeRefreshTokensForSession(client, currentToken.user_id, currentToken.session_id);
        await createAuditLog(client, user.id, user.schoolId, 'auth.refresh.binding_mismatch', {
          sessionId: currentToken.session_id,
          deviceLabel: currentToken.device_label
        });
      });
      return reply.unauthorized('Refresh token is not valid for this session');
    }

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshTokenHash = hashOpaqueToken(nextRefreshToken);
    const nextRefreshExpiresAt = new Date(Date.now() + appConfig.KITABU_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await withTransaction(async client => {
      const nextTokenId = await insertRefreshToken(client, user.id, nextRefreshTokenHash, nextRefreshExpiresAt, {
        replacedByTokenId: currentToken.id,
        sessionId: currentToken.session_id,
        sessionBindingHash: currentToken.session_binding_hash,
        deviceLabel: currentToken.device_label
      });
      await revokeRefreshToken(client, tokenHash, nextTokenId);
      await createAuditLog(client, user.id, user.schoolId, 'auth.refresh.succeeded');
    });

      const accessToken = await signAccessToken({
        sub: user.id,
        schoolId: user.schoolId,
        sid: currentToken.session_id,
        email: user.email,
        phoneNumber: user.phoneNumber ?? null,
        phoneVerified: user.phoneVerified,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        roles: user.roles,
        gender: user.gender,
        grade: user.grade ?? null,
        countryCode: user.countryCode ?? 'KEN',
        curriculumCode: user.curriculumCode ?? 'CBC',
        onboardingCompleted: user.onboardingCompleted,
        stepUp: false,
        mustRotatePassword: user.mustRotatePassword,
        isBreakGlass: user.isBreakGlass
      });

    return buildAuthResponse({
      user,
      accessToken,
      refreshToken: nextRefreshToken,
      totpEnabled: await getUserTotpStatus(user.id),
      sessionId: currentToken.session_id
    });
  });

  app.post('/auth/password/rotate', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    const currentUser = request.user!;

    const body = rotatePasswordSchema.parse(request.body);
    const user = await findUserByEmail(currentUser.email);
    if (!user || !(await verifyPassword(body.currentPassword, user.password_hash))) {
      return reply.unauthorized('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(body.newPassword);
    await withTransaction(async client => {
      await updateUserPassword(client, currentUser.id, newPasswordHash);
      await createAuditLog(client, currentUser.id, currentUser.schoolId, 'auth.password.rotated');
    });

    const refreshedUser = await findUserById(currentUser.id);
    if (!refreshedUser) {
      return reply.notFound('User not found');
    }

      const accessToken = await signAccessToken({
        sub: refreshedUser.id,
        schoolId: refreshedUser.schoolId,
        sid: currentUser.sessionId ?? undefined,
        email: refreshedUser.email,
        phoneNumber: refreshedUser.phoneNumber ?? null,
        phoneVerified: refreshedUser.phoneVerified,
        fullName: refreshedUser.fullName,
        emailVerified: refreshedUser.emailVerified,
        roles: refreshedUser.roles,
        gender: refreshedUser.gender,
        grade: refreshedUser.grade ?? null,
        countryCode: refreshedUser.countryCode ?? 'KEN',
        curriculumCode: refreshedUser.curriculumCode ?? 'CBC',
        onboardingCompleted: refreshedUser.onboardingCompleted,
        stepUp: refreshedUser.stepUp,
        mustRotatePassword: false,
        isBreakGlass: refreshedUser.isBreakGlass
      });

    return {
      accessToken,
      authState: {
        mustRotatePassword: false,
        requiresPlatformTotp:
          appConfig.KITABU_NODE_ENV === 'production' &&
          refreshedUser.roles.includes('platform_admin') &&
          !(await getUserTotpStatus(refreshedUser.id)),
        isBreakGlass: Boolean(refreshedUser.isBreakGlass)
      }
    };
  });

  app.post('/auth/totp/setup/begin', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const secret = generateTotpSecret();
    const otpauthUrl = buildTotpUri(request.user!.email, secret);

    await withTransaction(async client => {
      await upsertTotpSecret(client, request.user!.id, secret, false);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'auth.totp.setup.started');
    });

    return {
      secret,
      otpauthUrl
    };
  });

  app.post('/auth/totp/setup/confirm', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = totpSchema.parse(request.body);
    const credential = await getTotpSecret(request.user!.id);
    if (!credential) {
      return reply.badRequest('TOTP setup has not been started');
    }
    if (!verifyTotpToken(credential.secret, body.token)) {
      return reply.unauthorized('Invalid TOTP token');
    }

    await withTransaction(async client => {
      await enableTotp(client, request.user!.id);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'auth.totp.setup.completed');
    });

    const refreshedUser = await findUserById(request.user!.id);
    if (!refreshedUser) {
      return reply.notFound('User not found');
    }

      const accessToken = await signAccessToken({
        sub: refreshedUser.id,
        schoolId: refreshedUser.schoolId,
        sid: request.user!.sessionId ?? undefined,
        email: refreshedUser.email,
        phoneNumber: refreshedUser.phoneNumber ?? null,
        phoneVerified: refreshedUser.phoneVerified,
        fullName: refreshedUser.fullName,
        emailVerified: refreshedUser.emailVerified,
        roles: refreshedUser.roles,
        gender: refreshedUser.gender,
        grade: refreshedUser.grade ?? null,
        countryCode: refreshedUser.countryCode ?? 'KEN',
        curriculumCode: refreshedUser.curriculumCode ?? 'CBC',
        onboardingCompleted: refreshedUser.onboardingCompleted,
        stepUp: true,
        mustRotatePassword: refreshedUser.mustRotatePassword,
        isBreakGlass: refreshedUser.isBreakGlass
      });

    return {
      accessToken,
      authState: {
        mustRotatePassword:
          appConfig.KITABU_NODE_ENV === 'production' ? Boolean(refreshedUser.mustRotatePassword) : false,
        requiresPlatformTotp: false,
        isBreakGlass: Boolean(refreshedUser.isBreakGlass)
      }
    };
  });

  app.post('/auth/step-up/totp', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    const currentUser = request.user!;
    if (!currentUser.roles.includes('platform_admin')) {
      return reply.forbidden('TOTP step-up is only required for platform admins');
    }

    const body = totpSchema.parse(request.body);
    const credential = await getTotpSecret(currentUser.id);
    if (!credential?.enabled) {
      return reply.forbidden('TOTP is not enabled for this user');
    }
    if (!verifyTotpToken(credential.secret, body.token)) {
      await withTransaction(client => createAuditLog(client, currentUser.id, currentUser.schoolId, 'auth.step_up.failed'));
      return reply.unauthorized('Invalid TOTP token');
    }

      const accessToken = await signAccessToken({
        sub: currentUser.id,
        schoolId: currentUser.schoolId,
        sid: currentUser.sessionId ?? undefined,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber ?? null,
        phoneVerified: currentUser.phoneVerified,
        fullName: currentUser.fullName,
        emailVerified: currentUser.emailVerified,
        roles: currentUser.roles,
        gender: currentUser.gender,
        grade: currentUser.grade ?? null,
        countryCode: currentUser.countryCode ?? 'KEN',
        curriculumCode: currentUser.curriculumCode ?? 'CBC',
        onboardingCompleted: currentUser.onboardingCompleted,
        stepUp: true,
        mustRotatePassword: currentUser.mustRotatePassword,
        isBreakGlass: currentUser.isBreakGlass
      });

    await withTransaction(client => createAuditLog(client, currentUser.id, currentUser.schoolId, 'auth.step_up.succeeded'));

    return {
      accessToken,
      expiresInSeconds: appConfig.KITABU_STEP_UP_TTL_SECONDS
    };
  });

  app.get('/curriculum', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const query = curriculumQuerySchema.parse(request.query);
    const subjects = await listCurriculumForGrade(query.grade, request.user!.id);
    return {
      grade: query.grade,
      subjects: query.subjectId
        ? subjects.filter(subject => subject.subjectId === query.subjectId)
      : subjects
    };
  });

  app.post('/analytics/subject-engagement', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = subjectEngagementSchema.parse(request.body);
    await withTransaction(client => createSubjectEngagementEvent(client, {
      userId: request.user!.id,
      schoolId: request.user!.schoolId,
      grade: body.grade,
      subjectId: body.subjectId,
      subjectName: body.subjectName,
      feature: body.feature,
      eventType: body.eventType,
      durationSeconds: body.durationSeconds,
      metadata: body.metadata
    }));

    return { accepted: true };
  });

  app.put('/curriculum/subjects/:subjectId', async (request, reply) => {
    const authError = await requireRoles(request, reply, ['school_admin', 'platform_admin']);
    if (authError) {
      return;
    }

    const params = curriculumSubjectParamsSchema.parse(request.params);
    const body = curriculumReplaceSchema.parse(request.body);

    await withTransaction(async client => {
      await replaceCurriculumSubject(client, {
        actorUserId: request.user!.id,
        grade: body.grade,
        subjectId: params.subjectId,
        subjectName: body.subjectName,
        strands: body.strands
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'curriculum.subject.replaced', {
        grade: body.grade,
        subjectId: params.subjectId,
        strandCount: body.strands.length
      });
    });

    const subjects = await listCurriculumForGrade(body.grade, request.user!.id);
    return {
      grade: body.grade,
      subjects: subjects.filter(subject => subject.subjectId === params.subjectId)
    };
  });

  app.post('/curriculum/subjects', async (request, reply) => {
    const authError = await requireRoles(request, reply, ['school_admin', 'platform_admin']);
    if (authError) {
      return;
    }

    const body = curriculumCreateSubjectSchema.parse(request.body);
    const subjectId = subjectIdFromName(body.subjectName);
    if (!subjectId) {
      reply.status(422);
      return {
        message: 'Subject name must include letters or numbers.'
      };
    }
    let created = false;

    await withTransaction(async client => {
      created = await createEmptyCurriculumSubject(client, {
        actorUserId: request.user!.id,
        grade: body.grade,
        subjectId,
        subjectName: body.subjectName
      });

      if (created) {
        await createAuditLog(client, request.user!.id, request.user!.schoolId, 'curriculum.subject.created', {
          grade: body.grade,
          subjectId,
          subjectName: body.subjectName
        });
      }
    });

    if (!created) {
      reply.status(409);
      return {
        message: `${body.subjectName} already exists for ${body.grade}.`
      };
    }

    const subjects = await listCurriculumForGrade(body.grade, request.user!.id);
    return {
      grade: body.grade,
      subjects
    };
  });

  app.post('/curriculum/import/pdf', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_AI_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_AI_RATE_LIMIT_WINDOW,
        keyGenerator: (request: FastifyRequest) =>
          request.user?.id ? `ai-user:${request.user.id}` : `ai-ip:${request.ip}`
      }
    }
  }, async (request, reply) => {
    const authError = await requireRoles(request, reply, ['school_admin', 'platform_admin']);
    if (authError) {
      return;
    }

    const body = curriculumImportSchema.parse(request.body);
    const prompt = `Analyze the attached curriculum PDF and extract strands and sub-strands.

Return valid JSON with this shape:
{
  "strands": [
    {
      "number": "1.0",
      "title": "STRAND",
      "subStrands": [
        {
          "number": "1.1",
          "title": "Sub-strand",
          "outcomes": [{ "text": "Outcome" }],
          "inquiryQuestions": [{ "text": "Question" }]
        }
      ]
    }
  ]
}`;

    const aiResult = await runSubscriptionScopedAiText({
      request,
      reply,
      body: {
        prompt,
        responseMimeType: 'application/json',
        feature: 'curriculum_import_processing',
        context: {
          grade: body.grade,
          subjectName: body.subjectName,
          subjectId: body.subjectId
        },
        attachment: {
          mimeType: body.mimeType,
          data: body.base64Data,
          name: body.fileName ?? `${body.subjectId}-curriculum.pdf`,
          type: 'file'
        }
      }
    });

    if (aiResult.error || !aiResult.text) {
      return aiResult.error;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(aiResult.text);
    } catch {
      reply.status(422);
      return {
        message: 'The curriculum PDF could not be converted into valid curriculum JSON. Existing curriculum was not changed.'
      };
    }

    const parsed = curriculumImportAiResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      reply.status(422);
      return {
        message: 'The curriculum PDF did not contain a valid strand/sub-strand structure. Existing curriculum was not changed.'
      };
    }

    const normalizedStrands = normalizeImportedCurriculum(
      {
        grade: body.grade,
        subjectId: body.subjectId,
        subjectName: body.subjectName
      },
      parsed.data.strands
    );

    if (!isImportableCurriculum(normalizedStrands)) {
      reply.status(422);
      return {
        message:
          'The curriculum PDF did not produce any strands with sub-strands and learning outcomes. Existing curriculum was not changed.'
      };
    }

    await withTransaction(async client => {
      await replaceCurriculumSubject(client, {
        actorUserId: request.user!.id,
        grade: body.grade,
        subjectId: body.subjectId,
        subjectName: body.subjectName,
        strands: normalizedStrands
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'curriculum.subject.imported', {
        grade: body.grade,
        subjectId: body.subjectId,
        subjectName: body.subjectName,
        strandCount: normalizedStrands.length
      });
    });

    const subjects = await listCurriculumForGrade(body.grade, request.user!.id);
    return {
      grade: body.grade,
      subjects: subjects.filter(subject => subject.subjectId === body.subjectId)
    };
  });

  app.post('/curriculum/sub-strands/:subStrandId/lesson', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_AI_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_AI_RATE_LIMIT_WINDOW,
        keyGenerator: (request: FastifyRequest) =>
          request.user?.id ? `ai-user:${request.user.id}` : `ai-ip:${request.ip}`
      }
    }
  }, async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = subStrandParamsSchema.parse(request.params);
    const context = await findCurriculumSubStrandContext(params.subStrandId);
    if (!context) {
      return reply.notFound('Sub-strand not found');
    }

    if (context.pages.length > 0) {
      return {
        subStrandId: context.sub_strand_id,
        pages: context.pages
      };
    }

    const aiResult = await runSubscriptionScopedAiText({
      request,
      reply,
      body: {
        prompt: buildLessonGenerationPrompt(context),
        responseMimeType: 'application/json',
        feature: 'curriculum_lesson_generation',
        context: {
          grade: context.grade_level,
          subjectName: context.subject_name,
          strandTitle: context.strand_title,
          subStrandTitle: context.sub_strand_title,
          learningOutcomes: context.outcomes,
          inquiryQuestions: context.inquiry_questions
        }
      }
    });

    if (aiResult.error || !aiResult.text) {
      return aiResult.error;
    }

    const parsed = JSON.parse(aiResult.text) as { pages?: Array<{ title: string; content: string }> };
    const pages = (parsed.pages ?? []).filter(
      page => page.title.trim().length > 0 && page.content.trim().length > 0
    );

    await withTransaction(async client => {
      await saveCurriculumSubStrandPages(client, params.subStrandId, pages);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'curriculum.lesson.generated', {
        subStrandId: params.subStrandId,
        pageCount: pages.length
      });
    });

    return {
      subStrandId: params.subStrandId,
      pages
    };
  });

  app.post('/curriculum/sub-strands/:subStrandId/quiz', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_AI_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_AI_RATE_LIMIT_WINDOW,
        keyGenerator: (request: FastifyRequest) =>
          request.user?.id ? `ai-user:${request.user.id}` : `ai-ip:${request.ip}`
      }
    }
  }, async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = subStrandParamsSchema.parse(request.params);
    const body = subStrandQuizSchema.parse(request.body);
    const context = await findCurriculumSubStrandContext(params.subStrandId);
    if (!context) {
      return reply.notFound('Sub-strand not found');
    }

    let parsed: {
      questions?: Array<{
        id?: number;
        type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
        text: string;
        options?: string[];
        correctAnswer?: string | boolean;
        explanation?: string;
      }>;
    } = {};

    try {
      const aiResult = await runSubscriptionScopedAiText({
        request,
        reply,
        body: {
          prompt: buildLessonQuizPrompt(context, body.questionCount),
          responseMimeType: 'application/json',
          feature: 'curriculum_quiz_generation',
          context: {
            grade: context.grade_level,
            subjectName: context.subject_name,
            strandTitle: context.strand_title,
            subStrandTitle: context.sub_strand_title,
            learningOutcomes: context.outcomes,
            inquiryQuestions: context.inquiry_questions,
            questionCount: body.questionCount
          }
        }
      });

      if (aiResult.error && aiResult.error.message !== 'AI request failed') {
        return aiResult.error;
      }

      if (!aiResult.error && aiResult.text) {
        parsed = JSON.parse(aiResult.text) as typeof parsed;
      }
    } catch (error) {
      request.log.warn({ err: error, subStrandId: params.subStrandId }, 'Curriculum quiz AI failed');
    }

    if (!parsed.questions?.length) {
      return reply.serviceUnavailable('AI quiz generation did not return questions');
    }

    return {
      subStrandId: params.subStrandId,
      source: 'ai',
      questions: (parsed.questions ?? []).map((question, index) => ({
        ...question,
        id: question.id ?? index + 1
      }))
    };
  });

  app.post('/curriculum/sub-strands/:subStrandId/complete', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = subStrandParamsSchema.parse(request.params);
    const body = subStrandCompletionSchema.parse(request.body);
    const context = await findCurriculumSubStrandContext(params.subStrandId);
    if (!context) {
      return reply.notFound('Sub-strand not found');
    }

    await withTransaction(async client => {
      await markCurriculumSubStrandCompleted(
        client,
        request.user!.id,
        params.subStrandId,
        body.quizScore ?? null
      );
      await createSubjectEngagementEvent(client, {
        userId: request.user!.id,
        schoolId: request.user!.schoolId,
        grade: context.grade_level,
        subjectId: context.subject_id,
        subjectName: context.subject_name,
        feature: 'lets_learn',
        eventType: 'sub_strand_completed',
        durationSeconds: body.durationSeconds ?? 0,
        metadata: {
          subStrandId: params.subStrandId,
          quizScore: body.quizScore ?? null
        }
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'curriculum.sub_strand.completed', {
        subStrandId: params.subStrandId,
        quizScore: body.quizScore ?? null
      });
    });

    const masteryScore = body.quizScore ?? 100;
    return {
      completed: masteryScore >= 70,
      needsRemediation: masteryScore < 70,
      masteryScore,
      unlockThreshold: 70,
      subStrandId: params.subStrandId,
      grade: context.grade_level,
      subjectId: context.subject_id
    };
  });

  app.get('/quiz-bank', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const query = quizBankQuerySchema.parse(request.query);
    const questions = await listQuizBankQuestions({
      gradeLevel: query.grade,
      subjectId: query.subjectId ?? null,
      limit: query.limit
    });

    return {
      grade: query.grade,
      subjectId: query.subjectId ?? null,
      questions: questions.map(serializeQuizBankQuestion)
    };
  });

  app.get('/diagnostics/onboarding/status', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const isStudent = request.user!.roles.includes('student');
    if (!isStudent) {
      return {
        required: false,
        completed: true,
        activeSession: null,
        result: null
      };
    }

    const completed = await findCompletedDiagnosticSession(
      request.user!.id,
      'onboarding',
      [...ONBOARDING_DIAGNOSTIC_SUBJECTS]
    );
    const activeSession = completed ? null : await findActiveDiagnosticSession(request.user!.id, 'onboarding');

    return {
      required: true,
      completed: Boolean(completed),
      activeSession: activeSession
        ? {
            id: activeSession.id,
            startedAt: activeSession.started_at.toISOString(),
            questions: ONBOARDING_DIAGNOSTIC_QUESTIONS.map(serializeDiagnosticQuestion)
          }
        : null,
      result: completed?.result_summary ?? null
    };
  });

  app.post('/diagnostics/onboarding/start', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    if (!request.user!.roles.includes('student')) {
      return reply.forbidden('Only student accounts can complete onboarding diagnostics');
    }

    const completed = await findCompletedDiagnosticSession(
      request.user!.id,
      'onboarding',
      [...ONBOARDING_DIAGNOSTIC_SUBJECTS]
    );
    if (completed) {
      return {
        completed: true,
        sessionId: completed.id,
        result: completed.result_summary,
        questions: []
      };
    }

    const existing = await findActiveDiagnosticSession(request.user!.id, 'onboarding');
    const sessionId = existing?.id ?? await withTransaction(async client => {
      const createdSessionId = await createDiagnosticSession(client, {
        userId: request.user!.id,
        kind: 'onboarding',
        subjects: [...ONBOARDING_DIAGNOSTIC_SUBJECTS]
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'diagnostic.onboarding.started', {
        sessionId: createdSessionId
      });
      return createdSessionId;
    });

    return {
      completed: false,
      sessionId,
      questions: ONBOARDING_DIAGNOSTIC_QUESTIONS.map(serializeDiagnosticQuestion)
    };
  });

  app.post('/diagnostics/onboarding/:sessionId/answer', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = diagnosticParamsSchema.parse(request.params);
    const body = diagnosticAnswerSchema.parse(request.body);
    const session = await findDiagnosticSessionForUser(params.sessionId, request.user!.id);
    if (!session || session.kind !== 'onboarding') {
      return reply.notFound('Diagnostic session not found');
    }
    if (session.status === 'completed') {
      return reply.badRequest('Diagnostic session is already completed');
    }

    const question = findDiagnosticQuestion(body.questionId);
    if (!question) {
      return reply.badRequest('Diagnostic question not found');
    }

    const isCorrect =
      body.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    await withTransaction(async client => {
      await recordDiagnosticAnswer(client, {
        sessionId: session.id,
        userId: request.user!.id,
        questionId: question.id,
        subjectId: question.subjectId,
        subStrandKey: question.subStrandKey,
        answer: body.answer,
        isCorrect,
        confidenceScore: body.confidenceScore,
        responseLatencyMs: body.responseLatencyMs
      });
      await createSubjectEngagementEvent(client, {
        userId: request.user!.id,
        schoolId: request.user!.schoolId,
        grade: request.user!.grade || 'Unknown Grade',
        subjectId: question.subjectId,
        subjectName: question.subjectName,
        feature: 'take_quiz',
        eventType: 'diagnostic_answer',
        durationSeconds: Math.round(body.responseLatencyMs / 1000),
        metadata: {
          sessionId: session.id,
          questionId: question.id,
          isCorrect
        }
      });
    });

    return {
      recorded: true,
      isCorrect
    };
  });

  app.post('/diagnostics/onboarding/:sessionId/complete', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = diagnosticParamsSchema.parse(request.params);
    const session = await findDiagnosticSessionForUser(params.sessionId, request.user!.id);
    if (!session || session.kind !== 'onboarding') {
      return reply.notFound('Diagnostic session not found');
    }
    if (session.status === 'completed') {
      return {
        completed: true,
        result: session.result_summary
      };
    }

    const answers = await listDiagnosticAnswers(session.id);
    if (answers.length < ONBOARDING_DIAGNOSTIC_QUESTIONS.length) {
      return reply.badRequest('Answer all diagnostic questions before completing');
    }

    const result = buildDiagnosticResultSummary(answers);
    await withTransaction(async client => {
      await completeDiagnosticSession(client, session.id, result);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'diagnostic.onboarding.completed', {
        sessionId: session.id,
        result
      });
    });

    return {
      completed: true,
      result
    };
  });

  app.get('/diagnostics/progressive/:subjectId/status', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    const params = progressiveSubjectParamsSchema.parse(request.params);
    if (!request.user!.roles.includes('student')) {
      return { required: false, completed: true, activeSession: null, result: null };
    }

    const completed = await findCompletedDiagnosticSession(request.user!.id, 'progressive', [params.subjectId]);
    const activeSession = completed
      ? null
      : await findActiveDiagnosticSessionForSubjects(request.user!.id, 'progressive', [params.subjectId]);
    const questions = getProgressiveDiagnosticQuestions(params.subjectId);

    return {
      required: true,
      completed: Boolean(completed),
      activeSession: activeSession
        ? {
            id: activeSession.id,
            startedAt: activeSession.started_at.toISOString(),
            questions: questions.map(serializeDiagnosticQuestion)
          }
        : null,
      result: completed?.result_summary ?? null
    };
  });

  app.post('/diagnostics/progressive/:subjectId/start', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    const params = progressiveSubjectParamsSchema.parse(request.params);
    if (!request.user!.roles.includes('student')) {
      return reply.forbidden('Only student accounts can complete subject diagnostics');
    }

    const completed = await findCompletedDiagnosticSession(request.user!.id, 'progressive', [params.subjectId]);
    if (completed) {
      return {
        completed: true,
        sessionId: completed.id,
        result: completed.result_summary,
        questions: []
      };
    }

    const existing = await findActiveDiagnosticSessionForSubjects(request.user!.id, 'progressive', [params.subjectId]);
    const sessionId = existing?.id ?? await withTransaction(async client => {
      const createdSessionId = await createDiagnosticSession(client, {
        userId: request.user!.id,
        kind: 'progressive',
        subjects: [params.subjectId]
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'diagnostic.progressive.started', {
        sessionId: createdSessionId,
        subjectId: params.subjectId
      });
      return createdSessionId;
    });

    return {
      completed: false,
      sessionId,
      questions: getProgressiveDiagnosticQuestions(params.subjectId).map(serializeDiagnosticQuestion)
    };
  });

  app.post('/diagnostics/progressive/:subjectId/:sessionId/answer', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = progressiveDiagnosticParamsSchema.parse(request.params);
    const body = diagnosticAnswerSchema.parse(request.body);
    const session = await findDiagnosticSessionForUser(params.sessionId, request.user!.id);
    if (!session || session.kind !== 'progressive' || !session.subjects.includes(params.subjectId)) {
      return reply.notFound('Diagnostic session not found');
    }
    if (session.status === 'completed') {
      return reply.badRequest('Diagnostic session is already completed');
    }

    const question = findProgressiveDiagnosticQuestion(params.subjectId, body.questionId);
    if (!question) {
      return reply.badRequest('Diagnostic question not found');
    }
    const isCorrect = body.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    await withTransaction(async client => {
      await recordDiagnosticAnswer(client, {
        sessionId: session.id,
        userId: request.user!.id,
        questionId: question.id,
        subjectId: question.subjectId,
        subStrandKey: question.subStrandKey,
        answer: body.answer,
        isCorrect,
        confidenceScore: body.confidenceScore,
        responseLatencyMs: body.responseLatencyMs
      });
      await createSubjectEngagementEvent(client, {
        userId: request.user!.id,
        schoolId: request.user!.schoolId,
        grade: request.user!.grade || 'Unknown Grade',
        subjectId: question.subjectId,
        subjectName: question.subjectName,
        feature: 'quizme',
        eventType: 'diagnostic_answer',
        durationSeconds: Math.round(body.responseLatencyMs / 1000),
        metadata: {
          sessionId: session.id,
          questionId: question.id,
          isCorrect
        }
      });
    });

    return { recorded: true, isCorrect };
  });

  app.post('/diagnostics/progressive/:subjectId/:sessionId/complete', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = progressiveDiagnosticParamsSchema.parse(request.params);
    const session = await findDiagnosticSessionForUser(params.sessionId, request.user!.id);
    if (!session || session.kind !== 'progressive' || !session.subjects.includes(params.subjectId)) {
      return reply.notFound('Diagnostic session not found');
    }
    if (session.status === 'completed') {
      return { completed: true, result: session.result_summary };
    }

    const questions = getProgressiveDiagnosticQuestions(params.subjectId);
    const answers = await listDiagnosticAnswers(session.id);
    if (answers.length < questions.length) {
      return reply.badRequest('Answer all diagnostic questions before completing');
    }

    const result = buildDiagnosticResultSummary(answers);
    await withTransaction(async client => {
      await completeDiagnosticSession(client, session.id, result);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'diagnostic.progressive.completed', {
        sessionId: session.id,
        subjectId: params.subjectId,
        result
      });
    });

    return { completed: true, result };
  });

  app.get('/learning/weekly-exam', async (request, reply) => {
    const authError = await requireRoles(request, reply, ['student']);
    if (authError) {
      return;
    }

    const gradeLevel = request.user!.grade || 'Grade 8';
    const weekStart = getWeekStart();
    const closesAt = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const exam = await withTransaction(client => ensureWeeklyExam(client, {
      gradeLevel,
      weekStart: weekStart.toISOString().slice(0, 10),
      title: `${gradeLevel} Weekly Challenge`,
      durationMinutes: 20,
      questions: buildWeeklyExamQuestions(gradeLevel),
      opensAt: weekStart,
      closesAt
    }));
    const attempt = await findWeeklyExamAttempt(exam.id, request.user!.id);
    const history = await listWeeklyExamHistory(request.user!.id);

    return {
      exam: serializeWeeklyExam(exam, attempt?.status === 'completed'),
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            score: attempt.score === null ? null : Number(attempt.score),
            correctCount: attempt.correct_count,
            totalQuestions: attempt.total_questions,
            startedAt: attempt.started_at.toISOString(),
            submittedAt: attempt.submitted_at?.toISOString() ?? null,
            answers: attempt.status === 'completed' ? attempt.answers : []
          }
        : null,
      history: history.map(item => ({
        id: item.id,
        examId: item.exam_id,
        title: item.title,
        weekStart: item.week_start instanceof Date
          ? item.week_start.toISOString().slice(0, 10)
          : String(item.week_start),
        score: Number(item.score),
        correctCount: item.correct_count,
        totalQuestions: item.total_questions,
        submittedAt: item.submitted_at.toISOString()
      }))
    };
  });

  app.post('/learning/weekly-exam/:examId/start', async (request, reply) => {
    const authError = await requireRoles(request, reply, ['student']);
    if (authError) {
      return;
    }

    const params = weeklyExamParamsSchema.parse(request.params);
    const gradeLevel = request.user!.grade || 'Grade 8';
    const weekStart = getWeekStart();
    const exam = await withTransaction(client => ensureWeeklyExam(client, {
      gradeLevel,
      weekStart: weekStart.toISOString().slice(0, 10),
      title: `${gradeLevel} Weekly Challenge`,
      durationMinutes: 20,
      questions: buildWeeklyExamQuestions(gradeLevel),
      opensAt: weekStart,
      closesAt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    }));
    if (exam.id !== params.examId) {
      return reply.notFound('Weekly exam not found');
    }

    const attempt = await withTransaction(async client => {
      const started = await startWeeklyExamAttempt(client, exam.id, request.user!.id);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'weekly_exam.started', {
        examId: exam.id,
        attemptId: started.id
      });
      return started;
    });

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.started_at.toISOString()
      }
    };
  });

  app.post('/learning/weekly-exam/:examId/submit', async (request, reply) => {
    const authError = await requireRoles(request, reply, ['student']);
    if (authError) {
      return;
    }

    const params = weeklyExamParamsSchema.parse(request.params);
    const body = weeklyExamSubmitSchema.parse(request.body);
    const gradeLevel = request.user!.grade || 'Grade 8';
    const weekStart = getWeekStart();
    const exam = await withTransaction(client => ensureWeeklyExam(client, {
      gradeLevel,
      weekStart: weekStart.toISOString().slice(0, 10),
      title: `${gradeLevel} Weekly Challenge`,
      durationMinutes: 20,
      questions: buildWeeklyExamQuestions(gradeLevel),
      opensAt: weekStart,
      closesAt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    }));
    if (exam.id !== params.examId) {
      return reply.notFound('Weekly exam not found');
    }
    if (!body.timedOut && body.answers.length !== exam.questions.length) {
      return reply.badRequest('Answer every question before submitting');
    }
    const uniqueQuestionIds = new Set(body.answers.map(answer => answer.questionId));
    if (
      uniqueQuestionIds.size !== body.answers.length ||
      body.answers.some(answer => !exam.questions.some(question => question.id === answer.questionId))
    ) {
      return reply.badRequest('Exam answers do not match the current questions');
    }

    const attempt = await withTransaction(async client => {
      const submitted = await submitWeeklyExamAttempt(client, {
        exam,
        attemptId: body.attemptId,
        userId: request.user!.id,
        answers: body.answers
      });
      if (!submitted) {
        return null;
      }
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'weekly_exam.completed', {
        examId: exam.id,
        attemptId: submitted.id,
        score: submitted.score
      });
      return submitted;
    });
    if (!attempt) {
      return reply.notFound('Weekly exam attempt not found');
    }

    return {
      exam: serializeWeeklyExam(exam, true),
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: Number(attempt.score ?? 0),
        correctCount: attempt.correct_count ?? 0,
        totalQuestions: attempt.total_questions ?? exam.questions.length,
        submittedAt: attempt.submitted_at?.toISOString() ?? null,
        answers: attempt.answers
      }
    };
  });

  app.get('/learning/reviews/due', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    if (!request.user!.roles.includes('student')) {
      return { reviews: [] };
    }

    const reviews = await listDueSpacedReviews(request.user!.id);
    return {
      reviews: reviews.map(review => ({
        id: review.id,
        subjectId: review.subject_id,
        subStrandKey: review.sub_strand_key,
        nextReviewDate:
          review.next_review_date instanceof Date
            ? review.next_review_date.toISOString().slice(0, 10)
            : String(review.next_review_date),
        intervalDays: review.interval_days,
        masteryScore: Number(review.mastery_score)
      }))
    };
  });

  app.post('/learning/reviews/:reviewId/complete', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = reviewParamsSchema.parse(request.params);
    const body = completeReviewSchema.parse(request.body);

    await withTransaction(async client => {
      await markSpacedReviewCompleted(client, {
        userId: request.user!.id,
        reviewId: params.reviewId,
        passed: body.passed
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'learning.review.completed', {
        reviewId: params.reviewId,
        passed: body.passed
      });
    });

    return { completed: true };
  });

  app.get('/schools', async () => {
    const schools = await listSchools();
    return {
      schools: schools.map(serializeSchool)
    };
  });

  app.get('/app/banner', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const firstName = request.user!.fullName.trim().split(/\s+/)[0] || 'there';
    const hour = new Date().getHours();
    const timeOfDay =
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const activeAnnouncement = await getActiveBannerAnnouncement();

    if (activeAnnouncement) {
      return {
        kind: 'announcement',
        greeting: `Hi ${firstName}, here is something useful for today`,
        timeOfDay,
        title: activeAnnouncement.title,
        message: activeAnnouncement.message,
        ctaLabel: activeAnnouncement.cta_label ?? 'Open',
        ctaTarget: activeAnnouncement.cta_target
      };
    }

    return {
      kind: 'quote',
      greeting: `Hi ${firstName}, ready to learn?`,
      timeOfDay,
      title: 'Quote of the day',
      message: buildQuoteOfTheDay(),
      ctaLabel: 'Ask Tutor',
      ctaTarget: 'ask_tutor'
    };
  });

  app.get('/notifications', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const query = notificationsQuerySchema.parse(request.query);
    const notifications = await listUserNotifications(request.user!.id, {
      limit: query.limit,
      unreadOnly: query.unreadOnly
    });

    return {
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        channel: notification.channel,
        status: notification.status,
        metadata: notification.metadata,
        readAt: notification.read_at?.toISOString() ?? null,
        createdAt: notification.created_at.toISOString()
      }))
    };
  });

  app.post('/notifications/:notificationId/read', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = notificationParamsSchema.parse(request.params);
    await withTransaction(async client => {
      await markUserNotificationRead(client, request.user!.id, params.notificationId);
    });

    return { updated: true };
  });

  app.post('/notifications/read-all', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    await withTransaction(async client => {
      await markAllUserNotificationsRead(client, request.user!.id);
    });

    return { updated: true };
  });

  app.post('/notifications/push-token', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = pushTokenSchema.parse(request.body);
    await withTransaction(async client => {
      await upsertPushToken(client, {
        userId: request.user!.id,
        platform: body.platform,
        token: body.token,
        deviceId: body.deviceId ?? null
      });
    });

    return { registered: true };
  });

  app.get('/app/library/books', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const query = libraryBooksQuerySchema.parse(request.query);
    return { books: await listGeneratedBooksForUser(request.user!, { grade: query.grade }) };
  });

  app.get('/app/library/books/:bookId/manifest', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = z.object({ bookId: z.string().min(1) }).parse(request.params);
    const manifest = await readGeneratedBookManifestForUser(request.user!, params.bookId);
    if (!manifest) {
      return reply.notFound('Book manifest not found');
    }

    return { manifest };
  });

  app.get('/app/library/books/:bookId/download', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = z.object({ bookId: z.string().min(1) }).parse(request.params);
    const query = z.object({
      format: z.enum(['pdf', 'markdown', 'pages', 'source-map', 'cover']).default('pdf')
    }).parse(request.query);
    const asset = await openGeneratedBookAssetForUser(request.user!, params.bookId, query.format);
    if (!asset) {
      return reply.notFound('Book asset not found');
    }

    reply
      .type(asset.contentType)
      .header('Content-Length', String(asset.sizeBytes))
      .header('Content-Disposition', `attachment; filename="${asset.fileName}"`);
    return reply.send(asset.stream);
  });

  app.get('/app/podcasts', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const podcasts = await listLearningPodcastsForUser(request.user!);
    return {
      podcasts: podcasts.map(podcast => ({
        id: podcast.id,
        title: podcast.title,
        subject: podcast.subject,
        type: podcast.type,
        duration: podcast.duration,
        views: podcast.views,
        date: podcast.published_on.toISOString().slice(0, 10),
        author: podcast.author,
        thumbnail: podcast.thumbnail_url,
        url: podcast.media_url
      }))
    };
  });

  app.get('/homework/assignments', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['student']);
    if (precondition) {
      return precondition;
    }

    const assignments = await listStudentAssignments(request.user!);
    return {
      assignments: assignments.map(item => ({
        id: item.id,
        title: item.title,
        subject: item.subject,
        description: item.description,
        gradeLevel: item.grade_level,
        dueDate: item.due_at ? item.due_at.toISOString() : null,
        status: item.status,
        questions: item.questions,
        score: item.score,
        submittedDate: item.submitted_at ? item.submitted_at.toISOString() : null
      }))
    };
  });

  app.post('/homework/assignments/:assignmentId/submit', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['student']);
    if (precondition) {
      return precondition;
    }

    const params = assignmentParamsSchema.parse(request.params);
    const body = studentAssignmentSubmissionSchema.parse(request.body);

    await withTransaction(async client => {
      await submitStudentAssignment(client, request.user!, params.assignmentId, body);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'assignment.submitted', {
        assignmentId: params.assignmentId,
        score: body.score
      });
    });

    return { success: true };
  });

  app.get('/parent/dashboard', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['parent']);
    if (precondition) {
      return precondition;
    }

    const children = await listParentChildrenDashboard(request.user!.id);
    return { children };
  });

  app.post('/parent/children/link', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['parent']);
    if (precondition) {
      return precondition;
    }

    const body = parentChildLinkSchema.parse(request.body);
    const child = await withTransaction(async client => {
      const linkedChild = body.studentEmail
        ? await linkParentStudentByEmail(client, request.user!.id, body.studentEmail)
        : await linkParentStudentByPhone(
            client,
            request.user!.id,
            formatKenyanPhoneNumber(body.studentPhone!)
          );
      if (!linkedChild) {
        return null;
      }

      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'parent.child.linked', {
        studentId: linkedChild.id,
        studentEmail: linkedChild.email,
        linkMethod: body.studentEmail ? 'email' : 'phone'
      });
      return linkedChild;
    });

    if (!child) {
      return reply.notFound(
        body.studentEmail
          ? 'No verified student account was found for that email'
          : 'No verified student account was found for that phone number'
      );
    }

    return reply.status(201).send({ child });
  });

  app.delete('/parent/children/:studentId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['parent']);
    if (precondition) {
      return precondition;
    }

    const params = parentChildParamsSchema.parse(request.params);
    await withTransaction(async client => {
      await unlinkParentStudent(client, request.user!.id, params.studentId);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'parent.child.unlinked', {
        studentId: params.studentId
      });
    });

    return { removed: true };
  });

  app.get('/teacher/students', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const students = await listTeacherStudents(request.user!);
    return {
      students: students.map(student => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        assessmentScore: student.assessment_score,
        homeworkCompletion: student.homework_completion,
        lastActive: student.last_active,
        trend: student.trend
      }))
    };
  });

  app.get('/teacher/assignments', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const [assignments, submissions] = await Promise.all([
      listTeacherAssignments(request.user!),
      listAssignmentSubmissionsForTeacher(request.user!)
    ]);

    const submissionsByAssignment = submissions.reduce<Record<string, unknown[]>>((acc, item) => {
      if (!acc[item.assignment_id]) {
        acc[item.assignment_id] = [];
      }
      acc[item.assignment_id].push({
        studentId: item.student_id,
        studentName: item.student_name,
        score: item.score,
        status: item.status,
        answers: item.answers
      });
      return acc;
    }, {});

    return {
      assignments: assignments.map(item => ({
        id: item.id,
        title: item.title,
        subject: item.subject,
        description: item.description,
        gradeLevel: item.grade_level,
        dueDate: item.due_at ? item.due_at.toISOString() : null,
        status: 'pending',
        questions: item.questions,
        submittedCount: item.submitted_count,
        totalStudents: item.total_students,
        averageScore: item.average_score,
        dateSent: item.created_at.toISOString()
      })),
      submissionsByAssignment
    };
  });

  app.post('/teacher/assignments', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = teacherAssignmentSchema.parse(request.body);

    const assignmentId = await withTransaction(async client => {
      const createdAssignmentId = await createTeacherAssignment(client, request.user!, {
        title: body.title,
        subject: body.subject,
        description: body.description,
        gradeLevel: body.gradeLevel,
        dueAt: body.dueDate ? new Date(body.dueDate) : null,
        targetStudentId: body.targetStudentId,
        questions: body.questions
      });

      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'teacher.assignment.created', {
        assignmentId: createdAssignmentId,
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        targetStudentId: body.targetStudentId
      });

      return createdAssignmentId;
    });

    return reply.status(201).send({ assignmentId });
  });

  app.post('/teacher/teaching-scope', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = teachingScopeSchema.parse(request.body);
    const scopes = body.subjectsByGrade
      ? Object.entries(body.subjectsByGrade).flatMap(([gradeLevel, subjects]) =>
          subjects.map(subjectName => ({ gradeLevel, subjectName }))
        )
      : body.grades.flatMap(gradeLevel =>
          body.subjects.map(subjectName => ({ gradeLevel, subjectName }))
        );

    await withTransaction(async client => {
      await replaceTeacherTeachingScopes(client, request.user!.id, scopes);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'teacher.scope.updated', {
        scopeCount: scopes.length
      });
    });

    return { saved: true, scopeCount: scopes.length };
  });

  app.get('/teacher/parents', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const query = teacherParentMessageQuerySchema.parse(request.query);
    if (!query.gradeLevel) {
      return reply.badRequest('gradeLevel is required');
    }
    const parents = await listTeacherParents(request.user!, query.gradeLevel);
    return { parents };
  });

  app.get('/teacher/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const query = teacherParentMessageQuerySchema.parse(request.query);
    const messages = await listTeacherParentMessages(request.user!, query);
    return { messages };
  });

  app.post('/teacher/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = teacherParentMessageSchema.parse(request.body);
    const sentCount = await withTransaction(async client => {
      const count = await createTeacherParentMessages(client, request.user!, {
        gradeLevel: body.gradeLevel,
        parentUserId: body.parentUserId,
        body: body.body
      });
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'teacher.parent_message.sent', {
        gradeLevel: body.gradeLevel,
        parentUserId: body.parentUserId,
        sentCount: count
      });
      return count;
    });

    return reply.status(201).send({ sentCount });
  });

  app.post('/teacher/lesson-plans', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['teacher', 'school_admin', 'platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = teacherLessonPlanSchema.parse(request.body);
    const lessonPlanId = await withTransaction(async client => {
      const id = await createTeacherLessonPlan(client, request.user!, body);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'teacher.lesson_plan.created', {
        lessonPlanId: id,
        gradeLevel: body.gradeLevel,
        subject: body.subject
      });
      return id;
    });

    return reply.status(201).send({ lessonPlanId });
  });

  app.get('/parent/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['parent']);
    if (precondition) {
      return precondition;
    }

    const messages = await listParentTeacherMessages(request.user!);
    return { messages };
  });

  app.post('/parent/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['parent']);
    if (precondition) {
      return precondition;
    }

    const body = parentTeacherMessageSchema.parse(request.body);
    const messageId = await withTransaction(async client => {
      const id = await createParentTeacherMessage(client, request.user!, body);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'parent.teacher_message.sent', {
        teacherUserId: body.teacherUserId
      });
      return id;
    });

    return reply.status(201).send({ messageId });
  });

  app.post('/teacher-parent-messages/:messageId/report', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour'
      }
    }
  }, async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = teacherParentMessageReportParamsSchema.parse(request.params);
    const body = teacherParentMessageReportSchema.parse(request.body ?? {});
    const currentUser = request.user!;

    const result = await withTransaction(async client => {
      const message = await findTeacherParentMessageForReport(client, currentUser, params.messageId);
      if (!message) {
        return null;
      }

      const reportId = await createContentReport(client, {
        reporterUserId: currentUser.id,
        schoolId: message.school_id,
        source: 'teacher_parent_message',
        contentRole: 'message',
        reason: body.reason,
        contentText: message.body,
        context: {
          messageId: message.id,
          teacherUserId: message.teacher_user_id,
          parentUserId: message.parent_user_id,
          senderUserId: message.sender_user_id,
          senderName: message.sender_name,
          gradeLevel: message.grade_level,
          note: body.note ?? null
        }
      });

      await createAuditLog(client, currentUser.id, message.school_id, 'teacher_parent_message.reported', {
        reportId,
        messageId: message.id,
        reason: body.reason,
        teacherUserId: message.teacher_user_id,
        parentUserId: message.parent_user_id
      }, 'content_report', reportId);

      const recipients = await listAdminNotificationRecipientsForSchool(client, message.school_id);
      let notifiedAdminCount = 0;
      for (const recipient of recipients) {
        if (recipient.id === currentUser.id) {
          continue;
        }
        await notifyUser(client, {
          userId: recipient.id,
          type: 'content.report.teacher_parent_message',
          title: 'Teacher-parent message reported',
          body: `${currentUser.fullName} reported a teacher-parent message from ${message.sender_name}.`,
          metadata: {
            reportId,
            messageId: message.id,
            schoolId: message.school_id,
            gradeLevel: message.grade_level,
            reason: body.reason
          },
          forceInApp: true
        });
        notifiedAdminCount += 1;
      }

      return { reportId, notifiedAdminCount };
    });

    if (!result) {
      return reply.notFound('Message not found');
    }

    return reply.status(201).send({
      reportId: result.reportId,
      notifiedAdminCount: result.notifiedAdminCount,
      message: 'Thanks. An admin has been alerted.'
    });
  });

  app.get('/admin/users', async (request, reply) => {
    const needsStepUp = request.user?.roles.includes('platform_admin') && !request.user.roles.includes('school_admin');
    const precondition = await requireRoles(request, reply, ['school_admin', 'platform_admin'], {
      requireStepUp: needsStepUp
    });
    if (precondition) {
      return precondition;
    }

    const users = await listAdminUsers(request.user!);
    return { users };
  });

  app.patch('/admin/users/:userId/profile', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) return precondition;
    const params = adminStudentParamsSchema.parse(request.params);
    const body = adminStudentProfileSchema.parse(request.body);
    const admin = await findUserByEmail(request.user!.email);
    if (!admin || !(await verifyPassword(body.adminPassword, admin.password_hash))) {
      return reply.unauthorized('Admin password is incorrect');
    }
    const existingEmailUser = await findUserByEmail(body.email);
    if (existingEmailUser && existingEmailUser.id !== params.userId) {
      return reply.conflict('Another account already uses this email');
    }
    await withTransaction(async client => {
      await updateAdminStudentProfile(client, params.userId, body);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'admin.student.profile.updated', { studentUserId: params.userId });
    });
    const users = await listAdminUsers(request.user!);
    const user = users.find(item => item.id === params.userId);
    return user ? { user } : reply.notFound('Student not found');
  });

  app.patch('/admin/users/:userId/subscription', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) return precondition;
    const params = adminStudentParamsSchema.parse(request.params);
    const body = adminStudentSubscriptionSchema.parse(request.body);
    const admin = await findUserByEmail(request.user!.email);
    if (!admin || !(await verifyPassword(body.adminPassword, admin.password_hash))) {
      return reply.unauthorized('Admin password is incorrect');
    }
    const selectedPlan = body.active && body.planCode ? (await listSubscriptionPlans([body.planCode]))[0] : null;
    if (body.active && !selectedPlan) return reply.badRequest('Select a valid subscription package');
    const subscriptionStart = new Date();
    const changed = await withTransaction(async client => {
      const subscriptionChanged = selectedPlan
        ? Boolean(await replaceActiveSubscription(client, {
            userId: params.userId,
            planId: selectedPlan.id,
            billingCycle: selectedPlan.billing_cycle,
            priceKshCents: Number(selectedPlan.price_ksh_cents),
            periodStart: subscriptionStart,
            periodEnd: getPlanPeriodEnd(subscriptionStart, selectedPlan.billing_cycle)
          }))
        : await setAdminStudentSubscriptionStatus(client, params.userId, false);
      if (!subscriptionChanged) return false;
      await createAuditLog(client, request.user!.id, request.user!.schoolId, body.active ? 'admin.student.subscription.activated' : 'admin.student.subscription.deactivated', { studentUserId: params.userId });
      return true;
    });
    if (!changed) return reply.badRequest(body.active ? 'Unable to assign this subscription package' : 'This learner has no active subscription');
    const users = await listAdminUsers(request.user!);
    const user = users.find(item => item.id === params.userId);
    return user ? { user } : reply.notFound('Student not found');
  });

  app.post('/admin/sales-agents', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = salesAgentCreateSchema.parse(request.body);
    const existingUser = await findUserByEmail(body.email);
    if (existingUser) {
      return reply.conflict('An account with that email already exists');
    }

    let phoneNumber: string | null = null;
    if (body.phoneNumber) {
      try {
        phoneNumber = formatKenyanPhoneNumber(body.phoneNumber);
      } catch {
        return reply.badRequest('Enter a valid Kenyan phone number');
      }
    }

    const temporaryPassword = randomBytes(18).toString('base64url');
    const passwordHash = await hashPassword(temporaryPassword);
    const user = await withTransaction(client => createAdminManagedUser(client, {
      actorUserId: request.user!.id,
      email: body.email,
      phoneNumber,
      county: body.county ?? null,
      passwordHash,
      fullName: body.fullName,
      role: 'sales_agent',
      termsAcceptedAt: new Date(),
      termsVersion: appConfig.KITABU_TERMS_VERSION,
      privacyVersion: appConfig.KITABU_PRIVACY_VERSION
    }));

    return reply.status(201).send({ user, temporaryPassword });
  });

  app.post('/admin/sales-agents/:agentId/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = salesAgentParamsSchema.parse(request.params);
    const body = salesAgentMessageSchema.parse(request.body);
    const agent = await findUserById(params.agentId);
    if (!agent || !agent.roles.includes('sales_agent')) {
      return reply.notFound('Sales agent not found');
    }

    let normalizedPhone: string | null = null;
    if (agent.phoneNumber) {
      try {
        normalizedPhone = formatKenyanPhoneNumber(agent.phoneNumber);
      } catch {
        normalizedPhone = null;
      }
    }

    const title = body.title || 'Message from Kitabu AI';
    const whatsappUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(body.message)}`
      : null;
    const result = await withTransaction(async client => {
      const notification = await notifyUser(client, {
        userId: agent.id,
        type: 'sales_agent.admin_message',
        title,
        body: body.message,
        forceInApp: true,
        metadata: {
          senderUserId: request.user!.id,
          senderEmail: request.user!.email,
          whatsappUrl
        },
        smsPhoneNumber: normalizedPhone ? `+${normalizedPhone}` : null,
        smsBody: `Kitabu AI Admin: ${body.message.slice(0, 140)}`
      });

      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'admin.sales_agent.message.sent', {
        agentId: agent.id,
        notificationId: notification.notificationId,
        smsStatus: notification.smsStatus,
        whatsappPrepared: Boolean(whatsappUrl)
      });

      return notification;
    });

    return {
      dashboardNotificationId: result.notificationId,
      smsStatus: result.smsStatus,
      whatsappUrl,
      whatsappDelivery: whatsappUrl ? 'launch_required' : 'missing_phone'
    };
  });

  app.post('/me/presence', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = presenceSchema.parse(request.body);
    await withTransaction(async client => {
      await recordUserPresence(client, request.user!, {
        status: body.status,
        reason: body.reason,
        deviceId: String(request.headers['x-kitabu-device-id'] || '').trim() || null,
        deviceLabel: String(request.headers['x-kitabu-device-label'] || '').trim() || null
      });
    });

    return { status: body.status };
  });

  app.get('/games/chess/opponents', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const opponents = await listChessOnlineOpponents(request.user!);
    return { opponents };
  });

  app.get('/games/chess/matches', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const matches = await listChessMatches(request.user!);
    return { matches };
  });

  app.post('/games/chess/matches', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = chessCreateMatchSchema.parse(request.body);

    try {
      const match = await withTransaction(async client => {
        const created = await createChessMatch(client, request.user!, body.opponentUserId);
        await notifyUser(client, {
          userId: body.opponentUserId,
          type: 'game.chess.challenge',
          title: 'Chess duel started',
          body: `${request.user!.fullName} started a Chess Master duel with you.`,
          forceInApp: true,
          metadata: {
            matchId: created.id,
            challengerUserId: request.user!.id
          }
        });
        await createAuditLog(client, request.user!.id, request.user!.schoolId, 'game.chess.match.created', {
          matchId: created.id,
          opponentUserId: body.opponentUserId
        });
        return created;
      });

      return reply.status(201).send({ match });
    } catch (error) {
      return reply.badRequest(error instanceof Error ? error.message : 'Chess match could not be created.');
    }
  });

  app.get('/games/chess/matches/:matchId', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = chessMatchParamsSchema.parse(request.params);
    const match = await findChessMatchForUser(db, request.user!, params.matchId);
    return match ? { match } : reply.notFound('Chess match not found');
  });

  app.get('/games/chess/matches/:matchId/moves', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = chessMatchParamsSchema.parse(request.params);
    try {
      const moves = await listChessMoves(request.user!, params.matchId);
      return { moves };
    } catch {
      return reply.notFound('Chess match not found');
    }
  });

  app.post('/games/chess/matches/:matchId/moves', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = chessMatchParamsSchema.parse(request.params);
    const body = chessMoveSchema.parse(request.body);

    try {
      const result = await withTransaction(async client => {
        const submitted = await submitChessMove(client, request.user!, {
          matchId: params.matchId,
          from: body.from,
          to: body.to,
          promotion: body.promotion
        });
        await createAuditLog(client, request.user!.id, request.user!.schoolId, 'game.chess.move.submitted', {
          matchId: params.matchId,
          san: submitted.move.san,
          status: submitted.match.status
        });
        return submitted;
      });

      return { match: result.match, move: result.move };
    } catch (error) {
      return reply.badRequest(error instanceof Error ? error.message : 'Chess move could not be submitted.');
    }
  });

  app.post('/onboarding/selection-events', async (request, reply) => {
    const body = onboardingSelectionEventSchema.parse(request.body);
    const currentUser = request.user ?? null;

    await withTransaction(async client => {
      await createOnboardingSelectionEvent(client, {
        anonymousSessionId: body.sessionId,
        userId: currentUser?.id ?? null,
        schoolId: currentUser?.schoolId ?? null,
        stepKey: body.stepKey,
        optionKey: body.optionKey,
        optionLabel: body.optionLabel,
        role: body.role || currentUser?.roles[0] || null,
        county: body.county || null,
        grade: body.grade || currentUser?.grade || null,
        countryCode: body.countryCode || currentUser?.countryCode || null,
        curriculumCode: body.curriculumCode || currentUser?.curriculumCode || null,
        metadata: body.metadata ?? {}
      });
    });

    return reply.status(202).send({ accepted: true });
  });

  app.post('/me/onboarding', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    if (!request.user!.roles.includes('student')) {
      return reply.forbidden('Only student accounts can complete onboarding here');
    }

    const body = onboardingSchema.parse(request.body);
    const normalizedPhone = body.mpesaPhoneNumber
      ? formatKenyanPhoneNumber(body.mpesaPhoneNumber)
      : null;

    await withTransaction(async client => {
      await updateUserOnboarding(client, {
        userId: request.user!.id,
        schoolId: body.schoolId,
        gender: body.gender,
        grade: body.grade,
        subjects: body.subjects,
        mpesaPhoneNumber: normalizedPhone
      });
      await createAuditLog(client, request.user!.id, body.schoolId, 'auth.onboarding.completed', {
        grade: body.grade
      });
    });

    const refreshedUser = await findUserById(request.user!.id);
    if (!refreshedUser) {
      return reply.notFound('User not found');
    }

    const accessToken = await signAccessToken({
      sub: refreshedUser.id,
      schoolId: refreshedUser.schoolId,
      sid: request.user!.sessionId ?? undefined,
      email: refreshedUser.email,
      phoneNumber: refreshedUser.phoneNumber ?? null,
      phoneVerified: refreshedUser.phoneVerified,
      fullName: refreshedUser.fullName,
      emailVerified: refreshedUser.emailVerified,
      roles: refreshedUser.roles,
      gender: refreshedUser.gender,
      grade: refreshedUser.grade ?? null,
      countryCode: refreshedUser.countryCode ?? 'KEN',
      curriculumCode: refreshedUser.curriculumCode ?? 'CBC',
      onboardingCompleted: refreshedUser.onboardingCompleted,
      stepUp: refreshedUser.stepUp,
      mustRotatePassword: refreshedUser.mustRotatePassword,
      isBreakGlass: refreshedUser.isBreakGlass
    });

    return {
      accessToken,
      user: {
        id: refreshedUser.id,
        schoolId: refreshedUser.schoolId,
        sessionId: request.user!.sessionId,
        email: refreshedUser.email,
        fullName: refreshedUser.fullName,
        emailVerified: refreshedUser.emailVerified,
        roles: refreshedUser.roles,
        gender: refreshedUser.gender,
        grade: refreshedUser.grade ?? null,
        countryCode: refreshedUser.countryCode ?? 'KEN',
        curriculumCode: refreshedUser.curriculumCode ?? 'CBC',
        onboardingCompleted: refreshedUser.onboardingCompleted
      }
    };
  });

  app.delete('/me/account', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = deleteAccountSchema.parse(request.body);
    if (body.confirmationText !== 'DELETE MY ACCOUNT') {
      return reply.badRequest('Confirmation text is invalid');
    }

    const currentUser = request.user!;
    if (
      currentUser.roles.includes('school_admin') ||
      currentUser.roles.includes('platform_admin') ||
      currentUser.isBreakGlass
    ) {
      return reply.forbidden('Admin and break-glass accounts cannot be self-deleted');
    }

    await withTransaction(async client => {
      const deletionRequest = await requestSelfServiceAccountDeletion(client, currentUser.id);
      await createAuditLog(
        client,
        currentUser.id,
        currentUser.schoolId,
        'auth.account_deletion.requested',
        {
          deletionRequestId: deletionRequest.id,
          scheduledDeletionAt: deletionRequest.scheduled_deletion_at.toISOString()
        },
        'user',
        currentUser.id
      );
      await revokeAllRefreshTokensForUser(client, currentUser.id);
    });

    return {
      deletionRequested: true,
      message: 'Account deletion requested. Your account and data will be deleted from our servers within 30 days.'
    };
  });

  app.get('/admin/schools', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const schools = await listSchools();
    return {
      schools: schools.map(serializeSchool)
    };
  });

  app.get('/admin/subscription-plans', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const plans = await listSubscriptionPlans(['weekly', 'monthly', 'annual']);
    return {
      plans: plans.map(plan =>
        serializePlan({
          code: plan.code,
          name: plan.name,
          billingCycle: plan.billing_cycle,
          priceKshCents: Number(plan.price_ksh_cents),
          isPopular: plan.code === 'monthly'
        })
      )
    };
  });

  app.post('/admin/parents/messages', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin', 'school_admin']);
    if (precondition) {
      return precondition;
    }

    const body = parentMessageSchema.parse(request.body);
    const allowedParents = (await listAdminUsers(request.user!))
      .filter(user => user.roles.includes('parent'))
      .filter(user => !body.parentIds?.length || body.parentIds.includes(user.id));

    if (!allowedParents.length) {
      return reply.notFound('No parent accounts matched this message scope');
    }

    const title = body.title || 'Message from Kitabu AI';
    const result = await withTransaction(async client => {
      let phoneDelivered = 0;
      const notificationIds: string[] = [];
      for (const parent of allowedParents) {
        let normalizedPhone: string | null = null;
        if (parent.phone) {
          try {
            normalizedPhone = formatKenyanPhoneNumber(parent.phone);
          } catch {
            normalizedPhone = null;
          }
        }

        const notification = await notifyUser(client, {
          userId: parent.id,
          type: 'parent.admin_message',
          title,
          body: body.message,
          forceInApp: true,
          metadata: {
            senderUserId: request.user!.id,
            senderEmail: request.user!.email
          },
          smsPhoneNumber: normalizedPhone ? `+${normalizedPhone}` : null,
          smsBody: `Kitabu AI: ${body.message.slice(0, 140)}`
        });

        if (notification.notificationId) {
          notificationIds.push(notification.notificationId);
        }
        if (notification.smsStatus === 'sent') {
          phoneDelivered += 1;
        }
      }

      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'admin.parents.message.sent', {
        parentCount: allowedParents.length,
        notificationIds,
        phoneDelivered
      });

      return { notificationIds, phoneDelivered };
    });

    return {
      delivered: result.notificationIds.length,
      phoneDelivered: result.phoneDelivered
    };
  });

  app.post('/admin/schools', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = schoolSchema.parse(request.body);
    const { availablePlanCodes, assignedPlanCode } = normalizeSchoolPlanSelection(
      body.availablePlanCodes,
      body.assignedPlanCode
    );
    const availablePlans = await listSubscriptionPlans(availablePlanCodes);
    const assignedPlan = availablePlans.find(plan => plan.code === assignedPlanCode);
    if (!assignedPlan || availablePlans.length !== availablePlanCodes.length) {
      return reply.badRequest('Assigned subscription package is invalid');
    }
    const planPricesKshCents = Object.fromEntries(availablePlans.map(plan => {
      const planCode = plan.code as SchoolBillingPlanCode;
      const requestedPriceKsh = body.planPricesKsh?.[planCode];
      const fallbackPriceKsh = planCode === assignedPlanCode && body.subscriptionPriceKsh !== null && body.subscriptionPriceKsh !== undefined
        ? body.subscriptionPriceKsh
        : Number(plan.price_ksh_cents) / 100;
      return [planCode, Math.round((requestedPriceKsh ?? fallbackPriceKsh) * 100)];
    }));

    const schoolId = await withTransaction(async client => {
      const createdSchoolId = await createSchool(client, {
        name: body.name,
        slug: slugifySchoolName(body.name),
        location: body.location,
        schoolType: body.schoolType ?? 'day_school',
        principal: body.principal,
        phone: body.phone,
        email: body.email,
        salesAgentUserId: body.salesAgentUserId ?? null,
        availableGrades: body.availableGrades,
        availablePlanCodes,
        planPricesKshCents,
        subscriptionPriceKshCents: planPricesKshCents[assignedPlanCode],
        assignedPlanId: assignedPlan.id,
        discountId: body.discountId ?? null
      });
      await createAuditLog(client, request.user!.id, createdSchoolId, 'admin.school.created', {
        assignedPlanCode,
        availablePlanCodes
      });
      return createdSchoolId;
    });

    const school = await findSchoolById(schoolId);
    return reply.status(201).send({
      school: school ? serializeSchool(school) : null
    });
  });

  app.patch('/admin/schools/:schoolId', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = schoolParamsSchema.parse(request.params);
    const body = schoolUpdateSchema.parse(request.body);
    const admin = await findUserByEmail(request.user!.email);
    if (!admin || !(await verifyPassword(body.adminPassword, admin.password_hash))) {
      await withTransaction(client => createAuditLog(client, request.user!.id, request.user!.schoolId, 'admin.school.update_password_failed', {
        schoolId: params.schoolId
      }));
      return reply.unauthorized('Admin password is incorrect');
    }
    const { availablePlanCodes, assignedPlanCode } = normalizeSchoolPlanSelection(
      body.availablePlanCodes,
      body.assignedPlanCode
    );
    const availablePlans = await listSubscriptionPlans(availablePlanCodes);
    const assignedPlan = availablePlans.find(plan => plan.code === assignedPlanCode);
    if (!assignedPlan || availablePlans.length !== availablePlanCodes.length) {
      return reply.badRequest('Assigned subscription package is invalid');
    }
    const planPricesKshCents = Object.fromEntries(availablePlans.map(plan => {
      const planCode = plan.code as SchoolBillingPlanCode;
      const requestedPriceKsh = body.planPricesKsh?.[planCode];
      const fallbackPriceKsh = planCode === assignedPlanCode && body.subscriptionPriceKsh !== null && body.subscriptionPriceKsh !== undefined
        ? body.subscriptionPriceKsh
        : Number(plan.price_ksh_cents) / 100;
      return [planCode, Math.round((requestedPriceKsh ?? fallbackPriceKsh) * 100)];
    }));

    await withTransaction(async client => {
      await updateSchool(client, params.schoolId, {
        name: body.name,
        slug: slugifySchoolName(body.name),
        location: body.location,
        schoolType: body.schoolType,
        principal: body.principal,
        phone: body.phone,
        email: body.email,
        salesAgentUserId: body.salesAgentUserId ?? null,
        availableGrades: body.availableGrades,
        availablePlanCodes,
        planPricesKshCents,
        subscriptionPriceKshCents: planPricesKshCents[assignedPlanCode],
        assignedPlanId: assignedPlan.id,
        discountId: body.discountId ?? null
      });
      await createAuditLog(client, request.user!.id, params.schoolId, 'admin.school.updated', {
        assignedPlanCode,
        availablePlanCodes
      });
    });

    const school = await findSchoolById(params.schoolId);
    return {
      school: school ? serializeSchool(school) : null
    };
  });

  app.patch('/admin/schools/:schoolId/pilot', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = schoolParamsSchema.parse(request.params);
    const body = schoolPilotSchema.parse(request.body);
    const existingSchool = await findSchoolById(params.schoolId);
    if (!existingSchool) {
      return reply.notFound('School not found');
    }

    await withTransaction(async client => {
      await updateSchoolPilot(client, params.schoolId, body);
      await createAuditLog(client, request.user!.id, params.schoolId, 'admin.school_pilot.updated', {
        status: body.status,
        onboardingStage: body.onboardingStage,
        targetStudents: body.targetStudents
      });
    });

    const school = await findSchoolById(params.schoolId);
    return { school: school ? serializeSchool(school) : null };
  });

  app.delete('/admin/schools/:schoolId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = schoolParamsSchema.parse(request.params);
    await withTransaction(async client => {
      await deleteSchool(client, params.schoolId);
      await createAuditLog(client, request.user!.id, params.schoolId, 'admin.school.deleted');
    });

    return { deleted: true };
  });

  app.get('/admin/discounts', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    return {
      discounts: await listSchoolDiscounts()
    };
  });

  app.post('/admin/discounts', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = schoolDiscountSchema.parse(request.body);
    const discountId = await withTransaction(async client => {
      const createdDiscountId = await createSchoolDiscount(client, body);
      await createAuditLog(client, request.user!.id, null, 'admin.discount.created', {
        discountId: createdDiscountId
      });
      return createdDiscountId;
    });

    return reply.status(201).send({ discountId });
  });

  app.patch('/admin/discounts/:discountId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = discountParamsSchema.parse(request.params);
    const body = schoolDiscountSchema.parse(request.body);
    await withTransaction(async client => {
      await updateSchoolDiscount(client, params.discountId, body);
      await createAuditLog(client, request.user!.id, null, 'admin.discount.updated', {
        discountId: params.discountId
      });
    });

    return { updated: true };
  });

  app.delete('/admin/discounts/:discountId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = discountParamsSchema.parse(request.params);
    await withTransaction(async client => {
      await deleteSchoolDiscount(client, params.discountId);
      await createAuditLog(client, request.user!.id, null, 'admin.discount.deleted', {
        discountId: params.discountId
      });
    });

    return { deleted: true };
  });

  app.get('/admin/announcements', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    return {
      announcements: await listBannerAnnouncements()
    };
  });

  app.post('/admin/announcements', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const body = announcementSchema.parse(request.body);
    const announcementId = await withTransaction(async client => {
      const createdAnnouncementId = await createBannerAnnouncement(client, {
        title: body.title,
        message: body.message,
        ctaLabel: body.ctaLabel ?? null,
        ctaTarget: body.ctaTarget,
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isActive: body.isActive
      });
      await createAuditLog(client, request.user!.id, null, 'admin.announcement.created', {
        announcementId: createdAnnouncementId
      });
      return createdAnnouncementId;
    });

    return reply.status(201).send({ announcementId });
  });

  app.patch('/admin/announcements/:announcementId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = announcementParamsSchema.parse(request.params);
    const body = announcementSchema.parse(request.body);
    await withTransaction(async client => {
      await updateBannerAnnouncement(client, params.announcementId, {
        title: body.title,
        message: body.message,
        ctaLabel: body.ctaLabel ?? null,
        ctaTarget: body.ctaTarget,
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isActive: body.isActive
      });
      await createAuditLog(client, request.user!.id, null, 'admin.announcement.updated', {
        announcementId: params.announcementId
      });
    });

    return { updated: true };
  });

  app.delete('/admin/announcements/:announcementId', async (request, reply) => {
    const precondition = await requireRoles(request, reply, ['platform_admin']);
    if (precondition) {
      return precondition;
    }

    const params = announcementParamsSchema.parse(request.params);
    await withTransaction(async client => {
      await deleteBannerAnnouncement(client, params.announcementId);
      await createAuditLog(client, request.user!.id, null, 'admin.announcement.deleted', {
        announcementId: params.announcementId
      });
    });

    return { deleted: true };
  });

  app.get('/billing/plans', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    if (isDemoStudentUser(request.user!)) {
      return {
        plans: [],
        school: null,
        trialOffer: null
      };
    }

    const [schoolPricing, hiddenTrialPlan, hasPaidBefore] = await Promise.all([
      findSchoolPricingForUser(request.user!.id),
      findSubscriptionPlanByCode('trial_monthly_1bob'),
      hasSuccessfulPayments(request.user!.id)
    ]);

    const isSchoolManaged =
      Boolean(schoolPricing) &&
      !request.user!.roles.includes('platform_admin') &&
      !request.user!.roles.includes('school_admin');

    const plans = isSchoolManaged && schoolPricing
      ? (await listSubscriptionPlans(schoolPricing.available_plan_codes)).map(plan => {
          const originalPriceKshCents = schoolManagedPlanPriceKshCents({
            planCode: plan.code,
            assignedPlanCode: schoolPricing.assigned_plan_code,
            assignedPlanPriceKshCents: Number(schoolPricing.assigned_plan_price_ksh_cents),
            standardPlanPriceKshCents: Number(plan.price_ksh_cents),
            planPricesKshCents: schoolPricing.plan_prices_ksh_cents
          });
          return serializePlan({
            code: plan.code,
            name: plan.name,
            billingCycle: plan.billing_cycle,
            priceKshCents: applyDiscount(originalPriceKshCents, {
              type: schoolPricing.discount_type,
              amount: schoolPricing.discount_amount
            }),
            originalPriceKshCents,
            isPopular: plan.code === 'monthly',
            isSchoolManaged: true,
            discountName: schoolPricing.discount_name
          });
        })
      : (await listSubscriptionPlans(getAllowedPlanCodesForUser(request.user!))).map(plan =>
          serializePlan({
            code: plan.code,
            name: plan.name,
            billingCycle: plan.billing_cycle,
            priceKshCents: Number(plan.price_ksh_cents),
            originalPriceKshCents: getPublicOriginalPriceKshCents(plan.code),
            isPopular: plan.code === 'monthly'
          })
        );

    return {
      plans,
      school: isSchoolManaged && schoolPricing ? serializeSchool(schoolPricing) : null,
      trialOffer:
        !hasPaidBefore && hiddenTrialPlan
          ? serializePlan({
              code: hiddenTrialPlan.code,
              name: 'Try for 1 Bob',
              billingCycle: hiddenTrialPlan.billing_cycle,
              priceKshCents: 100
            })
          : null
    };
  });

  app.get('/billing/subscription', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    if (isDemoStudentUser(request.user!)) {
      return {
        subscription: serializeDemoStudentSubscription(),
        savedMpesaPhoneNumber: null,
        maskedMpesaPhoneNumber: null,
        hasPaidBefore: true,
        school: null
      };
    }

    const [subscription, billingProfile, schoolPricing, hasPaidBefore] = await Promise.all([
      getActiveSubscription(request.user!.id),
      getBillingProfile(request.user!.id),
      findSchoolPricingForUser(request.user!.id),
      hasSuccessfulPayments(request.user!.id)
    ]);

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            code: subscription.plan_code,
            name: subscription.plan_name,
            billingCycle: subscription.billing_cycle,
            priceKsh: Number(subscription.price_ksh_cents) / 100,
            periodStart: subscription.period_start.toISOString(),
            periodEnd: subscription.period_end.toISOString(),
            status: subscription.status
          }
        : null,
      savedMpesaPhoneNumber: billingProfile?.mpesa_phone_number ?? null,
      maskedMpesaPhoneNumber: maskKenyanPhoneNumber(billingProfile?.mpesa_phone_number ?? null),
      hasPaidBefore,
      school: schoolPricing ? serializeSchool(schoolPricing) : null
    };
  });

  app.post('/billing/checkout/mpesa', {
    config: { rateLimit: { max: 6, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    if (isDemoStudentUser(request.user!)) {
      return reply.forbidden('Demo student account already has full access and does not require payment');
    }

    await withTransaction(async client => {
      await expirePendingPaymentRequests(client);
    });

    const body = mpesaCheckoutSchema.parse(request.body);
    const normalizedPhoneNumber = formatKenyanPhoneNumber(body.phoneNumber);
    const [plan, activeSubscription, schoolPricing, hasPaidBefore] = await Promise.all([
      findSubscriptionPlanByCode(body.planCode),
      getActiveSubscription(request.user!.id),
      findSchoolPricingForUser(request.user!.id),
      hasSuccessfulPayments(request.user!.id)
    ]);

    if (!plan) {
      return reply.notFound('Subscription plan not found');
    }

    const isAdminUser =
      request.user!.roles.includes('platform_admin') || request.user!.roles.includes('school_admin');
    const isSchoolManaged = Boolean(schoolPricing) && !isAdminUser;

    let amountKshCents = Number(plan.price_ksh_cents);

    if (body.planCode === 'trial_monthly_1bob') {
      if (hasPaidBefore || activeSubscription) {
        return reply.forbidden('The 1 bob trial is only available before your first subscription payment');
      }
      amountKshCents = 100;
    } else if (isSchoolManaged && schoolPricing) {
      if (!schoolPricing.available_plan_codes.includes(body.planCode)) {
        return reply.forbidden('That plan is not available for your school account');
      }
      const originalPriceKshCents = schoolManagedPlanPriceKshCents({
        planCode: body.planCode,
        assignedPlanCode: schoolPricing.assigned_plan_code,
        assignedPlanPriceKshCents: Number(schoolPricing.assigned_plan_price_ksh_cents),
        standardPlanPriceKshCents: Number(plan.price_ksh_cents),
        planPricesKshCents: schoolPricing.plan_prices_ksh_cents
      });
      amountKshCents = applyDiscount(originalPriceKshCents, {
        type: schoolPricing.discount_type,
        amount: schoolPricing.discount_amount
      });
    } else {
      const allowedPlans = getAllowedPlanCodesForUser(request.user!);
      if (!allowedPlans.includes(body.planCode)) {
        return reply.forbidden('That plan is not available for this account');
      }
    }

    if (activeSubscription?.plan_code === plan.code && activeSubscription.period_end > new Date()) {
      return {
        alreadySubscribed: true,
        subscription: {
          id: activeSubscription.id,
          code: activeSubscription.plan_code,
          periodEnd: activeSubscription.period_end.toISOString()
        }
      };
    }

    const expiresAt = new Date(Date.now() + appConfig.KITABU_MPESA_STK_TIMEOUT_MINUTES * 60 * 1000);
    const paymentRequestId = await withTransaction(async client => {
      const requestId = await createPaymentRequest(client, {
        userId: request.user!.id,
        planId: plan.id,
        planCode: plan.code,
        amountKshCents,
        phoneNumber: normalizedPhoneNumber,
        returnTo: body.returnTo,
        expiresAt
      });
      await upsertBillingProfile(client, request.user!.id, normalizedPhoneNumber);
      await createAuditLog(client, request.user!.id, request.user!.schoolId, 'billing.checkout.started', {
        planCode: plan.code,
        paymentRequestId: requestId,
        returnTo: body.returnTo,
        amountKshCents
      });
      return requestId;
    });

    try {
      const stkResponse = await initiateStkPush({
        amountKsh: amountKshCents / 100,
        phoneNumber: normalizedPhoneNumber,
        reference: buildSubscriptionReference(request.user!.id, plan.code),
        description: appConfig.KITABU_MPESA_TRANSACTION_DESC
      });

      await withTransaction(async client => {
        await markPaymentRequestInitiated(
          client,
          paymentRequestId,
          stkResponse.merchantRequestId,
          stkResponse.checkoutRequestId
        );
      });

      return {
        paymentRequestId,
        checkoutRequestId: stkResponse.checkoutRequestId,
        customerMessage: stkResponse.customerMessage,
        expiresAt: expiresAt.toISOString(),
        maskedMpesaPhoneNumber: maskKenyanPhoneNumber(normalizedPhoneNumber)
      };
    } catch (error) {
      const resultDesc = error instanceof Error ? error.message : 'Unable to initiate STK push';
      const providerError = error instanceof MpesaProviderError ? error : null;

      request.log.error({
        err: error,
        paymentRequestId,
        providerStatus: providerError?.providerStatus,
        providerResponse: providerError?.providerResponse
      }, 'M-Pesa checkout initiation failed');

      await withTransaction(async client => {
        await markPaymentRequestFailed(client, paymentRequestId, {
          status: 'failed',
          resultCode: null,
          resultDesc,
          rawCallback: {
            stage: 'initiation',
            message: resultDesc,
            providerStatus: providerError?.providerStatus,
            providerResponse: providerError?.providerResponse
          }
        });
      });

      if (providerError) {
        return reply.serviceUnavailable('M-Pesa checkout is temporarily unavailable. Please try again shortly.');
      }

      return reply.serviceUnavailable('M-Pesa checkout is not configured. Please contact support.');
    }
  });

  app.get('/billing/checkout/:paymentRequestId', async (request, reply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const params = checkoutParamsSchema.parse(request.params);
    const paymentRequest = await findPaymentRequestByIdForUser(params.paymentRequestId, request.user!.id);

    if (!paymentRequest) {
      return reply.notFound('Checkout request not found');
    }

    const subscription = paymentRequest.status === 'paid'
      ? await getActiveSubscription(request.user!.id)
      : null;

    return {
      paymentRequestId: paymentRequest.id,
      status: paymentRequest.status,
      returnTo: paymentRequest.return_to,
      phoneNumber: paymentRequest.phone_number,
      maskedPhoneNumber: maskKenyanPhoneNumber(paymentRequest.phone_number),
      resultCode: paymentRequest.result_code,
      resultDescription: paymentRequest.result_desc,
      receiptNumber: paymentRequest.mpesa_receipt_number,
      expiresAt: paymentRequest.expires_at.toISOString(),
      subscription: subscription
        ? {
            code: subscription.plan_code,
            name: subscription.plan_name,
            periodEnd: subscription.period_end.toISOString()
          }
        : null
    };
  });

  app.post('/billing/mpesa/callback', async (request, reply) => {
    const payload = mpesaCallbackSchema.parse(request.body);
    const callback = payload.Body.stkCallback;
    const items = callback.CallbackMetadata?.Item ?? [];
    const paymentRequest = await findPaymentRequestByCheckoutRequestId(callback.CheckoutRequestID);

    if (!paymentRequest) {
      request.log.warn({ checkoutRequestId: callback.CheckoutRequestID }, 'M-Pesa callback did not match a payment request');
      return { accepted: true };
    }

    if (paymentRequest.status === 'paid') {
      return { accepted: true };
    }

    const receiptNumber = getCallbackItemValue(items, 'MpesaReceiptNumber');

    await withTransaction(async client => {
      if (callback.ResultCode === 0) {
        const plan = await findSubscriptionPlanByCode(paymentRequest.plan_code);
        if (!plan) {
          throw new Error('Subscription plan missing for successful payment');
        }

        const periodStart = new Date();
        const periodEnd = getPlanPeriodEnd(periodStart, plan.billing_cycle);

        await markPaymentRequestSuccessful(client, paymentRequest.id, {
          receiptNumber: typeof receiptNumber === 'string' ? receiptNumber : null,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          rawCallback: payload as Record<string, unknown>
        });

        await replaceActiveSubscription(client, {
          userId: paymentRequest.user_id,
          planId: paymentRequest.plan_id,
          billingCycle: plan.billing_cycle,
          priceKshCents: Number(paymentRequest.amount_ksh_cents),
          periodStart,
          periodEnd
        });

        await createAuditLog(client, paymentRequest.user_id, null, 'billing.checkout.completed', {
          paymentRequestId: paymentRequest.id,
          planCode: paymentRequest.plan_code,
          receiptNumber: typeof receiptNumber === 'string' ? receiptNumber : null
        });
        await notifyUser(client, {
          userId: paymentRequest.user_id,
          type: 'billing.payment_succeeded',
          title: 'Payment received',
          body: `Your ${plan.name} subscription is active until ${periodEnd.toISOString().slice(0, 10)}.`,
          smsPhoneNumber: paymentRequest.phone_number,
          smsBody: `Kitabu AI: Payment received. Your ${plan.name} subscription is active until ${periodEnd.toISOString().slice(0, 10)}.`,
          metadata: {
            paymentRequestId: paymentRequest.id,
            planCode: paymentRequest.plan_code,
            receiptNumber: typeof receiptNumber === 'string' ? receiptNumber : null,
            periodEnd: periodEnd.toISOString()
          }
        });
      } else {
        const failureStatus = callback.ResultCode === 1032 ? 'cancelled' : 'failed';
        await markPaymentRequestFailed(client, paymentRequest.id, {
          status: failureStatus,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
          rawCallback: payload as Record<string, unknown>
        });
        await createAuditLog(client, paymentRequest.user_id, null, 'billing.checkout.failed', {
          paymentRequestId: paymentRequest.id,
          planCode: paymentRequest.plan_code,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc
        });
        await notifyUser(client, {
          userId: paymentRequest.user_id,
          type: failureStatus === 'cancelled' ? 'billing.payment_cancelled' : 'billing.payment_failed',
          title: failureStatus === 'cancelled' ? 'Payment cancelled' : 'Payment failed',
          body:
            failureStatus === 'cancelled'
              ? 'Your M-Pesa checkout was cancelled. You can try again when ready.'
              : 'Your M-Pesa checkout did not complete. Please try again or use a different number.',
          smsPhoneNumber: paymentRequest.phone_number,
          smsBody:
            failureStatus === 'cancelled'
              ? 'Kitabu AI: Your M-Pesa checkout was cancelled. You can try again when ready.'
              : 'Kitabu AI: Your M-Pesa checkout did not complete. Please try again or use a different number.',
          metadata: {
            paymentRequestId: paymentRequest.id,
            planCode: paymentRequest.plan_code,
            resultCode: callback.ResultCode,
            resultDesc: callback.ResultDesc
          }
        });
      }
    });

    if (appConfig.KITABU_MUFASA_TELEMETRY_URL && appConfig.KITABU_MUFASA_TELEMETRY_HMAC_SECRET && appConfig.KITABU_MUFASA_PHONE_HMAC_SECRET) {
      try {
        const telemetry = buildPaymentTelemetry({
          paymentRequestId: paymentRequest.id,
          succeeded: callback.ResultCode === 0,
          occurredAt: new Date().toISOString(),
          accountId: paymentRequest.user_id,
          phone: paymentRequest.phone_number,
          amountKshCents: Number(paymentRequest.amount_ksh_cents),
          method: 'mpesa',
          providerEventId: typeof receiptNumber === 'string' ? receiptNumber : callback.CheckoutRequestID,
          phoneHmacSecret: appConfig.KITABU_MUFASA_PHONE_HMAC_SECRET
        });
        await emitMufasaTelemetry(telemetry, { endpoint: appConfig.KITABU_MUFASA_TELEMETRY_URL, hmacSecret: appConfig.KITABU_MUFASA_TELEMETRY_HMAC_SECRET, timeoutMs: appConfig.KITABU_MUFASA_TELEMETRY_TIMEOUT_MS });
      } catch (error) {
        request.log.error({ paymentRequestId: paymentRequest.id, error: error instanceof Error ? error.message : 'unknown' }, 'MUFASA payment telemetry delivery failed');
      }
    } else {
      request.log.warn({ paymentRequestId: paymentRequest.id }, 'MUFASA payment telemetry is not configured');
    }

    return { accepted: true };
  });

  app.get('/admin/analytics/ai-usage', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW
      }
    }
  }, async (request, reply) => {
    const needsStepUp = request.user?.roles.includes('platform_admin') && !request.user.roles.includes('school_admin');
    const precondition = await requireRoles(request, reply, ['school_admin', 'platform_admin'], {
      requireStepUp: needsStepUp
    });
    if (precondition) {
      return precondition;
    }
    const schoolContextError = await requireSchoolContext(request, reply, { allowPlatformAdmin: true });
    if (schoolContextError) {
      return;
    }
    return getAdminAiAnalytics(request.user!);
  });

  app.get('/admin/analytics/subject-engagement', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW
      }
    }
  }, async (request, reply) => {
    const needsStepUp = request.user?.roles.includes('platform_admin') && !request.user.roles.includes('school_admin');
    const precondition = await requireRoles(request, reply, ['school_admin', 'platform_admin'], {
      requireStepUp: needsStepUp
    });
    if (precondition) {
      return precondition;
    }
    const schoolContextError = await requireSchoolContext(request, reply, { allowPlatformAdmin: true });
    if (schoolContextError) {
      return;
    }
    const query = subjectEngagementQuerySchema.parse(request.query);
    return getAdminSubjectEngagementAnalytics(request.user!, query);
  });

  app.get('/admin/analytics/onboarding', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW
      }
    }
  }, async (request, reply) => {
    const needsStepUp = request.user?.roles.includes('platform_admin') && !request.user.roles.includes('school_admin');
    const precondition = await requireRoles(request, reply, ['school_admin', 'platform_admin'], {
      requireStepUp: needsStepUp
    });
    if (precondition) {
      return precondition;
    }
    const schoolContextError = await requireSchoolContext(request, reply, { allowPlatformAdmin: true });
    if (schoolContextError) {
      return;
    }
    return getAdminOnboardingAnalytics(request.user!);
  });

  app.get('/admin/analytics/billing', {
    config: {
      rateLimit: {
        max: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_ADMIN_ANALYTICS_RATE_LIMIT_WINDOW
      }
    }
  }, async (request, reply) => {
    const needsStepUp = request.user?.roles.includes('platform_admin') && !request.user.roles.includes('school_admin');
    const precondition = await requireRoles(request, reply, ['school_admin', 'platform_admin'], {
      requireStepUp: needsStepUp
    });
    if (precondition) {
      return precondition;
    }
    const schoolContextError = await requireSchoolContext(request, reply, { allowPlatformAdmin: true });
    if (schoolContextError) {
      return;
    }
    return getBillingAnalytics(request.user!);
  });

  const generateTextHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }
    const body = generateTextSchema.parse(request.body);

    const result = await runSubscriptionScopedAiText({
      request,
      reply,
      body
    });

    if (result.error || !result.text) {
      return result.error;
    }

    return { text: result.text, generation: result.generation };
  };

  const transcribeAudioHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = transcribeAudioSchema.parse(request.body);
    const result = await runSubscriptionScopedAudioTranscription({
      request,
      reply,
      body
    });

    if (result.error) {
      return result.error;
    }

    return { text: result.text ?? '' };
  };

  const synthesizeSpeechHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const authError = await requireAuthenticated(request, reply);
    if (authError) {
      return;
    }

    const body = synthesizeSpeechSchema.parse(request.body);
    const result = await runSubscriptionScopedSpeechSynthesis({
      request,
      reply,
      body
    });

    if (result.error || !result.audio) {
      return result.error;
    }

    return result.audio;
  };

  const aiGenerationRateLimit = {
    config: {
      rateLimit: {
        max: appConfig.KITABU_AI_RATE_LIMIT_MAX,
        timeWindow: appConfig.KITABU_AI_RATE_LIMIT_WINDOW,
        keyGenerator: (request: FastifyRequest) =>
          request.user?.id ? `ai-user:${request.user.id}` : `ai-ip:${request.ip}`
      }
    }
  };

  app.post('/generate-text', aiGenerationRateLimit, generateTextHandler);
  app.post('/ai/generate-text', aiGenerationRateLimit, generateTextHandler);
  app.post('/transcribe-audio', aiGenerationRateLimit, transcribeAudioHandler);
  app.post('/ai/transcribe-audio', aiGenerationRateLimit, transcribeAudioHandler);
  app.post('/synthesize-speech', aiGenerationRateLimit, synthesizeSpeechHandler);
  app.post('/ai/synthesize-speech', aiGenerationRateLimit, synthesizeSpeechHandler);

  return app;
}
