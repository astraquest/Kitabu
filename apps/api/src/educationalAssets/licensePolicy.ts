import type { EducationalAssetLicense, EducationalAssetLicenseDecision } from './types.js';

const accepted = new Set<EducationalAssetLicense>(['CC0-1.0', 'PUBLIC-DOMAIN', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'CC-BY-3.0', 'CC-BY-4.0']);
const restricted = new Set<EducationalAssetLicense>(['CC-BY-SA-3.0', 'CC-BY-SA-4.0']);
const rejected = new Set<EducationalAssetLicense>([
  'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0',
  'ALL-RIGHTS-RESERVED', 'PROPRIETARY',
]);

const aliases: Record<string, EducationalAssetLicense> = {
  'cc0': 'CC0-1.0', 'cc0 1.0': 'CC0-1.0', 'public domain': 'PUBLIC-DOMAIN',
  'mit': 'MIT', 'bsd 2 clause': 'BSD-2-Clause', 'bsd 3 clause': 'BSD-3-Clause', 'apache 2.0': 'Apache-2.0',
  'cc by': 'CC-BY-4.0', 'cc by 3.0': 'CC-BY-3.0', 'cc by 4.0': 'CC-BY-4.0',
  'cc by sa': 'CC-BY-SA-4.0', 'cc by sa 3.0': 'CC-BY-SA-3.0', 'cc by sa 4.0': 'CC-BY-SA-4.0',
  'cc by nc': 'CC-BY-NC-4.0', 'cc by nc 4.0': 'CC-BY-NC-4.0',
  'cc by nc sa': 'CC-BY-NC-SA-4.0', 'cc by nc sa 4.0': 'CC-BY-NC-SA-4.0',
  'cc by nd': 'CC-BY-ND-4.0', 'cc by nd 4.0': 'CC-BY-ND-4.0',
  'cc by nc nd': 'CC-BY-NC-ND-4.0', 'cc by nc nd 4.0': 'CC-BY-NC-ND-4.0',
  'all rights reserved': 'ALL-RIGHTS-RESERVED',
  'proprietary': 'PROPRIETARY',
};

export function normalizeEducationalAssetLicense(value: string | null | undefined): EducationalAssetLicense {
  if (!value) return 'UNKNOWN';
  return aliases[value.trim().toLowerCase().replace(/[\s_-]+/g, ' ')] ?? 'UNKNOWN';
}

export function decideEducationalAssetLicense(value: string | null | undefined): EducationalAssetLicenseDecision {
  const license = normalizeEducationalAssetLicense(value);
  if (accepted.has(license)) return 'accepted';
  if (restricted.has(license)) return 'restricted';
  if (rejected.has(license)) return 'rejected';
  return 'needs-review';
}

export function educationalAssetAttributionRequired(value: string | null | undefined): boolean {
  const license = normalizeEducationalAssetLicense(value);
  return license === 'BSD-2-Clause' || license === 'BSD-3-Clause' || license === 'Apache-2.0'
    || license === 'CC-BY-3.0' || license === 'CC-BY-4.0';
}
