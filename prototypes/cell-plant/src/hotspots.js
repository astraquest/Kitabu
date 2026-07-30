/**
 * Stable learning hooks for the plant-cell prototype.
 *
 * Coordinates use model-local space: +X right, +Y up and +Z toward the
 * learner. Copy belongs here, outside the procedural geometry bundle.
 */

export const HOTSPOT_SCHEMA_VERSION = 1;

export const PLANT_CELL_SPECIMEN = Object.freeze({
  id: "plant-cell",
  commonName: "Plant Cell",
  assetId: "cell.plant.001",
  assetVersion: "1.0.0",
  anchorSpace: Object.freeze({ units: "model-local", x: "right", y: "up", z: "toward learner" }),
});

const PART_DEFINITIONS = [
  ["cell-wall", "Cell Wall", "boundary", null, [2.14, 1.22, 0.82], [0.7, 0.5, 0.6], [0, 0.8, 0], "I am the rigid cell wall that supports and protects the cell.", "Cellulose in my layers helps the cell keep its shape while allowing water and gases to pass."],
  ["cell-membrane", "Cell Membrane", "boundary", "cell-wall", [1.92, 0.96, 0.76], [0.8, 0.4, 0.4], [0.76, 0.35, 0.1], "I am the thin cell membrane that controls what enters and leaves.", "My selectively permeable surface helps the cell maintain a stable internal environment."],
  ["cytoplasm", "Cytoplasm", "interior", "cell-membrane", [-1.74, 0.72, 0.68], [-0.6, 0.5, 0.6], [-0.62, 0.38, 0.35], "I am the cytoplasm where organelles are suspended and many reactions happen.", "I include the fluid cytosol and provide a medium for materials to move through the cell."],
  ["nucleus", "Nucleus", "genetic-control", "cytoplasm", [1.25, 0.42, 0.78], [0.3, 0.3, 0.9], [-0.55, 0, 0.5], "I am the nucleus, the control centre that stores most of the cell's DNA.", "My genes direct protein production, growth and cell activities."],
  ["nucleolus", "Nucleolus", "genetic-control", "nucleus", [1.34, 0.45, 0.94], [0.2, 0.2, 1], [-0.7, 0.05, 0.7], "I am the nucleolus, where the cell begins making ribosomes.", "I assemble ribosomal RNA with proteins before ribosome subunits leave the nucleus."],
  ["nuclear-envelope", "Nuclear Envelope", "genetic-control", "nucleus", [0.86, 0.68, 0.72], [-0.5, 0.5, 0.8], [-0.42, 0.2, 0.62], "I am the nuclear envelope that separates DNA from the cytoplasm.", "My pores regulate the movement of RNA, proteins and other molecules."],
  ["central-vacuole", "Central Vacuole", "storage", "cytoplasm", [-0.42, -0.04, 0.64], [0.1, 0.2, 1], [0.08, 0.03, 0.1], "I am the large central vacuole that stores water and dissolved substances.", "Water pressing outward from me creates turgor pressure, which helps support the plant."],
  ["tonoplast", "Tonoplast", "storage", "central-vacuole", [-1.02, -0.72, 0.56], [-0.5, -0.5, 0.8], [0.47, -0.2, 0.35], "I am the tonoplast, the membrane around the central vacuole.", "I control movement into and out of the vacuole and help regulate its acidity and ions."],
  ["chloroplasts", "Chloroplasts", "energy", "cytoplasm", [-1.5, 0.92, 0.52], [-0.6, 0.5, 0.7], [0.67, 0.48, 0.48], "We are chloroplasts that capture light energy to make sugars.", "Chlorophyll in our internal membranes absorbs light for photosynthesis."],
  ["grana", "Grana", "energy", "chloroplasts", [-1.5, 0.92, 0.72], [-0.5, 0.4, 0.9], [0.78, 0.55, 0.68], "We are grana, stacks of thylakoid membranes inside chloroplasts.", "Our membranes hold chlorophyll and carry out the light-dependent reactions of photosynthesis."],
  ["mitochondria", "Mitochondria", "energy", "cytoplasm", [1.35, -0.25, 0.72], [0.5, -0.2, 0.8], [-0.63, -0.52, 0.43], "We are mitochondria that release usable energy from food molecules.", "Cellular respiration across our membranes helps produce ATP."],
  ["cristae", "Cristae", "energy", "mitochondria", [1.35, -0.25, 0.87], [0.4, -0.2, 0.9], [-0.7, -0.64, 0.62], "We are cristae, folds of a mitochondrion's inner membrane.", "Our folds increase surface area for reactions that produce ATP."],
  ["endoplasmic-reticulum", "Endoplasmic Reticulum", "manufacturing", "nuclear-envelope", [1.12, 0.72, 0.62], [0.2, 0.6, 0.8], [-0.28, 0.48, 0.36], "I am the endoplasmic reticulum, a membrane network that makes and moves cell materials.", "Rough regions carry ribosomes for protein production; smooth regions make lipids and help with detoxification."],
  ["golgi-apparatus", "Golgi Apparatus", "manufacturing", "cytoplasm", [0.78, -0.66, 0.72], [0.5, -0.5, 0.8], [0.7, -0.47, 0.44], "I am the Golgi apparatus that modifies, sorts and packages cell products.", "My flattened membrane sacs prepare proteins and lipids for delivery in vesicles."],
  ["ribosomes", "Ribosomes", "manufacturing", "cytoplasm", [0.15, 0.58, 0.68], [0, 0.6, 0.8], [-0.03, 0.69, 0.55], "We are ribosomes, tiny structures that build proteins from amino acids.", "Some of us float in the cytoplasm; others attach to rough endoplasmic reticulum."],
  ["peroxisome", "Peroxisome", "recycling", "cytoplasm", [0.3, -1.1, 0.64], [0.2, -0.6, 0.8], [0.36, -0.7, 0.63], "I am a peroxisome that breaks down fatty acids and harmful chemicals.", "My enzymes convert reactive hydrogen peroxide into safer substances."],
  ["plasmodesmata", "Plasmodesmata", "communication", "cell-wall", [-2.18, -0.2, 0.62], [-0.9, -0.2, 0.3], [-0.9, -0.22, 0.05], "We are plasmodesmata, tiny channels linking neighbouring plant cells.", "Cytoplasm, signals and small materials can pass through us from one cell to another."],
];

