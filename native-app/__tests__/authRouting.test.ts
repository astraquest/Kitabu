import {
  getHomeViewForRequestedRole,
  getPrimaryHomeView,
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
});
