import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { QuizMeScreen } from '../src/screens/QuizMeScreen';

test('shows progressive question loading in a single card', async () => {
  jest.useFakeTimers();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizMeScreen
        isLoading
        strandsBySubject={{}}
        subStrandsByStrand={{}}
        onBack={jest.fn()}
        onGenerate={jest.fn()}
      />,
    );
  });

  expect(renderer!.root.findAllByProps({ children: 'Building your practice set' })).toHaveLength(0);
  const progressText = renderer!.root.findAllByProps({ accessibilityLiveRegion: 'polite' })[0];
  expect(progressText.props.children.join('')).toBe('0%');

  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(1050);
  });

  expect(progressText.props.children.join('')).toBe('18%');

  await ReactTestRenderer.act(() => renderer!.unmount());
  jest.useRealTimers();
});
