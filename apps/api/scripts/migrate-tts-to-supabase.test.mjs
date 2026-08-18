import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRequiredRecords, parseArgs, runMigration } from './migrate-tts-to-supabase.mjs';

const cues = Array.from({ length: 31 }, (_, index) => ({ id: `cue-${index}`, text: `Cue ${index}` }));

test('TTS migration defaults to the exact 31-record parent catalog and supports dry-run', () => {
  const args = parseArgs(['--dry-run']);
  assert.equal(args.dryRun, true);
  assert.equal(args.expectedCount, 31);
  assert.equal(buildRequiredRecords(cues).length, 31);
});

test('TTS migration rejects unknown arguments and invalid expected counts', () => {
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument/);
  assert.throws(() => parseArgs(['--expected-count', '0']), /positive integer/);
});

test('TTS migration verifies objects before metadata writes and is idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kitabu-tts-migration-'));
  const required = buildRequiredRecords(cues);
  const wav = Buffer.from('RIFF0000WAVE', 'ascii');
  const contentHash = createHash('sha256').update(wav).digest('hex');
  const rows = required.map((record, index) => ({
    id: `artifact-${index}`,
    cache_key: record.cacheKey,
    status: 'ready',
    mime_type: 'audio/wav',
    content_hash: contentHash,
    storage_key: `tts/${record.cacheKey}.wav`,
    storage_backend: 'local',
    storage_url: null
  }));
  const objects = new Map();
  class FakeClient {
    async connect() {}
    async end() {}
    async query(sql, params) {
      if (sql.includes('SELECT id, cache_key')) return { rows, rowCount: rows.length };
      const row = rows.find(candidate => candidate.id === params[0]);
      row.storage_backend = 'supabase';
      row.storage_url = `https://public.test/${row.storage_key}`;
      return { rows: [{ id: row.id }], rowCount: 1 };
    }
  }
  class FakeStorage {
    async put(key, bytes) { objects.set(key, new Uint8Array(bytes)); return { storageKey: key, byteSize: bytes.byteLength }; }
    async read(key) {
      const bytes = objects.get(key);
      if (!bytes) throw new Error('missing object');
      return bytes;
    }
    publicUrl(key) { return `https://public.test/${key}`; }
  }

  try {
    await mkdir(join(root, 'tts'), { recursive: true });
    for (const row of rows) await writeFile(join(root, row.storage_key), wav);
    const first = await runMigration({
      argv: ['--expected-count', '31', '--local-root', root],
      env: { KITABU_DATABASE_URL: 'postgres://test', KITABU_SUPABASE_URL: 'https://supabase.test', KITABU_SUPABASE_SERVICE_ROLE_KEY: 'test-key', KITABU_TTS_STORAGE_BUCKET: 'tts-audio' },
      dependencies: { Client: FakeClient, PARENT_ONBOARDING_TTS_CUES: cues, SupabaseTtsAssetStorage: FakeStorage }
    });
    assert.equal(first.remoteVerified, 31);
    assert.equal(first.updated, 31);
    assert.equal(objects.size, 31);

    const second = await runMigration({
      argv: ['--expected-count', '31', '--local-root', root],
      env: { KITABU_DATABASE_URL: 'postgres://test', KITABU_SUPABASE_URL: 'https://supabase.test', KITABU_SUPABASE_SERVICE_ROLE_KEY: 'test-key', KITABU_TTS_STORAGE_BUCKET: 'tts-audio' },
      dependencies: { Client: FakeClient, PARENT_ONBOARDING_TTS_CUES: cues, SupabaseTtsAssetStorage: FakeStorage }
    });
    assert.equal(second.remoteVerified, 31);
    assert.equal(second.updated, 0);
    assert.equal(second.skipped, 31);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
