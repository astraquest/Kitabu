import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';

import { INITIAL_SUBMITTED_ASSIGNMENTS, INITIAL_TEACHER_STUDENTS } from '../src/data/mockData';
import { generateLessonPlanIdeas } from '../src/services/aiService';
import {
  getTeacherParentMessages,
  getTeacherParents,
  sendTeacherParentMessage,
} from '../src/services/teacherService';
import { TeacherPortalScreen } from '../src/screens/TeacherPortalScreen';

jest.mock('../src/services/aiService', () => ({
  generateAssignmentJson: jest.fn(),
  generateLessonPlanIdeas: jest.fn(),
}));

jest.mock('../src/services/teacherService', () => ({
  getTeacherParentMessages: jest.fn(),
  getTeacherParents: jest.fn(),
  saveTeacherLessonPlan: jest.fn(),
  sendTeacherParentMessage: jest.fn(),
}));

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

function multilineInput(root: ReactTestRenderer.ReactTestInstance) {
  const match = root.findAll(node => node.props.onChangeText && node.props.multiline)[0];
  if (!match) {
    throw new Error('Could not find multiline input');
  }
  return match;
}

describe('TeacherPortalScreen', () => {
  beforeEach(() => {
    (generateLessonPlanIdeas as jest.Mock).mockReset();
    (generateLessonPlanIdeas as jest.Mock).mockResolvedValue(
      'Hook: Begin with a real-life equation. Learner activity: solve in pairs.',
    );
    (getTeacherParents as jest.Mock).mockReset();
    (getTeacherParents as jest.Mock).mockResolvedValue([
      {
        id: 'parent-1',
        name: 'Mary Otieno',
        email: 'mary@example.com',
        child_count: 1,
      },
      {
        id: 'parent-2',
        name: 'Peter Kamau',
        email: 'peter@example.com',
        child_count: 2,
      },
    ]);
    (getTeacherParentMessages as jest.Mock).mockReset();
    (getTeacherParentMessages as jest.Mock).mockResolvedValue([]);
    (sendTeacherParentMessage as jest.Mock).mockReset();
    (sendTeacherParentMessage as jest.Mock).mockResolvedValue({ sentCount: 1 });
  });

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
    expect(hasText(root, 'Needs urgent help')).toBe(true);

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

  it('opens country selection as an anchored overlay above the profile', async () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => pressableWithAccessibilityLabel(root, 'Open teacher profile').props.onPress());
    await act(async () => {
      pressableWithAccessibilityLabel(root, 'Select country').props.onPress();
      await new Promise(resolve => setTimeout(resolve, 60));
    });

    expect(hasText(root, 'Select Country')).toBe(true);
    expect(root.findAllByType(Modal).some(modal => modal.props.visible)).toBe(true);

    act(() => pressableWithAccessibilityLabel(root, 'Close Country dropdown').props.onPress());
    expect(root.findAllByType(Modal).some(modal => modal.props.visible)).toBe(false);
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

  it('keeps bottom nav on messages and supports grade-wide or single-parent sending', async () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    await act(async () => {
      pressableWithAccessibilityLabel(root, 'Open parent messages').props.onPress();
    });

    expect(hasText(root, 'Parent Messaging')).toBe(false);
    expect(hasText(root, 'Message Grade 10 Parents')).toBe(false);
    expect(hasText(root, "Teacher's Portal")).toBe(true);
    expect(pressableWithAccessibilityLabel(root, 'Open teacher profile')).toBeTruthy();
    expect(hasText(root, 'Home')).toBe(true);
    expect(hasText(root, 'Students')).toBe(true);
    expect(hasText(root, 'Insights')).toBe(true);
    expect(hasText(root, 'Messages')).toBe(true);
    expect(hasText(root, 'Lesson Plan')).toBe(true);
    expect(hasText(root, 'All Grade 10 parents')).toBe(true);
    expect(hasText(root, 'One parent')).toBe(true);
    expect(hasText(root, 'Select parent')).toBe(false);
    const sectionTitles = root
      .findAll(node => {
        const text = textContent(node.props.children);
        return text === '1. Select grade' || text === '2. Who do you want to message?';
      })
      .map(node => textContent(node.props.children))
      .filter((title, index, titles) => index === 0 || title !== titles[index - 1]);
    expect(sectionTitles).toEqual(['1. Select grade', '2. Who do you want to message?']);
    expect(getTeacherParents).toHaveBeenCalledWith('Grade 10');

    act(() => multilineInput(root).props.onChangeText('Grade 10 reminder'));
    await act(async () => {
      await pressableWithAccessibilityLabel(root, 'Send message to selected recipients').props.onPress();
    });
    expect(sendTeacherParentMessage).toHaveBeenCalledWith({
      body: 'Grade 10 reminder',
      gradeLevel: 'Grade 10',
      parentUserId: null,
    });

    await act(async () => {
      pressableWithAccessibilityLabel(root, 'Send to one parent').props.onPress();
      await Promise.resolve();
    });
    expect(hasText(root, 'Select parent')).toBe(true);
    await act(async () => {
      pressableWithAccessibilityLabel(root, 'Select parent dropdown').props.onPress();
      await new Promise(resolve => setTimeout(resolve, 60));
    });
    expect(root.findAllByType(Modal).some(modal => modal.props.visible)).toBe(true);
    act(() => pressableWithText(root, 'Peter Kamau').props.onPress());
    expect(root.findAllByType(Modal).some(modal => modal.props.visible)).toBe(false);
    expect(hasText(root, 'This message will go only to Peter Kamau.')).toBe(true);

    act(() => multilineInput(root).props.onChangeText('Individual parent note'));
    await act(async () => {
      await pressableWithAccessibilityLabel(root, 'Send message to selected recipients').props.onPress();
    });
    expect(sendTeacherParentMessage).toHaveBeenLastCalledWith({
      body: 'Individual parent note',
      gradeLevel: 'Grade 10',
      parentUserId: 'parent-2',
    });
  });

  it('generates lesson preview only after Ask AI', async () => {
    const renderer = renderTeacherPortal();
    const root = renderer.root;

    act(() => pressableWithAccessibilityLabel(root, 'Open lesson planner').props.onPress());

    expect(hasText(root, 'Create a clean lesson plan in minutes')).toBe(true);
    expect(hasText(root, 'Quick Setup')).toBe(true);
    // Bottom nav stays sticky on the lesson planner, like the other portal tabs.
    expect(hasText(root, "Teacher's Portal")).toBe(true);
    expect(pressableWithAccessibilityLabel(root, 'Open teacher profile')).toBeTruthy();
    expect(pressableWithAccessibilityLabel(root, 'Open teacher home')).toBeTruthy();
    expect(pressableWithAccessibilityLabel(root, 'Open parent messages')).toBeTruthy();
    expect(hasText(root, 'Lesson Preview')).toBe(false);
    expect(hasText(root, 'Ask AI')).toBe(true);
    expect(hasText(root, 'Save Plan')).toBe(false);

    await act(async () => {
      await pressableWithText(root, 'Ask AI').props.onPress();
    });

    expect(generateLessonPlanIdeas).toHaveBeenCalledTimes(1);
    expect(hasText(root, 'Quick Setup')).toBe(false);
    expect(hasText(root, 'Lesson Preview')).toBe(true);
    expect(hasText(root, 'AI Presentation Ideas')).toBe(true);
    expect(hasText(root, 'Edit Setup')).toBe(true);
    expect(hasText(root, 'Save Plan')).toBe(true);

    act(() => pressableWithText(root, 'Edit Setup').props.onPress());
    expect(hasText(root, 'Quick Setup')).toBe(true);
    expect(hasText(root, 'Lesson Preview')).toBe(false);
  });
});
