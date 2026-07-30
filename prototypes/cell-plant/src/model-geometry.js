const DEFAULT_DETAIL = "quality";

export const PLANT_CELL_GEOMETRY_CONTRACT = Object.freeze({
  schemaVersion: 1,
  coordinateSystem: Object.freeze({ up: "+Y", front: "+Z", units: "scene-units" }),
  crossSection: Object.freeze({ axis: "z", openingDirection: "+Z", frontDepth: 1.08 }),
  dimensions: Object.freeze({ width: 4.8, height: 3.7, depth: 2.2 }),
  materialKeys: Object.freeze([
    "cellWall",
    "cellMembrane",
    "cytoplasm",
    "vacuole",
    "tonoplast",
    "nucleus",
    "nuclearEnvelope",
    "nucleolus",
    "chloroplast",
    "grana",
    "mitochondrion",
    "cristae",
    "golgi",
    "endoplasmicReticulum",
    "ribosome",
    "peroxisome",
    "plasmodesmata",
  ]),
  semanticParts: Object.freeze([
    "cell-wall",
    "cell-membrane",
    "cytoplasm",
    "central-vacuole",
    "nucleus",
    "nuclear-envelope",
    "chloroplasts",
    "mitochondria",
    "golgi-apparatus",
    "endoplasmic-reticulum",
    "ribosomes",
    "peroxisome",
    "plasmodesmata",
  ]),
});

const DETAIL_PRESETS = Object.freeze({
  mobile: Object.freeze({ sphereWidth: 18, sphereHeight: 12, curveSegments: 5, chloroplasts: 4, mitochondria: 2, ribosomes: 22 }),
  quality: Object.freeze({ sphereWidth: 28, sphereHeight: 18, curveSegments: 8, chloroplasts: 6, mitochondria: 3, ribosomes: 38 }),
});

function roundedRectPoints(width, height, radius, cornerSegments) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const clampedRadius = Math.min(radius, halfWidth, halfHeight);
  const corners = [
    [halfWidth - clampedRadius, -halfHeight + clampedRadius, -Math.PI / 2],
    [halfWidth - clampedRadius, halfHeight - clampedRadius, 0],
    [-halfWidth + clampedRadius, halfHeight - clampedRadius, Math.PI / 2],
    [-halfWidth + clampedRadius, -halfHeight + clampedRadius, Math.PI],
  ];
  const points = [];

  for (const [cx, cy, start] of corners) {
    for (let index = 0; index <= cornerSegments; index += 1) {
      const angle = start + (index / cornerSegments) * (Math.PI / 2);
      points.push([cx + Math.cos(angle) * clampedRadius, cy + Math.sin(angle) * clampedRadius]);
    }
  }
  return points;
}

function pathFromPoints(THREE, points, reverse = false) {
  const ordered = reverse ? [...points].reverse() : points;
  const path = new THREE.Path();
  path.moveTo(ordered[0][0], ordered[0][1]);
  for (let index = 1; index < ordered.length; index += 1) path.lineTo(ordered[index][0], ordered[index][1]);
  path.closePath();
  return path;
}

function createRoundedFrameGeometry(THREE, outer, inner, depth, detail) {
  const outerPoints = roundedRectPoints(outer.width, outer.height, outer.radius, detail.curveSegments);
  const innerPoints = roundedRectPoints(inner.width, inner.height, inner.radius, detail.curveSegments);
  const shape = new THREE.Shape(outerPoints.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(pathFromPoints(THREE, innerPoints, true));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    curveSegments: detail.curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createRoundedPanelGeometry(THREE, dimensions, depth, detail) {
  const points = roundedRectPoints(dimensions.width, dimensions.height, dimensions.radius, detail.curveSegments);
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: detail.curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function setSemanticNode(node, id, kind = "part") {
  node.name = id;
  node.userData.semanticId = id;
  node.userData.kind = kind;
  return node;
}

function addSurfaceMesh(THREE, parent, id, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.semanticId = parent.userData.semanticId;
  mesh.userData.explodeWithParent = true;
  parent.add(mesh);
  return mesh;
}

function addEllipsoid(THREE, parent, id, radii, position, material, detail) {
  const group = setSemanticNode(new THREE.Group(), id);
  group.position.set(...position);
  const mesh = addSurfaceMesh(
    THREE,
    group,
    `${id}.surface`,
    new THREE.SphereGeometry(1, detail.sphereWidth, detail.sphereHeight),
    material,
  );
  mesh.scale.set(...radii);
  parent.add(group);
  return group;
}

function addTube(THREE, parent, id, points, radius, material, detail, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "centripetal");
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, detail.curveSegments * 3, radius, 7, closed), material);
  mesh.name = id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.semanticId = parent.userData.semanticId;
  mesh.userData.explodeWithParent = true;
  parent.add(mesh);
  return mesh;
}

