import {
  createProgressiveLesson,
  normalizeProgressiveSubjectId,
  type ProgressiveLessonPrivate,
  type ProgressiveLessonProgressRecord,
  type ProgressivePathNode,
  type StepInput
} from './progressiveLearning.js';

export type CurriculumSubStrandContext = {
  sub_strand_id: string;
  sub_strand_title: string;
  sub_strand_description: string | null;
  outcomes: Array<{ id?: string; text: string }>;
  inquiry_questions: Array<{ id?: string; text: string }>;
  pages: Array<{ title: string; content: string }>;
  strand_title: string;
  grade_level: string;
  subject_id: string;
  subject_name: string;
};

type CurriculumPathSubject = {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  subjectOfficialName?: string;
  subjectDisplayName?: string;
  strands: Array<{
    id?: string;
    number?: string;
    title: string;
    subStrands: Array<{
      id: string;
      number?: string;
      title: string;
      description?: string | null;
      outcomes?: Array<{ text: string }>;
      isCompleted: boolean;
      needsRemediation: boolean;
      masteryScore?: number | null;
    }>;
  }>;
};

type AuthoredCurriculumLesson = Pick<
  ProgressiveLessonPrivate,
  'lessonKey' | 'lessonVersion' | 'strand' | 'subStrand' | 'objective' | 'estimatedMinutes'
>;

