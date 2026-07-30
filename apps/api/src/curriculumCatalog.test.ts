import assert from 'node:assert/strict';
import test from 'node:test';

import { readAdminCurriculumCatalog } from './curriculumCatalog.js';

test('returns the shared admin curriculum grade catalog', () => {
  assert.deepEqual(readAdminCurriculumCatalog().grades, [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  ]);
});
