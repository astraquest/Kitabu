import type { EducationalAssetLicense, EducationalAssetMediaType, EducationalAssetUsageRestriction, EducationalVisualType } from './types.js';

export interface RemoteAsset {
  providerKey: string;
  providerAssetId: string;
  title: string;
  mediaType: EducationalAssetMediaType;
  mimeType: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  width?: number | null;
  height?: number | null;
  sourcePageUrl: string;
  rawUrl: string;
  license: EducationalAssetLicense;
  licenseEvidenceUrl: string;
  licenseVersion?: string | null;
  licenseEvidence?: string | null;
  usageRestriction?: EducationalAssetUsageRestriction;
  attribution?: string | null;
  originalFilename?: string | null;
  creator?: string | null;
  creatorUrl?: string | null;
  classification?: 'generic-ui-concept';
  visualType?: EducationalVisualType;
  subject?: string | null;
  topic?: string | null;
  keywords?: string[];
}

export interface DiscoveryOptions { limit: number; cursor?: string | null; }
export interface AdapterCapabilities { supportsResume: boolean; supportsPng: boolean; supportsSvg: boolean; }
export interface EducationalAssetAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly homepageUrl: string;
  readonly capabilities: AdapterCapabilities;
  discover(options: DiscoveryOptions): Promise<{ assets: RemoteAsset[]; nextCursor: string | null }>;
  download(asset: RemoteAsset): Promise<Uint8Array>;
}
