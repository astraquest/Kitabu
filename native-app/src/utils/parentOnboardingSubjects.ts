import { LOWER_PRIMARY_GRADES } from '../constants/grades';

export type ParentOnboardingSubject = {
  id: string;
  name: string;
};

type ParentOnboardingGradeBand = 'lower' | 'upper' | 'junior' | 'senior';

const SUBJECT_NAMES_BY_BAND: Record<ParentOnboardingGradeBand, readonly string[]> = {
  lower: [
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
  ],
  upper: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Science & Technology',
    'Social Studies',
    'Religious Education',
    'Creative Arts',
    'Agriculture & Nutrition',
  ],
  junior: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Integrated Science',
    'Pre-Technical Studies',
    'Social Studies',
    'Business Studies',
    'Agriculture',
    'Creative Arts & Sports',
    'Life Skills',
    'Religious Education',
  ],
  senior: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Biology',
    'Chemistry',
    'Physics',
    'Computer Studies',
    'Agriculture',
    'Home Science',
    'Drawing & Design',
    'General Science',
    'History & Citizenship',
    'Geography',
    'Business Education',
    'CRE / IRE / HRE',
    'French',
    'German',
    'Arabic',
    'Mandarin',
    'Visual Arts',
    'Performing Arts',
    'Music',
    'Sports Science',
  ],
};

const SUBJECT_ID_ALIASES: Record<string, string> = {
  English: 'english',
  Mathematics: 'math',
  Kiswahili: 'kiswahili',
  'Social Studies': 'social',
  Agriculture: 'agriculture',
  'Creative Arts': 'creative_arts',
  Environmental: 'environmental',
  CRE: 'cre',
  IRE: 'ire',
  HRE: 'hre',
  'Indigenous Languages': 'indigenous_languages',
  'Hygiene and Nutrition': 'hygiene_nutrition',
  'Creative Activities': 'creative_activities',
  'Religious Education': 'religious_education',
};

function subjectIdFromName(name: string) {
  return SUBJECT_ID_ALIASES[name] ?? `cbc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function parentOnboardingGradeBand(grade: string): ParentOnboardingGradeBand {
  const gradeNumber = Number(grade.replace(/\D/g, ''));
  if (gradeNumber >= 10) return 'senior';
  if (gradeNumber >= 7) return 'junior';
  if (gradeNumber >= 4) return 'upper';
  return 'lower';
}

export function parentOnboardingSubjectOptions(grade: string): ParentOnboardingSubject[] {
  const band = parentOnboardingGradeBand(grade);
  return SUBJECT_NAMES_BY_BAND[band].map(name => ({ id: subjectIdFromName(name), name }));
}

export function parentOnboardingSubjectIds(grade: string): string[] {
  return parentOnboardingSubjectOptions(grade).map(subject => subject.id);
}

export function isParentOnboardingLowerPrimaryGrade(grade: string) {
  return (LOWER_PRIMARY_GRADES as readonly string[]).includes(grade);
}
