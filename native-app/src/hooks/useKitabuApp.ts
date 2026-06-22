import { AppState, BackHandler, Linking } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  getBillingPlans,
  getBillingStatus,
  getMpesaCheckoutStatus,
  startMpesaCheckout,
} from '../services/billingService';
import {
  completeStudentOnboarding,
  confirmEmailVerificationToken,
  deleteMyAccount,
  loadStoredAuthSession,
  loginWithPassword,
  persistAuthSession,
  requestEmailVerification,
  refreshAccessSession,
  signupWithPassword,
} from '../services/authService';
import {
  createAdminAnnouncement,
  createAdminDiscount,
  createAdminSchool,
  deleteAdminAnnouncement,
  deleteAdminDiscount,
  deleteAdminSchool,
  getAdminAnnouncements,
  getAdminDiscounts,
  getAdminSchools,
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
import { getLibraryBooks, getLearningPodcasts } from '../services/contentService';
import {
  completeSubStrandLearning,
  generateSubStrandQuiz,
  getCurriculumForGrade,
  getSubStrandLesson,
  importCurriculumPdf,
  saveCurriculumSubject,
} from '../services/curriculumService';
import {
  createTeacherAssignment as createTeacherAssignmentRequest,
  getStudentAssignments,
  getTeacherAssignments,
  getTeacherStudents,
  submitStudentAssignment as submitStudentAssignmentRequest,
} from '../services/teacherService';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { getQuizBankQuestions } from '../services/quizBankService';
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
  AdminPortalUser,
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
  Flashcard,
  LearningStrand,
  Podcast,
  ParentChildSummary,
  PublicSignupRole,
  Question,
  QuizConfig,
  SchoolData,
  StudentPerformance,
  StudentSubmission,
  SubStrand,
  Subject,
  SubmittedAssignment,
  UserProfile,
  ViewState,
  WeeklyExamPayload,
  SchoolDiscount,
} from '../types/app';

const STORAGE_KEYS = {
  profile: 'kitabu_native_profile',
  optionalPhoneNumber: 'kitabu_optional_phone_number',
  tryOneBobOfferSeenAt: 'kitabu_try_one_bob_offer_seen_at',
  focusMode: 'kitabu_focus_mode',
};
const MAX_DASHBOARD_SUBJECTS = 5;
const TRY_ONE_BOB_SUPPRESSION_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_FOCUS_MODE_LIMIT_SECONDS = 7200;
const DEFAULT_DASHBOARD_SUBJECT_IDS = SUBJECTS.slice(0, MAX_DASHBOARD_SUBJECTS).map(
  subject => subject.id,
);

interface FocusModeSnapshot {
  focusModeActive: boolean;
  sessionStartedAt: number | null;
  activeSecondsUsed: number;
  dailyLimitSeconds: number;
  sessionExpired: boolean;
}

interface RouteSnapshot {
  view: ViewState;
  currentGrade: string;
  adminSelectedGrade: string;
  selectedSubjectId: string | null;
  selectedAssignmentId: string | null;
  selectedSubStrandId: string | null;
  selectedBookId: string | null;
  previewBookId: string | null;
  activeStrandIndex: number;
  quizSource: 'subject' | 'quiz_me' | 'lesson';
  brainTeaseCompleted: boolean;
  liveAudioReturnView: ViewState;
}

type PendingSubscriptionIntent =
  | { kind: 'manage_subscription'; snapshot: RouteSnapshot }
  | { kind: 'chat_message'; snapshot: RouteSnapshot; text: string; attachment?: Attachment }
  | { kind: 'start_assignment'; snapshot: RouteSnapshot; assignmentId: string }
  | { kind: 'start_learning'; snapshot: RouteSnapshot }
  | { kind: 'start_subject_quiz'; snapshot: RouteSnapshot }
  | { kind: 'start_subject_brain_tease'; snapshot: RouteSnapshot }
  | { kind: 'generate_quiz_me'; snapshot: RouteSnapshot; config: QuizConfig };

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

function isTeacherRole(roles: AuthRole[]) {
  return hasRole(roles, 'teacher');
}

function isParentRole(roles: AuthRole[]) {
  return hasRole(roles, 'parent');
}

