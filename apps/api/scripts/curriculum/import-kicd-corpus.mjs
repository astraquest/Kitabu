#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzip } from 'node:zlib';
import { reviewedOverlapJustification } from './lib/kicd-reviewed-semantic-overlap.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(SCRIPT_DIR, '../..');
const IMPORTER_VERSION = 1;
const DEFAULT_ALLOWED_GRADES = Array.from({ length: 9 }, (_, index) => `Grade ${index + 4}`);
const BATCH_ALLOWED_GRADES = Array.from({ length: 9 }, (_, index) => `Grade ${index + 4}`);
const COMPLETED_GRADE_FILES = Object.freeze({
  dataset: 'normalized-curriculum.json',
  sourcePages: 'source-pages.json',
  validationReport: 'validation-report.json',
  sourceCatalog: 'source-catalog.json',
  importPolicy: 'import-policy.json'
});
const IMPORT_POLICY_SCHEMA = 'kitabu.curriculum.expected-count-policy';
const IMPORT_POLICY_SCHEMA_VERSION = 1;
const LOGICAL_TABLE_ORDER = [
  'sources', 'frameworks', 'ingestionRuns', 'grades', 'subjects', 'gradeSubjects', 'sourceDocuments',
  'sourcePages', 'units', 'outcomes', 'questions', 'activities', 'legacyStrands', 'legacySubStrands',
  'pathways', 'selectionGroups', 'pathwaySubjects', 'citations'
];
const DIGEST_TABLES = LOGICAL_TABLE_ORDER.filter(name => !['frameworks', 'grades', 'subjects'].includes(name));
const COUNT_FIELDS = ['documents', 'pages', 'gradeSubjects', 'strands', 'subStrands', 'outcomes', 'inquiryQuestions', 'learningActivities'];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const gunzipAsync = promisify(gunzip);

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalJson(value)).digest('hex');
}

export function computeLogicalDigest(rows) {
  return sha256(Object.fromEntries(DIGEST_TABLES.map(name => [name, rows[name] ?? []])));
}

