import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildCurriculumAuthoredPath } from './curriculumCompatibilityLesson.js';
import { loadGrade1MathematicsLessonSeeds } from './grade1MathematicsContent.js';
import {
  getProgressiveLessonDefinition,
  getProgressiveLessonPrivateDefinition,
  listProgressiveLessonDefinitions,
} from './progressiveLearning.js';

type JsonRecord = Record<string, unknown>;

type CurriculumMetadata = {
  country: string;
  curriculum: string;
  revision: string;
  grade: string;
  subjectId: string;
  strand: string;
  strandId: string;
  subStrand: string;
  subStrandId: string;
  outcomeId: string;
  outcomePosition: number;
  outcomeText: string;
};

type MissionDocument = {
  id: string;
  curriculum: CurriculumMetadata;
  mission: { title: string; interactions: JsonRecord[] };
};

type IndexEntry = {
  id: string;
  path: string;
  sourcePath?: string;
  curriculum: CurriculumMetadata;
  interactionCount: number;
};

type ContentIndex = {
  missionCount: number;
  interactionCount: number;
  missions: IndexEntry[];
};

const CONTENT_ROOT = fileURLToPath(new URL(
  '../data/learning-content/KEN/CBC/G1/mathematics/',
  import.meta.url,
));

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, `file:///${CONTENT_ROOT.replace(/\\/g, '/')}/`), 'utf8')) as T;
}

const index = readJson<ContentIndex>('index.json');
const documents = index.missions.map(entry => ({
  entry,
  document: readJson<MissionDocument>(entry.sourcePath ?? entry.path),
}));

function code(value: string): string {
  return value.match(/^\d+(?:\.\d+)?/)?.[0] ?? '';
}

function codeParts(value: string): number[] {
  return code(value).split('.').filter(Boolean).map(Number);
}

function compareCode(left: string, right: string): number {
  const a = codeParts(left);
  const b = codeParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareOfficial(left: IndexEntry, right: IndexEntry): number {
  return compareCode(left.curriculum.strand, right.curriculum.strand)
    || compareCode(left.curriculum.subStrand, right.curriculum.subStrand)
    || left.curriculum.outcomePosition - right.curriculum.outcomePosition;
}

function locationKey(curriculum: CurriculumMetadata): string {
  return [
    curriculum.country,
    curriculum.curriculum,
    curriculum.revision,
    curriculum.grade,
    curriculum.subjectId,
    curriculum.strandId,
    curriculum.subStrandId,
    curriculum.outcomeId,
  ].map(part => encodeURIComponent(part.normalize('NFC'))).join('/');
}

function withoutCode(value: string): string {
  return value.replace(/^\d+(?:\.\d+)?\s+/, '').trim();
}

function failWithIssues(label: string, issues: string[]): void {
  const visible = issues.slice(0, 40);
  const remainder = issues.length - visible.length;
  assert.equal(issues.length, 0, [
    `${label}:`,
    ...visible.map(issue => `- ${issue}`),
    ...(remainder > 0 ? [`- ...and ${remainder} additional issue(s)`] : []),
  ].join('\n'));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function choiceLabels(interaction: JsonRecord): string[] {
  const choices = Array.isArray(interaction.choices)
    ? interaction.choices
    : Array.isArray(interaction.answerTiles)
      ? interaction.answerTiles
      : Array.isArray(interaction.targets)
        ? interaction.targets
      : [];
  return choices.flatMap(choice => {
    if (typeof choice === 'string' || typeof choice === 'number') return [String(choice)];
    return isRecord(choice) && typeof choice.label === 'string' ? [choice.label] : [];
  });
}

function recursivelyFindForbiddenKeys(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => recursivelyFindForbiddenKeys(item, `${path}[${index}]`));
  }
  if (!isRecord(value)) return [];
  const forbidden = new Set([
    'answer',
    'answers',
    'private',
    'acceptedChoiceIds',
    'assignments',
    'pairs',
    'orderedItemIds',
    'completion',
    'expectedValues',
    'targetIds',
    'requiredTargetIds',
    'correctAnswer',
    'acceptedAnswers',
    'acceptableAnswers',
    'grading',
  ]);
  return Object.entries(value).flatMap(([key, nested]) => [
    ...(forbidden.has(key) ? [`${path}.${key}`] : []),
    ...recursivelyFindForbiddenKeys(nested, `${path}.${key}`),
  ]);
}

