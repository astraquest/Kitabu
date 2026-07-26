export const INTERACTIVE_LEARNING_PROTOCOL_VERSION = '1.0.1' as const;

export interface StructuredResponseCompletion {
  response: string;
  clientEventId: string;
  isCorrect: boolean;
}

export interface RuntimeVersionPins {
  bundleId: string;
  bundleVersion: string;
  sceneVersion: string;
  componentVersion: string;
  graderId: string;
  graderVersion: string;
}

export interface StructuredResponseCompletionContext {
  sessionId: string;
  sceneId: string;
  attemptId: string;
  componentId: string;
  sequence: number;
  clientTimestamp: string;
  versions: RuntimeVersionPins;
  claimId: string;
  completionRuleId: string;
  scorerId: string;
  scorerVersion: string;
  responseLatencyMs: number;
  retentionPolicyId: string;
  retentionPolicyVersion: string;
  evidenceRetentionPolicyId: string;
  evidenceRetentionPolicyVersion: string;
}

export interface ProgressiveStructuredResponseSubmission {
  clientEventId: string;
  response: string;
  responseLatencyMs: number;
}

export interface StructuredResponseCompletionEnvelope {
  progressive: ProgressiveStructuredResponseSubmission;
  event: {
    eventId: string;
    idempotencyKey: string;
    type: 'SUBMITTED';
    protocolVersion: typeof INTERACTIVE_LEARNING_PROTOCOL_VERSION;
    sessionId: string;
    sceneId: string;
    attemptId: string;
    componentId: string;
    sequence: number;
    clientTimestamp: string;
    versions: RuntimeVersionPins;
    privacy: {
      privacyClass: 'learner-authored-content';
      retentionPolicyId: string;
      retentionPolicyVersion: string;
    };
    payload: {
      response: string;
      completionRuleId: string;
    };
  };
  evidence: {
    schemaVersion: typeof INTERACTIVE_LEARNING_PROTOCOL_VERSION;
    evidenceId: string;
    sourceEventIds: string[];
    claim: {
      claimId: string;
      evidenceType: 'answer';
      polarity: 'supports' | 'contradicts';
      strength: number;
      confidence: 1;
      data: { correct: boolean };
    };
    scorer: {
      scorerId: string;
      scorerVersion: string;
      kind: 'deterministic';
      graderId: string;
      graderVersion: string;
    };
    assistance: {
      level: 0;
      attribution: 'none';
      independentEvidenceEligible: true;
      tutorActionIds: [];
    };
    privacy: {
      privacyClass: 'learner-authored-content';
      retention: { policyId: string; policyVersion: string };
    };
    pins: {
      bundleId: string;
      bundleVersion: string;
      sceneId: string;
      sceneVersion: string;
      componentId: string;
      componentVersion: string;
      sessionId: string;
      attemptId: string;
    };
  };
}

/**
 * Adapts one completed native structured response at the host boundary.
 * Identity and time are inputs so replaying the same completion is byte-stable.
 */
export function adaptStructuredResponseCompletion(
  completion: StructuredResponseCompletion,
  context: StructuredResponseCompletionContext,
): StructuredResponseCompletionEnvelope {
  const { clientEventId, response, isCorrect } = completion;
  const { versions } = context;

  return {
    progressive: {
      clientEventId,
      response,
      responseLatencyMs: context.responseLatencyMs,
    },
    event: {
      eventId: clientEventId,
      idempotencyKey: clientEventId,
      type: 'SUBMITTED',
      protocolVersion: INTERACTIVE_LEARNING_PROTOCOL_VERSION,
      sessionId: context.sessionId,
      sceneId: context.sceneId,
      attemptId: context.attemptId,
      componentId: context.componentId,
      sequence: context.sequence,
      clientTimestamp: context.clientTimestamp,
      versions: { ...versions },
      privacy: {
        privacyClass: 'learner-authored-content',
        retentionPolicyId: context.retentionPolicyId,
        retentionPolicyVersion: context.retentionPolicyVersion,
      },
      payload: {
        response,
        completionRuleId: context.completionRuleId,
      },
    },
    evidence: {
      schemaVersion: INTERACTIVE_LEARNING_PROTOCOL_VERSION,
      evidenceId: `${clientEventId}:evidence`,
      sourceEventIds: [clientEventId],
      claim: {
        claimId: context.claimId,
        evidenceType: 'answer',
        polarity: isCorrect ? 'supports' : 'contradicts',
        strength: 1,
        confidence: 1,
        data: { correct: isCorrect },
      },
      scorer: {
        scorerId: context.scorerId,
        scorerVersion: context.scorerVersion,
        kind: 'deterministic',
        graderId: versions.graderId,
        graderVersion: versions.graderVersion,
      },
      assistance: {
        level: 0,
        attribution: 'none',
        independentEvidenceEligible: true,
        tutorActionIds: [],
      },
      privacy: {
        privacyClass: 'learner-authored-content',
        retention: {
          policyId: context.evidenceRetentionPolicyId,
          policyVersion: context.evidenceRetentionPolicyVersion,
        },
      },
      pins: {
        bundleId: versions.bundleId,
        bundleVersion: versions.bundleVersion,
        sceneId: context.sceneId,
        sceneVersion: versions.sceneVersion,
        componentId: context.componentId,
        componentVersion: versions.componentVersion,
        sessionId: context.sessionId,
        attemptId: context.attemptId,
      },
    },
  };
}
