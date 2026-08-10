import assert from 'node:assert/strict';
import test from 'node:test';
import { createEducationalAssetImportManifest, educationalAssetManifestStorageKey } from './manifest.js';
import { createEducationalAssetImportReport } from './report.js';
import { runEducationalAssetSync } from './runner.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';

const asset = (overrides: Partial<RemoteAsset> = {}): RemoteAsset => ({ providerKey: 'test-provider', providerAssetId: 'public/icons/test.png', title: 'Test', mediaType: 'image', mimeType: 'image/png', sourcePageUrl: 'https://example.test/page', rawUrl: 'https://example.test/raw', license: 'CC0-1.0', licenseEvidenceUrl: 'https://example.test/license', ...overrides });

test('creates a machine-readable manifest with a contained storage key', () => {
  const manifest = createEducationalAssetImportManifest({ providerKey: 'health-icons', importRunId: 'run-1', revision: 'health-icons-v1', cursor: '3', importedAt: new Date('2026-08-10T00:00:00.000Z'), assets: [{ providerAssetId: 'public/icons/test.png', sourcePath: 'public/icons/test.png', sha256: 'a'.repeat(64), license: 'CC0-1.0', databaseAssetId: 'asset-1', mediaType: 'image', outcome: 'imported', normalizationStatus: 'needs-normalization' }] });
  assert.equal(manifest.importedAt, '2026-08-10T00:00:00.000Z');
  assert.equal(educationalAssetManifestStorageKey('health-icons', 'run-1'), 'manifests/health-icons/run-1.json');
  assert.throws(() => educationalAssetManifestStorageKey('../escape', 'run-1'), /Invalid/);
});

test('reports counters, licenses, providers, and media types deterministically', () => {
  const report = createEducationalAssetImportReport({ discovered: 2, downloaded: 1, imported: 1, duplicates: 0, rejected: 1, quarantined: 0, errors: 0 }, 'health-icons', [
    { providerAssetId: 'a', sourcePath: 'a', sha256: 'a'.repeat(64), license: 'CC0-1.0', databaseAssetId: 'asset-1', mediaType: 'image', outcome: 'imported', normalizationStatus: 'needs-normalization' },
    { providerAssetId: 'b', sourcePath: 'b', sha256: null, license: 'PROPRIETARY', databaseAssetId: null, mediaType: 'vector', outcome: 'rejected', normalizationStatus: 'not-applicable' },
  ]);
  assert.equal(report.acceptedLicenses, 1); assert.equal(report.rejectedLicenses, 1); assert.equal(report.byProvider['health-icons'], 2); assert.equal(report.byLicense['CC0-1.0'], 1); assert.equal(report.byMediaType.image, 1);
});

test('dry runs return manifests and reports without persistence or manifest writes', async () => {
  let writes = 0;
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [asset()], nextCursor: null }), download: async () => { throw new Error('must not download'); } };
  const result = await runEducationalAssetSync(adapter, new Proxy({}, { get: () => { writes += 1; throw new Error('must not persist'); } }) as never, { limit: 1, dryRun: true, writeManifest: async () => { writes += 1; } });
  assert.equal(result.manifest.assets[0]?.normalizationStatus, 'needs-normalization');
  assert.equal(result.report.imported, 0);
  assert.equal(writes, 0);
});