export function deterministicUuid(namespace, key) {
  const bytes = Buffer.from(sha256(`${namespace}\0${key}`).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function asInteger(value, label) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  return value;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function gradeNumber(grade) {
  const match = /^Grade\s+(\d+)$/.exec(grade);
  return match ? Number(match[1]) : null;
}

function corpusCounts(entries, documents = []) {
  const strands = entries.flatMap(entry => entry.strands ?? []);
  const subStrands = strands.flatMap(strand => strand.subStrands ?? []);
  return {
    documents: documents.length,
    pages: documents.reduce((sum, document) => sum + (document.pages ?? []).length, 0),
    gradeSubjects: entries.length,
    strands: strands.length,
    subStrands: subStrands.length,
    outcomes: subStrands.reduce((sum, item) => sum + (item.outcomes ?? []).length, 0),
    inquiryQuestions: subStrands.reduce((sum, item) => sum + (item.inquiryQuestions ?? []).length, 0),
    learningActivities: subStrands.reduce((sum, item) => sum + (item.learningActivities ?? []).length, 0)
  };
}

function assertCounts(label, expected, actual, requireComplete = false) {
  if (!expected || typeof expected !== 'object') throw new Error(`${label} expected counts are required.`);
  for (const field of COUNT_FIELDS) {
    if (expected[field] === undefined) {
      if (requireComplete) throw new Error(`${label}.${field} is required.`);
      continue;
    }
    if (!Number.isInteger(expected[field]) || expected[field] < 0) throw new Error(`${label}.${field} must be a non-negative integer.`);
    if (expected[field] !== actual[field]) throw new Error(`${label}.${field} mismatch: expected ${expected[field]}, got ${actual[field]}.`);
  }
}

function subjectConfig(config, entry, taxonomy = null) {
  const configured = config.subjects?.[entry.subjectCode] ?? {};
  return {
    legacyId: configured.legacyId ?? entry.legacySubjectId ?? entry.subjectCode,
    name: configured.name ?? entry.subjectName,
    languageCode: configured.languageCode ?? null,
    isCompulsory: configured.isCompulsory ?? (taxonomy
      ? taxonomy.classification?.kind === 'core_slot' && taxonomy.classification?.optional !== true
      : entry.isCompulsory ?? true)
  };
}

function buildSourceTaxonomy(dataset, sourceCatalog, config) {
  const catalogRows = sourceCatalog?.subjects ?? sourceCatalog?.assets ?? [];
  const catalogByDocument = new Map(catalogRows.map(subject => [
    subject.driveFileId ?? subject.driveId ?? subject.drive_file_id ?? subject.googleDriveFileId,
    subject
  ]));
  const bySubjectCode = new Map();
  for (const entry of dataset.gradeSubjects) {
    const catalogTaxonomy = catalogByDocument.get(entry.sourceDocumentId);
    if (sourceCatalog && !catalogTaxonomy) throw new Error(`Source catalog has no document identity for ${entry.gradeLevel}/${entry.subjectCode}.`);
    if (config.requireSourceCatalogTaxonomy && !catalogTaxonomy?.classification) throw new Error(`Source catalog has no classification for ${entry.gradeLevel}/${entry.subjectCode}.`);
    if (catalogTaxonomy?.classification && entry.classification) {
      const fields = ['kind', 'slot', 'optional'];
      for (const field of fields) if ((catalogTaxonomy.classification[field] ?? null) !== (entry.classification[field] ?? null)) {
        throw new Error(`Normalized classification disagrees with source catalog for ${entry.subjectCode}.${field}.`);
      }
      const preSeniorAlternative = (gradeNumber(entry.gradeLevel) ?? 0) < 10
        && ['pathway', 'optional_language'].includes(catalogTaxonomy.classification.kind)
        ? catalogTaxonomy.classification.pathway ?? null
        : null;
      if (Object.hasOwn(catalogTaxonomy.classification, 'pathway') && preSeniorAlternative === null
        && (catalogTaxonomy.classification.pathway ?? null) !== (entry.pathway ?? null)) {
        throw new Error(`Normalized pathway disagrees with source catalog for ${entry.subjectCode}.`);
      }
      const catalogAlternative = catalogTaxonomy.classification.alternative ?? preSeniorAlternative;
      if ((Object.hasOwn(catalogTaxonomy.classification, 'alternative') || preSeniorAlternative !== null)
        && catalogAlternative !== (entry.alternativeCode ?? null)) {
        throw new Error(`Normalized alternativeCode disagrees with source catalog for ${entry.subjectCode}.`);
      }
    }
    const taxonomy = catalogTaxonomy ?? (entry.classification ? { classification: entry.classification } : null);
    if (config.requireNormalizedTaxonomy && !entry.classification) throw new Error(`Normalized taxonomy is required for ${entry.gradeLevel}/${entry.subjectCode}.`);
    if (!taxonomy?.classification) continue;
    const expectedCompulsory = taxonomy.classification.kind === 'core_slot' && taxonomy.classification.optional !== true;
    if (config.requireNormalizedTaxonomy && entry.isCompulsory !== expectedCompulsory) {
      throw new Error(`Normalized isCompulsory disagrees with classification for ${entry.gradeLevel}/${entry.subjectCode}.`);
    }
    if (config.requireNormalizedTaxonomy) {
      const expectedRole = expectedCompulsory ? 'core' : 'selection_option';
      if (entry.subjectRole !== expectedRole) throw new Error(`Normalized subjectRole disagrees with classification for ${entry.subjectCode}.`);
      if (Object.hasOwn(taxonomy.classification, 'selectionGroupCode')
        && (entry.selectionGroupCode ?? null) !== (taxonomy.classification.selectionGroupCode ?? null)) {
        throw new Error(`Normalized selectionGroupCode disagrees with classification for ${entry.subjectCode}.`);
      }
      if ((gradeNumber(entry.gradeLevel) ?? 0) < 10 && entry.pathway !== null) throw new Error(`${entry.gradeLevel}/${entry.subjectCode} must not use a Senior pathway.`);
    }
    bySubjectCode.set(entry.subjectCode, taxonomy);
  }
  if (config.requireNormalizedTaxonomy && !(dataset.pathways ?? []).length) throw new Error('Normalized taxonomy requires explicit pathways and selection groups.');
  if (bySubjectCode.size === 0) return { bySubjectCode, pathways: [], summary: null };
  const pathways = [];
  const selectionRules = [];
  for (const gradeLevel of sortedUnique(dataset.gradeSubjects.map(entry => entry.gradeLevel))) {
    const entries = dataset.gradeSubjects.filter(entry => entry.gradeLevel === gradeLevel);
    const alternatives = new Map();
    for (const entry of entries) {
      const classification = bySubjectCode.get(entry.subjectCode).classification;
      if (!['pathway', 'optional_language'].includes(classification.kind)) continue;
      const slot = classification.slot;
      if (!alternatives.has(slot)) alternatives.set(slot, []);
      alternatives.get(slot).push(entry.subjectCode);
    }
    if (alternatives.size === 0) continue;
    const groups = [];
    for (const [slot, subjectCodes] of [...alternatives].sort(([left], [right]) => left.localeCompare(right))) {
      const configured = sourceCatalog?.selectionRules?.[slot] ?? {};
      const requiredChoice = slot === 'religious_education';
      const rule = {
        code: configured.code ?? slot.toUpperCase(),
        name: configured.name ?? slot.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
        minSelections: configured.minSelections ?? (requiredChoice ? 1 : 0),
        maxSelections: configured.maxSelections ?? 1,
        subjects: subjectCodes.sort()
      };
      groups.push(rule);
      selectionRules.push({ gradeLevel, slot, ...rule });
    }
    pathways.push({
      gradeLevel, code: sourceCatalog?.primaryPathwayCode ?? 'PRIMARY_PROGRAM',
      name: sourceCatalog?.primaryPathwayName ?? 'Primary Programme', pathwayType: 'pathway',
      displayOrder: 1, selectionGroups: groups
    });
  }
  return {
    bySubjectCode, pathways,
    summary: {
      source: sourceCatalog ? 'normalized+source-catalog' : 'normalized',
      gradeSubjects: dataset.gradeSubjects.map(entry => {
        const classification = bySubjectCode.get(entry.subjectCode).classification;
        return {
          gradeLevel: entry.gradeLevel, subjectCode: entry.subjectCode, kind: classification.kind,
          slot: classification.slot, optional: classification.optional,
          isCompulsory: classification.kind === 'core_slot' && classification.optional !== true
        };
      }),
      selectionRules
    }
  };
}

export function validateInputs(configInput, dataset, sourcePages = null, validationReport = null, sourceCatalog = null) {
  const config = structuredClone(configInput ?? {});
  const scope = config.scope ?? {};
  scope.countryCode = cleanString(scope.countryCode, 'config.scope.countryCode').toUpperCase();
  scope.curriculumCode = cleanString(scope.curriculumCode, 'config.scope.curriculumCode').toUpperCase();
  scope.revision = String(scope.revision ?? '').trim();
  if (!scope.revision) throw new Error('config.scope.revision is required.');
  if (!Array.isArray(scope.grades) || scope.grades.length === 0) {
    throw new Error('config.scope.grades must explicitly list every grade in this import.');
  }
  scope.grades = sortedUnique(scope.grades.map(value => cleanString(value, 'config.scope.grades[]')));
  const allowedGrades = new Set(config.allowedGrades ?? DEFAULT_ALLOWED_GRADES);
  const disallowed = scope.grades.filter(grade => !allowedGrades.has(grade));
  if (disallowed.length) throw new Error(`Grade scope is outside the allowed Grades 4-12 range: ${disallowed.join(', ')}.`);

  if (!dataset || typeof dataset !== 'object') throw new Error('Dataset must be a JSON object.');
  const datasetRevision = dataset.curriculumRevision ?? dataset.revision ?? null;
  if (datasetRevision === null && config.allowMissingDatasetRevision !== true) {
    throw new Error('Dataset curriculum revision is missing; set allowMissingDatasetRevision only when the explicit scope is independently validated.');
  }
  if (dataset.countryCode !== scope.countryCode || dataset.curriculumCode !== scope.curriculumCode || (datasetRevision !== null && String(datasetRevision) !== scope.revision)) {
    throw new Error('Dataset country, curriculum, and revision must exactly match config.scope.');
  }
  if (!Array.isArray(dataset.gradeSubjects) || dataset.gradeSubjects.length === 0) {
    throw new Error('Dataset must contain at least one gradeSubjects entry.');
  }
  const datasetGrades = sortedUnique(dataset.gradeSubjects.map(entry => cleanString(entry.gradeLevel, 'gradeSubjects[].gradeLevel')));
  if (canonicalJson(datasetGrades) !== canonicalJson(scope.grades)) {
    throw new Error(`Dataset grades (${datasetGrades.join(', ')}) do not exactly match explicit scope (${scope.grades.join(', ')}).`);
  }

  const cellKeys = new Set();
  for (const [cellIndex, entry] of dataset.gradeSubjects.entries()) {
    const prefix = `gradeSubjects[${cellIndex}]`;
    cleanString(entry.subjectCode, `${prefix}.subjectCode`);
    cleanString(entry.subjectName, `${prefix}.subjectName`);
    const numericGrade = gradeNumber(entry.gradeLevel);
    if (numericGrade === null || (entry.grade !== undefined && entry.grade !== numericGrade)) {
      throw new Error(`${prefix}.grade must agree with ${entry.gradeLevel}.`);
    }
    const cellKey = `${entry.gradeLevel}\0${entry.subjectCode}`;
    if (cellKeys.has(cellKey)) throw new Error(`Duplicate grade-subject cell ${entry.gradeLevel}/${entry.subjectCode}.`);
    cellKeys.add(cellKey);
    const unitCodes = new Set((entry.units ?? []).map(unit => unit.code));
    const strandCodes = new Set();
    for (const [strandIndex, strand] of (entry.strands ?? []).entries()) {
      cleanString(strand.code, `${prefix}.strands[${strandIndex}].code`);
      cleanString(strand.title, `${prefix}.strands[${strandIndex}].title`);
      if (strandCodes.has(strand.code)) throw new Error(`${prefix} has duplicate strand code ${strand.code}.`);
      strandCodes.add(strand.code);
      if (strand.unitCode && !unitCodes.has(strand.unitCode)) throw new Error(`${prefix} strand ${strand.code} refers to unknown unit ${strand.unitCode}.`);
      const subCodes = new Set();
      for (const [subIndex, subStrand] of (strand.subStrands ?? []).entries()) {
        cleanString(subStrand.code, `${prefix}.strands[${strandIndex}].subStrands[${subIndex}].code`);
        cleanString(subStrand.title, `${prefix}.strands[${strandIndex}].subStrands[${subIndex}].title`);
        const internalIdentity = subStrand.sourceVariance?.alternateInternalIdentity ?? subStrand.code;
        if (subCodes.has(internalIdentity)) throw new Error(`${prefix} strand ${strand.code} has duplicate sub-strand identity ${internalIdentity}.`);
        subCodes.add(internalIdentity);
      }
    }
  }
  for (const [pathwayIndex, pathway] of (dataset.pathways ?? []).entries()) {
    const prefix = `pathways[${pathwayIndex}]`;
    cleanString(pathway.gradeLevel, `${prefix}.gradeLevel`);
    cleanString(pathway.code, `${prefix}.code`);
    cleanString(pathway.name, `${prefix}.name`);
    if (!scope.grades.includes(pathway.gradeLevel)) throw new Error(`${prefix} is outside the explicit grade scope.`);
    for (const [groupIndex, group] of (pathway.selectionGroups ?? []).entries()) {
      cleanString(group.code, `${prefix}.selectionGroups[${groupIndex}].code`);
      cleanString(group.name, `${prefix}.selectionGroups[${groupIndex}].name`);
      if (!Number.isInteger(group.maxSelections) || group.maxSelections <= 0) throw new Error(`${prefix} selection group maxSelections must be a positive integer.`);
      if ((group.minSelections ?? 0) > group.maxSelections) throw new Error(`${prefix} selection group minSelections cannot exceed maxSelections.`);
    }
  }

  if (sourcePages !== null) {
    if (!Array.isArray(sourcePages.sourceDocuments)) throw new Error('sourcePages.sourceDocuments must be an array.');
    const documentIds = new Set();
    for (const document of sourcePages.sourceDocuments) {
      const fileId = cleanString(document.fileId, 'sourcePages.sourceDocuments[].fileId');
      if (documentIds.has(fileId)) throw new Error(`Duplicate source document ${fileId}.`);
      documentIds.add(fileId);
      const pageNumbers = new Set();
      for (const page of document.pages ?? []) {
        asInteger(page.pageNumber, `${fileId}.pages[].pageNumber`);
        if (pageNumbers.has(page.pageNumber)) throw new Error(`${fileId} has duplicate page ${page.pageNumber}.`);
        pageNumbers.add(page.pageNumber);
        if (page.textSha256 && sha256(page.text ?? '') !== page.textSha256) throw new Error(`${fileId} page ${page.pageNumber} checksum mismatch.`);
      }
    }
    for (const entry of dataset.gradeSubjects) {
      if (entry.sourceDocumentId && !documentIds.has(entry.sourceDocumentId)) throw new Error(`${entry.gradeLevel}/${entry.subjectCode} has an unknown sourceDocumentId.`);
    }
  }
  const allDocuments = sourcePages?.sourceDocuments ?? [];
  const aggregateCounts = corpusCounts(dataset.gradeSubjects, allDocuments);
  if (config.requireValidationReport && validationReport === null) throw new Error('A validation report is required for this import.');
  if (validationReport !== null) {
    if (validationReport.status !== 'valid' || validationReport.errorCount !== 0) throw new Error('Validation report must be valid with zero errors.');
    const reportDatasetLogicalDigest = validationDatasetLogicalDigest(validationReport);
    if (dataset.logicalDigestSha256 && reportDatasetLogicalDigest !== dataset.logicalDigestSha256) {
      throw new Error('Validation report does not bind the current normalized corpus logical digest.');
    }
    if (validationReport.counts) assertCounts('validationReport.counts', validationReport.counts, aggregateCounts);
  }
  for (const grade of scope.grades) {
    const expected = config.expectedCountsByGrade?.[grade];
    if (!expected && config.requireExpectedCounts) throw new Error(`config.expectedCountsByGrade.${grade} is required.`);
    if (!expected) continue;
    const entries = dataset.gradeSubjects.filter(entry => entry.gradeLevel === grade);
    const documents = scope.grades.length === 1 ? allDocuments : allDocuments.filter(document => {
      const number = gradeNumber(grade);
      return [document.gradeLevel, document.gradeLocalLevel, document.localLevel].includes(grade)
        || document.gradeCode === `G${number}`;
    });
    assertCounts(`config.expectedCountsByGrade.${grade}`, expected, corpusCounts(entries, documents), true);
  }
  if (sourceCatalog !== null) {
    const catalogCountry = sourceCatalog.country?.iso3 ?? sourceCatalog.scope?.countryCode ?? sourceCatalog.authority?.country ?? scope.countryCode;
    const catalogCurriculum = sourceCatalog.curriculum?.code ?? sourceCatalog.scope?.curriculum ?? scope.curriculumCode;
    const catalogGrade = sourceCatalog.grade ?? sourceCatalog.scope?.grade;
    if (catalogCountry !== scope.countryCode || catalogCurriculum !== scope.curriculumCode) {
      throw new Error('Source catalog country and curriculum must match the explicit scope.');
    }
    if (!scope.grades.includes(`Grade ${catalogGrade}`)) throw new Error('Source catalog grade is outside the explicit scope.');
  }

  config.scope = scope;
  config.release = { stageInactive: true, activate: false, ...(config.release ?? {}) };
  if (config.release.activate) throw new Error('This importer stages releases only; activation must use the separately authorized release workflow.');
  return config;
}

function logicalRow(type, id, fields) {
  return { type, id, ...fields };
}

function semanticItemMetadata(item, releaseMetadata, extra = {}) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return { ...releaseMetadata, ...extra };
  return {
    ...releaseMetadata,
    ...extra,
    provenance: item.provenance ? structuredClone(item.provenance) : null,
    sourceSegments: item.sourceSegments ? structuredClone(item.sourceSegments) : [],
    sourceTextSha256: item.sourceTextSha256 ?? null,
    itemEvidenceId: item.provenance?.itemEvidenceId ?? item.itemEvidenceId ?? null,
    rawSourceText: item.rawSourceText ?? null,
    reviewedOverlapJustification: reviewedOverlapJustification(item)
  };
}

function segmentIdentity(segment) {
  return {
    pageNumber: segment.pageNumber,
    startOffset: segment.startOffset,
    endOffset: segment.endOffset,
    pageTextSha256: segment.pageTextSha256 ?? null,
    textSha256: segment.textSha256 ?? null
  };
}

function sourceIdentity(value, documentId) {
  const span = value?.sourceSpan ?? {};
  const segments = (span.segments ?? value?.sourceSegments ?? []).map(segmentIdentity);
  const sourcePages = span.physicalPages ?? value?.sourcePages
    ?? [...new Set(segments.map(segment => segment.pageNumber))];
  const pageTextHashes = span.pageTextHashes ?? span.pageHashes
    ?? [...new Map(segments.filter(segment => segment.pageTextSha256).map(segment => [
      segment.pageNumber, { pageNumber: segment.pageNumber, textSha256: segment.pageTextSha256 }
    ])).values()];
  const identity = {
    documentId: value?.provenance?.documentId ?? span.documentId ?? documentId ?? null,
    sourceSpanId: value?.provenance?.sourceSpanId ?? span.id ?? null,
    sourcePages: [...sourcePages],
    pageTextHashes: structuredClone(pageTextHashes),
    segments,
    sourceTextSha256: value?.sourceTextSha256 ?? span.rawTextSha256 ?? span.textSha256 ?? null
  };
  return { ...identity, identitySha256: sha256(identity) };
}

function strandSourceIdentity(strand, documentId) {
  const leaves = (strand.subStrands ?? []).map(leaf => sourceIdentity(leaf, documentId));
  const identity = {
    documentId: documentId ?? null,
    sourceSpanIds: leaves.map(leaf => leaf.sourceSpanId).filter(Boolean),
    sourcePages: [...new Set(leaves.flatMap(leaf => leaf.sourcePages))].sort((a, b) => a - b),
    pageTextHashes: [...new Map(leaves.flatMap(leaf => leaf.pageTextHashes)
      .map(page => [page.pageNumber, page])).values()].sort((a, b) => a.pageNumber - b.pageNumber),
    segments: leaves.flatMap(leaf => leaf.segments)
  };
  return { ...identity, identitySha256: sha256(identity) };
}

function grade12SemanticItemMetadata(item, inventory, field, position, documentId, releaseMetadata, extra = {}) {
  const evidenceId = item?.provenance?.itemEvidenceId;
  const record = (Array.isArray(inventory) ? inventory : [])
    .find(candidate => candidate?.field === field && candidate?.position === position);
  if (!item || !SHA256_PATTERN.test(String(evidenceId ?? ''))
      || item.provenance?.documentId !== documentId
      || item.provenance?.evidence !== 'exact-item-source-segments'
      || !SHA256_PATTERN.test(String(item.provenance?.sourceSpanId ?? ''))
      || !Array.isArray(item.sourceSegments) || item.sourceSegments.length === 0
      || !SHA256_PATTERN.test(String(item.sourceTextSha256 ?? ''))
      || typeof item.rawSourceText !== 'string' || item.rawSourceText.length === 0
      || record?.id !== evidenceId || record?.field !== field || record?.position !== position
      || record?.sourceTextSha256 !== item.sourceTextSha256
      || canonicalJson(record?.sourceSegments) !== canonicalJson(item.sourceSegments)) {
    throw new Error(`Grade 12 ${field}[${position - 1}] is missing exact canonical item provenance.`);
  }
  return semanticItemMetadata(item, releaseMetadata, extra);
}

export function buildImportPlan(configInput, dataset, sourcePages = null, validationReport = null, sourceCatalog = null) {
  const config = validateInputs(configInput, dataset, sourcePages, validationReport, sourceCatalog);
  const sourceTaxonomy = buildSourceTaxonomy(dataset, sourceCatalog, config);
  const validationContent = config.scope.grades.includes('Grade 12') && validationReport !== null
    ? {
        status: validationReport.status,
        errorCount: validationReport.errorCount,
        logicalDigest: validationDatasetLogicalDigest(validationReport),
      }
    : validationReport;
  const contentEnvelope = {
    importerVersion: IMPORTER_VERSION,
    scope: config.scope,
    subjects: config.subjects ?? {},
    importPolicy: {
      requireExpectedCounts: config.requireExpectedCounts ?? false,
      expectedCountsByGrade: config.expectedCountsByGrade ?? {},
      requireNormalizedTaxonomy: config.requireNormalizedTaxonomy ?? false
    },
    dataset,
    sourcePages,
    validationReport: validationContent,
    sourceCatalog
  };
  const contentDigest = sha256(contentEnvelope);
  const runKey = `${config.scope.countryCode}:${config.scope.curriculumCode}:${config.scope.revision}:${sha256(contentEnvelope)}`;
  const namespace = `kitabu:curriculum:${runKey}`;
  const dimensionNamespace = `kitabu:curriculum-dimension:${config.scope.countryCode}:${config.scope.curriculumCode}`;
  const releaseId = deterministicUuid(namespace, 'release');
  const frameworkVersionId = deterministicUuid(namespace, 'framework-version');
  const runId = deterministicUuid(namespace, 'ingestion-run');
  const releaseMetadata = { releaseId, runKey, contentDigest, releaseStatus: 'staged', active: false };
  const rows = Object.fromEntries(LOGICAL_TABLE_ORDER.map(name => [name, []]));
  const country = config.scope.countryCode;
  const curriculum = config.scope.curriculumCode;
  const revision = config.scope.revision;
  const sourcePublisher = dataset.publisher ?? 'Kenya Institute of Curriculum Development';
  const sourceTitle = dataset.sourceTitle ?? `${curriculum} ${revision} ${config.scope.grades.join(', ')}`;
  const sourceId = deterministicUuid(`kitabu:curriculum-source:${country}`, `${sourcePublisher}\0${sourceTitle}`);
  const frameworkId = deterministicUuid(dimensionNamespace, 'framework');

  rows.sources.push(logicalRow('source', sourceId, {
    countryCode: country,
    publisher: sourcePublisher,
    title: sourceTitle,
    year: Number(revision.slice(0, 4)) || null,
    url: dataset.officialListingUrl ?? null,
    notes: dataset.sourceNotes ?? ''
  }));
  rows.frameworks.push(logicalRow('framework', frameworkId, {
    countryCode: country, code: curriculum, name: dataset.curriculumName ?? curriculum,
    publisher: dataset.publisher ?? '', status: 'draft', sourceId,
    notes: canonicalJson(releaseMetadata)
  }));
  rows.ingestionRuns.push(logicalRow('ingestionRun', runId, {
    runType: 'official_kicd_corpus', dataVersion: IMPORTER_VERSION,
    summary: { releaseId, grades: config.scope.grades, stagedInactive: true },
    countryCode: country, curriculumCode: curriculum, runKey, releaseId, contentSha256: contentDigest
  }));

  const gradeIds = new Map();
  for (const grade of config.scope.grades) {
    const number = gradeNumber(grade);
    const id = deterministicUuid(dimensionNamespace, `grade:${grade}`);
    gradeIds.set(grade, id);
    rows.grades.push(logicalRow('grade', id, {
      frameworkId, gradeCode: `G${number}`, localName: grade,
      canonicalStage: number <= 6 ? 'Primary' : number <= 9 ? 'Junior Secondary' : 'Senior Secondary',
      sequence: number, sourceId, notes: canonicalJson(releaseMetadata)
    }));
  }

  const subjectIds = new Map();
  for (const entry of [...dataset.gradeSubjects].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))) {
    if (subjectIds.has(entry.subjectCode)) continue;
    const details = subjectConfig(config, entry, sourceTaxonomy.bySubjectCode.get(entry.subjectCode));
    const id = deterministicUuid(`kitabu:curriculum-subject:${country}`, entry.subjectCode);
    subjectIds.set(entry.subjectCode, id);
    rows.subjects.push(logicalRow('subject', id, {
      countryCode: country, subjectCode: entry.subjectCode, subjectName: details.name,
      learningArea: entry.learningArea ?? '', languageCode: details.languageCode, sourceId,
      notes: canonicalJson(releaseMetadata)
    }));
  }

  const documentIds = new Map();
  for (const document of sourcePages?.sourceDocuments ?? []) {
    const id = deterministicUuid(namespace, `document:${document.fileId}`);
    documentIds.set(document.fileId, id);
    rows.sourceDocuments.push(logicalRow('sourceDocument', id, {
      countryCode: country, curriculumCode: curriculum,
      gradeLocalLevel: document.gradeLocalLevel ?? config.scope.grades.join(', '),
      subject: document.subject ?? document.slug ?? document.fileId,
      officialTitle: document.title ?? document.officialTitle ?? document.fileId,
      publisher: document.publisher ?? dataset.publisher ?? 'Kenya Institute of Curriculum Development',
      editionYear: document.editionYear ?? (Number(revision.slice(0, 4)) || null),
      sourceUrl: document.sourceUrl ?? null,
      checksum: document.captureSha256 ?? document.sha256 ?? document.fileSha256 ?? null,
      objectKey: document.objectKey ?? null, extractionStatus: 'completed', reviewStatus: 'approved',
      lastProcessedPage: document.pageCount ?? document.capturedPageCount ?? (document.pages ?? []).length,
      gradeCode: document.gradeCode ?? null, localLevel: document.localLevel ?? null,
      metadata: { ...releaseMetadata, fileId: document.fileId, ...(document.metadata ?? {}) }, releaseId
    }));
    for (const page of document.pages ?? []) {
      rows.sourcePages.push(logicalRow('sourcePage', deterministicUuid(namespace, `page:${document.fileId}:${page.pageNumber}:1`), {
        sourceDocumentId: id, pageNumber: page.pageNumber, rowOrder: 1,
        detectedHeaders: page.detectedHeaders ?? [], rawText: page.text ?? '',
        extractionConfidence: page.extractionConfidence ?? null,
        parserName: sourcePages.parserName ?? dataset.extractionVersion ?? 'kitabu-curriculum-importer',
        parserVersion: sourcePages.parserVersion ?? String(IMPORTER_VERSION), status: 'extracted',
        metadata: { ...releaseMetadata, textSha256: page.textSha256 ?? sha256(page.text ?? '') },
        normalizedPayload: page.normalizedPayload ?? {}
      }));
    }
  }

  const gradeSubjectIds = new Map();
  const nextDisplayOrder = new Map();
  const configuredDisplayOrders = new Map();
  for (const entry of dataset.gradeSubjects) {
    const order = (nextDisplayOrder.get(entry.gradeLevel) ?? 0) + 1;
    nextDisplayOrder.set(entry.gradeLevel, order);
    configuredDisplayOrders.set(`${entry.gradeLevel}\0${entry.subjectCode}`, entry.displayOrder ?? entry.position ?? order);
  }
  for (const entry of [...dataset.gradeSubjects].sort((a, b) => `${a.gradeLevel}\0${a.subjectCode}`.localeCompare(`${b.gradeLevel}\0${b.subjectCode}`))) {
    const details = subjectConfig(config, entry, sourceTaxonomy.bySubjectCode.get(entry.subjectCode));
    const gradeSubjectId = deterministicUuid(namespace, `grade-subject:${entry.gradeLevel}:${entry.subjectCode}`);
    gradeSubjectIds.set(`${entry.gradeLevel}\0${entry.subjectCode}`, gradeSubjectId);
    const sourceDocumentId = documentIds.get(entry.sourceDocumentId) ?? null;
    rows.gradeSubjects.push(logicalRow('gradeSubject', gradeSubjectId, {
      frameworkId, gradeId: gradeIds.get(entry.gradeLevel), subjectId: subjectIds.get(entry.subjectCode),
      isCompulsory: details.isCompulsory,
      displayOrder: configuredDisplayOrders.get(`${entry.gradeLevel}\0${entry.subjectCode}`),
      sourceId, releaseId
    }));
    const themeIds = new Map();
    for (const [index, unit] of (entry.units ?? []).entries()) {
      const id = deterministicUuid(namespace, `unit:${entry.gradeLevel}:${entry.subjectCode}:theme:${unit.code}`);
      themeIds.set(unit.code, id);
      rows.units.push(logicalRow('unit', id, {
        gradeSubjectId, parentUnitId: null, localUnitType: 'theme', canonicalUnitType: 'unit',
        localCode: unit.code, title: unit.title || unit.code, description: unit.description ?? null,
        sequence: unit.position ?? index + 1, suggestedPeriods: unit.suggestedPeriods ?? null,
        contentType: 'knowledge', officialStatus: 'official', sourceId,
        metadata: { ...releaseMetadata, official: true, sourceDocumentId }, releaseId
      }));
    }
    for (const [strandIndex, strand] of (entry.strands ?? []).entries()) {
      const strandId = deterministicUuid(namespace, `unit:${entry.gradeLevel}:${entry.subjectCode}:strand:${strand.code}`);
      const legacyStrandId = deterministicUuid(namespace, `legacy-strand:${entry.gradeLevel}:${details.legacyId}:${strand.code}`);
      const metadata = {
        ...releaseMetadata, official: true, sourceDocumentId,
        sourceIdentity: strandSourceIdentity(strand, entry.sourceDocumentId),
        normalizationNotes: strand.normalizationNotes ?? []
      };
      rows.units.push(logicalRow('unit', strandId, {
        gradeSubjectId, parentUnitId: strand.unitCode ? themeIds.get(strand.unitCode) : null,
        localUnitType: 'strand', canonicalUnitType: 'strand', localCode: strand.code,
        title: strand.title, description: strand.description ?? null, sequence: strand.position ?? strandIndex + 1,
        suggestedPeriods: null, contentType: 'knowledge', officialStatus: 'official', sourceId, metadata, releaseId
      }));
      rows.legacyStrands.push(logicalRow('legacyStrand', legacyStrandId, {
        countryCode: country, curriculumCode: curriculum, gradeLevel: entry.gradeLevel,
        subjectId: details.legacyId, subjectName: details.name, number: strand.code, title: strand.title,
        subTitle: (entry.units ?? []).find(unit => unit.code === strand.unitCode)?.title ?? '',
        position: strand.position ?? strandIndex + 1, sourceId, sourceMetadata: metadata, releaseId
      }));
      for (const [subIndex, subStrand] of (strand.subStrands ?? []).entries()) {
        const internalIdentity = subStrand.sourceVariance?.alternateInternalIdentity ?? subStrand.code;
        const subId = deterministicUuid(namespace, `unit:${entry.gradeLevel}:${entry.subjectCode}:sub-strand:${strand.code}:${internalIdentity}`);
        const legacySubId = deterministicUuid(namespace, `legacy-sub-strand:${entry.gradeLevel}:${details.legacyId}:${strand.code}:${internalIdentity}`);
        const subMetadata = {
          ...releaseMetadata, official: true, sourceDocumentId,
          sourceIdentity: sourceIdentity(subStrand, entry.sourceDocumentId),
          sourceUrl: entry.sourceUrl ?? null, sourcePages: subStrand.sourcePages ?? [],
          sourceTextSha256: subStrand.sourceTextSha256 ?? null, printedCode: subStrand.printedCode ?? null,
          normalizationNotes: subStrand.normalizationNotes ?? [], sourceVariance: subStrand.sourceVariance ?? null
        };
        rows.units.push(logicalRow('unit', subId, {
          gradeSubjectId, parentUnitId: strandId, localUnitType: 'sub-strand', canonicalUnitType: 'sub_strand',
          localCode: subStrand.code, title: subStrand.title, description: subStrand.description ?? null,
          sequence: subStrand.position ?? subIndex + 1, suggestedPeriods: subStrand.lessonCount ?? null,
          contentType: 'knowledge', officialStatus: 'official', sourceId, metadata: subMetadata, releaseId
        }));
        const itemMetadata = (item, field, position, extra = {}) => (entry.grade === 12 || entry.gradeLevel === 'Grade 12')
          ? grade12SemanticItemMetadata(
              item, subStrand.semanticItemInventory, field, position,
              entry.sourceDocumentId, releaseMetadata, extra,
            )
          : semanticItemMetadata(item, releaseMetadata, extra);
        const outcomes = (subStrand.outcomes ?? []).map((item, index) => ({
          ...logicalRow('outcome', deterministicUuid(namespace, `outcome:${subId}:${index + 1}`), {
            unitId: subId, localType: 'expected_learning_outcome', statement: item.statement ?? item,
            sequence: index + 1, officialStatus: 'official', sourceId,
            metadata: itemMetadata(item, 'outcomes', index + 1, {
              label: item?.label ?? null,
              sourceIdentity: sourceIdentity(item, entry.sourceDocumentId)
            }), releaseId
          })
        }));
        const questions = (subStrand.inquiryQuestions ?? []).map((item, index) => ({
          ...logicalRow('question', deterministicUuid(namespace, `question:${subId}:${index + 1}`), {
            unitId: subId, question: item.question ?? item, sourceType: 'official', status: 'active', sequence: index + 1,
            sourceId, metadata: itemMetadata(item, 'inquiryQuestions', index + 1, {
              sourceIdentity: sourceIdentity(item, entry.sourceDocumentId)
            }), releaseId
          })
        }));
        const activities = (subStrand.learningActivities ?? []).map((item, index) => ({
          ...logicalRow('activity', deterministicUuid(namespace, `activity:${subId}:${index + 1}`), {
            unitId: subId, activityType: 'learning_experience', activity: item.activity ?? item, sequence: index + 1,
            sourceId, metadata: itemMetadata(item, 'learningActivities', index + 1, {
              sourceIdentity: sourceIdentity(item, entry.sourceDocumentId)
            }), releaseId
          })
        }));
        rows.outcomes.push(...outcomes);
        rows.questions.push(...questions);
        rows.activities.push(...activities);
        if (sourceDocumentId && (subStrand.sourcePages ?? []).length > 0) {
          const citedPages = [...subStrand.sourcePages].sort((a, b) => a - b);
          rows.citations.push(logicalRow('citation', deterministicUuid(namespace, `citation:${subId}:${citedPages.join(',')}`), {
            releaseId, unitId: subId, sourceId, sourceDocumentId, extractionRowId: null,
            pageFrom: citedPages[0], pageTo: citedPages.at(-1), locator: `pages ${citedPages.join(', ')}`,
            excerpt: subStrand.sourceExcerpt ?? '', metadata: {
              sourcePages: citedPages,
              sourceTextSha256: subStrand.sourceTextSha256 ?? null,
              sourceIdentity: sourceIdentity(subStrand, entry.sourceDocumentId)
            }
          }));
        }
        rows.legacySubStrands.push(logicalRow('legacySubStrand', legacySubId, {
          strandId: legacyStrandId, number: subStrand.code, title: subStrand.title, type: 'knowledge',
          description: subStrand.description ?? `Official KICD ${revision} curriculum design.`,
          position: subStrand.position ?? subIndex + 1,
          outcomes: outcomes.map(row => ({ id: row.id, text: row.statement })),
          inquiryQuestions: questions.map(row => ({ id: row.id, text: row.question })),
          suggestedLessons: subStrand.lessonCount ?? null,
          learningActivities: subStrand.learningActivities ?? [], coreCompetencies: subStrand.coreCompetencies ?? [],
          curriculumValues: subStrand.values ?? [], pertinentContemporaryIssues: subStrand.pertinentContemporaryIssues ?? [],
          crossCurricularLinks: subStrand.crossCurricularLinks ?? [], sourceId, sourceMetadata: subMetadata, releaseId
        }));
      }
    }
  }

  const pathwayIds = new Map();
  const plannedPathways = (dataset.pathways ?? []).length > 0 ? dataset.pathways : sourceTaxonomy.pathways;
  for (const pathway of plannedPathways) {
    if (!gradeIds.has(pathway.gradeLevel)) throw new Error(`Pathway ${pathway.code} is outside the explicit grade scope.`);
    const id = deterministicUuid(namespace, `pathway:${pathway.gradeLevel}:${pathway.parentCode ?? 'root'}:${pathway.code}`);
    pathwayIds.set(`${pathway.gradeLevel}\0${pathway.code}`, id);
    const parentId = pathway.parentCode ? pathwayIds.get(`${pathway.gradeLevel}\0${pathway.parentCode}`) : null;
    if (pathway.parentCode && !parentId) throw new Error(`Pathway ${pathway.code} must appear after parent ${pathway.parentCode}.`);
    rows.pathways.push(logicalRow('pathway', id, {
      releaseId, frameworkId, gradeId: gradeIds.get(pathway.gradeLevel), parentPathwayId: parentId,
      pathwayType: pathway.pathwayType ?? (parentId ? 'track' : 'pathway'), code: pathway.code,
      name: pathway.name, description: pathway.description ?? '', displayOrder: pathway.displayOrder ?? 0,
      sourceId, metadata: { ...releaseMetadata, ...(pathway.metadata ?? {}) }
    }));
    for (const group of pathway.selectionGroups ?? []) {
      const groupId = deterministicUuid(namespace, `selection-group:${pathway.gradeLevel}:${pathway.code}:${group.code}`);
      rows.selectionGroups.push(logicalRow('selectionGroup', groupId, {
        releaseId, gradeId: gradeIds.get(pathway.gradeLevel), pathwayId: id, code: group.code,
        name: group.name, minSelections: group.minSelections ?? 0, maxSelections: group.maxSelections,
        displayOrder: group.displayOrder ?? 0, metadata: { ...releaseMetadata, ...(group.metadata ?? {}) }
      }));
      for (const [index, selection] of (group.subjects ?? []).entries()) {
        const item = typeof selection === 'string' ? { subjectCode: selection } : selection;
        const gradeSubjectId = gradeSubjectIds.get(`${pathway.gradeLevel}\0${item.subjectCode}`);
        if (!gradeSubjectId) throw new Error(`Selection group ${group.code} refers to unknown ${pathway.gradeLevel}/${item.subjectCode}.`);
        rows.pathwaySubjects.push(logicalRow('pathwaySubject', deterministicUuid(namespace, `pathway-subject:${groupId}:${item.subjectCode}`), {
          releaseId, gradeId: gradeIds.get(pathway.gradeLevel), pathwayId: id, selectionGroupId: groupId,
          gradeSubjectId, isRequired: item.isRequired ?? false, displayOrder: item.displayOrder ?? index + 1,
          metadata: { ...releaseMetadata, ...(item.metadata ?? {}) }
        }));
      }
    }
  }

  for (const name of LOGICAL_TABLE_ORDER) rows[name].sort((a, b) => a.id.localeCompare(b.id));
  const logicalDigest = computeLogicalDigest(rows);
  return { importerVersion: IMPORTER_VERSION, config, runKey, contentDigest, logicalDigest, releaseId, frameworkVersionId, runId, frameworkId, taxonomy: sourceTaxonomy.summary, rows };
}

