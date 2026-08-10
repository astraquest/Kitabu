import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStudentWelcomeTtsText,
  canServeStudentWelcomeTts,
  normalizeStudentFirstName
} from './studentWelcomeCue.js';

test('normalizes whitespace and uses only the first name token', () => {
  assert.equal(normalizeStudentFirstName('  Amina   Wanjiku  '), 'Amina');
  assert.equal(buildStudentWelcomeTtsText('  Amina   Wanjiku  '), "Hi Amina, welcome back to Kitabu. Let's get started");
});

test('student welcome availability is owner-role and preference scoped', () => {
  assert.equal(canServeStudentWelcomeTts({ roles: ['student'], preference: null }), true);
  assert.equal(canServeStudentWelcomeTts({ roles: ['student'], preference: { enabled: true } }), true);
  assert.equal(canServeStudentWelcomeTts({ roles: ['student'], preference: { enabled: false } }), false);
  assert.equal(canServeStudentWelcomeTts({ roles: ['teacher'], preference: null }), false);
});
