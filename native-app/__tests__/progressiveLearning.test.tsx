import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer } from 'expo-audio';

import { buildFallbackLearningPath } from '../src/features/progressiveLearning/model/buildFallbackLearningPath';
import { getLearningPresentationMode } from '../src/features/progressiveLearning/model/learningPresentationPolicy';
import { StandardAnswerGrid } from '../src/features/progressiveLearning/components/StandardAnswerGrid';
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
    },
  ],
};

test('centralizes the simplified presentation policy for Grades 1 to 3', () => {
  expect(getLearningPresentationMode('Grade 1')).toBe('lower_primary');
  expect(getLearningPresentationMode('Grade 2')).toBe('lower_primary');
  expect(getLearningPresentationMode('Grade 3')).toBe('lower_primary');
  expect(getLearningPresentationMode('Grade 4')).toBe('standard');
});

test('uses one shared standard presentation for every Grade 4 to 12 learner', () => {
  for (let grade = 4; grade <= 12; grade += 1) {
    expect(getLearningPresentationMode(`Grade ${grade}`)).toBe('standard');
  }
});

test('fallback path converts existing curriculum into a unified lesson path', () => {
  const fallback = buildFallbackLearningPath(subject, strands, 'Grade 7');
  expect(fallback.nodes).toHaveLength(1);
  expect(fallback.nodes[0]).toEqual(
    expect.objectContaining({
      title: 'Linear Equations',
      status: 'current',
      delivery: 'progressive',
      lessonKey: 'curriculum-sub-1',
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

  sequentialStrands[0].subStrands[0].isCompleted = false;
  sequentialStrands[0].subStrands[0].needsRemediation = true;
  sequentialStrands[0].subStrands[0].masteryScore = 67;
  const practised = buildFallbackLearningPath(
    subject,
    sequentialStrands,
    'Grade 7',
  );
  expect(practised.nodes.map(node => node.status)).toEqual([
    'needs_practice',
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
  expect(renderer.root.findByProps({ testID: 'subject-page-header' })).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Mathematics subject header' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel:
        'Kitabu learning companion says: Chapter 1, Equality as balance, is ready.',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: '0% complete' }),
  ).toBeTruthy();
  expect(
    renderer.root.findAllByProps({ children: 'Understand equality.' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({
      children: 'Complete the lesson above to unlock',
    }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: 'YOUR LEARNING PATH' }),
  ).toHaveLength(0);
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

test('subject page shows five gated curriculum topics', async () => {
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
    renderer.root.findAllByProps({ children: 'Compact topic 5' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({ children: 'Compact topic 6' }),
  ).toHaveLength(0);
  renderer.unmount();
});

test('subject page keeps only the current lesson active without card subtext', async () => {
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
    renderer.root.findAllByProps({ accessibilityLabel: 'Review Review topic 1' }),
  ).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'Review lesson' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'Objective 2' })).toHaveLength(0);
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
    renderer.root.findAllByProps({ children: 'Review topic 5' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Start lesson: Review topic 5',
    }),
  ).toHaveLength(0);
  renderer.unmount();
});

test('subject progress includes a topic that has been practised', async () => {
  const practisedPath: SubjectLearningPath = {
    ...path,
    completedCount: 0,
    progressPercent: 0,
    nodes: [
      {
        ...path.nodes[0],
        status: 'needs_practice',
        bestScore: 67,
        attemptCount: 1,
      },
      { ...path.nodes[1], status: 'current' },
    ],
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <SubjectLearningPathScreen
        subject={subject}
        strands={strands}
        grade="Grade 7"
        path={practisedPath}
        mascotKey="rabbit"
        isLoading={false}
        error={null}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        onOpenNode={jest.fn()}
      />,
    );
  });

  expect(renderer.root.findByProps({ accessibilityLabel: '50% complete' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: '0% complete' })).toHaveLength(0);
  expect(
    renderer.root.findByProps({
      accessibilityLabel:
        'Kitabu learning companion says: Chapter 2, Forming equations, is ready.',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Practise again: Equality as balance',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Start lesson: Forming equations',
    }),
  ).toBeTruthy();
  renderer.unmount();
});

test('progressive lesson checks an answer and reaches completion', async () => {
  const audioFactory = createAudioPlayer as jest.Mock;
  audioFactory.mockClear();
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
        subjectName="Mathematics"
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
  expect(audioFactory).toHaveBeenCalledTimes(3);
  expect(audioFactory.mock.results[2].value.play).toHaveBeenCalledTimes(1);
  expect(
    renderer.root.findAllByProps({ children: 'Lesson complete!' }).length,
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findByProps({ accessibilityLabel: '85 XP earned' }),
  ).toBeTruthy();
  renderer.unmount();
});