function parseJsonArtifact(text, label) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('must be a JSON object');
    return value;
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function validationDatasetLogicalDigest(validationReport) {
  return validationReport.inputHashes?.strictValidationLogicalDigest
    ?? validationReport.logicalDigest
    ?? validationReport.logicalDigestSha256;
}

function verifiedImportPolicy(policy, validationReportText, validationReport) {
  if (policy.schema !== IMPORT_POLICY_SCHEMA || policy.schemaVersion !== IMPORT_POLICY_SCHEMA_VERSION) {
    throw new Error('Completed grade import policy uses an unsupported schema.');
  }
  const { policySha256, ...unsignedPolicy } = policy;
  if (!/^[0-9a-f]{64}$/.test(policySha256 ?? '') || sha256(unsignedPolicy) !== policySha256) {
    throw new Error('Completed grade import policy SHA-256 is invalid.');
  }
  const binding = policy.validationBinding ?? {};
  if (binding.reportSha256 !== sha256(validationReportText)) {
    throw new Error('Completed grade validation report bytes do not match the import policy binding.');
  }
  const reportLogicalDigest = validationReport.logicalDigest ?? validationReport.logicalDigestSha256;
  if (binding.reportLogicalDigest !== reportLogicalDigest) {
    throw new Error('Completed grade validation report logical digest does not match the import policy binding.');
  }
  if (binding.reportWarningCount !== validationReport.warningCount) {
    throw new Error('Completed grade validation report warning count does not match the import policy binding.');
  }
  const grade = policy.scope?.grade;
  const expected = policy.importerPolicy?.expectedCountsByGrade?.[grade];
  if (policy.importerPolicy?.requireExpectedCounts !== true || !expected) {
    throw new Error('Completed grade import policy must require exact per-grade counts.');
  }
  for (const field of COUNT_FIELDS) {
    if (expected[field] !== validationReport.counts?.[field]) {
      throw new Error(`Completed grade import policy count ${field} does not match the validation report.`);
    }
  }
  return { grade, expectedCounts: expected };
}

