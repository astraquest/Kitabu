import { decideEducationalAssetLicense } from './licensePolicy.js';
import type { EducationalAssetProductionStatus } from './types.js';

export function isEducationalAssetProductionEligible(input: {
  productionStatus: EducationalAssetProductionStatus;
  sourceLicense: string | null | undefined;
  sourceUrl: string | null | undefined;
  contentSha256: string | null | undefined;
  storageKey: string | null | undefined;
}): boolean {
  return input.productionStatus === 'approved'
    && decideEducationalAssetLicense(input.sourceLicense) === 'accepted'
    && Boolean(input.sourceUrl?.trim())
    && /^[a-f0-9]{64}$/.test(input.contentSha256 ?? '')
    && Boolean(input.storageKey?.trim());
}
