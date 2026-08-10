import { z } from 'zod';
import { deriveEducationalAssetAltText, educationalVisualTypes, type EducationalVisualType } from './classification.js';

const optionalClassificationText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const classificationTerm = z.string().trim().min(1).max(80);

export const educationalAssetClassificationEditSchema = z.object({
  visualType: z.enum(educationalVisualTypes).optional(),
  subject: optionalClassificationText(120),
  topic: optionalClassificationText(160),
  subtopic: optionalClassificationText(160),
  keywords: z.array(classificationTerm).max(50).optional(),
  synonyms: z.array(classificationTerm).max(50).optional(),
  gradeMin: z.number().int().min(0).max(20).nullable().optional(),
  gradeMax: z.number().int().min(0).max(20).nullable().optional(),
  language: z.string().trim().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/).max(8).optional(),
  containsText: z.boolean().optional(),
  altText: optionalClassificationText(500),
  educationalDescription: optionalClassificationText(2_000),
}).strict().refine(value => Object.keys(value).length > 0, {
  message: 'At least one classification field is required',
});

export type EducationalAssetClassificationEdit = z.infer<typeof educationalAssetClassificationEditSchema>;

export interface EducationalAssetClassification {
  visualType: EducationalVisualType;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  keywords: string[];
  synonyms: string[];
  gradeMin: number | null;
  gradeMax: number | null;
  language: string;
  containsText: boolean;
  altText: string | null;
  educationalDescription: string | null;
}

function updated<T>(input: Record<string, unknown>, key: string, existing: T): T {
  return Object.prototype.hasOwnProperty.call(input, key) ? input[key] as T : existing;
}

export function mergeEducationalAssetClassification(
  existing: EducationalAssetClassification,
  input: EducationalAssetClassificationEdit,
  asset: { title: string; description: string | null },
): EducationalAssetClassification {
  const merged = {
    visualType: updated(input, 'visualType', existing.visualType),
    subject: updated(input, 'subject', existing.subject),
    topic: updated(input, 'topic', existing.topic),
    subtopic: updated(input, 'subtopic', existing.subtopic),
    keywords: updated(input, 'keywords', existing.keywords),
    synonyms: updated(input, 'synonyms', existing.synonyms),
    gradeMin: updated(input, 'gradeMin', existing.gradeMin),
    gradeMax: updated(input, 'gradeMax', existing.gradeMax),
    language: updated(input, 'language', existing.language),
    containsText: updated(input, 'containsText', existing.containsText),
    altText: updated(input, 'altText', existing.altText),
    educationalDescription: updated(input, 'educationalDescription', existing.educationalDescription),
  } satisfies EducationalAssetClassification;

  if (merged.gradeMin !== null && merged.gradeMax !== null && merged.gradeMin > merged.gradeMax) {
    throw new Error('gradeMin must be less than or equal to gradeMax');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'altText')) {
    merged.altText = deriveEducationalAssetAltText({
      altText: merged.altText,
      description: asset.description,
      title: asset.title,
    });
  }
  return merged;
}
