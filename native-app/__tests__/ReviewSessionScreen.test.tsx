import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ReviewSessionScreen } from '../src/screens/ReviewSessionScreen';
import { DueReview } from '../src/types/app';

const review: DueReview = {
  id: 'review-1',
  subjectId: 'mathematics',
  subStrandKey: 'number-operations',
  nextReviewDate: '2026-06-18',
  intervalDays: 7,
  masteryScore: 0.86,
};

test('completes a due review as remembered', async () => {
  const onComplete = jest.fn().mockResolvedValue(undefined);
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ReviewSessionScreen
        review={review}
        error={null}
        isSubmitting={false}
        onBack={jest.fn()}
        onComplete={onComplete}
      />,
    );
  });

  const button = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'I remembered it' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => button.props.onPress());

  expect(onComplete).toHaveBeenCalledWith(true);
  expect(renderer!.root.findAllByProps({ children: 'Number Operations' }).length).toBeGreaterThan(0);
});
