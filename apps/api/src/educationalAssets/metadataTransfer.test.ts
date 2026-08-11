import assert from 'node:assert/strict';
import test from 'node:test';

import { assertEducationalAssetMetadataBundle, decideMetadataAsset, metadataBundleForAssets, stableJson } from './metadataTransfer.js';

const source = { id: '11111111-1111-4111-8111-111111111111', content_sha256: 'a'.repeat(64), storage_key: 'openclipart/apple.svg' };

test('metadata asset planning is additive and idempotent', () => {
  assert.equal(decideMetadataAsset(source, undefined, undefined).kind, 'insert');
  assert.equal(decideMetadataAsset(source, source, source).kind, 'skip');
  assert.equal(decideMetadataAsset(source, undefined, { ...source, id: '22222222-2222-4222-8222-222222222222' }).kind, 'dedupe');
  assert.equal(decideMetadataAsset(source, { ...source, content_sha256: 'b'.repeat(64) }, undefined).kind, 'conflict');
  assert.equal(decideMetadataAsset(source, { ...source, storage_key: 'openclipart/other.svg' }, undefined).kind, 'conflict');
});

test('metadata bundle selection preserves only the requested asset graph', () => {
  const bundle = {
    format: 'kitabu-educational-assets' as const, version: 1 as const,
    assets: [{ id: source.id, storage_key: source.storage_key }, { id: '22222222-2222-4222-8222-222222222222', storage_key: 'other.svg' }],
    provenance: [{ id: '33333333-3333-4333-8333-333333333333', asset_id: source.id }], providers: [],
    curriculumLinks: [{ asset_id: source.id, unit_id: '44444444-4444-4444-8444-444444444444' }],
    taxonomyLinks: [{ asset_id: source.id, term_code: 'biology' }], files: [{ storageKey: source.storage_key, contentSha256: 'a'.repeat(64), byteSize: 1, mimeType: 'image/svg+xml' }],
  };
  const selected = metadataBundleForAssets(bundle, [source.id]);
  assert.equal(selected.assets.length, 1);
  assert.equal(selected.provenance.length, 1);
  assert.equal(selected.curriculumLinks.length, 1);
  assert.equal(selected.taxonomyLinks.length, 1);
  assert.equal(selected.files.length, 1);
});

test('metadata bundle validation rejects unsafe file keys and stable JSON is order-independent', () => {
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  assert.throws(() => assertEducationalAssetMetadataBundle({ format: 'kitabu-educational-assets', version: 1, assets: [], provenance: [], providers: [], curriculumLinks: [], taxonomyLinks: [], files: [{ storageKey: '../escape.svg', contentSha256: 'a'.repeat(64), byteSize: 1, mimeType: 'image/svg+xml' }] }), /Invalid|escapes/i);
});
