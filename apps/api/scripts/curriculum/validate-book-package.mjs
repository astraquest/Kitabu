#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const DEFAULT_BOOK_ROOT = path.join(REPO_ROOT, 'apps', 'api', 'data', 'books');

const PUBLICATION_STATUSES = new Set([
  'ready-for-cover',
  'library-ready',
  'published',
  'published-library',
  'published-for-testing',
  'phase1-testing-published'
]);

const SUBJECT_CONTAMINATION_RULES = [
  {
    subject: /^agriculture$/i,
    label: 'Agriculture textile/home-economics contamination',
    pattern: /\b(laundry|launder|loose[-\s]*colou?red|stains?\s+(?:on|from)\s+clothing|disinfect(?:ing|ion)?\s+(?:clothing|household articles?)|garments?|gaping seam|stitches?|crochet(?:ing)?|knit(?:ting)?|textiles?|fabric|yarn|household articles?)\b/i
  }
];

const LANGUAGE_SUBJECT_PATTERN = /^(english|kiswahili)$/i;
const LANGUAGE_SCAFFOLD_PATTERNS = [
  /\bLearning area\b/i,
  /\bCurriculum link\b/i,
  /\bStart here\b/i,
  /\bBefore reading\b/i,
  /\bBy the end\b/i,
  /\bEneo la kujifunza\b/i,
  /\bKiungo cha mtaala\b/i,
  /\bAnzia hapa\b/i,
  /\bKabla ya kusoma\b/i
];
const LANGUAGE_RAW_TITLE_PATTERNS = [
  /\bStrand\s+\d+\b/i,
  /\bWriting\s+\d+(?:\.\d+)+\b/i,
  /\bGrammar in uses\b/i,
  /\bWakati\s+Wakati\b/i,
  /\b[a-z]{12,}\s+kwa\s+[a-z]{12,}\b/i
];
const KISWAHILI_TITLECASE_PATTERN = /\b(?:Wa|Ya|Za|Na|Kwa|Katika|Hiki|Huu|Haya)\b/;

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : 'true';
    args[key] = value;
  }
  return args;
}

