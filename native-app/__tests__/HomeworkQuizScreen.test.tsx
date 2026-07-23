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
    transcribeAnswer: jest.fn(),
  },
}));

function nodeText(value: unknown): string {
  if (Array.isArray(value)) return value.map(nodeText).join('');
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

test('homework AI explanation uses the assignment grade in its prompt and context', async () => {
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
        correctAnswer: '3',
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
  await act(async () => {
    await askAi.props.onPress();
  });

  expect(askHomeworkHelper).toHaveBeenCalledTimes(1);
  const [prompt, , mode, , context] = (askHomeworkHelper as jest.Mock).mock.calls[0];
  expect(prompt).toContain('for a Grade 10 student');
  expect(prompt).not.toContain('for a Grade 6 student');
  expect(mode).toBe('explanation');
  expect(context).toEqual({ grade: 'Grade 10', subjectName: 'Mathematics' });

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
