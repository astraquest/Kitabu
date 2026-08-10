import { decideEducationalAssetLicense, educationalAssetAttributionRequired } from './licensePolicy.js';
import { sha256EducationalAsset } from './deduplication.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import { validateDownloadedEducationalAsset } from './validation.js';
import { analyzeEducationalAssetNormalization, type EducationalAssetNormalizationResult } from './normalization.js';
import { createEducationalAssetImportManifest, type EducationalAssetImportManifest, type EducationalAssetManifestEntry } from './manifest.js';
import { createEducationalAssetImportReport } from './report.js';
import type { EducationalAssetUsageRestriction } from './types.js';

export interface AssetSyncOptions {
  limit: number;
  dryRun: boolean;
  resumeCursor?: string | null;
  maxRetries?: number;
  revision?: string;
  writeManifest?: (manifest: EducationalAssetImportManifest) => Promise<void>;
  onEvent?: (event: AssetSyncEvent) => void;
}
export type AssetSyncEvent =
  | { type: 'sync.started'; providerKey: string; dryRun: boolean; limit: number }
  | { type: 'sync.discovered'; providerKey: string; discovered: number }
  | { type: 'sync.license_restricted' | 'sync.license_rejected'; providerKey: string }
  | { type: 'sync.download_failed' | 'sync.duplicate' | 'sync.quarantined'; providerKey: string }
  | { type: 'sync.completed'; providerKey: string; dryRun: boolean; counters: AssetSyncCounters };
export interface AssetSyncPersistence {
  ensureProvider(adapter: EducationalAssetAdapter): Promise<void>;
  createRun(adapter: EducationalAssetAdapter, cursor: string | null): Promise<{ id: string }>;
  checkpoint(runId: string, checkpoint: Record<string, unknown>, cursor: string | null): Promise<void>;
  finish(runId: string, counters: AssetSyncCounters): Promise<void>;
  findByContentHash(hash: string): Promise<{ assetId: string } | null>;
  findByVisualHash(visualHash: string): Promise<{ assetId: string } | null>;
  findByProviderIdentity(providerKey: string, providerAssetId: string): Promise<{ assetId: string } | null>;
  appendProvenance(existingAssetId: string, asset: RemoteAsset): Promise<void>;
  save(asset: RemoteAsset, content: Uint8Array, contentHash: string, storageKey: string, normalization: EducationalAssetNormalizationResult): Promise<{ assetId?: string } | void>;
}
export interface AssetSyncCounters { discovered: number; downloaded: number; imported: number; duplicates: number; restricted: number; rejected: number; quarantined: number; errors: number; }
export interface AssetSyncDryRunSummary { licenseAccepted: number; licenseRestricted: number; licenseRejected: number; licenseNeedsReview: number; wouldDownload: number; wouldPublish: number; }
const initialCounters = (): AssetSyncCounters => ({ discovered: 0, downloaded: 0, imported: 0, duplicates: 0, restricted: 0, rejected: 0, quarantined: 0, errors: 0 });

function emitEvent(options: AssetSyncOptions, event: AssetSyncEvent): void {
  try { options.onEvent?.(event); } catch { /* Event reporting must not affect the import. */ }
}

async function retry<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
  let failure: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) { failure = error; if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); }
  }
  throw failure;
}

function storageKey(asset: RemoteAsset, hash: string, usageRestriction: EducationalAssetUsageRestriction) {
  const extension = asset.mimeType === 'image/svg+xml' ? 'svg' : asset.mimeType.split('/')[1] ?? 'bin';
  const prefix = usageRestriction === 'share_alike' ? `restricted/${asset.providerKey}` : asset.providerKey;
  return `${prefix}/${hash}.${extension}`;
}

function usageRestrictionForDecision(decision: ReturnType<typeof decideEducationalAssetLicense>): EducationalAssetUsageRestriction {
  return decision === 'restricted' ? 'share_alike' : 'none';
}

