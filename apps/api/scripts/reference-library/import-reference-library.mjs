#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';
import { canonicalJson, validateReferencePayload } from './reference-library-contract.mjs';

const { Pool } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, '../..');
const defaultReferencePath = path.resolve(
  apiDir,
  'data/reference-library/KEN/CBC/PP1/orion-checkpoint-vol1/reference.json'
);

loadEnv({ path: path.resolve(apiDir, '.env') });

function usage() {
  return [
    'Usage: node scripts/reference-library/import-reference-library.mjs [--file <reference.json>] [--dry-run]',
    '',
    'Imports corrected, derived reference content and local generated-asset references.',
    'The default file is data/reference-library/KEN/CBC/PP1/orion-checkpoint-vol1/reference.json.'
  ].join('\n');
}

function parseArgs(args) {
  let filePath = defaultReferencePath;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--file') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--file requires a path.');
      filePath = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { help: true, dryRun, filePath };
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, dryRun, filePath };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const host = new URL(databaseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres';
  } catch {
    return false;
  }
}

function loadDatabaseCa() {
  const candidates = [
    path.resolve(apiDir, 'certs', 'supabase-root-2021-ca.pem'),
    path.resolve(process.cwd(), 'certs', 'supabase-root-2021-ca.pem'),
    path.resolve(process.cwd(), 'apps', 'api', 'certs', 'supabase-root-2021-ca.pem')
  ];
  const certPath = candidates.find(candidate => existsSync(candidate));
  return certPath ? readFileSync(certPath, 'utf8') : undefined;
}

