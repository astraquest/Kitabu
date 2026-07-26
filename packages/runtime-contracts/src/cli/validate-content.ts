#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ComponentManifest } from '../interactive-learning/contract.js';
import {
  validateComponentScene,
  type ComponentSceneLike,
  type RegisteredComponentLike,
  type ValidationIssue,
  type ValidationResult,
} from '../interactive-learning/validation.js';

interface CliOptions {
  contentPaths: string[];
  registryPaths: string[];
}

const USAGE = `Usage: validate-content [--registry <file-or-directory>] <scene-or-directory> [...]

Validates JSON scene definitions against installed component manifests.
When --registry is omitted, the package's fixtures/installed-registry directory is used.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, path: ReadonlyArray<string | number> = []): ValidationIssue {
  return { code, message, path };
}

function parseArgs(args: readonly string[]): CliOptions {
  const contentPaths: string[] = [];
  const registryPaths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      process.exit(0);
    }
    if (arg === '--registry' || arg === '-r') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) throw new Error(`${arg} requires a file or directory path.`);
      registryPaths.push(value);
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    contentPaths.push(arg);
  }
  if (contentPaths.length === 0) throw new Error('Provide at least one scene file or directory.');
  return { contentPaths, registryPaths };
}

function jsonFiles(inputPath: string): string[] {
  const absolute = resolve(inputPath);
  if (!existsSync(absolute)) throw new Error(`Path does not exist: ${absolute}`);
  if (!statSync(absolute).isDirectory()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => jsonFiles(resolve(absolute, entry.name)))
    .filter((path) => path.toLowerCase().endsWith('.json'));
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read JSON ${path}: ${reason}`);
  }
}

function parseManifest(value: unknown, source: string): ComponentManifest {
  if (!isRecord(value) || !isRecord(value.identity)) throw new Error(`${source}: missing identity object.`);
  const identity = value.identity;
  const requiredStrings = ['componentId', 'componentVersion', 'specVersion'] as const;
  for (const key of requiredStrings) {
    if (typeof identity[key] !== 'string' || identity[key].trim() === '') {
      throw new Error(`${source}: identity.${key} must be a non-empty string.`);
    }
  }
  for (const key of ['capabilityTiers', 'supportedTutorActions', 'evidenceTypes'] as const) {
    if (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === 'string')) {
      throw new Error(`${source}: ${key} must be an array of strings.`);
    }
  }
  if (typeof value.stateSchemaVersion !== 'string') {
    throw new Error(`${source}: stateSchemaVersion must be a string.`);
  }
  return value as unknown as ComponentManifest;
}

function parseScene(value: unknown): ValidationResult<ComponentSceneLike> {
  if (!isRecord(value)) return { ok: false, issues: [issue('scene.invalid', 'Scene must be a JSON object.')] };
  const identity = value.identity;
  const component = value.component;
  const assets = value.assets;
  const problems: ValidationIssue[] = [];
  if (!isRecord(identity)) problems.push(issue('scene.identity_required', 'identity must be an object.', ['identity']));
  if (!isRecord(component)) problems.push(issue('scene.component_required', 'component must be an object.', ['component']));
  if (!Array.isArray(value.evidenceClaims)) problems.push(issue('scene.claims_required', 'evidenceClaims must be an array.', ['evidenceClaims']));
  if (!Array.isArray(value.tutorPermissions)) problems.push(issue('scene.permissions_required', 'tutorPermissions must be an array.', ['tutorPermissions']));
  if (!isRecord(assets) || !Array.isArray(assets.assets)) problems.push(issue('scene.assets_required', 'assets.assets must be an array.', ['assets']));
  if (problems.length > 0 || !isRecord(identity) || !isRecord(component) || !isRecord(assets)) {
    return { ok: false, issues: problems };
  }
  const required: Array<[unknown, string, Array<string>]> = [
    [identity.sceneId, 'identity.sceneId must be a non-empty string.', ['identity', 'sceneId']],
    [identity.schemaVersion, 'identity.schemaVersion must be a non-empty string.', ['identity', 'schemaVersion']],
    [component.componentId, 'component.componentId must be a non-empty string.', ['component', 'componentId']],
    [component.componentVersion, 'component.componentVersion must be a non-empty string.', ['component', 'componentVersion']],
  ];
  for (const [field, message, path] of required) {
    if (typeof field !== 'string' || field.trim() === '') problems.push(issue('scene.required', message, path));
  }
  if (!isRecord(value.props)) problems.push(issue('scene.props_required', 'props must be an object.', ['props']));
  if (!isRecord(value.completion)) problems.push(issue('scene.completion_required', 'completion must be an object.', ['completion']));
  if (!isRecord(value.prompt) || typeof value.prompt.default !== 'string' || value.prompt.default.trim() === '') {
    problems.push(issue('scene.prompt_required', 'prompt.default must be a non-empty string.', ['prompt', 'default']));
  }
  if (!['instruction', 'practice', 'assessment'].includes(String(value.purpose))) {
    problems.push(issue('scene.purpose_invalid', 'purpose must be instruction, practice, or assessment.', ['purpose']));
  }
  (Array.isArray(value.evidenceClaims) ? value.evidenceClaims : []).forEach((claim, index) => {
    if (!isRecord(claim) || typeof claim.claimId !== 'string' || !Array.isArray(claim.evidenceTypes)) {
      problems.push(issue('scene.claim_invalid', 'Each evidence claim needs claimId and evidenceTypes.', ['evidenceClaims', index]));
    }
  });
  (Array.isArray(value.tutorPermissions) ? value.tutorPermissions : []).forEach((permission, index) => {
    if (!isRecord(permission) || typeof permission.action !== 'string') {
      problems.push(issue('scene.permission_invalid', 'Each tutor permission needs an action.', ['tutorPermissions', index]));
    }
  });
  (Array.isArray(assets.assets) ? assets.assets : []).forEach((asset, index) => {
    if (!isRecord(asset) || typeof asset.assetId !== 'string' || typeof asset.uri !== 'string') {
      problems.push(issue('scene.asset_invalid', 'Each asset needs assetId and uri.', ['assets', 'assets', index]));
    }
  });
  if (value.fallback !== undefined && (
    !isRecord(value.fallback) ||
    typeof value.fallback.sceneId !== 'string' ||
    !Array.isArray(value.fallback.preservesClaimIds)
  )) {
    problems.push(issue('scene.fallback_invalid', 'fallback needs sceneId and preservesClaimIds.', ['fallback']));
  }
  return problems.length > 0
    ? { ok: false, issues: problems }
    : { ok: true, value: value as unknown as ComponentSceneLike };
}

