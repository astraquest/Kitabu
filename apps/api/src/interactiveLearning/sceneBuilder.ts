export type StructuredResponseMode = 'numeric' | 'short-text';

export interface LocalizedTextInput {
  default: string;
  key?: string;
  values?: Record<string, string | number>;
}

export interface StructuredResponseSceneInput {
  sceneId: string;
  prompt: string | LocalizedTextInput;
  inputLabel: string | LocalizedTextInput;
  evidenceClaim: {
    claimId: string;
    description: string | LocalizedTextInput;
    masteryRuleId?: string;
  };
  /** Identifier only. Grading rules and answers remain in the server-side grader. */
  graderId: string;
  purpose?: 'practice' | 'assessment';
  mode?: StructuredResponseMode;
  locale?: string;
  maxAttempts?: number;
  sceneVersion?: `${number}.${number}.${number}`;
  componentVersion?: `${number}.${number}.${number}`;
  graderVersion?: `${number}.${number}.${number}`;
}

export interface StructuredResponseScene {
  identity: { sceneId: string; schemaVersion: `${number}.${number}.${number}` };
  component: { componentId: 'structured-response'; componentVersion: `${number}.${number}.${number}` };
  purpose: 'practice' | 'assessment';
  prompt: LocalizedTextInput;
  props: {
    mode: StructuredResponseMode;
    normalization: {
      allowSurroundingWhitespace: true;
      allowThousandsSeparators: boolean;
      locale: string;
    };
    accessibility: { inputLabel: LocalizedTextInput };
  };
  evidenceClaims: Array<{
    claimId: string;
    description: LocalizedTextInput;
    evidenceTypes: ['answer'];
    masteryRuleId?: string;
  }>;
  grader: {
    graderId: string;
    graderVersion: `${number}.${number}.${number}`;
    mode: 'exact';
  };
  completion: {
    completionRuleId: 'submit-response';
    kind: 'submitted';
    requiredClaimIds: [string];
  };
  tutorPermissions: [];
  assets: { manifestId: string; assets: [] };
  attemptPolicy: {
    maxAttempts: number;
    feedbackTiming: 'after-attempts';
    revealAnswer: 'never';
  };
}

const localized = (value: string | LocalizedTextInput): LocalizedTextInput =>
  typeof value === 'string' ? { default: value } : { ...value };

/** Builds the learner-visible half of a structured-response activity. */
export function buildStructuredResponseScene(
  input: StructuredResponseSceneInput,
): StructuredResponseScene {
  const mode = input.mode ?? 'short-text';
  const claim = input.evidenceClaim;

  return {
    identity: {
      sceneId: input.sceneId,
      schemaVersion: input.sceneVersion ?? '1.0.1',
    },
    component: {
      componentId: 'structured-response',
      componentVersion: input.componentVersion ?? '1.0.0',
    },
    purpose: input.purpose ?? 'practice',
    prompt: localized(input.prompt),
    props: {
      mode,
      normalization: {
        allowSurroundingWhitespace: true,
        allowThousandsSeparators: mode === 'numeric',
        locale: input.locale ?? 'en-KE',
      },
      accessibility: { inputLabel: localized(input.inputLabel) },
    },
    evidenceClaims: [{
      claimId: claim.claimId,
      description: localized(claim.description),
      evidenceTypes: ['answer'],
      ...(claim.masteryRuleId ? { masteryRuleId: claim.masteryRuleId } : {}),
    }],
    grader: {
      graderId: input.graderId,
      graderVersion: input.graderVersion ?? '1.0.0',
      mode: 'exact',
    },
    completion: {
      completionRuleId: 'submit-response',
      kind: 'submitted',
      requiredClaimIds: [claim.claimId],
    },
    tutorPermissions: [],
    assets: { manifestId: `${input.sceneId}.assets`, assets: [] },
    attemptPolicy: {
      maxAttempts: input.maxAttempts ?? 1,
      feedbackTiming: 'after-attempts',
      revealAnswer: 'never',
    },
  };
}
