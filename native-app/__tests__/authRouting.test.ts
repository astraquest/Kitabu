import {
  getHomeViewForRequestedRole,
  getPrimaryHomeView,
  getValidStoredAuthRole,
  resolveAuthenticatedRole,
} from '../src/hooks/useKitabuApp';
import type { AuthRole } from '../src/types/app';

const multiRoleAccountRoles: AuthRole[] = ['student', 'teacher', 'parent'];

describe('authenticated home routing', () => {
  test.each([
    ['student', 'dashboard'],
    ['teacher', 'teachers_portal'],
    ['parent', 'parent_dashboard'],
  ] as const)('honors a freshly selected %s role', (requestedRole, expectedView) => {
    expect(
      getHomeViewForRequestedRole(
        multiRoleAccountRoles,
        'demoaccount@kitabu.ai',
        requestedRole,
      ),
    ).toBe(expectedView);
  });

  test('falls back to default priority when the requested role is absent', () => {
    const roles: AuthRole[] = ['teacher', 'parent'];

    expect(getHomeViewForRequestedRole(roles, 'demoaccount@kitabu.ai', 'student')).toBe(
      getPrimaryHomeView(roles, 'demoaccount@kitabu.ai'),
    );
  });

  test('keeps default routing when no role was freshly selected', () => {
    const roles: AuthRole[] = ['student', 'teacher', 'parent'];

    expect(getHomeViewForRequestedRole(roles, 'demoaccount@kitabu.ai')).toBe('teachers_portal');
  });

  test('records the requested role instead of the teacher-first role', () => {
    expect(resolveAuthenticatedRole(multiRoleAccountRoles, 'student', 'teacher')).toBe('student');
    expect(resolveAuthenticatedRole(multiRoleAccountRoles, 'parent', 'teacher')).toBe('parent');
  });

  test('restores a stored role only while the account still has it', () => {
    expect(getValidStoredAuthRole(multiRoleAccountRoles, 'student')).toBe('student');
    expect(getValidStoredAuthRole(['student', 'parent'], 'teacher')).toBeNull();
    expect(resolveAuthenticatedRole(['student', 'parent'], null, 'teacher')).toBe('parent');
    expect(
      getHomeViewForRequestedRole(['student', 'parent'], 'learner@kitabu.ai', 'parent'),
    ).toBe('parent_dashboard');
  });

  test('keeps admin priority even when a public role is selected', () => {
    expect(
      getHomeViewForRequestedRole(
        ['student', 'teacher', 'school_admin'],
        'admin@kitabu.ai',
        'student',
      ),
    ).toBe('admin_portal');
  });
});
