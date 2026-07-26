import type { PrivacyClass, SemVer } from './contract.js';

export type LearnerRecordKind = 'submission' | 'evidence' | 'snapshot';

export type PrivacyRisk = 'standard' | 'learner-content' | 'sensitive' | 'raw-media';

export interface RetentionReference {
  /** Stable identifier owned by the server's retention-policy catalogue. */
  policyId: string;
  policyVersion: SemVer;
}

export interface BlobReference {
  kind: 'blob-ref';
  blobId: string;
  mimeType: string;
  sha256?: string;
  sizeBytes?: number;
}

export interface LearnerRecordPrivacy {
  recordKind: LearnerRecordKind;
  privacyClass: PrivacyClass;
  retention: RetentionReference;
  /** Raw media is kept outside event, evidence, and snapshot payloads. */
  media?: readonly BlobReference[];
}

export interface PrivacyValidationIssue {
  path: string;
  code:
    | 'invalid-record-kind'
    | 'invalid-privacy-class'
    | 'invalid-retention-reference'
    | 'invalid-blob-reference'
    | 'missing-blob-reference'
    | 'embedded-raw-media';
  message: string;
}

export type PrivacyValidationResult =
  | { ok: true; value: LearnerRecordPrivacy }
  | { ok: false; issues: PrivacyValidationIssue[] };

const PRIVACY_CLASSES: ReadonlySet<string> = new Set([
  'ordinary-learning-event',
  'learner-authored-content',
  'sensitive-inference',
  'raw-audio',
  'raw-image-video',
  'precise-location',
  'biometric-or-pose',
]);

const RECORD_KINDS: ReadonlySet<string> = new Set(['submission', 'evidence', 'snapshot']);

const RAW_MEDIA_CLASSES: ReadonlySet<PrivacyClass> = new Set([
  'raw-audio',
  'raw-image-video',
  'biometric-or-pose',
]);

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[a-f\d]{64}$/i;
const EMBEDDED_MEDIA_DATA = /^data:(audio|image|video)\//i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPrivacyClass(value: unknown): value is PrivacyClass {
  return typeof value === 'string' && PRIVACY_CLASSES.has(value);
}

export function classifyPrivacy(privacyClass: PrivacyClass): PrivacyRisk {
  switch (privacyClass) {
    case 'ordinary-learning-event':
      return 'standard';
    case 'learner-authored-content':
      return 'learner-content';
    case 'raw-audio':
    case 'raw-image-video':
      return 'raw-media';
    default:
      return 'sensitive';
  }
}

export function isRawMediaPrivacyClass(privacyClass: PrivacyClass): boolean {
  return RAW_MEDIA_CLASSES.has(privacyClass);
}

export function validateRetentionReference(input: unknown): input is RetentionReference {
  return (
    isRecord(input) &&
    isNonEmptyString(input.policyId) &&
    typeof input.policyVersion === 'string' &&
    SEMVER.test(input.policyVersion)
  );
}

export function validateBlobReference(input: unknown): input is BlobReference {
  return (
    isRecord(input) &&
    input.kind === 'blob-ref' &&
    isNonEmptyString(input.blobId) &&
    isNonEmptyString(input.mimeType) &&
    (input.sha256 === undefined || (typeof input.sha256 === 'string' && SHA256.test(input.sha256))) &&
    (input.sizeBytes === undefined ||
      (typeof input.sizeBytes === 'number' && Number.isSafeInteger(input.sizeBytes) && input.sizeBytes >= 0))
  );
}

/** Detects media data URLs. It deliberately does not guess whether ordinary text is base64. */
export function containsEmbeddedRawMedia(input: unknown): boolean {
  if (typeof input === 'string') return EMBEDDED_MEDIA_DATA.test(input);
  if (Array.isArray(input)) return input.some(containsEmbeddedRawMedia);
  if (!isRecord(input)) return false;
  return Object.values(input).some(containsEmbeddedRawMedia);
}

/**
 * Validates privacy metadata shared by submission, evidence, and snapshot records.
 * `payload` is optional so callers can validate metadata before constructing a record.
 */
export function validateLearnerRecordPrivacy(
  input: unknown,
  payload?: unknown,
): PrivacyValidationResult {
  const issues: PrivacyValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{ path: '$', code: 'invalid-privacy-class', message: 'Privacy metadata must be an object.' }],
    };
  }

  if (typeof input.recordKind !== 'string' || !RECORD_KINDS.has(input.recordKind)) {
    issues.push({ path: 'recordKind', code: 'invalid-record-kind', message: 'Record kind is not supported.' });
  }

  const privacyClass = input.privacyClass;
  if (!isPrivacyClass(privacyClass)) {
    issues.push({ path: 'privacyClass', code: 'invalid-privacy-class', message: 'Privacy class is not supported.' });
  }

  if (!validateRetentionReference(input.retention)) {
    issues.push({
      path: 'retention',
      code: 'invalid-retention-reference',
      message: 'Retention must reference a policy ID and semantic policy version.',
    });
  }

  const media = input.media;
  if (media !== undefined && (!Array.isArray(media) || media.some((item) => !validateBlobReference(item)))) {
    issues.push({
      path: 'media',
      code: 'invalid-blob-reference',
      message: 'Media entries must be valid blob references.',
    });
  }

  if (isPrivacyClass(privacyClass) && isRawMediaPrivacyClass(privacyClass) && (!Array.isArray(media) || media.length === 0)) {
    issues.push({
      path: 'media',
      code: 'missing-blob-reference',
      message: 'Raw media records require at least one blob reference.',
    });
  }

  if (containsEmbeddedRawMedia(payload)) {
    issues.push({
      path: 'payload',
      code: 'embedded-raw-media',
      message: 'Raw audio, image, and video must be supplied as blob references, not embedded data URLs.',
    });
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: input as unknown as LearnerRecordPrivacy };
}