function addCylinderBetween(THREE, parent, id, start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 14, 1, true), material);
  mesh.name = id;
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.semanticId = parent.userData.semanticId;
  mesh.userData.explodeWithParent = true;
  parent.add(mesh);
  return mesh;
}

function materialResolver(THREE, supplied) {
  const owned = new Set();
  const fallback = new Map();
  const source = supplied || {};
  const resolve = (key) => {
    const candidate = typeof source === "function" ? source(key) : source[key];
    if (candidate) return candidate;
    if (!fallback.has(key)) {
      const material = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.72, metalness: 0 });
      material.name = `geometry-fallback.${key}`;
      fallback.set(key, material);
      owned.add(material);
    }
    return fallback.get(key);
  };
  return { resolve, owned };
}

function createCellEnvelope(THREE, root, nodes, material, detail, config) {
  const wall = setSemanticNode(new THREE.Group(), config.id);
  addSurfaceMesh(
    THREE,
    wall,
    `${config.id}.section-frame`,
    createRoundedFrameGeometry(THREE, config.outer, config.inner, config.depth, detail),
    material,
  );
  const back = addSurfaceMesh(
    THREE,
    wall,
    `${config.id}.rear-wall`,
    createRoundedPanelGeometry(THREE, config.outer, config.backThickness, detail),
    material,
  );
  back.position.z = -config.depth / 2 + config.backThickness / 2;
  wall.userData.attachment = {
    contactType: "overlap",
    overlap: config.backThickness,
    gapTolerance: 0.01,
  };
  root.add(wall);
  nodes[config.id] = wall;
  return wall;
}

function createNucleus(THREE, interior, nodes, materials, detail) {
  const nucleus = addEllipsoid(THREE, interior, "nucleus", [0.55, 0.51, 0.47], [1.25, 0.42, 0.23], materials("nucleus"), detail);
  nucleus.userData.collider = { type: "ellipsoid", radii: [0.61, 0.57, 0.53] };
  const envelope = addEllipsoid(THREE, nucleus, "nuclear-envelope", [0.61, 0.57, 0.53], [0, 0, 0], materials("nuclearEnvelope"), detail);
  envelope.userData.explodeWithParent = true;
  envelope.userData.attachment = { parentId: "nucleus", contactType: "surface-contact", gapTolerance: 0.01 };
  const nucleolus = addEllipsoid(THREE, nucleus, "nucleolus", [0.19, 0.18, 0.17], [0.09, 0.03, 0.17], materials("nucleolus"), detail);
  nucleolus.userData.explodeWithParent = true;
  nodes.nucleus = nucleus;
  nodes["nuclear-envelope"] = envelope;
  nodes.nucleolus = nucleolus;
}

function createChloroplasts(THREE, interior, nodes, materials, detail) {
  const assembly = setSemanticNode(new THREE.Group(), "chloroplasts", "assembly");
  const placements = [
    [-1.5, 0.92, 0.2, 0.18], [0.1, 1.12, -0.25, -0.2], [1.55, -0.75, -0.12, 0.34],
    [-1.52, -0.88, 0.28, -0.38], [1.58, 0.96, -0.3, -0.22], [0.45, -1.18, 0.22, 0.12],
  ];
  for (let index = 0; index < detail.chloroplasts; index += 1) {
    const [x, y, z, rotation] = placements[index];
    const part = addEllipsoid(THREE, assembly, `chloroplast.${index + 1}`, [0.48, 0.22, 0.19], [x, y, z], materials("chloroplast"), detail);
    part.rotation.z = rotation;
    for (let stack = -1; stack <= 1; stack += 1) {
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.055, 14), materials("grana"));
      disk.name = `chloroplast.${index + 1}.thylakoid.${stack + 2}`;
      disk.rotation.z = Math.PI / 2;
      disk.position.x = stack * 0.14;
      disk.userData.semanticId = part.userData.semanticId;
      disk.userData.explodeWithParent = true;
      part.add(disk);
    }
    nodes[part.name] = part;
  }
  interior.add(assembly);
  nodes.chloroplasts = assembly;
}

