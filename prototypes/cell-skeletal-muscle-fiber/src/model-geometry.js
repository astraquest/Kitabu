import * as THREE from 'three';

/** Stable semantic layer identifiers shared with learning and UI modules. */
export const MUSCLE_FIBER_LAYERS = Object.freeze({
  SARCOLEMMA: 'layer.sarcolemma',
  SARCOPLASM: 'layer.sarcoplasm',
  MYOFIBRILS: 'layer.myofibrils',
  SARCOMERES: 'layer.sarcomeres',
  NUCLEI: 'layer.nuclei',
  MITOCHONDRIA: 'layer.mitochondria',
  SARCOPLASMIC_RETICULUM: 'layer.sarcoplasmic-reticulum',
  T_TUBULES: 'layer.t-tubules',
  CAPILLARY: 'layer.capillary',
  CROSS_SECTION: 'layer.cross-section',
});

export const MUSCLE_FIBER_MODES = Object.freeze({
  LONGITUDINAL: 'longitudinal',
  CROSS_SECTION: 'cross-section',
  COMBINED: 'combined',
});

const LAYER_IDS = Object.freeze(Object.values(MUSCLE_FIBER_LAYERS));
const VALID_MODES = new Set(Object.values(MUSCLE_FIBER_MODES));

const DEFAULTS = Object.freeze({
  length: 10,
  radius: 2.15,
  radialSegments: 40,
  lengthSegments: 4,
  myofibrilSegments: 18,
  cutawayFraction: 0.26,
  quality: 'quality',
});

const PALETTE = Object.freeze({
  sarcolemma: 0xe8799a,
  sarcoplasm: 0xd68aa4,
  myofibril: 0xf3bd78,
  aBand: 0xa95a63,
  iBand: 0xe9a9b5,
  zDisc: 0x7e354d,
  nucleus: 0x7954a8,
  mitochondrion: 0xd96a36,
  reticulum: 0x69a9c7,
  tTubule: 0xd9d567,
  capillary: 0xc84255,
  redBloodCell: 0xa71f32,
  crossSection: 0xf0a9b8,
});

function material(overrides) {
  return new THREE.MeshStandardMaterial({
    roughness: 0.64,
    metalness: 0,
    side: THREE.DoubleSide,
    ...overrides,
  });
}

function createDefaultMaterials() {
  return {
    sarcolemma: material({
      color: PALETTE.sarcolemma,
      roughness: 0.42,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
    sarcoplasm: material({
      color: PALETTE.sarcoplasm,
      roughness: 0.7,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    myofibril: material({ color: PALETTE.myofibril, roughness: 0.58 }),
    aBand: material({ color: PALETTE.aBand, roughness: 0.52 }),
    iBand: material({ color: PALETTE.iBand, roughness: 0.58 }),
    zDisc: material({ color: PALETTE.zDisc, roughness: 0.48 }),
    nucleus: material({ color: PALETTE.nucleus, roughness: 0.38 }),
    mitochondrion: material({ color: PALETTE.mitochondrion, roughness: 0.44 }),
    reticulum: material({ color: PALETTE.reticulum, roughness: 0.4 }),
    tTubule: material({ color: PALETTE.tTubule, roughness: 0.46 }),
    capillary: material({ color: PALETTE.capillary, roughness: 0.34, transparent: true, opacity: 0.58 }),
    redBloodCell: material({ color: PALETTE.redBloodCell, roughness: 0.46 }),
    crossSection: material({ color: PALETTE.crossSection, roughness: 0.62 }),
  };
}

function tag(object, semanticId, layerId, options = {}) {
  object.name = semanticId;
  object.userData.semanticId = semanticId;
  object.userData.layerId = layerId;
  if (options.explodeWithParent) object.userData.explodeWithParent = true;
  if (options.sectionRole) object.userData.sectionRole = options.sectionRole;
  return object;
}

function makeLayer(parent, layerId, label) {
  const group = tag(new THREE.Group(), layerId, layerId);
  group.userData.label = label;
  parent.add(group);
  return group;
}

function makeCylinder(radius, length, radialSegments, materialValue) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    radialSegments,
    1,
    false,
  );
  geometry.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geometry, materialValue);
}

function makePartialCylinder(radius, length, radialSegments, thetaStart, thetaLength, materialValue) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    radialSegments,
    1,
    true,
    thetaStart,
    thetaLength,
  );
  geometry.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geometry, materialValue);
}

