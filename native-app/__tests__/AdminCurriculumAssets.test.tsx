import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { AdminCurriculumSection } from '../src/components/admin/AdminCurriculumSection';
import { getLearningAssets } from '../src/services/learningAssetService';
import { getAdminCurriculumCatalog } from '../src/services/curriculumService';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('../src/services/learningAssetService', () => ({
  getLearningAssets: jest.fn(),
  getLearningAssetViewerUrl: jest.fn(() => 'http://localhost:4000/learning-assets/viewer'),
}));
jest.mock('../src/services/curriculumService', () => ({
  getAdminCurriculumCatalog: jest.fn(),
}));

const mockedGetAssets = getLearningAssets as jest.MockedFunction<typeof getLearningAssets>;
const mockedGetCurriculumCatalog = getAdminCurriculumCatalog as jest.MockedFunction<typeof getAdminCurriculumCatalog>;
const styles = new Proxy({}, { get: () => ({}) }) as Record<string, object>;

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && node.findAllByProps({ children: text }).length > 0)[0];
}

test('Assets pill opens the learning asset catalogue before grade content', async () => {
  mockedGetCurriculumCatalog.mockResolvedValue({ grades: ['Grade 1', 'Grade 2', 'Grade 3'] });
  mockedGetAssets.mockResolvedValue({
    assets: [
      { assetId: 'specimen.ready.001', version: '1.0.0', displayName: 'Ready Specimen', kind: 'model-3d', status: 'ready' },
      { assetId: 'specimen.draft.001', version: '1.0.0', displayName: 'Draft Specimen', kind: 'model-3d', status: 'draft' },
    ],
    totalReady: 1,
    totalRegistered: 7,
    collections: [],
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AdminCurriculumSection
        styles={styles}
        currentGrade="Grade 1"
        currentSubjects={[]}
        curriculumData={{}}
        pdfImportStatus="available"
        processingSubjectId={null}
        onSelectGrade={jest.fn()}
        onAddSubject={jest.fn()}
        onActivateSubject={jest.fn()}
        onImportSubject={jest.fn()}
        onOpenEditor={jest.fn()}
        onRemoveSubject={jest.fn()}
      />,
    );
    await Promise.resolve();
  });

  const assetsPill = pressableWithText(renderer.root, 'Assets');
  expect(assetsPill).toBeDefined();
  await ReactTestRenderer.act(async () => {
    assetsPill.props.onPress();
    await Promise.resolve();
  });

  expect(renderer.root.findAllByProps({ children: 'Learning Assets' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Ready Specimen' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft Specimen' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Ready' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'PDF Import' })).toHaveLength(0);

  const previewButton = renderer.root.findByProps({ accessibilityLabel: 'Preview Draft Specimen' });
  await ReactTestRenderer.act(() => previewButton.props.onPress());
  expect(renderer.root.findAllByProps({ children: 'IMG2THREEJS PREVIEW' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft Specimen' }).length).toBeGreaterThan(0);

  await ReactTestRenderer.act(() => renderer.unmount());
});
