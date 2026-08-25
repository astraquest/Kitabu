export type SubjectRecommendationReason =
  | 'onboarding_default'
  | 'manual_preference'
  | 'personal_affinity'
  | 'grade_popularity'
  | 'exploration'
  | 'lowest_assignment_average';

export interface RecommendationSubject {
  subjectId: string;
  subjectName: string;
}

export interface SubjectRecommendationItem extends RecommendationSubject {
  position: number;
  reason: SubjectRecommendationReason;
}

export interface SubjectRecommendationSignals {
  userId: string;
  dateKey: string;
  grade?: string | null;
  onboardingSubjects: RecommendationSubject[];
  manualSubjectIds: string[];
  mode: 'automatic' | 'manual';
  personalSelections: Record<string, number>;
  gradeSelections: Record<string, number>;
  cohortUserCount: number;
  assignmentPerformance: Array<{
    subjectId: string;
    averageScore: number;
    gradedCount: number;
  }>;
}

export interface BuiltSubjectRecommendations {
  mode: 'automatic' | 'manual';
  insufficientData: boolean;
  chat: SubjectRecommendationItem[];
  dashboard: SubjectRecommendationItem[];
}

const DEFAULT_CORE_SUBJECTS: RecommendationSubject[] = [
  { subjectId: 'math', subjectName: 'Mathematics' },
  { subjectId: 'english', subjectName: 'English' },
  { subjectId: 'science', subjectName: 'Science' },
  { subjectId: 'kiswahili', subjectName: 'Kiswahili' },
  { subjectId: 'social', subjectName: 'Social Studies' }
];

const SUBJECT_NAME_BY_ID: Record<string, string> = {
  math: 'Mathematics',
  english: 'English',
  science: 'Science',
  kiswahili: 'Kiswahili',
  social: 'Social Studies',
  agriculture: 'Agriculture',
  creative_arts: 'Creative Arts',
  religious_education: 'Religious Education',
  ai_education: 'AI Education',
  'cbc-biology': 'Biology',
  'cbc-chemistry': 'Chemistry',
  'cbc-physics': 'Physics',
  'cbc-computer-studies': 'Computer Studies',
  'cbc-history-citizenship': 'History & Citizenship',
  'cbc-geography': 'Geography',
  'cbc-business-education': 'Business Education'
};

const SUBJECT_ID_ALIASES: Record<string, string> = {
  mathematics: 'math',
  math: 'math',
  english: 'english',
  science: 'science',
  'general science': 'science',
  kiswahili: 'kiswahili',
  'social studies': 'social',
  social: 'social',
  agriculture: 'agriculture',
  'creative arts': 'creative_arts',
  'religious education': 'religious_education',
  'ai education': 'ai_education'
};

export function requiredSubjectCountForGrade(grade: string | null | undefined): number {
  const gradeNumber = Number(String(grade ?? '').match(/\d+/)?.[0] ?? NaN);

  if (gradeNumber >= 1 && gradeNumber <= 3) return 7;
  if (gradeNumber >= 4 && gradeNumber <= 6) return 8;
  if (gradeNumber >= 7 && gradeNumber <= 9) return 9;
  if (gradeNumber >= 10 && gradeNumber <= 12) return 7;
  return 5;
}

export function isExactSubjectSelection(
  grade: string | null | undefined,
  subjectIds: string[] | null | undefined,
): boolean {
  const requiredCount = requiredSubjectCountForGrade(grade);
  return Boolean(subjectIds)
    && subjectIds!.length === requiredCount
    && new Set(subjectIds).size === subjectIds!.length;
}

