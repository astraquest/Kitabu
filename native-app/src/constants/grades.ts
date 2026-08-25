export const LOWER_PRIMARY_GRADES = ['Grade 1', 'Grade 2', 'Grade 3'] as const;

export const LOWER_PRIMARY_SUBJECTS = [
  'English',
  'Kiswahili',
  'Mathematics',
  'Environmental',
  'CRE',
  'IRE',
  'HRE',
  'Indigenous Languages',
  'Hygiene and Nutrition',
  'Creative Activities',
] as const;

export const SUPPORTED_GRADES = [
  ...LOWER_PRIMARY_GRADES,
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
] as const;

export const DEFAULT_GRADE = 'Grade 6';

export const ALL_GRADES_FILTER = 'All Grades';
export const TEACHER_ALL_GRADES_FILTER = 'All';

/**
 * The number of subjects a learner must keep on their dashboard for a grade.
 * Unknown values retain the legacy five-subject behavior until a grade is known.
 */
export function requiredSubjectCountForGrade(grade: string | null | undefined): number {
  const gradeNumber = Number(String(grade ?? '').match(/\d+/)?.[0] ?? NaN);

  if (gradeNumber >= 1 && gradeNumber <= 3) return 7;
  if (gradeNumber >= 4 && gradeNumber <= 6) return 8;
  if (gradeNumber >= 7 && gradeNumber <= 9) return 9;
  if (gradeNumber >= 10 && gradeNumber <= 12) return 7;
  return 5;
}

export function toggleSubjectSelection(
  selectedSubjectIds: string[],
  subjectId: string,
  requiredCount: number,
  allowUnderfilledSelection = false,
): string[] {
  if (selectedSubjectIds.includes(subjectId)) {
    if (!allowUnderfilledSelection && selectedSubjectIds.length <= requiredCount) {
      return selectedSubjectIds;
    }
    return selectedSubjectIds.filter(id => id !== subjectId);
  }

  return selectedSubjectIds.length >= requiredCount
    ? selectedSubjectIds
    : [...selectedSubjectIds, subjectId];
}

export function completeSubjectSelection(
  savedSubjectIds: string[],
  curriculumSubjectIds: string[],
  requiredCount: number,
): string[] {
  const curriculumIds = new Set(curriculumSubjectIds);
  const selected = savedSubjectIds.filter(
    (subjectId, index) => curriculumIds.has(subjectId) && savedSubjectIds.indexOf(subjectId) === index,
  );
  return [
    ...selected,
    ...curriculumSubjectIds.filter(subjectId => !selected.includes(subjectId)),
  ].slice(0, requiredCount);
}
