import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ParentDashboardScreen } from '../src/screens/ParentDashboardScreen';
import { ParentChildSummary } from '../src/types/app';

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
  linkIdentifier: '',
  linkMethod: 'email' as const,
  isLoading: false,
  isLinking: false,
  error: null,
  onSelectChild: jest.fn(),
  onLinkIdentifierChange: jest.fn(),
  onLinkMethodChange: jest.fn(),
  onLinkChild: jest.fn(),
  onUnlinkChild: jest.fn(),
  onRefresh: jest.fn(),
  onSignOut: jest.fn(),
};

function renderParentDashboard(
  props: Partial<React.ComponentProps<typeof ParentDashboardScreen>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ParentDashboardScreen {...defaultProps} {...props} />,
    );
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

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && hasText(node, text))[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders multiple children and data-backed overview stats', () => {
  const root = renderParentDashboard();

  expect(root.findAllByProps({ children: '2 linked children' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Amina' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Baraka' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Fractions practice' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: '80%' }).length).toBeGreaterThan(0);
  expect(hasText(root, '6 of 10 lessons completed')).toBe(true);
});

test('submits email linking', () => {
  const onLinkChild = jest.fn();
  const onLinkIdentifierChange = jest.fn();
  const root = renderParentDashboard({
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

test('submits phone linking and switches methods', () => {
  const onLinkChild = jest.fn();
  const onLinkMethodChange = jest.fn();
  const onLinkIdentifierChange = jest.fn();
  const root = renderParentDashboard({
    linkIdentifier: '0712345678',
    linkMethod: 'phone',
    onLinkChild,
    onLinkIdentifierChange,
    onLinkMethodChange,
  });

  ReactTestRenderer.act(() => {
    root.findByProps({ placeholder: 'Student phone' }).props.onChangeText('0700000001');
  });
  expect(onLinkIdentifierChange).toHaveBeenCalledWith('0700000001');

  const emailMethod = pressableWithText(root, 'Email');
  ReactTestRenderer.act(() => emailMethod.props.onPress());
  expect(onLinkMethodChange).toHaveBeenCalledWith('email');

  const linkButton = root.findAll(node => node.props.onPress === onLinkChild)[0];
  ReactTestRenderer.act(() => linkButton.props.onPress());
  expect(onLinkChild).toHaveBeenCalledTimes(1);
});

test('selects and removes a child with confirmation', () => {
  const onSelectChild = jest.fn();
  const onUnlinkChild = jest.fn();
  const root = renderParentDashboard({ onSelectChild, onUnlinkChild });

  const barakaTab = pressableWithText(root, 'Baraka');
  ReactTestRenderer.act(() => barakaTab.props.onPress());
  expect(onSelectChild).toHaveBeenCalledWith('child-2');

  const removeButton = pressableWithText(root, 'Remove');
  ReactTestRenderer.act(() => removeButton.props.onPress());
  const confirmButton = pressableWithText(root, 'Confirm');
  ReactTestRenderer.act(() => confirmButton.props.onPress());
  expect(onUnlinkChild).toHaveBeenCalledWith('child-1');
});

test('renders loading, empty, and error states', () => {
  const loading = renderParentDashboard({ children: [], selectedChildId: null, isLoading: true });
  expect(loading.findAllByProps({ children: 'Loading children' }).length).toBeGreaterThan(0);

  const empty = renderParentDashboard({ children: [], selectedChildId: null });
  expect(empty.findAllByProps({ children: 'No children linked yet' }).length).toBeGreaterThan(0);
  expect(
    empty.findAllByProps({
      children: 'Add a verified student by email or phone to view learning progress, homework, diagnostics, and review load.',
    }).length,
  ).toBeGreaterThan(0);

  const error = renderParentDashboard({
    children: [],
    selectedChildId: null,
    error: 'Unable to load parent dashboard',
  });
  expect(error.findAllByProps({ children: 'Dashboard unavailable' }).length).toBeGreaterThan(0);
  expect(error.findAllByProps({ children: 'Unable to load parent dashboard' }).length).toBeGreaterThan(0);
});

test('weekly report shows activity when present and empty copy when absent', () => {
  const activeReport = renderParentDashboard();
  const weeklyTab = pressableWithText(activeReport, 'Weekly report');
  ReactTestRenderer.act(() => weeklyTab.props.onPress());
  expect(hasText(activeReport, 'This week for Amina')).toBe(true);
  expect(activeReport.findAllByProps({ children: 'English: Grammar' }).length).toBeGreaterThan(0);

  const emptyReport = renderParentDashboard({ selectedChildId: 'child-2' });
  const emptyWeeklyTab = pressableWithText(emptyReport, 'Weekly report');
  ReactTestRenderer.act(() => emptyWeeklyTab.props.onPress());
  expect(
    emptyReport.findAllByProps({
      children: 'Weekly activity appears after lessons, assignments, or exams are completed.',
    }).length,
  ).toBeGreaterThan(0);
  expect(emptyReport.findAllByProps({ children: 'No data' }).length).toBeGreaterThan(0);
});
