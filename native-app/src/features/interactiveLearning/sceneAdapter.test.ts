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

test('adapts the labelled-cell scene with its remote model URL and five markers', () => {
  const scene = {
    ...baseScene,
    component: { componentId: 'labelled-cell-3d', componentVersion: '1.0.0' },
    props: {
      ...baseScene.props,
      modelUrl: 'https://dkudchritxmpummaeoq.supabase.co/storage/v1/object/public/educational-3d/3D%20files/v1/human-cell-1-4b4d7dd88c72.glb',
      modelFallback: 'Use the accessible choices below.',
      markers: [1, 2, 3, 4, 5].map(index => ({
        id: `marker-${index}`,
        label: `Part ${index}`,
        position: [0, index / 10, 0] as [number, number, number],
      })),
      activeMarker: 'marker-3',
    },
  };
  const result = adaptComponentScene(scene);
  expect(result.ok).toBe(true);
  if (result.ok && result.input.rendererId === 'generic-sample/native') {
    expect(result.input.props.modelUrl).toBe(scene.props.modelUrl);
    expect(result.input.props.markers).toHaveLength(5);
    expect(result.input.props.activeMarker).toBe('marker-3');
  }
});
