import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthIconsAdapter } from './healthIcons.js';
import { runEducationalAssetSync } from './runner.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
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

test('runner retries downloads, checkpoints, and skips existing provider identities', async () => {
  let downloads = 0; const checkpoints: unknown[] = [];
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote(), remote({ providerAssetId: 'icons/already.png' })], nextCursor: null }), download: async () => { downloads += 1; if (downloads === 1) throw new Error('temporary'); return png; } };
  const result = await runEducationalAssetSync(adapter, { ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async (_id, checkpoint) => { checkpoints.push(checkpoint); }, finish: async () => undefined, findByContentHash: async () => false, findByProviderIdentity: async (_key, id) => id === 'icons/already.png', save: async () => undefined }, { limit: 2, dryRun: false, maxRetries: 2 });
  assert.equal(downloads, 2); assert.equal(result.counters.imported, 1); assert.equal(result.counters.duplicates, 1); assert.equal(checkpoints.length, 2);
});

test('runner gates licenses and quarantines hostile SVG without saving it', async () => {
  let saves = 0;
  const adapter: EducationalAssetAdapter = { providerKey: 'test-provider', displayName: 'Test', homepageUrl: 'https://example.test', capabilities: { supportsResume: true, supportsPng: true, supportsSvg: true }, discover: async () => ({ assets: [remote({ license: 'PROPRIETARY' }), remote({ providerAssetId: 'icons/bad.svg', mediaType: 'vector', mimeType: 'image/svg+xml' })], nextCursor: null }), download: async asset => new TextEncoder().encode(asset.mimeType === 'image/svg+xml' ? '<svg><script/></svg>' : 'ignored') };
  const result = await runEducationalAssetSync(adapter, { ensureProvider: async () => undefined, createRun: async () => ({ id: 'run-1' }), checkpoint: async () => undefined, finish: async () => undefined, findByContentHash: async () => false, findByProviderIdentity: async () => false, save: async () => { saves += 1; } }, { limit: 2, dryRun: false });
  assert.equal(result.counters.rejected, 1); assert.equal(result.counters.quarantined, 1); assert.equal(saves, 0);
});
