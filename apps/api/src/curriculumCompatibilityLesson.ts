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
      outcomes?: Array<{ id?: string; text: string }>;
      isCompleted: boolean;
      needsRemediation: boolean;
      masteryScore?: number | null;
    }>;
  }>;
};

type AuthoredCurriculumLesson = Pick<
  ProgressiveLessonPrivate,
  'lessonKey' | 'lessonVersion' | 'strand' | 'subStrand' | 'curriculumTopicCode' |
  'curriculumOutcomeId' | 'curriculumLocationKey' | 'objective' | 'estimatedMinutes'
> & { title?: string };

const normalizeLabel = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('en-KE')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

type CurriculumOutcomeLocation = {
  strand: string;
  subStrand: string;
  outcomeId: string;
};

/**
 * Returns the portable identity shared by an authored mission and its official
 * curriculum outcome. Outcome identifiers are only unique within their
 * strand/sub-strand location, so they must never be indexed on their own.
 */
export function curriculumOutcomeLocationKey(location: CurriculumOutcomeLocation) {
  return JSON.stringify([
    normalizeLabel(location.strand),
    normalizeLabel(location.subStrand),
    normalizeLabel(location.outcomeId),
  ]);
}

function curriculumOutcomeNodeId(input: {
  strandId?: string;
  strandTitle: string;
  subStrandId: string;
  outcomeId?: string;
  outcomePosition: number;
}) {
  return [
    'curriculum-outcome',
    input.strandId ?? normalizeLabel(input.strandTitle),
    input.subStrandId,
    input.outcomeId ?? `position-${input.outcomePosition + 1}`,
  ].map(part => encodeURIComponent(part)).join(':');
}

function uniqueLocationMap(lessons: AuthoredCurriculumLesson[]) {
  const result = new Map<string, AuthoredCurriculumLesson>();
  const ambiguous = new Set<string>();
  for (const lesson of lessons) {
    if (!lesson.curriculumOutcomeId) continue;
    const key = curriculumOutcomeLocationKey({
      strand: lesson.strand,
      subStrand: lesson.subStrand,
      outcomeId: lesson.curriculumOutcomeId,
    });
    if (result.has(key)) {
      result.delete(key);
      ambiguous.add(key);
    } else if (!ambiguous.has(key)) {
      result.set(key, lesson);
    }
  }
  return result;
}

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
  const usesOutcomeMissions = authoredLessons.some(lesson => Boolean(lesson.curriculumOutcomeId));
  if (usesOutcomeMissions) {
    const missions = ordered.flatMap(({ strand, subStrand }) => {
      const topic = subStrand.topics?.[0];
      return (subStrand.outcomes ?? []).map((outcome, outcomePosition) => ({
        strand,
        subStrand,
        topic,
        outcome,
        outcomePosition,
      }));
    });
    const authoredByOutcomeLocation = uniqueLocationMap(authoredLessons);
    let priorCompleted = true;
    const nodes: ProgressivePathNode[] = missions.map((mission, position) => {
      // A source outcome ID such as `outcome-1` is commonly reused by every
      // sub-strand. Resolve only through its complete curriculum location.
      // Objective text is display content and deliberately is not an identity
      // fallback: copy edits must not silently bind a lesson to another node.
      const matchedLesson = mission.outcome.id
        ? authoredByOutcomeLocation.get(curriculumOutcomeLocationKey({
            strand: mission.strand.title,
            subStrand: mission.subStrand.title,
            outcomeId: mission.outcome.id,
          }))
        : undefined;
      const lessonProgress = matchedLesson
        ? progressByLesson.get(matchedLesson.lessonKey)
        : undefined;
      const completed = priorCompleted && lessonProgress?.status === 'completed';
      const needsPractice = priorCompleted && lessonProgress?.status === 'needs_practice';
      const availability: ProgressivePathNode['availability'] = matchedLesson
        ? 'published'
        : 'content_pending';
      const status: ProgressivePathNode['status'] = completed
        ? 'completed'
        : !priorCompleted
          ? 'locked'
          : needsPractice
            ? 'needs_practice'
            : matchedLesson
              ? 'current'
              : 'content_pending';
      priorCompleted = priorCompleted && completed;
      return {
        id: curriculumOutcomeNodeId({
          strandId: mission.strand.id,
          strandTitle: mission.strand.title,
          subStrandId: mission.subStrand.id,
          outcomeId: mission.outcome.id,
          outcomePosition: mission.outcomePosition,
        }),
        lessonKey: matchedLesson?.lessonKey ?? null,
        lessonVersion: matchedLesson?.lessonVersion ?? null,
        title: matchedLesson?.title ?? mission.subStrand.title,
        objective: matchedLesson?.objective ?? mission.outcome.text,
        estimatedMinutes: matchedLesson?.estimatedMinutes ?? 0,
        position,
        strandId: mission.strand.id,
        strandNumber: mission.strand.number,
        strandTitle: mission.strand.title,
        subStrandId: mission.subStrand.id,
        subStrandNumber: mission.subStrand.number,
        curriculumTopicId: mission.topic?.id,
        curriculumTopicKey: mission.topic?.canonicalKey,
        curriculumOutcomeId: mission.outcome.id,
        curriculumLocationKey: matchedLesson?.curriculumLocationKey,
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
      description: 'Move through richly authored official learning outcomes in order.',
      completedCount,
      totalCount: nodes.length,
      progressPercent: nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
      nodes,
    };
  }
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
      title: authoredLesson?.title ?? subStrand.title,
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