export async function loadCompletedGradePlan(gradeDirectory, options = {}) {
  const directory = path.resolve(gradeDirectory);
  const readText = options.readText ?? (filePath => readFile(filePath, 'utf8'));
  const texts = {};
  for (const [key, fileName] of Object.entries(COMPLETED_GRADE_FILES)) {
    const filePath = path.join(directory, fileName);
    try {
      texts[key] = await readText(filePath);
    } catch (error) {
      if (key === 'dataset' && error?.code === 'ENOENT' && !options.readText) {
        try {
          texts[key] = (await gunzipAsync(await readFile(`${filePath}.gz`))).toString('utf8');
          continue;
        } catch (gzipError) {
          if (gzipError?.code !== 'ENOENT') throw gzipError;
        }
      }
      if (error?.code === 'ENOENT') throw new Error(`Completed grade directory is missing ${fileName}.`);
      throw error;
    }
  }
  const dataset = parseJsonArtifact(texts.dataset, 'normalized-curriculum.json');
  const sourcePages = parseJsonArtifact(texts.sourcePages, 'source-pages.json');
  const validationReport = parseJsonArtifact(texts.validationReport, 'validation-report.json');
  const sourceCatalog = parseJsonArtifact(texts.sourceCatalog, 'source-catalog.json');
  const importPolicy = parseJsonArtifact(texts.importPolicy, 'import-policy.json');
  if (dataset.schema !== 'kitabu.curriculum.normalized-grade' || dataset.schemaVersion !== 1) {
    throw new Error('Completed grade dataset must use the normalized-grade schema version 1.');
  }
  if (validationReport.status !== 'valid' || validationReport.errorCount !== 0) {
    throw new Error('Completed grade validation report must be valid with zero errors.');
  }
  const { grade, expectedCounts } = verifiedImportPolicy(importPolicy, texts.validationReport, validationReport);
  if (!BATCH_ALLOWED_GRADES.includes(grade)) {
    throw new Error('Completed grade batch imports are restricted to explicit Grades 4-12.');
  }
  const numericGrade = gradeNumber(grade);
  if (dataset.grade !== numericGrade || dataset.gradeSubjects?.some(entry => entry.grade !== numericGrade || entry.gradeLevel !== grade)) {
    throw new Error(`Completed grade dataset does not exactly match ${grade}.`);
  }
  const reportDatasetLogicalDigest = validationDatasetLogicalDigest(validationReport);
  if (dataset.logicalDigestSha256 !== reportDatasetLogicalDigest) {
    throw new Error('Completed grade normalized and validation logical digests do not match.');
  }
  const scope = importPolicy.scope ?? {};
  if (dataset.countryCode !== scope.countryCode || dataset.curriculumCode !== scope.curriculumCode) {
    throw new Error('Completed grade normalized identity does not match the import policy scope.');
  }
  const config = {
    ...(options.config ?? {}),
    scope: {
      countryCode: scope.countryCode,
      curriculumCode: scope.curriculumCode,
      revision: scope.revision,
      grades: [grade]
    },
    allowedGrades: BATCH_ALLOWED_GRADES,
    allowMissingDatasetRevision: true,
    requireValidationReport: true,
    requireNormalizedTaxonomy: true,
    requireExpectedCounts: true,
    expectedCountsByGrade: { [grade]: structuredClone(expectedCounts) },
    release: { stageInactive: true, activate: false }
  };
  const plan = buildImportPlan(config, dataset, sourcePages, validationReport, sourceCatalog);
  return { directory, grade, plan };
}

