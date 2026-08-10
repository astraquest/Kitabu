import { createHash } from 'node:crypto';

import { GENERIC_SAMPLE_COMPONENT_IDS, buildGenericSampleScene } from './genericSampleScene.js';
import { BUSINESS_LIFE_SKILLS_SAMPLES } from './generativeSamples/businessLifeSkills.js';
import { LANGUAGE_SOCIAL_DIGITAL_SAMPLES } from './generativeSamples/languageSocialDigital.js';
import { LOWER_PRIMARY_MATH_SCIENCE_SAMPLES } from './generativeSamples/lowerPrimaryMathScience.js';
import { buildLowerPrimaryFirstWaveSampleBundle } from './lowerPrimaryFirstWaveSample.js';
import type { PublishableBundle } from './publishingValidation.js';
import type { ComponentScenePayload } from './types.js';

const COMPONENT_VERSION = '1.0.0' as const;
const SCENE_VERSION = '1.0.0' as const;
const ASSET_MANIFEST = { manifestVersion: 1, assets: [] } as const;
type CatalogueScene = ComponentScenePayload;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function gradeRank(sceneId: string): number {
  if (sceneId.includes('lower-primary')) return 0;
  const match = sceneId.match(/(?:^|[-.])g(\d+)(?:[-.])/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/** Builds the deterministic, learner-safe 50-component generative UI preview bundle. */
export function buildGenerativeUiCatalogueSampleBundle(): PublishableBundle {
  const firstWave = buildLowerPrimaryFirstWaveSampleBundle();
  const genericScenes = [
    ...LOWER_PRIMARY_MATH_SCIENCE_SAMPLES,
    ...LANGUAGE_SOCIAL_DIGITAL_SAMPLES,
    ...BUSINESS_LIFE_SKILLS_SAMPLES,
  ].map(buildGenericSampleScene);
  const scenes = [...(firstWave.scenes as CatalogueScene[]), ...genericScenes]
    .map((scene, index) => ({ scene, index }))
    .sort((left, right) => gradeRank(left.scene.identity.sceneId) - gradeRank(right.scene.identity.sceneId) || left.index - right.index)
    .map(({ scene }) => scene);
  const componentIds = scenes.map(scene => scene.component.componentId);
  const expectedComponentIds = [
    'trace-construct',
    'authored-interaction',
    'structured-response',
    'classify-sort-match-rank',
    ...GENERIC_SAMPLE_COMPONENT_IDS,
  ];
  if (scenes.length !== expectedComponentIds.length || new Set(componentIds).size !== componentIds.length ||
      expectedComponentIds.some(componentId => !componentIds.includes(componentId))) {
    throw new Error('Generative UI catalogue must contain one scene per installed component');
  }

  const sceneEntries = scenes.map(scene => ({
    scene,
    reference: {
      sceneId: scene.identity.sceneId,
      sceneVersion: SCENE_VERSION,
      path: `generative-ui-catalogue/${scene.identity.sceneId}.scene.json`,
      sha256: digestJson(scene),
    },
  }));
  const assetReference = {
    path: 'generative-ui-catalogue/assets.json',
    sha256: digestJson(ASSET_MANIFEST),
  };
  const payloadDigest = sha256([
    `${assetReference.path}\0${assetReference.sha256}`,
    ...sceneEntries.map(({ reference }) => `${reference.path}\0${reference.sha256}`),
  ].join('\n'));
  const manifest = {
    manifestVersion: 1,
    bundleId: 'ken-cbc-generative-ui-catalogue',
    revision: '2026-08-10.1',
    sha256: payloadDigest,
    protocolVersion: '1.0.1',
    sceneSchemaVersion: '1.0.1',
    minimumAppBuild: 1,
    components: componentIds.map(componentId => ({ componentId, componentVersion: COMPONENT_VERSION })),
    graders: [
      { graderId: 'kitabu.sealed-numeric-answer', graderVersion: COMPONENT_VERSION },
      { graderId: 'ordered-item-ids', graderVersion: COMPONENT_VERSION },
    ],
    assetManifest: assetReference,
    scenes: sceneEntries.map(({ reference }) => reference),
    release: { channel: 'preview' as const, releaseId: 'generative-ui-catalogue-2026-08-10-1' },
  } as const;

  return { manifest, scenes, assetManifest: ASSET_MANIFEST };
}

export const GENERATIVE_UI_CATALOGUE_SAMPLE_BUNDLE = buildGenerativeUiCatalogueSampleBundle();
