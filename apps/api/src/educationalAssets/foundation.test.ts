import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { sha256EducationalAsset } from './deduplication.js';
import { decideEducationalAssetLicense } from './licensePolicy.js';
import { isEducationalAssetProductionEligible } from './productionEligibility.js';
import { rankEducationalAssetSearch, normalizeEducationalAssetSearch } from './search.js';
import { assertSafeEducationalAssetSvg } from './svgSafety.js';
import { LocalFilesystemAssetStorage } from './storage.js';

test('classifies licenses conservatively', () => {
  for (const license of ['CC0', 'public domain', 'MIT', 'CC BY']) assert.equal(decideEducationalAssetLicense(license), 'accepted');
  assert.equal(decideEducationalAssetLicense('CC BY-SA'), 'restricted');
  assert.equal(decideEducationalAssetLicense('CC BY 3.0'), 'accepted');
  assert.equal(decideEducationalAssetLicense('CC BY-SA 3.0'), 'restricted');
  for (const license of ['CC BY-NC-SA', 'CC BY-ND', 'all rights reserved', 'proprietary', 'CC BY-NC']) {
    assert.equal(decideEducationalAssetLicense(license), 'rejected');
  }
  assert.equal(decideEducationalAssetLicense(undefined), 'needs-review');
  assert.equal(decideEducationalAssetLicense('unverifiable custom licence'), 'needs-review');
});

test('uses exact SHA-256 content identity and gates production serving', () => {
  assert.equal(sha256EducationalAsset(Buffer.from('same')), sha256EducationalAsset(Buffer.from('same')));
  assert.notEqual(sha256EducationalAsset(Buffer.from('same')), sha256EducationalAsset(Buffer.from('different')));
  const eligible = { productionStatus: 'approved' as const, sourceLicense: 'CC BY', sourceUrl: 'https://source.example/item', contentSha256: sha256EducationalAsset(Buffer.from('same')), storageKey: 'assets/a.bin' };
  assert.equal(isEducationalAssetProductionEligible(eligible), true);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, sourceLicense: 'CC BY-SA' }), false);
  assert.equal(isEducationalAssetProductionEligible({ ...eligible, productionStatus: 'review' }), false);
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
