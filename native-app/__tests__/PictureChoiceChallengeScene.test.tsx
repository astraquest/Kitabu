import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Check, X } from 'lucide-react-native';

import { PictureChoiceChallengeScene } from '../src/features/progressiveLearning/components/scenes/PictureChoiceChallengeScene';

const choices = ['Flower', 'Leaf', 'Stem', 'Roots'].map(value => ({ label: value, value }));
const spec = { kind: 'picture_choice' as const, object: 'leaf' as const, caption: 'a leaf' };

test('renders a reusable picture-led assessment and emits a choice', async () => {
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PictureChoiceChallengeScene
        choices={choices}
        disabled={false}
        mascotKey="rabbit"
        onSelect={onSelect}
        prompt="Name this plant part."
        reduceMotion
        selectedAnswer={null}
        spec={spec}
        status="idle"
      />,
    );
  });

  expect(renderer.root.findByProps({ testID: 'picture-choice-challenge' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Picture of a leaf' })).toBeTruthy();
  choices.forEach(choice => {
    expect(
      renderer.root.findByProps({ accessibilityLabel: `Choose answer ${choice.label}` }),
    ).toBeTruthy();
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Choose answer Leaf' }).props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith('Leaf');

  await act(async () => renderer.unmount());
});

test('shows automatic correct and incorrect feedback', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PictureChoiceChallengeScene
        choices={choices}
        disabled={false}
        mascotKey="rabbit"
        onSelect={jest.fn()}
        prompt="Name this plant part."
        reduceMotion
        selectedAnswer="Flower"
        spec={spec}
        status="incorrect"
      />,
    );
  });

  expect(renderer.root.findAllByType(X)).toHaveLength(1);
  expect(renderer.root.findByProps({ children: 'Look again and try another answer.' })).toBeTruthy();

  await act(async () => {
    renderer.update(
      <PictureChoiceChallengeScene
        choices={choices}
        disabled
        mascotKey="rabbit"
        onSelect={jest.fn()}
        prompt="Name this plant part."
        reduceMotion
        selectedAnswer="Leaf"
        spec={spec}
        status="correct"
      />,
    );
  });

  expect(renderer.root.findAllByType(Check)).toHaveLength(1);
  expect(renderer.root.findByProps({ children: 'Well done!' })).toBeTruthy();

  await act(async () => renderer.unmount());
});
