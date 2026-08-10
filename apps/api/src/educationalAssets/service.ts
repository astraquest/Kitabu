import {
  findProductionEligibleEducationalAssetById,
  findEducationalAssetForReviewById,
  getProductionEligibleEducationalAssetOfflineReferences,
  getAttributionsForAssets as getAttributionsForAssetsFromRepository,
  listProductionEligibleEducationalAssets,
  type EducationalAssetOfflineReferenceRecord,
  type EducationalAssetRepositoryRecord,
} from '../repositories.js';
import { projectEducationalAssetAttributions, type EducationalAssetAttribution } from './attribution.js';
import { db } from '../db.js';
import { isEducationalAssetProductionEligible } from './productionEligibility.js';
import { decideEducationalAssetLicense } from './licensePolicy.js';
import { normalizeEducationalAssetSearch, rankEducationalAssetSearch } from './search.js';
import { createEducationalAssetStorage, type EducationalAssetStorage } from './storage.js';
import { deriveEducationalAssetAltText } from './classification.js';
import type { EducationalAssetLicense, EducationalAssetMediaType, EducationalAssetProductionStatus, EducationalAssetUsageRestriction, EducationalVisualType } from './types.js';
import type { AssetKind, AssetManifest } from '@kitabu/runtime-contracts';

export interface FindEducationalAssetsInput {
  query?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  grade?: string;
  assetType?: EducationalAssetMediaType;
  visualType?: EducationalVisualType;
  providerKey?: string;
  license?: EducationalAssetLicense;
  curriculumUnitId?: string;
  limit?: number;
}

export interface LearnerEducationalAsset {
  id: string;
  assetKey: string;
  assetUrl: string;
  title: string;
  description: string | null;
  subject: string | null;
  topic: string | null;
  grade: string | null;
  assetType: EducationalAssetMediaType;
  mimeType: string;
  byteSize: number;
  visualType: EducationalVisualType;
  altText: string | null;
  attribution: { sourceName: string; license: string; attribution: string | null };
}

export interface StaffEducationalAssetReviewSummary {
  id: string;
  title: string;
  assetType: EducationalAssetMediaType;
  productionStatus: EducationalAssetProductionStatus;
  reviewReason: string | null;
  usageRestriction: EducationalAssetUsageRestriction;
  visualType: EducationalVisualType;
  altText: string | null;
  attribution: { sourceName: string; license: string; attribution: string | null };
}

export interface StaffEducationalAssetReviewDetail {
  id: string;
  title: string;
  description: string | null;
  productionStatus: EducationalAssetProductionStatus;
  reviewReason: string | null;
  usageRestriction: EducationalAssetUsageRestriction;
  classification: {
    visualType: EducationalVisualType;
    subject: string | null;
    topic: string | null;
    subtopic: string | null;
    keywords: string[];
    synonyms: string[];
    gradeMin: number | null;
    gradeMax: number | null;
    language: string;
    containsText: boolean;
    altText: string | null;
    educationalDescription: string | null;
    normalizationStatus: string;
  };
  source: {
    sourcePageUrl: string;
    sourceRawUrl: string | null;
    sourceName: string;
    sourceLicense: EducationalAssetLicense;
    sourceLicenseUrl: string | null;
    providerKey: string | null;
    providerAssetId: string | null;
    attribution: string | null;
    originalFilename: string | null;
    creator: string | null;
    creatorUrl: string | null;
    licenseVersion: string | null;
    licenseEvidence: string | null;
    retrievedAt: string;
  };
  file: {
    previewUrl: string;
    assetType: EducationalAssetMediaType;
    mimeType: string;
    byteSize: number;
    sha256: string;
    storageBackend: 'local' | 'http-put' | 'supabase';
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    visualHash: string | null;
    metadata: Record<string, unknown>;
  };
}

export interface OfflineEducationalAssetReference {
  assetId: string;
  assetUrl: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  title: string;
  altText: string | null;
  productionStatus: EducationalAssetProductionStatus;
  licenseId: EducationalAssetLicense;
  providerKey: string | null;
  sourceName: string;
  attribution: string | null;
  usageRestriction?: EducationalAssetUsageRestriction;
}

