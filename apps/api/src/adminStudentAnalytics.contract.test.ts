import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const serverPath = resolve(process.cwd(), 'src/server.ts');
const repositoryPath = resolve(process.cwd(), 'src/repositories.ts');
const modalPath = resolve(process.cwd(), '../../native-app/src/components/StudentDetailsModal.tsx');
const adminWebPath = resolve(process.cwd(), '../admin-web/app.js');

test('admin student analytics route keeps the admin auth and target scope contract', async () => {
  const source = await readFile(serverPath, 'utf8');
  const start = source.indexOf("app.get('/admin/users/:userId/analytics'");
  const end = source.indexOf("app.patch('/admin/users/:userId/profile'", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = source.slice(start, end);

  assert.match(section, /requireRoles\(request, reply, \['school_admin', 'platform_admin'\]/);
  assert.match(section, /requireStepUp: needsStepUp/);
  assert.match(section, /adminStudentParamsSchema\.parse\(request\.params\)/);
  assert.match(section, /getAdminStudentAnalytics\(request\.user!, params\.userId\)/);
  assert.match(section, /reply\.notFound\('Student not found'\)/);
});

test('admin student analytics repository requires a student role and preserves school scoping', async () => {
  const source = await readFile(repositoryPath, 'utf8');
  const start = source.indexOf('export async function getAdminStudentAnalytics(');
  const end = source.indexOf('export async function updateAdminStudentProfile(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = source.slice(start, end);

  assert.match(section, /student_role\.role = 'student'/);
  assert.match(section, /u\.school_id = \$3/);
  assert.match(section, /sub\.status IN \('Completed', 'Late'\)/);
  assert.match(section, /attempt\.status = 'completed'/);
  assert.match(section, /progress\.quiz_score IS NOT NULL/);
  assert.match(section, /progressive_lesson_attempts attempt/);
  assert.match(section, /CURRENT_DATE - INTERVAL '6 days'/);
  assert.match(section, /diagnostic_answers da/);
  assert.match(section, /JOIN diagnostic_sessions ds/);
  assert.match(section, /ds\.status = 'completed'/);
  assert.match(section, /DATE_TRUNC\('day', CURRENT_DATE\) - INTERVAL '6 days'/);
  assert.match(section, /wrongAnswers/);
  assert.match(section, /subjectId: row\.subject_id/);
  assert.match(section, /remedial:/);
  assert.match(section, /overallScore: .*null/);
});

test('shared student details modal contains no demo analytics or identity fallbacks', async () => {
  const source = await readFile(modalPath, 'utf8');
  assert.doesNotMatch(source, /RECENT_ACTIVITY|WEEKLY_STATS|ABC High School|student@example\.com|assignmentsAttempted/);
  assert.doesNotMatch(source, /Algebra Quiz|Biology Reading|World War II Essay/);
  assert.match(source, /getAdminStudentAnalytics\(adminStudentId\)/);
  assert.match(source, /No scored activity yet/);
  assert.match(source, /Unable to load analytics/);
});

test('admin web student modal fetches scoped analytics and renders persisted states', async () => {
  const source = await readFile(adminWebPath, 'utf8');
  const start = source.indexOf('function studentDashboardContent(');
  const end = source.indexOf('function studentProfileContent(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const modalSection = source.slice(start, end);

  assert.doesNotMatch(modalSection, /studentPerformanceScore|studentTrendData|Algebra Quiz|Biology Reading|World War II Essay|studentAssignmentCount/);
  assert.match(source, /\/admin\/users\/\$\{encodeURIComponent\(user\.id\)\}\/analytics/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /data-retry-student-analytics/);
  assert.match(modalSection, /overallScore/);
  assert.match(source, /completedAssignments/);
  assert.match(modalSection, /Last 7 days/);
  assert.match(modalSection, /formatStudentTrendDay\(trend\[index\]\?\.date, index\)/);
  assert.match(modalSection, /No scored activity yet/);
  assert.match(modalSection, /No scored performance data yet/);
  assert.match(source, /invalidateStudentAnalytics\(\)/);

  const remedialStart = source.indexOf('function studentRemedialContent(');
  const teacherStart = source.indexOf('function showTeacherStudent(', remedialStart);
  assert.notEqual(remedialStart, -1);
  assert.notEqual(teacherStart, -1);
  const remedialSection = source.slice(remedialStart, teacherStart);
  assert.doesNotMatch(remedialSection, /studentRemedialAttempts|weeklyRemedialAttempts|name-derived|seeded|Algebra Quiz|Biology Reading|World War II Essay/);
  assert.match(remedialSection, /No recorded wrong-answer data in the last 7 days/);
  assert.match(remedialSection, /analyticsState\.data\?\.remedial/);

  const profileStart = source.indexOf('function studentProfileContent(');
  const profileEnd = source.indexOf('function studentInfoRow(', profileStart);
  assert.notEqual(profileStart, -1);
  assert.notEqual(profileEnd, -1);
  assert.doesNotMatch(source.slice(profileStart, profileEnd), /"Today"|`Today`/);
  assert.match(source, /lastActiveAt/);
  assert.match(source, /formatStudentLastActive\(user\)/);
});