test('standard lessons use answer cards once and omit decorative guidance copy', async () => {
  const cleanLesson: ProgressiveLesson = {
    ...lesson,
    grade: 'Grade 10',
    objective: 'This paragraph repeats the learning objective.',
    steps: [
      {
        ...lesson.steps[0],
        id: 'lesson-1-clean-card-step',
        phase: 'guided',
        prompt: 'Write 0.00072 in standard form.',
        supportText: 'This paragraph repeats the learning objective.',
        options: ['7.2 × 10^-4', '7.2 × 10^4', '0.72 × 10^-3', '72 × 10^-5'],
        visual: {
          kind: 'cards',
          layout: 'grid',
          cards: [
            { id: 'answer-1', label: '7.2 × 10^-4', accent: 'blue' },
            { id: 'answer-2', label: '7.2 × 10^4', accent: 'green' },
            { id: 'answer-3', label: '0.72 × 10^-3', accent: 'gold' },
            { id: 'answer-4', label: '72 × 10^-5', accent: 'coral' },
          ],
          instruction: 'Scan the evidence, then spotlight one answer.',
          caption: 'Only one answer fits every clue.',
        },
      },
    ],
  };
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson: cleanLesson,
  });
  (checkProgressiveLessonStep as jest.Mock).mockResolvedValue({
    isCorrect: true,
    phase: 'guided',
    misconceptionCode: null,
    message: 'Correct.',
    hint: 'Move the decimal point.',
    attemptNumber: 1,
    xpAwarded: 10,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 10"
        mascotKey="elephant"
        subjectName="Mathematics"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  expect(renderer.root.findAllByProps({ children: 'GUIDED CHALLENGE' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'CHECKPOINT' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'EXPLORE THE SCENE' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'What do you notice?' })).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: 'This paragraph repeats the learning objective.' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: 'Scan the evidence, then spotlight one answer.' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ children: 'Only one answer fits every clue.' }),
  ).toHaveLength(0);
  expect(renderer.root.findAllByType(StandardAnswerGrid)).toHaveLength(1);
  for (const option of cleanLesson.steps[0].options) {
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: option }).length,
    ).toBeGreaterThan(0);
  }

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: '7.2 × 10^-4' }).props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Check answer' }).props.onPress();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: '7.2 × 10^-4' }),
  );
  renderer.unmount();
});

test('standard classification questions do not render a second copy of their answers', async () => {
  const options = ['A', 'B', 'C', 'D'];
  const classificationLesson: ProgressiveLesson = {
    ...lesson,
    grade: 'Grade 6',
    steps: [
      {
        ...lesson.steps[0],
        id: 'lesson-1-clean-classification-step',
        options,
        visual: {
          kind: 'classify',
          buckets: [
            { id: 'supported', label: 'Supported' },
            { id: 'rethink', label: 'Rethink' },
          ],
          items: options.map((label, index) => ({
            id: `option-${index + 1}`,
            label,
          })),
          caption: 'Repeated classification scene',
        },
      },
    ],
  };
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson: classificationLesson,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 6"
        mascotKey="lion"
        subjectName="Science"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  expect(renderer.root.findAllByType(StandardAnswerGrid)).toHaveLength(1);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Repeated classification scene' }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});

test('practice completion omits duplicate result copy and provides a top back action', async () => {
  const onComplete = jest.fn();
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
    message: 'Exactly.',
    hint: 'Count carefully.',
    attemptNumber: 1,
    xpAwarded: 0,
  });
  (completeProgressiveLesson as jest.Mock).mockResolvedValue({
    score: 33,
    passed: false,
    needsPractice: true,
    xpAwarded: 0,
    nextNode: null,
    pathProgressPercent: 0,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 7"
        mascotKey="rabbit"
        subjectName="Mathematics"
        onBack={jest.fn()}
        onComplete={onComplete}
      />,
    );
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: '4 zebras' }).props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Check answer' }).props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Continue lesson' }).props.onPress();
  });

  expect(renderer.root.findAllByProps({ children: 'Practice run complete' })).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({
      children: 'Review the hints, then try again to unlock the next lesson.',
    }),
  ).toHaveLength(0);
  const backAction = renderer.root.findByProps({ accessibilityLabel: 'Back to learning path' });
  expect(backAction).toBeTruthy();
  await act(async () => backAction.props.onPress());
  expect(onComplete).toHaveBeenCalledTimes(1);

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
        subjectName="Mathematics"
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