type Repository = {
  list(filters: FindEducationalAssetsInput): Promise<EducationalAssetRepositoryRecord[]>;
  findById(assetId: string): Promise<EducationalAssetRepositoryRecord | null>;
};

type AttributionRepository = {
  getAttributions(assetIds: string[]): Promise<Array<{
    asset_id: string;
    source_name: string;
    source_license: string;
    attribution: string | null;
  }>>;
};

type OfflineReferenceRepository = {
  getOfflineReferences(assetIds: string[]): Promise<EducationalAssetOfflineReferenceRecord[]>;
};

const defaultRepository: Repository = {
  list: filters => listProductionEligibleEducationalAssets(db, filters),
  findById: assetId => findProductionEligibleEducationalAssetById(db, assetId),
};

function educationalAssetSearchRank(query: string, asset: EducationalAssetRepositoryRecord): number {
  const normalizedQuery = normalizeEducationalAssetSearch(query);
  const topic = normalizeEducationalAssetSearch(asset.topic ?? '');
  if (normalizedQuery && topic === normalizedQuery) return 90;
  if (normalizedQuery && topic.startsWith(normalizedQuery)) return 60;
  return rankEducationalAssetSearch(query, {
    title: asset.title,
    description: asset.description,
    subject: asset.subject,
    topic: asset.topic,
    subtopic: asset.subtopic,
    keywords: asset.keywords,
    synonyms: asset.synonyms,
    visualType: asset.visual_type,
    providerKey: asset.provider_key,
    license: asset.source_license,
  });
}

function isEligible(asset: EducationalAssetRepositoryRecord): boolean {
  return isEducationalAssetProductionEligible({
    productionStatus: asset.production_status,
    usageRestriction: asset.usage_restriction,
    sourceLicense: asset.source_license,
    sourceUrl: asset.source_url,
    attribution: asset.attribution,
    contentSha256: asset.content_sha256,
    storageKey: asset.storage_key,
  });
}

export function toLearnerEducationalAsset(asset: EducationalAssetRepositoryRecord): LearnerEducationalAsset | null {
  if (!isEligible(asset)) return null;
  return {
    id: asset.id,
    assetKey: asset.id,
    assetUrl: `/educational-assets/${encodeURIComponent(asset.id)}/file`,
    title: asset.title,
    description: asset.description,
    subject: asset.subject,
    topic: asset.topic,
    grade: asset.grade_level,
    assetType: asset.media_type,
    mimeType: asset.mime_type,
    byteSize: asset.byte_size,
    visualType: asset.visual_type,
    altText: deriveEducationalAssetAltText({ altText: asset.alt_text, description: asset.description, title: asset.title }),
    attribution: {
      sourceName: asset.source_name,
      license: asset.source_license,
      attribution: asset.attribution,
    },
  };
}

export function toStaffEducationalAssetReviewSummary(asset: EducationalAssetRepositoryRecord): StaffEducationalAssetReviewSummary {
  return {
    id: asset.id,
    title: asset.title,
    assetType: asset.media_type,
    productionStatus: asset.production_status,
    reviewReason: asset.review_reason,
    usageRestriction: asset.usage_restriction,
    visualType: asset.visual_type,
    altText: deriveEducationalAssetAltText({ altText: asset.alt_text, description: asset.description, title: asset.title }),
    attribution: {
      sourceName: asset.source_name,
      license: asset.source_license,
      attribution: asset.attribution,
    },
  };
}

