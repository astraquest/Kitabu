/**
 * Reusable specimen hotspot data and a small Three.js marker layer.
 *
 * Anchor positions are deliberately plain arrays so an asset author can tune
 * them without changing the marker implementation. Positions are local to the
 * specimen: +X right, +Y dorsal/up, +Z toward the head/front.
 */

export const HOTSPOT_SCHEMA_VERSION = 1;

export const AFRICAN_MONARCH_SPECIMEN = {
  id: "african-monarch",
  commonName: "African Monarch",
  alternateName: "Plain Tiger",
  scientificName: "Danaus chrysippus",
  gradeBand: "Grade 6",
  anchorSpace: {
    units: "model-local",
    x: "right wing",
    y: "dorsal/up",
    z: "head/front",
  },
};

/**
 * Grade 6-friendly labels and facts for the first specimen proof.
 * `modelParts` may be matched against Object3D names when a model exposes them.
 */
export const HOTSPOTS = [
  {
    id: "antennae",
    label: "Antennae",
    category: "senses",
    summary: "My antennae are club-tipped feelers that help me smell and find my way.",
    detail:
      "Tiny receptors on them detect scents in the air. They also help me sense movement and direction.",
    anchor: {
      position: [-0.72, 0.24, 1.76],
      normal: [0.1, 0.8, 0.6],
      radius: 0.11,
    },
    modelParts: ["antenna-left", "antenna-right", "antennae"],
  },
  {
    id: "compound-eye",
    label: "Compound Eye",
    category: "senses",
    summary: "Each of my compound eyes is made of many tiny light-sensing units called facets.",
    detail:
      "These facets help me notice movement and colour. I can also see ultraviolet light that people cannot see.",
    anchor: {
      position: [0.48, 0.17, 1.3],
      normal: [0.8, 0.4, 0.25],
      radius: 0.12,
    },
    modelParts: ["eye-right", "compound-eye", "head"],
  },
  {
    id: "proboscis",
    label: "Proboscis",
    category: "feeding",
    summary: "My proboscis is a long, tube-shaped mouthpart that I use to sip nectar.",
    detail:
      "It works like a drinking straw and coils up close to my head when I am not feeding.",
    anchor: {
      position: [0, 0.04, 0.92],
      normal: [0, 0.2, 1],
      radius: 0.11,
    },
    modelParts: ["proboscis", "mouthparts", "head"],
  },
  {
    id: "thorax",
    label: "Thorax",
    category: "body",
    summary: "My thorax is the strong middle body section where my wings and all six legs attach.",
    detail:
      "Flight muscles inside it power my wings. Both pairs of wings and all three pairs of legs connect here.",
    anchor: {
      position: [0, 0.22, 0.38],
      normal: [0, 1, 0.1],
      radius: 0.14,
    },
    modelParts: ["thorax", "body-thorax"],
  },
  {
    id: "abdomen",
    label: "Abdomen",
    category: "body",
    summary: "My abdomen is the long rear body section that holds many of my important organs.",
    detail:
      "It contains organs for digestion and reproduction. Small openings along its sides, called spiracles, let air enter my body.",
    anchor: {
      position: [0, 0.16, -0.72],
      normal: [0, 1, 0],
      radius: 0.14,
    },
    modelParts: ["abdomen", "body-abdomen"],
  },
  {
    id: "forewing",
    label: "Forewing",
    category: "flight",
    summary: "My forewings are the larger front wings that help me produce lift and move forward.",
    detail:
      "In this reference form, each one is orange with a broad dark tip and clear white spots. Other African Monarchs can have different patterns.",
    anchor: {
      position: [1.42, 0.08, 0.56],
      normal: [0.15, 1, 0.1],
      radius: 0.15,
    },
    modelParts: ["forewing-right", "forewing", "wings"],
  },
  {
    id: "hindwing",
    label: "Hindwing",
    category: "flight",
    summary: "My hindwings are the rounded rear wings that help me with lift, balance and steering.",
    detail:
      "In this reference form, each one is orange with a dark border and pale spots. Other African Monarch forms can have much more white on their hindwings.",
    anchor: {
      position: [1.13, 0.08, -0.58],
      normal: [0.1, 1, -0.1],
      radius: 0.15,
    },
    modelParts: ["hindwing-right", "hindwing", "wings"],
  },
  {
    id: "legs",
    label: "Legs",
    category: "movement",
    summary: "I have six jointed legs that I use for walking, gripping and tasting.",
    detail:
      "Taste sensors on my feet help me check plants and food. My front pair is small and held close to my body, so I may look as if I have only four legs.",
    anchor: {
      position: [-0.72, -0.08, 0.06],
      normal: [-0.7, -0.45, 0.15],
      radius: 0.13,
    },
    modelParts: ["legs", "leg", "foreleg", "midleg", "hindleg"],
  },
  {
    id: "wing-scales",
    label: "Wing Scales",
    category: "surface",
    summary: "Tiny overlapping scales create the colours and patterns on my wings.",
    detail:
      "They overlap like roof tiles and can contain colour pigments. Some can rub off, which may help me slip free from a spider web.",
    anchor: {
      position: [1.68, 0.1, -0.02],
      normal: [0.05, 1, 0],
      radius: 0.12,
    },
    modelParts: ["wing-scales", "forewing-right", "hindwing-right", "wings"],
  },
];

