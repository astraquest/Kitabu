import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
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
const MARKDOWN_ROOT = resolve(API_ROOT, 'data/curriculum/markdown');
const TEXT_CACHE_ROOT = resolve(API_ROOT, 'data/curriculum/text-cache');
const EXTRACTOR_PATH = resolve(SCRIPT_DIR, 'extract_pdf_markdown.py');
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
      } else if (arg.startsWith('--python=')) {
        options.python = arg.slice('--python='.length);
      } else if (arg === '--missing-only') {
        options.missingOnly = true;
      } else if (arg === '--cache-first') {
        options.cacheFirst = true;
      } else if (arg === '--force') {
        options.force = true;
      }
      return options;
    },
    {
      cacheFirst: false,
      countries: [],
      curricula: [],
      force: false,
      ids: [],
      maxDocs: null,
      missingOnly: false,
      python: process.env.PYTHON ?? 'python'
    }
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

function sha256(bufferOrString) {
  return createHash('sha256').update(bufferOrString).digest('hex');
}

function slug(value) {
  return String(value ?? 'subject')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'subject';
}

function yamlScalar(value) {
  if (value === null || value === undefined || value === '') return 'null';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

function relativeApiPath(filePath) {
  return relative(API_ROOT, filePath).split(sep).join('/');
}

function markdownPathForDocument(document) {
  return resolve(
    MARKDOWN_ROOT,
    document.country_code,
    document.curriculum_code,
    document.grade_code,
    slug(document.subject),
    `${document.id}.md`
  );
}

function textCachePathForDocument(document) {
  return resolve(
    TEXT_CACHE_ROOT,
    document.country_code,
    document.curriculum_code,
    document.grade_code,
    slug(document.subject),
    `${document.id}.json`
  );
}

function resolveObjectKey(objectKey) {
  if (!objectKey) throw new Error('object_key is missing');
  const normalized = String(objectKey).replace(/\\/g, '/').replace(/^\/+/, '');
  const filePath = resolve(API_ROOT, normalized);
  const relativePath = relative(API_ROOT, filePath);
  if (relativePath.startsWith('..') || resolve(API_ROOT, relativePath) !== filePath) {
    throw new Error(`object_key resolves outside apps/api: ${objectKey}`);
  }
  if (!existsSync(filePath)) {
    throw new Error(`local PDF does not exist: ${relativeApiPath(filePath)}`);
  }
  return filePath;
}

async function queryDocuments(client, options) {
  const params = [];
  const filters = [
    `subject <> $${params.push(GAP_SUBJECT)}`,
    `(source_url_status IS NULL OR source_url_status <> 'missing')`,
    `COALESCE(review_status, '') <> 'rejected'`
  ];
  if (options.missingOnly) {
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
    `SELECT id::text,
            country_code,
            curriculum_code,
            grade_code,
            COALESCE(NULLIF(local_level, ''), NULLIF(grade_local_level, ''), grade_code) AS grade_local_level,
            subject,
            official_title,
            publisher,
            source_url,
            downloaded_file_checksum,
            object_key,
            extraction_status,
            review_status,
            metadata
     FROM curriculum_source_documents
     WHERE ${filters.join('\n       AND ')}
     ORDER BY country_code, curriculum_code, grade_code, subject, official_title, id
     ${limitClause}`,
    params
  );
  return result.rows;
}

async function extractPdf(filePath, python) {
  const { stdout } = await execFileAsync(python, [EXTRACTOR_PATH, filePath], {
    maxBuffer: 512 * 1024 * 1024,
    windowsHide: true
  });
  const parsed = JSON.parse(stdout);
  if (parsed.error) throw new Error(parsed.error);
  if (!Array.isArray(parsed.pages)) throw new Error('PDF extractor returned no pages array');
  return {
    parser: parsed.parser ?? 'source-pdf-markdown-extractor',
    parserVersion: String(parsed.parserVersion ?? '1'),
    sourceFormat: 'pdf',
    sourceChecksum: sha256(await readFile(filePath)),
    pageCount: Number(parsed.pageCount ?? parsed.pages.length),
    pages: parsed.pages
  };
}

function normalizeCachedExtraction(parsed) {
  if (!Array.isArray(parsed.pages)) throw new Error('PDF text cache returned no pages array');
  return {
    parser: parsed.parser ?? 'source-pdf-markdown-extractor',
    parserVersion: String(parsed.parserVersion ?? '1'),
    sourceFormat: parsed.sourceFormat ?? 'pdf-text-cache',
    sourceChecksum: parsed.sourceChecksum ?? null,
    pageCount: Number(parsed.pageCount ?? parsed.pages.length),
    pages: parsed.pages
  };
}

async function extractPdfWithCache(document, pdfPath, python) {
  const cachePath = textCachePathForDocument(document);
  const cacheRelativePath = relativeApiPath(cachePath);
  const sourceChecksum = sha256(await readFile(pdfPath));
  if (existsSync(cachePath)) {
    const extraction = normalizeCachedExtraction(JSON.parse(await readFile(cachePath, 'utf8')));
    return { ...extraction, cachePath: cacheRelativePath };
  }

  const extraction = await extractPdf(pdfPath, python);
  const cached = {
    generatedAt: new Date().toISOString(),
    sourceDocumentId: document.id,
    countryCode: document.country_code,
    curriculumCode: document.curriculum_code,
    gradeCode: document.grade_code,
    subject: document.subject,
    officialTitle: document.official_title,
    sourceObjectKey: document.object_key,
    parser: extraction.parser,
    parserVersion: extraction.parserVersion,
    sourceFormat: 'pdf-text-cache',
    sourceChecksum,
    pageCount: extraction.pageCount,
    pages: extraction.pages
  };
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cached, null, 2)}\n`, 'utf8');
  return { ...normalizeCachedExtraction(cached), cachePath: cacheRelativePath };
}

function buildMarkdown(document, extraction, generatedAt) {
  const fields = [
    ['source_document_id', document.id],
    ['country_code', document.country_code],
    ['curriculum_code', document.curriculum_code],
    ['grade_code', document.grade_code],
    ['grade_local_level', document.grade_local_level],
    ['subject', document.subject],
    ['official_title', document.official_title],
    ['publisher', document.publisher],
    ['source_url', document.source_url],
    ['source_format', extraction.sourceFormat],
    ['source_checksum', extraction.sourceChecksum ?? document.downloaded_file_checksum],
    ['extraction_status', document.extraction_status],
    ['review_status', document.review_status],
    ['generated_at', generatedAt],
    ['parser', extraction.parser],
    ['parser_version', extraction.parserVersion],
    ['page_count', extraction.pageCount]
  ];
  const frontmatter = ['---', ...fields.map(([key, value]) => `${key}: ${yamlScalar(value)}`), '---'].join('\n');
  const pages = extraction.pages.map(page => {
    const text = String(page.text ?? '').replace(/\r\n?/g, '\n').trim();
    return `## Page ${page.pageNumber}\n\n${text || '[No extractable text]'}`;
  });
  return `${frontmatter}\n\n# ${document.official_title}\n\n${pages.join('\n\n')}\n`;
}

