import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(WEB, 'dist');
const requiredFiles = [
  'index.html',
  '404.html',
  'terms/index.html',
  'privacy/index.html',
  'deletion/index.html',
  '_headers',
  '_redirects',
  '_routes.json'
];

for (const relativePath of requiredFiles) {
  const filePath = join(DIST, relativePath);
  if (!existsSync(filePath) || statSync(filePath).size === 0) {
    throw new Error(`Missing or empty Pages dist artifact: ${relativePath}`);
  }
}

const excludedArtifacts = ['build', 'dist', 'functions', 'README.md', 'package.json'];
for (const relativePath of excludedArtifacts) {
  if (existsSync(join(DIST, relativePath))) {
    throw new Error(`Pages dist contains source-only artifact: ${relativePath}`);
  }
}

let fileCount = 0;
let totalBytes = 0;
function inspectTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspectTree(filePath);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Pages dist contains unsupported entry: ${filePath}`);
    const bytes = statSync(filePath).size;
    if (bytes > 25 * 1024 * 1024) throw new Error(`Pages dist asset exceeds 25 MiB: ${filePath}`);
    fileCount++;
    totalBytes += bytes;
  }
}
inspectTree(DIST);

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const marker of [
  '<title>Kitabu AI',
  'https://kitabu.ai/',
  '/styles-20260811.css',
  '/site-20260818.js'
]) {
  if (!html.includes(marker)) throw new Error(`Homepage marker missing: ${marker}`);
}

for (const relativePath of html.matchAll(/(?:href|src)="(\/(?:assets\/|styles-[^"?]+|site-[^"?]+|analytics-config\.js)[^"]*)"/g)) {
  const assetPath = relativePath[1].split('?', 1)[0].replace(/^\//, '');
  const assetFile = join(DIST, assetPath);
  if (!existsSync(assetFile) || statSync(assetFile).size === 0) {
    throw new Error(`Homepage references missing or empty asset: ${assetPath}`);
  }
}

const redirects = readFileSync(join(DIST, '_redirects'), 'utf8');
for (const marker of [
  '/privacy https://app.kitabu.ai/privacy 308',
  '/policy https://app.kitabu.ai/policy 308',
  '/terms https://app.kitabu.ai/terms 308',
  '/deletion https://app.kitabu.ai/deletion 308'
]) {
  if (!redirects.includes(marker)) throw new Error(`Pages redirect missing: ${marker}`);
}

for (const path of ['/reset-password', '/verify-email']) {
  if (redirects.split('\n').some((line) => line.trimStart().startsWith(path))) {
    throw new Error(`Pages _redirects must not shadow the Function route: ${path}`);
  }
}

const routes = JSON.parse(readFileSync(join(DIST, '_routes.json'), 'utf8'));
if (routes.version !== 1 || JSON.stringify(routes.include) !== JSON.stringify([
  '/reset-password',
  '/reset-password/*',
  '/verify-email',
  '/verify-email/*'
])) {
  throw new Error('Pages _routes.json must invoke Functions only for auth redirects');
}

console.log(`Pages dist artifact check passed (${requiredFiles.length} required files; ${fileCount} files, ${totalBytes} bytes; no asset exceeds 25 MiB).`);
