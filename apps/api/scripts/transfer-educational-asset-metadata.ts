import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';

import { appConfig } from '../dist/config.js';
import { db, redis } from '../dist/db.js';
import { assertSafeEducationalAssetStorageKey } from '../dist/educationalAssets/storage.js';
import {
  assertEducationalAssetMetadataBundle,
  decideMetadataAsset,
  educationalAssetMetadataBundleVersion,
  metadataBundleForAssets,
  stableJson,
  type EducationalAssetMetadataBundle,
} from '../dist/educationalAssets/metadataTransfer.js';

const assetColumns = [
  'id', 'title', 'description', 'metadata', 'media_type', 'mime_type', 'content_sha256', 'byte_size',
  'storage_backend', 'storage_key', 'production_status', 'subject', 'topic', 'grade_level', 'visual_type',
  'subtopic', 'keywords', 'synonyms', 'grade_min', 'grade_max', 'language', 'contains_text', 'alt_text',
  'educational_description', 'normalization_status', 'width', 'height', 'aspect_ratio', 'visual_hash',
  'usage_restriction', 'review_reason', 'created_at', 'updated_at',
] as const;

const provenanceColumns = [
  'id', 'asset_id', 'source_url', 'source_name', 'source_license', 'source_license_url', 'original_filename',
  'creator', 'creator_url', 'license_version', 'license_evidence', 'provider_key', 'provider_asset_id',
  'source_raw_url', 'attribution', 'retrieved_at', 'created_at',
] as const;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function boundedInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_000) : fallback;
}

function requireUuid(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} must be a UUID`);
  }
  return value;
}

function requireText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function sortedRows(rows: Record<string, unknown>[]) {
  return [...rows].sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
}

async function readSourceFile(rootDirectory: string, storageKey: string) {
  assertSafeEducationalAssetStorageKey(storageKey);
  const rootPath = await realpath(rootDirectory);
  const root = await stat(rootPath);
  if (!root.isDirectory()) throw new Error(`Educational asset storage root is not a directory: ${rootDirectory}`);
  const filePath = await realpath(path.resolve(rootPath, storageKey));
  const relative = path.relative(rootPath, filePath);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Asset storage key escapes root: ${storageKey}`);
  const file = await stat(filePath);
  if (!file.isFile()) throw new Error(`Educational asset storage object is not a file: ${storageKey}`);
  const bytes = await readFile(filePath);
  return { bytes, byteSize: file.size, sha256: createHash('sha256').update(bytes).digest('hex') };
}

