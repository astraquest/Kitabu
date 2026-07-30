import { lowerPrimaryLessonSeeds } from './progressiveLearningLowerPrimary.js';
import { loadGrade1MathematicsLessonSeeds } from './grade1MathematicsContent.js';
import {
  evaluateLowerPrimaryInteraction,
  type LowerPrimaryInteractionDefinition,
} from './interactiveLearning/lowerPrimaryClassifySortMatchPattern.js';
import { grade4LessonSeeds } from './progressiveLearningGrade4.js';
import { grade5LessonSeeds } from './progressiveLearningGrade5.js';
import { grade6LessonSeeds } from './progressiveLearningGrade6.js';
import { grade7LessonSeeds } from './progressiveLearningGrade7.js';
import { grade8LessonSeeds } from './progressiveLearningGrade8.js';
import { grade10LessonSeeds, grade11LessonSeeds } from './progressiveLearningSenior.js';

export type LearningObjectKind =
  | 'elephant'
  | 'zebra'
  | 'giraffe'
  | 'lion'
  | 'rhino'
  | 'flamingo'
  | 'gazelle'
  | 'ostrich'
  | 'goat'
  | 'chicken'
  | 'mango'
  | 'banana'
  | 'basket'
  | 'book'
  | 'seedling'
  | 'water'
  | 'soil'
  | 'sun'
  | 'shield'
  | 'drum'
  | 'paint'
  | 'robot'
  | 'chair'
  | 'cat'
  | 'pen'
  | 'hat'
  | 'table'
  | 'pencil'
  | 'face'
  | 'teeth'
  | 'hand'
  | 'foot'
  | 'hair'
  | 'leaf'
  | 'flower'
  | 'stem'
  | 'roots'
  | 'mystery';

export type LearningCard = {
  id: string;
  label: string;
  detail?: string;
  accent?: 'blue' | 'green' | 'gold' | 'coral' | 'purple' | 'neutral';
  state?: 'normal' | 'selected' | 'muted' | 'warning';
};

export type LearningVisualSpec =
  | {
      kind: 'arithmetic';
      leftOperand: number;
      operator: '+' | '-' | '×' | '÷';
      rightOperand: number;
      caption: string;
    }
  | {
      kind: 'picture_word';
      object: Extract<LearningObjectKind, 'chair' | 'cat' | 'sun' | 'pen' | 'hat' | 'book' | 'table' | 'pencil'>;
      wordPattern: string;
      caption: string;
    }
  | {
      kind: 'picture_choice';
      object: LearningObjectKind;
      caption: string;
    }
  | {
      kind: 'balance';
      left: Array<{ object: LearningObjectKind; count: number; label?: string }>;
      right: Array<{ object: LearningObjectKind; count: number; label?: string }>;
      balanced: boolean;
      caption: string;
    }
  | {
      kind: 'groups';
      object: LearningObjectKind;
      groups: number;
      each: number | 'x';
      total?: number;
      caption: string;
    }
  | {
      kind: 'market';
      items: Array<{ object: LearningObjectKind; count: number; price?: number; label: string }>;
      caption: string;
    }
  | {
      kind: 'story';
      objects: Array<{ object: LearningObjectKind; count: number; label?: string }>;
      caption: string;
    }
  | {
      kind: 'cards';
      cards: LearningCard[];
      layout: 'row' | 'grid' | 'stack';
      instruction?: string;
      caption: string;
    }
  | {
      kind: 'sequence';
      steps: Array<{ id: string; label: string; detail?: string }>;
      activeIndex?: number;
      caption: string;
    }
  | {
      kind: 'scene';
      setting: 'classroom' | 'garden' | 'home' | 'market' | 'community' | 'nature' | 'studio' | 'computer_lab';
      elements: Array<{ id: string; label: string; count?: number; state?: 'normal' | 'highlighted' | 'muted' }>;
      caption: string;
    }
  | {
      kind: 'number_line';
      min: number;
      max: number;
      markers: Array<{ value: number; label?: string }>;
      jump?: { from: number; to: number; label?: string };
      caption: string;
    }
  | {
      kind: 'classify';
      buckets: Array<{ id: string; label: string }>;
      items: LearningCard[];
      caption: string;
    };

export type LearningInteractionItem = {
  id: string;
  label: string;
  detail?: string;
};

export type LearningInteraction =
  | {
      kind: 'sequence_builder';
      instruction: string;
      items: LearningInteractionItem[];
    }
  | {
      kind: 'bucket_sort';
      instruction: string;
      buckets: Array<{ id: string; label: string }>;
      items: LearningInteractionItem[];
    }
  | {
      kind: 'choice_sprint';
      instruction: string;
      items: LearningInteractionItem[];
    };

