import React from 'react';

export type BaseViewState =
  | 'dashboard'
  | 'subject'
  | 'homework_list'
  | 'homework_quiz'
  | 'podcasts_view'
  | 'bookshelf_view'
  | 'reading_mode'
  | 'lets_learn_list'
  | 'lets_learn_content'
  | 'brain_tease'
  | 'take_quiz'
  | 'quiz_me_config'
  | 'game_zone'
  | 'crazy_balloon'
  | 'quiz_battle'
  | 'admin_portal'
  | 'teachers_portal'
  | 'parent_dashboard'
  | 'weekly_exam'
  | 'review_session';

export type ViewState = BaseViewState | 'live_audio';
export type AuthRole =
  | 'student'
  | 'other'
  | 'teacher'
  | 'school_admin'
  | 'platform_admin'
  | 'parent';
export type PublicSignupRole = 'student' | 'teacher' | 'parent' | 'other';
export type GenderOption = 'male' | 'female' | 'not_specified';
export type OnboardingLanguageCode = 'en' | 'sw';
export type OnboardingMascotKey = 'lion' | 'rabbit' | 'elephant';
export type OnboardingVoiceName = 'Amina' | 'Kamau' | 'Zawadi' | 'Juma';
export type OnboardingNeedKey =
  | 'exam'
  | 'grades'
  | 'resources'
  | 'results'
  | 'support'
  | 'progress'
  | 'learn'
  | 'help';
export type OnboardingGoalKey = string;
export type OnboardingConcernKey = string;
export type OnboardingAchievementKey = string;
export type OnboardingInterestKey = string;

