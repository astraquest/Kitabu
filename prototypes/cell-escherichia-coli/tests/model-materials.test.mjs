import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ECOLI_PALETTE,
  REPRESENTATION,
  applyVisualizationMode,
  createEColiMaterials,
  getEColiDetailProfile,
  getEColiLayerState,
  getEColiMaterialDescriptor,
  getEColiMotionProfile,
} from '../src/model-materials.js';

class FakeColor {
  constructor(value) { this.value = value; }
  set(value) { this.value = value; }
}

class FakeMaterial {
  constructor(parameters) {
    Object.assign(this, parameters);
    this.emissive = new FakeColor(parameters.emissive);
    this.userData = {};
  }
}

const THREE = { MeshStandardMaterial: FakeMaterial, MeshPhysicalMaterial: FakeMaterial, DoubleSide: 2 };

test('creates stable Three.js-compatible semantic materials and aliases', () => {
  const materials = createEColiMaterials(THREE);
  assert.equal(materials.outerMembrane, materials.outer_membrane_lps);
  assert.equal(materials.plasmaMembrane, materials.inner_membrane);
  assert.equal(materials.flagella, materials.flagellum);
  assert.equal(materials.capsule.userData.representation.kind, 'synthetic-hypothesis');
  assert.ok(materials.nucleoid_chromosomal_dna);
  assert.equal(materials.nucleoid_dna, materials.nucleoid_chromosomal_dna);
  assert.equal(materials.plasmids, materials.plasmid_dna);
  assert.notEqual(materials.fimbriae, materials.conjugative_pilus);
  assert.equal(REPRESENTATION.claim, 'schematic-not-photoreal');
});

test('descriptors are deterministic and include non-colour accessibility cues', () => {
  assert.deepEqual(getEColiMaterialDescriptor('outer_membrane'), getEColiMaterialDescriptor('outerMembrane'));
  assert.equal(getEColiMaterialDescriptor('nucleoid').userData.patternCue, 'double-helix');
  assert.equal(ECOLI_PALETTE.nucleoid.requiresNonColorCue, true);
});

test('peel reveals a target layer by translucently retaining outer context', () => {
  const materials = createEColiMaterials(THREE);
  const root = { userData: {}, traverse(visitor) { visitor({ material: materials.capsule }); } };
  const result = applyVisualizationMode(root, materials, 'peel', 'peptidoglycan');

  assert.equal(materials.capsule.opacity, 0.1);
  assert.equal(materials.capsule.depthWrite, false);
  assert.equal(materials.capsule.userData.visibilityState, 'peeled');
  assert.equal(materials.peptidoglycan.userData.selected, true);
  assert.deepEqual(root.userData.visualization, result);
});

test('live UI modes initialize without a selected hotspot', () => {
  const materials = createEColiMaterials(THREE);
  assert.equal(applyVisualizationMode(null, materials, 'explore').partId, null);
  assert.equal(applyVisualizationMode(null, materials, 'peel').partId, 'inner_membrane');
  assert.equal(applyVisualizationMode(null, materials, 'cross-section').partId, 'cytoplasm');
  assert.equal(applyVisualizationMode(null, materials, 'explode').mode, 'explode');
});

test('isolate emphasis does not depend on colour alone', () => {
  const materials = createEColiMaterials(THREE);
  applyVisualizationMode(null, materials, 'isolate', 'nucleoid');

  assert.equal(materials.nucleoid.userData.selected, true);
  assert.equal(materials.nucleoid.emissive.value, ECOLI_PALETTE.selection.color);
  assert.equal(materials.ribosome.opacity, 0.12);
  assert.equal(materials.ribosome.userData.visibilityState, 'deemphasized');
});

test('canonical geometry material keys participate in precise isolate mode', () => {
  const materials = createEColiMaterials(THREE);
  applyVisualizationMode(null, materials, 'isolate', 'conjugative_pilus');
  assert.equal(materials.conjugative_pilus.userData.selected, true);
  assert.equal(materials.fimbriae.userData.selected, false);
});

test('learning-content aliases normalize to canonical geometry semantic IDs', () => {
  const materials = createEColiMaterials(THREE);
  const state = applyVisualizationMode(null, materials, 'isolate', 'nucleoid_dna');
  assert.equal(state.partId, 'nucleoid_chromosomal_dna');
  assert.equal(materials.nucleoid_chromosomal_dna.userData.selected, true);
  assert.equal(applyVisualizationMode(null, materials, 'isolate', 'plasmids').partId, 'plasmid_dna');
  assert.equal(applyVisualizationMode(null, materials, 'isolate', 'flagella').partId, 'flagellum');
});

test('reduced-motion state has zero motion, frequency, and transition durations', () => {
  const motion = getEColiMotionProfile({ reducedMotion: true });
  assert.deepEqual(motion, {
    enabled: false,
    autoRotateRadiansPerSecond: 0,
    flagellumAmplitude: 0,
    flagellumHertz: 0,
    peelTransitionMs: 0,
    isolateTransitionMs: 0,
  });
});

test('detail and layer state helpers return normalized independent data', () => {
  const profile = getEColiDetailProfile('mobile');
  profile.ribosomeCount = 1;
  assert.equal(getEColiDetailProfile('mobile').ribosomeCount, 90);
  assert.deepEqual(
    getEColiLayerState({ peeledLayerIds: ['inner_membrane', 'capsule', 'capsule'] }).peeledLayerIds,
    ['capsule', 'inner-membrane'],
  );
});

test('invalid modes and semantic identifiers fail explicitly', () => {
  const materials = createEColiMaterials(THREE);
  assert.throws(() => applyVisualizationMode(null, materials, 'xray'), RangeError);
  assert.throws(() => applyVisualizationMode(null, materials, 'isolate'), TypeError);
  assert.throws(() => getEColiMaterialDescriptor('mystery-part'), RangeError);
});
