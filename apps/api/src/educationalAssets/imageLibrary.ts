import { createHash } from 'node:crypto';

export const IMAGE_LIBRARY_VERSION = 'v1';
export const IMAGE_LIBRARY_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const IMAGE_LIBRARY_CONTENT_DISPOSITION = 'inline';

export type ImageLibraryEntry = {
  sourceName: string;
  storageKey: string;
  sha256: string;
  byteSize: number;
  width: number;
  height: number;
  mimeType: 'image/png';
  keywords: string[];
  reviewStatus: 'review';
};

export function normalizeImageLibrarySlug(filename: string): string {
  const stem = filename.replace(/\.png$/i, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`Image library filename has no safe key: ${filename}`);
  return slug;
}

export function imageLibraryStorageKey(filename: string): string {
  return `image-library/${IMAGE_LIBRARY_VERSION}/${normalizeImageLibrarySlug(filename)}.png`;
}

export function imageLibraryPublicUrl(publicBaseUrl: string | undefined, storageKey: string): string | undefined {
  const baseUrl = publicBaseUrl?.trim().replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/${storageKey.split('/').map(encodeURIComponent).join('/')}` : undefined;
}

export function imageLibraryRenderUrl(projectUrl: string | undefined, bucket: string, storageKey: string): string | undefined {
  const baseUrl = projectUrl?.trim().replace(/\/$/, '');
  if (!baseUrl) return undefined;
  return `${baseUrl}/storage/v1/render/image/public/${encodeURIComponent(bucket)}/${storageKey.split('/').map(encodeURIComponent).join('/')}?width=1024&quality=90`;
}

export function pngDimensions(content: Uint8Array): { width: number; height: number } {
  const bytes = Buffer.from(content);
  if (bytes.length < 24 || bytes.subarray(0, 8).compare(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) !== 0) {
    throw new Error('Image library asset must be a PNG.');
  }
  if (bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Image library PNG is missing IHDR.');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error('Image library PNG dimensions are invalid.');
  return { width, height };
}

export function inventoryImageLibraryEntry(sourceName: string, content: Uint8Array): ImageLibraryEntry {
  const { width, height } = pngDimensions(content);
  const slug = normalizeImageLibrarySlug(sourceName);
  return {
    sourceName,
    storageKey: imageLibraryStorageKey(sourceName),
    sha256: createHash('sha256').update(content).digest('hex'),
    byteSize: content.byteLength,
    width,
    height,
    mimeType: 'image/png',
    keywords: ['image-library', 'user-provided', ...slug.split('-')],
    reviewStatus: 'review',
  };
}