export type ProgressiveComponentScene = Record<string, unknown>;

export type ProgressiveLessonStep = {
  id: string;
  phase: 'guided' | 'checkpoint';
  prompt: string;
  supportText?: string;
  options: string[];
  interaction?: LearningInteraction;
  componentScene?: ProgressiveComponentScene;
  visual: LearningVisualSpec;
  hint: string;
};

export type ProgressiveLessonPublic = {
  lessonKey: string;
  lessonVersion: number;
  subjectId: string;
  subjectName: string;
  grade: string;
  strand: string;
  subStrand: string;
  curriculumTopicCode?: string;
  /** Stable official learning-outcome ID when a curriculum topic has outcome missions. */
  curriculumOutcomeId?: string;
  /** Release-scoped authored-content identity used by registries and diagnostics. */
  curriculumLocationKey?: string;
  title: string;
  shortTitle: string;
  objective: string;
  estimatedMinutes: number;
  steps: ProgressiveLessonStep[];
};

export type ProgressiveLessonPrivate = ProgressiveLessonPublic & {
  answers: Record<
    string,
    {
      answer: string;
      misconception: string;
      incorrectMessage: string;
      successMessage: string;
      lowerPrimaryInteraction?: LowerPrimaryInteractionDefinition;
    }
  >;
};

export type ProgressiveLessonProgressRecord = {
  lesson_key: string;
  curriculum_topic_id?: string | null;
  best_score: number;
  status: 'in_progress' | 'completed' | 'needs_practice';
  attempt_count: number;
};

export type ProgressivePathNode = {
  id: string;
  lessonKey: string | null;
  lessonVersion: number | null;
  title: string;
  objective: string;
  estimatedMinutes: number;
  position: number;
  strandId?: string;
  strandNumber?: string;
  strandTitle?: string;
  subStrandId?: string;
  subStrandNumber?: string;
  curriculumTopicId?: string;
  curriculumTopicKey?: string;
  curriculumOutcomeId?: string;
  curriculumLocationKey?: string;
  status: 'completed' | 'current' | 'locked' | 'needs_practice' | 'content_pending';
  availability: 'published' | 'content_pending';
  bestScore: number | null;
  attemptCount: number;
};

export type StepInput = Omit<ProgressiveLessonStep, 'id'> & {
  answer: string;
  misconception: string;
  incorrectMessage: string;
  successMessage: string;
  /** Private deterministic grading data for authored Grade 1 object activities. */
  lowerPrimaryInteraction?: LowerPrimaryInteractionDefinition;
};

export type ProgressiveLessonSeed = {
  key: string;
  version?: number;
  subjectId?: string;
  subjectName?: string;
  grade?: string;
  strand?: string;
  subStrand?: string;
  curriculumTopicCode?: string;
  curriculumOutcomeId?: string;
  curriculumLocationKey?: string;
  title: string;
  shortTitle: string;
  objective: string;
  minutes: number;
  steps: StepInput[];
};

/** Lowercase URL-safe identifiers shared by every authored subject. */
export const PROGRESSIVE_RUNTIME_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
export const PROGRESSIVE_LESSON_KEY_MAX_LENGTH = 120;

export function serializeProgressiveSequenceAnswer(itemIds: string[]) {
  return `sequence:${itemIds.join('>')}`;
}

export function serializeProgressiveClassifyAnswer(assignments: Record<string, string[]>) {
  return `classify:${Object.keys(assignments)
    .sort()
    .map(bucketId => `${bucketId}=${[...assignments[bucketId]].sort().join(',')}`)
    .join('|')}`;
}

export function serializeProgressiveChoiceAnswer(itemId: string) {
  return `choice:${itemId}`;
}

export function createProgressiveLesson(input: ProgressiveLessonSeed): ProgressiveLessonPrivate {
  if (
    input.key.length > PROGRESSIVE_LESSON_KEY_MAX_LENGTH ||
    !PROGRESSIVE_RUNTIME_ID_PATTERN.test(input.key)
  ) {
    throw new Error(`Invalid progressive lesson key: ${input.key}`);
  }
  const answers: ProgressiveLessonPrivate['answers'] = {};
  const steps = input.steps.map((step, index) => {
    const id = `${input.key}-step-${index + 1}`;
    answers[id] = {
      answer: step.answer,
      misconception: step.misconception,
      incorrectMessage: step.incorrectMessage,
      successMessage: step.successMessage,
      lowerPrimaryInteraction: step.lowerPrimaryInteraction,
    };
    const {
      answer: _answer,
      misconception: _misconception,
      incorrectMessage: _incorrectMessage,
      successMessage: _successMessage,
      lowerPrimaryInteraction: _lowerPrimaryInteraction,
      ...publicStep
    } = step;
    return { id, ...publicStep };
  });

  return {
    lessonKey: input.key,
    lessonVersion: input.version ?? 1,
    subjectId: input.subjectId ?? 'math',
    subjectName: input.subjectName ?? 'Mathematics',
    grade: input.grade ?? 'Grade 7',
    strand: input.strand ?? 'Algebra',
    subStrand: input.subStrand ?? 'Linear Equations',
    curriculumTopicCode: input.curriculumTopicCode,
    curriculumOutcomeId: input.curriculumOutcomeId,
    curriculumLocationKey: input.curriculumLocationKey,
    title: input.title,
    shortTitle: input.shortTitle,
    objective: input.objective,
    estimatedMinutes: input.minutes,
    steps,
    answers
  };
}

