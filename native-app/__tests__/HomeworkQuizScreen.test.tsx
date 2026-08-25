import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { HomeworkQuizScreen } from '../src/screens/HomeworkQuizScreen';
import { askHomeworkHelper } from '../src/services/aiService';
import { audioRecordingBridge } from '../src/services/nativeBridges';
import type { Assignment } from '../src/types/app';

jest.mock('../src/services/aiService', () => ({
  askHomeworkHelper: jest.fn(),
}));

jest.mock('../src/services/nativeBridges', () => ({
  audioRecordingBridge: {
    state: 'simulated',
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    transcribeClip: jest.fn(),
    transcribeAnswer: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function nodeText(value: unknown): string {
  if (Array.isArray(value)) return value.map(nodeText).join('');
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

test('homework AI explanation waits for authoritative post-submit grading', async () => {
  (askHomeworkHelper as jest.Mock).mockResolvedValue('A short explanation.');
  const assignment: Assignment = {
    id: 'assignment-grade-10',
    title: 'Algebra review',
    subject: 'Mathematics',
    description: 'Review equations',
    gradeLevel: 'Grade 10',
    dueDate: '2026-07-22T12:00:00.000Z',
    status: 'completed',
    score: 1,
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'What is x if x + 2 = 5?',
        options: ['1', '2', '3', '4'],
        userAnswer: '3',
        explanation: 'Subtract 2 from both sides.',
      },
    ],
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkQuizScreen assignment={assignment} onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
  });

  const askAi = renderer!.root.findAll(
    node =>
      node.props.onPress &&
      node.findAll(child => nodeText(child.props.children) === 'Ask AI').length > 0,
  )[0];
  expect(askAi).toBeUndefined();
  expect(askHomeworkHelper).not.toHaveBeenCalled();

  act(() => renderer!.unmount());
});

test('enters the recording state after Android starts recording without an initial URI', async () => {
  (audioRecordingBridge.startRecording as jest.Mock).mockResolvedValue(true);
  const assignment: Assignment = {
    id: 'voice-assignment',
    title: 'Fractions voice answer',
    subject: 'Mathematics',
    description: 'Explain your reasoning',
    gradeLevel: 'Grade 6',
    dueDate: '2026-07-22T12:00:00.000Z',
    status: 'pending',
    score: 0,
    questions: [
      {
        id: 1,
        type: 'SHORT_ANSWER',
        text: 'Explain one way to compare 5/8 and 0.7.',
        correctAnswer: 'Convert both to decimals.',
      },
    ],
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkQuizScreen assignment={assignment} onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
  });

  await act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: 'Start recording answer' }).props.onPress();
    await Promise.resolve();
  });

  expect(audioRecordingBridge.startRecording).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByProps({ children: 'Listening...' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Stop recording answer' })).toBeTruthy();

  act(() => renderer!.unmount());
});

function buildVoiceAssignment(questionCount = 1): Assignment {
  return {
    id: 'voice-assignment',
    title: 'Fractions voice answer',
    subject: 'Mathematics',
    description: 'Explain your reasoning',
    gradeLevel: 'Grade 6',
    dueDate: '2026-07-22T12:00:00.000Z',
    status: 'pending',
    score: 0,
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: index + 1,
      type: 'SHORT_ANSWER' as const,
      text: `Explain question ${index + 1}.`,
      correctAnswer: 'A complete explanation.',
    })),
  };
}

test('shows Skip question when recording fails without a recording status', async () => {
  (audioRecordingBridge.startRecording as jest.Mock).mockRejectedValue(
    new Error('Recorder did not enter the recording state'),
  );
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkQuizScreen assignment={buildVoiceAssignment()} onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
  });

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Start recording answer' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ children: 'Recording could not start. Please try again.' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Skip question' })).toBeTruthy();

  act(() => renderer!.unmount());
});

test('skip advances without adding an answer', async () => {
  (audioRecordingBridge.startRecording as jest.Mock).mockResolvedValue(false);
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkQuizScreen assignment={buildVoiceAssignment(2)} onClose={jest.fn()} onSubmit={onSubmit} />,
    );
  });

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Start recording answer' }).props.onPress();
  });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Skip question' }).props.onPress());

  expect(renderer!.root.findAll(node => nodeText(node.props.children) === '2/2')).not.toHaveLength(0);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(audioRecordingBridge.transcribeClip).not.toHaveBeenCalled();

  act(() => renderer!.unmount());
});

test('final skip submits unanswered with no credit', async () => {
  (audioRecordingBridge.startRecording as jest.Mock).mockRejectedValue(new Error('no status'));
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <HomeworkQuizScreen assignment={buildVoiceAssignment()} onClose={jest.fn()} onSubmit={onSubmit} />,
    );
  });

  await act(async () => {
    await renderer!.root.findByProps({ accessibilityLabel: 'Start recording answer' }).props.onPress();
  });
  act(() => renderer!.root.findByProps({ accessibilityLabel: 'Skip question' }).props.onPress());

  expect(onSubmit).toHaveBeenCalledWith(0, {});
  expect(renderer!.root.findByProps({ children: 'Quiz submitted' })).toBeTruthy();

  act(() => renderer!.unmount());
});
