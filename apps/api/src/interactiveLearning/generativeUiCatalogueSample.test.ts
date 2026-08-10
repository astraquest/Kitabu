import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { GENERIC_SAMPLE_COMPONENT_IDS } from './genericSampleScene.js';
import { buildGenerativeUiCatalogueSampleBundle } from './generativeUiCatalogueSample.js';
import { validatePublishableBundle } from './publishingValidation.js';
import type { ComponentScenePayload } from './types.js';

const protectedFieldPattern = /"(?:answer|answerKey|correctAnswer|expectedAnswer|acceptedAnswers|gradingConfig|graderConfig|gradingRules?)"\s*:/i;

test('builds a deterministic preview bundle for all 50 registered components', () => {
  const first = buildGenerativeUiCatalogueSampleBundle();
  const second = buildGenerativeUiCatalogueSampleBundle();
  const scenes = first.scenes as ComponentScenePayload[];
  const componentIds = scenes.map(scene => scene.component.componentId);

  assert.deepEqual(first, second);
  assert.equal(validatePublishableBundle(first, 'preview').valid, true);
  assert.equal(first.manifest.bundleId, 'ken-cbc-generative-ui-catalogue');
  assert.equal(first.manifest.revision, '2026-08-10.1');
  assert.deepEqual(first.manifest.release, { channel: 'preview', releaseId: 'generative-ui-catalogue-2026-08-10-1' });
  assert.equal(scenes.length, 50);
  assert.equal(first.manifest.scenes.length, 50);
  assert.equal(new Set(componentIds).size, 50);
  assert.deepEqual(new Set(componentIds), new Set([
    'trace-construct',
    'authored-interaction',
    'structured-response',
    'classify-sort-match-rank',
    ...GENERIC_SAMPLE_COMPONENT_IDS,
  ]));
  assert.deepEqual(first.manifest.components.map(component => component.componentId), componentIds);

  const ranks = scenes.map(scene => {
    const match = scene.identity.sceneId.match(/(?:^|[-.])g(\d+)(?:[-.])/);
    return scene.identity.sceneId.includes('lower-primary') ? 0 : match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  });
  assert.equal(ranks.every((rank, index) => index === 0 || rank >= ranks[index - 1]), true);
});

test('keeps the catalogue payload learner-safe and identical to its SQL seed', () => {
  const bundle = buildGenerativeUiCatalogueSampleBundle();
  const serialized = JSON.stringify(bundle);
  assert.equal(protectedFieldPattern.test(serialized), false);
  assert.equal(bundle.manifest.scenes.every(reference => reference.sceneVersion === '1.0.0'), true);
  assert.equal(bundle.manifest.scenes.every(reference => reference.path.startsWith('generative-ui-catalogue/')), true);

  const migration = readFileSync(join(process.cwd(), 'sql', '080_seed_generative_ui_catalogue.sql'), 'utf8');
  const match = migration.match(/\$bundle\$([\s\S]*?)\$bundle\$/);
  assert.ok(match, 'migration must contain the embedded bundle payload');
  assert.deepEqual(JSON.parse(match[1]), bundle);
});
