#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface IntegrityIssue {
  code: string;
  message: string;
  path?: string;
}

export interface IntegrityResult {
  ok: boolean;
  checkedFiles: string[];
  issues: IntegrityIssue[];
}

export interface IntegrityOptions {
  repositoryRoot?: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const DEFAULT_FIXTURES = fileURLToPath(new URL('../../fixtures/grade-6/', import.meta.url));
const USAGE = `Usage: check-fixture-integrity [--repository-root <directory>] [file-or-directory ...]

Checks JSON parsing, fixture ID uniqueness, Grade 6 source digest metadata, and
repository file references. The Grade 6 fixture directory is checked by default.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectJsonFiles(input: string): string[] {
  const absolute = resolve(input);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) return absolute.toLowerCase().endsWith('.json') ? [absolute] : [];
  return readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => collectJsonFiles(resolve(absolute, entry.name)))
    .sort();
}

function digestFile(path: string): string {
  // Curriculum JSON is committed as text and may be checked out with CRLF on
  // Windows. Hash its canonical LF representation so fixture integrity is
  // stable across developer machines and Linux CI runners.
  const bytes = readFileSync(path);
  const text = bytes.toString('utf8');
  const canonical = text.includes('\r\n') ? text.replaceAll('\r\n', '\n') : text;
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function checkSha256(value: unknown, field: string, source: string, issues: IntegrityIssue[]): void {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    issues.push({ code: 'digest.invalid', message: `${field} must be a 64-character SHA-256 digest.`, path: source });
  }
}

function checkGrade6Source(value: Record<string, unknown>, source: string, issues: IntegrityIssue[]): void {
  if (value.schema !== 'kitabu.interactive-learning.curriculum-source-fixture') return;

  const curriculum = value.curriculum;
  if (!isRecord(curriculum) || curriculum.grade !== 6) return;

  const provenance = value.source;
  if (!isRecord(provenance)) {
    issues.push({ code: 'grade6.source_missing', message: 'Grade 6 source fixture must contain source metadata.', path: source });
    return;
  }

  checkSha256(provenance.sourceSpanId, 'source.sourceSpanId', source, issues);
  checkSha256(provenance.sourceSpanSha256, 'source.sourceSpanSha256', source, issues);
  checkSha256(provenance.captureSha256, 'source.captureSha256', source, issues);

  const pages = provenance.physicalPages;
  const pageDigests = provenance.pageDigests;
  if (!Array.isArray(pages) || pages.length === 0 || !pages.every((page) => Number.isInteger(page) && Number(page) > 0)) {
    issues.push({ code: 'grade6.pages_invalid', message: 'source.physicalPages must contain positive page numbers.', path: source });
  }
  if (!Array.isArray(pageDigests) || pageDigests.length === 0) {
    issues.push({ code: 'grade6.page_digests_missing', message: 'source.pageDigests must not be empty.', path: source });
    return;
  }

  const digestPages = new Set<number>();
  for (const [index, pageDigest] of pageDigests.entries()) {
    if (!isRecord(pageDigest) || !Number.isInteger(pageDigest.pageNumber) || Number(pageDigest.pageNumber) <= 0) {
      issues.push({ code: 'grade6.page_digest_invalid', message: `source.pageDigests[${index}].pageNumber must be positive.`, path: source });
      continue;
    }
    const pageNumber = Number(pageDigest.pageNumber);
    if (digestPages.has(pageNumber)) {
      issues.push({ code: 'grade6.page_digest_duplicate', message: `Page ${pageNumber} has more than one digest.`, path: source });
    }
    digestPages.add(pageNumber);
    checkSha256(pageDigest.textSha256, `source.pageDigests[${index}].textSha256`, source, issues);
  }

  if (Array.isArray(pages)) {
    const expected = new Set(pages.filter((page): page is number => Number.isInteger(page)).map(Number));
    if (expected.size !== digestPages.size || [...expected].some((page) => !digestPages.has(page))) {
      issues.push({ code: 'grade6.page_digest_mismatch', message: 'Every physical page must have exactly one page digest.', path: source });
    }
  }
}

function checkRepositoryReferences(
  value: Record<string, unknown>,
  source: string,
  repositoryRoot: string,
  issues: IntegrityIssue[],
): void {
  const references = value.repositoryReferences;
  if (!isRecord(references)) return;

  for (const [name, reference] of Object.entries(references)) {
    if (!isRecord(reference) || typeof reference.path !== 'string' || typeof reference.sha256 !== 'string') continue;
    checkSha256(reference.sha256, `repositoryReferences.${name}.sha256`, source, issues);
    if (isAbsolute(reference.path)) {
      issues.push({ code: 'reference.path_absolute', message: `${name} must use a repository-relative path.`, path: source });
      continue;
    }
    const target = resolve(repositoryRoot, reference.path);
    const outsideRepository = relative(repositoryRoot, target).startsWith('..');
    if (outsideRepository || !existsSync(target) || !statSync(target).isFile()) {
      issues.push({ code: 'reference.missing', message: `${name} references missing file: ${reference.path}`, path: source });
      continue;
    }
    if (SHA256_PATTERN.test(reference.sha256) && digestFile(target) !== reference.sha256.toLowerCase()) {
      issues.push({ code: 'reference.digest_mismatch', message: `${name} SHA-256 does not match ${reference.path}.`, path: source });
    }
  }
}

interface BundlePayloadReference {
  path: string;
  sha256: string;
}

function isBundlePayloadReference(value: unknown): value is BundlePayloadReference {
  return isRecord(value) && typeof value.path === 'string' && typeof value.sha256 === 'string';
}

/**
 * Bundle paths are package-relative when prefixed with `fixtures/`; the compact
 * Grade 6 asset path is relative to the package's fixtures directory.
 */
function resolveBundlePayload(repositoryRoot: string, referencePath: string): string {
  const packageRoot = resolve(repositoryRoot, 'packages/runtime-contracts');
  return resolve(packageRoot, referencePath.startsWith('fixtures/') ? referencePath : `fixtures/${referencePath}`);
}

function checkContentBundle(
  value: Record<string, unknown>,
  source: string,
  repositoryRoot: string,
  issues: IntegrityIssue[],
): void {
  if (!Number.isInteger(value.manifestVersion) || !isBundlePayloadReference(value.assetManifest) || !Array.isArray(value.scenes)) {
    return;
  }

  const references = [value.assetManifest, ...value.scenes.filter(isBundlePayloadReference)];
  const canonicalEntries: string[] = [];
  let allPayloadsPresent = true;

  for (const reference of references) {
    const target = resolveBundlePayload(repositoryRoot, reference.path);
    const packageRoot = resolve(repositoryRoot, 'packages/runtime-contracts');
    const outsidePackage = relative(packageRoot, target).startsWith('..');
    if (isAbsolute(reference.path) || outsidePackage || !existsSync(target) || !statSync(target).isFile()) {
      allPayloadsPresent = false;
      issues.push({
        code: 'bundle.reference_digest_mismatch',
        message: `Bundle payload is unavailable for local verification: ${reference.path}.`,
        path: source,
      });
      continue;
    }

    const actualDigest = digestFile(target);
    canonicalEntries.push(`${reference.path}\0${actualDigest}`);
    if (!SHA256_PATTERN.test(reference.sha256) || actualDigest !== reference.sha256.toLowerCase()) {
      issues.push({
        code: 'bundle.reference_digest_mismatch',
        message: `Bundle payload SHA-256 does not match ${reference.path}.`,
        path: source,
      });
    }
  }

  if (allPayloadsPresent && typeof value.sha256 === 'string') {
    // Paths make the composite unambiguous; manifest order is publication order.
    const composite = createHash('sha256').update(canonicalEntries.join('\n')).digest('hex');
    if (!SHA256_PATTERN.test(value.sha256) || composite !== value.sha256.toLowerCase()) {
      issues.push({
        code: 'bundle.payload_digest_mismatch',
        message: 'Bundle composite SHA-256 does not match its referenced payloads.',
        path: source,
      });
    }
  }
}

export function checkFixtureIntegrity(inputs: readonly string[], options: IntegrityOptions = {}): IntegrityResult {
  const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
  const issues: IntegrityIssue[] = [];
  const checkedFiles = [...new Set(inputs.flatMap(collectJsonFiles))].sort();
  const fixtureIds = new Map<string, string>();

  for (const input of inputs) {
    const absolute = resolve(input);
    if (!existsSync(absolute)) {
      issues.push({ code: 'input.missing', message: `Input does not exist: ${absolute}`, path: absolute });
    }
  }

  for (const source of checkedFiles) {
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(source, 'utf8')) as unknown;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      issues.push({ code: 'json.invalid', message: `Cannot parse JSON: ${reason}`, path: source });
      continue;
    }
    if (!isRecord(value)) continue;

    if (typeof value.fixtureId === 'string' && value.fixtureId.trim() !== '') {
      const fixtureId = value.fixtureId.trim();
      const firstSource = fixtureIds.get(fixtureId);
      if (firstSource) {
        issues.push({
          code: 'fixture_id.duplicate',
          message: `fixtureId ${fixtureId} is duplicated in ${relative(repositoryRoot, firstSource)} and ${relative(repositoryRoot, source)}.`,
          path: source,
        });
      } else {
        fixtureIds.set(fixtureId, source);
      }
    }

    checkGrade6Source(value, source, issues);
    checkRepositoryReferences(value, source, repositoryRoot, issues);
    checkContentBundle(value, source, repositoryRoot, issues);
  }

  return { ok: issues.length === 0, checkedFiles, issues };
}

interface ParsedArgs {
  inputs: string[];
  repositoryRoot?: string;
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const inputs: string[] = [];
  let repositoryRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return { inputs: [] };
    }
    if (arg === '--repository-root') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) throw new Error('--repository-root requires a directory path.');
      repositoryRoot = value;
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    inputs.push(arg);
  }
  return { inputs: inputs.length > 0 ? inputs : [DEFAULT_FIXTURES], repositoryRoot };
}

export function main(args: readonly string[]): number {
  try {
    const parsed = parseArgs(args);
    if (parsed.inputs.length === 0) return 0;
    const result = checkFixtureIntegrity(parsed.inputs, { repositoryRoot: parsed.repositoryRoot });
    for (const integrityIssue of result.issues) {
      process.stderr.write(`${integrityIssue.code}: ${integrityIssue.message}${integrityIssue.path ? ` (${integrityIssue.path})` : ''}\n`);
    }
    if (result.ok) process.stdout.write(`Fixture integrity passed for ${result.checkedFiles.length} JSON files.\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
