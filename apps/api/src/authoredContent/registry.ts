import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';

import {
  authoredContentManifestSchema,
  authoredMissionSchema,
  curriculumLocationKey,
  type AuthoredMission,
  type GradingMission,
  type PublishedMission,
} from './schema.js';

export type AuthoredContentRegistryErrorCode =
  | 'INVALID_MANIFEST_PATH'
  | 'PATH_OUTSIDE_ROOT'
  | 'INVALID_JSON'
  | 'INVALID_MANIFEST'
  | 'INVALID_MISSION'
  | 'LOCATION_MISMATCH'
  | 'DUPLICATE_LOCATION'
  | 'DUPLICATE_PATH';

export class AuthoredContentRegistryError extends Error {
  constructor(
    public readonly code: AuthoredContentRegistryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AuthoredContentRegistryError';
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertPortableRelativePath(path: string): void {
  if (
    isAbsolute(path)
    || win32.isAbsolute(path)
    || path.includes('\\')
    || path.split('/').some(segment => segment === '..' || segment === '.' || segment.length === 0)
  ) {
    throw new AuthoredContentRegistryError('INVALID_MANIFEST_PATH', `Manifest path must be a portable relative path: ${path}`);
  }
}

function isWithinRoot(root: string, candidate: string): boolean {
  const offset = relative(root, candidate);
  return offset === '' || (!offset.startsWith(`..${sep}`) && offset !== '..' && !isAbsolute(offset));
}

/** Resolves an existing file and rejects traversal, absolute paths, and symlink escapes. */
export function resolveManifestPath(root: string, manifestPath: string): string {
  assertPortableRelativePath(manifestPath);
  const candidate = resolve(root, ...manifestPath.split('/'));
  if (!isWithinRoot(root, candidate)) {
    throw new AuthoredContentRegistryError('PATH_OUTSIDE_ROOT', `Path escapes authored content root: ${manifestPath}`);
  }

  let realCandidate: string;
  try {
    realCandidate = realpathSync(candidate);
  } catch (error) {
    throw new AuthoredContentRegistryError('INVALID_MANIFEST_PATH', `Authored content file does not exist: ${manifestPath}`, { cause: error });
  }
  if (!isWithinRoot(root, realCandidate)) {
    throw new AuthoredContentRegistryError('PATH_OUTSIDE_ROOT', `Path resolves outside authored content root: ${manifestPath}`);
  }
  return realCandidate;
}

function readJson(path: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new AuthoredContentRegistryError('INVALID_JSON', `${label} contains invalid JSON.`, { cause: error });
  }
}

function publishedProjection(mission: AuthoredMission): PublishedMission {
  return structuredClone({
    ...mission,
    locationKey: curriculumLocationKey(mission.location),
    interactions: mission.interactions.map(({ private: _private, ...interaction }) => interaction),
  });
}

function gradingProjection(mission: AuthoredMission): GradingMission {
  return structuredClone({
    schemaVersion: mission.schemaVersion,
    contentVersion: mission.contentVersion,
    location: mission.location,
    locationKey: curriculumLocationKey(mission.location),
    interactions: mission.interactions.map(({ id, kind, private: grading }) => ({ id, kind, private: grading })),
  } as GradingMission);
}

type RegistryRecord = {
  position: number;
  key: string;
  mission: AuthoredMission;
};

export class AuthoredContentRegistry {
  readonly #records: readonly RegistryRecord[];
  readonly #byLocation: ReadonlyMap<string, RegistryRecord>;

  constructor(records: RegistryRecord[]) {
    this.#records = Object.freeze([...records].sort((left, right) => left.position - right.position || compareText(left.key, right.key)));
    this.#byLocation = new Map(this.#records.map(record => [record.key, record]));
  }

  get size(): number {
    return this.#records.length;
  }

  locationKeys(): readonly string[] {
    return Object.freeze(this.#records.map(record => record.key));
  }

  listPublished(): readonly PublishedMission[] {
    return Object.freeze(this.#records.map(record => publishedProjection(record.mission)));
  }

  getPublished(locationKey: string): PublishedMission | undefined {
    const record = this.#byLocation.get(locationKey);
    return record ? publishedProjection(record.mission) : undefined;
  }

  getForGrading(locationKey: string): GradingMission | undefined {
    const record = this.#byLocation.get(locationKey);
    return record ? gradingProjection(record.mission) : undefined;
  }
}

export function loadAuthoredContentRegistry(rootPath: string, manifestPath = 'manifest.json'): AuthoredContentRegistry {
  let root: string;
  try {
    root = realpathSync(rootPath);
  } catch (error) {
    throw new AuthoredContentRegistryError('INVALID_MANIFEST_PATH', `Authored content root does not exist: ${rootPath}`, { cause: error });
  }

  const manifestFile = resolveManifestPath(root, manifestPath);
  const parsedManifest = authoredContentManifestSchema.safeParse(readJson(manifestFile, 'Authored content manifest'));
  if (!parsedManifest.success) {
    throw new AuthoredContentRegistryError('INVALID_MANIFEST', 'Authored content manifest failed validation.', { cause: parsedManifest.error });
  }

  const locations = new Set<string>();
  const paths = new Set<string>();
  const records = parsedManifest.data.missions.map((entry, index): RegistryRecord => {
    const key = curriculumLocationKey(entry.location);
    if (locations.has(key)) {
      throw new AuthoredContentRegistryError('DUPLICATE_LOCATION', `Duplicate curriculum location: ${key}`);
    }

    const missionPath = resolveManifestPath(root, entry.path);
    if (paths.has(missionPath)) {
      throw new AuthoredContentRegistryError('DUPLICATE_PATH', `Mission file appears more than once: ${entry.path}`);
    }

    const parsedMission = authoredMissionSchema.safeParse(readJson(missionPath, `Mission ${key}`));
    if (!parsedMission.success) {
      throw new AuthoredContentRegistryError('INVALID_MISSION', `Mission ${key} failed validation.`, { cause: parsedMission.error });
    }
    const missionKey = curriculumLocationKey(parsedMission.data.location);
    if (missionKey !== key) {
      throw new AuthoredContentRegistryError('LOCATION_MISMATCH', `Manifest location ${key} does not match mission location ${missionKey}.`);
    }

    const mission: AuthoredMission = {
      ...parsedMission.data,
      interactions: [...parsedMission.data.interactions].sort((left, right) => left.order - right.order || compareText(left.id, right.id)),
    };

    locations.add(key);
    paths.add(missionPath);
    return { position: entry.position ?? index, key, mission };
  });

  return new AuthoredContentRegistry(records);
}
