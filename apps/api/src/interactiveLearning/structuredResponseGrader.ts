export interface StructuredResponseGraderRef {
  graderId: string;
  graderVersion: string;
}

export interface GradeStructuredResponseInput {
  graderRef: StructuredResponseGraderRef;
  response: unknown;
}

export type StructuredResponseGrade =
  | {
      accepted: false;
      isCorrect: false;
      misconceptionCode: 'response.required' | 'response.invalid-whole-number' | 'grader.unsupported';
      message: string;
    }
  | {
      accepted: true;
      isCorrect: boolean;
      misconceptionCode: 'whole-number.place-value' | null;
      message: string;
    };

interface SealedWholeNumberConfig {
  expected: bigint;
}

// Grading configuration is deliberately kept in this server-only module. The
// learner-visible scene carries only the matching opaque id and version.
const SEALED_GRADERS = new Map<string, SealedWholeNumberConfig>([
  ['kitabu.sealed-numeric-answer@1.0.0', { expected: 700_000n }]
]);

function graderKey(ref: StructuredResponseGraderRef): string {
  return `${ref.graderId}@${ref.graderVersion}`;
}

function parseWholeNumber(value: unknown): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const text = String(value).trim();
  if (text === '') return null;

  const plainDigits = /^\d+$/.test(text);
  const groupedDigits = /^\d{1,3}(?:,\d{3})+$/.test(text);
  if (!plainDigits && !groupedDigits) return null;

  return BigInt(text.replaceAll(',', ''));
}

/** Grades the first Grade 6 whole-number structured response on the server. */
export function gradeStructuredResponse(input: GradeStructuredResponseInput): StructuredResponseGrade {
  const config = SEALED_GRADERS.get(graderKey(input.graderRef));
  if (!config) {
    return {
      accepted: false,
      isCorrect: false,
      misconceptionCode: 'grader.unsupported',
      message: 'This response cannot be graded with the requested grader.'
    };
  }

  if (typeof input.response === 'string' && input.response.trim() === '') {
    return {
      accepted: false,
      isCorrect: false,
      misconceptionCode: 'response.required',
      message: 'Enter a whole-number response.'
    };
  }

  const response = parseWholeNumber(input.response);
  if (response === null) {
    return {
      accepted: false,
      isCorrect: false,
      misconceptionCode: 'response.invalid-whole-number',
      message: 'Enter digits only, with optional thousands separators.'
    };
  }

  const isCorrect = response === config.expected;
  return {
    accepted: true,
    isCorrect,
    misconceptionCode: isCorrect ? null : 'whole-number.place-value',
    message: isCorrect ? 'Correct.' : 'Review the place value of the digit and try again.'
  };
}
