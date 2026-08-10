import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';

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

  async put(storageKey: string, content: Uint8Array): Promise<{ storageKey: string; byteSize: number }> {
    const target = resolveStoragePath(this.rootDirectory, storageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, content, { flag: 'wx' }).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    });
    return { storageKey, byteSize: content.byteLength };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(resolveStoragePath(this.rootDirectory, storageKey));
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