function createMitochondria(THREE, interior, nodes, materials, detail) {
  const assembly = setSemanticNode(new THREE.Group(), "mitochondria", "assembly");
  const placements = [[-1.45, 0.22, 0.44, -0.25], [1.35, -0.25, 0.5, 0.35], [0.05, 0.72, 0.5, 0.1]];
  for (let index = 0; index < detail.mitochondria; index += 1) {
    const [x, y, z, rotation] = placements[index];
    const part = addEllipsoid(THREE, assembly, `mitochondrion.${index + 1}`, [0.36, 0.16, 0.15], [x, y, z], materials("mitochondrion"), detail);
    part.rotation.z = rotation;
    addTube(THREE, part, `mitochondrion.${index + 1}.crista`, [[-0.23, 0, 0.11], [-0.1, 0.06, 0.13], [0.03, -0.05, 0.13], [0.2, 0.03, 0.11]], 0.018, materials("cristae"), detail);
    nodes[part.name] = part;
  }
  interior.add(assembly);
  nodes.mitochondria = assembly;
}

function createGolgi(THREE, interior, nodes, materials, detail) {
  const golgi = setSemanticNode(new THREE.Group(), "golgi-apparatus");
  golgi.position.set(0.78, -0.66, 0.5);
  for (let index = 0; index < 5; index += 1) {
    const y = (index - 2) * 0.09;
    const width = 0.42 - Math.abs(index - 2) * 0.035;
    addTube(THREE, golgi, `golgi-cisterna.${index + 1}`, [[-width, y, 0], [-width * 0.45, y - 0.035, 0.045], [0, y - 0.05, 0.065], [width * 0.45, y - 0.035, 0.045], [width, y, 0]], 0.035, materials("golgi"), detail);
  }
  interior.add(golgi);
  nodes[golgi.name] = golgi;
}

function createEndoplasmicReticulum(THREE, interior, nodes, materials, detail) {
  const er = setSemanticNode(new THREE.Group(), "endoplasmic-reticulum");
  er.position.set(1.06, 0.31, 0.18);
  const paths = [
    [[-0.7, 0.35, 0.05], [-0.35, 0.48, 0.16], [0.05, 0.4, 0.1], [0.45, 0.48, 0.02]],
    [[-0.68, 0.15, 0.02], [-0.32, 0.26, 0.14], [0.08, 0.18, 0.08], [0.5, 0.27, 0]],
    [[-0.62, -0.06, 0], [-0.28, 0.05, 0.12], [0.12, -0.02, 0.07], [0.47, 0.06, -0.02]],
  ];
  paths.forEach((points, index) => addTube(THREE, er, `er-tubule.${index + 1}`, points, 0.045, materials("endoplasmicReticulum"), detail));
  interior.add(er);
  nodes[er.name] = er;
}

function createRibosomes(THREE, interior, nodes, materials, detail) {
  const ribosomes = setSemanticNode(new THREE.Group(), "ribosomes", "assembly");
  const geometry = new THREE.SphereGeometry(0.026, 8, 6);
  const mesh = new THREE.InstancedMesh(geometry, materials("ribosome"), detail.ribosomes);
  mesh.name = "ribosomes.instances";
  mesh.userData.semanticId = "ribosomes";
  mesh.userData.explodeWithParent = true;
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < detail.ribosomes; index += 1) {
    const angle = index * 2.399963229728653;
    const radius = 0.66 + (index % 5) * 0.11;
    const x = 0.82 + Math.cos(angle) * radius;
    const y = 0.31 + Math.sin(angle) * radius * 0.55;
    const z = 0.44 + ((index * 7) % 11) * 0.025;
    matrix.makeTranslation(x, y, z);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  ribosomes.add(mesh);
  interior.add(ribosomes);
  nodes.ribosomes = ribosomes;
}

function createPeroxisome(THREE, interior, nodes, materials, detail) {
  const peroxisome = addEllipsoid(THREE, interior, "peroxisome", [0.22, 0.2, 0.19], [0.3, -1.1, 0.58], materials("peroxisome"), detail);
  peroxisome.userData.collider = { type: "sphere", radius: 0.22 };
  peroxisome.userData.attachment = { parentId: "cytoplasm", contactType: "embedded", gapTolerance: 0 };
  nodes.peroxisome = peroxisome;
}