const lessons: ProgressiveLessonPrivate[] = [
  createProgressiveLesson({
    key: 'math-g7-equality-balance',
    title: 'Equality as balance',
    shortTitle: 'Equality as balance',
    objective: 'Understand that both sides of an equation have the same value.',
    minutes: 7,
    steps: [
      {
        phase: 'guided',
        prompt: 'The scale is balanced. One elephant has the same mass as how many zebras?',
        options: ['2 zebras', '4 zebras', '6 zebras'],
        visual: {
          kind: 'balance',
          left: [{ object: 'elephant', count: 1 }],
          right: [{ object: 'zebra', count: 4 }],
          balanced: true,
          caption: 'One elephant balances four zebras.'
        },
        hint: 'Balanced means the total value on the left equals the total value on the right.',
        successMessage: 'Exactly. A balanced scale shows equal values.',
        answer: '4 zebras',
        misconception: 'EQUALITY_VISUAL_COUNT',
        incorrectMessage: 'Look at every zebra on the right pan and count once more.'
      },
      {
        phase: 'guided',
        prompt: 'A mystery animal and 2 flamingos balance 7 flamingos. What is the mystery value?',
        options: ['5', '7', '9'],
        visual: {
          kind: 'balance',
          left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'flamingo', count: 2 }],
          right: [{ object: 'flamingo', count: 7 }],
          balanced: true,
          caption: 'x plus two flamingos balances seven flamingos.'
        },
        hint: 'Remove the same 2 flamingos from both sides. How many remain on the right?',
        successMessage: 'Great balancing. x must be 5.',
        answer: '5',
        misconception: 'EQUALITY_ONE_SIDE_ONLY',
        incorrectMessage: 'Keep the scale level: remove the same amount from both sides.'
      },
      {
        phase: 'checkpoint',
        prompt: 'x + 3 zebras balances 8 zebras. What is x?',
        options: ['3', '5', '11'],
        visual: {
          kind: 'balance',
          left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'zebra', count: 3 }],
          right: [{ object: 'zebra', count: 8 }],
          balanced: true,
          caption: 'A mystery value and three zebras balance eight zebras.'
        },
        hint: 'Think about the difference between 8 and 3.',
        successMessage: 'Correct. 5 + 3 equals 8.',
        answer: '5',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Use subtraction to undo the three zebras beside x.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Which equation matches this balanced scale?',
        options: ['x + 2 = 6', 'x - 2 = 6', '2x = 6'],
        visual: {
          kind: 'balance',
          left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'gazelle', count: 2 }],
          right: [{ object: 'gazelle', count: 6 }],
          balanced: true,
          caption: 'x and two gazelles balance six gazelles.'
        },
        hint: 'The left pan has one x together with two more objects.',
        successMessage: 'Yes. Together means addition.',
        answer: 'x + 2 = 6',
        misconception: 'EQUATION_FROM_SCENE',
        incorrectMessage: 'Read each pan from left to right and keep the equals sign at the balance point.'
      },
      {
        phase: 'checkpoint',
        prompt: 'If we remove 2 from the left pan, what keeps the scale balanced?',
        options: ['Remove 2 from the right', 'Add 2 to the right', 'Do nothing'],
        visual: {
          kind: 'balance',
          left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'ostrich', count: 2 }],
          right: [{ object: 'ostrich', count: 9 }],
          balanced: true,
          caption: 'Both pans must change in the same way.'
        },
        hint: 'A scale stays level when we make the same change on both sides.',
        successMessage: 'Exactly. Same operation, both sides.',
        answer: 'Remove 2 from the right',
        misconception: 'EQUALITY_ONE_SIDE_ONLY',
        incorrectMessage: 'Whatever leaves one side must also leave the other.'
      }
    ]
  }),
  createProgressiveLesson({
    key: 'math-g7-forming-equations',
    title: 'Forming equations from stories',
    shortTitle: 'Forming equations',
    objective: 'Translate everyday situations into equations with one unknown.',
    minutes: 8,
    steps: [
      {
        phase: 'guided',
        prompt: 'Some zebras were drinking. 3 more arrived, making 9. Which equation tells the story?',
        options: ['x + 3 = 9', 'x - 3 = 9', '3x = 9'],
        visual: {
          kind: 'story',
          objects: [{ object: 'zebra', count: 3, label: '3 arrived' }, { object: 'mystery', count: 1, label: 'x were there' }],
          caption: 'An unknown group plus three new zebras makes nine.'
        },
        hint: 'The word “more arrived” means add 3 to the unknown starting number.',
        successMessage: 'Well translated: x + 3 = 9.',
        answer: 'x + 3 = 9',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'Focus on what changed: three zebras joined the starting group.'
      },
      {
        phase: 'guided',
        prompt: 'A keeper shared 12 mangoes equally among x giraffes. Each giraffe got 3. Which equation fits?',
        options: ['12 ÷ x = 3', '12 + x = 3', '3 - x = 12'],
        visual: {
          kind: 'story',
          objects: [{ object: 'mango', count: 12 }, { object: 'giraffe', count: 3, label: '3 each' }],
          caption: 'Twelve mangoes are shared equally.'
        },
        hint: 'Sharing equally is division.',
        successMessage: 'Correct. The total is divided by the number of giraffes.',
        answer: '12 ÷ x = 3',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'Look for the operation described by “shared equally”.'
      },
      {
        phase: 'checkpoint',
        prompt: 'x goats plus 4 goats makes 11 goats. Choose the equation.',
        options: ['x + 4 = 11', '4x = 11', 'x - 4 = 11'],
        visual: {
          kind: 'story',
          objects: [{ object: 'mystery', count: 1, label: 'x goats' }, { object: 'goat', count: 4 }],
          caption: 'An unknown herd grows by four to make eleven.'
        },
        hint: 'The two groups join to make the total.',
        successMessage: 'That equation matches the herd story.',
        answer: 'x + 4 = 11',
        misconception: 'EQUATION_FROM_SCENE',
        incorrectMessage: 'The unknown herd and four more goats are added together.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Five equal baskets hold 20 mangoes altogether. Which equation finds x mangoes per basket?',
        options: ['5x = 20', '5 + x = 20', '20x = 5'],
        visual: {
          kind: 'groups',
          object: 'mango',
          groups: 5,
          each: 'x',
          total: 20,
          caption: 'Five equal baskets contain twenty mangoes.'
        },
        hint: 'Five groups of x means 5 multiplied by x.',
        successMessage: 'Right. 5x represents five equal groups.',
        answer: '5x = 20',
        misconception: 'COEFFICIENT_AS_ADDEND',
        incorrectMessage: 'Equal groups use multiplication, not addition.'
      },
      {
        phase: 'checkpoint',
        prompt: 'A flock had x flamingos. 6 flew away and 10 remained. Choose the equation.',
        options: ['x - 6 = 10', 'x + 6 = 10', '6x = 10'],
        visual: {
          kind: 'story',
          objects: [{ object: 'mystery', count: 1, label: 'starting flock x' }, { object: 'flamingo', count: 6, label: 'flew away' }],
          caption: 'Six leave an unknown starting flock and ten remain.'
        },
        hint: '“Flew away” reduces the starting number.',
        successMessage: 'Correct. Leaving is represented by subtraction.',
        answer: 'x - 6 = 10',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'Start with x, then subtract the six that flew away.'
      }
    ]
  }),
  createProgressiveLesson({
    key: 'math-g7-undo-add-subtract',
    title: 'Undoing addition and subtraction',
    shortTitle: 'Undo + and −',
    objective: 'Use inverse operations to isolate an unknown.',
    minutes: 8,
    steps: [
      {
        phase: 'guided',
        prompt: 'Solve x + 4 = 12. What operation frees x?',
        options: ['Subtract 4', 'Add 4', 'Multiply by 4'],
        visual: { kind: 'balance', left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'chicken', count: 4 }], right: [{ object: 'chicken', count: 12 }], balanced: true, caption: 'Undo the four chickens beside x.' },
        hint: 'Subtraction undoes addition.',
        successMessage: 'Yes. Subtract 4 from both sides.',
        answer: 'Subtract 4',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Choose the operation that reverses adding four.'
      },
      {
        phase: 'guided',
        prompt: 'Solve x - 5 = 8.',
        options: ['x = 3', 'x = 13', 'x = 40'],
        visual: { kind: 'story', objects: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'gazelle', count: 5, label: 'left' }, { object: 'gazelle', count: 8, label: 'remain' }], caption: 'Five leave and eight remain.' },
        hint: 'Add back the five that left.',
        successMessage: 'Correct. 8 + 5 = 13.',
        answer: 'x = 13',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Undo subtracting five by adding five.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve x + 7 = 15.',
        options: ['x = 8', 'x = 22', 'x = 2'],
        visual: { kind: 'balance', left: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'flamingo', count: 7 }], right: [{ object: 'flamingo', count: 15 }], balanced: true, caption: 'x and seven balance fifteen.' },
        hint: 'Find the difference between fifteen and seven.',
        successMessage: 'Correct. 8 + 7 = 15.',
        answer: 'x = 8',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Subtract seven from both sides.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve x - 9 = 6.',
        options: ['x = 15', 'x = 3', 'x = 54'],
        visual: { kind: 'story', objects: [{ object: 'mystery', count: 1, label: 'x rhinos' }, { object: 'rhino', count: 9, label: 'moved away' }, { object: 'rhino', count: 6, label: 'remain' }], caption: 'Nine leave; six remain.' },
        hint: 'Rebuild the starting group by adding.',
        successMessage: 'Yes. The starting group was 15.',
        answer: 'x = 15',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Add nine back to the six that remained.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Which check proves x = 9 solves x + 6 = 15?',
        options: ['9 + 6 = 15', '9 - 6 = 15', '15 + 6 = 9'],
        visual: { kind: 'story', objects: [{ object: 'zebra', count: 9 }, { object: 'zebra', count: 6 }], caption: 'Substitute the value back into the original equation.' },
        hint: 'Replace x with 9 without changing the original operation.',
        successMessage: 'Perfect check: both sides equal 15.',
        answer: '9 + 6 = 15',
        misconception: 'SUBSTITUTION_CHECK',
        incorrectMessage: 'Keep the original plus sign when substituting.'
      }
    ]
  }),
  createProgressiveLesson({
    key: 'math-g7-undo-multiply-divide',
    title: 'Undoing multiplication and division',
    shortTitle: 'Undo × and ÷',
    objective: 'Solve equal-group equations using inverse operations.',
    minutes: 8,
    steps: [
      {
        phase: 'guided',
        prompt: 'Three equal baskets contain 18 mangoes. How many are in each basket?',
        options: ['6', '15', '54'],
        visual: { kind: 'groups', object: 'mango', groups: 3, each: 'x', total: 18, caption: 'Three equal groups make eighteen.' },
        hint: 'Divide the total by the number of equal groups.',
        successMessage: 'Correct. 18 ÷ 3 = 6.',
        answer: '6',
        misconception: 'MULTIPLICATION_AS_ADDITION',
        incorrectMessage: 'Use division to find the size of one equal group.'
      },
      {
        phase: 'guided',
        prompt: 'Solve x ÷ 4 = 5.',
        options: ['x = 20', 'x = 9', 'x = 1'],
        visual: { kind: 'groups', object: 'banana', groups: 4, each: 5, total: 20, caption: 'Four equal groups of five rebuild the total.' },
        hint: 'Multiplication undoes division.',
        successMessage: 'Exactly. 5 × 4 = 20.',
        answer: 'x = 20',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Multiply both sides by four.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve 4x = 28.',
        options: ['x = 7', 'x = 24', 'x = 112'],
        visual: { kind: 'groups', object: 'giraffe', groups: 4, each: 'x', total: 28, caption: 'Four equal giraffe groups total twenty-eight.' },
        hint: 'Divide twenty-eight into four equal groups.',
        successMessage: 'Correct. Each group is 7.',
        answer: 'x = 7',
        misconception: 'COEFFICIENT_AS_ADDEND',
        incorrectMessage: '4x means four equal groups of x.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve x ÷ 6 = 3.',
        options: ['x = 18', 'x = 9', 'x = 2'],
        visual: { kind: 'groups', object: 'goat', groups: 6, each: 3, total: 18, caption: 'Six groups hold three goats each.' },
        hint: 'Rebuild the total with 6 × 3.',
        successMessage: 'Yes. x is 18.',
        answer: 'x = 18',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Multiplication reverses dividing by six.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Which operation should you apply to both sides of 5x = 35?',
        options: ['Divide by 5', 'Subtract 5', 'Multiply by 5'],
        visual: { kind: 'groups', object: 'zebra', groups: 5, each: 'x', total: 35, caption: 'Five equal groups make thirty-five.' },
        hint: 'Undo multiplication by five.',
        successMessage: 'Right. Dividing both sides isolates x.',
        answer: 'Divide by 5',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Use the inverse of multiplication.'
      }
    ]
  }),
  createProgressiveLesson({
    key: 'math-g7-equations-in-life',
    title: 'Equations in everyday life',
    shortTitle: 'Real-life equations',
    objective: 'Use equations to solve shopping and conservation stories.',
    minutes: 9,
    steps: [
      {
        phase: 'guided',
        prompt: 'At a market, a basket and KSh 40 cost KSh 160 altogether. What is the basket price?',
        options: ['KSh 120', 'KSh 200', 'KSh 40'],
        visual: { kind: 'market', items: [{ object: 'basket', count: 1, label: 'Basket = x' }, { object: 'mango', count: 1, price: 40, label: 'Extra cost' }], caption: 'x + 40 = 160' },
        hint: 'Subtract the extra KSh 40 from the total.',
        successMessage: 'Correct. The basket costs KSh 120.',
        answer: 'KSh 120',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'The total includes the basket and KSh 40, so remove the extra amount.'
      },
      {
        phase: 'guided',
        prompt: 'Four learners pay the same amount for a KSh 200 park ticket bundle. How much does each pay?',
        options: ['KSh 50', 'KSh 196', 'KSh 800'],
        visual: { kind: 'market', items: [{ object: 'lion', count: 1, price: 200, label: 'Park bundle' }, { object: 'mystery', count: 4, label: '4 equal shares' }], caption: '4x = 200' },
        hint: 'Divide the bundle total into four equal shares.',
        successMessage: 'Yes. Each learner pays KSh 50.',
        answer: 'KSh 50',
        misconception: 'EQUAL_SHARING',
        incorrectMessage: 'Equal sharing means divide the total by four.'
      },
      {
        phase: 'checkpoint',
        prompt: 'A wildlife club had x members. 7 joined and now there are 25. Find x.',
        options: ['18', '32', '7'],
        visual: { kind: 'story', objects: [{ object: 'mystery', count: 1, label: 'x members' }, { object: 'gazelle', count: 7, label: 'joined' }], caption: 'x + 7 = 25' },
        hint: 'Undo the seven who joined.',
        successMessage: 'Correct. The club started with 18 members.',
        answer: '18',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'Subtract the new members from the final total.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Three identical notebooks cost KSh 270. What does one notebook cost?',
        options: ['KSh 90', 'KSh 267', 'KSh 810'],
        visual: { kind: 'market', items: [{ object: 'basket', count: 3, price: 270, label: '3 notebooks total' }], caption: '3x = 270' },
        hint: 'Find one equal share of the total cost.',
        successMessage: 'Right. 270 ÷ 3 = 90.',
        answer: 'KSh 90',
        misconception: 'EQUAL_SHARING',
        incorrectMessage: 'Divide the total price by the number of identical items.'
      },
      {
        phase: 'checkpoint',
        prompt: 'After 12 trees were planted, a school had 45 trees. How many were there before?',
        options: ['33', '57', '12'],
        visual: { kind: 'story', objects: [{ object: 'mystery', count: 1, label: 'starting trees x' }, { object: 'mango', count: 12, label: 'planted' }], caption: 'x + 12 = 45' },
        hint: 'Remove the newly planted trees from the final number.',
        successMessage: 'Correct. There were 33 trees before.',
        answer: '33',
        misconception: 'STORY_OPERATION',
        incorrectMessage: 'Use the inverse operation: 45 minus 12.'
      }
    ]
  }),
  createProgressiveLesson({
    key: 'math-g7-linear-equations-review',
    title: 'Linear equations adventure',
    shortTitle: 'Adventure review',
    objective: 'Combine modelling, inverse operations, and checking.',
    minutes: 10,
    steps: [
      {
        phase: 'guided',
        prompt: 'A rhino and 3 zebras balance 11 zebras. What is the rhino value?',
        options: ['8', '14', '3'],
        visual: { kind: 'balance', left: [{ object: 'rhino', count: 1, label: 'x' }, { object: 'zebra', count: 3 }], right: [{ object: 'zebra', count: 11 }], balanced: true, caption: 'x + 3 = 11' },
        hint: 'Remove three zebras from both sides.',
        successMessage: 'Strong start. The rhino represents 8.',
        answer: '8',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Subtract the three zebras beside the rhino.'
      },
      {
        phase: 'guided',
        prompt: 'Six safari vans carry 42 learners equally. How many are in each van?',
        options: ['7', '36', '252'],
        visual: { kind: 'groups', object: 'lion', groups: 6, each: 'x', total: 42, caption: 'Six equal groups make forty-two.' },
        hint: 'Divide the total into six equal groups.',
        successMessage: 'Correct. There are 7 learners in each van.',
        answer: '7',
        misconception: 'EQUAL_SHARING',
        incorrectMessage: 'Use 42 ÷ 6.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve 3x = 24.',
        options: ['x = 8', 'x = 21', 'x = 72'],
        visual: { kind: 'groups', object: 'ostrich', groups: 3, each: 'x', total: 24, caption: 'Three equal groups total twenty-four.' },
        hint: 'Divide both sides by three.',
        successMessage: 'Correct. x = 8.',
        answer: 'x = 8',
        misconception: 'COEFFICIENT_AS_ADDEND',
        incorrectMessage: '3x is three groups of x.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Solve x - 14 = 19.',
        options: ['x = 33', 'x = 5', 'x = 266'],
        visual: { kind: 'story', objects: [{ object: 'mystery', count: 1, label: 'x' }, { object: 'flamingo', count: 14, label: 'left' }, { object: 'flamingo', count: 19, label: 'remain' }], caption: 'Fourteen leave; nineteen remain.' },
        hint: 'Add the group that left back to the group that remains.',
        successMessage: 'Yes. 19 + 14 = 33.',
        answer: 'x = 33',
        misconception: 'INVERSE_OPERATION_WRONG',
        incorrectMessage: 'Undo subtracting fourteen by adding fourteen.'
      },
      {
        phase: 'checkpoint',
        prompt: 'Which value makes 2x + 3 = 15 true?',
        options: ['x = 6', 'x = 9', 'x = 24'],
        visual: { kind: 'balance', left: [{ object: 'mystery', count: 2, label: '2x' }, { object: 'gazelle', count: 3 }], right: [{ object: 'gazelle', count: 15 }], balanced: true, caption: 'Two equal unknown groups and three balance fifteen.' },
        hint: 'First remove three. Then split the remaining twelve into two equal groups.',
        successMessage: 'Excellent. 2 × 6 + 3 = 15.',
        answer: 'x = 6',
        misconception: 'TWO_STEP_ORDER',
        incorrectMessage: 'Undo addition before dividing the two equal x groups.'
      }
    ]
  })
];

