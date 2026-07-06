import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/services/parentService', () => ({
  getParentTeacherMessages: jest.fn().mockResolvedValue([]),
  sendParentTeacherMessage: jest.fn().mockResolvedValue({ messageId: 'm1' }),
}));
jest.mock('../src/services/aiService', () => ({
  askParentAssistant: jest.fn().mockResolvedValue('Here is how Amina is doing.'),
}));

import { ParentDashboardScreen } from '../src/screens/ParentDashboardScreen';
import { ParentChildSummary } from '../src/types/app';
import { getParentTeacherMessages, sendParentTeacherMessage } from '../src/services/parentService';
import { askParentAssistant } from '../src/services/aiService';

const children: ParentChildSummary[] = [
  {
    id: 'child-1',
    name: 'Amina',
    email: 'amina@example.com',
    grade: 'Grade 7',
    school: 'Kitabu School',
    relationship: 'guardian',
    assessment_average: 80,
    homework_completion: 75,
    completed_lessons: 6,
    total_lessons: 10,
    mastery_average: 70,
    due_reviews: 2,
    last_active: 'Today',
    diagnostic: { completed: true, percentage: 82, completedAt: null },
    recent_assignments: [
      {
        id: 'assignment-1',
        title: 'Fractions practice',
        subject: 'Mathematics',
        status: 'completed',
        score: 80,
        dueAt: null,
      },
      {
        id: 'assignment-2',
        title: 'Reading log',
        subject: 'English',
        status: 'pending',
        score: null,
        dueAt: null,
      },
    ],
    weekly_trends: [
      { weekStart: '2026-05-11', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
      { weekStart: '2026-05-18', lessonsCompleted: 1, assignmentsCompleted: 1, assessmentAverage: 80, weeklyExamScore: 75 },
    ],
    weekly_report: {
      generatedAt: '2026-06-18T00:00:00.000Z',
      activeDays: 3,
      lessonsCompleted: 2,
      assignmentsCompleted: 1,
      assessmentAverage: 80,
      weeklyExamScore: 75,
      strengths: ['English: Grammar'],
      focusAreas: ['Mathematics: Fractions'],
    },
  },
  {
    id: 'child-2',
    name: 'Baraka',
    email: 'baraka@example.com',
    grade: 'Grade 5',
    school: 'Kitabu School',
    relationship: 'guardian',
    assessment_average: 0,
    homework_completion: 0,
    completed_lessons: 0,
    total_lessons: 0,
    mastery_average: 0,
    due_reviews: 0,
    last_active: 'No activity yet',
    diagnostic: { completed: false, percentage: null, completedAt: null },
    recent_assignments: [],
    weekly_trends: [
      { weekStart: '2026-05-11', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
      { weekStart: '2026-05-18', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
    ],
    weekly_report: {
      generatedAt: '2026-06-18T00:00:00.000Z',
      activeDays: 0,
      lessonsCompleted: 0,
      assignmentsCompleted: 0,
      assessmentAverage: 0,
      weeklyExamScore: null,
      strengths: [],
      focusAreas: [],
    },
  },
];

const defaultProps = {
  children,
  selectedChildId: 'child-1',
  parentName: 'Grace Wanjiku',
  parentEmail: 'grace@example.com',
  parentPhone: '+254700123456',
  parentRole: 'parent',
  mascotKey: 'lion' as const,
  linkIdentifier: '',
  linkMethod: 'email' as const,
  isLoading: false,
  isLinking: false,
  error: null,
  focusModeActive: false,
  focusModeSetupRequired: false,
  focusModeSetupCompleted: false,
  focusModeError: null,
  focusModeSecondsRemaining: 7200,
  dailyLimitSeconds: 7200,
  isStartingFocusMode: false,
  onSelectChild: jest.fn(),
  onLinkIdentifierChange: jest.fn(),
  onLinkMethodChange: jest.fn(),
  onLinkChild: jest.fn(),
  onUnlinkChild: jest.fn(),
  onStartFocusMode: jest.fn(),
  onOpenFocusModeSettings: jest.fn(),
  onOpenBilling: jest.fn(),
  onRefresh: jest.fn(),
  onSignOut: jest.fn(),
};

function renderParentDashboard(
  props: Partial<React.ComponentProps<typeof ParentDashboardScreen>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ParentDashboardScreen {...defaultProps} {...props} />);
  });
  return renderer!.root;
}

function textContent(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => textContent(node.props.children) === text).length > 0;
}

