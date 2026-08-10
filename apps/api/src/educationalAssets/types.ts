export const educationalAssetLicenseValues = [
  'CC0-1.0', 'PUBLIC-DOMAIN', 'MIT', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0',
  'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0',
  'ALL-RIGHTS-RESERVED', 'PROPRIETARY', 'UNKNOWN',
] as const;

export type EducationalAssetLicense = typeof educationalAssetLicenseValues[number];
export type EducationalAssetLicenseDecision = 'accepted' | 'restricted' | 'rejected' | 'needs-review';
export type EducationalAssetProductionStatus = 'draft' | 'review' | 'approved' | 'rejected';
export type EducationalAssetMediaType = 'image' | 'audio' | 'video' | 'document' | 'vector';
export type EducationalAssetImportRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface EducationalAssetProvenance {
  sourceUrl: string;
  sourceName: string;
  sourceLicense: EducationalAssetLicense;
  sourceLicenseUrl: string | null;
  attribution: string | null;
  retrievedAt: Date;
}

export interface EducationalAssetRecord extends EducationalAssetProvenance {
  id: string;
  title: string;
  description: string | null;
  mediaType: EducationalAssetMediaType;
  mimeType: string;
  contentSha256: string;
  byteSize: number;
  storageBackend: 'local';
  storageKey: string;
  productionStatus: EducationalAssetProductionStatus;
  subject: string | null;
  topic: string | null;
  gradeLevel: string | null;
  createdAt: Date;
  updatedAt: Date;
}
