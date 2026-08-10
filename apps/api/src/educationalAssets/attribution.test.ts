import assert from 'node:assert/strict';
import test from 'node:test';
import { projectEducationalAssetAttributions } from './attribution.js';

test('attribution projection preserves all known sources without source URLs', () => {
  const attributions = projectEducationalAssetAttributions([
    { assetId: 'asset-1', sourceName: 'Health Icons', license: 'CC0-1.0', attribution: null },
    { assetId: 'asset-1', sourceName: 'Bioicons', license: 'BSD-3-Clause', attribution: 'Grace' },
  ]);
  assert.deepEqual(attributions, [
    { assetId: 'asset-1', sourceName: 'Health Icons', license: 'CC0-1.0', attribution: null },
    { assetId: 'asset-1', sourceName: 'Bioicons', license: 'BSD-3-Clause', attribution: 'Grace' },
  ]);
  assert.equal('sourceUrl' in attributions[0]!, false);
});
