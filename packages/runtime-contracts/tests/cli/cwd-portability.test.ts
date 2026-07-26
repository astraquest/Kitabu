import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = resolve(packageRoot, '../..');
const tsxCli = fileURLToPath(import.meta.resolve('tsx/cli'));
const validateContentCli = resolve(packageRoot, 'src/cli/validate-content.ts');
const checkIntegrityCli = resolve(packageRoot, 'src/cli/check-fixture-integrity.ts');

interface WorkingDirectoryCase {
  name: string;
  cwd: string;
  scenePath: string;
  fixturesPath: string;
  repositoryPath: string;
}

function runSourceCli(cwd: string, cli: string, args: readonly string[]) {
  return spawnSync(process.execPath, [tsxCli, cli, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function temporaryDirectory(context: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), 'kitabu-runtime-cwd-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('source CLIs resolve paths from repository, package, and unrelated working directories', (context) => {
  const sceneWithinPackage = 'fixtures/grade-6/whole-numbers-structured-response.scene.json';
  const fixturesWithinPackage = 'fixtures/grade-6';
  const cases: WorkingDirectoryCase[] = [
    {
      name: 'repository root',
      cwd: repositoryRoot,
      scenePath: `packages/runtime-contracts/${sceneWithinPackage}`,
      fixturesPath: `packages/runtime-contracts/${fixturesWithinPackage}`,
      repositoryPath: '.',
    },
    {
      name: 'package root',
      cwd: packageRoot,
      scenePath: sceneWithinPackage,
      fixturesPath: fixturesWithinPackage,
      repositoryPath: '../..',
    },
    {
      name: 'unrelated temporary directory',
      cwd: temporaryDirectory(context),
      scenePath: resolve(packageRoot, sceneWithinPackage),
      fixturesPath: resolve(packageRoot, fixturesWithinPackage),
      repositoryPath: repositoryRoot,
    },
  ];

  for (const item of cases) {
    const validation = runSourceCli(item.cwd, validateContentCli, [item.scenePath]);
    assert.equal(validation.status, 0, `${item.name}: ${validation.stderr}`);
    assert.equal(validation.stderr, '', item.name);
    assert.match(validation.stdout, /^OK .+whole-numbers-structured-response\.scene\.json\r?\n$/);

    const integrity = runSourceCli(item.cwd, checkIntegrityCli, [
      '--repository-root',
      item.repositoryPath,
      item.fixturesPath,
    ]);
    assert.equal(integrity.status, 0, `${item.name}: ${integrity.stderr}`);
    assert.equal(integrity.stderr, '', item.name);
    assert.match(integrity.stdout, /^Fixture integrity passed for \d+ JSON files\.\r?\n$/);
  }
});
