import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeEducationalAssetNormalization,
  educationalAssetNormalizationStatusForMimeType,
  parseEducationalAssetRasterDimensions,
} from './normalization.js';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 3, 0, 0, 0, 2]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 2, 0, 3, 3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xd9]);
const gif = new Uint8Array([...'GIF89a'].map(char => char.charCodeAt(0)).concat([4, 0, 5, 0]));
const webp = new Uint8Array([...'RIFF'].map(char => char.charCodeAt(0)).concat([22, 0, 0, 0], [...'WEBPVP8X'].map(char => char.charCodeAt(0)), [10, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 6, 0, 0]));

test('parses dimensions from PNG, JPEG, GIF, and WebP bytes without extensions', () => {
  assert.deepEqual(parseEducationalAssetRasterDimensions(png), { width: 3, height: 2, aspectRatio: 1.5 });
  assert.deepEqual(parseEducationalAssetRasterDimensions(jpeg), { width: 3, height: 2, aspectRatio: 1.5 });
  assert.deepEqual(parseEducationalAssetRasterDimensions(gif), { width: 4, height: 5, aspectRatio: 0.8 });
  assert.deepEqual(parseEducationalAssetRasterDimensions(webp), { width: 6, height: 7, aspectRatio: 6 / 7 });
});

test('rejects hostile SVG and gives semantically equivalent safe SVG a stable visual identity', () => {
  assert.throws(() => analyzeEducationalAssetNormalization(new TextEncoder().encode('<svg><script /></svg>'), 'image/svg+xml'), /unsafe/i);
  const left = analyzeEducationalAssetNormalization(new TextEncoder().encode('<svg width="10" height="20"><path fill="red" d="M0 0" /></svg>'), 'image/svg+xml');
  const right = analyzeEducationalAssetNormalization(new TextEncoder().encode('<svg height="20" width="10">\n  <path d="M0 0" fill="red"/>\n</svg>'), 'image/svg+xml');
  assert.equal(left.status, 'validated-original');
  assert.equal(left.visualHash, right.visualHash);
});

test('raster derivatives remain deferred and invalid declared raster bytes are quarantined', () => {
  assert.equal(analyzeEducationalAssetNormalization(png, 'image/png').status, 'needs-normalization');
  assert.equal(educationalAssetNormalizationStatusForMimeType('image/avif'), 'needs-normalization');
  assert.equal(analyzeEducationalAssetNormalization(new Uint8Array([1, 2, 3]), 'image/avif').status, 'quarantined');
});

test('malformed and extreme raster metadata are quarantined while valid dimensions remain accepted', () => {
  const malformedPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(analyzeEducationalAssetNormalization(malformedPng, 'image/png').status, 'quarantined');

  const extremePng = png.slice();
  extremePng.set([0x7f, 0xff, 0xff, 0xff], 16);
  assert.equal(parseEducationalAssetRasterDimensions(extremePng), null);
  assert.equal(analyzeEducationalAssetNormalization(extremePng, 'image/png').status, 'quarantined');
  assert.equal(analyzeEducationalAssetNormalization(png, 'image/png').status, 'needs-normalization');
});
