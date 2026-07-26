import type { ComponentManifest } from './contract.js';

export type ManifestParser = (value: unknown) => ComponentManifest;

export type RegistryErrorCode =
  | 'invalid-manifest'
  | 'duplicate-component-version'
  | 'component-version-not-installed';

export class ComponentRegistryError extends Error {
  readonly code: RegistryErrorCode;

  constructor(code: RegistryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ComponentRegistryError';
    this.code = code;
  }
}

export interface InstalledComponentRegistry {
  readonly size: number;
  list(): readonly ComponentManifest[];
  has(componentId: string, componentVersion: string): boolean;
  get(componentId: string, componentVersion: string): ComponentManifest | undefined;
  resolve(componentId: string, componentVersion: string): ComponentManifest;
}

/**
 * Builds the registry of component versions compiled into this runtime.
 *
 * The parser is deliberately supplied by the host so the registry has one
 * validation authority instead of maintaining a second manifest validator.
 */
export function createInstalledComponentRegistry(
  values: readonly unknown[],
  parseManifest: ManifestParser,
): InstalledComponentRegistry {
  const manifests: ComponentManifest[] = [];
  const byComponent = new Map<string, Map<string, ComponentManifest>>();

  for (const [index, value] of values.entries()) {
    let manifest: ComponentManifest;
    try {
      manifest = parseManifest(value);
    } catch (cause) {
      throw new ComponentRegistryError(
        'invalid-manifest',
        `Installed component manifest at index ${index} is invalid.`,
        { cause },
      );
    }

    const { componentId, componentVersion } = manifest.identity;
    let versions = byComponent.get(componentId);
    if (!versions) {
      versions = new Map<string, ComponentManifest>();
      byComponent.set(componentId, versions);
    }

    if (versions.has(componentVersion)) {
      throw new ComponentRegistryError(
        'duplicate-component-version',
        `Component "${componentId}" version "${componentVersion}" is installed more than once.`,
      );
    }

    versions.set(componentVersion, manifest);
    manifests.push(manifest);
  }

  const installed = Object.freeze([...manifests]);

  const get = (componentId: string, componentVersion: string): ComponentManifest | undefined =>
    byComponent.get(componentId)?.get(componentVersion);

  return Object.freeze({
    size: installed.length,
    list: () => installed,
    has: (componentId: string, componentVersion: string) =>
      get(componentId, componentVersion) !== undefined,
    get,
    resolve: (componentId: string, componentVersion: string) => {
      const manifest = get(componentId, componentVersion);
      if (!manifest) {
        throw new ComponentRegistryError(
          'component-version-not-installed',
          `Component "${componentId}" version "${componentVersion}" is not installed.`,
        );
      }
      return manifest;
    },
  });
}
