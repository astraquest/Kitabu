import type { EducationalAssetLicense, EducationalAssetMediaType } from './types.js';
import type { AssetSyncCounters } from './runner.js';
import type { EducationalAssetManifestEntry } from './manifest.js';

export interface EducationalAssetImportReport {
  discovered: number;
  downloaded: number;
  imported: number;
  duplicates: number;
  rejected: number;
  quarantined: number;
  errors: number;
  acceptedLicenses: number;
  rejectedLicenses: number;
  byProvider: Record<string, number>;
  byLicense: Partial<Record<EducationalAssetLicense, number>>;
  byMediaType: Partial<Record<EducationalAssetMediaType, number>>;
}

export function createEducationalAssetImportReport(
  counters: AssetSyncCounters,
  providerKey: string,
  assets: EducationalAssetManifestEntry[],
): EducationalAssetImportReport {
  const byLicense: EducationalAssetImportReport['byLicense'] = {};
  const byMediaType: EducationalAssetImportReport['byMediaType'] = {};
  let acceptedLicenses = 0;
  let rejectedLicenses = 0;
  for (const asset of assets) {
    byLicense[asset.license] = (byLicense[asset.license] ?? 0) + 1;
    byMediaType[asset.mediaType] = (byMediaType[asset.mediaType] ?? 0) + 1;
    if (asset.outcome === 'rejected') rejectedLicenses += 1;
    else acceptedLicenses += 1;
  }
  return { ...counters, acceptedLicenses, rejectedLicenses, byProvider: { [providerKey]: assets.length }, byLicense, byMediaType };
}
