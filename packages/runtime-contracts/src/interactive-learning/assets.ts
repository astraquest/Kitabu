/** Asset declarations are data-only. Downloading, caching and upload policy belong to the host. */

export const ASSET_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type AssetKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'model-3d'
  | 'document'
  | 'font'
  | 'data';

export interface AssetLicence {
  /** SPDX identifier where one exists, otherwise an approved internal licence identifier. */
  id: string;
  attribution?: string;
  termsUri?: string;
}

export interface AssetProvenance {
  /** Stable source URL, catalogue identifier, or `kitabu-authored` for original work. */
  source: string;
  creator?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AssetManifestEntry {
  id: string;
  kind: AssetKind;
  uri: string;
  mimeType: string;
  byteSize: number;
  /** Lower-case hexadecimal SHA-256 digest (without a `sha256:` prefix). */
  sha256: string;
  licence: AssetLicence;
  provenance: AssetProvenance;
}

export interface AssetManifest {
  manifestVersion: 1;
  assets: readonly AssetManifestEntry[];
}

export interface AssetBudget {
  maxAssetCount: number;
  maxTotalBytes: number;
  maxBytesPerAsset: number;
  maxBytesByKind?: Partial<Record<AssetKind, number>>;
}

export interface AssetTrustPolicy {
  /** URI schemes without a trailing colon, for example `https`. */
  allowedSchemes: readonly string[];
  /** Required for network URLs. Values are URL origins such as `https://cdn.kitabu.ai`. */
  allowedOrigins: readonly string[];
  allowedMimeTypes: readonly string[];
  budget: AssetBudget;
}

export interface AssetValidationIssue {
  path: string;
  code:
    | 'invalid_manifest'
    | 'invalid_id'
    | 'duplicate_id'
    | 'invalid_uri'
    | 'scheme_not_allowed'
    | 'origin_not_allowed'
    | 'mime_not_allowed'
    | 'invalid_size'
    | 'invalid_sha256'
    | 'missing_licence'
    | 'missing_provenance'
    | 'budget_exceeded';
  message: string;
}

export type AssetManifestValidationResult =
  | { ok: true; manifest: AssetManifest }
  | { ok: false; issues: AssetValidationIssue[] };

const ASSET_KINDS: readonly AssetKind[] = ['image', 'audio', 'video', 'model-3d', 'document', 'font', 'data'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAssetKind(value: unknown): value is AssetKind {
  return ASSET_KINDS.includes(value as AssetKind);
}

function validatePolicy(policy: AssetTrustPolicy): void {
  const numbers = [policy.budget.maxAssetCount, policy.budget.maxTotalBytes, policy.budget.maxBytesPerAsset];
  if (numbers.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError('Asset budget limits must be non-negative safe integers');
  }
}

function validateUri(
  rawUri: unknown,
  allowedSchemes: Set<string>,
  allowedOrigins: Set<string>,
  path: string,
  add: (path: string, code: AssetValidationIssue['code'], message: string) => void
): void {
  if (!nonEmptyString(rawUri)) {
    add(path, 'invalid_uri', 'Asset URI must be a non-empty absolute URI');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUri);
  } catch {
    add(path, 'invalid_uri', 'Asset URI must be a valid absolute URI');
    return;
  }

  const scheme = parsed.protocol.slice(0, -1).toLowerCase();
  if (!allowedSchemes.has(scheme)) {
    add(path, 'scheme_not_allowed', `URI scheme '${scheme}' is not allowed`);
    return;
  }

  if ((scheme === 'http' || scheme === 'https') && !allowedOrigins.has(parsed.origin.toLowerCase())) {
    add(path, 'origin_not_allowed', `URI origin '${parsed.origin}' is not trusted`);
  }
}

export function validateAssetManifest(
  value: unknown,
  policy: AssetTrustPolicy
): AssetManifestValidationResult {
  validatePolicy(policy);
  const issues: AssetValidationIssue[] = [];
  const add = (path: string, code: AssetValidationIssue['code'], message: string): void => {
    issues.push({ path, code, message });
  };
  if (!isRecord(value) || value.manifestVersion !== 1 || !Array.isArray(value.assets)) {
    add('$', 'invalid_manifest', 'Expected asset manifest version 1 with an assets array');
    return { ok: false, issues };
  }

  const allowedSchemes = new Set(policy.allowedSchemes.map((item) => item.toLowerCase().replace(/:$/, '')));
  const allowedOrigins = new Set(policy.allowedOrigins.map((item) => {
    try { return new URL(item).origin.toLowerCase(); } catch { return ''; }
  }));
  const allowedMimeTypes = new Set(policy.allowedMimeTypes);
  const seenIds = new Set<string>();
  const bytesByKind: Partial<Record<AssetKind, number>> = {};
  let totalBytes = 0;

  value.assets.forEach((candidate, index) => {
    const path = `$.assets[${index}]`;
    if (!isRecord(candidate)) {
      add(path, 'invalid_manifest', 'Asset entry must be an object');
      return;
    }

    if (!nonEmptyString(candidate.id) || !ASSET_ID_PATTERN.test(candidate.id)) {
      add(`${path}.id`, 'invalid_id', 'Asset ID must be 1-128 lowercase URL-safe characters');
    } else if (seenIds.has(candidate.id)) {
      add(`${path}.id`, 'duplicate_id', `Duplicate asset ID '${candidate.id}'`);
    } else {
      seenIds.add(candidate.id);
    }

    validateUri(candidate.uri, allowedSchemes, allowedOrigins, `${path}.uri`, add);

    if (!nonEmptyString(candidate.mimeType) || !allowedMimeTypes.has(candidate.mimeType.toLowerCase())) {
      add(`${path}.mimeType`, 'mime_not_allowed', 'Asset MIME type is not allowed');
    }

    const size = candidate.byteSize;
    const validSize = typeof size === 'number' && Number.isSafeInteger(size) && size >= 0;
    if (!validSize) {
      add(`${path}.byteSize`, 'invalid_size', 'Asset byte size must be a non-negative safe integer');
    } else {
      totalBytes += size;
      if (size > policy.budget.maxBytesPerAsset) {
        add(`${path}.byteSize`, 'budget_exceeded', 'Asset exceeds the per-asset byte budget');
      }
    }

    if (!nonEmptyString(candidate.sha256) || !SHA256_PATTERN.test(candidate.sha256)) {
      add(`${path}.sha256`, 'invalid_sha256', 'SHA-256 must be exactly 64 lower-case hexadecimal characters');
    }

    if (!isRecord(candidate.licence) || !nonEmptyString(candidate.licence.id)) {
      add(`${path}.licence`, 'missing_licence', 'Asset licence ID is required');
    }
    if (!isRecord(candidate.provenance) || !nonEmptyString(candidate.provenance.source)) {
      add(`${path}.provenance`, 'missing_provenance', 'Asset provenance source is required');
    }

    if (!isAssetKind(candidate.kind)) {
      add(`${path}.kind`, 'invalid_manifest', 'Asset kind is not supported');
    } else if (validSize) {
      bytesByKind[candidate.kind] = (bytesByKind[candidate.kind] ?? 0) + size;
    }
  });

  if (value.assets.length > policy.budget.maxAssetCount) {
    add('$.assets', 'budget_exceeded', 'Manifest exceeds the asset count budget');
  }
  if (totalBytes > policy.budget.maxTotalBytes) {
    add('$.assets', 'budget_exceeded', 'Manifest exceeds the total byte budget');
  }
  for (const kind of ASSET_KINDS) {
    const limit = policy.budget.maxBytesByKind?.[kind];
    if (limit !== undefined && (bytesByKind[kind] ?? 0) > limit) {
      add('$.assets', 'budget_exceeded', `Manifest exceeds the '${kind}' byte budget`);
    }
  }

  return issues.length === 0
    ? { ok: true, manifest: value as unknown as AssetManifest }
    : { ok: false, issues };
}

export interface AssetDigestCheck {
  assetId: string;
  uri: string;
  expectedSha256: string;
}

export interface AssetVerificationFailure extends AssetDigestCheck {
  reason: 'digest_mismatch' | 'check_failed';
  message?: string;
}

export interface AssetVerificationResult {
  ok: boolean;
  failures: AssetVerificationFailure[];
}

/**
 * Verifies manifest digests using a host-supplied check. This keeps filesystem,
 * network and crypto APIs out of the shared runtime contract.
 */
export async function verifyAssetManifestDigests(
  manifest: AssetManifest,
  check: (request: AssetDigestCheck) => boolean | Promise<boolean>
): Promise<AssetVerificationResult> {
  const failures: AssetVerificationFailure[] = [];
  for (const asset of manifest.assets) {
    const request: AssetDigestCheck = {
      assetId: asset.id,
      uri: asset.uri,
      expectedSha256: asset.sha256
    };
    try {
      if (!(await check(request))) failures.push({ ...request, reason: 'digest_mismatch' });
    } catch (error) {
      failures.push({
        ...request,
        reason: 'check_failed',
        message: error instanceof Error ? error.message : 'Digest check failed'
      });
    }
  }
  return { ok: failures.length === 0, failures };
}