function getPrimaryHomeView(roles: AuthRole[]): ViewState {
  if (isAdminRole(roles)) {
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

function getFocusModeErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  if (code === 'screen_pinning_disabled') {
    return 'Turn on App Pinning to keep KITABU on screen.';
  }

  if (code === 'screen_pinning_unsupported') {
    return 'Focus Mode is available on Android phones with App Pinning support.';
  }

  if (code === 'device_credential_unavailable') {
    return 'Set up a phone PIN, pattern, or password in Android settings before starting Focus Mode.';
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

async function loadQuizBankFallback(grade: string, limit: number, subjectId?: string | null) {
  try {
    const questions = await getQuizBankQuestions({ grade, subjectId, limit });
    return questions.length > 0 ? questions : INITIAL_QUIZ_QUESTIONS;
  } catch (error) {
    console.error('QuizBank fallback failed', error);
    return INITIAL_QUIZ_QUESTIONS;
  }
}

export function useKitabuApp() {
  const [isReady, setIsReady] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authEntryScreen, setAuthEntryScreen] = useState<'intro' | 'auth'>('intro');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupRole, setSignupRole] = useState<PublicSignupRole | null>(null);
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
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [progressiveDiagnosticSubject, setProgressiveDiagnosticSubject] =
    useState<Subject | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(
    null,
  );
  const [selectedSubStrand, setSelectedSubStrand] = useState<SubStrand | null>(
    null,
  );
  const [activeStrandIndex, setActiveStrandIndex] = useState(0);
  const [quizSource, setQuizSource] = useState<'subject' | 'quiz_me' | 'lesson'>('subject');
  const [brainTeaseCompleted, setBrainTeaseCompleted] = useState(false);
  const [generatedFlashcards, setGeneratedFlashcards] =
    useState<Flashcard[]>(INITIAL_FLASHCARDS);
  const [generatedQuizQuestions, setGeneratedQuizQuestions] =
    useState<Question[]>(INITIAL_QUIZ_QUESTIONS);
  const [curriculumData, setCurriculumData] = useState<
    Record<string, LearningStrand[]>
  >(INITIAL_CURRICULUM_DATA);
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
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [previewBookId, setPreviewBookId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>(
    {},
  );
  const [initialPage, setInitialPage] = useState(1);
  const [isSpotlightMode, setIsSpotlightMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [downloadedBooks, setDownloadedBooks] = useState<Set<string>>(new Set());
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isStudentPreview, setIsStudentPreview] = useState(false);
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
  const [pendingSubscriptionIntent, setPendingSubscriptionIntent] =
    useState<PendingSubscriptionIntent | null>(null);
  const [lessonQuizSubStrandId, setLessonQuizSubStrandId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<RouteSnapshot[]>([]);
  const [navigationIndex, setNavigationIndex] = useState(-1);
  const [adminDiscounts, setAdminDiscounts] = useState<SchoolDiscount[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<BannerAnnouncement[]>([]);
  const [adminSchoolPlans, setAdminSchoolPlans] = useState<BillingPlan[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminPortalUser[]>([]);
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
      isStudentPreview || !authSession ? 'dashboard' : getPrimaryHomeView(authSession.user.roles);

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
          replaceWith(getPrimaryHomeView(nextSession.user.roles));
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
      setAuthSession(null);
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
        storedSession,
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
        }),
        loadStoredAuthSession(),
      ]);

      if (!mounted) {
        return;
      }

      setOptionalPhoneNumber(storedOptionalPhoneNumber);
      setTryOneBobOfferSeenAt(storedTryOneBobOfferSeenAt);
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
      setSessionExpired(storedSessionExpired);
      setSessionStartedAt(
        storedFocusMode.focusModeActive && !storedSessionExpired ? Date.now() : null,
      );

      if (storedSession) {
        try {
          const nextSession = await refreshAccessSession(storedSession.refreshToken);
          const nextHomeView = getPrimaryHomeView(nextSession.user.roles);
          if (!mounted) {
            return;
          }
          const nextProfile = mapAuthSessionToProfile(nextSession);
          setAuthSession(nextSession);
          setUserProfile(nextProfile);
          setCurrentGrade(nextProfile.grade || DEFAULT_GRADE);
          setIsStudentPreview(false);
          setCurrentView(nextHomeView);
          const [plansPayload, status] = await Promise.all([getBillingPlans(), getBillingStatus()]);
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
          await Promise.all([
            refreshStudentContentState(nextSession),
            refreshTeacherData(nextSession),
          ]);
          await persistAuthSession(nextSession);
        } catch {
          if (!mounted) {
            return;
          }
          setAuthSession(null);
          setUserProfile(storedProfile);
          setCurrentGrade(storedProfile.grade || DEFAULT_GRADE);
          setBillingPlans([]);
          setBillingStatus({
            subscription: null,
            savedMpesaPhoneNumber: null,
            maskedMpesaPhoneNumber: null,
            hasPaidBefore: false,
            school: null,
          });
          setTrialOfferPlan(null);
          await persistAuthSession(null);
        }
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
      }).catch(() => undefined);
    }
  }, [
    activeSecondsUsed,
    dailyLimitSeconds,
    focusModeActive,
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

  const pendingAssignments = useMemo(
    () => assignments.filter(item => item.status === 'pending'),
    [assignments],
  );
  const dashboardSubjects = useMemo(
    () => SUBJECTS.filter(subject => dashboardSubjectIds.includes(subject.id)),
    [dashboardSubjectIds],
  );

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
  const quizMeStrandsBySubject = useMemo(() => {
    const bySubject: Record<string, string[]> = {};

    SUBJECTS.forEach(subject => {
      const strands = curriculumData[`${currentGrade}-${subject.id}`] || [];
      bySubject[subject.name] = strands.map(strand => strand.title);
    });

    return bySubject;
  }, [curriculumData, currentGrade]);
  const quizMeSubStrandsByStrand = useMemo(() => {
    const byStrand: Record<string, string[]> = {};

    Object.values(curriculumData).forEach(strands => {
      strands.forEach(strand => {
        byStrand[strand.title] = strand.subStrands.map(subStrand => subStrand.title);
      });
    });

    return byStrand;
  }, [curriculumData]);
  const roles = authSession?.user.roles || [];
  const canOpenTeacherPortal = isTeacherRole(roles) || isAdminRole(roles);
  const canOpenAdminPortal = isAdminRole(roles);
  const primaryHomeView = getPrimaryHomeView(roles);
  const resolvedHomeView = focusModeActive || isStudentPreview ? 'dashboard' : primaryHomeView;
  const hasPendingStudentOnboarding = Boolean(
    authSession?.user.roles.includes('student') && !authSession.user.onboardingCompleted,
  );
  const hasPendingStudentDiagnostic = Boolean(
    authSession?.user.roles.includes('student') &&
      authSession.user.onboardingCompleted &&
      isDiagnosticStatusLoaded &&
      !onboardingDiagnosticCompleted,
  );
  const hasPendingProgressiveDiagnostic = Boolean(progressiveDiagnosticSubject);
  const hasActiveSubscription = Boolean(
    billingStatus.subscription && new Date(billingStatus.subscription.periodEnd).getTime() > Date.now(),
  );
  const focusModeSecondsRemaining = Math.max(0, dailyLimitSeconds - activeSecondsUsed);

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
    if (!authSession) {
      setSchoolsList([]);
      return;
    }

    try {
      setSchoolsList(await getSchools());
    } catch {
      setSchoolsList([]);
    }
  }

  async function refreshDashboardBanner() {
    if (!authSession) {
      setDashboardBanner(null);
      return;
    }

    try {
      setDashboardBanner(await getDashboardBanner());
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

    setIsLoadingParentDashboard(true);
    try {
      const payload = await getParentDashboard();
      const nextChildren = payload.children.length > 0 ? payload.children : INITIAL_PARENT_CHILDREN;
      setParentChildren(nextChildren);
      setSelectedParentChildId(current =>
        current && nextChildren.some(child => child.id === current)
          ? current
          : nextChildren[0]?.id ?? null,
      );
      setParentDashboardError(null);
    } catch {
      setParentChildren(INITIAL_PARENT_CHILDREN);
      setSelectedParentChildId(current =>
        current && INITIAL_PARENT_CHILDREN.some(child => child.id === current)
          ? current
          : INITIAL_PARENT_CHILDREN[0]?.id ?? null,
      );
      setParentDashboardError(null);
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
        throw new Error('Focus Mode is available on Android phones with App Pinning support.');
      }

      await focusModeBridge.startScreenPinning();
      const selectedChild = parentChildren.find(child => child.id === selectedParentChildId);
      const shouldUseStudentPreview = !authSession?.user.roles.includes('student');
      setFocusModeActive(true);
      setSessionStartedAt(Date.now());
      setActiveSecondsUsed(0);
      setDailyLimitSeconds(DEFAULT_FOCUS_MODE_LIMIT_SECONDS);
      setSessionExpired(false);
      setFocusModeSetupRequired(false);
      setFocusModeError(null);
      setProfileOpen(false);
      setNotificationsOpen(false);
      setChatOpen(false);
      setStartLiveAudio(false);
      setMessages([]);
      setIsCheckoutOpen(false);
      setIsTryOneBobOpen(false);
      setIsStudentPreview(shouldUseStudentPreview);
      if (selectedChild?.grade) {
        setCurrentGrade(selectedChild.grade);
      }
      replaceWith('dashboard');
      triggerHaptic('success');
    } catch (error) {
      setFocusModeSetupRequired(true);
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
      await Promise.all([refreshDueReviews(), refreshStudentContentState(authSession!)]);
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

  async function refreshStudentContentState(session: AuthSession) {
    if (!session.user.roles.includes('student')) {
      setAssignments([]);
      setBooks([]);
      setPodcasts([]);
      return;
    }

    try {
      const [nextAssignments, nextBooks, nextPodcasts] = await Promise.all([
        getStudentAssignments(),
        getLibraryBooks(),
        getLearningPodcasts(),
      ]);
      setAssignments(nextAssignments.length > 0 ? nextAssignments : INITIAL_ASSIGNMENTS);
      setBooks(nextBooks);
      setPodcasts(nextPodcasts);
    } catch {
      setAssignments(INITIAL_ASSIGNMENTS);
      setBooks([]);
      setPodcasts([]);
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
    if (!authSession || !isAdminRole(authSession.user.roles)) {
      setAdminDiscounts([]);
      setAdminAnnouncements([]);
      setAdminSchoolPlans([]);
      setAdminUsers([]);
      return;
    }

    try {
      const [schools, discounts, announcements, plans, users] = await Promise.all([
        getAdminSchools(),
        getAdminDiscounts(),
        getAdminAnnouncements(),
        getAdminSubscriptionPlans(),
        getAdminUsers(),
      ]);
      setSchoolsList(schools);
      setAdminDiscounts(discounts);
      setAdminAnnouncements(announcements);
      setAdminSchoolPlans(plans);
      setAdminUsers(users);
    } catch {
      setAdminDiscounts([]);
      setAdminAnnouncements([]);
      setAdminSchoolPlans([]);
      setAdminUsers([]);
    }
  }

  async function submitStudentOnboarding(input: {
    gender: GenderOption;
    grade: string;
    schoolId: string;
    mpesaPhoneNumber?: string | null;
  }) {
    setIsSubmittingOnboarding(true);
    setOnboardingError(null);

    try {
      const nextSession = await completeStudentOnboarding(input);
      setAuthSession(nextSession);
      const nextProfile = mapAuthSessionToProfile(nextSession);
      const selectedSchool = schoolsList.find(school => school.id === input.schoolId);
      setUserProfile({
        ...nextProfile,
        school: selectedSchool?.name || nextProfile.school,
      });
      setCurrentGrade(input.grade);
      setOnboardingDiagnosticCompleted(false);
      setIsDiagnosticStatusLoaded(false);
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
    setLoadedCurriculumGrades(prev => ({
      ...prev,
      [grade]: true,
    }));
  }

  const restoreRoute = useCallback((snapshot: RouteSnapshot) => {
    setCurrentGrade(snapshot.currentGrade);
    setAdminSelectedGrade(snapshot.adminSelectedGrade);
    setActiveStrandIndex(snapshot.activeStrandIndex);
    setQuizSource(snapshot.quizSource);
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
    setCurrentView(snapshot.view);
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

  async function openSubject(subject: Subject) {
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
    navigateTo('subject');
  }

  function toggleDashboardSubject(subjectId: string) {
    setDashboardSubjectIds(current => {
      if (current.includes(subjectId)) {
        return current.length > 1 ? current.filter(id => id !== subjectId) : current;
      }

      if (current.length >= MAX_DASHBOARD_SUBJECTS) {
        return current;
      }

      return [...current, subjectId];
    });
  }

  function saveDashboardSubjects(subjectIds: string[]) {
    const validSubjectIds = new Set(SUBJECTS.map(subject => subject.id));
    const nextSubjectIds = subjectIds
      .filter(subjectId => validSubjectIds.has(subjectId))
      .slice(0, MAX_DASHBOARD_SUBJECTS);

    if (nextSubjectIds.length > 0) {
      setDashboardSubjectIds(nextSubjectIds);
    }
  }

  function openFeature(view: ViewState) {
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

  function openSubscriptionCheckout(intent: PendingSubscriptionIntent) {
    if (focusModeActive) {
      return;
    }

    setPendingSubscriptionIntent(intent);
    setCheckoutError(null);
    setCheckoutStatusLabel(null);
    setActivePaymentRequestId(null);
    setIsTryOneBobOpen(false);
    if (!checkoutPhoneNumber && (billingStatus.savedMpesaPhoneNumber || optionalPhoneNumber)) {
      setCheckoutPhoneNumber(billingStatus.savedMpesaPhoneNumber || optionalPhoneNumber);
    }
    setSelectedPlanCode(null);
    setIsCheckoutOpen(true);
    triggerHaptic('impact');
  }

  function canShowTryOneBobOffer() {
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
      markTryOneBobOfferSeen();
      setIsTryOneBobOpen(true);
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

    if (intent.kind === 'start_learning') {
      await startLearning(true);
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

    if (intent.kind === 'generate_quiz_me') {
      generateQuizMe(intent.config, true);
    }
  }

  async function submitSubscriptionCheckout(planCodeOverride?: BillingPlanCode) {
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

    setIsSubmittingCheckout(true);
    setCheckoutError(null);
    setCheckoutStatusLabel(null);

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
      setIsTryOneBobOpen(false);
      triggerHaptic('success');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout');
      triggerHaptic('error');
    } finally {
      setIsSubmittingCheckout(false);
    }
  }

  async function acceptTryOneBobOffer() {
    if (!trialOfferPlan) {
      return;
    }

    await submitSubscriptionCheckout(trialOfferPlan.code);
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
    setAuthEntryScreen('auth');
    const profile = mapAuthSessionToProfile(session);
    setUserProfile(profile);
      setCurrentGrade(profile.grade || DEFAULT_GRADE);
    setIsStudentPreview(false);
    setOnboardingError(null);
    setAuthError(null);
    replaceWith(getPrimaryHomeView(session.user.roles));
  }

  async function signIn() {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const session = await loginWithPassword(loginEmail.trim(), loginPassword);
      completeProviderAuthentication(session);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in');
      triggerHaptic('error');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function signUp() {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      if (!acceptedTerms) {
        throw new Error('You must accept the Terms of Service and Privacy Policy before creating an account.');
      }
      if (!signupRole) {
        throw new Error('Choose an account role before creating an account.');
      }

      const session = await signupWithPassword({
        fullName: signupFullName.trim(),
        email: loginEmail.trim(),
        password: loginPassword,
        role: signupRole,
        acceptedTerms: true,
        onboardingCompleted: signupRole !== 'student',
      });
      completeProviderAuthentication(session);
      triggerHaptic('success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create account';
      if (message === 'An account with that email already exists') {
        setAuthMode('login');
        setAuthError(
          'An account with that email already exists. Sign in instead. Admin accounts are routed automatically.',
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
    setLessonQuizSubStrandId(null);
    setIsStudentPreview(false);
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
      const responseText = await askHomeworkHelper(text, messages, 'chat', attachment);
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
    setStartLiveAudio(true);
    setChatOpen(true);
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

  function toggleDownload(bookId: string) {
    setDownloadedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
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
    setQuizSource('quiz_me');
    setLessonQuizSubStrandId(null);

    if (config.format === 'audio') {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `Starting Live Audio Quiz on ${config.subject}. Get ready!`,
        },
      ]);
      setLiveAudioReturnView('quiz_me_config');
      navigateTo('live_audio');
      setIsLoading(false);
      return;
    }

    generateQuizData(
      config.subject,
      config.strand,
      config.subStrand,
      config.questionCount,
      config.format === 'flashcards' ? 'flashcards' : 'quiz',
      currentGrade,
    )
      .then(async result => {
        if (config.format === 'flashcards') {
          setGeneratedFlashcards(result?.flashcards || INITIAL_FLASHCARDS);
          setBrainTeaseCompleted(false);
          navigateTo('brain_tease');
          return;
        }

        setGeneratedQuizQuestions(result?.questions || await loadQuizBankFallback(currentGrade, config.questionCount));
        navigateTo('take_quiz');
      })
      .catch(async error => {
        console.error('Quiz generation failed', error);
        if (config.format === 'flashcards') {
          setGeneratedFlashcards(INITIAL_FLASHCARDS);
          navigateTo('brain_tease');
          return;
        }

        setGeneratedQuizQuestions(await loadQuizBankFallback(currentGrade, config.questionCount));
        navigateTo('take_quiz');
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
    setLessonQuizSubStrandId(null);

    const currentStrand = selectedSubjectStrands[activeStrandIndex];
    const completedSubStrand = currentStrand?.subStrands.find(sub => sub.isCompleted);
    const topic = currentStrand ? currentStrand.title : selectedSubject.name;
    const subTopic = completedSubStrand ? completedSubStrand.title : 'General Review';

    try {
      const result = await generateQuizData(
        selectedSubject.name,
        topic,
        subTopic,
        10,
        'quiz',
        currentGrade,
      );
      setGeneratedQuizQuestions(
        result?.questions || await loadQuizBankFallback(currentGrade, 10, selectedSubject.id),
      );
    } catch (error) {
      console.error('Quiz generation error', error);
      setGeneratedQuizQuestions(await loadQuizBankFallback(currentGrade, 10, selectedSubject.id));
    } finally {
      setQuizSource('subject');
      navigateTo('take_quiz');
      setIsLoading(false);
    }
  }

  async function startLearning(bypassSubscription = false) {
    if (!bypassSubscription && !hasActiveSubscription) {
      openSubscriptionCheckout({
        kind: 'start_learning',
        snapshot: getRouteSnapshot('subject'),
      });
      return;
    }

    await loadCurriculumGrade(currentGrade, true);

    navigateTo('lets_learn_list');
  }

  async function selectSubStrand(subStrand: SubStrand) {
    setIsLoading(true);
    try {
      const lesson = await getSubStrandLesson(subStrand.id);
      const nextSubStrand = {
        ...subStrand,
        pages: lesson.pages,
      };

      if (selectedSubject) {
        setCurriculumData(prev => ({
          ...prev,
          [`${currentGrade}-${selectedSubject.id}`]: (prev[`${currentGrade}-${selectedSubject.id}`] || []).map(
            strand => ({
              ...strand,
              subStrands: strand.subStrands.map(item =>
                item.id === subStrand.id ? nextSubStrand : item,
              ),
            }),
          ),
        }));
      }

      setSelectedSubStrand(nextSubStrand);
      navigateTo('lets_learn_content');
    } catch (error) {
      console.error('Lesson load failed', error);
      const fallbackPages =
        subStrand.pages.length > 0
          ? subStrand.pages
          : [
              {
                title: 'Lesson overview',
                content: [
                  'Learning outcomes:',
                  ...(subStrand.outcomes ?? []).map(item => `- ${item.text}`),
                  '',
                  'Inquiry questions:',
                  ...(subStrand.inquiryQuestions ?? []).map(item => `- ${item.text}`),
                ]
                  .join('\n')
                  .trim(),
              },
            ];
      setSelectedSubStrand({
        ...subStrand,
        pages: fallbackPages,
      });
      navigateTo('lets_learn_content');
    } finally {
      setIsLoading(false);
    }
  }

  async function completeSubStrand(subStrandId: string, quizScore?: number) {
    await completeSubStrandLearning(subStrandId, quizScore);
    if (selectedSubject) {
      await refreshCurriculumSubject(currentGrade, selectedSubject.id);
    }
    await refreshDueReviews();
    setSelectedSubStrand(null);
    setBrainTeaseCompleted(false);
    setLessonQuizSubStrandId(null);
    navigateTo('lets_learn_list');
  }

  async function startSelectedSubStrandQuiz() {
    if (!selectedSubStrand) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await generateSubStrandQuiz(selectedSubStrand.id, 10);
      setGeneratedQuizQuestions(result.questions || INITIAL_QUIZ_QUESTIONS);
    } catch (error) {
      console.error('Sub-strand quiz generation failed', error);
      const fallback = await generateQuizData(
        selectedSubject?.name || 'General',
        selectedSubjectStrands[activeStrandIndex]?.title || 'Current Strand',
        selectedSubStrand.title,
        10,
        'quiz',
        currentGrade,
      );
      setGeneratedQuizQuestions(
        fallback?.questions || await loadQuizBankFallback(currentGrade, 10, selectedSubject?.id),
      );
    } finally {
      setQuizSource('lesson');
      setLessonQuizSubStrandId(selectedSubStrand.id);
      navigateTo('take_quiz');
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
      await refreshStudentContentState(authSession);
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

  function playGame(gameId: string) {
    if (gameId === 'crazy-balloon' || gameId === 'crazy_balloon') {
      navigateTo('crazy_balloon');
      return;
    }

    if (gameId === 'quiz-battle' || gameId === 'quiz_battle') {
      navigateTo('quiz_battle');
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
        refreshStudentContentState(authSession),
      ]);
    }
  }

  useEffect(() => {
    if (!authSession) {
      return;
    }

    const homeView = getPrimaryHomeView(authSession.user.roles);
    const initialGrade = mapAuthSessionToProfile(authSession).grade || DEFAULT_GRADE;
    setNavigationHistory([
      {
        view: homeView,
        currentGrade: initialGrade,
        adminSelectedGrade: initialGrade,
        selectedSubjectId: null,
        selectedAssignmentId: null,
        selectedSubStrandId: null,
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
      setSchoolsList([]);
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
    refreshOnboardingDiagnosticState().catch(() => undefined);
    refreshWeeklyExam().catch(() => undefined);
    refreshStudentContentState(authSession).catch(() => undefined);
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
      setLoadedCurriculumGrades({});
      return;
    }

    loadCurriculumGrade(currentGrade).catch(() => undefined);
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
    if (!activePaymentRequestId || !isCheckoutOpen) {
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
  }, [activePaymentRequestId, isCheckoutOpen, pendingSubscriptionIntent, assignments]);

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
      selectedBook,
      previewBookId,
      activeStrandIndex,
      quizSource,
      brainTeaseCompleted,
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
      focusModeError,
      isStartingFocusMode,
      isUnlockingFocusMode,
      weeklyExam,
      weeklyExamError,
      isLoadingWeeklyExam,
      isSubmittingWeeklyExam,
      unreadNotificationCount: notifications.filter(item => item.status === 'unread').length,
      userProfile,
      assignments,
      teacherStudents,
      teacherAssignments,
      submissionsByAssignment,
      pendingAssignments,
      dashboardSubjectIds,
      dashboardSubjects,
      books,
      podcasts,
      readingProgress,
      initialPage,
      isSpotlightMode,
      isMuted,
      downloadedBooks,
      showComingSoon,
      isStudentPreview,
      billingPlans,
      trialOfferPlan,
      billingStatus,
      hasActiveSubscription,
      hasPendingStudentOnboarding,
      hasPendingStudentDiagnostic,
      hasPendingProgressiveDiagnostic,
      isCheckoutOpen,
      isTryOneBobOpen,
      selectedPlanCode,
      checkoutPhoneNumber,
      checkoutError,
      checkoutStatusLabel,
      isSubmittingCheckout,
      adminDiscounts,
      adminAnnouncements,
      adminSchoolPlans,
      adminUsers,
      lessonQuizSubStrandId,
      canOpenTeacherPortal,
      canOpenAdminPortal,
      canResendVerification: Boolean(
        authSession && !authSession.user.emailVerified && !authSession.user.phoneVerified
      ),
      primaryHomeView,
      canGoBack,
      canGoForward,
      subjects: SUBJECTS,
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
      setUserProfile,
      updateCurriculum,
      importCurriculum,
      navigateTo,
      goBack,
      goForward,
      openSubject,
      openFeature,
      openBannerAction,
      openSubscriptionCheckout,
      openAdminPortal,
      openTeacherPortal,
      openStudentPreview,
      exitStudentPreview,
      signIn,
      signUp,
      completeProviderAuthentication,
      deleteAccount,
      submitStudentOnboarding,
      signOut,
      resendVerificationEmail,
      sendMessage,
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
      startLearning,
      startSelectedSubStrandQuiz,
      startSubjectQuiz,
      startSubjectBrainTease,
      selectSubStrand,
      completeSubStrand,
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
