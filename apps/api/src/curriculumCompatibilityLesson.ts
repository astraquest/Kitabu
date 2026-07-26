import {
  normalizeProgressiveSubjectId,
  type ProgressiveLessonPrivate,
  type ProgressiveLessonProgressRecord,
  type ProgressivePathNode,
} from './progressiveLearning.js';

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
      topics?: Array<{
        id: string;
        canonicalKey?: string;
        code?: string;
        title: string;
      }>;
      isCompleted: boolean;
      needsRemediation: boolean;
      masteryScore?: number | null;
    }>;
  }>;
};

type AuthoredCurriculumLesson = Pick<
  ProgressiveLessonPrivate,
  'lessonKey' | 'lessonVersion' | 'strand' | 'subStrand' | 'curriculumTopicCode' | 'objective' | 'estimatedMinutes'
>;

const normalizeLabel = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('en-KE')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function buildCurriculumAuthoredPath(
  subject: CurriculumPathSubject,
  progress: ProgressiveLessonProgressRecord[],
  grade: string,
  authoredLessons: AuthoredCurriculumLesson[] = [],
) {
  const progressByLesson = new Map(progress.map(item => [item.lesson_key, item]));
  const progressByTopic = new Map(
    progress
      .filter(item => item.curriculum_topic_id)
      .map(item => [item.curriculum_topic_id as string, item]),
  );
  const ordered = subject.strands.flatMap(strand =>
    strand.subStrands.map(subStrand => ({ strand, subStrand })),
  );
  const claimedLessonKeys = new Set<string>();
  const authoredByTopicId = new Map<string, AuthoredCurriculumLesson>();

  for (const { strand, subStrand } of ordered) {
    const topic = subStrand.topics?.[0];
    if (!topic) continue;
    const matchingLessons = authoredLessons.filter(lesson => {
      if (claimedLessonKeys.has(lesson.lessonKey)) return false;
      if (lesson.curriculumTopicCode) {
        return normalizeLabel(lesson.curriculumTopicCode) ===
          normalizeLabel(subStrand.number ?? topic.code ?? '');
      }
      if (normalizeLabel(lesson.strand) !== normalizeLabel(strand.title)) return false;
      if (normalizeLabel(lesson.subStrand) !== normalizeLabel(subStrand.title)) return false;
      const duplicateLocations = ordered.filter(candidate =>
        normalizeLabel(candidate.strand.title) === normalizeLabel(strand.title) &&
        normalizeLabel(candidate.subStrand.title) === normalizeLabel(subStrand.title)
      ).length;
      return duplicateLocations === 1;
    });
    if (matchingLessons.length === 1) {
      authoredByTopicId.set(topic.id, matchingLessons[0]);
      claimedLessonKeys.add(matchingLessons[0].lessonKey);
    }
  }

  let priorTopicsCompleted = true;
  const nodes: ProgressivePathNode[] = ordered.map(({ strand, subStrand }, position) => {
    const topic = subStrand.topics?.[0];
    const authoredLesson = topic ? authoredByTopicId.get(topic.id) : undefined;
    const lessonKey = authoredLesson?.lessonKey ?? null;
    const lessonProgress = (topic ? progressByTopic.get(topic.id) : undefined) ??
      (lessonKey ? progressByLesson.get(lessonKey) : undefined);
    const hasRecordedCompletion = lessonProgress?.status === 'completed';
    const completed = priorTopicsCompleted && hasRecordedCompletion;
    const needsPractice = priorTopicsCompleted && lessonProgress?.status === 'needs_practice';
    const availability: ProgressivePathNode['availability'] = authoredLesson
      ? 'published'
      : 'content_pending';
    const status: ProgressivePathNode['status'] = completed
      ? 'completed'
      : !priorTopicsCompleted
        ? 'locked'
        : needsPractice
          ? 'needs_practice'
          : authoredLesson
            ? 'current'
            : 'content_pending';
    priorTopicsCompleted = priorTopicsCompleted && completed;

    return {
      id: topic?.id ?? subStrand.id,
      lessonKey,
      lessonVersion: authoredLesson?.lessonVersion ?? null,
      title: subStrand.title,
      objective: authoredLesson?.objective ?? 'Richly authored learning content is being prepared for this curriculum topic.',
      estimatedMinutes: authoredLesson?.estimatedMinutes ?? 0,
      position,
      strandId: strand.id,
      strandNumber: strand.number,
      strandTitle: strand.title,
      subStrandId: subStrand.id,
      subStrandNumber: subStrand.number,
      curriculumTopicId: topic?.id,
      curriculumTopicKey: topic?.canonicalKey,
      availability,
      status,
      bestScore: lessonProgress?.best_score ?? null,
      attemptCount: lessonProgress?.attempt_count ?? 0,
    };
  });
  const completedCount = nodes.filter(node => node.status === 'completed').length;

  return {
    subjectId: subject.subjectCode ?? normalizeProgressiveSubjectId(subject.subjectId, grade),
    subjectName: subject.subjectDisplayName ?? subject.subjectName,
    subjectOfficialName: subject.subjectOfficialName ?? subject.subjectName,
    grade,
    title: `${subject.subjectName} Adventures`,
    description: 'Move through richly authored curriculum topics in the official KICD order.',
    completedCount,
    totalCount: nodes.length,
    progressPercent: nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
    nodes,
  };
}
