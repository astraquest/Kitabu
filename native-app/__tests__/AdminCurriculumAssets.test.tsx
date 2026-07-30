import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { AdminCurriculumSection } from '../src/components/admin/AdminCurriculumSection';
import { getLearningAssets } from '../src/services/learningAssetService';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('../src/services/learningAssetService', () => ({
  getLearningAssets: jest.fn(),
  getLearningAssetViewerUrl: jest.fn(() => 'http://localhost:4000/learning-assets/viewer'),
}));

const mockedGetAssets = getLearningAssets as jest.MockedFunction<typeof getLearningAssets>;
const styles = new Proxy({}, { get: () => ({}) }) as Record<string, object>;

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && node.findAllByProps({ children: text }).length > 0)[0];
}

test('Assets pill opens the labelled 3D asset catalog before grade content', async () => {
  mockedGetAssets.mockResolvedValue({
    assets: [
      { assetId: 'specimen.ready.001', version: '1.0.0', displayName: 'Ready Specimen', kind: 'model-3d', status: 'ready' },
      { assetId: 'specimen.draft.001', version: '1.0.0', displayName: 'Draft Specimen', kind: 'model-3d', status: 'draft' },
    ],
    totalReady: 1,
    totalRegistered: 7,
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
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
  });

  const assetsPill = pressableWithText(renderer.root, 'Assets');
  expect(assetsPill).toBeDefined();
  await ReactTestRenderer.act(async () => {
    assetsPill.props.onPress();
    await Promise.resolve();
  });

  expect(renderer.root.findAllByProps({ children: '3D Assets' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Ready Specimen' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft Specimen' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Ready' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'PDF Import' })).toHaveLength(0);

  const previewButton = renderer.root.findByProps({ accessibilityLabel: 'Preview Draft Specimen' });
  await ReactTestRenderer.act(() => previewButton.props.onPress());
  expect(renderer.root.findAllByProps({ children: 'IMG2THREEJS PREVIEW' }).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({ children: 'Draft Specimen' }).length).toBeGreaterThan(0);
});
