import assert from 'node:assert/strict';
import test from 'node:test';
import { TablerAdapter } from './tabler.js';

const tree = [
  { type: 'blob', path: 'src/_icons-filled/heart.svg' }, { type: 'blob', path: 'src/_icons/arrow-left.svg' },
  { type: 'blob', path: 'src/_icons/README.md' }, { type: 'blob', path: 'src/_icons-filled/heart.png' },
  { type: 'blob', path: 'packages/icons/other.svg' },
];

test('Tabler discovers only official SVG icon directories with MIT UI metadata', async () => {
  const adapter = new TablerAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const discovered = await adapter.discover({ limit: 10 });
  assert.deepEqual(discovered.assets.map(asset => asset.providerAssetId), ['src/_icons-filled/heart.svg', 'src/_icons/arrow-left.svg']);
  assert.equal(discovered.assets[0]?.license, 'MIT');
  assert.equal(discovered.assets[0]?.classification, 'generic-ui-concept');
  assert.match(discovered.assets[0]?.sourcePageUrl ?? '', /github\.com\/tabler\/tabler-icons\/blob\/main/);
  assert.match(discovered.assets[0]?.rawUrl ?? '', /raw\.githubusercontent\.com\/tabler\/tabler-icons\/main/);
});

test('Tabler has stable cursor and limit behavior', async () => {
  const adapter = new TablerAdapter(async () => new Response(JSON.stringify({ truncated: false, tree })));
  const first = await adapter.discover({ limit: 1 });
  const second = await adapter.discover({ limit: 1, cursor: first.nextCursor });
  assert.equal(first.assets[0]?.providerAssetId, 'src/_icons-filled/heart.svg');
  assert.equal(second.assets[0]?.providerAssetId, 'src/_icons/arrow-left.svg');
});

test('Tabler fails closed on a truncated Git tree', async () => {
  const adapter = new TablerAdapter(async () => new Response(JSON.stringify({ truncated: true, tree: [] })));
  await assert.rejects(adapter.discover({ limit: 1 }), /truncated/);
});
