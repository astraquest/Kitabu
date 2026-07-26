import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  type AssetTrustPolicy,
  validateAssetManifest,
} from '../../src/interactive-learning/assets.ts';

const policy: AssetTrustPolicy = {
  allowedSchemes: ['https'],
  allowedOrigins: ['https://cdn.kitabu.ai'],
  allowedMimeTypes: ['image/svg+xml', 'video/mp4'],
  budget: {
    maxAssetCount: 10,
    maxTotalBytes: 10_000_000,
    maxBytesPerAsset: 5_000_000,
    maxBytesByKind: { video: 8_000_000 },
  },
};

function fixture(path: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../fixtures/${path}`, import.meta.url), 'utf8'));
}

test('accepts the empty Grade 6 asset manifest', () => {
  const manifest = fixture('grade-6/whole-numbers.assets.json');
  const result = validateAssetManifest(manifest, policy);

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.manifest, manifest);
});

const invalidFixtures = [
  ['budget-overflow.json', ['budget_exceeded']],
  ['duplicate-ids.json', ['duplicate_id']],
  ['javascript-uri.json', ['scheme_not_allowed']],
  ['malformed-hash-and-mime.json', ['invalid_sha256', 'mime_not_allowed']],
  ['missing-licence-and-provenance.json', ['missing_licence', 'missing_provenance']],
  ['untrusted-origin.json', ['origin_not_allowed']],
] as const;

for (const [name, expectedCodes] of invalidFixtures) {
  test(`rejects invalid asset fixture: ${name}`, () => {
    const result = validateAssetManifest(fixture(`invalid/assets/${name}`), policy);

    assert.equal(result.ok, false);
    if (!result.ok) {
      const codes = [...new Set(result.issues.map((issue) => issue.code))].sort();
      assert.deepEqual(codes, [...expectedCodes].sort());
    }
  });
}
