import { LocalFilesystemAssetStorage, createEducationalAssetStorage } from '../src/educationalAssets/storage.js';
import { transferLocalEducationalAssets, type LocalEducationalAssetTransferCandidate } from '../src/educationalAssets/transfer.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveBoundedInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_000) : fallback;
}

const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;
if (apply && process.argv.includes('--dry-run')) throw new Error('Use either --apply or --dry-run, not both');
const limit = positiveBoundedInteger(option('--limit'), 100);
const resume = option('--resume')?.trim() || null;

const { appConfig } = await import('../src/config.js');
const { db } = await import('../src/db.js');

try {
  const rows = await db.query<{
    id: string;
    storage_backend: 'local' | 'http-put' | 'supabase';
    storage_key: string;
    content_sha256: string;
    mime_type: string;
  }>(
    `SELECT id, storage_backend, storage_key, content_sha256, mime_type
     FROM educational_assets
     WHERE storage_backend = 'local' AND ($1::text IS NULL OR storage_key > $1)
     ORDER BY storage_key ASC
     LIMIT $2`,
    [resume, limit],
  );
  const candidates: LocalEducationalAssetTransferCandidate[] = rows.rows.map(row => ({
    id: row.id,
    storageBackend: row.storage_backend,
    storageKey: row.storage_key,
    contentSha256: row.content_sha256,
    mimeType: row.mime_type,
  }));
  const destination = apply ? createEducationalAssetStorage() : undefined;
  if (destination && destination.backend !== 'supabase') {
    throw new Error('KITABU_EDUCATIONAL_ASSET_STORAGE_BACKEND=supabase is required with --apply');
  }
  const result = await transferLocalEducationalAssets(
    candidates,
    new LocalFilesystemAssetStorage(appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT),
    destination,
    { dryRun },
  );
  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    limit,
    resume,
    nextResume: rows.rows.at(-1)?.storage_key ?? null,
    ...result,
  }, null, 2));
} catch {
  console.error(JSON.stringify({ error: 'Educational asset Supabase transfer failed' }));
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
}
