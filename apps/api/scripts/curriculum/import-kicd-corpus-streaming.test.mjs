import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeDatabaseLogicalDigest,
  computeLogicalDigest,
  summarizeDatabaseDiff,
} from './import-kicd-corpus.mjs';

const desiredRun = {
  type: 'ingestionRun',
  id: '11111111-1111-5111-8111-111111111111',
  runType: 'official_import',
  dataVersion: '2025',
  summary: { grade: 'Grade 11' },
  countryCode: 'KEN',
  curriculumCode: 'CBC',
  runKey: 'grade-11',
  releaseId: '22222222-2222-5222-8222-222222222222',
  contentSha256: 'a'.repeat(64),
};

function planFor(run = desiredRun) {
  const rows = { ingestionRuns: [run] };
  return { rows, logicalDigest: computeLogicalDigest(rows) };
}

function clientFor(run) {
  return {
    async query(sql) {
      assert.match(sql, /FROM curriculum_ingestion_runs/);
      const { type: _type, ...databaseRow } = run;
      return { rows: [databaseRow] };
    },
  };
}

test('streamed database verification preserves the canonical logical digest', async () => {
  const plan = planFor();
  assert.equal(await computeDatabaseLogicalDigest(clientFor(desiredRun), plan), plan.logicalDigest);
  assert.deepEqual(await summarizeDatabaseDiff(clientFor(desiredRun), plan), {
    inserts: 0,
    updates: 0,
    unchanged: 1,
    stalePreserved: 0,
    desiredDigest: plan.logicalDigest,
    currentDigest: plan.logicalDigest,
  });
});

test('streamed database diff detects a changed persisted row', async () => {
  const plan = planFor();
  const persisted = { ...desiredRun, dataVersion: '2024' };
  const diff = await summarizeDatabaseDiff(clientFor(persisted), plan);
  assert.equal(diff.updates, 1);
  assert.equal(diff.unchanged, 0);
  assert.notEqual(diff.currentDigest, plan.logicalDigest);
});
