/**
 * Deterministic materials and display modes for the procedural neutrophil.
 *
 * Geometry should set `userData.semanticPartId` to one of PART_IDS. Material
 * role aliases are accepted, but the canonical semantic IDs are preferred.
 */

export const PART_IDS = Object.freeze({
  plasmaMembrane: "plasma-membrane",
  cytoplasm: "cytoplasm",
  nucleus: "nucleus",
  nuclearLobes: "nuclear-lobes",
  chromatinBridges: "chromatin-bridges",
  azurophilicGranules: "azurophilic-granules",
  specificGranules: "specific-granules",
  glycogenStores: "glycogen-stores",
  transportVesicles: "transport-vesicles",
});

export const VISUALIZATION_MODES = Object.freeze([
  "explore",
  "transparent",
  "cross-section",
  "isolate",
  "explode",
]);

const VALID_MODES = new Set(VISUALIZATION_MODES);
const ROOT_STATES = new WeakMap();

const ROLE_ALIASES = Object.freeze({
  membrane: PART_IDS.plasmaMembrane,
  cellMembrane: PART_IDS.plasmaMembrane,
  "cell-membrane": PART_IDS.plasmaMembrane,
  cytoplasm: PART_IDS.cytoplasm,
  nucleus: PART_IDS.nucleus,
  chromatin: PART_IDS.chromatinBridges,
  multilobedNucleus: PART_IDS.nuclearLobes,
  "multilobed-nucleus": PART_IDS.nuclearLobes,
  primaryGranule: PART_IDS.azurophilicGranules,
  primaryGranules: PART_IDS.azurophilicGranules,
  "primary-granules": PART_IDS.azurophilicGranules,
  secondaryGranule: PART_IDS.specificGranules,
  secondaryGranules: PART_IDS.specificGranules,
  "secondary-granules": PART_IDS.specificGranules,
  glycogen: PART_IDS.glycogenStores,
  glycogenStores: PART_IDS.glycogenStores,
  vesicle: PART_IDS.transportVesicles,
  transportVesicles: PART_IDS.transportVesicles,
});

const EXPLODE_DIRECTIONS = Object.freeze({
  [PART_IDS.plasmaMembrane]: [0, 0, 1],
  [PART_IDS.cytoplasm]: [0, 0, -1],
  [PART_IDS.nucleus]: [-0.7, 0.25, 0.35],
  [PART_IDS.nuclearLobes]: [-0.7, 0.25, 0.35],
  [PART_IDS.chromatinBridges]: [-0.45, 0.65, 0.25],
  [PART_IDS.azurophilicGranules]: [0.8, 0.45, 0.25],
  [PART_IDS.specificGranules]: [0.75, -0.55, -0.2],
  [PART_IDS.glycogenStores]: [-0.65, -0.6, -0.25],
  [PART_IDS.transportVesicles]: [-0.35, 0.75, -0.3],
});

function canonicalRole(value) {
  if (!value || typeof value !== "string") return null;
  if (Object.values(PART_IDS).includes(value)) return value;
  return ROLE_ALIASES[value] ?? null;
}

function makeMaterial(THREE, partId, values) {
  const material = new THREE.MeshPhysicalMaterial(values);
  material.name = `neutrophil:${partId}`;
  material.userData = {
    ...(material.userData ?? {}),
    semanticPartId: partId,
    materialRole: partId,
    biologicalApproximation: true,
  };
  return material;
}

