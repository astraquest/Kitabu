/** Transport-neutral contracts for traceable, replay-safe runtime messages. */

import type { PrivacyClass, SemVer } from './contract.js';

const RUNTIME_PROTOCOL_VERSION = '1.0.1' as const;

export interface RuntimeVersionPins {
  bundleId: string;
  bundleVersion: SemVer;
  sceneVersion: SemVer;
  componentVersion: SemVer;
  graderId: string;
  graderVersion: SemVer;
}

export interface RuntimePrivacyReference {
  privacyClass: PrivacyClass;
  retentionPolicyId: string;
  retentionPolicyVersion: SemVer;
}

export interface EvidenceEnvelope {
  schemaVersion: typeof RUNTIME_PROTOCOL_VERSION;
  evidenceId: string;
  sourceEventIds: string[];
  claim: {
    claimId: string;
    evidenceType: 'answer' | 'construction' | 'process' | 'explanation' | 'observation' | 'creation' | 'collaboration';
    polarity: 'supports' | 'contradicts' | 'inconclusive';
    strength: number;
    confidence?: number;
    data?: Record<string, unknown>;
  };
  scorer: {
    scorerId: string;
    scorerVersion: SemVer;
    kind: 'deterministic' | 'model' | 'rubric' | 'human';
    graderId: string;
    graderVersion: SemVer;
  };
  assistance: {
    level: number;
    attribution: 'none' | 'tutor' | 'teacher' | 'peer' | 'system';
    independentEvidenceEligible: boolean;
    tutorActionIds: string[];
  };
  privacy: {
    privacyClass: PrivacyClass;
    retention: { policyId: string; policyVersion: SemVer };
  };
  pins: RuntimeSequenceScope & {
    bundleId: string;
    bundleVersion: SemVer;
    sceneVersion: SemVer;
    componentVersion: SemVer;
  };
}

export interface RuntimeSequenceScope {
  sessionId: string;
  sceneId: string;
  attemptId: string;
  componentId: string;
}

export interface RuntimeEnvelope<TPayload = unknown> extends RuntimeSequenceScope {
  eventId: string;
  idempotencyKey: string;
  type: RuntimeMessageType;
  protocolVersion: typeof RUNTIME_PROTOCOL_VERSION;
  sequence: number;
  clientTimestamp: string;
  versions: RuntimeVersionPins;
  privacy: RuntimePrivacyReference;
  payload: TPayload;
}

export type RuntimeMessageType =
  | 'LOAD'
  | 'PAUSE'
  | 'RESUME'
  | 'RESTORE_STATE'
  | 'SET_LANGUAGE'
  | 'SET_ACCESSIBILITY'
  | 'REQUEST_SUBMISSION'
  | 'APPLY_TUTOR_ACTION'
  | 'READY'
  | 'INTERACTION'
  | 'EVIDENCE'
  | 'ANSWER_CHANGED'
  | 'HINT_REQUESTED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'STATE_SNAPSHOT'
  | 'CAPABILITY_WARNING'
  | 'TUTOR_ACTION_RESULT'
  | 'ERROR';

const RUNTIME_MESSAGE_TYPES = new Set<RuntimeMessageType>([
  'LOAD', 'PAUSE', 'RESUME', 'RESTORE_STATE', 'SET_LANGUAGE', 'SET_ACCESSIBILITY',
  'REQUEST_SUBMISSION', 'APPLY_TUTOR_ACTION', 'READY', 'INTERACTION', 'EVIDENCE',
  'ANSWER_CHANGED', 'HINT_REQUESTED', 'SUBMITTED', 'COMPLETED', 'STATE_SNAPSHOT',
  'CAPABILITY_WARNING', 'TUTOR_ACTION_RESULT', 'ERROR',
]);

const PRIVACY_CLASSES = new Set<PrivacyClass>([
  'ordinary-learning-event', 'learner-authored-content', 'sensitive-inference',
  'raw-audio', 'raw-image-video', 'precise-location', 'biometric-or-pose',
]);

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const EVIDENCE_TYPES = new Set(['answer', 'construction', 'process', 'explanation', 'observation', 'creation', 'collaboration']);
const EVIDENCE_POLARITIES = new Set(['supports', 'contradicts', 'inconclusive']);
const SCORER_KINDS = new Set(['deterministic', 'model', 'rubric', 'human']);
const ASSISTANCE_ATTRIBUTIONS = new Set(['none', 'tutor', 'teacher', 'peer', 'system']);