export function summarizeDiff(plan, currentRows) {
  const current = new Map();
  for (const name of DIGEST_TABLES) for (const row of currentRows?.[name] ?? []) current.set(`${name}\0${row.id}`, canonicalJson(row));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;
  const desiredKeys = new Set();
  for (const name of DIGEST_TABLES) {
    for (const row of plan.rows[name]) {
      const key = `${name}\0${row.id}`;
      desiredKeys.add(key);
      if (!current.has(key)) inserts += 1;
      else if (current.get(key) === canonicalJson(row)) unchanged += 1;
      else updates += 1;
    }
  }
  const stalePreserved = [...current.keys()].filter(key => !desiredKeys.has(key)).length;
  return { inserts, updates, unchanged, stalePreserved, desiredDigest: plan.logicalDigest, currentDigest: computeLogicalDigest(currentRows ?? {}) };
}

async function upsert(client, sql, values) {
  await client.query(sql, values);
}

export function parentsFirst(rows, parentField) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const depths = new Map();
  const depthOf = (row, visiting = new Set()) => {
    if (depths.has(row.id)) return depths.get(row.id);
    const parentId = row[parentField];
    if (!parentId || !byId.has(parentId)) { depths.set(row.id, 0); return 0; }
    if (visiting.has(row.id)) throw new Error(`Cycle detected while ordering ${row.type} ${row.id}.`);
    const next = new Set(visiting).add(row.id);
    const depth = depthOf(byId.get(parentId), next) + 1;
    depths.set(row.id, depth);
    return depth;
  };
  return [...rows].sort((left, right) => depthOf(left) - depthOf(right) || left.id.localeCompare(right.id));
}

