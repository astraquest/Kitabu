import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { SubjectGrid, SubjectSelector } from '../src/components/SubjectGrid';
import { SubscriptionCheckoutModal } from '../src/components/SubscriptionCheckoutModal';
import { INITIAL_ASSIGNMENTS, SUBJECTS } from '../src/data/mockData';
import { HomeworkListScreen } from '../src/screens/HomeworkListScreen';
import { LoginScreen } from '../src/screens/LoginScreen';
import type { BillingPlan, DueReview, WeeklyExamPayload } from '../src/types/app';

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
  isSubmitting: false,
  onModeChange: jest.fn(),
  onEmailChange: jest.fn(),
  onPasswordChange: jest.fn(),
  onFullNameChange: jest.fn(),
  onSignupRoleChange: jest.fn(),
  onAcceptedTermsChange: jest.fn(),
  onAuthenticated: jest.fn(),
  onSubmit: jest.fn(),
};

const plans: BillingPlan[] = [
  {
    code: 'annual',
    name: 'Annual',
    billingCycle: 'annual',
    priceKsh: 1999,
    priceKshCents: 199900,
    originalPriceKsh: 6000,
    originalPriceKshCents: 600000,
    isPopular: false,
  },
  {
    code: 'weekly',
    name: 'Weekly',
    billingCycle: 'weekly',
    priceKsh: 100,
    priceKshCents: 10000,
    originalPriceKsh: null,
    originalPriceKshCents: null,
    isPopular: false,
  },
  {
    code: 'monthly',
    name: 'Monthly',
    billingCycle: 'monthly',
    priceKsh: 250,
    priceKshCents: 25000,
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

function renderedText(root: ReactTestRenderer.ReactTestInstance) {
  return root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Number.POSITIVE_INFINITY)
    .filter(value => value !== null && value !== undefined && value !== false)
    .join('')
    .replace(/\s+/g, ' ');
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

test('dashboard subject grid opens plus selector and saves selected subjects', async () => {
  const onSaveSubjectSelection = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectGrid
        subjects={SUBJECTS.slice(0, 5)}
        allSubjects={SUBJECTS}
        selectedSubjectIds={SUBJECTS.slice(0, 5).map(subject => subject.id)}
        onOpenSubject={jest.fn()}
        onSaveSubjectSelection={onSaveSubjectSelection}
        onOpenGameZone={jest.fn()}
      />,
    );
  });

  let text = renderedText(renderer!.root);
  expect(text).not.toContain('My Subjects');
  expect(text).not.toContain('5/5 selected');

  const addButton = renderer!.root.findByProps({ accessibilityLabel: 'Choose dashboard subjects' });
  await act(() => addButton.props.onPress());

  text = renderedText(renderer!.root);
  expect(text).toContain('Choose Subjects');
  expect(text).toContain('5/5 selected');

  const saveButton = renderer!.root.findByProps({ accessibilityLabel: 'Save dashboard subjects' });
  await act(() => saveButton.props.onPress());

  expect(onSaveSubjectSelection).toHaveBeenCalledWith(
    SUBJECTS.slice(0, 5).map(subject => subject.id),
  );
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
  expect(text).toContain('Pending (1)');
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
  expect(text).toContain('Pending (1)');
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

test('sign-in page renders account-type cards before credentials', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(<LoginScreen {...defaultLoginProps} />);
  });

  expect(renderer!.root.findByProps({ children: 'Select account type' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue as Student' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue as Teacher' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Continue as Parent' })).toBeTruthy();
});

test('subscription modal orders weekly monthly annual and shows discounts', async () => {
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

  expect(textValues.indexOf('Weekly')).toBeLessThan(textValues.indexOf('Monthly'));
  expect(textValues.indexOf('Monthly')).toBeLessThan(textValues.indexOf('Annual'));
  expect(textValues).toContain('POPULAR');
  expect(text).toContain('KSh 100');
  expect(text).toContain('KSh 250');
  expect(text).toContain('KSh 500');
  expect(text).toContain('KSh 1,999');
  expect(text).toContain('KSh 6,000');
});
