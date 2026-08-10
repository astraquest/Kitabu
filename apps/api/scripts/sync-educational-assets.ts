import { HealthIconsAdapter } from '../src/educationalAssets/healthIcons.js';
import { TablerAdapter } from '../src/educationalAssets/tabler.js';
import { runEducationalAssetSync } from '../src/educationalAssets/runner.js';

function option(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
const provider = option('--provider') ?? 'health-icons';
const dryRun = process.argv.includes('--dry-run');
const limit = Math.max(1, Math.min(Number.parseInt(option('--limit') ?? '10', 10) || 10, 100));
const resumeCursor = option('--resume') ?? null;
const adapter = provider === 'health-icons' ? new HealthIconsAdapter()
  : provider === 'tabler-icons' ? new TablerAdapter()
    : (() => { throw new Error(`Unsupported educational asset provider: ${provider}`); })();
if (dryRun) {
  const result = await runEducationalAssetSync(adapter, {} as never, { limit, dryRun: true, resumeCursor });
  console.log(JSON.stringify(result, null, 2));
} else {
  const { db, redis } = await import('../src/db.js');
  const {
    checkpointEducationalAssetImportRun, createEducationalAsset, createEducationalAssetImportRun,
    findEducationalAssetByContentSha256, findEducationalAssetByProviderIdentity,
    updateEducationalAssetImportRun, upsertEducationalAssetProvider,
  } = await import('../src/repositories.js');
  const { LocalFilesystemAssetStorage } = await import('../src/educationalAssets/storage.js');
  const { educationalAssetManifestStorageKey } = await import('../src/educationalAssets/manifest.js');
  const { appConfig } = await import('../src/config.js');
  const storage = new LocalFilesystemAssetStorage(appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT);
  try {
    const result = await runEducationalAssetSync(adapter, {
      ensureProvider: async item => { await upsertEducationalAssetProvider(db, { providerKey: item.providerKey, displayName: item.displayName, homepageUrl: item.homepageUrl, metadata: { capabilities: item.capabilities } }); },
      createRun: async (item, cursor) => createEducationalAssetImportRun(db, { providerKey: item.providerKey, importerKey: `${item.providerKey}-v1`, cursor }),
      checkpoint: async (id, checkpoint, cursor) => { await checkpointEducationalAssetImportRun(db, id, checkpoint, cursor); },
      finish: async (id, counters) => { await updateEducationalAssetImportRun(db, id, { status: 'completed', completedAt: new Date(), discoveredCount: counters.discovered, downloadedCount: counters.downloaded, importedCount: counters.imported, duplicateCount: counters.duplicates, rejectedCount: counters.rejected, quarantinedCount: counters.quarantined, errorCount: counters.errors }); },
      findByContentHash: async hash => Boolean(await findEducationalAssetByContentSha256(db, hash)),
      findByProviderIdentity: async (key, assetId) => Boolean(await findEducationalAssetByProviderIdentity(db, key, assetId)),
      save: async (item, content, hash, key) => {
        await storage.put(key, content);
        const attribution = item.creatorUrl ? `${item.attribution ?? 'Creator'} (${item.creatorUrl})` : item.attribution ?? null;
        const created = await createEducationalAsset(db, { title: item.title, mediaType: item.mediaType, mimeType: item.mimeType, contentSha256: hash, byteSize: content.byteLength, storageKey: key, productionStatus: 'review', sourceUrl: item.sourcePageUrl, sourceRawUrl: item.rawUrl, sourceName: item.providerKey, sourceLicense: item.license, sourceLicenseUrl: item.licenseEvidenceUrl, providerKey: item.providerKey, providerAssetId: item.providerAssetId, attribution });
        return { assetId: created.id };
      },
    }, { limit, dryRun: false, resumeCursor, revision: `${adapter.providerKey}-v1`, writeManifest: async manifest => {
      await storage.writeJsonAtomic(educationalAssetManifestStorageKey(manifest.providerKey, manifest.importRunId ?? Date.now().toString()), manifest);
    } });
    console.log(JSON.stringify(result, null, 2));
  } finally { await redis.quit().catch(() => undefined); await db.end().catch(() => undefined); }
}
