import type { AuthenticatedUser } from './types.js';

export function resolveAssignmentSchoolId(user: AuthenticatedUser, requestedSchoolId?: string) {
  if (user.roles.includes('platform_admin')) {
    if (!requestedSchoolId) throw new Error('Select a school');
    return requestedSchoolId;
  }
  if (!user.schoolId) throw new Error('Teacher must belong to a school');
  return user.schoolId;
}
