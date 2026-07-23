import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { QuizMeScreen } from '../src/screens/QuizMeScreen';

test('shows real generation progress and the selected quiz-writing mascot', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizMeScreen
        isLoading
        mascotKey="lion"
        progress={{ percentage: 75, stage: 'Checking the generated questions' }}
        strandsBySubject={{}}
        subStrandsByStrand={{}}
        onBack={jest.fn()}
        onGenerate={jest.fn()}
      />,
    );
  });

  expect(renderer!.root.findAllByProps({ children: 'Building your practice set' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'lion mascot writing a quiz' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Checking the generated questions' })).toBeTruthy();
  const progressText = renderer!.root.findAllByProps({ accessibilityLiveRegion: 'polite' })[0];
  expect(progressText.props.children.join('')).toBe('75%');

  await ReactTestRenderer.act(() => renderer!.unmount());
});
