import type {
  LearningVisualSpec,
  ProgressiveLessonSeed,
  StepInput
} from './progressiveLearning.js';

export type CurriculumQuestionSource = {
  prompt: string;
  options: [string, string, string, string];
  answer: string;
  explanation: string;
  hint: string;
  misconception: string;
  cognitiveLevel: 'recall' | 'understand' | 'apply' | 'analyse';
  visual?: LearningVisualSpec;
};

export type CurriculumChapterSource = {
  key: string;
  lessonVersion?: number;
  subjectId: string;
  subjectName: string;
  grade: `Grade ${1 | 2 | 3 | 5 | 6 | 7 | 8 | 10 | 11}`;
  strand: string;
  subStrand: string;
  curriculumTopicCode?: string;
  title: string;
  shortTitle: string;
  objective: string;
  minutes: 9 | 10;
  /** Reviewable curriculum evidence used to choose and audit this chapter. */
  sourceRef: string;
  visual: {
    setting: Extract<LearningVisualSpec, { kind: 'scene' }>['setting'];
    elements: string[];
  };
  questions: CurriculumQuestionSource[];
};

function serializeClassifyAnswer(assignments: Record<string, string[]>) {
  return `classify:${Object.keys(assignments)
    .sort()
    .map(bucketId => `${bucketId}=${[...assignments[bucketId]].sort().join(',')}`)
    .join('|')}`;
}

function stableHash(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return state;
}