async function resolveInputPath(inputPath) {
  const resolvedFromCwd = path.resolve(inputPath);
  if (await fileStat(resolvedFromCwd)) return resolvedFromCwd;
  if (!path.isAbsolute(inputPath)) {
    const resolvedFromRepo = path.resolve(REPO_ROOT, inputPath);
    if (await fileStat(resolvedFromRepo)) return resolvedFromRepo;
  }
  return resolvedFromCwd;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

async function readJson(filePath, errors) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(REPO_ROOT, filePath)}: ${error.message}`);
    return null;
  }
}

async function fileStat(filePath) {
  return fs.stat(filePath).catch(() => null);
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function isVisiblePackage(manifest, forceVisibleGate) {
  if (forceVisibleGate) return true;
  return [manifest?.status, manifest?.contentStatus, manifest?.publicationStatus]
    .map(normalizeStatus)
    .some(status => PUBLICATION_STATUSES.has(status));
}

function pageText(page) {
  return [
    page?.title,
    page?.content,
    page?.body,
    page?.summary,
    Array.isArray(page?.sourceRefs) ? JSON.stringify(page.sourceRefs) : ''
  ].filter(Boolean).join('\n');
}

function collectStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function openingKey(page) {
  const content = String(page?.content || page?.body || '').replace(/\s+/g, ' ').trim();
  if (wordCount(content) < 30) return null;
  return content.slice(0, 220).toLowerCase();
}

async function validateCoverMetadata(packageDir, manifest, errors, warnings, visibleGate) {
  const coverImage = manifest?.coverImage;
  const coverAssets = Array.isArray(manifest?.assets)
    ? manifest.assets.filter(asset => asset && typeof asset === 'object' && (asset.kind === 'cover' || asset.path === coverImage?.path))
    : [];

  if (!visibleGate && !coverImage?.path) {
    warnings.push('manifest.json has no coverImage path; draft package will not show a generated cover.');
    return;
  }

  if (!coverImage?.path) {
    errors.push('Publication gate failed: manifest.json missing coverImage.path.');
    return;
  }
  for (const field of ['mimeType', 'sizeBytes', 'sha256']) {
    if (coverImage[field] == null || coverImage[field] === '') {
      errors.push(`Publication gate failed: manifest.coverImage missing ${field}.`);
    }
  }
  if (String(coverImage.mimeType || '') !== 'image/png') {
    errors.push(`Publication gate failed: manifest.coverImage.mimeType must be image/png, got ${coverImage.mimeType || 'missing'}.`);
  }
  if (coverImage.path.includes('..') || path.isAbsolute(coverImage.path)) {
    errors.push('Publication gate failed: manifest.coverImage.path must be a relative path inside the package.');
    return;
  }

  const coverPath = path.resolve(packageDir, coverImage.path);
  if (!coverPath.startsWith(path.resolve(packageDir) + path.sep)) {
    errors.push('Publication gate failed: manifest.coverImage.path escapes the package directory.');
    return;
  }

  const stat = await fileStat(coverPath);
  if (!stat?.isFile()) {
    errors.push(`Publication gate failed: cover file missing at ${coverImage.path}.`);
    return;
  }
  if (Number(coverImage.sizeBytes) !== stat.size) {
    errors.push(`Publication gate failed: cover sizeBytes ${coverImage.sizeBytes} does not match file size ${stat.size}.`);
  }
  if (coverImage.sha256 && coverImage.sha256 !== await sha256File(coverPath)) {
    errors.push('Publication gate failed: manifest.coverImage.sha256 does not match the cover file.');
  }
  if (!coverAssets.length) {
    errors.push('Publication gate failed: manifest.assets must include a cover asset matching coverImage.path.');
    return;
  }
  const matchingAsset = coverAssets.find(asset => asset.path === coverImage.path);
  if (!matchingAsset) {
    errors.push('Publication gate failed: manifest.assets cover entry does not match coverImage.path.');
    return;
  }
  for (const field of ['mimeType', 'sizeBytes', 'sha256']) {
    if (matchingAsset[field] !== coverImage[field]) {
      errors.push(`Publication gate failed: cover asset ${field} does not match manifest.coverImage.${field}.`);
    }
  }
}

function validateAppSafeCoverFields(packageDir, entries, manifest, errors, warnings, visibleGate) {
  const appSafeFiles = entries.filter(name => name.endsWith('.pages.json') && name !== 'pages.json');
  if (!appSafeFiles.length) {
    warnings.push('No app-safe *.pages.json bundle found; API can still use pages.json, but offline package validation is weaker.');
    return [];
  }
  return appSafeFiles.map(async fileName => {
    const filePath = path.join(packageDir, fileName);
    const payloadErrors = [];
    const payload = await readJson(filePath, payloadErrors);
    errors.push(...payloadErrors);
    if (!payload || Array.isArray(payload)) return;
    if (!visibleGate) return;

    if (!payload.coverImage?.path) {
      errors.push(`Publication gate failed: ${fileName} missing app-safe coverImage.path.`);
    }
    if (!Array.isArray(payload.assets) || !payload.assets.some(asset => asset?.kind === 'cover' && asset.path === manifest.coverImage?.path)) {
      errors.push(`Publication gate failed: ${fileName} missing app-safe cover asset metadata.`);
    }
    if (payload.coverImage?.path && payload.coverImage.path !== manifest.coverImage?.path) {
      errors.push(`Publication gate failed: ${fileName} coverImage.path does not match manifest.json.`);
    }
  });
}

function validateSourceContamination(manifest, pages, bookPlan, sourceMap, markdownText, errors) {
  const subject = String(manifest?.subject || '').trim();
  const rules = SUBJECT_CONTAMINATION_RULES.filter(rule => rule.subject.test(subject));
  if (!rules.length) return;

  const searchItems = [
    ['manifest', collectStrings(manifest).join('\n')],
    ['book-plan', collectStrings(bookPlan).join('\n')],
    ['source-map', collectStrings(sourceMap).join('\n')],
    ['markdown', markdownText],
    ...pages.map((page, index) => [`page ${index + 1}`, pageText(page)])
  ];

  for (const rule of rules) {
    const hits = [];
    for (const [location, text] of searchItems) {
      const match = String(text || '').match(rule.pattern);
      if (match) hits.push(`${location}: "${match[0]}"`);
      if (hits.length >= 8) break;
    }
    if (hits.length) {
      errors.push(`Source contamination gate failed for ${subject}: ${rule.label}. Hits: ${hits.join('; ')}`);
    }
  }
}

function validateRepeatedOpenings(pages, errors, warnings, publicationGate) {
  const counts = new Map();
  pages.forEach((page, index) => {
    const key = openingKey(page);
    if (!key) return;
    const entry = counts.get(key) || { count: 0, pages: [] };
    entry.count += 1;
    entry.pages.push(index + 1);
    counts.set(key, entry);
  });

  const repeated = [...counts.values()].filter(entry => entry.count > 2);
  if (!repeated.length) return;
  const message = `Detected repeated content openings: ${repeated.slice(0, 5).map(entry => `pages ${entry.pages.slice(0, 6).join(', ')}`).join('; ')}${repeated.length > 5 ? '...' : ''}`;
  if (publicationGate) {
    errors.push(`Publication gate failed: ${message}`);
  } else {
    warnings.push(message);
  }
}

function pushGateMessage(errors, warnings, publicationGate, message) {
  if (publicationGate) {
    errors.push(`Publication gate failed: ${message}`);
  } else {
    warnings.push(message);
  }
}

function validateLanguageArtifacts(manifest, pages, bookPlan, errors, warnings, publicationGate) {
  const subject = String(manifest?.subject || '').trim();
  if (!LANGUAGE_SUBJECT_PATTERN.test(subject)) return;

  const pageTitles = pages
    .map((page, index) => ({ index: index + 1, title: String(page?.title || '').trim() }))
    .filter(page => page.title);
  const longRawTitles = pageTitles.filter(page => (
    page.title.length > 96 ||
    (page.title.match(/:/g) || []).length >= 2 ||
    LANGUAGE_RAW_TITLE_PATTERNS.some(pattern => pattern.test(page.title))
  ));
  if (longRawTitles.length) {
    pushGateMessage(
      errors,
      warnings,
      publicationGate,
      `Language title gate found raw or overlong page titles: ${longRawTitles.slice(0, 5).map(page => `page ${page.index} "${page.title.slice(0, 90)}"`).join('; ')}`
    );
  }

  const bookPlanText = collectStrings(bookPlan).join('\n');
  const allText = [bookPlanText, ...pages.map(page => pageText(page))].join('\n');
  const scaffoldHits = LANGUAGE_SCAFFOLD_PATTERNS
    .map(pattern => ({ pattern, count: (allText.match(new RegExp(pattern.source, `${pattern.flags.includes('i') ? 'i' : ''}g`)) || []).length }))
    .filter(hit => hit.count > 0);
  const totalScaffoldHits = scaffoldHits.reduce((sum, hit) => sum + hit.count, 0);
  if (totalScaffoldHits > 12) {
    pushGateMessage(
      errors,
      warnings,
      publicationGate,
      `Language scaffold gate found ${totalScaffoldHits} learner-facing metadata labels (${scaffoldHits.slice(0, 5).map(hit => `${hit.pattern.source}: ${hit.count}`).join(', ')}).`
    );
  }

  const rawTocHits = LANGUAGE_RAW_TITLE_PATTERNS
    .map(pattern => allText.match(pattern)?.[0])
    .filter(Boolean);
  if (rawTocHits.length) {
    pushGateMessage(
      errors,
      warnings,
      publicationGate,
      `Language artifact gate found raw curriculum display text: ${[...new Set(rawTocHits)].slice(0, 6).join(', ')}.`
    );
  }

  if (/^kiswahili$/i.test(subject)) {
    const casingHits = pageTitles
      .filter(page => KISWAHILI_TITLECASE_PATTERN.test(page.title))
      .slice(0, 8);
    if (casingHits.length > 4) {
      pushGateMessage(
        errors,
        warnings,
        publicationGate,
        `Kiswahili heading gate found English-style function-word casing: ${casingHits.map(page => `page ${page.index} "${page.title}"`).join('; ')}`
      );
    }
  }
}

async function validatePackage(packageDir, options = {}) {
  const errors = [];
  const warnings = [];
  const entries = await fs.readdir(packageDir).catch(() => null);
  if (!entries) {
    return { dir: packageDir, ok: false, errors: [`Directory not found: ${packageDir}`], warnings };
  }

  const manifestPath = path.join(packageDir, 'manifest.json');
  const pagesPath = path.join(packageDir, 'pages.json');
  const bookPlanPath = path.join(packageDir, 'book-plan.json');
  const sourceMapPath = path.join(packageDir, 'source-map.json');
  const markdownPath = entries.includes('book.md')
    ? path.join(packageDir, 'book.md')
    : path.join(packageDir, entries.find(name => name.endsWith('.md')) || 'book.md');

  const manifest = await readJson(manifestPath, errors);
  const pagesPayload = await readJson(pagesPath, errors);
  const bookPlan = entries.includes('book-plan.json') ? await readJson(bookPlanPath, errors) : null;
  const sourceMap = entries.includes('source-map.json') ? await readJson(sourceMapPath, errors) : null;
  const markdownText = await fs.readFile(markdownPath, 'utf8').catch(() => '');
  const pages = Array.isArray(pagesPayload) ? pagesPayload : pagesPayload?.pages;
  const visibleGate = isVisiblePackage(manifest, false);
  const publicationGate = Boolean(options.publicationGate);

  if (!manifest) errors.push('Missing or invalid manifest.json.');
  if (!Array.isArray(pages)) errors.push('pages.json must be an array or an object with a pages array.');
  if (!bookPlan) warnings.push('Missing book-plan.json; source-contamination checks have weaker planning context.');
  if (!sourceMap) errors.push('Missing source-map.json.');
  if (!markdownText) warnings.push('Missing markdown manuscript; source-contamination checks have weaker text coverage.');

  if (manifest && Array.isArray(pages)) {
    if (Number.isFinite(manifest.pageCount) && manifest.pageCount !== pages.length) {
      errors.push(`manifest.pageCount ${manifest.pageCount} does not match pages.json length ${pages.length}.`);
    }
    await validateCoverMetadata(packageDir, manifest, errors, warnings, visibleGate || publicationGate);
    await Promise.all(validateAppSafeCoverFields(packageDir, entries, manifest, errors, warnings, visibleGate || publicationGate));
    validateSourceContamination(manifest, pages, bookPlan, sourceMap, markdownText, errors);
    validateRepeatedOpenings(pages, errors, warnings, publicationGate);
    validateLanguageArtifacts(manifest, pages, bookPlan, errors, warnings, publicationGate);
  }

  return {
    dir: path.relative(REPO_ROOT, packageDir) || packageDir,
    ok: errors.length === 0,
    visibleGate,
    publicationGate,
    errors,
    warnings
  };
}

async function collectPackageDirs(root) {
  const dirs = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    if (entries.some(entry => entry.isFile() && entry.name === 'manifest.json')) {
      dirs.push(dir);
      return;
    }
    await Promise.all(entries.filter(entry => entry.isDirectory()).map(entry => walk(path.join(dir, entry.name))));
  }
  await walk(root);
  return dirs.sort();
}

async function main() {
  const args = parseArgs(process.argv);
  const publicationGate = args.publicationGate === 'true';
  const dirs = args.dir
    ? [await resolveInputPath(args.dir)]
    : await collectPackageDirs(args.root ? await resolveInputPath(args.root) : DEFAULT_BOOK_ROOT);

  const reports = [];
  for (const dir of dirs) {
    reports.push(await validatePackage(dir, { publicationGate }));
  }

  const summary = {
    ok: reports.every(report => report.ok),
    checked: reports.length,
    failed: reports.filter(report => !report.ok).length,
    reports
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
