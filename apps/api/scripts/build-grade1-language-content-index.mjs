#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const gradeRoot = path.resolve(scriptDirectory, '../data/learning-content/KEN/CBC/G1');
const curriculumPath = path.resolve(scriptDirectory, '../data/curriculum/KEN/CBC/kicd-2024-grade-1-3/normalized-curriculum.json');
const phases = ['warm-up', 'model', 'guided-practice', 'independent-practice', 'transfer', 'exit-check'];
const subjects = {
  english: { name: 'English Language Activities', curriculumId: 'english_language_activities' },
  kiswahili: { name: 'Kiswahili Language Activities', curriculumId: 'kiswahili_language_activities' },
};

async function jsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return (await Promise.all(entries.map(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? jsonFiles(fullPath) : entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
  }))).flat();
}

function assert(condition, file, message) {
  if (!condition) throw new Error(`${file}: ${message}`);
}

function curriculumCode(value) {
  return String(value ?? '').match(/^\d+(?:\.\d+)*/)?.[0] ?? '';
}

function curriculumTitle(value) {
  return String(value ?? '').replace(/^\d+(?:\.\d+)*\s+/, '').trim();
}

function compareCodes(left, right) {
  const a = curriculumCode(left).split('.').map(Number);
  const b = curriculumCode(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function validateMission(relativePath, document, subject) {
  assert(document && typeof document === 'object', relativePath, 'must contain a JSON object');
  const { curriculum, mission } = document;
  assert(curriculum && mission, relativePath, 'must contain curriculum and mission');
  for (const key of ['country', 'curriculum', 'revision', 'grade', 'subject', 'strand', 'subStrand', 'outcomeId', 'outcomeText']) {
    assert(typeof curriculum[key] === 'string' && curriculum[key].trim(), relativePath, `curriculum.${key} is required`);
  }
  assert(curriculum.country === 'KEN' && curriculum.curriculum === 'CBC' && curriculum.grade === 'Grade 1', relativePath, 'has the wrong curriculum scope');
  assert(curriculum.subject === subject.name, relativePath, `curriculum.subject must be ${subject.name}`);
  assert(Number.isInteger(curriculum.outcomePosition) && curriculum.outcomePosition > 0, relativePath, 'curriculum.outcomePosition is required');
  assert(typeof mission.title === 'string' && mission.title.trim(), relativePath, 'mission.title is required');
  assert(Array.isArray(mission.interactions) && mission.interactions.length === phases.length, relativePath, 'must contain exactly six interactions');
  mission.interactions.forEach((interaction, index) => {
    assert(interaction && typeof interaction === 'object', relativePath, `interaction ${index + 1} must be an object`);
    assert((interaction.phase ?? interaction.stage) === phases[index], relativePath, `interaction ${index + 1} must use phase ${phases[index]}`);
    for (const key of ['mode', 'prompt', 'feedback', 'retryHint']) {
      assert(typeof interaction[key] === 'string' && interaction[key].trim(), relativePath, `interaction ${index + 1} requires ${key}`);
    }
    assert(Object.hasOwn(interaction, 'answer'), relativePath, `interaction ${index + 1} requires deterministic answer data`);
  });
}

async function expectedOutcomes(subject) {
  const curriculum = JSON.parse(await fs.readFile(curriculumPath, 'utf8'));
  const gradeSubject = curriculum.gradeSubjects.find(candidate =>
    candidate.grade === 1 && candidate.subjectCode === subject.curriculumId,
  );
  if (!gradeSubject) throw new Error(`Canonical Grade 1 subject is missing: ${subject.curriculumId}`);
  return new Map(gradeSubject.strands.flatMap(strand => strand.subStrands.flatMap(subStrand =>
    subStrand.outcomes.map(outcome => {
      const key = [strand.code, subStrand.code, outcome.position].join('\u0000');
      return [key, {
        strand: `${strand.code} ${strand.title}`,
        subStrand: `${subStrand.code} ${subStrand.title}`,
        outcomeText: outcome.statement,
      }];
    }),
  )));
}

export async function buildLanguageIndex(subjectDirectory) {
  const subject = subjects[subjectDirectory];
  if (!subject) throw new Error(`Unsupported Grade 1 language subject: ${subjectDirectory}`);
  const root = path.join(gradeRoot, subjectDirectory);
  const files = await jsonFiles(path.join(root, 'outcomes'));
  const expected = await expectedOutcomes(subject);
  const missions = [];
  const locations = new Set();
  for (const file of files) {
    const relativePath = path.relative(root, file).split(path.sep).join('/');
    const document = JSON.parse(await fs.readFile(file, 'utf8'));
    validateMission(relativePath, document, subject);
    const strandCode = document.curriculum.strandCode ?? curriculumCode(document.curriculum.strand);
    const subStrandCode = document.curriculum.subStrandCode ?? curriculumCode(document.curriculum.subStrand);
    const officialKey = [
      strandCode,
      subStrandCode,
      document.curriculum.outcomePosition,
    ].join('\u0000');
    const official = expected.get(officialKey);
    assert(official, relativePath, 'does not map to an official stored curriculum outcome');
    assert(curriculumTitle(document.curriculum.strand) === curriculumTitle(official.strand), relativePath, `curriculum.strand must exactly match ${curriculumTitle(official.strand)}`);
    assert(curriculumTitle(document.curriculum.subStrand) === curriculumTitle(official.subStrand), relativePath, `curriculum.subStrand must exactly match ${curriculumTitle(official.subStrand)}`);
    assert(document.curriculum.outcomeText === official.outcomeText, relativePath, 'curriculum.outcomeText must exactly match the stored outcome');
    const location = officialKey;
    assert(!locations.has(location), relativePath, 'duplicates an existing curriculum outcome');
    locations.add(location);
    expected.delete(officialKey);
    missions.push({
      id: document.id ?? relativePath.replace(/^outcomes\//, '').replace(/\.json$/, ''),
      path: relativePath,
      title: document.mission.title,
      curriculum: {
        ...document.curriculum,
        subjectId: subject.curriculumId,
        strand: official.strand,
        strandCode,
        subStrand: official.subStrand,
        subStrandCode,
      },
      interactionCount: document.mission.interactions.length,
    });
  }
  if (expected.size) {
    const missing = [...expected.keys()].slice(0, 8).map(key => key.split('\u0000').join('/')).join(', ');
    throw new Error(`${subjectDirectory}: missing ${expected.size} official outcomes (${missing}${expected.size > 8 ? ', ...' : ''})`);
  }
  missions.sort((left, right) =>
    compareCodes(left.curriculum.strand, right.curriculum.strand)
    || compareCodes(left.curriculum.subStrand, right.curriculum.subStrand)
    || left.curriculum.outcomePosition - right.curriculum.outcomePosition
    || left.id.localeCompare(right.id),
  );
  return {
    generatedAt: new Date().toISOString(),
    curriculum: { country: 'KEN', curriculum: 'CBC', revision: '2024', grade: 'Grade 1', subject: subject.name, subjectId: subject.curriculumId },
    missionCount: missions.length,
    interactionCount: missions.length * phases.length,
    missions,
  };
}

async function writeIndex(subjectDirectory, check) {
  const root = path.join(gradeRoot, subjectDirectory);
  const outputPath = path.join(root, 'index.json');
  const index = await buildLanguageIndex(subjectDirectory);
  if (check) {
    const existing = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    const stable = value => JSON.stringify({ ...value, generatedAt: undefined });
    if (stable(existing) !== stable(index)) throw new Error(`${subjectDirectory}/index.json is stale`);
  } else {
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`);
  }
  console.log(`${subjectDirectory}: ${index.missionCount} missions, ${index.interactionCount} interactions`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const requested = process.argv.find(value => Object.hasOwn(subjects, value));
  const selected = requested ? [requested] : Object.keys(subjects);
  for (const subject of selected) await writeIndex(subject, process.argv.includes('--check'));
}
