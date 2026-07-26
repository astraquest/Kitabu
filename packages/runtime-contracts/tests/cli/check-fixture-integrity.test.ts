import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';

import { checkFixtureIntegrity } from '../../src/cli/check-fixture-integrity.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const grade6Fixtures = resolve(repositoryRoot, 'packages/runtime-contracts/fixtures/grade-6');
const sourceFixture = resolve(grade6Fixtures, 'whole-numbers-source.json');

interface SourceFixture {
  fixtureId: string;
  repositoryReferences: {
    normalizedCurriculum: { path: string; sha256: string };
  };
}

function readSourceFixture(): SourceFixture {
  return JSON.parse(readFileSync(sourceFixture, 'utf8')) as SourceFixture;
}

function temporaryDirectory(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), 'kitabu-fixture-integrity-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeFixture(directory: string, name: string, value: unknown): string {
  const path = join(directory, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

test('accepts the current Grade 6 fixtures and their pinned repository sources', () => {
  const result = checkFixtureIntegrity([grade6Fixtures], { repositoryRoot });

  assert.equal(result.ok, true, result.issues.map((issue) => issue.message).join('\n'));
  assert.ok(result.checkedFiles.some((path) => path.endsWith('whole-numbers-source.json')));
  assert.deepEqual(result.issues, []);
});

test('rejects a tampered repository-reference digest', (t) => {
  const fixture = readSourceFixture();
  fixture.repositoryReferences.normalizedCurriculum.sha256 = '0'.repeat(64);
  const path = writeFixture(temporaryDirectory(t), 'tampered-source.json', fixture);

  const result = checkFixtureIntegrity([path], { repositoryRoot });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === 'reference.digest_mismatch'));
});

test('rejects a missing repository reference', (t) => {
  const fixture = readSourceFixture();
  fixture.repositoryReferences.normalizedCurriculum.path = 'missing/curriculum.json';
  const path = writeFixture(temporaryDirectory(t), 'missing-reference.json', fixture);

  const result = checkFixtureIntegrity([path], { repositoryRoot });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === 'reference.missing'));
});

test('rejects duplicate fixture IDs across separate files', (t) => {
  const fixture = readSourceFixture();
  const directory = temporaryDirectory(t);
  writeFixture(directory, 'source-a.json', fixture);
  writeFixture(directory, 'source-b.json', fixture);

  const result = checkFixtureIntegrity([directory], { repositoryRoot });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === 'fixture_id.duplicate'));
});
