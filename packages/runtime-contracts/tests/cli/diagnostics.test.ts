import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cliPath = resolve(packageRoot, 'dist/cli/validate-content.js');
const invalidScene = resolve(
  packageRoot,
  'fixtures/invalid/scenes/unknown-component-version.json',
);

function runCli(args: readonly string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: packageRoot,
    encoding: 'utf8',
  });
}

test('malformed JSON has a concise path-addressed diagnostic and exits two', (context) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'kitabu-cli-diagnostics-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const malformedPath = resolve(directory, 'malformed-scene.json');
  const secret = 'diagnostic-must-not-leak-this-secret';
  writeFileSync(malformedPath, `{"password":"${secret}",`, 'utf8');

  const first = runCli([malformedPath]);
  const second = runCli([malformedPath]);

  assert.equal(first.status, 2);
  assert.equal(first.stdout, '');
  assert.equal(first.stderr, second.stderr, 'the same input must produce the same diagnostic');
  assert.match(first.stderr, new RegExp(`^validate-content: Cannot read JSON ${escapeRegExp(malformedPath)}:`));
  assert.doesNotMatch(first.stderr, /\n\s+at\s|Error:\s/);
  assert.doesNotMatch(first.stderr, new RegExp(escapeRegExp(secret)));
  assert.ok(first.stderr.split(/\r?\n/).length <= 7, 'diagnostic should remain concise');
});

test('semantic validation errors use JSON paths, remain deterministic, and exit one', () => {
  const first = runCli([invalidScene]);
  const second = runCli([invalidScene]);

  assert.equal(first.status, 1);
  assert.equal(first.stdout, '');
  assert.equal(first.stderr, second.stderr, 'the same input must produce the same diagnostic');
  assert.match(first.stderr, new RegExp(`^INVALID ${escapeRegExp(invalidScene)}\r?\n`));
  assert.match(first.stderr, /^  \$\.[^\r\n]+ \[[a-z][a-z0-9_.-]+\] [^\r\n]+$/m);
  assert.doesNotMatch(first.stderr, /\n\s+at\s|Error:\s|password|token|authorization/i);
  assert.ok(first.stderr.split(/\r?\n/).length <= 16, 'diagnostic should remain concise');
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
