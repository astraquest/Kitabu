#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface Wave0ScopeIssue {
  code: string;
  message: string;
  path: string;
}

export interface Wave0ScopeResult {
  ok: boolean;
  issues: Wave0ScopeIssue[];
}

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TEXT_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.mjs', '.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules', 'coverage', '.git']);
const ALLOWED_PROP_SCHEMAS = new Set([
  'classify-sort-match-rank.schema.json',
  'structured-response.schema.json',
]);

const FORBIDDEN_PATH_SEGMENTS: ReadonlyArray<readonly [string, RegExp]> = [
  ['path.ui', /^(?:ui|screens?|views?|widgets?)$/i],
  ['path.database', /^(?:db|database|migrations?|repositories|sql)$/i],
  ['path.network_service', /^(?:controllers?|routes?|servers?|services?)$/i],
  ['path.plugin_framework', /^(?:plugins?|extensions?)$/i],
];

const FORBIDDEN_DEPENDENCIES: ReadonlyArray<readonly [string, RegExp]> = [
  ['dependency.ui', /^(?:react|react-dom|react-native|expo|three|pixi\.js|konva|fabric|d3|recharts|chart\.js|maplibre-gl)$/i],
  ['dependency.database', /^(?:pg|postgres|mysql2|sqlite3|better-sqlite3|prisma|@prisma\/client|drizzle-orm|typeorm|sequelize|mongoose)$/i],
  ['dependency.network_service', /^(?:fastify|express|koa|hono|axios|got|node-fetch|undici|ws|socket\.io)$/i],
  ['dependency.plugin_framework', /^(?:tapable|plug-and-play|@babel\/core)$/i],
];

const FORBIDDEN_SOURCE_PATTERNS: ReadonlyArray<readonly [string, RegExp, string]> = [
  ['source.ui', /\bfrom\s+['"](?:react|react-dom|react-native|expo(?:\/[^'"]*)?|three)['"]|\brequire\(\s*['"](?:react|react-dom|react-native|expo|three)['"]\s*\)/, 'UI/runtime rendering code'],
  ['source.database', /\bfrom\s+['"](?:pg|postgres|mysql2|sqlite3|better-sqlite3|@?prisma(?:\/client)?|drizzle-orm|typeorm|sequelize|mongoose)['"]/, 'database code'],
  ['source.network_service', /\bfrom\s+['"](?:node:)?(?:http|https|net|tls)['"]|\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(|\bcreateServer\s*\(/, 'network service code'],
  ['source.remote_code', /\beval\s*\(|\bnew\s+Function\s*\(|\bimport\s*\(\s*(?!['"]\.\.?\/)|\bscript\.src\s*=/, 'remote or dynamically executable code'],
  ['source.plugin_framework', /\b(?:load|install|register)(?:Remote)?Plugin\s*\(|\bplugin(?:Loader|Manager|Marketplace)\b/, 'plugin framework code'],
];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function displayPath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

function checkPaths(root: string, files: readonly string[], issues: Wave0ScopeIssue[]): void {
  for (const path of files) {
    const shown = displayPath(root, path);
    const segments = shown.split('/').slice(0, -1);
    for (const [code, pattern] of FORBIDDEN_PATH_SEGMENTS) {
      const segment = segments.find((candidate) => pattern.test(candidate));
      if (segment) {
        issues.push({ code, message: `Wave 0 must not add the "${segment}" implementation area.`, path: shown });
        break;
      }
    }

    if (shown.startsWith('schemas/interactive-learning/props/')) {
      const filename = shown.slice(shown.lastIndexOf('/') + 1);
      if (!ALLOWED_PROP_SCHEMAS.has(filename)) {
        issues.push({
          code: 'schema.roadmap_component',
          message: `Wave 0 only permits prop schemas for: ${[...ALLOWED_PROP_SCHEMAS].join(', ')}.`,
          path: shown,
        });
      }
    }
  }
}

function checkPackageJson(root: string, issues: Wave0ScopeIssue[]): void {
  const path = resolve(root, 'package.json');
  if (!existsSync(path)) return;
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const dependencies = manifest[section];
    if (typeof dependencies !== 'object' || dependencies === null || Array.isArray(dependencies)) continue;
    for (const dependency of Object.keys(dependencies)) {
      for (const [code, pattern] of FORBIDDEN_DEPENDENCIES) {
        if (pattern.test(dependency)) {
          issues.push({ code, message: `${dependency} is outside the data-only Wave 0 runtime scope.`, path: 'package.json' });
          break;
        }
      }
    }
  }
}

function checkSource(root: string, files: readonly string[], issues: Wave0ScopeIssue[]): void {
  for (const path of files) {
    const shown = displayPath(root, path);
    if (!shown.startsWith('src/') || !TEXT_EXTENSIONS.has(extname(path))) continue;
    const source = readFileSync(path, 'utf8');
    for (const [code, pattern, label] of FORBIDDEN_SOURCE_PATTERNS) {
      if (pattern.test(source)) issues.push({ code, message: `Wave 0 source contains ${label}.`, path: shown });
    }
  }
}

export function checkWave0Scope(rootInput: string = PACKAGE_ROOT): Wave0ScopeResult {
  const root = resolve(rootInput);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return { ok: false, issues: [{ code: 'root.missing', message: 'Scope root must be an existing directory.', path: root }] };
  }

  const files = walk(root);
  const issues: Wave0ScopeIssue[] = [];
  checkPaths(root, files, issues);
  checkPackageJson(root, issues);
  checkSource(root, files, issues);
  return { ok: issues.length === 0, issues };
}

export function main(args: readonly string[]): number {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: check-wave0-scope [package-root]\n');
    return 0;
  }
  if (args.length > 1 || args[0]?.startsWith('-')) {
    process.stderr.write('Usage: check-wave0-scope [package-root]\n');
    return 1;
  }

  try {
    const result = checkWave0Scope(args[0]);
    for (const issue of result.issues) process.stderr.write(`${issue.code}: ${issue.message} (${issue.path})\n`);
    if (result.ok) process.stdout.write('Wave 0 scope check passed.\n');
    return result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
