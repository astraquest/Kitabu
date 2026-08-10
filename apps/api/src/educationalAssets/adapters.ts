import type { EducationalAssetLicense, EducationalAssetMediaType } from './types.js';

export interface RemoteAsset {
  providerKey: string;
  providerAssetId: string;
  title: string;
  mediaType: EducationalAssetMediaType;
  mimeType: string;
  sourcePageUrl: string;
  rawUrl: string;
  license: EducationalAssetLicense;
  licenseEvidenceUrl: string;
  attribution?: string | null;
  creatorUrl?: string | null;
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