// Flat aliases keep simple DOM projection/rendering shells generic. `position`
// shares the same array as `anchor.position`, so coordinate edits cannot drift.
for (const hotspot of HOTSPOTS) {
  hotspot.position = hotspot.anchor.position;
  hotspot.description = `${hotspot.summary} ${hotspot.detail}`;
  hotspot.meta = `${AFRICAN_MONARCH_SPECIMEN.commonName} · ${AFRICAN_MONARCH_SPECIMEN.scientificName}`;
}

export function indexHotspots(hotspots = HOTSPOTS) {
  return new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]));
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

/**
 * Resolve a raycast result. Accepts either an intersections array or a
 * configured THREE.Raycaster. The latter casts against marker hit targets.
 */
export function pickHotspot(raycasterOrIntersections, hotspotRoot, onSelect) {
  const targets = hotspotRoot?.userData?.hotspotTargets || [];
  const intersections = Array.isArray(raycasterOrIntersections)
    ? raycasterOrIntersections
    : raycasterOrIntersections?.intersectObjects?.(targets, true) || [];

  for (const intersection of intersections) {
    const id = findHotspotId(intersection.object, hotspotRoot);
    const hotspot = hotspotRoot?.userData?.hotspotsById?.get(id);
    if (!hotspot) continue;

    onSelect?.(hotspot, intersection);
    return hotspot;
  }

  return null;
}

/**
 * Generic marker layer for a butterfly, flower, cell, planet, or other model.
 */
export function createHotspotLayer(
  THREE,
  modelRoot,
  hotspots,
  onSelect = () => {},
  options = {},
) {
  if (!THREE?.Group || !modelRoot?.add) {
    throw new TypeError("createHotspotLayer needs THREE and a modelRoot Object3D.");
  }

  const source = hotspots || [];
  const root = new THREE.Group();
  root.name = options.name || "specimen-hotspots";
  root.renderOrder = options.renderOrder || 20;

  const markerGeometry = new THREE.SphereGeometry(options.markerRadius || 0.045, 16, 12);
  const hitGeometry = new THREE.SphereGeometry(options.hitRadius || 0.13, 10, 8);
  const ringGeometry = new THREE.TorusGeometry(
    options.ringRadius || 0.085,
    options.ringThickness || 0.009,
    8,
    28,
  );
  const hitTargets = [];
  const billboards = [];
  const materials = [];
  const hotspotsById = indexHotspots(source);

  for (const hotspot of source) {
    const marker = new THREE.Group();
    marker.name = `hotspot-${hotspot.id}`;
    marker.position.fromArray(hotspot.anchor.position);
    registerHotspotTarget(marker, hotspot.id);

    const colour = hotspot.color || options.color || 0xffb24a;
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: colour,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: colour,
      depthTest: false,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(coreMaterial, ringMaterial, hitMaterial);

    const core = new THREE.Mesh(markerGeometry, coreMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    const hitTarget = new THREE.Mesh(hitGeometry, hitMaterial);
    core.renderOrder = root.renderOrder;
    ring.renderOrder = root.renderOrder;
    hitTarget.renderOrder = root.renderOrder;
    registerHotspotTarget(core, hotspot.id);
    registerHotspotTarget(ring, hotspot.id);
    registerHotspotTarget(hitTarget, hotspot.id);

    marker.add(core, ring, hitTarget);
    root.add(marker);
    hitTargets.push(hitTarget);
    billboards.push(ring);
  }

  root.userData.hotspotTargets = hitTargets;
  root.userData.hotspotsById = hotspotsById;
  root.userData.selectHotspot = (id) => {
    const hotspot = hotspotsById.get(id) || null;
    if (hotspot) onSelect(hotspot);
    return hotspot;
  };
  const parentWorldQuaternion = new THREE.Quaternion();
  const cameraWorldQuaternion = new THREE.Quaternion();

  return {
    root,
    hotspots: source,
    targets: hitTargets,
    update(camera) {
      if (!camera) return;
      camera.getWorldQuaternion(cameraWorldQuaternion);
      (root.parent || modelRoot).getWorldQuaternion(parentWorldQuaternion).invert();
      parentWorldQuaternion.multiply(cameraWorldQuaternion);
      for (const ring of billboards) ring.quaternion.copy(parentWorldQuaternion);
    },
    setVisible(visible) {
      root.visible = Boolean(visible);
    },
    select(id) {
      return root.userData.selectHotspot(id);
    },
    pick(raycasterOrIntersections) {
      return pickHotspot(raycasterOrIntersections, root, onSelect);
    },
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

/**
 * Shell contract for the African Monarch proof.
 */
export function createHotspots(THREE, modelRoot, onSelect) {
  return createHotspotLayer(THREE, modelRoot, HOTSPOTS, onSelect, {
    name: `${AFRICAN_MONARCH_SPECIMEN.id}-hotspots`,
  });
}
