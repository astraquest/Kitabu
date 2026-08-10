import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { InteractiveLearningPublisherPanel } from './InteractiveLearningPublisherPanel';
import { getInteractiveBundle } from '../../services/interactiveLearningAdminService';

jest.mock('../../services/interactiveLearningAdminService', () => ({
  approveInteractiveBundle: jest.fn(),
  getInteractiveBundle: jest.fn(),
  moveInteractiveRelease: jest.fn(),
  saveInteractiveBundleDraft: jest.fn(),
  validateInteractiveBundle: jest.fn(),
}));

jest.mock('../../features/interactiveLearning/InteractiveSceneHost', () => ({
  InteractiveSceneHost: () => null,
}));

const styles = {
  panel: {},
  panelTitle: {},
  panelText: {},
  panelTextSmall: {},
  input: {},
  actionRow: {},
  blueBtn: {},
  blueBtnText: {},
  ghostBtn: {},
  ghostText: {},
};

const bundle = {
  manifest: { bundleId: 'ken-cbc-generative-ui-catalogue', revision: '2026-08-10.1', release: { channel: 'preview' } },
  scenes: [
    {
      identity: { sceneId: 'sample-trace', schemaVersion: '1.0.1' },
      component: { componentId: 'trace-construct', componentVersion: '1.0.0' },
      prompt: { default: 'Choose the curved line.' },
      props: {
        mode: 'trace-path',
        targets: [
          { id: 'curved', label: 'Curved', accessibleDescription: 'A curved line' },
          { id: 'straight', label: 'Straight', accessibleDescription: 'A straight line' },
        ],
        selectionCount: 1,
        instruction: { default: 'Choose the line that bends.' },
        accessibility: { selectionLabel: { default: 'Line choices' } },
      },
    },
    {
      identity: { sceneId: 'sample-choice', schemaVersion: '1.0.1' },
      component: { componentId: 'single-choice', componentVersion: '1.0.0' },
      prompt: { default: 'Choose one.' },
      props: {
        title: 'A choice',
        instructions: 'Choose one option.',
        options: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }],
        inputKind: 'choice',
      },
    },
  ],
  assetManifest: {},
};

test('loads the catalogue and navigates preview scenes', async () => {
  (getInteractiveBundle as jest.Mock).mockResolvedValue({ release_id: 'catalogue-release', payload: bundle });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<InteractiveLearningPublisherPanel styles={styles} />);
  });
  const loadButton = renderer!.root.findByProps({ accessibilityLabel: 'Load preview' });
  await act(async () => { await loadButton.props.onPress(); });

  expect(renderer!.root.findByProps({ accessibilityLabel: 'Interactive learning preview position' }).children.join('')).toContain('Preview 1 of 2 · trace-construct');
  await act(async () => { renderer!.root.findByProps({ accessibilityLabel: 'Next preview scene' }).props.onPress(); });
  expect(renderer!.root.findByProps({ accessibilityLabel: 'Interactive learning preview position' }).children.join('')).toContain('Preview 2 of 2 · single-choice');
});
