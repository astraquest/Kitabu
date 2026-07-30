import * as THREE from "three";

/**
 * Stable material keys shared by geometry, picking, isolation, and learning hotspots.
 * Colours are intentionally diagrammatic: they separate nested structures at mobile size.
 */
export const MUSCLE_MATERIAL_IDS = Object.freeze([
  "muscle-fiber",
  "sarcolemma",
  "sarcoplasm",
  "myofibril",
  "sarcomere",
  "actin",
  "myosin",
  "z-disc",
  "a-band",
  "i-band",
  "h-zone",
  "m-line",
  "myonucleus",
  "sarcoplasmic-reticulum",
  "terminal-cisterna",
  "t-tubule",
  "triad",
  "mitochondrion",
  "capillary",
  "red-blood-cell",
]);

const MATERIAL_STATE = Symbol("muscleMaterialState");

const SPECS = Object.freeze({
  "muscle-fiber": { color: 0xb44d69, roughness: 0.58, clearcoat: 0.1, group: "fiber" },
  sarcolemma: {
    color: 0xf2a3b7,
    roughness: 0.28,
    clearcoat: 0.35,
    opacity: 0.24,
    side: THREE.DoubleSide,
    group: "membrane",
  },
  sarcoplasm: { color: 0xd77b91, roughness: 0.7, opacity: 0.22, group: "fiber" },
  myofibril: { color: 0x9e3153, roughness: 0.46, clearcoat: 0.12, group: "contractile" },
  sarcomere: { color: 0xd25d7d, roughness: 0.52, opacity: 0.34, group: "contractile" },
  actin: { color: 0xf4b4c1, roughness: 0.52, group: "contractile" },
  myosin: { color: 0x6e244b, roughness: 0.4, clearcoat: 0.08, group: "contractile" },
  "z-disc": { color: 0xf7c65d, roughness: 0.42, emissive: 0x5c2a05, group: "banding" },
  "a-band": { color: 0x7a264f, roughness: 0.5, group: "banding" },
  "i-band": { color: 0xe69aad, roughness: 0.58, group: "banding" },
  "h-zone": { color: 0xbf5879, roughness: 0.5, group: "banding" },
  "m-line": { color: 0xffe2ac, roughness: 0.38, emissive: 0x4d2600, group: "banding" },
  myonucleus: { color: 0x59348f, roughness: 0.34, clearcoat: 0.25, group: "organelle" },
  "sarcoplasmic-reticulum": {
    color: 0xf0bf43,
    roughness: 0.42,
    clearcoat: 0.2,
    opacity: 0.68,
    group: "membrane",
  },
  "terminal-cisterna": {
    color: 0xffd768,
    roughness: 0.38,
    clearcoat: 0.24,
    opacity: 0.76,
    group: "membrane",
  },
  "t-tubule": {
    color: 0x48b8d1,
    roughness: 0.3,
    clearcoat: 0.3,
    opacity: 0.72,
    group: "membrane",
  },
  triad: {
    color: 0x65d6de,
    roughness: 0.32,
    emissive: 0x07363a,
    opacity: 0.58,
    group: "membrane",
  },
  mitochondrion: {
    color: 0xe9822e,
    roughness: 0.38,
    clearcoat: 0.18,
    emissive: 0x4a1800,
    group: "organelle",
  },
  capillary: {
    color: 0xd74a58,
    roughness: 0.3,
    clearcoat: 0.25,
    opacity: 0.46,
    side: THREE.DoubleSide,
    group: "circulation",
  },
  "red-blood-cell": { color: 0xb51f31, roughness: 0.44, clearcoat: 0.08, group: "circulation" },
});

const ALIASES = Object.freeze({
  fiber: "muscle-fiber",
  nucleus: "myonucleus",
  sarcoplasmicReticulum: "sarcoplasmic-reticulum",
  sr: "sarcoplasmic-reticulum",
  tTubule: "t-tubule",
  zDisc: "z-disc",
  aBand: "a-band",
  iBand: "i-band",
  hZone: "h-zone",
  mLine: "m-line",
  rbc: "red-blood-cell",
});

function normalizeQuality(quality) {
  return quality === "mobile" ? "mobile" : "quality";
}

function makeMaterial(id, spec, options) {
  const opacity = spec.opacity ?? 1;
  const material = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    emissive: spec.emissive ?? 0x000000,
    emissiveIntensity: spec.emissive ? 0.1 : 0,
    metalness: 0,
    roughness: Math.min(1, spec.roughness + (options.quality === "mobile" ? 0.06 : 0)),
    clearcoat: options.quality === "mobile" ? 0 : (spec.clearcoat ?? 0),
    clearcoatRoughness: 0.38,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 0.8,
    side: spec.side ?? THREE.FrontSide,
  });

  material.name = `muscle-material:${id}`;
  material.userData = {
    ...material.userData,
    semanticId: id,
    semanticGroup: spec.group,
    materialRole: "educational-anatomy",
    reducedMotion: options.reducedMotion,
    contractionStyle: {
      mode: options.reducedMotion ? "static-contrast" : "subtle-pulse",
      maxEmissiveIntensity: options.reducedMotion ? 0.14 : 0.3,
    },
  };
  material[MATERIAL_STATE] = snapshotMaterial(material);
  return material;
}

