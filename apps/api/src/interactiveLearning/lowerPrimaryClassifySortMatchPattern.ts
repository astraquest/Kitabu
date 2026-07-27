/**
 * Deterministic grading contract for Grade 1's concrete-object activities.
 *
 * This is deliberately small and UI-neutral: mobile can offer drag or tap
 * controls, while the submitted value is always a simple JSON record.
 */
export type LowerPrimaryInteractionMode = 'classify' | 'sort' | 'match' | 'pattern';

export interface LowerPrimaryInteractionDefinition {
  mode: LowerPrimaryInteractionMode;
  /** Each expected item id maps to its expected group, position, or partner. */
  expected: Record<string, string | number>;
  /** A concise, child-friendly explanation used after a correct answer. */
  feedback: string;
  /** A concise, child-friendly prompt used after an incorrect answer. */
  retryHint: string;
}

export interface LowerPrimaryInteractionResult {
  correct: boolean;
  answeredCount: number;
  expectedCount: number;
  feedback: string;
  retryHint?: string;
}

type LearnerResponse = Record<string, string | number>;

function responseValues(response: unknown): LearnerResponse {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return {};
  const envelope = response as Record<string, unknown>;
  if (envelope.assignments && typeof envelope.assignments === 'object' && !Array.isArray(envelope.assignments)) {
    return envelope.assignments as LearnerResponse;
  }
  if (Array.isArray(envelope.sequence)) {
    return Object.fromEntries(envelope.sequence.map((value, index) => [`slot-${index}`, value])) as LearnerResponse;
  }
  return envelope as LearnerResponse;
}

function isPrimitiveAnswer(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

/**
 * Grades classify, sort, match and pattern activities without exposing or
 * inferring answers.  Extra learner values are rejected to prevent a partly
 * completed activity from being accepted as correct.
 */
export function evaluateLowerPrimaryInteraction(
  definition: LowerPrimaryInteractionDefinition,
  response: unknown,
): LowerPrimaryInteractionResult {
  const expectedEntries = Object.entries(definition.expected);
  const candidate = responseValues(response);
  const answered = Object.entries(candidate).filter(([, value]) => isPrimitiveAnswer(value));
  const isExact = answered.length === expectedEntries.length && expectedEntries.every(([itemId, answer]) => candidate[itemId] === answer);

  return {
    correct: isExact,
    answeredCount: answered.length,
    expectedCount: expectedEntries.length,
    feedback: isExact ? definition.feedback : definition.retryHint,
    ...(isExact ? {} : { retryHint: definition.retryHint }),
  };
}

/** Validates authored answer data before a mission is compiled or published. */
export function isLowerPrimaryInteractionDefinition(value: unknown): value is LowerPrimaryInteractionDefinition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!['classify', 'sort', 'match', 'pattern'].includes(String(candidate.mode))) return false;
  if (!candidate.expected || typeof candidate.expected !== 'object' || Array.isArray(candidate.expected)) return false;
  const expected = candidate.expected as Record<string, unknown>;
  if (Object.keys(expected).length === 0 || !Object.values(expected).every(isPrimitiveAnswer)) return false;
  return typeof candidate.feedback === 'string' && candidate.feedback.length > 0
    && typeof candidate.retryHint === 'string' && candidate.retryHint.length > 0;
}