export async function runEducationalAssetSync(adapter: EducationalAssetAdapter, persistence: AssetSyncPersistence, options: AssetSyncOptions) {
  const counters = initialCounters();
  const manifestEntries: EducationalAssetManifestEntry[] = [];
  emitEvent(options, { type: 'sync.started', providerKey: adapter.providerKey, dryRun: options.dryRun, limit: options.limit });
  const discovery = await retry(() => adapter.discover({ limit: Math.max(1, Math.min(options.limit, 100)), cursor: options.resumeCursor }), options.maxRetries ?? 3);
  counters.discovered = discovery.assets.length;
  emitEvent(options, { type: 'sync.discovered', providerKey: adapter.providerKey, discovered: counters.discovered });
  if (options.dryRun) {
    const dryRun = discovery.assets.reduce<AssetSyncDryRunSummary>((summary, asset) => {
      const decision = decideEducationalAssetLicense(asset.license);
      if (decision === 'accepted') {
        summary.licenseAccepted += 1;
        summary.wouldDownload += 1;
        if (!educationalAssetAttributionRequired(asset.license) || Boolean(asset.attribution?.trim())) summary.wouldPublish += 1;
      } else if (decision === 'restricted') {
        summary.licenseRestricted += 1;
        summary.wouldDownload += 1;
      } else if (decision === 'rejected') summary.licenseRejected += 1;
      else summary.licenseNeedsReview += 1;
      return summary;
    }, { licenseAccepted: 0, licenseRestricted: 0, licenseRejected: 0, licenseNeedsReview: 0, wouldDownload: 0, wouldPublish: 0 });
    counters.restricted = dryRun.licenseRestricted;
    counters.rejected = dryRun.licenseRejected + dryRun.licenseNeedsReview;
    for (const asset of discovery.assets) {
      const decision = decideEducationalAssetLicense(asset.license);
      if (decision === 'restricted') emitEvent(options, { type: 'sync.license_restricted', providerKey: adapter.providerKey });
      if (decision === 'rejected' || decision === 'needs-review') emitEvent(options, { type: 'sync.license_rejected', providerKey: adapter.providerKey });
      const storable = decision === 'accepted' || decision === 'restricted';
      manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: storable ? 'imported' : 'rejected', normalizationStatus: storable && asset.mediaType === 'image' ? 'needs-normalization' : 'not-applicable', usageRestriction: usageRestrictionForDecision(decision) });
    }
    const manifest = createEducationalAssetImportManifest({ providerKey: adapter.providerKey, importRunId: null, revision: options.revision ?? '1', cursor: discovery.nextCursor, assets: manifestEntries });
    emitEvent(options, { type: 'sync.completed', providerKey: adapter.providerKey, dryRun: true, counters: { ...counters } });
    return { counters, dryRun, manifest, report: createEducationalAssetImportReport(counters, adapter.providerKey, manifestEntries), nextCursor: discovery.nextCursor, runId: null };
  }

  await persistence.ensureProvider(adapter);
  const run = await persistence.createRun(adapter, options.resumeCursor ?? null);
  for (const asset of discovery.assets) {
    const decision = decideEducationalAssetLicense(asset.license);
    const usageRestriction = usageRestrictionForDecision(decision);
    if (decision !== 'accepted' && decision !== 'restricted') {
      counters.rejected += 1;
      emitEvent(options, { type: 'sync.license_rejected', providerKey: adapter.providerKey });
      manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'rejected', normalizationStatus: 'not-applicable', usageRestriction });
    } else {
      if (usageRestriction === 'share_alike') {
        counters.restricted += 1;
        emitEvent(options, { type: 'sync.license_restricted', providerKey: adapter.providerKey });
      }
      const existingByProvider = await persistence.findByProviderIdentity(asset.providerKey, asset.providerAssetId);
      if (existingByProvider) {
      counters.duplicates += 1;
        emitEvent(options, { type: 'sync.duplicate', providerKey: adapter.providerKey });
        manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: existingByProvider.assetId, mediaType: asset.mediaType, outcome: 'duplicate', normalizationStatus: asset.mediaType === 'image' ? 'needs-normalization' : 'validated-original', usageRestriction });
        await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
        continue;
      }
      let content: Uint8Array;
      try {
        content = await retry(() => adapter.download(asset), options.maxRetries ?? 3);
        counters.downloaded += 1;
      } catch {
        counters.errors += 1;
        emitEvent(options, { type: 'sync.download_failed', providerKey: adapter.providerKey });
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'error', normalizationStatus: 'not-applicable', usageRestriction });
        await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
        continue;
      }
      try {
        validateDownloadedEducationalAsset(content, asset.mimeType);
        const normalization = analyzeEducationalAssetNormalization(content, asset.mimeType);
        if (normalization.status === 'quarantined') {
          counters.quarantined += 1;
          emitEvent(options, { type: 'sync.quarantined', providerKey: adapter.providerKey });
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'quarantined', normalizationStatus: 'quarantined', usageRestriction });
          await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
          continue;
        }
        const hash = sha256EducationalAsset(content);
        const existing = await persistence.findByContentHash(hash)
          ?? (normalization.visualHash ? await persistence.findByVisualHash(normalization.visualHash) : null);
        if (existing) {
          await persistence.appendProvenance(existing.assetId, asset);
          counters.duplicates += 1;
          emitEvent(options, { type: 'sync.duplicate', providerKey: adapter.providerKey });
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: hash, license: asset.license, databaseAssetId: existing.assetId, mediaType: asset.mediaType, outcome: 'duplicate', normalizationStatus: normalization.status === 'needs-normalization' ? 'needs-normalization' : 'validated-original', usageRestriction });
        } else {
          const persistenceAsset = { ...asset, usageRestriction };
          const saved = await persistence.save(persistenceAsset, content, hash, storageKey(asset, hash, usageRestriction), normalization);
          counters.imported += 1;
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: hash, license: asset.license, databaseAssetId: saved?.assetId ?? null, mediaType: asset.mediaType, outcome: 'imported', normalizationStatus: normalization.status === 'needs-normalization' ? 'needs-normalization' : 'validated-original', usageRestriction });
        }
      } catch {
        counters.quarantined += 1;
        emitEvent(options, { type: 'sync.quarantined', providerKey: adapter.providerKey });
        manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'quarantined', normalizationStatus: 'not-applicable', usageRestriction });
      }
    }
    await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
  }
  await persistence.finish(run.id, counters);
  const manifest = createEducationalAssetImportManifest({ providerKey: adapter.providerKey, importRunId: run.id, revision: options.revision ?? '1', cursor: discovery.nextCursor, assets: manifestEntries });
  await options.writeManifest?.(manifest);
  emitEvent(options, { type: 'sync.completed', providerKey: adapter.providerKey, dryRun: false, counters: { ...counters } });
  return { counters, manifest, report: createEducationalAssetImportReport(counters, adapter.providerKey, manifestEntries), nextCursor: discovery.nextCursor, runId: run.id };
}
