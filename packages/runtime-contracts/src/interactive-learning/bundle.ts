import type { SemVer } from './contract.js';

/** A published bundle is data, not executable code. Its identity never changes. */
export type BundleReleaseChannel = 'development' | 'preview' | 'staging' | 'production';

export interface BundleReleaseIdentity {
  readonly channel: BundleReleaseChannel;
  /** Immutable identifier assigned by the publisher, for example a deployment ID. */
  readonly releaseId: string;
}

export interface ComponentVersionLock {
  readonly componentId: string;
  readonly componentVersion: SemVer;
}

export interface GraderVersionLock {
  readonly graderId: string;
  readonly graderVersion: SemVer;
}

export interface BundlePayloadReference {
  /** Bundle-relative path. Absolute paths, parent traversal, and backslashes are forbidden. */
  readonly path: string;
  readonly sha256: string;
}

export interface BundleSceneReference extends BundlePayloadReference {
  readonly sceneId: string;
  readonly sceneVersion: SemVer;
}

export interface InteractiveLearningBundleManifest {
  readonly manifestVersion: 1;
  readonly bundleId: string;
  /** Immutable content revision inside this bundle lineage. */
  readonly revision: string;
  /** Lowercase SHA-256 of the canonical bundle payload. */
  readonly sha256: string;
  readonly protocolVersion: SemVer;
  readonly sceneSchemaVersion: SemVer;
  /** Numeric native build number/version code required to interpret this bundle. */
  readonly minimumAppBuild: number;
  readonly maximumAppBuild?: number;
  readonly components: readonly ComponentVersionLock[];
  readonly graders: readonly GraderVersionLock[];
  readonly assetManifest: BundlePayloadReference;
  readonly scenes: readonly BundleSceneReference[];
  readonly release: BundleReleaseIdentity;
}

/** Stored with an attempt so later retries and replays never drift to newer content. */
export interface PinnedAttemptBundle {
  readonly attemptId: string;
  readonly bundleId: string;
  readonly revision: string;
  readonly sha256: string;
  readonly release: BundleReleaseIdentity;
}

export interface InstalledComponentVersion {
  readonly componentId: string;
  readonly componentVersion: SemVer;
}

export interface InstalledGraderVersion {
  readonly graderId: string;
  readonly graderVersion: SemVer;
}

export interface BundleRuntimeSupport {
  readonly protocolVersions: readonly SemVer[];
  readonly sceneSchemaVersions: readonly SemVer[];
  readonly appBuild: number;
  readonly components: readonly InstalledComponentVersion[];
  readonly graders: readonly InstalledGraderVersion[];
  /** The channel this runtime is allowed to load. */
  readonly releaseChannel: BundleReleaseChannel;
}

export type BundleCompatibilityIssueCode =
  | 'manifest.invalid'
  | 'protocol.unsupported'
  | 'scene-schema.unsupported'
  | 'app-build.too-old'
  | 'app-build.too-new'
  | 'component.missing'
  | 'component.version-mismatch'
  | 'grader.missing'
  | 'grader.version-mismatch'
  | 'release.channel-mismatch'
  | 'attempt.bundle-mismatch'
  | 'attempt.revision-mismatch'
  | 'attempt.hash-mismatch'
  | 'attempt.release-mismatch';

export interface BundleCompatibilityIssue {
  readonly code: BundleCompatibilityIssueCode;
  readonly path: string;
  readonly message: string;
}

