import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const execFileAsync = promisify(execFile);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(SCRIPT_DIR, '../..');
const GAP_SUBJECT = '__SOURCE_INVENTORY__';

loadEnv({ path: resolve(API_ROOT, '.env') });

function parseList(value, normalize = item => item) {
  return value.split(',').map(item => normalize(item.trim())).filter(Boolean);
}

function parseArgs(argv) {
  return argv.reduce(
    (options, arg) => {
      if (arg.startsWith('--countries=')) {
        options.countries = parseList(arg.slice('--countries='.length), item => item.toUpperCase());
      } else if (arg.startsWith('--curricula=')) {
        options.curricula = parseList(arg.slice('--curricula='.length));
      } else if (arg.startsWith('--ids=')) {
        options.ids = parseList(arg.slice('--ids='.length));
      } else if (arg.startsWith('--max-docs=')) {
        options.maxDocs = Number(arg.slice('--max-docs='.length));
      } else if (arg === '--missing-markdown-only') {
        options.missingMarkdownOnly = true;
      } else if (arg === '--force') {
        options.force = true;
      } else if (arg === '--curl') {
        options.curl = true;
      }
      return options;
    },
    { countries: [], curricula: [], curl: false, force: false, ids: [], maxDocs: null, missingMarkdownOnly: false }
  );
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (sslMode === 'disable') return undefined;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  return isLocalDatabaseUrl(databaseUrl) ? undefined : { rejectUnauthorized: false };
}

function relativeApiPath(filePath) {
  return relative(API_ROOT, filePath).split(sep).join('/');
}

function resolveObjectKey(objectKey) {
  if (!objectKey) {
    throw new Error('object_key is missing');
  }
  const normalized = String(objectKey).replace(/\\/g, '/').replace(/^\/+/, '');
  const filePath = resolve(API_ROOT, normalized);
  const relativePath = relative(API_ROOT, filePath);
  if (relativePath.startsWith('..') || resolve(API_ROOT, relativePath) !== filePath) {
    throw new Error(`object_key resolves outside apps/api: ${objectKey}`);
  }
  return filePath;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function queryDocuments(client, options) {
  const params = [];
  const filters = [
    `subject <> $${params.push(GAP_SUBJECT)}`,
    `(source_url_status IS NULL OR source_url_status <> 'missing')`,
    `COALESCE(review_status, '') <> 'rejected'`,
    `object_key IS NOT NULL`,
    `source_url IS NOT NULL`
  ];

  if (options.missingMarkdownOnly) {
    filters.push(`NOT (COALESCE(metadata, '{}'::jsonb) ? 'fullSourceMarkdown')`);
  }
  if (options.ids.length > 0) {
    filters.push(`id::text = ANY($${params.push(options.ids)}::text[])`);
  }
  if (options.countries.length > 0) {
    filters.push(`country_code = ANY($${params.push(options.countries)}::text[])`);
  }
  if (options.curricula.length > 0) {
    filters.push(`curriculum_code = ANY($${params.push(options.curricula)}::text[])`);
  }

  const limitClause = Number.isFinite(options.maxDocs) && options.maxDocs > 0
    ? `LIMIT ${Math.trunc(options.maxDocs)}`
    : '';

  const result = await client.query(
    `SELECT id::text, country_code, curriculum_code, grade_code, subject, source_url, object_key, downloaded_file_checksum
     FROM curriculum_source_documents
     WHERE ${filters.join('\n       AND ')}
     ORDER BY country_code, curriculum_code, grade_code, subject, id
     ${limitClause}`,
    params
  );
  return result.rows;
}

async function download(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 Kitabu-Curriculum-Ingestion/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function downloadWithCurl(url, filePath) {
  await mkdir(dirname(filePath), { recursive: true });
  await execFileAsync('curl.exe', [
    '-L',
    '--fail',
    '--max-time',
    '300',
    '--retry',
    '2',
    '--output',
    filePath,
    url
  ], {
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  });
  return readFile(filePath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.KITABU_DATABASE_URL) {
    throw new Error('KITABU_DATABASE_URL is not set');
  }

  const pool = new Pool({
    connectionString: process.env.KITABU_DATABASE_URL,
    ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
  });
  const client = await pool.connect();
  const totals = { downloaded: 0, skipped: 0, failed: 0, checksumMismatches: 0 };

  try {
    const documents = await queryDocuments(client, options);
    console.log(`Source download target: ${documents.length} documents`);
    for (const document of documents) {
      const filePath = resolveObjectKey(document.object_key);
      if (!options.force && existsSync(filePath) && statSync(filePath).size > 0) {
        totals.skipped += 1;
        continue;
      }

      try {
        console.log(`Downloading ${document.country_code} ${document.grade_code} ${document.subject}`);
        const buffer = options.curl
          ? await downloadWithCurl(document.source_url, filePath)
          : await download(document.source_url);
        const checksum = sha256(buffer);
        if (document.downloaded_file_checksum && checksum !== document.downloaded_file_checksum) {
          totals.checksumMismatches += 1;
          console.warn(`Checksum mismatch for ${document.id}: expected ${document.downloaded_file_checksum}, got ${checksum}`);
        }
        if (!options.curl) {
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(filePath, buffer);
        }
        totals.downloaded += 1;
        console.log(`Wrote ${relativeApiPath(filePath)}`);
      } catch (error) {
        totals.failed += 1;
        console.warn(`Failed ${document.id}: ${error.message}`);
      }
    }
    console.log(JSON.stringify(totals, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