function snapshotMaterial(material) {
  return {
    color: material.color.clone(),
    emissive: material.emissive.clone(),
    emissiveIntensity: material.emissiveIntensity,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    roughness: material.roughness,
    clearcoat: material.clearcoat,
  };
}

function restoreMaterial(material) {
  const state = material[MATERIAL_STATE];
  if (!state) return;
  material.color.copy(state.color);
  material.emissive.copy(state.emissive);
  material.emissiveIntensity = state.emissiveIntensity;
  material.opacity = state.opacity;
  material.transparent = state.transparent;
  material.depthWrite = state.depthWrite;
  material.roughness = state.roughness;
  material.clearcoat = state.clearcoat;
  material.needsUpdate = true;
}

function uniqueMaterials(materials) {
  return [...new Set(Object.values(materials).filter((material) => material?.isMaterial))];
}

/**
 * Creates one reusable material per stable semantic structure.
 *
 * @param {{ quality?: "quality"|"mobile", reducedMotion?: boolean }} options
 * @returns {Record<string, THREE.MeshPhysicalMaterial>}
 */
export function createMuscleFiberMaterials(options = {}) {
  const normalized = {
    quality: normalizeQuality(options.quality),
    reducedMotion: Boolean(options.reducedMotion),
  };
  const materials = Object.fromEntries(
    MUSCLE_MATERIAL_IDS.map((id) => [id, makeMaterial(id, SPECS[id], normalized)]),
  );

  // Camel-case aliases keep geometry code readable while canonical IDs remain available to hotspots.
  for (const [alias, id] of Object.entries(ALIASES)) materials[alias] = materials[id];
  return materials;
}

/**
 * Applies a reversible selection, isolation, or exploded-layout treatment.
 * Passing null (or mode "clear") restores the authored PBR state exactly.
 */
export function setMaterialEmphasis(materials, semanticId, options = {}) {
  const mode = options.mode ?? "selection";
  const selected = semanticId ? (ALIASES[semanticId] ?? semanticId) : null;
  const all = uniqueMaterials(materials);

  for (const material of all) restoreMaterial(material);
  if (mode === "clear" || (!selected && mode !== "explode")) return materials;

  for (const material of all) {
    const isSelected = material.userData.semanticId === selected;
    if (isSelected) {
      material.color.lerp(new THREE.Color(options.accent ?? 0xffdc73), mode === "explode" ? 0.18 : 0.28);
      material.emissive.set(options.emissive ?? 0x5b2600);
      material.emissiveIntensity = mode === "explode" ? 0.18 : 0.34;
      material.opacity = Math.max(material.opacity, 0.9);
      material.transparent = material.opacity < 1;
      material.depthWrite = true;
      material.roughness = Math.max(0.22, material.roughness - 0.12);
    } else if (mode === "isolate") {
      material.color.lerp(new THREE.Color(0x6f7582), 0.72);
      material.emissive.set(0x000000);
      material.emissiveIntensity = 0;
      material.opacity = Math.min(material.opacity, 0.075);
      material.transparent = true;
      material.depthWrite = false;
    } else if (mode === "selection") {
      material.color.lerp(new THREE.Color(0x777b86), 0.38);
      material.opacity = Math.min(material.opacity, 0.48);
      material.transparent = true;
      material.depthWrite = false;
    } else if (mode === "explode") {
      // Preserve every part's hue, but reduce glare so separated silhouettes remain readable.
      material.roughness = Math.max(material.roughness, 0.5);
      const minimumOpacity = material.userData.semanticGroup === "membrane" ? 0.42 : 0.72;
      material.opacity = Math.max(material.opacity, minimumOpacity);
      material.transparent = material.opacity < 1;
    }
    material.needsUpdate = true;
  }
  return materials;
}

/**
 * Encodes contraction as a bounded material cue. Reduced-motion mode uses a steady value change,
 * never a time-driven pulse; geometry remains the authoritative source of shortening.
 */
export function setContractionStyle(materials, amount, options = {}) {
  const contraction = THREE.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
  const reducedMotion = options.reducedMotion
    ?? uniqueMaterials(materials).some((material) => material.userData.reducedMotion);

  for (const material of uniqueMaterials(materials)) {
    if (!["contractile", "banding"].includes(material.userData.semanticGroup)) continue;
    restoreMaterial(material);
    const intensity = reducedMotion ? contraction * 0.1 : contraction * 0.22;
    material.color.lerp(new THREE.Color(0xff8a78), contraction * (reducedMotion ? 0.08 : 0.16));
    material.emissive.set(0x661e14);
    material.emissiveIntensity += intensity;
    material.needsUpdate = true;
  }
  return materials;
}

export function disposeMuscleFiberMaterials(materials) {
  for (const material of uniqueMaterials(materials)) material.dispose();
}
