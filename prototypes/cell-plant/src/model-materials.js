const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const PLANT_CELL_PALETTE = Object.freeze({
  standard: Object.freeze({
    cellWall: 0x77a942,
    cellMembrane: 0x8fd15d,
    cytoplasm: 0xb9dc75,
    nucleus: 0x7854a6,
    nuclearEnvelope: 0xb18ad1,
    nucleolus: 0x43296d,
    chloroplast: 0x2f8f4e,
    grana: 0x165b35,
    mitochondrion: 0xe47742,
    cristae: 0x923921,
    vacuole: 0x68bada,
    tonoplast: 0x287f9c,
    golgi: 0xe1a13d,
    endoplasmicReticulum: 0xc878ad,
    ribosome: 0x553c33,
    peroxisome: 0xd2c249,
    plasmodesmata: 0x27401f,
    cutSurface: 0xd6ec9c,
    selection: 0xffd21f,
  }),
  highContrast: Object.freeze({
    cellWall: 0x477a13,
    cellMembrane: 0x9ff55c,
    cytoplasm: 0xe7f6a0,
    nucleus: 0x522381,
    nuclearEnvelope: 0xc7a1ee,
    nucleolus: 0x1f0b3f,
    chloroplast: 0x006b31,
    grana: 0x003d1c,
    mitochondrion: 0xe45016,
    cristae: 0x721b08,
    vacuole: 0x43b9e7,
    tonoplast: 0x005f82,
    golgi: 0xd37a00,
    endoplasmicReticulum: 0xb22b85,
    ribosome: 0x211510,
    peroxisome: 0xb89b00,
    plasmodesmata: 0x102409,
    cutSurface: 0xf1ffd1,
    selection: 0xffea00,
  }),
});

const MATERIAL_SPECS = Object.freeze({
  cellWall: { opacity: 0.34, roughness: 0.82, clearcoat: 0.04, shell: true },
  cellMembrane: { opacity: 0.42, roughness: 0.5, clearcoat: 0.18, shell: true, detail: true },
  cytoplasm: { opacity: 0.16, roughness: 0.9, shell: true },
  nucleus: { opacity: 0.9, roughness: 0.56, clearcoat: 0.12 },
  nuclearEnvelope: { opacity: 0.62, roughness: 0.48, clearcoat: 0.22, shell: true, detail: true },
  nucleolus: { opacity: 1, roughness: 0.62 },
  chloroplast: { opacity: 0.96, roughness: 0.54, clearcoat: 0.12 },
  grana: { opacity: 1, roughness: 0.68 },
  mitochondrion: { opacity: 0.98, roughness: 0.51, clearcoat: 0.1 },
  cristae: { opacity: 1, roughness: 0.64 },
  vacuole: { opacity: 0.18, roughness: 0.34, clearcoat: 0.24, shell: true },
  tonoplast: { opacity: 0.48, roughness: 0.42, clearcoat: 0.16, shell: true, detail: true },
  golgi: { opacity: 0.96, roughness: 0.58, clearcoat: 0.08 },
  endoplasmicReticulum: { opacity: 0.92, roughness: 0.63 },
  ribosome: { opacity: 1, roughness: 0.75 },
  peroxisome: { opacity: 0.98, roughness: 0.52, clearcoat: 0.1 },
  plasmodesmata: { opacity: 1, roughness: 0.72 },
  cutSurface: { opacity: 1, roughness: 0.78, clearcoat: 0.04, detail: true },
});

function hashSeed(value) {
  const text = String(value ?? "plant-cell-materials");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a small, seedable roughness texture without Canvas or browser APIs.
 * It is a material detail channel only; it is never reused as albedo, AO, or normal data.
 */
export function createMembraneDetailTexture(THREE, options = {}) {
  const size = Math.round(clamp(Number(options.size) || 32, 8, 128));
  const random = seededRandom(hashSeed(options.seed));
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const cellularBand = Math.sin(x * 0.73 + Math.sin(y * 0.41)) * 9;
      const fineNoise = (random() - 0.5) * 22;
      const value = Math.round(clamp(154 + cellularBand + fineNoise, 96, 214));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = "plant-cell-membrane-roughness";
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter ?? THREE.LinearFilter;
  texture.generateMipmaps = true;
  if ("colorSpace" in texture && THREE.NoColorSpace !== undefined) texture.colorSpace = THREE.NoColorSpace;
  if (texture.repeat?.set) texture.repeat.set(3, 3);
  texture.needsUpdate = true;
  texture.userData = {
    channel: "roughness",
    deterministic: true,
    seed: String(options.seed ?? "plant-cell-materials"),
  };
  return texture;
}

function buildMaterial(THREE, id, spec, palette, detailTexture, opacityScale) {
  const opacity = clamp(spec.opacity * (spec.shell ? opacityScale : 1), 0.04, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: palette[id],
    emissive: 0x000000,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat ?? 0,
    clearcoatRoughness: 0.68,
    opacity,
    transparent: opacity < 0.999,
    depthWrite: opacity >= 0.72,
    side: THREE.DoubleSide,
    roughnessMap: spec.detail ? detailTexture : null,
  });
  material.name = `plant-cell-${id}`;
  material.userData = {
    semanticId: id,
    materialChannelIntent: spec.detail ? ["solid-albedo", "procedural-roughness"] : ["solid-albedo"],
    baseOpacity: spec.opacity,
    shell: Boolean(spec.shell),
  };
  return material;
}

