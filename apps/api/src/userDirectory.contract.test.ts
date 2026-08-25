import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryPath = resolve(process.cwd(), 'src/repositories.ts');
const serverPath = resolve(process.cwd(), 'src/server.ts');
const adminAppPath = resolve(process.cwd(), '../admin-web/app.js');

test('admin user directory contract is student-only, scoped, filtered and paginated', async () => {
  const [repository, server] = await Promise.all([
    readFile(repositoryPath, 'utf8'),
    readFile(serverPath, 'utf8')
  ]);
  const start = repository.indexOf('export async function listAdminUserDirectory(');
  const end = repository.indexOf('export async function getAdminStudentAnalytics(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = repository.slice(start, end);
  const rowsStart = repository.indexOf('function adminUserDirectoryRowsSql()');
  const rowsEnd = repository.indexOf('function mapAdminUserRecord', rowsStart);
  const rowsSql = repository.slice(rowsStart, rowsEnd);
  assert.match(repository, /user_roles student_role/);
  assert.doesNotMatch(rowsSql, /LEFT JOIN (submissions|user_curriculum_progress|weekly_exam_attempts|ai_usage_events)/);
  assert.match(rowsSql, /activity_rows AS/);
  assert.match(rowsSql, /subscription_rows AS/);
  assert.match(rowsSql, /latest_subscription_rows AS/);
  assert.match(section, /LIMIT \$9 OFFSET \$10/);
  assert.match(section, /ORDER BY \$\{adminUserDirectoryOrderBy/);
  assert.match(repository, /student_role\.role = 'student'/);
  assert.match(repository, /school_id::text = \$6/);
  assert.match(repository, /presence_last_seen_at >= NOW\(\) - INTERVAL '90 seconds'/);
  assert.match(repository, /schoolCountyQueryValues\(input\.county\)/);
  assert.match(repository, /county_facets/);
  assert.match(repository, /grade_facets/);
  assert.match(repository, /school_facets/);
  assert.match(repository, /status_facets/);
  assert.match(repository, /created_at DESC, id ASC/);
  assert.match(repository, /last_activity DESC, id ASC/);
  assert.match(server, /app\.get\('\/admin\/users\/directory'/);
  assert.match(server, /schoolId: z\.union\(\[z\.string\(\)\.uuid\(\), z\.literal\('none'\)\]\)/);
  assert.match(server, /status: z\.enum\(\['Online', 'Offline'\]\)\.optional\(\)/);
  assert.match(server, /sort: z\.enum\(\['name', 'createdAt', 'lastActive'\]\)/);
  assert.match(server, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(50\)\.default\(50\)/);
  assert.match(server, /offset: z\.coerce\.number\(\)\.int\(\)\.min\(0\)\.default\(0\)/);
});

test('admin Users UI contract uses independent directory state and server query wiring', async () => {
  const app = await readFile(adminAppPath, 'utf8');
  assert.match(app, /userDirectory: \{/);
  assert.match(app, /\/admin\/users\/directory\?/);
  assert.match(app, /userDirectoryScheduleSearch\(\)/);
  assert.match(app, /invalidateUserDirectoryRequest\(\)/);
  assert.match(app, /data-user-directory-page/);
  assert.match(app, /data-user-directory-county/);
  assert.match(app, /data-user-directory-school/);
  assert.match(app, /data-user-directory-status/);
  assert.match(app, /data-user-directory-sort/);
  assert.match(app, /schoolDirectory: \{/);
  assert.match(app, /function renderUsers\(\) \{[\s\S]*?state\.data\.userDirectory/);
  assert.match(app, /userDirectorySearchFocusSnapshot/);
  assert.match(app, /users-loading-skeleton/);
});
