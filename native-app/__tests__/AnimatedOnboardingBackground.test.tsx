import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';

import {
  AnimatedOnboardingBackground,
  getLeftCloudCenterTranslation,
  HORIZONTAL_MOTION_DURATION,
  ONBOARDING_MOTION,
} from '../src/components/AnimatedOnboardingBackground';

test('defines independent, subtle motion timing for each decorative group', () => {
  const timings = Object.values(ONBOARDING_MOTION);
  const durations = timings.map((timing) => timing.duration);
  const delays = timings.map((timing) => timing.delay);

  expect(new Set(durations).size).toBeGreaterThan(1);
  expect(new Set(delays).size).toBe(delays.length);
  expect(durations).toEqual(expect.arrayContaining([6000, 6500, 7000, 9000, 10000, 11000]));
  expect(ONBOARDING_MOTION.book.rotation).toBe(5);
  expect(ONBOARDING_MOTION.flowerRight.rotation).toBe(4);
  expect(ONBOARDING_MOTION.book.delay).not.toBe(ONBOARDING_MOTION.flowerRight.delay);
});

test('assigns half-viewport, ten-second horizontal travel to anchored foreground layers', () => {
  const singleDirectionLayers = ['cloudLeft', 'cloudRight', 'flyingStar'] as const;
  const spriteLayers = ['smallStars', 'dots'] as const;
  expect(singleDirectionLayers.map((layer) => ONBOARDING_MOTION[layer].horizontalDirection)).toEqual([1, -1, -1]);
  expect(spriteLayers.map((layer) => ONBOARDING_MOTION[layer].horizontalDirections)).toEqual([
    { left: 1, right: -1 },
    { left: 1, right: -1 },
  ]);
  expect(HORIZONTAL_MOTION_DURATION).toBe(10000);
  expect([...singleDirectionLayers, ...spriteLayers].map((layer) => ONBOARDING_MOTION[layer].horizontalDuration)).toEqual([10000, 10000, 10000, 10000, 10000]);
  expect(getLeftCloudCenterTranslation(390)).toBe(195);
  expect(getLeftCloudCenterTranslation(852)).toBe(426);
  expect(ONBOARDING_MOTION.book).not.toHaveProperty('horizontalDirection');
  expect(ONBOARDING_MOTION.flowerRight).not.toHaveProperty('horizontalDirection');
});

test('keeps the full-screen layers and lower-left book geometry static when reduced motion is enabled', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<AnimatedOnboardingBackground reduceMotion />);
  });

  const sky = renderer.root.findByProps({ testID: 'onboarding-sky-layer' });
  const hills = renderer.root.findByProps({ testID: 'onboarding-hills-layer' });
  const book = renderer.root.findByProps({ testID: 'onboarding-book-layer' });
  const flower = renderer.root.findByProps({ testID: 'onboarding-flower-right-layer' });

  expect(StyleSheet.flatten(sky.props.style)).toEqual(
    expect.objectContaining({ height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' }),
  );
  expect(StyleSheet.flatten(hills.props.style)).toEqual(
    expect.objectContaining({ height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' }),
  );
  const bookStyle = StyleSheet.flatten(book.props.style);
  expect(bookStyle).toEqual(
    expect.objectContaining({ height: '11%', left: 0, top: '63%', width: '28%' }),
  );
  expect(bookStyle).not.toHaveProperty('transform');
  const flowerStyle = StyleSheet.flatten(flower.props.style);
  expect(flowerStyle).toEqual(
    expect.objectContaining({ height: '13.83%', left: '82.16%', top: '70.4%', width: '17.84%' }),
  );
  expect(flowerStyle).not.toHaveProperty('transform');

  for (const testID of [
    'onboarding-cloud-left-layer',
    'onboarding-cloud-right-layer',
    'onboarding-flying-star-layer',
    'onboarding-small-stars-left-layer',
    'onboarding-small-stars-right-layer',
    'onboarding-dots-left-layer',
    'onboarding-dots-right-layer',
  ]) {
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID }).props.style)).not.toHaveProperty('transform');
  }
  for (const testID of ['onboarding-small-stars-left-layer', 'onboarding-small-stars-right-layer', 'onboarding-dots-left-layer', 'onboarding-dots-right-layer']) {
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: `${testID}-clip` }).props.style)).not.toHaveProperty('transform');
  }
});
