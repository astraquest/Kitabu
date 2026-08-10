import { appConfig } from './config.js';
import { LocalFilesystemAssetStorage } from './educationalAssets/storage.js';

export interface TtsAssetStorage {
  readonly backend: 'local' | 'http-put';
  put(storageKey: string, content: Uint8Array): Promise<{ readonly storageKey: string; readonly byteSize: number }>;
  read(storageKey: string): Promise<Uint8Array>;
  publicUrl(storageKey: string): string | null;
}

export class LocalTtsAssetStorage implements TtsAssetStorage {
  readonly backend = 'local' as const;
  private readonly storage: LocalFilesystemAssetStorage;
  private readonly publicBaseUrl: string | null;

  constructor(rootDirectory: string, publicBaseUrl?: string) {
    this.storage = new LocalFilesystemAssetStorage(rootDirectory);
    this.publicBaseUrl = publicBaseUrl?.replace(/\/$/, '') || null;
  }

  put(storageKey: string, content: Uint8Array) {
    return this.storage.put(storageKey, content);
  }

  read(storageKey: string) {
    return this.storage.read(storageKey);
  }

  publicUrl(storageKey: string) {
    return this.publicBaseUrl ? `${this.publicBaseUrl}/${storageKey}` : null;
  }
}

export class HttpPutTtsAssetStorage implements TtsAssetStorage {
  readonly backend = 'http-put' as const;
  private readonly uploadUrlTemplate: string;
  private readonly publicBaseUrl: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(uploadUrlTemplate: string, publicBaseUrl?: string, fetchImpl: typeof fetch = globalThis.fetch) {
    this.uploadUrlTemplate = uploadUrlTemplate;
    this.publicBaseUrl = publicBaseUrl?.replace(/\/$/, '') || null;
    this.fetchImpl = fetchImpl;
  }

  private urlFor(storageKey: string) {
    return this.uploadUrlTemplate.replace('{key}', encodeURIComponent(storageKey));
  }

  async put(storageKey: string, content: Uint8Array) {
    const response = await this.fetchImpl(this.urlFor(storageKey), {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/wav' },
      body: Buffer.from(content)
    });
    if (!response.ok) throw new Error(`TTS remote storage upload failed: ${response.status}`);
    return { storageKey, byteSize: content.byteLength };
  }

  async read(storageKey: string) {
    const url = this.publicUrl(storageKey);
    if (!url) throw new Error('TTS remote storage requires KITABU_TTS_STORAGE_PUBLIC_BASE_URL for reads');
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error(`TTS remote storage read failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  publicUrl(storageKey: string) {
    return this.publicBaseUrl ? `${this.publicBaseUrl}/${storageKey}` : null;
  }
}

export function createTtsAssetStorage(): TtsAssetStorage {
  if (appConfig.KITABU_TTS_STORAGE_BACKEND === 'http-put') {
    if (!appConfig.KITABU_TTS_STORAGE_UPLOAD_URL_TEMPLATE) {
      throw new Error('KITABU_TTS_STORAGE_UPLOAD_URL_TEMPLATE is required for http-put TTS storage');
    }
    return new HttpPutTtsAssetStorage(
      appConfig.KITABU_TTS_STORAGE_UPLOAD_URL_TEMPLATE,
      appConfig.KITABU_TTS_STORAGE_PUBLIC_BASE_URL
    );
  }
  return new LocalTtsAssetStorage(
    appConfig.KITABU_TTS_STORAGE_ROOT,
    appConfig.KITABU_TTS_STORAGE_PUBLIC_BASE_URL
  );
}
