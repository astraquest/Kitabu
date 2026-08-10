import assert from 'node:assert/strict';
import test from 'node:test';
import { BioiconsAdapter } from './bioicons.js';

const paths = [
  'static/icons/cc-0/alice/zero.svg', 'static/icons/mit/bob/mit.svg',
  'static/icons/cc-by-3.0/cara/by3.svg', 'static/icons/cc-by-4.0/dan/by4.svg',
  'static/icons/cc-by-sa-3.0/erin/sa3.svg', 'static/icons/cc-by-sa-4.0/fred/sa4.svg',
  'static/icons/bsd/grace/excluded.svg', 'static/icons/mit/bob/not-an-icon.png', 'README.md',
];

test('Bioicons maps supported per-directory licenses and creator metadata', async () => {
  let call = 0;
  const adapter = new BioiconsAdapter(async () => {
    call += 1;
    return call === 1
      ? new Response(JSON.stringify({ truncated: false, tree: paths.map(path => ({ type: 'blob', path })) }))
      : new Response(JSON.stringify({ alice: 'https://alice.example', bob: { url: 'https://bob.example' } }));
  });
  const discovered = await adapter.discover({ limit: 20 });
  assert.deepEqual(discovered.assets.map(asset => asset.license), ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0', 'MIT']);
  assert.equal(discovered.assets.find(asset => asset.attribution === 'alice')?.creatorUrl, 'https://alice.example');
  assert.equal(discovered.assets.find(asset => asset.attribution === 'bob')?.creatorUrl, 'https://bob.example');
  assert.equal(discovered.assets.some(asset => asset.providerAssetId.includes('/bsd/')), false);
  assert.match(discovered.assets[0]?.sourcePageUrl ?? '', /github\.com\/duerrsimon\/bioicons\/blob\/main/);
  assert.match(discovered.assets[0]?.rawUrl ?? '', /raw\.githubusercontent\.com\/duerrsimon\/bioicons\/main/);
});

test('Bioicons fails closed when the official Git tree is truncated', async () => {
  const adapter = new BioiconsAdapter(async () => new Response(JSON.stringify({ truncated: true, tree: [] })));
  await assert.rejects(adapter.discover({ limit: 1 }), /truncated/);
});

test('Bioicons has stable cursor and limit behavior', async () => {
  const adapter = new BioiconsAdapter(async input => {
    return input.includes('/git/trees/')
      ? new Response(JSON.stringify({ truncated: false, tree: paths.slice(0, 2).map(path => ({ type: 'blob', path })) }))
      : new Response('{}');
  });
  const first = await adapter.discover({ limit: 1 });
  const second = await adapter.discover({ limit: 1, cursor: first.nextCursor });
  assert.equal(first.assets[0]?.providerAssetId, 'static/icons/cc-0/alice/zero.svg');
  assert.equal(second.assets[0]?.providerAssetId, 'static/icons/mit/bob/mit.svg');
});
