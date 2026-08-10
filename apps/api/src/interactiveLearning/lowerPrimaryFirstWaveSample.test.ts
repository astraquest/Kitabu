import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { buildLowerPrimaryFirstWaveSampleBundle } from './lowerPrimaryFirstWaveSample.js';
import { validatePublishableBundle } from './publishingValidation.js';

const protectedFieldPattern = /"(?:answer|answerKey|correctAnswer|expectedAnswer|acceptedAnswers|gradingConfig|graderConfig|gradingRules?)"\s*:/i;

test('builds a deterministic preview bundle for the four first-wave renderers', () => {
  const first = buildLowerPrimaryFirstWaveSampleBundle();
  const second = buildLowerPrimaryFirstWaveSampleBundle();

  assert.deepEqual(first, second);
  assert.equal(validatePublishableBundle(first, 'preview').valid, true);
  assert.deepEqual(first.manifest.components, [
    { componentId: 'trace-construct', componentVersion: '1.0.0' },
    { componentId: 'authored-interaction', componentVersion: '1.0.0' },
    { componentId: 'structured-response', componentVersion: '1.0.0' },
    { componentId: 'classify-sort-match-rank', componentVersion: '1.0.0' },
  ]);
  assert.deepEqual(first.scenes.map((scene) => (scene as { component: { componentId: string } }).component.componentId), [
    'trace-construct',
    'authored-interaction',
    'structured-response',
    'classify-sort-match-rank',
  ]);
  const trace = first.scenes[0] as { props: { targets: Array<{ id: string }> } };
  const authored = first.scenes[1] as { props: { items: Array<{ id: string }>; groups: Array<{ id: string }> } };
  const numeric = first.scenes[2] as { props: { mode: string } };
  const ranked = first.scenes[3] as { props: { items: Array<{ id: string; value: number }> } };
  assert.deepEqual(trace.props.targets.map(({ id }) => id), ['curved-line', 'straight-line']);
  assert.deepEqual(authored.props.items.map(({ id }) => id), ['mango', 'carrot']);
  assert.deepEqual(authored.props.groups.map(({ id }) => id), ['fruit', 'vegetable']);
  assert.equal(numeric.props.mode, 'numeric');
  assert.deepEqual(ranked.props.items.map(({ id, value }) => [id, value]), [['number-12', 12], ['number-5', 5], ['number-9', 9]]);
});

test('keeps the four sample scenes learner-safe and references every payload', () => {
  const bundle = buildLowerPrimaryFirstWaveSampleBundle();
  const serialized = JSON.stringify(bundle);

  assert.equal(protectedFieldPattern.test(serialized), false);
  assert.equal(bundle.manifest.scenes.length, 4);
  assert.equal(bundle.manifest.scenes.every((reference) => reference.sceneVersion === '1.0.0'), true);
  assert.equal(bundle.manifest.scenes.every((reference) => reference.path.includes('lower-primary-first-wave/')), true);
  assert.equal(bundle.manifest.assetManifest.path, 'lower-primary-first-wave/assets.json');
  assert.deepEqual(bundle.manifest.graders, [
    { graderId: 'kitabu.sealed-numeric-answer', graderVersion: '1.0.0' },
    { graderId: 'ordered-item-ids', graderVersion: '1.0.0' },
  ]);
});

test('keeps the forward-only SQL seed identical to the TypeScript builder', () => {
  const migration = readFileSync(join(process.cwd(), 'sql', '076_seed_lower_primary_first_wave_bundle.sql'), 'utf8');
  const match = migration.match(/\$bundle\$([\s\S]*?)\$bundle\$/);
  assert.ok(match, 'migration must contain the embedded bundle payload');
  assert.deepEqual(JSON.parse(match[1]), buildLowerPrimaryFirstWaveSampleBundle());
});
