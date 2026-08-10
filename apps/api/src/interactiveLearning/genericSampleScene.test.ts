import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGenericSampleScene } from './genericSampleScene.js';

test('builds a generic scene with copied learner-safe data', () => {
  const options = [{ id: 'one', label: 'One' }];
  const scene = buildGenericSampleScene({
    sceneId: 'g1.math.single-choice.1',
    componentId: 'single-choice',
    prompt: 'Choose one.',
    props: {
      title: 'A choice',
      instructions: 'Choose one option.',
      options,
      inputKind: 'choice',
      events: [{ type: 'select', targetId: 'one' }],
    },
  });

  options[0].label = 'Changed';
  assert.deepEqual(scene.component, { componentId: 'single-choice', componentVersion: '1.0.0' });
  assert.equal(scene.prompt.default, 'Choose one.');
  assert.equal(scene.props.options?.[0].label, 'One');
  assert.equal(JSON.stringify(scene).includes('answerKey'), false);
});
