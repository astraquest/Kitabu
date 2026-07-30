import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';

export interface LearningAssetSummary {
  assetId: string;
  version: string;
  displayName: string;
  kind: 'model-3d';
  status: string;
}

export interface LearningAssetCatalog {
  assets: LearningAssetSummary[];
  totalReady: number;
  totalRegistered: number;
}

type RegistryAsset = {
  assetId?: unknown;
  version?: unknown;
  displayName?: unknown;
  kind?: unknown;
  status?: unknown;
  manifest?: unknown;
};

type ManifestFile = {
  id?: unknown;
  role?: unknown;
  path?: unknown;
  mimeType?: unknown;
  variant?: unknown;
};

type ManifestRuntime = {
  format?: unknown;
  entrypoint?: unknown;
  trustedBundle?: unknown;
};

export interface LearningAssetFile {
  absolutePath: string;
  mimeType: string;
}

function registryCandidates() {
  return [
    process.env.KITABU_LEARNING_ASSET_REGISTRY?.trim(),
    resolve(process.cwd(), 'data', 'learning-assets', 'registry.json'),
    resolve(process.cwd(), 'learning-assets', 'registry.json'),
    resolve(process.cwd(), '..', '..', 'learning-assets', 'registry.json'),
  ].filter((candidate): candidate is string => Boolean(candidate));
}

async function readFirstAvailableRegistry() {
  let lastError: unknown;
  for (const candidate of registryCandidates()) {
    try {
      return { path: candidate, json: await readFile(candidate, 'utf8') };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Learning asset registry is unavailable');
}

export async function readLearningAssetCatalog(registryJson?: string): Promise<LearningAssetCatalog> {
  const parsed = JSON.parse(registryJson ?? (await readFirstAvailableRegistry()).json) as { assets?: unknown };
  const registered = Array.isArray(parsed.assets) ? parsed.assets as RegistryAsset[] : [];
  const assets = registered.flatMap(asset => {
    if (
      asset.kind !== 'model-3d' ||
      typeof asset.assetId !== 'string' ||
      typeof asset.version !== 'string' ||
      typeof asset.displayName !== 'string' ||
      typeof asset.status !== 'string'
    ) {
      return [];
    }
    return [{
      assetId: asset.assetId,
      version: asset.version,
      displayName: asset.displayName,
      kind: 'model-3d' as const,
      status: asset.status,
    }];
  });

  return {
    assets,
    totalReady: assets.filter(asset => asset.status === 'ready').length,
    totalRegistered: registered.length,
  };
}

function resolveInside(root: string, relativePath: string) {
  const normalizedRoot = resolve(root);
  const target = resolve(normalizedRoot, relativePath);
  if (target !== normalizedRoot && !target.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error('Learning asset path escapes its registered package');
  }
  return target;
}

export async function resolveLearningAssetRuntimeFile(
  assetId: string,
  version: string,
  requestedPath?: string,
): Promise<LearningAssetFile | null> {
  const registry = await readFirstAvailableRegistry();
  const parsed = JSON.parse(registry.json) as { assets?: unknown };
  const entries = Array.isArray(parsed.assets) ? parsed.assets as RegistryAsset[] : [];
  const entry = entries.find(asset => asset.assetId === assetId && asset.version === version);
  if (!entry || typeof entry.manifest !== 'string') return null;

  const manifestPath = resolveInside(dirname(registry.path), entry.manifest);
  const assetRoot = dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { files?: unknown; runtime?: ManifestRuntime };
  const runtime = manifest.runtime;
  if (
    runtime?.format !== 'procedural-threejs' ||
    runtime.trustedBundle !== true ||
    typeof runtime.entrypoint !== 'string'
  ) return null;

  const files = Array.isArray(manifest.files) ? manifest.files as ManifestFile[] : [];
  const entrypointPath = resolveInside(assetRoot, runtime.entrypoint);
  const runtimeRoot = dirname(entrypointPath);
  const absolutePath = resolveInside(runtimeRoot, requestedPath || basename(entrypointPath));
  const packagePath = relative(assetRoot, absolutePath).split(sep).join('/');
  const file = files.find(candidate => candidate.role === 'runtime' && candidate.path === packagePath);
  if (!file) return null;

  const extension = extname(packagePath).toLowerCase();
  return {
    absolutePath,
    mimeType: typeof file.mimeType === 'string'
      ? file.mimeType
      : extension === '.html' ? 'text/html; charset=utf-8'
        : extension === '.css' ? 'text/css; charset=utf-8'
          : extension === '.js' ? 'text/javascript; charset=utf-8'
            : extension === '.png' ? 'image/png'
              : extension === '.webp' ? 'image/webp'
                : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'application/octet-stream',
  };
}
