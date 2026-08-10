import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { after } from 'node:test';

import { validatePublishableBundle, type PublishableBundle } from './publishingValidation.js';
import { db, redis } from '../db.js';
import { getInteractiveBundle, getInteractiveRelease } from './publishing.js';

const fixtures = join(process.cwd(), '..', '..', 'packages', 'runtime-contracts', 'fixtures', 'grade-6');
const readJson = (name: string) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));

after(async () => {
  redis.disconnect();
  await db.end();
});

function bundle(): PublishableBundle {
  return {
    manifest: readJson('whole-numbers.bundle.json'),
    scenes: [readJson('whole-numbers-structured-response.scene.json'), readJson('whole-numbers-rank.scene.json')],
    assetManifest: readJson('whole-numbers.assets.json'),
  };
}

test('accepts the pinned Grade 6 preview bundle for installed server capabilities', () => {
  const value = bundle();
  assert.equal(validatePublishableBundle(value, value.manifest.release.channel).valid, true);
});

test('rejects cross-channel promotion and malformed payloads without throwing', () => {
  assert.equal(validatePublishableBundle(bundle(), 'production').valid, false);
  assert.equal(validatePublishableBundle({ manifest: {} as PublishableBundle['manifest'], scenes: [], assetManifest: null }, 'preview').valid, false);
});

test('retrieves the release pointer and stored payload by channel', async () => {
  const originalQuery = db.query;
  let requestedChannel: unknown;
  db.query = (async (_sql: string, values: unknown[]) => {
    requestedChannel = values[0];
    return { rows: [{ channel: 'preview', bundle_id: 'sample', revision: '1', release_id: 'release-1', payload: { manifest: {} } }] };
  }) as typeof db.query;

  try {
    assert.deepEqual(await getInteractiveRelease('preview'), {
      channel: 'preview',
      bundle_id: 'sample',
      revision: '1',
      release_id: 'release-1',
      payload: { manifest: {} },
    });
    assert.equal(requestedChannel, 'preview');
  } finally {
    db.query = originalQuery;
  }
});

test('retrieves an exact bundle revision without consulting the release pointer', async () => {
  const originalQuery = db.query;
  let requestedIdentity: unknown[] = [];
  db.query = (async (_sql: string, values: unknown[]) => {
    requestedIdentity = values;
    return { rows: [{ bundle_id: 'sample', revision: '1', release_id: 'release-1', channel: 'preview', manifest: {}, payload: { manifest: {} } }] };
  }) as typeof db.query;

  try {
    assert.deepEqual(await getInteractiveBundle('sample', '1'), {
      bundle_id: 'sample',
      revision: '1',
      release_id: 'release-1',
      channel: 'preview',
      manifest: {},
      payload: { manifest: {} },
    });
    assert.deepEqual(requestedIdentity, ['sample', '1']);
  } finally {
    db.query = originalQuery;
  }
});
