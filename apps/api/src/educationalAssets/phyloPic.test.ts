import assert from 'node:assert/strict';
import test from 'node:test';

import { PhyloPicAdapter } from './phyloPic.js';
import type { FetchLike } from './healthIcons.js';

const uuids = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
];

function item(uuid: string, title: string, licenseHref?: string) {
  return {
    uuid,
    attribution: `Creator for ${title}`,
    _links: {
      self: { href: `/images/${uuid}?build=547`, title },
      specificNode: { href: '/nodes/11111111-1111-4111-8111-111111111111?build=547', title },
      nodes: [{ href: '/nodes/11111111-1111-4111-8111-111111111111?build=547', title }],
      contributor: { href: '/contributors/22222222-2222-4222-8222-222222222222?build=547', title: `Contributor ${title}` },
      license: licenseHref ? { href: licenseHref } : undefined,
      vectorFile: { href: `https://images.phylopic.org/images/${uuid}/vector.svg`, type: 'image/svg+xml', sizes: '120x80' },
      sourceFile: { href: `https://images.phylopic.org/images/${uuid}/source.svg`, type: 'image/svg+xml', sizes: '120x80' },
    },
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('PhyloPic requires an explicit query or node and handles current-build pagination', async () => {
  assert.throws(() => new PhyloPicAdapter({}), /exactly one/);
  assert.throws(() => new PhyloPicAdapter({ query: 'eucalyptus', nodeUuid: uuids[0] }), /exactly one/);
  assert.throws(() => new PhyloPicAdapter({ nodeUuid: 'not-a-uuid' }), /invalid/);
  assert.throws(() => new PhyloPicAdapter({ query: 'x'.repeat(161) }), /too long/);
  assert.throws(() => new PhyloPicAdapter({ query: 'animals\n' }), /control characters/);

  const calls: URL[] = [];
  const fetcher: FetchLike = async input => {
    const url = new URL(input);
    calls.push(url);
    if (!url.searchParams.has('page')) return jsonResponse({ build: 547, totalPages: 2 });
    assert.equal(url.searchParams.get('build'), '547');
    assert.equal(url.searchParams.get('embed_items'), 'true');
    return jsonResponse({
      build: 547,
      totalPages: 2,
      _embedded: { items: [item(uuids[1]!, 'Zebra', 'https://creativecommons.org/licenses/by/4.0/'), item(uuids[0]!, 'Ant', 'https://creativecommons.org/publicdomain/zero/1.0/')] },
    });
  };
  const adapter = new PhyloPicAdapter({ query: ' Eucalyptus ' }, fetcher);
  const first = await adapter.discover({ limit: 1 });
  assert.equal(calls[0]?.searchParams.get('filter_name'), 'eucalyptus');
  assert.equal(first.assets[0]?.title, 'Ant');
  assert.equal(first.assets[0]?.license, 'CC0-1.0');
  assert.equal(first.assets[0]?.visualType, 'VOCABULARY_IMAGE');
  assert.equal(first.assets[0]?.subject, 'Ant');
  assert.equal(first.assets[0]?.creator, 'Creator for Ant');
  assert.equal(first.assets[0]?.rawUrl, `https://images.phylopic.org/images/${uuids[0]}/vector.svg`);
  assert.deepEqual(JSON.parse(first.nextCursor!), { build: 547, page: 0, index: 1 });
  const second = await adapter.discover({ limit: 1, cursor: first.nextCursor });
  assert.equal(second.assets[0]?.title, 'Zebra');

  const nodeAdapter = new PhyloPicAdapter({ nodeUuid: uuids[0] }, async input => {
    const url = new URL(input);
    if (!url.searchParams.has('page')) return jsonResponse({ build: 547, totalPages: 1 });
    return jsonResponse({ build: 547, totalPages: 1, _embedded: { items: [item(uuids[2]!, 'Node taxon', 'https://creativecommons.org/licenses/by-sa/3.0/')] } });
  });
  const nodeResult = await nodeAdapter.discover({ limit: 1 });
  assert.equal(new URL(String(calls[0])).searchParams.get('filter_name'), 'eucalyptus');
  assert.equal(nodeResult.assets[0]?.license, 'CC-BY-SA-3.0');
});

test('PhyloPic maps only explicit per-image licenses and follows official item links defensively', async () => {
  const imageItems = [
    item(uuids[0]!, 'PDM', 'https://creativecommons.org/publicdomain/mark/1.0/'),
    item(uuids[1]!, 'BY 3', 'https://creativecommons.org/licenses/by/3.0/'),
    item(uuids[2]!, 'SA 4', 'https://creativecommons.org/licenses/by-sa/4.0/'),
    item(uuids[3]!, 'NC', 'https://creativecommons.org/licenses/by-nc/4.0/'),
  ];
  let itemCalls = 0;
  const adapter = new PhyloPicAdapter({ query: 'animals' }, async input => {
    const url = new URL(input);
    if (url.pathname === '/images' && !url.searchParams.has('page')) return jsonResponse({ build: 547, totalPages: 1 });
    if (url.pathname === '/images' && url.searchParams.has('page')) {
      return jsonResponse({ build: 547, totalPages: 1, _links: { items: imageItems.map((entry, index) => ({ href: `/images/${entry.uuid}?build=547`, title: `Item ${index}` })) } });
    }
    itemCalls += 1;
    return jsonResponse(imageItems[itemCalls - 1]);
  });
  const result = await adapter.discover({ limit: 10 });
  assert.equal(itemCalls, imageItems.length);
  assert.deepEqual(result.assets.map(asset => asset.license), ['PUBLIC-DOMAIN', 'CC-BY-3.0', 'CC-BY-SA-4.0', 'UNKNOWN']);
  assert.match(result.assets[0]?.licenseEvidenceUrl ?? '', /creativecommons\.org/);
  assert.equal(result.assets[0]?.creatorUrl, 'https://api.phylopic.org/contributors/22222222-2222-4222-8222-222222222222?build=547');
  assert.equal(result.assets[0]?.keywords?.[0], 'PDM');
});

test('PhyloPic rejects invalid cursors and never downloads from unsafe hosts', async () => {
  let calls = 0;
  const adapter = new PhyloPicAdapter({ query: 'animals' }, async () => {
    calls += 1;
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  });
  await assert.rejects(adapter.discover({ limit: 1, cursor: 'bad-cursor' }), /cursor is invalid/);
  await assert.rejects(adapter.download({
    providerKey: 'phylopic', providerAssetId: uuids[0]!, title: 'Unsafe', mediaType: 'vector', mimeType: 'image/svg+xml',
    sourcePageUrl: `https://www.phylopic.org/images/${uuids[0]}`, rawUrl: 'https://evil.example/vector.svg', license: 'UNKNOWN', licenseEvidenceUrl: 'https://www.phylopic.org/articles/image-usage',
  }), /official image host/);
  assert.equal(calls, 0);
});
