import assert from 'node:assert/strict';
import test from 'node:test';

process.env.KITABU_RUNTIME_ENV = 'test';
process.env.KITABU_NODE_ENV = 'test';
process.env.KITABU_DATABASE_URL ??= 'postgres://kitabu:kitabu@localhost:5432/kitabu';
process.env.KITABU_REDIS_URL ??= 'redis://localhost:6379';
process.env.KITABU_JWT_ISSUER ??= 'kitabu-test';
process.env.KITABU_JWT_AUDIENCE ??= 'kitabu-test';
process.env.KITABU_JWT_PRIVATE_KEY ??= 'test-private-key';
process.env.KITABU_JWT_PUBLIC_KEY ??= 'test-public-key';

const {
  claimTtsJobs,
  claimTtsJobsForArtifacts,
  completeTtsJob,
  enqueueTtsJob,
  failTtsJob
} = await import('./repositories.js');
const { db, redis } = await import('./db.js');

test.after(async () => {
  await redis.quit().catch(() => undefined);
  await db.end().catch(() => undefined);
});

function fakeClient(handler: (text: string, values: unknown[]) => unknown) {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  return {
    queries,
    query: async (text: string, values: unknown[] = []) => {
      queries.push({ text, values });
      return { rows: handler(text, values) };
    }
  } as any;
}

test('enqueue uses deterministic artifact/job conflict paths for idempotent retries', async () => {
  const client = fakeClient(text => {
    if (text.includes('INSERT INTO tts_artifacts')) {
      return [{ id: 'artifact-1', status: 'pending' }];
    }
    return [{ id: 'job-1', artifact_id: 'artifact-1', status: 'pending' }];
  });
  await enqueueTtsJob(client, {
    cacheKey: 'key-1', normalizedText: 'Prompt', avatarVoice: 'Samora', geminiVoice: 'Puck', geminiModel: 'tts-v1'
  });
  await enqueueTtsJob(client, {
    cacheKey: 'key-1', normalizedText: 'Prompt', avatarVoice: 'Samora', geminiVoice: 'Puck', geminiModel: 'tts-v1'
  });

  assert.equal(client.queries.length, 4);
  assert.match(client.queries[0].text, /ON CONFLICT \(cache_key\)/);
  assert.match(client.queries[0].text, /status = 'pending' AND tts_artifacts\.provider IS NOT NULL/);
  assert.match(client.queries[0].text, /THEN tts_artifacts\.provider/);
  assert.equal(client.queries[1].values.at(-1), false);
  assert.match(client.queries[1].text, /ON CONFLICT \(artifact_id\)/);
});

test('repair reset is guarded while normal enqueue preserves completed jobs', async () => {
  const client = fakeClient(text => {
    if (text.includes('INSERT INTO tts_artifacts')) {
      return [{ id: 'artifact-1', status: 'pending' }];
    }
    return [{ id: 'job-1', artifact_id: 'artifact-1', status: 'pending' }];
  });

  await enqueueTtsJob(client, {
    cacheKey: 'key-1', normalizedText: 'Prompt', avatarVoice: 'Barake', geminiVoice: 'Charon', geminiModel: 'tts-v1',
    repairReadyMissingStorage: true
  });
  await enqueueTtsJob(client, {
    cacheKey: 'key-1', normalizedText: 'Prompt', avatarVoice: 'Barake', geminiVoice: 'Charon', geminiModel: 'tts-v1'
  });

  const repairArtifactQuery = client.queries[0];
  const repairJobQuery = client.queries[1];
  const normalArtifactQuery = client.queries[2];
  const normalJobQuery = client.queries[3];
  for (const query of [repairArtifactQuery, normalArtifactQuery]) {
    assert.match(query.text, /WHEN \$14::boolean AND tts_artifacts\.status = 'ready'/);
  }
  assert.equal(repairArtifactQuery.values.at(-2), true);
  assert.equal(repairArtifactQuery.values.at(-1), false);
  assert.equal(normalArtifactQuery.values.at(-2), false);
  assert.equal(normalArtifactQuery.values.at(-1), false);
  for (const query of [repairJobQuery, normalJobQuery]) {
    assert.match(query.text, /WHEN \(\$11::boolean OR \$12::boolean\) AND tts_jobs\.status IN \('completed', 'failed'\) THEN 'pending'/);
    assert.match(query.text, /WHEN tts_jobs\.status = 'processing' THEN tts_jobs\.locked_by/);
  }
  assert.equal(repairJobQuery.values.at(-2), true);
  assert.equal(repairJobQuery.values.at(-1), false);
  assert.equal(normalJobQuery.values.at(-2), false);
  assert.equal(normalJobQuery.values.at(-1), false);
  assert.match(normalJobQuery.text, /WHEN tts_jobs\.status = 'completed' THEN tts_jobs\.status/);
});

test('claim, completion, and bounded failure use leases and retry timestamps', async () => {
  const claimClient = fakeClient(text => text.includes('WITH candidates')
    ? [{ id: 'job-1', artifact_id: 'artifact-1', attempts: 1, status: 'processing' }]
    : []);
  const claimed = await claimTtsJobs(claimClient, 2, 'worker-1', 30);
  assert.equal(claimed.length, 1);
  assert.match(claimClient.queries[0].text, /SKIP LOCKED/);
  assert.match(claimClient.queries[0].text, /attempts = j\.attempts \+ 1/);

  const scopedClaimClient = fakeClient(text => text.includes('WITH candidates')
    ? [{ id: 'job-1', artifact_id: 'artifact-1', attempts: 1, status: 'processing' }]
    : []);
  const scopedClaimed = await claimTtsJobsForArtifacts(scopedClaimClient, ['00000000-0000-0000-0000-000000000001'], 2, 'worker-1', 30);
  assert.equal(scopedClaimed.length, 1);
  assert.match(scopedClaimClient.queries[0].text, /a\.id = ANY\(\$5::uuid\[\]\)/);
  assert.deepEqual(scopedClaimClient.queries[0].values.at(-1), ['00000000-0000-0000-0000-000000000001']);

  const completeClient = fakeClient(text => text.includes('SELECT status, locked_by')
    ? [{ status: 'processing', locked_by: 'worker-1' }]
    : text.includes('UPDATE tts_artifacts')
      ? [{ id: 'artifact-1', status: 'ready' }]
      : []);
  await completeTtsJob(completeClient, 'job-1', Buffer.from('audio'), 'audio/wav', 'hash', 'worker-1');
  assert.match(completeClient.queries[1].text, /locked_by = \$5/);
  assert.match(completeClient.queries[2].text, /status = 'completed'/);

  const failClient = fakeClient(text => text.includes('UPDATE tts_jobs') ? [{ attempts: 3 }] : []);
  await failTtsJob(failClient, 'job-1', 'Gemini unavailable', 3, 60, 'worker-1');
  assert.match(failClient.queries[0].text, /attempts >= \$2/);
  assert.match(failClient.queries[0].text, /INTERVAL '1 second'/);
  assert.match(failClient.queries[1].text, /retry_count = j\.attempts/);
});

test('an unowned completion cannot update a worker-owned processing job', async () => {
  const client = fakeClient(text => text.includes('SELECT status, locked_by')
    ? [{ status: 'processing', locked_by: 'worker-1' }]
    : []);
  const completed = await completeTtsJob(client, 'job-1', Buffer.from('audio'), 'audio/wav', 'hash');
  assert.equal(completed, null);
  assert.equal(client.queries.length, 1);
  assert.match(client.queries[0].text, /FOR UPDATE/);
});
