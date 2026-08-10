import assert from 'node:assert/strict';
import test from 'node:test';
import { createEducationalAssetCoverageReport } from './coverage.js';

test('coverage reports only explicit subject/topic metadata against controlled expectations', () => {
  const report = createEducationalAssetCoverageReport([
    { subject: 'Science', topic: 'Animals' },
    { subject: 'science', topic: 'animals', count: 2 },
    { subject: 'Mathematics', topic: 'Counting', count: 1 },
    { subject: '', topic: 'Ignored', count: 10 },
  ], [
    { subject: 'Science', topic: 'Animals' },
    { subject: 'Mathematics', topic: 'Counting' },
    { subject: 'Science', topic: 'Plants' },
  ], { weakBelow: 2 });

  assert.equal(report.totalAssets, 4);
  assert.deepEqual(report.expected, [
    { subject: 'Mathematics', topic: 'Counting', count: 1 },
    { subject: 'Science', topic: 'Animals', count: 3 },
    { subject: 'Science', topic: 'Plants', count: 0 },
  ]);
  assert.deepEqual(report.weak, [{ subject: 'Mathematics', topic: 'Counting', count: 1 }]);
  assert.deepEqual(report.uncovered, [{ subject: 'Science', topic: 'Plants' }]);
});