function displayPath(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return '$';
  return path.reduce<string>((result, part) =>
    typeof part === 'number' ? `${result}[${part}]` : `${result}.${part}`, '$');
}

export function validateContentFiles(contentPaths: readonly string[], registryPaths: readonly string[]): number {
  const defaultRegistry = fileURLToPath(new URL('../../fixtures/installed-registry/', import.meta.url));
  const manifestFiles = (registryPaths.length > 0 ? registryPaths : [defaultRegistry]).flatMap(jsonFiles);
  const manifests = manifestFiles.map((path) => parseManifest(readJson(path), path));
  const seen = new Set<string>();
  for (const manifest of manifests) {
    const key = `${manifest.identity.componentId}@${manifest.identity.componentVersion}`;
    if (seen.has(key)) throw new Error(`Duplicate installed component: ${key}`);
    seen.add(key);
  }
  const registered = manifests.map<RegisteredComponentLike>((manifest) => ({
    componentId: manifest.identity.componentId,
    componentVersion: manifest.identity.componentVersion,
    stateSchemaVersion: manifest.stateSchemaVersion,
    capabilityTiers: manifest.capabilityTiers,
    supportedTutorActions: manifest.supportedTutorActions,
    evidenceTypes: manifest.evidenceTypes,
  }));
  const find = (id: string, version?: string) => registered.find((item) =>
    item.componentId === id && (version === undefined || item.componentVersion === version));

  const contentFiles = contentPaths.flatMap(jsonFiles);
  const content = contentFiles.map((path) => ({ path, value: readJson(path) }));
  const scenesById = new Map<string, unknown>();
  for (const item of content) {
    if (!isRecord(item.value) || !isRecord(item.value.identity) || typeof item.value.identity.sceneId !== 'string') continue;
    const sceneId = item.value.identity.sceneId;
    if (scenesById.has(sceneId)) throw new Error(`Duplicate authored scene ID: ${sceneId}`);
    scenesById.set(sceneId, item.value);
  }

  let failures = 0;
  for (const { path, value } of content) {
    const result = validateComponentScene(value, {
      structuralValidator: parseScene,
      findComponent: (id, version) => find(id, version),
      findScene: (sceneId) => scenesById.get(sceneId),
      validateProps: (_component, props) => isRecord(props)
        ? { ok: true, value: props }
        : { ok: false, issues: [issue('props.invalid', 'Component props must be an object.')] },
    });
    if (result.ok) {
      process.stdout.write(`OK ${path}\n`);
    } else {
      failures += 1;
      process.stderr.write(`INVALID ${path}\n`);
      for (const item of result.issues) {
        process.stderr.write(`  ${displayPath(item.path)} [${item.code}] ${item.message}\n`);
      }
    }
  }
  return failures;
}

export function main(args: readonly string[] = process.argv.slice(2)): number {
  try {
    const options = parseArgs(args);
    return validateContentFiles(options.contentPaths, options.registryPaths) === 0 ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`validate-content: ${message}\n\n${USAGE}\n`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
