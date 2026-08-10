import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenMojiAdapter } from './openMoji.js';

const tree = [
  { type: 'blob', path: 'color/svg/1F600.svg' },
  { type: 'blob', path: 'black/72x72/1F601.png' },
  { type: 'blob', path: 'color/618x618/1F602.png' },
  { type: 'blob', path: 'color/src/1F603.svg' },
  { type: 'blob', path: 'font/OpenMoji-color.ttf' },
  { type: 'blob', path: 'color/svg/nested/1F604.svg' },
];

test('OpenMoji discovers only exported color and black SVG/PNG assets as restricted CC BY-SA', async () => {
  const adapter = new OpenMojiAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const discovered = await adapter.discover({ limit: 10 });
  assert.deepEqual(discovered.assets.map(asset => asset.providerAssetId), ['black/72x72/1F601.png', 'color/618x618/1F602.png', 'color/svg/1F600.svg']);
  assert.equal(discovered.assets[0]?.license, 'CC-BY-SA-4.0');
  assert.match(discovered.assets[0]?.attribution ?? '', /OpenMoji/);
  assert.match(discovered.assets[0]?.licenseEvidenceUrl ?? '', /LICENSE\.txt$/);
  assert.match(discovered.assets[0]?.sourcePageUrl ?? '', /github\.com\/hfg-gmuend\/openmoji\/blob\/master/);
  assert.match(discovered.assets[0]?.rawUrl ?? '', /raw\.githubusercontent\.com\/hfg-gmuend\/openmoji\/master/);
});

test('OpenMoji has stable cursor behavior and fails closed on a truncated tree', async () => {
  const adapter = new OpenMojiAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const first = await adapter.discover({ limit: 1 });
  const second = await adapter.discover({ limit: 1, cursor: first.nextCursor });
  assert.equal(first.assets[0]?.providerAssetId, 'black/72x72/1F601.png');
  assert.equal(second.assets[0]?.providerAssetId, 'color/618x618/1F602.png');
  const truncated = new OpenMojiAdapter(async () => new Response(JSON.stringify({ truncated: true, tree: [] })));
  await assert.rejects(truncated.discover({ limit: 1 }), /truncated/);
});
