import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPrivacy,
  containsEmbeddedRawMedia,
  type LearnerRecordKind,
  type LearnerRecordPrivacy,
  validateBlobReference,
  validateLearnerRecordPrivacy,
  validateRetentionReference,
} from '../../src/interactive-learning/privacy.ts';

const retention = { policyId: 'learner-records', policyVersion: '1.0.0' as const };

const metadata = (
  recordKind: LearnerRecordKind,
  overrides: Partial<LearnerRecordPrivacy> = {},
): LearnerRecordPrivacy => ({
  recordKind,
  privacyClass: 'ordinary-learning-event',
  retention,
  ...overrides,
});

test('classifies ordinary, authored, raw-media, and sensitive privacy classes', () => {
  assert.equal(classifyPrivacy('ordinary-learning-event'), 'standard');
  assert.equal(classifyPrivacy('learner-authored-content'), 'learner-content');
  assert.equal(classifyPrivacy('raw-audio'), 'raw-media');
  assert.equal(classifyPrivacy('raw-image-video'), 'raw-media');
  assert.equal(classifyPrivacy('sensitive-inference'), 'sensitive');
  assert.equal(classifyPrivacy('precise-location'), 'sensitive');
  assert.equal(classifyPrivacy('biometric-or-pose'), 'sensitive');
});

test('accepts a stable, versioned retention reference', () => {
  assert.equal(validateRetentionReference(retention), true);
});

test('rejects incomplete or unversioned retention references', () => {
  assert.equal(validateRetentionReference({ policyId: '', policyVersion: '1.0.0' }), false);
  assert.equal(validateRetentionReference({ policyId: 'learner-records' }), false);
  assert.equal(validateRetentionReference({ policyId: 'learner-records', policyVersion: 'latest' }), false);
});

test('accepts normal submission, evidence, and snapshot privacy metadata', () => {
  for (const recordKind of ['submission', 'evidence', 'snapshot'] as const) {
    const candidate = metadata(recordKind);
    assert.deepEqual(validateLearnerRecordPrivacy(candidate), { ok: true, value: candidate });
  }
});

test('requires raw audio and image or video records to use blob references', () => {
  for (const privacyClass of ['raw-audio', 'raw-image-video'] as const) {
    const result = validateLearnerRecordPrivacy(metadata('submission', { privacyClass }));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.issues.some((issue) => issue.code === 'missing-blob-reference'));
    }
  }
});

test('accepts a valid raw-media blob reference', () => {
  const blob = {
    kind: 'blob-ref' as const,
    blobId: 'blob/attempt-1/audio-1',
    mimeType: 'audio/webm',
    sha256: 'a'.repeat(64),
    sizeBytes: 4_096,
  };

  assert.equal(validateBlobReference(blob), true);
  const candidate = metadata('evidence', { privacyClass: 'raw-audio', media: [blob] });
  assert.deepEqual(validateLearnerRecordPrivacy(candidate), { ok: true, value: candidate });
});

test('rejects malformed blob references', () => {
  const candidate = metadata('snapshot', {
    privacyClass: 'raw-image-video',
    media: [
      {
        kind: 'blob-ref',
        blobId: '',
        mimeType: 'image/png',
        sha256: 'not-a-digest',
        sizeBytes: -1,
      },
    ],
  });

  const result = validateLearnerRecordPrivacy(candidate);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((issue) => issue.code === 'invalid-blob-reference'));
  }
});

test('detects and rejects unsafe media data URLs nested in payloads', () => {
  const payload = {
    response: {
      recording: 'data:audio/webm;base64,ZmFrZQ==',
    },
  };

  assert.equal(containsEmbeddedRawMedia(payload), true);
  const result = validateLearnerRecordPrivacy(metadata('submission'), payload);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((issue) => issue.code === 'embedded-raw-media'));
  }
});

test('does not mistake ordinary learner text for embedded media', () => {
  const payload = { response: 'A learner may write data:image/png in an explanation.' };
  assert.equal(containsEmbeddedRawMedia(payload), false);
  assert.equal(validateLearnerRecordPrivacy(metadata('submission'), payload).ok, true);
});
