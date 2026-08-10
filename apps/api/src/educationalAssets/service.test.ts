import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { db, redis } from '../db.js';
import {
  findEducationalAssets,
  createEducationalAssetOfflineManifest,
  getOfflineEducationalAssetReferences,
  readEducationalAssetForAdmin,
  readEducationalAssetForLearner,
  toStaffEducationalAssetReviewDetail,
  toLearnerEducationalAsset,
  validateEducationalAssetReviewDecision,
} from './service.js';
import { rankEducationalAssetSearch } from './search.js';
import type { EducationalAssetRepositoryRecord } from '../repositories.js';

const serverSourcePath = resolve(process.cwd(), 'src/server.ts');

async function serverSection(start: string, end: string): Promise<string> {
  const source = await readFile(serverSourcePath, 'utf8');
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Expected server section starting with ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Expected server section ending with ${end}`);
  return source.slice(startIndex, endIndex);
}

const asset = (overrides: Partial<EducationalAssetRepositoryRecord> = {}): EducationalAssetRepositoryRecord => ({
  id: 'asset-1', title: 'Apple counting card', description: 'Count apples', media_type: 'image', mime_type: 'image/png',
  content_sha256: 'a'.repeat(64), byte_size: 12, storage_backend: 'local', storage_key: 'cards/apple.png',
  production_status: 'approved', usage_restriction: 'none', subject: 'Mathematics', topic: 'Counting', grade_level: 'Grade 1',
  visual_type: 'VOCABULARY_IMAGE', subtopic: null, keywords: ['counting'], synonyms: [], grade_min: 1, grade_max: 2,
  language: 'en', contains_text: false, alt_text: 'Apple counting card', educational_description: null, normalization_status: 'normalized',
  width: null, height: null, aspect_ratio: null, visual_hash: null,
  review_reason: null,
  source_url: 'https://source.example/apple', source_name: 'Example archive', source_license: 'CC-BY-4.0',
  source_license_url: null, original_filename: null, creator: null, creator_url: null, license_version: null, license_evidence: null, provider_key: null, provider_asset_id: null, source_raw_url: null, attribution: 'Example archive', retrieved_at: new Date(), created_at: new Date(), updated_at: new Date(),
  ...overrides,
});

test.after(async () => {
  await redis.quit().catch(() => undefined);
  await db.end().catch(() => undefined);
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
  assert.equal(results[0]?.visualType, 'VOCABULARY_IMAGE');
  assert.equal(results[0]?.altText, 'Apple counting card');
  assert.equal(toLearnerEducationalAsset(asset({ alt_text: null }))?.altText, 'Count apples');
});

test('learner reads require eligibility and use only the local storage key', async () => {
  const reads: string[] = [];
  const repository = { list: async () => [], findById: async () => asset() };
  const result = await readEducationalAssetForLearner('asset-1', { repository, storage: { read: async key => { reads.push(key); return Buffer.from('safe'); } } });
  assert.equal(result?.asset.mimeType, 'image/png');
  assert.deepEqual(reads, ['cards/apple.png']);

  const blocked = await readEducationalAssetForLearner('blocked', { repository: { ...repository, findById: async () => asset({ source_license: 'PROPRIETARY', storage_key: '../nope' }) }, storage: { read: async () => { throw new Error('must not read'); } } });
  assert.equal(blocked, null);
  const restricted = await readEducationalAssetForLearner('restricted', { repository: { ...repository, findById: async () => asset({ usage_restriction: 'share_alike' }) }, storage: { read: async () => { throw new Error('must not read restricted storage'); } } });
  assert.equal(restricted, null);
});

test('staff detail retains provenance and file metadata while admin preview can read unapproved storage', async () => {
  const reviewed = asset({
    id: 'asset-review', production_status: 'review', source_url: 'https://source.example/page', source_raw_url: 'https://source.example/raw.svg',
    source_name: 'PhyloPic', source_license: 'CC-BY-4.0', source_license_url: 'https://creativecommons.org/licenses/by/4.0/',
    original_filename: 'animal.svg', creator: 'Creator', creator_url: 'https://creator.example', license_version: '4.0',
    license_evidence: 'CC BY 4.0', provider_key: 'phylopic', provider_asset_id: 'image-1', attribution: 'Creator attribution',
    storage_key: 'review/asset-review.svg', storage_backend: 'local', mime_type: 'image/svg+xml', byte_size: 8,
    metadata: { phyloPicBuild: 547 }, width: 120, height: 80, aspect_ratio: 1.5, visual_hash: 'b'.repeat(64),
  });
  const detail = toStaffEducationalAssetReviewDetail(reviewed);
  assert.equal(detail.source.sourceRawUrl, 'https://source.example/raw.svg');
  assert.equal(detail.source.creator, 'Creator');
  assert.equal(detail.source.licenseEvidence, 'CC BY 4.0');
  assert.equal(detail.file.previewUrl, '/admin/educational-assets/asset-review/preview');
  assert.equal(detail.file.storageBackend, 'local');
  assert.equal('storageKey' in detail, false);
  assert.equal('storagePath' in detail.file, false);

  const reads: string[] = [];
  const preview = await readEducationalAssetForAdmin('asset-review', {
    repository: { findById: async () => reviewed },
    storage: { read: async key => { reads.push(key); return Buffer.from('<svg/>'); } },
  });
  assert.equal(preview?.asset.productionStatus, 'review');
  assert.deepEqual(preview?.content, Buffer.from('<svg/>'));
  assert.deepEqual(reads, ['review/asset-review.svg']);
});

test('admin preview returns a safe unavailable error when storage cannot read', async () => {
  await assert.rejects(readEducationalAssetForAdmin('asset-review', {
    repository: { findById: async () => asset({ production_status: 'rejected' }) },
    storage: { read: async () => { throw new Error('backend detail'); } },
  }), /preview unavailable/);
});

test('review decisions require a bounded rejection reason and rejected assets leave learner projections', () => {
  assert.equal(validateEducationalAssetReviewDecision('approved', '  cleared  '), 'cleared');
  assert.equal(validateEducationalAssetReviewDecision('review', null), null);
  assert.throws(() => validateEducationalAssetReviewDecision('rejected', null), /require a review reason/);
  assert.throws(() => validateEducationalAssetReviewDecision('rejected', 'x'.repeat(501)), /must not exceed/);
  assert.equal(toLearnerEducationalAsset(asset({ production_status: 'rejected', review_reason: 'Incorrect diagram' })), null);
});

test('offline references return only repository-approved assets without storage or source URLs', async () => {
  const references = await getOfflineEducationalAssetReferences(['asset-2', 'asset-1', 'asset-2'], {
    getOfflineReferences: async () => [{
      id: 'asset-1', mime_type: 'image/png', byte_size: 12, content_sha256: 'a'.repeat(64),
      title: 'Apple counting card', alt_text: 'Apple counting card',
      source_license: 'CC-BY-4.0', provider_key: 'example-archive', source_name: 'Example archive', attribution: 'Example archive',
    }],
  });
  assert.deepEqual(references, [{
    assetId: 'asset-1', assetUrl: '/educational-assets/asset-1/file', mimeType: 'image/png', byteSize: 12,
    sha256: 'a'.repeat(64), title: 'Apple counting card', altText: 'Apple counting card',
    productionStatus: 'approved', licenseId: 'CC-BY-4.0', providerKey: 'example-archive', sourceName: 'Example archive', attribution: 'Example archive',
  }]);
  assert.equal('storageKey' in references[0]!, false);
  assert.equal('sourceUrl' in references[0]!, false);
});

test('offline manifests use stable internal references and omit unsafe or duplicate entries', () => {
  const safe = {
    assetId: 'asset-1', assetUrl: '/educational-assets/asset-1/file', mimeType: 'image/PNG', byteSize: 12,
    sha256: 'A'.repeat(64), title: 'Apple counting card', altText: 'Apple counting card',
    productionStatus: 'approved' as const, licenseId: 'CC-BY-4.0' as const,
    providerKey: 'example-archive', sourceName: 'Example archive', attribution: 'Example archive',
  };
  const manifest = createEducationalAssetOfflineManifest('lesson-assets', [
    safe,
    { ...safe, title: 'duplicate must retain first entry' },
    { ...safe, assetId: 'restricted', licenseId: 'CC-BY-SA-4.0' },
    { ...safe, assetId: 'isolated', usageRestriction: 'share_alike' },
    { ...safe, assetId: 'unapproved', productionStatus: 'review' },
    { ...safe, assetId: 'bad-hash', sha256: 'not-a-digest' },
  ]);

  assert.deepEqual(manifest, {
    manifestVersion: 1,
    assets: [{
      id: 'asset-1', kind: 'image', uri: 'kitabu://educational-assets/asset-1', mimeType: 'image/png', byteSize: 12,
      sha256: 'a'.repeat(64), licence: { id: 'CC-BY-4.0', attribution: 'Example archive' },
      provenance: { source: 'Example archive (example-archive)' },
    }],
  });
  assert.equal('sourceUrl' in manifest.assets[0]!, false);
});

test('search ranks stored synonyms and forwards provider, license, type, and subtopic filters', async () => {
  assert.equal(rankEducationalAssetSearch('cardiac', {
    title: 'Heart', keywords: ['anatomy'], synonyms: ['cardiac'],
  }), 40);
  assert.equal(rankEducationalAssetSearch('cattle', {
    title: 'Cow', keywords: ['farm animal'], synonyms: ['cattle'],
  }), 40);

  let receivedFilters: unknown;
  const repository = {
    list: async (filters: unknown) => {
      receivedFilters = filters;
      return [asset({ id: 'heart', title: 'Heart', subtopic: 'Cardiac anatomy', keywords: ['anatomy'], synonyms: ['cardiac'], provider_key: 'health-icons', source_license: 'MIT', media_type: 'vector' })];
    },
    findById: async () => null,
  };
  const results = await findEducationalAssets({
    query: 'cardiac', subtopic: 'Cardiac anatomy', providerKey: 'health-icons', license: 'MIT', assetType: 'vector',
  }, repository);
  assert.equal(results[0]?.id, 'heart');
  assert.deepEqual(receivedFilters, {
    query: 'cardiac', subtopic: 'Cardiac anatomy', providerKey: 'health-icons', license: 'MIT', assetType: 'vector',
  });
});

test('learner educational asset route wiring bounds supported filters and returns only learner projections', async () => {
  const querySchema = await serverSection(
    'const educationalAssetQuerySchema = z.object({',
    'const educationalAssetAdminQuerySchema = z.object({'
  );
  for (const filter of ['query', 'subject', 'topic', 'subtopic', 'grade', 'assetType', 'visualType', 'providerKey', 'license', 'curriculumUnitId']) {
    assert.match(querySchema, new RegExp(`\\n  ${filter}:`));
  }
  assert.match(querySchema, /query: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)\.optional\(\)/);
  assert.match(querySchema, /providerKey: z\.string\(\)\.trim\(\)\.regex\([^\n]+\)\.optional\(\)/);
  assert.match(querySchema, /curriculumUnitId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(querySchema, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(100\)\.default\(20\)/);

  const learnerListRoute = await serverSection(
    "app.get('/educational-assets', async (request, reply) => {",
    "app.get('/educational-assets/:assetId/file', async (request, reply) => {"
  );
  assert.match(learnerListRoute, /requireAuthenticated\(request, reply\)/);
  assert.match(learnerListRoute, /educationalAssetQuerySchema\.parse\(request\.query\)/);
  assert.match(learnerListRoute, /assets: await findEducationalAssets\(query\)/);

  const repository = {
    list: async () => [asset({ id: 'eligible' }), asset({ id: 'blocked', production_status: 'review' })],
    findById: async () => null,
  };
  const result = await findEducationalAssets({ subject: 'Mathematics', limit: 1 }, repository);
  assert.deepEqual(result.map(item => item.id), ['eligible']);
  assert.equal('sourceUrl' in result[0]!, false);
  assert.equal('storageKey' in result[0]!, false);

  const missing = await readEducationalAssetForLearner('missing', {
    repository: { list: async () => [], findById: async () => null },
    storage: { read: async () => { throw new Error('missing assets must not read storage'); } },
  });
  assert.equal(missing, null);
});

test('educational asset file and admin route wiring preserve access and response contracts', async () => {
  const learnerFileRoute = await serverSection(
    "app.get('/educational-assets/:assetId/file', async (request, reply) => {",
    "app.get('/admin/educational-assets', async (request, reply) => {"
  );
  assert.match(learnerFileRoute, /requireAuthenticated\(request, reply\)/);
  assert.match(learnerFileRoute, /assetId: z\.string\(\)\.uuid\(\)/);
  assert.match(learnerFileRoute, /readEducationalAssetForLearner\(params\.assetId\)/);
  assert.match(learnerFileRoute, /reply\.notFound\('Educational asset not found'\)/);
  assert.match(learnerFileRoute, /\.type\(result\.asset\.mimeType\)/);
  assert.match(learnerFileRoute, /\.header\('Content-Length', String\(result\.content\.byteLength\)\)/);
  assert.match(learnerFileRoute, /\.header\('Cache-Control', 'public, max-age=31536000, immutable'\)/);

  const adminRoutes = await serverSection(
    "app.get('/admin/educational-assets', async (request, reply) => {",
    "app.get('/admin/educational-assets/:assetId/curriculum-links', async (request, reply) => {"
  );
  assert.match(adminRoutes, /app\.get\('\/admin\/educational-assets', async \(request, reply\) => \{\s+const denied = await requireRoles\(request, reply, \['platform_admin'\]\)/);
  assert.match(adminRoutes, /app\.get\('\/admin\/educational-assets\/:assetId\/preview', async \(request, reply\) => \{\s+const denied = await requireRoles\(request, reply, \['platform_admin'\]\)/);
  for (const path of ['review', 'classification']) {
    assert.match(adminRoutes, new RegExp(
      `app\\.patch\\('\\/admin\\/educational-assets\\/:assetId\\/${path}'[\\s\\S]*?requireRoles\\(request, reply, \\['platform_admin'\\], \\{ requireStepUp: true \\}\\)`
    ));
  }
});
