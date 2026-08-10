import { HealthIconsAdapter } from '../src/educationalAssets/healthIcons.js';
import { TablerAdapter } from '../src/educationalAssets/tabler.js';
import { OpenMojiAdapter } from '../src/educationalAssets/openMoji.js';
import { GameIconsAdapter } from '../src/educationalAssets/gameIcons.js';
import { BioiconsAdapter } from '../src/educationalAssets/bioicons.js';
import { WikimediaCommonsAdapter } from '../src/educationalAssets/wikimedia.js';
import { PhyloPicAdapter } from '../src/educationalAssets/phyloPic.js';
import { OpenclipartAdapter } from '../src/educationalAssets/openclipart.js';
import { runEducationalAssetSync } from '../src/educationalAssets/runner.js';

function option(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
const provider = option('--provider') ?? 'health-icons';
const dryRun = process.argv.includes('--dry-run');
const limit = Math.max(1, Math.min(Number.parseInt(option('--limit') ?? '10', 10) || 10, 100));
const resumeCursor = option('--resume') ?? null;
const category = option('--category');
const query = option('--query');
const node = option('--node');
if (provider === 'wikimedia' && !category?.trim()) throw new Error('Wikimedia Commons requires --category; refusing a broad crawl');
if (provider === 'phylopic' && Boolean(query?.trim()) === Boolean(node?.trim())) throw new Error('PhyloPic requires exactly one of --query or --node; refusing a broad crawl');
if (provider === 'openclipart' && !query?.trim()) throw new Error('Openclipart requires --query; refusing a broad crawl');
const adapter = provider === 'health-icons' ? new HealthIconsAdapter()
  : provider === 'tabler-icons' ? new TablerAdapter()
    : provider === 'openmoji' ? new OpenMojiAdapter()
      : provider === 'game-icons' ? new GameIconsAdapter()
          : provider === 'bioicons' ? new BioiconsAdapter()
            : provider === 'wikimedia' ? new WikimediaCommonsAdapter(category!)
              : provider === 'phylopic' ? new PhyloPicAdapter({ query, nodeUuid: node })
                : provider === 'openclipart' ? new OpenclipartAdapter(query!)
                  : (() => { throw new Error(`Unsupported educational asset provider: ${provider}`); })();
if (dryRun) {
  const result = await runEducationalAssetSync(adapter, {} as never, { limit, dryRun: true, resumeCursor, onEvent: event => console.error(JSON.stringify(event)) });
  console.log(JSON.stringify(result, null, 2));
} else {
  const { db, redis } = await import('../src/db.js');
  const {
    appendEducationalAssetProvenance, checkpointEducationalAssetImportRun, createEducationalAsset, createEducationalAssetImportRun,
    findEducationalAssetByContentSha256, findEducationalAssetByProviderIdentity, findEducationalAssetByVisualHash,
    updateEducationalAssetImportRun, upsertEducationalAssetProvider,
  } = await import('../src/repositories.js');
  const { createEducationalAssetStorage, persistEducationalAssetWithCleanup } = await import('../src/educationalAssets/storage.js');
  const { educationalAssetManifestStorageKey } = await import('../src/educationalAssets/manifest.js');
  const storage = createEducationalAssetStorage();
  try {
    const result = await runEducationalAssetSync(adapter, {
      ensureProvider: async item => { await upsertEducationalAssetProvider(db, { providerKey: item.providerKey, displayName: item.displayName, homepageUrl: item.homepageUrl, metadata: { capabilities: item.capabilities } }); },
      createRun: async (item, cursor) => createEducationalAssetImportRun(db, { providerKey: item.providerKey, importerKey: `${item.providerKey}-v1`, cursor }),
      checkpoint: async (id, checkpoint, cursor) => { await checkpointEducationalAssetImportRun(db, id, checkpoint, cursor); },
      finish: async (id, counters) => { await updateEducationalAssetImportRun(db, id, { status: 'completed', completedAt: new Date(), discoveredCount: counters.discovered, downloadedCount: counters.downloaded, importedCount: counters.imported, duplicateCount: counters.duplicates, restrictedCount: counters.restricted, rejectedCount: counters.rejected, quarantinedCount: counters.quarantined, errorCount: counters.errors }); },
      findByContentHash: async hash => {
        const asset = await findEducationalAssetByContentSha256(db, hash);
        return asset ? { assetId: asset.id } : null;
      },
      findByVisualHash: async hash => {
        const asset = await findEducationalAssetByVisualHash(db, hash);
        return asset ? { assetId: asset.id } : null;
      },
      findByProviderIdentity: async (key, assetId) => {
        const asset = await findEducationalAssetByProviderIdentity(db, key, assetId);
        return asset ? { assetId: asset.id } : null;
      },
      appendProvenance: async (assetId, item) => {
        const attribution = item.creatorUrl ? `${item.attribution ?? 'Creator'} (${item.creatorUrl})` : item.attribution ?? null;
        await appendEducationalAssetProvenance(db, assetId, {
          sourceUrl: item.sourcePageUrl, sourceRawUrl: item.rawUrl, sourceName: item.providerKey,
          sourceLicense: item.license, sourceLicenseUrl: item.licenseEvidenceUrl, providerKey: item.providerKey,
          providerAssetId: item.providerAssetId, attribution, originalFilename: item.originalFilename,
          creator: item.creator, creatorUrl: item.creatorUrl, licenseVersion: item.licenseVersion,
          licenseEvidence: item.licenseEvidence,
        });
      },
      save: async (item, content, hash, key, normalization) => {
        const attribution = item.creatorUrl ? `${item.attribution ?? 'Creator'} (${item.creatorUrl})` : item.attribution ?? null;
        const created = await persistEducationalAssetWithCleanup(storage, key, content, item.mimeType, () => createEducationalAsset(db, { title: item.title, description: item.description, metadata: item.metadata, mediaType: item.mediaType, mimeType: item.mimeType, contentSha256: hash, byteSize: content.byteLength, storageBackend: storage.backend, storageKey: key, productionStatus: 'review', usageRestriction: item.usageRestriction ?? 'none', sourceUrl: item.sourcePageUrl, sourceRawUrl: item.rawUrl, sourceName: item.providerKey, sourceLicense: item.license, sourceLicenseUrl: item.licenseEvidenceUrl, providerKey: item.providerKey, providerAssetId: item.providerAssetId, attribution, originalFilename: item.originalFilename, creator: item.creator, creatorUrl: item.creatorUrl, licenseVersion: item.licenseVersion, licenseEvidence: item.licenseEvidence, visualType: item.visualType, subject: item.subject, topic: item.topic, keywords: item.keywords, normalizationStatus: normalization.status, width: normalization.dimensions?.width ?? item.width, height: normalization.dimensions?.height ?? item.height, aspectRatio: normalization.dimensions?.width && normalization.dimensions?.height ? normalization.dimensions.width / normalization.dimensions.height : undefined, visualHash: normalization.visualHash }));
        return { assetId: created.id };
      },
    }, { limit, dryRun: false, resumeCursor, revision: `${adapter.providerKey}-v1`, onEvent: event => console.error(JSON.stringify(event)), writeManifest: async manifest => {
      await storage.writeJsonAtomic(educationalAssetManifestStorageKey(manifest.providerKey, manifest.importRunId ?? Date.now().toString()), manifest);
    } });
    console.log(JSON.stringify(result, null, 2));
  } finally { await redis.quit().catch(() => undefined); await db.end().catch(() => undefined); }
}
