import { Alert, AppState, BackHandler, Linking, Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  INITIAL_ASSIGNMENTS,
  INITIAL_BOOKS,
  INITIAL_CURRICULUM_DATA,
  INITIAL_FLASHCARDS,
  INITIAL_PARENT_CHILDREN,
  INITIAL_PODCASTS,
  INITIAL_QUIZ_QUESTIONS,
  INITIAL_SCHOOLS,
  INITIAL_SUBMITTED_ASSIGNMENTS,
  INITIAL_SUBMISSIONS_BY_ASSIGNMENT,
  INITIAL_TEACHER_STUDENTS,
  INITIAL_USER_PROFILE,
  SUBJECTS,
} from '../data/mockData';
import { DEFAULT_GRADE } from '../constants/grades';
import {
  countryCodeForName,
  countryNameForCode,
  curriculumCodeForCountry,
} from '../constants/locations';
import {
  getBillingPlans,
  getBillingStatus,
  getMpesaCheckoutStatus,
  startMpesaCheckout,
} from '../services/billingService';
import {
  clearSavedLoginPassword,
  completeAccountOnboarding,
  confirmEmailVerificationToken,
  deleteMyAccount,
  loadSavedLoginCredentials,
  loadStoredAuthSession,
  loginWithPassword,
  persistAuthSession,
  requestPhoneAuthCode,
  requestEmailVerification,
  refreshAccessSession,
  restoreStoredAuthSession,
  signupWithPassword,
  verifyPhoneAuthCode,
  authenticateWithGoogleToken,
} from '../services/authService';
import { requestGoogleIdToken } from '../services/googleAuthService';
import { areExternalPaymentsEnabled } from '../services/runtimeConfig';
import {
  createAdminAnnouncement,
  createAdminDiscount,
  createAdminSchool,
  deleteAdminAnnouncement,
  deleteAdminDiscount,
  deleteAdminSchool,
  getAdminAiAnalytics,
  getAdminAnnouncements,
  getAdminBillingAnalytics,
  getAdminDiscounts,
  getAdminSchools,
  getAdminSubjectEngagementAnalytics,
  getAdminSubscriptionPlans,
  getAdminUsers,
  getDashboardBanner,
  getSchools,
  updateAdminAnnouncement,
  updateAdminDiscount,
  updateAdminSchool,
  updateAdminSchoolPilot,
} from '../services/appDataService';
import { askHomeworkHelper, generateQuizData } from '../services/aiService';
import {
  downloadBookForOffline,
  getLibraryBooks,
  getLearningPodcasts,
  removeDownloadedBookFiles,
} from '../services/contentService';
import {
  getCurriculumForGrade,
  importCurriculumPdf,
  saveCurriculumSubject,
} from '../services/curriculumService';
import { getSubjectLearningPath } from '../features/progressiveLearning/api/progressiveLearningService';
import type {
  LearningPathNode,
  SubjectLearningPath,
} from '../features/progressiveLearning/types';
import {
  createTeacherAssignment as createTeacherAssignmentRequest,
  getStudentAssignments,
  getTeacherAssignments,
  getTeacherStudents,
  saveTeacherScope,
  submitStudentAssignment as submitStudentAssignmentRequest,
} from '../services/teacherService';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { registerPushTokenForAuthenticatedUser } from '../services/pushNotifications';
import { markPresenceOffline, markPresenceOnline } from '../services/presenceService';
import {
  getOnboardingDiagnosticStatus,
  getProgressiveDiagnosticStatus,
} from '../services/diagnosticService';
import { completeReview as completeSpacedReview, getDueReviews } from '../services/learningService';
import {
  getParentDashboard,
  linkParentChild,
  unlinkParentChild,
} from '../services/parentService';
import {
  getWeeklyExam,
  startWeeklyExam,
  submitWeeklyExam as submitWeeklyExamRequest,
} from '../services/weeklyExamService';
import { focusModeBridge } from '../services/nativeBridges';
import { loadJson, saveJson } from '../services/storage';
import { triggerHaptic } from '../services/haptics';
import {
  getSubjectRecommendations,
  recordSubjectRecommendationEvents,
  saveSubjectDisplayPreferences,
  SubjectRecommendationItem,
  SubjectRecommendationPayload,
} from '../services/subjectRecommendationService';
import {
  AdminPortalUser,
  AdminAiAnalytics,
  AdminBillingAnalytics,
  AdminSubjectEngagementAnalytics,
  AppNotification,
  Assignment,
  Attachment,
  BannerAnnouncement,
  BillingPlan,
  BillingPlanCode,
  BillingStatus,
  AuthRole,
  AuthSession,
  DashboardBanner,
  DueReview,
  GenderOption,
  Book,
  ChatMessage,
  CurriculumSubjectBundle,
  CurriculumSelectorOption,
  Flashcard,
  LearningStrand,
  Podcast,
  ParentChildSummary,
  PublicSignupRole,
  Question,
  QuizConfig,
  QuizGenerationProgress,
  SchoolData,
  StudentPerformance,
  StudentSubmission,
  SubStrand,
  Subject,
  OnboardingAchievementKey,
  OnboardingConcernKey,
  OnboardingGoalKey,
  OnboardingInterestKey,
  OnboardingLanguageCode,
  OnboardingMascotKey,
  OnboardingNeedKey,
  OnboardingVoiceName,
  SubmittedAssignment,
  UserProfile,
  ViewState,
  WeeklyExamPayload,
  SchoolDiscount,
} from '../types/app';

const DEMO_STUDENT_EMAIL = 'student@kitabu.ai';
const DEMO_PARENT_EMAIL = 'parent@kitabu.ai';
const DEMO_TEACHER_EMAIL = 'teacher@kitabu.ai';
const DEMO_ACCOUNT_PASSWORD = 'Password123!';
const DEMO_ACCOUNT_EMAILS = {
  student: DEMO_STUDENT_EMAIL,
  parent: DEMO_PARENT_EMAIL,
  teacher: DEMO_TEACHER_EMAIL,
} as const;
type LastUsedAuthRole = keyof typeof DEMO_ACCOUNT_EMAILS;
const ADMIN_LOGIN_EMAIL = 'admin@kitabu.ai';
const STORAGE_KEYS = {
  profile: 'kitabu_native_profile',
  lastUsedAuthRole: 'kitabu_last_used_auth_role',
  optionalPhoneNumber: 'kitabu_optional_phone_number',
  tryOneBobOfferSeenAt: 'kitabu_try_one_bob_offer_seen_at',
  focusMode: 'kitabu_focus_mode',
  downloadedBooks: 'kitabu_downloaded_books',
  onboardingPreferences: 'kitabu_onboarding_preferences',
};

function isLastUsedAuthRole(value: unknown): value is LastUsedAuthRole {
  return value === 'student' || value === 'teacher' || value === 'parent';
}

function resolveLastUsedAuthRole(roles: AuthRole[]): LastUsedAuthRole | null {
  if (roles.includes('teacher')) return 'teacher';
  if (roles.includes('parent')) return 'parent';
  if (roles.includes('student')) return 'student';
  return null;
}
const MAX_DASHBOARD_SUBJECTS = 5;
const TRY_ONE_BOB_SUPPRESSION_MS = 90 * 24 * 60 * 60 * 1000;
const PAYMENT_MODAL_TRANSITION_DELAY_MS = Platform.OS === 'ios' ? 350 : 80;
const DEFAULT_FOCUS_MODE_LIMIT_SECONDS = 7200;
const DEFAULT_DASHBOARD_SUBJECT_IDS = SUBJECTS.slice(0, MAX_DASHBOARD_SUBJECTS).map(
  subject => subject.id,
);

const SUBJECT_FALLBACK_COLORS: Array<[string, string]> = [
  ['#2563EB', '#4338CA'],
  ['#059669', '#0F766E'],
  ['#D97706', '#C2410C'],
  ['#DC2626', '#BE123C'],
  ['#F97316', '#15803D'],
];

const LOWER_PRIMARY_SUBJECT_ID_ALIASES: Record<string, string> = {
  math: 'mathematics',
  mathematics: 'mathematics',
  science: 'environmental',
  environmental: 'environmental',
  creative_arts: 'creative_activities',
  creative_activities: 'creative_activities',
};

const CURRICULUM_SUBJECT_COLORS: Record<string, [string, string]> = {
  mathematics: ['#EA7A0A', '#3F8B45'],
  english: ['#3569E8', '#5846D8'],
  kiswahili: ['#E47A0B', '#D75B2B'],
  environmental: ['#239B7C', '#138075'],
  creative_activities: ['#B54BE2', '#E66A79'],
  cre: ['#2F8B57', '#1E6C47'],
  ire: ['#178A83', '#136A66'],
  hre: ['#7A56C9', '#5F3EB0'],
  indigenous_languages: ['#C25135', '#9C3A2A'],
  hygiene_nutrition: ['#E34B62', '#C82F52'],
};

function normalizeDashboardSubjectIdForGrade(subjectId: string, grade: string) {
  return ['Grade 1', 'Grade 2', 'Grade 3'].includes(grade)
    ? LOWER_PRIMARY_SUBJECT_ID_ALIASES[subjectId] ?? subjectId
    : subjectId;
}

function subjectFromCurriculumBundle(bundle: CurriculumSubjectBundle, index: number): Subject {
  const known = SUBJECTS.find(subject => subject.id === bundle.subjectCode);
  if (known) return { ...known, name: bundle.subjectDisplayName };
  const colors = CURRICULUM_SUBJECT_COLORS[bundle.subjectCode]
    ?? SUBJECT_FALLBACK_COLORS[index % SUBJECT_FALLBACK_COLORS.length];
  return {
    id: bundle.subjectCode,
    name: bundle.subjectDisplayName,
    colorFrom: colors[0],
    colorTo: colors[1],
  };
}

function subjectFromRecommendation(item: SubjectRecommendationItem, index: number): Subject {
  const knownSubject = SUBJECTS.find(subject => subject.id === item.subjectId);
  if (knownSubject) return knownSubject;

  const colors = SUBJECT_FALLBACK_COLORS[index % SUBJECT_FALLBACK_COLORS.length];
  return {
    id: item.subjectId,
    name: item.subjectName,
    colorFrom: colors[0],
    colorTo: colors[1],
  };
}

type OnboardingSignupMethod = 'email' | 'phone' | 'google';

type OnboardingSignupInput = {
  role?: PublicSignupRole;
  name?: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  signupEmail?: string;
  phone?: string;
  signupPhone?: string;
  signupOtp?: string;
  password?: string;
  signupPassword?: string;
  signupMethod?: OnboardingSignupMethod;
  gender?: GenderOption;
  grade?: string;
  county?: string;
  school?: string;
  schoolId?: string | null;
  countryCode?: string;
  mascot?: OnboardingMascotKey;
  mascotKey?: OnboardingMascotKey;
  subjects?: string[];
  selectedSubjectIds?: string[];
  teachGrades?: string[];
  teacherGradeIds?: string[];
  mpesaPhoneNumber?: string;
};

interface FocusModeSnapshot {
  focusModeActive: boolean;
  sessionStartedAt: number | null;
  activeSecondsUsed: number;
  dailyLimitSeconds: number;
  sessionExpired: boolean;
  studentProfile: UserProfile | null;
  setupCompleted: boolean;
}

interface DownloadedBooksSnapshot {
  ids: string[];
  books: Book[];
}

interface OnboardingPreferencesSnapshot {
  mascot?: OnboardingMascotKey;
  mascotKey?: OnboardingMascotKey;
  selectedSubjectIds?: string[];
}

interface RouteSnapshot {
  view: ViewState;
  currentGrade: string;
  adminSelectedGrade: string;
  selectedSubjectId: string | null;
  selectedAssignmentId: string | null;
  selectedSubStrandId: string | null;
  selectedProgressiveLessonKey: string | null;
  selectedProgressiveLessonVersion: number | null;
  selectedBookId: string | null;
  previewBookId: string | null;
  activeStrandIndex: number;
  quizSource: 'subject' | 'quiz_me';
  brainTeaseCompleted: boolean;
  liveAudioReturnView: ViewState;
}

type PendingSubscriptionIntent =
  | { kind: 'manage_subscription'; snapshot: RouteSnapshot }
  | { kind: 'chat_message'; snapshot: RouteSnapshot; text: string; attachment?: Attachment }
  | { kind: 'start_assignment'; snapshot: RouteSnapshot; assignmentId: string }
  | { kind: 'start_subject_quiz'; snapshot: RouteSnapshot }
  | { kind: 'start_subject_brain_tease'; snapshot: RouteSnapshot }
  | {
      kind: 'start_progressive_lesson';
      snapshot: RouteSnapshot;
      lessonKey: string;
      lessonVersion: number;
    }
  | { kind: 'generate_quiz_me'; snapshot: RouteSnapshot; config: QuizConfig };

interface QueuedCheckoutLaunch {
  intent: PendingSubscriptionIntent;
  planCode: BillingPlanCode | null;
}

type IncomingLink =
  | { kind: 'email-verification-token'; token: string }
  | { kind: 'email-verified'; email: string | null }
  | { kind: 'password-reset-complete' }
  | { kind: 'unknown' };

export function parseIncomingLink(url: string): IncomingLink {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const path = parsed.pathname.replace(/^\/+/, '');

    if (parsed.protocol === 'https:' && host === 'app.kitabu.ai' && path === 'verify-email') {
      const token = parsed.searchParams.get('token');
      if (token) {
        return {
          kind: 'email-verification-token',
          token,
        };
      }
    }

    if (host === 'auth' && path === 'email-verified') {
      return {
        kind: 'email-verified',
        email: parsed.searchParams.get('email'),
      };
    }

    if (host === 'auth' && path === 'password-reset-complete') {
      return {
        kind: 'password-reset-complete',
      };
    }
  } catch {
    return { kind: 'unknown' };
  }

  return { kind: 'unknown' };
}

function hasRole(roles: AuthRole[], role: AuthRole) {
  return roles.includes(role);
}

function isAdminRole(roles: AuthRole[]) {
  return hasRole(roles, 'school_admin') || hasRole(roles, 'platform_admin');
}

function isKnownAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === ADMIN_LOGIN_EMAIL;
}

function isTeacherRole(roles: AuthRole[]) {
  return hasRole(roles, 'teacher');
}

function isParentRole(roles: AuthRole[]) {
  return hasRole(roles, 'parent');
}

function isOnboardingMascotKey(value: unknown): value is OnboardingMascotKey {
  return value === 'lion' || value === 'rabbit' || value === 'elephant';
}

function getDefaultMascotKeyForRoles(roles: AuthRole[]): OnboardingMascotKey {
  if (isTeacherRole(roles)) {
    return 'lion';
  }

  if (isParentRole(roles)) {
    return 'elephant';
  }

  return 'rabbit';
}

export function getPrimaryHomeView(roles: AuthRole[], email?: string | null): ViewState {
  if (isAdminRole(roles) || isKnownAdminEmail(email)) {
    return 'admin_portal';
  }

  if (isTeacherRole(roles) && !isAdminRole(roles)) {
    return 'teachers_portal';
  }

  if (isParentRole(roles)) {
    return 'parent_dashboard';
  }

  return 'dashboard';
}

function isFocusModeBlockedView(view: ViewState) {
  return view === 'admin_portal' || view === 'teachers_portal' || view === 'parent_dashboard';
}

function getFocusModeErrorCode(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';
  return code;
}

function isFocusModeSetupError(error: unknown) {
  const code = getFocusModeErrorCode(error);
  return (
    code === 'screen_pinning_disabled' ||
    code === 'screen_pinning_unsupported' ||
    code === 'device_credential_unavailable'
  );
}

function getFocusModeErrorMessage(error: unknown) {
  const code = getFocusModeErrorCode(error);
  if (code === 'screen_pinning_disabled') {
    return 'Turn on App Pinning to keep KITABU on screen.';
  }

  if (code === 'screen_pinning_unsupported') {
    return 'Focus Mode is available on Android phones with App Pinning support.';
  }

  if (code === 'device_credential_unavailable') {
    return 'Set up a phone PIN, pattern, or password in Android settings before starting Focus Mode.';
  }

  if (code === 'device_credential_cancelled') {
    return 'Enter the parent PIN to start Focus Mode.';
  }

  return error instanceof Error ? error.message : 'Unable to start Focus Mode.';
}

