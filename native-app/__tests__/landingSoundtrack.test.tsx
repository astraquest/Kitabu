import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer } from 'expo-audio';

import {
  LANDING_SOUNDTRACK_VOLUME,
  useLandingSoundtrack,
} from '../src/services/landingSoundtrack';

function SoundtrackHarness({ enabled = true }: { enabled?: boolean }) {
  useLandingSoundtrack(enabled);
  return null;
}

test('landing soundtrack loops quietly and is removed when the landing screen unmounts', async () => {
  const createPlayer = createAudioPlayer as jest.Mock;
  createPlayer.mockClear();

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<SoundtrackHarness />);
    await Promise.resolve();
  });

  const player = createPlayer.mock.results[0].value;
  expect(player.volume).toBe(LANDING_SOUNDTRACK_VOLUME);
  expect(player.loop).toBe(true);
  expect(player.play).toHaveBeenCalledTimes(1);

  await act(async () => {
    renderer!.unmount();
    await Promise.resolve();
  });

  expect(player.pause).toHaveBeenCalledTimes(1);
  expect(player.remove).toHaveBeenCalledTimes(1);
});
