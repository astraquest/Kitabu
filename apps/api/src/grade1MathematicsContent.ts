import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { curriculumLocationKey } from './authoredContent/schema.js';
import type { LowerPrimaryInteractionDefinition } from './interactiveLearning/lowerPrimaryClassifySortMatchPattern.js';
import type { ProgressiveLessonSeed, StepInput } from './progressiveLearning.js';

type JsonRecord = Record<string, unknown>;

type CurriculumMetadata = {
  country: string;
  curriculum: string;
  revision: string;
  grade: string;
  subject: string;
  subjectId: string;
  strand: string;
  strandCode?: string;
  strandId: string;
  subStrand: string;
  subStrandCode?: string;
  subStrandId: string;
  outcomeId: string;
  outcomePosition: number;
  outcomeText: string;
};

type OutcomeMission = {
  id: string;
  curriculum: CurriculumMetadata;
  mission: { title: string; interactions: JsonRecord[] };
};

type ContentIndex = {
  missions: Array<{
    id: string;
    path: string;
    sourcePath?: string;
  }>;
};

type RuntimeItem = {
  id: string;
  label: string;
  accessibleDescription?: string;
};

type ItemInventory = {
  items: RuntimeItem[];
  idsFor: (values: unknown[], allowReuse?: boolean) => string[];
};

export type Grade1MathematicsLessonSeed = ProgressiveLessonSeed & {
  /** Release-scoped composite identity; outcomeId alone is not globally unique. */
  curriculumLocationKey: string;
};

const CONTENT_SEGMENTS = ['data', 'learning-content', 'KEN', 'CBC', 'G1'];

