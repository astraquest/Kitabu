import { adaptComponentScene } from './sceneAdapter';

const baseScene = {
  identity: { sceneId: 'sample-scene', schemaVersion: '1.0.1' },
  component: { componentId: 'single-choice', componentVersion: '1.0.0' },
  prompt: { default: 'Choose one.' },
  props: {
    title: 'Living things',
    instructions: 'Choose the item that is alive.',
    options: [{ id: 'plant', label: 'Plant' }, { id: 'stone', label: 'Stone' }],
    inputKind: 'choice',
    events: [{ type: 'select', label: 'Choose an item' }],
  },
};

test('adapts an allowlisted catalog scene to the generic native renderer', () => {
  const result = adaptComponentScene(baseScene);

  expect(result).toEqual({
    ok: true,
    input: {
      rendererId: 'generic-sample/native',
      sceneId: 'sample-scene',
      prompt: { default: 'Choose one.' },
      props: baseScene.props,
    },
  });
});

test('rejects unsafe generic props and unknown component IDs', () => {
  expect(adaptComponentScene({
    ...baseScene,
    props: { ...baseScene.props, answerKey: 'plant' },
  })).toEqual({ ok: false, code: 'invalid-renderer-props' });

  expect(adaptComponentScene({
    ...baseScene,
    props: { ...baseScene.props, body: 'Open https://unsafe.example' },
  })).toEqual({ ok: false, code: 'invalid-renderer-props' });

  expect(adaptComponentScene({
    ...baseScene,
    component: { componentId: 'remote-renderer', componentVersion: '1.0.0' },
  })).toEqual({ ok: false, code: 'renderer-not-installed' });
});
