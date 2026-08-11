import { appConfig } from './config.js';
import { LocalFilesystemAssetStorage } from './educationalAssets/storage.js';

export interface TtsAssetStorage {
  readonly backend: 'local' | 'http-put' | 'supabase';
  put(storageKey: string, content: Uint8Array): Promise<{ readonly storageKey: string; readonly byteSize: number }>;
  read(storageKey: string): Promise<Uint8Array>;
  publicUrl(storageKey: string): string | null;
}

function assertSafeStorageKey(storageKey: string): void {
  if (
    !storageKey ||
    storageKey.includes('\0') ||
    storageKey.startsWith('/') ||
    storageKey.startsWith('\\') ||
    storageKey.split(/[\\/]/).includes('..')
  ) {
    throw new Error('Invalid TTS storage key');
  }
}

function encodeStorageKey(storageKey: string): string {
  assertSafeStorageKey(storageKey);
  return storageKey.split('/').map(encodeURIComponent).join('/');
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

export class SupabaseTtsAssetStorage implements TtsAssetStorage {
  readonly backend = 'supabase' as const;
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(
    supabaseUrl: string,
    serviceRoleKey: string,
    bucket: string,
    publicBaseUrl?: string,
    fetchImpl: typeof fetch = globalThis.fetch
  ) {
    this.baseUrl = supabaseUrl.replace(/\/$/, '');
    this.serviceRoleKey = serviceRoleKey;
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl?.replace(/\/$/, '') || null;
    this.fetchImpl = fetchImpl;
  }

  private objectUrl(storageKey: string): string {
    return `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeStorageKey(storageKey)}`;
  }

  private headers(contentType?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      ...(contentType ? { 'Content-Type': contentType } : {})
    };
  }

  async put(storageKey: string, content: Uint8Array) {
    const response = await this.fetchImpl(this.objectUrl(storageKey), {
      method: 'POST',
      headers: {
        ...this.headers('audio/wav'),
        'x-upsert': 'true',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline'
      },
      body: Buffer.from(content)
    });
    if (!response.ok) throw new Error(`Supabase TTS storage upload failed: ${response.status}`);
    return { storageKey, byteSize: content.byteLength };
  }

  async read(storageKey: string) {
    const response = await this.fetchImpl(this.objectUrl(storageKey), {
      headers: this.headers()
    });
    if (!response.ok) throw new Error(`Supabase TTS storage read failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  publicUrl(storageKey: string) {
    assertSafeStorageKey(storageKey);
    return this.publicBaseUrl ? `${this.publicBaseUrl}/${encodeStorageKey(storageKey)}` : null;
  }
}

export function createTtsAssetStorage(): TtsAssetStorage {
  if (appConfig.KITABU_TTS_STORAGE_BACKEND === 'supabase') {
    if (!appConfig.KITABU_SUPABASE_URL || !appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('KITABU_SUPABASE_URL and KITABU_SUPABASE_SERVICE_ROLE_KEY are required for Supabase TTS storage');
    }
    return new SupabaseTtsAssetStorage(
      appConfig.KITABU_SUPABASE_URL,
      appConfig.KITABU_SUPABASE_SERVICE_ROLE_KEY,
      appConfig.KITABU_TTS_STORAGE_BUCKET,
      appConfig.KITABU_TTS_PUBLIC_BASE_URL ?? appConfig.KITABU_TTS_STORAGE_PUBLIC_BASE_URL
    );
  }
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
