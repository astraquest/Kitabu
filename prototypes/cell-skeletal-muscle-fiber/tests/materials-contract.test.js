import test from "node:test";
import assert from "node:assert/strict";
import {
  MUSCLE_MATERIAL_IDS,
  createMuscleFiberMaterials,
  disposeMuscleFiberMaterials,
  setContractionStyle,
  setMaterialEmphasis,
} from "../src/model-materials.js";

test("creates stable semantic materials for every anatomical layer", () => {
  const materials = createMuscleFiberMaterials();
  for (const id of MUSCLE_MATERIAL_IDS) {
    assert.ok(materials[id]?.isMeshPhysicalMaterial, `${id} must have a physical material`);
    assert.equal(materials[id].userData.semanticId, id);
    assert.equal(materials[id].metalness, 0, `${id} is biological tissue, not metal`);
  }
  assert.strictEqual(materials.tTubule, materials["t-tubule"]);
  assert.strictEqual(materials.sr, materials["sarcoplasmic-reticulum"]);
  assert.strictEqual(materials.nucleus, materials.myonucleus);
  assert.strictEqual(materials.fiber, materials["muscle-fiber"]);
  assert.notStrictEqual(materials.sarcolemma, materials.capillary);
  disposeMuscleFiberMaterials(materials);
});

test("keeps translucent membranes legible without opaque depth occlusion", () => {
  const materials = createMuscleFiberMaterials();
  assert.equal(materials.sarcolemma.transparent, true);
  assert.equal(materials.sarcolemma.depthWrite, false);
  assert.equal(materials.capillary.transparent, true);
  assert.ok(materials["a-band"].color.getHex() !== materials["i-band"].color.getHex());
  disposeMuscleFiberMaterials(materials);
});

test("selection and isolation are reversible and alias aware", () => {
  const materials = createMuscleFiberMaterials();
  const baseline = materials["t-tubule"].color.getHex();
  const otherOpacity = materials.myofibril.opacity;

  setMaterialEmphasis(materials, "tTubule", { mode: "isolate" });
  assert.ok(materials["t-tubule"].emissiveIntensity > 0);
  assert.ok(materials.myofibril.opacity < 0.1);

  setMaterialEmphasis(materials, null);
  assert.equal(materials["t-tubule"].color.getHex(), baseline);
  assert.equal(materials.myofibril.opacity, otherOpacity);
  disposeMuscleFiberMaterials(materials);
});

test("reduced-motion contraction uses a bounded steady visual state", () => {
  const materials = createMuscleFiberMaterials({ reducedMotion: true, quality: "mobile" });
  const baseline = materials.myofibril.emissiveIntensity;
  setContractionStyle(materials, 5);
  assert.equal(materials.myofibril.userData.contractionStyle.mode, "static-contrast");
  assert.ok(materials.myofibril.emissiveIntensity > baseline);
  assert.ok(materials.myofibril.emissiveIntensity <= 0.14);
  assert.equal(materials.sarcolemma.emissiveIntensity, 0);
  disposeMuscleFiberMaterials(materials);
});

test("explode styling works without requiring a selected part", () => {
  const materials = createMuscleFiberMaterials();
  setMaterialEmphasis(materials, null, { mode: "explode" });
  assert.equal(materials.sarcolemma.opacity, 0.42);
  assert.equal(materials.myofibril.opacity, 1);
  disposeMuscleFiberMaterials(materials);
});
