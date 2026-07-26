import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type AssetManifest,
  type AssetManifestEntry,
  type AssetTrustPolicy,
  validateAssetManifest,
  verifyAssetManifestDigests,
} from '../../src/interactive-learning/assets.ts';

const policy = (overrides: Partial<AssetTrustPolicy['budget']> = {}): AssetTrustPolicy => ({
  allowedSchemes: ['https'],
  allowedOrigins: ['https://cdn.kitabu.ai'],
  allowedMimeTypes: ['image/svg+xml', 'audio/mpeg'],
  budget: {
    maxAssetCount: 3,
    maxTotalBytes: 1_000,
    maxBytesPerAsset: 700,
    maxBytesByKind: { audio: 600 },
    ...overrides,
  },
});

const asset = (overrides: Partial<AssetManifestEntry> = {}): AssetManifestEntry => ({
  id: 'fraction-diagram',
  kind: 'image',
  uri: 'https://cdn.kitabu.ai/grade-6/fraction.svg',
  mimeType: 'image/svg+xml',
  byteSize: 400,
  sha256: 'a'.repeat(64),
  licence: { id: 'CC-BY-4.0', attribution: 'Kitabu' },
  provenance: { source: 'kitabu-authored', reviewedBy: 'curriculum-team' },
  ...overrides,
});

const manifest = (...assets: AssetManifestEntry[]): AssetManifest => ({
  manifestVersion: 1,
  assets: assets.length > 0 ? assets : [asset()],
});

function codes(value: unknown, trustPolicy = policy()): string[] {
  const result = validateAssetManifest(value, trustPolicy);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues.map((entry) => entry.code);
}

test('accepts a fully declared asset from a trusted origin', () => {
  const value = manifest();
  assert.deepEqual(validateAssetManifest(value, policy()), { ok: true, manifest: value });
});

test('rejects unsafe schemes and untrusted network origins', () => {
  assert.ok(codes(manifest(asset({ uri: 'javascript:alert(1)' }))).includes('scheme_not_allowed'));
  assert.ok(codes(manifest(asset({ uri: 'https://untrusted.example/image.svg' }))).includes('origin_not_allowed'));
});

test('rejects MIME, digest, licence, and provenance violations', () => {
  const invalid = asset({
    mimeType: 'text/html',
    sha256: 'ABC123',
    licence: { id: '' },
    provenance: { source: '' },
  });
  const resultCodes = codes(manifest(invalid));
  assert.ok(resultCodes.includes('mime_not_allowed'));
  assert.ok(resultCodes.includes('invalid_sha256'));
  assert.ok(resultCodes.includes('missing_licence'));
  assert.ok(resultCodes.includes('missing_provenance'));
});

test('rejects duplicate asset IDs', () => {
  const resultCodes = codes(manifest(asset(), asset({ uri: 'https://cdn.kitabu.ai/copy.svg' })));
  assert.ok(resultCodes.includes('duplicate_id'));
});

test('enforces per-asset, count, total, and per-kind byte budgets', () => {
  assert.ok(codes(manifest(asset({ byteSize: 701 }))).includes('budget_exceeded'));

  const fourAssets = [0, 1, 2, 3].map((index) => asset({
    id: `asset-${index}`,
    uri: `https://cdn.kitabu.ai/${index}.svg`,
    byteSize: 100,
  }));
  assert.ok(codes(manifest(...fourAssets)).includes('budget_exceeded'));

  const totalResult = codes(manifest(
    asset({ id: 'one', byteSize: 600 }),
    asset({ id: 'two', uri: 'https://cdn.kitabu.ai/two.svg', byteSize: 500 }),
  ));
  assert.ok(totalResult.includes('budget_exceeded'));

  const audioResult = codes(manifest(
    asset({ id: 'audio-one', kind: 'audio', mimeType: 'audio/mpeg', byteSize: 350 }),
    asset({
      id: 'audio-two',
      kind: 'audio',
      uri: 'https://cdn.kitabu.ai/two.mp3',
      mimeType: 'audio/mpeg',
      byteSize: 300,
    }),
  ));
  assert.ok(audioResult.includes('budget_exceeded'));
});

test('uses the host digest hook and reports mismatches and check failures', async () => {
  const value = manifest(
    asset({ id: 'good' }),
    asset({ id: 'mismatch', uri: 'https://cdn.kitabu.ai/mismatch.svg' }),
    asset({ id: 'failed', uri: 'https://cdn.kitabu.ai/failed.svg' }),
  );

  const checked: string[] = [];
  const result = await verifyAssetManifestDigests(value, ({ assetId, expectedSha256 }) => {
    checked.push(`${assetId}:${expectedSha256}`);
    if (assetId === 'failed') throw new Error('reader unavailable');
    return assetId !== 'mismatch';
  });

  assert.deepEqual(checked.map((entry) => entry.split(':')[0]), ['good', 'mismatch', 'failed']);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failures.map(({ assetId, reason }) => ({ assetId, reason })),
    [
      { assetId: 'mismatch', reason: 'digest_mismatch' },
      { assetId: 'failed', reason: 'check_failed' },
    ],
  );
  assert.equal(result.failures[1]?.message, 'reader unavailable');
});