function createPlasmodesmata(THREE, root, nodes, materials) {
  const channels = setSemanticNode(new THREE.Group(), "plasmodesmata");
  const yPositions = [-0.36, -0.2, -0.04];
  for (let index = 0; index < yPositions.length; index += 1) {
    const y = yPositions[index];
    addCylinderBetween(
      THREE,
      channels,
      `plasmodesma.${index + 1}.channel`,
      [-2.5, y, 0.62],
      [-1.88, y, 0.62],
      0.043,
      materials("plasmodesmata"),
    );
  }
  channels.userData.attachment = {
    parentId: "cell-wall",
    parentSocket: "left-wall-channel-field",
    localStart: [-2.5, -0.2, 0.62],
    localEnd: [-1.88, -0.2, 0.62],
    contactType: "embedded",
    embedDepth: 0.62,
    gapTolerance: 0,
  };
  root.add(channels);
  nodes.plasmodesmata = channels;
}

function createAnchors(THREE, root) {
  const definitions = {
    "cell-wall": [2.14, 1.22, 0.82],
    "cell-membrane": [1.92, 0.96, 0.76],
    "central-vacuole": [-0.42, -0.04, 0.64],
    nucleus: [1.25, 0.42, 0.78],
    "nuclear-envelope": [0.86, 0.68, 0.72],
    chloroplasts: [-1.5, 0.92, 0.52],
    mitochondria: [1.35, -0.25, 0.72],
    "golgi-apparatus": [0.78, -0.66, 0.72],
    peroxisome: [0.3, -1.1, 0.64],
    plasmodesmata: [-2.18, -0.2, 0.62],
  };
  const anchors = {};
  for (const [id, position] of Object.entries(definitions)) {
    const anchor = new THREE.Object3D();
    anchor.name = `hotspot.${id}`;
    anchor.position.set(...position);
    anchor.userData.semanticId = id;
    root.add(anchor);
    anchors[id] = anchor;
  }
  return anchors;
}

function normalizeOptions(materialsOrOptions, maybeOptions) {
  if (maybeOptions !== undefined) return { ...maybeOptions, materials: materialsOrOptions };
  if (materialsOrOptions?.isMaterial || typeof materialsOrOptions === "function") return { materials: materialsOrOptions };
  if (materialsOrOptions && ("materials" in materialsOrOptions || "detailLevel" in materialsOrOptions)) return materialsOrOptions;
  return { materials: materialsOrOptions || {} };
}

export function computePlantCellGeometryMetrics(THREE, root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const partIds = new Set();
  const depthPlanes = new Set();
  let meshCount = 0;
  let namedMeshCount = 0;
  let triangles = 0;
  let vertexCount = 0;
  const position = new THREE.Vector3();

  root.traverse((node) => {
    if (node.userData?.semanticId) partIds.add(node.userData.semanticId);
    if (!node.isMesh) return;
    meshCount += 1;
    if (node.name) namedMeshCount += 1;
    const count = node.geometry?.getAttribute("position")?.count || 0;
    const instances = node.isInstancedMesh ? node.count : 1;
    vertexCount += count * instances;
    triangles += ((node.geometry?.index?.count || count) / 3) * instances;
    const attribute = node.geometry?.getAttribute("position");
    if (!attribute) return;
    for (let index = 0; index < attribute.count; index += 1) {
      position.fromBufferAttribute(attribute, index).applyMatrix4(node.matrixWorld);
      depthPlanes.add(Math.round(position.z * 1000));
    }
  });

  return Object.freeze({
    meshCount,
    namedMeshCount,
    semanticPartCount: partIds.size,
    triangles: Math.round(triangles),
    vertexCount,
    distinctDepthPlanes: depthPlanes.size,
    bounds: Object.freeze({ width: Number(size.x.toFixed(4)), height: Number(size.y.toFixed(4)), depth: Number(size.z.toFixed(4)) }),
  });
}

export function auditPlantCellGeometry(THREE, root) {
  const metrics = computePlantCellGeometryMetrics(THREE, root);
  const required = PLANT_CELL_GEOMETRY_CONTRACT.semanticParts;
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
  const missingSemanticParts = required.filter((id) => !present.has(id));
  const failures = [];
  if (metrics.bounds.depth < 1.8) failures.push("collapsed-depth");
  if (metrics.distinctDepthPlanes < 20) failures.push("insufficient-cross-section-variation");
  if (metrics.meshCount !== metrics.namedMeshCount) failures.push("unnamed-meshes");
  if (nonFiniteVertices > 0) failures.push("non-finite-vertices");
  if (missingSemanticParts.length) failures.push("missing-semantic-parts");
  return Object.freeze({
    passed: failures.length === 0,
    failures: Object.freeze(failures),
    missingSemanticParts: Object.freeze(missingSemanticParts),
    nonFiniteVertices,
    metrics,
  });
}

