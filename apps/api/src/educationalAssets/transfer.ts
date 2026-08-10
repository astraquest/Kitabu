import { createHash } from 'node:crypto';

import { assertSafeEducationalAssetStorageKey, type EducationalAssetStorage } from './storage.js';

export interface LocalEducationalAssetTransferCandidate {
  id: string;
  storageBackend: 'local' | 'http-put' | 'supabase';
  storageKey: string;
  contentSha256: string;
  mimeType: string;
}

export interface EducationalAssetTransferSource {
  read(storageKey: string): Promise<Uint8Array>;
}

export interface EducationalAssetTransferResult {
  scanned: number;
  uploaded: number;
  alreadyPresent: number;
  dryRun: number;
  hashMismatch: number;
  unavailable: number;
  unsafe: number;
  failed: number;
}

export async function transferLocalEducationalAssets(
  candidates: readonly LocalEducationalAssetTransferCandidate[],
  source: EducationalAssetTransferSource,
  destination: Pick<EducationalAssetStorage, 'put'> | undefined,
  options: { dryRun: boolean },
): Promise<EducationalAssetTransferResult> {
  const result: EducationalAssetTransferResult = {
    scanned: 0, uploaded: 0, alreadyPresent: 0, dryRun: 0, hashMismatch: 0, unavailable: 0, unsafe: 0, failed: 0,
  };

  for (const candidate of candidates) {
    result.scanned += 1;
    if (candidate.storageBackend !== 'local') {
      result.unsafe += 1;
      continue;
    }
    try {
      assertSafeEducationalAssetStorageKey(candidate.storageKey);
    } catch {
      result.unsafe += 1;
      continue;
    }

    let content: Uint8Array;
    try {
      content = await source.read(candidate.storageKey);
    } catch {
      result.unavailable += 1;
      continue;
    }
    const contentSha256 = createHash('sha256').update(content).digest('hex');
    if (contentSha256 !== candidate.contentSha256.toLowerCase()) {
      result.hashMismatch += 1;
      continue;
    }
    if (options.dryRun) {
      result.dryRun += 1;
      continue;
    }
    try {
      const stored = await destination?.put(candidate.storageKey, content, candidate.mimeType);
      if (!stored) throw new Error('Transfer destination is required when applying');
      if (stored.created === false) result.alreadyPresent += 1;
      else result.uploaded += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
