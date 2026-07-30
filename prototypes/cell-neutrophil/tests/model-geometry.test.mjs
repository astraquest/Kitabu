import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createNeutrophilGeometry, SEMANTIC_PART_IDS } from "../src/model-geometry.js";

const EXPECTED_IDS = [
  "plasma-membrane",
  "cytoplasm",
  "nucleus",
  "nuclear-lobes",
  "chromatin-bridges",
  "azurophilic-granules",
  "specific-granules",
];

test("builds all locked semantic parts as addressable volumetric nodes", () => {
  const model = createNeutrophilGeometry(THREE);
  assert.deepEqual(SEMANTIC_PART_IDS, EXPECTED_IDS);
  assert.deepEqual(model.root.userData.semanticParts, EXPECTED_IDS);
  for (const id of EXPECTED_IDS) {
    assert.ok(model.parts[id]?.isObject3D, `${id} must resolve to an Object3D`);
    assert.equal(model.parts[id].userData.semanticId, id);
  }
  assert.equal(model.metrics.semanticPartCount, 7);
  assert.ok(model.metrics.drawCalls >= 10);
  assert.ok(model.metrics.triangleCount > 10_000);
  assert.ok(model.metrics.triangleCount < 250_000);
  assert.ok(model.metrics.membraneAxisSamples.x > 20);
  assert.ok(model.metrics.membraneAxisSamples.y > 20);
  assert.ok(model.metrics.membraneAxisSamples.z > 20);
  model.dispose();
});

test("models a mature segmented nucleus with connected lobes", () => {
  const model = createNeutrophilGeometry(THREE);
  const nucleus = model.parts.nucleus;
  const lobes = model.parts["nuclear-lobes"].children;
  const strands = model.parts["chromatin-bridges"].children;
  assert.equal(lobes.length, 4);
  assert.equal(strands.length, 3);
  assert.equal(model.metrics.nucleusLobeCount, 4);
  assert.equal(model.metrics.nuclearStrandCount, 3);
  assert.ok(strands.every((strand) => strand.geometry.attributes.position.count > 50));
  model.dispose();
});

test("seeded intracellular populations are deterministic", () => {
  const first = createNeutrophilGeometry(THREE, { seed: 77 });
  const second = createNeutrophilGeometry(THREE, { seed: 77 });
  const changed = createNeutrophilGeometry(THREE, { seed: 78 });
  const matrixA = new THREE.Matrix4();
  const matrixB = new THREE.Matrix4();
  const matrixC = new THREE.Matrix4();
  first.parts["azurophilic-granules"].getMatrixAt(0, matrixA);
  second.parts["azurophilic-granules"].getMatrixAt(0, matrixB);
  changed.parts["azurophilic-granules"].getMatrixAt(0, matrixC);
  assert.deepEqual(matrixA.elements, matrixB.elements);
  assert.notDeepEqual(matrixA.elements, matrixC.elements);
  assert.equal(first.parts["azurophilic-granules"].count, 34);
  assert.equal(first.parts["specific-granules"].count, 64);
  first.dispose();
  second.dispose();
  changed.dispose();
});

test("supports cross-section, explode, isolate, and reversible deformation", () => {
  const model = createNeutrophilGeometry(THREE);
  model.setViewMode("cross-section");
  assert.equal(model.root.userData.viewMode, "cross-section");
  assert.equal(model.parts["nuclear-lobes"].children[0].material.clippingPlanes.length, 1);

  model.setViewMode("explode");
  assert.equal(model.root.userData.explodeAmount, 1);
  assert.ok(model.parts["plasma-membrane"].position.length() > 2);
  assert.ok(model.parts.cytoplasm.position.distanceTo(model.parts["plasma-membrane"].position) > 4);

  assert.equal(model.isolate("nuclear-lobes"), true);
  assert.equal(model.parts.nucleus.visible, true);
  assert.equal(model.parts["nuclear-lobes"].visible, true);
  assert.equal(model.parts["chromatin-bridges"].visible, false);
  assert.equal(model.parts["plasma-membrane"].visible, false);
  model.resetIsolation();
  assert.ok(EXPECTED_IDS.every((id) => model.parts[id].visible));

  const membranePositions = model.parts["plasma-membrane"].geometry.attributes.position;
  const before = Array.from(membranePositions.array);
  model.setMembraneDeformation(0.12);
  const after = Array.from(membranePositions.array);
  assert.ok(after.some((value, index) => Math.abs(value - before[index]) > 1e-6));
  assert.equal(model.root.userData.deformationAmplitude, 0.12);
  model.dispose();
});
