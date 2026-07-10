import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

const testJwtKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env.KITABU_RUNTIME_ENV = 'test';
process.env.KITABU_NODE_ENV = 'test';
process.env.KITABU_DATABASE_URL ??= 'postgresql://kitabu:kitabu@127.0.0.1:5432/kitabu_test';
process.env.KITABU_REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.KITABU_JWT_ISSUER ??= 'kitabu-test';
process.env.KITABU_JWT_AUDIENCE ??= 'kitabu-test';
process.env.KITABU_JWT_PRIVATE_KEY = testJwtKeys.privateKey
  .export({ format: 'pem', type: 'pkcs8' })
  .toString();
process.env.KITABU_JWT_PUBLIC_KEY = testJwtKeys.publicKey
  .export({ format: 'pem', type: 'spki' })
  .toString();
process.env.KITABU_LEGAL_PAGE_DIR = resolve(process.cwd(), '../web');

const [{ buildServer }, { db, redis }] = await Promise.all([
  import('./server.js'),
  import('./db.js')
]);

const app = buildServer();

test.after(async () => {
  await app.close();
  redis.disconnect();
  await db.end();
});

test('legal pages are public, hardened, and reference live local assets', async () => {
  const pages = ['/terms', '/policy', '/privacy', '/deletion'] as const;

  for (const url of pages) {
    const response = await app.inject({ method: 'GET', url });

    assert.equal(response.statusCode, 200, url);
    assert.match(response.headers['content-type'] ?? '', /^text\/html; charset=utf-8$/);
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['cross-origin-opener-policy'], 'same-origin');
    assert.equal(response.headers['cross-origin-resource-policy'], 'same-origin');
    assert.match(response.headers['content-security-policy'] ?? '', /script-src 'none'/);
    assert.match(response.body, /href="\/legal\.css\?v=20260710"/);
    assert.match(response.body, /src="\/assets\/kitabu-logo\.png\?v=20260710"/);
    assert.doesNotMatch(response.body, /href="\/"/);
    assert.doesNotMatch(response.body, /<script|\sstyle=|\son[a-z]+=/i);
  }

  const policy = await app.inject({ method: 'GET', url: '/policy' });
  assert.match(
    policy.body,
    /href="https:\/\/app\.kitabu\.ai\/deletion">https:\/\/app\.kitabu\.ai\/deletion<\/a>/
  );
});

test('legal assets are packaged with correct content types', async () => {
  const assets = [
    ['/legal.css?v=20260710', /^text\/css; charset=utf-8$/],
    ['/assets/kitabu-logo.png?v=20260710', /^image\/png$/],
    ['/assets/kitabu-favicon-bold.ico?v=20260710', /^image\/x-icon$/],
    ['/assets/fonts/bricolage-grotesque-latin.woff2?v=20260710', /^font\/woff2$/],
    ['/assets/fonts/plus-jakarta-sans-latin.woff2?v=20260710', /^font\/woff2$/]
  ] as const;

  for (const [url, contentType] of assets) {
    const response = await app.inject({ method: 'GET', url });

    assert.equal(response.statusCode, 200, url);
    assert.match(response.headers['content-type'] ?? '', contentType);
    assert.ok(response.rawPayload.length > 0, url);
  }
});

test('trailing-slash legal URLs redirect to their canonical route', async () => {
  const pages = ['/terms', '/policy', '/privacy', '/deletion'] as const;

  for (const canonical of pages) {
    const response = await app.inject({ method: 'GET', url: `${canonical}/` });

    assert.equal(response.statusCode, 308, canonical);
    assert.equal(response.headers.location, canonical);
  }
});