function databaseConnectionString(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function databaseSslOptions(databaseUrl) {
  const sslMode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (sslMode === 'disable') return undefined;
  if (sslMode === 'require') return { rejectUnauthorized: false };
  if (sslMode === 'verify-full') return { ca: loadDatabaseCa(), rejectUnauthorized: true };
  return isLocalDatabaseUrl(databaseUrl)
    ? undefined
    : { ca: loadDatabaseCa(), rejectUnauthorized: true };
}

function ensureInsidePackage(packageRoot, relativePath) {
  const absolutePath = path.resolve(packageRoot, relativePath);
  const relative = path.relative(packageRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Asset path escaped the reference package: ${relativePath}`);
  }
  return absolutePath;
}

async function resolveAssets(packageRoot, assets) {
  return Promise.all(assets.map(async asset => {
    const absolutePath = ensureInsidePackage(packageRoot, asset.relativePath);
    const details = await stat(absolutePath).catch(() => null);
    if (!details?.isFile()) {
      throw new Error(`Referenced asset is missing or not a file: ${asset.relativePath}`);
    }
    const checksum = sha256(await readFile(absolutePath));
    if (asset.checksum && asset.checksum !== checksum) {
      throw new Error(`Asset checksum mismatch for ${asset.relativePath}`);
    }
    return { ...asset, checksum };
  }));
}

async function resolveReferencePackageAssets(packageRoot, payload) {
  return {
    ...payload,
    assets: await resolveAssets(packageRoot, payload.assets),
    pages: await Promise.all(payload.pages.map(async page => ({
      ...page,
      assets: await resolveAssets(packageRoot, page.assets),
      activities: await Promise.all(page.activities.map(async activity => ({
        ...activity,
        assets: await resolveAssets(packageRoot, activity.assets)
      })))
    })))
  };
}

function assetKey(scope, relativePath) {
  return `${scope}:${relativePath}`;
}

async function upsertAsset(client, documentId, scope, asset, pageId = null, activityId = null) {
  await client.query(
    `INSERT INTO reference_assets (
       document_id, page_id, activity_id, asset_key, relative_path, asset_type, description, content_checksum
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (document_id, asset_key)
     DO UPDATE SET
       page_id = EXCLUDED.page_id,
       activity_id = EXCLUDED.activity_id,
       relative_path = EXCLUDED.relative_path,
       asset_type = EXCLUDED.asset_type,
       description = EXCLUDED.description,
       content_checksum = EXCLUDED.content_checksum,
       updated_at = NOW()`,
    [
      documentId,
      pageId,
      activityId,
      assetKey(scope, asset.relativePath),
      asset.relativePath,
      asset.assetType,
      asset.description,
      asset.checksum
    ]
  );
}

async function importPayload(client, payload) {
  const contentChecksum = sha256(canonicalJson(payload));
  const documentResult = await client.query(
    `INSERT INTO reference_documents (
       document_key, country_code, curriculum_code, grade_level, title,
       source_identity, source_checksum, content_checksum
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (document_key)
     DO UPDATE SET
       country_code = EXCLUDED.country_code,
       curriculum_code = EXCLUDED.curriculum_code,
       grade_level = EXCLUDED.grade_level,
       title = EXCLUDED.title,
       source_identity = EXCLUDED.source_identity,
       source_checksum = EXCLUDED.source_checksum,
       content_checksum = EXCLUDED.content_checksum,
       imported_at = NOW(),
       updated_at = NOW()
     RETURNING id`,
    [
      payload.document.documentKey,
      payload.document.countryCode,
      payload.document.curriculumCode,
      payload.document.gradeLevel,
      payload.document.title,
      payload.document.sourceIdentity,
      payload.document.sourceChecksum,
      contentChecksum
    ]
  );
  const documentId = documentResult.rows[0].id;
  let activityCount = 0;
  let assetCount = 0;

  // Treat each package as the complete current representation of one document.
  // Removing old children before rebuilding prevents corrected imports from
  // leaving stale pages, activities, or asset references behind.
  await client.query('DELETE FROM reference_assets WHERE document_id = $1', [documentId]);
  await client.query('DELETE FROM reference_pages WHERE document_id = $1', [documentId]);

  for (const asset of payload.assets) {
    await upsertAsset(client, documentId, 'document', asset);
    assetCount += 1;
  }

  for (const page of payload.pages) {
    const pageResult = await client.query(
      `INSERT INTO reference_pages (document_id, page_number, subject, learning_objectives)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (document_id, page_number)
       DO UPDATE SET
         subject = EXCLUDED.subject,
         learning_objectives = EXCLUDED.learning_objectives,
         updated_at = NOW()
       RETURNING id`,
      [documentId, page.pageNumber, page.subject, JSON.stringify(page.learningObjectives)]
    );
    const pageId = pageResult.rows[0].id;

    for (const asset of page.assets) {
      await upsertAsset(client, documentId, `page:${page.pageNumber}`, asset, pageId);
      assetCount += 1;
    }

    for (const activity of page.activities) {
      const activityResult = await client.query(
        `INSERT INTO reference_activities (
           page_id, position, title, instructions, activity_type, prompt_data,
           skills, visual_requirements, template_guidance
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
         ON CONFLICT (page_id, position)
         DO UPDATE SET
           title = EXCLUDED.title,
           instructions = EXCLUDED.instructions,
           activity_type = EXCLUDED.activity_type,
           prompt_data = EXCLUDED.prompt_data,
           skills = EXCLUDED.skills,
           visual_requirements = EXCLUDED.visual_requirements,
           template_guidance = EXCLUDED.template_guidance,
           updated_at = NOW()
         RETURNING id`,
        [
          pageId,
          activity.order,
          activity.title,
          activity.instructions,
          activity.activityType,
          JSON.stringify(activity.promptData),
          JSON.stringify(activity.skills),
          JSON.stringify(activity.visualRequirements),
          activity.templateGuidance
        ]
      );
      const activityId = activityResult.rows[0].id;
      activityCount += 1;

      for (const asset of activity.assets) {
        await upsertAsset(
          client,
          documentId,
          `page:${page.pageNumber}:activity:${activity.order}`,
          asset,
          pageId,
          activityId
        );
        assetCount += 1;
      }
    }
  }

  return { contentChecksum, documentId, activityCount, assetCount };
}

export async function loadReferencePackage(filePath) {
  const raw = JSON.parse(await readFile(filePath, 'utf8'));
  return validateReferencePayload(raw);
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage());
    return;
  }
  const payload = await loadReferencePackage(options.filePath);
  const packageRoot = path.dirname(options.filePath);
  const resolvedPayload = await resolveReferencePackageAssets(packageRoot, payload);

  const activityCount = resolvedPayload.pages.reduce((total, page) => total + page.activities.length, 0);
  const assetCount = resolvedPayload.assets.length + resolvedPayload.pages.reduce(
    (total, page) => total + page.assets.length + page.activities.reduce(
      (pageTotal, activity) => pageTotal + activity.assets.length,
      0
    ),
    0
  );

  if (options.dryRun) {
    console.log(
      `Reference-library dry run OK: ${resolvedPayload.document.documentKey}; ` +
      `${resolvedPayload.pages.length} page(s), ${activityCount} activity/activities, ${assetCount} asset reference(s).`
    );
    return;
  }

  if (!process.env.KITABU_DATABASE_URL) {
    throw new Error('KITABU_DATABASE_URL is not set. Use --dry-run to validate the reference package.');
  }

  const pool = new Pool({
    connectionString: databaseConnectionString(process.env.KITABU_DATABASE_URL),
    ssl: databaseSslOptions(process.env.KITABU_DATABASE_URL)
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await importPayload(client, resolvedPayload);
    await client.query('COMMIT');
    console.log(
      `Imported reference document ${resolvedPayload.document.documentKey}: ${resolvedPayload.pages.length} page(s), ` +
      `${result.activityCount} activity/activities, ${result.assetCount} asset reference(s), ` +
      `content checksum ${result.contentChecksum}.`
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Reference-library import failed.');
    console.error(error);
    process.exitCode = 1;
  });
}
