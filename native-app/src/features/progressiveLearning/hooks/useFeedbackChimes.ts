import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type ChimeKind = 'completion' | 'correct' | 'error';
type Tone = readonly [frequency: number, durationSeconds: number, volume: number];

const SAMPLE_RATE = 8_000;
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array) {
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const combined = first * 65_536 + second * 256 + third;
    encoded += BASE64_ALPHABET[Math.floor(combined / 262_144) % 64];
    encoded += BASE64_ALPHABET[Math.floor(combined / 4_096) % 64];
    encoded += index + 1 < bytes.length
      ? BASE64_ALPHABET[Math.floor(combined / 64) % 64]
      : '=';
    encoded += index + 2 < bytes.length ? BASE64_ALPHABET[combined % 64] : '=';
  }
  return encoded;
}

function createWaveDataUri(tones: readonly Tone[]) {
  const sampleCount = tones.reduce(
    (total, [, duration]) => total + Math.round(SAMPLE_RATE * duration),
    0,
  );
  const bytes = new Uint8Array(44 + sampleCount);
  const view = new DataView(bytes.buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount, true);
  writeText(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeText(36, 'data');
  view.setUint32(40, sampleCount, true);

  let sampleOffset = 44;
  for (const [frequency, duration, volume] of tones) {
    const toneSamples = Math.round(SAMPLE_RATE * duration);
    const attackSamples = Math.max(1, Math.round(SAMPLE_RATE * 0.01));
    const releaseSamples = Math.max(1, Math.round(SAMPLE_RATE * 0.035));
    for (let sample = 0; sample < toneSamples; sample += 1) {
      const attack = Math.min(1, sample / attackSamples);
      const release = Math.min(1, (toneSamples - sample - 1) / releaseSamples);
      const envelope = Math.max(0, Math.min(attack, release));
      const wave = Math.sin((2 * Math.PI * frequency * sample) / SAMPLE_RATE);
      bytes[sampleOffset] = Math.round(128 + wave * envelope * volume * 127);
      sampleOffset += 1;
    }
  }

  return `data:audio/wav;base64,${bytesToBase64(bytes)}`;
}

const CHIME_SOURCES: Record<ChimeKind, string> = {
  completion: createWaveDataUri([
    [392, 0.12, 0.3],
    [523.25, 0.1, 0.34],
    [783.99, 0.3, 0.38],
  ]),
  correct: createWaveDataUri([
    [523.25, 0.07, 0.34],
    [659.25, 0.08, 0.36],
    [783.99, 0.13, 0.32],
  ]),
  error: createWaveDataUri([
    [220, 0.1, 0.28],
    [164.81, 0.16, 0.26],
  ]),
};

export function useFeedbackChimes() {
  const playersRef = useRef<Partial<Record<ChimeKind, AudioPlayer>>>({});
  const primedRef = useRef(false);

  useEffect(() => {
    const correct = createAudioPlayer(CHIME_SOURCES.correct);
    const error = createAudioPlayer(CHIME_SOURCES.error);
    const completion = createAudioPlayer(CHIME_SOURCES.completion);
    correct.volume = 0.62;
    error.volume = 0.5;
    completion.volume = 0.68;
    playersRef.current = { correct, error, completion };

    return () => {
      for (const player of Object.values(playersRef.current)) {
        player.pause();
        player.remove();
      }
      playersRef.current = {};
    };
  }, []);

  const primeFeedbackChimes = useCallback(() => {
    if (primedRef.current) {
      return;
    }
    primedRef.current = true;
    for (const player of Object.values(playersRef.current)) {
      const volume = player.volume;
      player.volume = 0;
      player.play();
      player.pause();
      player.volume = volume;
      player.seekTo(0).catch(() => undefined);
    }
  }, []);

  const playFeedbackChime = useCallback((kind: ChimeKind) => {
    const player = playersRef.current[kind];
    if (!player) {
      return;
    }
    player.pause();
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  }, []);

  return { playFeedbackChime, primeFeedbackChimes };
}