const TARGET_SEMANTIC_IDS = Object.freeze({
  "nuclear-envelope": Object.freeze(["nucleus"]),
  chloroplasts: Object.freeze(["chloroplasts", "chloroplast.1"]),
  grana: Object.freeze(["chloroplast.1"]),
  mitochondria: Object.freeze(["mitochondria", "mitochondrion.2"]),
  cristae: Object.freeze(["mitochondrion.2"]),
  peroxisome: Object.freeze([]),
  plasmodesmata: Object.freeze([]),
});

function freezeHotspot([id, label, category, parentId, position, normal, explodeVector, summary, detail]) {
  const anchor = Object.freeze({ position: Object.freeze(position), normal: Object.freeze(normal), radius: 0.1 });
  return Object.freeze({
    id,
    semanticId: id,
    label,
    category,
    parentId,
    summary,
    detail,
    description: `${summary} ${detail}`,
    meta: PLANT_CELL_SPECIMEN.commonName,
    anchor,
    position: anchor.position,
    modelParts: TARGET_SEMANTIC_IDS[id] ?? Object.freeze([id]),
    interaction: Object.freeze({
      isolatable: true,
      crossSectionVisible: true,
      explodeVector: Object.freeze(explodeVector),
    }),
  });
}

export const HOTSPOTS = Object.freeze(PART_DEFINITIONS.map(freezeHotspot));
export const PLANT_CELL_PARTS = HOTSPOTS;

export const VIEW_BEHAVIORS = Object.freeze({
  overview: Object.freeze({ id: "overview", label: "Whole cell", transitionMs: 350, reducedMotionTransitionMs: 0 }),
  isolate: Object.freeze({ id: "isolate", label: "Isolate part", transitionMs: 300, reducedMotionTransitionMs: 0 }),
  explode: Object.freeze({ id: "explode", label: "Exploded view", transitionMs: 650, reducedMotionTransitionMs: 0, maxAmount: 1 }),
  "cross-section": Object.freeze({ id: "cross-section", label: "Cross-section", transitionMs: 450, reducedMotionTransitionMs: 0 }),
});

export function indexHotspots(hotspots = HOTSPOTS) {
  return new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]));
}

export function getHotspot(hotspotId, hotspots = HOTSPOTS) {
  return hotspots.find(({ id }) => id === hotspotId) ?? null;
}

/**
 * Pure view-state resolver. The renderer owns interpolation; reduced-motion
 * users receive the same final educational state with a zero-duration change.
 */
export function resolveViewState({
  behaviorId = "overview",
  selectedHotspotId = null,
  amount = 1,
  prefersReducedMotion = false,
  hotspots = HOTSPOTS,
} = {}) {
  const behavior = VIEW_BEHAVIORS[behaviorId] ?? VIEW_BEHAVIORS.overview;
  const byId = indexHotspots(hotspots);
  const selected = byId.get(selectedHotspotId) ?? null;
  const clampedAmount = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 1));
  const contextIds = new Set();

  if (selected) {
    contextIds.add(selected.id);
    let parent = byId.get(selected.parentId);
    while (parent) {
      contextIds.add(parent.id);
      parent = byId.get(parent.parentId);
    }
    for (const hotspot of hotspots) {
      if (hotspot.parentId === selected.id) contextIds.add(hotspot.id);
    }
  }

  const parts = hotspots.map((hotspot) => {
    const isIsolationContext = contextIds.has(hotspot.id);
    const isBoundary = ["cell-wall", "cell-membrane", "cytoplasm"].includes(hotspot.id);
    const exploded = behavior.id === "explode";
    const sectioned = behavior.id === "cross-section" && isBoundary;
    return Object.freeze({
      hotspotId: hotspot.id,
      visible: behavior.id !== "isolate" || !selected || isIsolationContext,
      opacity: behavior.id === "isolate" && selected && hotspot.id !== selected.id
        ? (isIsolationContext ? 0.28 : 0)
        : (sectioned ? 0.3 : 1),
      sectioned,
      explodeOffset: Object.freeze(exploded
        ? hotspot.interaction.explodeVector.map((value) => value * clampedAmount)
        : [0, 0, 0]),
    });
  });

  return Object.freeze({
    behaviorId: behavior.id,
    selectedHotspotId: selected?.id ?? null,
    amount: clampedAmount,
    transitionMs: prefersReducedMotion ? behavior.reducedMotionTransitionMs : behavior.transitionMs,
    parts: Object.freeze(parts),
  });
}

