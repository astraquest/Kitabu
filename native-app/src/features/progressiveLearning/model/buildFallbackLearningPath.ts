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
  let previousAttempted = true;
  const nodes = orderedSubStrands.map(({ strand, subStrand }, position) => {
    const completed = subStrand.isCompleted;
    const needsPractice = !completed && Boolean(subStrand.needsRemediation);
    const attempted =
      completed || needsPractice || typeof subStrand.masteryScore === 'number';
    const status = completed
      ? ('completed' as const)
      : needsPractice
        ? ('needs_practice' as const)
        : previousAttempted
          ? ('current' as const)
          : ('locked' as const);
    previousAttempted = previousAttempted && attempted;

    return {
      id: subStrand.id,
      lessonKey: `curriculum-${subStrand.id}`,
      lessonVersion: 1,
      title: subStrand.title,
      objective:
        subStrand.description ||
        subStrand.outcomes?.[0]?.text ||
        'Build confidence through guided learning.',
      estimatedMinutes: 8,
      position,
      strandId: strand.id,
      strandNumber: strand.number,
      strandTitle: strand.title,
      subStrandId: subStrand.id,
      subStrandNumber: subStrand.number,
      status,
      bestScore: subStrand.masteryScore ?? null,
      attemptCount: attempted ? 1 : 0,
      delivery: 'progressive' as const,
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
    delivery: 'progressive',
    nodes,
  };
}