export interface AuthUser {
  id: string;
  schoolId: string | null;
  sessionId?: string | null;
  email: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  fullName: string;
  emailVerified: boolean;
  roles: AuthRole[];
  gender?: GenderOption;
  grade?: string | null;
  onboardingCompleted?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export type BillingPlanCode =
  | 'weekly'
  | 'monthly'
  | 'annual'
  | 'admin_weekly'
  | 'trial_monthly_1bob';

export interface BillingPlan {
  code: BillingPlanCode;
  name: string;
  billingCycle: 'weekly' | 'monthly' | 'annual';
  priceKsh: number;
  priceKshCents: number;
  originalPriceKsh?: number | null;
  originalPriceKshCents?: number | null;
  isPopular: boolean;
  isSchoolManaged?: boolean;
  discountLabel?: string | null;
}

export interface BillingSubscription {
  id: string;
  code: BillingPlanCode;
  name: string;
  billingCycle: 'weekly' | 'monthly' | 'annual';
  priceKsh: number;
  periodStart?: string;
  periodEnd: string;
  status?: string;
}

export interface BillingStatus {
  subscription: BillingSubscription | null;
  savedMpesaPhoneNumber: string | null;
  maskedMpesaPhoneNumber: string | null;
  hasPaidBefore?: boolean;
  school?: SchoolData | null;
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
  school: SchoolData | null;
  trialOffer: BillingPlan | null;
}

export interface MpesaCheckoutResponse {
  paymentRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
  expiresAt: string;
  maskedMpesaPhoneNumber: string | null;
  alreadySubscribed?: boolean;
  subscription?: {
    id: string;
    code: BillingPlanCode;
    periodEnd: string;
  };
}

export interface MpesaCheckoutStatus {
  paymentRequestId: string;
  status: 'pending' | 'initiated' | 'paid' | 'failed' | 'cancelled' | 'expired';
  returnTo: string;
  phoneNumber: string;
  maskedPhoneNumber: string | null;
  resultCode: number | null;
  resultDescription: string | null;
  receiptNumber: string | null;
  expiresAt: string;
  subscription: {
    code: BillingPlanCode;
    name: string;
    periodEnd: string;
  } | null;
}

export interface AuthState {
  mustRotatePassword: boolean;
  requiresPlatformTotp: boolean;
  isBreakGlass: boolean;
}

export interface Attachment {
  mimeType: string;
  data: string;
  name?: string;
  type: 'image' | 'file';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachment?: Attachment;
}

export interface Subject {
  id: string;
  name: string;
  colorFrom: string;
  colorTo: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string | boolean;
  explanation?: string;
  userAnswer?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  gradeLevel: string;
  dueDate: string;
  status: 'pending' | 'completed';
  questions: Question[];
  score?: number;
  submittedDate?: string;
}

export interface Podcast {
  id: string;
  title: string;
  subject: string;
  type: 'audio' | 'video';
  duration: string;
  views: string;
  date: string;
  author: string;
  thumbnail?: string;
  url: string;
}

export interface Book {
  id: string;
  gradeLevel?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  title: string;
  author: string;
  description?: string;
  spineColor: string;
  textColor: string;
  height: string;
  spinePattern?: 'plain' | 'striped' | 'banded';
  downloadable?: boolean;
  pages?: ContentPage[];
}

export interface UserProfile {
  name: string;
  role?: string;
  grade?: string;
  email?: string;
  gender: 'male' | 'female' | 'Not Specified';
  avatar?: string;
  school?: string;
  phone?: string;
  dateJoined?: string;
  lastSeen?: string;
  status?: string;
  points?: number;
}

export interface ContentPage {
  title: string;
  content: string;
}

export interface CurriculumItem {
  id: string;
  text: string;
}

export interface SubStrand {
  id: string;
  title: string;
  type: 'knowledge' | 'skill' | 'competence';
  description?: string;
  pages: ContentPage[];
  isLocked: boolean;
  isCompleted: boolean;
  needsRemediation?: boolean;
  masteryScore?: number | null;
  unlockReason?: string;
  number?: string;
  outcomes?: CurriculumItem[];
  inquiryQuestions?: CurriculumItem[];
}

export interface LearningStrand {
  id: string;
  title: string;
  subTitle: string;
  subStrands: SubStrand[];
  number?: string;
}

export interface CurriculumSubjectBundle {
  subjectId: string;
  subjectName: string;
  strands: LearningStrand[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface QuizConfig {
  subject: string;
  strand: string;
  subStrand: string;
  questionCount: number;
  format: 'flashcards' | 'quiz' | 'audio';
}

export interface StudentPerformance {
  id: string;
  name: string;
  grade: string;
  assessmentScore: number;
  homeworkCompletion: number;
  lastActive: string;
  trend: 'Improving' | 'Stable' | 'Excellent';
  avatar?: string;
}

export interface SubmittedAssignment extends Assignment {
  submittedCount: number;
  totalStudents: number;
  averageScore: number;
  dateSent: string;
}

export interface StudentSubmission {
  studentId: string;
  studentName: string;
  avatar?: string;
  score: number;
  status: 'Completed' | 'Late' | 'Pending';
  answers: {
    questionId: number;
    question: string;
    answer: string;
    isCorrect: boolean;
  }[];
}

export interface AdminPortalUser {
  id: string;
  name: string;
  grade: string;
  school: string;
  email: string;
  status: 'Online' | 'Offline' | 'Active';
  color: 'green' | 'gray';
}

export interface SchoolData {
  id: string;
  name: string;
  status?: string;
  location: string;
  totalStudents: number;
  email?: string;
  phone?: string;
  principal?: string;
  gradeCounts: Record<string, number>;
  pilot?: {
    status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
    startDate: string | null;
    endDate: string | null;
    targetStudents: number;
    onboardingStage: number;
    notes: string | null;
    metrics: {
      onboardedStudents: number;
      engagedStudents: number;
      averageMastery: number;
    };
  };
  pricing?: {
    assignedPlanCode: BillingPlanCode;
    assignedPlanName: string;
    billingCycle: 'weekly' | 'monthly' | 'annual';
    basePriceKsh: number;
    basePriceKshCents: number;
    effectivePriceKsh: number;
    effectivePriceKshCents: number;
    discount: SchoolDiscount | null;
  };
}

export interface SchoolDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_ksh';
  amount: number;
  isActive: boolean;
}

export interface BannerAnnouncement {
  id: string;
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaTarget: 'ask_tutor' | 'manage_subscription' | 'homework_list' | 'bookshelf_view';
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
}

export interface DashboardBanner {
  kind: 'announcement' | 'quote';
  greeting: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  title: string;
  message: string;
  ctaLabel: string;
  ctaTarget: 'ask_tutor' | 'manage_subscription' | 'homework_list' | 'bookshelf_view';
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: 'in_app' | 'sms' | 'push' | 'email';
  status: 'unread' | 'read';
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface DiagnosticQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  subStrandKey: string;
  prompt: string;
  options: string[];
  difficulty: number;
  timeLimitSeconds: number;
}

export interface DiagnosticResult {
  correct: number;
  total: number;
  percentage: number;
  subjects: Array<{
    subjectId: string;
    correct: number;
    total: number;
    percentage: number;
    averageConfidence: number;
  }>;
}

export interface DiagnosticSession {
  sessionId: string;
  questions: DiagnosticQuestion[];
}

export interface DueReview {
  id: string;
  subjectId: string;
  subStrandKey: string;
  nextReviewDate: string;
  intervalDays: number;
  masteryScore: number;
}

export interface WeeklyExamQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  subStrandKey: string;
  prompt: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
}

export interface WeeklyExamAttempt {
  id: string;
  status: 'in_progress' | 'completed';
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  startedAt: string;
  submittedAt: string | null;
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean }>;
}

export interface WeeklyExamHistoryItem {
  id: string;
  examId: string;
  title: string;
  weekStart: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface WeeklyExamPayload {
  exam: {
    id: string;
    title: string;
    gradeLevel: string;
    weekStart: string;
    durationMinutes: number;
    opensAt: string;
    closesAt: string;
    questions: WeeklyExamQuestion[];
  };
  attempt: WeeklyExamAttempt | null;
  history: WeeklyExamHistoryItem[];
}

export interface ParentChildAssignment {
  id: string;
  title: string;
  subject: string;
  status: 'pending' | 'completed';
  score: number | null;
  dueAt: string | null;
}

export interface ParentChildSummary {
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
  recent_assignments: ParentChildAssignment[];
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
