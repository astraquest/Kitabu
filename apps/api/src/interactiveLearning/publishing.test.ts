import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { validatePublishableBundle, type PublishableBundle } from './publishingValidation.js';

const fixtures = join(process.cwd(), '..', '..', 'packages', 'runtime-contracts', 'fixtures', 'grade-6');
const readJson = (name: string) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));

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
