const DEFAULT_DETAIL_LEVEL = "quality";
const DEFAULT_SEED = 0x45434f4c;

export const ECOLI_GEOMETRY_CONTRACT = Object.freeze({
  schemaVersion: 1,
  coordinateSystem: Object.freeze({ up: "+Y", longAxis: "+X", units: "scene-units" }),
  dimensions: Object.freeze({ length: 6.2, diameter: 2.0 }),
  crossSection: Object.freeze({ axis: "z", openingDirection: "+Z", envelopeOrder: "outside-in" }),
  materialKeys: Object.freeze([
    "outer_membrane_lps",
    "periplasm",
    "peptidoglycan_sacculus",
    "inner_membrane",
    "cytoplasm",
    "nucleoid_chromosomal_dna",
    "ribosomes",
    "plasmid_dna",
    "flagellum",
    "fimbriae",
    "conjugative_pilus",
  ]),
  semanticParts: Object.freeze([
    "outer_membrane_lps",
    "periplasm",
    "peptidoglycan_sacculus",
    "inner_membrane",
    "cytoplasm",
    "nucleoid_chromosomal_dna",
    "ribosomes",
    "plasmid_dna",
    "flagellum",
    "fimbriae",
    "conjugative_pilus",
  ]),
  envelopeParts: Object.freeze([
    "outer_membrane_lps",
    "periplasm",
    "peptidoglycan_sacculus",
    "inner_membrane",
    "cytoplasm",
  ]),
});

