import type { BundleReleaseChannel } from '@kitabu/runtime-contracts';
import { db } from '../db.js';
import { validatePublishableBundle, type PublishableBundle } from './publishingValidation.js';
export { validatePublishableBundle, type PublishableBundle } from './publishingValidation.js';

export async function createInteractiveBundleDraft(bundle: PublishableBundle, actorUserId: string) {
  const channel = bundle.manifest?.release?.channel;
  if (!['development', 'preview', 'staging', 'production'].includes(String(channel))) {
    return { created: false as const, issues: [{ code: 'manifest.invalid' as const, path: 'manifest.release.channel', message: 'valid release channel is required' }] };
  }
  const validation = validatePublishableBundle(bundle, channel);
  if (!validation.valid) return { created: false as const, issues: validation.issues };
  const manifest = bundle.manifest;
  const result = await db.query(
    `INSERT INTO interactive_learning_bundles
      (bundle_id, revision, sha256, channel, release_id, manifest, payload, created_by)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
     ON CONFLICT (bundle_id, revision) DO NOTHING
     RETURNING bundle_id`,
    [manifest.bundleId, manifest.revision, manifest.sha256, manifest.release.channel, manifest.release.releaseId, JSON.stringify(manifest), JSON.stringify(bundle), actorUserId]
  );
  return { created: result.rowCount === 1, issues: [] };
}

export async function approveInteractiveBundle(bundleId: string, revision: string, actorUserId: string) {
  const result = await db.query(
    `UPDATE interactive_learning_bundles SET status='approved', approved_by=$3, approved_at=NOW()
     WHERE bundle_id=$1 AND revision=$2 AND status='draft' RETURNING bundle_id, revision, channel, release_id`,
    [bundleId, revision, actorUserId]
  );
  return result.rows[0] ?? null;
}

export async function moveInteractiveReleasePointer(input: { channel: BundleReleaseChannel; bundleId: string; revision: string; actorUserId: string; action: 'publish' | 'rollback' }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const bundle = await client.query<{ release_id: string; channel: string }>(
      `SELECT release_id, channel FROM interactive_learning_bundles
       WHERE bundle_id=$1 AND revision=$2 AND status='approved' FOR UPDATE`,
      [input.bundleId, input.revision]
    );
    const target = bundle.rows[0];
    if (!target || target.channel !== input.channel) throw new Error('Approved bundle not found for channel');
    await client.query(
      `INSERT INTO interactive_learning_release_history (channel,bundle_id,revision,release_id,action,actor_user_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [input.channel, input.bundleId, input.revision, target.release_id, input.action, input.actorUserId]
    );
    await client.query(
      `INSERT INTO interactive_learning_release_pointers (channel,bundle_id,revision,release_id,updated_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (channel) DO UPDATE SET bundle_id=EXCLUDED.bundle_id, revision=EXCLUDED.revision,
       release_id=EXCLUDED.release_id, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
      [input.channel, input.bundleId, input.revision, target.release_id, input.actorUserId]
    );
    await client.query('COMMIT');
    return { bundleId: input.bundleId, revision: input.revision, releaseId: target.release_id, channel: input.channel };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getInteractiveRelease(channel: BundleReleaseChannel) {
  const result = await db.query(
    `SELECT p.channel,p.bundle_id,p.revision,p.release_id,p.updated_at,b.manifest,b.payload
     FROM interactive_learning_release_pointers p JOIN interactive_learning_bundles b
       ON b.bundle_id=p.bundle_id AND b.revision=p.revision WHERE p.channel=$1`,
    [channel]
  );
  return result.rows[0] ?? null;
}
