export const SCULPT_MODULE_ID = "articulated-wings";

const PI = Math.PI;

function shapeFromPoints(THREE, points) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    shape.lineTo(points[index][0], points[index][1]);
  }
  shape.closePath();
  return shape;
}

function wingGeometry(THREE, points, thickness = 0.025) {
  const geometry = new THREE.ExtrudeGeometry(shapeFromPoints(THREE, points), {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.006,
    curveSegments: 16,
    steps: 1,
  });
  geometry.rotateX(PI / 2);
  geometry.translate(0, thickness / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function flatGeometry(THREE, points) {
  const geometry = new THREE.ShapeGeometry(shapeFromPoints(THREE, points), 16);
  geometry.rotateX(PI / 2);
  return geometry;
}

function mirrored(points, side) {
  return points.map(([x, z]) => [x * side, z]);
}

function makeMaterial(THREE, options) {
  return new THREE.MeshPhysicalMaterial({
    metalness: 0,
    side: THREE.DoubleSide,
    ...options,
  });
}

function addEllipse(THREE, parent, material, side, x, z, radiusX, radiusZ, y = 0.031) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), material);
  mesh.name = "wing-scale-spot";
  mesh.rotation.x = PI / 2;
  mesh.position.set(x * side, y, z);
  mesh.scale.set(radiusX, radiusZ, 1);
  mesh.renderOrder = 4;
  parent.add(mesh);
  return mesh;
}

function addVein(THREE, parent, material, side, points, name) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z, y = 0.037]) => new THREE.Vector3(x * side, y, z)),
    false,
    "centripetal",
  );
  const vein = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.009, 4, false), material);
  vein.name = name;
  vein.renderOrder = 5;
  parent.add(vein);
  return vein;
}

function createWing(THREE, config, materials) {
  const { side, kind, socket, outline, orangeField, spots, veins, discalSpots = [] } = config;
  const pivot = new THREE.Group();
  pivot.name = `${side > 0 ? "right" : "left"}-${kind}-pivot`;
  pivot.position.set(socket[0] * side, socket[1], socket[2]);
  pivot.userData.sculptPart = {
    id: pivot.name,
    contactType: "hinge",
    parentSocket: `${kind}-thoracic-socket`,
    gapTolerance: 0.025,
    overlap: 0.09,
  };

  const darkMembrane = new THREE.Mesh(wingGeometry(THREE, mirrored(outline, side)), materials.wingDark);
  darkMembrane.name = `${pivot.name}-membrane`;
  darkMembrane.castShadow = true;
  darkMembrane.receiveShadow = true;
  darkMembrane.userData.observed = "dorsal silhouette and dark margin";
  pivot.add(darkMembrane);

  const orange = new THREE.Mesh(flatGeometry(THREE, mirrored(orangeField, side)), materials.wingOrange);
  orange.name = `${pivot.name}-orange-field`;
  orange.position.y = 0.029;
  orange.renderOrder = 3;
  orange.userData.observed = "dorsal orange scale field";
  pivot.add(orange);

  for (const [x, z, rx, rz] of spots) {
    addEllipse(THREE, pivot, materials.wingCream, side, x, z, rx, rz);
  }
  for (const [x, z, rx, rz] of discalSpots) {
    addEllipse(THREE, pivot, materials.wingDark, side, x, z, rx, rz, 0.035);
  }
  for (let index = 0; index < veins.length; index += 1) {
    addVein(THREE, pivot, materials.wingVein, side, veins[index], `${pivot.name}-vein-${index + 1}`);
  }

  const socketMarker = new THREE.Object3D();
  socketMarker.name = `${pivot.name}-socket`;
  socketMarker.userData.sculptSocket = true;
  pivot.add(socketMarker);
  return pivot;
}

function tubeBetween(THREE, points, radius, material, name) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
    false,
    "centripetal",
  );
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, radius, 6, false), material);
  mesh.name = name;
  mesh.castShadow = true;
  return mesh;
}

function ellipsoid(THREE, radii, material, name, position) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  mesh.name = name;
  mesh.scale.set(...radii);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addDorsalDot(THREE, parent, material, x, z, scale = 0.035) {
  const dot = ellipsoid(THREE, [scale, 0.012, scale], material, "body-dorsal-white-spot", [x, 0.19, z]);
  dot.renderOrder = 3;
  parent.add(dot);
}

