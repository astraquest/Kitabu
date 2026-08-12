import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Check, X } from 'lucide-react-native';

import { PictureWordChallengeScene } from '../src/features/progressiveLearning/components/scenes/PictureWordChallengeScene';

const spec = {
  kind: 'picture_word' as const,
  object: 'chair' as const,
  wordPattern: 'CH _ IR',
  caption: 'chair',
};

const choices = ['A', 'E', 'I', 'O'].map(value => ({ label: value, value }));

test('renders a picture-first word challenge and emits a letter choice', async () => {
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PictureWordChallengeScene
        choices={choices}
        disabled={false}
        mascotKey="rabbit"
        onSelect={onSelect}
        reduceMotion
        selectedAnswer={null}
        spec={spec}
        status="idle"
      />,
    );
  });

  expect(renderer.root.findByProps({ testID: 'picture-word-challenge' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Picture of chair' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'CH _ IR' })).toBeTruthy();
  choices.forEach(choice => {
    expect(
      renderer.root.findByProps({ accessibilityLabel: `Choose letter ${choice.label}` }),
    ).toBeTruthy();
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Choose letter A' }).props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith('A');

  await act(async () => renderer.unmount());
});

test('shows clear correct and incorrect selection states', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PictureWordChallengeScene
        choices={choices}
        disabled={false}
        mascotKey="rabbit"
        onSelect={jest.fn()}
        reduceMotion
        selectedAnswer="E"
        spec={spec}
        status="incorrect"
      />,
    );
  });

  expect(renderer.root.findByProps({ children: 'Try another letter.' })).toBeTruthy();
  expect(renderer.root.findAllByType(X)).toHaveLength(1);

  await act(async () => {
    renderer.update(
      <PictureWordChallengeScene
        choices={choices}
        disabled
        mascotKey="rabbit"
        onSelect={jest.fn()}
        reduceMotion
        selectedAnswer="A"
        spec={spec}
        status="correct"
      />,
    );
  });

  expect(renderer.root.findByProps({ children: 'Well done!' })).toBeTruthy();
  expect(renderer.root.findAllByType(Check)).toHaveLength(1);

  await act(async () => renderer.unmount());
});

test('renders an API image URL while preserving the illustration fallback contract', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<PictureWordChallengeScene choices={choices} disabled={false} mascotKey="rabbit" onSelect={jest.fn()} reduceMotion selectedAnswer={null} spec={{ ...spec, imageKey: 'image-library/v1/cat.png', imageUrl: 'https://assets.example.test/cat.png' }} status="idle" />);
  });
  expect(renderer.root.findByProps({ testID: 'picture-word-remote-image' })).toBeTruthy();
  await act(async () => renderer.root.findByProps({ testID: 'picture-word-remote-image' }).props.onError());
  expect(() => renderer.root.findByProps({ testID: 'picture-word-remote-image' })).toThrow();
  await act(async () => renderer.unmount());
});

test('localizes picture challenge feedback and controls for Kiswahili', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PictureWordChallengeScene
        choices={choices}
        disabled={false}
        language="sw"
        mascotKey="rabbit"
        onSelect={jest.fn()}
        reduceMotion
        selectedAnswer="E"
        spec={{ ...spec, caption: 'kiti', wordPattern: 'K _ TI' }}
        status="incorrect"
      />,
    );
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Picha ya kiti' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Chagua herufi A' })).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'Jaribu herufi nyingine.' })).toBeTruthy();

  await act(async () => renderer.unmount());
});