async function exportBundle(outputPath: string, sourceRoot: string) {
  const client = await db.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const assetsResult = await client.query(`SELECT ${assetColumns.join(', ')} FROM educational_assets ORDER BY id ASC`);
    const provenanceResult = await client.query(`SELECT ${provenanceColumns.join(', ')} FROM educational_asset_provenance ORDER BY id ASC`);
    const linksResult = await client.query('SELECT asset_id, unit_id, relationship_metadata, created_at FROM educational_asset_curriculum_units ORDER BY asset_id ASC, unit_id ASC');
    const taxonomyResult = await client.query(`SELECT link.asset_id, term.code AS term_code, link.relationship_metadata, link.created_at
                FROM educational_asset_taxonomy_links link
                JOIN educational_asset_taxonomy_terms term ON term.id = link.term_id
                ORDER BY link.asset_id ASC, term.code ASC`);
    const assets = assetsResult.rows as Record<string, unknown>[];
    const provenance = provenanceResult.rows as Record<string, unknown>[];
    const providerKeys = [...new Set(provenance.map(row => row.provider_key).filter((key): key is string => typeof key === 'string'))];
    const providersResult = providerKeys.length
      ? await client.query('SELECT provider_key, display_name, homepage_url, enabled, metadata, created_at, updated_at FROM educational_asset_providers WHERE provider_key = ANY($1::text[]) ORDER BY provider_key ASC', [providerKeys])
      : { rows: [] };
    const files = [];
    for (const asset of assets) {
      const storageKey = requireText(asset.storage_key, 'educational_assets.storage_key');
      const local = await readSourceFile(sourceRoot, storageKey);
      if (local.sha256 !== asset.content_sha256 || local.byteSize !== Number(asset.byte_size)) {
        throw new Error(`Source file does not match metadata for ${storageKey}`);
      }
      files.push({ storageKey, contentSha256: local.sha256, byteSize: local.byteSize, mimeType: requireText(asset.mime_type, 'educational_assets.mime_type') });
    }
    const bundle: EducationalAssetMetadataBundle = {
      format: 'kitabu-educational-assets',
      version: educationalAssetMetadataBundleVersion,
      assets: sortedRows(assets),
      provenance: sortedRows(provenance),
      providers: sortedRows(providersResult.rows as Record<string, unknown>[]),
      curriculumLinks: sortedRows(linksResult.rows as Record<string, unknown>[]),
      taxonomyLinks: sortedRows(taxonomyResult.rows as Record<string, unknown>[]),
      files: files.sort((left, right) => left.storageKey.localeCompare(right.storageKey)),
    };
    await client.query('COMMIT');
    const temporaryPath = `${outputPath}.tmp`;
    await writeFile(temporaryPath, `${stableJson(bundle)}\n`, { encoding: 'utf8' });
    await rename(temporaryPath, outputPath);
    console.log(JSON.stringify({ mode: 'export', output: outputPath, assets: bundle.assets.length, provenance: bundle.provenance.length, providers: bundle.providers.length, curriculumLinks: bundle.curriculumLinks.length, taxonomyLinks: bundle.taxonomyLinks.length, files: bundle.files.length }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

type ExistingAsset = { id: string; content_sha256: string; storage_key: string };
type ExistingProvider = Record<string, unknown>;
type ExistingProvenance = Record<string, unknown>;

function rowsBy<T extends Record<string, unknown>>(rows: T[], field: keyof T) {
  return new Map(rows.map(row => [String(row[field]), row]));
}

function providerFingerprint(row: Record<string, unknown>) {
  return stableJson({ display_name: row.display_name, homepage_url: row.homepage_url, enabled: row.enabled, metadata: row.metadata });
}

function provenanceFingerprint(row: Record<string, unknown>) {
  return stableJson({ source_url: row.source_url, source_name: row.source_name, source_license: row.source_license, source_license_url: row.source_license_url, original_filename: row.original_filename, creator: row.creator, creator_url: row.creator_url, license_version: row.license_version, license_evidence: row.license_evidence, provider_key: row.provider_key, provider_asset_id: row.provider_asset_id, source_raw_url: row.source_raw_url, attribution: row.attribution, retrieved_at: row.retrieved_at });
}

async function planBatch(client: PoolClient, bundle: EducationalAssetMetadataBundle) {
  const assetIds = bundle.assets.map(row => requireUuid(row.id, 'asset.id'));
  const hashes = bundle.assets.map(row => {
    const hash = requireText(row.content_sha256, 'asset.content_sha256');
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`asset.content_sha256 must be a lowercase SHA-256: ${String(row.id)}`);
    return hash;
  });
  const fileByStorageKey = new Map(bundle.files.map(file => [file.storageKey, file]));
  for (const asset of bundle.assets) {
    if (asset.storage_backend !== 'local') throw new Error(`Metadata import only accepts local source assets: ${String(asset.id)}`);
    const storageKey = requireText(asset.storage_key, 'asset.storage_key');
    assertSafeEducationalAssetStorageKey(storageKey);
    const file = fileByStorageKey.get(storageKey);
    if (!file || file.contentSha256 !== asset.content_sha256 || file.byteSize !== Number(asset.byte_size) || file.mimeType !== asset.mime_type) {
      throw new Error(`Metadata import file manifest does not match asset ${String(asset.id)}`);
    }
  }
  if (new Set(hashes).size !== hashes.length) throw new Error('Metadata import bundle contains duplicate content SHA-256 values');
  const providerKeys = bundle.providers.map(row => requireText(row.provider_key, 'provider.provider_key'));
  const providerKeysInProvenance = new Set(bundle.provenance.map(row => row.provider_key).filter((key): key is string => typeof key === 'string'));
  for (const providerKey of providerKeysInProvenance) {
    if (!providerKeys.includes(providerKey)) throw new Error(`Metadata import bundle is missing provider ${providerKey}`);
  }
  const existingAssets = assetIds.length || hashes.length
    ? (await client.query<ExistingAsset>('SELECT id, content_sha256, storage_key FROM educational_assets WHERE id = ANY($1::uuid[]) OR content_sha256 = ANY($2::text[])', [assetIds, hashes])).rows
    : [];
  const existingById = rowsBy(existingAssets, 'id');
  const existingByHash = rowsBy(existingAssets, 'content_sha256');
  const decisions = bundle.assets.map(row => decideMetadataAsset(
    { id: String(row.id), content_sha256: String(row.content_sha256), storage_key: String(row.storage_key) },
    existingById.get(String(row.id)),
    existingByHash.get(String(row.content_sha256)),
  ));
  const conflicts = decisions.filter(decision => decision.kind === 'conflict');
  if (conflicts.length) throw new Error(`Metadata import conflict: ${conflicts.map(conflict => `${conflict.sourceId}: ${conflict.reason}`).join('; ')}`);
  const targetIds = decisions.map(decision => decision.targetId);
  const existingProviders = providerKeys.length
    ? (await client.query<ExistingProvider>('SELECT provider_key, display_name, homepage_url, enabled, metadata FROM educational_asset_providers WHERE provider_key = ANY($1::text[])', [providerKeys])).rows
    : [];
  const existingProviderByKey = rowsBy(existingProviders, 'provider_key');
  for (const provider of bundle.providers) {
    const existing = existingProviderByKey.get(String(provider.provider_key));
    if (existing && providerFingerprint(existing) !== providerFingerprint(provider)) throw new Error(`Metadata import conflict: provider ${String(provider.provider_key)} differs`);
  }
  const provenanceIds = bundle.provenance.map(row => requireUuid(row.id, 'provenance.id'));
  const existingProvenance = provenanceIds.length || providerKeys.length
    ? (await client.query<ExistingProvenance>('SELECT * FROM educational_asset_provenance WHERE id = ANY($1::uuid[]) OR provider_key = ANY($2::text[])', [provenanceIds, providerKeys])).rows
    : [];
  const existingProvenanceById = rowsBy(existingProvenance, 'id');
  const existingProvenanceByIdentity = new Map(existingProvenance.filter(row => row.provider_key && row.provider_asset_id).map(row => [`${row.provider_key}\u0000${row.provider_asset_id}`, row]));
  for (const provenance of bundle.provenance) {
    const targetId = decisions.find(decision => decision.sourceId === String(provenance.asset_id))?.targetId;
    if (!targetId) throw new Error(`Metadata import conflict: provenance ${String(provenance.id)} references an asset outside the batch`);
    const existingByProvenanceId = existingProvenanceById.get(String(provenance.id));
    if (existingByProvenanceId && (String(existingByProvenanceId.asset_id) !== targetId || provenanceFingerprint(existingByProvenanceId) !== provenanceFingerprint(provenance))) {
      throw new Error(`Metadata import conflict: provenance ${String(provenance.id)} differs`);
    }
    if (provenance.provider_key && provenance.provider_asset_id) {
      const existingByIdentity = existingProvenanceByIdentity.get(`${provenance.provider_key}\u0000${provenance.provider_asset_id}`);
      if (existingByIdentity && String(existingByIdentity.asset_id) !== targetId) throw new Error(`Metadata import conflict: provider identity ${String(provenance.provider_key)}/${String(provenance.provider_asset_id)} belongs to another asset`);
    }
  }
  const missingUnits = bundle.curriculumLinks.length
    ? (await client.query<{ id: string }>('SELECT id FROM curriculum_units WHERE id = ANY($1::uuid[])', [bundle.curriculumLinks.map(row => requireUuid(row.unit_id, 'curriculumLinks.unit_id'))])).rows.length !== new Set(bundle.curriculumLinks.map(row => String(row.unit_id))).size
    : false;
  if (missingUnits) throw new Error('Metadata import conflict: one or more curriculum unit targets are missing');
  const termCodes = [...new Set(bundle.taxonomyLinks.map(row => requireText(row.term_code, 'taxonomyLinks.term_code')))];
  const terms = termCodes.length ? (await client.query<{ code: string }>('SELECT code FROM educational_asset_taxonomy_terms WHERE code = ANY($1::text[])', [termCodes])).rows : [];
  if (terms.length !== termCodes.length) throw new Error('Metadata import conflict: one or more taxonomy term targets are missing');
  const existingCurriculumLinks = targetIds.length ? (await client.query<Record<string, unknown>>('SELECT asset_id, unit_id, relationship_metadata FROM educational_asset_curriculum_units WHERE asset_id = ANY($1::uuid[])', [targetIds])).rows : [];
  const existingTaxonomyLinks = targetIds.length ? (await client.query<Record<string, unknown>>(`SELECT link.asset_id, term.code AS term_code, link.relationship_metadata FROM educational_asset_taxonomy_links link JOIN educational_asset_taxonomy_terms term ON term.id = link.term_id WHERE link.asset_id = ANY($1::uuid[])`, [targetIds])).rows : [];
  for (const link of bundle.curriculumLinks) {
    const targetId = decisions.find(decision => decision.sourceId === String(link.asset_id))?.targetId;
    const existing = existingCurriculumLinks.find(row => String(row.asset_id) === targetId && String(row.unit_id) === String(link.unit_id));
    if (existing && stableJson(existing.relationship_metadata) !== stableJson(link.relationship_metadata)) throw new Error(`Metadata import conflict: curriculum link ${String(link.asset_id)}/${String(link.unit_id)} differs`);
  }
  for (const link of bundle.taxonomyLinks) {
    const targetId = decisions.find(decision => decision.sourceId === String(link.asset_id))?.targetId;
    const existing = existingTaxonomyLinks.find(row => String(row.asset_id) === targetId && String(row.term_code) === String(link.term_code));
    if (existing && stableJson(existing.relationship_metadata) !== stableJson(link.relationship_metadata)) throw new Error(`Metadata import conflict: taxonomy link ${String(link.asset_id)}/${String(link.term_code)} differs`);
  }
  return { decisions, existingProviderByKey, existingProvenanceById, existingProvenanceByIdentity, existingCurriculumLinks, existingTaxonomyLinks };
}

async function applyBatch(client: PoolClient, bundle: EducationalAssetMetadataBundle, plan: Awaited<ReturnType<typeof planBatch>>) {
  for (const provider of bundle.providers) {
    if (!plan.existingProviderByKey.has(String(provider.provider_key))) {
      await client.query(`INSERT INTO educational_asset_providers (provider_key, display_name, homepage_url, enabled, metadata, created_at, updated_at)
                          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`, [provider.provider_key, provider.display_name, provider.homepage_url, provider.enabled, JSON.stringify(provider.metadata ?? {}), provider.created_at, provider.updated_at]);
    }
  }
  for (const asset of bundle.assets) {
    const decision = plan.decisions.find(candidate => candidate.sourceId === String(asset.id));
    if (!decision) throw new Error(`Missing asset decision for ${String(asset.id)}`);
    if (decision.kind === 'insert') {
      const values = assetColumns.map(column => asset[column]);
      await client.query(`INSERT INTO educational_assets (${assetColumns.join(', ')}) VALUES (${assetColumns.map((_, index) => `$${index + 1}`).join(', ')})`, values);
    }
  }
  for (const provenance of bundle.provenance) {
    const decision = plan.decisions.find(candidate => candidate.sourceId === String(provenance.asset_id));
    if (!decision) throw new Error(`Missing provenance asset decision for ${String(provenance.id)}`);
    if (!plan.existingProvenanceById.has(String(provenance.id)) && !(provenance.provider_key && provenance.provider_asset_id && plan.existingProvenanceByIdentity.has(`${provenance.provider_key}\u0000${provenance.provider_asset_id}`))) {
      const values = provenanceColumns.map(column => column === 'asset_id' ? decision.targetId : provenance[column]);
      await client.query(`INSERT INTO educational_asset_provenance (${provenanceColumns.join(', ')}) VALUES (${provenanceColumns.map((_, index) => `$${index + 1}`).join(', ')})`, values);
    }
  }
  for (const link of bundle.curriculumLinks) {
    const decision = plan.decisions.find(candidate => candidate.sourceId === String(link.asset_id));
    if (!decision) throw new Error(`Missing curriculum link asset decision for ${String(link.asset_id)}`);
    const exists = plan.existingCurriculumLinks.some(row => String(row.asset_id) === decision.targetId && String(row.unit_id) === String(link.unit_id));
    if (!exists) await client.query('INSERT INTO educational_asset_curriculum_units (asset_id, unit_id, relationship_metadata, created_at) VALUES ($1::uuid, $2::uuid, $3::jsonb, $4)', [decision.targetId, link.unit_id, JSON.stringify(link.relationship_metadata ?? {}), link.created_at]);
  }
  for (const link of bundle.taxonomyLinks) {
    const decision = plan.decisions.find(candidate => candidate.sourceId === String(link.asset_id));
    if (!decision) throw new Error(`Missing taxonomy link asset decision for ${String(link.asset_id)}`);
    const exists = plan.existingTaxonomyLinks.some(row => String(row.asset_id) === decision.targetId && String(row.term_code) === String(link.term_code));
    if (!exists) {
      const term = await client.query<{ id: string }>('SELECT id FROM educational_asset_taxonomy_terms WHERE code = $1', [link.term_code]);
      if (!term.rows[0]) throw new Error(`Taxonomy term disappeared during import: ${String(link.term_code)}`);
      await client.query('INSERT INTO educational_asset_taxonomy_links (asset_id, term_id, relationship_metadata, created_at) VALUES ($1::uuid, $2::uuid, $3::jsonb, $4)', [decision.targetId, term.rows[0].id, JSON.stringify(link.relationship_metadata ?? {}), link.created_at]);
    }
  }
}

async function importBundle(inputPath: string, dryRun: boolean, limit: number, resume: string | null, backupConfirmed: string | undefined) {
  if (!dryRun) {
    if (!backupConfirmed || !existsSync(backupConfirmed)) throw new Error('--backup-confirmed must point to an existing pre-import database backup');
  }
  const bundle = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
  assertEducationalAssetMetadataBundle(bundle);
  const allAssets = [...bundle.assets].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const selected = allAssets.filter(asset => !resume || String(asset.id) > resume).slice(0, limit);
  const batch = metadataBundleForAssets(bundle, selected.map(asset => String(asset.id)));
  const client = await db.connect();
  try {
    await client.query(dryRun ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL SERIALIZABLE');
    const plan = await planBatch(client, batch);
    if (!dryRun) await applyBatch(client, batch, plan);
    await client.query('COMMIT');
    const counts = {
      assets: plan.decisions.length,
      insert: plan.decisions.filter(decision => decision.kind === 'insert').length,
      skip: plan.decisions.filter(decision => decision.kind === 'skip').length,
      dedupe: plan.decisions.filter(decision => decision.kind === 'dedupe').length,
      provenance: batch.provenance.length,
      curriculumLinks: batch.curriculumLinks.length,
      taxonomyLinks: batch.taxonomyLinks.length,
    };
    console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'apply', input: inputPath, limit, resume, nextResume: selected.at(-1)?.id ?? null, ...counts }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const mode = hasFlag('--export') ? 'export' : hasFlag('--import') ? 'import' : null;
try {
  if (mode === 'export') {
    await exportBundle(option('--output') ?? 'educational-assets-metadata.json', option('--source-root') ?? appConfig.KITABU_EDUCATIONAL_ASSET_STORAGE_ROOT);
  } else if (mode === 'import') {
    const dryRun = hasFlag('--dry-run') || !hasFlag('--apply');
    if (hasFlag('--dry-run') && hasFlag('--apply')) throw new Error('Use either --dry-run or --apply, not both');
    await importBundle(option('--input') ?? 'educational-assets-metadata.json', dryRun, boundedInteger(option('--limit'), 100), option('--resume')?.trim() || null, option('--backup-confirmed'));
  } else {
    throw new Error('Use --export or --import');
  }
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'Educational asset metadata transfer failed' }));
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
  await redis.quit().catch(() => undefined);
}
