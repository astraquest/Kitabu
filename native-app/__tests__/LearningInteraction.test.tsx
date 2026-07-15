import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  LearningInteractionView,
  serializeBucketResponse,
  serializeSequenceResponse,
} from '../src/features/progressiveLearning/components/LearningInteraction';
import type { LearningInteraction } from '../src/features/progressiveLearning/types';

test('sequence builder emits a deterministic response only when complete and supports undo', () => {
  const onResponseChange = jest.fn();
  const interaction: LearningInteraction = {
    kind: 'sequence_builder',
    instruction: 'Build the route.',
    items: [
      { id: 'a', label: 'Finish' },
      { id: 'b', label: 'Start' },
      { id: 'c', label: 'Middle' },
    ],
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <LearningInteractionView
        interaction={interaction}
        onResponseChange={onResponseChange}
        reduceMotion
      />,
    );
  });

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Add Start to position 1' }).props.onPress());
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Add Middle to position 2' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Add Finish to position 3' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(serializeSequenceResponse(['b', 'c', 'a']));

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Undo last move' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Add Finish to position 3' })).toBeTruthy();
  act(() => renderer.unmount());
});

test('bucket sort requires every item, serializes independent of placement order, and resets', () => {
  const onResponseChange = jest.fn();
  const interaction: LearningInteraction = {
    kind: 'bucket_sort',
    instruction: 'Sort the choices.',
    buckets: [
      { id: 'safe', label: 'Safe' },
      { id: 'unsafe', label: 'Unsafe' },
    ],
    items: [
      { id: 'b', label: 'Tell an adult' },
      { id: 'a', label: 'Keep password private' },
      { id: 'c', label: 'Share password' },
    ],
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <LearningInteractionView
        interaction={interaction}
        onResponseChange={onResponseChange}
        reduceMotion
      />,
    );
  });

  const place = (item: string, bucket: string) => {
    act(() => renderer.root.findByProps({ accessibilityLabel: `Select ${item}` }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityLabel: `Place selected item in ${bucket}` }).props.onPress());
  };
  place('Tell an adult', 'Safe');
  place('Share password', 'Unsafe');
  expect(onResponseChange).toHaveBeenLastCalledWith(null);
  place('Keep password private', 'Safe');
  expect(onResponseChange).toHaveBeenLastCalledWith(
    serializeBucketResponse({ safe: ['b', 'a'], unsafe: ['c'] }),
  );

  act(() => renderer.root.findByProps({ accessibilityLabel: 'Reset interaction' }).props.onPress());
  expect(onResponseChange).toHaveBeenLastCalledWith(null);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Select Share password' })).toBeTruthy();
  act(() => renderer.unmount());
});
