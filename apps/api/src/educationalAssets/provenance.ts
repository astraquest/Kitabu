export interface EducationalAssetProvenanceMetadata {
  originalFilename?: string | null;
  creator?: string | null;
  creatorUrl?: string | null;
  licenseVersion?: string | null;
  licenseEvidence?: string | null;
}

export interface NormalizedEducationalAssetProvenanceMetadata {
  originalFilename: string | null;
  creator: string | null;
  creatorUrl: string | null;
  licenseVersion: string | null;
  licenseEvidence: string | null;
}

function text(value: string | null | undefined, maxLength: number, field: string): string | null {
  if (value == null || value.trim() === '') return null;
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`Educational asset ${field} is too long`);
  return normalized;
}

export function normalizeEducationalAssetProvenanceMetadata(
  input: EducationalAssetProvenanceMetadata = {},
): NormalizedEducationalAssetProvenanceMetadata {
  const creatorUrl = text(input.creatorUrl, 2048, 'creator URL');
  if (creatorUrl) {
    let parsed: URL;
    try {
      parsed = new URL(creatorUrl);
    } catch {
      throw new Error('Educational asset creator URL must be an absolute HTTP(S) URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Educational asset creator URL must be an absolute HTTP(S) URL');
    }
  }
  return {
    originalFilename: text(input.originalFilename, 512, 'original filename'),
    creator: text(input.creator, 1000, 'creator'),
    creatorUrl,
    licenseVersion: text(input.licenseVersion, 128, 'license version'),
    licenseEvidence: text(input.licenseEvidence, 4000, 'license evidence'),
  };
}
