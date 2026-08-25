import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomChatBar } from './components/BottomChatBar';
import { ChatOverlayModal } from './components/ChatOverlayModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ProfileModal } from './components/ProfileModal';
import { StudentHeader } from './components/StudentHeader';
import { SubscriptionCheckoutModal } from './components/SubscriptionCheckoutModal';
import { TryForOneBobModal } from './components/TryForOneBobModal';
import { useKitabuApp } from './hooks/useKitabuApp';
import {
  useLandingSoundtrack,
  type LandingSoundtrackController,
} from './services/landingSoundtrack';
import { getMobileAnalyticsAppVersion, mobileAnalytics } from './services/mobileAnalytics';
import type { PublicSignupRole, SchoolData } from './types/app';
import { LoginScreen } from './screens/LoginScreen';
import { AdminPortalScreen } from './screens/AdminPortalScreen';
import { BookReaderScreen } from './screens/BookReaderScreen';
import { BookshelfScreen } from './screens/BookshelfScreen';
import { BrainTeaseScreen } from './screens/BrainTeaseScreen';
import { ChessMasterScreen } from './screens/ChessMasterScreen';
import { CrazyBalloonScreen } from './screens/CrazyBalloonScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DiagnosticScreen } from './screens/DiagnosticScreen';
import { GameZoneScreen } from './screens/GameZoneScreen';
import { HomeworkListScreen } from './screens/HomeworkListScreen';
import { HomeworkQuizScreen } from './screens/HomeworkQuizScreen';
import { IntroCarouselScreen } from './screens/IntroCarouselScreen';
import { LiveAudioTutorScreen } from './screens/LiveAudioTutorScreen';
import { ManyangaScreen } from './screens/ManyangaScreen';
import { PodcastsScreen } from './screens/PodcastsScreen';
import { ParentDashboardScreen } from './screens/ParentDashboardScreen';
import { QuizBattleScreen } from './screens/QuizBattleScreen';
import { QuizMeScreen } from './screens/QuizMeScreen';
import { ReviewSessionScreen } from './screens/ReviewSessionScreen';
import { NeutralOnboardingScreen } from './screens/NeutralOnboardingScreen';
import { ParentHouseholdOnboardingScreen } from './screens/ParentHouseholdOnboardingScreen';
import { ProfileChooserScreen } from './screens/ProfileChooserScreen';
import { TakeQuizScreen } from './screens/TakeQuizScreen';
import { TeacherPortalScreen } from './screens/TeacherPortalScreen';
import { WeeklyExamScreen } from './screens/WeeklyExamScreen';
import { PreviewDiagnosticQuestion } from './screens/DiagnosticScreen';
import { SubjectLearningPathScreen } from './features/progressiveLearning/screens/SubjectLearningPathScreen';
import { ProgressiveLessonScreen } from './features/progressiveLearning/screens/ProgressiveLessonScreen';

const splashImage = require('./assets/splashscreen.png');

const ONBOARDING_PREVIEW_SCHOOL: SchoolData = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Kitabu Demo School',
  location: 'Nairobi',
  totalStudents: 120,
  gradeCounts: { 'Grade 6': 40 },
};

const PREVIEW_DIAGNOSTIC_QUESTIONS: PreviewDiagnosticQuestion[] = [
  {
    id: 'preview-math-fractions',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subStrandKey: 'fractions',
    prompt: 'What is 1/2 + 1/4?',
    options: ['1/6', '2/6', '3/4', '1/8'],
    correctAnswer: '3/4',
    difficulty: 2,
    timeLimitSeconds: 90,
  },
  {
    id: 'preview-english-nouns',
    subjectId: 'english',
    subjectName: 'English',
    subStrandKey: 'grammar',
    prompt: 'Which word is a noun in this sentence: The teacher opened the book?',
    options: ['opened', 'teacher', 'the', 'quickly'],
    correctAnswer: 'teacher',
    difficulty: 1,
    timeLimitSeconds: 90,
  },
  {
    id: 'preview-math-place-value',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subStrandKey: 'place-value',
    prompt: 'What is the value of 7 in 4,725?',
    options: ['7', '70', '700', '7,000'],
    correctAnswer: '700',
    difficulty: 2,
    timeLimitSeconds: 90,
  },
];

function shouldShowDiagnosticPreview() {
  const location = (globalThis as { location?: { search?: string } }).location;
  return Boolean(__DEV__ && location?.search?.includes('previewDiagnostic=1'));
}

function getOnboardingPreviewRole(): Exclude<PublicSignupRole, 'student'> | null {
  if (!__DEV__) {
    return null;
  }

  const location = (globalThis as {
    location?: { hash?: string; pathname?: string; search?: string };
  }).location;
  const params = new URLSearchParams(location?.search ?? '');
  const role = params.get('previewOnboarding');

  if (role !== 'student' && role !== 'teacher' && role !== 'parent' && role !== 'other') {
    return null;
  }

  try {
    params.delete('previewOnboarding');
    const nextSearch = params.toString();
    const nextUrl = `${location?.pathname ?? '/'}${nextSearch ? `?${nextSearch}` : ''}${location?.hash ?? ''}`;
    const history = (globalThis as {
      history?: { replaceState?: (data: unknown, unused: string, url?: string | URL | null) => void; state?: unknown };
    }).history;
    history?.replaceState?.(history.state ?? null, '', nextUrl);
  } catch {
    // URL cleanup is best-effort; the preview should still render if history is unavailable.
  }

  return role === 'student' ? null : role;
}

