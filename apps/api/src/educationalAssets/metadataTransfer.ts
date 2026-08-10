import { assertSafeEducationalAssetStorageKey } from './storage.js';

export const educationalAssetMetadataBundleVersion = 1 as const;

export type EducationalAssetMetadataBundle = {
  format: 'kitabu-educational-assets';
  version: typeof educationalAssetMetadataBundleVersion;
  assets: Record<string, unknown>[];
  provenance: Record<string, unknown>[];
  providers: Record<string, unknown>[];
  curriculumLinks: Record<string, unknown>[];
  taxonomyLinks: Record<string, unknown>[];
  files: EducationalAssetFileManifestEntry[];
};

export type EducationalAssetFileManifestEntry = {
  storageKey: string;
  contentSha256: string;
  byteSize: number;
  mimeType: string;
};

export type MetadataAssetDecision = {
  kind: 'insert' | 'skip' | 'dedupe' | 'conflict';
  sourceId: string;
  targetId: string;
  reason: string;
};

export function stableJson(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function assertEducationalAssetMetadataBundle(value: unknown): asserts value is EducationalAssetMetadataBundle {
  if (!value || typeof value !== 'object') throw new Error('Educational asset metadata bundle must be an object');
  const bundle = value as Partial<EducationalAssetMetadataBundle>;
  if (bundle.format !== 'kitabu-educational-assets' || bundle.version !== educationalAssetMetadataBundleVersion) {
    throw new Error(`Unsupported educational asset metadata bundle format/version: ${String(bundle.format)}/${String(bundle.version)}`);
  }
  for (const field of ['assets', 'provenance', 'providers', 'curriculumLinks', 'taxonomyLinks', 'files'] as const) {
    if (!Array.isArray(bundle[field])) throw new Error(`Educational asset metadata bundle field ${field} must be an array`);
  }
  for (const file of bundle.files ?? []) {
    if (!file || typeof file !== 'object' || typeof file.storageKey !== 'string' || !/^[a-f0-9]{64}$/.test(file.contentSha256) || !Number.isInteger(file.byteSize) || file.byteSize < 0) {
      throw new Error('Educational asset metadata bundle contains an invalid file manifest entry');
    }
    assertSafeEducationalAssetStorageKey(file.storageKey);
  }
}

export function decideMetadataAsset(
  source: { id: string; content_sha256: string; storage_key: string },
  existingById: { id: string; content_sha256: string; storage_key: string } | undefined,
  existingByHash: { id: string; content_sha256: string; storage_key: string } | undefined,
): MetadataAssetDecision {
  if (existingById) {
    if (existingById.content_sha256 !== source.content_sha256) {
      return { kind: 'conflict', sourceId: source.id, targetId: existingById.id, reason: 'same asset ID has a different content SHA-256' };
    }
    if (existingById.storage_key !== source.storage_key) {
      return { kind: 'conflict', sourceId: source.id, targetId: existingById.id, reason: 'same asset ID and content have different storage keys' };
    }
    return { kind: 'skip', sourceId: source.id, targetId: existingById.id, reason: 'same asset ID and content SHA-256 already exist' };
  }
  if (existingByHash) {
    return { kind: 'dedupe', sourceId: source.id, targetId: existingByHash.id, reason: 'content SHA-256 already exists under another asset ID' };
  }
  return { kind: 'insert', sourceId: source.id, targetId: source.id, reason: 'asset ID and content SHA-256 are new' };
}

export function metadataBundleForAssets(
  bundle: EducationalAssetMetadataBundle,
  assetIds: readonly string[],
): EducationalAssetMetadataBundle {
  const ids = new Set(assetIds);
  const assets = bundle.assets.filter(row => ids.has(String(row.id)));
  return {
    ...bundle,
    assets,
    provenance: bundle.provenance.filter(row => ids.has(String(row.asset_id))),
    curriculumLinks: bundle.curriculumLinks.filter(row => ids.has(String(row.asset_id))),
    taxonomyLinks: bundle.taxonomyLinks.filter(row => ids.has(String(row.asset_id))),
    files: bundle.files.filter(file => assets.some(row => row.storage_key === file.storageKey)),
  };
}
