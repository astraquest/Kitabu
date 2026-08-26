import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(WEB, 'dist');
const GENERATOR = join(WEB, 'build', 'build-pages.mjs');
const EXCLUDED_TOP_LEVEL = new Set(['build', 'dist', 'functions', 'README.md', 'package.json']);
const DEPLOYABLE_EXTENSIONS = new Set([
  '.css', '.html', '.ico', '.jpg', '.jpeg', '.js', '.json', '.png', '.svg',
  '.txt', '.woff2', '.webmanifest', '.webp', '.xml'
]);
const DEPLOYABLE_FILES = new Set(['_headers', '_redirects']);

const generated = spawnSync(process.execPath, [GENERATOR], { stdio: 'inherit' });
if (generated.status !== 0) process.exit(generated.status ?? 1);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

let fileCount = 0;
let totalBytes = 0;
function copyDeployable(source, target, topLevel) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (topLevel && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyDeployable(sourcePath, targetPath, false);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Unsupported Pages source entry: ${relative(WEB, sourcePath)}`);
    const extension = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase() : '';
    if (!DEPLOYABLE_FILES.has(entry.name) && !DEPLOYABLE_EXTENSIONS.has(extension)) {
      throw new Error(`Unclassified Pages source file: ${relative(WEB, sourcePath)}`);
    }
    const bytes = statSync(sourcePath).size;
    if (bytes > 25 * 1024 * 1024) throw new Error(`Pages asset exceeds 25 MiB: ${relative(WEB, sourcePath)}`);
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath);
    fileCount++;
    totalBytes += bytes;
  }
}

copyDeployable(WEB, DIST, true);
console.log(`Packaged ${fileCount} deployable file(s), ${totalBytes} bytes, under ${DIST}`);