function createBody(THREE, materials) {
  const body = new THREE.Group();
  body.name = "body-anatomy";

  const thorax = ellipsoid(THREE, [0.22, 0.19, 0.42], materials.bodyChitin, "thorax", [0, 0.03, 0.31]);
  thorax.userData.observed = "dark dorsal thoracic mass";
  body.add(thorax);

  const head = ellipsoid(THREE, [0.17, 0.15, 0.17], materials.bodyChitin, "head", [0, 0.03, 0.84]);
  head.userData.observed = "dark head with pale dorsal spotting";
  body.add(head);

  const eyeMaterial = materials.eye;
  for (const side of [-1, 1]) {
    const eye = ellipsoid(THREE, [0.085, 0.09, 0.095], eyeMaterial, `${side > 0 ? "right" : "left"}-compound-eye`, [0.105 * side, 0.055, 0.89]);
    body.add(eye);
  }

  const abdomen = new THREE.Group();
  abdomen.name = "abdomen";
  abdomen.userData.observed = "narrow segmented abdomen tapering posteriorly";
  const segmentCount = 8;
  for (let index = 0; index < segmentCount; index += 1) {
    const t = index / (segmentCount - 1);
    const radius = 0.14 - t * 0.055;
    const segment = ellipsoid(
      THREE,
      [radius, radius * 0.78, 0.135],
      index % 2 ? materials.abdomenWarm : materials.bodyChitin,
      `abdomen-segment-${index + 1}`,
      [0, -0.015, -0.12 - index * 0.185],
    );
    abdomen.add(segment);
  }
  body.add(abdomen);

  addDorsalDot(THREE, body, materials.wingCream, -0.075, 0.78, 0.035);
  addDorsalDot(THREE, body, materials.wingCream, 0.075, 0.78, 0.035);
  addDorsalDot(THREE, body, materials.wingCream, -0.09, 0.42, 0.04);
  addDorsalDot(THREE, body, materials.wingCream, 0.09, 0.42, 0.04);

  const antennae = new THREE.Group();
  antennae.name = "antennae";
  for (const side of [-1, 1]) {
    const antenna = tubeBetween(
      THREE,
      [
        [0.075 * side, 0.02, 0.94],
        [0.22 * side, 0.015, 1.22],
        [0.53 * side, 0.02, 1.62],
        [0.72 * side, 0.025, 1.88],
      ],
      0.012,
      materials.appendage,
      `${side > 0 ? "right" : "left"}-antenna`,
    );
    antenna.userData.approximate = true;
    antenna.userData.reason = "single dorsal view does not reveal antenna depth";
    antennae.add(antenna);
    antennae.add(ellipsoid(THREE, [0.027, 0.022, 0.065], materials.appendage, "antenna-club", [0.72 * side, 0.025, 1.88]));
  }
  body.add(antennae);

  const legs = new THREE.Group();
  legs.name = "legs";
  const legPairs = [
    { z: 0.55, reach: 0.36, rear: 0.25, reduced: true },
    { z: 0.28, reach: 0.67, rear: -0.05, reduced: false },
    { z: 0.03, reach: 0.82, rear: -0.5, reduced: false },
  ];
  for (let pair = 0; pair < legPairs.length; pair += 1) {
    const spec = legPairs[pair];
    for (const side of [-1, 1]) {
      const leg = tubeBetween(
        THREE,
        [
          [0.12 * side, -0.09, spec.z],
          [spec.reach * 0.56 * side, -0.2, spec.z - 0.08],
          [spec.reach * side, -0.26, spec.rear],
        ],
        spec.reduced ? 0.018 : 0.022,
        materials.appendage,
        `${side > 0 ? "right" : "left"}-leg-${pair + 1}${spec.reduced ? "-reduced-foreleg" : ""}`,
      );
      leg.userData.approximate = true;
      leg.userData.reason = "leg roots and ventral depth are occluded in the dorsal reference";
      legs.add(leg);
    }
  }
  body.add(legs);

  const proboscis = tubeBetween(
    THREE,
    [
      [0, -0.1, 0.97],
      [0.06, -0.15, 1.09],
      [0.02, -0.16, 1.19],
      [-0.065, -0.15, 1.14],
      [-0.045, -0.14, 1.06],
    ],
    0.012,
    materials.appendage,
    "proboscis",
  );
  proboscis.userData.approximate = true;
  proboscis.userData.reason = "proboscis coil is not clearly resolved in the dorsal reference";
  body.add(proboscis);

  return body;
}

