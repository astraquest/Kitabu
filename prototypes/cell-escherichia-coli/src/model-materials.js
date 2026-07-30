/**
 * Deterministic, schematic materials for a procedural E. coli model.
 * Colours distinguish learning targets; they do not claim natural colour.
 */

export const REPRESENTATION = Object.freeze({
  kind: 'synthetic-hypothesis',
  claim: 'schematic-not-photoreal',
  note: 'Authored colours and surface response distinguish structures; they are not biological colour evidence.',
});

export const ECOLI_LAYER_ORDER = Object.freeze([
  'capsule',
  'outer-membrane',
  'peptidoglycan',
  'inner-membrane',
  'cytoplasm',
]);

export const ECOLI_PALETTE = deepFreeze({
  capsule: swatch('#78D6C6', '#163F3A', 'dots'),
  'outer-membrane': swatch('#4C78D0', '#142B55', 'horizontal-stripes'),
  peptidoglycan: swatch('#F2C14E', '#4A3500', 'crosshatch'),
  'inner-membrane': swatch('#A36AC7', '#321742', 'diagonal-stripes'),
  cytoplasm: swatch('#D7E7A9', '#293511', 'solid'),
  nucleoid: swatch('#E85D75', '#571421', 'double-helix'),
  ribosome: swatch('#D9772D', '#4B2107', 'rings'),
  plasmid: swatch('#9B51A0', '#351438', 'loop'),
  flagellum: swatch('#176B87', '#082F3C', 'long-dash'),
  pilus: swatch('#6D597A', '#241B29', 'short-dash'),
  selection: swatch('#FFE45E', '#191500', 'outline'),
});

const MATERIAL_SPECS = deepFreeze({
  capsule: physical({ roughness: 0.32, transmission: 0.12, opacity: 0.34, clearcoat: 0.18 }),
  'outer-membrane': standard({ roughness: 0.58 }),
  peptidoglycan: standard({ roughness: 0.72 }),
  'inner-membrane': standard({ roughness: 0.62 }),
  cytoplasm: physical({ roughness: 0.84, opacity: 0.48 }),
  nucleoid: standard({ roughness: 0.6 }),
  ribosome: standard({ roughness: 0.7 }),
  plasmid: standard({ roughness: 0.55 }),
  flagellum: standard({ roughness: 0.66 }),
  pilus: standard({ roughness: 0.7 }),
});

const MATERIAL_BINDINGS = Object.freeze({
  outer_membrane_lps: 'outer-membrane',
  periplasm: 'capsule',
  peptidoglycan_sacculus: 'peptidoglycan',
  inner_membrane: 'inner-membrane',
  cytoplasm: 'cytoplasm',
  nucleoid_chromosomal_dna: 'nucleoid',
  ribosomes: 'ribosome',
  plasmid_dna: 'plasmid',
  flagellum: 'flagellum',
  fimbriae: 'pilus',
  conjugative_pilus: 'pilus',
});

const GEOMETRY_LAYER_ORDER = Object.freeze([
  'outer_membrane_lps',
  'periplasm',
  'peptidoglycan_sacculus',
  'inner_membrane',
  'cytoplasm',
]);

const SEMANTIC_ALIASES = Object.freeze({
  capsule: 'periplasm',
  'outer-membrane': 'outer_membrane_lps',
  outer_membrane: 'outer_membrane_lps',
  peptidoglycan: 'peptidoglycan_sacculus',
  'inner-membrane': 'inner_membrane',
  plasma_membrane: 'inner_membrane',
  nucleoid: 'nucleoid_chromosomal_dna',
  nucleoid_dna: 'nucleoid_chromosomal_dna',
  ribosome: 'ribosomes',
  plasmid: 'plasmid_dna',
  plasmids: 'plasmid_dna',
  flagella: 'flagellum',
  pilus: 'fimbriae',
  pili: 'fimbriae',
});

export const ECOLI_DETAIL_PROFILES = deepFreeze({
  mobile: {
    radialSegments: 16,
    tubeSegments: 48,
    ribosomeCount: 90,
    pilusCount: 24,
    flagellumSamples: 72,
    surfaceRelief: false,
  },
  quality: {
    radialSegments: 28,
    tubeSegments: 96,
    ribosomeCount: 180,
    pilusCount: 42,
    flagellumSamples: 144,
    surfaceRelief: true,
  },
});

export const ECOLI_MOTION_PROFILES = deepFreeze({
  standard: {
    enabled: true,
    autoRotateRadiansPerSecond: 0.08,
    flagellumAmplitude: 0.035,
    flagellumHertz: 0.32,
    peelTransitionMs: 420,
    isolateTransitionMs: 260,
  },
  reduced: {
    enabled: false,
    autoRotateRadiansPerSecond: 0,
    flagellumAmplitude: 0,
    flagellumHertz: 0,
    peelTransitionMs: 0,
    isolateTransitionMs: 0,
  },
});

