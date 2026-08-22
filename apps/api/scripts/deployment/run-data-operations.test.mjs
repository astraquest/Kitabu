import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  digestInputs,
  databaseStateDigest,
  executeOperationPlan,
  resolveOperationDigests,
  selectPendingOperations,
} from './run-data-operations.mjs';

test('input digests are stable and change with file content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kitabu-data-plan-'));
  await mkdir(path.join(root, 'data'));
  await writeFile(path.join(root, 'data', 'a.json'), '{"value":1}\n');
  const first = await digestInputs(root, ['data']);
  const second = await digestInputs(root, ['data']);
  assert.equal(first, second);
  await writeFile(path.join(root, 'data', 'a.json'), '{"value":2}\n');
  assert.notEqual(await digestInputs(root, ['data']), first);
});

test('school-directory state digest tolerates a pending migration', async () => {
  const queries = [];
  const client = {
    query: async query => {
      queries.push(query);
      return { rows: [{ present: false }] };
    },
  };

  const digest = await databaseStateDigest(client, { state: { kind: 'school-directory' } });

  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(queries.length, 1);
  assert.match(queries[0], /to_regclass/);
});

test('dependency changes invalidate downstream checkpoints', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kitabu-data-dependency-'));
  await writeFile(path.join(root, 'source.json'), 'one');
  await writeFile(path.join(root, 'repair.mjs'), 'one');
  const definitions = [
    { key: 'import', inputs: ['source.json'], preview: [], apply: [['import.mjs']] },
    { key: 'repair', dependencies: ['import'], inputs: ['repair.mjs'], preview: [], apply: [['repair.mjs']] },
  ];
  const first = await resolveOperationDigests(definitions, root);
  const checkpoints = new Map(first.map(item => [item.key, { inputSha256: item.digest }]));
  assert.deepEqual(selectPendingOperations(first, checkpoints).map(item => item.action), ['skip', 'skip']);
  await writeFile(path.join(root, 'source.json'), 'two');
  const second = await resolveOperationDigests(definitions, root);
  assert.deepEqual(selectPendingOperations(second, checkpoints).map(item => item.action), ['apply', 'apply']);
});

test('a database-state mismatch invalidates an otherwise matching checkpoint', () => {
  const operation = { key: 'grade-6', digest: 'a'.repeat(64), state: { kind: 'upper-grade' } };
  const checkpoints = new Map([['grade-6', {
    inputSha256: operation.digest,
    databaseStateSha256: 'b'.repeat(64),
  }]]);
  assert.equal(
    selectPendingOperations([operation], checkpoints, new Set(), new Map([['grade-6', 'b'.repeat(64)]]))[0].action,
    'skip',
  );
  const changed = selectPendingOperations(
    [operation], checkpoints, new Set(), new Map([['grade-6', 'c'.repeat(64)]]),
  )[0];
  assert.equal(changed.action, 'apply');
  assert.equal(changed.reason, 'database-state-changed');
});

test('completed checkpoints resume after interruption and make the next pass zero-write', async () => {
  const operations = ['grade-1', 'grade-2', 'grade-3'].map((key, index) => ({
    key,
    digest: String(index + 1).repeat(64),
    action: 'apply',
    preview: [[`${key}-preview.mjs`]],
    apply: [[`${key}-apply.mjs`]],
  }));
  const checkpoints = new Map();
  let commandCount = 0;
  const commandRunner = async args => {
    commandCount += 1;
    return { args, durationMs: 1, peakRssKiB: 1024, exitCode: 0 };
  };
  const checkpointWriter = async (_client, operation) => {
    checkpoints.set(operation.key, { inputSha256: operation.digest });
  };

  await assert.rejects(
    executeOperationPlan({
      client: {}, operations, releaseSha: 'a'.repeat(40), commandRunner, checkpointWriter, failAfter: 1,
    }),
    /Injected failure/,
  );
  assert.deepEqual([...checkpoints.keys()], ['grade-1']);

  const resumed = selectPendingOperations(operations, checkpoints);
  await executeOperationPlan({
    client: {}, operations: resumed, releaseSha: 'b'.repeat(40), commandRunner, checkpointWriter,
  });
  assert.deepEqual([...checkpoints.keys()], ['grade-1', 'grade-2', 'grade-3']);
  const afterResumeCommandCount = commandCount;

  const finalPass = selectPendingOperations(operations, checkpoints);
  const completed = await executeOperationPlan({
    client: {}, operations: finalPass, releaseSha: 'c'.repeat(40), commandRunner, checkpointWriter,
  });
  assert.deepEqual(completed, []);
  assert.equal(commandCount, afterResumeCommandCount);
});
