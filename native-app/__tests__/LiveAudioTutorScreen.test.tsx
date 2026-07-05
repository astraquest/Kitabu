import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { audioRecordingBridge } from '../src/services/nativeBridges';
import { LiveAudioTutorScreen } from '../src/screens/LiveAudioTutorScreen';

jest.mock('../src/services/aiService', () => ({
  askVoiceTutor: jest.fn(),
}));

jest.mock('../src/services/liveVoiceStreamService', () => ({
  createLiveVoiceStreamSession: jest.fn(),
  isLiveVoiceStreamingSupported: jest.fn(() => false),
}));

jest.mock('../src/services/nativeBridges', () => ({
  audioRecordingBridge: {
    state: 'expo_native',
    startRecording: jest.fn(() => Promise.resolve(null)),
    stopRecording: jest.fn(() => Promise.resolve(null)),
    transcribeClip: jest.fn(() => Promise.resolve(null)),
    transcribeAnswer: jest.fn(() => Promise.resolve('')),
  },
  speechPlaybackBridge: {
    state: 'expo_native',
    speak: jest.fn(() => Promise.resolve()),
    speakQueued: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  },
}));

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }

  return '';
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return (
    root.findAll(node => textContent(node.props.children) === text).length > 0
  );
}

function hasTextContaining(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  return (
    root.findAll(node => textContent(node.props.children).includes(text))
      .length > 0
  );
}

function pressableWithText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  return root.findAll(
    node =>
      node.props.onPress &&
      node.findAll(
        child =>
          child.type === Text && textContent(child.props.children) === text,
      ).length > 0,
  )[0];
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  (audioRecordingBridge.startRecording as jest.Mock).mockResolvedValue(null);
});

test('shows selected mascot Coming Soon fallback when audio startup fails', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LiveAudioTutorScreen onClose={jest.fn()} mascotKey="elephant" />,
    );
  });

  await ReactTestRenderer.act(async () => {
    pressableWithText(renderer.root, 'Start talking').props.onPress();
    await flushAsyncWork();
  });

  expect(hasText(renderer!.root, 'Coming Soon')).toBe(true);
  expect(hasTextContaining(renderer!.root, 'Could not access')).toBe(false);
  expect(
    renderer!.root.findByProps({
      accessibilityLabel: 'Rafiki the Elephant dancing mascot',
    }),
  ).toBeTruthy();
  expect(
    renderer!.root.findByProps({ testID: 'audio-coming-soon-mascot' }).props
      .style,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        transform: expect.any(Array),
      }),
    ]),
  );

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
    await flushAsyncWork();
  });
});