/** Create the shared Three.js material registry used by model geometry. */
export function createEColiMaterials(THREE) {
  if (!THREE || typeof THREE.MeshStandardMaterial !== 'function' || typeof THREE.MeshPhysicalMaterial !== 'function') {
    throw new TypeError('createEColiMaterials requires MeshStandardMaterial and MeshPhysicalMaterial constructors');
  }

  const registry = {};
  for (const [partId, palettePartId] of Object.entries(MATERIAL_BINDINGS)) {
    const spec = MATERIAL_SPECS[palettePartId];
    const Constructor = THREE[spec.materialType];
    const parameters = materialParameters(palettePartId, spec, THREE.DoubleSide);
    const material = new Constructor(parameters);
    material.name = `ecoli-material:${partId}`;
    material.userData = {
      ...(material.userData || {}),
      semanticPartId: partId,
      palettePartId,
      representation: REPRESENTATION,
      patternCue: ECOLI_PALETTE[palettePartId].pattern,
      baseOpacity: parameters.opacity,
      baseEmissive: '#000000',
    };
    registry[partId] = material;
  }

  // Common geometry-facing aliases. They point to the same material instances.
  registry.capsule = registry.periplasm;
  registry['outer-membrane'] = registry.outer_membrane_lps;
  registry.outerMembrane = registry.outer_membrane_lps;
  registry.peptidoglycan = registry.peptidoglycan_sacculus;
  registry['inner-membrane'] = registry.inner_membrane;
  registry.innerMembrane = registry.inner_membrane;
  registry.plasmaMembrane = registry.inner_membrane;
  registry.nucleoid = registry.nucleoid_chromosomal_dna;
  registry.nucleoid_dna = registry.nucleoid_chromosomal_dna;
  registry.ribosome = registry.ribosomes;
  registry.plasmid = registry.plasmid_dna;
  registry.plasmids = registry.plasmid_dna;
  registry.flagella = registry.flagellum;
  registry.pilus = registry.fimbriae;
  registry.pili = registry.fimbriae;
  return registry;
}

/** Return a fresh serializable descriptor without requiring WebGL or Three.js. */
export function getEColiMaterialDescriptor(partId, options = {}) {
  const id = requirePalettePartId(partId);
  const spec = MATERIAL_SPECS[id];
  const state = getEColiLayerState(options);
  const appearance = appearanceFor(id, spec.opacity ?? 1, options.mode ?? 'assembled', state.isolatePartId);
  return {
    ...materialParameters(id, spec, 2),
    ...appearance,
    userData: materialUserData(id, appearance, state.reducedMotion),
  };
}

/**
 * Apply assembled, peel, or isolate presentation without timers or randomness.
 * Geometry may identify itself with userData.semanticPartId/partId or a named
 * shared material. Peel makes layers outside the requested layer translucent.
 */
export function applyVisualizationMode(root, materials, mode = 'assembled', partId = null, { reducedMotion = false } = {}) {
  const supportedModes = ['assembled', 'explore', 'peel', 'cross-section', 'explode', 'isolate'];
  if (!supportedModes.includes(mode)) {
    throw new RangeError(`Unknown E. coli visualization mode: ${mode}`);
  }
  if (mode === 'isolate' && partId == null) {
    throw new TypeError('isolate mode requires a semantic partId');
  }
  const targetId = partId == null ? defaultTargetFor(mode) : requireSemanticPartId(partId);
  const materialMode = mode === 'explore' || mode === 'explode' ? 'assembled' : mode;

  const uniqueMaterials = new Set();
  for (const material of Object.values(materials || {})) {
    if (material && typeof material === 'object') uniqueMaterials.add(material);
  }
  if (root?.traverse) {
    root.traverse((node) => {
      const list = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of list) if (material) uniqueMaterials.add(material);
    });
  }

  for (const material of uniqueMaterials) {
    const id = resolveMaterialPartId(material);
    const palettePartId = material.userData?.palettePartId || MATERIAL_BINDINGS[id];
    if (!MATERIAL_SPECS[palettePartId]) continue;
    const baseOpacity = material.userData?.baseOpacity ?? MATERIAL_SPECS[palettePartId].opacity ?? 1;
    const appearance = appearanceFor(id, baseOpacity, materialMode, targetId);
    applyAppearance(material, appearance, ECOLI_PALETTE.selection.color);
    material.userData = { ...(material.userData || {}), ...materialUserData(id, appearance, reducedMotion, palettePartId) };
    material.needsUpdate = true;
  }

  const motion = getEColiMotionProfile({ reducedMotion });
  if (root) {
    root.userData = {
      ...(root.userData || {}),
      visualization: { mode, partId: targetId, reducedMotion: Boolean(reducedMotion), motion },
    };
  }
  return { mode, partId: targetId, reducedMotion: Boolean(reducedMotion), motion };
}

export function getEColiDetailProfile(profile = 'mobile') {
  if (!ECOLI_DETAIL_PROFILES[profile]) throw new RangeError(`Unknown E. coli detail profile: ${profile}`);
  return { ...ECOLI_DETAIL_PROFILES[profile] };
}

