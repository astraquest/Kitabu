import assert from 'node:assert/strict';
import test from 'node:test';

import { readLearningAssetCatalog, resolveLearningAssetRuntimeFile } from './assetCatalog.js';

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
  });
});

test('treats a malformed registry asset list as empty', async () => {
  assert.deepEqual(await readLearningAssetCatalog('{"assets":null}'), {
    assets: [],
    totalReady: 0,
    totalRegistered: 0,
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
