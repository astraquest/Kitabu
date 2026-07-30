const SEMANTIC_PART_IDS = Object.freeze([
  "plasma-membrane",
  "cytoplasm",
  "nucleus",
  "nuclear-lobes",
  "chromatin-bridges",
  "azurophilic-granules",
  "specific-granules",
]);

const DEFAULT_COUNTS = Object.freeze({
  azurophilicGranules: 34,
  specificGranules: 64,
  glycogenStores: 28,
  transportVesicles: 12,
});

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

function semantic(node, id, role) {
  node.name = id;
  node.userData.semanticId = id;
  node.userData.semanticRole = role;
  return node;
}

function deformSphereGeometry(THREE, geometry, radius, axisScale, amplitude, phase = 0) {
  const position = geometry.attributes.position;
  const base = new Float32Array(position.array);

  function apply(nextAmplitude) {
    const strength = Math.max(0, Math.min(0.16, Number(nextAmplitude) || 0));
    for (let index = 0; index < position.count; index += 1) {
      const offset = index * 3;
      const bx = base[offset];
      const by = base[offset + 1];
      const bz = base[offset + 2];
      const length = Math.hypot(bx, by, bz) || 1;
      const x = bx / length;
      const y = by / length;
      const z = bz / length;
      const azimuth = Math.atan2(z, x);
      const elevation = Math.asin(Math.max(-1, Math.min(1, y)));
      const field =
        0.52 * Math.sin(3 * azimuth + 2 * elevation + phase) +
        0.31 * Math.cos(5 * azimuth - elevation - phase * 0.7) +
        0.17 * Math.sin(4 * elevation + phase * 1.3);
      const radial = radius * (1 + strength * field);
      position.setXYZ(
        index,
        x * radial * axisScale[0],
        y * radial * axisScale[1],
        z * radial * axisScale[2],
      );
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  apply(amplitude);
  return apply;
}

function pointInsideNucleus(point, lobes, clearance = 1.12) {
  return lobes.some((lobe) => {
    const dx = (point.x - lobe.center[0]) / (lobe.scale[0] * clearance);
    const dy = (point.y - lobe.center[1]) / (lobe.scale[1] * clearance);
    const dz = (point.z - lobe.center[2]) / (lobe.scale[2] * clearance);
    return dx * dx + dy * dy + dz * dz < 1;
  });
}

function createPopulation(THREE, {
  id,
  role,
  count,
  radius,
  material,
  random,
  lobes,
  geometrySegments,
  geometries,
}) {
  const geometry = new THREE.SphereGeometry(radius, geometrySegments, Math.max(6, geometrySegments - 2));
  geometries.add(geometry);
  const mesh = semantic(new THREE.InstancedMesh(geometry, material, count), id, role);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.userData.instanceCount = count;
  mesh.userData.isIntracellularPopulation = true;

  const transform = new THREE.Object3D();
  const point = new THREE.Vector3();
  for (let instance = 0; instance < count; instance += 1) {
    let accepted = false;
    for (let attempt = 0; attempt < 80 && !accepted; attempt += 1) {
      point.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
      if (point.lengthSq() > 1) continue;
      point.set(point.x * 1.31, point.y * 1.21, point.z * 1.17);
      accepted = !pointInsideNucleus(point, lobes);
    }
    if (!accepted) point.set(0, 1.18 - instance * 0.01, 0);

    transform.position.copy(point);
    transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    const variation = 0.78 + random() * 0.44;
    transform.scale.set(variation, variation * (0.86 + random() * 0.24), variation);
    transform.updateMatrix();
    mesh.setMatrixAt(instance, transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function defaultMaterials(THREE, supplied = {}) {
  const owned = new Set();
  const choose = (keys, create) => {
    const suppliedMaterial = keys.map((key) => supplied[key]).find(Boolean);
    if (suppliedMaterial) return suppliedMaterial;
    const material = create();
    owned.add(material);
    return material;
  };

  return {
    owned,
    membrane: choose(["plasmaMembrane", "membrane", "cellMembrane"], () => new THREE.MeshPhysicalMaterial({
      color: 0xb9eff2,
      transparent: true,
      opacity: 0.28,
      roughness: 0.26,
      transmission: 0.25,
      thickness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })),
    cytoplasm: choose(["cytoplasm"], () => new THREE.MeshPhysicalMaterial({
      color: 0xe6f4d5,
      transparent: true,
      opacity: 0.22,
      roughness: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
    })),
    nucleus: choose(["nucleus", "multilobedNucleus"], () => new THREE.MeshStandardMaterial({
      color: 0x75509a,
      roughness: 0.6,
      metalness: 0,
    })),
    primaryGranules: choose(["azurophilicGranules", "primaryGranules"], () => new THREE.MeshStandardMaterial({
      color: 0x9d3e82,
      roughness: 0.48,
    })),
    secondaryGranules: choose(["specificGranules", "secondaryGranules"], () => new THREE.MeshStandardMaterial({
      color: 0xd7a2bd,
      roughness: 0.62,
    })),
    glycogen: choose(["glycogen", "glycogenStores"], () => new THREE.MeshStandardMaterial({
      color: 0xe4bd57,
      roughness: 0.7,
    })),
    vesicles: choose(["vesicles", "transportVesicles"], () => new THREE.MeshPhysicalMaterial({
      color: 0x6fc6d6,
      transparent: true,
      opacity: 0.64,
      roughness: 0.24,
      transmission: 0.12,
    })),
  };
}

function geometryTriangleCount(geometry) {
  if (geometry.index) return geometry.index.count / 3;
  return geometry.attributes.position.count / 3;
}

function distinctAxisValues(geometry, axis) {
  const values = new Set();
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    values.add(position.getComponent(index, axis).toFixed(3));
  }
  return values.size;
}

export function createNeutrophilGeometry(THREE, options = {}) {
  if (!THREE?.Group || !THREE?.SphereGeometry || !THREE?.InstancedMesh) {
    throw new TypeError("createNeutrophilGeometry requires a compatible Three.js namespace.");
  }

  const quality = options.quality === "quality" ? "quality" : "mobile";
  const seed = Number.isFinite(options.seed) ? options.seed : 1942;
  const random = seededRandom(seed);
  const counts = { ...DEFAULT_COUNTS, ...(options.counts ?? {}) };
  const segments = quality === "quality" ? { width: 64, height: 40, detail: 12 } : { width: 40, height: 28, detail: 9 };
  const materials = defaultMaterials(THREE, options.materials);
  const geometries = new Set();
  const root = new THREE.Group();
  root.name = "mature-neutrophil";
  root.userData.assetId = "specimen.neutrophil-cell.001";
  root.userData.modelType = "mature-human-neutrophil";
  root.userData.semanticParts = [...SEMANTIC_PART_IDS];
  root.userData.sourceLimitations = "Procedural teaching model; relative organelle size and abundance are illustrative, not a quantitative ultrastructure reconstruction.";

  const parts = Object.create(null);
  const membraneGeometry = new THREE.SphereGeometry(1, segments.width, segments.height);
  const cytoplasmGeometry = new THREE.SphereGeometry(1, segments.width - 8, segments.height - 6);
  geometries.add(membraneGeometry);
  geometries.add(cytoplasmGeometry);
  const deformMembrane = deformSphereGeometry(THREE, membraneGeometry, 1.5, [1, 0.95, 0.92], options.deformation ?? 0.055, 0.25);
  const deformCytoplasm = deformSphereGeometry(THREE, cytoplasmGeometry, 1.42, [1, 0.95, 0.92], (options.deformation ?? 0.055) * 0.62, 0.25);

  parts["plasma-membrane"] = semantic(new THREE.Mesh(membraneGeometry, materials.membrane), "plasma-membrane", "selective-boundary");
  parts["plasma-membrane"].renderOrder = 20;
  parts.cytoplasm = semantic(new THREE.Mesh(cytoplasmGeometry, materials.cytoplasm), "cytoplasm", "intracellular-fluid");
  parts.cytoplasm.renderOrder = 10;
  root.add(parts.cytoplasm, parts["plasma-membrane"]);

  const lobeSpecs = [
    { center: [-0.68, 0.08, 0.1], scale: [0.39, 0.5, 0.35] },
    { center: [-0.22, 0.24, -0.11], scale: [0.4, 0.48, 0.36] },
    { center: [0.27, 0.08, 0.09], scale: [0.4, 0.5, 0.35] },
    { center: [0.69, -0.18, -0.07], scale: [0.35, 0.45, 0.33] },
  ];
  const nucleus = semantic(new THREE.Group(), "nucleus", "segmented-nucleus");
  nucleus.userData.lobeCount = lobeSpecs.length;
  nucleus.userData.connectionType = "thin-chromatin-strands";
  const nuclearLobes = semantic(new THREE.Group(), "nuclear-lobes", "nuclear-segments");
  const chromatinBridges = semantic(new THREE.Group(), "chromatin-bridges", "interlobe-connections");
  nucleus.add(nuclearLobes, chromatinBridges);
  const lobeGeometry = new THREE.SphereGeometry(1, quality === "quality" ? 28 : 20, quality === "quality" ? 20 : 14);
  geometries.add(lobeGeometry);
  lobeSpecs.forEach((spec, index) => {
    const lobe = new THREE.Mesh(lobeGeometry, materials.nucleus);
    lobe.name = `nucleus-lobe-${index + 1}`;
    lobe.position.set(...spec.center);
    lobe.scale.set(...spec.scale);
    lobe.userData.semanticId = "nuclear-lobes";
    lobe.userData.subpartId = `nucleus-lobe-${index + 1}`;
    lobe.userData.explodeWithParent = true;
    nuclearLobes.add(lobe);
  });

  for (let index = 0; index < lobeSpecs.length - 1; index += 1) {
    const start = new THREE.Vector3(...lobeSpecs[index].center);
    const end = new THREE.Vector3(...lobeSpecs[index + 1].center);
    const midpoint = start.clone().lerp(end, 0.5);
    midpoint.z += index % 2 === 0 ? 0.045 : -0.045;
    const curve = new THREE.CatmullRomCurve3([start, midpoint, end]);
    const strandGeometry = new THREE.TubeGeometry(curve, 8, 0.105, 8, false);
    geometries.add(strandGeometry);
    const strand = new THREE.Mesh(strandGeometry, materials.nucleus);
    strand.name = `nuclear-strand-${index + 1}`;
    strand.userData.semanticId = "chromatin-bridges";
    strand.userData.subpartId = `nuclear-strand-${index + 1}`;
    strand.userData.explodeWithParent = true;
    chromatinBridges.add(strand);
  }
  parts.nucleus = nucleus;
  parts["nuclear-lobes"] = nuclearLobes;
  parts["chromatin-bridges"] = chromatinBridges;
  root.add(nucleus);

  const populationDefinitions = [
    { id: "azurophilic-granules", role: "primary-antimicrobial-granules", count: counts.azurophilicGranules ?? counts.primaryGranules, radius: 0.045, material: materials.primaryGranules },
    { id: "specific-granules", role: "secondary-antimicrobial-granules", count: counts.specificGranules ?? counts.secondaryGranules, radius: 0.032, material: materials.secondaryGranules },
    { id: "glycogen-stores", role: "energy-reserve", count: counts.glycogenStores, radius: 0.027, material: materials.glycogen, subpart: true },
    { id: "transport-vesicles", role: "secretory-transport", count: counts.transportVesicles, radius: 0.064, material: materials.vesicles, subpart: true },
  ];
  for (const definition of populationDefinitions) {
    const population = createPopulation(THREE, {
      ...definition,
      random,
      lobes: lobeSpecs,
      geometrySegments: segments.detail,
      geometries,
    });
    if (definition.subpart) {
      population.userData.subpartId = definition.id;
      population.userData.semanticId = "cytoplasm";
      population.userData.explodeWithParent = true;
      parts.cytoplasm.add(population);
    } else {
      root.add(population);
    }
    parts[definition.id] = population;
  }

  const materialStates = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const meshMaterials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of meshMaterials) {
      if (!materialStates.has(material)) {
        materialStates.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
          clippingPlanes: material.clippingPlanes,
        });
      }
    }
  });

  const explodeVectors = {
    "plasma-membrane": [-2.5, 0, 0],
    cytoplasm: [2.35, 0, 0],
    nucleus: [0, 2.05, 0],
    "nuclear-lobes": [-0.55, 0, 0.35],
    "chromatin-bridges": [0.55, 0, -0.35],
    "azurophilic-granules": [0, -1.7, 1.4],
    "specific-granules": [0, -1.9, -1.35],
  };

  function setExplode(amount = 1) {
    const value = Math.max(0, Math.min(1, Number(amount) || 0));
    for (const id of SEMANTIC_PART_IDS) {
      const vector = explodeVectors[id];
      parts[id].position.set(vector[0] * value, vector[1] * value, vector[2] * value);
    }
    root.userData.explodeAmount = value;
  }

  function resetIsolation() {
    for (const child of root.children) child.visible = true;
    nuclearLobes.visible = true;
    chromatinBridges.visible = true;
    root.userData.isolatedPart = null;
  }

  function isolate(id) {
    if (!parts[id]) return false;
    for (const child of root.children) child.visible = false;
    if (id === "nuclear-lobes" || id === "chromatin-bridges") {
      nucleus.visible = true;
      nuclearLobes.visible = id === "nuclear-lobes";
      chromatinBridges.visible = id === "chromatin-bridges";
    } else {
      parts[id].visible = true;
    }
    root.userData.isolatedPart = id;
    return true;
  }

  const clippingPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  function restoreMaterials() {
    for (const [material, state] of materialStates) {
      material.opacity = state.opacity;
      material.transparent = state.transparent;
      material.depthWrite = state.depthWrite;
      material.clippingPlanes = state.clippingPlanes;
      material.needsUpdate = true;
    }
  }

  function setViewMode(mode = "orbit") {
    const normalized = mode === "explore" ? "orbit" : mode;
    if (!["orbit", "transparent", "cross-section", "explode"].includes(normalized)) {
      throw new RangeError(`Unsupported neutrophil view mode: ${mode}`);
    }
    restoreMaterials();
    resetIsolation();
    setExplode(normalized === "explode" ? 1 : 0);

    if (normalized === "transparent" || normalized === "cross-section") {
      materials.membrane.transparent = true;
      materials.membrane.opacity = normalized === "cross-section" ? 0.14 : 0.12;
      materials.membrane.depthWrite = false;
      materials.cytoplasm.transparent = true;
      materials.cytoplasm.opacity = normalized === "cross-section" ? 0.13 : 0.08;
      materials.cytoplasm.depthWrite = false;
    }
    if (normalized === "cross-section") {
      for (const material of materialStates.keys()) material.clippingPlanes = [clippingPlane];
    }
    for (const material of materialStates.keys()) material.needsUpdate = true;
    root.userData.viewMode = normalized;
  }

  function setMembraneDeformation(amplitude) {
    const value = Math.max(0, Math.min(0.16, Number(amplitude) || 0));
    deformMembrane(value);
    deformCytoplasm(value * 0.62);
    root.userData.deformationAmplitude = value;
  }

  let triangleCount = 0;
  let vertexCount = 0;
  let drawCalls = 0;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const multiplier = node.isInstancedMesh ? node.count : 1;
    triangleCount += geometryTriangleCount(node.geometry) * multiplier;
    vertexCount += node.geometry.attributes.position.count * multiplier;
    drawCalls += 1;
  });

  const metrics = Object.freeze({
    seed,
    quality,
    triangleCount,
    vertexCount,
    drawCalls,
    cellDiameterMicrometers: 13.5,
    nucleusLobeCount: lobeSpecs.length,
    nuclearStrandCount: lobeSpecs.length - 1,
    semanticPartCount: SEMANTIC_PART_IDS.length,
    granuleCounts: Object.freeze({ ...counts }),
    membraneAxisSamples: Object.freeze({
      x: distinctAxisValues(membraneGeometry, 0),
      y: distinctAxisValues(membraneGeometry, 1),
      z: distinctAxisValues(membraneGeometry, 2),
    }),
  });
  root.userData.geometryMetrics = metrics;
  root.userData.viewMode = "orbit";
  root.userData.explodeAmount = 0;
  root.userData.deformationAmplitude = Math.max(0, Math.min(0.16, options.deformation ?? 0.055));
  root.userData.sculptRuntime = {
    semanticPartIds: [...SEMANTIC_PART_IDS],
    destructionGroups: [
      ["plasma-membrane"],
      ["cytoplasm"],
      ["nucleus", "nuclear-lobes", "chromatin-bridges"],
      ["azurophilic-granules"],
      ["specific-granules"],
    ],
  };

  function dispose() {
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials.owned) material.dispose();
  }

  return {
    root,
    parts,
    metrics,
    setViewMode,
    setExplode,
    isolate,
    resetIsolation,
    setMembraneDeformation,
    dispose,
  };
}

export { SEMANTIC_PART_IDS };
