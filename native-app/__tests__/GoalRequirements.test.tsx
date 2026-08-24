import React from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { SubjectGrid, SubjectSelector } from '../src/components/SubjectGrid';
import { StudentHeader } from '../src/components/StudentHeader';
import { SubscriptionCheckoutModal } from '../src/components/SubscriptionCheckoutModal';
import { INITIAL_ASSIGNMENTS, SUBJECTS } from '../src/data/mockData';
import { HomeworkListScreen } from '../src/screens/HomeworkListScreen';
import { LoginScreen } from '../src/screens/LoginScreen';
import { NeutralOnboardingScreen } from '../src/screens/NeutralOnboardingScreen';
import { TryForOneBobModal } from '../src/components/TryForOneBobModal';
import { LEARNING_MASCOT_SOURCES } from '../src/features/progressiveLearning/components/LearningMascotReaction';
import type { BillingPlan, DueReview, SchoolData, WeeklyExamPayload } from '../src/types/app';

jest.mock('../src/services/authService', () => ({
  requestPasswordReset: jest.fn(),
  requestPhoneAuthCode: jest.fn(),
  verifyPhoneAuthCode: jest.fn(),
  authenticateWithGoogleToken: jest.fn(),
}));

jest.mock('../src/services/googleAuthService', () => ({
  requestGoogleIdToken: jest.fn(),
}));

const defaultLoginProps: React.ComponentProps<typeof LoginScreen> = {
  mode: 'login',
  email: '',
  password: '',
  fullName: '',
  signupRole: 'student',
  acceptedTerms: false,
  optionalPhoneNumber: '',
  isSubmitting: false,
  onModeChange: jest.fn(),
  onEmailChange: jest.fn(),
  onPasswordChange: jest.fn(),
  onFullNameChange: jest.fn(),
  onSignupRoleChange: jest.fn(),
  onAcceptedTermsChange: jest.fn(),
  onOptionalPhoneNumberChange: jest.fn(),
  onAuthenticated: jest.fn(),
  onDemoLogin: jest.fn(),
  onSubmit: jest.fn(),
};

const plans: BillingPlan[] = [
  {
    code: 'annual',
    name: 'Annual',
    billingCycle: 'annual',
    priceKsh: 1000,
    priceKshCents: 100000,
    originalPriceKsh: null,
    originalPriceKshCents: null,
    isPopular: false,
  },
  {
    code: 'weekly',
    name: 'Weekly',
    billingCycle: 'weekly',
    priceKsh: 150,
    priceKshCents: 15000,
    originalPriceKsh: 250,
    originalPriceKshCents: 25000,
    isPopular: false,
  },
  {
    code: 'monthly',
    name: 'Monthly',
    billingCycle: 'monthly',
    priceKsh: 300,
    priceKshCents: 30000,
    originalPriceKsh: 500,
    originalPriceKshCents: 50000,
    isPopular: true,
  },
];

const dueReview: DueReview = {
  id: 'review-1',
  subjectId: 'math',
  subStrandKey: 'number-operations',
  nextReviewDate: '2026-06-19',
  intervalDays: 7,
  masteryScore: 0.82,
};

const weeklyExam: WeeklyExamPayload = {
  exam: {
    id: 'exam-1',
    title: 'Grade 8 Weekly Challenge',
    gradeLevel: 'Grade 8',
    weekStart: '2026-06-15',
    durationMinutes: 20,
    opensAt: '2026-06-15T00:00:00.000Z',
    closesAt: '2026-06-22T00:00:00.000Z',
    questions: [
      {
        id: 'q1',
        subjectId: 'math',
        subjectName: 'Mathematics',
        subStrandKey: 'number-operations',
        prompt: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
      },
    ],
  },
  attempt: null,
  history: [],
};

const schools: SchoolData[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Kitabu Demo School',
    location: 'Nairobi',
    totalStudents: 120,
    gradeCounts: { 'Grade 6': 40 },
  },
];
const kitabuGrade6SchoolLabel = 'Choose Kitabu Demo School, Nairobi, 40 Grade 6 learners';
// Teachers pick their school before a grade is known, so the roster shows the school total.
const kitabuTeacherSchoolLabel = 'Choose Kitabu Demo School, Nairobi, 120 learners';
const kitabuGrade8SchoolLabel = 'Choose Kitabu Demo School, Nairobi, No Grade 8 learners yet';
const kisiiGrade6SchoolLabel = 'Choose Kisii Demo School, Kisii County, Kenya, 18 Grade 6 learners';
const defaultOnboardingSubjectIds = SUBJECTS.slice(0, 5).map(subject => subject.id);
const selectedFullIntroSubjectIds = SUBJECTS.filter(subject =>
  ['Mathematics', 'English'].includes(subject.name),
).map(subject => subject.id);

function renderedText(root: ReactTestRenderer.ReactTestInstance) {
  return root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Number.POSITIVE_INFINITY)
    .filter(value => value !== null && value !== undefined && value !== false)
    .join('')
    .replace(/\s+/g, ' ');
}

function summaryCompleteMarks(root: ReactTestRenderer.ReactTestInstance) {
  return root.findAll(node => node.type === View && node.props.testID === 'setup-summary-complete');
}

function setupSummaryValues(root: ReactTestRenderer.ReactTestInstance) {
  return root.findAll(node => {
    if (node.type !== Text) {
      return false;
    }

    const style = StyleSheet.flatten(node.props.style);

    return style?.fontSize === 12 && style?.fontWeight === '900';
  });
}

function selectedSchoolChecks(root: ReactTestRenderer.ReactTestInstance) {
  return root.findAll(node => node.type === View && node.props.testID === 'selected-school-check');
}

function missingSchoolLinks(root: ReactTestRenderer.ReactTestInstance) {
  return root.findAll(
    node => node.props.testID === 'missing-school-link' && typeof node.props.onPress === 'function',
  );
}

function schoolPickerModal(root: ReactTestRenderer.ReactTestInstance) {
  return root.findByProps({ testID: 'school-picker-modal' });
}

async function pressAutoAdvanceChoice(root: ReactTestRenderer.ReactTestInstance, accessibilityLabel: string) {
  await act(() => {
    root.findByProps({ accessibilityLabel }).props.onPress();
  });
  await act(() => {
    jest.advanceTimersByTime(250);
  });
}

async function openCountyPicker(root: ReactTestRenderer.ReactTestInstance) {
  await act(() => {
    root.findByProps({ accessibilityLabel: 'County selector' }).props.onPress();
  });
}

async function selectCounty(root: ReactTestRenderer.ReactTestInstance, county = 'Nairobi City') {
  await openCountyPicker(root);
  await act(() => {
    root.findByProps({ accessibilityLabel: `Select ${county} county` }).props.onPress();
  });
}


test('mock homework includes sample assignments for testing', () => {
  expect(INITIAL_ASSIGNMENTS).toHaveLength(5);
  expect(INITIAL_ASSIGNMENTS.filter(item => item.status === 'pending')).toHaveLength(4);
  expect(INITIAL_ASSIGNMENTS.filter(item => item.status === 'completed')).toHaveLength(1);
  expect(INITIAL_ASSIGNMENTS.every(item => item.questions.length >= 3)).toBe(true);
});

test('subject selector disables new selections after five subjects', async () => {
  const onToggleSubject = jest.fn();
  const selectedSubjectIds = SUBJECTS.slice(0, 5).map(subject => subject.id);
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectSelector
        allSubjects={SUBJECTS}
        selectedSubjectIds={selectedSubjectIds}
        onToggleSubject={onToggleSubject}
      />,
    );
  });

  const text = renderedText(renderer!.root);
  expect(text).toContain('5/5 selected');
  expect(text).toContain('Limit reached');
  expect(
    renderer!.root.findAll(node => node.props?.disabled === true).length,
  ).toBeGreaterThan(0);
});

test('dashboard subject grid renders selected subjects without plus selector', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectGrid
        subjects={SUBJECTS.slice(0, 5)}
        allSubjects={SUBJECTS}
        selectedSubjectIds={SUBJECTS.slice(0, 5).map(subject => subject.id)}
        onOpenSubject={jest.fn()}
        onSaveSubjectSelection={jest.fn()}
        onOpenGameZone={jest.fn()}
      />,
    );
  });

  const text = renderedText(renderer!.root);
  expect(text).not.toContain('My Subjects');
  expect(text).not.toContain('5/5 selected');
  expect(text).not.toContain('Agriculture');
  expect(text).not.toContain('Creative Arts');
  expect(text).toContain('Game Zone');
  expect(
    renderer!.root.findAllByProps({ accessibilityLabel: 'Choose dashboard subjects' }),
  ).toHaveLength(0);
});

test('student dashboard grade selector is a header dropdown and updates selection', async () => {
  const onSelectGrade = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <StudentHeader
        currentGrade="Grade 6"
        onSelectGrade={onSelectGrade}
        onOpenProfile={jest.fn()}
        onOpenNotifications={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select learning grade' }).props.onPress();
  });

  const text = renderedText(renderer!.root);

  ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Form 3', 'Form 4']
    .forEach(grade => expect(text).toContain(grade));
  expect(text).not.toContain('Grade 11');
  expect(text).not.toContain('Grade 12');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Form 4' }).props.onPress();
  });

  expect(onSelectGrade).toHaveBeenCalledWith('Grade 12');
});

test('homework list shows due reviews as pending homework items', async () => {
  const onStartReview = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkListScreen
        assignments={[]}
        dueReviews={[dueReview]}
        weeklyExam={null}
        onBack={jest.fn()}
        onStartAssignment={jest.fn()}
        onStartReview={onStartReview}
        onOpenWeeklyExam={jest.fn()}
      />,
    );
  });

  const text = renderedText(renderer!.root);
  expect(text).not.toContain('Pending (1)');
  expect(text).not.toContain('Done');
  expect(text).toContain('Review Due');
  expect(text).toContain('Number Operations');
  expect(text).toContain('Start Review');

  const reviewCard = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Start Review' }).length > 0,
  )[0];
  await act(() => reviewCard.props.onPress());

  expect(onStartReview).toHaveBeenCalledWith(dueReview);
});

test('homework list shows available weekly exam as a homework item', async () => {
  const onOpenWeeklyExam = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkListScreen
        assignments={[]}
        dueReviews={[]}
        weeklyExam={weeklyExam}
        onBack={jest.fn()}
        onStartAssignment={jest.fn()}
        onStartReview={jest.fn()}
        onOpenWeeklyExam={onOpenWeeklyExam}
      />,
    );
  });

  const text = renderedText(renderer!.root);
  expect(text).not.toContain('Pending (1)');
  expect(text).not.toContain('Done');
  expect(text).toContain('Weekly Exam');
  expect(text).toContain('Grade 8 Weekly Challenge');
  expect(text).toContain('Start Exam');

  const examCard = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Start Exam' }).length > 0,
  )[0];
  await act(() => examCard.props.onPress());

  expect(onOpenWeeklyExam).toHaveBeenCalledTimes(1);
});

test('homework list orders due assignments before submitted assignments', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkListScreen
        assignments={INITIAL_ASSIGNMENTS}
        dueReviews={[]}
        weeklyExam={null}
        onBack={jest.fn()}
        onStartAssignment={jest.fn()}
        onStartReview={jest.fn()}
        onOpenWeeklyExam={jest.fn()}
      />,
    );
  });

  const text = renderedText(renderer!.root);
  expect(text).not.toContain('Pending (');
  expect(text.indexOf('Fractions and Decimals Practice')).toBeLessThan(
    text.indexOf('Cells and Body Systems'),
  );
  expect(text.indexOf('Cells and Body Systems')).toBeLessThan(
    text.indexOf('Uandishi wa Insha Fupi'),
  );
  expect(text.indexOf('Uandishi wa Insha Fupi')).toBeLessThan(
    text.indexOf('Reading Comprehension Check'),
  );
});