async function releaseOwnedTables(client) {
  const result = await client.query(`SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='release_id' AND table_name = ANY($1::text[])`, [[
    'curriculum_ingestion_runs', 'curriculum_grade_subjects', 'curriculum_source_documents',
    'curriculum_units', 'curriculum_learning_outcomes', 'curriculum_inquiry_questions',
    'curriculum_learning_activities', 'curriculum_strands', 'curriculum_sub_strands'
  ]]);
  return new Set(result.rows.map(row => row.table_name));
}

function replaceReferences(plan, field, replacements) {
  for (const rows of Object.values(plan.rows)) {
    for (const row of rows) if (replacements.has(row[field])) row[field] = replacements.get(row[field]);
  }
}

export async function prepareDimensions(client, plan, { write = true } = {}) {
  if (write) {
    await client.query(`INSERT INTO curriculum_countries (code,name,default_curriculum_code) VALUES ($1,$2,$3)
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,default_curriculum_code=EXCLUDED.default_curriculum_code,updated_at=NOW()`,
    [plan.config.scope.countryCode,plan.config.countryName ?? 'Kenya',plan.config.scope.curriculumCode]);
  }
  const source = plan.rows.sources[0];
  let sourceResult;
  if (write) {
    sourceResult = await client.query(`INSERT INTO curriculum_sources (id,country_code,publisher,title,year,url,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (country_code,publisher,title) DO UPDATE SET year=EXCLUDED.year,url=EXCLUDED.url,notes=EXCLUDED.notes,updated_at=NOW() RETURNING id`,
    [source.id,source.countryCode,source.publisher,source.title,source.year,source.url,source.notes]);
  } else sourceResult = await client.query(`SELECT id FROM curriculum_sources WHERE country_code=$1 AND publisher=$2 AND title=$3`, [source.countryCode,source.publisher,source.title]);
  if (sourceResult.rows[0] && sourceResult.rows[0].id !== source.id) {
    const oldId = source.id;
    source.id = sourceResult.rows[0].id;
    replaceReferences(plan, 'sourceId', new Map([[oldId, source.id]]));
  }

  const framework = plan.rows.frameworks[0];
  let frameworkResult = await client.query(`SELECT id FROM curriculum_frameworks WHERE country_code=$1 AND code=$2`, [framework.countryCode,framework.code]);
  if (!frameworkResult.rows[0] && write) {
    frameworkResult = await client.query(`INSERT INTO curriculum_frameworks (id,country_code,code,name,publisher,status,source_id,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (country_code,code) DO UPDATE SET name=curriculum_frameworks.name RETURNING id`,
    [framework.id,framework.countryCode,framework.code,framework.name,framework.publisher,framework.status,framework.sourceId,framework.notes]);
  }
  if (frameworkResult.rows[0] && frameworkResult.rows[0].id !== framework.id) {
    const oldId = framework.id;
    framework.id = frameworkResult.rows[0].id;
    plan.frameworkId = framework.id;
    replaceReferences(plan, 'frameworkId', new Map([[oldId, framework.id]]));
  }

  const gradeReplacements = new Map();
  for (const grade of plan.rows.grades) {
    let result = await client.query(`SELECT id FROM curriculum_grades WHERE framework_id=$1 AND grade_code=$2`, [framework.id,grade.gradeCode]);
    if (!result.rows[0] && write) {
      result = await client.query(`INSERT INTO curriculum_grades (id,framework_id,grade_code,local_name,canonical_stage,sequence,source_id,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (framework_id,grade_code) DO UPDATE SET local_name=curriculum_grades.local_name RETURNING id`,
      [grade.id,framework.id,grade.gradeCode,grade.localName,grade.canonicalStage,grade.sequence,grade.sourceId,grade.notes]);
    }
    grade.frameworkId = framework.id;
    if (result.rows[0] && result.rows[0].id !== grade.id) { gradeReplacements.set(grade.id, result.rows[0].id); grade.id = result.rows[0].id; }
  }
  replaceReferences(plan, 'gradeId', gradeReplacements);

  const subjectReplacements = new Map();
  for (const subject of plan.rows.subjects) {
    let result = await client.query(`SELECT id FROM curriculum_subject_catalog WHERE country_code=$1 AND subject_code=$2`, [subject.countryCode,subject.subjectCode]);
    if (!result.rows[0] && write) {
      result = await client.query(`INSERT INTO curriculum_subject_catalog (id,country_code,subject_code,subject_name,learning_area,language_code,source_id,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (country_code,subject_code) DO UPDATE SET subject_name=curriculum_subject_catalog.subject_name RETURNING id`,
      [subject.id,subject.countryCode,subject.subjectCode,subject.subjectName,subject.learningArea,subject.languageCode,subject.sourceId,subject.notes]);
    }
    if (result.rows[0] && result.rows[0].id !== subject.id) { subjectReplacements.set(subject.id, result.rows[0].id); subject.id = result.rows[0].id; }
  }
  replaceReferences(plan, 'subjectId', subjectReplacements);
  plan.logicalDigest = computeLogicalDigest(plan.rows);
  return plan;
}

export async function writePlan(client, plan) {
  const { rows } = plan;
  const releaseTables = await releaseOwnedTables(client);
  const requiredReleaseTables = [
    'curriculum_ingestion_runs', 'curriculum_grade_subjects', 'curriculum_source_documents',
    'curriculum_units', 'curriculum_learning_outcomes', 'curriculum_inquiry_questions',
    'curriculum_learning_activities', 'curriculum_strands', 'curriculum_sub_strands'
  ];
  const missingReleaseTables = requiredReleaseTables.filter(table => !releaseTables.has(table));
  if (missingReleaseTables.length) throw new Error(`Release schema migration is required before importing: missing release_id on ${missingReleaseTables.join(', ')}.`);
  for (const row of rows.ingestionRuns) await upsert(client, `INSERT INTO curriculum_ingestion_runs (id,run_type,status,data_version,summary,country_code,curriculum_code,run_key,release_id,content_sha256)
    VALUES ($1,$2,'running',$3,$4::jsonb,$5,$6,$7,$8,$9)
    ON CONFLICT (id) DO UPDATE SET status='running',summary=EXCLUDED.summary,error_message='',completed_at=NULL,updated_at=NOW()`,
  [row.id,row.runType,row.dataVersion,canonicalJson(row.summary),row.countryCode,row.curriculumCode,row.runKey,row.releaseId,row.contentSha256]);
  for (const row of rows.gradeSubjects) await upsert(client, `INSERT INTO curriculum_grade_subjects (id,framework_id,grade_id,subject_id,is_compulsory,display_order,source_id,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.frameworkId,row.gradeId,row.subjectId,row.isCompulsory,row.displayOrder,row.sourceId,plan.releaseId]);
  for (const row of rows.sourceDocuments) await upsert(client, `INSERT INTO curriculum_source_documents (id,country_code,curriculum_code,grade_local_level,subject,official_title,publisher,edition_year,source_url,downloaded_file_checksum,object_key,extraction_status,review_status,last_processed_page,metadata,grade_code,local_level,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.countryCode,row.curriculumCode,row.gradeLocalLevel,row.subject,row.officialTitle,row.publisher,row.editionYear,row.sourceUrl,row.checksum,row.objectKey,row.extractionStatus,row.reviewStatus,row.lastProcessedPage,canonicalJson(row.metadata),row.gradeCode,row.localLevel,plan.releaseId]);
  for (const row of rows.sourcePages) await upsert(client, `INSERT INTO curriculum_extraction_rows (id,source_document_id,page_number,row_order,detected_headers,raw_text,extraction_confidence,parser_name,parser_version,status,metadata,normalized_payload) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.sourceDocumentId,row.pageNumber,row.rowOrder,canonicalJson(row.detectedHeaders),row.rawText,row.extractionConfidence,row.parserName,row.parserVersion,row.status,canonicalJson(row.metadata),canonicalJson(row.normalizedPayload)]);
  for (const row of parentsFirst(rows.units, 'parentUnitId')) await upsert(client, `INSERT INTO curriculum_units (id,grade_subject_id,parent_unit_id,local_unit_type,canonical_unit_type,local_code,title,description,sequence,suggested_periods,content_type,official_status,source_id,metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.gradeSubjectId,row.parentUnitId,row.localUnitType,row.canonicalUnitType,row.localCode,row.title,row.description,row.sequence,row.suggestedPeriods,row.contentType,row.officialStatus,row.sourceId,canonicalJson(row.metadata),plan.releaseId]);
  for (const row of rows.outcomes) await upsert(client, `INSERT INTO curriculum_learning_outcomes (id,unit_id,local_type,statement,sequence,official_status,source_id,metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.unitId,row.localType,row.statement,row.sequence,row.officialStatus,row.sourceId,canonicalJson(row.metadata),row.releaseId]);
  for (const row of rows.questions) await upsert(client, `INSERT INTO curriculum_inquiry_questions (id,unit_id,question,source_type,status,sequence,source_id,metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.unitId,row.question,row.sourceType,row.status,row.sequence,row.sourceId,canonicalJson(row.metadata),row.releaseId]);
  for (const row of rows.activities) await upsert(client, `INSERT INTO curriculum_learning_activities (id,unit_id,activity_type,activity,sequence,source_id,metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.unitId,row.activityType,row.activity,row.sequence,row.sourceId,canonicalJson(row.metadata),row.releaseId]);
  for (const row of rows.legacyStrands) await upsert(client, `INSERT INTO curriculum_strands (id,country_code,curriculum_code,grade_level,subject_id,subject_name,number,title,sub_title,position,source_id,source_metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.countryCode,row.curriculumCode,row.gradeLevel,row.subjectId,row.subjectName,row.number,row.title,row.subTitle,row.position,row.sourceId,canonicalJson(row.sourceMetadata),plan.releaseId]);
  for (const row of rows.legacySubStrands) await upsert(client, `INSERT INTO curriculum_sub_strands (id,strand_id,number,title,type,description,position,outcomes,inquiry_questions,suggested_lessons,learning_activities,core_competencies,curriculum_values,pertinent_contemporary_issues,cross_curricular_links,source_id,source_metadata,release_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17::jsonb,$18)
    ON CONFLICT (id) DO NOTHING`,
  [row.id,row.strandId,row.number,row.title,row.type,row.description,row.position,canonicalJson(row.outcomes),canonicalJson(row.inquiryQuestions),row.suggestedLessons,canonicalJson(row.learningActivities),canonicalJson(row.coreCompetencies),canonicalJson(row.curriculumValues),canonicalJson(row.pertinentContemporaryIssues),canonicalJson(row.crossCurricularLinks),row.sourceId,canonicalJson(row.sourceMetadata),plan.releaseId]);
  for (const row of parentsFirst(rows.pathways, 'parentPathwayId')) await upsert(client, `INSERT INTO curriculum_pathways (id,release_id,framework_id,grade_id,parent_pathway_id,pathway_type,code,name,description,display_order,source_id,metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) ON CONFLICT (id) DO NOTHING`,
  [row.id,row.releaseId,row.frameworkId,row.gradeId,row.parentPathwayId,row.pathwayType,row.code,row.name,row.description,row.displayOrder,row.sourceId,canonicalJson(row.metadata)]);
  for (const row of rows.selectionGroups) await upsert(client, `INSERT INTO curriculum_selection_groups (id,release_id,grade_id,pathway_id,code,name,min_selections,max_selections,display_order,metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT (id) DO NOTHING`,
  [row.id,row.releaseId,row.gradeId,row.pathwayId,row.code,row.name,row.minSelections,row.maxSelections,row.displayOrder,canonicalJson(row.metadata)]);
  for (const row of rows.pathwaySubjects) await upsert(client, `INSERT INTO curriculum_pathway_subjects (id,release_id,grade_id,pathway_id,selection_group_id,grade_subject_id,is_required,display_order,metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT (id) DO NOTHING`,
  [row.id,row.releaseId,row.gradeId,row.pathwayId,row.selectionGroupId,row.gradeSubjectId,row.isRequired,row.displayOrder,canonicalJson(row.metadata)]);
  for (const row of rows.citations) await upsert(client, `INSERT INTO curriculum_unit_citations (id,release_id,unit_id,source_id,source_document_id,extraction_row_id,page_from,page_to,locator,excerpt,metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT (id) DO NOTHING`,
  [row.id,row.releaseId,row.unitId,row.sourceId,row.sourceDocumentId,row.extractionRowId,row.pageFrom,row.pageTo,row.locator,row.excerpt,canonicalJson(row.metadata)]);
}

