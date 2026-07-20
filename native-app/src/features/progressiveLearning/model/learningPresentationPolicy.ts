export type LearningPresentationMode = 'lower_primary' | 'standard';

const LOWER_PRIMARY_GRADES = new Set(['Grade 1', 'Grade 2', 'Grade 3']);

export function getLearningPresentationMode(
  grade: string,
): LearningPresentationMode {
  return LOWER_PRIMARY_GRADES.has(grade) ? 'lower_primary' : 'standard';
}
