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
