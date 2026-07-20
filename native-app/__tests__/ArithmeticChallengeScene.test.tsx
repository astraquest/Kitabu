import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Check, X } from 'lucide-react-native';

import {
  ArithmeticChallengeScene,
  type ArithmeticChallengeState,
} from '../src/features/progressiveLearning/components/scenes/ArithmeticChallengeScene';
import { LEARNING_MASCOT_SOURCES } from '../src/features/progressiveLearning/components/LearningMascotReaction';

const baseState: ArithmeticChallengeState = {
  disabled: false,
  mascotKey: 'elephant',
  onSelect: jest.fn(),
  options: ['9', '8', '10', '7'],
  questionIndex: 0,
  reduceMotion: true,
  selectedAnswer: null,
  status: 'idle',
  totalQuestions: 5,
};

const spec = {
  kind: 'arithmetic' as const,
  leftOperand: 6,
  operator: '+' as const,
  rightOperand: 3,
  caption: 'Use counters or a number line to solve.',
};

test('renders the selected onboarding mascot and emits an answer choice', async () => {
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ArithmeticChallengeScene {...baseState} onSelect={onSelect} spec={spec} />,
    );
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'elephant learning mascot' }).props.source,
  ).toBe(LEARNING_MASCOT_SOURCES.elephant);
  expect(
    baseState.options.map(option =>
      renderer.root.findByProps({ accessibilityLabel: `Choose answer ${option}` }),
    ),
  ).toHaveLength(4);
  expect(renderer.root.findAllByProps({ children: spec.caption })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: 'Choose your answer!' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children: '✦ QUESTION 1 OF 5 ✦' })).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Question progress: 1 of 5' }),
  ).toHaveLength(0);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Choose answer 9' }).props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith('9');

  await act(async () => renderer.unmount());
});

test('shows distinct incorrect and correct answer states', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ArithmeticChallengeScene
        {...baseState}
        selectedAnswer="8"
        spec={spec}
        status="incorrect"
      />,
    );
  });

  expect(renderer.root.findByProps({ children: 'Not quite — try another answer!' })).toBeTruthy();
  expect(renderer.root.findAllByType(X)).toHaveLength(1);

  await act(async () => {
    renderer.update(
      <ArithmeticChallengeScene
        {...baseState}
        disabled
        selectedAnswer="9"
        spec={spec}
        status="correct"
      />,
    );
  });
  expect(
    renderer.root.findByProps({
      children: 'Great work! 6 + 3 = 9. Next question in 2 seconds.',
    }),
  ).toBeTruthy();
  expect(renderer.root.findAllByType(Check)).toHaveLength(1);
  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Mascot gives a thumbs up' }),
  ).toBeTruthy();

  await act(async () => {
    renderer.update(
      <ArithmeticChallengeScene
        {...baseState}
        disabled
        questionIndex={1}
        selectedAnswer="9"
        spec={spec}
        status="correct"
      />,
    );
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Mascot claps' })).toBeTruthy();

  await act(async () => renderer.unmount());
});

test('shows an automatic checking state without asking for another tap', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ArithmeticChallengeScene
        {...baseState}
        disabled
        selectedAnswer="9"
        spec={spec}
        status="checking"
      />,
    );
  });

  expect(renderer.root.findByProps({ children: 'Checking your answer…' })).toBeTruthy();
  await act(async () => renderer.unmount());
});
