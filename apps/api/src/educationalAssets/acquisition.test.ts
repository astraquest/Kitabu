import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthIconsAdapter } from './healthIcons.js';
import { runEducationalAssetSync } from './runner.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';

const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
  0, 0, 0, 1, 0, 0, 0, 1,
]);
const remote = (overrides: Partial<RemoteAsset> = {}): RemoteAsset => ({ providerKey: 'test-provider', providerAssetId: 'icons/test.png', title: 'Test icon', mediaType: 'image', mimeType: 'image/png', sourcePageUrl: 'https://example.test/page', rawUrl: 'https://example.test/raw', license: 'CC0-1.0', licenseEvidenceUrl: 'https://example.test/license', ...overrides });

test('Health Icons discovers only official icon SVG/PNG files with CC0 metadata', async () => {
  const adapter = new HealthIconsAdapter(async () => new Response(JSON.stringify({ tree: [{ type: 'blob', path: 'public/icons/svg/filled-24px/body/antibody.svg' }, { type: 'blob', path: 'public/icons/png/filled-24px/blood/blood-bag.png' }, { type: 'blob', path: 'public/logo.svg' }, { type: 'blob', path: 'README.md' }, { type: 'blob', path: 'public/icons/test.js' }] })));
  const discovered = await adapter.discover({ limit: 10 });
  assert.deepEqual(discovered.assets.map(asset => asset.providerAssetId), ['public/icons/png/filled-24px/blood/blood-bag.png', 'public/icons/svg/filled-24px/body/antibody.svg']);
  assert.equal(discovered.assets[0]?.license, 'CC0-1.0');
  assert.match(discovered.assets[0]?.sourcePageUrl ?? '', /github\.com\/resolvetosavelives\/healthicons/);
});

test('dry runs discover but perform no persistence writes', async () => {
  let writes = 0;
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote(), remote({ license: 'PROPRIETARY' })], nextCursor: '1' }), download: async () => { throw new Error('dry run must not download'); } };
  const result = await runEducationalAssetSync(adapter, new Proxy({}, { get: () => { writes += 1; throw new Error('write'); } }) as never, { limit: 1, dryRun: true });
  const dryRun = result.dryRun;
  assert.ok(dryRun);
  assert.equal(result.counters.discovered, 2); assert.equal(dryRun.licenseAccepted, 1); assert.equal(dryRun.licenseRejected, 1); assert.equal(dryRun.wouldDownload, 1); assert.equal(dryRun.wouldPublish, 1); assert.equal(writes, 0);
});

test('dry runs do not claim publication for CC-BY assets without attribution', async () => {
  const adapter: EducationalAssetAdapter = {
    providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true },
    discover: async () => ({ assets: [remote({ license: 'CC-BY-4.0', attribution: '  ' }), remote({ providerAssetId: 'attributed.png', license: 'CC-BY-3.0', attribution: 'Creator' })], nextCursor: null }),
    download: async () => { throw new Error('dry run must not download'); },
  };
  const result = await runEducationalAssetSync(adapter, {} as never, { limit: 2, dryRun: true });
  assert.equal(result.dryRun?.wouldDownload, 2);
  assert.equal(result.dryRun?.wouldPublish, 1);
});

test('sync event hook emits bounded metadata-only lifecycle events', async () => {
  const events: unknown[] = [];
  const adapter: EducationalAssetAdapter = {
    providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true },
    discover: async () => ({ assets: [
      remote({ license: 'CC-BY-SA-4.0' }),
      remote({ providerAssetId: 'blocked.png', license: 'PROPRIETARY' }),
      remote({ providerAssetId: 'duplicate.png' }),
      remote({ providerAssetId: 'download-failure.png' }),
      remote({ providerAssetId: 'unsafe.svg', mediaType: 'vector', mimeType: 'image/svg+xml' }),
    ], nextCursor: null }),
    download: async item => {
      if (item.providerAssetId === 'download-failure.png') throw new Error('download failed');
      if (item.providerAssetId === 'unsafe.svg') return new TextEncoder().encode('<svg><script/></svg>');
      return png;
    },
  };
  await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByProviderIdentity: async (_key, assetId) => assetId === 'duplicate.png' ? { assetId: 'existing-asset' } : null,
    findByContentHash: async () => null, findByVisualHash: async () => null, appendProvenance: async () => undefined, save: async () => ({ assetId: 'saved-asset' }),
  }, { limit: 5, dryRun: false, onEvent: event => events.push(event) });
  assert.deepEqual(events.map(event => (event as { type: string }).type), ['sync.started', 'sync.discovered', 'sync.license_restricted', 'sync.license_rejected', 'sync.duplicate', 'sync.download_failed', 'sync.quarantined', 'sync.completed']);
  assert.equal(JSON.stringify(events).includes('rawUrl'), false);
  assert.equal(JSON.stringify(events).includes('storageKey'), false);
});