const allLessons = [
  // Grade 1 Mathematics is compiled from the DB-grounded mission manifest,
  // rather than the legacy three-topic lower-primary sample chapters.
  ...lowerPrimaryLessonSeeds
    .filter(seed => !(seed.grade === 'Grade 1' && seed.subjectId === 'math'))
    .map(createProgressiveLesson),
  ...loadGrade1MathematicsLessonSeeds().map(createProgressiveLesson),
  ...grade4LessonSeeds.map(createProgressiveLesson),
  ...grade5LessonSeeds.map(createProgressiveLesson),
  ...grade6LessonSeeds.map(createProgressiveLesson),
  ...grade7LessonSeeds.map(createProgressiveLesson),
  ...grade8LessonSeeds.map(createProgressiveLesson),
  ...grade10LessonSeeds.map(createProgressiveLesson),
  ...grade11LessonSeeds.map(createProgressiveLesson),
  ...lessons
];

const lessonByKey = new Map<string, ProgressiveLessonPrivate>();
for (const lesson of allLessons) {
  if (lessonByKey.has(lesson.lessonKey)) {
    throw new Error(`Duplicate progressive lesson key: ${lesson.lessonKey}`);
  }
  lessonByKey.set(lesson.lessonKey, lesson);
}

export function listProgressiveLessonDefinitions(filters?: { grade?: string; subjectId?: string }) {
  return allLessons
    .filter(lesson => !filters?.grade || lesson.grade === filters.grade)
    .filter(
      lesson =>
        !filters?.subjectId ||
        lesson.subjectId === normalizeProgressiveSubjectId(filters.subjectId, filters.grade)
    )
    .map(({ answers: _answers, ...lesson }) => lesson);
}

