import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export const LANDING_SOUNDTRACK_LOCAL_ASSET = require('../assets/landing-soundtrack.mp3');
export const LANDING_SOUNDTRACK_REMOTE_URL =
  'https://dkudchritxmpummaeoqk.supabase.co/storage/v1/object/public/tts-audio/app-media/onboarding/kitabu-bg.mp3';

export const LANDING_SOUNDTRACK_VOLUME = 0.08;

function configureLandingSoundtrack(player: AudioPlayer, muted: boolean) {
  player.volume = muted ? 0 : LANDING_SOUNDTRACK_VOLUME;
  player.loop = true;
}

export function createLandingSoundtrack(source: number | string = LANDING_SOUNDTRACK_LOCAL_ASSET) {
  const player = createAudioPlayer(source, { downloadFirst: true });
  configureLandingSoundtrack(player, false);
  return player;
}

export type LandingSoundtrackController = {
  muted: boolean;
  start: () => void;
  stop: () => void;
  toggleMuted: () => void;
};

export function useLandingSoundtrack(): LandingSoundtrackController {
  const playerRef = useRef<AudioPlayer | null>(null);
  const startedRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  const replaceWithRemote = useCallback(() => {
    const player = playerRef.current;
    if (!player || fallbackAttemptedRef.current) return false;

    fallbackAttemptedRef.current = true;
    try {
      player.replace(LANDING_SOUNDTRACK_REMOTE_URL);
      configureLandingSoundtrack(player, mutedRef.current);
      if (startedRef.current) player.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.play();
    } catch {
      replaceWithRemote();
    }
  }, [replaceWithRemote]);

  useEffect(() => {
    let player: AudioPlayer | null = null;
    try {
      player = createLandingSoundtrack();
    } catch {
      fallbackAttemptedRef.current = true;
      try {
        player = createLandingSoundtrack(LANDING_SOUNDTRACK_REMOTE_URL);
      } catch {
        player = null;
      }
    }

    if (!player) return undefined;
    playerRef.current = player;
    const statusSubscription = player.addListener('playbackStatusUpdate', status => {
      if (status.error) replaceWithRemote();
    });

    return () => {
      statusSubscription.remove();
      player.pause();
      player.remove();
      playerRef.current = null;
    };
  }, [replaceWithRemote]);

  const start = useCallback(() => {
    if (startedRef.current || !playerRef.current) return;
    startedRef.current = true;
    play();
  }, [play]);

  const stop = useCallback(() => {
    startedRef.current = false;
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    player.seekTo(0).catch(() => undefined);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted(currentMuted => {
      const nextMuted = !currentMuted;
      mutedRef.current = nextMuted;
      if (playerRef.current) configureLandingSoundtrack(playerRef.current, nextMuted);
      return nextMuted;
    });
  }, []);

  return { muted, start, stop, toggleMuted };
}

export type LandingSoundtrackPlayer = AudioPlayer;
