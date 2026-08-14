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

test('renders a remote API image when the lesson includes one', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<PictureChoiceChallengeScene choices={choices} disabled={false} mascotKey="rabbit" onSelect={jest.fn()} prompt="Name this plant part." reduceMotion selectedAnswer={null} spec={{ ...spec, imageKey: 'image-library/v1/leaf.png', imageUrl: 'https://assets.example.test/leaf.png' }} status="idle" />);
  });
  expect(renderer.root.findByProps({ testID: 'picture-choice-remote-image' })).toBeTruthy();
  await act(async () => renderer.root.findByProps({ testID: 'picture-choice-remote-image' }).props.onError());
  expect(() => renderer.root.findByProps({ testID: 'picture-choice-remote-image' })).toThrow();
  await act(async () => renderer.unmount());
});

test('renders each operand as a compact repeated remote image group', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<PictureChoiceChallengeScene choices={choices} disabled={false} mascotKey="rabbit" onSelect={jest.fn()} prompt="Solve this question" reduceMotion selectedAnswer={null} spec={{ kind: 'picture_group', object: 'book', caption: '3 + 2', equation: '3 + 2', imageKey: 'image-library/v1/book.png', imageUrl: 'https://assets.example.test/book.png', groups: [{ count: 3 }, { count: 2 }] }} status="idle" />);
  });
  expect(renderer.root.findByProps({ testID: 'picture-choice-picture-group' })).toBeTruthy();
  ['0-0', '0-1', '0-2', '1-0', '1-1'].forEach(key => {
    expect(renderer.root.findByProps({ testID: `picture-choice-remote-group-image-${key}` })).toBeTruthy();
  });
  await act(async () => renderer.unmount());
});