export function getProgressiveLessonDefinition(lessonKey: string) {
  const lesson = lessonByKey.get(lessonKey);
  return lesson ? toProgressiveLessonPublic(lesson) : null;
}

export function getProgressiveLessonPrivateDefinition(lessonKey: string) {
  return lessonByKey.get(lessonKey) ?? null;
}

export function toProgressiveLessonPublic(lesson: ProgressiveLessonPrivate) {
  const { answers: _answers, ...publicLesson } = lesson;
  return publicLesson;
}

export function gradeProgressiveLessonDefinitionStep(
  lesson: ProgressiveLessonPrivate,
  stepId: string,
  response: string
) {
  const answer = lesson?.answers[stepId];
  const step = lesson?.steps.find(candidate => candidate.id === stepId);
  if (!lesson || !answer || !step) {
    return null;
  }

  if (answer.lowerPrimaryInteraction) {
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(response);
    } catch {
      parsedResponse = null;
    }
    const result = evaluateLowerPrimaryInteraction(answer.lowerPrimaryInteraction, parsedResponse);
    return {
      isCorrect: result.correct,
      phase: step.phase,
      misconceptionCode: result.correct ? null : answer.misconception,
      message: result.feedback,
      hint: result.correct ? step.hint : result.retryHint ?? step.hint,
    };
  }

  const isNumericStructuredResponse =
    (step.componentScene as { component?: { componentId?: unknown }; props?: { mode?: unknown } } | undefined)
      ?.component?.componentId === 'structured-response' &&
    (step.componentScene as { props?: { mode?: unknown } } | undefined)?.props?.mode === 'numeric';
  const normalize = (value: string) => {
    const text = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-KE');
    return isNumericStructuredResponse ? text.replace(/,/g, '') : text;
  };
  const normalizedResponse = normalize(response);
  const normalizedAnswer = normalize(answer.answer);
  const isCorrect = normalizedResponse === normalizedAnswer;

  return {
    isCorrect,
    phase: step.phase,
    misconceptionCode: isCorrect ? null : answer.misconception,
    message: isCorrect ? answer.successMessage : answer.incorrectMessage,
    hint: step.hint
  };
}

