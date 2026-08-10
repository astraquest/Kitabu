import type { EducationalAssetLicense, EducationalAssetLicenseDecision } from './types.js';
import type { FetchLike } from './healthIcons.js';
import { decideEducationalAssetLicense, educationalAssetAttributionRequired } from './licensePolicy.js';
import type { EducationalAssetAdapter, RemoteAsset } from './adapters.js';

const PUG_REST_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PROPERTY_NAMES = 'Title,IUPACName,MolecularFormula,InChIKey,CanonicalSMILES';
const USER_AGENT = 'Kitabu-Educational-Assets/1.0';

export interface PubChemCandidate {
  canonicalName: string;
  cid: number;
  formula: string | null;
  iupacName: string | null;
  inchiKey: string | null;
  canonicalSmiles: string | null;
  sourcePageUrl: string;
  imageUrl: string;
  retrievedAt: Date;
  license: EducationalAssetLicense;
  licenseDecision: EducationalAssetLicenseDecision;
}

export interface PubChemCachedCandidate extends Omit<PubChemCandidate, 'retrievedAt'> {
  retrievedAt: string;
}

export interface PubChemCache {
  getCandidate(key: string): Promise<PubChemCachedCandidate | null>;
  setCandidate(key: string, candidate: PubChemCachedCandidate): Promise<void>;
  getPng(key: string): Promise<Uint8Array | null>;
  setPng(key: string, bytes: Uint8Array): Promise<void>;
}

export interface PubChemVerifiedLicense {
  license: EducationalAssetLicense;
  licenseEvidenceUrl: string;
  attribution?: string | null;
}

type PubChemPropertyResponse = {
  PropertyTable?: {
    Properties?: Array<{
      CID?: number;
      Title?: string;
      IUPACName?: string;
      MolecularFormula?: string;
      InChIKey?: string;
      CanonicalSMILES?: string;
      ConnectivitySMILES?: string;
    }>;
  };
};

function requireCompoundName(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.length > 200) throw new Error('PubChem compound name must be between 1 and 200 characters');
  return normalized;
}

export function pubChemNameCacheKey(name: string): string {
  return `pubchem:name:${requireCompoundName(name).toLocaleLowerCase()}`;
}

export function pubChemCandidateCacheKey(cid: number): string {
  if (!Number.isInteger(cid) || cid <= 0) throw new Error('PubChem CID must be a positive integer');
  return `pubchem:candidate:${cid}`;
}

export function pubChemPngCacheKey(cid: number): string {
  if (!Number.isInteger(cid) || cid <= 0) throw new Error('PubChem CID must be a positive integer');
  return `pubchem:png:${cid}`;
}

export function pubChemPropertyUrl(name: string): string {
  return `${PUG_REST_BASE_URL}/compound/name/${encodeURIComponent(requireCompoundName(name))}/property/${PROPERTY_NAMES}/JSON`;
}

export function pubChemCompoundPageUrl(cid: number): string {
  if (!Number.isInteger(cid) || cid <= 0) throw new Error('PubChem CID must be a positive integer');
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
}

export function pubChemPngUrl(cid: number): string {
  if (!Number.isInteger(cid) || cid <= 0) throw new Error('PubChem CID must be a positive integer');
  return `${PUG_REST_BASE_URL}/compound/cid/${cid}/PNG`;
}

function serializeCandidate(candidate: PubChemCandidate): PubChemCachedCandidate {
  return { ...candidate, retrievedAt: candidate.retrievedAt.toISOString() };
}

function deserializeCandidate(value: PubChemCachedCandidate | null): PubChemCandidate | null {
  if (!value || typeof value.retrievedAt !== 'string') return null;
  const retrievedAt = new Date(value.retrievedAt);
  if (Number.isNaN(retrievedAt.getTime()) || !Number.isInteger(value.cid) || value.cid <= 0) return null;
  return { ...value, retrievedAt };
}

function requireHttpsEvidenceUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('not https');
    return url.toString();
  } catch {
    throw new Error('PubChem license evidence URL must be an HTTPS URL');
  }
}

function requireOfficialPubChemUrl(value: string, label: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'pubchem.ncbi.nlm.nih.gov') throw new Error('not official');
    return url.toString();
  } catch {
    throw new Error(`PubChem ${label} URL must use the official PubChem host`);
  }
}

