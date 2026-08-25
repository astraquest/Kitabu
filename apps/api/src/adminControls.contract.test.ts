import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const appPath = resolve(process.cwd(), '../admin-web/app.js');

test('remaining admin controls are route-scoped and do not fabricate sales or timestamp facts', async () => {
  const app = await readFile(appPath, 'utf8');
  assert.match(app, /routeFilters: \{\}/);
  assert.match(app, /function switchAdminRoute\(route\)/);
  assert.match(app, /const routeFilterDefaults =/);
  assert.match(app, /setSelectionRange\(focus\.start, focus\.end/);
  assert.match(app, /These filters apply to student metrics and signups/);
  assert.doesNotMatch(app, /This Term/);
  assert.match(app, /timeRange: "Last 3 Months"/);
  assert.match(app, /Online Accounts/);
  assert.match(app, /row\.status === "Online"/);
  assert.doesNotMatch(app, /function salesTimeScale\(/);
  assert.doesNotMatch(app, /schoolIndex %/);
  assert.doesNotMatch(app, /fallbackSchools/);
  assert.doesNotMatch(app, /function salesActivityTrend\(/);
  assert.doesNotMatch(app, /data-broadcast-scope/);
  assert.match(app, /metricsUnavailable/);
  assert.match(app, /assigned-school-\$\{agent\.id/);
  assert.doesNotMatch(app, /rows\.slice\(0, 50\)/);

  const assignmentStart = app.indexOf('function teacherAssignmentRows()');
  const assignmentEnd = app.indexOf('function normalizeTeacherStudent', assignmentStart);
  assert.notEqual(assignmentStart, -1);
  assert.doesNotMatch(app.slice(assignmentStart, assignmentEnd), /new Date\(\)/);
  assert.doesNotMatch(app.slice(assignmentStart, assignmentEnd), /"Recent"|"Stable"/);

  const salesStart = app.indexOf('function renderSales()');
  const teacherStart = app.indexOf('function teacherAssignmentRows()');
  const salesSection = app.slice(salesStart, teacherStart);
  assert.doesNotMatch(salesSection, /data-route-control="timeRange"/);
  assert.match(app, /data-parent-page-size/);
  assert.match(app, /data-parent-page="next"/);
  assert.doesNotMatch(app, /data-parent-period/);
  assert.match(app, /const values = new Set\(kenyaCounties\)/);
});
