import React from 'react';
import { Image, ScrollView, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LEARNING_MASCOT_SOURCES } from '../src/features/progressiveLearning/components/LearningMascotReaction';
import { DiagnosticScreen, PreviewDiagnosticQuestion } from '../src/screens/DiagnosticScreen';
import { speechPlaybackBridge } from '../src/services/nativeBridges';

jest.mock('../src/services/nativeBridges', () => ({
  speechPlaybackBridge: {
    speak: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  },
}));

const questions: PreviewDiagnosticQuestion[] = [
  {
    id: 'diagnostic-layout-question',
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    subStrandKey: 'fractions',
    prompt: 'What is 1/2 + 1/4?',
    options: ['1/6', '2/6', '3/4', '1/8'],
    correctAnswer: '3/4',
    difficulty: 2,
    timeLimitSeconds: 90,
  },
];

function renderedText(root: ReactTestRenderer.ReactTestInstance) {
  return root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Number.POSITIVE_INFINITY)
    .filter(value => value !== null && value !== undefined && value !== false)
    .join(' ');
}

test('diagnostic uses selected mascot, real logo, and a compact no-scroll question layout', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <DiagnosticScreen
        mascotKey="elephant"
        previewQuestions={questions}
        onComplete={jest.fn()}
      />,
    );
    await Promise.resolve();
  });

  const text = renderedText(renderer!.root);
  expect(text).toContain('Find your starting point');
  expect(text).not.toContain('Thinking with you');
  expect(text).not.toContain('Mathematics + English');

  const title = renderer!.root.findAllByType(Text).find(node => node.props.children === 'Find your starting point');
  expect(title?.props.numberOfLines).toBe(1);
  expect(title?.props.adjustsFontSizeToFit).toBe(true);

  const logo = renderer!.root.findByProps({ accessibilityLabel: 'Kitabu AI logo' });
  expect(logo.type).toBe(Image);

  const mascot = renderer!.root.findByProps({ accessibilityLabel: 'elephant learning mascot' });
  expect(mascot.props.source).toBe(LEARNING_MASCOT_SOURCES.elephant);

  const scrollView = renderer!.root.findByType(ScrollView);
  expect(scrollView.props.scrollEnabled).toBe(false);
  const answerLabels = new Set(
    renderer!.root
      .findAll(node => String(node.props.accessibilityLabel ?? '').startsWith('Answer '))
      .map(node => node.props.accessibilityLabel),
  );
  expect(answerLabels).toEqual(new Set(['Answer 1/6', 'Answer 2/6', 'Answer 3/4', 'Answer 1/8']));
});

test('diagnostic narration speaks the question without answer options', async () => {
  (speechPlaybackBridge.speak as jest.Mock).mockClear();

  await act(async () => {
    ReactTestRenderer.create(
      <DiagnosticScreen
        voiceName="Samora"
        previewQuestions={questions}
        onComplete={jest.fn()}
      />,
    );
    await Promise.resolve();
  });

  expect(speechPlaybackBridge.speak).toHaveBeenCalledWith(
    'What is 1/2 + 1/4?',
    { voiceName: 'Samora' },
  );
  expect((speechPlaybackBridge.speak as jest.Mock).mock.calls.flat().join(' ')).not.toContain('3/4');
});
