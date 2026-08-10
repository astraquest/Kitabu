import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { transferLocalEducationalAssets } from './transfer.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const candidate = (overrides: Partial<{ storageBackend: 'local' | 'http-put' | 'supabase'; storageKey: string; contentSha256: string; mimeType: string }> = {}) => ({
  id: 'asset-1', storageBackend: 'local' as const, storageKey: 'openclipart/animal.svg', contentSha256: sha256('<svg/>'), mimeType: 'image/svg+xml', ...overrides,
});

test('asset transfer dry-run hash checks local bytes without uploading or changing metadata', async () => {
  let uploads = 0;
  const result = await transferLocalEducationalAssets(
    [candidate()],
    { read: async () => Buffer.from('<svg/>') },
    { put: async () => { uploads += 1; return { storageKey: 'openclipart/animal.svg', byteSize: 6 }; } },
    { dryRun: true },
  );
  assert.deepEqual(result, { scanned: 1, uploaded: 0, alreadyPresent: 0, dryRun: 1, hashMismatch: 0, unavailable: 0, unsafe: 0, failed: 0 });
  assert.equal(uploads, 0);
});

test('asset transfer refuses unsafe or hash-mismatched local rows', async () => {
  const result = await transferLocalEducationalAssets(
    [candidate({ storageKey: '../escape.svg' }), candidate({ storageKey: 'openclipart/mismatch.svg', contentSha256: sha256('different') })],
    { read: async () => Buffer.from('<svg/>') },
    { put: async () => { throw new Error('must not upload'); } },
    { dryRun: false },
  );
  assert.deepEqual(result, { scanned: 2, uploaded: 0, alreadyPresent: 0, dryRun: 0, hashMismatch: 1, unavailable: 0, unsafe: 1, failed: 0 });
});

test('asset transfer safely repeats when Supabase reports an existing object', async () => {
  const result = await transferLocalEducationalAssets(
    [candidate()],
    { read: async () => Buffer.from('<svg/>') },
    { put: async () => ({ storageKey: 'openclipart/animal.svg', byteSize: 6, created: false }) },
    { dryRun: false },
  );
  assert.deepEqual(result, { scanned: 1, uploaded: 0, alreadyPresent: 1, dryRun: 0, hashMismatch: 0, unavailable: 0, unsafe: 0, failed: 0 });
});
