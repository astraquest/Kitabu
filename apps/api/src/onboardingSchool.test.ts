import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSupportedOnboardingCounty,
  normalizeOnboardingSchoolInput
} from './onboardingSchool.js';

test('accepts supported onboarding county labels and their app aliases', () => {
  assert.equal(isSupportedOnboardingCounty('Nairobi City'), true);
  assert.equal(isSupportedOnboardingCounty(' Nairobi County '), true);
  assert.equal(isSupportedOnboardingCounty('West Pokot'), true);
});

test('rejects unsupported or arbitrary onboarding county values', () => {
  assert.equal(isSupportedOnboardingCounty('Atlantis'), false);
  assert.equal(isSupportedOnboardingCounty('00000000-0000-0000-0000-000000000000'), false);
  assert.equal(isSupportedOnboardingCounty(''), false);
});

test('normalizes school and county identity for duplicate reuse', () => {
  const first = normalizeOnboardingSchoolInput({
    name: '  Bright\tFuture  Academy ',
    county: ' Nairobi City '
  });
  const equivalent = normalizeOnboardingSchoolInput({
    name: 'Bright Future Academy',
    county: 'nairobi city'
  });
  const otherCounty = normalizeOnboardingSchoolInput({
    name: 'Bright Future Academy',
    county: 'Mombasa'
  });

  assert.deepEqual(first, {
    name: 'Bright Future Academy',
    county: 'Nairobi City',
    identity: 'bright future academy\u0000nairobi city'
  });
  assert.equal(first.identity, equivalent.identity);
  assert.notEqual(first.identity, otherCounty.identity);
});
