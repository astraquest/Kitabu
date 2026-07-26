import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  validateRuntimeEnvelope,
  type RuntimeEnvelope,
} from '../../src/interactive-learning/index.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface EvidenceFixture {
  schemaVersion: string;
  evidenceId: string;
  sourceEventIds: string[];
  claim: {
    claimId: string;
    evidenceType: string;
    strength: number;
    confidence?: number;
  };
  scorer: {
    scorerId: string;
    scorerVersion: string;
    graderId: string;
    graderVersion: string;
  };
  assistance: {
    level: number;
    attribution: string;
    independentEvidenceEligible: boolean;
    tutorActionIds: string[];
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
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(packageRoot, relativePath), 'utf8')) as T;
}

function formatErrors(validate: ValidateFunction): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
const validateEvidence = ajv.compile(
  readJson('schemas/interactive-learning/evidence-envelope.schema.json'),
);

const interaction = readJson<RuntimeEnvelope>(
  'fixtures/grade-6/valid-interaction.event.json',
);
const evidence = readJson<EvidenceFixture>('fixtures/grade-6/valid-evidence.json');

test('Grade 6 evidence is valid and traces to a valid source interaction', () => {
  assert.equal(validateEvidence(evidence), true, formatErrors(validateEvidence));

  const sourceResult = validateRuntimeEnvelope(interaction);
  assert.equal(sourceResult.ok, true);
  assert.equal(interaction.type, 'INTERACTION');
  assert.deepEqual(evidence.sourceEventIds, [interaction.eventId]);
});

test('Grade 6 evidence pins the exact content, component, attempt, and grader identity', () => {
  assert.equal(evidence.pins.bundleId, interaction.versions.bundleId);
  assert.equal(evidence.pins.bundleVersion, interaction.versions.bundleVersion);
  assert.equal(evidence.pins.sceneId, interaction.sceneId);
  assert.equal(evidence.pins.sceneVersion, interaction.versions.sceneVersion);
  assert.equal(evidence.pins.componentId, interaction.componentId);
  assert.equal(evidence.pins.componentVersion, interaction.versions.componentVersion);
  assert.equal(evidence.pins.sessionId, interaction.sessionId);
  assert.equal(evidence.pins.attemptId, interaction.attemptId);
  assert.equal(evidence.scorer.graderId, interaction.versions.graderId);
  assert.equal(evidence.scorer.graderVersion, interaction.versions.graderVersion);
});

test('Grade 6 evidence records bounded confidence and honest independent-work semantics', () => {
  assert.ok(evidence.claim.strength >= 0 && evidence.claim.strength <= 1);
  assert.ok(
    evidence.claim.confidence === undefined ||
      (evidence.claim.confidence >= 0 && evidence.claim.confidence <= 1),
  );
  assert.equal(evidence.assistance.level, 0);
  assert.equal(evidence.assistance.attribution, 'none');
  assert.equal(evidence.assistance.independentEvidenceEligible, true);
  assert.deepEqual(evidence.assistance.tutorActionIds, []);
});

const structurallyInvalidEvidence = [
  'missing-source-event-ids.json',
  'bad-confidence-strength.json',
  'unpinned-scorer-grader.json',
  'privacy-retention-errors.json',
] as const;

for (const fixtureName of structurallyInvalidEvidence) {
  test(`rejects invalid evidence fixture ${fixtureName}`, () => {
    const candidate = readJson(`fixtures/invalid/evidence/${fixtureName}`);
    assert.equal(validateEvidence(candidate), false, `${fixtureName} unexpectedly passed`);
    assert.ok(validateEvidence.errors?.length, 'rejection must explain the schema violation');
  });
}

test('semantic-only invalid fixtures stay schema-valid for the trace-aware boundary', () => {
  for (const fixtureName of [
    'dangling-claim.json',
    'forged-independent-after-assistance.json',
  ]) {
    const candidate = readJson(`fixtures/invalid/evidence/${fixtureName}`);
    assert.equal(validateEvidence(candidate), true, formatErrors(validateEvidence));
  }
});
