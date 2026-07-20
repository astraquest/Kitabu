export const LOWER_PRIMARY_GRADES = ['Grade 1', 'Grade 2', 'Grade 3'] as const;

export const LOWER_PRIMARY_SUBJECTS = [
  'English',
  'Kiswahili',
  'Mathematics',
  'Environmental',
  'CRE',
  'IRE',
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
