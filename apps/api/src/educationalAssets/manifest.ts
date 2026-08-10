import type { EducationalAssetLicense, EducationalAssetMediaType } from './types.js';

export type EducationalAssetAcquisitionOutcome = 'imported' | 'duplicate' | 'rejected' | 'quarantined' | 'error';
export type EducationalAssetNormalizationStatus = 'validated-original' | 'needs-normalization' | 'not-applicable';

export interface EducationalAssetManifestEntry {
  providerAssetId: string;
  sourcePath: string;
  sha256: string | null;
  license: EducationalAssetLicense;
  databaseAssetId: string | null;
  mediaType: EducationalAssetMediaType;
  outcome: EducationalAssetAcquisitionOutcome;
  normalizationStatus: EducationalAssetNormalizationStatus;
}

export interface EducationalAssetImportManifest {
  providerKey: string;
  importRunId: string | null;
  revision: string;
  cursor: string | null;
  importedAt: string;
  assets: EducationalAssetManifestEntry[];
}

function safeSegment(value: string, label: string) {
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(value)) throw new Error(`Invalid manifest ${label}`);
  return value;
}

export function educationalAssetManifestStorageKey(providerKey: string, runOrTimestamp: string): string {
  return `manifests/${safeSegment(providerKey, 'provider key')}/${safeSegment(runOrTimestamp, 'run identity')}.json`;
}

export function createEducationalAssetImportManifest(input: Omit<EducationalAssetImportManifest, 'importedAt'> & { importedAt?: Date }): EducationalAssetImportManifest {
  return { ...input, importedAt: (input.importedAt ?? new Date()).toISOString() };
}
