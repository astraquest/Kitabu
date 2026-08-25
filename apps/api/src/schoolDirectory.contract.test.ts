import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryPath = resolve(process.cwd(), 'src/repositories.ts');
const serverPath = resolve(process.cwd(), 'src/server.ts');
const packagePath = resolve(process.cwd(), 'package.json');

test('admin school directory contract supports complete filtered pagination and stable sorting', async () => {
  const source = await readFile(repositoryPath, 'utf8');
  const start = source.indexOf('export async function listSchools(');
  const end = source.indexOf('export async function countSchools(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = source.slice(start, end);

  assert.match(section, /grade\?: string \| null/);
  assert.match(section, /sort\?: SchoolDirectorySort/);
  assert.match(section, /direction\?: SchoolDirectoryDirection/);
  assert.match(section, /LIMIT \$6 OFFSET \$7/);
  assert.match(section, /ORDER BY \$\{orderBy\}/);
  assert.match(source, /\$3::text\[\] IS NULL/);
  assert.match(source, /\$4::text IS NULL/);
  assert.match(section, /s\.created_at/);
  assert.match(source, /id ASC/);
  assert.match(source, /schoolDirectoryOrderBy/);
});

test('admin school directory contract normalizes county suffixes and exposes full-result overview facets', async () => {
  const [repository, server, packageJson] = await Promise.all([
    readFile(repositoryPath, 'utf8'),
    readFile(serverPath, 'utf8'),
    readFile(packagePath, 'utf8')
  ]);
  assert.match(repository, /replace\(\/\\s\+county\$\/i, ''\)/);
  assert.match(repository, /export async function getSchoolDirectoryOverview/);
  assert.match(repository, /school_count/);
  assert.match(repository, /countyFacets/);
  assert.match(repository, /gradeFacets/);
  assert.match(repository, /schoolCountyLabel\(row\.county\)/);
  assert.match(repository, /countyResult\.rows\.reduce/);
  assert.match(repository, /highlightsResult/);
  assert.match(repository, /mostActive/);
  assert.match(repository, /bestPerforming/);
  assert.match(repository, /ORDER BY active_learners DESC, id ASC/);
  assert.match(repository, /ORDER BY average_score DESC, id ASC/);
  assert.match(repository, /COUNT\(DISTINCT id\)/);
  assert.match(repository, /export async function countSchools[\s\S]*?JOIN subscription_plans ap ON ap\.id = s\.assigned_plan_id/);
  assert.match(server, /sort: z\.enum\(\['name', 'learnerCount', 'activeLearners', 'engagement', 'averageScore', 'createdAt'\]\)/);
  assert.match(server, /direction: z\.enum\(\['asc', 'desc'\]\)/);
  assert.match(server, /includeOverview: z\.enum\(\['true', 'false'\]\)\.default\('false'\)/);
  assert.match(server, /limit: z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(50\)\.default\(50\)/);
  assert.match(server, /params\.includeOverview\s*\?/);
  assert.match(server, /facets: \{ counties: overview\.countyFacets, grades: overview\.gradeFacets \}/);
  assert.match(server, /highlights: overview\.highlights/);
  assert.match(server, /hasNext: params\.offset \+ schools\.length < total/);
  assert.match(packageJson, /src\/adminStudentAnalytics\.contract\.test\.ts src\/schoolDirectory\.contract\.test\.ts/);
});