function makeMaterialSet(THREE, mode) {
  const transparent = mode === "transparent";
  const section = mode === "cross-section";

  return {
    [PART_IDS.plasmaMembrane]: makeMaterial(THREE, PART_IDS.plasmaMembrane, {
      color: 0xf3a7c1,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.18,
      clearcoatRoughness: 0.58,
      transmission: section ? 0.18 : transparent ? 0.28 : 0.08,
      thickness: 0.07,
      transparent: true,
      opacity: section ? 0.14 : transparent ? 0.22 : 0.9,
      depthWrite: !(section || transparent),
      side: THREE.DoubleSide,
    }),
    [PART_IDS.cytoplasm]: makeMaterial(THREE, PART_IDS.cytoplasm, {
      color: 0xd9c8ec,
      roughness: 0.68,
      metalness: 0,
      transmission: section ? 0.1 : transparent ? 0.16 : 0.04,
      thickness: 0.18,
      transparent: true,
      opacity: section ? 0.18 : transparent ? 0.1 : 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [PART_IDS.nucleus]: makeMaterial(THREE, PART_IDS.nucleus, {
      color: 0x5a367d,
      emissive: 0x12091c,
      emissiveIntensity: 0.08,
      roughness: 0.56,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.75,
      transparent: section,
      opacity: section ? 0.88 : 1,
    }),
    [PART_IDS.nuclearLobes]: makeMaterial(THREE, PART_IDS.nuclearLobes, {
      color: 0x654184,
      emissive: 0x12091c,
      emissiveIntensity: 0.08,
      roughness: 0.58,
      metalness: 0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.75,
      transparent: section,
      opacity: section ? 0.88 : 1,
    }),
    [PART_IDS.chromatinBridges]: makeMaterial(THREE, PART_IDS.chromatinBridges, {
      color: 0x4b2c70,
      emissive: 0x100718,
      emissiveIntensity: 0.08,
      roughness: 0.6,
      metalness: 0,
      clearcoat: 0.06,
      transparent: section,
      opacity: section ? 0.84 : 1,
    }),
    [PART_IDS.azurophilicGranules]: makeMaterial(THREE, PART_IDS.azurophilicGranules, {
      color: 0xb64b78,
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.64,
      transparent: section,
      opacity: section ? 0.9 : 1,
    }),
    [PART_IDS.specificGranules]: makeMaterial(THREE, PART_IDS.specificGranules, {
      color: 0xe0b986,
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.06,
      transparent: section,
      opacity: section ? 0.86 : 1,
    }),
    [PART_IDS.glycogenStores]: makeMaterial(THREE, PART_IDS.glycogenStores, {
      color: 0xe7ca68,
      roughness: 0.8,
      metalness: 0,
      clearcoat: 0.04,
      transparent: section,
      opacity: section ? 0.84 : 1,
    }),
    [PART_IDS.transportVesicles]: makeMaterial(THREE, PART_IDS.transportVesicles, {
      color: 0x8fd2da,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.26,
      clearcoatRoughness: 0.42,
      transmission: 0.12,
      thickness: 0.04,
      transparent: true,
      opacity: section ? 0.72 : transparent ? 0.78 : 0.86,
      depthWrite: false,
    }),
  };
}

/**
 * Create one self-contained material library per model instance.
 * No renderer, scene, or global material is mutated.
 */
export function createNeutrophilMaterials(THREE) {
  if (!THREE?.MeshPhysicalMaterial) {
    throw new TypeError("createNeutrophilMaterials requires a Three.js namespace");
  }

  const standard = makeMaterialSet(THREE, "explore");
  const variants = Object.freeze({
    explore: standard,
    transparent: makeMaterialSet(THREE, "transparent"),
    "cross-section": makeMaterialSet(THREE, "cross-section"),
  });

  const materials = {
    plasmaMembrane: standard[PART_IDS.plasmaMembrane],
    cytoplasm: standard[PART_IDS.cytoplasm],
    nucleus: standard[PART_IDS.nucleus],
    nuclearLobes: standard[PART_IDS.nuclearLobes],
    chromatinBridges: standard[PART_IDS.chromatinBridges],
    azurophilicGranules: standard[PART_IDS.azurophilicGranules],
    specificGranules: standard[PART_IDS.specificGranules],
    glycogenStores: standard[PART_IDS.glycogenStores],
    transportVesicles: standard[PART_IDS.transportVesicles],
  };

  Object.defineProperties(materials, {
    // Compact geometry-facing aliases. Keep these non-enumerable so utilities
    // that iterate the library do not process the same material twice.
    membrane: { value: materials.plasmaMembrane, enumerable: false },
    cellMembrane: { value: materials.plasmaMembrane, enumerable: false },
    multilobedNucleus: { value: materials.nuclearLobes, enumerable: false },
    primaryGranules: { value: materials.azurophilicGranules, enumerable: false },
    secondaryGranules: { value: materials.specificGranules, enumerable: false },
    glycogen: { value: materials.glycogenStores, enumerable: false },
    vesicles: { value: materials.transportVesicles, enumerable: false },
    byPartId: { value: Object.freeze(standard), enumerable: false },
    variants: { value: variants, enumerable: false },
    dispose: {
      enumerable: false,
      value() {
        const unique = new Set(Object.values(variants).flatMap(Object.values));
        for (const material of unique) material.dispose?.();
      },
    },
  });

  return Object.freeze(materials);
}

function walk(root, visitor) {
  if (typeof root.traverse === "function") {
    root.traverse(visitor);
    return;
  }
  const visit = (node) => {
    visitor(node);
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
}

function readPosition(node) {
  return [node.position?.x ?? 0, node.position?.y ?? 0, node.position?.z ?? 0];
}

function setPosition(node, position) {
  if (!node.position) return;
  if (typeof node.position.set === "function") node.position.set(...position);
  else [node.position.x, node.position.y, node.position.z] = position;
}

function getState(root) {
  let state = ROOT_STATES.get(root);
  if (!state) {
    state = { nodes: new WeakMap() };
    ROOT_STATES.set(root, state);
  }
  walk(root, (node) => {
    if (!state.nodes.has(node)) {
      state.nodes.set(node, {
        material: node.material,
        position: readPosition(node),
        visible: node.visible !== false,
      });
    }
  });
  return state;
}

function ownPartId(node) {
  return canonicalRole(
    node.userData?.semanticPartId ??
      node.userData?.semanticId ??
      node.userData?.partId ??
      node.userData?.materialRole ??
      null,
  );
}

function inheritedPartId(node) {
  let current = node;
  while (current) {
    const partId = ownPartId(current);
    if (partId) return partId;
    current = current.parent;
  }
  return null;
}

function materialPartId(material) {
  const first = Array.isArray(material) ? material[0] : material;
  return canonicalRole(first?.userData?.materialRole ?? first?.userData?.semanticPartId);
}

function restore(root, state) {
  walk(root, (node) => {
    const baseline = state.nodes.get(node);
    if (!baseline) return;
    node.visible = baseline.visible;
    setPosition(node, baseline.position);
    if (node.isMesh && baseline.material !== undefined) node.material = baseline.material;
  });
}

function assignVariant(node, variants, state) {
  if (!node.isMesh) return;
  const baseline = state.nodes.get(node);
  const partId = ownPartId(node) || materialPartId(baseline?.material) || inheritedPartId(node);
  const variant = partId ? variants[partId] : null;
  if (!variant) return;
  node.material = Array.isArray(baseline?.material)
    ? baseline.material.map(() => variant)
    : variant;
}

function isCrossSectionHelper(node) {
  return node.userData?.crossSectionOnly === true;
}

function belongsToSelection(partId, selectedPartId) {
  if (partId === selectedPartId) return true;
  return selectedPartId === PART_IDS.nucleus && (
    partId === PART_IDS.nuclearLobes || partId === PART_IDS.chromatinBridges
  );
}

function applyCrossSectionVisibility(root, state) {
  walk(root, (node) => {
    const baseline = state.nodes.get(node);
    if (!baseline) return;
    if (isCrossSectionHelper(node)) node.visible = true;
    if (node.userData?.crossSectionHide === true || node.userData?.crossSectionSide === "front") {
      node.visible = false;
    }
  });
}

function applyIsolation(root, state, selectedPartId) {
  walk(root, (node) => {
    const baseline = state.nodes.get(node);
    if (!baseline) return;
    if (node.isMesh) {
      node.visible = baseline.visible && belongsToSelection(inheritedPartId(node), selectedPartId);
    } else if (isCrossSectionHelper(node)) {
      node.visible = false;
    }
  });
}

function normalizedDirection(node, partId) {
  const custom = node.userData?.explodeDirection;
  const raw = Array.isArray(custom)
    ? custom
    : custom && Number.isFinite(custom.x)
      ? [custom.x, custom.y, custom.z]
      : EXPLODE_DIRECTIONS[partId];
  const length = Math.hypot(raw[0], raw[1], raw[2]) || 1;
  return raw.map((value) => value / length);
}

function applyExplode(root, state, distance) {
  walk(root, (node) => {
    const partId = ownPartId(node);
    if (!partId || inheritedPartId(node.parent) === partId) return;
    const baseline = state.nodes.get(node);
    if (!baseline) return;
    const direction = normalizedDirection(node, partId);
    const nodeDistance = Number.isFinite(node.userData?.explodeDistance)
      ? node.userData.explodeDistance
      : distance;
    setPosition(node, baseline.position.map((value, axis) => value + direction[axis] * nodeDistance));
  });
}

/**
 * Apply a deterministic display mode. Changes are scoped to `root`, restored
 * before every mode switch, and are therefore idempotent.
 *
 * Optional fifth argument: `{ explodeDistance, reducedMotion }`. Modes are
 * intentionally instantaneous, so reduced-motion never depends on animation.
 */
export function applyVisualizationMode(root, materials, mode, selectedPartId, options = {}) {
  if (!root || typeof root !== "object") throw new TypeError("A model root is required");
  if (!materials?.variants) throw new TypeError("Use materials from createNeutrophilMaterials");
  if (!VALID_MODES.has(mode)) throw new RangeError(`Unsupported visualization mode: ${mode}`);

  const canonicalSelection = canonicalRole(selectedPartId);
  if (mode === "isolate" && !canonicalSelection) {
    throw new RangeError("isolate mode requires a supported selectedPartId");
  }

  const state = getState(root);
  restore(root, state);

  const materialMode = mode === "transparent" || mode === "cross-section" ? mode : "explore";
  walk(root, (node) => assignVariant(node, materials.variants[materialMode], state));

  if (mode !== "cross-section") {
    walk(root, (node) => {
      if (isCrossSectionHelper(node)) node.visible = false;
    });
  }
  if (mode === "cross-section") applyCrossSectionVisibility(root, state);
  if (mode === "isolate") applyIsolation(root, state, canonicalSelection);
  if (mode === "explode") {
    const configuredDistance = options.explodeDistance ?? root.userData?.explodeDistance ?? 0.35;
    const distance = Number.isFinite(configuredDistance) ? Math.max(0, configuredDistance) : 0.35;
    applyExplode(root, state, distance);
  }

  return Object.freeze({
    mode,
    selectedPartId: canonicalSelection,
    reducedMotion: options.reducedMotion === true || root.userData?.reducedMotion === true,
    transitionMs: 0,
  });
}