/**
 * Creates a deterministic, mobile-conscious material set for a volumetric cell cross-section.
 * The caller injects THREE so this module remains usable by both Vite and test environments.
 */
export function createPlantCellMaterials(THREE, options = {}) {
  if (!THREE?.MeshPhysicalMaterial || !THREE?.DataTexture) {
    throw new TypeError("createPlantCellMaterials requires a Three.js-compatible namespace");
  }

  const highContrast = Boolean(options.highContrast);
  const opacityScale = clamp(Number(options.shellOpacityScale) || 1, 0.25, 1.5);
  const palette = highContrast ? PLANT_CELL_PALETTE.highContrast : PLANT_CELL_PALETTE.standard;
  const detailTexture = createMembraneDetailTexture(THREE, {
    seed: options.seed,
    size: options.detailTextureSize,
  });
  const materials = {};

  for (const [id, spec] of Object.entries(MATERIAL_SPECS)) {
    materials[id] = buildMaterial(THREE, id, spec, palette, detailTexture, opacityScale);
  }

  // Semantic aliases share a material deliberately; this lowers mobile draw/material churn.
  materials.roughER = materials.endoplasmicReticulum;
  materials.smoothER = materials.endoplasmicReticulum;

  const selection = new THREE.MeshPhysicalMaterial({
    color: palette.selection,
    emissive: palette.selection,
    emissiveIntensity: highContrast ? 0.42 : 0.28,
    metalness: 0,
    roughness: 0.32,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    opacity: 1,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  selection.name = "plant-cell-selection";
  selection.userData = { semanticId: "selection", accessibleHighContrast: true };
  materials.selection = selection;

  Object.defineProperty(materials, "_appearance", {
    enumerable: false,
    value: { highContrast, opacityScale, selectedPartId: null, detailTexture },
  });
  return materials;
}

/** Mutates an existing bundle to switch contrast, shell visibility, or the selected semantic part. */
export function applyPlantCellMaterialState(materials, state = {}) {
  if (!materials?._appearance) throw new TypeError("Expected a bundle from createPlantCellMaterials");
  const appearance = materials._appearance;
  const highContrast = state.highContrast ?? appearance.highContrast;
  const opacityScale = clamp(Number(state.shellOpacityScale ?? appearance.opacityScale), 0.25, 1.5);
  const selectedPartId = state.selectedPartId ?? null;
  const selectedMaterialId = selectedPartId === "roughER" || selectedPartId === "smoothER"
    ? "endoplasmicReticulum"
    : selectedPartId;
  const palette = highContrast ? PLANT_CELL_PALETTE.highContrast : PLANT_CELL_PALETTE.standard;

  for (const [id, spec] of Object.entries(MATERIAL_SPECS)) {
    const material = materials[id];
    const selected = id === selectedMaterialId;
    material.color.setHex(selected ? palette.selection : palette[id]);
    if (material.emissive?.setHex) material.emissive.setHex(selected ? palette.selection : 0x000000);
    if ("emissiveIntensity" in material) material.emissiveIntensity = selected ? (highContrast ? 0.38 : 0.24) : 0;
    material.opacity = selected ? 1 : clamp(spec.opacity * (spec.shell ? opacityScale : 1), 0.04, 1);
    material.transparent = material.opacity < 0.999;
    material.depthWrite = selected || material.opacity >= 0.72;
    material.needsUpdate = true;
  }

  materials.selection.color.setHex(palette.selection);
  if (materials.selection.emissive?.setHex) materials.selection.emissive.setHex(palette.selection);
  materials.selection.emissiveIntensity = highContrast ? 0.42 : 0.28;
  materials.selection.needsUpdate = true;
  Object.assign(appearance, { highContrast, opacityScale, selectedPartId });
  return materials;
}

export function disposePlantCellMaterials(materials) {
  if (!materials) return;
  const uniqueMaterials = new Set(Object.values(materials).filter((value) => value?.dispose));
  const textures = new Set();
  for (const material of uniqueMaterials) {
    for (const key of ["map", "roughnessMap", "normalMap", "aoMap", "alphaMap"]) {
      if (material[key]?.dispose) textures.add(material[key]);
    }
  }
  textures.forEach((texture) => texture.dispose());
  uniqueMaterials.forEach((material) => material.dispose());
}

export default createPlantCellMaterials;
