import React from 'react';
import {
  Image,
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
import { LoginScreen } from './screens/LoginScreen';
import { AdminPortalScreen } from './screens/AdminPortalScreen';
import { BookReaderScreen } from './screens/BookReaderScreen';
import { BookshelfScreen } from './screens/BookshelfScreen';
import { BrainTeaseScreen } from './screens/BrainTeaseScreen';
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

const splashImage = require('./assets/splashscreen.png');

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
  const usesStudentHeader = shouldUseStudentHeader(state.currentView);
  const usesStandaloneScreen = shouldUseStandaloneScreen(state.currentView);

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

    return (
      <AppSafeArea>
        <LoginScreen
          mode={state.authMode}
          email={state.loginEmail}
          password={state.loginPassword}
          fullName={state.signupFullName}
          signupRole={state.signupRole}
          acceptedTerms={state.acceptedTerms}
          error={state.authError}
          isSubmitting={state.isAuthenticating}
          onModeChange={actions.setAuthMode}
          onEmailChange={actions.setLoginEmail}
          onPasswordChange={actions.setLoginPassword}
          onFullNameChange={actions.setSignupFullName}
          onSignupRoleChange={actions.setSignupRole}
          onAcceptedTermsChange={actions.setAcceptedTerms}
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

  if (state.hasPendingStudentOnboarding) {
    return (
      <AppSafeArea>
        <StudentOnboardingScreen
          schools={state.schoolsList}
          isSubmitting={state.isSubmittingOnboarding}
          error={state.onboardingError}
          onSubmit={actions.submitStudentOnboarding}
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

  return (
    <AppSafeArea>
      <View style={styles.container}>
        {usesStudentHeader ? (
          <StudentHeader
            userAvatar={state.userProfile.avatar}
            onOpenProfile={() => actions.setProfileOpen(true)}
            onOpenNotifications={() => actions.setNotificationsOpen(true)}
            unreadNotificationCount={state.unreadNotificationCount}
            showPreviewExit={state.isStudentPreview}
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
          isOpen={state.profileOpen}
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
          userProfile={state.userProfile}
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
          allSubjects={state.subjects}
          selectedSubjectIds={state.dashboardSubjectIds}
          onOpenSubject={actions.openSubject}
          onSaveSubjectSelection={actions.saveDashboardSubjects}
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
          user={state.userProfile}
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
          user={state.userProfile}
        />
      );
    case 'quiz_me_config':
      return (
        <QuizMeScreen
          isLoading={state.isLoading}
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
          userProfile={state.userProfile}
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
          totalPoints={state.userProfile.points || 0}
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
    case 'podcasts_view':
      return <PodcastsScreen podcasts={state.podcasts} onBack={actions.goHome} />;
    case 'teachers_portal':
      return (
        <TeacherPortalScreen
          onBack={() => actions.openFeature('dashboard')}
          onOpenStudentPreview={actions.openStudentPreview}
          students={state.teacherStudents}
          assignments={state.teacherAssignments}
          submissionsByAssignment={state.submissionsByAssignment}
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
          linkIdentifier={state.parentChildIdentifier}
          linkMethod={state.parentChildLinkMethod}
          isLoading={state.isLoadingParentDashboard}
          isLinking={state.isLinkingParentChild}
          error={state.parentDashboardError}
          onSelectChild={actions.setSelectedParentChildId}
          onLinkIdentifierChange={actions.setParentChildIdentifier}
          onLinkMethodChange={actions.setParentChildLinkMethod}
          onLinkChild={actions.linkParentChildAccount}
          onUnlinkChild={actions.removeParentChild}
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
          allSubjects={state.subjects}
          selectedSubjectIds={state.dashboardSubjectIds}
          onOpenSubject={actions.openSubject}
          onSaveSubjectSelection={actions.saveDashboardSubjects}
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
