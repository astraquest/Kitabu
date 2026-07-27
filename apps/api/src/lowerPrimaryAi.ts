import { z } from 'zod';

const lowerPrimaryModes = ['picture-choice', 'number-manipulatives', 'classify-sort-match-rank', 'trace-construct'] as const;
const generatedPracticeModes = ['picture-choice', 'number-manipulatives'] as const;

export const lowerPrimaryPracticeVariantSchema = z.object({
  id: z.string().trim().min(1).max(80),
  mode: z.enum(lowerPrimaryModes),
  prompt: z.string().trim().min(3).max(280),
  choices: z.array(z.string().trim().min(1).max(80)).min(2).max(4).optional(),
  answer: z.string().trim().min(1).max(80),
  feedback: z.string().trim().min(3).max(220),
  retryHint: z.string().trim().min(3).max(220),
  progressionLevel: z.number().int().min(1).max(6),
  initialValue: z.number().int().min(0).max(50).optional(),
  target: z.number().int().min(0).max(50).optional(),
  min: z.number().int().min(0).max(50).optional(),
  max: z.number().int().min(0).max(50).optional(),
  tapAlternative: z.string().trim().min(3).max(180).optional()
}).strict();

export type LowerPrimaryPracticeVariant = z.infer<typeof lowerPrimaryPracticeVariantSchema>;

export type LowerPrimaryPracticeLimits = {
  outcomeId: string;
  allowedModes?: readonly string[];
  maxValue?: number;
  recentAnswers?: readonly string[];
};

/** Gates optional AI variants before they can reach the deterministic lesson runtime. */
export function validateLowerPrimaryPracticeVariant(value: unknown, limits: LowerPrimaryPracticeLimits): LowerPrimaryPracticeVariant {
  const variant = lowerPrimaryPracticeVariantSchema.parse(value);
  const allowedModes = limits.allowedModes?.length ? limits.allowedModes : generatedPracticeModes;
  if (!allowedModes.includes(variant.mode)) throw new Error(`Practice mode ${variant.mode} is not allowed for ${limits.outcomeId}`);
  if (variant.mode === 'picture-choice' && !variant.choices?.includes(variant.answer)) {
    throw new Error('Picture-choice practice must include its answer in choices');
  }
  if (variant.mode === 'number-manipulatives') {
    if (variant.target === undefined || String(variant.target) !== variant.answer) {
      throw new Error('Number-manipulatives practice must have a numeric target matching its answer');
    }
    if (variant.min !== undefined && variant.max !== undefined && variant.min > variant.max) {
      throw new Error('Number-manipulatives minimum cannot exceed maximum');
    }
  }
  if (limits.maxValue !== undefined) {
    for (const numericValue of [variant.initialValue, variant.target, variant.min, variant.max]) {
      if (numericValue !== undefined && numericValue > limits.maxValue) {
        throw new Error(`Practice value exceeds the curriculum limit of ${limits.maxValue}`);
      }
    }
  }
  if (limits.recentAnswers?.includes(variant.answer)) throw new Error('Practice answer duplicates a recent attempt');
  return variant;
}

export function parseLowerPrimaryPracticeVariant(text: string, limits: LowerPrimaryPracticeLimits): LowerPrimaryPracticeVariant {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('AI practice response was not valid JSON'); }
  return validateLowerPrimaryPracticeVariant(parsed, limits);
}