function createMaterials(THREE) {
  return {
    wingDark: makeMaterial(THREE, { color: 0x21150f, roughness: 0.74, clearcoat: 0.08, clearcoatRoughness: 0.7 }),
    wingOrange: makeMaterial(THREE, { color: 0xe8790b, roughness: 0.68, clearcoat: 0.06, clearcoatRoughness: 0.82 }),
    wingCream: makeMaterial(THREE, { color: 0xf2e9d2, roughness: 0.82 }),
    wingVein: makeMaterial(THREE, { color: 0x382116, roughness: 0.78, transparent: true, opacity: 0.82 }),
    bodyChitin: makeMaterial(THREE, { color: 0x17130f, roughness: 0.58, clearcoat: 0.16, clearcoatRoughness: 0.64 }),
    abdomenWarm: makeMaterial(THREE, { color: 0x493022, roughness: 0.74 }),
    appendage: makeMaterial(THREE, { color: 0x26171b, roughness: 0.7 }),
    eye: makeMaterial(THREE, { color: 0x090807, roughness: 0.28, clearcoat: 0.65, clearcoatRoughness: 0.22 }),
  };
}

const FOREWING_OUTLINE = [
  [-0.08, -0.05], [0.34, 0.34], [1.28, 0.86], [2.05, 0.93], [2.38, 0.71],
  [2.48, 0.32], [2.28, -0.1], [1.72, -0.38], [0.88, -0.36], [0.2, -0.16],
];
const FOREWING_ORANGE = [
  [0.0, -0.03], [0.36, 0.26], [1.12, 0.64], [1.5, 0.58], [1.9, 0.3],
  [2.05, -0.01], [1.64, -0.25], [0.88, -0.27], [0.23, -0.13],
];
const HINDWING_OUTLINE = [
  [-0.08, 0.08], [0.38, 0.08], [1.16, -0.1], [1.7, -0.43], [1.94, -0.88],
  [1.77, -1.28], [1.24, -1.53], [0.67, -1.42], [0.27, -1.08], [0.02, -0.35],
];
const HINDWING_ORANGE = [
  [0.03, 0.04], [0.38, 0.02], [1.08, -0.15], [1.55, -0.48], [1.72, -0.86],
  [1.53, -1.14], [1.12, -1.32], [0.68, -1.24], [0.36, -0.98], [0.12, -0.35],
];

const FOREWING_SPOTS = [
  [1.27, 0.68, 0.17, 0.075], [1.58, 0.7, 0.15, 0.075], [1.91, 0.7, 0.115, 0.07],
  [2.14, 0.51, 0.075, 0.06], [2.25, 0.25, 0.052, 0.045], [1.95, 0.19, 0.075, 0.055],
];
const HINDWING_SPOTS = [
  [1.73, -0.59, 0.07, 0.055], [1.79, -0.84, 0.065, 0.052], [1.62, -1.11, 0.07, 0.055],
  [1.32, -1.31, 0.075, 0.055], [0.98, -1.36, 0.07, 0.05], [0.66, -1.28, 0.06, 0.048],
];
const FOREWING_VEINS = [
  [[0.04, -0.03], [0.68, 0.24], [1.35, 0.58], [2.08, 0.76]],
  [[0.03, -0.04], [0.72, 0.11], [1.48, 0.22], [2.28, 0.28]],
  [[0.03, -0.05], [0.62, -0.06], [1.35, -0.14], [2.14, -0.12]],
  [[0.25, 0.12], [0.84, 0.4], [1.45, 0.53]],
];
const HINDWING_VEINS = [
  [[0.02, 0.02], [0.56, -0.22], [1.2, -0.44], [1.73, -0.56]],
  [[0.03, 0], [0.52, -0.42], [1.05, -0.85], [1.53, -1.15]],
  [[0.02, -0.02], [0.34, -0.55], [0.7, -1.08], [0.95, -1.36]],
  [[0.02, -0.05], [0.24, -0.65], [0.42, -1.15]],
];

