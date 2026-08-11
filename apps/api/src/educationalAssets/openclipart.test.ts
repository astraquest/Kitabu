import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenclipartAdapter } from './openclipart.js';
import type { FetchLike } from './healthIcons.js';

function htmlResponse(value: string): Response { return new Response(value, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
function searchHtml(page: number, pages: number) {
  return `<h2> 11003 clipart for "animal" <small> (Page ${page} of ${pages}) </small></h2><div class="gallery">
    <div class="artwork"><a href="/detail/226711/animal"><img src="/image/800px/226711" alt="Animal &amp; friends" /></a></div>
    <div class="artwork"><a href="https://evil.example/detail/1/nope"><img alt="Nope" /></a></div>
    <a href="/detail/4/outside-gallery"><img alt="Outside gallery" /></a>
  </div><div class="artwork gallery-ads"></div>`;
}

test('Openclipart requires a bounded query and parses only official gallery results from two query-bound pages', async () => {
  assert.throws(() => new OpenclipartAdapter(''), /non-empty bounded query/);
  assert.throws(() => new OpenclipartAdapter('animals\n'), /non-empty bounded query/);
  assert.throws(() => new OpenclipartAdapter('x'.repeat(161)), /non-empty bounded query/);
  const calls: URL[] = [];
  const fetcher: FetchLike = async input => { const url = new URL(input); calls.push(url); return htmlResponse(searchHtml(url.searchParams.get('p') === '2' ? 2 : 1, 5)); };
  const adapter = new OpenclipartAdapter(' Animals ', fetcher);
  const first = await adapter.discover({ limit: 500 });
  assert.equal(calls[0]?.pathname, '/search/'); assert.equal(calls[0]?.searchParams.get('query'), 'animals'); assert.equal(calls[0]?.searchParams.get('p'), null);
  assert.equal(first.assets.length, 1); assert.equal(first.assets[0]?.title, 'Animal & friends'); assert.equal(first.assets[0]?.rawUrl, 'https://openclipart.org/download/226711');
  assert.equal(first.assets[0]?.license, 'PUBLIC-DOMAIN'); assert.equal(first.assets[0]?.licenseEvidenceUrl, 'https://openclipart.org/share'); assert.deepEqual(first.assets[0]?.keywords, []); assert.deepEqual(first.assets[0]?.metadata, { openclipartQuery: 'animals' });
  assert.deepEqual(JSON.parse(first.nextCursor!), { query: 'animals', page: 2 });
  const second = await adapter.discover({ limit: 100, cursor: first.nextCursor });
  assert.equal(calls[1]?.searchParams.get('query'), 'animals'); assert.equal(calls[1]?.searchParams.get('p'), '2'); assert.equal(second.nextCursor, null);
  await assert.rejects(adapter.discover({ limit: 1, cursor: JSON.stringify({ query: 'other', page: 1 }) }), /cursor is invalid/);
});

test('Openclipart rejects malformed HTML search responses', async () => {
  const missingGallery = new OpenclipartAdapter('shapes', async () => htmlResponse('<h2>(Page 1 of 1)</h2>'));
  await assert.rejects(missingGallery.discover({ limit: 1 }), /did not contain a gallery/);
  const nonHtml = new OpenclipartAdapter('shapes', async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(nonHtml.discover({ limit: 1 }), /did not return HTML/);
});

test('Openclipart follows only official download redirects and validates final host and image type', async () => {
  const calls: RequestInit[] = [];
  const fetcher: FetchLike = async (input, init) => {
    calls.push(init!);
    if (String(input).endsWith('/download/226711')) return new Response(null, { status: 302, headers: { Location: 'https://www.openclipart.org/image/800px/226711' } });
    return new Response('<svg/>', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
  };
  const adapter = new OpenclipartAdapter('animals', fetcher);
  const asset = { providerKey: 'openclipart', providerAssetId: '226711', title: 'Animal', mediaType: 'vector' as const, mimeType: 'image/svg+xml', sourcePageUrl: 'https://openclipart.org/detail/226711/animal', rawUrl: 'https://openclipart.org/download/226711', license: 'PUBLIC-DOMAIN' as const, licenseEvidenceUrl: 'https://openclipart.org/share' };
  assert.deepEqual(await adapter.download(asset), new TextEncoder().encode('<svg/>')); assert.equal(calls.length, 2); assert.equal(calls[0]?.redirect, 'manual');
  const untrustedRedirect = new OpenclipartAdapter('animals', async () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/image.svg' } }));
  await assert.rejects(untrustedRedirect.download(asset), /redirected to an untrusted host/);
  const untrustedFinal = new OpenclipartAdapter('animals', async () => ({ ok: true, status: 200, url: 'https://evil.example/image.svg', headers: new Headers({ 'Content-Type': 'image/svg+xml' }), arrayBuffer: async () => new ArrayBuffer(0) } as Response));
  await assert.rejects(untrustedFinal.download(asset), /resolved to an untrusted host/);
  const badType = new OpenclipartAdapter('animals', async () => new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(badType.download(asset), /expected image type/);
});
