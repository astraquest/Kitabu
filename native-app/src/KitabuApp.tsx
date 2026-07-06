import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomChatBar } from './components/BottomChatBar';
import { ChatOverlayModal } from './components/ChatOverlayModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ProfileModal } from './components/ProfileModal';
import { StudentHeader } from './components/StudentHeader';
import { SubscriptionCheckoutModal } from './components/SubscriptionCheckoutModal';
import { TryForOneBobModal } from './components/TryForOneBobModal';
import { useKitabuApp } from './hooks/useKitabuApp';
import type { PublicSignupRole, SchoolData } from './types/app';
import { LoginScreen } from './screens/LoginScreen';
import { AdminPortalScreen } from './screens/AdminPortalScreen';
import { BookReaderScreen } from './screens/BookReaderScreen';
import { BookshelfScreen } from './screens/BookshelfScreen';
import { BrainTeaseScreen } from './screens/BrainTeaseScreen';
import { ChessMasterScreen } from './screens/ChessMasterScreen';
import { CrazyBalloonScreen } from './screens/CrazyBalloonScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { EmailVerificationScreen } from './screens/EmailVerificationScreen';
import { DiagnosticScreen } from './screens/DiagnosticScreen';
import { GameZoneScreen } from './screens/GameZoneScreen';
import { HomeworkListScreen } from './screens/HomeworkListScreen';
import { HomeworkQuizScreen } from './screens/HomeworkQuizScreen';
import { IntroCarouselScreen } from './screens/IntroCarouselScreen';
import { LetsLearnContentScreen } from './screens/LetsLearnContentScreen';
import { LetsLearnListScreen } from './screens/LetsLearnListScreen';
import { LiveAudioTutorScreen } from './screens/LiveAudioTutorScreen';
import { ManyangaScreen } from './screens/ManyangaScreen';
import { PodcastsScreen } from './screens/PodcastsScreen';
import { ParentDashboardScreen } from './screens/ParentDashboardScreen';
import { QuizBattleScreen } from './screens/QuizBattleScreen';
import { QuizMeScreen } from './screens/QuizMeScreen';
import { ReviewSessionScreen } from './screens/ReviewSessionScreen';
import { SubjectScreen } from './screens/SubjectScreen';
import { StudentOnboardingScreen } from './screens/StudentOnboardingScreen';
import { TakeQuizScreen } from './screens/TakeQuizScreen';
import { TeacherPortalScreen } from './screens/TeacherPortalScreen';
import { WeeklyExamScreen } from './screens/WeeklyExamScreen';
import { PreviewDiagnosticQuestion } from './screens/DiagnosticScreen';

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

function getOnboardingPreviewRole(): PublicSignupRole | null {
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

  return role;
}

function AppSafeArea({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {children}
    </SafeAreaView>
  );
}