function makeEndDisc(radius, radialSegments, x, materialValue) {
  const geometry = new THREE.CircleGeometry(radius, radialSegments);
  geometry.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, materialValue);
  mesh.position.x = x;
  return mesh;
}

function myofibrilLayout(radius) {
  const result = [{ y: 0, z: 0 }];
  for (const [ringRadius, count, offset] of [
    [radius * 0.31, 6, 0],
    [radius * 0.61, 12, Math.PI / 12],
  ]) {
    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * Math.PI * 2;
      result.push({ y: Math.cos(angle) * ringRadius, z: Math.sin(angle) * ringRadius });
    }
  }
  return result;
}

function addSarcomereBands(layer, layout, dimensions, materials) {
  const bandCount = dimensions.myofibrilSegments * layout.length;
  const zDiscGeometry = new THREE.CylinderGeometry(
    dimensions.myofibrilRadius * 1.08,
    dimensions.myofibrilRadius * 1.08,
    0.035,
    10,
  );
  zDiscGeometry.rotateZ(Math.PI / 2);
  const aBandGeometry = new THREE.CylinderGeometry(
    dimensions.myofibrilRadius * 1.025,
    dimensions.myofibrilRadius * 1.025,
    dimensions.sarcomereLength * 0.43,
    10,
  );
  aBandGeometry.rotateZ(Math.PI / 2);
  const iBandGeometry = new THREE.CylinderGeometry(
    dimensions.myofibrilRadius * 1.045,
    dimensions.myofibrilRadius * 1.045,
    dimensions.sarcomereLength * 0.22,
    10,
  );
  iBandGeometry.rotateZ(Math.PI / 2);

  const zDiscs = tag(
    new THREE.InstancedMesh(zDiscGeometry, materials.zDisc, bandCount),
    'sarcomere.z-discs',
    MUSCLE_FIBER_LAYERS.SARCOMERES,
    { explodeWithParent: true, sectionRole: 'longitudinal' },
  );
  const aBands = tag(
    new THREE.InstancedMesh(aBandGeometry, materials.aBand, bandCount),
    'sarcomere.a-bands',
    MUSCLE_FIBER_LAYERS.SARCOMERES,
    { explodeWithParent: true, sectionRole: 'longitudinal' },
  );
  const iBands = tag(
    new THREE.InstancedMesh(iBandGeometry, materials.iBand, bandCount),
    'sarcomere.i-bands',
    MUSCLE_FIBER_LAYERS.SARCOMERES,
    { explodeWithParent: true, sectionRole: 'longitudinal' },
  );
  const matrix = new THREE.Matrix4();
  const restInstances = [];
  let instance = 0;
  for (const point of layout) {
    for (let band = 0; band < dimensions.myofibrilSegments; band += 1) {
      const x = -dimensions.length / 2 + (band + 0.5) * dimensions.sarcomereLength;
      matrix.makeTranslation(x, point.y, point.z);
      zDiscs.setMatrixAt(instance, matrix);
      matrix.makeTranslation(x + dimensions.sarcomereLength * 0.23, point.y, point.z);
      aBands.setMatrixAt(instance, matrix);
      matrix.makeTranslation(x - dimensions.sarcomereLength * 0.18, point.y, point.z);
      iBands.setMatrixAt(instance, matrix);
      restInstances.push({
        zDiscX: x,
        aBandX: x + dimensions.sarcomereLength * 0.23,
        iBandX: x - dimensions.sarcomereLength * 0.18,
        y: point.y,
        z: point.z,
      });
      instance += 1;
    }
  }
  zDiscs.instanceMatrix.needsUpdate = true;
  aBands.instanceMatrix.needsUpdate = true;
  iBands.instanceMatrix.needsUpdate = true;
  zDiscs.userData.restInstances = restInstances;
  aBands.userData.restInstances = restInstances;
  iBands.userData.restInstances = restInstances;
  layer.add(zDiscs, aBands, iBands);
}