test('all Grade 1 Mathematics missions have unique release-scoped identities and complete metadata', () => {
  assert.equal(index.missionCount, 53);
  assert.equal(index.interactionCount, 318);
  assert.equal(index.missions.length, 53);
  assert.equal(documents.length, 53);

  const issues: string[] = [];
  const identities = new Set<string>();
  const missionIds = new Set<string>();
  for (const { entry, document } of documents) {
    const identity = locationKey(document.curriculum);
    if (identities.has(identity)) issues.push(`${entry.id}: duplicate curriculum identity ${identity}`);
    if (missionIds.has(document.id)) issues.push(`${entry.id}: duplicate mission id ${document.id}`);
    identities.add(identity);
    missionIds.add(document.id);

    if (entry.id !== document.id) issues.push(`${entry.id}: index id differs from document id ${document.id}`);
    if (locationKey(entry.curriculum) !== identity) issues.push(`${entry.id}: index curriculum identity differs from document`);
    if (!document.curriculum.strandId) issues.push(`${entry.id}: strandId is missing`);
    if (!document.curriculum.subStrandId) issues.push(`${entry.id}: subStrandId is missing`);
    if (!document.curriculum.outcomeId) issues.push(`${entry.id}: outcomeId is missing`);
    if (!document.curriculum.outcomeText.trim()) issues.push(`${entry.id}: outcomeText is missing`);
    if (entry.interactionCount !== 6 || document.mission.interactions.length !== 6) {
      issues.push(`${entry.id}: expected exactly 6 interactions`);
    }
  }
  failWithIssues('mission identity contract failed', issues);
});

test('compiled missions and runtime registry preserve official strand, sub-strand and outcome order', () => {
  const officialEntries = [...index.missions].sort(compareOfficial);
  const issues: string[] = [];

  const outcomePositionsBySubStrand = new Map<string, number[]>();
  for (const entry of officialEntries) {
    const positions = outcomePositionsBySubStrand.get(entry.curriculum.subStrandId) ?? [];
    positions.push(entry.curriculum.outcomePosition);
    outcomePositionsBySubStrand.set(entry.curriculum.subStrandId, positions);
  }
  for (const [subStrandId, positions] of outcomePositionsBySubStrand) {
    const expected = Array.from({ length: positions.length }, (_, index) => index + 1);
    if (JSON.stringify(positions) !== JSON.stringify(expected)) {
      issues.push(`${subStrandId}: outcome positions are ${positions.join(', ')}, expected ${expected.join(', ')}`);
    }
  }

  const expectedKeys = officialEntries.map(entry => entry.id);
  const seedKeys = loadGrade1MathematicsLessonSeeds().map(seed => seed.key);
  const registryKeys = listProgressiveLessonDefinitions({ grade: 'Grade 1', subjectId: 'mathematics' })
    .map(lesson => lesson.lessonKey);
  if (JSON.stringify(seedKeys) !== JSON.stringify(expectedKeys)) {
    issues.push('content loader does not return missions in official order');
  }
  if (JSON.stringify(registryKeys) !== JSON.stringify(expectedKeys)) {
    issues.push('runtime lesson registry does not return missions in official order');
  }
  failWithIssues('official ordering contract failed', issues);
});

test('every mission resolves through the runtime registry and its public projection never leaks grading data', () => {
  const issues: string[] = [];
  for (const { entry } of documents) {
    const published = getProgressiveLessonDefinition(entry.id);
    const grading = getProgressiveLessonPrivateDefinition(entry.id);
    if (!published) {
      issues.push(`${entry.id}: public registry lookup failed`);
      continue;
    }
    if (!grading) {
      issues.push(`${entry.id}: private registry lookup failed`);
      continue;
    }
    if (published.lessonKey !== grading.lessonKey) issues.push(`${entry.id}: public/private lesson keys differ`);
    if (published.lessonVersion !== grading.lessonVersion) issues.push(`${entry.id}: public/private versions differ`);
    if (published.steps.length !== 6 || Object.keys(grading.answers).length !== 6) {
      issues.push(`${entry.id}: public steps and private graders must both contain 6 entries`);
    }
    const leaked = recursivelyFindForbiddenKeys(published);
    if (leaked.length > 0) issues.push(`${entry.id}: public response leaks grading keys at ${leaked.join(', ')}`);
  }
  failWithIssues('registry/public projection contract failed', issues);
});

