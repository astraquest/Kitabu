import { decideEducationalAssetLicense } from './licensePolicy.js';
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
  restricted: number;
  acceptedLicenses: number;
  restrictedLicenses: number;
  rejectedLicenses: number;
  needsReviewLicenses: number;
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
  let restrictedLicenses = 0;
  let rejectedLicenses = 0;
  let needsReviewLicenses = 0;
  for (const asset of assets) {
    byLicense[asset.license] = (byLicense[asset.license] ?? 0) + 1;
    byMediaType[asset.mediaType] = (byMediaType[asset.mediaType] ?? 0) + 1;
    const decision = decideEducationalAssetLicense(asset.license);
    if (decision === 'accepted') acceptedLicenses += 1;
    else if (decision === 'restricted') restrictedLicenses += 1;
    else if (decision === 'needs-review') needsReviewLicenses += 1;
    else rejectedLicenses += 1;
  }
  return { ...counters, acceptedLicenses, restrictedLicenses, rejectedLicenses, needsReviewLicenses, byProvider: { [providerKey]: assets.length }, byLicense, byMediaType };
}