function mapAuthSessionToProfile(session: AuthSession): UserProfile {
  const { user } = session;
  const isAdmin = isAdminRole(user.roles);
  const isTeacher = isTeacherRole(user.roles);
  const isParent = isParentRole(user.roles);

  return {
    ...INITIAL_USER_PROFILE,
    name: user.fullName,
    email: user.email.endsWith('@accounts.kitabu.invalid') ? '' : user.email,
    phone: user.phoneNumber ?? '',
    school: INITIAL_USER_PROFILE.school,
    role: isAdmin
      ? 'Platform Admin'
      : isTeacher
        ? 'Teacher Account'
        : isParent
          ? 'Parent Account'
          : 'Student Account',
    status: user.phoneVerified
      ? 'Phone verified'
      : user.emailVerified
        ? 'Email verified'
        : 'Email not verified',
    grade: isTeacher || isAdmin ? undefined : user.grade || INITIAL_USER_PROFILE.grade,
    country: countryNameForCode(user.countryCode),
    countryCode: countryCodeForName(countryNameForCode(user.countryCode)),
    curriculumCode: user.curriculumCode || curriculumCodeForCountry(user.countryCode),
    gender:
      user.gender === 'male'
        ? 'male'
        : user.gender === 'female'
          ? 'female'
          : 'Not Specified',
    avatar: user.email.includes('teacher')
      ? 'avatar-afro-boy'
      : user.email.includes('admin')
        ? 'avatar-afro-girl'
        : 'avatar-afro-boy',
  };
}

function mergeStoredProfileWithAuthSession(storedProfile: UserProfile, session: AuthSession) {
  const authProfile = mapAuthSessionToProfile(session);
  const sameAccount =
    Boolean(storedProfile.email && authProfile.email) &&
    storedProfile.email?.toLowerCase() === authProfile.email?.toLowerCase();

  if (!sameAccount) {
    return authProfile;
  }

  return {
    ...authProfile,
    ...storedProfile,
    role: authProfile.role,
    status: authProfile.status,
    avatar: storedProfile.avatar || authProfile.avatar,
  };
}

function mergeCurriculumBundles(
  previous: Record<string, LearningStrand[]>,
  grade: string,
  bundles: CurriculumSubjectBundle[],
) {
  const next = { ...previous };

  Object.keys(next).forEach(key => {
    if (key.startsWith(`${grade}-`)) {
      delete next[key];
    }
  });

  bundles.forEach(bundle => {
    next[`${grade}-${bundle.subjectId}`] = bundle.strands;
  });

  return next;
}

function mapParentChildToStudentProfile(child: ParentChildSummary): UserProfile {
  return {
    ...INITIAL_USER_PROFILE,
    name: child.name,
    email: child.email,
    grade: child.grade,
    school: child.school,
    role: 'Student Account',
    status: child.last_active || 'Student preview',
    avatar: child.name,
  };
}

function downloadedBooksStorageKey(userId: string) {
  return `${STORAGE_KEYS.downloadedBooks}:${userId}`;
}

async function loadDownloadedBooksSnapshot(userId: string): Promise<DownloadedBooksSnapshot> {
  return loadJson<DownloadedBooksSnapshot>(downloadedBooksStorageKey(userId), {
    books: [],
    ids: [],
  });
}

function mergeRemoteAndCachedBooks(remoteBooks: Book[], cachedBooks: Book[]) {
  const remoteIds = new Set(remoteBooks.map(book => book.id));
  return [
    ...remoteBooks,
    ...cachedBooks.filter(book => !remoteIds.has(book.id)),
  ];
}