function shuffledOptions(
  options: CurriculumQuestionSource['options'],
  seed: string
): CurriculumQuestionSource['options'] {
  const shuffled = [...options];
  let state = stableHash(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled as CurriculumQuestionSource['options'];
}

type OpeningInteractionKind = 'bucket_sort' | 'choice_sprint';

function openingInteractionKind(chapter: CurriculumChapterSource): OpeningInteractionKind {
  return stableHash(`${chapter.key}:interaction`) % 2 === 0 ? 'bucket_sort' : 'choice_sprint';
}

function bucketCopy(chapter: CurriculumChapterSource) {
  const topic = `${chapter.strand} ${chapter.subStrand}`.toLocaleLowerCase('en-KE');
  if (/safety|fire|laboratory|workshop|protect/.test(topic)) {
    return { supported: 'Safer choice', rethink: 'Unsafe or incomplete' };
  }
  if (['english', 'kiswahili'].includes(chapter.subjectId)) {
    return { supported: 'Fits the message', rethink: 'Needs revision' };
  }
  if (['math', 'science', 'integrated_science'].includes(chapter.subjectId)) {
    return { supported: 'Evidence supports it', rethink: 'Evidence disagrees' };
  }
  if (['life_skills', 'religious_education'].includes(chapter.subjectId)) {
    return { supported: 'Responsible choice', rethink: 'Needs reflection' };
  }
  return { supported: 'Best supported', rethink: 'Rethink' };
}

function validateChapter(chapter: CurriculumChapterSource) {
  if (chapter.questions.length !== 5) {
    throw new Error(`${chapter.key} must contain exactly five authored activities.`);
  }
  if (new Set(chapter.questions.map(question => question.prompt.trim().toLocaleLowerCase('en-KE'))).size !== 5) {
    throw new Error(`${chapter.key} contains duplicate activity prompts.`);
  }
  if (chapter.objective.trim().length < 30) {
    throw new Error(`${chapter.key} needs a substantive learning objective.`);
  }
  if (chapter.visual.elements.length < 3) {
    throw new Error(`${chapter.key} needs at least three scene elements.`);
  }
  const isPinnedGitSource = /^git:[0-9a-f]{40}:[^#]+(?:#.+)?$/i.test(chapter.sourceRef);
  const isOfficialKicdPdf = /^https:\/\/kicd\.ac\.ke\/wp-content\/uploads\/.+\.pdf(?:#.+)?$/i.test(chapter.sourceRef);
  if (!isPinnedGitSource && !isOfficialKicdPdf) {
    throw new Error(`${chapter.key} must reference a pinned Git source or an official KICD PDF.`);
  }

  chapter.questions.forEach((question, index) => {
    if (question.options.length !== 4 || new Set(question.options).size !== 4) {
      throw new Error(`${chapter.key} question ${index + 1} needs four unique options.`);
    }
    if (question.options.filter(option => option === question.answer).length !== 1) {
      throw new Error(`${chapter.key} question ${index + 1} answer must match exactly one option.`);
    }
    if (question.hint.trim().length < 20 || question.explanation.trim().length < 20) {
      throw new Error(`${chapter.key} question ${index + 1} needs teaching-quality feedback.`);
    }
  });
}

function visualFor(
  chapter: CurriculumChapterSource,
  question: CurriculumQuestionSource,
  index: number,
  openingKind: OpeningInteractionKind
): LearningVisualSpec {
  if (question.visual) {
    return question.visual;
  }

  if (index === 0) {
    if (openingKind === 'choice_sprint') {
      return {
        kind: 'cards',
        layout: 'grid',
        cards: question.options.map((label, optionIndex) => ({
          id: `choice-${optionIndex + 1}`,
          label,
          accent: (['blue', 'green', 'gold', 'coral'] as const)[optionIndex]
        })),
        instruction: 'Scan the evidence, then spotlight one answer.',
        caption: `Four ideas enter the spotlight for ${chapter.shortTitle}; only one fits every clue.`
      };
    }
    const labels = bucketCopy(chapter);
    return {
      kind: 'classify',
      buckets: [
        { id: 'supported', label: labels.supported },
        { id: 'rethink', label: labels.rethink }
      ],
      items: question.options.map((label, optionIndex) => ({
        id: `choice-${optionIndex + 1}`,
        label,
        accent: optionIndex % 2 === 0 ? 'blue' : 'gold'
      })),
      caption: `Sort every idea, then explain the evidence you used for ${chapter.shortTitle}.`
    };
  }

  if (index === 1 || index === 4) {
    return {
      kind: 'scene',
      setting: chapter.visual.setting,
      elements: chapter.visual.elements.map((label, elementIndex) => ({
        id: `element-${elementIndex + 1}`,
        label,
        state: elementIndex === (index === 1 ? 0 : chapter.visual.elements.length - 1)
          ? 'highlighted'
          : 'normal'
      })),
      caption: index === 1
        ? 'Notice the details in the scene before choosing.'
        : 'Use the whole scene to check whether your reasoning transfers.'
    };
  }

  if (index === 2) {
    if (openingKind === 'choice_sprint') {
      const labels = bucketCopy(chapter);
      return {
        kind: 'classify',
        buckets: [
          { id: 'supported', label: labels.supported },
          { id: 'rethink', label: labels.rethink }
        ],
        items: question.options.map((label, optionIndex) => ({
          id: `option-${optionIndex + 1}`,
          label,
          accent: optionIndex % 2 === 0 ? 'purple' : 'neutral'
        })),
        caption: 'Sort the ideas mentally before choosing the one that survives every clue.'
      };
    }
    return {
      kind: 'cards',
      layout: 'grid',
      cards: question.options.map((label, optionIndex) => ({
        id: `option-${optionIndex + 1}`,
        label,
        accent: (['blue', 'green', 'gold', 'coral'] as const)[optionIndex]
      })),
      instruction: 'Compare all four ideas before committing.',
      caption: 'Compare every card; one idea is best supported by the evidence.'
    };
  }

  return {
    kind: 'sequence',
    steps: [
      { id: 'notice', label: 'Notice', detail: 'Find the important clue.' },
      { id: 'connect', label: 'Connect', detail: `Link it to ${chapter.shortTitle}.` },
      { id: 'decide', label: 'Decide', detail: 'Test the choice against every clue.' }
    ],
    activeIndex: 1,
    caption: 'Strong reasoning moves from evidence to a checked decision.'
  };
}

function stepsFor(chapter: CurriculumChapterSource): StepInput[] {
  const openingKind = openingInteractionKind(chapter);
  const usesLowerPrimaryPresentation = [
    'Grade 1',
    'Grade 2',
    'Grade 3',
  ].includes(chapter.grade);
  return chapter.questions.map((question, index) => {
    const presentedQuestion: CurriculumQuestionSource = {
      ...question,
      options: shuffledOptions(question.options, `${chapter.key}:step:${index + 1}`)
    };
    const common = {
      phase: index < 2 ? 'guided' as const : 'checkpoint' as const,
      prompt: question.prompt,
      visual: visualFor(chapter, presentedQuestion, index, openingKind),
      hint: question.hint,
      successMessage: `That reasoning works. ${question.explanation}`,
      misconception: question.misconception,
      incorrectMessage: `Try a different path. ${question.hint}`
    };

    if (
      usesLowerPrimaryPresentation ||
      presentedQuestion.visual?.kind === 'arithmetic'
    ) {
      return { ...common, options: presentedQuestion.options, answer: question.answer };
    }

    if (index !== 0) {
      return { ...common, options: presentedQuestion.options, answer: question.answer };
    }

    const correctId = `choice-${presentedQuestion.options.indexOf(question.answer) + 1}`;
    if (openingKind === 'choice_sprint') {
      return {
        ...common,
        options: [],
        interaction: {
          kind: 'choice_sprint' as const,
          instruction: 'Spotlight the one answer that fits every clue. You can change your choice before checking.',
          items: presentedQuestion.options.map((label, optionIndex) => ({ id: `choice-${optionIndex + 1}`, label }))
        },
        answer: `choice:${correctId}`
      };
    }

    const otherIds = presentedQuestion.options
      .map((_, optionIndex) => `choice-${optionIndex + 1}`)
      .filter(id => id !== correctId);
    const labels = bucketCopy(chapter);
    return {
      ...common,
      options: [],
      interaction: {
        kind: 'bucket_sort' as const,
        instruction: `Sort the strongest answer into ${labels.supported} and place the other ideas in ${labels.rethink}.`,
        buckets: [
          { id: 'supported', label: labels.supported },
          { id: 'rethink', label: labels.rethink }
        ],
        items: presentedQuestion.options.map((label, optionIndex) => ({ id: `choice-${optionIndex + 1}`, label }))
      },
      answer: serializeClassifyAnswer({ supported: [correctId], rethink: otherIds })
    };
  });
}

export function defineCurriculumChapters(chapters: CurriculumChapterSource[]): ProgressiveLessonSeed[] {
  const keys = new Set<string>();
  return chapters.map(chapter => {
    validateChapter(chapter);
    if (keys.has(chapter.key)) throw new Error(`Duplicate progressive chapter key: ${chapter.key}`);
    keys.add(chapter.key);
    return {
      key: chapter.key,
      version: chapter.lessonVersion,
      subjectId: chapter.subjectId,
      subjectName: chapter.subjectName,
      grade: chapter.grade,
      strand: chapter.strand,
      subStrand: chapter.subStrand,
      curriculumTopicCode: chapter.curriculumTopicCode,
      title: chapter.title,
      shortTitle: chapter.shortTitle,
      objective: chapter.objective,
      minutes: chapter.minutes,
      steps: stepsFor(chapter)
    };
  });
}