export function toStaffEducationalAssetReviewDetail(asset: EducationalAssetRepositoryRecord): StaffEducationalAssetReviewDetail {
  return {
    id: asset.id,
    title: asset.title,
    description: asset.description,
    productionStatus: asset.production_status,
    reviewReason: asset.review_reason,
    usageRestriction: asset.usage_restriction,
    classification: {
      visualType: asset.visual_type,
      subject: asset.subject,
      topic: asset.topic,
      subtopic: asset.subtopic,
      keywords: [...asset.keywords],
      synonyms: [...asset.synonyms],
      gradeMin: asset.grade_min,
      gradeMax: asset.grade_max,
      language: asset.language,
      containsText: asset.contains_text,
      altText: deriveEducationalAssetAltText({ title: asset.title, altText: asset.alt_text }),
      educationalDescription: asset.educational_description,
      normalizationStatus: asset.normalization_status,
    },
    source: {
      sourcePageUrl: asset.source_url,
      sourceRawUrl: asset.source_raw_url,
      sourceName: asset.source_name,
      sourceLicense: asset.source_license,
      sourceLicenseUrl: asset.source_license_url,
      providerKey: asset.provider_key,
      providerAssetId: asset.provider_asset_id,
      attribution: asset.attribution,
      originalFilename: asset.original_filename,
      creator: asset.creator,
      creatorUrl: asset.creator_url,
      licenseVersion: asset.license_version,
      licenseEvidence: asset.license_evidence,
      retrievedAt: asset.retrieved_at.toISOString(),
    },
    file: {
      previewUrl: `/admin/educational-assets/${encodeURIComponent(asset.id)}/preview`,
      assetType: asset.media_type,
      mimeType: asset.mime_type,
      byteSize: asset.byte_size,
      sha256: asset.content_sha256,
      storageBackend: asset.storage_backend,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspect_ratio,
      visualHash: asset.visual_hash,
      metadata: asset.metadata ?? {},
    },
  };
}

export function validateEducationalAssetReviewDecision(
  productionStatus: EducationalAssetProductionStatus,
  reviewReason: string | null | undefined,
): string | null {
  const normalizedReason = reviewReason?.trim() || null;
  if (normalizedReason && normalizedReason.length > 500) {
    throw new Error('Review reason must not exceed 500 characters');
  }
  if (productionStatus === 'rejected' && !normalizedReason) {
    throw new Error('Rejected assets require a review reason');
  }
  return normalizedReason;
}

export async function findEducationalAssets(
  input: FindEducationalAssetsInput = {},
  repository: Repository = defaultRepository,
): Promise<LearnerEducationalAsset[]> {
  if (input.license && decideEducationalAssetLicense(input.license) !== 'accepted') return [];
  const assets = await repository.list(input);
  return assets
    .flatMap(asset => {
      const projected = toLearnerEducationalAsset(asset);
      return projected ? [{ projected, rank: educationalAssetSearchRank(input.query ?? '', asset) }] : [];
    })
    .sort((left, right) => right.rank - left.rank || left.projected.title.localeCompare(right.projected.title) || left.projected.id.localeCompare(right.projected.id))
    .map(({ projected }) => projected);
}

export async function getBestEducationalAsset(
  input: FindEducationalAssetsInput = {},
  repository: Repository = defaultRepository,
): Promise<LearnerEducationalAsset | null> {
  return (await findEducationalAssets({ ...input, limit: 1 }, repository))[0] ?? null;
}

export async function getAttributionsForAssets(
  assetIds: string[],
  repository: AttributionRepository = {
    getAttributions: assetIds => getAttributionsForAssetsFromRepository(db, assetIds),
  },
): Promise<EducationalAssetAttribution[]> {
  return projectEducationalAssetAttributions((await repository.getAttributions(assetIds)).map(row => ({
    assetId: row.asset_id,
    sourceName: row.source_name,
    license: row.source_license,
    attribution: row.attribution,
  })));
}

export async function getOfflineEducationalAssetReferences(
  assetIds: string[],
  repository: OfflineReferenceRepository = {
    getOfflineReferences: ids => getProductionEligibleEducationalAssetOfflineReferences(db, ids),
  },
): Promise<OfflineEducationalAssetReference[]> {
  const referencesById = new Map((await repository.getOfflineReferences(assetIds)).map(asset => [asset.id, asset]));
  return [...new Set(assetIds)].flatMap(assetId => {
    const asset = referencesById.get(assetId);
    return asset ? [{
      assetId: asset.id,
      assetUrl: `/educational-assets/${encodeURIComponent(asset.id)}/file`,
      mimeType: asset.mime_type,
      byteSize: asset.byte_size,
      sha256: asset.content_sha256,
      title: asset.title,
      altText: asset.alt_text,
      productionStatus: 'approved',
      licenseId: asset.source_license,
      providerKey: asset.provider_key,
      sourceName: asset.source_name,
      attribution: asset.attribution,
    }] : [];
  });
}