export function useKitabuApp() {
  const externalPaymentsEnabled = areExternalPaymentsEnabled();
  const [isReady, setIsReady] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authEntryScreen, setAuthEntryScreen] = useState<'intro' | 'auth'>('intro');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRole, setSignupRole] = useState<PublicSignupRole | null>(null);
  const [lastUsedAuthRole, setLastUsedAuthRole] = useState<LastUsedAuthRole | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [optionalPhoneNumber, setOptionalPhoneNumber] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [isCheckingDiagnostic, setIsCheckingDiagnostic] = useState(false);
  const [isDiagnosticStatusLoaded, setIsDiagnosticStatusLoaded] = useState(false);
  const [onboardingDiagnosticCompleted, setOnboardingDiagnosticCompleted] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [liveAudioReturnView, setLiveAudioReturnView] =
    useState<ViewState>('dashboard');
  const [liveAudioForceFallback, setLiveAudioForceFallback] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatAttachmentPickerSignal, setChatAttachmentPickerSignal] = useState(0);
  const [startLiveAudio, setStartLiveAudio] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGrade, setCurrentGrade] = useState(DEFAULT_GRADE);
  const [adminSelectedGrade, setAdminSelectedGrade] = useState(DEFAULT_GRADE);
  const [dashboardSubjectIds, setDashboardSubjectIds] = useState<string[]>(
    DEFAULT_DASHBOARD_SUBJECT_IDS,
  );
  const [subjectRecommendations, setSubjectRecommendations] =
    useState<SubjectRecommendationPayload | null>(null);
  const recordedRecommendationImpressions = useRef(new Set<string>());
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [progressiveDiagnosticSubject, setProgressiveDiagnosticSubject] =
    useState<Subject | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(
    null,
  );
  const [selectedSubStrand, setSelectedSubStrand] = useState<SubStrand | null>(
    null,
  );
  const [subjectLearningPath, setSubjectLearningPath] =
    useState<SubjectLearningPath | null>(null);
  const [subjectLearningPathError, setSubjectLearningPathError] = useState<string | null>(null);
  const [isLoadingSubjectLearningPath, setIsLoadingSubjectLearningPath] = useState(false);
  const [selectedProgressiveLessonKey, setSelectedProgressiveLessonKey] = useState<string | null>(null);
  const [selectedProgressiveLessonVersion, setSelectedProgressiveLessonVersion] = useState<number | null>(null);
  const [activeStrandIndex, setActiveStrandIndex] = useState(0);
  const [quizSource, setQuizSource] = useState<'subject' | 'quiz_me'>('subject');
  const [activeQuizConfig, setActiveQuizConfig] = useState<QuizConfig | null>(null);
  const [brainTeaseCompleted, setBrainTeaseCompleted] = useState(false);
  const [quizGenerationError, setQuizGenerationError] = useState<string | null>(null);
  const [quizGenerationProgress, setQuizGenerationProgress] = useState<QuizGenerationProgress>({
    percentage: 0,
    stage: 'Preparing your quiz',
  });
  const [generatedFlashcards, setGeneratedFlashcards] =
    useState<Flashcard[]>(INITIAL_FLASHCARDS);
  const [generatedQuizQuestions, setGeneratedQuizQuestions] =
    useState<Question[]>(INITIAL_QUIZ_QUESTIONS);
  const [curriculumData, setCurriculumData] = useState<
    Record<string, LearningStrand[]>
  >(INITIAL_CURRICULUM_DATA);
  const [curriculumSubjectBundlesByGrade, setCurriculumSubjectBundlesByGrade] = useState<
    Record<string, CurriculumSubjectBundle[]>
  >({});
  const [loadedCurriculumGrades, setLoadedCurriculumGrades] = useState<Record<string, boolean>>({});
  const [schoolsList, setSchoolsList] =
    useState<SchoolData[]>(INITIAL_SCHOOLS);
  const [dashboardBanner, setDashboardBanner] = useState<DashboardBanner | null>(null);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [selectedDueReview, setSelectedDueReview] = useState<DueReview | null>(null);
  const [reviewSessionError, setReviewSessionError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [userProfile, setUserProfile] =
    useState<UserProfile>(INITIAL_USER_PROFILE);
  const [assignments, setAssignments] =
    useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [teacherStudents, setTeacherStudents] =
    useState<StudentPerformance[]>(INITIAL_TEACHER_STUDENTS);
  const [teacherAssignments, setTeacherAssignments] = useState<
    SubmittedAssignment[]
  >(INITIAL_SUBMITTED_ASSIGNMENTS);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<Record<string, StudentSubmission[]>>(
    INITIAL_SUBMISSIONS_BY_ASSIGNMENT,
  );
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [podcasts, setPodcasts] = useState<Podcast[]>(INITIAL_PODCASTS);
  const [onboardingMascotKey, setOnboardingMascotKey] =
    useState<OnboardingMascotKey | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [previewBookId, setPreviewBookId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>(
    {},
  );
  const [initialPage, setInitialPage] = useState(1);
  const [isSpotlightMode, setIsSpotlightMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [downloadedBooks, setDownloadedBooks] = useState<Set<string>>(new Set());
  const [downloadedBookCache, setDownloadedBookCache] = useState<Book[]>([]);
  const [downloadedBooksLoadedForUserId, setDownloadedBooksLoadedForUserId] =
    useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isStudentPreview, setIsStudentPreview] = useState(false);
  const [focusModeStudentProfile, setFocusModeStudentProfile] = useState<UserProfile | null>(null);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [billingStatus, setBillingStatus] = useState<BillingStatus>({
    subscription: null,
    savedMpesaPhoneNumber: null,
    maskedMpesaPhoneNumber: null,
    hasPaidBefore: false,
    school: null,
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<BillingPlanCode | null>(null);
  const [trialOfferPlan, setTrialOfferPlan] = useState<BillingPlan | null>(null);
  const [isTryOneBobOpen, setIsTryOneBobOpen] = useState(false);
  const [tryOneBobOfferSeenAt, setTryOneBobOfferSeenAt] = useState<Record<string, number>>({});
  const [checkoutPhoneNumber, setCheckoutPhoneNumber] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutStatusLabel, setCheckoutStatusLabel] = useState<string | null>(null);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [activePaymentRequestId, setActivePaymentRequestId] = useState<string | null>(null);
  const checkoutSubmissionLockedRef = useRef(false);
  const [pendingSubscriptionIntent, setPendingSubscriptionIntent] =
    useState<PendingSubscriptionIntent | null>(null);
  const [queuedCheckoutLaunch, setQueuedCheckoutLaunch] =
    useState<QueuedCheckoutLaunch | null>(null);
  const [queuedTryOneBobOffer, setQueuedTryOneBobOffer] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<RouteSnapshot[]>([]);
  const [navigationIndex, setNavigationIndex] = useState(-1);
  const [adminDiscounts, setAdminDiscounts] = useState<SchoolDiscount[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<BannerAnnouncement[]>([]);
  const [adminSchoolPlans, setAdminSchoolPlans] = useState<BillingPlan[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminPortalUser[]>([]);
  const [adminAiAnalytics, setAdminAiAnalytics] = useState<AdminAiAnalytics | null>(null);
  const [adminBillingAnalytics, setAdminBillingAnalytics] = useState<AdminBillingAnalytics | null>(null);
  const [adminSubjectEngagement, setAdminSubjectEngagement] =
    useState<AdminSubjectEngagementAnalytics | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [parentChildren, setParentChildren] = useState<ParentChildSummary[]>([]);
  const [selectedParentChildId, setSelectedParentChildId] = useState<string | null>(null);
  const [parentChildIdentifier, setParentChildIdentifier] = useState('');
  const [parentChildLinkMethod, setParentChildLinkMethod] = useState<'email' | 'phone'>('email');
  const [parentDashboardError, setParentDashboardError] = useState<string | null>(null);
  const [isLoadingParentDashboard, setIsLoadingParentDashboard] = useState(false);
  const [isLinkingParentChild, setIsLinkingParentChild] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [activeSecondsUsed, setActiveSecondsUsed] = useState(0);
  const [dailyLimitSeconds, setDailyLimitSeconds] = useState(DEFAULT_FOCUS_MODE_LIMIT_SECONDS);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [focusModeSetupRequired, setFocusModeSetupRequired] = useState(false);
  const [focusModeSetupCompleted, setFocusModeSetupCompleted] = useState(false);
  const [focusModeError, setFocusModeError] = useState<string | null>(null);
  const [isStartingFocusMode, setIsStartingFocusMode] = useState(false);
  const [isUnlockingFocusMode, setIsUnlockingFocusMode] = useState(false);
  const [weeklyExam, setWeeklyExam] = useState<WeeklyExamPayload | null>(null);
  const [weeklyExamError, setWeeklyExamError] = useState<string | null>(null);
  const [isLoadingWeeklyExam, setIsLoadingWeeklyExam] = useState(false);
  const [isSubmittingWeeklyExam, setIsSubmittingWeeklyExam] = useState(false);

  const getRouteSnapshot = useCallback((nextView: ViewState = currentView): RouteSnapshot => ({
    view: nextView,
    currentGrade,
    adminSelectedGrade,
    selectedSubjectId: selectedSubject?.id || null,
    selectedAssignmentId: selectedAssignment?.id || null,
    selectedSubStrandId: selectedSubStrand?.id || null,
    selectedProgressiveLessonKey,
    selectedProgressiveLessonVersion,
    selectedBookId: selectedBook?.id || null,
    previewBookId,
    activeStrandIndex,
    quizSource,
    brainTeaseCompleted,
    liveAudioReturnView,
  }), [
    activeStrandIndex,
    adminSelectedGrade,
    brainTeaseCompleted,
    currentGrade,
    currentView,
    liveAudioReturnView,
    previewBookId,
    quizSource,
    selectedAssignment?.id,
    selectedBook?.id,
    selectedProgressiveLessonKey,
    selectedProgressiveLessonVersion,
    selectedSubject?.id,
    selectedSubStrand?.id,
  ]);

  const replaceWith = useCallback((nextView: ViewState) => {
    setNavigationHistory([{ ...getRouteSnapshot(nextView), view: nextView }]);
    setNavigationIndex(0);
    setCurrentView(nextView);
  }, [getRouteSnapshot]);

  const handleIncomingLink = useCallback(async (url: string) => {
    const link = parseIncomingLink(url);
    if (link.kind === 'unknown') {
      return;
    }

    const nextHomeView =
      isStudentPreview || !authSession
        ? 'dashboard'
        : getPrimaryHomeView(authSession.user.roles, authSession.user.email);

    if (link.kind === 'email-verification-token') {
      try {
        await confirmEmailVerificationToken(link.token);

        let nextSession = authSession;
        if (nextSession) {
          nextSession = await refreshAccessSession(nextSession.refreshToken);
        } else {
          const storedSession = await loadStoredAuthSession();
          if (storedSession) {
            nextSession = await refreshAccessSession(storedSession.refreshToken);
          }
        }

        if (nextSession) {
          const profile = mapAuthSessionToProfile(nextSession);
          setAuthSession(nextSession);
          setUserProfile(profile);
          setCurrentGrade(profile.grade || DEFAULT_GRADE);
          setIsStudentPreview(false);
          setAuthError(null);
          setAuthMode('login');
          setAuthEntryScreen('auth');
          replaceWith(getPrimaryHomeView(nextSession.user.roles, nextSession.user.email));
          return;
        }

        setAuthSession(null);
        await persistAuthSession(null);
        setAuthMode('login');
        setAuthEntryScreen('auth');
        setAuthError('Email verified. Sign in to continue.');
      } catch (error) {
        setAuthMode('login');
        setAuthEntryScreen('auth');
        setAuthError(error instanceof Error ? error.message : 'Unable to verify email');
      }
      return;
    }

    if (link.kind === 'email-verified') {
      setAuthError(null);
      setAuthMode('login');
      if (link.email) {
        setLoginEmail(link.email);
      }

      setAuthSession(current => {
        if (!current) {
          return current;
        }

        if (link.email && current.user.email.toLowerCase() !== link.email.toLowerCase()) {
          return current;
        }

        const nextSession: AuthSession = {
          ...current,
          user: {
            ...current.user,
            emailVerified: true,
          },
        };
        persistAuthSession(nextSession).catch(() => undefined);
        return nextSession;
      });

      setUserProfile(current => ({
        ...current,
        status: 'Email verified',
      }));
      if (!authSession) {
        setAuthEntryScreen('auth');
        setAuthError('Email verified. Sign in to continue.');
        return;
      }
      setCurrentView(nextHomeView);
      return;
    }

    if (link.kind === 'password-reset-complete') {
      setAuthMode('login');
      setAuthError('Password updated. Sign in with your new password.');
      setLoginPassword('');
      setAuthSession(null);
      await clearSavedLoginPassword();
      await persistAuthSession(null);
      setCurrentView('dashboard');
    }
  }, [authSession, isStudentPreview, replaceWith]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const [
        storedProfile,
        storedOptionalPhoneNumber,
        storedTryOneBobOfferSeenAt,
        storedFocusMode,
        storedOnboardingPreferences,
        storedLastUsedAuthRole,
        storedSession,
        storedLoginCredentials,
      ] = await Promise.all([
        loadJson(STORAGE_KEYS.profile, INITIAL_USER_PROFILE),
        loadJson(STORAGE_KEYS.optionalPhoneNumber, ''),
        loadJson<Record<string, number>>(STORAGE_KEYS.tryOneBobOfferSeenAt, {}),
        loadJson<FocusModeSnapshot>(STORAGE_KEYS.focusMode, {
          focusModeActive: false,
          sessionStartedAt: null,
          activeSecondsUsed: 0,
          dailyLimitSeconds: DEFAULT_FOCUS_MODE_LIMIT_SECONDS,
          sessionExpired: false,
          studentProfile: null,
          setupCompleted: false,
        }),
        loadJson<OnboardingPreferencesSnapshot>(STORAGE_KEYS.onboardingPreferences, {}),
        loadJson<unknown>(STORAGE_KEYS.lastUsedAuthRole, null),
        restoreStoredAuthSession(),
        loadSavedLoginCredentials(),
      ]);

      if (!mounted) {
        return;
      }

      setOptionalPhoneNumber(storedOptionalPhoneNumber);
      setLoginEmail(storedLoginCredentials?.email ?? '');
      setLoginPassword(storedLoginCredentials?.password ?? '');
      setLastUsedAuthRole(isLastUsedAuthRole(storedLastUsedAuthRole) ? storedLastUsedAuthRole : null);
      setTryOneBobOfferSeenAt(storedTryOneBobOfferSeenAt);
      const storedMascotKey =
        storedOnboardingPreferences.mascotKey ?? storedOnboardingPreferences.mascot;
      const restoredMascotKey = isOnboardingMascotKey(storedMascotKey)
        ? storedMascotKey
        : storedSession && isOnboardingMascotKey(storedSession.user.mascotKey)
          ? storedSession.user.mascotKey
          : null;
      setOnboardingMascotKey(restoredMascotKey);
      const storedSubjectIds = storedOnboardingPreferences.selectedSubjectIds
        ?.filter(subjectId => typeof subjectId === 'string' && subjectId.length > 0)
        .slice(0, MAX_DASHBOARD_SUBJECTS);
      if (storedSubjectIds?.length) {
        setDashboardSubjectIds(storedSubjectIds);
      }
      const storedFocusLimit =
        storedFocusMode.dailyLimitSeconds || DEFAULT_FOCUS_MODE_LIMIT_SECONDS;
      const storedActiveSeconds = Math.min(
        Math.max(0, storedFocusMode.activeSecondsUsed || 0),
        storedFocusLimit,
      );
      const storedSessionExpired =
        storedFocusMode.sessionExpired || storedActiveSeconds >= storedFocusLimit;
      setDailyLimitSeconds(storedFocusLimit);
      setActiveSecondsUsed(storedActiveSeconds);
      setFocusModeActive(Boolean(storedFocusMode.focusModeActive));
      setFocusModeStudentProfile(
        storedFocusMode.focusModeActive ? storedFocusMode.studentProfile ?? null : null,
      );
      setFocusModeSetupCompleted(Boolean(storedFocusMode.setupCompleted));
      setSessionExpired(storedSessionExpired);
      setSessionStartedAt(
        storedFocusMode.focusModeActive && !storedSessionExpired ? Date.now() : null,
      );

      if (storedSession) {
        const nextHomeView = getPrimaryHomeView(storedSession.user.roles, storedSession.user.email);
        const nextProfile = mergeStoredProfileWithAuthSession(storedProfile, storedSession);
        const nextGrade = nextProfile.grade || DEFAULT_GRADE;
        setAuthSession(storedSession);
        rememberAuthenticatedRole(storedSession);
        setUserProfile(nextProfile);
        setCurrentGrade(nextGrade);
        setIsStudentPreview(false);
        setCurrentView(nextHomeView);
        try {
          const [plansPayload, status] = await Promise.all([
            getBillingPlans(),
            getBillingStatus(),
          ]);
          setBillingPlans(plansPayload.plans);
          setTrialOfferPlan(plansPayload.trialOffer);
          setBillingStatus(status);
          setSelectedPlanCode(
            plansPayload.plans.find(plan => plan.isPopular)?.code ||
              plansPayload.plans[0]?.code ||
              null,
          );
          if (status.savedMpesaPhoneNumber || storedOptionalPhoneNumber) {
            setCheckoutPhoneNumber(status.savedMpesaPhoneNumber || storedOptionalPhoneNumber);
          }
        } catch {
          // Billing availability must never invalidate an otherwise healthy user session.
          setBillingPlans([]);
          setTrialOfferPlan(null);
          setSelectedPlanCode(null);
        }
        await Promise.allSettled([
          refreshStudentContentState(storedSession, nextGrade),
          refreshTeacherData(storedSession),
        ]);
      } else {
        setUserProfile(storedProfile);
        setCurrentGrade(storedProfile.grade || DEFAULT_GRADE);
      }
      setIsReady(true);
    }

    bootstrap();

    return () => {
      mounted = false;
    };
    // Bootstrap intentionally runs once; refresh helpers read the hydrated session/grade above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Linking.getInitialURL()
      .then(url => {
        if (url) {
          handleIncomingLink(url).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      handleIncomingLink(event.url).catch(() => undefined);
    });

    return () => {
      subscription.remove();
    };
  }, [handleIncomingLink]);

  useEffect(() => {
    if (isReady) {
      saveJson(STORAGE_KEYS.profile, userProfile).catch(() => undefined);
    }
  }, [userProfile, isReady]);

  useEffect(() => {
    const userId = authSession?.user.id;
    let mounted = true;

    if (!userId) {
      setDownloadedBooks(new Set());
      setDownloadedBookCache([]);
      setDownloadedBooksLoadedForUserId(null);
      return () => {
        mounted = false;
      };
    }

    setDownloadedBooksLoadedForUserId(null);
    loadDownloadedBooksSnapshot(userId)
      .then(snapshot => {
        if (!mounted) {
          return;
        }

        const ids = new Set(snapshot.ids ?? []);
        const cachedBooks = (snapshot.books ?? []).filter(book => ids.has(book.id));
        setDownloadedBooks(ids);
        setDownloadedBookCache(cachedBooks);
        setBooks(current =>
          current.length > 0 ? mergeRemoteAndCachedBooks(current, cachedBooks) : cachedBooks,
        );
        setDownloadedBooksLoadedForUserId(userId);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setDownloadedBooks(new Set());
        setDownloadedBookCache([]);
        setDownloadedBooksLoadedForUserId(userId);
      });

    return () => {
      mounted = false;
    };
  }, [authSession?.user.id]);

  useEffect(() => {
    const userId = authSession?.user.id;
    if (!userId || downloadedBooksLoadedForUserId !== userId) {
      return;
    }

    const ids = [...downloadedBooks];
    const cachedById = new Map(downloadedBookCache.map(book => [book.id, book]));
    for (const book of books) {
      if (downloadedBooks.has(book.id)) {
        cachedById.set(book.id, book);
      }
    }

    const cachedBooks = ids
      .map(id => cachedById.get(id))
      .filter((book): book is Book => Boolean(book));

    if (
      cachedBooks.length !== downloadedBookCache.length ||
      cachedBooks.some((book, index) => book.id !== downloadedBookCache[index]?.id)
    ) {
      setDownloadedBookCache(cachedBooks);
    }

    saveJson<DownloadedBooksSnapshot>(downloadedBooksStorageKey(userId), {
      books: cachedBooks,
      ids,
    }).catch(() => undefined);
  }, [authSession?.user.id, books, downloadedBookCache, downloadedBooks, downloadedBooksLoadedForUserId]);

  useEffect(() => {
    if (isReady) {
      saveJson(STORAGE_KEYS.optionalPhoneNumber, optionalPhoneNumber.trim()).catch(() => undefined);
    }
  }, [optionalPhoneNumber, isReady]);

  useEffect(() => {
    if (isReady) {
      saveJson<FocusModeSnapshot>(STORAGE_KEYS.focusMode, {
        focusModeActive,
        sessionStartedAt,
        activeSecondsUsed,
        dailyLimitSeconds,
        sessionExpired,
        studentProfile: focusModeStudentProfile,
        setupCompleted: focusModeSetupCompleted,
      }).catch(() => undefined);
    }
  }, [
    activeSecondsUsed,
    dailyLimitSeconds,
    focusModeActive,
    focusModeSetupCompleted,
    focusModeStudentProfile,
    isReady,
    sessionExpired,
    sessionStartedAt,
  ]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 8) {
      setIsSpotlightMode(true);
    }
  }, []);

  useEffect(() => {
    if (!focusModeActive || sessionExpired) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (AppState.currentState !== 'active') {
        return;
      }

      setActiveSecondsUsed(current => Math.min(current + 1, dailyLimitSeconds));
    }, 1000);

    return () => clearInterval(timer);
  }, [dailyLimitSeconds, focusModeActive, sessionExpired]);

  useEffect(() => {
    if (!focusModeActive || sessionExpired || activeSecondsUsed < dailyLimitSeconds) {
      return;
    }

    setActiveSecondsUsed(dailyLimitSeconds);
    setSessionStartedAt(null);
    setSessionExpired(true);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setChatOpen(false);
    setStartLiveAudio(false);
    setMessages([]);
    setIsCheckoutOpen(false);
    setIsTryOneBobOpen(false);
  }, [activeSecondsUsed, dailyLimitSeconds, focusModeActive, sessionExpired]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (!focusModeActive || sessionExpired) {
        return;
      }

      setSessionStartedAt(nextState === 'active' ? Date.now() : null);
    });

    return () => subscription.remove();
  }, [focusModeActive, sessionExpired]);

  useEffect(() => {
    if (focusModeActive && !sessionExpired && isFocusModeBlockedView(currentView)) {
      replaceWith('dashboard');
    }
  }, [currentView, focusModeActive, replaceWith, sessionExpired]);

  useEffect(() => {
    if (
      !queuedCheckoutLaunch ||
      profileOpen ||
      notificationsOpen ||
      chatOpen ||
      isTryOneBobOpen ||
      isCheckoutOpen
    ) {
      return undefined;
    }

    const launch = queuedCheckoutLaunch;
    const timer = setTimeout(() => {
      setQueuedCheckoutLaunch(null);
      activateSubscriptionCheckout(launch.intent, launch.planCode);
    }, PAYMENT_MODAL_TRANSITION_DELAY_MS);

    return () => clearTimeout(timer);
    // Use the latest checkout state after the blocking native modal has fully dismissed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatOpen,
    isCheckoutOpen,
    isTryOneBobOpen,
    notificationsOpen,
    profileOpen,
    queuedCheckoutLaunch,
  ]);

  useEffect(() => {
    if (!queuedTryOneBobOffer || isCheckoutOpen || isTryOneBobOpen) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setQueuedTryOneBobOffer(false);
      markTryOneBobOfferSeen();
      setIsTryOneBobOpen(true);
    }, PAYMENT_MODAL_TRANSITION_DELAY_MS);

    return () => clearTimeout(timer);
    // The offer is queued from a deliberate checkout dismissal; current account state is read at launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutOpen, isTryOneBobOpen, queuedTryOneBobOffer]);

  const pendingAssignments = useMemo(
    () => assignments.filter(item => item.status === 'pending'),
    [assignments],
  );
  const dashboardSubjects = useMemo(() => {
    const curriculumSubjects = (curriculumSubjectBundlesByGrade[currentGrade] ?? [])
      .filter(bundle => bundle.strands.length > 0)
      .map(subjectFromCurriculumBundle);
    if (curriculumSubjects.length > 0) {
      const byId = new Map(curriculumSubjects.map(subject => [subject.id, subject]));
      const preferredIds = subjectRecommendations?.dashboard.length
        ? subjectRecommendations.dashboard.map(item => item.subjectId)
        : dashboardSubjectIds;
      const selected: Subject[] = [];
      preferredIds.forEach(subjectId => {
        const canonicalId = normalizeDashboardSubjectIdForGrade(subjectId, currentGrade);
        const subject = byId.get(canonicalId);
        if (subject && !selected.some(item => item.id === subject.id)) selected.push(subject);
      });
      curriculumSubjects.forEach(subject => {
        if (selected.length < MAX_DASHBOARD_SUBJECTS && !selected.some(item => item.id === subject.id)) {
          selected.push(subject);
        }
      });
      return selected.slice(0, MAX_DASHBOARD_SUBJECTS);
    }

    if (subjectRecommendations?.dashboard.length) {
      return subjectRecommendations.dashboard.map(subjectFromRecommendation);
    }

    return dashboardSubjectIds
      .map(subjectId => SUBJECTS.find(subject => subject.id === subjectId))
      .filter((subject): subject is Subject => Boolean(subject));
  }, [curriculumSubjectBundlesByGrade, currentGrade, dashboardSubjectIds, subjectRecommendations]);
  const chatSuggestedSubjects = useMemo(
    () => subjectRecommendations?.chat.length
      ? subjectRecommendations.chat.map(subjectFromRecommendation)
      : dashboardSubjects.slice(0, 4),
    [dashboardSubjects, subjectRecommendations],
  );
  const availableSubjects = useMemo(() => {
    const curriculumSubjects = (curriculumSubjectBundlesByGrade[currentGrade] ?? [])
      .filter(bundle => bundle.strands.length > 0)
      .map(subjectFromCurriculumBundle);
    if (curriculumSubjects.length > 0) return curriculumSubjects;
    const byId = new Map(SUBJECTS.map(subject => [subject.id, subject]));
    [...dashboardSubjects, ...chatSuggestedSubjects].forEach(subject => byId.set(subject.id, subject));
    return [...byId.values()];
  }, [chatSuggestedSubjects, curriculumSubjectBundlesByGrade, currentGrade, dashboardSubjects]);

  useEffect(() => {
    if (!subjectRecommendations || currentView !== 'dashboard') return;
    const impressionKey = `${subjectRecommendations.recommendationId}:dashboard`;
    if (recordedRecommendationImpressions.current.has(impressionKey)) return;
    recordedRecommendationImpressions.current.add(impressionKey);

    recordSubjectRecommendationEvents(
      currentGrade,
      subjectRecommendations.dashboard.map(item => ({
        ...item,
        recommendationId: subjectRecommendations.recommendationId,
        strategyVersion: subjectRecommendations.strategyVersion,
        surface: 'dashboard' as const,
        eventType: 'impression' as const,
      })),
    ).catch(() => recordedRecommendationImpressions.current.delete(impressionKey));
  }, [currentGrade, currentView, subjectRecommendations]);

  useEffect(() => {
    if (!chatOpen || !subjectRecommendations) return;
    const impressionKey = `${subjectRecommendations.recommendationId}:chat`;
    if (recordedRecommendationImpressions.current.has(impressionKey)) return;
    recordedRecommendationImpressions.current.add(impressionKey);

    recordSubjectRecommendationEvents(
      currentGrade,
      subjectRecommendations.chat.map(item => ({
        ...item,
        recommendationId: subjectRecommendations.recommendationId,
        strategyVersion: subjectRecommendations.strategyVersion,
        surface: 'chat' as const,
        eventType: 'impression' as const,
      })),
    ).catch(() => recordedRecommendationImpressions.current.delete(impressionKey));
  }, [chatOpen, currentGrade, subjectRecommendations]);

  const selectedSubjectStrands = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    return curriculumData[`${currentGrade}-${selectedSubject.id}`] || [];
  }, [curriculumData, currentGrade, selectedSubject]);

  const hasStudied = useMemo(
    () =>
      selectedSubjectStrands.some(strand =>
        strand.subStrands.some(sub => sub.isCompleted),
      ),
    [selectedSubjectStrands],
  );
  const quizMeSubjectOptions = useMemo<CurriculumSelectorOption[]>(() => {
    return (curriculumSubjectBundlesByGrade[currentGrade] ?? [])
      .filter(subject => subject.strands.length > 0)
      .map(subject => ({
        id: subject.subjectCode,
        title: subject.subjectDisplayName,
        detail: subject.subjectOfficialName !== subject.subjectDisplayName
          ? subject.subjectOfficialName
          : undefined,
      }));
  }, [curriculumSubjectBundlesByGrade, currentGrade]);
  const quizMeStrandsBySubject = useMemo(() => {
    const bySubject: Record<string, CurriculumSelectorOption[]> = {};

    (curriculumSubjectBundlesByGrade[currentGrade] ?? []).forEach(subject => {
      bySubject[subject.subjectCode] = subject.strands.map(strand => ({
        id: strand.id,
        title: strand.title,
        number: strand.number,
      }));
    });

    return bySubject;
  }, [curriculumSubjectBundlesByGrade, currentGrade]);
  const quizMeSubStrandsByStrand = useMemo(() => {
    const byStrand: Record<string, CurriculumSelectorOption[]> = {};

    (curriculumSubjectBundlesByGrade[currentGrade] ?? []).forEach(subject => {
      subject.strands.forEach(strand => {
        byStrand[strand.id] = strand.subStrands.map(subStrand => ({
          id: subStrand.id,
          title: subStrand.title,
          number: subStrand.number,
          detail: `${subStrand.outcomes?.length ?? 0} learning outcomes`,
        }));
      });
    });

    return byStrand;
  }, [curriculumSubjectBundlesByGrade, currentGrade]);
  const roles = authSession?.user.roles || [];
  const isKnownAdminAccount = isKnownAdminEmail(authSession?.user.email);
  const canOpenTeacherPortal = isTeacherRole(roles) || isAdminRole(roles);
  const canOpenAdminPortal = isAdminRole(roles) || isKnownAdminAccount;
  const isDemoStudentAccount =
    authSession?.user.email.trim().toLowerCase() === DEMO_STUDENT_EMAIL &&
    authSession.user.roles.includes('student');
  const isDemoAccount = Boolean(
    authSession &&
      Object.values(DEMO_ACCOUNT_EMAILS).some(
        email => email === authSession.user.email.trim().toLowerCase(),
      ),
  );
  const primaryHomeView = getPrimaryHomeView(roles, authSession?.user.email);
  const resolvedHomeView = focusModeActive || isStudentPreview ? 'dashboard' : primaryHomeView;
  const hasPendingAccountOnboarding = Boolean(
    authSession &&
      !isKnownAdminAccount &&
      authSession.user.roles.some(role => role === 'student' || role === 'teacher' || role === 'parent' || role === 'other') &&
      !authSession.user.onboardingCompleted,
  );
  const hasPendingStudentDiagnostic = Boolean(
    authSession?.user.roles.includes('student') &&
      !isKnownAdminAccount &&
      authSession.user.onboardingCompleted &&
      isDiagnosticStatusLoaded &&
      !onboardingDiagnosticCompleted,
  );
  const hasPendingProgressiveDiagnostic = Boolean(progressiveDiagnosticSubject);
  const hasActiveSubscription = Boolean(
    isDemoStudentAccount ||
      (billingStatus.subscription && new Date(billingStatus.subscription.periodEnd).getTime() > Date.now()),
  );
  const focusModeSecondsRemaining = Math.max(0, dailyLimitSeconds - activeSecondsUsed);
  const activeUserProfile =
    focusModeActive && focusModeStudentProfile ? focusModeStudentProfile : userProfile;
  const activeMascotKey = onboardingMascotKey ?? getDefaultMascotKeyForRoles(roles);

  useEffect(() => {
    if (!authSession || isStudentPreview) {
      return undefined;
    }

    markPresenceOnline();
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        markPresenceOnline();
      }
    }, 30000);

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        markPresenceOnline();
      } else {
        markPresenceOffline(nextState);
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
      markPresenceOffline('session_end');
    };
  }, [authSession, isStudentPreview]);

  async function refreshBillingState() {
    if (!authSession) {
      setBillingPlans([]);
      setBillingStatus({
        subscription: null,
        savedMpesaPhoneNumber: null,
        maskedMpesaPhoneNumber: null,
        hasPaidBefore: false,
        school: null,
      });
      setTrialOfferPlan(null);
      return;
    }

    const [plansPayload, status] = await Promise.all([getBillingPlans(), getBillingStatus()]);
    setBillingPlans(plansPayload.plans);
    setTrialOfferPlan(plansPayload.trialOffer);
    setBillingStatus(status);
    setSelectedPlanCode(current => {
      if (current && plansPayload.plans.some(plan => plan.code === current)) {
        return current;
      }
      return (
        plansPayload.plans.find(plan => plan.isPopular)?.code ||
        plansPayload.plans[0]?.code ||
        null
      );
    });
    if (!checkoutPhoneNumber && (status.savedMpesaPhoneNumber || optionalPhoneNumber)) {
      setCheckoutPhoneNumber(status.savedMpesaPhoneNumber || optionalPhoneNumber);
    }
  }

  async function refreshSchoolsState() {
    try {
      const schools = await getSchools();
      setSchoolsList(schools.length > 0 ? schools : INITIAL_SCHOOLS);
    } catch {
      setSchoolsList(INITIAL_SCHOOLS);
    }
  }

  async function refreshDashboardBanner() {
    if (!authSession) {
      setDashboardBanner(null);
      return;
    }

    try {
      const banner = await getDashboardBanner();
      setDashboardBanner(
        !externalPaymentsEnabled && banner?.ctaTarget === 'manage_subscription'
          ? null
          : banner,
      );
    } catch {
      setDashboardBanner(null);
    }
  }

  async function refreshDueReviews() {
    if (!authSession?.user.roles.includes('student')) {
      setDueReviews([]);
      return;
    }

    try {
      setDueReviews(await getDueReviews());
    } catch {
      setDueReviews([]);
    }
  }

  async function refreshNotifications() {
    if (!authSession) {
      setNotifications([]);
      return;
    }

    try {
      setNotifications(await getNotifications());
    } catch {
      setNotifications([]);
    }
  }

  async function refreshParentDashboard() {
    if (!authSession?.user.roles.includes('parent')) {
      setParentChildren([]);
      setSelectedParentChildId(null);
      setParentDashboardError(null);
      return;
    }

    const isDemoParent =
      authSession.user.email.trim().toLowerCase() === DEMO_PARENT_EMAIL;
    setIsLoadingParentDashboard(true);
    try {
      const payload = await getParentDashboard();
      const nextChildren =
        payload.children.length > 0 || !isDemoParent ? payload.children : INITIAL_PARENT_CHILDREN;
      setParentChildren(nextChildren);
      setSelectedParentChildId(current =>
        current && nextChildren.some(child => child.id === current)
          ? current
          : nextChildren[0]?.id ?? null,
      );
      setParentDashboardError(null);
    } catch {
      if (isDemoParent) {
        setParentChildren(INITIAL_PARENT_CHILDREN);
        setSelectedParentChildId(current =>
          current && INITIAL_PARENT_CHILDREN.some(child => child.id === current)
            ? current
            : INITIAL_PARENT_CHILDREN[0]?.id ?? null,
        );
        setParentDashboardError(null);
      } else {
        setParentChildren([]);
        setSelectedParentChildId(null);
        setParentDashboardError('Could not load linked children right now.');
      }
    } finally {
      setIsLoadingParentDashboard(false);
    }
  }

  async function linkParentChildAccount() {
    const identifier = parentChildIdentifier.trim();
    if (!identifier) {
      setParentDashboardError(`Enter the student ${parentChildLinkMethod} to link.`);
      return;
    }

    setIsLinkingParentChild(true);
    setParentDashboardError(null);
    try {
      await linkParentChild(
        parentChildLinkMethod === 'email'
          ? { studentEmail: identifier }
          : { studentPhone: identifier },
      );
      setParentChildIdentifier('');
      await refreshParentDashboard();
      triggerHaptic('success');
    } catch (error) {
      setParentDashboardError(
        error instanceof Error ? error.message : 'Unable to link that student',
      );
      triggerHaptic('error');
    } finally {
      setIsLinkingParentChild(false);
    }
  }

  async function removeParentChild(childId: string) {
    try {
      await unlinkParentChild(childId);
      await refreshParentDashboard();
      triggerHaptic('impact');
    } catch (error) {
      setParentDashboardError(
        error instanceof Error ? error.message : 'Unable to remove that child',
      );
      triggerHaptic('error');
    }
  }

  async function startFocusMode() {
    if (isStartingFocusMode) {
      return;
    }

    setIsStartingFocusMode(true);
    setFocusModeError(null);
    setFocusModeSetupRequired(false);

    try {
      const supported = await focusModeBridge.isScreenPinningSupported();
      if (!supported) {
        throw Object.assign(
          new Error('Focus Mode is available on Android phones with App Pinning support.'),
          { code: 'screen_pinning_unsupported' },
        );
      }

      const shouldUseStudentPreview = !authSession?.user.roles.includes('student');
      if (focusModeSetupCompleted && shouldUseStudentPreview) {
        await focusModeBridge.confirmDeviceCredential(
          'Start Focus Mode',
          'Enter the parent PIN to lock this phone to KITABU.',
        );
      }

      await focusModeBridge.startScreenPinning();
      const selectedChild =
        parentChildren.find(child => child.id === selectedParentChildId) ?? parentChildren[0] ?? null;
      const lockedStudentProfile =
        shouldUseStudentPreview && selectedChild ? mapParentChildToStudentProfile(selectedChild) : null;
      setFocusModeActive(true);
      setSessionStartedAt(Date.now());
      setActiveSecondsUsed(0);
      setDailyLimitSeconds(DEFAULT_FOCUS_MODE_LIMIT_SECONDS);
      setSessionExpired(false);
      setFocusModeSetupRequired(false);
      setFocusModeSetupCompleted(true);
      setFocusModeError(null);
      setProfileOpen(false);
      setNotificationsOpen(false);
      setChatOpen(false);
      setStartLiveAudio(false);
      setMessages([]);
      setIsCheckoutOpen(false);
      setIsTryOneBobOpen(false);
      setIsStudentPreview(shouldUseStudentPreview);
      setFocusModeStudentProfile(lockedStudentProfile);
      if (selectedChild?.grade) {
        setCurrentGrade(selectedChild.grade);
      }
      replaceWith('dashboard');
      triggerHaptic('success');
    } catch (error) {
      setFocusModeSetupRequired(isFocusModeSetupError(error));
      setFocusModeError(getFocusModeErrorMessage(error));
      triggerHaptic('error');
    } finally {
      setIsStartingFocusMode(false);
    }
  }

  async function openFocusModeSettings() {
    try {
      await focusModeBridge.openScreenPinningSettings();
    } catch (error) {
      setFocusModeError(
        error instanceof Error ? error.message : 'Unable to open Android settings.',
      );
    }
  }

  async function unlockFocusModeParentControls() {
    if (isUnlockingFocusMode) {
      return;
    }

    setIsUnlockingFocusMode(true);
    setFocusModeError(null);

    try {
      await focusModeBridge.confirmDeviceCredential(
        'Unlock parent controls',
        'Use your phone PIN, pattern, password, fingerprint, or face unlock.',
      );
      await focusModeBridge.stopScreenPinning();
      setFocusModeActive(false);
      setSessionStartedAt(null);
      setActiveSecondsUsed(0);
      setDailyLimitSeconds(DEFAULT_FOCUS_MODE_LIMIT_SECONDS);
      setSessionExpired(false);
      setFocusModeSetupRequired(false);
      setFocusModeError(null);
      setIsStudentPreview(false);
      setFocusModeStudentProfile(null);
      replaceWith(primaryHomeView);
      triggerHaptic('success');
    } catch (error) {
      setFocusModeError(
        error instanceof Error ? error.message : 'Unable to unlock parent controls.',
      );
      triggerHaptic('error');
    } finally {
      setIsUnlockingFocusMode(false);
    }
  }

  async function refreshWeeklyExam() {
    if (!authSession?.user.roles.includes('student')) {
      setWeeklyExam(null);
      setWeeklyExamError(null);
      return;
    }

    setIsLoadingWeeklyExam(true);
    try {
      setWeeklyExam(await getWeeklyExam());
      setWeeklyExamError(null);
    } catch (error) {
      setWeeklyExamError(error instanceof Error ? error.message : 'Unable to load weekly exam');
    } finally {
      setIsLoadingWeeklyExam(false);
    }
  }

  async function beginWeeklyExam() {
    if (!weeklyExam) {
      return;
    }
    setIsSubmittingWeeklyExam(true);
    setWeeklyExamError(null);
    try {
      await startWeeklyExam(weeklyExam.exam.id);
      await refreshWeeklyExam();
      triggerHaptic('impact');
    } catch (error) {
      setWeeklyExamError(error instanceof Error ? error.message : 'Unable to start weekly exam');
      triggerHaptic('error');
    } finally {
      setIsSubmittingWeeklyExam(false);
    }
  }

  async function submitWeeklyExam(
    answers: Array<{ questionId: string; answer: string }>,
    timedOut = false,
  ) {
    if (!weeklyExam?.attempt) {
      return;
    }
    setIsSubmittingWeeklyExam(true);
    setWeeklyExamError(null);
    try {
      const result = await submitWeeklyExamRequest(weeklyExam.exam.id, {
        attemptId: weeklyExam.attempt.id,
        answers,
        timedOut,
      });
      setWeeklyExam(current => current ? { ...current, exam: result.exam, attempt: result.attempt } : current);
      await Promise.all([refreshDueReviews(), refreshStudentContentState(authSession!, currentGrade)]);
      triggerHaptic('success');
    } catch (error) {
      setWeeklyExamError(error instanceof Error ? error.message : 'Unable to submit weekly exam');
      triggerHaptic('error');
      throw error;
    } finally {
      setIsSubmittingWeeklyExam(false);
    }
  }

  function startDueReview(review: DueReview) {
    setSelectedDueReview(review);
    setReviewSessionError(null);
    navigateTo('review_session');
  }

  async function completeDueReview(passed: boolean) {
    if (!selectedDueReview) {
      return;
    }

    setIsSubmittingReview(true);
    setReviewSessionError(null);
    try {
      await completeSpacedReview(selectedDueReview.id, passed);
      setSelectedDueReview(null);
      await refreshDueReviews();
      triggerHaptic(passed ? 'success' : 'impact');
      navigateTo('homework_list');
    } catch (error) {
      setReviewSessionError(error instanceof Error ? error.message : 'Unable to save review');
      triggerHaptic('error');
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function refreshOnboardingDiagnosticState() {
    if (!authSession?.user.roles.includes('student')) {
      setOnboardingDiagnosticCompleted(true);
      setIsDiagnosticStatusLoaded(true);
      return;
    }

    setIsCheckingDiagnostic(true);
    try {
      const status = await getOnboardingDiagnosticStatus();
      setOnboardingDiagnosticCompleted(status.completed || !status.required);
      setIsDiagnosticStatusLoaded(true);
    } catch {
      setOnboardingDiagnosticCompleted(false);
      setIsDiagnosticStatusLoaded(true);
    } finally {
      setIsCheckingDiagnostic(false);
    }
  }

  async function readNotification(notificationId: string) {
    setNotifications(current =>
      current.map(item =>
        item.id === notificationId
          ? { ...item, status: 'read', readAt: item.readAt || new Date().toISOString() }
          : item,
      ),
    );

    try {
      await markNotificationRead(notificationId);
      await refreshNotifications();
    } catch {
      await refreshNotifications();
    }
  }

  async function readAllNotifications() {
    setNotifications(current =>
      current.map(item => ({
        ...item,
        status: 'read',
        readAt: item.readAt || new Date().toISOString(),
      })),
    );

    try {
      await markAllNotificationsRead();
      await refreshNotifications();
    } catch {
      await refreshNotifications();
    }
  }

  function completeDiagnosticOnboarding() {
    setOnboardingDiagnosticCompleted(true);
    setIsDiagnosticStatusLoaded(true);
    refreshDueReviews().catch(() => undefined);
    replaceWith(primaryHomeView);
  }

  function completeProgressiveDiagnostic() {
    if (progressiveDiagnosticSubject) {
      setSelectedSubject(progressiveDiagnosticSubject);
      setActiveStrandIndex(0);
      setBrainTeaseCompleted(false);
      setProgressiveDiagnosticSubject(null);
      navigateTo('subject');
      refreshDueReviews().catch(() => undefined);
      return;
    }

    setProgressiveDiagnosticSubject(null);
  }

  async function refreshStudentContentState(session: AuthSession, grade = currentGrade) {
    if (!session.user.roles.includes('student')) {
      setAssignments([]);
      setBooks([]);
      setPodcasts([]);
      return;
    }

    try {
      const [nextAssignments, nextBooks, nextPodcasts, nextSubjectRecommendations] = await Promise.all([
        getStudentAssignments(),
        getLibraryBooks(grade),
        getLearningPodcasts(),
        getSubjectRecommendations(grade).catch(() => null),
      ]);
      const downloadedSnapshot = await loadDownloadedBooksSnapshot(session.user.id);
      const downloadedGradeBooks = (downloadedSnapshot.books ?? []).filter(book => book.gradeLevel === grade);
      setAssignments(nextAssignments.length > 0 ? nextAssignments : INITIAL_ASSIGNMENTS);
      setBooks(mergeRemoteAndCachedBooks(nextBooks, downloadedGradeBooks));
      setPodcasts(nextPodcasts.length > 0 ? nextPodcasts : INITIAL_PODCASTS);
      if (nextSubjectRecommendations) {
        setSubjectRecommendations(nextSubjectRecommendations);
        setDashboardSubjectIds(
          nextSubjectRecommendations.dashboard.map(subject => subject.subjectId),
        );
      }
    } catch {
      const downloadedSnapshot = await loadDownloadedBooksSnapshot(session.user.id);
      const downloadedGradeBooks = (downloadedSnapshot.books ?? []).filter(book => book.gradeLevel === grade);
      setAssignments(INITIAL_ASSIGNMENTS);
      setBooks(downloadedGradeBooks);
      setPodcasts(INITIAL_PODCASTS);
    }
  }

  async function refreshTeacherData(session: AuthSession) {
    if (!session.user.roles.some(role => role === 'teacher' || role === 'school_admin' || role === 'platform_admin')) {
      setTeacherStudents([]);
      setTeacherAssignments([]);
      setSubmissionsByAssignment({});
      return;
    }

    try {
      const [students, assignmentPayload] = await Promise.all([
        getTeacherStudents(),
        getTeacherAssignments(),
      ]);
      setTeacherStudents(students.length > 0 ? students : INITIAL_TEACHER_STUDENTS);
      setTeacherAssignments(
        assignmentPayload.assignments.length > 0
          ? assignmentPayload.assignments
          : INITIAL_SUBMITTED_ASSIGNMENTS,
      );
      setSubmissionsByAssignment(
        Object.keys(assignmentPayload.submissionsByAssignment).length > 0
          ? assignmentPayload.submissionsByAssignment
          : INITIAL_SUBMISSIONS_BY_ASSIGNMENT,
      );
    } catch {
      setTeacherStudents(INITIAL_TEACHER_STUDENTS);
      setTeacherAssignments(INITIAL_SUBMITTED_ASSIGNMENTS);
      setSubmissionsByAssignment(INITIAL_SUBMISSIONS_BY_ASSIGNMENT);
    }
  }

  async function refreshAdminData() {
    if (!authSession || (!isAdminRole(authSession.user.roles) && !isKnownAdminEmail(authSession.user.email))) {
      setAdminDiscounts([]);
      setAdminAnnouncements([]);
      setAdminSchoolPlans([]);
      setAdminUsers([]);
      setAdminAiAnalytics(null);
      setAdminBillingAnalytics(null);
      setAdminSubjectEngagement(null);
      return;
    }

    try {
      const [schools, discounts, announcements, plans, users, ai, billing, subjectEngagement] = await Promise.all([
        getAdminSchools(),
        getAdminDiscounts(),
        getAdminAnnouncements(),
        getAdminSubscriptionPlans(),
        getAdminUsers(),
        getAdminAiAnalytics(),
        getAdminBillingAnalytics(),
        getAdminSubjectEngagementAnalytics(adminSelectedGrade),
      ]);
      setSchoolsList(schools);
      setAdminDiscounts(discounts);
      setAdminAnnouncements(announcements);
      setAdminSchoolPlans(plans);
      setAdminUsers(users);
      setAdminAiAnalytics(ai);
      setAdminBillingAnalytics(billing);
      setAdminSubjectEngagement(subjectEngagement);
    } catch {
      setAdminDiscounts([]);
      setAdminAnnouncements([]);
      setAdminSchoolPlans([]);
      setAdminUsers([]);
      setAdminAiAnalytics(null);
      setAdminBillingAnalytics(null);
      setAdminSubjectEngagement(null);
    }
  }

  async function submitAccountOnboarding(input: {
    gender: GenderOption;
    grade: string;
    schoolId: string | null;
    mpesaPhoneNumber?: string | null;
    selectedSubjectIds?: string[];
    lang?: OnboardingLanguageCode;
    languageCode?: OnboardingLanguageCode;
    mascot?: OnboardingMascotKey;
    mascotKey?: OnboardingMascotKey;
    role?: PublicSignupRole;
    name?: string;
    voice?: OnboardingVoiceName | '';
    voiceName?: OnboardingVoiceName;
    noVoice?: boolean;
    need?: OnboardingNeedKey;
    needKey?: OnboardingNeedKey;
    displayName?: string;
    age?: string;
    children?: Array<{ name: string; age: string; grade: string; subjects?: string[] }>;
    parentChildren?: Array<{ name: string; age: string; grade: string; subjects?: string[] }>;
    teachGrades?: string[];
    teacherGradeIds?: string[];
    subjects?: string[];
    county?: string;
    school?: string;
    goal?: OnboardingGoalKey;
    goalKey?: OnboardingGoalKey;
    concern?: OnboardingConcernKey;
    concernKey?: OnboardingConcernKey;
    achieve?: OnboardingAchievementKey;
    achievementKey?: OnboardingAchievementKey;
    interests?: OnboardingInterestKey[];
    interestKeys?: OnboardingInterestKey[];
    reminderEnabled?: boolean;
    countryCode?: string;
    curriculumCode?: string;
    signupMethod?: 'email' | 'phone' | 'google';
    email?: string;
    signupEmail?: string;
    phone?: string;
    signupPhone?: string;
    password?: string;
    signupPassword?: string;
  }) {
    setIsSubmittingOnboarding(true);
    setOnboardingError(null);

    try {
      const {
        selectedSubjectIds,
        languageCode,
        mascotKey,
        voiceName,
        noVoice,
        needKey,
        displayName,
        age,
        children,
        parentChildren: onboardingParentChildren,
        teachGrades,
        teacherGradeIds,
        goalKey,
        concernKey,
        achievementKey,
        interestKeys,
        reminderEnabled,
        countryCode,
        curriculumCode,
        signupMethod,
        email,
        signupEmail,
        phone,
        signupPhone,
        ...accountOnboardingInput
      } = input;
      delete accountOnboardingInput.password;
      delete accountOnboardingInput.signupPassword;
      const resolvedChildren = children ?? onboardingParentChildren;
      const resolvedTeachGrades = teachGrades ?? teacherGradeIds;
      const resolvedLanguageCode = languageCode ?? input.lang;
      const resolvedMascotKey = mascotKey ?? input.mascot;
      const resolvedVoiceName = voiceName ?? (input.voice || undefined);
      const resolvedNeedKey = needKey ?? input.need;
      const resolvedDisplayName = displayName ?? input.name;
      const resolvedGoalKey = goalKey ?? input.goal;
      const resolvedConcernKey = concernKey ?? input.concern;
      const resolvedAchievementKey = achievementKey ?? input.achieve;
      const resolvedInterestKeys = interestKeys ?? input.interests;
      const resolvedSignupEmail = signupEmail ?? email;
      const resolvedSignupPhone = signupPhone ?? phone;
      const nextSession = await completeAccountOnboarding({
        ...accountOnboardingInput,
        subjectIds: selectedSubjectIds,
        mascotKey: isOnboardingMascotKey(resolvedMascotKey) ? resolvedMascotKey : undefined,
        countryCode,
        curriculumCode: curriculumCode || curriculumCodeForCountry(countryCode),
      });
      setAuthSession(nextSession);
      if (isOnboardingMascotKey(resolvedMascotKey)) {
        setOnboardingMascotKey(resolvedMascotKey);
      }
      const nextProfile = mapAuthSessionToProfile(nextSession);
      const selectedSchool = input.schoolId
        ? schoolsList.find(school => school.id === input.schoolId)
        : null;
      setUserProfile({
        ...nextProfile,
        school: selectedSchool?.name || input.school || nextProfile.school,
        country: countryNameForCode(countryCode),
        countryCode,
        curriculumCode: curriculumCode || curriculumCodeForCountry(countryCode),
        county: input.county || selectedSchool?.location || nextProfile.county,
        region: input.county || selectedSchool?.location || nextProfile.region,
        taughtGrades: resolvedTeachGrades?.length ? resolvedTeachGrades : nextProfile.taughtGrades,
        taughtSubjects: input.subjects?.length ? input.subjects : nextProfile.taughtSubjects,
      });
      setCurrentGrade(input.grade);
      if (selectedSubjectIds?.length) {
        saveDashboardSubjects(selectedSubjectIds);
      }
      if (
        resolvedLanguageCode ||
        resolvedMascotKey ||
        resolvedVoiceName ||
        typeof noVoice === 'boolean' ||
        resolvedNeedKey ||
        resolvedDisplayName ||
        age ||
        resolvedChildren?.length ||
        resolvedTeachGrades?.length ||
        input.subjects?.length ||
        input.county ||
        input.school ||
        resolvedGoalKey ||
        resolvedConcernKey ||
        resolvedAchievementKey ||
        resolvedInterestKeys?.length ||
        typeof reminderEnabled === 'boolean' ||
        countryCode ||
        curriculumCode
      ) {
        saveJson(STORAGE_KEYS.onboardingPreferences, {
          lang: resolvedLanguageCode,
          languageCode: resolvedLanguageCode,
          mascot: resolvedMascotKey,
          mascotKey: resolvedMascotKey,
          role: input.role,
          name: resolvedDisplayName,
          voice: input.voice ?? resolvedVoiceName ?? '',
          voiceName: resolvedVoiceName,
          noVoice,
          need: resolvedNeedKey,
          needKey: resolvedNeedKey,
          displayName: resolvedDisplayName,
          age,
          children: resolvedChildren,
          teachGrades: resolvedTeachGrades,
          subjects: input.subjects,
          selectedSubjectIds,
          county: input.county,
          school: input.school,
          goal: resolvedGoalKey,
          goalKey: resolvedGoalKey,
          concern: resolvedConcernKey,
          concernKey: resolvedConcernKey,
          achieve: resolvedAchievementKey,
          achievementKey: resolvedAchievementKey,
          interests: resolvedInterestKeys,
          interestKeys: resolvedInterestKeys,
          reminderEnabled,
          countryCode,
          curriculumCode,
          signupMethod,
          signupEmail: resolvedSignupEmail,
          signupPhone: resolvedSignupPhone,
        }).catch(() => undefined);
      }
      if (nextSession.user.roles.includes('student')) {
        setOnboardingDiagnosticCompleted(false);
        setIsDiagnosticStatusLoaded(false);
      }
      replaceWith(getPrimaryHomeView(nextSession.user.roles, nextSession.user.email));
      triggerHaptic('success');
      await Promise.all([refreshBillingState(), refreshDashboardBanner()]);
    } catch (error) {
      setOnboardingError(
        error instanceof Error ? error.message : 'Unable to complete onboarding',
      );
      triggerHaptic('error');
    } finally {
      setIsSubmittingOnboarding(false);
    }
  }

  async function loadCurriculumGrade(grade: string, force = false) {
    if (!authSession) {
      return;
    }

    if (!force && loadedCurriculumGrades[grade]) {
      return;
    }

    const payload = await getCurriculumForGrade(grade);
    setCurriculumData(prev => mergeCurriculumBundles(prev, grade, payload.subjects));
    setCurriculumSubjectBundlesByGrade(prev => ({
      ...prev,
      [grade]: payload.subjects,
    }));
    setLoadedCurriculumGrades(prev => ({
      ...prev,
      [grade]: true,
    }));
  }

  async function refreshCurriculumSubject(grade: string, subjectId: string) {
    if (!authSession) {
      return;
    }

    const payload = await getCurriculumForGrade(grade, subjectId);
    setCurriculumData(prev => {
      const next = { ...prev };
      next[`${grade}-${subjectId}`] = payload.subjects[0]?.strands ?? [];
      return next;
    });
    setCurriculumSubjectBundlesByGrade(prev => {
      const existing = prev[grade] ?? [];
      const refreshed = payload.subjects[0];
      return {
        ...prev,
        [grade]: refreshed
          ? [...existing.filter(subject => subject.subjectId !== refreshed.subjectId), refreshed]
          : existing,
      };
    });
    setLoadedCurriculumGrades(prev => ({
      ...prev,
      [grade]: true,
    }));
  }

  const restoreRoute = useCallback((snapshot: RouteSnapshot) => {
    const restoredView = (snapshot.view as string) === 'lets_learn_content'
      ? 'subject'
      : snapshot.view;
    const restoredQuizSource = (snapshot.quizSource as string) === 'lesson'
      ? 'subject'
      : snapshot.quizSource;
    setCurrentGrade(snapshot.currentGrade);
    setAdminSelectedGrade(snapshot.adminSelectedGrade);
    setActiveStrandIndex(snapshot.activeStrandIndex);
    setQuizSource(restoredQuizSource);
    setBrainTeaseCompleted(snapshot.brainTeaseCompleted);
    setLiveAudioReturnView(snapshot.liveAudioReturnView);
    setSelectedSubject(
      snapshot.selectedSubjectId
        ? SUBJECTS.find(subject => subject.id === snapshot.selectedSubjectId) || null
        : null,
    );
    setSelectedAssignment(
      snapshot.selectedAssignmentId
        ? assignments.find(assignment => assignment.id === snapshot.selectedAssignmentId) || null
        : null,
    );
    setSelectedProgressiveLessonKey(snapshot.selectedProgressiveLessonKey);
    setSelectedProgressiveLessonVersion(snapshot.selectedProgressiveLessonVersion);
    setSelectedBook(
      snapshot.selectedBookId
        ? books.find(book => book.id === snapshot.selectedBookId) || null
        : null,
    );
    setPreviewBookId(snapshot.previewBookId);
    setSelectedSubStrand(() => {
      if (!snapshot.selectedSubStrandId || !snapshot.selectedSubjectId) {
        return null;
      }

      const strands =
        curriculumData[`${snapshot.currentGrade}-${snapshot.selectedSubjectId}`] || [];
      for (const strand of strands) {
        const match = strand.subStrands.find(
          subStrand => subStrand.id === snapshot.selectedSubStrandId,
        );
        if (match) {
          return match;
        }
      }

      return null;
    });
    setCurrentView(restoredView);
  }, [assignments, books, curriculumData]);

  function pushHistory(nextView: ViewState) {
    const nextSnapshot = getRouteSnapshot(nextView);
    setNavigationHistory(prev => {
      const trimmed = prev.slice(0, navigationIndex + 1);
      const last = trimmed[trimmed.length - 1];
      if (
        last &&
        JSON.stringify(last) === JSON.stringify(nextSnapshot)
      ) {
        return trimmed;
      }
      return [...trimmed, nextSnapshot];
    });
    setNavigationIndex(prev => {
      const next = prev + 1;
      return next;
    });
  }

  function navigateTo(nextView: ViewState) {
    if (focusModeActive && (sessionExpired || isFocusModeBlockedView(nextView))) {
      return;
    }

    if (nextView === currentView) {
      return;
    }

    if (nextView === 'live_audio' && currentView !== 'live_audio') {
      setLiveAudioReturnView(currentView);
    }
    if (nextView !== 'live_audio') {
      setLiveAudioForceFallback(false);
    }

    pushHistory(nextView);
    setCurrentView(nextView);
  }

  function goBack() {
    if (focusModeActive && sessionExpired) {
      return;
    }

    if (navigationIndex <= 0) {
      return;
    }

    const nextIndex = navigationIndex - 1;
    const snapshot = navigationHistory[nextIndex];
    if (!snapshot) {
      return;
    }

    if (focusModeActive && isFocusModeBlockedView(snapshot.view)) {
      return;
    }

    setNavigationIndex(nextIndex);
    restoreRoute(snapshot);
  }

  function goForward() {
    if (focusModeActive && sessionExpired) {
      return;
    }

    const nextIndex = navigationIndex + 1;
    const snapshot = navigationHistory[nextIndex];
    if (!snapshot) {
      return;
    }

    if (focusModeActive && isFocusModeBlockedView(snapshot.view)) {
      return;
    }

    setNavigationIndex(nextIndex);
    restoreRoute(snapshot);
  }

  async function refreshSubjectLearningPath(subjectOverride?: Subject) {
    const subject = subjectOverride ?? selectedSubject;
    if (!subject) {
      return;
    }

    setIsLoadingSubjectLearningPath(true);
    setSubjectLearningPathError(null);
    try {
      const path = await getSubjectLearningPath(currentGrade, subject.id);
      setSubjectLearningPath(path);
    } catch (error) {
      setSubjectLearningPath(null);
      setSubjectLearningPathError(
        error instanceof Error
          ? error.message
          : 'Unable to refresh the live path. Your saved curriculum is still available.',
      );
    } finally {
      setIsLoadingSubjectLearningPath(false);
    }
  }

  function recordRecommendedSubjectSelection(
    surface: 'chat' | 'dashboard',
    subject: Subject,
  ) {
    if (!subjectRecommendations) return;
    const item = subjectRecommendations[surface].find(
      recommendation => recommendation.subjectId === subject.id,
    );
    if (!item) return;

    recordSubjectRecommendationEvents(currentGrade, [{
      ...item,
      recommendationId: subjectRecommendations.recommendationId,
      strategyVersion: subjectRecommendations.strategyVersion,
      surface,
      eventType: 'selection',
    }]).catch(() => undefined);
  }

  async function openSubject(subject: Subject) {
    recordRecommendedSubjectSelection('dashboard', subject);
    await loadCurriculumGrade(currentGrade);
    if (
      authSession?.user.roles.includes('student') &&
      !isStudentPreview &&
      ['science', 'kiswahili', 'social', 'ai_education'].includes(subject.id)
    ) {
      try {
        const status = await getProgressiveDiagnosticStatus(subject.id);
        if (status.required && !status.completed) {
          setProgressiveDiagnosticSubject(subject);
          return;
        }
      } catch {
        setProgressiveDiagnosticSubject(subject);
        return;
      }
    }
    setSelectedSubject(subject);
    setActiveStrandIndex(0);
    setBrainTeaseCompleted(false);
    setSelectedProgressiveLessonKey(null);
    setSelectedProgressiveLessonVersion(null);
    setSubjectLearningPath(null);
    setSubjectLearningPathError(null);
    navigateTo('subject');
    await refreshSubjectLearningPath(subject);
  }

  async function openLearningPathNode(node: LearningPathNode, bypassSubscription = false) {
    if (node.status === 'locked') {
      return;
    }

    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'start_progressive_lesson',
        snapshot: getRouteSnapshot('subject'),
        lessonKey: node.lessonKey,
        lessonVersion: node.lessonVersion,
      });
      return;
    }

    setSelectedProgressiveLessonKey(node.lessonKey);
    setSelectedProgressiveLessonVersion(node.lessonVersion);
    navigateTo('progressive_lesson');
  }

  async function finishProgressiveLesson() {
    setSelectedProgressiveLessonKey(null);
    setSelectedProgressiveLessonVersion(null);
    await refreshSubjectLearningPath();
    navigateTo('subject');
  }

  function toggleDashboardSubject(subjectId: string) {
    const canonicalSubjectId = normalizeDashboardSubjectIdForGrade(subjectId, currentGrade);
    const canonicalCurrentIds = dashboardSubjectIds.map(id => normalizeDashboardSubjectIdForGrade(id, currentGrade));
    const nextSubjectIds = canonicalCurrentIds.includes(canonicalSubjectId)
      ? dashboardSubjectIds.length > 1
        ? canonicalCurrentIds.filter(id => id !== canonicalSubjectId)
        : dashboardSubjectIds
      : dashboardSubjectIds.length >= MAX_DASHBOARD_SUBJECTS
        ? dashboardSubjectIds
        : [...canonicalCurrentIds, canonicalSubjectId];

    if (nextSubjectIds === dashboardSubjectIds) return;
    setDashboardSubjectIds(nextSubjectIds);
    setSubjectRecommendations(null);
    saveSubjectDisplayPreferences(nextSubjectIds, 'manual').catch(() => undefined);
  }

  function saveDashboardSubjects(subjectIds: string[]) {
    const nextSubjectIds = subjectIds
      .map(subjectId => normalizeDashboardSubjectIdForGrade(subjectId, currentGrade))
      .filter((subjectId, index, items) => Boolean(subjectId) && items.indexOf(subjectId) === index)
      .slice(0, MAX_DASHBOARD_SUBJECTS);

    if (nextSubjectIds.length > 0) {
      setDashboardSubjectIds(nextSubjectIds);
      setSubjectRecommendations(null);
    }
  }

  function openFeature(view: ViewState) {
    if (view === 'live_audio') {
      setLiveAudioForceFallback(false);
      setChatOpen(false);
      setMessages([]);
    }

    navigateTo(view);
  }

  function openBannerAction(target: DashboardBanner['ctaTarget']) {
    if (target === 'ask_tutor') {
      openLiveTutorOverlay();
      return;
    }

    if (target === 'manage_subscription') {
      openSubscriptionCheckout({
        kind: 'manage_subscription',
        snapshot: getRouteSnapshot(currentView),
      });
      return;
    }

    navigateTo(target as ViewState);
  }

  function activateSubscriptionCheckout(
    intent: PendingSubscriptionIntent,
    planCode: BillingPlanCode | null = null,
  ) {
    if (activePaymentRequestId || checkoutSubmissionLockedRef.current) {
      setIsCheckoutOpen(true);
      return;
    }

    setPendingSubscriptionIntent(intent);
    setCheckoutError(null);
    setCheckoutStatusLabel(null);
    setActivePaymentRequestId(null);
    setQueuedTryOneBobOffer(false);
    setIsTryOneBobOpen(false);
    if (!checkoutPhoneNumber && (billingStatus.savedMpesaPhoneNumber || optionalPhoneNumber)) {
      setCheckoutPhoneNumber(billingStatus.savedMpesaPhoneNumber || optionalPhoneNumber);
    }
    setSelectedPlanCode(planCode);
    setIsCheckoutOpen(true);
    triggerHaptic('impact');
  }

  function openSubscriptionCheckout(
    intent: PendingSubscriptionIntent,
    planCode: BillingPlanCode | null = null,
  ) {
    if (focusModeActive) {
      return;
    }

    if (!externalPaymentsEnabled) {
      triggerHaptic('impact');
      Alert.alert(
        'Subscription required',
        'Access is managed by your school, parent, guardian, or an approved billing channel. Ask them to activate or update your Kitabu AI access.',
      );
      return;
    }

    const hasBlockingOverlay =
      profileOpen || notificationsOpen || chatOpen || isTryOneBobOpen || isCheckoutOpen;

    setProfileOpen(false);
    setNotificationsOpen(false);
    setChatOpen(false);
    setStartLiveAudio(false);
    setIsTryOneBobOpen(false);
    setQueuedTryOneBobOffer(false);

    if (hasBlockingOverlay) {
      setQueuedCheckoutLaunch({ intent, planCode });
      return;
    }

    activateSubscriptionCheckout(intent, planCode);
  }

  function canShowTryOneBobOffer() {
    if (!externalPaymentsEnabled) {
      return false;
    }
    if (!authSession?.user.id) {
      return false;
    }

    const lastSeenAt = tryOneBobOfferSeenAt[authSession.user.id] ?? 0;
    return Date.now() - lastSeenAt >= TRY_ONE_BOB_SUPPRESSION_MS;
  }

  function markTryOneBobOfferSeen() {
    if (!authSession?.user.id) {
      return;
    }

    const nextSeenAt = {
      ...tryOneBobOfferSeenAt,
      [authSession.user.id]: Date.now(),
    };
    setTryOneBobOfferSeenAt(nextSeenAt);
    saveJson(STORAGE_KEYS.tryOneBobOfferSeenAt, nextSeenAt).catch(() => undefined);
  }

  function closeSubscriptionCheckout() {
    const shouldOfferTrial =
      Boolean(trialOfferPlan) &&
      !billingStatus.hasPaidBefore &&
      pendingSubscriptionIntent?.kind !== 'manage_subscription' &&
      !activePaymentRequestId &&
      canShowTryOneBobOffer();

    setIsCheckoutOpen(false);
    setCheckoutStatusLabel(null);
    setCheckoutError(null);
    if (shouldOfferTrial) {
      setQueuedTryOneBobOffer(true);
    }
  }

  function dismissTryOneBobOffer() {
    setIsTryOneBobOpen(false);
  }

  async function resumePendingSubscriptionIntent(intent: PendingSubscriptionIntent) {
    restoreRoute(intent.snapshot);

    if (intent.kind === 'manage_subscription') {
      return;
    }

    if (intent.kind === 'chat_message') {
      setChatOpen(true);
      await sendMessage(intent.text, intent.attachment, true);
      return;
    }

    if (intent.kind === 'start_assignment') {
      const assignment = assignments.find(item => item.id === intent.assignmentId);
      if (assignment) {
        setSelectedAssignment(assignment);
        setCurrentView('homework_quiz');
      }
      return;
    }

    if (intent.kind === 'start_subject_quiz') {
      await startSubjectQuiz(true);
      return;
    }

    if (intent.kind === 'start_subject_brain_tease') {
      setQuizSource('subject');
      setCurrentView('brain_tease');
      return;
    }

    if (intent.kind === 'start_progressive_lesson') {
      await openLearningPathNode(
        {
          id: intent.lessonKey,
          lessonKey: intent.lessonKey,
          lessonVersion: intent.lessonVersion,
          title: intent.lessonKey,
          objective: '',
          estimatedMinutes: 0,
          position: 0,
          status: 'current',
          bestScore: null,
          attemptCount: 0,
          delivery: 'progressive',
        },
        true,
      );
      return;
    }

    if (intent.kind === 'generate_quiz_me') {
      generateQuizMe(intent.config, true);
    }
  }

  async function submitSubscriptionCheckout(planCodeOverride?: BillingPlanCode) {
    if (checkoutSubmissionLockedRef.current || activePaymentRequestId) {
      return;
    }

    if (!externalPaymentsEnabled) {
      setCheckoutError('Subscription access is managed outside this app build.');
      triggerHaptic('error');
      return;
    }

    if (isDemoAccount) {
      setCheckoutError(
        'Payments are disabled for demo accounts. Sign in with your own account to subscribe.',
      );
      triggerHaptic('error');
      return;
    }

    const requestedPlanCode =
      typeof planCodeOverride === 'string' ? planCodeOverride : selectedPlanCode;
    if (!requestedPlanCode) {
      setCheckoutError('Select a subscription plan');
      triggerHaptic('error');
      return;
    }

    const intent = pendingSubscriptionIntent ?? {
      kind: 'manage_subscription' as const,
      snapshot: getRouteSnapshot(currentView),
    };

    checkoutSubmissionLockedRef.current = true;
    setIsSubmittingCheckout(true);
    setCheckoutError(null);
    setCheckoutStatusLabel(null);
    let keepCheckoutLocked = false;

    try {
      const response = await startMpesaCheckout({
        planCode: requestedPlanCode,
        phoneNumber: checkoutPhoneNumber,
        returnTo: intent.snapshot.view,
      });

      if (response.alreadySubscribed) {
        await refreshBillingState();
        setIsCheckoutOpen(false);
        setIsTryOneBobOpen(false);
        const nextIntent = pendingSubscriptionIntent ?? intent;
        setPendingSubscriptionIntent(null);
        await resumePendingSubscriptionIntent(nextIntent);
        return;
      }

      setCheckoutStatusLabel(response.customerMessage);
      setActivePaymentRequestId(response.paymentRequestId);
      keepCheckoutLocked = true;
      setIsTryOneBobOpen(false);
      triggerHaptic('success');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout');
      triggerHaptic('error');
    } finally {
      if (!keepCheckoutLocked) {
        checkoutSubmissionLockedRef.current = false;
      }
      setIsSubmittingCheckout(false);
    }
  }

  function acceptTryOneBobOffer() {
    if (!trialOfferPlan) {
      setIsTryOneBobOpen(false);
      setCheckoutError('The 1 bob offer is unavailable right now.');
      return;
    }

    const intent = pendingSubscriptionIntent ?? {
      kind: 'manage_subscription' as const,
      snapshot: getRouteSnapshot(currentView),
    };
    openSubscriptionCheckout(intent, trialOfferPlan.code);
  }

  function openAdminPortal() {
    if (focusModeActive) {
      return;
    }

    if (!canOpenAdminPortal) {
      return;
    }
    setProfileOpen(false);
    setIsStudentPreview(false);
    setAdminSelectedGrade(currentGrade);
    refreshAdminData().catch(() => undefined);
    navigateTo('admin_portal');
  }

  function openTeacherPortal() {
    if (focusModeActive) {
      return;
    }

    if (!canOpenTeacherPortal) {
      return;
    }
    setProfileOpen(false);
    setIsStudentPreview(false);
    navigateTo('teachers_portal');
  }

  function openStudentPreview() {
    if (focusModeActive) {
      return;
    }

    if (!canOpenTeacherPortal) {
      return;
    }

    setIsStudentPreview(true);
    navigateTo('dashboard');
  }

  function exitStudentPreview() {
    if (focusModeActive) {
      return;
    }

    setIsStudentPreview(false);
    replaceWith(primaryHomeView);
  }

  function openSignInEntry() {
    setAuthMode('login');
    setAuthError(null);
    setAuthEntryScreen('auth');
  }

  function openSignupEntry() {
    setAuthMode('signup');
    setAuthError(null);
    setSignupRole(null);
    setAcceptedTerms(false);
    setAuthEntryScreen('auth');
  }

  function returnToIntro() {
    setAuthError(null);
    setAuthEntryScreen('intro');
  }

  function completeProviderAuthentication(session: AuthSession) {
    setAuthSession(session);
    if (isOnboardingMascotKey(session.user.mascotKey)) {
      setOnboardingMascotKey(session.user.mascotKey);
    }
    rememberAuthenticatedRole(session);
    setAuthEntryScreen('auth');
    const profile = mapAuthSessionToProfile(session);
    setUserProfile(profile);
      setCurrentGrade(profile.grade || DEFAULT_GRADE);
    setIsStudentPreview(false);
    setOnboardingError(null);
    setAuthError(null);
    replaceWith(getPrimaryHomeView(session.user.roles, session.user.email));
  }

  function rememberAuthenticatedRole(session: AuthSession) {
    const role = resolveLastUsedAuthRole(session.user.roles);
    if (!role) {
      return;
    }

    setLastUsedAuthRole(role);
    saveJson(STORAGE_KEYS.lastUsedAuthRole, role).catch(() => undefined);
  }

  async function authenticateWithPassword(email: string, password: string) {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const session = await loginWithPassword(email.trim(), password);
      completeProviderAuthentication(session);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in');
      triggerHaptic('error');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signIn() {
    await authenticateWithPassword(loginEmail, loginPassword);
  }

  async function signInDemo(role: keyof typeof DEMO_ACCOUNT_EMAILS) {
    const email = DEMO_ACCOUNT_EMAILS[role];
    setSignupRole(role);
    setLoginEmail(email);
    setLoginPassword(DEMO_ACCOUNT_PASSWORD);
    await authenticateWithPassword(email, DEMO_ACCOUNT_PASSWORD);
  }

  async function signUp(input?: OnboardingSignupInput) {
    setIsAuthenticating(true);
    setAuthError(null);
    let authenticatedSession: AuthSession | null = null;

    try {
      const role = input?.role ?? signupRole;
      const fullName =
        input?.displayName?.trim() ||
        input?.fullName?.trim() ||
        input?.name?.trim() ||
        signupFullName.trim();
      const password = input?.signupPassword ?? input?.password ?? loginPassword;
      const signupEmailValue = (input?.signupEmail ?? input?.email ?? loginEmail).trim();
      const signupPhoneValue = input?.signupPhone ?? input?.phone ?? '';
      const method: OnboardingSignupMethod =
        input?.signupMethod ?? (signupPhoneValue ? 'phone' : 'email');

      if (!role) {
        throw new Error('Choose an account role before creating an account.');
      }
      if (!input && !acceptedTerms) {
        throw new Error('You must accept the Terms of Use and Privacy Policy before creating an account.');
      }
      if (!fullName) {
        throw new Error('Enter your full name to create an account.');
      }

      let session: AuthSession;
      if (method === 'phone') {
        if (!signupPhoneValue) {
          throw new Error('Enter a valid Kenyan phone number.');
        }
        const request = input?.signupOtp
          ? null
          : await requestPhoneAuthCode({
              purpose: 'signup',
              phoneNumber: signupPhoneValue,
              fullName,
              role,
              acceptedTerms: true,
            });
        session = await verifyPhoneAuthCode({
          purpose: 'signup',
          phoneNumber: signupPhoneValue,
          code: input?.signupOtp ?? request?.developmentCode ?? '123456',
        });
      } else if (method === 'google') {
        const idToken = await requestGoogleIdToken();
        session = await authenticateWithGoogleToken({ idToken, role, acceptedTerms: true });
      } else {
        if (!signupEmailValue) {
          throw new Error('Enter a valid email address.');
        }
        session = await signupWithPassword({
          fullName,
          email: signupEmailValue,
          password,
          role,
          acceptedTerms: true,
          schoolId: input?.schoolId || null,
          gender: input?.gender,
          grade: input?.grade || null,
          mpesaPhoneNumber: input?.mpesaPhoneNumber || null,
          onboardingCompleted: false,
          mascotKey: input?.mascotKey ?? input?.mascot,
        });
        setLoginEmail(signupEmailValue);
        setLoginPassword(password);
      }
      authenticatedSession = session;
      if (input?.gender && input.grade) {
        session = await completeAccountOnboarding({
          gender: input.gender,
          grade: input.grade,
          schoolId: input.schoolId || null,
          mpesaPhoneNumber: input.mpesaPhoneNumber || null,
          school: input.school,
          county: input.county,
          subjects: input.subjects,
          subjectIds: input.selectedSubjectIds,
          mascotKey: input.mascotKey ?? input.mascot,
          countryCode: input.countryCode,
          curriculumCode: curriculumCodeForCountry(input.countryCode),
        });
        authenticatedSession = session;
      }
      completeProviderAuthentication(session);
      if (input) {
        if (input.selectedSubjectIds?.length) {
          saveDashboardSubjects(input.selectedSubjectIds);
        }
        const selectedSchool = input.schoolId
          ? schoolsList.find(school => school.id === input.schoolId)
          : null;
        setUserProfile(current => ({
          ...current,
          school: selectedSchool?.name || input.school || current.school,
          country: countryNameForCode(input.countryCode),
          countryCode: input.countryCode,
          curriculumCode: curriculumCodeForCountry(input.countryCode),
          county: input.county || selectedSchool?.location || current.county,
          region: input.county || selectedSchool?.location || current.region,
          taughtGrades: (input.teacherGradeIds || input.teachGrades)?.length
            ? input.teacherGradeIds || input.teachGrades
            : current.taughtGrades,
          taughtSubjects: input.subjects?.length ? input.subjects : current.taughtSubjects,
        }));
      }
      triggerHaptic('success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create account';
      if (authenticatedSession) {
        completeProviderAuthentication(authenticatedSession);
        setOnboardingError(message);
        triggerHaptic('error');
        return;
      }
      if (message === 'An account with that email already exists') {
        setAuthMode('login');
        setAuthError(
          'An account with that email already exists. Sign in instead.',
        );
      } else {
        setAuthError(message);
      }
      triggerHaptic('error');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function deleteAccount() {
    await deleteMyAccount();
    await signOut();
  }

  async function signOut() {
    await markPresenceOffline('sign_out');
    setAuthSession(null);
    setAuthEntryScreen('intro');
    setAuthError(null);
    setOnboardingError(null);
    setProfileOpen(false);
    setChatOpen(false);
    setIsCheckoutOpen(false);
    setIsTryOneBobOpen(false);
    setPendingSubscriptionIntent(null);
    setActivePaymentRequestId(null);
    checkoutSubmissionLockedRef.current = false;
    setIsSubmittingCheckout(false);
    setIsStudentPreview(false);
    setFocusModeStudentProfile(null);
    setFocusModeActive(false);
    setSessionStartedAt(null);
    setActiveSecondsUsed(0);
    setDailyLimitSeconds(DEFAULT_FOCUS_MODE_LIMIT_SECONDS);
    setSessionExpired(false);
    setFocusModeSetupRequired(false);
    setFocusModeError(null);
    setProgressiveDiagnosticSubject(null);
    setCurrentView('dashboard');
    setNavigationHistory([]);
    setNavigationIndex(-1);
    await persistAuthSession(null);
  }

  async function resendVerificationEmail() {
    if (!authSession?.user.email) {
      throw new Error('No account email is available');
    }

    const response = await requestEmailVerification(authSession.user.email);
    return response.message;
  }

  async function createSchoolRecord(input: {
    name: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanCode: 'weekly' | 'monthly' | 'annual';
    discountId?: string | null;
  }) {
    const school = await createAdminSchool(input);
    if (school) {
      await refreshAdminData();
    }
    return school;
  }

  async function updateSchoolRecord(
    schoolId: string,
    input: {
      name: string;
      location: string;
      principal?: string | null;
      phone?: string | null;
      email?: string | null;
      assignedPlanCode: 'weekly' | 'monthly' | 'annual';
      discountId?: string | null;
    },
  ) {
    const school = await updateAdminSchool(schoolId, input);
    if (school) {
      await refreshAdminData();
    }
    return school;
  }

  async function deleteSchoolRecord(schoolId: string) {
    await deleteAdminSchool(schoolId);
    await refreshAdminData();
  }

  async function updateSchoolPilotRecord(
    schoolId: string,
    input: {
      status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
      startDate?: string | null;
      endDate?: string | null;
      targetStudents: number;
      onboardingStage: number;
      notes?: string | null;
    },
  ) {
    const school = await updateAdminSchoolPilot(schoolId, input);
    if (school) {
      await refreshAdminData();
    }
    return school;
  }

  async function createDiscountRecord(input: {
    name: string;
    type: 'percentage' | 'fixed_ksh';
    amount: number;
    isActive: boolean;
  }) {
    await createAdminDiscount(input);
    await refreshAdminData();
  }

  async function updateDiscountRecord(
    discountId: string,
    input: {
      name: string;
      type: 'percentage' | 'fixed_ksh';
      amount: number;
      isActive: boolean;
    },
  ) {
    await updateAdminDiscount(discountId, input);
    await refreshAdminData();
  }

  async function deleteDiscountRecord(discountId: string) {
    await deleteAdminDiscount(discountId);
    await refreshAdminData();
  }

  async function createAnnouncementRecord(input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: BannerAnnouncement['ctaTarget'];
    startsAt?: string;
    endsAt?: string | null;
    isActive: boolean;
  }) {
    await createAdminAnnouncement(input);
    await Promise.all([refreshAdminData(), refreshDashboardBanner()]);
  }

  async function updateAnnouncementRecord(
    announcementId: string,
    input: {
      title: string;
      message: string;
      ctaLabel?: string | null;
      ctaTarget: BannerAnnouncement['ctaTarget'];
      startsAt?: string;
      endsAt?: string | null;
      isActive: boolean;
    },
  ) {
    await updateAdminAnnouncement(announcementId, input);
    await Promise.all([refreshAdminData(), refreshDashboardBanner()]);
  }

  async function deleteAnnouncementRecord(announcementId: string) {
    await deleteAdminAnnouncement(announcementId);
    await Promise.all([refreshAdminData(), refreshDashboardBanner()]);
  }

  function selectChatSuggestedSubject(subject: Subject) {
    recordRecommendedSubjectSelection('chat', subject);
    sendMessage(`I need help with ${subject.name}`).catch(() => undefined);
  }

  async function sendMessage(
    text: string,
    attachment?: Attachment,
    bypassSubscription = false,
  ) {
    if (isStudentPreview) {
      return;
    }

    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'chat_message',
        snapshot: getRouteSnapshot(currentView),
        text,
        attachment,
      });
      return;
    }

    if (!chatOpen) {
      setChatOpen(true);
    }

    setStartLiveAudio(false);

    const userMessage: ChatMessage = {
      role: 'user',
      text,
      attachment,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await askHomeworkHelper(text, messages, 'chat', attachment, {
        grade: currentGrade,
        studentName: userProfile.name,
        subjectName: selectedSubject?.name,
        strandTitle: selectedSubjectStrands[activeStrandIndex]?.title,
        subStrandTitle: selectedSubStrand?.title,
        curriculumStrands: selectedSubjectStrands,
      });
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Sorry, I had trouble connecting to the tutor network. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function closeChat() {
    setChatOpen(false);
    setStartLiveAudio(false);
    setMessages([]);
  }

  function openChatAttachmentPicker() {
    setChatOpen(true);
    setStartLiveAudio(false);
    setChatAttachmentPickerSignal(signal => signal + 1);
  }

  function openLiveTutorOverlay() {
    setLiveAudioForceFallback(false);
    setChatOpen(false);
    setMessages([]);
    navigateTo('live_audio');
  }

  function goHome() {
    if (focusModeActive && sessionExpired) {
      return;
    }

    if (currentView === resolvedHomeView) {
      return;
    }

    navigateTo(resolvedHomeView);
  }

  function closeLiveAudio() {
    setLiveAudioForceFallback(false);
    setChatOpen(false);
    setMessages([]);
    navigateTo(liveAudioReturnView);
  }

  function openBook(book: Book, startPage = 1) {
    setSelectedBook(book);
    setInitialPage(startPage);
    setPreviewBookId(null);
    navigateTo('reading_mode');
  }

  function closeBookReader() {
    navigateTo('bookshelf_view');
  }

  function updateBookProgress(page: number) {
    if (!selectedBook) {
      return;
    }

    setReadingProgress(prev => ({
      ...prev,
      [selectedBook.id]: page,
    }));
  }

  async function toggleDownload(bookId: string) {
    if (downloadedBooks.has(bookId)) {
      const cachedBook = downloadedBookCache.find(book => book.id === bookId);
      await removeDownloadedBookFiles(cachedBook);
      setDownloadedBooks(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
      setDownloadedBookCache(prev => prev.filter(book => book.id !== bookId));
      return;
    }

    const book = books.find(item => item.id === bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const downloadedBook = await downloadBookForOffline(book);
    setDownloadedBooks(prev => new Set(prev).add(bookId));
    setDownloadedBookCache(prev => [
      downloadedBook,
      ...prev.filter(item => item.id !== bookId),
    ]);
    setBooks(prev => mergeRemoteAndCachedBooks(
      prev.map(item => (item.id === bookId ? downloadedBook : item)),
      [downloadedBook],
    ));
  }

  function generateQuizMe(config: QuizConfig, bypassSubscription = false) {
    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'generate_quiz_me',
        snapshot: getRouteSnapshot('quiz_me_config'),
        config,
      });
      return;
    }

    setIsLoading(true);
    setQuizGenerationError(null);
    setQuizGenerationProgress({ percentage: 0, stage: 'Preparing your quiz' });
    setQuizSource('quiz_me');
    setActiveQuizConfig(config);

    if (config.format === 'audio') {
      generateQuizData(
        config.subject,
        config.strand,
        config.subStrand,
        config.questionCount,
        'quiz',
        currentGrade,
        setQuizGenerationProgress,
      )
        .then(result => {
          if (!result.questions?.length) {
            throw new Error('AI service did not return live audio quiz questions.');
          }

          setGeneratedQuizQuestions(result.questions);
          setQuizGenerationProgress({ percentage: 100, stage: 'Your quiz is ready' });
          setMessages([
            {
              role: 'model',
              text: `Question 1. ${result.questions[0].text}`,
            },
          ]);
          setLiveAudioForceFallback(false);
          setLiveAudioReturnView('quiz_me_config');
          navigateTo('live_audio');
        })
        .catch(error => {
          console.error('Live audio quiz generation failed', error);
          setGeneratedQuizQuestions([]);
          setMessages([]);
          setLiveAudioForceFallback(true);
          setLiveAudioReturnView('quiz_me_config');
          navigateTo('live_audio');
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    generateQuizData(
      config.subject,
      config.strand,
      config.subStrand,
      config.questionCount,
      config.format === 'flashcards' ? 'flashcards' : 'quiz',
      currentGrade,
      setQuizGenerationProgress,
    )
      .then(result => {
        if (config.format === 'flashcards') {
          if (!result.flashcards?.length) {
            throw new Error('AI service did not return flashcards.');
          }

          setGeneratedFlashcards(result.flashcards);
          setQuizGenerationProgress({ percentage: 100, stage: 'Your practice set is ready' });
          setBrainTeaseCompleted(false);
          navigateTo('brain_tease');
          return;
        }

        if (!result.questions?.length) {
          throw new Error('AI service did not return quiz questions.');
        }

        setGeneratedQuizQuestions(result.questions);
        setQuizGenerationProgress({ percentage: 100, stage: 'Your quiz is ready' });
        navigateTo('take_quiz');
      })
      .catch(error => {
        console.error('Quiz generation failed', error);
        setQuizGenerationError(
          error instanceof Error
            ? error.message
            : 'AI service did not generate quiz content. Please try again.',
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  async function startSubjectQuiz(bypassSubscription = false) {
    if (!selectedSubject) {
      return;
    }

    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'start_subject_quiz',
        snapshot: getRouteSnapshot('subject'),
      });
      return;
    }

    setIsLoading(true);
    setQuizGenerationError(null);

    const currentStrand = selectedSubjectStrands[activeStrandIndex];
    const completedSubStrand = currentStrand?.subStrands.find(sub => sub.isCompleted);
    const topic = currentStrand ? currentStrand.title : selectedSubject.name;
    const subTopic = completedSubStrand ? completedSubStrand.title : 'General Review';
    setActiveQuizConfig({
      subject: selectedSubject.name,
      strand: topic,
      subStrand: subTopic,
      questionCount: 10,
      format: 'quiz',
    });

    try {
      const result = await generateQuizData(
        selectedSubject.name,
        topic,
        subTopic,
        10,
        'quiz',
        currentGrade,
      );
      if (!result.questions?.length) {
        throw new Error('AI service did not return quiz questions.');
      }

      setGeneratedQuizQuestions(result.questions);
      setQuizSource('subject');
      navigateTo('take_quiz');
    } catch (error) {
      console.error('Quiz generation error', error);
      setQuizGenerationError(
        error instanceof Error
          ? error.message
          : 'AI service did not generate quiz questions. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startAssignment(assignment: Assignment, bypassSubscription = false) {
    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'start_assignment',
        snapshot: getRouteSnapshot('homework_list'),
        assignmentId: assignment.id,
      });
      return;
    }

    setSelectedAssignment(assignment);
    navigateTo('homework_quiz');
  }

  function startSubjectBrainTease() {
    if (!hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'start_subject_brain_tease',
        snapshot: getRouteSnapshot('subject'),
      });
      return;
    }

    setQuizSource('subject');
    navigateTo('brain_tease');
  }

  async function submitAssignment(score: number, answers: Record<number, string>) {
    if (!selectedAssignment) {
      return;
    }

    if (isStudentPreview) {
      setSelectedAssignment(null);
      navigateTo('homework_list');
      return;
    }

    const submissionAnswers = selectedAssignment.questions.map((question, index) => ({
      questionId: question.id,
      question: question.text,
      answer: answers[index] || '',
      isCorrect: String(question.correctAnswer ?? '').trim() === String(answers[index] || '').trim(),
    }));

    await submitStudentAssignmentRequest(selectedAssignment.id, {
      score,
      answers: submissionAnswers,
    });

    if (authSession) {
      await refreshStudentContentState(authSession, currentGrade);
    }

    setSelectedAssignment(null);
    navigateTo('homework_list');
  }

  function addPoints(points: number) {
    if (isStudentPreview) {
      return;
    }

    setUserProfile(prev => ({
      ...prev,
      points: (prev.points || 0) + points,
    }));
  }

  function updateUserProfile(profileOrUpdater: UserProfile | ((current: UserProfile) => UserProfile)) {
    const nextProfile =
      typeof profileOrUpdater === 'function'
        ? profileOrUpdater(userProfile)
        : profileOrUpdater;
    setUserProfile(nextProfile);

    if (authSession?.user.roles.includes('teacher')) {
      saveTeacherScope({
        grades: nextProfile.taughtGrades ?? [],
        subjects: nextProfile.taughtSubjects ?? [],
        countryCode: nextProfile.countryCode,
        curriculumCode:
          nextProfile.curriculumCode || curriculumCodeForCountry(nextProfile.countryCode),
      }).catch(() => {
        // Profile edits should remain responsive; teacher data refresh will surface server issues.
      });
    }
  }

  function playGame(gameId: string) {
    if (gameId === 'crazy-balloon' || gameId === 'crazy_balloon') {
      navigateTo('crazy_balloon');
      return;
    }

    if (gameId === 'quiz-battle' || gameId === 'quiz_battle') {
      navigateTo('quiz_battle');
      return;
    }

    if (gameId === 'chess-master' || gameId === 'chess_master') {
      navigateTo('chess_master');
      return;
    }

    if (gameId === 'manyanga') {
      navigateTo('manyanga');
      return;
    }

    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2500);
  }

  async function updateCurriculum(
    grade: string,
    subjectId: string,
    data: LearningStrand[],
  ) {
    const subjectName =
      SUBJECTS.find(subject => subject.id === subjectId)?.name ||
      selectedSubject?.name ||
      'Subject';
    await saveCurriculumSubject({
      grade,
      subjectId,
      subjectName,
      strands: data,
    });
    await refreshCurriculumSubject(grade, subjectId);
  }

  async function importCurriculum(
    grade: string,
    subjectId: string,
    subjectName: string,
    fileMeta?: { uri: string; name: string; base64Data?: string; mimeType?: string } | null,
  ) {
    if (!fileMeta?.base64Data) {
      throw new Error('The selected PDF is missing file data for import');
    }

    await importCurriculumPdf({
      grade,
      subjectId,
      subjectName,
      fileName: fileMeta.name,
      mimeType: fileMeta.mimeType || 'application/pdf',
      base64Data: fileMeta.base64Data,
    });
    await refreshCurriculumSubject(grade, subjectId);
  }

  async function publishTeacherAssignment(assignment: Omit<Assignment, 'id' | 'status'>) {
    await createTeacherAssignmentRequest(assignment);

    if (authSession) {
      await Promise.all([
        refreshTeacherData(authSession),
        refreshStudentContentState(authSession, currentGrade),
      ]);
    }
  }

  useEffect(() => {
    if (!authSession) {
      return;
    }

    const homeView = getPrimaryHomeView(authSession.user.roles, authSession.user.email);
    const initialGrade = mapAuthSessionToProfile(authSession).grade || DEFAULT_GRADE;
    setNavigationHistory([
      {
        view: homeView,
        currentGrade: initialGrade,
        adminSelectedGrade: initialGrade,
        selectedSubjectId: null,
        selectedAssignmentId: null,
        selectedSubStrandId: null,
        selectedProgressiveLessonKey: null,
        selectedProgressiveLessonVersion: null,
        selectedBookId: null,
        previewBookId: null,
        activeStrandIndex: 0,
        quizSource: 'subject',
        brainTeaseCompleted: false,
        liveAudioReturnView: homeView,
      },
    ]);
    setNavigationIndex(0);
  }, [authSession]);

  useEffect(() => {
    if (!authSession) {
      setBillingPlans([]);
      setBillingStatus({
        subscription: null,
        savedMpesaPhoneNumber: null,
        maskedMpesaPhoneNumber: null,
        hasPaidBefore: false,
        school: null,
      });
      setTrialOfferPlan(null);
      return;
    }

    refreshBillingState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession]);

  useEffect(() => {
    if (!authSession) {
      refreshSchoolsState().catch(() => setSchoolsList(INITIAL_SCHOOLS));
      setDashboardBanner(null);
      setAssignments([]);
      setBooks([]);
      setPodcasts([]);
      setDueReviews([]);
      setTeacherStudents([]);
      setTeacherAssignments([]);
      setSubmissionsByAssignment({});
      setAdminDiscounts([]);
      setAdminAnnouncements([]);
      setAdminSchoolPlans([]);
      setAdminUsers([]);
      setNotifications([]);
      setParentChildren([]);
      setSelectedParentChildId(null);
      setParentChildIdentifier('');
      setParentDashboardError(null);
      setWeeklyExam(null);
      setWeeklyExamError(null);
      setProgressiveDiagnosticSubject(null);
      setOnboardingDiagnosticCompleted(false);
      setIsDiagnosticStatusLoaded(false);
      return;
    }

    setIsDiagnosticStatusLoaded(false);
    refreshSchoolsState().catch(() => undefined);
    refreshDashboardBanner().catch(() => undefined);
    refreshDueReviews().catch(() => undefined);
    refreshNotifications().catch(() => undefined);
    registerPushTokenForAuthenticatedUser().catch(error => {
      console.warn('Push token registration will retry on the next session', error);
    });
    refreshOnboardingDiagnosticState().catch(() => undefined);
    refreshWeeklyExam().catch(() => undefined);
    refreshStudentContentState(authSession, currentGrade).catch(() => undefined);
    refreshTeacherData(authSession).catch(() => undefined);
    refreshAdminData().catch(() => undefined);
    refreshParentDashboard().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession]);

  useEffect(() => {
    if (currentView === 'weekly_exam' && authSession?.user.roles.includes('student')) {
      refreshWeeklyExam().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, authSession]);

  useEffect(() => {
    if (!authSession?.user.schoolId || schoolsList.length === 0) {
      return;
    }

    const school = schoolsList.find(item => item.id === authSession.user.schoolId);
    if (!school) {
      return;
    }

    setUserProfile(current => ({
      ...current,
      school: school.name,
    }));
  }, [authSession?.user.schoolId, schoolsList]);

  useEffect(() => {
    if (!authSession) {
      setCurriculumData(INITIAL_CURRICULUM_DATA);
      setCurriculumSubjectBundlesByGrade({});
      setLoadedCurriculumGrades({});
      return;
    }

    loadCurriculumGrade(currentGrade).catch(() => undefined);
    refreshStudentContentState(authSession, currentGrade).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession, currentGrade]);

  useEffect(() => {
    if (!authSession || adminSelectedGrade === currentGrade) {
      return;
    }

    loadCurriculumGrade(adminSelectedGrade).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession, adminSelectedGrade, currentGrade]);

  useEffect(() => {
    if (!authSession || (!isAdminRole(authSession.user.roles) && !isKnownAdminEmail(authSession.user.email))) {
      return;
    }

    getAdminSubjectEngagementAnalytics(adminSelectedGrade)
      .then(setAdminSubjectEngagement)
      .catch(() => setAdminSubjectEngagement(null));
  }, [authSession, adminSelectedGrade]);

  useEffect(() => {
    if (!activePaymentRequestId) {
      return;
    }

    const paymentRequestId = activePaymentRequestId;
    let cancelled = false;

    async function pollCheckout() {
      try {
        const status = await getMpesaCheckoutStatus(paymentRequestId);
        if (cancelled) {
          return;
        }

        if (status.status === 'paid') {
          checkoutSubmissionLockedRef.current = false;
          setIsSubmittingCheckout(false);
          await refreshBillingState();
          await refreshNotifications();
          setCheckoutStatusLabel('Payment received. Redirecting you back now.');
          const intent = pendingSubscriptionIntent;
          setPendingSubscriptionIntent(null);
          setActivePaymentRequestId(null);
          setIsCheckoutOpen(false);
          setIsTryOneBobOpen(false);
          triggerHaptic('success');
          if (intent) {
            await resumePendingSubscriptionIntent(intent);
          }
          return;
        }

        if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
          checkoutSubmissionLockedRef.current = false;
          setIsSubmittingCheckout(false);
          await refreshNotifications();
          setActivePaymentRequestId(null);
          setCheckoutStatusLabel(null);
          setCheckoutError(status.resultDescription || 'Payment was not completed');
          triggerHaptic('error');
          return;
        }

        setCheckoutStatusLabel('Check your phone and enter your M-Pesa PIN to continue.');
      } catch (error) {
        if (!cancelled) {
          setCheckoutError(error instanceof Error ? error.message : 'Unable to confirm payment status');
        }
      }
    }

    pollCheckout().catch(() => undefined);
    const timer = setInterval(() => {
      pollCheckout().catch(() => undefined);
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePaymentRequestId, pendingSubscriptionIntent, assignments]);

  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex >= 0 && navigationIndex < navigationHistory.length - 1;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!authSession) {
        return false;
      }

      if (focusModeActive && sessionExpired) {
        return true;
      }

      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }

      if (chatOpen) {
        setChatOpen(false);
        setStartLiveAudio(false);
        setMessages([]);
        return true;
      }

      if (canGoBack) {
        const nextIndex = navigationIndex - 1;
        const snapshot = navigationHistory[nextIndex];
        if (snapshot) {
          if (focusModeActive && isFocusModeBlockedView(snapshot.view)) {
            return true;
          }

          setNavigationIndex(nextIndex);
          restoreRoute(snapshot);
          return true;
        }
      }

      if (currentView !== resolvedHomeView) {
        const nextSnapshot: RouteSnapshot = {
          view: resolvedHomeView,
          currentGrade,
          adminSelectedGrade,
          selectedSubjectId: selectedSubject?.id || null,
          selectedAssignmentId: selectedAssignment?.id || null,
          selectedSubStrandId: selectedSubStrand?.id || null,
          selectedProgressiveLessonKey,
          selectedProgressiveLessonVersion,
          selectedBookId: selectedBook?.id || null,
          previewBookId,
          activeStrandIndex,
          quizSource,
          brainTeaseCompleted,
          liveAudioReturnView,
        };
        setNavigationHistory(prev => {
          const trimmed = prev.slice(0, navigationIndex + 1);
          return [...trimmed, nextSnapshot];
        });
        setNavigationIndex(prev => prev + 1);
        setCurrentView(resolvedHomeView);
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [
    activeStrandIndex,
    adminSelectedGrade,
    assignments,
    authSession,
    brainTeaseCompleted,
    books,
    canGoBack,
    chatOpen,
    currentGrade,
    currentView,
    curriculumData,
    focusModeActive,
    liveAudioReturnView,
    navigationHistory,
    navigationIndex,
    previewBookId,
    profileOpen,
    quizSource,
    resolvedHomeView,
    restoreRoute,
    sessionExpired,
    selectedAssignment?.id,
    selectedProgressiveLessonKey,
    selectedProgressiveLessonVersion,
    selectedBook?.id,
    selectedSubStrand?.id,
    selectedSubject?.id,
  ]);

  return {
    state: {
      isReady,
      authSession,
      authEntryScreen,
      authMode,
      loginEmail,
      loginPassword,
      signupFullName,
      signupRole,
      lastUsedAuthRole,
      acceptedTerms,
      optionalPhoneNumber,
      authError,
      isAuthenticating,
      isSubmittingOnboarding,
      isCheckingDiagnostic:
        isCheckingDiagnostic ||
        Boolean(
          authSession?.user.roles.includes('student') &&
            authSession.user.onboardingCompleted &&
            !isDiagnosticStatusLoaded,
        ),
      onboardingError,
      currentView,
      profileOpen,
      notificationsOpen,
      chatOpen,
      chatAttachmentPickerSignal,
      startLiveAudio,
      messages,
      isLoading,
      currentGrade,
      adminSelectedGrade,
      selectedSubject,
      progressiveDiagnosticSubject,
      selectedAssignment,
      selectedSubStrand,
      subjectLearningPath,
      subjectLearningPathError,
      isLoadingSubjectLearningPath,
      selectedProgressiveLessonKey,
      selectedProgressiveLessonVersion,
      selectedBook,
      previewBookId,
      activeStrandIndex,
      quizSource,
      activeQuizConfig,
      brainTeaseCompleted,
      quizGenerationError,
      quizGenerationProgress,
      generatedFlashcards,
      generatedQuizQuestions,
      selectedSubjectStrands,
      hasStudied,
      curriculumData,
      schoolsList,
      dashboardBanner,
      dueReviews,
      selectedDueReview,
      reviewSessionError,
      isSubmittingReview,
      notifications,
      parentChildren,
      selectedParentChildId,
      parentChildIdentifier,
      parentChildLinkMethod,
      parentDashboardError,
      isLoadingParentDashboard,
      isLinkingParentChild,
      focusModeActive,
      sessionStartedAt,
      activeSecondsUsed,
      dailyLimitSeconds,
      sessionExpired,
      focusModeSecondsRemaining,
      focusModeSetupRequired,
      focusModeSetupCompleted,
      focusModeError,
      isStartingFocusMode,
      isUnlockingFocusMode,
      weeklyExam,
      weeklyExamError,
      isLoadingWeeklyExam,
      isSubmittingWeeklyExam,
      unreadNotificationCount: notifications.filter(item => item.status === 'unread').length,
      userProfile,
      activeUserProfile,
      activeMascotKey,
      assignments,
      teacherStudents,
      teacherAssignments,
      submissionsByAssignment,
      pendingAssignments,
      dashboardSubjectIds,
      dashboardSubjects,
      chatSuggestedSubjects,
      books,
      podcasts,
      readingProgress,
      initialPage,
      isSpotlightMode,
      isMuted,
      liveAudioForceFallback,
      downloadedBooks,
      showComingSoon,
      isStudentPreview,
      billingPlans,
      trialOfferPlan,
      billingStatus,
      hasActiveSubscription,
      externalPaymentsEnabled,
      hasPendingAccountOnboarding,
      hasPendingStudentDiagnostic,
      hasPendingProgressiveDiagnostic,
      isCheckoutOpen,
      isTryOneBobOpen,
      selectedPlanCode,
      checkoutPhoneNumber,
      checkoutError,
      checkoutStatusLabel,
      isSubmittingCheckout: isSubmittingCheckout || Boolean(activePaymentRequestId),
      adminDiscounts,
      adminAnnouncements,
      adminSchoolPlans,
      adminUsers,
      adminAiAnalytics,
      adminBillingAnalytics,
      adminSubjectEngagement,
      canOpenTeacherPortal,
      canOpenAdminPortal,
      canResendVerification: Boolean(
        authSession && !authSession.user.emailVerified && !authSession.user.phoneVerified
      ),
      primaryHomeView,
      canGoBack,
      canGoForward,
      subjects: availableSubjects,
      quizMeSubjectOptions,
      quizMeStrandsBySubject,
      quizMeSubStrandsByStrand,
    },
    actions: {
      setCurrentGrade,
      setAdminSelectedGrade,
      setAuthMode,
      openSignInEntry,
      openSignupEntry,
      returnToIntro,
      setLoginEmail,
      setLoginPassword,
      setSignupFullName,
      setSignupRole,
      setAcceptedTerms,
      setOptionalPhoneNumber,
      setProfileOpen,
      setNotificationsOpen,
      setSelectedParentChildId,
      setParentChildIdentifier,
      setParentChildLinkMethod: (method: 'email' | 'phone') => {
        setParentChildLinkMethod(method);
        setParentChildIdentifier('');
        setParentDashboardError(null);
      },
      setChatOpen,
      setStartLiveAudio,
      setMessages,
      closeSubscriptionCheckout,
      dismissTryOneBobOffer,
      setPendingSubscriptionIntent,
      setSelectedPlanCode,
      setCheckoutPhoneNumber,
      setActiveStrandIndex,
      setQuizSource,
      setBrainTeaseCompleted,
      setIsSpotlightMode,
      setIsMuted,
      setSchoolsList,
      setUserProfile: updateUserProfile,
      updateCurriculum,
      importCurriculum,
      navigateTo,
      goBack,
      goForward,
      openSubject,
      refreshSubjectLearningPath,
      openLearningPathNode,
      finishProgressiveLesson,
      openFeature,
      openBannerAction,
      openSubscriptionCheckout,
      openAdminPortal,
      openTeacherPortal,
      openStudentPreview,
      exitStudentPreview,
      signIn,
      signInDemo,
      signUp,
      completeProviderAuthentication,
      deleteAccount,
      submitAccountOnboarding,
      signOut,
      resendVerificationEmail,
      sendMessage,
      selectChatSuggestedSubject,
      openChatAttachmentPicker,
      closeChat,
      openLiveTutorOverlay,
      goHome,
      closeLiveAudio,
      openBook,
      closeBookReader,
      setPreviewBookId,
      updateBookProgress,
      toggleDownload,
      generateQuizMe,
      startSubjectQuiz,
      startSubjectBrainTease,
      startAssignment,
      submitAssignment,
      submitSubscriptionCheckout,
      acceptTryOneBobOffer,
      refreshBillingState,
      refreshNotifications,
      refreshParentDashboard,
      linkParentChildAccount,
      removeParentChild,
      startFocusMode,
      openFocusModeSettings,
      unlockFocusModeParentControls,
      refreshWeeklyExam,
      beginWeeklyExam,
      submitWeeklyExam,
      startDueReview,
      completeDueReview,
      readNotification,
      readAllNotifications,
      completeDiagnosticOnboarding,
      completeProgressiveDiagnostic,
      refreshAdminData,
      createSchoolRecord,
      updateSchoolRecord,
      deleteSchoolRecord,
      updateSchoolPilotRecord,
      createDiscountRecord,
      updateDiscountRecord,
      deleteDiscountRecord,
      createAnnouncementRecord,
      updateAnnouncementRecord,
      deleteAnnouncementRecord,
      addPoints,
      playGame,
      toggleDashboardSubject,
      saveDashboardSubjects,
      publishTeacherAssignment,
    },
  };
}