export function registerHotspotTarget(object3D, hotspotId) {
  if (!object3D || !hotspotId) return () => {};
  object3D.userData ||= {};
  const previousId = object3D.userData.hotspotId;
  object3D.userData.hotspotId = hotspotId;
  return () => {
    if (previousId === undefined) delete object3D.userData.hotspotId;
    else object3D.userData.hotspotId = previousId;
  };
}

export function findHotspotId(object3D, stopAt = null) {
  let current = object3D;
  while (current) {
    if (current.userData?.hotspotId) return current.userData.hotspotId;
    if (current === stopAt) break;
    current = current.parent;
  }
  return null;
}

export function pickHotspot(raycasterOrIntersections, hotspotRoot, onSelect) {
  const targets = hotspotRoot?.userData?.hotspotTargets || [];
  const intersections = Array.isArray(raycasterOrIntersections)
    ? raycasterOrIntersections
    : raycasterOrIntersections?.intersectObjects?.(targets, true) || [];
  for (const intersection of intersections) {
    const id = findHotspotId(intersection.object, hotspotRoot);
    const hotspot = hotspotRoot?.userData?.hotspotsById?.get(id);
    if (hotspot) {
      onSelect?.(hotspot, intersection);
      return hotspot;
    }
  }
  return null;
}

export function createHotspotLayer(THREE, modelRoot, hotspots = HOTSPOTS, onSelect = () => {}, options = {}) {
  if (!THREE?.Group || !modelRoot?.add) throw new TypeError("createHotspotLayer needs THREE and a modelRoot Object3D.");
  const root = new THREE.Group();
  root.name = options.name || "plant-cell-hotspots";
  root.renderOrder = options.renderOrder || 20;
  const markerGeometry = new THREE.SphereGeometry(options.markerRadius || 0.035, 12, 8);
  const hitGeometry = new THREE.SphereGeometry(options.hitRadius || 0.11, 8, 6);
  const ringGeometry = new THREE.TorusGeometry(options.ringRadius || 0.065, options.ringThickness || 0.008, 6, 20);
  const targets = [];
  const rings = [];
  const materials = [];
  const hotspotsById = indexHotspots(hotspots);

  for (const hotspot of hotspots) {
    const marker = new THREE.Group();
    marker.name = `hotspot-${hotspot.id}`;
    marker.position.fromArray(hotspot.anchor.position);
    registerHotspotTarget(marker, hotspot.id);
    const color = hotspot.color || options.color || 0xffc857;
    const coreMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
    const ringMaterial = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    materials.push(coreMaterial, ringMaterial, hitMaterial);
    const core = new THREE.Mesh(markerGeometry, coreMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    for (const object of [core, ring, hit]) registerHotspotTarget(object, hotspot.id);
    marker.add(core, ring, hit);
    root.add(marker);
    targets.push(hit);
    rings.push(ring);
  }

  root.userData.hotspotTargets = targets;
  root.userData.hotspotsById = hotspotsById;
  root.userData.selectHotspot = (id) => {
    const hotspot = hotspotsById.get(id) || null;
    if (hotspot) onSelect(hotspot);
    return hotspot;
  };
  const parentQuaternion = new THREE.Quaternion();
  const cameraQuaternion = new THREE.Quaternion();

  return {
    root,
    hotspots,
    targets,
    update(camera) {
      if (!camera) return;
      camera.getWorldQuaternion(cameraQuaternion);
      (root.parent || modelRoot).getWorldQuaternion(parentQuaternion).invert().multiply(cameraQuaternion);
      for (const ring of rings) ring.quaternion.copy(parentQuaternion);
    },
    setVisible(visible) { root.visible = Boolean(visible); },
    select(id) { return root.userData.selectHotspot(id); },
    pick(intersectionsOrRaycaster) { return pickHotspot(intersectionsOrRaycaster, root, onSelect); },
    dispose() {
      root.removeFromParent();
      markerGeometry.dispose();
      hitGeometry.dispose();
      ringGeometry.dispose();
      for (const material of materials) material.dispose();
      root.clear();
    },
  };
}

export function createHotspots(THREE, modelRoot, onSelect) {
  return createHotspotLayer(THREE, modelRoot, HOTSPOTS, onSelect, { name: "plant-cell-hotspots" });
}
