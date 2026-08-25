import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryPath = resolve(process.cwd(), 'src/repositories.ts');
const serverPath = resolve(process.cwd(), 'src/server.ts');
const adminAppPath = resolve(process.cwd(), '../admin-web/app.js');

test('admin AI usage contract applies validated period and feature predicates to every aggregate', async () => {
  const [repository, server] = await Promise.all([
    readFile(repositoryPath, 'utf8'),
    readFile(serverPath, 'utf8')
  ]);
  const start = repository.indexOf('export async function getAdminAiAnalytics(');
  const end = repository.indexOf('export async function createOnboardingSelectionEvent(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const section = repository.slice(start, end);
  assert.match(section, /options: \{ period\?: 'today' \| 'week' \| 'month'; feature\?: string \}/);
  assert.match(section, /CURRENT_DATE/);
  assert.match(section, /DATE_TRUNC\('week', CURRENT_DATE\)/);
  assert.match(section, /DATE_TRUNC\('month', CURRENT_DATE\)/);
  assert.match(section, /featureParam/);
  assert.match(section, /featureOptions/);
  assert.match(section, /dateRange: \{ period:/);
  assert.match(section, /FROM \(\s*SELECT a\.school_id[\s\S]*GROUP BY a\.school_id/);
  assert.match(section, /FROM \(\s*SELECT a\.user_id[\s\S]*GROUP BY a\.user_id/);
  assert.match(section, /MAX\(price_ksh_cents\)/);
  assert.match(server, /const adminAiUsageQuerySchema = z\.object\(/);
  assert.match(server, /period: z\.enum\(\['today', 'week', 'month'\]\)\.optional\(\)/);
  assert.match(server, /app\.get\('\/admin\/analytics\/ai-usage'/);
  assert.match(server, /getAdminAiAnalytics\(request\.user!, query\)/);
});

test('admin Usage UI keeps period and feature requests separate from lifetime analytics state', async () => {
  const app = await readFile(adminAppPath, 'utf8');
  assert.match(app, /usageDirectory: \{/);
  assert.match(app, /\/admin\/analytics\/ai-usage\?/);
  assert.match(app, /usageDirectoryQueryKey\(\)/);
  assert.match(app, /invalidateUsageAnalyticsRequest\(\)/);
  assert.match(app, /data-usage-retry/);
  assert.match(app, /data-usage-period/);
  assert.match(app, /data-usage-feature/);
  assert.match(app, /function renderUsage\(\) \{[\s\S]*?state\.data\.usageDirectory/);
  assert.match(app, /clearUsageAnalyticsData\(\)/);
  assert.doesNotMatch(app.slice(app.indexOf('function renderUsage()'), app.indexOf('function renderSettings()')), /state\.data\.ai/);
});