export function gradeProgressiveLessonStep(lessonKey: string, stepId: string, response: string) {
  const lesson = lessonByKey.get(lessonKey);
  return lesson ? gradeProgressiveLessonDefinitionStep(lesson, stepId, response) : null;
}

export function normalizeProgressiveSubjectId(subjectId: string, grade?: string) {
  const aliases: Record<string, string> = {
    mathematics: 'math',
    mathematical_activities: 'math',
    english_language_activities: 'english',
    kiswahili_language_activities: 'kiswahili',
    science_technology: 'science',
    general_science: 'science',
    social_studies: 'social',
    history_citizenship: 'social',
    agriculture_nutrition: 'agriculture',
    creative_arts_sports: 'creative_arts',
    cre_ire_hre: 'religious_education'
  };
  const canonicalSubjectId = aliases[subjectId] ?? subjectId;
  return ['Grade 1', 'Grade 2', 'Grade 3'].includes(grade ?? '') && canonicalSubjectId === 'science'
    ? 'environmental'
    : canonicalSubjectId;
}

export function hasProgressiveLearningPath(subjectId: string, grade: string) {
  const canonicalSubjectId = normalizeProgressiveSubjectId(subjectId, grade);
  return allLessons.some(lesson => lesson.subjectId === canonicalSubjectId && lesson.grade === grade);
}