test('dry runs distinguish restricted from rejected and needs-review without writes', async () => {
  let writes = 0;
  const adapter: EducationalAssetAdapter = {
    providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true },
    discover: async () => ({ assets: [remote({ license: 'CC-BY-SA-4.0' }), remote({ providerAssetId: 'unknown.png', license: 'UNKNOWN' }), remote({ providerAssetId: 'nd.png', license: 'CC-BY-ND-4.0' })], nextCursor: null }),
    download: async () => { throw new Error('dry run must not download'); },
  };
  const result = await runEducationalAssetSync(adapter, new Proxy({}, { get: () => { writes += 1; throw new Error('must not write'); } }) as never, { limit: 3, dryRun: true });
  assert.deepEqual(result.dryRun, { licenseAccepted: 0, licenseRestricted: 1, licenseRejected: 1, licenseNeedsReview: 1, wouldDownload: 1, wouldPublish: 0 });
  assert.equal(result.counters.restricted, 1);
  assert.equal(result.counters.rejected, 2);
  assert.equal(result.manifest.assets[0]?.usageRestriction, 'share_alike');
  assert.equal(writes, 0);
});

test('restricted imports use isolated storage keys and review-only persistence arguments', async () => {
  let persisted: RemoteAsset | null = null;
  let persistedKey = '';
  const adapter: EducationalAssetAdapter = {
    providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: false },
    discover: async () => ({ assets: [remote({ license: 'CC-BY-SA-4.0' })], nextCursor: null }),
    download: async () => png,
  };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByContentHash: async () => null, findByVisualHash: async () => null, findByProviderIdentity: async () => null, appendProvenance: async () => undefined,
    save: async (item, _content, _hash, key) => { persisted = item; persistedKey = key; return { assetId: 'restricted-asset' }; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.counters.restricted, 1);
  assert.equal(result.counters.imported, 1);
  assert.equal((persisted as RemoteAsset | null)?.usageRestriction, 'share_alike');
  assert.match(persistedKey, /^restricted\/test-provider\/[a-f0-9]{64}\.png$/);
  assert.equal(result.manifest.assets[0]?.usageRestriction, 'share_alike');
});

test('restricted exact duplicates append provenance without another storage write', async () => {
  let saves = 0;
  const appended: string[] = [];
  const adapter: EducationalAssetAdapter = {
    providerKey: 'second-provider', displayName: 'Second', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: false },
    discover: async () => ({ assets: [remote({ providerKey: 'second-provider', providerAssetId: 'restricted/icon.png', license: 'CC-BY-SA-4.0' })], nextCursor: null }),
    download: async () => png,
  };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByProviderIdentity: async () => null, findByContentHash: async () => ({ assetId: 'existing-asset' }), findByVisualHash: async () => null,
    appendProvenance: async (assetId) => { appended.push(assetId); }, save: async () => { saves += 1; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.counters.restricted, 1);
  assert.equal(result.counters.duplicates, 1);
  assert.deepEqual(appended, ['existing-asset']);
  assert.equal(result.manifest.assets[0]?.databaseAssetId, 'existing-asset');
  assert.equal(saves, 0);
});

test('runner retries downloads, checkpoints, and skips existing provider identities', async () => {
  let downloads = 0; const checkpoints: unknown[] = [];
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote(), remote({ providerAssetId: 'icons/already.png' })], nextCursor: null }), download: async () => { downloads += 1; if (downloads === 1) throw new Error('temporary'); return png; } };
  const result = await runEducationalAssetSync(adapter, { ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async (_id, checkpoint) => { checkpoints.push(checkpoint); }, finish: async () => undefined, findByContentHash: async () => null, findByVisualHash: async () => null, findByProviderIdentity: async (_key, id) => id === 'icons/already.png' ? { assetId: 'existing-asset' } : null, appendProvenance: async () => undefined, save: async () => undefined }, { limit: 2, dryRun: false, maxRetries: 2 });
  assert.equal(downloads, 2); assert.equal(result.counters.imported, 1); assert.equal(result.counters.duplicates, 1); assert.equal(checkpoints.length, 2);
});