test('sign-in page renders account-type cards before credentials', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(<LoginScreen {...defaultLoginProps} />);
  });

  expect(renderer!.root.findByProps({ children: 'Choose your role' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Sign in' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Create account' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue as Parent/Student' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue as Teacher' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Continue as Student' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Continue as Parent' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Continue as Other' })).toHaveLength(0);
  expect(renderedText(renderer!.root)).not.toContain('Other');
});

test('onboarding full intro captures profile details before account setup', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 5, 28, 9, 0, 0));
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="student"
        schools={schools}
        isSubmitting={false}
        includeIntroChoices
        collectSignupCredentials
        onSubmit={onSubmit}
      />,
    );
  });

  expect(renderedText(renderer!.root)).toContain('Kitabu');
  expect(renderedText(renderer!.root)).toContain('AI');
  expect(renderedText(renderer!.root)).toContain('📚');
  expect(renderedText(renderer!.root)).toContain('Mwalimu wako wa nyumbani');
  expect(renderedText(renderer!.root)).toContain('Chagua lugha yako · Choose your language');
  expect(renderedText(renderer!.root)).toContain('Unaweza kubadilisha baadaye · You can change this later');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Onboarding progress' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-mascot-motion' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select English language' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Kiswahili language' }).props.accessibilityState).toEqual({
    checked: false,
  });

  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await pressAutoAdvanceChoice(renderer!.root, 'Select Kiswahili language');

  expect(renderedText(renderer!.root)).not.toContain('Rafiki wako wa masomo ✨');
  expect(renderedText(renderer!.root)).toContain('Chagua mwenzako!');
  expect(renderedText(renderer!.root)).toContain('Atakuwa pamoja nawe wakati wote wa masomo.');
  expect(renderedText(renderer!.root)).toContain('The Lion');
  expect(renderedText(renderer!.root)).toContain('Sungura');
  expect(renderedText(renderer!.root)).toContain('Tembo');
  expect(renderedText(renderer!.root)).toContain('SW');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back to language' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-mascot-motion' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Lion mascot' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Rabbit mascot' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Elephant mascot' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Panda mascot' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(
    [
      'Choose Rafiki the Lion mascot',
      'Choose Rafiki the Rabbit mascot',
      'Choose Rafiki the Elephant mascot',
      'Choose Rafiki the Panda mascot',
    ].map(accessibilityLabel => renderer!.root.findByProps({ accessibilityLabel }).props.accessibilityRole),
  ).toEqual(['radio', 'radio', 'radio', 'radio']);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Mascot options' }).props.style)).toEqual(
    expect.objectContaining({
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    }),
  );
  expect(
    StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Panda mascot' }).props.style),
  ).toEqual(expect.objectContaining({ width: '48%' }));
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 2,
    text: 'Step 2 of 25, Mascot',
  });

  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Back to language' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain('Mwalimu wako wa nyumbani');
  await pressAutoAdvanceChoice(renderer!.root, 'Select Kiswahili language');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Choose Rafiki the Lion mascot' }).props.onPress();
  });
  await act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(renderedText(renderer!.root)).toContain('Chagua mwenzako!');
  await act(() => {
    jest.advanceTimersByTime(40);
  });

  expect(renderedText(renderer!.root)).toContain('Rafiki the Lion');
  expect(renderedText(renderer!.root)).not.toContain('Nakuwasilisha...');
  expect(renderedText(renderer!.root)).toContain('Mwenzako wa masomo');
  expect(renderedText(renderer!.root)).toContain('Mimi ni Rafiki the Lion!');
  expect(renderedText(renderer!.root)).toContain('Twende pamoja!');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back to mascot' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-mascot-motion' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Back in setup' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 3,
    text: 'Step 3 of 25, Rafiki',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).not.toContain('Karibu! 🚀');
  expect(renderedText(renderer!.root)).toContain('Ni nani wewe?');
  expect(renderedText(renderer!.root)).toContain('Mwanafunzi');
  expect(renderedText(renderer!.root)).toContain('Natafuta msaada');
  expect(renderedText(renderer!.root)).toContain('Mwalimu');
  expect(renderedText(renderer!.root)).toContain('Mzazi');
  expect(renderedText(renderer!.root)).not.toContain('Nyingine');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Mascot navigation bar' })).toBeTruthy();
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Mascot coach tip' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'mascot-nav-back' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 4,
    text: 'Step 4 of 25, Role',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected Mwanafunzi role' }).props.accessibilityState).toEqual({
    checked: true,
    disabled: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Locked Mwalimu role' }).props.accessibilityState).toEqual({
    checked: false,
    disabled: true,
  });

  await pressAutoAdvanceChoice(renderer!.root, 'Selected Mwanafunzi role');

  expect(renderedText(renderer!.root)).toContain('Ruhusu matumizi ya maikrofoni');
  expect(renderedText(renderer!.root)).toContain('Maikrofoni husaidia majibu ya kuzungumza na mafunzo ya moja kwa moja.');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Tutor voice options' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'voice-orb' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 5,
    text: 'Step 5 of 25, Microphone',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.accessibilityState).toEqual({
    disabled: false,
    busy: false,
  });

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Unahitaji nini zaidi sasa hivi?');
  expect(renderedText(renderer!.root)).not.toContain('Ili nikujue \uD83D\uDC47');
  expect(renderedText(renderer!.root)).toContain('Nina mtihani karibu');
  expect(renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' }).props.accessibilityLabel).toBe(
    'Rafiki the Lion mascot, think pose',
  );

  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await pressAutoAdvanceChoice(renderer!.root, 'Choose Nina mtihani karibu');

  expect(renderedText(renderer!.root)).toContain('Jina lako ni nani?');
  expect(renderedText(renderer!.root)).not.toContain('Tuonane \uD83D\uDC4B');
  expect(renderedText(renderer!.root)).toContain('Mwalimu wako wa Kitabu AI atakujua kwa jina lako.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.placeholder).toBe('Andika jina lako...');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 7,
    text: 'Step 7 of 25, Name',
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  expect(StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.style)).toEqual(
    expect.objectContaining({
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
    }),
  );

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText('Nia');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Una miaka mingapi, Nia?');
  expect(renderedText(renderer!.root)).toContain('Tunabadilisha maudhui kulingana na umri wako.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.placeholder).toBe('Umri wako...');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 8,
    text: 'Step 8 of 25, Age',
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.onChangeText('3');
  });
  expect(renderedText(renderer!.root)).toContain('Uko Sure? Age must be between 4 and 20.');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.onChangeText('21');
  });
  expect(renderedText(renderer!.root)).toContain('Uko Sure? Age must be between 4 and 20.');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.onChangeText('13');
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: false, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Wewe ni wa jinsia gani?');
  expect(renderedText(renderer!.root)).not.toContain('Kuhusu wewe \uD83E\uDDCD');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 9,
    text: 'Step 9 of 25, Gender',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Mgeni wa Nje ya Dunia' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Select Endelea bila kuweka' })).toHaveLength(0);
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Mgeni wa Nje ya Dunia' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain(
    'Wacha jokes! 😂 Tunahudumia wanadamu tu hapa. Chagua Mvulana au Msichana uendelee.',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Mgeni wa Nje ya Dunia' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(renderedText(renderer!.root)).not.toContain('Wacha jokes! 😂');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Msichana' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Msichana' }).props.accessibilityState).toEqual({
    checked: true,
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Unasomea katika nchi hii?');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 10,
    text: 'Step 10 of 25, Curriculum',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Unasoma shule gani?');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 11,
    text: 'Step 11 of 25, School',
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Choose a school before continuing',
  );
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onChangeText('Nia Academy');
  });
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Add Nia Academy school' })).toHaveLength(0);
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(1);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Clear school search' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuTeacherSchoolLabel }).props.onPress();
  });
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(0);

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Uko darasa gani?');
  expect(renderedText(renderer!.root)).not.toContain('Masomo yako');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 12,
    text: 'Step 12 of 25, Learner profile',
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 6' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain('Shule ya Msingi - Juu (CBC)');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected grade band' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: false, busy: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Unasoma masomo gani?');
  expect(renderedText(renderer!.root)).not.toContain('Masomo yako');
  expect(renderedText(renderer!.root)).toContain('\u2605 Masomo ya lazima');
  expect(renderedText(renderer!.root)).toContain('Masomo ya kuchagua');
  expect(renderedText(renderer!.root)).toContain('Science & Technology');
  expect(renderedText(renderer!.root)).toContain('Agriculture & Nutrition');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 13,
    text: 'Step 13 of 25, Subjects',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add Mathematics' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add English' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain('2 zimechaguliwa \u2713');
  expect(renderedText(renderer!.root)).toContain('\u2713 Mathematics');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Usiku kabla ya mtihani wa KNEC...');
  expect(renderedText(renderer!.root)).not.toContain('Inakujua? \uD83D\uDE2C');
  expect(renderedText(renderer!.root)).toContain('\uD83E\uDD2F');
  expect(renderedText(renderer!.root)).toContain('BILA KITABU AI');
  expect(renderedText(renderer!.root)).toContain('Ninapata wasiwasi wakati wa mitihani');
  expect(renderedText(renderer!.root)).toContain('Natamani ningekuwa na revision partner');
  expect(renderedText(renderer!.root)).toContain('Notes zinaweza kuchosha kusoma');
  expect(renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' }).props.accessibilityLabel).toBe(
    'Rafiki the Lion mascot, worried pose',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 14,
    text: 'Step 14 of 25, Before',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Usiku kabla ya mtihani wako...');
  expect(renderedText(renderer!.root)).toContain('\uD83D\uDE0C');
  expect(renderedText(renderer!.root)).toContain('NA KITABU AI');
  expect(renderedText(renderer!.root)).toContain('Kitabu hukupa mpango wazi wa masomo na karatasi za revision');
  expect(renderedText(renderer!.root)).toContain('Rafiki ni revision partner wako anayepatikana kila wakati');
  expect(renderedText(renderer!.root)).toContain('Tunakuonyesha maeneo dhaifu na jinsi ya kuyarekebisha');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 15,
    text: 'Step 15 of 25, After',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Lengo lako la kustudy ni nini?');
  expect(renderedText(renderer!.root)).toContain('Jenga tabia ya kila siku');
  expect(renderedText(renderer!.root)).toContain('Kuwa thabiti');
  expect(renderedText(renderer!.root)).toContain('Kuwa mwanafunzi bora');
  expect(renderedText(renderer!.root)).toContain('Fikia uwezo kamili');
  expect(renderedText(renderer!.root)).toContain('Recommended');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 16,
    text: 'Step 16 of 25, Goal',
  });
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await pressAutoAdvanceChoice(renderer!.root, 'Choose goal Kuwa thabiti');

  expect(renderedText(renderer!.root)).toContain('Ni bidii ya kweli!');
  expect(renderedText(renderer!.root)).toContain('\uD83D\uDCAA');
  expect(renderedText(renderer!.root)).toContain('dakika 15');
  expect(renderedText(renderer!.root)).toContain('Kitabu AI itahakikisha hakuna dakika inayopotea.');
  expect(renderedText(renderer!.root)).toContain('89%');
  expect(renderedText(renderer!.root)).toContain('wanafunzi wanasema wanafanya zaidi kwa muda mfupi zaidi');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 17,
    text: 'Step 17 of 25, Confirm',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Changamoto yako kubwa zaidi shuleni ni nini?');
  expect(renderedText(renderer!.root)).toContain('Mitihani inanisumbua sana.');
  expect(renderedText(renderer!.root)).toContain('Kazi za nyumbani zinachukua muda mwingi.');
  expect(renderedText(renderer!.root)).toContain('Nataka alama bora, sijui jinsi.');
  expect(renderedText(renderer!.root)).toContain('Ninasahau haraka ninachojifunza.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 18,
    text: 'Step 18 of 25, Concern',
  });
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await pressAutoAdvanceChoice(renderer!.root, 'Choose concern Mitihani inanisumbua sana.');

  expect(renderedText(renderer!.root)).toContain('Unataka kufanikisha nini na Kitabu AI?');
  expect(renderedText(renderer!.root)).toContain('Badilisha alama mbaya kuwa nzuri.');
  expect(renderedText(renderer!.root)).toContain('Maliza kazi haraka (muda zaidi wa michezo).');
  expect(renderedText(renderer!.root)).toContain('Ingia chuo kikuu ninachotaka.');
  expect(renderedText(renderer!.root)).toContain('Elewa vizuri ninachojifunza.');
  expect(renderedText(renderer!.root)).toContain('Jisikie imara zaidi darasani.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 19,
    text: 'Step 19 of 25, Achievement',
  });
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
  await pressAutoAdvanceChoice(renderer!.root, 'Choose achievement Shangilia mitihani inayokuja.');

  expect(renderedText(renderer!.root)).toContain('Mambo unayopenda?');
  expect(renderedText(renderer!.root)).not.toContain('Jambo moja zaidi \uD83D\uDC4D');
  expect(renderedText(renderer!.root)).toContain('Tutafanya maudhui ya masomo kulingana na unayopenda.');
  ['Mpira', 'Muziki', 'Gaming', 'Teknolojia', 'Filamu', 'Sanaa', 'Kupika', 'Vitabu'].forEach(label => {
    expect(renderedText(renderer!.root)).toContain(label);
  });
  expect(renderedText(renderer!.root)).not.toContain('Use sports examples in practice.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Add interest Technology' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Add interest Movies' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Add interest Cooking' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Skip this step' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState).toEqual({
    disabled: true,
    busy: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 20,
    text: 'Step 20 of 25, Interests',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add interest Football' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add interest Gaming' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState).toEqual({
    disabled: false,
    busy: false,
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Mpango wa kuongeza alama');
  expect(renderedText(renderer!.root)).toContain('+2');
  expect(renderedText(renderer!.root)).toContain('points');
  expect(renderedText(renderer!.root)).toContain('muhula huu');
  expect(renderedText(renderer!.root)).toContain('Mathematics');
  expect(renderedText(renderer!.root)).toContain('English');
  expect(renderedText(renderer!.root)).toContain('Njia yako ya kuboresha');
  expect(renderedText(renderer!.root)).toContain('Maendeleo ya kawaida ukifanya mazoezi kila siku');
  expect(renderedText(renderer!.root)).toContain('Rekebisha mada dhaifu');
  expect(renderedText(renderer!.root)).toContain('Mazoezi ya CBC');
  expect(renderedText(renderer!.root)).toContain('Vidokezo smart');
  expect(renderedText(renderer!.root)).toContain('Lengo lako limegeuzwa kuwa mpango wa kila siku.');
  expect(renderedText(renderer!.root)).toContain('Anza kuongeza alama');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'upper-primary girl student studying in a bright studio scene' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 21,
    text: 'Step 21 of 25, Social proof',
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).not.toContain('Vikumbusho \uD83D\uDD14');
  expect(renderedText(renderer!.root)).toContain('Tutakukumbusha ustudy.');
  expect(renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' }).props.accessibilityLabel).toBe(
    'Rafiki the Lion mascot, sleep pose',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 22,
    text: 'Step 22 of 25, Reminder',
  });
  expect(renderedText(renderer!.root)).toContain('13:24');
  expect(renderedText(renderer!.root)).toContain('91%');
  expect(renderedText(renderer!.root)).toContain('Kitabu AI');
  expect(renderedText(renderer!.root)).toContain('sasa hivi');
  expect(renderedText(renderer!.root)).toContain('Nia, mtihani wako wa Hesabu ni kesho. \uD83D\uDE80');
  expect(renderedText(renderer!.root)).toContain('Twende tujiandae pamoja!');
  expect(renderedText(renderer!.root)).toContain('Mfululizo wa siku');
  expect(renderedText(renderer!.root)).toContain('Alama bora');
  expect(renderedText(renderer!.root)).toContain('Kaa makini');
  expect(
    StyleSheet.flatten(renderer!.root.findByProps({ testID: 'reminder-phone-mockup' }).props.style)?.backgroundColor,
  ).toBe('#FBF8F3');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Daily study reminder preview' })).toBeTruthy();
  expect(renderedText(renderer!.root)).toContain('Ruka');
  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Allow assignment and study reminders' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).not.toContain('Kitabu AI');
  expect(renderedText(renderer!.root)).toContain('Tunaunda uzoefu wako binafsi...');
  expect(renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' }).props.accessibilityLabel).toBe(
    'Rafiki the Lion mascot, cool pose',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 23,
    text: 'Step 23 of 25, Building',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Rafiki the Lion mascot' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Rafiki the Lion mascot loading avatar' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
    max: 100,
    min: 0,
    now: 0,
    text: '0% complete',
  });
  expect(renderedText(renderer!.root)).toContain('Inachambua mada za CBC...');
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);

  await act(() => {
    jest.advanceTimersByTime(1250);
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
    max: 100,
    min: 0,
    now: 50,
    text: '50% complete',
  });
  expect(renderedText(renderer!.root)).toContain('Inaandaa maswali ya KNEC...');

  await act(() => {
    jest.advanceTimersByTime(1250);
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
    max: 100,
    min: 0,
    now: 100,
    text: '100% complete',
  });
  expect(renderedText(renderer!.root)).toContain('Iko tayari! \uD83C\uDF89');

  await act(() => {
    jest.advanceTimersByTime(699);
  });
  expect(renderedText(renderer!.root)).toContain('Iko tayari! \uD83C\uDF89');

  expect(onSubmit).not.toHaveBeenCalled();
  await act(() => {
    jest.advanceTimersByTime(1);
  });

  expect(renderedText(renderer!.root)).not.toContain('Nia, Profaili yako ya masomo iko tayari!');
  expect(renderedText(renderer!.root)).toContain('Nia,Mpango wako wa masomo uko tayari.');
  expect(renderedText(renderer!.root)).toContain('Malengo ya kufikiwa');
  expect(renderedText(renderer!.root)).toContain('Grade 6 \u00B7 2 masomo \u00B7 Kenya CBC');
  expect(renderedText(renderer!.root)).toContain('4.89');
  expect(renderedText(renderer!.root)).toContain('Kitabu ilinisaidia kupanda daraja moja kwa term.');
  expect(renderedText(renderer!.root)).toContain('Wanjiru - Grade 8');
  expect(renderedText(renderer!.root)).not.toContain('Brian - Grade 10');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 4' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 1' }).props.accessibilityState).toEqual({
    selected: true,
  });
  await act(() => {
    jest.advanceTimersByTime(3000);
  });
  expect(renderedText(renderer!.root)).toContain('Maswali ya KNEC sasa ni rahisi kufuata.');
  expect(renderedText(renderer!.root)).toContain('Brian - Grade 10');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 2' }).props.accessibilityState).toEqual({
    selected: true,
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 4' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain('Rafiki hunikumbusha kusoma bila pressure.');
  expect(renderedText(renderer!.root)).toContain('Kevin - Grade 9');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 4' }).props.accessibilityState).toEqual({
    selected: true,
  });
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Onboarding progress' })).toHaveLength(0);
  expect(renderedText(renderer!.root)).toContain('Niko tayari kuanza \uD83D\uDE80');
  expect(onSubmit).not.toHaveBeenCalled();

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Hifadhi akaunti yako');
  expect(renderedText(renderer!.root)).toContain('Jiandikishe kuendelea na mpango wako wa masomo');
  expect(renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' }).props.accessibilityLabel).toBe(
    'Rafiki the Lion mascot, cool pose',
  );
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Onboarding progress' })).toHaveLength(0);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(renderedText(renderer!.root)).toContain('Continue with Google');
  expect(renderedText(renderer!.root)).toContain('Continue with Email');
  expect(renderedText(renderer!.root)).toContain('Continue with Phone Number');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue with phone number' }).props.accessibilityState,
  ).toEqual({ disabled: true });
  expect(renderedText(renderer!.root)).toContain('Coming Soon');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Signup progress' })).toHaveLength(0);

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue with phone number' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Phone number');
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-1' }).props.accessibilityState).toEqual({
    selected: true,
  });
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-2' }).props.accessibilityState).toEqual({
    selected: false,
  });
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-3' }).props.accessibilityState).toEqual({
    selected: false,
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.accessibilityState,
  ).toEqual({ disabled: true });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Signup phone number' }).props.onChangeText('0712345678');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Signup password' }).props.onChangeText('strongpass');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Confirm signup password' }).props.onChangeText('strongpass');
  });
  expect(renderedText(renderer!.root)).toContain('Strong');
  expect(renderedText(renderer!.root)).toContain('\u2713 Passwords match');
  expect(renderedText(renderer!.root)).toContain('\uD83C\uDDF0\uD83C\uDDEA +254');
  expect(renderedText(renderer!.root)).toContain('Send verification code \u2192');

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Send verification code' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Ingiza msimbo wa nambari 6');
  expect(renderedText(renderer!.root)).toContain('+254712345678');
  expect(renderedText(renderer!.root)).toContain('Resend code in 30s');
  expect(renderedText(renderer!.root)).toContain('Verify & Continue \u2192');
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-1' }).props.accessibilityState).toEqual({
    selected: true,
  });
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-2' }).props.accessibilityState).toEqual({
    selected: true,
  });
  expect(renderer!.root.findByProps({ testID: 'signup-progress-dot-3' }).props.accessibilityState).toEqual({
    selected: false,
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.accessibilityState,
  ).toEqual({ disabled: true });
  for (let index = 1; index <= 6; index += 1) {
    const otpBox = renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index}` });
    expect(otpBox.props.maxLength).toBe(1);
    expect(typeof otpBox.props.onKeyPress).toBe('function');
  }

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'OTP digit 2' }).props.onChangeText('7');
  });
  expect(
    [1, 2, 3, 4, 5, 6].map(index =>
      renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index}` }).props.value,
    ),
  ).toEqual(['', '7', '', '', '', '']);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'OTP digit 2' }).props.onChangeText('');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'OTP digit 2' }).props.onKeyPress({
      nativeEvent: { key: 'Backspace' },
    });
  });
  expect(
    [1, 2, 3, 4, 5, 6].map(index =>
      renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index}` }).props.value,
    ),
  ).toEqual(['', '', '', '', '', '']);

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'OTP digit 1' }).props.onChangeText('123456');
  });
  expect(
    [1, 2, 3, 4, 5, 6].map(index =>
      renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index}` }).props.value,
    ),
  ).toEqual(['1', '2', '3', '4', '5', '6']);
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.accessibilityState,
  ).toEqual({ disabled: false });

  for (let tick = 0; tick < 30; tick += 1) {
    await act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Resend verification code' })).toBeTruthy();
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Resend verification code' }).props.onPress();
  });
  expect(
    [1, 2, 3, 4, 5, 6].map(index =>
      renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index}` }).props.value,
    ),
  ).toEqual(['', '', '', '', '', '']);
  expect(renderedText(renderer!.root)).toContain('Resend code in 30s');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.accessibilityState,
  ).toEqual({ disabled: true });

  for (const [index, digit] of ['1', '2', '3', '4', '5', '6'].entries()) {
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: `OTP digit ${index + 1}` }).props.onChangeText(digit);
    });
  }

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Verify and continue' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledWith({
    gender: 'female',
    grade: 'Grade 6',
    schoolId: schools[0].id,
    schoolDirectoryId: null,
    mpesaPhoneNumber: null,
    selectedSubjectIds: selectedFullIntroSubjectIds,
    lang: 'sw',
    languageCode: 'sw',
    mascot: 'lion',
    mascotKey: 'lion',
    role: 'student',
    name: 'Nia',
    voice: '',
    noVoice: false,
    need: 'exam',
    needKey: 'exam',
    displayName: 'Nia',
    age: '13',
    subjects: ['Mathematics', 'English'],
    county: 'Nairobi City',
    school: 'Kitabu Demo School',
    goal: 'consistent',
    goalKey: 'consistent',
    concern: 'stress',
    concernKey: 'stress',
    achieve: 'ace',
    achievementKey: 'ace',
    interests: ['football', 'gaming'],
    interestKeys: ['football', 'gaming'],
    reminderEnabled: true,
    countryCode: 'KE',
    curriculumCode: 'CBC',
    signupMethod: 'phone',
    phone: '+254712345678',
    signupPhone: '+254712345678',
    signupOtp: '123456',
    password: 'strongpass',
    signupPassword: 'strongpass',
  });
  expect(renderer!.root.findAllByProps({ testID: 'onboarding-dashboard' })).toHaveLength(0);
  expect(renderedText(renderer!.root)).not.toContain('Simulate success');
  jest.useRealTimers();
}, 15000);

test('onboarding displays Form aliases and filters subjects by selected senior grade', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="student"
        schools={schools}
        isSubmitting={false}
        includeIntroChoices
        onSubmit={jest.fn()}
      />,
    );
  });

  await pressAutoAdvanceChoice(renderer!.root, 'Select English language');
  await pressAutoAdvanceChoice(renderer!.root, 'Choose Rafiki the Rabbit mascot');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await pressAutoAdvanceChoice(renderer!.root, 'Selected Student role');
  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
  });
  await pressAutoAdvanceChoice(renderer!.root, 'Choose I have an exam coming up');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText('55');
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.value).toBe('');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText('Alex');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.onChangeText('18');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await pressAutoAdvanceChoice(renderer!.root, 'Select Male');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuTeacherSchoolLabel }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Form 3');
  expect(renderedText(renderer!.root)).toContain('Form 4');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Form 4 · KNEC' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain('Senior School (KNEC)');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Select the subjects you study');
  expect(renderedText(renderer!.root)).toContain('Biology');
  expect(renderedText(renderer!.root)).toContain('Physics');
  expect(renderedText(renderer!.root)).toContain('Computer Studies');
  expect(renderedText(renderer!.root)).not.toContain('Science & Technology');
  expect(renderedText(renderer!.root)).not.toContain('Pre-Technical Studies');
  jest.useRealTimers();
});

test('onboarding need intro uses teacher and parent priorities', async () => {
  jest.useFakeTimers();
  const expectations = [
    {
      role: 'teacher' as const,
      needEyebrow: 'Your teaching priority \uD83D\uDCCB',
      needHeading: 'What\'s your main priority?',
      labels: ['Better lesson resources', 'Improve student results'],
      selectedNeed: 'Better lesson resources',
      nameEyebrow: 'Let\'s get introduced \uD83D\uDC4B',
      namePlaceholder: 'Your name...',
      nameSubText: 'Your students and Rafiki will know you by name.',
      name: 'Teacher Amina',
      detailTitle: 'Which grades do you teach?',
      totalSteps: 20,
      // Country (9) and county/school (10) now precede grade selection (11).
      detailProgress: 'Step 11 of 20, Classes',
    },
    {
      role: 'parent' as const,
      needEyebrow: 'What matters most to you \uD83D\uDC47',
      needHeading: 'What do you need most right now?',
      labels: ['Support my child\'s learning', 'Track their progress'],
      selectedNeed: 'Support my child\'s learning',
      nameEyebrow: 'Nice to meet you \uD83D\uDC4B',
      namePlaceholder: 'Your name...',
      nameSubText: 'Rafiki will personalise the experience for your family.',
      name: 'Parent Kamau',
      detailTitle: 'Tell me about your children',
      totalSteps: 20,
      detailProgress: 'Step 11 of 20, Children',
    },
  ];

  for (const expectation of expectations) {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
        <NeutralOnboardingScreen
          role={expectation.role}
          schools={schools}
          isSubmitting={false}
          includeIntroChoices
          onSubmit={jest.fn()}
        />,
      );
    });

    await pressAutoAdvanceChoice(renderer!.root, 'Select English language');
    await pressAutoAdvanceChoice(
      renderer!.root,
      expectation.role === 'teacher' ? 'Choose Rafiki the Lion mascot' : 'Choose Rafiki the Elephant mascot',
    );
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    expect(renderedText(renderer!.root)).toContain('Who are you?');
    expect(renderer!.root.findByProps({ accessibilityLabel: `Selected ${expectation.role === 'teacher' ? 'Teacher' : 'Parent'} role` })).toBeTruthy();
    await pressAutoAdvanceChoice(
      renderer!.root,
      `Selected ${expectation.role === 'teacher' ? 'Teacher' : 'Parent'} role`,
    );
    await act(async () => {
      await renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
    });
    expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Tutor voice options' })).toHaveLength(0);

    const text = renderedText(renderer!.root);

    expect(text).not.toContain(expectation.needEyebrow);
    expect(text).toContain(expectation.needHeading);
    expectation.labels.forEach(label => expect(text).toContain(label));
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
      max: expectation.totalSteps,
      min: 1,
      now: 6,
      text: `Step 6 of ${expectation.totalSteps}, Need`,
    });

    await pressAutoAdvanceChoice(renderer!.root, `Choose ${expectation.selectedNeed}`);

    expect(renderedText(renderer!.root)).toContain("What's your name?");
    expect(renderedText(renderer!.root)).not.toContain(expectation.nameEyebrow);
    expect(renderedText(renderer!.root)).toContain(expectation.nameSubText);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.placeholder).toBe(expectation.namePlaceholder);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
      max: expectation.totalSteps,
      min: 1,
      now: 7,
      text: `Step 7 of ${expectation.totalSteps}, Name`,
    });

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText(expectation.name);
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });

    expect(renderedText(renderer!.root)).toContain('What is your gender?');
    expect(renderedText(renderer!.root)).not.toContain('About you \uD83E\uDDCD');
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
      max: expectation.totalSteps,
      min: 1,
      now: 8,
      text: `Step 8 of ${expectation.totalSteps}, Gender`,
    });

    await pressAutoAdvanceChoice(renderer!.root, 'Select Male');

    if (expectation.role === 'teacher' || expectation.role === 'parent') {
      // Teachers and parents confirm country and county/school before grade/child details.
      expect(renderedText(renderer!.root)).toContain(
        expectation.role === 'teacher' ? 'Are you teaching in this country?' : 'Is your family in this country?',
      );
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      await selectCounty(renderer!.root);
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: kitabuTeacherSchoolLabel }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
    }

    expect(renderedText(renderer!.root)).toContain(expectation.detailTitle);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
      max: expectation.totalSteps,
      min: 1,
      now: 11,
      text: expectation.detailProgress,
    });

    if (expectation.role === 'teacher') {
      expect(renderedText(renderer!.root)).toContain('Upper Primary (CBC)');
      expect(renderedText(renderer!.root)).toContain('Junior Secondary (CBC)');
      expect(renderedText(renderer!.root)).toContain('Senior School');
      expect(renderedText(renderer!.root)).toContain('0 grades selected \u2713');
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add teaching Grade 6' }).props.onPress();
      });
      expect(renderedText(renderer!.root)).toContain('1 grade selected \u2713');
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
    } else {
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Child name' }).props.onChangeText('Amani');
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Child age' }).props.onChangeText('3');
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Child age' }).props.onChangeText('11');
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Select child Grade 6' }).props.onPress();
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add another child' }).props.onPress();
      });
      expect(renderer!.root.findByProps({ accessibilityLabel: 'Child 2 name' })).toBeTruthy();
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Child 2 name' }).props.onChangeText('Baraka');
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Child 2 age' }).props.onChangeText('10');
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Select child 2 Grade 4' }).props.onPress();
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add another child' }).props.onPress();
      });
      expect(renderer!.root.findByProps({ accessibilityLabel: 'Child 3 name' })).toBeTruthy();
      expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Add another child' })).toHaveLength(0);
    }
  }
  jest.useRealTimers();
});

test('onboarding role step does not expose the removed Other role', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="student"
        schools={schools}
        isSubmitting={false}
        includeIntroChoices
        onSubmit={jest.fn()}
      />,
    );
  });

  await pressAutoAdvanceChoice(renderer!.root, 'Select English language');
  await pressAutoAdvanceChoice(renderer!.root, 'Choose Rafiki the Rabbit mascot');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Who are you?');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Selected Other role' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Choose Other role' })).toHaveLength(0);
  expect(renderedText(renderer!.root)).not.toContain('Other');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 4,
    text: 'Step 4 of 25, Role',
  });
  jest.useRealTimers();
  if (renderer) {
    return;
  }

  await pressAutoAdvanceChoice(renderer!.root, 'Selected Other role');
  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('So I know how to help \uD83D\uDC47');
  expect(renderedText(renderer!.root)).toContain('What do you need most right now?');
  expect(renderedText(renderer!.root)).toContain('I want to learn');
  expect(renderedText(renderer!.root)).toContain('Help someone else');
  await pressAutoAdvanceChoice(renderer!.root, 'Choose I want to learn');

  expect(renderedText(renderer!.root)).toContain("What's your name?");
  expect(renderedText(renderer!.root)).toContain('Let\'s get introduced \uD83D\uDC4B');
  expect(renderedText(renderer!.root)).toContain('Your Kitabu AI tutor will know you by name.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.placeholder).toBe('Type your name...');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText('Alex');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('How old are you, Alex?');
  expect(renderedText(renderer!.root)).toContain('We tailor content to your age group.');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.placeholder).toBe('Your age...');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 25,
    min: 1,
    now: 8,
    text: 'Step 8 of 25, Age',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Your age' }).props.onChangeText('18');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('What is your gender?');
  expect(renderedText(renderer!.root)).not.toContain('About you \uD83E\uDDCD');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Alien from space' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).toContain(
    'Wacha jokes! 😂 We only serve humans here. Pick Male or Female to continue.',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Alien from space' }).props.accessibilityState).toEqual({
    checked: false,
  });
  await pressAutoAdvanceChoice(renderer!.root, 'Select Male');

  expect(renderedText(renderer!.root)).toContain('Are you studying in this country?');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Which school do you attend?');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Which grade are you in?');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 7' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Select the subjects you study');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  // Subjects → painBefore → painAfter → goal
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('What is your study goal?');
  expect(renderedText(renderer!.root)).toContain('Learn at my own pace');
  expect(renderedText(renderer!.root)).toContain('Help someone I care about');
  expect(renderedText(renderer!.root)).toContain('Explore what\'s possible');
  expect(renderedText(renderer!.root)).toContain('Support my community');
  expect(renderedText(renderer!.root)).toContain('Recommended');
  jest.useRealTimers();
});

test('full intro loading and ready states use teacher and parent context', async () => {
  jest.useFakeTimers();
  const expectations = [
    {
      role: 'teacher' as const,
      need: 'Better lesson resources',
      needHeading: 'What\'s your main priority?',
      name: 'Teacher Amina',
      goal: 'Engage my students better',
      concern: 'Low student engagement in class.',
      achievement: 'Raise my class average by 10%+.',
      detailAction: async (root: ReactTestRenderer.ReactTestInstance) => {
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Add teaching Grade 6' }).props.onPress();
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Add teaching Grade 7' }).props.onPress();
        });
      },
      reminderKicker: 'Class reminders',
      reminderQuestion: 'Want a class planning reminder?',
      reminderNotice: 'Teacher Amina, 24 assignments are ready to review.',
      reminderNoticeSub: "Let's keep the class on track!",
      reminderBenefits: ['On schedule', 'Class insights', 'Less admin'],
      readySocial: "You're joining thousands of teachers raising results.",
      readyTestimonial: 'Ms. Achieng - Teacher, Kisumu',
      loadingTitle: 'Building Teacher Amina class workspace',
      loadingText: 'We are combining your mascot, teaching goal, curriculum, reminders, classes, subjects, and school.',
      readyTitle: 'Workspace ready',
      readyPlanText: 'Everything is set for your class.',
      readyText: 'Grade 6 · 2 subjects · Kenya CBC',
    },
    {
      role: 'parent' as const,
      need: 'Support my child\'s learning',
      needHeading: 'What do you need most right now?',
      name: 'Parent Kamau',
      goal: 'Best in their class',
      concern: 'My child is not motivated to study.',
      achievement: 'Yes',
      detailAction: async (root: ReactTestRenderer.ReactTestInstance) => {
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Child name' }).props.onChangeText('Amani');
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Child age' }).props.onChangeText('11');
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Select child Grade 6' }).props.onPress();
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Add another child' }).props.onPress();
        });
        expect(root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState).toEqual({
          disabled: true,
          busy: false,
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Child 2 name' }).props.onChangeText('Baraka');
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Child 2 age' }).props.onChangeText('10');
        });
        expect(root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState).toEqual({
          disabled: true,
          busy: false,
        });
        await act(() => {
          root.findByProps({ accessibilityLabel: 'Select child 2 Grade 5' }).props.onPress();
        });
        expect(root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState).toEqual({
          disabled: false,
          busy: false,
        });
      },
      reminderKicker: 'Family reminders',
      reminderQuestion: 'Want a family progress reminder?',
      reminderNotice: "Parent Kamau, Amani's progress report is ready.",
      reminderNoticeSub: 'See strengths, gaps, and what to support next.',
      reminderBenefits: ['Progress reports', 'Learning gaps', 'Homework support'],
      readySocial: "You're joining millions of satisfied students.",
      readyTestimonial: 'Wanjiru - Grade 8',
      loadingTitle: 'Building Parent Kamau family dashboard',
      loadingText: 'We are combining your mascot, progress snapshot, curriculum, reminders, child profile, and school.',
      readyTitle: 'Dashboard ready',
      readyPlanText: 'Study plans for your 2 children are ready to go.',
      readyText: '2 children · Kenya CBC',
    },
  ];

  for (const expectation of expectations) {
    const onSubmit = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
        <NeutralOnboardingScreen
          role={expectation.role}
          schools={schools}
          isSubmitting={false}
          includeIntroChoices
          collectSignupCredentials
          onSubmit={onSubmit}
        />,
      );
    });

    await pressAutoAdvanceChoice(renderer!.root, 'Select English language');
    await pressAutoAdvanceChoice(
      renderer!.root,
      expectation.role === 'teacher' ? 'Choose Rafiki the Lion mascot' : 'Choose Rafiki the Elephant mascot',
    );
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    await pressAutoAdvanceChoice(
      renderer!.root,
      `Selected ${expectation.role === 'teacher' ? 'Teacher' : 'Parent'} role`,
    );
    expect(renderedText(renderer!.root)).toContain('Allow Microphone Access');
    expect(renderedText(renderer!.root)).toContain('Microphone access enables spoken answers and live tutoring.');
    expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Tutor voice options' })).toHaveLength(0);
    await act(async () => {
      await renderer!.root.findByProps({ accessibilityLabel: 'Allow microphone access' }).props.onPress();
    });
    expect(renderedText(renderer!.root)).toContain(expectation.needHeading);
    await pressAutoAdvanceChoice(renderer!.root, `Choose ${expectation.need}`);
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Your name' }).props.onChangeText(expectation.name);
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    expect(renderedText(renderer!.root)).toContain('What is your gender?');
    await pressAutoAdvanceChoice(renderer!.root, 'Select Male');
    if (expectation.role === 'teacher') {
      // New teacher order: gender → country → county/school → grade → subjects → goal.
      expect(renderedText(renderer!.root)).toContain('Are you teaching in this country?');
      // The curriculum detail card and "Confirm location" copy are student-only.
      expect(renderedText(renderer!.root)).not.toContain('CBC / KNEC Kenya curriculum');
      expect(renderedText(renderer!.root)).toContain('Yes');
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      // County / school comes before grades, so the roster shows the school total.
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
        'Choose a school before continuing',
      );
      await selectCounty(renderer!.root);
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: kitabuTeacherSchoolLabel }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      // Grade selection (roleDetails)
      expect(renderedText(renderer!.root)).toContain('Which grades do you teach?');
      if (expectation.detailAction) {
        await expectation.detailAction(renderer!.root);
      }
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      // Subjects are captured one screen per selected grade. First screen: Grade 6.
      expect(renderedText(renderer!.root)).not.toContain('Your subjects \uD83D\uDCD6');
      expect(renderedText(renderer!.root)).toContain('Which subjects do you teach?');
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject grade context' }))).toContain(
        'Grade 6',
      );
      // The subject badge shows just the grade — no "N of M" counter.
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject grade context' }))).not.toContain(
        ' of ',
      );
      expect(renderedText(renderer!.root)).toContain('Science & Technology');
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add Mathematics' }).props.onPress();
      });
      expect(renderedText(renderer!.root)).toContain('1 selected \u2713');
      expect(renderedText(renderer!.root)).toContain('\u2713 Mathematics');
      // Advance to the second grade's subject screen: Grade 7.
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject grade context' }))).toContain(
        'Grade 7',
      );
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject grade context' }))).not.toContain(
        ' of ',
      );
      expect(renderedText(renderer!.root)).toContain('Pre-Technical Studies');
      const preTechnicalLabel = renderer!.root
        .findAllByType(Text)
        .find(node => renderedText(node) === 'Pre-Technical Studies');
      expect(preTechnicalLabel).toBeDefined();
      expect(preTechnicalLabel?.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(preTechnicalLabel?.props.style)).toEqual(
        expect.objectContaining({ flexShrink: 1, textAlign: 'center' }),
      );
      // Each grade tracks its own subjects, so Grade 7 starts fresh.
      expect(renderedText(renderer!.root)).not.toContain('1 selected \u2713');
      expect(renderer!.root.findByProps({ accessibilityLabel: 'Add Mathematics' }).props.accessibilityState).toEqual({
        disabled: false,
        selected: false,
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add Mathematics' }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add English' }).props.onPress();
      });
      // Last subjects screen advances straight to the teaching goal.
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
    } else {
      // Parent order: gender -> country -> county/school -> children/grades -> subjects -> goal.
      expect(renderedText(renderer!.root)).toContain('Is your family in this country?');
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
      ).toEqual({ disabled: true, busy: false });
      expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
        'Choose a school before continuing to child details',
      );
      await selectCounty(renderer!.root);
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: kitabuTeacherSchoolLabel }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(renderedText(renderer!.root)).toContain('Tell me about your children');
      if (expectation.detailAction) {
        await expectation.detailAction(renderer!.root);
      }
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(renderedText(renderer!.root)).not.toContain('Child subjects');
      expect(renderedText(renderer!.root)).toContain('Which subjects should we track for Amani?');
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject child context' }))).toContain(
        'Amani',
      );
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject child context' }))).toContain(
        'Grade 6',
      );
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add Mathematics' }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
      expect(renderedText(renderer!.root)).toContain('Which subjects should we track for Baraka?');
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject child context' }))).toContain(
        'Baraka',
      );
      expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'Subject child context' }))).toContain(
        'Grade 5',
      );
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Add English' }).props.onPress();
      });
      await act(() => {
        renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
      });
    }
    if (expectation.role === 'teacher') {
      expect(renderedText(renderer!.root)).toContain('Engage my students better');
      expect(renderedText(renderer!.root)).toContain('Improve exam results');
      expect(renderedText(renderer!.root)).toContain('Better lesson planning');
      expect(renderedText(renderer!.root)).toContain('Give richer feedback');
      expect(renderedText(renderer!.root)).toContain('Interactive resources');
      expect(renderedText(renderer!.root)).toContain('Recommended');
    } else {
      expect(renderedText(renderer!.root)).toContain('Best in their class');
      expect(renderedText(renderer!.root)).toContain('Okay');
      expect(renderedText(renderer!.root)).toContain('Average');
      expect(renderedText(renderer!.root)).toContain('Far behind');
      expect(renderedText(renderer!.root)).toContain('Poorly');
      expect(renderedText(renderer!.root)).not.toContain('Recommended');
    }
    await pressAutoAdvanceChoice(renderer!.root, `Choose goal ${expectation.goal}`);
    if (expectation.role === 'teacher') {
      expect(renderedText(renderer!.root)).not.toContain('Your challenges \uD83D\uDCBC');
      expect(renderedText(renderer!.root)).toContain('What\'s your biggest teaching challenge?');
      expect(renderedText(renderer!.root)).toContain('Too much marking and admin work.');
      expect(renderedText(renderer!.root)).toContain('Hard to identify each student\'s weak areas.');
      expect(renderedText(renderer!.root)).toContain('Struggling to cover the full syllabus.');
      expect(renderedText(renderer!.root)).toContain('Students underperforming in exams.');
    } else {
      expect(renderedText(renderer!.root)).not.toContain('What worries you most? \uD83D\uDC9B');
      expect(renderedText(renderer!.root)).toContain('What matters most to you right now?');
      expect(renderedText(renderer!.root)).toContain('Too much time on phone/TV instead of studying.');
      expect(renderedText(renderer!.root)).toContain('They don\'t understand what they\'re taught.');
      expect(renderedText(renderer!.root)).toContain('Homework is a constant battle at home.');
      expect(renderedText(renderer!.root)).toContain('I don\'t know how to help them at home.');
    }
    await pressAutoAdvanceChoice(renderer!.root, `Choose concern ${expectation.concern}`);
    if (expectation.role === 'teacher') {
      expect(renderedText(renderer!.root)).not.toContain('What will success look like? \uD83C\uDFC6');
      expect(renderedText(renderer!.root)).toContain('What would make Kitabu AI worth it for you?');
      expect(renderedText(renderer!.root)).toContain('Save at least 3 hours per week on prep.');
      expect(renderedText(renderer!.root)).toContain('Make every lesson more engaging.');
      expect(renderedText(renderer!.root)).toContain('Identify weak students early and help them.');
      expect(renderedText(renderer!.root)).toContain('Complete the full syllabus on time.');
    } else {
      expect(renderedText(renderer!.root)).not.toContain('What would you love to see? \uD83D\uDC9B');
      expect(renderedText(renderer!.root)).toContain('Does Amani have their own phone?');
      expect(renderedText(renderer!.root)).toContain('Yes');
      expect(renderedText(renderer!.root)).toContain('No');
    }
    await pressAutoAdvanceChoice(renderer!.root, `Choose achievement ${expectation.achievement}`);

    if (expectation.role === 'teacher') {
      expect(renderedText(renderer!.root)).toContain('Class lift plan');
      expect(renderedText(renderer!.root)).toContain('+2');
      expect(renderedText(renderer!.root)).toContain('Grades');
      expect(renderedText(renderer!.root)).toContain('Across Your Class');
      expect(renderedText(renderer!.root)).toContain('Turn Grade 6 + 1 more practice into short CBC drills');
      expect(renderedText(renderer!.root)).toContain('Mathematics');
      expect(renderedText(renderer!.root)).toContain('English');
      expect(renderedText(renderer!.root)).toContain('Your class improvement path');
      expect(renderedText(renderer!.root)).toContain('Typical class progress with consistent practice');
      expect(renderedText(renderer!.root)).toContain('Find weak topics');
      expect(renderedText(renderer!.root)).toContain('Auto-mark work');
      expect(renderedText(renderer!.root)).toContain('Plan next lesson');
      expect(renderedText(renderer!.root)).toContain('Low engagement? Kitabu AI turns lessons into interactive quizzes and games.');
      expect(renderedText(renderer!.root)).toContain('Start Lifting My Class');
      expect(renderer!.root.findByProps({ accessibilityLabel: 'teacher Good News plan' })).toBeTruthy();
    } else {
      expect(renderedText(renderer!.root)).toContain('Family progress plan');
      expect(renderedText(renderer!.root)).toContain('+2');
      expect(renderedText(renderer!.root)).toContain('Points');
      expect(renderedText(renderer!.root)).toContain('With Clear Reports');
      expect(renderedText(renderer!.root)).toContain('See how 2 children are doing in Grade 6');
      expect(renderedText(renderer!.root)).toContain('Mathematics');
      expect(renderedText(renderer!.root)).toContain('English');
      expect(renderedText(renderer!.root)).toContain('Your child improvement path');
      expect(renderedText(renderer!.root)).toContain('Weekly reports show strengths, gaps, and what to support next');
      expect(renderedText(renderer!.root)).toContain('Progress reports');
      expect(renderedText(renderer!.root)).toContain('Learning gaps');
      expect(renderedText(renderer!.root)).toContain('Homework help');
      expect(renderedText(renderer!.root)).toContain('When motivation drops, Kitabu AI turns revision into short wins your child can finish daily.');
      expect(renderedText(renderer!.root)).toContain('Start Tracking Progress');
      expect(renderer!.root.findByProps({ accessibilityLabel: 'parent Good News plan' })).toBeTruthy();
    }

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });

    expect(renderedText(renderer!.root)).not.toContain(expectation.reminderKicker);
    expect(renderedText(renderer!.root)).toContain(expectation.reminderQuestion);
    expect(renderedText(renderer!.root)).toContain('just now');
    expect(renderedText(renderer!.root)).toContain(expectation.reminderNotice);
    expect(renderedText(renderer!.root)).toContain(expectation.reminderNoticeSub);
    for (const benefit of expectation.reminderBenefits) {
      expect(renderedText(renderer!.root)).toContain(benefit);
    }
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Daily study reminder preview' })).toBeTruthy();

    await act(async () => {
      await renderer!.root.findByProps({ accessibilityLabel: 'Allow assignment and study reminders' }).props.onPress();
    });

    expect(renderedText(renderer!.root)).toContain(expectation.loadingTitle);
    expect(renderedText(renderer!.root)).toContain(expectation.loadingText);
    expect(renderedText(renderer!.root)).toContain('Analysing CBC topics...');
    expect(renderer!.root.findAllByProps({ testID: 'onboarding-footer' })).toHaveLength(0);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
      max: 100,
      min: 0,
      now: 0,
      text: '0% complete',
    });

    await act(() => {
      jest.advanceTimersByTime(1250);
    });
    expect(renderedText(renderer!.root)).toContain('Preparing KNEC questions...');
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
      max: 100,
      min: 0,
      now: 50,
      text: '50% complete',
    });

    await act(() => {
      jest.advanceTimersByTime(1250);
    });
    expect(renderedText(renderer!.root)).toContain('All done!');
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Profile build progress' }).props.accessibilityValue).toEqual({
      max: 100,
      min: 0,
      now: 100,
      text: '100% complete',
    });

    await act(() => {
      jest.advanceTimersByTime(700);
    });

    expect(renderedText(renderer!.root)).toContain(expectation.readyTitle);
    expect(renderedText(renderer!.root)).toContain(expectation.readyPlanText);
    expect(renderedText(renderer!.root)).toContain(expectation.readyText);
    expect(renderedText(renderer!.root)).toContain('4.89');
    expect(renderedText(renderer!.root)).toContain(expectation.readySocial);
    expect(renderedText(renderer!.root)).toContain(expectation.readyTestimonial);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Show testimonial 4' })).toBeTruthy();

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });

    expect(renderedText(renderer!.root)).toContain('Save your account');
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue with Google' }).props.onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        grade: 'Grade 6',
        schoolId: schools[0].id,
        lang: 'en',
        mascot: expectation.role === 'teacher' ? 'lion' : 'elephant',
        role: expectation.role,
        name: expectation.name,
        voice: '',
        noVoice: false,
        county: 'Nairobi City',
        school: 'Kitabu Demo School',
        signupMethod: 'google',
      }),
    );
    if (expectation.role === 'teacher') {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subjects: ['Mathematics', 'English'],
          teachGrades: ['Grade 6', 'Grade 7'],
        }),
      );
      expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('teacherGradeIds');
    } else {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          children: [
            { name: 'Amani', age: '11', grade: 'Grade 6', subjects: ['math'] },
            { name: 'Baraka', age: '10', grade: 'Grade 5', subjects: ['english'] },
          ],
          selectedSubjectIds: ['math', 'english'],
        }),
      );
      expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('parentChildren');
    }
    expect(renderer!.root.findAllByProps({ testID: 'onboarding-dashboard' })).toHaveLength(0);
    expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Simulate Google success' })).toHaveLength(0);
    expect(renderedText(renderer!.root)).not.toContain('Simulate success');
  }
  jest.useRealTimers();
});

test('teacher onboarding uses teacher copy and submits school, class, and optional M-Pesa', async () => {
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
  });

  expect(renderedText(renderer!.root)).toContain('Set up your class workspace');
  expect(renderedText(renderer!.root)).toContain('Step 1 of 3');
  expect(renderedText(renderer!.root)).toContain('Rosters');
  expect(renderedText(renderer!.root)).toContain('Assignments');
  expect(renderedText(renderer!.root)).toContain('Continue to school');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Moves to school selection',
  );
  expect(renderer!.root.findAllByType(ChevronRight)).toHaveLength(0);
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(1);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Rafiki the Lion teacher mascot' })).toBeTruthy();
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 6' }).props.accessibilityState,
  ).toEqual({ checked: true });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 8' }).props.onPress();
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Step 2 of 3');
  expect(renderedText(renderer!.root)).not.toContain('Your school \uD83C\uDFEB');
  expect(renderedText(renderer!.root)).toContain('Which school do you teach at?');
  // Before a county is picked the school dropdown is disabled (the searchable list lives inside it).
  expect(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }).props.accessibilityState).toEqual({
    disabled: true,
  });
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Select county first',
  );
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Choose a county before continuing',
  );
  expect(renderedText(renderer!.root)).toContain('Back to class');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.accessibilityHint).toBe(
    'Returns to the first setup step',
  );

  await selectCounty(renderer!.root);
  expect(renderedText(renderer!.root)).toContain('No Grade 8 learners yet');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Choose a school before continuing',
  );
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade8SchoolLabel }).props.onPress();
  });

  expect(schoolPickerModal(renderer!.root).props.visible).toBe(false);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected school confirmation' })).toBeTruthy();
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Kitabu Demo School',
  );
  expect(renderedText(renderer!.root)).toContain('Kitabu Demo School');
  expect(renderedText(renderer!.root)).toContain('Nairobi City · Kenya');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Step 3 of 3');
  expect(renderedText(renderer!.root)).toContain('Class setup ready');
  expect(renderedText(renderer!.root)).toContain('Skip for now');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Final setup review' }).props.accessibilityValue).toEqual({
    text: 'Class setup ready. Main class: Grade 8. School: Kitabu Demo School. Payment: Skip for now.',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.accessibilityHint).toBe(
    'Completes account setup without adding M-Pesa',
  );
  expect(renderedText(renderer!.root)).toContain('Back to school');
  const backToSchoolText = renderer!.root.findAllByType(Text).find(node => node.props.children === 'Back to school');
  expect(backToSchoolText?.props.numberOfLines).toBe(2);
  expect(StyleSheet.flatten(backToSchoolText?.props.style)).toEqual(
    expect.objectContaining({ flexShrink: 1, textAlign: 'center' }),
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.accessibilityHint).toBe(
    'Returns to school selection',
  );
  expect(renderedText(renderer!.root)).toContain('Skip and finish');
  expect(renderer!.root.findAllByType(Check)).toHaveLength(2);

  await act(() => {
    renderer!.root.findByProps({ placeholder: '2547XXXXXXXX' }).props.onChangeText('254716175485');
  });
  expect(renderer!.root.findAllByType(Check)).toHaveLength(3);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.accessibilityHint).toBe(
    'Completes account setup with M-Pesa shortcut',
  );
  expect(renderedText(renderer!.root)).toContain('Finish setup');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Final setup review' }).props.accessibilityValue).toEqual({
    text: 'Class setup ready. Main class: Grade 8. School: Kitabu Demo School. Payment: M-Pesa ready.',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledWith({
    gender: 'not_specified',
    grade: 'Grade 8',
    schoolId: schools[0].id,
    schoolDirectoryId: null,
    mpesaPhoneNumber: '254716175485',
    selectedSubjectIds: defaultOnboardingSubjectIds,
  });
});

test('parent onboarding uses family dashboard copy', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  const text = renderedText(renderer!.root);

  expect(text).toContain('Prepare your family dashboard');
  expect(text).toContain('Child grade');
  expect(text).toContain('Homework alerts');
  expect(text).toContain('Progress view');
  expect(text).not.toContain('Gender');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Rafiki the Elephant parent mascot' })).toBeTruthy();
});

test('onboarding setup summary updates across role choices', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Teacher setup summary' }).props.accessibilityValue).toEqual({
    text: 'Class focus: Grade 6. Roster link: Choose school. Billing shortcut: Optional',
  });
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(1);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Mascot coach tip' }).props.children).toBe('Choose class');
  expect(renderedText(renderer!.root)).toContain('Class focus');
  expect(renderedText(renderer!.root)).toContain('Roster link');
  expect(renderedText(renderer!.root)).toContain('Billing shortcut');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 8' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Teacher setup summary' }).props.accessibilityValue).toEqual({
    text: 'Class focus: Grade 8. Roster link: Choose school. Billing shortcut: Optional',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Mascot coach tip' }).props.children).toBe('Link school');
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade8SchoolLabel }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Teacher setup summary' }).props.accessibilityValue).toEqual({
    text: 'Class focus: Grade 8. Roster link: Kitabu Demo School. Billing shortcut: Optional',
  });
  expect(
    setupSummaryValues(renderer!.root).find(node => node.props.children === 'Kitabu Demo School')?.props.numberOfLines,
  ).toBe(2);
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(2);
  expect(renderedText(renderer!.root)).toContain('Continue to payment');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Moves to the optional payment step',
  );

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Mascot coach tip' }).props.children).toBe('Billing ready');
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.onChangeText('0716175485');
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Teacher setup summary' }).props.accessibilityValue).toEqual({
    text: 'Class focus: Grade 8. Roster link: Kitabu Demo School. Billing shortcut: M-Pesa ready',
  });
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(3);
});

test('onboarding uses compact review rows without truncating payment details', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  const reviewValues = renderer!.root
    .findByProps({ accessibilityLabel: 'Final setup review' })
    .findAllByType(Text)
    .filter(node => ['Grade 6', 'Kitabu Demo School', 'Skip for now'].includes(node.props.children));

  expect(reviewValues.map(node => node.props.children)).toEqual([
    'Grade 6',
    'Kitabu Demo School',
    'Skip for now',
  ]);
  expect(reviewValues.every(node => node.props.numberOfLines === 2)).toBe(true);
});

test('onboarding validates and normalizes optional M-Pesa numbers before submit', async () => {
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.accessibilityHint).toBe(
    'Optional Safaricom number for faster checkout later',
  );
  await act(() => {
    renderer!.root.findByProps({ placeholder: '2547XXXXXXXX' }).props.onChangeText('123');
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Family setup summary' }).props.accessibilityValue).toEqual({
    text: 'Learner focus: Grade 6. School context: Kitabu Demo School. Payment shortcut: Check number',
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Final setup review' }).props.accessibilityValue).toEqual({
    text: 'Family setup ready. Child grade: Grade 6. School: Kitabu Demo School. Payment: Check number.',
  });
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(2);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.accessibilityHint).toBe(
    'Checks the M-Pesa number before finishing setup',
  );
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  expect(renderedText(renderer!.root)).toContain('Enter a valid Safaricom M-Pesa number');
  const validationError = renderer!.root.findByProps({ role: 'alert' });
  expect(validationError.props.accessibilityLiveRegion).toBe('polite');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Step 2 of 3');
  expect(renderedText(renderer!.root)).not.toContain('Enter a valid Safaricom M-Pesa number');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  await act(() => {
    renderer!.root.findByProps({ placeholder: '2547XXXXXXXX' }).props.onChangeText('0716175485');
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Family setup summary' }).props.accessibilityValue).toEqual({
    text: 'Learner focus: Grade 6. School context: Kitabu Demo School. Payment shortcut: M-Pesa ready',
  });
  expect(summaryCompleteMarks(renderer!.root)).toHaveLength(3);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledWith({
    gender: 'not_specified',
    grade: 'Grade 6',
    schoolId: schools[0].id,
    schoolDirectoryId: null,
    mpesaPhoneNumber: '254716175485',
    selectedSubjectIds: defaultOnboardingSubjectIds,
  });
});

test('onboarding disables Back while final setup is submitting', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.accessibilityState).toEqual({
    disabled: false,
  });

  await act(() => {
    renderer!.update(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting
        onSubmit={jest.fn()}
      />,
    );
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.disabled).toBe(true);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.accessibilityState).toEqual({
    disabled: true,
  });
  expect(
    StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.style).opacity,
  ).toBe(0.55);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Finish account setup' }).props.accessibilityState).toEqual({
    busy: true,
    disabled: true,
  });
});

test('onboarding ignores keyboard submit while final setup is submitting', async () => {
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.onChangeText('0716175485');
  });

  await act(() => {
    renderer!.update(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting
        onSubmit={onSubmit}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.onSubmitEditing();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.onKeyPress({
      nativeEvent: { key: 'Enter' },
    });
  });

  expect(onSubmit).not.toHaveBeenCalled();
});

test('student onboarding exposes accessible gender and grade selections', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="student"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  const girl = renderer!.root.findByProps({ accessibilityLabel: 'Select Girl' });
  const skip = renderer!.root.findByProps({ accessibilityLabel: 'Select Skip' });

  expect(renderedText(renderer!.root)).toContain('Smart lessons');
  expect(renderedText(renderer!.root)).toContain('CBC grade');
  expect(renderedText(renderer!.root)).toContain('Subjects you study');
  expect(renderedText(renderer!.root)).toContain('Pick up to five CBC subjects');
  const mascot = renderer!.root.findByProps({ accessibilityLabel: 'Rafiki the Rabbit student mascot' });
  expect(mascot).toBeTruthy();
  const mascotMotion = renderer!.root.findByProps({ testID: 'onboarding-mascot-motion' });
  expect(
    Boolean(
      mascotMotion.props.style &&
        typeof mascotMotion.props.style === 'object' &&
        'transform' in mascotMotion.props.style,
    ),
  ).toBe(true);
  expect(girl.props.accessibilityRole).toBe('radio');
  expect(girl.props.accessibilityState).toEqual({ checked: false });
  expect(skip.props.accessibilityState).toEqual({ checked: true });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Gender options' }).props.accessibilityRole)
    .toBe('radiogroup');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Grade options' }).props.accessibilityRole)
    .toBe('radiogroup');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 6' }).props.accessibilityRole)
    .toBe('radio');
  expect(renderedText(renderer!.root)).toContain('Form 3');
  expect(renderedText(renderer!.root)).toContain('Form 4');
  expect(renderedText(renderer!.root)).not.toContain('Grade 11');
  expect(renderedText(renderer!.root)).not.toContain('Grade 12');
  expect(React.Children.toArray(renderer!.root.findByProps({ testID: 'onboarding-footer' }).props.children))
    .toHaveLength(1);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Subjects you study' }).props.accessibilityRole)
    .toBe('list');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Remove Mathematics' }).props.accessibilityState)
    .toEqual({ disabled: false, selected: true });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Add Agriculture' }).props.accessibilityState)
    .toEqual({ disabled: true, selected: false });

  await act(() => {
    girl.props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Girl' }).props.accessibilityState)
    .toEqual({ checked: true });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Skip' }).props.accessibilityState)
    .toEqual({ checked: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Remove Social Studies' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Add Agriculture' }).props.accessibilityState)
    .toEqual({ disabled: false, selected: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Add Agriculture' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Remove Agriculture' }).props.accessibilityState)
    .toEqual({ disabled: false, selected: true });
});

test('onboarding supports keyboard submit for school search and M-Pesa', async () => {
  const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(jest.fn());
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  expect(renderedText(renderer!.root)).not.toContain('Your child\'s school \uD83C\uDFEB');
  expect(renderedText(renderer!.root)).toContain('Which school does your child attend?');
  // Before a county is picked, the school dropdown is disabled and its searchable list is closed.
  expect(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }).props.accessibilityState).toEqual({
    disabled: true,
  });
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Select county first',
  );
  await openCountyPicker(renderer!.root);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Nairobi City county' }).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select Baringo county' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Select West Pokot county' })).toBeTruthy();
  const countyOptionLabels = renderer!.root
    .findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Select ') &&
        node.props.accessibilityLabel.endsWith(' county'),
    )
    .map(node => node.props.accessibilityLabel);
  expect(countyOptionLabels[0]).toBe('Select Nairobi City county');
  const countyLabels = new Set(
    countyOptionLabels,
  );
  expect(countyLabels.size).toBe(47);
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(0);
  await selectCounty(renderer!.root);
  // Picking a county opens the searchable school dropdown.
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.editable).toBe(true);
  const schoolResults = renderer!.root.findByProps({ accessibilityLabel: 'School search results' });
  expect(schoolResults.type).toBe(ScrollView);
  expect(schoolResults.props.accessibilityRole).toBe('radiogroup');
  expect(schoolResults.props.keyboardShouldPersistTaps).toBe('handled');
  expect(schoolResults.props.nestedScrollEnabled).toBe(true);
  expect(
    renderedText(renderer!.root.findByProps({ accessibilityLabel: 'County selector' })),
  ).toContain('Nairobi City');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'School result count' }).props.children).toBe(
    'Showing 1 school in Nairobi City for Grade 6',
  );
  expect(renderedText(renderer!.root)).toContain('40 Grade 6 learners');
  expect(selectedSchoolChecks(renderer!.root)).toHaveLength(0);
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(1);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onFocus();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onChangeText('Kitabu Demo');
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onKeyPress({
      nativeEvent: { key: 'Enter' },
    });
  });

  expect(schoolPickerModal(renderer!.root).type).toBe(Modal);
  expect(schoolPickerModal(renderer!.root).props.visible).toBe(false);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected school confirmation' })).toBeTruthy();
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Kitabu Demo School',
  );
  expect(renderedText(renderer!.root)).toContain('Nairobi City · Kenya');
  expect(renderedText(renderer!.root)).toContain('Kenya');
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(0);
  expect(dismissSpy).toHaveBeenCalledTimes(2);
  const continuePaymentText = renderer!.root.findAllByType(Text).find(node => node.props.children === 'Continue to payment');
  expect(continuePaymentText?.props.numberOfLines).toBe(2);
  expect(StyleSheet.flatten(continuePaymentText?.props.style)).toEqual(
    expect.objectContaining({ flexShrink: 1, textAlign: 'center' }),
  );

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(renderedText(renderer!.root)).toContain('Step 3 of 3');

  await act(() => {
    renderer!.root.findByProps({ placeholder: '2547XXXXXXXX' }).props.onChangeText('716175485');
  });
  await act(() => {
    renderer!.root.findByProps({ placeholder: '2547XXXXXXXX' }).props.onKeyPress({
      nativeEvent: { key: 'Enter' },
    });
  });

  expect(onSubmit).toHaveBeenCalledWith({
    gender: 'not_specified',
    grade: 'Grade 6',
    schoolId: schools[0].id,
    schoolDirectoryId: null,
    mpesaPhoneNumber: '254716175485',
    selectedSubjectIds: defaultOnboardingSubjectIds,
  });

  dismissSpy.mockRestore();
}, 15000);

test('onboarding prioritizes populated counties and schools without extra labels', async () => {
  const rankedSchools: SchoolData[] = [
    {
      id: 'school-alpha',
      name: 'Alpha Academy',
      location: 'Nairobi County',
      totalStudents: 200,
      gradeCounts: { 'Grade 6': 1 },
    },
    {
      id: 'school-kitabu',
      name: 'Kitabu Demo School',
      location: 'Nairobi County',
      totalStudents: 40,
      gradeCounts: { 'Grade 6': 15 },
    },
    {
      id: 'school-zed',
      name: 'Zed Prep',
      location: 'Nairobi County',
      totalStudents: 70,
      gradeCounts: { 'Grade 6': 25 },
    },
    {
      id: 'school-kisii',
      name: 'Kisii Demo School',
      location: 'Kisii County',
      totalStudents: 18,
      gradeCounts: { 'Grade 6': 18 },
    },
  ];
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={rankedSchools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await openCountyPicker(renderer!.root);

  const countyOptionLabels = renderer!.root
    .findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Select ') &&
        node.props.accessibilityLabel.endsWith(' county'),
    )
    .map(node => node.props.accessibilityLabel);
  expect(countyOptionLabels[0]).toBe('Select Nairobi City county');
  expect(renderedText(renderer!.root)).not.toContain('Top counties');

  await selectCounty(renderer!.root);

  const schoolOptionLabels = Array.from(
    new Set(
      renderer!.root
        .findAll(
          node =>
            typeof node.props.accessibilityLabel === 'string' &&
            node.props.accessibilityLabel.startsWith('Choose ') &&
            node.props.accessibilityLabel.includes('Grade 6'),
        )
        .map(node => node.props.accessibilityLabel),
    ),
  );

  expect(schoolOptionLabels.slice(0, 3)).toEqual([
    'Choose Zed Prep, Nairobi County, 25 Grade 6 learners',
    'Choose Kitabu Demo School, Nairobi County, 15 Grade 6 learners',
    'Choose Alpha Academy, Nairobi County, 1 Grade 6 learner',
  ]);
  expect(renderedText(renderer!.root)).not.toContain('Top schools');
});

test('onboarding announces empty school search results', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onChangeText('No Such School');
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'School result count' }).props.children).toBe(
    'No schools found in Nairobi City for Grade 6',
  );
  const emptyState = renderer!.root.findByProps({ accessibilityLabel: 'No matching schools' });
  expect(emptyState.props.accessibilityLiveRegion).toBe('polite');
  expect(emptyState.props.role).toBe('status');
  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Add No Such School school' })).toHaveLength(0);
  expect(renderedText(renderer!.root)).toContain('No match yet. Add your school below.');
});

test('onboarding adds a missing school with the selected county and enables continuation', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);

  const helpLink = renderer!.root.findByProps({ testID: 'missing-school-link' });
  expect(helpLink.props.accessibilityRole).toBe('button');
  expect(helpLink.props.accessibilityHint).toContain('selected county');

  await act(() => {
    helpLink.props.onPress();
  });

  expect(renderer!.root.findByProps({ testID: 'add-school-modal' }).props.visible).toBe(true);
  expect(renderedText(renderer!.root)).toContain('Selected county: Nairobi City');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'School name' }).props.onChangeText('New Parent School');
  });

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Save school and continue' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ testID: 'add-school-modal' }).props.visible).toBe(false);
  expect(renderedText(renderer!.root)).toContain('New Parent School');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected school confirmation' })).toBeTruthy();
});

test('onboarding clears selected school when the search query changes', async () => {
  const localSchools: SchoolData[] = [
    ...schools,
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Other Demo School',
      location: 'Mombasa',
      totalStudents: 80,
      gradeCounts: { 'Grade 6': 20 },
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Kisii Demo School',
      location: 'Kisii County, Kenya',
      totalStudents: 80,
      gradeCounts: { 'Grade 6': 18 },
    },
  ];
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={localSchools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }).props.accessibilityState).toEqual({
    disabled: true,
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityHint).toBe(
    'Choose a county before continuing',
  );
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });

  expect(schoolPickerModal(renderer!.root).props.visible).toBe(false);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'School selector' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.value).toBe(
    'Kitabu Demo School',
  );
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: false, busy: false });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onChangeText('Other');
  });

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Clear school search' }).props.accessibilityHint).toBe(
    'Clears the school search and selected school',
  );

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Clear school search' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.value).toBe('');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'School result count' }).props.children).toBe(
    'Showing 1 school in Nairobi City for Grade 6',
  );
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });

  await selectCounty(renderer!.root, 'Kisii');

  expect(renderer!.root.findByProps({ accessibilityLabel: 'School result count' }).props.children).toBe(
    'Showing 1 school in Kisii for Grade 6',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: kisiiGrade6SchoolLabel })).toBeTruthy();

  await selectCounty(renderer!.root, 'Mombasa');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onChangeText('Other');
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onKeyPress({
      nativeEvent: { key: 'Enter' },
    });
  });

  expect(schoolPickerModal(renderer!.root).props.visible).toBe(false);
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Other Demo School',
  );
});

test('onboarding clears selected school when grade changes after selection', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="parent"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Family setup summary' }).props.accessibilityValue).toEqual({
    text: 'Learner focus: Grade 6. School context: Kitabu Demo School. Payment shortcut: Optional',
  });
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: false, busy: false });
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(0);

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.onPress();
  });
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 8' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Family setup summary' }).props.accessibilityValue).toEqual({
    text: 'Learner focus: Grade 8. School context: Choose school. Payment shortcut: Optional',
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'School selector' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.value).toBe('');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.accessibilityState,
  ).toEqual({ disabled: true, busy: false });
  expect(missingSchoolLinks(renderer!.root)).toHaveLength(1);
  expect(renderedText(renderer!.root)).toContain('No Grade 8 learners yet');
});

test('onboarding commits school selection and dismisses the keyboard', async () => {
  const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(jest.fn());
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="teacher"
        schools={schools}
        isSubmitting={false}
        onSubmit={jest.fn()}
      />,
    );
  });

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });
  await selectCounty(renderer!.root);
  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onFocus();
  });

  expect(
    StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.style)
      .borderColor,
  ).toBe('#235A8C');

  dismissSpy.mockClear();

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
  });

  expect(dismissSpy).toHaveBeenCalledTimes(1);
  expect(schoolPickerModal(renderer!.root).props.visible).toBe(false);
  expect(renderedText(renderer!.root.findByProps({ accessibilityLabel: 'School selector' }))).toContain(
    'Kitabu Demo School',
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected school confirmation' })).toBeTruthy();

  dismissSpy.mockRestore();
});

test('onboarding dismisses keyboard during step navigation and uses mobile keyboard layout props', async () => {
  const announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());
  const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(jest.fn());
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
        role="student"
        schools={schools}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
  });
  announceSpy.mockClear();

  expect(renderer!.root.findByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0);
  const scrollView = renderer!.root.findByProps({ testID: 'onboarding-scroll-view' });
  expect(scrollView.type).toBe(ScrollView);
  expect(scrollView.props.accessibilityLabel).toBe('Onboarding setup steps');
  expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
  expect(scrollView.props.keyboardDismissMode === 'on-drag' || scrollView.props.keyboardDismissMode === 'interactive').toBe(
    true,
  );
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 3,
    min: 1,
    now: 1,
    text: 'Step 1 of 3, Learner profile',
  });
  expect(announceSpy).not.toHaveBeenCalled();
  dismissSpy.mockClear();

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
  });

  expect(dismissSpy).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Onboarding progress' }).props.accessibilityValue).toEqual({
    max: 3,
    min: 1,
    now: 2,
    text: 'Step 2 of 3, School',
  });
  expect(announceSpy).toHaveBeenCalledWith('Step 2 of 3, School');

  await act(() => {
    renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.onPress();
  });

  expect(dismissSpy).toHaveBeenCalledTimes(2);
  expect(announceSpy).toHaveBeenCalledWith('Step 1 of 3, Learner profile');

  announceSpy.mockRestore();
  dismissSpy.mockRestore();
});

test('onboarding selected controls use role accent colors', async () => {
  const expectations = [
    { role: 'student' as const, accent: '#E07B00' },
    { role: 'teacher' as const, accent: '#235A8C' },
    { role: 'parent' as const, accent: '#2D8653' },
  ];

  for (const expectation of expectations) {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(() => {
      renderer = ReactTestRenderer.create(
      <NeutralOnboardingScreen
          role={expectation.role}
          schools={schools}
          isSubmitting={false}
          onSubmit={jest.fn()}
        />,
      );
    });

    expect(
      StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Select Grade 6' }).props.style)
        .backgroundColor,
    ).toBe(expectation.accent);
    expect(
      StyleSheet.flatten(renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.style)
        .backgroundColor,
    ).toBe(expectation.accent);

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    await selectCounty(renderer!.root);
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.onFocus();
    });

    const focusedSchoolInputStyle = StyleSheet.flatten(
      renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.style,
    );
    expect(focusedSchoolInputStyle.borderColor).toBe(expectation.accent);
    expect(focusedSchoolInputStyle.borderWidth).toBe(2);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Search school by name' }).props.selectionColor).toBe(
      expectation.accent,
    );

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: kitabuGrade6SchoolLabel }).props.onPress();
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.onFocus();
    });

    const focusedMpesaInputStyle = StyleSheet.flatten(
      renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.style,
    );
    expect(focusedMpesaInputStyle.borderColor).toBe(expectation.accent);
    expect(focusedMpesaInputStyle.borderWidth).toBe(2);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.selectionColor).toBe(
      expectation.accent,
    );

    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Back in setup' }).props.onPress();
    });
    await act(() => {
      renderer!.root.findByProps({ accessibilityLabel: 'Continue account setup' }).props.onPress();
    });

    const resetMpesaInputStyle = StyleSheet.flatten(
      renderer!.root.findByProps({ accessibilityLabel: 'M-Pesa number' }).props.style,
    );
    expect(resetMpesaInputStyle.borderColor).toBe('#E8E0D4');
    expect(resetMpesaInputStyle.borderWidth).toBe(2);
  }
});

test('subscription modal shows the requested public packages and discounts', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubscriptionCheckoutModal
        isOpen
        plans={plans}
        selectedPlanCode="monthly"
        phoneNumber=""
        maskedSavedPhoneNumber={null}
        isSubmitting={false}
        statusLabel={null}
        error={null}
        onClose={jest.fn()}
        onSelectPlan={jest.fn()}
        onChangePhoneNumber={jest.fn()}
        onUseSavedPhone={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
  });

  const textValues = renderer!.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .filter(Boolean);
  const text = renderedText(renderer!.root);

  expect(textValues.indexOf('Sungura')).toBeLessThan(textValues.indexOf('Simba'));
  expect(textValues.indexOf('Simba')).toBeLessThan(textValues.indexOf('Premium'));
  expect(textValues).toContain('MOST POPULAR');
  expect(textValues.filter(value => value === 'MOST POPULAR')).toHaveLength(1);
  expect(text).toContain('KSH 150');
  expect(text).toContain('KSH 300');
  expect(text).toContain('KSH 1,000');
  const textForNode = (node: ReactTestRenderer.ReactTestInstance) =>
    [node.props.children]
      .flat(Number.POSITIVE_INFINITY)
      .filter(value => value !== null && value !== undefined && value !== false)
      .join('');
  const sunguraCard = renderer!.root.findByProps({ accessibilityLabel: 'Select Sungura package' });
  const simbaCard = renderer!.root.findByProps({ accessibilityLabel: 'Select Simba package' });
  for (const [card, originalPrice] of [
    [sunguraCard, 'KSH 250'],
    [simbaCard, 'KSH 500'],
  ] as const) {
    const originalPriceText = card.findAllByType(Text).find(node => textForNode(node) === originalPrice);
    expect(originalPriceText).toBeDefined();
    expect(StyleSheet.flatten(originalPriceText!.props.style).textDecorationLine).toBe('line-through');
  }
  const premiumCard = renderer!.root.findByProps({ accessibilityLabel: 'Select Premium package' });
  expect(premiumCard.findAllByType(Text).some(node => textForNode(node).includes('% OFF'))).toBe(false);
  expect(
    premiumCard.findAllByType(Text).some(
      node => textForNode(node).startsWith('KSH ') &&
        StyleSheet.flatten(node.props.style).textDecorationLine === 'line-through',
    ),
  ).toBe(false);
  expect(text).toContain('Per Month');
  expect(text).toContain('Per Term');
  expect(text).toContain('40% OFF');
  expect(text).not.toContain('Per Week');
  expect(text).not.toContain('Per Year');
  expect(text).not.toContain('50% OFF');
  expect(text).toContain('Continue to Pay - KSH 300');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Sungura mascot' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Simba mascot' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Premium mascot' })).toBeTruthy();
});

test('subscription modal fills missing public packages when only one plan is returned', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubscriptionCheckoutModal
        isOpen
        plans={plans.filter(plan => plan.code === 'monthly')}
        selectedPlanCode="monthly"
        phoneNumber=""
        maskedSavedPhoneNumber={null}
        isSubmitting={false}
        statusLabel={null}
        error={null}
        onClose={jest.fn()}
        onSelectPlan={jest.fn()}
        onChangePhoneNumber={jest.fn()}
        onUseSavedPhone={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
  });

  const text = renderedText(renderer!.root);

  expect(text).toContain('Sungura');
  expect(text).toContain('Simba');
  expect(text).toContain('Premium');
  expect(text).toContain('KSH 150');
  expect(text).toContain('KSH 300');
  expect(text).toContain('KSH 1,000');
  expect(text).toContain('Continue to Pay - KSH 300');
});

test('subscription modal centers the tapped package and updates checkout amount', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  const onSelectPlan = jest.fn();

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubscriptionCheckoutModal
        isOpen
        plans={plans}
        selectedPlanCode="monthly"
        phoneNumber=""
        maskedSavedPhoneNumber={null}
        isSubmitting={false}
        statusLabel={null}
        error={null}
        onClose={jest.fn()}
        onSelectPlan={onSelectPlan}
        onChangePhoneNumber={jest.fn()}
        onUseSavedPhone={jest.fn()}
        onContinue={jest.fn()}
      />,
    );
  });

  const premiumButton = renderer!.root.findByProps({ accessibilityLabel: 'Select Premium package' });

  expect(premiumButton).toBeTruthy();

  await act(() => {
    premiumButton!.props.onPress();
  });

  const text = renderedText(renderer!.root);

  expect(onSelectPlan).toHaveBeenCalledWith('annual');
  expect(text).toContain('Premium selected');
  expect(text).toContain('Continue to Pay - KSH 1,000');

  await act(() => {
    premiumButton!.props.onPress();
  });

  const resetText = renderedText(renderer!.root);
  expect(resetText).not.toContain('Premium selected');
  expect(onSelectPlan).toHaveBeenCalledTimes(1);
});

test('free trial stays out of the paid checkout plan list', async () => {
  const onContinue = jest.fn();
  const trialPlan: BillingPlan = {
    code: 'trial_monthly_1bob',
    name: 'Free 1-Month Trial',
    billingCycle: 'monthly',
    priceKsh: 0,
    priceKshCents: 0,
    originalPriceKsh: null,
    originalPriceKshCents: null,
    isPopular: false,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  const renderCheckout = (isSubmitting: boolean) => (
      <SubscriptionCheckoutModal
        isOpen
        plans={[...plans, trialPlan]}
        selectedPlanCode="monthly"
        phoneNumber="254700000000"
      maskedSavedPhoneNumber={null}
      isSubmitting={isSubmitting}
      statusLabel={isSubmitting ? 'Check your phone and enter your M-Pesa PIN to continue.' : null}
      error={null}
      onClose={jest.fn()}
      onSelectPlan={jest.fn()}
      onChangePhoneNumber={jest.fn()}
      onUseSavedPhone={jest.fn()}
      onContinue={onContinue}
    />
  );

  await act(() => {
    renderer = ReactTestRenderer.create(renderCheckout(false));
  });

  const text = renderedText(renderer!.root);
  expect(text).not.toContain('Free 1-Month Trial');
  expect(text).not.toContain('Bob');
  expect(text).not.toContain('KSH 0');
  expect(text).toContain('Continue to Pay - KSH 300');

  await act(() => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Continue to M-Pesa payment' })
      .props.onPress();
  });

  expect(onContinue).toHaveBeenCalledWith('monthly');

  await act(() => {
    renderer!.update(renderCheckout(true));
  });

  const pendingText = renderedText(renderer!.root);
  const pendingButton = renderer!.root.findByProps({ accessibilityLabel: 'Continue to M-Pesa payment' });
  expect(pendingText).toContain('Waiting for M-Pesa...');
  expect(pendingButton.props.disabled).toBe(true);
  expect(pendingButton.props.accessibilityState).toEqual({ disabled: true, busy: true });
});

test('free trial offer starts directly without a phone number or checkout', async () => {
  const onAccept = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <TryForOneBobModal
        isOpen
        isSubmitting={false}
        mascotKey="panda"
        onClose={jest.fn()}
        onAccept={onAccept}
      />,
    );
  });

  const text = renderedText(renderer!.root);

  expect(text).toContain('Start Your Free 1-Month Trial');
  expect(text).toContain('No payment required.');
  expect(text).toContain('Start Free Trial');
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Selected panda mascot' }).props.source)
    .toBe(LEARNING_MASCOT_SOURCES.panda);
  expect(text).not.toContain('Bob');
  expect(text).not.toContain('🔥');
  expect(text).not.toContain('KSh 1');
  expect(text).not.toContain('M-Pesa');

  const trialButton = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Start Free Trial' }).length > 0,
  )[0];

  await act(() => {
    trialButton.props.onPress();
  });

  expect(onAccept).toHaveBeenCalledTimes(1);
});