function AppSafeArea({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      {children}
    </SafeAreaView>
  );
}

function RetiredDirectSignupScreen({
  onBack,
}: {
  onBack: () => void | Promise<void>;
}) {
  return (
    <View style={styles.retiredOnboardingScreen}>
      <View style={styles.retiredOnboardingPanel}>
        <Text style={styles.retiredOnboardingEyebrow}>KITABU · ACCOUNT SETUP</Text>
        <Text style={styles.retiredOnboardingTitle}>Student setup is parent-managed</Text>
        <Text style={styles.retiredOnboardingCopy}>
          Student accounts are created inside a parent household. Ask your parent or guardian
          to add you as a learner, then sign in with the access they provide.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.retiredOnboardingButton}
        >
          <Text style={styles.retiredOnboardingButtonText}>Back to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OnboardingSoundtrackSurface({
  children,
  soundtrack,
}: {
  children: React.ReactNode;
  soundtrack: LandingSoundtrackController;
}) {
  return (
    <View style={styles.onboardingAudioSurface}>
      {children}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={soundtrack.muted ? 'Unmute landing soundtrack' : 'Mute landing soundtrack'}
        accessibilityHint="Toggles the quiet landing soundtrack"
        onPress={soundtrack.toggleMuted}
        style={styles.onboardingSoundtrackToggle}
        testID="onboarding-soundtrack-toggle"
      >
        {soundtrack.muted ? <VolumeX color="#0F172A" size={20} /> : <Volume2 color="#0F172A" size={20} />}
      </Pressable>
    </View>
  );
}

export function KitabuApp() {
  const { state, actions } = useKitabuApp();
  const soundtrack = useLandingSoundtrack();
  const { stop: stopSoundtrack } = soundtrack;
  const analyticsRole = state.authSession?.user.roles.find(role =>
    ['student', 'parent', 'teacher', 'other', 'school_admin', 'platform_admin', 'sales_agent'].includes(role),
  ) ?? null;
  React.useEffect(() => {
    mobileAnalytics.updateContext({
      role: analyticsRole,
      userId: state.authSession?.user.id ?? null,
      grade: state.currentGrade,
      appVersion: getMobileAnalyticsAppVersion(),
    });
    mobileAnalytics.initialize().catch(() => undefined);
  }, [analyticsRole, state.authSession?.user.id, state.currentGrade]);
  React.useEffect(() => {
    if (state.authSession || (state.authEntryScreen === 'auth' && state.authMode === 'login')) {
      stopSoundtrack();
    }
  }, [stopSoundtrack, state.authEntryScreen, state.authMode, state.authSession]);
  const [onboardingPreviewRole] = React.useState(getOnboardingPreviewRole);
  const usesStudentHeader = shouldUseStudentHeader(state.currentView);
  const usesStandaloneScreen = shouldUseStandaloneScreen(state.currentView);
  const canSwitchHeaderGrade =
    state.currentView === 'dashboard' || state.currentView === 'bookshelf_view';
  const showDiagnosticPreview = shouldShowDiagnosticPreview();
  const activeUserProfile = state.activeUserProfile;

  if (showDiagnosticPreview) {
    return (
      <AppSafeArea>
        <DiagnosticScreen
          mascotKey={state.activeMascotKey}
          voiceName={state.activeUserProfile.voiceName}
          previewQuestions={PREVIEW_DIAGNOSTIC_QUESTIONS}
          onComplete={() => undefined}
        />
      </AppSafeArea>
    );
  }

  if (onboardingPreviewRole) {
    return (
      <AppSafeArea>
        {onboardingPreviewRole === 'parent' ? (
          <ParentHouseholdOnboardingScreen
            schools={[ONBOARDING_PREVIEW_SCHOOL]}
            isSubmitting={false}
            collectSignupCredentials
            onRoleChange={() => undefined}
            onSubmit={() => undefined}
            onSearchSchools={actions.searchOnboardingSchools}
          />
        ) : (
          <NeutralOnboardingScreen
            role={onboardingPreviewRole}
            schools={[ONBOARDING_PREVIEW_SCHOOL]}
            isSubmitting={false}
            includeIntroChoices
            collectSignupCredentials
            externalPaymentsEnabled={state.externalPaymentsEnabled}
            onSubmit={() => undefined}
            onSearchSchools={actions.searchOnboardingSchools}
          />
        )}
      </AppSafeArea>
    );
  }

  if (!state.isReady) {
    return (
      <AppSafeArea>
        <View style={styles.bootstrapWrap}>
          <Image source={splashImage} style={styles.bootstrapSplash} resizeMode="cover" />
        </View>
      </AppSafeArea>
    );
  }

  if (!state.authSession) {
    if (state.authEntryScreen === 'intro') {
      return (
        <AppSafeArea>
          <IntroCarouselScreen
            onSignIn={actions.openSignInEntry}
            onCreateAccount={actions.openSignupEntry}
            soundtrack={soundtrack}
          />
        </AppSafeArea>
      );
    }

    if (state.authMode === 'signup') {
      return (
        <AppSafeArea>
          <OnboardingSoundtrackSurface soundtrack={soundtrack}>
            {state.signupRole === 'parent' || !state.signupRole ? (
              <ParentHouseholdOnboardingScreen
                schools={state.schoolsList}
                isSubmitting={state.isAuthenticating}
                error={state.authError}
                collectSignupCredentials
                onRoleChange={actions.setSignupRole}
                onProfileSetupStarted={actions.recordProfileSetupStarted}
                onSubmit={actions.signUp}
                onCreateSchool={actions.createOnboardingSchool}
                onSearchSchools={actions.searchOnboardingSchools}
              />
            ) : state.signupRole === 'student' ? (
              <RetiredDirectSignupScreen
                onBack={() => {
                  actions.setSignupRole(null);
                  actions.setAuthMode('login');
                }}
              />
            ) : (
              <NeutralOnboardingScreen
                role={state.signupRole}
                schools={state.schoolsList}
                isSubmitting={state.isAuthenticating}
                error={state.authError}
                includeIntroChoices={state.signupRole !== 'teacher'}
                collectSignupCredentials
                externalPaymentsEnabled={state.externalPaymentsEnabled}
                onRoleChange={actions.setSignupRole}
                onProfileSetupStarted={actions.recordProfileSetupStarted}
                onSubmit={actions.signUp}
                onSearchSchools={actions.searchOnboardingSchools}
              />
            )}
          </OnboardingSoundtrackSurface>
        </AppSafeArea>
      );
    }

    return (
      <AppSafeArea>
        <LoginScreen
          mode={state.authMode}
          email={state.loginEmail}
          password={state.loginPassword}
          fullName={state.signupFullName}
          signupRole={state.signupRole}
          lastUsedRole={state.lastUsedAuthRole}
          knownProfiles={state.profileIndex}
          acceptedTerms={state.acceptedTerms}
          optionalPhoneNumber={state.optionalPhoneNumber}
          error={state.authError}
          isSubmitting={state.isAuthenticating}
          onModeChange={actions.setAuthMode}
          onEmailChange={actions.setLoginEmail}
          onPasswordChange={actions.setLoginPassword}
          onFullNameChange={actions.setSignupFullName}
          onSignupRoleChange={actions.setSignupRole}
          onAcceptedTermsChange={actions.setAcceptedTerms}
          onOptionalPhoneNumberChange={actions.setOptionalPhoneNumber}
          onAuthenticated={actions.completeProviderAuthentication}
          onDemoLogin={actions.signInDemo}
          onSubmit={state.authMode === 'login' ? actions.signIn : actions.signUp}
        />
      </AppSafeArea>
    );
  }

  if (state.hasPendingAccountOnboarding) {
    return (
      <AppSafeArea>
        {state.authSession.user.roles.includes('parent') ? (
          <ParentHouseholdOnboardingScreen
            schools={state.schoolsList}
            isSubmitting={state.isSubmittingOnboarding}
            error={state.onboardingError}
            collectSignupCredentials={false}
            initialParentName={state.authSession.user.fullName}
            initialCountryCode={state.userProfile?.countryCode || state.authSession.user.countryCode}
            skipHouseholdSetup={state.parentHouseholdOnboardingRequested}
            onCreateSchool={actions.createOnboardingSchool}
            onRoleChange={() => undefined}
            onProfileSetupStarted={actions.recordProfileSetupStarted}
            onSubmit={input => actions.submitAccountOnboarding(input)}
            onSearchSchools={actions.searchOnboardingSchools}
          />
        ) : state.authSession.user.roles.includes('student') &&
          !state.authSession.user.roles.includes('teacher') &&
          !state.authSession.user.roles.includes('other') ? (
          <RetiredDirectSignupScreen onBack={() => actions.signOut('intro')} />
        ) : (
          <NeutralOnboardingScreen
            role={
              state.authSession.user.roles.includes('teacher')
                ? 'teacher'
                : 'other'
            }
            schools={state.schoolsList}
            isSubmitting={state.isSubmittingOnboarding}
            error={state.onboardingError}
            includeIntroChoices
            externalPaymentsEnabled={state.externalPaymentsEnabled}
            onCreateSchool={actions.createOnboardingSchool}
            onProfileSetupStarted={actions.recordProfileSetupStarted}
            onSubmit={actions.submitAccountOnboarding}
            onSearchSchools={actions.searchOnboardingSchools}
          />
        )}
      </AppSafeArea>
    );
  }

  if (state.hasPendingProgressiveDiagnostic && state.progressiveDiagnosticSubject) {
    return (
      <AppSafeArea>
        <DiagnosticScreen
          mascotKey={state.activeMascotKey}
          voiceName={state.activeUserProfile.voiceName}
          mode="progressive"
          subjectId={state.progressiveDiagnosticSubject.id}
          subjectName={state.progressiveDiagnosticSubject.name}
          onComplete={actions.completeProgressiveDiagnostic}
          onCompletionConfirmed={actions.recordProgressiveDiagnosticCompletion}
        />
      </AppSafeArea>
    );
  }

  if (state.focusModeActive && state.sessionExpired) {
    return (
      <AppSafeArea>
        <FocusModeTimeUpScreen
          isUnlocking={state.isUnlockingFocusMode}
          error={state.focusModeError}
          onUnlockParentControls={actions.unlockFocusModeParentControls}
        />
      </AppSafeArea>
    );
  }

  return (
    <AppSafeArea>
      <View style={styles.container}>
        {usesStudentHeader ? (
          <StudentHeader
            userAvatar={activeUserProfile.avatar}
            userCountry={activeUserProfile.country}
            onOpenProfile={() => {
              if (!state.focusModeActive) {
                actions.setProfileOpen(true);
              }
            }}
            onOpenNotifications={() => actions.setNotificationsOpen(true)}
            unreadNotificationCount={state.unreadNotificationCount}
            currentGrade={canSwitchHeaderGrade ? state.currentGrade : undefined}
            onSelectGrade={canSwitchHeaderGrade ? actions.setCurrentGrade : undefined}
            showPreviewExit={state.isStudentPreview && !state.focusModeActive}
            onExitPreview={actions.exitStudentPreview}
          />
        ) : usesStandaloneScreen ? null : (
          <View style={styles.pageHeader}>
            <Text style={styles.brand}>KITABU</Text>
            <Text style={styles.pageTitle}>
              {getTitle(state.currentView, state.selectedSubject?.name)}
            </Text>
          </View>
        )}

        <View style={styles.screenWrap}>{renderScreen(state, actions)}</View>

        {state.currentView === 'dashboard' && !state.isStudentPreview ? (
          <BottomChatBar
            isLoading={state.isLoading}
            onSendMessage={message => actions.sendMessage(message)}
            onOpen={() => actions.setChatOpen(true)}
            onAddAttachment={actions.openChatAttachmentPicker}
            onOpenLive={actions.openLiveTutorOverlay}
          />
        ) : null}

        <ProfileModal
          isOpen={state.profileOpen && !state.focusModeActive}
          onClose={() => actions.setProfileOpen(false)}
          onOpenAdmin={actions.openAdminPortal}
          onOpenTeacher={actions.openTeacherPortal}
          onSignOut={actions.signOut}
          onDeleteAccount={actions.deleteAccount}
          showTeacherPortalButton={state.canOpenTeacherPortal}
          showAdminPortalButton={state.canOpenAdminPortal}
          canResendVerification={state.canResendVerification}
          onResendVerification={actions.resendVerificationEmail}
          billingStatus={state.billingStatus}
          externalPaymentsEnabled={state.externalPaymentsEnabled}
          onManageSubscription={() => {
            if (state.focusModeActive) {
              return;
            }
            actions.openSubscriptionCheckout({
              kind: 'manage_subscription',
              snapshot: {
                view: state.currentView,
                currentGrade: state.currentGrade,
                adminSelectedGrade: state.adminSelectedGrade,
                selectedSubjectId: state.selectedSubject?.id || null,
                selectedAssignmentId: state.selectedAssignment?.id || null,
                selectedSubStrandId: state.selectedSubStrand?.id || null,
                selectedProgressiveLessonKey: state.selectedProgressiveLessonKey,
                selectedProgressiveLessonVersion: state.selectedProgressiveLessonVersion,
                selectedBookId: state.selectedBook?.id || null,
                previewBookId: state.previewBookId,
                activeStrandIndex: state.activeStrandIndex,
                quizSource: state.quizSource,
                brainTeaseCompleted: state.brainTeaseCompleted,
                liveAudioReturnView: state.primaryHomeView,
              },
            });
          }}
          focusModeActive={state.focusModeActive}
          focusModeSetupRequired={state.focusModeSetupRequired}
          focusModeError={state.focusModeError}
          focusModeSecondsRemaining={state.focusModeSecondsRemaining}
          dailyLimitSeconds={state.dailyLimitSeconds}
          isStartingFocusMode={state.isStartingFocusMode}
          onStartFocusMode={actions.startFocusMode}
          onOpenFocusModeSettings={actions.openFocusModeSettings}
          user={state.userProfile}
          onSave={async (updatedUser, options) => {
            await actions.setUserProfile(updatedUser, options);
            if (updatedUser.grade && updatedUser.grade !== state.currentGrade) {
              actions.setCurrentGrade(updatedUser.grade);
            }
          }}
          onSearchSchools={actions.searchOnboardingSchools}
          schools={state.schoolsList}
          allSubjects={state.subjects}
          selectedSubjectIds={state.dashboardSubjectIds}
          onToggleSubject={actions.toggleDashboardSubject}
          onSwapSubject={actions.swapDashboardSubject}
          analyticsRole={analyticsRole}
        />

        <NotificationsModal
          isOpen={state.notificationsOpen}
          notifications={state.notifications}
          onClose={() => actions.setNotificationsOpen(false)}
          onMarkRead={actions.readNotification}
          onMarkAllRead={actions.readAllNotifications}
        />

        <ChatOverlayModal
          isOpen={state.chatOpen}
          isLoading={state.isLoading}
          messages={state.messages}
          currentGrade={state.currentGrade}
          selectedSubject={state.selectedSubject}
          selectedSubStrand={state.selectedSubStrand}
          selectedAssignment={state.selectedAssignment}
          userProfile={activeUserProfile}
          mascotKey={state.activeMascotKey}
          suggestedSubjects={state.chatSuggestedSubjects}
          startLiveAudio={state.startLiveAudio}
          attachmentPickerSignal={state.chatAttachmentPickerSignal}
          onClose={actions.closeChat}
          onSendMessage={actions.sendMessage}
          onSelectSuggestedSubject={actions.selectChatSuggestedSubject}
          onStartLiveAudio={actions.openLiveTutorOverlay}
          onCloseLiveAudio={() => actions.setStartLiveAudio(false)}
          onOpenLiveScreen={() => actions.openFeature('live_audio')}
        />

        {state.externalPaymentsEnabled ? (
          <>
            <SubscriptionCheckoutModal
              isOpen={state.isCheckoutOpen}
              plans={
                state.billingPlans
              }
              selectedPlanCode={state.selectedPlanCode}
              phoneNumber={state.checkoutPhoneNumber}
              maskedSavedPhoneNumber={state.billingStatus.maskedMpesaPhoneNumber}
              isSubmitting={state.isSubmittingCheckout}
              statusLabel={state.checkoutStatusLabel}
              error={state.checkoutError}
              onClose={actions.closeSubscriptionCheckout}
              onSelectPlan={actions.setSelectedPlanCode}
              onChangePhoneNumber={actions.setCheckoutPhoneNumber}
              onUseSavedPhone={() =>
                actions.setCheckoutPhoneNumber(state.billingStatus.savedMpesaPhoneNumber || '')
              }
              onContinue={actions.submitSubscriptionCheckout}
            />

            <TryForOneBobModal
              isOpen={state.isTryOneBobOpen}
              isSubmitting={state.isSubmittingCheckout}
              mascotKey={state.activeMascotKey}
              error={state.checkoutError}
              onClose={actions.dismissTryOneBobOffer}
              onAccept={actions.acceptTryOneBobOffer}
            />
          </>
        ) : null}

        {state.showComingSoon ? (
          <View pointerEvents="none" style={styles.comingSoonOverlay}>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>Coming Soon!</Text>
            </View>
          </View>
        ) : null}
      </View>
    </AppSafeArea>
  );
}

function FocusModeTimeUpScreen({
  isUnlocking,
  error,
  onUnlockParentControls,
}: {
  isUnlocking: boolean;
  error: string | null;
  onUnlockParentControls: () => void;
}) {
  return (
    <View style={styles.timeUpScreen}>
      <View style={styles.timeUpPanel}>
        <Text style={styles.timeUpEyebrow}>Focus Mode</Text>
        <Text style={styles.timeUpTitle}>Time's Up</Text>
        <Text style={styles.timeUpCopy}>
          Learning time is finished. Please return the phone to your parent.
        </Text>
        <Text style={styles.timeUpCopy}>
          To continue, Android will ask for the phone PIN, pattern, password, fingerprint, or face unlock.
        </Text>
        <Text style={styles.timeUpSmall}>KITABU does not create a separate PIN.</Text>
        {error ? <Text style={styles.timeUpError}>{error}</Text> : null}
        <Pressable
          disabled={isUnlocking}
          onPress={onUnlockParentControls}
          style={({ pressed }) => [
            styles.timeUpButton,
            pressed && styles.timeUpButtonPressed,
            isUnlocking && styles.timeUpButtonDisabled,
          ]}>
          {isUnlocking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.timeUpButtonText}>Unlock parent controls</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function shouldUseStudentHeader(view: string) {
  return [
    'dashboard',
    'subject',
    'progressive_lesson',
    'homework_list',
    'homework_quiz',
    'bookshelf_view',
    'reading_mode',
    'podcasts_view',
    'quiz_me_config',
    'brain_tease',
    'take_quiz',
    'live_audio',
    'game_zone',
    'crazy_balloon',
    'quiz_battle',
    'chess_master',
    'manyanga',
  ].includes(view);
}

function shouldUseStandaloneScreen(view: string) {
  return ['teachers_portal', 'admin_portal', 'parent_dashboard', 'weekly_exam', 'review_session'].includes(view);
}

function renderScreen(
  state: ReturnType<typeof useKitabuApp>['state'],
  actions: ReturnType<typeof useKitabuApp>['actions'],
) {
  switch (state.currentView) {
    case 'subject':
      return state.selectedSubject ? (
        <SubjectLearningPathScreen
          subject={state.selectedSubject}
          strands={state.selectedSubjectStrands}
          grade={state.currentGrade}
          path={state.subjectLearningPath}
          mascotKey={state.activeMascotKey}
          isLoading={state.isLoadingSubjectLearningPath}
          error={state.subjectLearningPathError}
          onRetry={actions.refreshSubjectLearningPath}
          onOpenNode={actions.openLearningPathNode}
          onBack={actions.goHome}
        />
      ) : (
        <DashboardScreen
          banner={state.dashboardBanner}
          homeworkNotificationCount={
            state.pendingAssignments.length +
            state.dueReviews.length +
            (state.weeklyExam && state.weeklyExam.attempt?.status !== 'completed' ? 1 : 0)
          }
          subjects={state.dashboardSubjects}
          onOpenSubject={actions.openSubject}
          onOpenFeature={actions.openFeature}
          onBannerAction={actions.openBannerAction}
        />
      );
    case 'progressive_lesson':
      return state.selectedProgressiveLessonKey && state.selectedProgressiveLessonVersion ? (
        <ProgressiveLessonScreen
          lessonKey={state.selectedProgressiveLessonKey}
          lessonVersion={state.selectedProgressiveLessonVersion}
          grade={state.currentGrade}
          mascotKey={state.activeMascotKey}
          subjectName={
            state.selectedSubject?.name ??
            state.subjectLearningPath?.subjectName ??
            'Learning'
          }
          onBack={() => actions.openFeature('subject')}
          onComplete={actions.finishProgressiveLesson}
        />
      ) : state.selectedSubject ? (
        <SubjectLearningPathScreen
          subject={state.selectedSubject}
          strands={state.selectedSubjectStrands}
          grade={state.currentGrade}
          path={state.subjectLearningPath}
          mascotKey={state.activeMascotKey}
          isLoading={state.isLoadingSubjectLearningPath}
          error={state.subjectLearningPathError}
          onRetry={actions.refreshSubjectLearningPath}
          onOpenNode={actions.openLearningPathNode}
          onBack={actions.goHome}
        />
      ) : null;
    case 'homework_list':
      return (
        <HomeworkListScreen
          assignments={state.assignments}
          dueReviews={state.dueReviews}
          weeklyExam={state.weeklyExam}
          onBack={actions.goHome}
          onStartAssignment={actions.startAssignment}
          onStartReview={actions.startDueReview}
          onOpenWeeklyExam={() => actions.openFeature('weekly_exam')}
        />
      );
    case 'homework_quiz':
      return state.selectedAssignment ? (
        <HomeworkQuizScreen
          assignment={state.selectedAssignment}
          voiceName={state.activeUserProfile.voiceName}
          onClose={() => actions.openFeature('homework_list')}
          onSubmit={actions.submitAssignment}
        />
      ) : (
        <HomeworkListScreen
          assignments={state.assignments}
          dueReviews={state.dueReviews}
          weeklyExam={state.weeklyExam}
          onBack={actions.goHome}
          onStartAssignment={actions.startAssignment}
          onStartReview={actions.startDueReview}
          onOpenWeeklyExam={() => actions.openFeature('weekly_exam')}
        />
      );
    case 'bookshelf_view':
      return (
        <BookshelfScreen
          books={state.books}
          readingProgress={state.readingProgress}
          previewBookId={state.previewBookId}
          downloadedBooks={state.downloadedBooks}
          isSpotlightMode={state.isSpotlightMode}
          onOpenBook={actions.openBook}
          onBack={actions.goHome}
          onSetPreviewBookId={actions.setPreviewBookId}
          onToggleSpotlight={() => actions.setIsSpotlightMode(!state.isSpotlightMode)}
          onToggleDownload={actions.toggleDownload}
          user={state.activeUserProfile}
        />
      );
    case 'reading_mode':
      return state.selectedBook ? (
        <BookReaderScreen
          book={state.selectedBook}
          initialPage={state.initialPage}
          isSpotlightMode={state.isSpotlightMode}
          isMuted={state.isMuted}
          voiceName={state.activeUserProfile.voiceName}
          onClose={actions.closeBookReader}
          onToggleMute={() => actions.setIsMuted(!state.isMuted)}
          onUpdateProgress={actions.updateBookProgress}
        />
      ) : (
        <BookshelfScreen
          books={state.books}
          readingProgress={state.readingProgress}
          previewBookId={state.previewBookId}
          downloadedBooks={state.downloadedBooks}
          isSpotlightMode={state.isSpotlightMode}
          onOpenBook={actions.openBook}
          onBack={actions.goHome}
          onSetPreviewBookId={actions.setPreviewBookId}
          onToggleSpotlight={() => actions.setIsSpotlightMode(!state.isSpotlightMode)}
          onToggleDownload={actions.toggleDownload}
          user={state.activeUserProfile}
        />
      );
    case 'quiz_me_config':
      return (
        <QuizMeScreen
          isLoading={state.isLoading}
          mascotKey={state.activeMascotKey}
          voiceName={state.activeUserProfile.voiceName}
          progress={state.quizGenerationProgress}
          error={state.quizGenerationError}
          subjectOptions={state.quizMeSubjectOptions}
          strandsBySubject={state.quizMeStrandsBySubject}
          subStrandsByStrand={state.quizMeSubStrandsByStrand}
          onBack={actions.goHome}
          onGenerate={actions.generateQuizMe}
        />
      );
    case 'live_audio':
      return (
        <LiveAudioTutorScreen
          onClose={actions.closeLiveAudio}
          initialMessages={state.messages}
          currentGrade={state.currentGrade}
          selectedSubject={state.selectedSubject}
          selectedSubStrand={state.selectedSubStrand}
          selectedAssignment={state.selectedAssignment}
          userProfile={state.activeUserProfile}
          voiceName={state.activeUserProfile.voiceName}
          mascotKey={state.activeMascotKey}
          forceComingSoonFallback={state.liveAudioForceFallback}
          quizQuestions={state.quizSource === 'quiz_me' ? state.generatedQuizQuestions : []}
        />
      );
    case 'brain_tease':
      return (
        <BrainTeaseScreen
          cards={state.generatedFlashcards}
          subjectName={state.selectedSubject?.name}
          onClose={() => {
            if (state.quizSource === 'quiz_me') {
              actions.openFeature('quiz_me_config');
              return;
            }
            actions.openFeature('subject');
          }}
          onComplete={() => {
            if (state.quizSource === 'quiz_me') {
              actions.openFeature('quiz_me_config');
              return;
            }
            actions.setBrainTeaseCompleted(true);
            actions.openFeature('subject');
          }}
        />
      );
    case 'take_quiz':
      return (
        <TakeQuizScreen
          grade={state.currentGrade}
          subjectName={state.activeQuizConfig?.subject || state.selectedSubject?.name || 'QuizMe'}
          strandName={state.activeQuizConfig?.strand || state.selectedSubStrand?.title || 'General Review'}
          questions={state.generatedQuizQuestions}
          narrationSessionId={state.generatedQuizNarrationSessionId}
          quizMeSessionId={state.quizSource === 'quiz_me' ? state.quizMeSessionId : null}
          onSubmitAnswer={state.quizSource === 'quiz_me' ? actions.submitQuizMeAnswer : undefined}
          mascotKey={state.activeMascotKey}
          voiceName={state.activeUserProfile.voiceName}
          onClose={() => {
            if (state.quizSource === 'quiz_me') {
              actions.openFeature('quiz_me_config');
              return;
            }
            actions.openFeature('subject');
          }}
        />
      );
    case 'game_zone':
      return (
        <GameZoneScreen
          totalPoints={state.activeUserProfile.points || 0}
          onBack={actions.goHome}
          onPlayGame={actions.playGame}
        />
      );
    case 'crazy_balloon':
      return (
        <CrazyBalloonScreen
          onAddPoints={actions.addPoints}
          onBack={() => actions.openFeature('game_zone')}
        />
      );
    case 'quiz_battle':
      return (
        <QuizBattleScreen
          onAddPoints={actions.addPoints}
          onBack={() => actions.openFeature('game_zone')}
          voiceName={state.activeUserProfile.voiceName}
        />
      );
    case 'chess_master':
      return (
        <ChessMasterScreen
          currentUserId={state.authSession.user.id}
          onBack={() => actions.openFeature('game_zone')}
        />
      );
    case 'manyanga':
      return (
        <ManyangaScreen
          onAddPoints={actions.addPoints}
          onBack={() => actions.openFeature('game_zone')}
        />
      );
    case 'podcasts_view':
      return (
        <PodcastsScreen
          mascotKey={state.activeMascotKey}
          podcasts={state.podcasts}
          onBack={actions.goHome}
        />
      );
    case 'teachers_portal':
      return (
        <TeacherPortalScreen
          teacherName={state.authSession.user.fullName}
          teacherEmail={state.authSession.user.email}
          students={state.teacherStudents}
          assignments={state.teacherAssignments}
          submissionsByAssignment={state.submissionsByAssignment}
          schoolsList={state.schoolsList}
          userProfile={state.activeUserProfile}
          onSaveProfile={actions.setUserProfile}
          onSignOut={actions.signOut}
          onPublishAssignment={actions.publishTeacherAssignment}
        />
      );
    case 'admin_portal':
      return (
        <AdminPortalScreen
          onBack={() => actions.openFeature('dashboard')}
          currentGrade={state.adminSelectedGrade}
          subjects={state.subjects}
          curriculumData={state.curriculumData}
          schoolsList={state.schoolsList}
          users={state.adminUsers}
          schoolPlans={state.adminSchoolPlans}
          discounts={state.adminDiscounts}
          announcements={state.adminAnnouncements}
          userProfile={state.userProfile}
          onSelectGrade={actions.setAdminSelectedGrade}
          onCreateSchool={actions.createSchoolRecord}
          onUpdateSchoolRecord={actions.updateSchoolRecord}
          onDeleteSchoolRecord={actions.deleteSchoolRecord}
          onUpdateSchoolPilot={actions.updateSchoolPilotRecord}
          onCreateDiscount={actions.createDiscountRecord}
          onUpdateDiscountRecord={actions.updateDiscountRecord}
          onDeleteDiscountRecord={actions.deleteDiscountRecord}
          onCreateAnnouncement={actions.createAnnouncementRecord}
          onUpdateAnnouncementRecord={actions.updateAnnouncementRecord}
          onDeleteAnnouncementRecord={actions.deleteAnnouncementRecord}
          onUpdateCurriculum={actions.updateCurriculum}
          onImportCurriculum={actions.importCurriculum}
        />
      );
    case 'parent_dashboard':
      return (
        <ParentDashboardScreen
          children={state.parentChildren}
          selectedChildId={state.selectedParentChildId}
          parentName={state.userProfile.name || state.authSession.user.fullName}
          parentEmail={state.userProfile.email || state.authSession.user.email}
          parentPhone={state.userProfile.phone || state.authSession.user.phoneNumber}
          parentRole={
            state.userProfile.role ||
            state.authSession.user.roles.find(role => role === 'parent') ||
            'Parent'
          }
          mascotKey={state.activeMascotKey}
          linkIdentifier={state.parentChildIdentifier}
          linkMethod={state.parentChildLinkMethod}
          isLoading={state.isLoadingParentDashboard}
          isLinking={state.isLinkingParentChild}
          error={state.parentDashboardError}
          focusModeActive={state.focusModeActive}
          focusModeSetupRequired={state.focusModeSetupRequired}
          focusModeSetupCompleted={state.focusModeSetupCompleted}
          focusModeError={state.focusModeError}
          focusModeSecondsRemaining={state.focusModeSecondsRemaining}
          dailyLimitSeconds={state.dailyLimitSeconds}
          isStartingFocusMode={state.isStartingFocusMode}
          onSelectChild={actions.openParentChildDashboard}
          onLinkIdentifierChange={actions.setParentChildIdentifier}
          onLinkMethodChange={actions.setParentChildLinkMethod}
          onLinkChild={actions.linkParentChildAccount}
          onUnlinkChild={actions.removeParentChild}
          onStartFocusMode={actions.startFocusMode}
          onOpenFocusModeSettings={actions.openFocusModeSettings}
          onOpenBilling={() => actions.openBannerAction('manage_subscription')}
          externalPaymentsEnabled={state.externalPaymentsEnabled}
          onSaveParentProfile={updates =>
            actions.setUserProfile(current => ({
              ...current,
              email: updates.email,
              name: updates.name,
              phone: updates.phone,
            }))
          }
          onRefresh={actions.refreshParentDashboard}
          onSignOut={actions.signOut}
          onAddChild={actions.startParentHouseholdOnboarding}
        />
      );
    case 'profile_chooser':
      return (
        <ProfileChooserScreen
          parentAvatarKey={state.userProfile.avatar}
          parentGender={state.userProfile.gender}
          parentGrade={state.userProfile.grade}
          parentName={state.userProfile.name || state.authSession.user.fullName}
          children={state.parentChildren}
          isLoading={state.isLoadingParentDashboard}
          onParent={actions.openParentDashboard}
          onChild={actions.openParentChildDashboard}
          onAddAccount={actions.openAddAccountFlow}
        />
      );
    case 'weekly_exam':
      return (
        <WeeklyExamScreen
          data={state.weeklyExam}
          error={state.weeklyExamError}
          isLoading={state.isLoadingWeeklyExam}
          isSubmitting={state.isSubmittingWeeklyExam}
          onBack={() => actions.openFeature('homework_list')}
          onRetry={actions.refreshWeeklyExam}
          onStart={actions.beginWeeklyExam}
          onSubmit={actions.submitWeeklyExam}
        />
      );
    case 'review_session':
      return (
        <ReviewSessionScreen
          review={state.selectedDueReview}
          error={state.reviewSessionError}
          isSubmitting={state.isSubmittingReview}
          onBack={() => actions.openFeature('homework_list')}
          onComplete={actions.completeDueReview}
        />
      );
    case 'dashboard':
    default:
      return (
      <DashboardScreen
          banner={state.dashboardBanner}
          homeworkNotificationCount={
            state.pendingAssignments.length +
            state.dueReviews.length +
            (state.weeklyExam && state.weeklyExam.attempt?.status !== 'completed' ? 1 : 0)
          }
          subjects={state.dashboardSubjects}
          onOpenSubject={actions.openSubject}
          onOpenFeature={actions.openFeature}
          onBannerAction={actions.openBannerAction}
        />
      );
  }
}

function getTitle(view: string, subjectName?: string) {
  if (view === 'subject' && subjectName) {
    return subjectName;
  }

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    homework_list: 'Homework',
    homework_quiz: 'Homework Quiz',
    bookshelf_view: 'Bookshelf',
    reading_mode: 'Reader',
    progressive_lesson: 'Learning Adventure',
    brain_tease: 'Brain Tease',
    take_quiz: 'Take Quiz',
    quiz_me_config: 'QuizMe',
    live_audio: 'Live Tutor',
    game_zone: 'Game Zone',
    crazy_balloon: 'Crazy Balloon',
    quiz_battle: 'Quiz Battle',
    chess_master: 'Chess Master',
    manyanga: 'Manyanga!',
    podcasts_view: 'Podcasts',
    teachers_portal: 'Teacher Portal',
    admin_portal: 'Admin Portal',
  };

  return titles[view] || 'Kitabu';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  bootstrapWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
  },
  bootstrapSplash: {
    width: '100%',
    height: '100%',
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brand: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  screenWrap: {
    flex: 1,
  },
  onboardingAudioSurface: {
    flex: 1,
    position: 'relative',
  },
  onboardingSoundtrackToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
    width: 42,
    zIndex: 20,
  },
  retiredOnboardingScreen: {
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  retiredOnboardingPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 520,
    padding: 24,
    width: '100%',
  },
  retiredOnboardingEyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  retiredOnboardingTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  retiredOnboardingCopy: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  retiredOnboardingButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 48,
  },
  retiredOnboardingButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  timeUpScreen: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  timeUpPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxWidth: 460,
    padding: 22,
    width: '100%',
  },
  timeUpEyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timeUpTitle: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },
  timeUpCopy: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 12,
  },
  timeUpSmall: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  timeUpError: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  timeUpButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  timeUpButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  timeUpButtonDisabled: {
    opacity: 0.72,
  },
  timeUpButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonPill: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
