import assert from 'node:assert/strict';
import test from 'node:test';

import { IMAGE_LIBRARY_CACHE_CONTROL, imageLibraryPublicUrl, imageLibraryRenderUrl, imageLibraryStorageKey, inventoryImageLibraryEntry, normalizeImageLibrarySlug } from './imageLibrary.js';

function png(width: number, height: number) {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

test('normalizes immutable image-library keys and inventories PNG metadata deterministically', () => {
  const content = png(320, 180);
  const entry = inventoryImageLibraryEntry('Animal Cell.png', content);
  assert.equal(normalizeImageLibrarySlug('Animal Cell.png'), 'animal-cell');
  assert.equal(imageLibraryStorageKey('Animal Cell.png'), 'image-library/v1/animal-cell.png');
  assert.equal(entry.width, 320);
  assert.equal(entry.height, 180);
  assert.equal(entry.mimeType, 'image/png');
  assert.equal(entry.reviewStatus, 'review');
  assert.equal(entry.sha256, inventoryImageLibraryEntry('Animal Cell.png', content).sha256);
  assert.equal(imageLibraryPublicUrl('https://assets.example.test/public/', entry.storageKey), 'https://assets.example.test/public/image-library/v1/animal-cell.png');
  assert.equal(imageLibraryRenderUrl('https://assets.example.test', 'question-images', entry.storageKey), 'https://assets.example.test/storage/v1/render/image/public/question-images/image-library/v1/animal-cell.png?width=1024&quality=90');
  assert.match(IMAGE_LIBRARY_CACHE_CONTROL, /immutable/);
});
