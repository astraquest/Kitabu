import assert from 'node:assert/strict';
import test from 'node:test';

import { findEducationalAssets, readEducationalAssetForLearner } from './service.js';
import type { EducationalAssetRepositoryRecord } from '../repositories.js';

const asset = (overrides: Partial<EducationalAssetRepositoryRecord> = {}): EducationalAssetRepositoryRecord => ({
  id: 'asset-1', title: 'Apple counting card', description: 'Count apples', media_type: 'image', mime_type: 'image/png',
  content_sha256: 'a'.repeat(64), byte_size: 12, storage_backend: 'local', storage_key: 'cards/apple.png',
  production_status: 'approved', subject: 'Mathematics', topic: 'Counting', grade_level: 'Grade 1',
  source_url: 'https://source.example/apple', source_name: 'Example archive', source_license: 'CC-BY-4.0',
  source_license_url: null, provider_key: null, provider_asset_id: null, source_raw_url: null, attribution: 'Example archive', retrieved_at: new Date(), created_at: new Date(), updated_at: new Date(),
  ...overrides,
});

test('findEducationalAssets ranks exact titles and never projects unsafe records', async () => {
  const repository = {
    list: async () => [asset({ id: 'contains', title: 'Fruit card' }), asset({ id: 'topic', title: 'Counting card', topic: 'Apple' }), asset({ id: 'exact', title: 'Apple' }), asset({ id: 'blocked', source_license: 'CC-BY-SA-4.0' })],
    findById: async () => null,
  };
  const results = await findEducationalAssets({ query: 'apple' }, repository);
  assert.deepEqual(results.map(result => result.id), ['exact', 'topic', 'contains']);
  assert.equal('sourceUrl' in results[0]!, false);
  assert.equal(results[0]?.assetUrl, '/educational-assets/exact/file');
});

test('learner reads require eligibility and use only the local storage key', async () => {
  const reads: string[] = [];
  const repository = { list: async () => [], findById: async () => asset() };
  const result = await readEducationalAssetForLearner('asset-1', { repository, storage: { read: async key => { reads.push(key); return Buffer.from('safe'); } } });
  assert.equal(result?.asset.mimeType, 'image/png');
  assert.deepEqual(reads, ['cards/apple.png']);

  const blocked = await readEducationalAssetForLearner('blocked', { repository: { ...repository, findById: async () => asset({ source_license: 'PROPRIETARY', storage_key: '../nope' }) }, storage: { read: async () => { throw new Error('must not read'); } } });
  assert.equal(blocked, null);
});
