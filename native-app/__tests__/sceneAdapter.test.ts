import { adaptComponentScene } from '../src/features/interactiveLearning/sceneAdapter';

const validScene = () => ({
  identity: { sceneId: 'g6-place-value', schemaVersion: '1.0.1' },
  component: { componentId: 'structured-response', componentVersion: '1.0.0' },
  prompt: { default: 'What is the value of the digit 7?' },
  props: {
    mode: 'numeric',
    normalization: { allowThousandsSeparators: true, locale: 'en-KE' },
    accessibility: { inputLabel: { default: 'Enter the total value' } },
  },
});

test('adapts a supported component scene to the installed native renderer', () => {
  expect(adaptComponentScene(validScene())).toEqual({
    ok: true,
    input: {
      rendererId: 'structured-response/native',
      sceneId: 'g6-place-value',
      prompt: { default: 'What is the value of the digit 7?' },
      props: validScene().props,
    },
  });
});

test('rejects malformed API data without throwing', () => {
  expect(adaptComponentScene(null)).toEqual({ ok: false, code: 'invalid-scene' });
  expect(adaptComponentScene({ identity: {}, component: {} })).toEqual({
    ok: false,
    code: 'invalid-scene',
  });
});

test('rejects component versions that are not installed without silently upgrading', () => {
  const scene = validScene();
  scene.component.componentVersion = '1.1.0';

  expect(adaptComponentScene(scene)).toEqual({
    ok: false,
    code: 'renderer-not-installed',
  });
});

test('rejects unsafe or malformed renderer props', () => {
  const scene = validScene();
  (scene.props as Record<string, unknown>).correctAnswer = 700_000;

  expect(adaptComponentScene(scene)).toEqual({
    ok: false,
    code: 'invalid-renderer-props',
  });

  const multilineNumeric = validScene();
  (multilineNumeric.props as Record<string, unknown>).input = { allowMultiline: true };
  expect(adaptComponentScene(multilineNumeric)).toEqual({
    ok: false,
    code: 'invalid-renderer-props',
  });
});

test('adapts a validated ranked list to its installed renderer', () => {
  const scene = {
    identity: { sceneId: 'g6-rank', schemaVersion: '1.0.1' },
    component: { componentId: 'classify-sort-match-rank', componentVersion: '1.0.0' },
    prompt: { default: 'Order the numbers.' },
    props: {
      mode: 'ranked-list',
      items: [
        { id: 'two', label: '2', value: 2, accessibleDescription: 'two' },
        { id: 'one', label: '1', value: 1, accessibleDescription: 'one' },
      ],
      orderingRules: { direction: 'ascending' },
      allowMultiplePlacements: false,
      unplacedPolicy: 'all-items-required',
      layout: { orientation: 'vertical', showPositionNumbers: true },
      shuffleSeed: 'fixed',
      explanationPolicy: { required: false },
      keyboardMoveModel: 'move-buttons',
    },
  };

  expect(adaptComponentScene(scene)).toMatchObject({
    ok: true,
    input: { rendererId: 'classify-sort-match-rank/native', sceneId: 'g6-rank' },
  });
});

test('adapts a lower-primary trace/construct scene with tap-accessible choices', () => {
  const scene = {
    identity: { sceneId: 'g1-lines-curve', schemaVersion: '1.0.1' },
    component: { componentId: 'trace-construct', componentVersion: '1.0.0' },
    prompt: { default: 'Choose the curved line.' },
    props: {
      mode: 'trace-path',
      instruction: { default: 'Tap the path you would trace.' },
      accessibility: { selectionLabel: { default: 'Line choices' } },
      targets: [
        { id: 'curve', label: '⌒', accessibleDescription: 'A curved line' },
        { id: 'straight', label: '—', accessibleDescription: 'A straight line' },
      ],
      selectionCount: 1,
    },
  };

  expect(adaptComponentScene(scene)).toMatchObject({
    ok: true,
    input: { rendererId: 'trace-construct/native', sceneId: 'g1-lines-curve' },
  });
});

test('rejects a trace/construct scene that exposes its answer contract', () => {
  const scene = {
    identity: { sceneId: 'g1-invalid', schemaVersion: '1.0.1' },
    component: { componentId: 'trace-construct', componentVersion: '1.0.0' },
    prompt: { default: 'Choose a shape.' },
    props: {
      mode: 'construct-pattern',
      instruction: { default: 'Tap the next shape.' },
      accessibility: { selectionLabel: { default: 'Shape choices' } },
      targets: [
        { id: 'circle', label: '○', accessibleDescription: 'A circle' },
        { id: 'triangle', label: '△', accessibleDescription: 'A triangle' },
      ],
      selectionCount: 1,
      requiredTargetIds: ['circle'],
    },
  };
  expect(adaptComponentScene(scene)).toEqual({ ok: false, code: 'invalid-renderer-props' });
});

test('rejects an invalid trace/construct selection count', () => {
  const scene = {
    identity: { sceneId: 'g1-invalid-count', schemaVersion: '1.0.1' },
    component: { componentId: 'trace-construct', componentVersion: '1.0.0' },
    prompt: { default: 'Choose a shape.' },
    props: {
      mode: 'construct-pattern',
      instruction: { default: 'Tap the next shape.' },
      accessibility: { selectionLabel: { default: 'Shape choices' } },
      targets: [
        { id: 'circle', label: 'Circle', accessibleDescription: 'A circle' },
        { id: 'triangle', label: 'Triangle', accessibleDescription: 'A triangle' },
      ],
      selectionCount: 3,
    },
  };
  expect(adaptComponentScene(scene)).toEqual({ ok: false, code: 'invalid-renderer-props' });
});

test('adapts a public-only authored interaction scene', () => {
  const scene = {
    identity: { sceneId: 'g1-sort-food', schemaVersion: '1.0.1' },
    component: { componentId: 'authored-interaction', componentVersion: '1.0.0' },
    prompt: { default: 'Sort the food.' },
    props: {
      mode: 'classify',
      instruction: 'Tap a food, then tap its group.',
      items: [
        { id: 'mango', label: 'Mango', accessibleDescription: 'A ripe mango' },
        { id: 'carrot', label: 'Carrot' },
      ],
      groups: [
        { id: 'fruit', label: 'Fruit' },
        { id: 'vegetable', label: 'Vegetable' },
      ],
    },
  };

  expect(adaptComponentScene(scene)).toEqual({
    ok: true,
    input: {
      rendererId: 'authored-interaction/native',
      sceneId: 'g1-sort-food',
      prompt: { default: 'Sort the food.' },
      props: scene.props,
    },
  });
});

test('rejects authored interaction props that expose grading answers', () => {
  const scene = {
    identity: { sceneId: 'unsafe-sort', schemaVersion: '1.0.1' },
    component: { componentId: 'authored-interaction', componentVersion: '1.0.0' },
    prompt: { default: 'Sort the food.' },
    props: {
      mode: 'classify',
      instruction: 'Sort the food.',
      items: [{ id: 'mango', label: 'Mango' }],
      groups: [{ id: 'fruit', label: 'Fruit' }],
      answer: { mango: 'fruit' },
    },
  };

  expect(adaptComponentScene(scene)).toEqual({ ok: false, code: 'invalid-renderer-props' });
});