async function updateMetadata(client, document, metadata) {
  await client.query(
    `UPDATE curriculum_source_documents
     SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
           '{fullSourceMarkdown}',
           $3::jsonb,
           true
         ),
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [document.id, JSON.stringify(metadata.compatibility), JSON.stringify(metadata.fullSourceMarkdown)]
  );
}

async function processDocument(client, document, options) {
  const markdownPath = markdownPathForDocument(document);
  const markdownRelativePath = relativeApiPath(markdownPath);
  const pdfPath = resolveObjectKey(document.object_key);
  const generatedAt = new Date().toISOString();
  const extraction = options.cacheFirst
    ? await extractPdfWithCache(document, pdfPath, options.python)
    : await extractPdf(pdfPath, options.python);
  const markdown = buildMarkdown(document, extraction, generatedAt);
  const markdownChecksum = sha256(markdown);
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(markdownPath, markdown, 'utf8');
  await updateMetadata(client, document, {
    compatibility: {
      markdownPath: markdownRelativePath,
      markdownGeneratedAt: generatedAt,
      markdownPageCount: extraction.pageCount,
      markdownChecksum,
      markdownParser: `${extraction.parser}@${extraction.parserVersion}`
    },
    fullSourceMarkdown: {
      path: markdownRelativePath,
      generatedAt,
      pageCount: extraction.pageCount,
      checksum: markdownChecksum,
      parser: `${extraction.parser}@${extraction.parserVersion}`,
      sourceFormat: extraction.sourceFormat,
      sourceChecksum: extraction.sourceChecksum ?? document.downloaded_file_checksum ?? null,
      textCachePath: extraction.cachePath ?? null
    }
  });
  return {
    sourceDocumentId: document.id,
    gradeCode: document.grade_code,
    subject: document.subject,
    markdownPath: markdownRelativePath,
    textCachePath: extraction.cachePath ?? null,
    pageCount: extraction.pageCount
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.KITABU_DATABASE_URL) throw new Error('KITABU_DATABASE_URL is not set');
  const pool = new Pool({
    connectionString: process.env.KITABU_DATABASE_URL,
    ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
  });
  const client = await pool.connect();
  const result = { exported: 0, failed: 0, documents: [], failures: [] };
  try {
    const documents = await queryDocuments(client, options);
    console.log(`Source markdown export target: ${documents.length} documents`);
    for (const [index, document] of documents.entries()) {
      console.log(`Exporting ${index + 1}/${documents.length}: ${document.country_code} ${document.curriculum_code} ${document.grade_code} ${document.subject}`);
      try {
        await client.query('BEGIN');
        const exported = await processDocument(client, document, options);
        await client.query('COMMIT');
        result.exported += 1;
        result.documents.push(exported);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        result.failed += 1;
        result.failures.push({
          sourceDocumentId: document.id,
          gradeCode: document.grade_code,
          subject: document.subject,
          reason: error.message
        });
        console.warn(`Failed ${document.id}: ${error.message}`);
      }
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