export interface ProtocolValidationIssue {
  path: string;
  message: string;
}

export type ProtocolValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ProtocolValidationIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (
  source: Record<string, unknown>,
  field: string,
  issues: ProtocolValidationIssue[],
  prefix = '',
): void => {
  if (typeof source[field] !== 'string' || source[field].trim().length === 0) {
    issues.push({ path: `${prefix}${field}`, message: 'must be a non-empty string' });
  }
};

export function validateRuntimeVersionPins(value: unknown): ProtocolValidationResult<RuntimeVersionPins> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: 'versions', message: 'must be an object' }] };
  }

  const issues: ProtocolValidationIssue[] = [];
  for (const field of ['bundleId', 'graderId']) requireString(value, field, issues, 'versions.');
  for (const field of ['bundleVersion', 'sceneVersion', 'componentVersion', 'graderVersion']) {
    if (typeof value[field] !== 'string' || !SEMVER.test(value[field])) {
      issues.push({ path: `versions.${field}`, message: 'must be a semantic version' });
    }
  }
  return issues.length === 0
    ? { ok: true, value: value as unknown as RuntimeVersionPins }
    : { ok: false, issues };
}

export function validateRuntimePrivacyReference(
  value: unknown,
): ProtocolValidationResult<RuntimePrivacyReference> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: 'privacy', message: 'must be an object' }] };
  }
  const issues: ProtocolValidationIssue[] = [];
  if (typeof value.privacyClass !== 'string' || !PRIVACY_CLASSES.has(value.privacyClass as PrivacyClass)) {
    issues.push({ path: 'privacy.privacyClass', message: 'must be a supported privacy class' });
  }
  requireString(value, 'retentionPolicyId', issues, 'privacy.');
  if (typeof value.retentionPolicyVersion !== 'string' || !SEMVER.test(value.retentionPolicyVersion)) {
    issues.push({ path: 'privacy.retentionPolicyVersion', message: 'must be a semantic version' });
  }
  return issues.length === 0
    ? { ok: true, value: value as unknown as RuntimePrivacyReference }
    : { ok: false, issues };
}

