import path from 'node:path';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BLOCKED_CAPTURE_METADATA_KEYS = new Set([
  'altitude',
  'camera',
  'camera_make',
  'camera_model',
  'capture_time',
  'captured_at',
  'device_model',
  'exif',
  'geo',
  'geolocation',
  'gps',
  'latitude',
  'longitude'
]);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function fail(label, message) {
  throw new Error(`${label} ${message}`);
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(label, 'must be a non-empty string.');
  return value.trim();
}

function optionalText(value, label) {
  if (value === undefined || value === null || value === '') return null;
  return text(value, label);
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) fail(label, 'must be a positive integer.');
  return value;
}

function stringArray(value, label) {
  if (!Array.isArray(value)) fail(label, 'must be an array of strings.');
  return value.map((item, index) => text(item, `${label}[${index}]`));
}

function optionalChecksum(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = text(value, label).toLowerCase();
  if (!SHA256_PATTERN.test(normalized)) fail(label, 'must be a lowercase SHA-256 checksum.');
  return normalized;
}

function firstDefined(record, names) {
  for (const name of names) {
    if (record[name] !== undefined) return record[name];
  }
  return undefined;
}

function requireRecord(value, label) {
  if (!isRecord(value)) fail(label, 'must be an object.');
  return value;
}

export function normalizeRelativeAssetPath(value, label) {
  const raw = text(value, label).replaceAll('\\', '/');
  if (/^(?:[A-Za-z]:)?\//.test(raw) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) {
    fail(label, 'must be a relative package path.');
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    fail(label, 'must not escape the reference package.');
  }
  return normalized;
}

function normalizeAsset(value, label) {
  const source = typeof value === 'string' ? { path: value } : requireRecord(value, label);
  const relativePath = normalizeRelativeAssetPath(
    firstDefined(source, ['path', 'relative_path', 'relativePath']),
    `${label}.path`
  );
  return {
    relativePath,
    assetType: optionalText(firstDefined(source, ['asset_type', 'assetType', 'type']), `${label}.type`) ?? 'image',
    description: optionalText(source.description, `${label}.description`),
    checksum: optionalChecksum(firstDefined(source, ['checksum', 'sha256']), `${label}.checksum`)
  };
}

function normalizeAssetList(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(label, 'must be an array when present.');
  return value.map((asset, index) => normalizeAsset(asset, `${label}[${index}]`));
}

function mergeAssets(assets, label) {
  const byPath = new Map();
  for (const asset of assets) {
    const current = byPath.get(asset.relativePath);
    if (!current) {
      byPath.set(asset.relativePath, asset);
      continue;
    }
    if (current.checksum && asset.checksum && current.checksum !== asset.checksum) {
      fail(label, `declares conflicting checksums for ${asset.relativePath}.`);
    }
    if (current.assetType !== asset.assetType && current.assetType !== 'image' && asset.assetType !== 'image') {
      fail(label, `declares conflicting asset types for ${asset.relativePath}.`);
    }
    byPath.set(asset.relativePath, {
      ...current,
      assetType: current.assetType === 'image' ? asset.assetType : current.assetType,
      description: current.description ?? asset.description,
      checksum: current.checksum ?? asset.checksum
    });
  }
  return [...byPath.values()];
}

function assertNoCaptureMetadata(value, label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCaptureMetadata(item, `${label}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_CAPTURE_METADATA_KEYS.has(key.trim().toLowerCase())) {
      fail(`${label}.${key}`, 'is capture metadata and is not allowed in the reference library.');
    }
    assertNoCaptureMetadata(child, `${label}.${key}`);
  }
}

function promptAssets(value, label, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => promptAssets(item, `${label}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replaceAll('-', '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (normalizedKey === 'asset_path') {
      output.push(normalizeAsset(child, `${label}.${key}`));
      continue;
    }
    if (normalizedKey === 'asset_paths' || normalizedKey === 'assets') {
      output.push(...normalizeAssetList(child, `${label}.${key}`));
      continue;
    }
    promptAssets(child, `${label}.${key}`, output);
  }
  return output;
}

