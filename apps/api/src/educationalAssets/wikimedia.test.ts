import assert from 'node:assert/strict';
import test from 'node:test';

import { WikimediaCommonsAdapter } from './wikimedia.js';
import type { FetchLike } from './healthIcons.js';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('Wikimedia discovers a bounded category page with exact per-file license metadata', async () => {
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  const fetcher: FetchLike = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.searchParams.get('list') === 'categorymembers') {
      assert.equal(url.searchParams.get('cmtitle'), 'Category:Human anatomy');
      assert.equal(url.searchParams.get('cmlimit'), '3');
      return jsonResponse({
        query: { categorymembers: [
          { pageid: 3, title: 'File:Unknown.png' },
          { pageid: 1, title: 'File:Heart.svg' },
          { pageid: 2, title: 'File:Public-domain.png' },
        ] },
        continue: { continue: '-||', cmcontinue: 'next-page' },
      });
    }
    if (url.searchParams.get('prop') === 'imageinfo|revisions') {
      assert.equal(url.searchParams.has('rvlimit'), false);
      return jsonResponse({ query: { pages: [
        {
          pageid: 3,
          title: 'File:Unknown.png',
          imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/unknown.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Unknown.png', mime: 'image/png', width: 32, height: 24, extmetadata: { LicenseShortName: { value: 'CC BY' }, ImageDescription: { value: 'Needs review' } } }],
          revisions: [{ revid: 31, timestamp: '2026-08-10T00:00:00Z' }],
        },
        {
          pageid: 1,
          title: 'File:Heart.svg',
          imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/heart.svg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Heart.svg', mime: 'image/svg+xml', width: 640, height: 480, extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, UsageTerms: { value: 'Creative Commons Attribution 4.0 International' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' }, Attribution: { value: 'Ada Creator' }, Artist: { value: 'Ada Creator <https://creators.example/ada>' }, ImageDescription: { value: '<p>Heart diagram</p>' } } }],
          revisions: [{ revid: 11, timestamp: '2026-08-10T00:00:00Z' }],
        },
        {
          pageid: 2,
          title: 'File:Public-domain.png',
          imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/public-domain.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Public-domain.png', mime: 'image/png', extmetadata: { LicenseShortName: { value: 'Public domain' } } }],
          revisions: [{ revid: 21 }],
        },
      ] } });
    }
    throw new Error(`Unexpected mocked URL: ${url}`);
  };

  const adapter = new WikimediaCommonsAdapter('Category:Human anatomy', fetcher);
  const result = await adapter.discover({ limit: 3 });
  assert.deepEqual(result.assets.map(asset => asset.providerAssetId), ['1:11', '2:21', '3:31']);
  assert.equal(result.assets[0]?.title, 'File:Heart.svg');
  assert.equal(result.assets[0]?.license, 'CC-BY-4.0');
  assert.equal(result.assets[0]?.licenseEvidenceUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(result.assets[0]?.description, 'Heart diagram');
  assert.equal(result.assets[0]?.originalFilename, 'Heart.svg');
  assert.equal(result.assets[0]?.attribution, 'Ada Creator');
  assert.equal(result.assets[0]?.creator, 'Ada Creator');
  assert.equal(result.assets[0]?.creatorUrl, 'https://creators.example/ada');
  assert.equal(result.assets[0]?.licenseVersion, 'CC BY 4.0');
  assert.equal(result.assets[0]?.licenseEvidence, 'CC BY 4.0 | Creative Commons Attribution 4.0 International');
  assert.equal(result.assets[0]?.width, 640);
  assert.equal(result.assets[0]?.height, 480);
  assert.equal(result.assets[1]?.license, 'PUBLIC-DOMAIN');
  assert.equal(result.assets[2]?.license, 'UNKNOWN');
  assert.equal(result.assets[2]?.licenseEvidenceUrl, 'https://commons.wikimedia.org/wiki/File:Unknown.png');
  assert.equal(result.assets[0]?.sourcePageUrl, 'https://commons.wikimedia.org/wiki/File:Heart.svg');
  assert.equal(result.assets[0]?.rawUrl, 'https://upload.wikimedia.org/wikipedia/commons/heart.svg');
  assert.equal('subject' in result.assets[0]!, false);
  assert.deepEqual(JSON.parse(result.nextCursor!), { continue: '-||', cmcontinue: 'next-page' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.init?.redirect, 'error');
  assert.equal(calls[0]?.init?.headers && new Headers(calls[0].init.headers).get('User-Agent'), 'Kitabu-Educational-Assets/1.0');
});

test('Wikimedia cursors resume category pagination and downloads only official upload hosts', async () => {
  const calls: string[] = [];
  const fetcher: FetchLike = async (input, init) => {
    const url = new URL(input);
    calls.push(url.toString());
    if (url.searchParams.get('list') === 'categorymembers') {
      assert.equal(url.searchParams.get('cmcontinue'), 'resume-token');
      assert.equal(url.searchParams.get('continue'), '-||');
      return jsonResponse({ query: { categorymembers: [] } });
    }
    assert.equal(init?.redirect, 'error');
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };
  const adapter = new WikimediaCommonsAdapter('Plants', fetcher);
  const result = await adapter.discover({ limit: 1, cursor: JSON.stringify({ continue: '-||', cmcontinue: 'resume-token' }) });
  assert.deepEqual(result.assets, []);
  await assert.rejects(adapter.download({ providerKey: 'wikimedia-commons', providerAssetId: 'bad', title: 'bad', mediaType: 'image', mimeType: 'image/png', sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:bad.png', rawUrl: 'https://evil.example/bad.png', license: 'UNKNOWN', licenseEvidenceUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing' }), /official upload host/);
  assert.equal(calls.length, 1);
});

test('Wikimedia requires an explicit category and fails closed on malformed cursors', async () => {
  assert.throws(() => new WikimediaCommonsAdapter('   '), /explicit non-empty category/);
  const adapter = new WikimediaCommonsAdapter('Animals', async () => jsonResponse({ query: { categorymembers: [] } }));
  await assert.rejects(adapter.discover({ limit: 1, cursor: 'not-json' }), /cursor is invalid/);
});
