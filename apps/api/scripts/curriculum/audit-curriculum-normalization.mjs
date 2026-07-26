#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

const gunzipAsync = promisify(gunzip);

function parseArgs(argv) {
  const gradeDirectories = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--details') continue;
    if (argv[index] !== '--grade-dir' || !argv[index + 1]) {
      throw new Error('Usage: audit-curriculum-normalization.mjs [--details] --grade-dir <path> [--grade-dir <path> ...]');
    }
    gradeDirectories.push(path.resolve(argv[index + 1]));
    index += 1;
  }
  if (gradeDirectories.length === 0) throw new Error('At least one --grade-dir is required.');
  return { gradeDirectories, details: argv.includes('--details') };
}

function normalizeName(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en').replace(/[^a-z0-9]+/gu, '');
}

function duplicates(values, identity) {
  const grouped = new Map();
  for (const value of values) {
    const key = identity(value);
    const matches = grouped.get(key) ?? [];
    matches.push(value);
    grouped.set(key, matches);
  }
  return [...grouped.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([key, matches]) => ({ key, matches }));
}

async function readDataset(directory) {
  const jsonPath = path.join(directory, 'normalized-curriculum.json');
  try {
    return JSON.parse(await readFile(jsonPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return JSON.parse((await gunzipAsync(await readFile(`${jsonPath}.gz`))).toString('utf8'));
  }
}

function summarizeGrade(dataset) {
  const subjects = new Map();
  for (const entry of dataset.gradeSubjects ?? []) {
    const subject = subjects.get(entry.subjectCode) ?? {
      subjectCode: entry.subjectCode,
      sourceNames: new Set(),
      strands: [],
      subStrands: [],
    };
    subject.sourceNames.add(entry.subjectName);
    for (const strand of entry.strands ?? []) {
      subject.strands.push({ code: strand.code, title: strand.title });
      for (const subStrand of strand.subStrands ?? []) {
        subject.subStrands.push({ strandCode: strand.code, code: subStrand.code, title: subStrand.title });
      }
    }
    subjects.set(entry.subjectCode, subject);
  }

  return {
    grade: `Grade ${dataset.grade}`,
    logicalDigest: dataset.logicalDigestSha256,
    subjects: [...subjects.values()]
      .map(subject => ({
        ...(() => {
          const titleGroups = new Map();
          for (const strand of subject.strands) {
            const key = normalizeName(strand.title);
            const group = titleGroups.get(key) ?? [];
            group.push(strand.title);
            titleGroups.set(key, group);
          }
          const hasRepeatedTitles = [...titleGroups.values()].some(group => group.length > 1);
          return {
            singletonStrandTitles: hasRepeatedTitles
              ? [...titleGroups.entries()].filter(([, group]) => group.length === 1).map(([key, group]) => ({ key, title: group[0] }))
              : [],
          };
        })(),
        subjectCode: subject.subjectCode,
        sourceNames: [...subject.sourceNames].sort(),
        strandCount: subject.strands.length,
        subStrandCount: subject.subStrands.length,
        duplicateStrandCodes: duplicates(subject.strands, item => String(item.code ?? '')),
        duplicateStrandTitles: duplicates(subject.strands, item => normalizeName(item.title)),
        duplicateSubStrandCodes: duplicates(
          subject.subStrands,
          item => `${String(item.strandCode ?? '')}\0${String(item.code ?? '')}`,
        ),
      }))
      .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode)),
  };
}

const { gradeDirectories, details } = parseArgs(process.argv.slice(2));
const grades = [];
for (const directory of gradeDirectories) {
  grades.push(summarizeGrade(await readDataset(directory)));
}
grades.sort((left, right) => Number(left.grade.replace(/\D+/gu, '')) - Number(right.grade.replace(/\D+/gu, '')));

const identities = new Map();
for (const grade of grades) {
  for (const subject of grade.subjects) {
    const identity = identities.get(subject.subjectCode) ?? { subjectCode: subject.subjectCode, grades: [], sourceNames: new Set() };
    identity.grades.push(grade.grade);
    for (const name of subject.sourceNames) identity.sourceNames.add(name);
    identities.set(subject.subjectCode, identity);
  }
}

const reportedGrades = details ? grades : grades.map(grade => ({
  ...grade,
  subjects: grade.subjects.map(subject => ({
    subjectCode: subject.subjectCode,
    sourceNames: subject.sourceNames,
    strandCount: subject.strandCount,
    subStrandCount: subject.subStrandCount,
    duplicateStrandCodeCount: subject.duplicateStrandCodes.length,
    duplicateStrandTitleCount: subject.duplicateStrandTitles.length,
    singletonStrandTitles: subject.singletonStrandTitles,
    duplicateSubStrandCodeCount: subject.duplicateSubStrandCodes.length,
  })),
}));

console.log(JSON.stringify({
  grades: reportedGrades,
  identities: [...identities.values()]
    .map(identity => ({ ...identity, sourceNames: [...identity.sourceNames].sort() }))
    .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode)),
}, null, 2));