function hasTextContaining(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => textContent(node.props.children).includes(text)).length > 0;
}

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && hasText(node, text))[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  (getParentTeacherMessages as jest.Mock).mockResolvedValue([]);
  (sendParentTeacherMessage as jest.Mock).mockResolvedValue({ messageId: 'm1' });
  (askParentAssistant as jest.Mock).mockResolvedValue('Here is how Amina is doing.');
});

test('renders home overview with average performance and glance stats', () => {
  const root = renderParentDashboard();

  expect(hasTextContaining(root, 'Grace')).toBe(true);
  expect(hasText(root, 'Amina')).toBe(true);
  expect(hasText(root, 'Parent account')).toBe(false);
  expect(hasText(root, 'Viewing child')).toBe(false);
  expect(hasText(root, 'Amina is on track')).toBe(true);
  expect(hasText(root, '78%')).toBe(true);
  expect(hasText(root, 'Average Performance')).toBe(true);
  expect(root.findAllByProps({ children: 'Active learning' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Topics learned' }).length).toBeGreaterThan(0);
  expect(hasText(root, '+100% vs last')).toBe(true);
  expect(hasText(root, '0% vs last')).toBe(true);
  expect(root.findAllByProps({ children: '2 linked children' }).length).toBeGreaterThan(0);
});

test('opens parent account profile with signup details and sign out', () => {
  const onSignOut = jest.fn();
  const root = renderParentDashboard({ onSignOut });

  const accountButton = root.findAll(
    node => node.props.accessibilityLabel === 'Open parent account profile',
  )[0];
  ReactTestRenderer.act(() => accountButton.props.onPress());

  expect(hasText(root, 'Grace Wanjiku')).toBe(true);
  expect(hasText(root, 'grace@example.com')).toBe(true);
  expect(hasText(root, '+254700123456')).toBe(true);
  expect(hasText(root, 'Parent')).toBe(true);

  const signOutButton = pressableWithText(root, 'Sign out');
  ReactTestRenderer.act(() => signOutButton.props.onPress());
  expect(onSignOut).toHaveBeenCalledTimes(1);
});

test('switches the "Today at a glance" range tabs', () => {
  const root = renderParentDashboard();
  const monthTab = pressableWithText(root, 'This month');
  ReactTestRenderer.act(() => monthTab.props.onPress());
  const yearTab = pressableWithText(root, 'Year so far');
  ReactTestRenderer.act(() => yearTab.props.onPress());
  // Year-so-far tops out at lifetime completed_lessons (6) -> 126 min estimate.
  expect(hasText(root, '126 min')).toBe(true);
});

test('opens the child manager and removes a child with confirmation', () => {
  const onSelectChild = jest.fn();
  const onUnlinkChild = jest.fn();
  const root = renderParentDashboard({ onSelectChild, onUnlinkChild });

  const identity = root.findAll(node => node.props.accessibilityLabel === 'Switch child')[0];
  ReactTestRenderer.act(() => identity.props.onPress());

  const barakaRow = pressableWithText(root, 'Baraka');
  ReactTestRenderer.act(() => barakaRow.props.onPress());
  expect(onSelectChild).toHaveBeenCalledWith('child-2');

  ReactTestRenderer.act(() => identity.props.onPress());
  const removeButton = pressableWithText(root, 'Remove');
  ReactTestRenderer.act(() => removeButton.props.onPress());
  const confirmButton = pressableWithText(root, 'Confirm');
  ReactTestRenderer.act(() => confirmButton.props.onPress());
  expect(onUnlinkChild).toHaveBeenCalledWith('child-1');
});

test('starts Focus Mode and shows App Pinning setup when required', () => {
  const onStartFocusMode = jest.fn();
  const onOpenFocusModeSettings = jest.fn();
  const root = renderParentDashboard({
    focusModeSetupRequired: true,
    focusModeError: 'Turn on App Pinning to keep KITABU on screen.',
    onStartFocusMode,
    onOpenFocusModeSettings,
  });

  expect(
    root.findAllByProps({
      children: 'Focus Mode keeps KITABU on screen while your child learns.',
    }).length,
  ).toBeGreaterThan(0);
  expect(
    root.findAllByProps({ children: 'KITABU does not create a separate PIN.' }).length,
  ).toBeGreaterThan(0);

  const startButton = pressableWithText(root, 'Start Focus Mode');
  ReactTestRenderer.act(() => startButton.props.onPress());
  expect(onStartFocusMode).toHaveBeenCalledTimes(1);

  const settingsButton = pressableWithText(root, 'Open Settings');
  ReactTestRenderer.act(() => settingsButton.props.onPress());
  expect(onOpenFocusModeSettings).toHaveBeenCalledTimes(1);
});

test('shows only the PIN prompt after Focus Mode setup has completed', () => {
  const root = renderParentDashboard({
    focusModeSetupCompleted: true,
    focusModeError: 'Enter the parent PIN to start Focus Mode.',
  });

  expect(hasText(root, 'Enter your parent PIN to start Focus Mode for this student.')).toBe(true);
  expect(hasText(root, 'KITABU does not create a separate PIN.')).toBe(false);
  expect(hasText(root, 'Turn on App Pinning to keep KITABU on screen.')).toBe(false);
  expect(root.findAllByProps({ children: 'Enter PIN' }).length).toBeGreaterThan(0);
});

test('lock phone quick action starts Focus Mode', () => {
  const onStartFocusMode = jest.fn();
  const root = renderParentDashboard({ onStartFocusMode });
  const lockButton = pressableWithText(root, 'Lock\nphone');
  ReactTestRenderer.act(() => lockButton.props.onPress());
  expect(onStartFocusMode).toHaveBeenCalledTimes(1);
});

test('pay subscription quick action opens billing', () => {
  const onOpenBilling = jest.fn();
  const root = renderParentDashboard({ onOpenBilling });
  const payButton = pressableWithText(root, 'Pay\nsubscription');
  ReactTestRenderer.act(() => payButton.props.onPress());
  expect(onOpenBilling).toHaveBeenCalledTimes(1);
});

test('insights tab shows the weekly report', () => {
  const root = renderParentDashboard();
  const insightsTab = pressableWithText(root, 'Insights');
  ReactTestRenderer.act(() => insightsTab.props.onPress());
  expect(hasText(root, 'This week for Amina')).toBe(true);
  expect(root.findAllByProps({ children: 'English: Grammar' }).length).toBeGreaterThan(0);
  expect(hasText(root, 'Parenting tips')).toBe(true);
});

test('learning tab shows activity and assignments', () => {
  const root = renderParentDashboard();
  const learningTab = pressableWithText(root, 'Learning');
  ReactTestRenderer.act(() => learningTab.props.onPress());
  expect(hasText(root, 'Learning activity')).toBe(true);
  expect(root.findAllByProps({ children: 'Fractions practice' }).length).toBeGreaterThan(0);
});

test('ask rafiki sends a message through the assistant', async () => {
  const root = renderParentDashboard();
  const rafikiTab = pressableWithText(root, 'Ask Rafiki');
  ReactTestRenderer.act(() => rafikiTab.props.onPress());

  const suggestion = pressableWithText(root, 'How is Amina doing this week?');
  await ReactTestRenderer.act(async () => {
    suggestion.props.onPress();
  });
  expect(askParentAssistant).toHaveBeenCalledTimes(1);
  expect(hasText(root, 'Here is how Amina is doing.')).toBe(true);
});

test('renders loading, empty, and error states', () => {
  const loading = renderParentDashboard({ children: [], selectedChildId: null, isLoading: true });
  expect(loading.findAllByProps({ children: 'Loading children' }).length).toBeGreaterThan(0);

  const empty = renderParentDashboard({ children: [], selectedChildId: null });
  expect(empty.findAllByProps({ children: 'No children linked yet' }).length).toBeGreaterThan(0);

  const error = renderParentDashboard({
    children: [],
    selectedChildId: null,
    error: 'Unable to load parent dashboard',
  });
  expect(error.findAllByProps({ children: 'Dashboard unavailable' }).length).toBeGreaterThan(0);
  expect(error.findAllByProps({ children: 'Unable to load parent dashboard' }).length).toBeGreaterThan(0);
});

test('submits email linking from the empty state', () => {
  const onLinkChild = jest.fn();
  const onLinkIdentifierChange = jest.fn();
  const root = renderParentDashboard({
    children: [],
    selectedChildId: null,
    linkIdentifier: 'student@example.com',
    onLinkChild,
    onLinkIdentifierChange,
  });

  ReactTestRenderer.act(() => {
    root.findByProps({ placeholder: 'Student email' }).props.onChangeText('child@example.com');
  });
  expect(onLinkIdentifierChange).toHaveBeenCalledWith('child@example.com');

  const linkButton = root.findAll(node => node.props.onPress === onLinkChild)[0];
  ReactTestRenderer.act(() => linkButton.props.onPress());
  expect(onLinkChild).toHaveBeenCalledTimes(1);
});
