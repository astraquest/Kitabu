import type { LearningStrand, Subject } from '../../../types/app';
import type { SubjectLearningPath } from '../types';

export function buildFallbackLearningPath(
  subject: Subject,
  strands: LearningStrand[],
  grade: string,
): SubjectLearningPath {
  const orderedSubStrands = strands.flatMap(strand =>
    strand.subStrands.map(subStrand => ({ strand, subStrand })),
  );
  const nodes = orderedSubStrands.map(({ strand, subStrand }, position) => {
    return {
      id: subStrand.id,
      lessonKey: null,
      lessonVersion: null,
      title: subStrand.title,
      objective:
        subStrand.description ||
        subStrand.outcomes?.[0]?.text ||
        'Build confidence through guided learning.',
      estimatedMinutes: 0,
      position,
      strandId: strand.id,
      strandNumber: strand.number,
      strandTitle: strand.title,
      subStrandId: subStrand.id,
      subStrandNumber: subStrand.number,
      status: position === 0 ? ('content_pending' as const) : ('locked' as const),
      availability: 'content_pending' as const,
      bestScore: subStrand.masteryScore ?? null,
      attemptCount: 0,
      delivery: 'progressive' as const,
    };
  });
  const completedCount = 0;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    grade,
    title: 'Your learning path',
    description: 'Move through each curriculum topic at your own pace.',
    completedCount,
    totalCount: nodes.length,
    progressPercent: nodes.length ? Math.round((completedCount / nodes.length) * 100) : 0,
    delivery: 'progressive',
    nodes,
  };
}
