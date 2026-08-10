import { createHash } from 'node:crypto';

export function sha256EducationalAsset(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export function isSha256Digest(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