export function KitabuApp() {
  const { state, actions } = useKitabuApp();
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
          previewQuestions={PREVIEW_DIAGNOSTIC_QUESTIONS}
          onComplete={() => undefined}
        />
      </AppSafeArea>
    );
  }

  if (onboardingPreviewRole) {
    return (
      <AppSafeArea>
        <StudentOnboardingScreen
          role={onboardingPreviewRole}
          schools={[ONBOARDING_PREVIEW_SCHOOL]}
          isSubmitting={false}
          includeIntroChoices
          collectSignupCredentials
          onSubmit={() => undefined}
        />
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
          />
        </AppSafeArea>
      );
    }

    if (state.authMode === 'signup') {
      return (
        <AppSafeArea>
          <StudentOnboardingScreen
            role={state.signupRole ?? 'student'}
            schools={state.schoolsList}
            isSubmitting={state.isAuthenticating}
            error={state.authError}
            includeIntroChoices
            collectSignupCredentials
            onRoleChange={actions.setSignupRole}
            onSubmit={actions.signUp}
          />
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
          onSubmit={state.authMode === 'login' ? actions.signIn : actions.signUp}
        />
      </AppSafeArea>
    );
  }

  if (!state.authSession.user.emailVerified && !state.authSession.user.phoneVerified) {
    return (
      <AppSafeArea>
        <EmailVerificationScreen
          email={state.authSession.user.email}
          onResend={actions.resendVerificationEmail}
          onSignOut={actions.signOut}
        />
      </AppSafeArea>
    );
  }

  if (state.hasPendingAccountOnboarding) {
    return (
      <AppSafeArea>
        <StudentOnboardingScreen
          role={
            state.authSession.user.roles.includes('teacher')
              ? 'teacher'
              : state.authSession.user.roles.includes('parent')
                ? 'parent'
                : 'student'
          }
          schools={state.schoolsList}
          isSubmitting={state.isSubmittingOnboarding}
          error={state.onboardingError}
          includeIntroChoices
          onSubmit={actions.submitAccountOnboarding}
        />
      </AppSafeArea>
    );
  }

  if (state.isCheckingDiagnostic) {
    return (
      <AppSafeArea>
        <View style={styles.bootstrapWrap}>
          <Image source={splashImage} style={styles.bootstrapSplash} resizeMode="cover" />
        </View>
      </AppSafeArea>
    );
  }

  if (state.hasPendingStudentDiagnostic) {
    return (
      <AppSafeArea>
        <DiagnosticScreen onComplete={actions.completeDiagnosticOnboarding} />
      </AppSafeArea>
    );
  }

  if (state.hasPendingProgressiveDiagnostic && state.progressiveDiagnosticSubject) {
    return (
      <AppSafeArea>
        <DiagnosticScreen
          mode="progressive"
          subjectId={state.progressiveDiagnosticSubject.id}
          subjectName={state.progressiveDiagnosticSubject.name}
          onComplete={actions.completeProgressiveDiagnostic}
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
          onManageSubscription={() => {
            if (state.focusModeActive) {
              return;
            }
            actions.setProfileOpen(false);
            actions.openSubscriptionCheckout({
              kind: 'manage_subscription',
              snapshot: {
                view: state.currentView,
                currentGrade: state.currentGrade,
                adminSelectedGrade: state.adminSelectedGrade,
                selectedSubjectId: state.selectedSubject?.id || null,
                selectedAssignmentId: state.selectedAssignment?.id || null,
                selectedSubStrandId: state.selectedSubStrand?.id || null,
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
          onSave={updatedUser => {
            actions.setUserProfile(updatedUser);
            if (updatedUser.grade && updatedUser.grade !== state.currentGrade) {
              actions.setCurrentGrade(updatedUser.grade);
            }
          }}
          schools={state.schoolsList}
          allSubjects={state.subjects}
          selectedSubjectIds={state.dashboardSubjectIds}
          onToggleSubject={actions.toggleDashboardSubject}
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
          startLiveAudio={state.startLiveAudio}
          attachmentPickerSignal={state.chatAttachmentPickerSignal}
          onClose={actions.closeChat}
          onSendMessage={actions.sendMessage}
          onStartLiveAudio={actions.openLiveTutorOverlay}
          onCloseLiveAudio={() => actions.setStartLiveAudio(false)}
          onOpenLiveScreen={() => actions.openFeature('live_audio')}
        />

        <SubscriptionCheckoutModal
          isOpen={state.isCheckoutOpen}
          plans={state.billingPlans}
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
          phoneNumber={
            state.checkoutPhoneNumber || state.billingStatus.maskedMpesaPhoneNumber || 'your number'
          }
          onClose={actions.dismissTryOneBobOffer}
          onAccept={actions.acceptTryOneBobOffer}
        />

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
  return ['dashboard', 'subject', 'bookshelf_view', 'podcasts_view', 'game_zone'].includes(
    view,
  );
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
        <SubjectScreen
          subject={state.selectedSubject}
          strands={state.selectedSubjectStrands}
          currentStrandIndex={state.activeStrandIndex}
          hasStudied={state.hasStudied}
          isBrainTeaseComplete={state.brainTeaseCompleted}
          isLoading={state.isLoading}
          onPrevStrand={() =>
            actions.setActiveStrandIndex(Math.max(0, state.activeStrandIndex - 1))
          }
          onNextStrand={() =>
            actions.setActiveStrandIndex(
              Math.min(
                state.selectedSubjectStrands.length - 1,
                state.activeStrandIndex + 1,
              ),
            )
          }
          onStartLearning={actions.startLearning}
          onStartBrainTease={actions.startSubjectBrainTease}
          onTakeQuiz={actions.startSubjectQuiz}
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
    case 'lets_learn_list':
      return (
        <LetsLearnListScreen
          strands={state.selectedSubjectStrands}
          subjectName={state.selectedSubject?.name || 'Subject'}
          grade={state.currentGrade}
          onBack={() => actions.openFeature('subject')}
          onSelectSubStrand={actions.selectSubStrand}
        />
      );
    case 'lets_learn_content':
      return state.selectedSubStrand ? (
        <LetsLearnContentScreen
          subStrand={state.selectedSubStrand}
          onClose={() => actions.openFeature('lets_learn_list')}
          onStartQuiz={() => {
            actions.startSelectedSubStrandQuiz();
          }}
        />
      ) : (
        <LetsLearnListScreen
          strands={state.selectedSubjectStrands}
          subjectName={state.selectedSubject?.name || 'Subject'}
          grade={state.currentGrade}
          onBack={() => actions.openFeature('subject')}
          onSelectSubStrand={actions.selectSubStrand}
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
          error={state.quizGenerationError}
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
          subjectName={state.selectedSubject?.name || 'General'}
          questions={state.generatedQuizQuestions}
          onFinish={
            state.quizSource === 'lesson' && state.lessonQuizSubStrandId
              ? async result => {
                  await actions.completeSubStrand(state.lessonQuizSubStrandId!, result.percentage);
                }
              : undefined
          }
          onClose={() => {
            if (state.quizSource === 'lesson') {
              actions.openFeature('lets_learn_content');
              return;
            }
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
          parentName={state.authSession.user.fullName}
          linkIdentifier={state.parentChildIdentifier}
          linkMethod={state.parentChildLinkMethod}
          isLoading={state.isLoadingParentDashboard}
          isLinking={state.isLinkingParentChild}
          error={state.parentDashboardError}
          focusModeActive={state.focusModeActive}
          focusModeSetupRequired={state.focusModeSetupRequired}
          focusModeError={state.focusModeError}
          focusModeSecondsRemaining={state.focusModeSecondsRemaining}
          dailyLimitSeconds={state.dailyLimitSeconds}
          isStartingFocusMode={state.isStartingFocusMode}
          onSelectChild={actions.setSelectedParentChildId}
          onLinkIdentifierChange={actions.setParentChildIdentifier}
          onLinkMethodChange={actions.setParentChildLinkMethod}
          onLinkChild={actions.linkParentChildAccount}
          onUnlinkChild={actions.removeParentChild}
          onStartFocusMode={actions.startFocusMode}
          onOpenFocusModeSettings={actions.openFocusModeSettings}
          onRefresh={actions.refreshParentDashboard}
          onSignOut={actions.signOut}
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
    lets_learn_list: 'Curriculum',
    lets_learn_content: 'Lesson',
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
