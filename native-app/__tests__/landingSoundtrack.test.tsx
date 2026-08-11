import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer } from 'expo-audio';

import {
  LANDING_SOUNDTRACK_VOLUME,
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
  expect(player.volume).toBe(LANDING_SOUNDTRACK_VOLUME);
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

  await act(async () => {
    renderer!.unmount();
    await Promise.resolve();
  });

  expect(player.pause).toHaveBeenCalledTimes(1);
  expect(player.remove).toHaveBeenCalledTimes(1);
});
