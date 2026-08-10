import { createHash } from 'node:crypto';

import { buildStructuredResponseScene } from './sceneBuilder.js';
import type { PublishableBundle } from './publishingValidation.js';

const COMPONENT_VERSION = '1.0.0' as const;
const SCENE_VERSION = '1.0.0' as const;

const sampleScenes = [
  {
    identity: { sceneId: 'ken-cbc-g1-mathematics.trace-curved-line-001', schemaVersion: '1.0.1' },
    component: { componentId: 'trace-construct', componentVersion: COMPONENT_VERSION },
    purpose: 'instruction',
    prompt: { default: 'Choose the curved line.' },
    props: {
      mode: 'trace-path',
      targets: [
        { id: 'curved-line', label: '〰', accessibleDescription: 'A curved line' },
        { id: 'straight-line', label: '—', accessibleDescription: 'A straight line' },
      ],
      selectionCount: 1,
      instruction: { default: 'Tap the line that bends.' },
      accessibility: { selectionLabel: { default: 'Line choices' } },
    },
    evidenceClaims: [{
      claimId: 'g1-mathematics-identifies-curved-line',
      description: { default: 'Identifies a curved line from familiar line choices.' },
      evidenceTypes: ['observation'],
    }],
    completion: { completionRuleId: 'component-defined', kind: 'component-defined' },
    tutorPermissions: [],
    assets: { manifestId: 'g1-curved-line-assets', assets: [] },
  },
  {
    identity: { sceneId: 'ken-cbc-g1-science-health.classify-food-001', schemaVersion: '1.0.1' },
    component: { componentId: 'authored-interaction', componentVersion: COMPONENT_VERSION },
    purpose: 'instruction',
    prompt: { default: 'Classify each food as a fruit or a vegetable.' },
    props: {
      mode: 'classify',
      instruction: 'Tap a food, then tap its group.',
      items: [
        { id: 'mango', label: 'Mango', accessibleDescription: 'A mango' },
        { id: 'carrot', label: 'Carrot', accessibleDescription: 'A carrot' },
      ],
      groups: [
        { id: 'fruit', label: 'Fruit' },
        { id: 'vegetable', label: 'Vegetable' },
      ],
    },
    evidenceClaims: [{
      claimId: 'g1-science-health-classifies-food',
      description: { default: 'Classifies familiar foods into fruit and vegetable groups.' },
      evidenceTypes: ['observation'],
    }],
    completion: { completionRuleId: 'component-defined', kind: 'component-defined' },
    tutorPermissions: [],
    assets: { manifestId: 'g1-classify-food-assets', assets: [] },
  },
  buildStructuredResponseScene({
    sceneId: 'ken-cbc-g2-mathematics.count-apples-001',
    prompt: 'Count the apples: 🍎 🍎 🍎 🍎. Enter the number of apples.',
    inputLabel: 'Number of apples',
    evidenceClaim: {
      claimId: 'g2-mathematics-counts-apples',
      description: 'Counts a small set of objects and records the total.',
    },
    graderId: 'kitabu.sealed-numeric-answer',
    purpose: 'practice',
    mode: 'numeric',
    maxAttempts: 2,
  }),
  {
    identity: { sceneId: 'ken-cbc-g2-mathematics.order-numbers-001', schemaVersion: '1.0.1' },
    component: { componentId: 'classify-sort-match-rank', componentVersion: COMPONENT_VERSION },
    purpose: 'practice',
    prompt: { default: 'Order 12, 5, and 9 from smallest to largest.' },
    props: {
      mode: 'ranked-list',
      items: [
        { id: 'number-12', label: '12', value: 12, accessibleDescription: 'twelve' },
        { id: 'number-5', label: '5', value: 5, accessibleDescription: 'five' },
        { id: 'number-9', label: '9', value: 9, accessibleDescription: 'nine' },
      ],
      orderingRules: { direction: 'ascending' },
      allowMultiplePlacements: false,
      unplacedPolicy: 'all-items-required',
      layout: { orientation: 'vertical', showPositionNumbers: true },
      shuffleSeed: 'g2-order-numbers-001',
      explanationPolicy: { required: false },
      keyboardMoveModel: 'move-buttons',
    },
    evidenceClaims: [{
      claimId: 'g2-mathematics-orders-numbers',
      description: { default: 'Orders three numbers from smallest to largest.' },
      evidenceTypes: ['answer'],
    }],
    grader: { graderId: 'ordered-item-ids', graderVersion: '1.0.0', mode: 'exact' },
    completion: {
      completionRuleId: 'ordered-list-complete',
      kind: 'evidence-claims-met',
      requiredClaimIds: ['g2-mathematics-orders-numbers'],
    },
    tutorPermissions: [],
    assets: { manifestId: 'g2-order-numbers-assets', assets: [] },
    attemptPolicy: { maxAttempts: 2, feedbackTiming: 'on-submit', revealAnswer: 'never' },
  },
] as const;

const assetManifest = { manifestVersion: 1, assets: [] } as const;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

/** Builds the deterministic, learner-safe four-renderer preview bundle. */
export function buildLowerPrimaryFirstWaveSampleBundle(): PublishableBundle {
  const sceneEntries = sampleScenes.map((scene) => ({
    scene,
    reference: {
      sceneId: scene.identity.sceneId,
      sceneVersion: SCENE_VERSION,
      path: `lower-primary-first-wave/${scene.identity.sceneId}.scene.json`,
      sha256: digestJson(scene),
    },
  }));
  const assetReference = {
    path: 'lower-primary-first-wave/assets.json',
    sha256: digestJson(assetManifest),
  };
  const payloadDigest = sha256([
    `${assetReference.path}\0${assetReference.sha256}`,
    ...sceneEntries.map(({ reference }) => `${reference.path}\0${reference.sha256}`),
  ].join('\n'));
  const manifest = {
    manifestVersion: 1,
    bundleId: 'ken-cbc-lower-primary-first-wave',
    revision: '2026-08-10.1',
    sha256: payloadDigest,
    protocolVersion: '1.0.1',
    sceneSchemaVersion: '1.0.1',
    minimumAppBuild: 1,
    components: [
      { componentId: 'trace-construct', componentVersion: COMPONENT_VERSION },
      { componentId: 'authored-interaction', componentVersion: COMPONENT_VERSION },
      { componentId: 'structured-response', componentVersion: COMPONENT_VERSION },
      { componentId: 'classify-sort-match-rank', componentVersion: COMPONENT_VERSION },
    ],
    graders: [
      { graderId: 'kitabu.sealed-numeric-answer', graderVersion: '1.0.0' },
      { graderId: 'ordered-item-ids', graderVersion: '1.0.0' },
    ],
    assetManifest: assetReference,
    scenes: sceneEntries.map(({ reference }) => reference),
    release: { channel: 'preview' as const, releaseId: 'lower-primary-first-wave-2026-08-10-1' },
  } as const;

  return {
    manifest,
    scenes: sceneEntries.map(({ scene }) => scene),
    assetManifest,
  };
}

export const LOWER_PRIMARY_FIRST_WAVE_SAMPLE_BUNDLE = buildLowerPrimaryFirstWaveSampleBundle();
