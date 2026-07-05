import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export type QuizSoundEffect = 'correct' | 'wrong' | 'complete';

type ToneSegment = {
  frequency: number;
  durationMs: number;
  volume?: number;
};

const SAMPLE_RATE = 8000;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const effectUriCache: Partial<Record<QuizSoundEffect, string>> = {};

function bytesToBase64(bytes: Uint8Array) {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

    output += BASE64_CHARS[(triplet >> 18) & 63];
    output += BASE64_CHARS[(triplet >> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_CHARS[(triplet >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? BASE64_CHARS[triplet & 63] : '=';
  }

  return output;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function buildWavBase64(segments: ToneSegment[]) {
  const samples = segments.flatMap(segment => {
    const sampleCount = Math.max(1, Math.round((segment.durationMs / 1000) * SAMPLE_RATE));
    const fadeSamples = Math.max(1, Math.round(sampleCount * 0.14));
    return Array.from({ length: sampleCount }, (_, index) => {
      const fadeIn = Math.min(1, index / fadeSamples);
      const fadeOut = Math.min(1, (sampleCount - index) / fadeSamples);
      const envelope = Math.min(fadeIn, fadeOut);
      const wave = Math.sin((2 * Math.PI * segment.frequency * index) / SAMPLE_RATE);
      return Math.round(wave * envelope * (segment.volume ?? 0.45) * 32767);
    });
  });

  const dataSize = samples.length * 2;
  const bytes = new Uint8Array(44 + dataSize);

  writeAscii(bytes, 0, 'RIFF');
  writeUint32(bytes, 4, 36 + dataSize);
  writeAscii(bytes, 8, 'WAVE');
  writeAscii(bytes, 12, 'fmt ');
  writeUint32(bytes, 16, 16);
  writeUint16(bytes, 20, 1);
  writeUint16(bytes, 22, 1);
  writeUint32(bytes, 24, SAMPLE_RATE);
  writeUint32(bytes, 28, SAMPLE_RATE * 2);
  writeUint16(bytes, 32, 2);
  writeUint16(bytes, 34, 16);
  writeAscii(bytes, 36, 'data');
  writeUint32(bytes, 40, dataSize);

  samples.forEach((sample, index) => {
    const value = sample < 0 ? sample + 65536 : sample;
    writeUint16(bytes, 44 + index * 2, value);
  });

  return bytesToBase64(bytes);
}

function getEffectSegments(effect: QuizSoundEffect): ToneSegment[] {
  if (effect === 'correct') {
    return [
      { frequency: 740, durationMs: 82, volume: 0.38 },
      { frequency: 990, durationMs: 118, volume: 0.42 },
    ];
  }

  if (effect === 'wrong') {
    return [
      { frequency: 330, durationMs: 105, volume: 0.34 },
      { frequency: 220, durationMs: 145, volume: 0.34 },
    ];
  }

  return [
    { frequency: 659, durationMs: 90, volume: 0.34 },
    { frequency: 784, durationMs: 95, volume: 0.38 },
    { frequency: 988, durationMs: 120, volume: 0.42 },
    { frequency: 1319, durationMs: 170, volume: 0.36 },
  ];
}

async function getEffectUri(effect: QuizSoundEffect) {
  if (effectUriCache[effect]) {
    return effectUriCache[effect];
  }

  const base64Audio = buildWavBase64(getEffectSegments(effect));

  if (!FileSystem.cacheDirectory) {
    const dataUri = `data:audio/wav;base64,${base64Audio}`;
    effectUriCache[effect] = dataUri;
    return dataUri;
  }

  const uri = `${FileSystem.cacheDirectory}kitabu-${effect}-effect.wav`;
  await FileSystem.writeAsStringAsync(uri, base64Audio, {
    encoding: FileSystem.EncodingType.Base64,
  });
  effectUriCache[effect] = uri;
  return uri;
}

export async function playQuizSoundEffect(effect: QuizSoundEffect) {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });

    const uri = await getEffectUri(effect);
    const player = createAudioPlayer(uri, {
      downloadFirst: false,
      keepAudioSessionActive: true,
      updateInterval: 80,
    });

    player.volume = effect === 'complete' ? 0.72 : 0.58;
    const cleanup = () => {
      try {
        player.pause();
        player.remove();
      } catch {
        // Sound effects should never break quiz flows.
      }
    };

    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish) {
        subscription.remove();
        cleanup();
      }
    });

    player.play();
    setTimeout(cleanup, effect === 'complete' ? 1600 : 900);
  } catch {
    // Haptics remain the fallback if audio is unavailable.
  }
}