function compactText(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/[#*_`>]/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function excerpt(value: string | null | undefined, fallback: string) {
  const text = compactText(value, fallback);
  return text.length <= 420 ? text : `${text.slice(0, 417).trimEnd()}…`;
}

function compatibilitySteps(context: CurriculumSubStrandContext): StepInput[] {
  const sourceSections = context.pages.length > 0
    ? context.pages.slice(0, 5).map(page => ({ title: page.title, content: page.content }))
    : [
        {
          title: 'Build the idea',
          content: context.sub_strand_description ?? context.outcomes[0]?.text
        },
        {
          title: 'Learning outcome',
          content: context.outcomes.map(outcome => outcome.text).join(' ')
        },
        {
          title: 'Think further',
          content: context.inquiry_questions.map(question => question.text).join(' ')
        }
      ];
  while (sourceSections.length < 3) {
    sourceSections.push({
      title: `Connect idea ${sourceSections.length + 1}`,
      content: context.outcomes[sourceSections.length]?.text ?? context.sub_strand_description
    });
  }

  return sourceSections.map((section, index) => {
    const sectionTitle = compactText(section.title, `Explore ${context.sub_strand_title}`);
    const content = excerpt(section.content, context.sub_strand_description ?? `Explore the key idea in ${context.sub_strand_title}.`);
    const action = index === sourceSections.length - 1 ? 'Finish lesson' : 'Continue';
    return {
      phase: index < 2 ? 'guided' : 'checkpoint',
      prompt: sectionTitle,
      supportText: content,
      options: [action],
      visual: {
        kind: 'cards',
        layout: 'stack',
        cards: [
          { id: 'focus', label: context.sub_strand_title, detail: content, accent: 'blue' },
          { id: 'connect', label: 'Connect', detail: context.strand_title, accent: 'green' }
        ],
        instruction: 'Read the idea, connect it to what you already know, then continue.',
        caption: `${context.subject_name} · ${context.strand_title}`
      },
      hint: `Review the focus card and connect it to ${context.sub_strand_title} before moving on.`,
      answer: action,
      misconception: `CURRICULUM_${context.sub_strand_id.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}_${index + 1}`,
      incorrectMessage: 'Review the focus card, then continue when the idea is clear.',
      successMessage: index === sourceSections.length - 1
        ? 'Lesson complete. You connected the key ideas in this curriculum topic.'
        : 'Good. Carry that idea into the next part of the lesson.'
    };
  });
}

export function buildCurriculumCompatibilityLesson(
  context: CurriculumSubStrandContext
): ProgressiveLessonPrivate {
  return createProgressiveLesson({
    key: `curriculum-${context.sub_strand_id}`,
    subjectId: normalizeProgressiveSubjectId(context.subject_id),
    subjectName: context.subject_name,
    grade: context.grade_level,
    strand: context.strand_title,
    subStrand: context.sub_strand_title,
    title: context.sub_strand_title,
    shortTitle: context.sub_strand_title,
    objective: compactText(
      context.outcomes.map(outcome => outcome.text).join(' '),
      context.sub_strand_description ?? `Build confidence in ${context.sub_strand_title}.`
    ),
    minutes: Math.max(5, Math.min(12, context.pages.length * 2 || 6)),
    steps: compatibilitySteps(context)
  });
}

export function buildCurriculumCompatibilityPath(
  subject: CurriculumPathSubject,
  progress: ProgressiveLessonProgressRecord[],
  grade: string,
  authoredLessons: AuthoredCurriculumLesson[] = []
) {
  const normalizeLabel = (value: string) => value
    .trim()
    .toLocaleLowerCase('en-KE')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const authoredByLocation = new Map(
    authoredLessons.map(lesson => [
      `${normalizeLabel(lesson.strand)}:${normalizeLabel(lesson.subStrand)}`,
      lesson,
    ])
  );
  const progressByLesson = new Map(progress.map(item => [item.lesson_key, item]));
  const ordered = subject.strands.flatMap(strand =>
    strand.subStrands.map(subStrand => ({ strand, subStrand }))
  );
  let previousAttempted = true;
  const nodes: ProgressivePathNode[] = ordered.map(({ strand, subStrand }, position) => {
    const authoredLesson = authoredByLocation.get(
      `${normalizeLabel(strand.title)}:${normalizeLabel(subStrand.title)}`
    );
    const lessonKey = authoredLesson?.lessonKey ?? `curriculum-${subStrand.id}`;
    const lessonProgress = progressByLesson.get(lessonKey);
    const completed = lessonProgress?.status === 'completed' || subStrand.isCompleted;
    const needsPractice = lessonProgress?.status === 'needs_practice' || subStrand.needsRemediation;
    const attempted = Boolean(
      completed ||
      needsPractice ||
      (lessonProgress?.attempt_count ?? 0) > 0 ||
      typeof lessonProgress?.best_score === 'number' ||
      typeof subStrand.masteryScore === 'number',
    );
    const status: ProgressivePathNode['status'] = completed
      ? 'completed'
      : needsPractice
        ? 'needs_practice'
        : previousAttempted
          ? 'current'
          : 'locked';
    previousAttempted = previousAttempted && attempted;
    return {
      id: subStrand.id,
      lessonKey,
      lessonVersion: authoredLesson?.lessonVersion ?? 1,
      title: subStrand.title,
      objective: authoredLesson?.objective ?? subStrand.description ?? subStrand.outcomes?.[0]?.text ?? 'Build confidence through guided learning.',
      estimatedMinutes: authoredLesson?.estimatedMinutes ?? 8,
      position,
      strandId: strand.id,
      strandNumber: strand.number,
      strandTitle: strand.title,
      subStrandId: subStrand.id,
      subStrandNumber: subStrand.number,
      status,
      bestScore: lessonProgress?.best_score ?? subStrand.masteryScore ?? null,
      attemptCount: lessonProgress?.attempt_count ?? 0
    };
  });
  const completedCount = nodes.filter(node => node.status === 'completed').length;
  return {
    subjectId: subject.subjectCode ?? normalizeProgressiveSubjectId(subject.subjectId, grade),
    subjectName: subject.subjectDisplayName ?? subject.subjectName,
    subjectOfficialName: subject.subjectOfficialName ?? subject.subjectName,
    grade,
    title: `${subject.subjectName} Adventures`,
    description: 'Explore each curriculum topic through the new guided lesson experience.',
    completedCount,
    totalCount: nodes.length,
    progressPercent: nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
    nodes
  };
}
