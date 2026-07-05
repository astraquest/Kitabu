const QUIZ_BANK_SUBJECT_ID_ALIASES: Record<string, readonly string[]> = {
  math: ['mathematics'],
  social: ['social_studies'],
  computer: ['computer_studies', 'computer_science'],
  ai_education: ['computer_studies', 'computer_science'],
  computer_science: ['computer_studies', 'computer_science'],
  science: ['science_technology', 'integrated_science', 'general_science', 'science'],
  agriculture: ['agriculture', 'agriculture_nutrition'],
  creative_arts: ['creative_arts', 'creative_arts_sports'],
  religious_education: ['religious_education', 'cre_ire_hre'],
  business_studies: ['business_studies', 'business_education']
};

export function resolveQuizBankSubjectIds(subjectId?: string | null): string[] | null {
  const normalized = subjectId?.trim();
  if (!normalized) {
    return null;
  }

  const aliases = QUIZ_BANK_SUBJECT_ID_ALIASES[normalized] ?? [normalized];
  return [...new Set(aliases)];
}

