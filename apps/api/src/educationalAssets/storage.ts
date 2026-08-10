import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { appConfig } from '../config.js';

export type EducationalAssetStorageBackend = 'local' | 'http-put';

export interface EducationalAssetStorage {
  readonly backend: EducationalAssetStorageBackend;
  put(storageKey: string, content: Uint8Array, mimeType: string): Promise<{ storageKey: string; byteSize: number; created?: boolean }>;
  read(storageKey: string): Promise<Uint8Array>;
  publicUrl(storageKey: string): string | null;
  writeJsonAtomic(storageKey: string, value: unknown): Promise<{ storageKey: string; byteSize: number }>;
  remove?(storageKey: string): Promise<boolean>;
}

function assertSafeRemoteStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.includes('\0') || storageKey.startsWith('/') || storageKey.startsWith('\\') || storageKey.split(/[\\/]/).includes('..')) {
    throw new Error('Invalid asset storage key');
  }
}

function publicUrlForKey(publicBaseUrl: string | null, storageKey: string): string | null {
  if (!publicBaseUrl) return null;
  assertSafeRemoteStorageKey(storageKey);
  return `${publicBaseUrl}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

function resolveStoragePath(rootDirectory: string, storageKey: string): string {
  if (!storageKey || storageKey.includes('\0') || storageKey.startsWith('/') || storageKey.startsWith('\\')) {
    throw new Error('Invalid asset storage key');
  }
  const root = resolve(rootDirectory);
  const target = resolve(root, storageKey);
  if (target === root || !target.startsWith(`${root}${sep}`)) throw new Error('Asset storage key escapes the storage root');
  return target;
}

export class LocalFilesystemAssetStorage {
  constructor(private readonly rootDirectory: string) {}

  async put(storageKey: string, content: Uint8Array, _mimeType?: string): Promise<{ storageKey: string; byteSize: number; created: boolean }> {
    const target = resolveStoragePath(this.rootDirectory, storageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    let created = true;
    await writeFile(target, content, { flag: 'wx' }).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      created = false;
    });
    return { storageKey, byteSize: content.byteLength, created };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(resolveStoragePath(this.rootDirectory, storageKey));
  }

  async remove(storageKey: string): Promise<boolean> {
    const target = resolveStoragePath(this.rootDirectory, storageKey);
    try {
      await unlink(target);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async writeJsonAtomic(storageKey: string, value: unknown): Promise<{ storageKey: string; byteSize: number }> {
    const target = resolveStoragePath(this.rootDirectory, storageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    const content = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, target);
    return { storageKey, byteSize: content.byteLength };
  }
}

export class LocalEducationalAssetStorage implements EducationalAssetStorage {
  readonly backend = 'local' as const;
  private readonly storage: LocalFilesystemAssetStorage;
  private readonly publicBaseUrl: string | null;

  constructor(rootDirectory: string, publicBaseUrl?: string) {
    this.storage = new LocalFilesystemAssetStorage(rootDirectory);
    this.publicBaseUrl = publicBaseUrl?.replace(/\/$/, '') || null;
  }

  put(storageKey: string, content: Uint8Array, mimeType: string) {
    return this.storage.put(storageKey, content, mimeType);
  }

  read(storageKey: string) {
    return this.storage.read(storageKey);
  }

  remove(storageKey: string) {
    return this.storage.remove(storageKey);
  }

  publicUrl(storageKey: string) {
    return publicUrlForKey(this.publicBaseUrl, storageKey);
  }

  writeJsonAtomic(storageKey: string, value: unknown) {
    return this.storage.writeJsonAtomic(storageKey, value);
  }
}

export class HttpPutEducationalAssetStorage implements EducationalAssetStorage {
  readonly backend = 'http-put' as const;
  private readonly uploadUrlTemplate: string;
  private readonly publicBaseUrl: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(uploadUrlTemplate: string, publicBaseUrl?: string, fetchImpl: typeof fetch = globalThis.fetch) {
    this.uploadUrlTemplate = uploadUrlTemplate;
    this.publicBaseUrl = publicBaseUrl?.replace(/\/$/, '') || null;
    this.fetchImpl = fetchImpl;
  }

  private urlFor(storageKey: string): string {
    assertSafeRemoteStorageKey(storageKey);
    return this.uploadUrlTemplate.replace('{key}', encodeURIComponent(storageKey));
  }

  async put(storageKey: string, content: Uint8Array, mimeType: string) {
    const response = await this.fetchImpl(this.urlFor(storageKey), {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: Buffer.from(content),
    });
    if (!response.ok) throw new Error(`Educational asset remote storage upload failed: ${response.status}`);
    return { storageKey, byteSize: content.byteLength };
  }

  async read(storageKey: string) {
    const url = this.publicUrl(storageKey);
    if (!url) throw new Error('Educational asset remote storage requires KITABU_EDUCATIONAL_ASSET_STORAGE_PUBLIC_BASE_URL for reads');
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error(`Educational asset remote storage read failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  publicUrl(storageKey: string) {
    return publicUrlForKey(this.publicBaseUrl, storageKey);
  }

  async writeJsonAtomic(storageKey: string, value: unknown) {
    return this.put(storageKey, Buffer.from(`${JSON.stringify(value, null, 2)}\n`), 'application/json');
  }
}

export async function persistEducationalAssetWithCleanup<T>(
  storage: EducationalAssetStorage,
  storageKey: string,
  content: Uint8Array,
  mimeType: string,
  create: () => Promise<T>,
): Promise<T> {
  const stored = await storage.put(storageKey, content, mimeType);
  try {
    return await create();
  } catch (error) {
    if (stored.created === true && storage.remove) {
      await storage.remove(storageKey).catch(() => undefined);
    }
    throw error;
  }
}

export function createEducationalAssetStorage(): EducationalAssetStorage {
  if (appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_BACKEND === 'http-put') {
    if (!appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_UPLOAD_URL_TEMPLATE) {
      throw new Error('KITABU_EDUCATIONAL_ASSET_STORAGE_UPLOAD_URL_TEMPLATE is required for http-put educational asset storage');
    }
    return new HttpPutEducationalAssetStorage(
      appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_UPLOAD_URL_TEMPLATE,
      appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_PUBLIC_BASE_URL,
    );
  }
  return new LocalEducationalAssetStorage(
    appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT,
    appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_PUBLIC_BASE_URL,
  );
}