/** Validates evidence at the runtime/storage boundary, including honest assistance attribution. */
export function validateEvidenceEnvelope(value: unknown): ProtocolValidationResult<EvidenceEnvelope> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: '$', message: 'evidence envelope must be an object' }] };
  }
  const issues: ProtocolValidationIssue[] = [];
  if (value.schemaVersion !== RUNTIME_PROTOCOL_VERSION) {
    issues.push({ path: 'schemaVersion', message: `must equal ${RUNTIME_PROTOCOL_VERSION}` });
  }
  requireString(value, 'evidenceId', issues);
  if (!Array.isArray(value.sourceEventIds) || value.sourceEventIds.length === 0) {
    issues.push({ path: 'sourceEventIds', message: 'must contain at least one source event ID' });
  } else if (value.sourceEventIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
    issues.push({ path: 'sourceEventIds', message: 'must contain only non-empty event IDs' });
  } else if (new Set(value.sourceEventIds).size !== value.sourceEventIds.length) {
    issues.push({ path: 'sourceEventIds', message: 'must not contain duplicate event IDs' });
  }

  const claim = value.claim;
  if (!isRecord(claim)) {
    issues.push({ path: 'claim', message: 'must be an object' });
  } else {
    requireString(claim, 'claimId', issues, 'claim.');
    if (typeof claim.evidenceType !== 'string' || !EVIDENCE_TYPES.has(claim.evidenceType)) {
      issues.push({ path: 'claim.evidenceType', message: 'must be a supported evidence type' });
    }
    if (typeof claim.polarity !== 'string' || !EVIDENCE_POLARITIES.has(claim.polarity)) {
      issues.push({ path: 'claim.polarity', message: 'must be a supported polarity' });
    }
    for (const field of ['strength', 'confidence'] as const) {
      if (field === 'confidence' && claim[field] === undefined) continue;
      if (typeof claim[field] !== 'number' || !Number.isFinite(claim[field]) || claim[field] < 0 || claim[field] > 1) {
        issues.push({ path: `claim.${field}`, message: 'must be a finite number from 0 to 1' });
      }
    }
  }

  const scorer = value.scorer;
  if (!isRecord(scorer)) {
    issues.push({ path: 'scorer', message: 'must be an object' });
  } else {
    for (const field of ['scorerId', 'graderId']) requireString(scorer, field, issues, 'scorer.');
    for (const field of ['scorerVersion', 'graderVersion']) {
      if (typeof scorer[field] !== 'string' || !SEMVER.test(scorer[field])) {
        issues.push({ path: `scorer.${field}`, message: 'must be a semantic version' });
      }
    }
    if (typeof scorer.kind !== 'string' || !SCORER_KINDS.has(scorer.kind)) {
      issues.push({ path: 'scorer.kind', message: 'must be a supported scorer kind' });
    }
  }

  const assistance = value.assistance;
  if (!isRecord(assistance)) {
    issues.push({ path: 'assistance', message: 'must be an object' });
  } else {
    if (!Number.isSafeInteger(assistance.level) || (assistance.level as number) < 0) {
      issues.push({ path: 'assistance.level', message: 'must be a non-negative safe integer' });
    }
    if (typeof assistance.attribution !== 'string' || !ASSISTANCE_ATTRIBUTIONS.has(assistance.attribution)) {
      issues.push({ path: 'assistance.attribution', message: 'must be a supported attribution' });
    }
    if (typeof assistance.independentEvidenceEligible !== 'boolean') {
      issues.push({ path: 'assistance.independentEvidenceEligible', message: 'must be a boolean' });
    }
    const actionIds = assistance.tutorActionIds;
    if (!Array.isArray(actionIds) || actionIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
      issues.push({ path: 'assistance.tutorActionIds', message: 'must contain only non-empty tutor action IDs' });
    } else if (new Set(actionIds).size !== actionIds.length) {
      issues.push({ path: 'assistance.tutorActionIds', message: 'must not contain duplicate tutor action IDs' });
    }
    if (assistance.independentEvidenceEligible === true &&
        (assistance.level !== 0 || assistance.attribution !== 'none' || !Array.isArray(actionIds) || actionIds.length !== 0)) {
      issues.push({ path: 'assistance.independentEvidenceEligible', message: 'cannot be true after attributed assistance' });
    }
    if (assistance.attribution === 'none' && assistance.level !== 0) {
      issues.push({ path: 'assistance.attribution', message: 'none requires assistance level 0' });
    }
  }

  const privacy = value.privacy;
  if (!isRecord(privacy)) {
    issues.push({ path: 'privacy', message: 'must be an object' });
  } else {
    if (typeof privacy.privacyClass !== 'string' || !PRIVACY_CLASSES.has(privacy.privacyClass as PrivacyClass)) {
      issues.push({ path: 'privacy.privacyClass', message: 'must be a supported privacy class' });
    }
    if (!isRecord(privacy.retention)) {
      issues.push({ path: 'privacy.retention', message: 'must be an object' });
    } else {
      requireString(privacy.retention, 'policyId', issues, 'privacy.retention.');
      if (typeof privacy.retention.policyVersion !== 'string' || !SEMVER.test(privacy.retention.policyVersion)) {
        issues.push({ path: 'privacy.retention.policyVersion', message: 'must be a semantic version' });
      }
    }
  }

  const pins = value.pins;
  if (!isRecord(pins)) {
    issues.push({ path: 'pins', message: 'must be an object' });
  } else {
    for (const field of ['bundleId', 'sceneId', 'componentId', 'sessionId', 'attemptId']) {
      requireString(pins, field, issues, 'pins.');
    }
    for (const field of ['bundleVersion', 'sceneVersion', 'componentVersion']) {
      if (typeof pins[field] !== 'string' || !SEMVER.test(pins[field])) {
        issues.push({ path: `pins.${field}`, message: 'must be a semantic version' });
      }
    }
  }

  return issues.length === 0
    ? { ok: true, value: value as unknown as EvidenceEnvelope }
    : { ok: false, issues };
}

