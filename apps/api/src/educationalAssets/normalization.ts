import { sha256EducationalAsset } from './deduplication.js';
import { assertSafeEducationalAssetSvg } from './svgSafety.js';
import type { EducationalAssetNormalizationStatus } from './classification.js';

export interface EducationalAssetDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface EducationalAssetNormalizationResult {
  status: EducationalAssetNormalizationStatus;
  dimensions: EducationalAssetDimensions | null;
  visualHash: string | null;
}

export const MAX_EDUCATIONAL_ASSET_RASTER_DIMENSION = 8192;
export const MAX_EDUCATIONAL_ASSET_RASTER_PIXELS = 25_000_000;

function dimensions(width: number, height: number): EducationalAssetDimensions | null {
  const pixelCount = width * height;
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    && width <= MAX_EDUCATIONAL_ASSET_RASTER_DIMENSION
    && height <= MAX_EDUCATIONAL_ASSET_RASTER_DIMENSION
    && Number.isSafeInteger(pixelCount)
    && pixelCount <= MAX_EDUCATIONAL_ASSET_RASTER_PIXELS
    ? { width, height, aspectRatio: width / height }
    : null;
}

function u16le(bytes: Uint8Array, offset: number): number | null {
  return offset + 2 <= bytes.length ? bytes[offset]! | bytes[offset + 1]! << 8 : null;
}

function u24le(bytes: Uint8Array, offset: number): number | null {
  return offset + 3 <= bytes.length ? bytes[offset]! | bytes[offset + 1]! << 8 | bytes[offset + 2]! << 16 : null;
}

function u32be(bytes: Uint8Array, offset: number): number | null {
  return offset + 4 <= bytes.length ? (bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]! : null;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52;
}

function pngDimensions(bytes: Uint8Array): EducationalAssetDimensions | null {
  return dimensions(u32be(bytes, 16) ?? 0, u32be(bytes, 20) ?? 0);
}

function jpegDimensions(bytes: Uint8Array): EducationalAssetDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++]!;
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = ((bytes[offset]! ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    if (length < 2 || offset + length > bytes.length) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return dimensions((((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0)), (((bytes[offset + 3] ?? 0) << 8) | (bytes[offset + 4] ?? 0)));
    }
    offset += length;
  }
  return null;
}

function gifDimensions(bytes: Uint8Array): EducationalAssetDimensions | null {
  const signature = new TextDecoder().decode(bytes.subarray(0, 6));
  return (signature === 'GIF87a' || signature === 'GIF89a') ? dimensions(u16le(bytes, 6) ?? 0, u16le(bytes, 8) ?? 0) : null;
}

function webpDimensions(bytes: Uint8Array): EducationalAssetDimensions | null {
  const signature = new TextDecoder().decode(bytes.subarray(0, 4));
  const format = new TextDecoder().decode(bytes.subarray(8, 16));
  if (signature !== 'RIFF' || format.slice(0, 4) !== 'WEBP' || bytes.length < 21) return null;
  const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
  if (chunk === 'VP8X') return dimensions((u24le(bytes, 24) ?? -1) + 1, (u24le(bytes, 27) ?? -1) + 1);
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return dimensions((u16le(bytes, 26) ?? 0) & 0x3fff, (u16le(bytes, 28) ?? 0) & 0x3fff);
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const b0 = bytes[21] ?? 0; const b1 = bytes[22] ?? 0; const b2 = bytes[23] ?? 0; const b3 = bytes[24] ?? 0;
    return dimensions(1 + ((b0 | b1 << 8) & 0x3fff), 1 + ((b1 >> 6 | b2 << 2 | b3 << 10) & 0x3fff));
  }
  return null;
}

export function parseEducationalAssetRasterDimensions(content: Uint8Array): EducationalAssetDimensions | null {
  return isPng(content) ? pngDimensions(content) : jpegDimensions(content) ?? gifDimensions(content) ?? webpDimensions(content);
}

function canonicalizeSimpleSvgTag(tag: string): string | null {
  const selfClosing = tag.endsWith('/>');
  const body = tag.slice(1, selfClosing ? -2 : -1);
  const match = body.match(/^([A-Za-z][\w:.-]*)([\s\S]*)$/);
  if (!match) return null;
  const [, name, rawAttributes] = match;
  const attributes = rawAttributes.trimEnd();
  const parsed: Array<[string, string]> = [];
  const attributePattern = /\s+([\w:.-]+)\s*=\s*("[^"]*"|'[^']*')/gy;
  let offset = 0;
  while (offset < attributes.length) {
    attributePattern.lastIndex = offset;
    const attribute = attributePattern.exec(attributes);
    if (!attribute) return null;
    parsed.push([attribute[1]!, attribute[2]!]);
    offset = attributePattern.lastIndex;
  }
  return `<${name}${parsed.sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => ` ${key}=${value}`).join('')}${selfClosing ? '/' : ''}>`;
}

export function canonicalizeSafeEducationalAssetSvg(svg: string): string {
  assertSafeEducationalAssetSvg(svg);
  const stable = svg.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/>\s+</g, '><').trim();
  let failed = false;
  const canonical = stable.replace(/<[A-Za-z][^<>]*>/g, tag => {
    const normalized = canonicalizeSimpleSvgTag(tag);
    if (!normalized) failed = true;
    return normalized ?? tag;
  });
  return failed ? stable : canonical;
}

export function educationalAssetNormalizationStatusForMimeType(mimeType: string): EducationalAssetNormalizationStatus {
  if (mimeType === 'image/svg+xml') return 'validated-original';
  return mimeType.startsWith('image/') ? 'needs-normalization' : 'quarantined';
}

export function analyzeEducationalAssetNormalization(content: Uint8Array, mimeType: string): EducationalAssetNormalizationResult {
  if (mimeType === 'image/svg+xml') {
    const canonical = canonicalizeSafeEducationalAssetSvg(new TextDecoder().decode(content));
    return { status: 'validated-original', dimensions: null, visualHash: sha256EducationalAsset(new TextEncoder().encode(canonical)) };
  }
  const rasterDimensions = parseEducationalAssetRasterDimensions(content);
  if (rasterDimensions) return { status: 'needs-normalization', dimensions: rasterDimensions, visualHash: null };
  return { status: 'quarantined', dimensions: null, visualHash: null };
}
