import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isKenyaCbcScope,
  normalizeCountryCode,
  resolveCurriculumScope
} from './curriculumScope.js';

test('maps supported two-letter, three-letter, and country-name values to canonical scope', () => {
  assert.equal(normalizeCountryCode('UG'), 'UGA');
  assert.equal(normalizeCountryCode('Tanzania'), 'TZA');
  assert.deepEqual(resolveCurriculumScope({ countryCode: 'RW' }), {
    countryCode: 'RWA',
    countryName: 'Rwanda',
    curriculumCode: 'REB-CBC'
  });
  assert.equal(resolveCurriculumScope({ countryCode: 'ET' }).curriculumCode, 'ENC');
});

test('country is authoritative when a client submits a mismatched curriculum', () => {
  const scope = resolveCurriculumScope({ countryCode: 'UG', curriculumCode: 'CBC' });
  assert.equal(scope.curriculumCode, 'NCDC');
  assert.equal(isKenyaCbcScope(scope), false);
  assert.equal(isKenyaCbcScope(resolveCurriculumScope({ countryCode: 'KE' })), true);
});
