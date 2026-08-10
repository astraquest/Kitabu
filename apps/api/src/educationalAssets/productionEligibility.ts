import { decideEducationalAssetLicense, educationalAssetAttributionRequired } from './licensePolicy.js';
import type { EducationalAssetProductionStatus, EducationalAssetUsageRestriction } from './types.js';

export function isEducationalAssetProductionEligible(input: {
  productionStatus: EducationalAssetProductionStatus;
  usageRestriction?: EducationalAssetUsageRestriction | null;
  sourceLicense: string | null | undefined;
  sourceUrl: string | null | undefined;
  attribution?: string | null | undefined;
  contentSha256: string | null | undefined;
  storageKey: string | null | undefined;
}): boolean {
  return (input.usageRestriction ?? 'none') === 'none'
    && input.productionStatus === 'approved'
    && decideEducationalAssetLicense(input.sourceLicense) === 'accepted'
    && (!educationalAssetAttributionRequired(input.sourceLicense) || Boolean(input.attribution?.trim()))
    && Boolean(input.sourceUrl?.trim())
    && /^[a-f0-9]{64}$/.test(input.contentSha256 ?? '')
    && Boolean(input.storageKey?.trim());
}
