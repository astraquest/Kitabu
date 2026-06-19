import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVerifiedGoogleClaims } from './googleAuth.js';

test('accepts a verified Google identity', () => {
  assert.deepEqual(
    parseVerifiedGoogleClaims({
      sub: 'google-user-1',
      email: 'Learner@Example.com',
      email_verified: true,
      name: 'Kitabu Learner'
    }),
    {
      subject: 'google-user-1',
      email: 'learner@example.com',
      fullName: 'Kitabu Learner'
    }
  );
});

test('uses the email local part when Google does not provide a name', () => {
  assert.deepEqual(
    parseVerifiedGoogleClaims({
      sub: 'google-user-2',
      email: 'learner@example.com',
      email_verified: true
    }),
    {
      subject: 'google-user-2',
      email: 'learner@example.com',
      fullName: 'learner'
    }
  );
});

test('rejects a Google identity without a subject', () => {
  assert.throws(
    () => parseVerifiedGoogleClaims({
      email: 'learner@example.com',
      email_verified: true
    }),
    /verified email/
  );
});

test('rejects a Google identity without an email address', () => {
  assert.throws(
    () => parseVerifiedGoogleClaims({
      sub: 'google-user-3',
      email_verified: true
    }),
    /verified email/
  );
});

test('rejects an unverified Google email', () => {
  assert.throws(
    () => parseVerifiedGoogleClaims({
      sub: 'google-user-1',
      email: 'learner@example.com',
      email_verified: false
    }),
    /verified email/
  );
});
