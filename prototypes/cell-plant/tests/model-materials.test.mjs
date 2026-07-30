import assert from "node:assert/strict";
import test from "node:test";

import {
  PLANT_CELL_PALETTE,
  applyPlantCellMaterialState,
  createMembraneDetailTexture,
  createPlantCellMaterials,
  disposePlantCellMaterials,
} from "../src/model-materials.js";

class FakeColor {
  constructor(value = 0) { this.setHex(value); }
  setHex(value) { this.value = value; return this; }
}

class FakeMaterial {
  constructor(options) {
    Object.assign(this, options);
    this.color = new FakeColor(options.color);
    this.emissive = new FakeColor(options.emissive ?? 0);
    this.userData = {};
    this.disposeCount = 0;
  }
  dispose() { this.disposeCount += 1; }
}

class FakeDataTexture {
  constructor(data, width, height, format, type) {
    this.image = { data, width, height };
    this.format = format;
    this.type = type;
    this.repeat = { set: (x, y) => { this.repeatValue = [x, y]; } };
    this.userData = {};
    this.disposeCount = 0;
    this.colorSpace = null;
  }
  dispose() { this.disposeCount += 1; }
}

const THREE = {
  MeshPhysicalMaterial: FakeMaterial,
  DataTexture: FakeDataTexture,
  DoubleSide: "DoubleSide",
  RGBAFormat: "RGBAFormat",
  UnsignedByteType: "UnsignedByteType",
  RepeatWrapping: "RepeatWrapping",
  LinearFilter: "LinearFilter",
  LinearMipmapLinearFilter: "LinearMipmapLinearFilter",
  NoColorSpace: "NoColorSpace",
};

test("seeded membrane detail is deterministic and isolated to roughness data", () => {
  const first = createMembraneDetailTexture(THREE, { seed: "cell-a", size: 8 });
  const second = createMembraneDetailTexture(THREE, { seed: "cell-a", size: 8 });
  const different = createMembraneDetailTexture(THREE, { seed: "cell-b", size: 8 });

  assert.deepEqual(first.image.data, second.image.data);
  assert.notDeepEqual(first.image.data, different.image.data);
  assert.equal(first.image.data.length, 8 * 8 * 4);
  assert.equal(first.userData.channel, "roughness");
  assert.equal(first.colorSpace, THREE.NoColorSpace);
});

test("material factory exposes stable plant-cell semantic keys and intended aliases", () => {
  const materials = createPlantCellMaterials(THREE, { seed: 42 });
  const required = [
    "cellWall", "cellMembrane", "cytoplasm", "nucleus", "nuclearEnvelope", "nucleolus",
    "chloroplast", "grana", "mitochondrion", "cristae", "vacuole", "tonoplast", "golgi",
    "roughER", "smoothER", "ribosome", "peroxisome", "plasmodesmata", "cutSurface", "selection",
  ];

  required.forEach((key) => assert.ok(materials[key], `missing ${key}`));
  assert.equal(materials.roughER, materials.endoplasmicReticulum);
  assert.equal(materials.smoothER, materials.endoplasmicReticulum);
  assert.equal(materials.selection.userData.accessibleHighContrast, true);
});

test("cross-section shells remain readable while internal markers stay opaque", () => {
  const materials = createPlantCellMaterials(THREE, { shellOpacityScale: 0.8 });

  assert.ok(materials.cellWall.opacity < 0.5);
  assert.ok(materials.cytoplasm.opacity < materials.cellWall.opacity);
  assert.equal(materials.cellWall.transparent, true);
  assert.equal(materials.cellWall.depthWrite, false);
  assert.equal(materials.ribosome.opacity, 1);
  assert.equal(materials.ribosome.transparent, false);
});

test("state changes are deterministic, selectable, and high contrast", () => {
  const materials = createPlantCellMaterials(THREE);
  applyPlantCellMaterialState(materials, {
    highContrast: true,
    selectedPartId: "chloroplast",
    shellOpacityScale: 0.5,
  });

  assert.equal(materials.chloroplast.color.value, PLANT_CELL_PALETTE.highContrast.selection);
  assert.equal(materials.chloroplast.opacity, 1);
  assert.equal(materials.chloroplast.depthWrite, true);
  assert.equal(materials.mitochondrion.color.value, PLANT_CELL_PALETTE.highContrast.mitochondrion);
  assert.equal(materials.cellWall.opacity, 0.17);
  assert.equal(materials._appearance.selectedPartId, "chloroplast");

  applyPlantCellMaterialState(materials, { selectedPartId: null, highContrast: false });
  assert.equal(materials.chloroplast.color.value, PLANT_CELL_PALETTE.standard.chloroplast);
  assert.equal(materials.chloroplast.emissiveIntensity, 0);

  applyPlantCellMaterialState(materials, { selectedPartId: "roughER", highContrast: true });
  assert.equal(materials.roughER.color.value, PLANT_CELL_PALETTE.highContrast.selection);
  assert.equal(materials.smoothER, materials.roughER);
});

test("disposal releases aliased materials and shared texture exactly once", () => {
  const materials = createPlantCellMaterials(THREE);
  const texture = materials.cellMembrane.roughnessMap;
  const er = materials.endoplasmicReticulum;

  disposePlantCellMaterials(materials);

  assert.equal(texture.disposeCount, 1);
  assert.equal(er.disposeCount, 1);
  assert.equal(materials.cellWall.disposeCount, 1);
  assert.equal(materials.selection.disposeCount, 1);
});