export function pubChemCandidateToRemoteAsset(candidate: PubChemCandidate, verified: PubChemVerifiedLicense): RemoteAsset {
  const decision = decideEducationalAssetLicense(verified.license);
  if (decision !== 'accepted' && decision !== 'restricted') {
    throw new Error('PubChem asset requires an explicitly verified accepted or restricted license');
  }
  if (!verified.licenseEvidenceUrl?.trim()) throw new Error('PubChem asset requires license evidence');
  if (educationalAssetAttributionRequired(verified.license) && !verified.attribution?.trim()) {
    throw new Error('PubChem asset requires attribution for this license');
  }
  const sourcePageUrl = requireOfficialPubChemUrl(candidate.sourcePageUrl, 'source page');
  const rawUrl = requireOfficialPubChemUrl(candidate.imageUrl, 'image');
  if (rawUrl !== pubChemPngUrl(candidate.cid)) throw new Error('PubChem image URL does not match its CID');
  return {
    providerKey: 'pubchem',
    providerAssetId: `cid:${candidate.cid}`,
    title: candidate.canonicalName,
    description: `Chemical structure for ${candidate.canonicalName} (PubChem CID ${candidate.cid})`,
    metadata: {
      cid: candidate.cid,
      formula: candidate.formula,
      iupacName: candidate.iupacName,
      inchiKey: candidate.inchiKey,
      canonicalSmiles: candidate.canonicalSmiles,
      retrievedAt: candidate.retrievedAt.toISOString(),
      structureType: 'chemical-structure',
    },
    mediaType: 'image',
    mimeType: 'image/png',
    sourcePageUrl,
    rawUrl,
    license: verified.license,
    licenseEvidenceUrl: requireHttpsEvidenceUrl(verified.licenseEvidenceUrl),
    attribution: verified.attribution ?? `PubChem CID ${candidate.cid}`,
    visualType: 'CHEMICAL_STRUCTURE',
  };
}

export class PubChemSingleAssetAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'pubchem';
  readonly displayName = 'PubChem';
  readonly homepageUrl = 'https://pubchem.ncbi.nlm.nih.gov';
  readonly capabilities = { supportsResume: false, supportsPng: true, supportsSvg: false };
  private readonly remoteAsset: RemoteAsset;

  constructor(private readonly candidate: PubChemCandidate, verified: PubChemVerifiedLicense, private readonly resolver: PubChemResolver) {
    this.remoteAsset = pubChemCandidateToRemoteAsset(candidate, verified);
  }

  async discover(options: { limit: number; cursor?: string | null }) {
    if (options.limit < 1 || options.cursor) return { assets: [], nextCursor: null };
    return { assets: [this.remoteAsset], nextCursor: null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    if (asset.providerAssetId !== this.remoteAsset.providerAssetId || asset.rawUrl !== this.remoteAsset.rawUrl) {
      throw new Error('PubChem adapter received an unexpected asset identity');
    }
    return this.resolver.downloadPng(this.candidate);
  }
}

export class PubChemResolver {
  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000, private readonly cache?: PubChemCache) {}

  async lookupByName(name: string): Promise<PubChemCandidate> {
    const nameKey = pubChemNameCacheKey(name);
    const cached = deserializeCandidate(await this.cache?.getCandidate(nameKey) ?? null);
    if (cached) return cached;
    const response = await this.fetcher(pubChemPropertyUrl(name), {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`PubChem lookup failed with ${response.status}`);
    const property = (await response.json() as PubChemPropertyResponse).PropertyTable?.Properties?.[0];
    if (!property?.CID || !Number.isInteger(property.CID)) throw new Error('PubChem lookup returned no compound property');
    const candidate: PubChemCandidate = {
      canonicalName: property.Title?.trim() || requireCompoundName(name),
      cid: property.CID,
      formula: property.MolecularFormula?.trim() || null,
      iupacName: property.IUPACName?.trim() || null,
      inchiKey: property.InChIKey?.trim() || null,
      canonicalSmiles: property.CanonicalSMILES?.trim() || property.ConnectivitySMILES?.trim() || null,
      sourcePageUrl: pubChemCompoundPageUrl(property.CID),
      imageUrl: pubChemPngUrl(property.CID),
      retrievedAt: new Date(),
      license: 'UNKNOWN',
      licenseDecision: 'needs-review',
    };
    if (this.cache) {
      const serialized = serializeCandidate(candidate);
      await this.cache.setCandidate(nameKey, serialized);
      await this.cache.setCandidate(pubChemCandidateCacheKey(candidate.cid), serialized);
    }
    return candidate;
  }

  async downloadPng(candidate: Pick<PubChemCandidate, 'cid' | 'imageUrl'>): Promise<Uint8Array> {
    const expectedUrl = pubChemPngUrl(candidate.cid);
    if (candidate.imageUrl !== expectedUrl) throw new Error('PubChem candidate image URL does not match its CID');
    const cacheKey = pubChemPngCacheKey(candidate.cid);
    const cached = await this.cache?.getPng(cacheKey);
    if (cached) return new Uint8Array(cached);
    const response = await this.fetcher(expectedUrl, {
      headers: { Accept: 'image/png', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`PubChem PNG download failed with ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await this.cache?.setPng(cacheKey, bytes);
    return bytes;
  }
}
