import assert from "node:assert/strict";
import test from "node:test";

import {
  PART_IDS,
  applyVisualizationMode,
  createNeutrophilMaterials,
} from "../src/model-materials.js";

class FakeMaterial {
  constructor(values) {
    Object.assign(this, values);
    this.userData = {};
  }
  dispose() {
    this.disposed = true;
  }
}

const THREE = { MeshPhysicalMaterial: FakeMaterial, DoubleSide: 2 };

function node({ partId, material, mesh = false, crossSectionOnly = false } = {}) {
  const value = {
    children: [],
    parent: null,
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    visible: true,
    isMesh: mesh,
    material,
    userData: { semanticPartId: partId, crossSectionOnly },
    add(...children) {
      for (const child of children) {
        child.parent = this;
        this.children.push(child);
      }
    },
    traverse(visitor) {
      visitor(this);
      for (const child of this.children) child.traverse(visitor);
    },
  };
  return value;
}

function fixture(materials) {
  const root = node();
  root.userData = {};
  const membrane = node({ partId: PART_IDS.plasmaMembrane });
  const membraneMesh = node({ material: materials.plasmaMembrane, mesh: true });
  const nucleus = node({ partId: PART_IDS.nucleus });
  const lobe = node({ partId: PART_IDS.nuclearLobes });
  const nucleusMesh = node({ material: materials.nuclearLobes, mesh: true });
  const cutFace = node({ partId: PART_IDS.cytoplasm, material: materials.cytoplasm, mesh: true, crossSectionOnly: true });
  membrane.add(membraneMesh);
  lobe.add(nucleusMesh);
  nucleus.add(lobe);
  root.add(membrane, nucleus, cutFace);
  return { root, membrane, membraneMesh, nucleus, nucleusMesh, cutFace };
}

test("creates distinct PBR materials for every supported biological detail", () => {
  const materials = createNeutrophilMaterials(THREE);
  assert.deepEqual(Object.keys(materials), [
    "plasmaMembrane",
    "cytoplasm",
    "nucleus",
    "nuclearLobes",
    "chromatinBridges",
    "azurophilicGranules",
    "specificGranules",
    "glycogenStores",
    "transportVesicles",
  ]);
  assert.equal(new Set(Object.values(materials)).size, 9);
  assert.equal(materials.plasmaMembrane.side, THREE.DoubleSide);
  assert.equal(materials.cytoplasm.depthWrite, false);
  assert.ok(materials.azurophilicGranules.color !== materials.specificGranules.color);
  assert.equal(materials.nuclearLobes.userData.semanticPartId, PART_IDS.nuclearLobes);
  assert.equal(materials.membrane, materials.plasmaMembrane);
  assert.equal(materials.multilobedNucleus, materials.nuclearLobes);
  assert.equal(materials.primaryGranules, materials.azurophilicGranules);
  assert.equal(materials.secondaryGranules, materials.specificGranules);
  assert.equal(materials.glycogen, materials.glycogenStores);
  assert.equal(materials.vesicles, materials.transportVesicles);
});

test("transparent and explore modes swap variants without mutating source materials", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root, membraneMesh } = fixture(materials);
  const sourceOpacity = materials.plasmaMembrane.opacity;

  applyVisualizationMode(root, materials, "transparent");
  assert.equal(membraneMesh.material.opacity, 0.22);
  assert.equal(materials.plasmaMembrane.opacity, sourceOpacity);

  applyVisualizationMode(root, materials, "explore");
  assert.equal(membraneMesh.material, materials.plasmaMembrane);
});

test("cross-section helpers are only visible in cross-section mode", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root, cutFace } = fixture(materials);

  applyVisualizationMode(root, materials, "explore");
  assert.equal(cutFace.visible, false);
  applyVisualizationMode(root, materials, "cross-section");
  assert.equal(cutFace.visible, true);
  assert.equal(cutFace.material.opacity, 0.18);
});

test("isolate resolves inherited semantic IDs", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root, membraneMesh, nucleusMesh } = fixture(materials);

  applyVisualizationMode(root, materials, "isolate", PART_IDS.nucleus);
  assert.equal(membraneMesh.visible, false);
  assert.equal(nucleusMesh.visible, true);
});

test("explode is idempotent and explore restores original positions", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root, membrane } = fixture(materials);

  applyVisualizationMode(root, materials, "explode", undefined, { explodeDistance: 0.5 });
  const first = [membrane.position.x, membrane.position.y, membrane.position.z];
  applyVisualizationMode(root, materials, "explode", undefined, { explodeDistance: 0.5 });
  assert.deepEqual([membrane.position.x, membrane.position.y, membrane.position.z], first);
  applyVisualizationMode(root, materials, "explore");
  assert.deepEqual([membrane.position.x, membrane.position.y, membrane.position.z], [0, 0, 0]);
});

test("mode changes are always reduced-motion safe", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root } = fixture(materials);
  const result = applyVisualizationMode(root, materials, "explode", undefined, { reducedMotion: true });
  assert.equal(result.reducedMotion, true);
  assert.equal(result.transitionMs, 0);
});

test("rejects invalid modes and isolate selections", () => {
  const materials = createNeutrophilMaterials(THREE);
  const { root } = fixture(materials);
  assert.throws(() => applyVisualizationMode(root, materials, "xray"), /Unsupported/);
  assert.throws(() => applyVisualizationMode(root, materials, "isolate"), /selectedPartId/);
});
