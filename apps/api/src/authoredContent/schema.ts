import { z } from 'zod';

const identitySegmentSchema = z.string().trim().min(1).max(160).superRefine((value, context) => {
  if (value === '.' || value === '..' || /[\/\\\0-\x1f]/u.test(value)) {
    context.addIssue({
      code: 'custom',
      message: 'Curriculum identity segments cannot contain path separators, control characters, or dot segments.',
    });
  }
});

/** Stable identity for one outcome in one published curriculum release. */
export const curriculumLocationSchema = z.object({
  country: identitySegmentSchema,
  curriculum: identitySegmentSchema,
  release: identitySegmentSchema,
  grade: identitySegmentSchema,
  subject: identitySegmentSchema,
  subStrand: identitySegmentSchema,
  outcome: identitySegmentSchema,
}).strict();

export type CurriculumLocation = z.infer<typeof curriculumLocationSchema>;

const LOCATION_FIELDS: ReadonlyArray<keyof CurriculumLocation> = [
  'country',
  'curriculum',
  'release',
  'grade',
  'subject',
  'subStrand',
  'outcome',
];

export function curriculumLocationKey(value: CurriculumLocation): string {
  const location = curriculumLocationSchema.parse(value);
  return LOCATION_FIELDS.map(field => encodeURIComponent(location[field].normalize('NFC'))).join('/');
}

const itemSchema = z.object({
  id: identitySegmentSchema,
  label: z.string().trim().min(1).max(240),
  assetId: identitySegmentSchema.optional(),
  accessibleDescription: z.string().trim().min(1).max(500).optional(),
}).strict();

const commonInteractionSchema = z.object({
  id: identitySegmentSchema,
  order: z.number().int().nonnegative(),
  phase: z.enum(['warm-up', 'model', 'guided-practice', 'independent-practice', 'transfer', 'exit-check']),
  prompt: z.string().trim().min(1).max(2_000),
  successMessage: z.string().trim().min(1).max(1_000),
  retryHint: z.string().trim().min(1).max(1_000),
  tapAlternative: z.string().trim().min(1).max(1_000).optional(),
});

const choiceInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('choice'),
  public: z.object({
    choices: z.array(itemSchema).min(2).max(12),
    selectionLimit: z.number().int().positive().max(12).default(1),
  }).strict(),
  private: z.object({
    acceptedChoiceIds: z.array(identitySegmentSchema).min(1).max(12),
  }).strict(),
}).strict();

const classifyInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('classify'),
  public: z.object({
    items: z.array(itemSchema).min(1).max(30),
    groups: z.array(itemSchema).min(2).max(12),
  }).strict(),
  private: z.object({
    assignments: z.record(identitySegmentSchema, identitySegmentSchema),
  }).strict(),
}).strict();

const matchInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('match'),
  public: z.object({
    items: z.array(itemSchema).min(2).max(30),
  }).strict(),
  private: z.object({
    pairs: z.array(z.tuple([identitySegmentSchema, identitySegmentSchema])).min(1).max(15),
  }).strict(),
}).strict();

const orderInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('order'),
  public: z.object({
    items: z.array(itemSchema).min(2).max(30),
    criterion: z.string().trim().min(1).max(500),
  }).strict(),
  private: z.object({
    orderedItemIds: z.array(identitySegmentSchema).min(2).max(30),
  }).strict(),
}).strict();

const tokenSchema = z.union([z.string().max(240), z.number().finite()]);

const patternInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('pattern'),
  public: z.object({
    sequence: z.array(tokenSchema.nullable()).min(1).max(50),
    availableTokens: z.array(tokenSchema).min(1).max(30),
    targetSlots: z.number().int().positive().max(30),
  }).strict(),
  private: z.object({
    completion: z.array(tokenSchema).min(1).max(30),
  }).strict(),
}).strict();

const numberManipulativesInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('number-manipulatives'),
  public: z.object({
    activity: z.enum(['count', 'represent', 'combine', 'take-away', 'number-line', 'measure']),
    min: z.number().finite(),
    max: z.number().finite(),
    initialValue: z.number().finite().optional(),
    unitLabel: z.string().trim().min(1).max(120).optional(),
    numberLine: z.object({
      start: z.number().finite(),
      end: z.number().finite(),
      highlightedValue: z.number().finite().optional(),
    }).strict().optional(),
    items: z.array(itemSchema).max(50).optional(),
  }).strict(),
  private: z.object({
    expectedValues: z.array(z.number().finite()).min(1).max(50),
  }).strict(),
}).strict();

const traceConstructInteractionSchema = commonInteractionSchema.extend({
  kind: z.literal('trace-construct'),
  public: z.object({
    activity: z.enum(['trace-path', 'construct']),
    targets: z.array(itemSchema).min(1).max(50),
  }).strict(),
  private: z.object({
    targetIds: z.array(identitySegmentSchema).min(1).max(50),
  }).strict(),
}).strict();

