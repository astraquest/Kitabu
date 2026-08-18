import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_EXPECTED_COUNT = 31;
const REQUIRED_VOICES = ['Bella'];

function normalizeText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function buildCacheKey(text, voice) {
  const payload = {
    normalizedText: normalizeText(text),
    language: 'en',
    selectedVoice: voice,
    speakingSettings: {},
    pronunciationSettings: {}
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function parseArgs(argv) {
  const result = {
    dryRun: false,
    expectedCount: DEFAULT_EXPECTED_COUNT,
    localRoot: null,
    databaseUrl: null,
    supabaseUrl: null,
    serviceRoleKey: null,
    bucket: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    const [name, inlineValue] = arg.split('=', 2);
    if (name === '--expected-count' || name === '--local-root' || name === '--database-url' || name === '--supabase-url' || name === '--service-role-key' || name === '--bucket') {
      const value = inlineValue ?? argv[++index];
      if (!value) throw new Error(`${name} requires a value`);
      if (name === '--expected-count') {
        const count = Number(value);
        if (!Number.isSafeInteger(count) || count < 1) throw new Error('--expected-count must be a positive integer');
        result.expectedCount = count;
      } else if (name === '--local-root') result.localRoot = value;
      else if (name === '--database-url') result.databaseUrl = value;
      else if (name === '--supabase-url') result.supabaseUrl = value;
      else if (name === '--service-role-key') result.serviceRoleKey = value;
      else if (name === '--bucket') result.bucket = value;
      continue;
    }
    if (arg === '--help') {
      result.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

export function buildRequiredRecords(cues) {
  return cues
    .filter(cue => (cue.language ?? 'en') === 'en')
    .flatMap(cue => REQUIRED_VOICES.map(voice => ({
      cueId: cue.id,
      voice,
      cacheKey: buildCacheKey(cue.text, voice)
    })));
}

function assertSafeStorageKey(storageKey) {
  if (!storageKey || storageKey.includes('\0') || storageKey.startsWith('/') || storageKey.startsWith('\\') || storageKey.split(/[\\/]/).includes('..')) {
    throw new Error('Invalid TTS storage key');
  }
}

function resolveLocalFile(rootDirectory, storageKey) {
  assertSafeStorageKey(storageKey);
  if (!storageKey.toLowerCase().endsWith('.wav')) throw new Error('TTS storage key is not a WAV file');
  const root = resolve(rootDirectory);
  const target = resolve(root, storageKey);
  if (target === root || !target.startsWith(`${root}${sep}`)) throw new Error('TTS storage key escapes local root');
  return target;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isWav(bytes) {
  return bytes.byteLength >= 12 && Buffer.from(bytes).subarray(0, 4).toString('ascii') === 'RIFF' && Buffer.from(bytes).subarray(8, 12).toString('ascii') === 'WAVE';
}

function manifestHash(records) {
  return sha256(Buffer.from(records.map(record => `${record.cache_key}:${record.storage_key}:${record.content_hash}`).sort().join('\n')));
}

function requireExactRecords(rows, required, expectedCount) {
  if (rows.length !== expectedCount || required.length !== expectedCount) {
    throw new Error(`Required TTS record count mismatch: expected ${expectedCount}`);
  }
  const requiredKeys = new Set(required.map(record => record.cacheKey));
  const actualKeys = new Set(rows.map(row => row.cache_key));
  if (actualKeys.size !== rows.length || [...requiredKeys].some(key => !actualKeys.has(key))) {
    throw new Error('Required TTS records do not match the curated English catalog');
  }
}

async function loadRuntimeDependencies() {
  const [{ Client }, { PARENT_ONBOARDING_TTS_CUES }, { SupabaseTtsAssetStorage }] = await Promise.all([
    import('pg'),
    import('../dist/onboardingTts.js'),
    import('../dist/ttsStorage.js')
  ]);
  return { Client, PARENT_ONBOARDING_TTS_CUES, SupabaseTtsAssetStorage };
}

export async function runMigration({ argv = [], env = process.env, dependencies } = {}) {
  const args = parseArgs(argv);
  if (args.help) return { help: true };
  const runtime = dependencies ?? await loadRuntimeDependencies();
  const databaseUrl = args.databaseUrl ?? env.KITABU_DATABASE_URL;
  const localRoot = resolve(process.cwd(), args.localRoot ?? env.KITABU_TTS_STORAGE_ROOT ?? '/app/var/tts-audio');
  if (!databaseUrl) throw new Error('KITABU_DATABASE_URL is required');

  const required = buildRequiredRecords(runtime.PARENT_ONBOARDING_TTS_CUES);
  const client = new runtime.Client({ connectionString: databaseUrl });
  const summary = {
    mode: args.dryRun ? 'dry-run' : 'apply',
    expectedCount: args.expectedCount,
    selectedCount: 0,
    sourceFiles: 0,
    sourceBytes: 0,
    remoteVerified: 0,
    updated: 0,
    skipped: 0,
    manifestSha256: null
  };

  try {
    await client.connect();
    const query = await client.query(
      `SELECT id, cache_key, status, mime_type, content_hash, storage_key, storage_backend, storage_url
       FROM tts_artifacts
       WHERE language = 'en' AND cache_key = ANY($1::text[])
       ORDER BY cache_key`,
      [required.map(record => record.cacheKey)]
    );
    requireExactRecords(query.rows, required, args.expectedCount);
    summary.selectedCount = query.rows.length;

    const sourceRows = [];
    for (const row of query.rows) {
      if (row.status !== 'ready' || row.mime_type !== 'audio/wav' || !/^[a-f0-9]{64}$/.test(row.content_hash ?? '') || !row.storage_key) {
        throw new Error('Required TTS record is not ready for migration');
      }
      const filePath = resolveLocalFile(localRoot, row.storage_key);
      const bytes = await readFile(filePath);
      if (bytes.byteLength === 0 || !isWav(bytes) || sha256(bytes) !== row.content_hash) {
        throw new Error('Required local TTS WAV is missing, empty, invalid, or mismatched');
      }
      sourceRows.push({ row, bytes });
      summary.sourceFiles += 1;
      summary.sourceBytes += bytes.byteLength;
    }
    summary.manifestSha256 = manifestHash(query.rows);
    if (args.dryRun) return summary;

    const supabaseUrl = args.supabaseUrl ?? env.KITABU_SUPABASE_URL;
    const serviceRoleKey = args.serviceRoleKey ?? env.KITABU_SUPABASE_SERVICE_ROLE_KEY;
    const bucket = args.bucket ?? env.KITABU_TTS_STORAGE_BUCKET ?? 'tts-audio';
    if (!supabaseUrl || !serviceRoleKey || !bucket) throw new Error('Supabase TTS storage configuration is incomplete');
    const publicBaseUrl = env.KITABU_TTS_PUBLIC_BASE_URL ?? env.KITABU_TTS_STORAGE_PUBLIC_BASE_URL;
    const storage = new runtime.SupabaseTtsAssetStorage(supabaseUrl, serviceRoleKey, bucket, publicBaseUrl);

    for (const { row, bytes } of sourceRows) {
      let remoteBytes = null;
      if (row.storage_backend === 'supabase') {
        try { remoteBytes = await storage.read(row.storage_key); } catch { remoteBytes = null; }
      }
      const alreadyCorrect = remoteBytes?.byteLength === bytes.byteLength && sha256(remoteBytes) === row.content_hash;
      if (!alreadyCorrect) await storage.put(row.storage_key, bytes);
      const verified = await storage.read(row.storage_key);
      if (verified.byteLength === 0 || verified.byteLength !== bytes.byteLength || sha256(verified) !== row.content_hash) {
        throw new Error('Supabase TTS object verification failed');
      }
      summary.remoteVerified += 1;
      if (alreadyCorrect && row.storage_backend === 'supabase' && row.storage_url === storage.publicUrl(row.storage_key)) {
        summary.skipped += 1;
        continue;
      }
      const updated = await client.query(
        `UPDATE tts_artifacts
         SET storage_backend = 'supabase', storage_url = $2, updated_at = NOW()
         WHERE id = $1 AND content_hash = $3 AND storage_key = $4
         RETURNING id`,
        [row.id, storage.publicUrl(row.storage_key), row.content_hash, row.storage_key]
      );
      if (updated.rowCount !== 1) throw new Error('TTS metadata update was not applied');
      summary.updated += 1;
    }
    return summary;
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = await runMigration({ argv: process.argv.slice(2) });
    console.log(JSON.stringify(result, null, 2));
  } catch {
    console.error('TTS migration failed closed; no local files were deleted.');
    process.exitCode = 1;
  }
}