test('lower-primary topics use the simplified auto-graded choice surface', async () => {
  const choiceLesson: ProgressiveLesson = {
    ...lesson,
    grade: 'Grade 1',
    steps: [
      {
        ...lesson.steps[0],
        id: 'lesson-1-choice-step',
        options: [],
        interaction: {
          kind: 'choice_sprint',
          instruction: 'Spotlight the strongest answer.',
          items: [
            { id: 'choice-1', label: 'Count each object once' },
            { id: 'choice-2', label: 'Count the same object twice' },
          ],
        },
        visual: {
          kind: 'cards',
          layout: 'grid',
          cards: [
            { id: 'choice-1', label: 'Count each object once', accent: 'blue' },
            { id: 'choice-2', label: 'Count the same object twice', accent: 'coral' },
          ],
          instruction: 'Scan the evidence, then spotlight one answer.',
          caption: 'Only one idea fits every clue.',
        },
      },
    ],
  };
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson: choiceLesson,
  });
  (checkProgressiveLessonStep as jest.Mock).mockResolvedValue({
    isCorrect: true,
    phase: 'guided',
    misconceptionCode: null,
    message: 'Correct.',
    hint: 'Count carefully.',
    attemptNumber: 1,
    xpAwarded: 10,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 1"
        mascotKey="lion"
        subjectName="Mathematics"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Spotlight choice interaction' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Answer choices' }),
  ).toHaveLength(0);
  expect(renderer.root.findByProps({ testID: 'lower-primary-choice-challenge' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Check answer' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'GUIDED CHALLENGE' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'EXPLORE THE SCENE' })).toHaveLength(0);
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Choose answer Count each object once' })
      .props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: 'choice:choice-1' }),
  );
  renderer.unmount();
});

test('lower-primary arithmetic grades immediately and advances after two seconds', async () => {
  const audioFactory = createAudioPlayer as jest.Mock;
  audioFactory.mockClear();
  const arithmeticLesson: ProgressiveLesson = {
    ...lesson,
    grade: 'Grade 1',
    steps: [
      {
        ...lesson.steps[0],
        id: 'lesson-1-arithmetic-step',
        prompt: 'What is 6 + 3?',
        options: ['8', '9', '10', '7'],
        visual: {
          kind: 'arithmetic',
          leftOperand: 6,
          operator: '+',
          rightOperand: 3,
          caption: 'Work out the number sentence, then choose the answer.',
        },
      },
      {
        ...lesson.steps[0],
        id: 'lesson-1-arithmetic-step-2',
        prompt: 'What is 10 - 4?',
        options: ['5', '8', '6', '7'],
        visual: {
          kind: 'arithmetic',
          leftOperand: 10,
          operator: '-',
          rightOperand: 4,
          caption: 'Work out the number sentence, then choose the answer.',
        },
      },
    ],
  };
  (startProgressiveLesson as jest.Mock).mockResolvedValue({
    attemptId: '22222222-2222-4222-8222-222222222222',
    status: 'in_progress',
    currentStepId: null,
    lesson: arithmeticLesson,
  });
  (checkProgressiveLessonStep as jest.Mock)
    .mockResolvedValueOnce({
      isCorrect: false,
      phase: 'guided',
      misconceptionCode: 'nearby-number',
      message: 'Try another answer.',
      hint: 'Count carefully.',
      attemptNumber: 1,
      xpAwarded: 0,
    })
    .mockResolvedValueOnce({
      isCorrect: true,
      phase: 'guided',
      misconceptionCode: null,
      message: 'Correct.',
      hint: 'Count carefully.',
      attemptNumber: 1,
      xpAwarded: 10,
    });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProgressiveLessonScreen
        lessonKey="lesson-1"
        lessonVersion={1}
        grade="Grade 1"
        mascotKey="elephant"
        subjectName="Mathematics"
        onBack={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
  });

  expect(renderer.root.findByProps({ testID: 'lower-primary-arithmetic-challenge' })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'lower-primary-question-progress' })).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: '2 questions: 0 correct, 0 incorrect',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Question 1: not answered' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Question 2: not answered' }),
  ).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'subject-page-header' })).toBeTruthy();
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Mathematics subject header' }),
  ).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'elephant learning mascot' })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Answer choices' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Check answer' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'GUIDED CHALLENGE' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: '1/2' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ accessibilityRole: 'progressbar' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'Choose your answer!' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: '✦ QUESTION 1 OF 2 ✦' })).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Question progress: 1 of 2' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({
      children: 'Work out the number sentence, then choose the answer.',
    }),
  ).toHaveLength(0);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Choose answer 8' }).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: '8' }),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Question 1: incorrect' }),
  ).toBeTruthy();
  const correctChimePlayer = audioFactory.mock.results[0].value;
  const errorChimePlayer = audioFactory.mock.results[1].value;
  expect(errorChimePlayer.play).toHaveBeenCalledTimes(2);
  expect(correctChimePlayer.play).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Choose answer 9' }).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(checkProgressiveLessonStep).toHaveBeenCalledWith(
    expect.objectContaining({ response: '9' }),
  );
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Question 1: incorrect' }),
  ).toBeTruthy();
  expect(correctChimePlayer.play).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Continue lesson' })).toHaveLength(0);
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Arithmetic challenge: 6 + 3 equals what?',
    }),
  ).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(1_999);
    await Promise.resolve();
  });
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Arithmetic challenge: 6 + 3 equals what?',
    }),
  ).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  });
  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'Arithmetic challenge: 10 - 4 equals what?',
    }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({
      accessibilityLabel: '2 questions: 0 correct, 1 incorrect',
    }),
  ).toBeTruthy();

  await act(async () => renderer.unmount());
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
        subjectName="Mathematics"
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