export function canonicalSubjectId(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return SUBJECT_ID_ALIASES[normalized]
    ?? (value.startsWith('cbc-') ? value : `cbc-${normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
}

export function subjectNameFromId(subjectId: string) {
  return SUBJECT_NAME_BY_ID[subjectId]
    ?? subjectId
      .replace(/^cbc-/, '')
      .split(/[-_]/)
      .filter(Boolean)
      .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
}

function uniqueSubjects(subjects: RecommendationSubject[]) {
  const seen = new Set<string>();
  return subjects.filter(subject => {
    if (!subject.subjectId || seen.has(subject.subjectId)) return false;
    seen.add(subject.subjectId);
    return true;
  });
}

function stableNoise(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function normalizeSignal(value: number, maximum: number) {
  return maximum > 0 ? value / maximum : 0;
}

function reasonForSubject(
  subjectId: string,
  personalSelections: Record<string, number>,
  gradeSelections: Record<string, number>,
): SubjectRecommendationReason {
  if ((personalSelections[subjectId] ?? 0) > 0) return 'personal_affinity';
  if ((gradeSelections[subjectId] ?? 0) > 0) return 'grade_popularity';
  return 'exploration';
}

function withPositions(
  subjects: Array<RecommendationSubject & { reason: SubjectRecommendationReason }>,
) {
  return subjects.map((subject, index) => ({ ...subject, position: index + 1 }));
}

export function buildSubjectRecommendations(
  signals: SubjectRecommendationSignals,
): BuiltSubjectRecommendations {
  const requiredSubjectCount = requiredSubjectCountForGrade(signals.grade);
  const onboarding = uniqueSubjects(signals.onboardingSubjects).slice(0, requiredSubjectCount);
  const coldStartSubjects = onboarding.length > 0 ? onboarding : DEFAULT_CORE_SUBJECTS;
  const nameById = new Map(coldStartSubjects.map(subject => [subject.subjectId, subject.subjectName]));
  const manualSubjects = uniqueSubjects(
    signals.manualSubjectIds.map(subjectId => ({
      subjectId,
      subjectName: nameById.get(subjectId) ?? subjectNameFromId(subjectId)
    }))
  ).slice(0, requiredSubjectCount);
  const manualMode = signals.mode === 'manual' && manualSubjects.length === requiredSubjectCount;
  const eligible = manualMode ? manualSubjects : coldStartSubjects;

  const totalPersonalSelections = Object.values(signals.personalSelections)
    .reduce((sum, value) => sum + value, 0);
  const reliableWeakest = signals.assignmentPerformance
    .filter(item => item.gradedCount >= 2 && eligible.some(subject => subject.subjectId === item.subjectId))
    .sort((left, right) => left.averageScore - right.averageScore)[0] ?? null;
  const hasCohortSignal = signals.cohortUserCount >= 20
    && Object.values(signals.gradeSelections).some(value => value > 0);
  const insufficientData = !manualMode
    && totalPersonalSelections < 3
    && !hasCohortSignal
    && !reliableWeakest;

  if (insufficientData) {
    const defaults = coldStartSubjects.slice(0, requiredSubjectCount).map(subject => ({
      ...subject,
      reason: 'onboarding_default' as const
    }));
    return {
      mode: 'automatic',
      insufficientData: true,
      chat: withPositions(defaults.slice(0, 4)),
      dashboard: withPositions(defaults)
    };
  }

  const personalMaximum = Math.max(0, ...Object.values(signals.personalSelections));
  const gradeMaximum = Math.max(0, ...Object.values(signals.gradeSelections));
  const ranked = [...eligible].sort((left, right) => {
    const score = (subject: RecommendationSubject) =>
      0.55 * normalizeSignal(signals.personalSelections[subject.subjectId] ?? 0, personalMaximum)
      + 0.25 * normalizeSignal(signals.gradeSelections[subject.subjectId] ?? 0, gradeMaximum)
      + 0.20 * stableNoise(`${signals.userId}:${signals.dateKey}:${subject.subjectId}`);
    return score(right) - score(left);
  });

  const weakestId = reliableWeakest?.subjectId ?? null;
  const flexible = weakestId ? ranked.filter(subject => subject.subjectId !== weakestId) : ranked;
  const weakestSubject = weakestId
    ? eligible.find(subject => subject.subjectId === weakestId) ?? null
    : null;
  const decorate = (subject: RecommendationSubject) => ({
    ...subject,
    reason: manualMode
      ? 'manual_preference' as const
      : reasonForSubject(subject.subjectId, signals.personalSelections, signals.gradeSelections)
  });

  const dashboardSubjects = manualMode
    ? [
        ...eligible.filter(subject => subject.subjectId !== weakestId).map(decorate),
        ...(weakestSubject ? [{ ...weakestSubject, reason: 'lowest_assignment_average' as const }] : [])
      ]
    : [
        ...flexible.slice(0, weakestSubject ? requiredSubjectCount - 1 : requiredSubjectCount).map(decorate),
        ...(weakestSubject ? [{ ...weakestSubject, reason: 'lowest_assignment_average' as const }] : [])
      ];
  const chatSubjects = [
    ...flexible.slice(0, weakestSubject ? 3 : 4).map(decorate),
    ...(weakestSubject ? [{ ...weakestSubject, reason: 'lowest_assignment_average' as const }] : [])
  ];

  return {
    mode: manualMode ? 'manual' : 'automatic',
    insufficientData: false,
    chat: withPositions(chatSubjects.slice(0, 4)),
    dashboard: withPositions(dashboardSubjects.slice(0, requiredSubjectCount))
  };
}