function normalizeDocumentMetadata(payload) {
  const document = isRecord(payload.document)
    ? payload.document
    : isRecord(payload.metadata)
      ? payload.metadata
      : payload;
  const source = isRecord(document.source) ? document.source : {};
  return {
    documentKey: text(firstDefined(document, ['document_key', 'documentKey', 'id']), 'document.document_key'),
    countryCode: text(firstDefined(document, ['country_code', 'countryCode', 'country']), 'document.country_code').toUpperCase(),
    curriculumCode: text(firstDefined(document, ['curriculum_code', 'curriculumCode', 'curriculum']), 'document.curriculum_code').toUpperCase(),
    gradeLevel: text(firstDefined(document, ['grade_level', 'gradeLevel', 'grade']), 'document.grade_level'),
    title: text(document.title, 'document.title'),
    sourceIdentity: text(
      firstDefined(document, ['source_identity', 'sourceIdentity']) ?? source.identity,
      'document.source_identity'
    ),
    sourceChecksum: optionalChecksum(
      firstDefined(document, ['source_checksum', 'sourceChecksum']) ?? source.checksum,
      'document.source_checksum'
    )
  };
}

function normalizeActivity(value, label) {
  const activity = requireRecord(value, label);
  const promptData = firstDefined(activity, ['prompt_data', 'promptData']) ?? {};
  if (!isRecord(promptData)) fail(`${label}.prompt_data`, 'must be an object.');
  assertNoCaptureMetadata(promptData, `${label}.prompt_data`);
  return {
    order: positiveInteger(activity.order, `${label}.order`),
    title: text(activity.title, `${label}.title`),
    instructions: text(activity.instructions, `${label}.instructions`),
    activityType: text(firstDefined(activity, ['activity_type', 'activityType']), `${label}.activity_type`),
    promptData,
    skills: stringArray(activity.skills, `${label}.skills`),
    visualRequirements: stringArray(
      firstDefined(activity, ['visual_requirements', 'visualRequirements']),
      `${label}.visual_requirements`
    ),
    templateGuidance: text(
      firstDefined(activity, ['template_guidance', 'templateGuidance']),
      `${label}.template_guidance`
    ),
    assets: mergeAssets([
      ...normalizeAssetList(activity.assets, `${label}.assets`),
      ...promptAssets(promptData, `${label}.prompt_data`)
    ], `${label}.assets`)
  };
}

function normalizePage(value, label) {
  const page = requireRecord(value, label);
  if (!Array.isArray(page.activities)) fail(`${label}.activities`, 'must be an array.');
  const activities = page.activities.map((activity, index) => normalizeActivity(activity, `${label}.activities[${index}]`));
  const orders = new Set();
  for (const activity of activities) {
    if (orders.has(activity.order)) fail(label, `contains duplicate activity order ${activity.order}.`);
    orders.add(activity.order);
  }
  return {
    pageNumber: positiveInteger(firstDefined(page, ['page_number', 'pageNumber']), `${label}.page_number`),
    subject: text(page.subject, `${label}.subject`),
    learningObjectives: stringArray(
      firstDefined(page, ['learning_objectives', 'learningObjectives']),
      `${label}.learning_objectives`
    ),
    activities,
    assets: mergeAssets(normalizeAssetList(page.assets, `${label}.assets`), `${label}.assets`)
  };
}

/**
 * Validates the derived-content JSON contract used by the reference-library importer.
 * Unknown fields are deliberately omitted from the result so that source/capture metadata
 * cannot flow into the persistent reference store.
 */
export function validateReferencePayload(payload) {
  const root = requireRecord(payload, 'reference payload');
  if (!Array.isArray(root.pages)) fail('reference payload.pages', 'must be an array.');
  const pages = root.pages.map((page, index) => normalizePage(page, `pages[${index}]`));
  const pageNumbers = new Set();
  for (const page of pages) {
    if (pageNumbers.has(page.pageNumber)) fail('reference payload.pages', `contains duplicate page number ${page.pageNumber}.`);
    pageNumbers.add(page.pageNumber);
  }
  return {
    document: normalizeDocumentMetadata(root),
    pages,
    assets: mergeAssets(normalizeAssetList(root.assets, 'assets'), 'assets')
  };
}

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}