const READ_SPECS = {
  sources: ['curriculum_sources', 'id,country_code AS "countryCode",publisher,title,year,url,notes'],
  frameworks: ['curriculum_frameworks', 'id,country_code AS "countryCode",code,name,publisher,status,source_id AS "sourceId",notes'],
  ingestionRuns: ['curriculum_ingestion_runs', 'id,run_type AS "runType",data_version AS "dataVersion",summary,country_code AS "countryCode",curriculum_code AS "curriculumCode",run_key AS "runKey",release_id AS "releaseId",content_sha256 AS "contentSha256"'],
  grades: ['curriculum_grades', 'id,framework_id AS "frameworkId",grade_code AS "gradeCode",local_name AS "localName",canonical_stage AS "canonicalStage",sequence,source_id AS "sourceId",notes'],
  subjects: ['curriculum_subject_catalog', 'id,country_code AS "countryCode",subject_code AS "subjectCode",subject_name AS "subjectName",learning_area AS "learningArea",language_code AS "languageCode",source_id AS "sourceId",notes'],
  gradeSubjects: ['curriculum_grade_subjects', 'id,framework_id AS "frameworkId",grade_id AS "gradeId",subject_id AS "subjectId",is_compulsory AS "isCompulsory",display_order AS "displayOrder",source_id AS "sourceId",release_id AS "releaseId"'],
  sourceDocuments: ['curriculum_source_documents', 'id,country_code AS "countryCode",curriculum_code AS "curriculumCode",grade_local_level AS "gradeLocalLevel",subject,official_title AS "officialTitle",publisher,edition_year AS "editionYear",source_url AS "sourceUrl",downloaded_file_checksum AS checksum,object_key AS "objectKey",extraction_status AS "extractionStatus",review_status AS "reviewStatus",last_processed_page AS "lastProcessedPage",metadata,grade_code AS "gradeCode",local_level AS "localLevel",release_id AS "releaseId"'],
  sourcePages: ['curriculum_extraction_rows', 'id,source_document_id AS "sourceDocumentId",page_number AS "pageNumber",row_order AS "rowOrder",detected_headers AS "detectedHeaders",raw_text AS "rawText",extraction_confidence::float8 AS "extractionConfidence",parser_name AS "parserName",parser_version AS "parserVersion",status,metadata,normalized_payload AS "normalizedPayload"'],
  units: ['curriculum_units', 'id,grade_subject_id AS "gradeSubjectId",parent_unit_id AS "parentUnitId",local_unit_type AS "localUnitType",canonical_unit_type AS "canonicalUnitType",local_code AS "localCode",title,description,sequence,suggested_periods AS "suggestedPeriods",content_type AS "contentType",official_status AS "officialStatus",source_id AS "sourceId",metadata,release_id AS "releaseId"'],
  outcomes: ['curriculum_learning_outcomes', 'id,unit_id AS "unitId",local_type AS "localType",statement,sequence,official_status AS "officialStatus",source_id AS "sourceId",metadata,release_id AS "releaseId"'],
  questions: ['curriculum_inquiry_questions', 'id,unit_id AS "unitId",question,source_type AS "sourceType",status,sequence,source_id AS "sourceId",metadata,release_id AS "releaseId"'],
  activities: ['curriculum_learning_activities', 'id,unit_id AS "unitId",activity_type AS "activityType",activity,sequence,source_id AS "sourceId",metadata,release_id AS "releaseId"'],
  legacyStrands: ['curriculum_strands', 'id,country_code AS "countryCode",curriculum_code AS "curriculumCode",grade_level AS "gradeLevel",subject_id AS "subjectId",subject_name AS "subjectName",number,title,sub_title AS "subTitle",position,source_id AS "sourceId",source_metadata AS "sourceMetadata",release_id AS "releaseId"'],
  legacySubStrands: ['curriculum_sub_strands', 'id,strand_id AS "strandId",number,title,type,description,position,outcomes,inquiry_questions AS "inquiryQuestions",suggested_lessons AS "suggestedLessons",learning_activities AS "learningActivities",core_competencies AS "coreCompetencies",curriculum_values AS "curriculumValues",pertinent_contemporary_issues AS "pertinentContemporaryIssues",cross_curricular_links AS "crossCurricularLinks",source_id AS "sourceId",source_metadata AS "sourceMetadata",release_id AS "releaseId"'],
  pathways: ['curriculum_pathways', 'id,release_id AS "releaseId",framework_id AS "frameworkId",grade_id AS "gradeId",parent_pathway_id AS "parentPathwayId",pathway_type AS "pathwayType",code,name,description,display_order AS "displayOrder",source_id AS "sourceId",metadata'],
  selectionGroups: ['curriculum_selection_groups', 'id,release_id AS "releaseId",grade_id AS "gradeId",pathway_id AS "pathwayId",code,name,min_selections AS "minSelections",max_selections AS "maxSelections",display_order AS "displayOrder",metadata'],
  pathwaySubjects: ['curriculum_pathway_subjects', 'id,release_id AS "releaseId",grade_id AS "gradeId",pathway_id AS "pathwayId",selection_group_id AS "selectionGroupId",grade_subject_id AS "gradeSubjectId",is_required AS "isRequired",display_order AS "displayOrder",metadata'],
  citations: ['curriculum_unit_citations', 'id,release_id AS "releaseId",unit_id AS "unitId",source_id AS "sourceId",source_document_id AS "sourceDocumentId",extraction_row_id AS "extractionRowId",page_from AS "pageFrom",page_to AS "pageTo",locator,excerpt,metadata']
};

export async function readPlanRows(client, plan) {
  const result = {};
  for (const name of LOGICAL_TABLE_ORDER) {
    const ids = plan.rows[name].map(row => row.id);
    if (ids.length === 0) { result[name] = []; continue; }
    const [table, columns] = READ_SPECS[name];
    const query = await client.query(`SELECT ${columns} FROM ${table} WHERE id = ANY($1::uuid[]) ORDER BY id`, [ids]);
    result[name] = query.rows.map(row => ({ type: plan.rows[name][0]?.type, ...row }));
  }
  return result;
}

export function createDefaultReleaseHooks() {
  return {
    async stage(client, plan) {
      const exists = await client.query(`SELECT
        to_regclass('public.curriculum_framework_versions') IS NOT NULL AS versions_present,
        to_regclass('public.curriculum_releases') IS NOT NULL AS releases_present`);
      if (!exists.rows[0]?.versions_present || !exists.rows[0]?.releases_present) {
        throw new Error('Curriculum release schema migration is required before importing.');
      }
      const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_releases'`);
      const available = new Set(columns.rows.map(row => row.column_name));
      const required = ['id', 'framework_version_id', 'framework_id', 'release_key', 'content_sha256', 'metadata'];
      if (!required.every(column => available.has(column))) throw new Error('curriculum_releases exists but is incompatible with importer staging hooks.');
      const metadata = canonicalJson({
        active: false, state: 'inactive', gradeScope: plan.config.scope.grades,
        contentDigest: plan.contentDigest, logicalDigest: plan.logicalDigest, importerVersion: plan.importerVersion
      });
      const versionCode = `${plan.config.scope.revision}:${plan.config.scope.grades.map(grade => `G${gradeNumber(grade)}`).join('-')}:${plan.contentDigest.slice(0, 12)}`;
      await client.query(`INSERT INTO curriculum_framework_versions (id,framework_id,version_code,title,source_id,content_sha256,metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (id) DO NOTHING`,
      [plan.frameworkVersionId,plan.frameworkId,versionCode,
        `${plan.config.scope.curriculumCode} ${plan.config.scope.revision} ${plan.config.scope.grades.join(', ')}`,
        plan.rows.sources[0].id,plan.contentDigest,metadata]);
      await client.query(`INSERT INTO curriculum_releases (id,framework_version_id,framework_id,release_key,content_sha256,notes,metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (id) DO NOTHING`,
      [plan.releaseId,plan.frameworkVersionId,plan.frameworkId,plan.runKey,plan.contentDigest,
        'Inactive KICD corpus release staged by the safe importer.',metadata]);
      return { releaseId: plan.releaseId, persisted: true, active: false };
    },
    async finalize(client, plan) {
      await client.query(`UPDATE curriculum_ingestion_runs SET status='completed',completed_at=NOW(),updated_at=NOW()
        WHERE id=$1 AND release_id=$2 AND content_sha256=$3`, [plan.runId,plan.releaseId,plan.contentDigest]);
    }
  };
}

