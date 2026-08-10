import { assertSafeEducationalAssetSvg } from './svgSafety.js';
import type { EducationalAssetMediaType } from './types.js';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;

export function validateDownloadedEducationalAsset(content: Uint8Array, mimeType: string): EducationalAssetMediaType {
  if (!content.byteLength || content.byteLength > MAX_ASSET_BYTES) throw new Error('Asset byte size is outside the allowed range');
  const text = new TextDecoder().decode(content.subarray(0, Math.min(content.byteLength, 4096)));
  if (mimeType === 'image/svg+xml') {
    assertSafeEducationalAssetSvg(text);
    return 'vector';
  }
  const bytes = content;
  if (mimeType === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image';
  if (mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image';
  if (mimeType === 'image/gif' && (text.startsWith('GIF87a') || text.startsWith('GIF89a'))) return 'image';
  if (mimeType === 'image/webp' && text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image';
  throw new Error('Downloaded asset does not match its declared image type');
}