function addCapillary(layer, dimensions, materials) {
  const points = [];
  for (let index = 0; index <= 32; index += 1) {
    const t = index / 32;
    points.push(new THREE.Vector3(
      -dimensions.length * 0.48 + t * dimensions.length * 0.96,
      dimensions.radius * 1.12 + Math.sin(t * Math.PI * 3) * 0.08,
      -dimensions.radius * 0.36 + Math.cos(t * Math.PI * 2) * 0.06,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const vessel = tag(
    new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.15, 9, false), materials.capillary),
    'capillary.external',
    MUSCLE_FIBER_LAYERS.CAPILLARY,
    { sectionRole: 'longitudinal' },
  );
  layer.add(vessel);

  const redCellGeometry = new THREE.TorusGeometry(0.085, 0.035, 6, 12);
  for (let index = 0; index < 6; index += 1) {
    const redCell = tag(
      new THREE.Mesh(redCellGeometry, materials.redBloodCell),
      `red-blood-cell.${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.CAPILLARY,
      { explodeWithParent: true, sectionRole: 'longitudinal' },
    );
    redCell.position.copy(curve.getPoint((index + 0.5) / 6));
    redCell.rotation.y = Math.PI / 2;
    layer.add(redCell);
  }
}

function createReticulumCurve(length, y, z, phase) {
  const points = [];
  const turns = 8;
  const count = 72;
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const angle = phase + t * turns * Math.PI * 2;
    points.push(new THREE.Vector3(
      -length / 2 + t * length,
      y + Math.cos(angle) * 0.12,
      z + Math.sin(angle) * 0.12,
    ));
  }
  return new THREE.CatmullRomCurve3(points);
}

function addSockets(root, length, radius) {
  const sockets = {};
  for (const [id, position] of [
    ['socket.fiber-origin', [0, 0, 0]],
    ['socket.cross-section', [length / 2, 0, 0]],
    ['socket.longitudinal-focus', [0, radius * 0.55, radius * 0.25]],
  ]) {
    const socket = tag(new THREE.Object3D(), id, null);
    socket.position.set(...position);
    root.add(socket);
    sockets[id] = socket;
  }
  return sockets;
}

/**
 * Build a complete, volumetric skeletal-muscle fibre cutaway.
 *
 * The fibre axis is local +X. Dimensions are intentionally schematic rather than
 * histological scale so that all learning structures remain legible on mobile.
 */
export function createMuscleFiberGeometry(options = {}) {
  const config = { ...DEFAULTS, ...options };
  if (!(config.length > 0) || !(config.radius > 0)) {
    throw new RangeError('length and radius must be positive numbers');
  }
  const radialSegments = config.quality === 'mobile'
    ? Math.min(config.radialSegments, 24)
    : config.radialSegments;
  const defaultMaterials = createDefaultMaterials();
  const supplied = options.materials ?? {};
  const materials = {
    ...defaultMaterials,
    ...supplied,
    aBand: supplied.aBand ?? supplied['a-band'] ?? defaultMaterials.aBand,
    iBand: supplied.iBand ?? supplied['i-band'] ?? defaultMaterials.iBand,
    zDisc: supplied.zDisc ?? supplied['z-disc'] ?? defaultMaterials.zDisc,
    nucleus: supplied.nucleus ?? supplied.myonucleus ?? defaultMaterials.nucleus,
    reticulum: supplied.reticulum ?? supplied.sarcoplasmicReticulum ?? supplied['sarcoplasmic-reticulum'] ?? defaultMaterials.reticulum,
    tTubule: supplied.tTubule ?? supplied['t-tubule'] ?? defaultMaterials.tTubule,
    capillary: supplied.capillary ?? defaultMaterials.capillary,
    redBloodCell: supplied.redBloodCell ?? supplied['red-blood-cell'] ?? defaultMaterials.redBloodCell,
  };
  const ownedMaterials = Object.values(defaultMaterials).filter((value) => Object.values(materials).includes(value));
  for (const value of Object.values(defaultMaterials)) {
    if (!ownedMaterials.includes(value)) value.dispose();
  }
  const root = tag(new THREE.Group(), 'skeletal-muscle-fiber', null);
  const anatomy = tag(new THREE.Group(), 'skeletal-muscle-fiber.anatomy', null);
  root.add(anatomy);

  const layers = {};
  const layerDefinitions = [
    [MUSCLE_FIBER_LAYERS.SARCOLEMMA, 'Sarcolemma'],
    [MUSCLE_FIBER_LAYERS.SARCOPLASM, 'Sarcoplasm'],
    [MUSCLE_FIBER_LAYERS.MYOFIBRILS, 'Myofibrils'],
    [MUSCLE_FIBER_LAYERS.SARCOMERES, 'Sarcomeres'],
    [MUSCLE_FIBER_LAYERS.NUCLEI, 'Peripheral nuclei'],
    [MUSCLE_FIBER_LAYERS.MITOCHONDRIA, 'Mitochondria'],
    [MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM, 'Sarcoplasmic reticulum'],
    [MUSCLE_FIBER_LAYERS.T_TUBULES, 'T-tubules'],
    [MUSCLE_FIBER_LAYERS.CAPILLARY, 'Capillary'],
    [MUSCLE_FIBER_LAYERS.CROSS_SECTION, 'Cross-section'],
  ];
  for (const [id, label] of layerDefinitions) layers[id] = makeLayer(anatomy, id, label);

  const cutawayAngle = Math.PI * 2 * config.cutawayFraction;
  const visibleAngle = Math.PI * 2 - cutawayAngle;
  const thetaStart = cutawayAngle * 0.5;
  const sarcolemma = tag(
    makePartialCylinder(config.radius, config.length, radialSegments, thetaStart, visibleAngle, materials.sarcolemma),
    'sarcolemma.outer-membrane',
    MUSCLE_FIBER_LAYERS.SARCOLEMMA,
    { sectionRole: 'longitudinal' },
  );
  layers[MUSCLE_FIBER_LAYERS.SARCOLEMMA].add(sarcolemma);

  const sarcoplasm = tag(
    makePartialCylinder(config.radius * 0.965, config.length * 0.985, radialSegments, thetaStart, visibleAngle, materials.sarcoplasm),
    'sarcoplasm.volume',
    MUSCLE_FIBER_LAYERS.SARCOPLASM,
    { sectionRole: 'longitudinal' },
  );
  layers[MUSCLE_FIBER_LAYERS.SARCOPLASM].add(sarcoplasm);

  const layout = myofibrilLayout(config.radius);
  const myofibrilRadius = config.radius * 0.12;
  layout.forEach((point, index) => {
    const id = `myofibril.${String(index + 1).padStart(2, '0')}`;
    const pivot = tag(new THREE.Group(), id, MUSCLE_FIBER_LAYERS.MYOFIBRILS);
    pivot.position.set(0, point.y, point.z);
    const shaft = tag(
      makeCylinder(myofibrilRadius, config.length * 0.96, 12, materials.myofibril),
      `${id}.shaft`,
      MUSCLE_FIBER_LAYERS.MYOFIBRILS,
      { explodeWithParent: true, sectionRole: 'longitudinal' },
    );
    pivot.add(shaft);
    layers[MUSCLE_FIBER_LAYERS.MYOFIBRILS].add(pivot);

    const face = tag(
      makeEndDisc(myofibrilRadius, 12, config.length * 0.482 + 0.008, materials.myofibril),
      `${id}.cross-section`,
      MUSCLE_FIBER_LAYERS.CROSS_SECTION,
      { explodeWithParent: true, sectionRole: 'cross-section' },
    );
    face.position.y = point.y;
    face.position.z = point.z;
    layers[MUSCLE_FIBER_LAYERS.CROSS_SECTION].add(face);
  });

  const sarcomereLength = config.length * 0.96 / config.myofibrilSegments;
  addSarcomereBands(layers[MUSCLE_FIBER_LAYERS.SARCOMERES], layout, {
    length: config.length * 0.96,
    myofibrilRadius,
    myofibrilSegments: config.myofibrilSegments,
    sarcomereLength,
  }, materials);

  const fiberFace = tag(
    makeEndDisc(config.radius * 0.99, radialSegments, config.length * 0.478, materials.crossSection),
    'fiber.cross-section-face',
    MUSCLE_FIBER_LAYERS.CROSS_SECTION,
    { sectionRole: 'cross-section' },
  );
  fiberFace.renderOrder = -2;
  layers[MUSCLE_FIBER_LAYERS.CROSS_SECTION].add(fiberFace);

  const nucleusGeometry = new THREE.SphereGeometry(0.34, 16, 10);
  for (let index = 0; index < 5; index += 1) {
    const angle = 0.7 + index * 1.15;
    const nucleus = tag(
      new THREE.Mesh(nucleusGeometry, materials.nucleus),
      `nucleus.${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.NUCLEI,
      { sectionRole: 'longitudinal' },
    );
    nucleus.position.set(-config.length * 0.38 + index * config.length * 0.19, Math.cos(angle) * config.radius * 0.88, Math.sin(angle) * config.radius * 0.88);
    nucleus.scale.set(1.8, 0.62, 0.42);
    layers[MUSCLE_FIBER_LAYERS.NUCLEI].add(nucleus);
  }

  const mitochondrionGeometry = new THREE.CapsuleGeometry(0.12, 0.34, 5, 10);
  mitochondrionGeometry.rotateZ(Math.PI / 2);
  for (let index = 0; index < 12; index += 1) {
    const angle = index * 2.399963;
    const mitochondrion = tag(
      new THREE.Mesh(mitochondrionGeometry, materials.mitochondrion),
      `mitochondrion.${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.MITOCHONDRIA,
      { sectionRole: 'longitudinal' },
    );
    mitochondrion.position.set(
      -config.length * 0.42 + (index / 11) * config.length * 0.84,
      Math.cos(angle) * config.radius * 0.72,
      Math.sin(angle) * config.radius * 0.72,
    );
    mitochondrion.rotation.x = angle * 0.25;
    layers[MUSCLE_FIBER_LAYERS.MITOCHONDRIA].add(mitochondrion);
  }

  for (const [index, layoutIndex] of [0, 3, 7, 11].entries()) {
    const point = layout[layoutIndex];
    const curve = createReticulumCurve(config.length * 0.88, point.y, point.z, index * 0.9);
    const reticulum = tag(
      new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.035, 6, false), materials.reticulum),
      `sarcoplasmic-reticulum.network-${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM,
      { sectionRole: 'longitudinal' },
    );
    layers[MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM].add(reticulum);
  }

  const tTubuleCount = 6;
  for (let index = 0; index < tTubuleCount; index += 1) {
    const triad = tag(
      new THREE.Group(),
      `triad.${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.T_TUBULES,
      { sectionRole: 'longitudinal' },
    );
    triad.position.x = -config.length * 0.36 + index * (config.length * 0.72 / (tTubuleCount - 1));
    const tube = tag(
      new THREE.Mesh(new THREE.TorusGeometry(config.radius * 0.72, 0.055, 7, radialSegments), materials.tTubule),
      `t-tubule.${String(index + 1).padStart(2, '0')}`,
      MUSCLE_FIBER_LAYERS.T_TUBULES,
      { sectionRole: 'longitudinal' },
    );
    tube.rotation.y = Math.PI / 2;
    triad.add(tube);
    for (const side of [-1, 1]) {
      const cisterna = tag(
        new THREE.Mesh(new THREE.TorusGeometry(config.radius * 0.66, 0.075, 7, radialSegments), materials.reticulum),
        `terminal-cisterna.${String(index + 1).padStart(2, '0')}.${side < 0 ? 'left' : 'right'}`,
        MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM,
        { explodeWithParent: true, sectionRole: 'longitudinal' },
      );
      cisterna.rotation.y = Math.PI / 2;
      cisterna.position.x = triad.position.x + side * 0.105;
      layers[MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM].add(cisterna);
    }
    layers[MUSCLE_FIBER_LAYERS.T_TUBULES].add(triad);
  }

  addCapillary(layers[MUSCLE_FIBER_LAYERS.CAPILLARY], config, materials);

  const sockets = addSockets(root, config.length, config.radius);
  const nodes = {};
  root.traverse((object) => {
    if (object.userData.semanticId) nodes[object.userData.semanticId] = object;
    if (object.isMesh || object.isInstancedMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  Object.assign(nodes, {
    sarcolemma: nodes['sarcolemma.outer-membrane'],
    sarcoplasm: nodes['sarcoplasm.volume'],
    myofibril: nodes['myofibril.01'],
    sarcomere: nodes['sarcomere.a-bands'],
    'z-disc': nodes['sarcomere.z-discs'],
    'a-band': nodes['sarcomere.a-bands'],
    'i-band': nodes['sarcomere.i-bands'],
    myonucleus: nodes['nucleus.01'],
    nucleus: nodes['nucleus.01'],
    mitochondrion: nodes['mitochondrion.01'],
    'sarcoplasmic-reticulum': nodes['sarcoplasmic-reticulum.network-01'],
    'terminal-cisterna': nodes['terminal-cisterna.01.left'],
    't-tubule': nodes['t-tubule.01'],
    triad: nodes['triad.01'],
    capillary: nodes['capillary.external'],
  });

  root.userData.sculptRuntime = {
    schemaVersion: 1,
    assetType: 'skeletal-muscle-fiber',
    framework: { name: 'img2threejs', version: '1.4.1' },
    nodes,
    layers,
    sockets,
    destructionGroups: {
      membrane: [MUSCLE_FIBER_LAYERS.SARCOLEMMA],
      contractileApparatus: [MUSCLE_FIBER_LAYERS.MYOFIBRILS, MUSCLE_FIBER_LAYERS.SARCOMERES],
      membraneSystems: [MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM, MUSCLE_FIBER_LAYERS.T_TUBULES],
      organelles: [MUSCLE_FIBER_LAYERS.NUCLEI, MUSCLE_FIBER_LAYERS.MITOCHONDRIA],
    },
    collider: { type: 'cylinder', axis: 'x', radius: config.radius, length: config.length },
    state: { mode: MUSCLE_FIBER_MODES.COMBINED, explode: 0, contraction: 0 },
    dimensions: { length: config.length, radius: config.radius, sarcomereRestLength: sarcomereLength },
    layerIds: [...LAYER_IDS],
    materialOwnership: ownedMaterials,
  };

  for (const layer of Object.values(layers)) {
    layer.userData.restPosition = layer.position.toArray();
  }
  setMuscleFiberMode(root, options.mode ?? MUSCLE_FIBER_MODES.COMBINED);
  return root;
}

function runtimeOf(root) {
  const runtime = root?.userData?.sculptRuntime;
  if (!runtime || runtime.assetType !== 'skeletal-muscle-fiber') {
    throw new TypeError('Expected a skeletal muscle fiber root created by createMuscleFiberGeometry');
  }
  return runtime;
}

export function setMuscleFiberMode(root, mode) {
  if (!VALID_MODES.has(mode)) throw new RangeError(`Unknown muscle fiber mode: ${mode}`);
  const runtime = runtimeOf(root);
  root.traverse((object) => {
    const role = object.userData.sectionRole;
    if (!role) return;
    object.visible = mode === MUSCLE_FIBER_MODES.COMBINED || role === mode;
  });
  runtime.state.mode = mode;
  return root;
}

export function setMuscleFiberLayerVisibility(root, layerId, visible) {
  const runtime = runtimeOf(root);
  const layer = runtime.layers[layerId];
  if (!layer) throw new RangeError(`Unknown muscle fiber layer: ${layerId}`);
  layer.visible = Boolean(visible);
  return root;
}

export function setMuscleFiberExplode(root, amount) {
  const runtime = runtimeOf(root);
  const value = THREE.MathUtils.clamp(Number(amount) || 0, 0, 1);
  const directions = {
    [MUSCLE_FIBER_LAYERS.SARCOLEMMA]: [0, 1, 0],
    [MUSCLE_FIBER_LAYERS.SARCOPLASM]: [0, 0.45, 0.45],
    [MUSCLE_FIBER_LAYERS.MYOFIBRILS]: [0, 0, -1],
    [MUSCLE_FIBER_LAYERS.SARCOMERES]: [0, -0.3, -1],
    [MUSCLE_FIBER_LAYERS.NUCLEI]: [0, -1, 0.4],
    [MUSCLE_FIBER_LAYERS.MITOCHONDRIA]: [0, -0.7, -0.7],
    [MUSCLE_FIBER_LAYERS.SARCOPLASMIC_RETICULUM]: [0, 0.2, 1],
    [MUSCLE_FIBER_LAYERS.T_TUBULES]: [0, 0.8, 0.7],
    [MUSCLE_FIBER_LAYERS.CAPILLARY]: [0, 1, -0.5],
    [MUSCLE_FIBER_LAYERS.CROSS_SECTION]: [1, 0, 0],
  };
  for (const [layerId, layer] of Object.entries(runtime.layers)) {
    const rest = layer.userData.restPosition;
    const direction = directions[layerId];
    const clearance = runtime.dimensions.radius * 1.15 * value;
    // Scale the original layout about the model centre, then add clearance for centred layers.
    layer.position.set(rest[0], rest[1], rest[2]).multiplyScalar(1 + value * 0.55);
    layer.position.addScaledVector(new THREE.Vector3(...direction).normalize(), clearance);
  }
  runtime.state.explode = value;
  return root;
}

export function updateMuscleFiberContraction(root, phase = 0, intensity = 0) {
  const runtime = runtimeOf(root);
  const safeIntensity = THREE.MathUtils.clamp(Number(intensity) || 0, 0, 1);
  const activation = (0.5 + 0.5 * Math.sin(Number(phase) || 0)) * safeIntensity;
  const axialShift = 1 - activation * 0.08;
  const zDiscs = runtime.nodes['sarcomere.z-discs'];
  const aBands = runtime.nodes['sarcomere.a-bands'];
  const iBands = runtime.nodes['sarcomere.i-bands'];
  const rest = zDiscs.userData.restInstances;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    matrix.makeTranslation(item.zDiscX * axialShift, item.y, item.z);
    zDiscs.setMatrixAt(index, matrix);
    // A-band width is invariant; only its centre follows the shortening sarcomere.
    matrix.makeTranslation(item.aBandX * axialShift, item.y, item.z);
    aBands.setMatrixAt(index, matrix);
    position.set(item.iBandX * axialShift, item.y, item.z);
    scale.set(1 - activation * 0.36, 1, 1);
    matrix.compose(position, rotation, scale);
    iBands.setMatrixAt(index, matrix);
  }
  zDiscs.instanceMatrix.needsUpdate = true;
  aBands.instanceMatrix.needsUpdate = true;
  iBands.instanceMatrix.needsUpdate = true;
  runtime.state.contraction = activation;
  runtime.state.contractionPhase = Number(phase) || 0;
  return root;
}

export function disposeMuscleFiberGeometry(root) {
  const runtime = runtimeOf(root);
  const geometries = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const materialValue of new Set(runtime.materialOwnership)) materialValue?.dispose?.();
}