export function createPlantCellGeometry(THREE, materialsOrOptions = {}, maybeOptions) {
  if (!THREE?.Group || !THREE?.ExtrudeGeometry || !THREE?.Mesh) {
    throw new TypeError("createPlantCellGeometry requires a compatible THREE namespace.");
  }
  const options = normalizeOptions(materialsOrOptions, maybeOptions);
  const detailLevel = options.detailLevel || DEFAULT_DETAIL;
  const detail = DETAIL_PRESETS[detailLevel];
  if (!detail) throw new RangeError(`Unknown plant-cell detail level: ${detailLevel}`);
  const materialSet = materialResolver(THREE, options.materials);
  const materials = materialSet.resolve;
  const root = setSemanticNode(new THREE.Group(), "plant-cell", "root");
  const nodes = { "plant-cell": root };

  createCellEnvelope(THREE, root, nodes, materials("cellWall"), detail, {
    id: "cell-wall",
    outer: { width: 4.8, height: 3.7, radius: 0.52 },
    inner: { width: 4.18, height: 3.08, radius: 0.34 },
    depth: 2.16,
    backThickness: 0.2,
  });
  createCellEnvelope(THREE, root, nodes, materials("cellMembrane"), detail, {
    id: "cell-membrane",
    outer: { width: 4.18, height: 3.08, radius: 0.34 },
    inner: { width: 4.02, height: 2.92, radius: 0.29 },
    depth: 1.96,
    backThickness: 0.08,
  });

  const interior = setSemanticNode(new THREE.Group(), "cell-interior", "assembly");
  root.add(interior);
  nodes[interior.name] = interior;
  const cytoplasm = addEllipsoid(THREE, interior, "cytoplasm", [2.0, 1.44, 0.88], [0, 0, -0.05], materials("cytoplasm"), detail);
  cytoplasm.userData.collider = { type: "ellipsoid", radii: [2.0, 1.44, 0.88], trigger: true };
  nodes.cytoplasm = cytoplasm;
  const vacuole = addEllipsoid(THREE, interior, "central-vacuole", [1.22, 1.02, 0.61], [-0.38, -0.08, -0.08], materials("vacuole"), detail);
  vacuole.userData.collider = { type: "ellipsoid", radii: [1.22, 1.02, 0.61] };
  const tonoplast = addEllipsoid(THREE, vacuole, "tonoplast", [1.245, 1.045, 0.635], [0, 0, 0], materials("tonoplast"), detail);
  tonoplast.userData.explodeWithParent = true;
  nodes["central-vacuole"] = vacuole;
  nodes.tonoplast = tonoplast;

  createNucleus(THREE, interior, nodes, materials, detail);
  createChloroplasts(THREE, interior, nodes, materials, detail);
  createMitochondria(THREE, interior, nodes, materials, detail);
  createGolgi(THREE, interior, nodes, materials, detail);
  createEndoplasmicReticulum(THREE, interior, nodes, materials, detail);
  createRibosomes(THREE, interior, nodes, materials, detail);
  createPeroxisome(THREE, interior, nodes, materials, detail);
  createPlasmodesmata(THREE, root, nodes, materials);
  const anchors = createAnchors(THREE, root);

  root.userData.crossSection = { ...PLANT_CELL_GEOMETRY_CONTRACT.crossSection, open: true };
  root.userData.sculptRuntime = {
    schemaVersion: 1,
    nodes,
    sockets: anchors,
    destructionGroups: {
      envelope: ["cell-wall", "cell-membrane"],
      interior: ["central-vacuole", "nucleus", "nuclear-envelope", "chloroplasts", "mitochondria", "golgi-apparatus", "endoplasmic-reticulum", "ribosomes", "peroxisome"],
      communication: ["plasmodesmata"],
    },
  };
  root.userData.geometryMetrics = computePlantCellGeometryMetrics(THREE, root);

  const dispose = () => {
    const geometries = new Set();
    root.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materialSet.owned.forEach((material) => material.dispose());
  };

  return Object.freeze({ root, nodes, anchors, metrics: root.userData.geometryMetrics, dispose });
}