test('runner gates licenses and quarantines hostile SVG without saving it', async () => {
  let saves = 0;
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote({ license: 'PROPRIETARY' }), remote({ providerAssetId: 'icons/bad.svg', mediaType: 'vector', mimeType: 'image/svg+xml' })], nextCursor: null }), download: async asset => new TextEncoder().encode(asset.mimeType === 'image/svg+xml' ? '<svg><script/></svg>' : 'ignored') };
  const result = await runEducationalAssetSync(adapter, { ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined, findByContentHash: async () => null, findByVisualHash: async () => null, findByProviderIdentity: async () => null, appendProvenance: async () => undefined, save: async () => { saves += 1; } }, { limit: 2, dryRun: false });
  assert.equal(result.counters.rejected, 1); assert.equal(result.counters.quarantined, 1); assert.equal(saves, 0);
});

test('runner quarantines extreme raster dimensions without persistence or storage writes', async () => {
  let saves = 0;
  let checkpoints = 0;
  const extremePng = png.slice();
  extremePng.set([0x7f, 0xff, 0xff, 0xff], 16);
  const adapter: EducationalAssetAdapter = {
    providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test',
    capabilities: { supportsResume: true, supportsPng: true, supportsSvg: false },
    discover: async () => ({ assets: [remote()], nextCursor: null }),
    download: async () => extremePng,
  };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }),
    checkpoint: async () => { checkpoints += 1; }, finish: async () => undefined,
    findByContentHash: async () => null, findByVisualHash: async () => null,
    findByProviderIdentity: async () => null, appendProvenance: async () => undefined,
    save: async () => { saves += 1; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.counters.quarantined, 1);
  assert.equal(result.manifest.assets[0]?.outcome, 'quarantined');
  assert.equal(result.manifest.assets[0]?.normalizationStatus, 'quarantined');
  assert.equal(checkpoints, 1);
  assert.equal(saves, 0);
});

test('cross-provider exact content duplicates append provenance without writing storage', async () => {
  let saves = 0;
  const appended: Array<{ assetId: string; providerKey: string }> = [];
  const adapter: EducationalAssetAdapter = { providerKey: 'second-provider', displayName: 'Second', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote({ providerKey: 'second-provider', providerAssetId: 'other/icon.png' })], nextCursor: null }), download: async () => png };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByProviderIdentity: async () => null, findByContentHash: async () => ({ assetId: 'logical-asset' }), findByVisualHash: async () => null,
    appendProvenance: async (assetId, item) => { appended.push({ assetId, providerKey: item.providerKey }); }, save: async () => { saves += 1; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.counters.duplicates, 1);
  assert.equal(result.manifest.assets[0]?.databaseAssetId, 'logical-asset');
  assert.deepEqual(appended, [{ assetId: 'logical-asset', providerKey: 'second-provider' }]);
  assert.equal(saves, 0);
});

test('safe SVG visual duplicates append provenance without writing storage', async () => {
  let saves = 0;
  let appended = 0;
  const svg = new TextEncoder().encode('<svg height="20" width="10"><path d="M0 0" fill="red"/></svg>');
  const adapter: EducationalAssetAdapter = { providerKey: 'second-provider', displayName: 'Second', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: false, supportsSvg: true }, discover: async () => ({ assets: [remote({ providerKey: 'second-provider', providerAssetId: 'other/heart.svg', mediaType: 'vector', mimeType: 'image/svg+xml' })], nextCursor: null }), download: async () => svg };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByProviderIdentity: async () => null, findByContentHash: async () => null, findByVisualHash: async hash => hash ? { assetId: 'visual-asset' } : null,
    appendProvenance: async () => { appended += 1; }, save: async () => { saves += 1; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.counters.duplicates, 1);
  assert.equal(result.manifest.assets[0]?.databaseAssetId, 'visual-asset');
  assert.equal(appended, 1);
  assert.equal(saves, 0);
});

test('same-provider identities are idempotent without download, provenance append, or storage write', async () => {
  let downloads = 0; let appends = 0; let saves = 0;
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote()], nextCursor: null }), download: async () => { downloads += 1; return png; } };
  const result = await runEducationalAssetSync(adapter, {
    ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined,
    findByProviderIdentity: async () => ({ assetId: 'same-provider-asset' }), findByContentHash: async () => null, findByVisualHash: async () => null,
    appendProvenance: async () => { appends += 1; }, save: async () => { saves += 1; },
  }, { limit: 1, dryRun: false });
  assert.equal(result.manifest.assets[0]?.databaseAssetId, 'same-provider-asset');
  assert.equal(downloads, 0); assert.equal(appends, 0); assert.equal(saves, 0);
});
