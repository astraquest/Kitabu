import assert from 'node:assert/strict';
import test from 'node:test';
import { listGeneratedBooksForUser } from './generatedBooks.js';
import type { AuthenticatedUser } from './types.js';

const demoStudent: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000001',
  schoolId: null,
  sessionId: null,
  email: 'student@kitabu.ai',
  fullName: 'Kitabu Test Student',
  emailVerified: true,
  roles: ['student'],
  gender: 'not_specified',
  grade: 'Grade 6',
  countryCode: 'KEN',
  curriculumCode: 'CBC',
  onboardingCompleted: true,
  stepUp: false,
};

test('scopes all-access library results to selected Kenya Grade 6 books', async () => {
  const books = await listGeneratedBooksForUser(demoStudent, {
    grade: 'Grade 6',
    country: 'KEN',
    curriculum: 'CBC',
  });

  assert.ok(books.length > 0);
  assert.ok(books.every(book => book.country === 'KEN'));
  assert.ok(books.every(book => book.curriculum === 'CBC'));
  assert.equal(books.some(book => book.country === 'ETH' || book.curriculum === 'ENC'), false);
});

test('scopes all-access library results to selected Ethiopia Grade 6 books', async () => {
  const books = await listGeneratedBooksForUser(demoStudent, {
    grade: 'Grade 6',
    country: 'Ethiopia',
    curriculum: 'Ethiopian national curriculum',
  });

  assert.ok(books.length > 0);
  assert.ok(books.every(book => book.country === 'ETH'));
  assert.ok(books.every(book => book.curriculum === 'ENC'));
  assert.equal(books.some(book => book.country === 'KEN' || book.curriculum === 'CBC'), false);
});
