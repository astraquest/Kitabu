import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { INITIAL_SUBMITTED_ASSIGNMENTS, INITIAL_TEACHER_STUDENTS } from '../src/data/mockData';
import { TeacherPortalScreen } from '../src/screens/TeacherPortalScreen';

const mountedRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

function renderTeacherPortal(options: { onSignOut?: jest.Mock } = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <TeacherPortalScreen
        teacherName="Ms. Njeri"
        teacherEmail="njeri@kitabu.ai"
        students={INITIAL_TEACHER_STUDENTS}
        assignments={INITIAL_SUBMITTED_ASSIGNMENTS}
        submissionsByAssignment={{}}
        onSignOut={options.onSignOut}
        onPublishAssignment={jest.fn()}
      />,
    );
  });
  mountedRenderers.push(renderer!);
  return renderer!;
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
  const match = root.findAll(node => node.props.onPress && hasText(node, text))[0];
  if (!match) {
    throw new Error(`Could not find pressable with text: ${text}`);
  }
  return match;
}

function pressableWithAccessibilityLabel(root: ReactTestRenderer.ReactTestInstance, label: string) {
  const match = root.findAll(node => node.props.onPress && node.props.accessibilityLabel === label)[0];
  if (!match) {
    throw new Error(`Could not find pressable with accessibility label: ${label}`);
  }
  return match;
}

describe('TeacherPortalScreen', () => {
  afterEach(() => {
    act(() => {
      while (mountedRenderers.length > 0) {
        mountedRenderers.pop()?.unmount();
      }
    });
  });

  it('keeps teacher navigation inside the teacher portal', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    expect(hasText(root, 'Assignments')).toBe(true);
    expect(hasText(root, 'Student List')).toBe(true);

    act(() => pressableWithText(root, 'Assignments').props.onPress());
    expect(hasText(root, 'Submission Rate')).toBe(true);
    expect(hasText(root, 'Open Assignments')).toBe(true);

    act(() => pressableWithText(root, 'Students').props.onPress());
    expect(hasText(root, 'Class Average')).toBe(true);

    expect(pressableWithAccessibilityLabel(root, 'Open parent messages')).toBeTruthy();
  });

  it('updates the active grade and exposes class list plus profile management', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => pressableWithText(root, 'Grade 10').props.onPress());
    act(() => pressableWithText(root, 'Grade 9').props.onPress());
    expect(hasText(root, 'Grade 9')).toBe(true);
    expect(hasText(root, 'Grade 10')).toBe(false);

    act(() => pressableWithAccessibilityLabel(root, 'Open teacher profile').props.onPress());
    expect(hasText(root, 'Teacher Profile')).toBe(true);
    expect(hasText(root, 'Email')).toBe(true);
    expect(hasText(root, 'Phone')).toBe(true);
    expect(hasText(root, 'Grades taught')).toBe(true);
    expect(hasText(root, 'Subjects taught')).toBe(true);
  });

  it('updates profile-selected grades immediately', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => pressableWithAccessibilityLabel(root, 'Open teacher profile').props.onPress());
    expect(hasText(root, '2 selected')).toBe(true);

    act(() => pressableWithText(root, 'Grade 9').props.onPress());
    expect(hasText(root, '1 selected')).toBe(true);
  });

  it('exposes sign out from the teacher profile', () => {
    const onSignOut = jest.fn();
    const renderer = renderTeacherPortal({ onSignOut });
    const root = renderer.root;

    act(() => pressableWithAccessibilityLabel(root, 'Open teacher profile').props.onPress());
    expect(hasText(root, 'Sign Out')).toBe(true);

    act(() => pressableWithAccessibilityLabel(root, 'Sign out of teacher account').props.onPress());
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('opens a functional lesson plan builder from quick actions', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => pressableWithAccessibilityLabel(root, 'Open lesson planner').props.onPress());

    expect(hasText(root, 'Create a clean lesson plan in minutes')).toBe(true);
    expect(hasText(root, 'Quick Setup')).toBe(true);
    expect(hasText(root, 'Lesson Preview')).toBe(true);
    expect(hasText(root, 'Ask AI')).toBe(true);
    expect(hasText(root, 'Save Plan')).toBe(true);

    act(() => {
      pressableWithText(root, 'Clear').props.onPress();
    });
    expect(hasText(root, 'Draft')).toBe(true);
  });
});
