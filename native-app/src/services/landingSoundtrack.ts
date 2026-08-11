import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const landingSoundtrackAsset = require('../assets/landing-soundtrack.mp3');

export const LANDING_SOUNDTRACK_VOLUME = 0.12;

export function createLandingSoundtrack() {
  const player = createAudioPlayer(landingSoundtrackAsset, { downloadFirst: true });
  player.volume = LANDING_SOUNDTRACK_VOLUME;
  player.loop = true;
  return player;
}

export function useLandingSoundtrack() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const startedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const player = createLandingSoundtrack();
    playerRef.current = player;

    return () => {
      player.pause();
      player.remove();
      playerRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (startedRef.current || !playerRef.current) return;
    startedRef.current = true;
    playerRef.current.play();
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted(currentMuted => {
      if (playerRef.current) {
        playerRef.current.volume = currentMuted ? LANDING_SOUNDTRACK_VOLUME : 0;
      }
      return !currentMuted;
    });
  }, []);

  return { muted, start, toggleMuted };
}

export type LandingSoundtrackPlayer = AudioPlayer;
