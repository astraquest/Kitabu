import assert from 'node:assert/strict';
import test from 'node:test';

import { readLearningAssetCatalog, resolveLearningAssetPreviewFile, resolveLearningAssetRuntimeFile } from './assetCatalog.js';

test('returns registered 3D assets with their readiness status', async () => {
  const catalog = await readLearningAssetCatalog(JSON.stringify({
    assets: [
      { assetId: 'specimen.ready.001', version: '1.0.0', displayName: 'Ready specimen', kind: 'model-3d', status: 'ready' },
      { assetId: 'specimen.draft.001', version: '1.0.0', displayName: 'Draft specimen', kind: 'model-3d', status: 'draft' },
      { assetId: 'image.ready.001', version: '1.0.0', displayName: 'Ready image', kind: 'image', status: 'ready' },
    ],
  }));

  assert.deepEqual(catalog, {
    assets: [
      { assetId: 'specimen.ready.001', version: '1.0.0', displayName: 'Ready specimen', kind: 'model-3d', status: 'ready' },
      { assetId: 'specimen.draft.001', version: '1.0.0', displayName: 'Draft specimen', kind: 'model-3d', status: 'draft' },
    ],
    totalReady: 1,
    totalRegistered: 3,
    collections: [],
  });
});

test('treats a malformed registry asset list as empty', async () => {
  assert.deepEqual(await readLearningAssetCatalog('{"assets":null}'), {
    assets: [],
    totalReady: 0,
    totalRegistered: 0,
    collections: [],
  });
});

test('returns reusable vector assets with their collection progress', async () => {
  const catalog = await readLearningAssetCatalog(JSON.stringify({
    collections: [{ id: 'kitabu.pp2-vector-pilot', label: 'PP2 Vector Pilot', target: 100 }],
    assets: [{
      assetId: 'kitabu.vector.fruit.apple',
      version: '1.0.0',
      displayName: 'Apple',
      kind: 'vector',
      status: 'ready',
      category: 'fruit',
      collectionId: 'kitabu.pp2-vector-pilot',
      path: 'vector-pilot/v1/fruit/apple.svg',
      uses: ['counting', 'matching'],
    }],
  }));

  assert.deepEqual(catalog, {
    assets: [{
      assetId: 'kitabu.vector.fruit.apple',
      version: '1.0.0',
      displayName: 'Apple',
      kind: 'vector',
      status: 'ready',
      category: 'fruit',
      collectionId: 'kitabu.pp2-vector-pilot',
      uses: ['counting', 'matching'],
    }],
    totalReady: 1,
    totalRegistered: 1,
    collections: [{ id: 'kitabu.pp2-vector-pilot', label: 'PP2 Vector Pilot', target: 100, registered: 1, ready: 1 }],
  });
});

test('resolves only registered files from the trusted procedural runtime', async () => {
  const entrypoint = await resolveLearningAssetRuntimeFile('specimen.african-monarch.001', '1.0.0');
  const script = await resolveLearningAssetRuntimeFile('specimen.african-monarch.001', '1.0.0', 'assets/index-Bz7J_1G7.js');
  assert.equal(entrypoint?.mimeType, 'text/html');
  assert.match(entrypoint?.absolutePath ?? '', /specimen\.african-monarch\.001[\\/]1\.0\.0[\\/]runtime[\\/]index\.html$/);
  assert.equal(script?.mimeType, 'text/javascript');
  await assert.rejects(
    resolveLearningAssetRuntimeFile('specimen.african-monarch.001', '1.0.0', '../asset.json'),
    /escapes its registered package/,
  );
});

test('resolves registered SVG vectors for admin preview', async () => {
  const asset = await resolveLearningAssetPreviewFile('kitabu.vector.fruit.apple', '1.0.0');
  assert.equal(asset?.mimeType, 'image/svg+xml');
  assert.match(asset?.absolutePath ?? '', /vector-pilot[\\/]v1[\\/]fruit[\\/]apple\.svg$/);
  assert.equal(await resolveLearningAssetPreviewFile('specimen.african-monarch.001', '1.0.0'), null);
});