export function getEColiMotionProfile({ reducedMotion = false } = {}) {
  return { ...(reducedMotion ? ECOLI_MOTION_PROFILES.reduced : ECOLI_MOTION_PROFILES.standard) };
}

export function getEColiLayerState({ peeledLayerIds = [], isolatePartId = null, reducedMotion = false } = {}) {
  const normalized = [...new Set(peeledLayerIds.map(normalizePartId))]
    .filter((id) => ECOLI_LAYER_ORDER.includes(id))
    .sort((a, b) => ECOLI_LAYER_ORDER.indexOf(a) - ECOLI_LAYER_ORDER.indexOf(b));
  return {
    peeledLayerIds: normalized,
    isolatePartId: isolatePartId == null ? null : requireSemanticPartId(isolatePartId),
    reducedMotion: Boolean(reducedMotion),
  };
}

function appearanceFor(id, baseOpacity, mode, targetId) {
  let opacity = baseOpacity;
  let visibilityState = 'normal';
  let selected = false;
  if (mode === 'isolate') {
    selected = id === targetId;
    if (!selected) {
      opacity = Math.min(baseOpacity, 0.12);
      visibilityState = 'deemphasized';
    }
  } else if ((mode === 'peel' || mode === 'cross-section') && GEOMETRY_LAYER_ORDER.includes(targetId)) {
    const index = GEOMETRY_LAYER_ORDER.indexOf(id);
    const targetIndex = GEOMETRY_LAYER_ORDER.indexOf(targetId);
    if (index >= 0 && index < targetIndex) {
      opacity = Math.min(baseOpacity, 0.1);
      visibilityState = 'peeled';
    }
    selected = id === targetId;
  }
  return {
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    colorWrite: opacity > 0,
    visibilityState,
    selected,
    emissiveIntensity: selected ? 0.13 : 0,
  };
}

function defaultTargetFor(mode) {
  if (mode === 'peel') return 'inner_membrane';
  if (mode === 'cross-section') return 'cytoplasm';
  return null;
}

function applyAppearance(material, appearance, selectionColor) {
  material.opacity = appearance.opacity;
  material.transparent = appearance.transparent;
  material.depthWrite = appearance.depthWrite;
  material.colorWrite = appearance.colorWrite;
  material.emissiveIntensity = appearance.emissiveIntensity;
  if (material.emissive?.set) material.emissive.set(appearance.selected ? selectionColor : '#000000');
}

function materialUserData(id, appearance, reducedMotion, palettePartId = id) {
  return {
    semanticPartId: id,
    palettePartId,
    representation: REPRESENTATION,
    patternCue: ECOLI_PALETTE[palettePartId].pattern,
    visibilityState: appearance.visibilityState,
    selected: appearance.selected,
    reducedMotion: Boolean(reducedMotion),
  };
}

function materialParameters(id, spec, doubleSide) {
  const opacity = spec.opacity ?? 1;
  return {
    color: ECOLI_PALETTE[id].color,
    emissive: '#000000',
    emissiveIntensity: 0,
    metalness: 0,
    roughness: spec.roughness,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    side: doubleSide,
    ...(spec.transmission == null ? {} : { transmission: spec.transmission }),
    ...(spec.clearcoat == null ? {} : { clearcoat: spec.clearcoat }),
  };
}

function resolveMaterialPartId(material) {
  const value = material.userData?.semanticPartId || material.name?.replace('ecoli-material:', '') || '';
  return requireSemanticPartId(value, false);
}

function requireSemanticPartId(value, shouldThrow = true) {
  const raw = String(value).trim();
  const normalized = normalizePartId(value);
  const direct = Object.hasOwn(MATERIAL_BINDINGS, raw) ? raw : null;
  const id = direct || SEMANTIC_ALIASES[raw] || SEMANTIC_ALIASES[normalized]
    || (Object.hasOwn(MATERIAL_BINDINGS, normalized) ? normalized : null);
  if (!id && shouldThrow) throw new RangeError(`Unknown E. coli semantic part: ${value}`);
  return id;
}

function requirePalettePartId(value) {
  const semanticId = Object.hasOwn(MATERIAL_BINDINGS, value) ? value : null;
  const id = semanticId ? MATERIAL_BINDINGS[semanticId] : normalizePartId(value);
  if (!MATERIAL_SPECS[id]) throw new RangeError(`Unknown E. coli semantic part: ${value}`);
  return id;
}

function normalizePartId(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replaceAll('_', '-')
    .replace(/^plasma-membrane$/, 'inner-membrane')
    .replace(/^flagella$/, 'flagellum')
    .replace(/^pili$/, 'pilus');
}

function swatch(color, outlineColor, pattern) {
  return { color, outlineColor, pattern, requiresNonColorCue: true };
}

function standard(values) {
  return { materialType: 'MeshStandardMaterial', ...values };
}

function physical(values) {
  return { materialType: 'MeshPhysicalMaterial', ...values };
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}
