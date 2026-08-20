import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingVisualShell } from '../src/components/OnboardingVisualShell';

test('positions onboarding artwork directly on the shell with bounded book geometry', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <OnboardingVisualShell reduceMotion>
        <Text>Content</Text>
      </OnboardingVisualShell>,
    );
  });

  const hills = renderer.root.findByProps({ testID: 'onboarding-hills-layer' });
  const book = renderer.root.findByProps({ testID: 'onboarding-book-layer' });
  const hillsStyle = StyleSheet.flatten(hills.props.style);
  const bookStyle = StyleSheet.flatten(book.props.style);

  const layerViews = renderer.root
    .findAllByType(View)
    .filter((view) => typeof view.props.testID === 'string' && view.props.testID.endsWith('-layer'));
  expect(layerViews).toHaveLength(0);
  expect(hillsStyle).toEqual(
    expect.objectContaining({
      bottom: 0,
      height: '100%',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      width: '100%',
    }),
  );
  expect(bookStyle).toEqual(
    expect.objectContaining({
      height: '11%',
      left: 0,
      position: 'absolute',
      top: '63%',
      width: '28%',
    }),
  );
});
