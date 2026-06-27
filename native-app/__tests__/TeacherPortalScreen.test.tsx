import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { INITIAL_SUBMITTED_ASSIGNMENTS, INITIAL_TEACHER_STUDENTS } from '../src/data/mockData';
import { TeacherPortalScreen } from '../src/screens/TeacherPortalScreen';

function renderTeacherPortal() {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <TeacherPortalScreen
        teacherName="Ms. Njeri"
        teacherEmail="njeri@kitabu.ai"
        students={INITIAL_TEACHER_STUDENTS}
        assignments={INITIAL_SUBMITTED_ASSIGNMENTS}
        submissionsByAssignment={{}}
        onPublishAssignment={jest.fn()}
      />,
    );
  });
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

function pressableContainingText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  const match = root.findAll(
    node =>
      node.props.onPress &&
      node.findAll(child => textContent(child.props.children).includes(text)).length > 0,
  )[0];
  if (!match) {
    throw new Error(`Could not find pressable containing text: ${text}`);
  }
  return match;
}

describe('TeacherPortalScreen', () => {
  it('keeps teacher navigation inside the teacher portal', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    expect(hasText(root, 'Assignments')).toBe(true);
    expect(hasText(root, 'Reports')).toBe(true);
    expect(hasText(root, 'Lesson Plan')).toBe(true);
    expect(hasText(root, 'Messages')).toBe(true);

    act(() => {
      pressableWithText(root, 'Students').props.onPress();
    });
    expect(hasText(root, 'Student List')).toBe(true);

    act(() => {
      pressableWithText(root, 'Home').props.onPress();
    });
    expect(hasText(root, 'Teacher Account')).toBe(false);
    expect(hasText(root, 'Grade 10 is on track')).toBe(true);
  });

  it('updates the active grade and exposes class list plus profile management', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => {
      pressableContainingText(root, 'Grade 10').props.onPress();
    });
    act(() => {
      pressableWithText(root, 'Grade 9').props.onPress();
    });
    expect(hasText(root, 'Grade 9 is on track')).toBe(true);

    act(() => {
      pressableWithText(root, 'Class List').props.onPress();
    });
    expect(hasText(root, 'Grade 9 List')).toBe(true);

    act(() => {
      pressableWithText(root, 'Profile').props.onPress();
    });
    expect(hasText(root, 'Personal Details')).toBe(true);
    expect(hasText(root, 'Grades taught')).toBe(true);
    expect(hasText(root, 'Subjects taught')).toBe(true);
  });

  it('limits the dashboard grade dropdown to profile-selected grades immediately', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => {
      pressableContainingText(root, 'Grade 10').props.onPress();
    });
    act(() => {
      pressableWithText(root, 'Grade 9').props.onPress();
    });
    expect(hasText(root, 'Grade 9 is on track')).toBe(true);

    act(() => {
      pressableWithText(root, 'Profile').props.onPress();
    });
    act(() => {
      pressableWithText(root, 'Grade 9').props.onPress();
    });
    act(() => {
      pressableWithText(root, 'Home').props.onPress();
    });

    expect(hasText(root, 'Grade 10 is on track')).toBe(true);

    act(() => {
      pressableContainingText(root, 'Grade 10').props.onPress();
    });
    expect(hasText(root, 'Grade 10')).toBe(true);
    expect(hasText(root, 'Grade 9')).toBe(false);
  });

  it('opens a functional lesson plan builder from quick actions', () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => {
      pressableWithText(root, 'Lesson Plan').props.onPress();
    });

    expect(hasText(root, 'Create a clean lesson plan in minutes')).toBe(true);
    expect(hasText(root, 'Quick Setup')).toBe(true);
    expect(hasText(root, 'Lesson Preview')).toBe(true);
    expect(hasText(root, 'Generate Plan')).toBe(true);
    expect(hasText(root, 'Save Plan')).toBe(true);

    act(() => {
      pressableWithText(root, 'Clear').props.onPress();
    });
    expect(hasText(root, 'Draft')).toBe(true);

    act(() => {
      pressableWithText(root, 'Generate Plan').props.onPress();
    });
    expect(hasText(root, 'Ready')).toBe(true);
  });
});