const authoredInteractionBaseSchema = z.discriminatedUnion('kind', [
  choiceInteractionSchema,
  classifyInteractionSchema,
  matchInteractionSchema,
  orderInteractionSchema,
  patternInteractionSchema,
  numberManipulativesInteractionSchema,
  traceConstructInteractionSchema,
]);

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter(value => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

/** Validates both shape and all references between public scene data and private grading data. */
export const authoredInteractionSchema = authoredInteractionBaseSchema.superRefine((interaction, context) => {
  const report = (message: string, path: Array<string | number>) => context.addIssue({ code: 'custom', message, path });
  if (interaction.kind === 'choice') {
    const choiceIds = interaction.public.choices.map(choice => choice.id);
    duplicateValues(choiceIds).forEach(id => report(`Duplicate choice id: ${id}`, ['public', 'choices']));
    interaction.private.acceptedChoiceIds
      .filter(id => !choiceIds.includes(id))
      .forEach(id => report(`Unknown accepted choice id: ${id}`, ['private', 'acceptedChoiceIds']));
    if (interaction.private.acceptedChoiceIds.length > interaction.public.selectionLimit) {
      report('Accepted choices cannot exceed the selection limit.', ['private', 'acceptedChoiceIds']);
    }
    return;
  }

  if (interaction.kind === 'classify') {
    const itemIds = interaction.public.items.map(item => item.id);
    const groupIds = interaction.public.groups.map(group => group.id);
    duplicateValues(itemIds).forEach(id => report(`Duplicate item id: ${id}`, ['public', 'items']));
    duplicateValues(groupIds).forEach(id => report(`Duplicate group id: ${id}`, ['public', 'groups']));
    const assignmentIds = Object.keys(interaction.private.assignments);
    itemIds.filter(id => !assignmentIds.includes(id)).forEach(id => report(`Missing assignment for item: ${id}`, ['private', 'assignments']));
    assignmentIds.filter(id => !itemIds.includes(id)).forEach(id => report(`Assignment references unknown item: ${id}`, ['private', 'assignments']));
    Object.values(interaction.private.assignments)
      .filter(id => !groupIds.includes(id))
      .forEach(id => report(`Assignment references unknown group: ${id}`, ['private', 'assignments']));
    return;
  }

  if (interaction.kind === 'match') {
    const itemIds = interaction.public.items.map(item => item.id);
    duplicateValues(itemIds).forEach(id => report(`Duplicate item id: ${id}`, ['public', 'items']));
    const pairedIds = interaction.private.pairs.flat();
    pairedIds.filter(id => !itemIds.includes(id)).forEach(id => report(`Pair references unknown item: ${id}`, ['private', 'pairs']));
    duplicateValues(pairedIds).forEach(id => report(`Item appears in more than one pair: ${id}`, ['private', 'pairs']));
    return;
  }

  if (interaction.kind === 'order') {
    const itemIds = interaction.public.items.map(item => item.id);
    duplicateValues(itemIds).forEach(id => report(`Duplicate item id: ${id}`, ['public', 'items']));
    const orderedIds = interaction.private.orderedItemIds;
    duplicateValues(orderedIds).forEach(id => report(`Duplicate ordered item id: ${id}`, ['private', 'orderedItemIds']));
    if (itemIds.length !== orderedIds.length || itemIds.some(id => !orderedIds.includes(id))) {
      report('Ordered item ids must be an exact permutation of the public items.', ['private', 'orderedItemIds']);
    }
    return;
  }

  if (interaction.kind === 'pattern') {
    if (interaction.private.completion.length !== interaction.public.targetSlots) {
      report('Pattern completion length must equal targetSlots.', ['private', 'completion']);
    }
    return;
  }

  if (interaction.kind === 'number-manipulatives') {
    if (interaction.public.min > interaction.public.max) {
      report('Minimum cannot exceed maximum.', ['public', 'min']);
    }
    interaction.private.expectedValues
      .filter(value => value < interaction.public.min || value > interaction.public.max)
      .forEach(value => report(`Expected value is outside the configured range: ${value}`, ['private', 'expectedValues']));
    const line = interaction.public.numberLine;
    if (line && line.start >= line.end) report('Number line start must be less than its end.', ['public', 'numberLine']);
    return;
  }

  const targetIds = interaction.public.targets.map(target => target.id);
  duplicateValues(targetIds).forEach(id => report(`Duplicate target id: ${id}`, ['public', 'targets']));
  interaction.private.targetIds
    .filter(id => !targetIds.includes(id))
    .forEach(id => report(`Unknown trace target id: ${id}`, ['private', 'targetIds']));
});

export type AuthoredInteraction = z.infer<typeof authoredInteractionSchema>;

export const authoredMissionSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.number().int().positive(),
  location: curriculumLocationSchema,
  title: z.string().trim().min(1).max(500),
  objective: z.string().trim().min(1).max(2_000),
  interactions: z.array(authoredInteractionSchema).min(1).max(100),
}).strict().superRefine((mission, context) => {
  const ids = new Set<string>();
  const orders = new Set<number>();
  mission.interactions.forEach((interaction, index) => {
    if (ids.has(interaction.id)) {
      context.addIssue({ code: 'custom', path: ['interactions', index, 'id'], message: `Duplicate interaction id: ${interaction.id}` });
    }
    if (orders.has(interaction.order)) {
      context.addIssue({ code: 'custom', path: ['interactions', index, 'order'], message: `Duplicate interaction order: ${interaction.order}` });
    }
    ids.add(interaction.id);
    orders.add(interaction.order);
  });
});

export type AuthoredMission = z.infer<typeof authoredMissionSchema>;

export const authoredContentManifestSchema = z.object({
  schemaVersion: z.literal(1),
  missions: z.array(z.object({
    location: curriculumLocationSchema,
    path: z.string().trim().min(1).max(1_000),
    position: z.number().int().nonnegative().optional(),
  }).strict()).min(1),
}).strict();

export type AuthoredContentManifest = z.infer<typeof authoredContentManifestSchema>;

export type PublishedInteraction = Omit<AuthoredInteraction, 'private'>;

export type PublishedMission = Omit<AuthoredMission, 'interactions'> & {
  locationKey: string;
  interactions: PublishedInteraction[];
};

export type GradingMission = Pick<AuthoredMission, 'schemaVersion' | 'contentVersion' | 'location'> & {
  locationKey: string;
  interactions: Array<Pick<AuthoredInteraction, 'id' | 'kind' | 'private'>>;
};
