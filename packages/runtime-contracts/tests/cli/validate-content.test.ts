import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(packageRoot, '../..');
const cliPath = resolve(packageRoot, 'dist/cli/validate-content.js');
const validScene = resolve(
  packageRoot,
  'fixtures/grade-6/whole-numbers-structured-response.scene.json',
);
const invalidScene = resolve(packageRoot, 'fixtures/invalid/scenes/unknown-component-version.json');

function runCli(cwd: string, args: readonly string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('validates the Grade 6 fixture when invoked from the repository root', () => {
  const sceneFromRoot = 'packages/runtime-contracts/fixtures/grade-6/whole-numbers-structured-response.scene.json';
  const result = runCli(repoRoot, [sceneFromRoot]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, new RegExp(`^OK ${escapeRegExp(validScene)}\\r?\\n$`));
});

test('validates the Grade 6 fixture when invoked from the package directory', () => {
  const result = runCli(packageRoot, [
    'fixtures/grade-6/whole-numbers-structured-response.scene.json',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^OK .+whole-numbers-structured-response\.scene\.json\r?\n$/);
});

test('resolves its default registry independently of the current directory', (context) => {
  const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'kitabu-content-cli-'));
  context.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

  const result = runCli(temporaryDirectory, [validScene]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^OK /);
});

test('reports actionable validation errors and exits one for invalid content', () => {
  const result = runCli(repoRoot, [invalidScene]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, new RegExp(`^INVALID ${escapeRegExp(invalidScene)}\\r?\\n`));
  assert.match(result.stderr, /\$\.identity \[scene\.identity_required\] identity must be an object\./);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
