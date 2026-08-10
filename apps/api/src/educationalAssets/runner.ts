import { decideEducationalAssetLicense } from './licensePolicy.js';
import { sha256EducationalAsset } from './deduplication.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import { validateDownloadedEducationalAsset } from './validation.js';
import { createEducationalAssetImportManifest, type EducationalAssetImportManifest, type EducationalAssetManifestEntry } from './manifest.js';
import { createEducationalAssetImportReport } from './report.js';

export interface AssetSyncOptions {
  limit: number;
  dryRun: boolean;
  resumeCursor?: string | null;
  maxRetries?: number;
  revision?: string;
  writeManifest?: (manifest: EducationalAssetImportManifest) => Promise<void>;
}
export interface AssetSyncPersistence {
  ensureProvider(adapter: EducationalAssetAdapter): Promise<void>;
  createRun(adapter: EducationalAssetAdapter, cursor: string | null): Promise<{ id: string }>;
  checkpoint(runId: string, checkpoint: Record<string, unknown>, cursor: string | null): Promise<void>;
  finish(runId: string, counters: AssetSyncCounters): Promise<void>;
  findByContentHash(hash: string): Promise<boolean>;
  findByProviderIdentity(providerKey: string, providerAssetId: string): Promise<boolean>;
  save(asset: RemoteAsset, content: Uint8Array, contentHash: string, storageKey: string): Promise<{ assetId?: string } | void>;
}
export interface AssetSyncCounters { discovered: number; downloaded: number; imported: number; duplicates: number; rejected: number; quarantined: number; errors: number; }
export interface AssetSyncDryRunSummary { licenseAccepted: number; licenseRejected: number; wouldDownload: number; wouldPublish: number; }
const initialCounters = (): AssetSyncCounters => ({ discovered: 0, downloaded: 0, imported: 0, duplicates: 0, rejected: 0, quarantined: 0, errors: 0 });

async function retry<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
  let failure: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) { failure = error; if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); }
  }
  throw failure;
}

function storageKey(asset: RemoteAsset, hash: string) {
  const extension = asset.mimeType === 'image/svg+xml' ? 'svg' : asset.mimeType.split('/')[1] ?? 'bin';
  return `${asset.providerKey}/${hash}.${extension}`;
}

export async function runEducationalAssetSync(adapter: EducationalAssetAdapter, persistence: AssetSyncPersistence, options: AssetSyncOptions) {
  const counters = initialCounters();
  const manifestEntries: EducationalAssetManifestEntry[] = [];
  const discovery = await retry(() => adapter.discover({ limit: Math.max(1, Math.min(options.limit, 100)), cursor: options.resumeCursor }), options.maxRetries ?? 3);
  counters.discovered = discovery.assets.length;
  if (options.dryRun) {
    const dryRun = discovery.assets.reduce<AssetSyncDryRunSummary>((summary, asset) => {
      if (decideEducationalAssetLicense(asset.license) === 'accepted') {
        summary.licenseAccepted += 1;
        summary.wouldDownload += 1;
        summary.wouldPublish += 1;
      } else summary.licenseRejected += 1;
      return summary;
    }, { licenseAccepted: 0, licenseRejected: 0, wouldDownload: 0, wouldPublish: 0 });
    counters.rejected = dryRun.licenseRejected;
    for (const asset of discovery.assets) {
      const accepted = decideEducationalAssetLicense(asset.license) === 'accepted';
      manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: accepted ? 'imported' : 'rejected', normalizationStatus: accepted && asset.mediaType === 'image' ? 'needs-normalization' : 'not-applicable' });
    }
    const manifest = createEducationalAssetImportManifest({ providerKey: adapter.providerKey, importRunId: null, revision: options.revision ?? '1', cursor: discovery.nextCursor, assets: manifestEntries });
    return { counters, dryRun, manifest, report: createEducationalAssetImportReport(counters, adapter.providerKey, manifestEntries), nextCursor: discovery.nextCursor, runId: null };
  }

  await persistence.ensureProvider(adapter);
  const run = await persistence.createRun(adapter, options.resumeCursor ?? null);
  for (const asset of discovery.assets) {
    if (decideEducationalAssetLicense(asset.license) !== 'accepted') {
      counters.rejected += 1;
      manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'rejected', normalizationStatus: 'not-applicable' });
    } else if (await persistence.findByProviderIdentity(asset.providerKey, asset.providerAssetId)) {
      counters.duplicates += 1;
      manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'duplicate', normalizationStatus: asset.mediaType === 'image' ? 'needs-normalization' : 'validated-original' });
    } else {
      let content: Uint8Array;
      try {
        content = await retry(() => adapter.download(asset), options.maxRetries ?? 3);
        counters.downloaded += 1;
      } catch {
        counters.errors += 1;
        manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'error', normalizationStatus: 'not-applicable' });
        await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
        continue;
      }
      try {
        validateDownloadedEducationalAsset(content, asset.mimeType);
        const hash = sha256EducationalAsset(content);
        if (await persistence.findByContentHash(hash)) {
          counters.duplicates += 1;
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: hash, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'duplicate', normalizationStatus: asset.mediaType === 'image' ? 'needs-normalization' : 'validated-original' });
        } else {
          const saved = await persistence.save(asset, content, hash, storageKey(asset, hash));
          counters.imported += 1;
          manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: hash, license: asset.license, databaseAssetId: saved?.assetId ?? null, mediaType: asset.mediaType, outcome: 'imported', normalizationStatus: asset.mediaType === 'image' ? 'needs-normalization' : 'validated-original' });
        }
      } catch {
        counters.quarantined += 1;
        manifestEntries.push({ providerAssetId: asset.providerAssetId, sourcePath: asset.providerAssetId, sha256: null, license: asset.license, databaseAssetId: null, mediaType: asset.mediaType, outcome: 'quarantined', normalizationStatus: 'not-applicable' });
      }
    }
    await persistence.checkpoint(run.id, { counters, lastProviderAssetId: asset.providerAssetId }, discovery.nextCursor);
  }
  await persistence.finish(run.id, counters);
  const manifest = createEducationalAssetImportManifest({ providerKey: adapter.providerKey, importRunId: run.id, revision: options.revision ?? '1', cursor: discovery.nextCursor, assets: manifestEntries });
  await options.writeManifest?.(manifest);
  return { counters, manifest, report: createEducationalAssetImportReport(counters, adapter.providerKey, manifestEntries), nextCursor: discovery.nextCursor, runId: run.id };
}
