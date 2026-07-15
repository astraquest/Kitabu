import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { buildFallbackLearningPath } from '../src/features/progressiveLearning/model/buildFallbackLearningPath';
import { ProgressiveLessonScreen } from '../src/features/progressiveLearning/screens/ProgressiveLessonScreen';
import { SubjectLearningPathScreen } from '../src/features/progressiveLearning/screens/SubjectLearningPathScreen';
import type {
  ProgressiveLesson,
  SubjectLearningPath,
} from '../src/features/progressiveLearning/types';
import type { LearningStrand, Subject } from '../src/types/app';
import {
  checkProgressiveLessonStep,
  completeProgressiveLesson,
  startProgressiveLesson,
} from '../src/features/progressiveLearning/api/progressiveLearningService';

jest.mock(
  '../src/features/progressiveLearning/api/progressiveLearningService',
  () => ({
    createProgressiveClientId: () => '11111111-1111-4111-8111-111111111111',
    startProgressiveLesson: jest.fn(),
    checkProgressiveLessonStep: jest.fn(),
    completeProgressiveLesson: jest.fn(),
  }),
);

jest.mock('../src/services/haptics', () => ({
  triggerHaptic: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const subject: Subject = {
  id: 'math',
  name: 'Mathematics',
  colorFrom: '#4F7CE8',
  colorTo: '#7C3AED',
};

const strands: LearningStrand[] = [
  {
    id: 'strand-1',
    title: 'Algebra',
    subTitle: '',
    subStrands: [
      {
        id: 'sub-1',
        title: 'Linear Equations',
        type: 'skill',
        pages: [],
        isCompleted: false,
        isLocked: false,
        outcomes: [
          { id: 'outcome-1', text: 'Solve equations in one unknown.' },
        ],
        inquiryQuestions: [],
      },
    ],
  },
];

const path: SubjectLearningPath = {
  subjectId: 'math',
  subjectName: 'Mathematics',
  grade: 'Grade 7',
  title: 'Linear Equations',
  description: 'Learn equations through wildlife stories.',
  completedCount: 0,
  totalCount: 2,
  progressPercent: 0,
  delivery: 'progressive',
  nodes: [
    {
      id: 'lesson-1',
      lessonKey: 'lesson-1',
      lessonVersion: 1,
      title: 'Equality as balance',
      objective: 'Understand equality.',
      estimatedMinutes: 7,
      position: 0,
      status: 'current',
      bestScore: null,
      attemptCount: 0,
    },
    {
      id: 'lesson-2',
      lessonKey: 'lesson-2',
      lessonVersion: 1,
      title: 'Forming equations',
      objective: 'Turn stories into equations.',
      estimatedMinutes: 8,
      position: 1,
      status: 'locked',
      bestScore: null,
      attemptCount: 0,
    },
  ],
};

const lesson: ProgressiveLesson = {
  lessonKey: 'lesson-1',
  lessonVersion: 1,
  subjectId: 'math',
  grade: 'Grade 7',
  strand: 'Algebra',
  subStrand: 'Linear Equations',
  title: 'Equality as balance',
  shortTitle: 'Equality',
  objective: 'Understand equality.',
  estimatedMinutes: 7,
  steps: [
    {
      id: 'lesson-1-step-1',
      phase: 'checkpoint',
      prompt: 'One elephant balances how many zebras?',
      options: ['2 zebras', '4 zebras', '6 zebras'],
      visual: {
        kind: 'balance',
        left: [{ object: 'elephant', count: 1 }],
        right: [{ object: 'zebra', count: 4 }],
        balanced: true,
        caption: 'One elephant balances four zebras.',
      },
      hint: 'Count the zebras.',
      successMessage: 'Correct.',
    },
  ],
};

test('fallback path converts existing curriculum into a unified lesson path', () => {
  const fallback = buildFallbackLearningPath(subject, strands, 'Grade 7');
  expect(fallback.nodes).toHaveLength(1);
  expect(fallback.nodes[0]).toEqual(
    expect.objectContaining({
      title: 'Linear Equations',
      status: 'current',
      delivery: 'legacy',
      legacySubStrandId: 'sub-1',
    }),
  );
});

test('fallback path exposes one current lesson across multiple strands', () => {
  const baseSubStrand = strands[0].subStrands[0];
  const sequentialStrands: LearningStrand[] = [
    {
      ...strands[0],
      subStrands: [
        { ...baseSubStrand, id: 'topic-1', title: 'Topic 1' },
        { ...baseSubStrand, id: 'topic-2', title: 'Topic 2' },
      ],
    },
    {
      ...strands[0],
      id: 'strand-2',
      title: 'Second strand',
      subStrands: [
        { ...baseSubStrand, id: 'topic-3', title: 'Topic 3' },
        { ...baseSubStrand, id: 'topic-4', title: 'Topic 4' },
      ],
    },
  ];

  const initial = buildFallbackLearningPath(
    subject,
    sequentialStrands,
    'Grade 7',
  );
  expect(initial.nodes.map(node => node.status)).toEqual([
    'current',
    'locked',
    'locked',
    'locked',
  ]);

  sequentialStrands[0].subStrands[0].isCompleted = true;
  const progressed = buildFallbackLearningPath(
    subject,
    sequentialStrands,
    'Grade 7',
  );
  expect(progressed.nodes.map(node => node.status)).toEqual([
    'completed',
    'current',
    'locked',
    'locked',
  ]);
});

test('subject page renders one learning path without the retired feature menu', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectLearningPathScreen
        subject={subject}
        strands={strands}
        grade="Grade 7"
        path={path}
        mascotKey="elephant"
        isLoading={false}
        error={null}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        onOpenNode={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findAllByProps({ children: 'Equality as balance' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findByProps({
      accessibilityLabel:
        'Kitabu learning companion says: Chapter 1, Equality as balance, is ready.',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findAllByProps({ children: 'Brain Tease' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: "Let's Learn" }),
  ).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'Take Quiz' })).toHaveLength(
    0,
  );
  renderer.unmount();
});

test('subject page limits the visible topic cards to one compact screen', async () => {
  const compactPath: SubjectLearningPath = {
    ...path,
    totalCount: 6,
    nodes: Array.from({ length: 6 }, (_, index) => ({
      id: `compact-lesson-${index + 1}`,
      lessonKey: `compact-lesson-${index + 1}`,
      lessonVersion: 1,
      title: `Compact topic ${index + 1}`,
      objective: `Objective ${index + 1}`,
      estimatedMinutes: 7,
      position: index,
      status: index === 0 ? 'current' : 'locked',
      bestScore: null,
      attemptCount: 0,
    })),
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectLearningPathScreen
        subject={subject}
        strands={strands}
        grade="Grade 7"
        path={compactPath}
        mascotKey="elephant"
        isLoading={false}
        error={null}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        onOpenNode={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findAllByProps({ children: 'Compact topic 3' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({ children: 'Compact topic 4' }),
  ).toHaveLength(0);
  renderer.unmount();
});

test('subject page keeps the previous lesson reviewable and only the current lesson active', async () => {
  const reviewPath: SubjectLearningPath = {
    ...path,
    totalCount: 5,
    completedCount: 1,
    nodes: Array.from({ length: 5 }, (_, index) => ({
      id: `review-lesson-${index + 1}`,
      lessonKey: `review-lesson-${index + 1}`,
      lessonVersion: 1,
      title: `Review topic ${index + 1}`,
      objective: `Objective ${index + 1}`,
      estimatedMinutes: 7,
      position: index,
      status: index === 0 ? 'completed' : index === 1 ? 'current' : 'locked',
      bestScore: index === 0 ? 90 : null,
      attemptCount: index === 0 ? 1 : 0,
    })),
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectLearningPathScreen
        subject={subject}
        strands={strands}
        grade="Grade 7"
        path={reviewPath}
        mascotKey="rabbit"
        isLoading={false}
        error={null}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        onOpenNode={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Review Review topic 1' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Start lesson: Review topic 2',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Start lesson: Review topic 3',
    }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: 'Review topic 4' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({ children: 'Review topic 5' }),
  ).toHaveLength(0);
  renderer.unmount();
});

test('progressive lesson checks an answer and reaches completion', async () => {
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson,
  });
  (checkProgressiveLessonStep as jest.Mock).mockResolvedValue({
    isCorrect: true,
    phase: 'checkpoint',
    misconceptionCode: null,
    message: 'Exactly. A balanced scale shows equal values.',
    hint: 'Count the zebras.',
    attemptNumber: 1,
    xpAwarded: 10,
  });
  (completeProgressiveLesson as jest.Mock).mockResolvedValue({
    score: 100,
    passed: true,
    needsPractice: false,
    xpAwarded: 75,
    nextNode: null,
    pathProgressPercent: 17,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 7"
        mascotKey="elephant"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: '4 zebras' })
      .props.onPress();
  });
  await act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Check answer' })
      .props.onPress();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: '4 zebras' }),
  );

  await act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Continue lesson' })
      .props.onPress();
  });
  expect(completeProgressiveLesson).toHaveBeenCalled();
  expect(
    renderer.root.findAllByProps({ children: 'Lesson complete!' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findByProps({ accessibilityLabel: '85 XP earned' }),
  ).toBeTruthy();
  renderer.unmount();
});

