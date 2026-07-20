import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const configuredMediaDirectory = process.env.KITABU_PODCAST_MEDIA_DIR?.trim();

function podcastMediaPath(fileName: string) {
  if (configuredMediaDirectory) {
    return resolve(configuredMediaDirectory, fileName);
  }
  return fileURLToPath(new URL(`../media/podcasts/${fileName}`, import.meta.url));
}

const PODCAST_MEDIA_FILES = {
  'photosynthesis-for-kids.mp4': {
    contentType: 'video/mp4',
    path: podcastMediaPath('photosynthesis-for-kids.mp4')
  },
  'who-killed-tom-mboya.mp3': {
    contentType: 'audio/mpeg',
    path: podcastMediaPath('who-killed-tom-mboya.mp3')
  }
} as const;

export type PodcastMediaFileName = keyof typeof PODCAST_MEDIA_FILES;

export function getPodcastMediaFile(fileName: string) {
  return PODCAST_MEDIA_FILES[fileName as PodcastMediaFileName] ?? null;
}

export function parsePodcastByteRange(rangeHeader: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || size <= 0) {
    return null;
  }

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) {
    return null;
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    return {
      start: Math.max(0, size - suffixLength),
      end: size - 1
    };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(requestedEnd, size - 1)
  };
}
