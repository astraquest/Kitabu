import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAssignmentSchoolId } from './assignmentTargeting.js';
import type { AuthenticatedUser } from './types.js';

function user(overrides: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 'user-id',
    email: 'user@kitabu.ai',
    fullName: 'Test User',
    emailVerified: true,
    roles: ['teacher'],
    schoolId: 'teacher-school',
    sessionId: null,
    stepUp: false,
    grade: null,
    ...overrides
  };
}

test('platform admins must explicitly select the assignment school', () => {
  const admin = user({ roles: ['platform_admin'], schoolId: null });
  assert.throws(() => resolveAssignmentSchoolId(admin), /Select a school/);
  assert.equal(resolveAssignmentSchoolId(admin, 'target-school'), 'target-school');
});

test('teachers remain restricted to their own school', () => {
  const teacher = user({ roles: ['teacher'], schoolId: 'teacher-school' });
  assert.equal(resolveAssignmentSchoolId(teacher, 'other-school'), 'teacher-school');
});
