import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { sha256EducationalAsset } from './deduplication.js';
import { decideEducationalAssetLicense, educationalAssetAttributionRequired } from './licensePolicy.js';
import { isEducationalAssetProductionEligible } from './productionEligibility.js';
import { rankEducationalAssetSearch, normalizeEducationalAssetSearch } from './search.js';
import { assertSafeEducationalAssetSvg } from './svgSafety.js';
import { HttpPutEducationalAssetStorage, LocalEducationalAssetStorage, LocalFilesystemAssetStorage, persistEducationalAssetWithCleanup } from './storage.js';

test('classifies licenses conservatively', () => {
  for (const license of ['CC0', 'public domain', 'MIT', 'CC BY']) assert.equal(decideEducationalAssetLicense(license), 'accepted');
  assert.equal(decideEducationalAssetLicense('CC BY-SA'), 'restricted');
  assert.equal(decideEducationalAssetLicense('CC BY 3.0'), 'accepted');
  assert.equal(decideEducationalAssetLicense('CC BY-SA 3.0'), 'restricted');
  for (const license of ['BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'CC-BY-3.0', 'CC-BY-4.0']) {
    assert.equal(decideEducationalAssetLicense(license), 'accepted');
    assert.equal(educationalAssetAttributionRequired(license), true);
  }
  for (const license of ['CC BY-NC-SA', 'CC BY-ND', 'all rights reserved', 'proprietary', 'CC BY-NC']) {
    assert.equal(decideEducationalAssetLicense(license), 'rejected');
  }
  assert.equal(decideEducationalAssetLicense(undefined), 'needs-review');
  assert.equal(decideEducationalAssetLicense('unverifiable custom licence'), 'needs-review');
});

test('uses exact SHA-256 content identity and gates production serving', () => {
  assert.equal(sha256EducationalAsset(Buffer.from('same')), sha256EducationalAsset(Buffer.from('same')));
  assert.notEqual(sha256EducationalAsset(Buffer.from('same')), sha256EducationalAsset(Buffer.from('different')));
  const eligible = { productionStatus: 'approved' as const, sourceLicense: 'CC0-1.0', sourceUrl: 'https://source.example/item', contentSha256: sha256EducationalAsset(Buffer.from('same')), storageKey: 'assets/a.bin' };
  assert.equal(isEducationalAssetProductionEligible(eligible), true);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'CC BY-SA' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, productionStatus: 'review' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'BSD-3-Clause' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'CC-BY-4.0' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, usageRestriction: 'share_alike' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'BSD-3-Clause', attribution: 'BSD notice' }), true);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'CC-BY-3.0', attribution: 'Creator attribution' }), true);
});

test('rejects structurally hostile SVG content', () => {
  assert.doesNotThrow(() => assertSafeEducationalAssetSvg('<svg viewBox="0 0 1 1"><path d="M0 0" /></svg>'));
  for (const svg of ['<svg><script>alert(1)</script></svg>', '<svg onload="alert(1)"/>', '<svg><use href="https://evil.example/x"/></svg>']) {
    assert.throws(() => assertSafeEducationalAssetSvg(svg), /unsafe/i);
  }
});

test('normalizes and deterministically ranks searches', () => {
  assert.equal(normalizeEducationalAssetSearch('  Máth--Shapes! '), 'math shapes');
  assert.equal(rankEducationalAssetSearch('apple', { title: 'Apple' }), 100);
  assert.equal(rankEducationalAssetSearch('app', { title: 'Apple chart' }), 75);
  assert.equal(rankEducationalAssetSearch('apple', { title: 'Fruit chart', description: 'An apple example' }), 25);
});

test('local storage accepts contained relative keys only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kitabu-assets-'));
  try {
    const storage = new LocalFilesystemAssetStorage(root);
    await storage.put('assets/example.bin', Buffer.from('asset'));
    assert.deepEqual(await storage.read('assets/example.bin'), Buffer.from('asset'));
    await assert.rejects(storage.put('../escape.bin', Buffer.from('no')), /escapes/i);
    await assert.rejects(storage.read('/absolute.bin'), /Invalid/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local cleanup removes only exact contained keys and preserves pre-existing objects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kitabu-educational-cleanup-'));
  try {
    const storage = new LocalEducationalAssetStorage(root);
    const created = await storage.put('assets/new.bin', Buffer.from('new'), 'application/octet-stream');
    assert.equal(created.created, true);
    assert.equal(await storage.remove('assets/new.bin'), true);
    assert.equal(await storage.remove('assets/new.bin'), false);
    await assert.rejects(storage.read('assets/new.bin'));
    await assert.rejects(storage.remove('../escape.bin'), /escapes|Invalid/i);

    await storage.put('assets/existing.bin', Buffer.from('existing'), 'application/octet-stream');
    await assert.rejects(
      persistEducationalAssetWithCleanup(storage, 'assets/existing.bin', Buffer.from('replacement'), 'application/octet-stream', async () => {
        throw new Error('database insert failed');
      }),
      /database insert failed/,
    );
    assert.deepEqual(await storage.read('assets/existing.bin'), Buffer.from('existing'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('database failure cleans up a newly-created local object and preserves the original error', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kitabu-educational-db-failure-'));
  try {
    const storage = new LocalEducationalAssetStorage(root);
    await assert.rejects(
      persistEducationalAssetWithCleanup(storage, 'assets/failed.bin', Buffer.from('asset'), 'application/octet-stream', async () => {
        throw new Error('database insert failed');
      }),
      /database insert failed/,
    );
    await assert.rejects(storage.read('assets/failed.bin'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('educational HTTP-PUT storage preserves MIME type and reads through the public base URL', async () => {
  const requests: Array<{ url: string; method?: string; contentType?: string }> = [];
  const storage = new HttpPutEducationalAssetStorage(
    'https://upload.example/assets/{key}',
    'https://cdn.example/assets',
    async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({ url: String(input), method: init?.method, contentType: headers.get('Content-Type') ?? undefined });
      return init?.method === 'PUT'
        ? new Response(null, { status: 200 })
        : new Response(Buffer.from('remote asset'), { status: 200 });
    },
  );

  assert.deepEqual(await storage.put('health-icons/heart.svg', Buffer.from('<svg/>'), 'image/svg+xml'), {
    storageKey: 'health-icons/heart.svg', byteSize: 6,
  });
  assert.deepEqual(Buffer.from(await storage.read('health-icons/heart.svg')), Buffer.from('remote asset'));
  assert.deepEqual(requests, [
    { url: 'https://upload.example/assets/health-icons%2Fheart.svg', method: 'PUT', contentType: 'image/svg+xml' },
    { url: 'https://cdn.example/assets/health-icons/heart.svg', method: undefined, contentType: undefined },
  ]);
  await assert.rejects(storage.put('../escape.svg', Buffer.from('no'), 'image/svg+xml'), /Invalid asset storage key/);
});

test('local educational storage keeps the existing path containment boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kitabu-educational-storage-'));
  try {
    const storage = new LocalEducationalAssetStorage(root);
    await storage.put('assets/example.svg', Buffer.from('<svg/>'), 'image/svg+xml');
    assert.deepEqual(await storage.read('assets/example.svg'), Buffer.from('<svg/>'));
    assert.equal(storage.publicUrl('assets/example.svg'), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
