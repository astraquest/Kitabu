import { appConfig } from '../config.js';
import {
  findProductionEligibleEducationalAssetById,
  listProductionEligibleEducationalAssets,
  type EducationalAssetRepositoryRecord,
} from '../repositories.js';
import { db } from '../db.js';
import { isEducationalAssetProductionEligible } from './productionEligibility.js';
import { normalizeEducationalAssetSearch, rankEducationalAssetSearch } from './search.js';
import { LocalFilesystemAssetStorage } from './storage.js';
import type { EducationalAssetMediaType } from './types.js';

export interface FindEducationalAssetsInput {
  query?: string;
  subject?: string;
  topic?: string;
  grade?: string;
  assetType?: EducationalAssetMediaType;
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
  attribution: { sourceName: string; license: string; attribution: string | null };
}

type Repository = {
  list(filters: FindEducationalAssetsInput): Promise<EducationalAssetRepositoryRecord[]>;
  findById(assetId: string): Promise<EducationalAssetRepositoryRecord | null>;
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
  return rankEducationalAssetSearch(query, asset);
}

function isEligible(asset: EducationalAssetRepositoryRecord): boolean {
  return isEducationalAssetProductionEligible({
    productionStatus: asset.production_status,
    sourceLicense: asset.source_license,
    sourceUrl: asset.source_url,
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
    attribution: {
      sourceName: asset.source_name,
      license: asset.source_license,
      attribution: asset.attribution,
    },
  };
}

export async function findEducationalAssets(
  input: FindEducationalAssetsInput = {},
  repository: Repository = defaultRepository,
): Promise<LearnerEducationalAsset[]> {
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

export async function readEducationalAssetForLearner(
  assetId: string,
  options: { repository?: Repository; storage?: Pick<LocalFilesystemAssetStorage, 'read'> } = {},
): Promise<{ asset: LearnerEducationalAsset; content: Buffer } | null> {
  const repository = options.repository ?? defaultRepository;
  const asset = await repository.findById(assetId);
  const projected = asset ? toLearnerEducationalAsset(asset) : null;
  if (!asset || !projected) return null;
  const storage = options.storage ?? new LocalFilesystemAssetStorage(appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT);
  try {
    return { asset: projected, content: await storage.read(asset.storage_key) };
  } catch {
    return null;
  }
}