test('every authored interaction reaches a supported, non-placeholder runtime scene', () => {
  const issues: string[] = [];
  const supportedComponents = new Set([
    'number-manipulatives',
    'classify-sort-match-rank',
    'trace-construct',
    'structured-response',
    'authored-interaction',
  ]);

  for (const { entry, document } of documents) {
    const published = getProgressiveLessonDefinition(entry.id);
    if (!published) continue;
    // The first Number Concept mission deliberately uses canonical QuizBank rows.
    if (entry.id === index.missions[0]?.id) continue;
    document.mission.interactions.forEach((interaction, index) => {
      const step = published.steps[index];
      const label = `${entry.id} step ${index + 1}`;
      if (!step) {
        issues.push(`${label}: runtime step is missing`);
        return;
      }

      const scene = isRecord(step.componentScene) ? step.componentScene : null;
      const component = scene && isRecord(scene.component) ? scene.component : null;
      const componentId = typeof component?.componentId === 'string' ? component.componentId : null;
      if (componentId && !supportedComponents.has(componentId)) {
        issues.push(`${label}: unsupported component ${componentId}`);
      }
      if (componentId && component?.componentVersion !== '1.0.0') {
        issues.push(`${label}: unsupported component version ${String(component?.componentVersion)}`);
      }
      if (componentId && !isRecord(scene?.props)) issues.push(`${label}: component props are missing`);

      const rawMode = String(interaction.mode ?? '');
      const authoredChoiceLabels = choiceLabels(interaction);
      const hasStructuredInteraction = Boolean(step.interaction) || Boolean(componentId);
      const isChoicePresentation = !hasStructuredInteraction && (
        rawMode === 'picture-choice' || authoredChoiceLabels.length >= 2
      );
      if (!isChoicePresentation && !hasStructuredInteraction) {
        issues.push(`${label}: ${rawMode} was flattened into a choice placeholder`);
      }

      if (isChoicePresentation) {
        if (authoredChoiceLabels.length >= 2 && step.options.length !== authoredChoiceLabels.length) {
          issues.push(`${label}: ${authoredChoiceLabels.length} authored choices became ${step.options.length} runtime options`);
        }
      }
      if (!hasStructuredInteraction) {
        if (step.options.length < 2 || step.options.some(option => !option.trim())) {
          issues.push(`${label}: choice scene needs at least two non-empty options`);
        }
        if (step.options.includes('Try another answer')) {
          issues.push(`${label}: synthetic placeholder option reached the learner`);
        }
        if (new Set(step.options).size !== step.options.length) {
          issues.push(`${label}: runtime options contain duplicates`);
        }
      }
    });
  }
  failWithIssues('renderability contract failed', issues);
});

test('every official path node resolves to the lesson key at the same composite outcome location', () => {
  const officialEntries = [...index.missions].sort(compareOfficial);
  const strandGroups = new Map<string, typeof officialEntries>();
  for (const entry of officialEntries) {
    const group = strandGroups.get(entry.curriculum.strandId) ?? [];
    group.push(entry);
    strandGroups.set(entry.curriculum.strandId, group);
  }

  const subject = {
    subjectId: 'mathematics',
    subjectName: 'Mathematical Activities',
    subjectCode: 'math',
    strands: [...strandGroups.values()].map(strandEntries => {
      const first = strandEntries[0];
      const subStrandGroups = new Map<string, typeof officialEntries>();
      for (const entry of strandEntries) {
        const group = subStrandGroups.get(entry.curriculum.subStrandId) ?? [];
        group.push(entry);
        subStrandGroups.set(entry.curriculum.subStrandId, group);
      }
      return {
        id: first.curriculum.strandId,
        number: code(first.curriculum.strand),
        title: withoutCode(first.curriculum.strand),
        subStrands: [...subStrandGroups.values()].map(subStrandEntries => {
          const subStrand = subStrandEntries[0].curriculum;
          return {
            id: subStrand.subStrandId,
            number: code(subStrand.subStrand),
            title: withoutCode(subStrand.subStrand),
            topics: [{ id: `topic-${subStrand.subStrandId}`, title: withoutCode(subStrand.subStrand) }],
            outcomes: subStrandEntries.map(entry => ({
              id: entry.curriculum.outcomeId,
              text: entry.curriculum.outcomeText,
            })),
            isCompleted: false,
            needsRemediation: false,
          };
        }),
      };
    }),
  };

  const authoredLessons = officialEntries.map(entry => getProgressiveLessonPrivateDefinition(entry.id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));
  const path = buildCurriculumAuthoredPath(subject, [], 'Grade 1', authoredLessons);
  const issues: string[] = [];
  if (path.nodes.length !== officialEntries.length) {
    issues.push(`path has ${path.nodes.length} nodes, expected ${officialEntries.length}`);
  }
  path.nodes.forEach((node, position) => {
    const expected = officialEntries[position];
    if (!expected) return;
    if (node.lessonKey !== expected.id) {
      issues.push(`position ${position}: ${expected.id} resolved to ${String(node.lessonKey)}`);
    }
    if (node.curriculumOutcomeId !== expected.curriculum.outcomeId) {
      issues.push(`position ${position}: outcome id differs for ${expected.id}`);
    }
    if (node.availability !== 'published') {
      issues.push(`position ${position}: ${expected.id} is ${node.availability}`);
    }
  });
  failWithIssues('path-to-lesson consistency contract failed', issues);
});
