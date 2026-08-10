import assert from 'node:assert/strict';
import test from 'node:test';
import { GameIconsAdapter } from './gameIcons.js';

const tree = [
  { type: 'blob', path: 'delapouite/axe.svg' },
  { type: 'blob', path: 'lorc/abacus.svg' },
  { type: 'blob', path: 'license.txt' },
  { type: 'blob', path: 'delapouite/nested/ignored.svg' },
  { type: 'blob', path: '_out/delapouite/ignored.svg' },
];

test('Game Icons discovers direct contributor SVGs with CC BY 3.0 attribution', async () => {
  const adapter = new GameIconsAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const discovered = await adapter.discover({ limit: 10 });
  assert.deepEqual(discovered.assets.map(asset => asset.providerAssetId), ['delapouite/axe.svg', 'lorc/abacus.svg']);
  assert.equal(discovered.assets[0]?.license, 'CC-BY-3.0');
  assert.equal(discovered.assets[0]?.attribution, 'Icons made by delapouite');
  assert.equal(discovered.assets[0]?.creator, 'delapouite');
  assert.equal(discovered.assets[0]?.visualType, 'ICON');
  assert.equal(discovered.assets[0]?.subject, 'GENERAL');
  assert.match(discovered.assets[0]?.licenseEvidenceUrl ?? '', /game-icons\/icons\/blob\/master\/license\.txt/);
});

test('Game Icons has stable cursor behavior and fails closed on a truncated tree', async () => {
  const adapter = new GameIconsAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const first = await adapter.discover({ limit: 1 });
  const second = await adapter.discover({ limit: 1, cursor: first.nextCursor });
  assert.equal(first.assets[0]?.providerAssetId, 'delapouite/axe.svg');
  assert.equal(second.assets[0]?.providerAssetId, 'lorc/abacus.svg');
  const truncated = new GameIconsAdapter(async () => new Response(JSON.stringify({ truncated: true, tree: [] })));
  await assert.rejects(truncated.discover({ limit: 1 }), /truncated/);
});
