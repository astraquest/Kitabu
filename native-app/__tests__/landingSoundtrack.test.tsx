import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer } from 'expo-audio';

import {
  LANDING_SOUNDTRACK_LOCAL_ASSET,
  LANDING_SOUNDTRACK_REMOTE_URL,
  LANDING_SOUNDTRACK_VOLUME,
  createLandingSoundtrack,
  useLandingSoundtrack,
} from '../src/services/landingSoundtrack';

function SoundtrackHarness({ onReady }: { onReady: (soundtrack: ReturnType<typeof useLandingSoundtrack>) => void }) {
  const soundtrack = useLandingSoundtrack();
  onReady(soundtrack);
  return null;
}

test('landing soundtrack waits for a user gesture, loops quietly, and is removed on unmount', async () => {
  const createPlayer = createAudioPlayer as jest.Mock;
  createPlayer.mockClear();
  let soundtrack: ReturnType<typeof useLandingSoundtrack> | undefined;

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<SoundtrackHarness onReady={value => { soundtrack = value; }} />);
    await Promise.resolve();
  });

  const player = createPlayer.mock.results[0].value;
  expect(createPlayer.mock.calls[0][0]).toBe(LANDING_SOUNDTRACK_LOCAL_ASSET);
  expect(player.volume).toBe(0.08);
  expect(LANDING_SOUNDTRACK_VOLUME).toBe(0.08);
  expect(player.loop).toBe(true);
  expect(player.play).not.toHaveBeenCalled();

  await act(() => {
    soundtrack!.start();
    soundtrack!.start();
  });

  expect(player.play).toHaveBeenCalledTimes(1);

  await act(() => {
    soundtrack!.toggleMuted();
  });

  expect(player.volume).toBe(0);
  await act(() => {
    soundtrack!.toggleMuted();
  });
  expect(player.volume).toBe(LANDING_SOUNDTRACK_VOLUME);

  await act(async () => {
    renderer!.unmount();
    await Promise.resolve();
  });

  expect(player.pause).toHaveBeenCalledTimes(1);
  expect(player.remove).toHaveBeenCalledTimes(1);
});

test('falls back to the public soundtrack once after a local playback error', async () => {
  expect(LANDING_SOUNDTRACK_REMOTE_URL).toBe(
    'https://dkudchritxmpummaeoqk.supabase.co/storage/v1/object/public/tts-audio/app-media/onboarding/kitabu-bg.mp3',
  );
  const createPlayer = createAudioPlayer as jest.Mock;
  const defaultImplementation = createPlayer.getMockImplementation();
  const listeners = new Map<string, (status: { error?: string | null }) => void>();
  const player = {
    addListener: jest.fn((event: string, listener: (status: { error?: string | null }) => void) => {
      listeners.set(event, listener);
      return { remove: jest.fn() };
    }),
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    volume: 1,
    loop: false,
  };
  createPlayer.mockImplementation(() => player);

  let soundtrack: ReturnType<typeof useLandingSoundtrack> | undefined;
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<SoundtrackHarness onReady={value => { soundtrack = value; }} />);
    await Promise.resolve();
  });

  await act(() => soundtrack!.start());
  listeners.get('playbackStatusUpdate')?.({ error: 'local load failed' });
  listeners.get('playbackStatusUpdate')?.({ error: 'remote load failed' });

  expect(player.replace).toHaveBeenCalledTimes(1);
  expect(player.replace).toHaveBeenCalledWith(LANDING_SOUNDTRACK_REMOTE_URL);
  expect(player.play).toHaveBeenCalledTimes(2);
  await act(async () => {
    renderer!.unmount();
    await Promise.resolve();
  });
  createPlayer.mockImplementation(defaultImplementation);
});

test('createLandingSoundtrack configures the bundled source with loop and quiet gain', () => {
  const player = createLandingSoundtrack();
  expect(player.volume).toBe(LANDING_SOUNDTRACK_VOLUME);
  expect(player.loop).toBe(true);
});
