import { useEffect } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { playAudioPlayerWhenAllowed } from './audioPlayback';

const landingSoundtrackAsset = require('../assets/landing-soundtrack.mp3');

export const LANDING_SOUNDTRACK_VOLUME = 0.12;

export function startLandingSoundtrack() {
  const player = createAudioPlayer(landingSoundtrackAsset, { downloadFirst: true });
  player.volume = LANDING_SOUNDTRACK_VOLUME;
  player.loop = true;
  const cancelPendingPlay = playAudioPlayerWhenAllowed(player);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    cancelPendingPlay();
    player.pause();
    player.remove();
  };
}

export function useLandingSoundtrack(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    return startLandingSoundtrack();
  }, [enabled]);
}

export type LandingSoundtrackPlayer = AudioPlayer;