export function validateRuntimeEnvelope<TPayload = unknown>(
  value: unknown,
): ProtocolValidationResult<RuntimeEnvelope<TPayload>> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: '$', message: 'envelope must be an object' }] };
  }

  const issues: ProtocolValidationIssue[] = [];
  for (const field of [
    'eventId',
    'idempotencyKey',
    'sessionId',
    'sceneId',
    'attemptId',
    'componentId',
  ]) {
    requireString(value, field, issues);
  }

  if (typeof value.type !== 'string' || !RUNTIME_MESSAGE_TYPES.has(value.type as RuntimeMessageType)) {
    issues.push({ path: 'type', message: 'must be a supported runtime message type' });
  }
  if (value.protocolVersion !== RUNTIME_PROTOCOL_VERSION) {
    issues.push({ path: 'protocolVersion', message: `must equal ${RUNTIME_PROTOCOL_VERSION}` });
  }

  if (!Number.isSafeInteger(value.sequence) || (value.sequence as number) < 0) {
    issues.push({ path: 'sequence', message: 'must be a non-negative safe integer' });
  }
  if (
    typeof value.clientTimestamp !== 'string' ||
    value.clientTimestamp.trim().length === 0 ||
    !Number.isFinite(Date.parse(value.clientTimestamp))
  ) {
    issues.push({ path: 'clientTimestamp', message: 'must be a valid date-time string' });
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'payload')) {
    issues.push({ path: 'payload', message: 'is required' });
  }

  const pins = validateRuntimeVersionPins(value.versions);
  if (!pins.ok) issues.push(...pins.issues);
  const privacy = validateRuntimePrivacyReference(value.privacy);
  if (!privacy.ok) issues.push(...privacy.issues);

  return issues.length === 0
    ? { ok: true, value: value as unknown as RuntimeEnvelope<TPayload> }
    : { ok: false, issues };
}

/** Stable scope key; sequence numbers are monotonic only inside this boundary. */
export function runtimeSequenceScopeKey(scope: RuntimeSequenceScope): string {
  return [scope.sessionId, scope.attemptId, scope.sceneId, scope.componentId]
    .map((part) => `${part.length}:${part}`)
    .join('|');
}

export type EnvelopeAcceptance =
  | { accepted: true; status: 'accepted' }
  | { accepted: false; status: 'duplicate'; originalEventId: string }
  | { accepted: false; status: 'sequence-conflict'; originalEventId: string }
  | { accepted: false; status: 'stale-sequence'; latestSequence: number };

interface AcceptedSequence {
  eventId: string;
  idempotencyKey: string;
}

/**
 * Small in-memory duplicate guard for a runtime boundary. Persistence belongs to
 * the host; this class deliberately does not acknowledge durable delivery.
 */
export class RuntimeEnvelopeDuplicateGuard {
  private readonly eventIds = new Map<string, string>();
  private readonly idempotencyKeys = new Map<string, string>();
  private readonly sequences = new Map<string, Map<number, AcceptedSequence>>();
  private readonly latestSequences = new Map<string, number>();

  accept(envelope: RuntimeEnvelope): EnvelopeAcceptance {
    const existingEventScope = this.eventIds.get(envelope.eventId);
    if (existingEventScope !== undefined) {
      return { accepted: false, status: 'duplicate', originalEventId: envelope.eventId };
    }

    const scope = runtimeSequenceScopeKey(envelope);
    const scopedIdempotencyKey = `${scope}|${envelope.idempotencyKey}`;
    const idempotentEvent = this.idempotencyKeys.get(scopedIdempotencyKey);
    if (idempotentEvent !== undefined) {
      return { accepted: false, status: 'duplicate', originalEventId: idempotentEvent };
    }

    const acceptedBySequence = this.sequences.get(scope);
    const atSequence = acceptedBySequence?.get(envelope.sequence);
    if (atSequence !== undefined) {
      return { accepted: false, status: 'sequence-conflict', originalEventId: atSequence.eventId };
    }

    const latest = this.latestSequences.get(scope);
    if (latest !== undefined && envelope.sequence < latest) {
      return { accepted: false, status: 'stale-sequence', latestSequence: latest };
    }

    const scopeSequences = acceptedBySequence ?? new Map<number, AcceptedSequence>();
    scopeSequences.set(envelope.sequence, {
      eventId: envelope.eventId,
      idempotencyKey: envelope.idempotencyKey,
    });
    this.sequences.set(scope, scopeSequences);
    this.latestSequences.set(scope, envelope.sequence);
    this.eventIds.set(envelope.eventId, scope);
    this.idempotencyKeys.set(scopedIdempotencyKey, envelope.eventId);
    return { accepted: true, status: 'accepted' };
  }

  clear(): void {
    this.eventIds.clear();
    this.idempotencyKeys.clear();
    this.sequences.clear();
    this.latestSequences.clear();
  }
}