function contentRoot(subjectDirectory = 'mathematics') {
  const candidates = [
    fileURLToPath(new URL(`../data/learning-content/KEN/CBC/G1/${subjectDirectory}/`, import.meta.url)),
    join(process.cwd(), ...CONTENT_SEGMENTS, subjectDirectory),
    resolve(process.cwd(), 'apps', 'api', ...CONTENT_SEGMENTS, subjectDirectory),
  ];
  const root = candidates.find(candidate => existsSync(join(candidate, 'index.json')));
  if (!root) throw new Error(`Grade 1 ${subjectDirectory} content index is missing.`);
  return root;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): JsonRecord {
  if (!isRecord(value)) throw new Error('Grade 1 Mathematics mission contains an invalid object.');
  return value;
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function curriculumLabel(value: string) {
  return value.replace(/^\d+(?:\.\d+)?\s+/, '').trim();
}

function curriculumCode(value: string): number[] {
  return (value.match(/^\d+(?:\.\d+)?/)?.[0] ?? '')
    .split('.')
    .filter(Boolean)
    .map(Number);
}

function compareCodes(left: string, right: string): number {
  const a = curriculumCode(left);
  const b = curriculumCode(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareOfficial(left: OutcomeMission, right: OutcomeMission): number {
  return compareCodes(left.curriculum.strand, right.curriculum.strand)
    || compareCodes(left.curriculum.subStrand, right.curriculum.subStrand)
    || left.curriculum.outcomePosition - right.curriculum.outcomePosition;
}

function primitiveLabel(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** Returns learner-facing text only from public authored item fields. */
function publicChoiceLabel(value: unknown): string {
  const primitive = primitiveLabel(value);
  if (primitive) return primitive;
  if (!isRecord(value)) throw new Error('An authored public choice has no accessible label.');
  const label = text(value.label, text(value.accessibleDescription, text(value.id, '')));
  if (!label) throw new Error('An authored public choice has no accessible label.');
  return label;
}

function semanticKey(value: unknown): string {
  const primitive = primitiveLabel(value);
  if (primitive) return primitive;
  if (!isRecord(value)) return '';
  return text(value.id, text(value.label, text(value.accessibleDescription, '')));
}

function safeId(value: string, fallback: string): string {
  const normalized = value.normalize('NFC').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function itemInventory(values: unknown[], prefix: string): ItemInventory {
  const occurrences = new Map<string, number>();
  const idsByKey = new Map<string, string[]>();
  const items = values.map((value, index) => {
    const key = semanticKey(value);
    if (!key) throw new Error(`An authored ${prefix} item has no public identity.`);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    const baseId = safeId(key, `${prefix}-${index + 1}`);
    const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
    const source = isRecord(value) ? value : null;
    const label = source ? publicChoiceLabel(source) : key;
    const accessibleDescription = source
      ? text(source.accessibleDescription, label)
      : label;
    idsByKey.set(key, [...(idsByKey.get(key) ?? []), id]);
    return { id, label, accessibleDescription };
  });

  return {
    items,
    idsFor(requestedValues, allowReuse = false) {
      const used = new Map<string, number>();
      return requestedValues.map(value => {
        const key = semanticKey(value);
        const position = allowReuse ? 0 : used.get(key) ?? 0;
        const id = idsByKey.get(key)?.[position];
        if (!id) throw new Error(`Private response references missing public item: ${key || '<empty>'}.`);
        if (!allowReuse) used.set(key, position + 1);
        return id;
      });
    },
  };
}

function authoredPhase(value: unknown, index: number): StepInput['phase'] {
  if (value === 'warm-up' || value === 'model' || value === 'guided-practice') return 'guided';
  if (value === 'independent-practice' || value === 'transfer' || value === 'exit-check') return 'checkpoint';
  return index < 3 ? 'guided' : 'checkpoint';
}

function sceneEnvelope(
  missionId: string,
  stepNumber: number,
  prompt: string,
  componentId: string,
  props: JsonRecord,
): JsonRecord {
  return {
    identity: { sceneId: `${missionId}-step-${stepNumber}`, schemaVersion: '1.0.1' },
    component: { componentId, componentVersion: '1.0.0' },
    prompt: { default: prompt },
    props,
  };
}

function privateInteraction(
  mode: LowerPrimaryInteractionDefinition['mode'],
  expected: Record<string, string | number>,
  interaction: JsonRecord,
): LowerPrimaryInteractionDefinition {
  if (Object.keys(expected).length === 0) throw new Error(`Authored ${mode} interaction has no deterministic answer.`);
  return {
    mode,
    expected,
    feedback: text(interaction.feedback, 'Great work!'),
    retryHint: text(interaction.retryHint, 'Look carefully and try again.'),
  };
}

function baseStep(
  missionId: string,
  interaction: JsonRecord,
  index: number,
  answer: string,
): Omit<StepInput, 'options'> {
  const prompt = text(interaction.prompt, 'Try this mathematics activity.');
  const imageKey = /apple/i.test(prompt)
    ? 'image-library/v1/apple.png'
    : /banana/i.test(prompt)
      ? 'image-library/v1/banana.png'
      : /ball/i.test(prompt)
        ? 'image-library/v1/ball.png'
        : undefined;
  return {
    phase: authoredPhase(interaction.phase, index),
    prompt,
    answer,
    visual: { kind: 'picture_choice', object: 'lion', caption: prompt, imageKey },
    hint: text(interaction.retryHint, 'Look carefully and try again.'),
    successMessage: text(interaction.feedback, 'Well done!'),
    misconception: `G1_${missionId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_STEP_${index + 1}`,
    incorrectMessage: text(interaction.retryHint, 'Try again.'),
  };
}

function choiceStep(
  missionId: string,
  interaction: JsonRecord,
  index: number,
  authoredChoices: unknown[] = Array.isArray(interaction.choices) ? interaction.choices : [],
): StepInput {
  if (authoredChoices.length < 2) {
    throw new Error(`${missionId} step ${index + 1} needs at least two authored choices.`);
  }
  const options = authoredChoices.map(publicChoiceLabel);
  const answerKey = semanticKey(interaction.answer);
  const answerIndex = authoredChoices.findIndex(choice => semanticKey(choice) === answerKey);
  if (answerIndex < 0) throw new Error(`${missionId} step ${index + 1} answer is not one of its public choices.`);
  return {
    ...baseStep(missionId, interaction, index, options[answerIndex]),
    options,
  };
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function numericTarget(interaction: JsonRecord): number | null {
  for (const candidate of [
    interaction.target,
    interaction.targetCount,
    interaction.targetUnits,
    interaction.targetUnitCount,
    interaction.targetTotal,
    interaction.answer,
  ]) {
    const parsed = numeric(candidate);
    if (parsed !== null) return parsed;
  }
  if (isRecord(interaction.answer)) {
    const count = numeric(interaction.answer.count ?? interaction.answer.total);
    if (count !== null) return count;
    const tens = numeric(interaction.answer.bundlesOfTen);
    const ones = numeric(interaction.answer.singleObjects);
    if (tens !== null && ones !== null) return tens * 10 + ones;
    if (Array.isArray(interaction.answer.unitSequence)) return interaction.answer.unitSequence.length;
  }
  if (isRecord(interaction.model)) {
    const units = numeric(interaction.model.fullUnits);
    if (units !== null) return units;
  }
  if (Array.isArray(interaction.answer) && interaction.answer.length > 0) {
    const values = interaction.answer.map(numeric);
    if (values.every((value): value is number => value !== null)) return values.at(-1) ?? null;
  }
  return null;
}

function numberActivity(value: unknown): 'count' | 'represent' | 'combine' | 'take-away' | 'number-line' | 'measure' {
  const mode = String(value ?? '');
  if (mode.includes('take-away')) return 'take-away';
  if (mode.includes('number-line')) return 'number-line';
  if (mode.includes('combine') || mode.includes('compose')) return 'combine';
  if (mode.includes('measure') || mode.includes('balance') || mode.includes('align') || mode.includes('capacity')) return 'measure';
  if (mode.includes('count') || mode === 'tap-count') return 'count';
  return 'represent';
}

function numberStep(missionId: string, interaction: JsonRecord, index: number): StepInput {
  const target = numericTarget(interaction);
  if (target === null) {
    if (Array.isArray(interaction.choices)) return choiceStep(missionId, interaction, index);
    return sequenceStep(missionId, interaction, index, 'order');
  }
  if (!Number.isInteger(target) || target < 0 || target > 50) {
    throw new Error(`${missionId} step ${index + 1} has an out-of-range Grade 1 numeric target.`);
  }
  const authoredChoices = publicArray(interaction, ['choices', 'answerTiles']);
  if (authoredChoices.length >= 2) {
    return choiceStep(
      missionId,
      { ...interaction, answer: primitiveLabel(interaction.answer) ?? target },
      index,
      authoredChoices,
    );
  }
  const numberLine = isRecord(interaction.numberLine) ? interaction.numberLine : {};
  const authoredMin = numeric(interaction.min) ?? numeric(numberLine.min) ?? numeric(numberLine.start) ?? 0;
  const authoredMax = numeric(interaction.max) ?? numeric(numberLine.max) ?? numeric(numberLine.end) ?? 50;
  const min = Math.max(0, Math.min(target, authoredMin));
  const max = Math.min(50, Math.max(target, authoredMax));
  const initialCandidate = numeric(interaction.initialValue)
    ?? numeric(numberLine.from)
    ?? numeric(numberLine.highlightStart)
    ?? min;
  const initialValue = Math.min(max, Math.max(min, initialCandidate));
  const activityMode = numberActivity(interaction.activityMode);
  const prompt = text(interaction.prompt, 'Try this mathematics activity.');
  const context = isRecord(interaction.context) ? interaction.context : {};
  const unitLabel = text(
    interaction.unitLabel ?? interaction.object ?? interaction.unit ?? context.object,
    'counters',
  );
  return {
    ...baseStep(missionId, interaction, index, String(target)),
    options: [],
    componentScene: sceneEnvelope(missionId, index + 1, prompt, 'number-manipulatives', {
      mode: 'number-manipulatives',
      activityMode,
      min,
      max,
      initialValue,
      unitLabel,
      feedback: text(interaction.feedback, 'Great work!'),
      retryHint: text(interaction.retryHint, 'Try again.'),
    }),
  };
}

function publicArray(interaction: JsonRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(interaction[key]) && (interaction[key] as unknown[]).length > 0) {
      return interaction[key] as unknown[];
    }
  }
  return [];
}

function expectedSequence(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id, position) => [id, position]));
}

function sequenceStep(
  missionId: string,
  interaction: JsonRecord,
  index: number,
  mode: 'order' | 'pattern',
): StepInput {
  if (!Array.isArray(interaction.answer) || interaction.answer.length === 0) {
    throw new Error(`${missionId} step ${index + 1} has no authored sequence answer.`);
  }
  const publicValues = publicArray(interaction, [
    'items', 'cards', 'availableObjects', 'objects', 'availableUnits', 'answerTiles', 'targets', 'sequence',
  ]);
  if (publicValues.length === 0) throw new Error(`${missionId} step ${index + 1} has no public sequence items.`);
  const inventory = itemInventory(publicValues, `${mode}-item`);
  const answerIds = inventory.idsFor(interaction.answer, mode === 'pattern');
  const expected = mode === 'order'
    ? expectedSequence(answerIds)
    : Object.fromEntries(answerIds.map((id, position) => [`slot-${position}`, id]));
  const prompt = text(interaction.prompt, 'Put the items in order.');
  const groups = mode === 'pattern' && answerIds.length > 1
    ? answerIds.map((_, position) => ({ id: `slot-${position}`, label: `Position ${position + 1}` }))
    : undefined;
  return {
    ...baseStep(missionId, interaction, index, `sequence:${answerIds.join('>')}`),
    options: [],
    componentScene: sceneEnvelope(missionId, index + 1, prompt, 'authored-interaction', {
      mode,
      items: inventory.items,
      ...(groups ? { groups } : {}),
      instruction: text(interaction.tapAlternative, prompt),
    }),
    // Order responses use the renderer's canonical `sequence:a>b` format and
    // are graded by the ordinary private answer path. Pattern responses are a
    // JSON envelope and use the structured private grader.
    ...(mode === 'pattern'
      ? { lowerPrimaryInteraction: privateInteraction('pattern', expected, interaction) }
      : {}),
  };
}

function pairRecords(interaction: JsonRecord): Array<[unknown, unknown]> {
  if (!Array.isArray(interaction.pairs)) return [];
  return interaction.pairs.flatMap(pair => {
    if (Array.isArray(pair) && pair.length >= 2) return [[pair[0], pair[1]] as [unknown, unknown]];
    if (!isRecord(pair)) return [];
    const leftId = pair.left ?? pair.object ?? pair.container;
    const rightId = pair.right ?? pair.unit ?? pair.relationship ?? pair.item;
    const left = leftId === undefined ? undefined : {
      id: leftId,
      label: pair.leftLabel ?? pair.objectLabel ?? pair.containerLabel ?? leftId,
    };
    const right = rightId === undefined ? undefined : {
      id: rightId,
      label: pair.rightLabel ?? pair.unitLabel ?? pair.relationshipLabel ?? pair.itemLabel ?? rightId,
    };
    return left !== undefined && right !== undefined ? [[left, right] as [unknown, unknown]] : [];
  });
}

function assignmentStep(
  missionId: string,
  interaction: JsonRecord,
  index: number,
  mode: 'classify' | 'match',
): StepInput {
  const rawAssignments = isRecord(interaction.answer) ? interaction.answer : null;
  const authoredAssignments = rawAssignments && Object.values(rawAssignments).some(Array.isArray)
    ? Object.fromEntries(Object.entries(rawAssignments).flatMap(([group, items]) =>
        Array.isArray(items) ? items.map(item => [semanticKey(item), group]) : []))
    : rawAssignments;
  const pairs = pairRecords(interaction);
  const assignmentEntries: Array<[unknown, unknown]> = authoredAssignments
    ? Object.entries(authoredAssignments)
    : pairs.length > 0
      ? pairs
      : [];
  if (assignmentEntries.length === 0) throw new Error(`${missionId} step ${index + 1} has no assignments.`);

  const itemSource = publicArray(interaction, ['items', 'objects', 'availableObjects']);
  const groupSource = publicArray(interaction, ['groups', 'categories', 'choices', 'availableUnits']);
  const leftValues = itemSource.length > 0 ? itemSource : assignmentEntries.map(([left]) => left);
  const rightValues = groupSource.length > 0 ? groupSource : assignmentEntries.map(([, right]) => right);
  const items = itemInventory(leftValues, `${mode}-item`);
  const groups = itemInventory(rightValues, `${mode}-group`);
  const leftIds = items.idsFor(assignmentEntries.map(([left]) => left));
  const rightIds = groups.idsFor(assignmentEntries.map(([, right]) => right), true);
  const expected = Object.fromEntries(leftIds.map((id, position) => [id, rightIds[position]]));
  const prompt = text(interaction.prompt, 'Match each item.');
  return {
    ...baseStep(missionId, interaction, index, JSON.stringify(expected)),
    options: [],
    componentScene: sceneEnvelope(missionId, index + 1, prompt, 'authored-interaction', {
      mode,
      items: items.items,
      groups: groups.items.map(({ id, label }) => ({ id, label })),
      instruction: text(interaction.tapAlternative, prompt),
    }),
    lowerPrimaryInteraction: privateInteraction(mode, expected, interaction),
  };
}

function selectionStep(missionId: string, interaction: JsonRecord, index: number): StepInput {
  if (!Array.isArray(interaction.answer) || interaction.answer.length === 0) {
    throw new Error(`${missionId} step ${index + 1} has no authored selection answer.`);
  }
  const publicValues = publicArray(interaction, ['items', 'objects', 'availableObjects', 'choices']);
  if (publicValues.length === 0) throw new Error(`${missionId} step ${index + 1} has no public selection items.`);
  const inventory = itemInventory(publicValues, 'selection-item');
  const selectedIds = new Set(inventory.idsFor(interaction.answer));
  const groups = [
    { id: 'selected', label: 'Choose' },
    { id: 'not-selected', label: 'Leave' },
  ];
  const expected = Object.fromEntries(inventory.items.map(item => [item.id, selectedIds.has(item.id) ? 'selected' : 'not-selected']));
  const prompt = text(interaction.prompt, 'Choose the matching items.');
  return {
    ...baseStep(missionId, interaction, index, JSON.stringify(expected)),
    options: [],
    componentScene: sceneEnvelope(missionId, index + 1, prompt, 'authored-interaction', {
      mode: 'classify',
      items: inventory.items,
      groups,
      instruction: text(interaction.tapAlternative, prompt),
    }),
    lowerPrimaryInteraction: privateInteraction('classify', expected, interaction),
  };
}

function structuredStep(missionId: string, interaction: JsonRecord, index: number): StepInput {
  const rawMode = String(interaction.mode ?? '');
  const activityMode = String(interaction.activityMode ?? rawMode);
  if (!Array.isArray(interaction.answer) && !isRecord(interaction.answer)) {
    const choices = publicArray(interaction, ['choices', 'targets', 'items', 'objects', 'availableObjects']);
    if (choices.length >= 2) return choiceStep(missionId, interaction, index, choices);
  }
  if (activityMode.includes('pattern')) return sequenceStep(missionId, interaction, index, 'pattern');
  if (activityMode.includes('order') || activityMode === 'sort') return sequenceStep(missionId, interaction, index, 'order');
  const isMatch = rawMode === 'match' || activityMode.includes('match') || activityMode.includes('pair');
  if (isMatch) return assignmentStep(missionId, interaction, index, 'match');
  if (activityMode === 'collect' || activityMode === 'ranked-list' || (Array.isArray(interaction.answer) && !Array.isArray(interaction.answer[0]) && !isRecord(interaction.answer[0]))) {
    return selectionStep(missionId, interaction, index);
  }
  return assignmentStep(missionId, interaction, index, 'classify');
}

function traceStep(missionId: string, interaction: JsonRecord, index: number): StepInput {
  if (!Array.isArray(interaction.answer) || interaction.answer.length === 0) {
    throw new Error(`${missionId} step ${index + 1} has no trace answer.`);
  }
  let publicTargets = publicArray(interaction, ['targets']);
  if (publicTargets.length === 0 && isRecord(interaction.path)) {
    publicTargets = Object.values(interaction.path).filter(value => primitiveLabel(value));
  }
  if (publicTargets.length < 2) throw new Error(`${missionId} step ${index + 1} needs at least two trace targets.`);
  const inventory = itemInventory(publicTargets, 'trace-target');
  const answerIds = inventory.idsFor(interaction.answer);
  const prompt = text(interaction.prompt, 'Trace the path.');
  const activityMode = String(interaction.activityMode ?? '');
  return {
    ...baseStep(missionId, interaction, index, `selection:${answerIds.join('|')}`),
    options: [],
    componentScene: sceneEnvelope(missionId, index + 1, prompt, 'trace-construct', {
      mode: activityMode.includes('pattern') || activityMode.includes('construct') ? 'construct-pattern' : 'trace-path',
      targets: inventory.items,
      selectionCount: answerIds.length,
      instruction: { default: text(interaction.tapAlternative, prompt) },
      accessibility: { selectionLabel: { default: 'Choose the next item' } },
    }),
  };
}

function stepFor(missionId: string, interaction: JsonRecord, index: number): StepInput {
  const mode = String(interaction.mode ?? 'picture-choice');
  if (mode === 'picture-choice') return choiceStep(missionId, interaction, index);
  if (mode === 'number-manipulatives') return numberStep(missionId, interaction, index);
  if (mode === 'trace-construct') return traceStep(missionId, interaction, index);
  return structuredStep(missionId, interaction, index);
}

function readMission(root: string, entry: ContentIndex['missions'][number], subjectLabel: string): OutcomeMission {
  const relativePath = entry.sourcePath ?? entry.path;
  const document = record(JSON.parse(readFileSync(join(root, relativePath), 'utf8')));
  const rawCurriculum = record(document.curriculum) as CurriculumMetadata;
  const curriculum = {
    ...rawCurriculum,
    strand: rawCurriculum.strandCode && !curriculumCode(rawCurriculum.strand).length
      ? `${rawCurriculum.strandCode} ${rawCurriculum.strand}`
      : rawCurriculum.strand,
    subStrand: rawCurriculum.subStrandCode && !curriculumCode(rawCurriculum.subStrand).length
      ? `${rawCurriculum.subStrandCode} ${rawCurriculum.subStrand}`
      : rawCurriculum.subStrand,
  };
  const mission = record(document.mission);
  if (!Array.isArray(mission.interactions) || mission.interactions.length !== 6) {
    throw new Error(`Grade 1 ${subjectLabel} mission ${entry.id} must contain six interactions.`);
  }
  return {
    id: text(document.id, entry.id),
    curriculum,
    mission: {
      title: text(mission.title, curriculum.subStrand),
      interactions: mission.interactions.map(record),
    },
  };
}

type Grade1AuthoredSubjectConfig = {
  contentDirectory: string;
  runtimeSubjectId: string;
  runtimeSubjectName: string;
  curriculumSubjectId: string;
};

/** Loads compiled, curriculum-grounded Grade 1 missions for any authored subject. */
export function loadGrade1AuthoredLessonSeeds(config: Grade1AuthoredSubjectConfig): Grade1MathematicsLessonSeed[] {
  const root = contentRoot(config.contentDirectory);
  const index = record(JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'))) as ContentIndex;
  if (!Array.isArray(index.missions) || index.missions.length === 0) {
    throw new Error(`Grade 1 ${config.runtimeSubjectName} content index contains no missions.`);
  }
  return index.missions
    .map(entry => readMission(root, entry, config.runtimeSubjectName))
    .sort(compareOfficial)
    .map(mission => ({
      key: mission.id,
      version: 1,
      subjectId: config.runtimeSubjectId,
      subjectName: config.runtimeSubjectName,
      grade: 'Grade 1',
      strand: curriculumLabel(mission.curriculum.strand),
      subStrand: curriculumLabel(mission.curriculum.subStrand),
      curriculumOutcomeId: mission.curriculum.outcomeId,
      curriculumLocationKey: curriculumLocationKey({
        country: mission.curriculum.country,
        curriculum: mission.curriculum.curriculum,
        release: mission.curriculum.revision,
        grade: mission.curriculum.grade,
        subject: config.curriculumSubjectId,
        subStrand: mission.curriculum.subStrandId || mission.curriculum.subStrand,
        outcome: mission.curriculum.outcomeId,
      }),
      title: mission.mission.title,
      shortTitle: mission.mission.title,
      objective: mission.curriculum.outcomeText,
      minutes: 10,
      steps: mission.mission.interactions.map((interaction, index) => stepFor(mission.id, interaction, index)),
    }));
}

/** Backward-compatible Mathematics entry point. */
export function loadGrade1MathematicsLessonSeeds(): Grade1MathematicsLessonSeed[] {
  return loadGrade1AuthoredLessonSeeds({
    contentDirectory: 'mathematics',
    runtimeSubjectId: 'math',
    runtimeSubjectName: 'Mathematics',
    curriculumSubjectId: 'mathematics',
  });
}

export function loadGrade1EnglishLessonSeeds(): Grade1MathematicsLessonSeed[] {
  return loadGrade1AuthoredLessonSeeds({
    contentDirectory: 'english',
    runtimeSubjectId: 'english',
    runtimeSubjectName: 'English',
    curriculumSubjectId: 'english_language_activities',
  });
}

export function loadGrade1KiswahiliLessonSeeds(): Grade1MathematicsLessonSeed[] {
  return loadGrade1AuthoredLessonSeeds({
    contentDirectory: 'kiswahili',
    runtimeSubjectId: 'kiswahili',
    runtimeSubjectName: 'Kiswahili',
    curriculumSubjectId: 'kiswahili_language_activities',
  });
}