test('progressive lesson keeps Check disabled until an active interaction is complete', async () => {
  const interactionLesson: ProgressiveLesson = {
    ...lesson,
    grade: 'Grade 4',
    steps: [
      {
        ...lesson.steps[0],
        id: 'lesson-1-build-step',
        prompt: 'Build the route.',
        options: [],
        interaction: {
          kind: 'sequence_builder',
          instruction: 'Tap the route blocks in order.',
          items: [
            { id: 'route-a', label: 'Finish' },
            { id: 'route-b', label: 'Start' },
            { id: 'route-c', label: 'Middle' },
          ],
        },
      },
    ],
  };
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson: interactionLesson,
  });
  (checkProgressiveLessonStep as jest.Mock).mockResolvedValue({
    isCorrect: true,
    phase: 'checkpoint',
    misconceptionCode: null,
    message: 'Route complete.',
    hint: 'Start at the beginning.',
    attemptNumber: 1,
    xpAwarded: 10,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 4"
        mascotKey="rabbit"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Check answer' }).props.disabled).toBe(true);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Add Start to position 1' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Add Middle to position 2' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Add Finish to position 3' }).props.onPress();
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Check answer' }).props.disabled).toBe(false);
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Check answer' }).props.onPress();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: 'sequence:route-b>route-c>route-a' }),
  );
  renderer.unmount();
});

test('progressive lesson escalates repair clues and keeps the final clue during retry', async () => {
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson,
  });
  (checkProgressiveLessonStep as jest.Mock).mockResolvedValue({
    isCorrect: false,
    phase: 'checkpoint',
    misconceptionCode: 'counting',
    message: 'Not quite. Look closely at both sides.',
    hint: 'Count the zebras one at a time.',
    attemptNumber: 1,
    xpAwarded: 0,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 7"
        mascotKey="rabbit"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: '2 zebras' })
      .props.onPress();
  });
  await act(async () => {
    await renderer.root
      .findByProps({ accessibilityLabel: 'Check answer' })
      .props.onPress();
  });

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show first clue' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Clue 1 of 2: Count the zebras one at a time.',
    }),
  ).toBeTruthy();

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Show another clue' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Clue 2 of 2: One elephant balances four zebras.',
    }),
  ).toBeTruthy();

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Try answer again with clue' })
      .props.onPress();
  });
  expect(
    renderer.root.findByProps({
      accessibilityLabel:
        'Keep this clue in mind: One elephant balances four zebras.',
    }),
  ).toBeTruthy();
  renderer.unmount();
});