export function shouldScoreAllProgressiveLessonSteps(grade: string) {
  return grade === 'Grade 1' || grade === 'Grade 2' || grade === 'Grade 3';
}

export function buildProgressiveLearningPath(
  subjectId: string,
  progress: ProgressiveLessonProgressRecord[],
  grade: string
) {
  const canonicalSubjectId = normalizeProgressiveSubjectId(subjectId, grade);
  const pathLessons = allLessons.filter(
    lesson => lesson.subjectId === canonicalSubjectId && lesson.grade === grade
  );
  const progressByLesson = new Map(progress.map(item => [item.lesson_key, item]));
  let previousCompleted = true;

  const nodes: ProgressivePathNode[] = pathLessons.map((lesson, index) => {
    const lessonProgress = progressByLesson.get(lesson.lessonKey);
    const completed = lessonProgress?.status === 'completed';
    const needsPractice = lessonProgress?.status === 'needs_practice';
    const status: ProgressivePathNode['status'] = !previousCompleted
      ? 'locked'
      : completed
        ? 'completed'
        : needsPractice
          ? 'needs_practice'
          : 'current';

    previousCompleted = previousCompleted && completed;
    return {
      id: lesson.lessonKey,
      lessonKey: lesson.lessonKey,
      lessonVersion: lesson.lessonVersion,
      title: lesson.title,
      objective: lesson.objective,
      estimatedMinutes: lesson.estimatedMinutes,
      position: index,
      strandTitle: lesson.strand,
      availability: 'published',
      status,
      bestScore: lessonProgress?.best_score ?? null,
      attemptCount: lessonProgress?.attempt_count ?? 0
    };
  });

  const completedCount = nodes.filter(node => node.status === 'completed').length;
  const firstLesson = pathLessons[0];
  return {
    subjectId: canonicalSubjectId,
    subjectName: firstLesson?.subjectName ?? canonicalSubjectId,
    grade,
    title: `${firstLesson?.subjectName ?? 'Subject'} Adventures`,
    description: grade === 'Grade 7' && canonicalSubjectId === 'math'
      ? 'Start with three curriculum chapters, then continue through six playful equation adventures.'
      : 'Explore three Kenyan curriculum chapters through guided scenes, playful practice, and checkpoints.',
    completedCount,
    totalCount: nodes.length,
    progressPercent: nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
    nodes
  };
}

export function buildMathematicsLearningPath(
  progress: ProgressiveLessonProgressRecord[],
  grade = 'Grade 7'
) {
  return buildProgressiveLearningPath('math', progress, grade);
}
