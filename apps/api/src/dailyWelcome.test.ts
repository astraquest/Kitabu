import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyStudentWelcomeText,
  extractFirstName,
  getLocalCalendarDateKey,
  isStudentDailyWelcomeUser,
  isValidLocalDateKey
} from './dailyWelcome.js';

test('extracts only the first whitespace-delimited name token', () => {
  assert.equal(extractFirstName(' Amina '), 'Amina');
  assert.equal(extractFirstName('Amina Wanjiku'), 'Amina');
  assert.equal(extractFirstName('Amina Wanjiku Otieno'), 'Amina');
});

test('builds the exact daily welcome text', () => {
  assert.equal(
    buildDailyStudentWelcomeText('Amina Wanjiku'),
    'Hi Amina, welcome back to Kitabu. Let’s get started.'
  );
});

test('rejects unauthenticated and non-student welcome users', () => {
  assert.equal(isStudentDailyWelcomeUser(null), false);
  assert.equal(isStudentDailyWelcomeUser(undefined), false);
  assert.equal(isStudentDailyWelcomeUser({ roles: ['parent'] }), false);
  assert.equal(isStudentDailyWelcomeUser({ roles: ['teacher'] }), false);
  assert.equal(isStudentDailyWelcomeUser({ roles: ['student'] }), true);
});

test('validates local calendar dates and makes the next day eligible', () => {
  assert.equal(isValidLocalDateKey('2026-08-12'), true);
  assert.equal(isValidLocalDateKey('2026-02-29'), false);
  assert.equal(isValidLocalDateKey('2026-8-12'), false);

  const delivered = new Set<string>();
  const firstDay = getLocalCalendarDateKey(new Date(2026, 7, 12, 8));
  const nextDay = getLocalCalendarDateKey(new Date(2026, 7, 13, 8));
  const deliveryKey = (date: string) => `student-1:${date}`;
  assert.equal(delivered.has(deliveryKey(firstDay)), false);
  delivered.add(deliveryKey(firstDay));
  assert.equal(delivered.has(deliveryKey(firstDay)), true);
  assert.equal(delivered.has(deliveryKey(nextDay)), false);
});

test('falls back to no welcome text when the captured name is empty', () => {
  assert.equal(buildDailyStudentWelcomeText('   '), null);
  assert.equal(buildDailyStudentWelcomeText(null), null);
});
