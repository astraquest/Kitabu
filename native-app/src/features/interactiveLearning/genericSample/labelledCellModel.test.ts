import { buildLabelledCellModelHtml } from './labelledCellModel';

test('builds a visible five-marker model preview with an explicit fallback', () => {
  const html = buildLabelledCellModelHtml({
    url: 'https://dkudchritxmpummaeoq.supabase.co/storage/v1/object/public/educational-3d/3D%20files/v1/human-cell-1-4b4d7dd88c72.glb',
    fallback: 'Use the accessible choices below.',
    activeMarker: 'marker-3',
    markers: [1, 2, 3, 4, 5].map(index => ({
      id: `marker-${index}`,
      label: `Part ${index}`,
      position: [0, index / 10, 0] as [number, number, number],
    })),
  });

  expect((html.match(/slot="hotspot-/g) ?? [])).toHaveLength(5);
  expect(html).toContain('human-cell-1-4b4d7dd88c72.glb');
  expect(html).toContain('Use the accessible choices below.');
  expect(html).toContain('3D model could not be loaded');
});
