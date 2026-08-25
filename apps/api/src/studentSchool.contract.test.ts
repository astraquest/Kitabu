import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryPath = resolve(process.cwd(), 'src/repositories.ts');
const serverPath = resolve(process.cwd(), 'src/server.ts');
const authServicePath = resolve(process.cwd(), '../../native-app/src/services/authService.ts');

test('student school self-service contract is student-only, transactional, and audited', async () => {
  const [repository, server] = await Promise.all([
    readFile(repositoryPath, 'utf8'),
    readFile(serverPath, 'utf8'),
  ]);

  assert.match(repository, /export async function updateStudentSchoolFromDirectory/);
  assert.match(repository, /createOrReuseOnboardingSchoolFromCatalog\(client, input\.schoolDirectoryId\)/);
  assert.match(repository, /role = 'student'/);
  assert.match(repository, /onboarding_personalization = COALESCE\(onboarding_personalization, '\{\}'::jsonb\)/);
  assert.match(repository, /jsonb_build_object\('school', \$4::text, 'county', \$3::text\)/);
  assert.match(repository, /updated_at = NOW\(\)/);
  assert.match(repository, /regexp_replace\(lower\(btrim\(COALESCE\(s\.county, s\.location\)\)\)/);
  assert.match(repository, /county\|city/);

  assert.match(server, /app\.patch\('\/me\/school'/);
  assert.match(server, /requireRoles\(request, reply, \['student'\]\)/);
  assert.match(server, /studentSchoolSchema/);
  assert.match(server, /schoolDirectoryId: z\.string\(\)\.uuid\(\)/);
  assert.match(server, /withTransaction\(async client =>/);
  assert.match(server, /'student\.school\.updated'/);
  assert.match(server, /const accessToken = await signAccessToken/);
});

test('native school mutation preserves the refresh token while persisting the returned session', async () => {
  const source = await readFile(authServicePath, 'utf8');
  assert.match(source, /export async function updateMySchool\(schoolDirectoryId: string\)/);
  assert.match(source, /apiJsonRequest[\s\S]*?'\/me\/school'/);
  assert.match(source, /method: 'PATCH'/);
  assert.match(source, /refreshToken: session\.refreshToken/);
  assert.match(source, /await persistAuthSession\(nextSession\)/);
});