const runtimeAssetIdPattern = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const sha256Pattern = /^[a-fA-F0-9]{64}$/;

function assetKindForMimeType(mimeType: string): AssetKind | null {
  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('audio/')) return 'audio';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized === 'application/pdf') return 'document';
  return null;
}

/**
 * Produces the runtime-contracts manifest projection for immutable educational
 * asset IDs. `manifestId` remains the caller's lesson/package binding because
 * AssetManifest v1 deliberately has no manifest identifier field.
 */
export function createEducationalAssetOfflineManifest(
  manifestId: string,
  references: readonly OfflineEducationalAssetReference[],
): AssetManifest {
  if (!runtimeAssetIdPattern.test(manifestId)) {
    throw new Error('Offline manifest ID must be a lower-case URL-safe identifier');
  }

  const assetIds = new Set<string>();
  const assets: AssetManifest['assets'][number][] = [];
  for (const reference of references) {
    if (assetIds.has(reference.assetId)) continue;
    assetIds.add(reference.assetId);

    const kind = assetKindForMimeType(reference.mimeType);
    if (
      !runtimeAssetIdPattern.test(reference.assetId)
      || reference.productionStatus !== 'approved'
      || (reference.usageRestriction ?? 'none') !== 'none'
      || decideEducationalAssetLicense(reference.licenseId) !== 'accepted'
      || !kind
      || !Number.isSafeInteger(reference.byteSize)
      || reference.byteSize < 0
      || !sha256Pattern.test(reference.sha256)
      || !reference.sourceName.trim()
    ) continue;

    const source = reference.providerKey?.trim()
      ? `${reference.sourceName.trim()} (${reference.providerKey.trim()})`
      : reference.sourceName.trim();
    assets.push({
      id: reference.assetId,
      kind,
      uri: `kitabu://educational-assets/${encodeURIComponent(reference.assetId)}`,
      mimeType: reference.mimeType.toLowerCase(),
      byteSize: reference.byteSize,
      sha256: reference.sha256.toLowerCase(),
      licence: {
        id: reference.licenseId,
        attribution: reference.attribution?.trim() || reference.sourceName.trim(),
      },
      provenance: { source },
    });
  }

  return { manifestVersion: 1, assets };
}

export async function readEducationalAssetForLearner(
  assetId: string,
  options: { repository?: Repository; storage?: Pick<EducationalAssetStorage, 'read'> } = {},
): Promise<{ asset: LearnerEducationalAsset; content: Buffer } | null> {
  const repository = options.repository ?? defaultRepository;
  const asset = await repository.findById(assetId);
  const projected = asset ? toLearnerEducationalAsset(asset) : null;
  if (!asset || !projected) return null;
  const storage = options.storage ?? createEducationalAssetStorage();
  try {
    return { asset: projected, content: Buffer.from(await storage.read(asset.storage_key)) };
  } catch {
    return null;
  }
}

export async function readEducationalAssetForAdmin(
  assetId: string,
  options: { repository?: Pick<Repository, 'findById'>; storage?: Pick<EducationalAssetStorage, 'read'> } = {},
): Promise<{ asset: StaffEducationalAssetReviewDetail; content: Buffer } | null> {
  const repository = options.repository ?? { findById: (id: string) => findEducationalAssetForReviewById(db, id) };
  const asset = await repository.findById(assetId);
  if (!asset) return null;
  const storage = options.storage ?? createEducationalAssetStorage();
  try {
    return {
      asset: toStaffEducationalAssetReviewDetail(asset),
      content: Buffer.from(await storage.read(asset.storage_key)),
    };
  } catch {
    throw new Error('Educational asset preview unavailable');
  }
}