export function createButterflyModel(THREE) {
  const root = new THREE.Group();
  root.name = "african-monarch-butterfly";

  // Maps model-local axes (+X right wing, +Y dorsal, +Z head) to the default viewer.
  const presentationBasis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
  );
  root.setRotationFromMatrix(presentationBasis);
  root.scale.setScalar(0.9);

  const materials = createMaterials(THREE);
  const specimen = new THREE.Group();
  specimen.name = "model-coordinate-frame";
  root.add(specimen);

  const body = createBody(THREE, materials);
  specimen.add(body);

  const wings = {};
  for (const side of [-1, 1]) {
    const sideName = side > 0 ? "right" : "left";
    wings[`${sideName}Fore`] = createWing(THREE, {
      side,
      kind: "forewing",
      socket: [0.145, 0.005, 0.43],
      outline: FOREWING_OUTLINE,
      orangeField: FOREWING_ORANGE,
      spots: FOREWING_SPOTS,
      veins: FOREWING_VEINS,
    }, materials);
    wings[`${sideName}Hind`] = createWing(THREE, {
      side,
      kind: "hindwing",
      socket: [0.14, -0.008, 0.12],
      outline: HINDWING_OUTLINE,
      orangeField: HINDWING_ORANGE,
      spots: HINDWING_SPOTS,
      veins: HINDWING_VEINS,
      discalSpots: [
        [1.05, -0.52, 0.065, 0.05],
        [0.72, -0.72, 0.05, 0.04],
        [1.24, -0.82, 0.052, 0.042],
      ],
    }, materials);
    specimen.add(wings[`${sideName}Fore`], wings[`${sideName}Hind`]);
  }

  const restFore = 0.035;
  const restHind = 0.018;
  let foreAngle = restFore;
  let hindAngle = restHind;

  function applyWingAngles() {
    wings.rightFore.rotation.z = foreAngle;
    wings.leftFore.rotation.z = -foreAngle;
    wings.rightHind.rotation.z = hindAngle;
    wings.leftHind.rotation.z = -hindAngle;
  }
  applyWingAngles();

  root.userData.sculptRuntime = {
    assetId: "african-monarch-butterfly",
    fidelity: "reference-fidelity",
    coordinateFrame: { rightWing: "+X", dorsal: "+Y", head: "+Z" },
    approximateSystems: ["ventral-color", "membrane-thickness", "leg-depth", "proboscis-coil"],
    pivots: wings,
    sockets: {
      leftForewing: wings.leftFore,
      rightForewing: wings.rightFore,
      leftHindwing: wings.leftHind,
      rightHindwing: wings.rightHind,
    },
  };

  function update(delta, elapsed, motionEnabled) {
    const safeDelta = Math.min(Math.max(delta || 0, 0), 0.05);
    const response = 1 - Math.exp(-safeDelta * 7);
    const foreTarget = motionEnabled ? restFore + Math.sin(elapsed * 2.05) * 0.15 : restFore;
    const hindTarget = motionEnabled ? restHind + Math.sin(elapsed * 2.05 - 0.2) * 0.115 : restHind;
    foreAngle += (foreTarget - foreAngle) * response;
    hindAngle += (hindTarget - hindAngle) * response;
    body.position.y = motionEnabled ? Math.sin(elapsed * 2.05 - 0.1) * 0.015 : body.position.y * (1 - response);
    applyWingAngles();
  }

  function reset() {
    foreAngle = restFore;
    hindAngle = restHind;
    body.position.y = 0;
    applyWingAngles();
  }

  function dispose() {
    const geometries = new Set();
    const disposableMaterials = new Set();
    root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (Array.isArray(object.material)) object.material.forEach((material) => disposableMaterials.add(material));
      else if (object.material) disposableMaterials.add(object.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    disposableMaterials.forEach((material) => material.dispose());
  }

  return { root, update, reset, dispose };
}

export default createButterflyModel;
