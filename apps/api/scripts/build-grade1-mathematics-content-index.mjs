#!/usr/bin/env node

/**
 * Builds the Grade 1 Mathematics mission manifest from independently authored
 * outcome files. This is intentionally dependency-free so it can be run in CI
 * and by content authors without a database connection.
 *
 * Usage:
 *   node scripts/build-grade1-mathematics-content-index.mjs [--check]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(scriptDirectory, '../data/learning-content/KEN/CBC/G1/mathematics');
const outcomesRoot = path.join(contentRoot, 'outcomes');
const outputPath = path.join(contentRoot, 'index.json');
const expectedPhases = ['warm-up', 'model', 'guided-practice', 'independent-practice', 'transfer', 'exit-check'];
const legacySubStrandSegments = new Map([
  ['1.1-pre-number-activities', '1.1'],
  ['1.2-whole-numbers', '1.2'],
  ['2.3-capacity', '2.3'],
  ['2.5-money', '2.5'],
]);

async function jsonFiles(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
  }));
  return files.flat();
}

function fail(file, message) {
  throw new Error(`${path.relative(contentRoot, file)}: ${message}`);
}

export function validateMission(file, document) {
  if (!document || typeof document !== 'object') fail(file, 'must contain a JSON object');
  const { curriculum, mission } = document;
  if (!curriculum || !mission) fail(file, 'must contain curriculum and mission');
  for (const key of ['country', 'curriculum', 'grade', 'subject', 'strand', 'subStrand', 'outcomeText']) {
    if (typeof curriculum[key] !== 'string' || !curriculum[key].trim()) fail(file, `curriculum.${key} is required`);
  }
  if (mission.title !== curriculum.outcomeText) {
    fail(file, 'mission.title must exactly match curriculum.outcomeText; presentation aliases require explicit approval');
  }
  if (!Array.isArray(mission.interactions) || mission.interactions.length !== expectedPhases.length) {
    fail(file, 'must contain exactly six interactions');
  }
  mission.interactions.forEach((interaction, index) => {
    if (!interaction || typeof interaction !== 'object') fail(file, `interaction ${index + 1} must be an object`);
    const phase = interaction.phase ?? interaction.stage;
    if (phase !== expectedPhases[index]) {
      fail(file, `interaction ${index + 1} must use phase ${expectedPhases[index]}`);
    }
    for (const key of ['mode', 'feedback', 'retryHint']) {
      if (typeof interaction[key] !== 'string' || !interaction[key].trim()) {
        fail(file, `interaction ${index + 1} requires ${key}`);
      }
    }
    if (!Object.hasOwn(interaction, 'answer')) fail(file, `interaction ${index + 1} requires deterministic answer data`);
  });
}

function missionEntry(file, document) {
  const relativePath = path.relative(contentRoot, file).split(path.sep).join('/');
  return {
    id: document.id ?? relativePath.replace(/^outcomes\//, '').replace(/\.json$/, ''),
    path: relativePath,
    title: document.mission.title,
    curriculum: document.curriculum,
    interactionCount: document.mission.interactions.length,
  };
}

export function canonicalIndexPath(relativePath) {
  return relativePath
    .split('/')
    .map(segment => legacySubStrandSegments.get(segment) ?? segment)
    .join('/');
}

export async function buildContentIndex(root = contentRoot) {
  const files = (await jsonFiles(path.join(root, 'outcomes'))).sort((a, b) => a.localeCompare(b));
  const missions = [];
  const seenOutcomes = new Set();
  for (const file of files) {
    let document;
    try {
      document = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      throw new Error(`${path.relative(root, file)}: invalid JSON (${error.message})`);
    }
    try {
      validateMission(file, document);
    } catch (error) {
      throw new Error(error.message.replace(path.relative(contentRoot, file), path.relative(root, file)));
    }
    const uniqueOutcome = `${document.curriculum.strand}\u0000${document.curriculum.subStrand}\u0000${document.curriculum.outcomeText}`;
    if (seenOutcomes.has(uniqueOutcome)) fail(file, 'duplicates an existing curriculum outcome');
    seenOutcomes.add(uniqueOutcome);
    const sourcePath = path.relative(root, file).split(path.sep).join('/');
    missions.push({
      ...missionEntry(file, document),
      path: canonicalIndexPath(sourcePath),
      sourcePath: sourcePath === canonicalIndexPath(sourcePath) ? undefined : sourcePath,
    });
  }

  missions.sort((left, right) =>
    left.curriculum.strand.localeCompare(right.curriculum.strand, undefined, { numeric: true }) ||
    left.curriculum.subStrand.localeCompare(right.curriculum.subStrand, undefined, { numeric: true }) ||
    left.curriculum.outcomePosition - right.curriculum.outcomePosition ||
    left.id.localeCompare(right.id),
  );

  const index = {
    generatedAt: new Date().toISOString(),
    curriculum: { country: 'KEN', curriculum: 'CBC', grade: 'Grade 1', subject: 'Mathematical Activities' },
    missionCount: missions.length,
    interactionCount: missions.reduce((total, mission) => total + mission.interactionCount, 0),
    missions,
  };
  return index;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = await buildContentIndex();
  if (process.argv.includes('--check')) {
    const existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    const comparable = value => JSON.stringify({ ...value, generatedAt: undefined });
    if (comparable(existing) !== comparable(index)) throw new Error('index.json is stale; run the builder');
    console.log(`Grade 1 Mathematics content index is current (${index.missionCount} missions).`);
  } else {
    await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`);
    console.log(`Built ${path.relative(contentRoot, outputPath)} with ${index.missionCount} missions.`);
  }
}