export type BundleCompatibilityResult =
  | { readonly compatible: true; readonly issues: readonly [] }
  | { readonly compatible: false; readonly issues: readonly BundleCompatibilityIssue[] };

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const BUNDLE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function add(
  issues: BundleCompatibilityIssue[],
  code: BundleCompatibilityIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function checkNonEmpty(value: string, path: string, issues: BundleCompatibilityIssue[]): void {
  if (value.trim().length === 0) add(issues, 'manifest.invalid', path, 'must be a non-empty string');
}

function checkId(value: string, path: string, issues: BundleCompatibilityIssue[]): void {
  if (value.length > 160 || !ID_PATTERN.test(value)) {
    add(issues, 'manifest.invalid', path, 'must be a valid bundle identifier');
  }
}

function checkSemVer(value: string, path: string, issues: BundleCompatibilityIssue[]): void {
  if (!SEMVER_PATTERN.test(value)) add(issues, 'manifest.invalid', path, 'must be an exact semantic version');
}

function checkPayloadReference(
  reference: BundlePayloadReference,
  path: string,
  issues: BundleCompatibilityIssue[],
): void {
  if (!BUNDLE_PATH_PATTERN.test(reference.path)) {
    add(issues, 'manifest.invalid', `${path}.path`, 'must be a safe bundle-relative path');
  }
  if (!SHA256_PATTERN.test(reference.sha256)) {
    add(issues, 'manifest.invalid', `${path}.sha256`, 'must be a lowercase SHA-256 digest');
  }
}

function checkVersionLocks<T>(
  locks: readonly T[],
  kind: 'component' | 'grader',
  getId: (lock: T) => string,
  getVersion: (lock: T) => SemVer,
  issues: BundleCompatibilityIssue[],
): void {
  const idKey = `${kind}Id`;
  const versionKey = `${kind}Version`;
  const seen = new Set<string>();
  locks.forEach((lock, index) => {
    const id = getId(lock);
    const version = getVersion(lock);
    const base = `${kind}s[${index}]`;
    checkNonEmpty(id, `${base}.${idKey}`, issues);
    checkId(id, `${base}.${idKey}`, issues);
    checkNonEmpty(version, `${base}.${versionKey}`, issues);
    checkSemVer(version, `${base}.${versionKey}`, issues);
    if (seen.has(id)) add(issues, 'manifest.invalid', `${base}.${idKey}`, `${kind} lock is duplicated`);
    seen.add(id);
  });
}

function checkInstalledLocks<T>(
  required: readonly T[],
  installed: ReadonlyMap<string, SemVer>,
  kind: 'component' | 'grader',
  getId: (lock: T) => string,
  getVersion: (lock: T) => SemVer,
  issues: BundleCompatibilityIssue[],
): void {
  required.forEach((lock, index) => {
    const id = getId(lock);
    const expected = getVersion(lock);
    const actual = installed.get(id);
    if (actual === undefined) add(issues, `${kind}.missing`, `${kind}s[${index}]`, `${kind} ${id} is not installed`);
    else if (actual !== expected) {
      add(issues, `${kind}.version-mismatch`, `${kind}s[${index}].${kind}Version`, `${kind} ${id} requires ${expected}, found ${actual}`);
    }
  });
}

function checkManifestShape(
  manifest: InteractiveLearningBundleManifest,
  issues: BundleCompatibilityIssue[],
): void {
  if (manifest.manifestVersion !== 1) {
    add(issues, 'manifest.invalid', 'manifestVersion', 'must equal 1');
  }
  for (const [path, value] of [
    ['bundleId', manifest.bundleId],
    ['revision', manifest.revision],
    ['protocolVersion', manifest.protocolVersion],
    ['sceneSchemaVersion', manifest.sceneSchemaVersion],
    ['release.releaseId', manifest.release.releaseId],
  ] as const) checkNonEmpty(value, path, issues);

  checkId(manifest.bundleId, 'bundleId', issues);
  checkId(manifest.release.releaseId, 'release.releaseId', issues);

  checkSemVer(manifest.protocolVersion, 'protocolVersion', issues);
  checkSemVer(manifest.sceneSchemaVersion, 'sceneSchemaVersion', issues);

  if (!SHA256_PATTERN.test(manifest.sha256)) {
    add(issues, 'manifest.invalid', 'sha256', 'must be a lowercase SHA-256 digest');
  }
  if (!Number.isSafeInteger(manifest.minimumAppBuild) || manifest.minimumAppBuild < 0) {
    add(issues, 'manifest.invalid', 'minimumAppBuild', 'must be a non-negative safe integer');
  }
  if (
    manifest.maximumAppBuild !== undefined &&
    (!Number.isSafeInteger(manifest.maximumAppBuild) || manifest.maximumAppBuild < manifest.minimumAppBuild)
  ) {
    add(issues, 'manifest.invalid', 'maximumAppBuild', 'must be an integer at least minimumAppBuild');
  }

  if (manifest.components.length === 0 || manifest.components.length > 256) {
    add(issues, 'manifest.invalid', 'components', 'must contain between 1 and 256 locks');
  }
  checkVersionLocks(manifest.components, 'component', (lock) => lock.componentId, (lock) => lock.componentVersion, issues);

  if (manifest.graders.length > 128) {
    add(issues, 'manifest.invalid', 'graders', 'must contain at most 128 locks');
  }
  checkVersionLocks(manifest.graders, 'grader', (lock) => lock.graderId, (lock) => lock.graderVersion, issues);

  checkPayloadReference(manifest.assetManifest, 'assetManifest', issues);

  if (manifest.scenes.length === 0 || manifest.scenes.length > 4096) {
    add(issues, 'manifest.invalid', 'scenes', 'must contain between 1 and 4096 scene references');
  }
  const sceneIds = new Set<string>();
  manifest.scenes.forEach((scene, index) => {
    checkNonEmpty(scene.sceneId, `scenes[${index}].sceneId`, issues);
    checkId(scene.sceneId, `scenes[${index}].sceneId`, issues);
    checkSemVer(scene.sceneVersion, `scenes[${index}].sceneVersion`, issues);
    checkPayloadReference(scene, `scenes[${index}]`, issues);
    if (sceneIds.has(scene.sceneId)) {
      add(issues, 'manifest.invalid', `scenes[${index}].sceneId`, 'scene reference is duplicated');
    }
    sceneIds.add(scene.sceneId);
  });
}

/** Captures the exact published data identity used when an attempt begins. */
export function pinAttemptToBundle(
  attemptId: string,
  manifest: InteractiveLearningBundleManifest,
): PinnedAttemptBundle {
  if (attemptId.trim().length === 0) throw new Error('attemptId must be a non-empty string');
  return {
    attemptId,
    bundleId: manifest.bundleId,
    revision: manifest.revision,
    sha256: manifest.sha256,
    release: { ...manifest.release },
  };
}

/** Pure compatibility gate. It never upgrades, downloads, or substitutes a dependency. */
export function checkBundleCompatibility(
  manifest: InteractiveLearningBundleManifest,
  runtime: BundleRuntimeSupport,
  attemptPin?: PinnedAttemptBundle,
): BundleCompatibilityResult {
  const issues: BundleCompatibilityIssue[] = [];
  checkManifestShape(manifest, issues);

  if (!runtime.protocolVersions.includes(manifest.protocolVersion)) {
    add(issues, 'protocol.unsupported', 'protocolVersion', `protocol ${manifest.protocolVersion} is not installed`);
  }
  if (!runtime.sceneSchemaVersions.includes(manifest.sceneSchemaVersion)) {
    add(issues, 'scene-schema.unsupported', 'sceneSchemaVersion', `scene schema ${manifest.sceneSchemaVersion} is not installed`);
  }
  if (runtime.appBuild < manifest.minimumAppBuild) {
    add(issues, 'app-build.too-old', 'minimumAppBuild', `app build ${runtime.appBuild} is below ${manifest.minimumAppBuild}`);
  }
  if (manifest.maximumAppBuild !== undefined && runtime.appBuild > manifest.maximumAppBuild) {
    add(issues, 'app-build.too-new', 'maximumAppBuild', `app build ${runtime.appBuild} is above ${manifest.maximumAppBuild}`);
  }
  if (runtime.releaseChannel !== manifest.release.channel) {
    add(issues, 'release.channel-mismatch', 'release.channel', `bundle channel ${manifest.release.channel} cannot load in ${runtime.releaseChannel}`);
  }

  checkInstalledLocks(
    manifest.components,
    new Map(runtime.components.map((item) => [item.componentId, item.componentVersion])),
    'component',
    (lock) => lock.componentId,
    (lock) => lock.componentVersion,
    issues,
  );
  checkInstalledLocks(
    manifest.graders,
    new Map(runtime.graders.map((item) => [item.graderId, item.graderVersion])),
    'grader',
    (lock) => lock.graderId,
    (lock) => lock.graderVersion,
    issues,
  );

  if (attemptPin) {
    if (attemptPin.bundleId !== manifest.bundleId) {
      add(issues, 'attempt.bundle-mismatch', 'bundleId', 'bundle does not match the attempt pin');
    }
    if (attemptPin.revision !== manifest.revision) {
      add(issues, 'attempt.revision-mismatch', 'revision', 'revision does not match the attempt pin');
    }
    if (attemptPin.sha256 !== manifest.sha256) {
      add(issues, 'attempt.hash-mismatch', 'sha256', 'content hash does not match the attempt pin');
    }
    if (
      attemptPin.release.channel !== manifest.release.channel ||
      attemptPin.release.releaseId !== manifest.release.releaseId
    ) {
      add(issues, 'attempt.release-mismatch', 'release', 'release identity does not match the attempt pin');
    }
  }

  return issues.length === 0
    ? { compatible: true, issues: [] }
    : { compatible: false, issues };
}