export async function runCurriculumImport(options) {
  const { client, plan, dryRun = false, logger = console } = options;
  const releaseHooks = options.releaseHooks ?? createDefaultReleaseHooks();
  const write = options.writePlan ?? writePlan;
  const read = options.readPlanRows ?? readPlanRows;
  const prepare = options.preparePlan ?? prepareDimensions;
  let began = false;
  try {
    await client.query('BEGIN');
    began = true;
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`kitabu:curriculum:${plan.config.scope.countryCode}:${plan.config.scope.curriculumCode}:${plan.config.scope.grades.join(',')}`]);
    await prepare(client, plan, { write: !dryRun });
    const before = await read(client, plan);
    const diff = summarizeDiff(plan, before);
    if (dryRun) {
      await client.query('ROLLBACK');
      began = false;
      logger.info?.(canonicalJson({ dryRun: true, runKey: plan.runKey, logicalDigest: plan.logicalDigest, diff }));
      return { dryRun: true, runKey: plan.runKey, logicalDigest: plan.logicalDigest, diff };
    }
    const release = await releaseHooks.stage(client, plan);
    await write(client, plan);
    const imported = await read(client, plan);
    const actualDigest = computeLogicalDigest(imported);
    if (actualDigest !== plan.logicalDigest) {
      throw new Error(`Post-import logical digest mismatch: expected ${plan.logicalDigest}, got ${actualDigest}.`);
    }
    await releaseHooks.finalize(client, plan, release);
    await client.query('COMMIT');
    began = false;
    return { dryRun: false, runKey: plan.runKey, releaseId: plan.releaseId, logicalDigest: actualDigest, diff };
  } catch (error) {
    if (began) await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

export async function runGradeImportBatch(options) {
  const { client, plans, dryRun = false, logger = console } = options;
  if (!Array.isArray(plans) || plans.length === 0) throw new Error('Grade import batch requires at least one plan.');
  const scoped = plans.map(plan => {
    const grades = plan?.config?.scope?.grades ?? [];
    if (grades.length !== 1 || !BATCH_ALLOWED_GRADES.includes(grades[0])) {
      throw new Error('Every grade import batch plan must contain exactly one Grade 4-12 scope.');
    }
    return { grade: grades[0], plan };
  });
  if (new Set(scoped.map(item => item.grade)).size !== scoped.length) {
    throw new Error('Grade import batch contains a duplicate grade scope.');
  }
  scoped.sort((left, right) => gradeNumber(left.grade) - gradeNumber(right.grade));
  const importPlan = options.importPlan ?? runCurriculumImport;
  const results = [];
  for (const item of scoped) {
    const result = await importPlan({
      client,
      plan: item.plan,
      dryRun,
      logger,
      releaseHooks: options.releaseHooks,
      preparePlan: options.preparePlan,
      readPlanRows: options.readPlanRows,
      writePlan: options.writePlan
    });
    results.push({ grade: item.grade, ...result });
  }
  return { dryRun, grades: results };
}

export function parseArgs(argv) {
  const result = { dryRun: false, validateOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--validate-only') result.validateOnly = true;
    else if (arg === '--grade-dir') {
      const value = argv[++index];
      if (!value) throw new Error('--grade-dir requires a path.');
      (result.gradeDirs ??= []).push(value);
    }
    else if (['--config', '--dataset', '--source-pages', '--validation-report', '--source-catalog', '--release-hooks'].includes(arg)) {
      const key = { '--config': 'configPath', '--dataset': 'datasetPath', '--source-pages': 'sourcePagesPath', '--validation-report': 'validationReportPath', '--source-catalog': 'sourceCatalogPath', '--release-hooks': 'releaseHooksPath' }[arg];
      result[key] = argv[++index];
      if (!result[key]) throw new Error(`${arg} requires a path.`);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!result.configPath && !result.gradeDirs?.length) throw new Error('--config or --grade-dir is required.');
  if (result.configPath && result.gradeDirs?.length) throw new Error('--config and --grade-dir cannot be combined.');
  if (result.gradeDirs?.length && [result.datasetPath, result.sourcePagesPath, result.validationReportPath, result.sourceCatalogPath, result.releaseHooksPath].some(Boolean)) {
    throw new Error('--grade-dir cannot be combined with config-mode artifact or hook options.');
  }
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const args = parseArgs(argv);
  if (args.gradeDirs?.length) {
    const loaded = [];
    for (const directory of args.gradeDirs) loaded.push(await loadCompletedGradePlan(directory, dependencies));
    if (new Set(loaded.map(item => item.grade)).size !== loaded.length) throw new Error('Grade import batch contains a duplicate grade directory scope.');
    if (args.validateOnly) return {
      validated: true,
      grades: loaded.sort((left, right) => gradeNumber(left.grade) - gradeNumber(right.grade)).map(item => ({
        grade: item.grade,
        runKey: item.plan.runKey,
        releaseId: item.plan.releaseId,
        logicalDigest: item.plan.logicalDigest
      }))
    };
    const databaseUrl = await resolveDatabaseUrl(dependencies);
    const { pool, client } = await connectDatabase(databaseUrl, dependencies);
    try {
      return await runGradeImportBatch({
        client,
        plans: loaded.map(item => item.plan),
        dryRun: args.dryRun,
        logger: dependencies.logger ?? console
      });
    } finally {
      client.release();
      if (!dependencies.pool) await pool.end();
    }
  }
  const configPath = path.resolve(process.cwd(), args.configPath);
  const config = await readJson(configPath);
  const resolveFromConfig = value => value ? path.resolve(path.dirname(configPath), value) : null;
  const datasetPath = args.datasetPath ? path.resolve(process.cwd(), args.datasetPath) : resolveFromConfig(config.datasetPath);
  if (!datasetPath) throw new Error('A dataset path is required through --dataset or config.datasetPath.');
  const sourcePagesPath = args.sourcePagesPath ? path.resolve(process.cwd(), args.sourcePagesPath) : resolveFromConfig(config.sourcePagesPath);
  const validationReportPath = args.validationReportPath ? path.resolve(process.cwd(), args.validationReportPath) : resolveFromConfig(config.validationReportPath);
  const sourceCatalogPath = args.sourceCatalogPath ? path.resolve(process.cwd(), args.sourceCatalogPath) : resolveFromConfig(config.sourceCatalogPath);
  const plan = buildImportPlan(
    { ...config, requireValidationReport: true },
    await readJson(datasetPath),
    sourcePagesPath ? await readJson(sourcePagesPath) : null,
    validationReportPath ? await readJson(validationReportPath) : null,
    sourceCatalogPath ? await readJson(sourceCatalogPath) : null
  );
  if (args.validateOnly) return { validated: true, runKey: plan.runKey, logicalDigest: plan.logicalDigest };

  const databaseUrl = await resolveDatabaseUrl(dependencies);
  const { pool, client } = await connectDatabase(databaseUrl, dependencies);
  try {
    let releaseHooks;
    const hooksPath = args.releaseHooksPath ?? config.releaseHooksPath;
    if (hooksPath) {
      const modulePath = args.releaseHooksPath ? path.resolve(process.cwd(), hooksPath) : resolveFromConfig(hooksPath);
      const hookModule = await import(pathToFileURL(modulePath));
      releaseHooks = await hookModule.createReleaseHooks?.({ config, plan }) ?? hookModule.default;
      if (!releaseHooks?.stage || !releaseHooks?.finalize) throw new Error('Release hooks module must export stage and finalize hooks.');
    }
    return await runCurriculumImport({ client, plan, dryRun: args.dryRun, releaseHooks, logger: dependencies.logger ?? console });
  } finally {
    client.release();
    if (!dependencies.pool) await pool.end();
  }
}

async function resolveDatabaseUrl(dependencies) {
  if (!dependencies.databaseUrl && !process.env.KITABU_DATABASE_URL) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.resolve(API_DIR, '.env') });
  }
  const databaseUrl = dependencies.databaseUrl ?? process.env.KITABU_DATABASE_URL;
  if (!databaseUrl) throw new Error('KITABU_DATABASE_URL is required for imports and database dry-runs.');
  return databaseUrl;
}

async function connectDatabase(databaseUrl, dependencies) {
  const pgModule = dependencies.pg ?? await import('pg');
  const Pool = pgModule.default?.Pool ?? pgModule.Pool;
  const pool = dependencies.pool ?? new Pool({ connectionString: databaseUrl, ssl: databaseSslOptions(databaseUrl) });
  return { pool, client: await pool.connect() };
}

export function databaseSslOptions(databaseUrl) {
  const mode = process.env.KITABU_DATABASE_SSL_MODE?.trim() || 'auto';
  if (mode === 'disable') return undefined;
  if (mode === 'require') return { rejectUnauthorized: false };
  try {
    if (['localhost', '127.0.0.1', 'postgres'].includes(new URL(databaseUrl).hostname)) return undefined;
  } catch {}
  return { rejectUnauthorized: false };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().then(result => console.log(canonicalJson(result))).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
