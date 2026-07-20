import assert from 'node:assert/strict';
import test from 'node:test';

import { getPodcastMediaFile, parsePodcastByteRange } from './podcastMedia.js';

test('resolves only allowlisted podcast media', () => {
  assert.equal(getPodcastMediaFile('photosynthesis-for-kids.mp4')?.contentType, 'video/mp4');
  assert.equal(getPodcastMediaFile('who-killed-tom-mboya.mp3')?.contentType, 'audio/mpeg');
  assert.equal(getPodcastMediaFile('../photosynthesis-for-kids.mp4'), null);
});

test('parses bounded, open-ended, and suffix byte ranges', () => {
  assert.deepEqual(parsePodcastByteRange('bytes=100-199', 1000), { start: 100, end: 199 });
  assert.deepEqual(parsePodcastByteRange('bytes=900-', 1000), { start: 900, end: 999 });
  assert.deepEqual(parsePodcastByteRange('bytes=-100', 1000), { start: 900, end: 999 });
  assert.deepEqual(parsePodcastByteRange('bytes=900-1200', 1000), { start: 900, end: 999 });
});

test('rejects invalid or unsatisfiable byte ranges', () => {
  assert.equal(parsePodcastByteRange('items=0-10', 1000), null);
  assert.equal(parsePodcastByteRange('bytes=1000-', 1000), null);
  assert.equal(parsePodcastByteRange('bytes=200-100', 1000), null);
});
