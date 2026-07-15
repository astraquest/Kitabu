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
  const activeIndex = orderedSubStrands.findIndex(({ subStrand }) => !subStrand.isCompleted);
  const nodes = orderedSubStrands.map(({ strand, subStrand }, position) => {
    const status = activeIndex === -1 || position < activeIndex
      ? ('completed' as const)
      : position === activeIndex
        ? subStrand.needsRemediation
          ? ('needs_practice' as const)
          : ('current' as const)
        : ('locked' as const);

    return {
      id: subStrand.id,
      lessonKey: `legacy-${subStrand.id}`,
      lessonVersion: 1,
      title: subStrand.title,
      objective:
        subStrand.description ||
        subStrand.outcomes?.[0]?.text ||
        'Build confidence through guided learning.',
      estimatedMinutes: 8,
      position,
      strandTitle: strand.title,
      status,
      bestScore: subStrand.masteryScore ?? null,
      attemptCount: 0,
      delivery: 'legacy' as const,
      legacySubStrandId: subStrand.id,
    };
  });
  const completedCount = nodes.filter(node => node.status === 'completed').length;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    grade,
    title: 'Your learning path',
    description: 'Move through each curriculum topic at your own pace.',
    completedCount,
    totalCount: nodes.length,
    progressPercent: nodes.length ? Math.round((completedCount / nodes.length) * 100) : 0,
    delivery: 'curriculum',
    nodes,
  };
}
