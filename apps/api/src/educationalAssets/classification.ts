export const educationalVisualTypes = ['VOCABULARY_IMAGE', 'ICON', 'PHOTO', 'ILLUSTRATION', 'SCIENTIFIC_DIAGRAM', 'MAP', 'CHEMICAL_STRUCTURE', 'UI_ICON'] as const;
export type EducationalVisualType = typeof educationalVisualTypes[number];
export type EducationalAssetNormalizationStatus = 'original-only' | 'normalized' | 'needs-normalization' | 'quarantined' | 'validated-original' | 'normalized-copy';

export const EDUCATIONAL_ASSET_ALT_TEXT_MAX_LENGTH = 500;

function normalizedAltText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function deriveEducationalAssetAltText(input: {
  altText?: string | null;
  description?: string | null;
  title: string;
}): string {
  const candidate = [input.altText, input.description, input.title]
    .map(normalizedAltText)
    .find(value => value.length > 0);
  if (!candidate) throw new Error('Educational asset title must be non-empty');
  return candidate.length > EDUCATIONAL_ASSET_ALT_TEXT_MAX_LENGTH
    ? candidate.slice(0, EDUCATIONAL_ASSET_ALT_TEXT_MAX_LENGTH).trimEnd()
    : candidate;
}

export function normalizeEducationalGrade(value: string | number | null | undefined): number | null {
  const match = String(value ?? '').match(/\d+/);
  const grade = match ? Number(match[0]) : NaN;
  return Number.isInteger(grade) && grade >= 0 && grade <= 20 ? grade : null;
}

export function educationalAssetOverlapsGrade(input: { gradeMin?: number | null; gradeMax?: number | null }, grade: string | number | null | undefined): boolean {
  const normalized = normalizeEducationalGrade(grade);
  return normalized === null || (input.gradeMin ?? 0) <= normalized && (input.gradeMax ?? 20) >= normalized;
}