const DETAIL_PRESETS = Object.freeze({
  mobile: Object.freeze({ radialSegments: 16, capSegments: 8, tubeSegments: 32, tubeRadialSegments: 5, ribosomes: 85, fimbriae: 70, lps: 52, flagella: 2 }),
  quality: Object.freeze({ radialSegments: 28, capSegments: 14, tubeSegments: 56, tubeRadialSegments: 7, ribosomes: 170, fimbriae: 120, lps: 88, flagella: 3 }),
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function setSemanticNode(node, id, kind = "part") {
  node.name = id;
  node.userData.semanticId = id;
  node.userData.kind = kind;
  node.userData.restPosition = [node.position.x, node.position.y, node.position.z];
  return node;
}

function addSurfaceMesh(THREE, parent, name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.semanticId = parent.userData.semanticId;
  mesh.userData.explodeWithParent = true;
  parent.add(mesh);
  return mesh;
}

function resolveMaterials(THREE, supplied = {}) {
  const owned = new Set();
  const fallback = new Map();
  const palette = {
    outer_membrane_lps: 0xf39b78,
    periplasm: 0xf4d7a1,
    peptidoglycan_sacculus: 0xffce63,
    inner_membrane: 0x69c4b2,
    cytoplasm: 0x72b8c8,
    nucleoid_chromosomal_dna: 0xe987c8,
    ribosomes: 0x69548f,
    plasmid_dna: 0xf5d35e,
    flagellum: 0xdf795e,
    fimbriae: 0xe5ac8b,
    conjugative_pilus: 0x8bc2dc,
  };
  const aliases = {
    outer_membrane_lps: ["outer-membrane", "outerMembrane"],
    periplasm: ["capsule"],
    peptidoglycan_sacculus: ["peptidoglycan"],
    inner_membrane: ["inner-membrane", "innerMembrane", "plasmaMembrane"],
    nucleoid_chromosomal_dna: ["nucleoid"],
    ribosomes: ["ribosome"],
    plasmid_dna: ["plasmid"],
    fimbriae: ["pilus", "pili"],
    conjugative_pilus: ["pilus", "pili"],
  };
  const resolve = (key) => {
    const candidate = typeof supplied === "function"
      ? supplied(key)
      : supplied?.[key] ?? aliases[key]?.map((alias) => supplied?.[alias]).find(Boolean);
    if (candidate) return candidate;
    if (!fallback.has(key)) {
      const envelope = ECOLI_GEOMETRY_CONTRACT.envelopeParts.includes(key);
      const material = new THREE.MeshStandardMaterial({
        color: palette[key] ?? 0xb8b8b8,
        roughness: key.includes("membrane") ? 0.36 : 0.62,
        metalness: 0,
        transparent: envelope,
        opacity: key === "cytoplasm" ? 0.22 : envelope ? 0.3 : 1,
        depthWrite: !envelope,
      });
      material.name = `geometry-fallback.${key}`;
      fallback.set(key, material);
      owned.add(material);
    }
    return fallback.get(key);
  };
  return { resolve, owned };
}

export function createSpherocylinderGeometry(THREE, totalLength, radius, radialSegments = 24, capSegments = 12) {
  if (!THREE?.CapsuleGeometry) throw new TypeError("A THREE namespace with CapsuleGeometry is required.");
  if (!(totalLength > radius * 2) || !(radius > 0)) throw new RangeError("Spherocylinder length must exceed its positive diameter.");
  const cylinderLength = totalLength - radius * 2;
  const geometry = new THREE.CapsuleGeometry(radius, cylinderLength, capSegments, radialSegments);
  geometry.rotateZ(Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.userData.shape = { type: "spherocylinder", totalLength, radius, longAxis: "x" };
  return geometry;
}

function createEnvelopeLayer(THREE, root, nodes, materials, detail, definition, index) {
  const part = setSemanticNode(new THREE.Group(), definition.id);
  part.userData.layerIndex = index;
  part.userData.peelable = true;
  part.userData.isolatable = true;
  part.userData.explodeDirection = [0, index % 2 ? -1 : 1, 0.18 * index];
  part.userData.collider = { type: "capsule", axis: "x", totalLength: definition.length, radius: definition.radius, trigger: definition.id === "cytoplasm" };
  addSurfaceMesh(
    THREE,
    part,
    `${definition.id}.surface`,
    createSpherocylinderGeometry(THREE, definition.length, definition.radius, detail.radialSegments, detail.capSegments),
    materials(definition.id),
  );
  root.add(part);
  nodes[definition.id] = part;
  return part;
}

function capsuleInteriorPoint(random, halfCylinder, radius) {
  const x = (random() * 2 - 1) * (halfCylinder + radius * 0.46);
  const localLimit = Math.abs(x) <= halfCylinder
    ? radius
    : Math.sqrt(Math.max(0, radius ** 2 - (Math.abs(x) - halfCylinder) ** 2));
  const angle = random() * Math.PI * 2;
  const radial = Math.sqrt(random()) * localLimit * 0.82;
  return [x, Math.cos(angle) * radial, Math.sin(angle) * radial];
}

function createNucleoid(THREE, root, nodes, material, detail) {
  const part = setSemanticNode(new THREE.Group(), "nucleoid_chromosomal_dna");
  part.userData.isolatable = true;
  part.userData.explodeDirection = [0, 1, 0.35];
  const turns = 30;
  const points = [];
  for (let index = 0; index < turns; index += 1) {
    const angle = (index / turns) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.sin(angle * 2) * 1.55,
      Math.sin(angle * 5 + 0.4) * 0.44,
      Math.cos(angle * 3) * 0.37,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  addSurfaceMesh(THREE, part, "nucleoid_chromosomal_dna.loop", new THREE.TubeGeometry(curve, detail.tubeSegments * 2, 0.045, detail.tubeRadialSegments, true), material);
  root.add(part);
  nodes[part.name] = part;
}

function createRibosomes(THREE, root, nodes, material, detail, random) {
  const part = setSemanticNode(new THREE.Group(), "ribosomes", "assembly");
  part.userData.isolatable = true;
  part.userData.explodeDirection = [0, -1, 0.35];
  const geometry = new THREE.SphereGeometry(0.045, 7, 5);
  const mesh = new THREE.InstancedMesh(geometry, material, detail.ribosomes);
  mesh.name = "ribosomes.instances";
  mesh.userData.semanticId = part.name;
  mesh.userData.explodeWithParent = true;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < detail.ribosomes; index += 1) {
    const [x, y, z] = capsuleInteriorPoint(random, 2.15, 0.7);
    matrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  part.add(mesh);
  root.add(part);
  nodes[part.name] = part;
}

function createPlasmids(THREE, root, nodes, material, detail) {
  const part = setSemanticNode(new THREE.Group(), "plasmid_dna", "assembly");
  part.userData.isolatable = true;
  part.userData.explodeDirection = [0.25, 1, -0.2];
  const placements = [
    [-1.45, 0.42, 0.22, 0.22],
    [1.25, -0.43, 0.18, -0.31],
    [0.55, 0.5, -0.24, 0.48],
  ];
  placements.forEach(([x, y, z, tilt], index) => {
    const geometry = new THREE.TorusGeometry(0.18 - index * 0.018, 0.018, detail.tubeRadialSegments, 18);
    const mesh = addSurfaceMesh(THREE, part, `plasmid_dna.ring.${index + 1}`, geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.PI / 2 + tilt, tilt * 0.5, tilt);
  });
  root.add(part);
  nodes[part.name] = part;
}

function fibonacciSurfacePoint(index, count, halfCylinder, radius) {
  const sideCount = Math.floor(count * 0.72);
  const angle = index * 2.399963229728653;
  if (index < sideCount) {
    const x = -halfCylinder + ((index + 0.5) / sideCount) * halfCylinder * 2;
    return { point: [x, Math.cos(angle) * radius, Math.sin(angle) * radius], normal: [0, Math.cos(angle), Math.sin(angle)] };
  }
  const capIndex = index - sideCount;
  const capCount = count - sideCount;
  const positive = capIndex % 2 === 0;
  const pairIndex = Math.floor(capIndex / 2);
  const pairs = Math.ceil(capCount / 2);
  const axial = (pairIndex + 0.5) / pairs;
  const radial = Math.sqrt(Math.max(0, 1 - axial * axial));
  const normal = [positive ? axial : -axial, Math.cos(angle) * radial, Math.sin(angle) * radial];
  return {
    point: [(positive ? halfCylinder : -halfCylinder) + normal[0] * radius, normal[1] * radius, normal[2] * radius],
    normal,
  };
}

function createSurfaceFibers(THREE, root, nodes, material, detail, definition) {
  const part = setSemanticNode(new THREE.Group(), definition.id, "assembly");
  part.userData.isolatable = true;
  part.userData.explodeDirection = definition.explodeDirection;
  part.userData.attachment = {
    parent: "outer_membrane_lps",
    parentId: "outer_membrane_lps",
    parentSocket: "outer_surface",
    contactType: "embedded",
    embedDepth: 0.025,
    gapTolerance: 0.01,
  };
  const geometry = new THREE.CylinderGeometry(definition.radius, definition.radius * 0.72, definition.length, 5, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, definition.count);
  mesh.name = `${definition.id}.instances`;
  mesh.userData.semanticId = definition.id;
  mesh.userData.explodeWithParent = true;
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < definition.count; index += 1) {
    const surface = fibonacciSurfacePoint(index, definition.count, 2.1, definition.surfaceRadius);
    normal.set(...surface.normal).normalize();
    position.set(...surface.point).addScaledVector(normal, definition.length / 2 - 0.025);
    quaternion.setFromUnitVectors(up, normal);
    matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  part.add(mesh);
  root.add(part);
  nodes[part.name] = part;
}

function addCurvedAppendage(THREE, parent, id, material, detail, points, radius) {
  const vectors = points.map((point) => new THREE.Vector3(...point));
  const curve = new THREE.CatmullRomCurve3(vectors, false, "centripetal");
  const mesh = addSurfaceMesh(THREE, parent, id, new THREE.TubeGeometry(curve, detail.tubeSegments, radius, detail.tubeRadialSegments, false), material);
  mesh.userData.attachment = {
    parent: "outer_membrane_lps",
    parentId: "outer_membrane_lps",
    parentSocket: "cell_pole",
    localStart: points[0],
    localEnd: points.at(-1),
    baseRadius: radius,
    endRadius: radius,
    contactType: "embedded",
    embedDepth: 0.08,
    gapTolerance: 0.01,
  };
  return mesh;
}

function createFlagella(THREE, root, nodes, material, detail) {
  const part = setSemanticNode(new THREE.Group(), "flagellum", "assembly");
  part.userData.isolatable = true;
  part.userData.explodeDirection = [-1, 0.25, 0];
  for (let index = 0; index < detail.flagella; index += 1) {
    const offset = (index - (detail.flagella - 1) / 2) * 0.22;
    const points = [[-3.02, offset, -0.12 + index * 0.1]];
    for (let step = 1; step <= 13; step += 1) {
      const t = step / 13;
      points.push([-3.02 - t * 4.2, offset + Math.sin(t * Math.PI * 7 + index) * 0.32, -0.12 + index * 0.1 + Math.cos(t * Math.PI * 7 + index) * 0.28]);
    }
    addCurvedAppendage(THREE, part, `flagellum.filament.${index + 1}`, material, detail, points, 0.035);
  }
  root.add(part);
  nodes[part.name] = part;
}

function createConjugativePilus(THREE, root, nodes, material, detail) {
  const part = setSemanticNode(new THREE.Group(), "conjugative_pilus");
  part.userData.isolatable = true;
  part.userData.explodeDirection = [0, 1, 0.7];
  addCurvedAppendage(
    THREE,
    part,
    "conjugative_pilus.filament",
    material,
    detail,
    [[0.3, 0.92, 0.25], [0.65, 1.5, 0.42], [1.2, 2.05, 0.22], [1.85, 2.42, -0.06], [2.5, 2.65, 0.15]],
    0.065,
  );
  root.add(part);
  nodes[part.name] = part;
}

export function computeEColiGeometryMetrics(THREE, root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const semanticIds = new Set();
  const depthPlanes = new Set();
  const point = new THREE.Vector3();
  let meshCount = 0;
  let namedMeshCount = 0;
  let triangles = 0;
  root.traverse((node) => {
    if (node.userData?.semanticId) semanticIds.add(node.userData.semanticId);
    if (!node.isMesh) return;
    meshCount += 1;
    if (node.name) namedMeshCount += 1;
    const attribute = node.geometry?.getAttribute?.("position");
    if (!attribute) return;
    const instances = node.isInstancedMesh ? node.count : 1;
    triangles += ((node.geometry.index?.count ?? attribute.count) / 3) * instances;
    for (let index = 0; index < attribute.count; index += 1) {
      point.fromBufferAttribute(attribute, index).applyMatrix4(node.matrixWorld);
      depthPlanes.add(Math.round(point.z * 1000));
    }
  });
  return Object.freeze({
    meshCount,
    namedMeshCount,
    semanticPartCount: semanticIds.size,
    triangles: Math.round(triangles),
    distinctDepthPlanes: depthPlanes.size,
    bounds: Object.freeze({ width: Number(size.x.toFixed(4)), height: Number(size.y.toFixed(4)), depth: Number(size.z.toFixed(4)) }),
  });
}

export function auditEColiGeometry(THREE, root) {
  const metrics = computeEColiGeometryMetrics(THREE, root);
  const present = new Set();
  let nonFiniteVertices = 0;
  root.traverse((node) => {
    if (node.userData?.semanticId) present.add(node.userData.semanticId);
    const attribute = node.geometry?.getAttribute?.("position");
    if (!attribute) return;
    for (let index = 0; index < attribute.count; index += 1) {
      if (![attribute.getX(index), attribute.getY(index), attribute.getZ(index)].every(Number.isFinite)) nonFiniteVertices += 1;
    }
  });
  const missingSemanticParts = ECOLI_GEOMETRY_CONTRACT.semanticParts.filter((id) => !present.has(id));
  const failures = [];
  if (metrics.bounds.width < 6 || metrics.bounds.height < 2 || metrics.bounds.depth < 2) failures.push("collapsed-volume");
  if (metrics.distinctDepthPlanes < 20) failures.push("insufficient-cross-section-variation");
  if (metrics.meshCount !== metrics.namedMeshCount) failures.push("unnamed-meshes");
  if (nonFiniteVertices) failures.push("non-finite-vertices");
  if (missingSemanticParts.length) failures.push("missing-semantic-parts");
  return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures), missingSemanticParts: Object.freeze(missingSemanticParts), nonFiniteVertices, metrics });
}

export function createEColiGeometry(THREE, options = {}) {
  if (!THREE?.Group || !THREE?.Mesh || !THREE?.CapsuleGeometry || !THREE?.InstancedMesh) {
    throw new TypeError("createEColiGeometry requires a compatible THREE namespace.");
  }
  const detailLevel = options.detailLevel ?? DEFAULT_DETAIL_LEVEL;
  const detail = DETAIL_PRESETS[detailLevel];
  if (!detail) throw new RangeError(`Unknown E. coli detail level: ${detailLevel}`);
  const seed = options.seed ?? DEFAULT_SEED;
  if (!Number.isInteger(seed)) throw new TypeError("E. coli geometry seed must be an integer.");
  const random = seededRandom(seed);
  const materialSet = resolveMaterials(THREE, options.materials);
  const materials = materialSet.resolve;
  const root = setSemanticNode(new THREE.Group(), "escherichia_coli", "root");
  const nodes = { escherichia_coli: root };

  const envelope = [
    { id: "outer_membrane_lps", length: 6.2, radius: 1 },
    { id: "periplasm", length: 6.02, radius: 0.91 },
    { id: "peptidoglycan_sacculus", length: 5.94, radius: 0.855 },
    { id: "inner_membrane", length: 5.82, radius: 0.79 },
    { id: "cytoplasm", length: 5.68, radius: 0.72 },
  ];
  envelope.forEach((definition, index) => createEnvelopeLayer(THREE, root, nodes, materials, detail, definition, index));
  createNucleoid(THREE, root, nodes, materials("nucleoid_chromosomal_dna"), detail);
  createRibosomes(THREE, root, nodes, materials("ribosomes"), detail, random);
  createPlasmids(THREE, root, nodes, materials("plasmid_dna"), detail);
  createSurfaceFibers(THREE, root, nodes, materials("fimbriae"), detail, {
    id: "fimbriae", count: detail.fimbriae, length: 0.32, radius: 0.018, surfaceRadius: 1, explodeDirection: [0, 1, 0],
  });
  createFlagella(THREE, root, nodes, materials("flagellum"), detail);
  createConjugativePilus(THREE, root, nodes, materials("conjugative_pilus"), detail);
  createSurfaceFibers(THREE, root, nodes, materials("outer_membrane_lps"), detail, {
    id: "outer_membrane_lps_lps_fibers", count: detail.lps, length: 0.12, radius: 0.025, surfaceRadius: 1, explodeDirection: [0, 0, 0],
  });
  nodes.outer_membrane_lps_lps_fibers.userData.explodeWithParent = true;
  nodes.outer_membrane_lps.add(nodes.outer_membrane_lps_lps_fibers);

  const anchors = {};
  for (const id of ECOLI_GEOMETRY_CONTRACT.semanticParts) {
    const anchor = new THREE.Object3D();
    anchor.name = `hotspot.${id}`;
    anchor.userData.semanticId = id;
    const node = nodes[id];
    if (node) anchor.position.copy(node.position);
    root.add(anchor);
    anchors[id] = anchor;
  }

  root.userData.semanticParts = [...ECOLI_GEOMETRY_CONTRACT.semanticParts];
  root.userData.crossSection = { ...ECOLI_GEOMETRY_CONTRACT.crossSection, clipCapRequired: true };
  root.userData.sculptRuntime = {
    schemaVersion: 1,
    nodes,
    sockets: anchors,
    partIds: [...ECOLI_GEOMETRY_CONTRACT.semanticParts],
    destructionGroups: {
      envelope: [...ECOLI_GEOMETRY_CONTRACT.envelopeParts],
      genetic_material: ["nucleoid_chromosomal_dna", "plasmid_dna"],
      protein_synthesis: ["ribosomes"],
      appendages: ["flagellum", "fimbriae", "conjugative_pilus"],
    },
  };
  root.userData.geometryMetrics = computeEColiGeometryMetrics(THREE, root);

  const dispose = () => {
    const geometries = new Set();
    root.traverse((node) => { if (node.geometry) geometries.add(node.geometry); });
    geometries.forEach((geometry) => geometry.dispose());
    materialSet.owned.forEach((material) => material.dispose());
  };
  return Object.freeze({ root, nodes, anchors, metrics: root.userData.geometryMetrics, dispose });
}
