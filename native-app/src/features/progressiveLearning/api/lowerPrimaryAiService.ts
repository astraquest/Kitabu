import { apiJsonRequest } from '../../../services/requestHelpers';

/**
 * AI support is deliberately separate from checking an answer.  The lesson
 * service remains the only authority for correctness and curriculum progress.
 */
export type LowerPrimaryAiFeedbackRequest = {
  grade: string;
  subjectId: string;
  lessonKey: string;
  stepId: string;
  prompt: string;
  learnerResponse: string;
  authoredHint: string;
  misconceptionCode?: string | null;
  attemptNumber: number;
};

export type LowerPrimaryAiFeedback = {
  message: string;
  nextPrompt?: string;
};

export type LowerPrimaryPracticeVariantRequest = {
  grade: string;
  subjectId: string;
  lessonKey: string;
  stepId: string;
  attemptNumber: number;
};

export type LowerPrimaryPracticeVariant = {
  id: string;
  prompt: string;
  options: string[];
  hint: string;
  componentScene?: Record<string, unknown>;
};

function normalizeText(value: unknown, maximumLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

function normalizeFeedback(value: unknown): LowerPrimaryAiFeedback | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const message = normalizeText(payload.message, 360);
  if (!message) return null;
  const nextPrompt = normalizeText(payload.nextPrompt, 180);
  return nextPrompt ? { message, nextPrompt } : { message };
}

function normalizePracticeVariant(value: unknown): LowerPrimaryPracticeVariant | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const id = normalizeText(payload.id, 100);
  const prompt = normalizeText(payload.prompt, 360);
  const hint = normalizeText(payload.hint, 240);
  const options = Array.isArray(payload.options)
    ? payload.options.map(option => normalizeText(option, 80)).filter(Boolean).slice(0, 4)
    : [];
  if (!id || !prompt || !hint || options.length < 2) return null;
  const componentScene = payload.componentScene;
  return {
    id,
    prompt,
    hint,
    options,
    ...(componentScene && typeof componentScene === 'object'
      ? { componentScene: componentScene as Record<string, unknown> }
      : {}),
  };
}

export async function getLowerPrimaryAiFeedback(
  input: LowerPrimaryAiFeedbackRequest,
): Promise<LowerPrimaryAiFeedback | null> {
  try {
    return normalizeFeedback(await apiJsonRequest<unknown>(
      '/learning/lower-primary/ai-feedback',
      { method: 'POST', body: JSON.stringify(input) },
    ));
  } catch {
    return null;
  }
}

export async function getLowerPrimaryPracticeVariant(
  input: LowerPrimaryPracticeVariantRequest,
): Promise<LowerPrimaryPracticeVariant | null> {
  try {
    return normalizePracticeVariant(await apiJsonRequest<unknown>(
      '/learning/lower-primary/practice-variants',
      { method: 'POST', body: JSON.stringify(input) },
    ));
  } catch {
    return null;
  }
}
