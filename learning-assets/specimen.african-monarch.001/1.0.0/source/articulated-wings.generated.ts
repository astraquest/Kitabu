import * as THREE from 'three';

export type ProceduralModelOptions = {
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureSize?: number;
  textureAnisotropy?: number;
  qualityPriority?: 'reference-fidelity' | 'balanced';
};

export type ProceduralModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  instances: Record<string, THREE.InstancedMesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
  dispose: () => void;
};

export type SculptRuntimeReceipt = {
  artifactType: 'threejs-sculpt-runtime-receipt';
  version: 1;
  factoryId: string;
  factoryExport: 'createSculptModel';
  specSha256: string;
  passId: string;
  rootName: string;
  rootAttachedToScene: boolean;
  rootEffectivelyVisible: boolean;
  componentIds: string[];
  meshComponentIds: string[];
  componentPrimitives: Record<string, string>;
  missingComponentIds: string[];
  missingMeshComponentIds: string[];
  hiddenMeshComponentIds: string[];
  unexpectedGeneratedDescendantMeshes: string[];
  unexpectedVisibleMeshes: string[];
  initialGeometryFingerprint: string[];
  geometryFingerprint: string[];
  geometryChangedComponentIds: string[];
};

export const SCULPT_FACTORY_CONTRACT = {
  artifactType: 'threejs-sculpt-factory-contract',
  version: 1,
  factoryId: "e87fd01b1c8fc4db2866e181f3e5781da6b086dc4a14d0cb61b5a8a727e95614",
  factoryExport: "createSculptModel",
  generatedFunction: "createAfricanMonarchButterflyModel",
  specSha256: "e1297f61be34ad9e17e823cc54c6d253650c010782f843c9c74d748a941eb9b8",
  passId: "blockout",
  expectedComponentIds: ["left-forewing", "left-hindwing", "right-forewing", "right-hindwing", "root"],
  expectedMeshComponentIds: ["left-forewing", "left-hindwing", "right-forewing", "right-hindwing"],
  expectedPrimitives: {"left-forewing": "extrude", "right-forewing": "extrude", "left-hindwing": "extrude", "right-hindwing": "extrude"},
} as const;

const sculptFactoryRoots = new Set<THREE.Group>();
const sculptFactoryInitialGeometry = new Map<THREE.Group, string[]>();
const sculptFactoryGeometryObjects = new Map<THREE.Group, Record<string, THREE.BufferGeometry>>();

function sculptRootScene(root: THREE.Object3D): THREE.Scene | null {
  let cursor: THREE.Object3D | null = root;
  while (cursor) {
    if (cursor instanceof THREE.Scene) return cursor;
    cursor = cursor.parent;
  }
  return null;
}

function sculptObjectVisible(object: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (!cursor.visible) return false;
    cursor = cursor.parent;
  }
  return true;
}

function sculptDescendsFrom(object: THREE.Object3D, root: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor === root) return true;
    cursor = cursor.parent;
  }
  return false;
}

function sculptGeometryFingerprint(
  renderables: Record<string, THREE.Mesh | THREE.InstancedMesh>,
): string[] {
  return Object.entries(renderables)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, mesh]) => {
      const position = mesh.geometry.getAttribute('position');
      const positionArray = position?.array;
      let checksum = 2166136261;
      if (positionArray) {
        for (let index = 0; index < positionArray.length; index += 1) {
          checksum ^= Math.round(Number(positionArray[index]) * 1_000_000);
          checksum = Math.imul(checksum, 16777619);
        }
      }
      return `${id}:${mesh.geometry.type}:${position?.count ?? 0}:${mesh.geometry.index?.count ?? 0}:${checksum >>> 0}`;
    });
}

export function captureSculptRuntimeReceipt(root: THREE.Group): SculptRuntimeReceipt {
  if (!sculptFactoryRoots.has(root)) {
    throw new Error('runtime receipt requires a root created by createSculptModel');
  }
  const runtime = root.userData.sculptRuntime as ProceduralModelRuntime | undefined;
  if (!runtime) throw new Error('generated sculpt root has no runtime inventory');
  const scene = sculptRootScene(root);
  const componentIds = Object.keys(runtime.nodes).filter((id) => id !== '$root').sort();
  const renderables: Record<string, THREE.Mesh | THREE.InstancedMesh> = { ...runtime.meshes, ...runtime.instances };
  const meshComponentIds = Object.keys(renderables).sort();
  const componentPrimitives: Record<string, string> = {};
  const geometryFingerprint = sculptGeometryFingerprint(renderables);
  const initialGeometryFingerprint = sculptFactoryInitialGeometry.get(root) ?? [];
  const initialGeometryObjects = sculptFactoryGeometryObjects.get(root) ?? {};
  const initialFingerprintById = new Map(initialGeometryFingerprint.map((value) => [value.split(':', 1)[0], value]));
  const currentFingerprintById = new Map(geometryFingerprint.map((value) => [value.split(':', 1)[0], value]));
  const geometryChangedComponentIds = meshComponentIds.filter((id) =>
    initialGeometryObjects[id] !== renderables[id]?.geometry
    || initialFingerprintById.get(id) !== currentFingerprintById.get(id)
  );
  for (const [id, mesh] of Object.entries(renderables).sort(([a], [b]) => a.localeCompare(b))) {
    const primitive = mesh.userData.sculptPrimitive;
    if (typeof primitive === 'string') componentPrimitives[id] = primitive;
  }
  const unexpectedVisibleMeshes: string[] = [];
  const unexpectedGeneratedDescendantMeshes: string[] = [];
  const knownRenderables = new Set<THREE.Object3D>(Object.values(renderables));
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && !knownRenderables.has(object) && sculptObjectVisible(object)) {
      unexpectedGeneratedDescendantMeshes.push(object.name || object.uuid);
    }
  });
  scene?.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || sculptDescendsFrom(object, root)) return;
    if (object.userData.reviewOnly === true || object.userData.sculptValidationRole === 'environment') return;
    if (sculptObjectVisible(object)) unexpectedVisibleMeshes.push(object.name || object.uuid);
  });
  return {
    artifactType: 'threejs-sculpt-runtime-receipt',
    version: 1,
    factoryId: SCULPT_FACTORY_CONTRACT.factoryId,
    factoryExport: SCULPT_FACTORY_CONTRACT.factoryExport,
    specSha256: SCULPT_FACTORY_CONTRACT.specSha256,
    passId: SCULPT_FACTORY_CONTRACT.passId,
    rootName: root.name,
    rootAttachedToScene: scene !== null,
    rootEffectivelyVisible: sculptObjectVisible(root),
    componentIds,
    meshComponentIds,
    componentPrimitives,
    missingComponentIds: SCULPT_FACTORY_CONTRACT.expectedComponentIds.filter((id) => !componentIds.includes(id)),
    missingMeshComponentIds: SCULPT_FACTORY_CONTRACT.expectedMeshComponentIds.filter((id) => !meshComponentIds.includes(id)),
    hiddenMeshComponentIds: SCULPT_FACTORY_CONTRACT.expectedMeshComponentIds.filter((id) => {
      const mesh = renderables[id];
      return mesh !== undefined && !sculptObjectVisible(mesh);
    }),
    unexpectedGeneratedDescendantMeshes: unexpectedGeneratedDescendantMeshes.sort(),
    unexpectedVisibleMeshes: unexpectedVisibleMeshes.sort(),
    initialGeometryFingerprint: [...initialGeometryFingerprint],
    geometryFingerprint,
    geometryChangedComponentIds,
  };
}

function installSculptRuntimeCapture(): void {
  type CaptureHost = typeof globalThis & {
    __THREEJS_SCULPT_RUNTIME_FACTORIES__?: Record<string, () => SculptRuntimeReceipt[]>;
    __THREEJS_SCULPT_CAPTURE_RUNTIME__?: () => SculptRuntimeReceipt[];
  };
  const host = globalThis as CaptureHost;
  const registry = host.__THREEJS_SCULPT_RUNTIME_FACTORIES__ ?? {};
  host.__THREEJS_SCULPT_RUNTIME_FACTORIES__ = registry;
  registry[SCULPT_FACTORY_CONTRACT.factoryId] = () =>
    Array.from(sculptFactoryRoots).map((root) => captureSculptRuntimeReceipt(root));
  host.__THREEJS_SCULPT_CAPTURE_RUNTIME__ = () =>
    Object.values(registry).flatMap((capture) => capture());
}

type MaterialLayer = Record<string, unknown>;
type SculptMaterialProfile = 'standard' | 'cloth' | 'fiber' | 'glass' | 'liquid' | 'volume';
type SculptMaterialSpec = Record<string, unknown> & {
  albedo?: MaterialLayer;
  alpha?: unknown;
  alphaHash?: unknown;
  ambientOcclusion?: unknown;
  anisotropy?: unknown;
  anisotropyRotation?: unknown;
  attenuationColor?: unknown;
  attenuationDistance?: unknown;
  baseColor?: unknown;
  bump?: unknown;
  clearcoat?: unknown;
  clearcoatRoughness?: unknown;
  color?: unknown;
  colorVariation?: MaterialLayer;
  depthWrite?: unknown;
  displacement?: unknown;
  dirt?: MaterialLayer;
  dispersion?: unknown;
  doubleSided?: unknown;
  emissive?: unknown;
  emissiveIntensity?: unknown;
  envMapIntensity?: unknown;
  forceSinglePass?: unknown;
  ior?: unknown;
  localOverrides?: unknown;
  materialProfile?: unknown;
  metalness?: unknown;
  normal?: unknown;
  opacity?: unknown;
  referencePbr?: MaterialLayer;
  roughness?: unknown;
  sheen?: unknown;
  sheenColor?: unknown;
  sheenRoughness?: unknown;
  specularColor?: unknown;
  specularIntensity?: unknown;
  surfaceFrequencyBands?: unknown;
  textureProjection?: MaterialLayer;
  textureResolution?: unknown;
  thickness?: unknown;
  transmission?: unknown;
  wear?: MaterialLayer;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readLayerNumber(value: unknown, keys: string[], fallback: number): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === 'number') return record[key] as number;
    }
  }
  return fallback;
}

function readMaterialProfile(value: unknown): SculptMaterialProfile {
  if (value === undefined) return 'standard';
  if (value === 'standard' || value === 'cloth' || value === 'fiber'
      || value === 'glass' || value === 'liquid' || value === 'volume') {
    return value;
  }
  throw new Error(`unsupported materialProfile ${String(value)}`);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((part) => part + part).join('')
    : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 0x8a7a5f;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function materialPalette(spec: SculptMaterialSpec): string[] {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === 'string');
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...(Array.isArray(secondary) ? secondary : [])];
  return colors.filter((value): value is string => typeof value === 'string' && value.startsWith('#'));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothCurve(value: number): number {
  return value * value * (3 - 2 * value);
}

function periodicHash(x: number, y: number, seed: number, periodX: number, periodY: number): number {
  const wrappedX = ((x % periodX) + periodX) % periodX;
  const wrappedY = ((y % periodY) + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

type SurfaceBand = {
  frequency: number;
  amplitude: number;
  stretchX: number;
  stretchY: number;
  ridge: boolean;
};

function surfaceBands(spec: SculptMaterialSpec): SurfaceBand[] {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const band = item as Record<string, unknown>;
    const frequency = typeof band.frequency === 'number' ? band.frequency : 0;
    const amplitude = typeof band.amplitude === 'number' ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? '')} ${String(band.role ?? '')}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === 'number' ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === 'number' ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description),
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false },
  ];
}

function sampleSurface(u: number, v: number, bands: SurfaceBand[], seed: number): number {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}

type LocalMaterialLayer = {
  type: string;
  amount: number;
  color: [number, number, number];
  roughnessDelta: number;
  metalnessDelta: number;
  heightDelta: number;
  pattern: string;
  frequency: number;
  threshold: number;
  contrast: number;
  cavityBias: number;
  edgeBias: number;
  verticalBias: number;
  regional: boolean;
  uvCenter: [number, number];
  uvScale: [number, number];
  feather: number;
  seed: number;
};

function materialLocalLayers(spec: SculptMaterialSpec): LocalMaterialLayer[] {
  const result: LocalMaterialLayer[] = [];
  const append = (source: Record<string, unknown>, fallbackType: string, fallbackPattern: string): void => {
    const type = typeof source.type === 'string' ? source.type : fallbackType;
    if (type === 'material-map-evidence') return;
    const amount = clamp01(readLayerNumber(source.amount, ['base', 'amount'], typeof source.amount === 'number' ? source.amount : 0));
    if (amount <= 0) return;
    const mask = source.mask && typeof source.mask === 'object' ? source.mask as Record<string, unknown> : {};
    const uvCenter = Array.isArray(mask.uvCenter) ? mask.uvCenter : null;
    const uvScale = Array.isArray(mask.uvScale) ? mask.uvScale : null;
    const wet = type === 'wetness';
    const worn = type === 'wear' || type === 'fade';
    const defaultColor = wet ? '#1B2024' : (worn ? '#B8AE9B' : '#302B25');
    const color = hexToRgb(typeof source.color === 'string' ? source.color : defaultColor);
    result.push({
      type,
      amount,
      color,
      roughnessDelta: Math.max(-1, Math.min(1, readLayerNumber(source.roughnessDelta, ['base', 'amount'], wet || worn ? -0.22 : 0.18))),
      metalnessDelta: Math.max(-1, Math.min(1, readLayerNumber(source.metalnessDelta, ['base', 'amount'], 0))),
      heightDelta: Math.max(-0.25, Math.min(0.25, readLayerNumber(source.heightDelta, ['base', 'amount'], worn ? -0.025 : 0.006))),
      pattern: typeof mask.pattern === 'string' ? mask.pattern : fallbackPattern,
      frequency: Math.max(1, readLayerNumber(mask.frequency, ['base', 'amount'], 18)),
      threshold: clamp01(readLayerNumber(mask.threshold, ['base', 'amount'], 0.52)),
      contrast: Math.max(0.1, readLayerNumber(mask.contrast, ['base', 'amount'], 3.2)),
      cavityBias: clamp01(readLayerNumber(mask.cavityBias, ['base', 'amount'], readLayerNumber(source.cavityBias, ['base', 'amount'], fallbackPattern === 'cavity' ? 0.8 : 0))),
      edgeBias: clamp01(readLayerNumber(mask.edgeBias, ['base', 'amount'], fallbackPattern === 'edge' ? 0.8 : 0)),
      verticalBias: Math.max(-1, Math.min(1, readLayerNumber(mask.verticalBias, ['base', 'amount'], 0))),
      regional: Boolean(uvCenter && uvCenter.length === 2 && uvScale && uvScale.length === 2),
      uvCenter: [
        uvCenter && typeof uvCenter[0] === 'number' ? clamp01(uvCenter[0]) : 0.5,
        uvCenter && typeof uvCenter[1] === 'number' ? clamp01(uvCenter[1]) : 0.5,
      ],
      uvScale: [
        uvScale && typeof uvScale[0] === 'number' ? Math.max(0.001, uvScale[0]) : 1,
        uvScale && typeof uvScale[1] === 'number' ? Math.max(0.001, uvScale[1]) : 1,
      ],
      feather: Math.max(0.001, clamp01(readLayerNumber(mask.feather, ['base', 'amount'], 0.25))),
      seed: Math.round(readLayerNumber(mask.seed, ['base', 'amount'], result.length * 4099 + 97)),
    });
  };
  if (spec.dirt && typeof spec.dirt === 'object') append(spec.dirt, 'dirt', 'cavity');
  if (spec.wear && typeof spec.wear === 'object') {
    const edgeWear = readLayerNumber(spec.wear.edgeWear, ['base', 'amount'], 0);
    if (edgeWear > 0) append({ ...spec.wear, amount: edgeWear, type: 'wear' }, 'wear', 'edge');
  }
  if (Array.isArray(spec.localOverrides)) {
    for (const item of spec.localOverrides) {
      if (item && typeof item === 'object') append(item as Record<string, unknown>, 'stain', 'noise');
    }
  }
  if (result.length > 16) throw new Error('material local layer limit exceeded (16)');
  return result;
}

function sampleLocalLayerMask(
  layer: LocalMaterialLayer,
  u: number,
  v: number,
  cavity: number,
  edge: number,
  seed: number,
): number {
  const period = Math.max(1, Math.round(layer.frequency));
  const noise = periodicValueNoise(u, v, seed + layer.seed, period, period);
  let mask = smoothCurve(clamp01((noise - layer.threshold) * layer.contrast + 0.5));
  if (layer.pattern === 'speckle') mask *= mask;
  if (layer.pattern === 'streak') {
    const streak = clamp01(0.5 + Math.sin((u * period + noise * 0.7) * Math.PI * 2) * 0.5);
    mask = smoothCurve(mask * streak);
  }
  if (layer.pattern === 'cavity') mask = Math.max(mask * 0.35, cavity);
  if (layer.pattern === 'edge') mask = Math.max(mask * 0.35, edge);
  const periodicVertical = 0.5 - Math.cos(v * Math.PI * 2) * 0.5;
  if (layer.pattern === 'vertical') mask *= periodicVertical;
  if (layer.cavityBias > 0) mask = THREE.MathUtils.lerp(mask, Math.max(mask, cavity), layer.cavityBias);
  if (layer.edgeBias > 0) mask = THREE.MathUtils.lerp(mask, Math.max(mask, edge), layer.edgeBias);
  if (layer.verticalBias !== 0) {
    const vertical = layer.verticalBias > 0 ? periodicVertical : 1 - periodicVertical;
    mask = THREE.MathUtils.lerp(mask, mask * vertical, Math.abs(layer.verticalBias));
  }
  if (layer.regional) {
    const rawU = Math.abs(u - layer.uvCenter[0]);
    const rawV = Math.abs(v - layer.uvCenter[1]);
    const du = Math.min(rawU, 1 - rawU) / layer.uvScale[0];
    const dv = Math.min(rawV, 1 - rawV) / layer.uvScale[1];
    const distance = Math.sqrt(du * du + dv * dv);
    const regionMask = smoothCurve(clamp01((1 - distance) / layer.feather));
    mask *= regionMask;
  }
  return clamp01(mask);
}

function applyProfileSurface(profile: SculptMaterialProfile, u: number, v: number, base: number): number {
  if (profile === 'cloth') {
    const warp = Math.sin(u * Math.PI * 128);
    const weft = Math.sin(v * Math.PI * 128 + Math.PI * 0.5);
    const weave = clamp01(0.5 + warp * weft * 0.5);
    return clamp01(base * 0.68 + weave * 0.32);
  }
  if (profile === 'fiber') {
    const grain = clamp01(0.5 + Math.sin(v * Math.PI * 192 + u * Math.PI * 7) * 0.5);
    return clamp01(base * 0.74 + grain * 0.26);
  }
  return base;
}

function mixPalette(colors: [number, number, number][], value: number): [number, number, number] {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix)),
  ];
}

function writePixel(data: Uint8ClampedArray, offset: number, red: number, green: number, blue: number, alpha = 255): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createMapTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 2,
    typeof repeat[1] === 'number' ? repeat[1] : 2,
  );
  const requestedAnisotropy = options.textureAnisotropy ?? (typeof projection.anisotropy === 'number' ? projection.anisotropy : 8);
  texture.anisotropy = Math.max(1, Math.round(requestedAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

type ProceduralTextureSet = {
  albedo: THREE.Texture;
  roughness: THREE.Texture;
  metalness?: THREE.Texture;
  height: THREE.Texture;
  normal: THREE.Texture;
  ao: THREE.Texture;
  source: 'reference-pixel-extraction' | 'procedural';
};

function referenceMapUrl(spec: SculptMaterialSpec, channel: string): string | null {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== 'object') return null;
  if (reference.usable !== true || reference.materialCropConfirmed !== true) return null;
  const confidence = typeof reference.extractionSuitability === 'number'
    ? reference.extractionSuitability
    : (typeof reference.confidence === 'number'
      ? reference.confidence
      : (typeof reference.estimatedFidelity === 'number' ? reference.estimatedFidelity : 0));
  const threshold = typeof reference.targetThreshold === 'number' ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== 'object') return null;
  const map = (maps as Record<string, unknown>)[channel];
  if (!map || typeof map !== 'object') return null;
  const record = map as Record<string, unknown>;
  return typeof record.url === 'string' && record.url.trim() ? record.url : null;
}

function createLoadedMapTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 1,
    typeof repeat[1] === 'number' ? repeat[1] : 1,
  );
  const requestedAnisotropy = options.textureAnisotropy ?? (typeof projection.anisotropy === 'number' ? projection.anisotropy : 8);
  texture.anisotropy = Math.max(1, Math.round(requestedAnisotropy));
  texture.needsUpdate = true;
  return texture;
}

function makeReferenceTextureSet(spec: SculptMaterialSpec, options: ProceduralModelOptions): ProceduralTextureSet | null {
  const albedo = referenceMapUrl(spec, 'albedo');
  const roughness = referenceMapUrl(spec, 'roughness');
  const height = referenceMapUrl(spec, 'height');
  const normal = referenceMapUrl(spec, 'normal');
  const ao = referenceMapUrl(spec, 'ao');
  const metalness = referenceMapUrl(spec, 'metalness');
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    metalness: metalness ? createLoadedMapTexture(metalness, THREE.NoColorSpace, spec, options) : undefined,
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: 'reference-pixel-extraction',
  };
}

function makeProceduralTextureSet(
  id: string,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
  profile: SculptMaterialProfile,
): ProceduralTextureSet | null {
  if (typeof document === 'undefined') return null;
  const qualityFirst = true || options.qualityPriority === 'reference-fidelity';
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === 'number' && Number.isFinite(requested)
    ? requested
    : (qualityFirst ? 1024 : 512);
  // Large reference maps are authored offline; runtime procedural fallback stays bounded.
  const minimumRuntimeSize = qualityFirst ? 1024 : 256;
  const size = Math.max(minimumRuntimeSize, Math.min(1024, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    metalness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size),
  };
  const contexts = {
    albedo: canvases.albedo.getContext('2d'),
    roughness: canvases.roughness.getContext('2d'),
    metalness: canvases.metalness.getContext('2d'),
    height: canvases.height.getContext('2d'),
    normal: canvases.normal.getContext('2d'),
    ao: canvases.ao.getContext('2d'),
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.metalness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    metalness: contexts.metalness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size),
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const heightDeltaField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const metalnessField = new Float32Array(size * size);
  const localLayers = materialLocalLayers(spec);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const colors = (palette.length >= 2 ? palette : [fallback, '#6E614B', '#A08F70']).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ['base'], 0.76));
  const baseMetalness = clamp01(readLayerNumber(spec.metalness, ['base'], 0));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ['variation'], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ['amplitude', 'variation'], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ['heightCorrelation'], 0.3));
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = applyProfileSurface(profile, u, v, sampleSurface(u, v, bands, seed + 101));
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      metalnessField[index] = baseMetalness;
      const paletteValue = clamp01(
        0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
      );
      const color = mixPalette(colors, paletteValue);
      let surfaceAlpha = 255;
      if (profile === 'volume') {
        surfaceAlpha = clamp01((height * 0.64 + colorNoise * 0.36 - 0.24) / 0.76)
          * clamp01(Math.min(u, 1 - u, v, 1 - v) * 8) * 255;
      } else if (profile === 'fiber') {
        const lateralFade = Math.pow(clamp01(1 - Math.abs(u * 2 - 1)), 0.45);
        const tipFade = clamp01((1 - v) * 14);
        surfaceAlpha = lateralFade * tipFade * 255;
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2], surfaceAlpha);
    }
  }
  // Apply evidence-backed local layers before deriving normal/AO so all PBR channels agree.
  if (localLayers.length > 0) {
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const u = x / size;
      const index = y * size + x;
      const center = heightField[index];
      const neighbors = [
        heightField[y * size + left], heightField[y * size + right],
        heightField[up + x], heightField[down + x],
      ];
      const neighborAverage = neighbors.reduce((sum, value) => sum + value, 0) * 0.25;
      const cavity = clamp01(Math.max(0, neighborAverage - center) * 18 + (1 - center) * 0.08);
      const edge = clamp01(Math.max(...neighbors.map((value) => Math.abs(value - center))) * 14);
      const offset = index * 4;
      for (let layerIndex = 0; layerIndex < localLayers.length; layerIndex += 1) {
        const layer = localLayers[layerIndex];
        const weight = layer.amount * sampleLocalLayerMask(layer, u, v, cavity, edge, seed + layerIndex * 7919);
        if (weight <= 0) continue;
        images.albedo.data[offset] = THREE.MathUtils.lerp(images.albedo.data[offset], layer.color[0], weight);
        images.albedo.data[offset + 1] = THREE.MathUtils.lerp(images.albedo.data[offset + 1], layer.color[1], weight);
        images.albedo.data[offset + 2] = THREE.MathUtils.lerp(images.albedo.data[offset + 2], layer.color[2], weight);
        roughnessField[index] = clamp01(roughnessField[index] + layer.roughnessDelta * weight);
        metalnessField[index] = clamp01(metalnessField[index] + layer.metalnessDelta * weight);
        heightDeltaField[index] += layer.heightDelta * weight;
      }
    }
  }
  for (let index = 0; index < heightField.length; index += 1) {
    heightField[index] = clamp01(heightField[index] + heightDeltaField[index]);
  }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (
        heightField[y * size + left] + heightField[y * size + right]
        + heightField[up + x] + heightField[down + x]
      ) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      const metalnessByte = metalnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(images.metalness.data, offset, metalnessByte, metalnessByte, metalnessByte);
      writePixel(
        images.normal.data, offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255,
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.metalness.putImageData(images.metalness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    metalness: createMapTexture(canvases.metalness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: 'procedural',
  };
}

function createSculptMaterial(id: string, spec: SculptMaterialSpec, options: ProceduralModelOptions): THREE.MeshPhysicalMaterial {
  const profile = readMaterialProfile(spec.materialProfile);
  const textures = makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options, profile);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : new THREE.Color(typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F'),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ['base'], 0.76)),
    metalness: textures?.metalness ? 1 : clamp01(readLayerNumber(spec.metalness, ['base'], 0.0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ['base', 'amount'], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ['base'], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], 0)),
    opacity: clamp01(readLayerNumber(spec.opacity, ['base', 'amount'], 1)),
    transparent: readLayerNumber(spec.transmission, ['base', 'amount'], 0) > 0 || readLayerNumber(spec.opacity, ['base', 'amount'], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ['cutoff', 'alphaTest'], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (profile === 'cloth') {
    material.sheen = clamp01(readLayerNumber(spec.sheen, ['base', 'amount'], 0.55));
    material.sheenColor.set(typeof spec.sheenColor === 'string' ? spec.sheenColor : '#ffffff');
    material.sheenRoughness = clamp01(readLayerNumber(spec.sheenRoughness, ['base', 'amount'], 0.86));
    material.side = spec.doubleSided === false ? THREE.FrontSide : THREE.DoubleSide;
  }
  if (profile === 'fiber') {
    material.anisotropy = clamp01(readLayerNumber(spec.anisotropy, ['base', 'amount'], 0.72));
    material.anisotropyRotation = readLayerNumber(spec.anisotropyRotation, ['base', 'angle'], 0);
    material.side = spec.doubleSided === false ? THREE.FrontSide : THREE.DoubleSide;
  }
  if (profile === 'glass' || profile === 'liquid') {
    const defaultTransmission = profile === 'glass' ? 0.98 : 0.9;
    const defaultIor = profile === 'glass' ? 1.5 : 1.333;
    const defaultThickness = profile === 'glass' ? 0.1 : 0.5;
    material.transmission = clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], defaultTransmission));
    material.ior = Math.max(1, Math.min(2.333, readLayerNumber(spec.ior, ['base'], defaultIor)));
    material.thickness = Math.max(0, readLayerNumber(spec.thickness, ['base', 'amount'], defaultThickness));
    material.attenuationColor.set(typeof spec.attenuationColor === 'string' ? spec.attenuationColor : '#ffffff');
    material.attenuationDistance = Math.max(0.0001, readLayerNumber(spec.attenuationDistance, ['base'], Number.POSITIVE_INFINITY));
    material.dispersion = Math.max(0, readLayerNumber(spec.dispersion, ['base', 'amount'], 0));
    material.transparent = material.transmission > 0 || material.opacity < 1;
  }
  if (profile === 'volume') {
    material.opacity = clamp01(readLayerNumber(spec.opacity, ['base', 'amount'], 0.72));
    material.alphaHash = typeof spec.alphaHash === 'boolean' ? spec.alphaHash : true;
    material.depthWrite = typeof spec.depthWrite === 'boolean' ? spec.depthWrite : false;
    material.forceSinglePass = typeof spec.forceSinglePass === 'boolean' ? spec.forceSinglePass : true;
    material.side = THREE.DoubleSide;
    material.transparent = material.opacity < 1 && !material.alphaHash;
  } else if (profile === 'fiber') {
    material.alphaHash = typeof spec.alphaHash === 'boolean' ? spec.alphaHash : true;
    material.depthWrite = typeof spec.depthWrite === 'boolean' ? spec.depthWrite : material.depthWrite;
    material.forceSinglePass = typeof spec.forceSinglePass === 'boolean' ? spec.forceSinglePass : true;
    material.transparent = material.opacity < 1 && !material.alphaHash;
  } else if (profile !== 'standard') {
    if (typeof spec.alphaHash === 'boolean') material.alphaHash = spec.alphaHash;
    if (typeof spec.depthWrite === 'boolean') material.depthWrite = spec.depthWrite;
    if (typeof spec.forceSinglePass === 'boolean') material.forceSinglePass = spec.forceSinglePass;
  }
  if (profile !== 'standard') {
    if (typeof spec.emissive === 'string') material.emissive.set(spec.emissive);
    material.emissiveIntensity = Math.max(0, readLayerNumber(spec.emissiveIntensity, ['base', 'amount'], material.emissiveIntensity));
  }
  const defaultSpecularIntensity = profile === 'glass' || profile === 'liquid' ? 1 : 0.5;
  material.specularIntensity = clamp01(readLayerNumber(spec.specularIntensity, ['base', 'amount'], defaultSpecularIntensity));
  material.specularColor.set(typeof spec.specularColor === 'string' ? spec.specularColor : '#ffffff');
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    if (textures.metalness) material.metalnessMap = textures.metalness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35);
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ['amplitude', 'strength'], 0));
    if (bumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = bumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ['amplitude', 'strength'], 0));
    if (displacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = displacementScale;
      material.displacementBias = -displacementScale * 0.5;
    }
  }
  material.envMapIntensity = Math.max(0, readLayerNumber(spec.envMapIntensity, ['base', 'amount'], 0.8));
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrTextureSource = textures?.source ?? 'flat-fallback';
  material.userData.localMaterialLayerCount = materialLocalLayers(spec).length;
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.heightMap = textures?.height ?? null;
  material.userData.materialProfile = profile;
  material.needsUpdate = true;
  return material;
}

function componentSurfaceMaterial(
  base: THREE.Material,
  detail: unknown,
  cache: Record<string, THREE.Material>,
  cacheKey: string,
): THREE.Material {
  if (!(base instanceof THREE.MeshStandardMaterial) || !detail || typeof detail !== 'object') return base;
  const record = detail as Record<string, unknown>;
  const macro = Math.max(0, readLayerNumber(record.macroRoughness, ['base', 'amount', 'value'], 0));
  const micro = Math.max(0, readLayerNumber(record.microRoughness, ['base', 'amount', 'value'], 0));
  const bump = Math.max(0, readLayerNumber(record.bumpAmplitude, ['base', 'amount', 'value'], 0));
  if (macro <= 0 && micro <= 0 && bump <= 0) return base;
  if (cache[cacheKey]) return cache[cacheKey];
  const material = base.clone();
  material.roughness = clamp01(material.roughness + macro * 0.15);
  if (material.normalMap) material.normalScale.multiplyScalar(1 + micro * 0.5);
  const heightMap = base.userData.heightMap;
  if (bump > 0 && heightMap instanceof THREE.Texture) {
    material.bumpMap = heightMap;
    material.bumpScale = Math.max(material.bumpScale, bump);
  }
  material.userData = { ...base.userData, componentSurfaceDetail: detail, materialVariant: cacheKey };
  material.needsUpdate = true;
  cache[cacheKey] = material;
  return material;
}

type AttachmentEndpoint = {
  start: THREE.Vector3;
  midpoint: THREE.Vector3;
  quaternion: THREE.Quaternion;
  length: number;
  baseRadius: number;
  endRadius: number;
};

function readVector3(value: unknown, fallback: [number, number, number]): THREE.Vector3 {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number')) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeAttachmentEndpoint(attachment: unknown): AttachmentEndpoint | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 0.0001) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(0.005, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(0.003, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius,
  };
}


type ExtrudeGeometrySpec = {
  outline: number[][];
  holes: number[][][];
  depth: number;
  steps: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelOffset: number;
  bevelSegments: number;
};

function createExtrudeGeometry(spec: ExtrudeGeometrySpec): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  spec.outline.forEach((point, index) => {
    if (index === 0) shape.moveTo(point[0], point[1]);
    else shape.lineTo(point[0], point[1]);
  });
  shape.closePath();
  for (const contour of spec.holes) {
    const hole = new THREE.Path();
    contour.forEach((point, index) => {
      if (index === 0) hole.moveTo(point[0], point[1]);
      else hole.lineTo(point[0], point[1]);
    });
    hole.closePath();
    shape.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth: spec.depth,
    steps: spec.steps,
    bevelEnabled: spec.bevelEnabled,
    bevelThickness: spec.bevelThickness,
    bevelSize: spec.bevelSize,
    bevelOffset: spec.bevelOffset,
    bevelSegments: spec.bevelSegments,
  });
}

// @generated by threejs-object-sculptor; edit a wrapper file, not this file.
// Generator contract: ObjectSculptSpec 3.1 + hash-bound visual evidence v1.
// Generated from ObjectSculptSpec target: African Monarch Butterfly
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createAfricanMonarchButterflyModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "African Monarch Butterfly";
  root.userData.generatorContract = 'object-sculpt-3.1/evidence-v1';

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["wing-membrane-palette"] = new THREE.MeshStandardMaterial({ color: 0xE8790B, roughness: 0.82, metalness: 0, wireframe: options.wireframe ?? false });

  const nodes: Record<string, THREE.Object3D> = { '$root': root };
  const meshes: Record<string, THREE.Mesh> = {};
  const instances: Record<string, THREE.InstancedMesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};
  const componentMaterialVariants: Record<string, THREE.Material> = {};

  const node_root_0 = new THREE.Group();
  node_root_0.name = "African Monarch Butterfly__pivot";
  node_root_0.position.set(0.0, 0.0, 0.0);
  node_root_0.rotation.set(0.0, 0.0, 0.0);
  node_root_0.scale.set(1.0, 1.0, 1.0);
  node_root_0.userData.sculptComponent = {"id": "root", "name": "African Monarch Butterfly", "componentType": "assembly", "level": "macro", "role": "assembly-root", "importance": 1.0, "confidence": 1.0, "parent": null, "attachment": null, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 1.0}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "visibility": true}, "sockets": [], "collider": null, "breakable": false}, "evidenceRefs": ["full-object"]};
  node_root_0.userData.actionProfile = {"animationRole": "root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 1.0}, "transformChannels": {"translate": true, "rotate": true, "scale": true, "bend": false, "visibility": true}, "sockets": [], "collider": null, "breakable": false};
  (nodes["$root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;

  const node_left_forewing_1 = new THREE.Group();
  node_left_forewing_1.name = "Left forewing__pivot";
  node_left_forewing_1.position.set(-0.145, 0.005, 0.43);
  node_left_forewing_1.rotation.set(1.5707963268, 0.0, 0.0);
  node_left_forewing_1.scale.set(-1.0, 1.0, 1.0);
  node_left_forewing_1.userData.sculptComponent = {"id": "left-forewing", "name": "Left forewing", "componentType": "part", "level": "macro", "role": "articulated wing membrane", "importance": 1, "confidence": 0.96, "primitive": "extrude", "geometryDescriptor": {"parameters": {"shape": [[-0.08, -0.05], [0.34, 0.34], [1.28, 0.86], [2.05, 0.93], [2.38, 0.71], [2.48, 0.32], [2.28, -0.1], [1.72, -0.38], [0.88, -0.36], [0.2, -0.16]], "holes": [], "depth": 0.025, "curveSegments": 16, "bevelEnabled": true, "bevelThickness": 0.006, "bevelSize": 0.012, "bevelSegments": 2}, "topologyIntent": "thin closed wing membrane with observed dorsal outline", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "generated vertex normals"}, "parent": "root", "attachment": {"type": "hinge", "parentId": "root", "parentSocket": "left-forewing-thoracic-socket", "localStart": [-0.145, 0.005, 0.43], "localEnd": [-2.625, 0.005, 0.75], "contactType": "hinge", "overlap": 0.09, "gapTolerance": 0.025, "evidenceRefs": ["full-object"], "contactRule": "membrane root remains embedded beneath thorax throughout flap"}, "dimensions": {"width": 2.48, "height": 0.025, "depth": 1.31, "units": "relative", "confidence": 0.94}, "transform": {"position": [-0.145, 0.005, 0.43], "rotation": [1.5707963268, 0, 0], "scale": [-1, 1, 1]}, "actionProfile": {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["mirror right forewing", "maximum idle flap 0.19 radians"]}, "material": "wing-membrane-palette", "materialLayers": ["wing-membrane-palette"], "deformations": [], "joints": ["left-forewing-thoracic-hinge"], "seams": [], "localFeatures": [{"id": "left-forewing-dorsal-pattern", "type": "decal", "name": "orange black cream dorsal fields", "placement": "dorsal membrane", "size": [2.3, 1.2], "orientation": [0, 0, 0], "materialEffect": "layered palette", "geometryEffect": "shallow render overlay", "confidence": 0.94}], "surfaceDetail": {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "lookdev", "moduleId": "articulated-wings"};
  node_left_forewing_1.userData.actionProfile = {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["mirror right forewing", "maximum idle flap 0.19 radians"]};
  (nodes["root"] ?? root).add(node_left_forewing_1);
  nodes["left-forewing"] = node_left_forewing_1;
  const mesh_left_forewing_1Geometry = createExtrudeGeometry({"outline":[[-0.08,-0.05],[0.34,0.34],[1.28,0.86],[2.05,0.93],[2.38,0.71],[2.48,0.32],[2.28,-0.1],[1.72,-0.38],[0.88,-0.36],[0.2,-0.16]],"holes":[],"depth":0.025,"steps":1,"bevelEnabled":true,"bevelThickness":0.006,"bevelSize":0.012,"bevelOffset":0.0,"bevelSegments":2});
  const material_left_forewing_1 = componentSurfaceMaterial(materialMap["wing-membrane-palette"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 }), {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, componentMaterialVariants, "wing-membrane-palette::0242931f9d33");
  const mesh_left_forewing_1 = new THREE.Mesh(
    mesh_left_forewing_1Geometry,
    material_left_forewing_1
  );
  mesh_left_forewing_1.name = "Left forewing";
  mesh_left_forewing_1.castShadow = true;
  mesh_left_forewing_1.receiveShadow = true;
  mesh_left_forewing_1.userData.sculptComponentId = "left-forewing";
  mesh_left_forewing_1.userData.sculptPrimitive = "extrude";
  mesh_left_forewing_1.userData.blockoutProxy = false;
  node_left_forewing_1.add(mesh_left_forewing_1);
  meshes["left-forewing"] = mesh_left_forewing_1;

  const node_right_forewing_2 = new THREE.Group();
  node_right_forewing_2.name = "Right forewing__pivot";
  node_right_forewing_2.position.set(0.145, 0.005, 0.43);
  node_right_forewing_2.rotation.set(1.5707963268, 0.0, 0.0);
  node_right_forewing_2.scale.set(1.0, 1.0, 1.0);
  node_right_forewing_2.userData.sculptComponent = {"id": "right-forewing", "name": "Right forewing", "componentType": "part", "level": "macro", "role": "articulated wing membrane", "importance": 1, "confidence": 0.96, "primitive": "extrude", "geometryDescriptor": {"parameters": {"shape": [[-0.08, -0.05], [0.34, 0.34], [1.28, 0.86], [2.05, 0.93], [2.38, 0.71], [2.48, 0.32], [2.28, -0.1], [1.72, -0.38], [0.88, -0.36], [0.2, -0.16]], "holes": [], "depth": 0.025, "curveSegments": 16, "bevelEnabled": true, "bevelThickness": 0.006, "bevelSize": 0.012, "bevelSegments": 2}, "topologyIntent": "thin closed wing membrane with observed dorsal outline", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "generated vertex normals"}, "parent": "root", "attachment": {"type": "hinge", "parentId": "root", "parentSocket": "right-forewing-thoracic-socket", "localStart": [0.145, 0.005, 0.43], "localEnd": [2.625, 0.005, 0.75], "contactType": "hinge", "overlap": 0.09, "gapTolerance": 0.025, "evidenceRefs": ["full-object"], "contactRule": "membrane root remains embedded beneath thorax throughout flap"}, "dimensions": {"width": 2.48, "height": 0.025, "depth": 1.31, "units": "relative", "confidence": 0.94}, "transform": {"position": [0.145, 0.005, 0.43], "rotation": [1.5707963268, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["mirror left forewing", "maximum idle flap 0.19 radians"]}, "material": "wing-membrane-palette", "materialLayers": ["wing-membrane-palette"], "deformations": [], "joints": ["right-forewing-thoracic-hinge"], "seams": [], "localFeatures": [{"id": "right-forewing-dorsal-pattern", "type": "decal", "name": "orange black cream dorsal fields", "placement": "dorsal membrane", "size": [2.3, 1.2], "orientation": [0, 0, 0], "materialEffect": "layered palette", "geometryEffect": "shallow render overlay", "confidence": 0.94}], "surfaceDetail": {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "lookdev", "moduleId": "articulated-wings"};
  node_right_forewing_2.userData.actionProfile = {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["mirror left forewing", "maximum idle flap 0.19 radians"]};
  (nodes["root"] ?? root).add(node_right_forewing_2);
  nodes["right-forewing"] = node_right_forewing_2;
  const mesh_right_forewing_2Geometry = createExtrudeGeometry({"outline":[[-0.08,-0.05],[0.34,0.34],[1.28,0.86],[2.05,0.93],[2.38,0.71],[2.48,0.32],[2.28,-0.1],[1.72,-0.38],[0.88,-0.36],[0.2,-0.16]],"holes":[],"depth":0.025,"steps":1,"bevelEnabled":true,"bevelThickness":0.006,"bevelSize":0.012,"bevelOffset":0.0,"bevelSegments":2});
  const material_right_forewing_2 = componentSurfaceMaterial(materialMap["wing-membrane-palette"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 }), {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, componentMaterialVariants, "wing-membrane-palette::0242931f9d33");
  const mesh_right_forewing_2 = new THREE.Mesh(
    mesh_right_forewing_2Geometry,
    material_right_forewing_2
  );
  mesh_right_forewing_2.name = "Right forewing";
  mesh_right_forewing_2.castShadow = true;
  mesh_right_forewing_2.receiveShadow = true;
  mesh_right_forewing_2.userData.sculptComponentId = "right-forewing";
  mesh_right_forewing_2.userData.sculptPrimitive = "extrude";
  mesh_right_forewing_2.userData.blockoutProxy = false;
  node_right_forewing_2.add(mesh_right_forewing_2);
  meshes["right-forewing"] = mesh_right_forewing_2;

  const node_left_hindwing_3 = new THREE.Group();
  node_left_hindwing_3.name = "Left hindwing__pivot";
  node_left_hindwing_3.position.set(-0.14, -0.008, 0.12);
  node_left_hindwing_3.rotation.set(1.5707963268, 0.0, 0.0);
  node_left_hindwing_3.scale.set(-1.0, 1.0, 1.0);
  node_left_hindwing_3.userData.sculptComponent = {"id": "left-hindwing", "name": "Left hindwing", "componentType": "part", "level": "macro", "role": "articulated wing membrane", "importance": 1, "confidence": 0.95, "primitive": "extrude", "geometryDescriptor": {"parameters": {"shape": [[-0.08, 0.08], [0.38, 0.08], [1.16, -0.1], [1.7, -0.43], [1.94, -0.88], [1.77, -1.28], [1.24, -1.53], [0.67, -1.42], [0.27, -1.08], [0.02, -0.35]], "holes": [], "depth": 0.025, "curveSegments": 16, "bevelEnabled": true, "bevelThickness": 0.006, "bevelSize": 0.012, "bevelSegments": 2}, "topologyIntent": "thin closed rounded hindwing membrane", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "generated vertex normals"}, "parent": "root", "attachment": {"type": "hinge", "parentId": "root", "parentSocket": "left-hindwing-thoracic-socket", "localStart": [-0.14, -0.008, 0.12], "localEnd": [-2.08, -0.008, -0.76], "contactType": "hinge", "overlap": 0.09, "gapTolerance": 0.025, "evidenceRefs": ["full-object"], "contactRule": "membrane root remains embedded beneath thorax throughout flap"}, "dimensions": {"width": 1.94, "height": 0.025, "depth": 1.61, "units": "relative", "confidence": 0.93}, "transform": {"position": [-0.14, -0.008, 0.12], "rotation": [1.5707963268, 0, 0], "scale": [-1, 1, 1]}, "actionProfile": {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["phase lag forewing by 0.2 radians", "use 77 percent forewing amplitude"]}, "material": "wing-membrane-palette", "materialLayers": ["wing-membrane-palette"], "deformations": [], "joints": ["left-hindwing-thoracic-hinge"], "seams": [], "localFeatures": [{"id": "left-hindwing-dorsal-pattern", "type": "decal", "name": "orange field black margin cream spots", "placement": "dorsal membrane", "size": [1.8, 1.5], "orientation": [0, 0, 0], "materialEffect": "layered palette", "geometryEffect": "shallow render overlay", "confidence": 0.94}], "surfaceDetail": {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "lookdev", "moduleId": "articulated-wings"};
  node_left_hindwing_3.userData.actionProfile = {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["phase lag forewing by 0.2 radians", "use 77 percent forewing amplitude"]};
  (nodes["root"] ?? root).add(node_left_hindwing_3);
  nodes["left-hindwing"] = node_left_hindwing_3;
  const mesh_left_hindwing_3Geometry = createExtrudeGeometry({"outline":[[-0.08,0.08],[0.38,0.08],[1.16,-0.1],[1.7,-0.43],[1.94,-0.88],[1.77,-1.28],[1.24,-1.53],[0.67,-1.42],[0.27,-1.08],[0.02,-0.35]],"holes":[],"depth":0.025,"steps":1,"bevelEnabled":true,"bevelThickness":0.006,"bevelSize":0.012,"bevelOffset":0.0,"bevelSegments":2});
  const material_left_hindwing_3 = componentSurfaceMaterial(materialMap["wing-membrane-palette"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 }), {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, componentMaterialVariants, "wing-membrane-palette::0242931f9d33");
  const mesh_left_hindwing_3 = new THREE.Mesh(
    mesh_left_hindwing_3Geometry,
    material_left_hindwing_3
  );
  mesh_left_hindwing_3.name = "Left hindwing";
  mesh_left_hindwing_3.castShadow = true;
  mesh_left_hindwing_3.receiveShadow = true;
  mesh_left_hindwing_3.userData.sculptComponentId = "left-hindwing";
  mesh_left_hindwing_3.userData.sculptPrimitive = "extrude";
  mesh_left_hindwing_3.userData.blockoutProxy = false;
  node_left_hindwing_3.add(mesh_left_hindwing_3);
  meshes["left-hindwing"] = mesh_left_hindwing_3;

  const node_right_hindwing_4 = new THREE.Group();
  node_right_hindwing_4.name = "Right hindwing__pivot";
  node_right_hindwing_4.position.set(0.14, -0.008, 0.12);
  node_right_hindwing_4.rotation.set(1.5707963268, 0.0, 0.0);
  node_right_hindwing_4.scale.set(1.0, 1.0, 1.0);
  node_right_hindwing_4.userData.sculptComponent = {"id": "right-hindwing", "name": "Right hindwing", "componentType": "part", "level": "macro", "role": "articulated wing membrane", "importance": 1, "confidence": 0.95, "primitive": "extrude", "geometryDescriptor": {"parameters": {"shape": [[-0.08, 0.08], [0.38, 0.08], [1.16, -0.1], [1.7, -0.43], [1.94, -0.88], [1.77, -1.28], [1.24, -1.53], [0.67, -1.42], [0.27, -1.08], [0.02, -0.35]], "holes": [], "depth": 0.025, "curveSegments": 16, "bevelEnabled": true, "bevelThickness": 0.006, "bevelSize": 0.012, "bevelSegments": 2}, "topologyIntent": "thin closed rounded hindwing membrane", "edgeTreatment": {"type": "none", "bevelRadius": 0, "segments": 1}, "deformationStack": [], "uvStrategy": "generated procedural coordinates", "normalStrategy": "generated vertex normals"}, "parent": "root", "attachment": {"type": "hinge", "parentId": "root", "parentSocket": "right-hindwing-thoracic-socket", "localStart": [0.14, -0.008, 0.12], "localEnd": [2.08, -0.008, -0.76], "contactType": "hinge", "overlap": 0.09, "gapTolerance": 0.025, "evidenceRefs": ["full-object"], "contactRule": "membrane root remains embedded beneath thorax throughout flap"}, "dimensions": {"width": 1.94, "height": 0.025, "depth": 1.61, "units": "relative", "confidence": 0.93}, "transform": {"position": [0.14, -0.008, 0.12], "rotation": [1.5707963268, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["phase lag forewing by 0.2 radians", "use 77 percent forewing amplitude"]}, "material": "wing-membrane-palette", "materialLayers": ["wing-membrane-palette"], "deformations": [], "joints": ["right-hindwing-thoracic-hinge"], "seams": [], "localFeatures": [{"id": "right-hindwing-dorsal-pattern", "type": "decal", "name": "orange field black margin cream spots", "placement": "dorsal membrane", "size": [1.8, 1.5], "orientation": [0, 0, 0], "materialEffect": "layered palette", "geometryEffect": "shallow render overlay", "confidence": 0.94}], "surfaceDetail": {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "lookdev", "moduleId": "articulated-wings"};
  node_right_hindwing_4.userData.actionProfile = {"animationRole": "hinged-wing", "pivot": {"mode": "hinge", "localPosition": [0, 0, 0], "axis": [0, 0, 1], "confidence": 0.94}, "transformChannels": {"translate": false, "rotate": true, "scale": false, "visibility": true}, "sockets": [], "constraints": ["phase lag forewing by 0.2 radians", "use 77 percent forewing amplitude"]};
  (nodes["root"] ?? root).add(node_right_hindwing_4);
  nodes["right-hindwing"] = node_right_hindwing_4;
  const mesh_right_hindwing_4Geometry = createExtrudeGeometry({"outline":[[-0.08,0.08],[0.38,0.08],[1.16,-0.1],[1.7,-0.43],[1.94,-0.88],[1.77,-1.28],[1.24,-1.53],[0.67,-1.42],[0.27,-1.08],[0.02,-0.35]],"holes":[],"depth":0.025,"steps":1,"bevelEnabled":true,"bevelThickness":0.006,"bevelSize":0.012,"bevelOffset":0.0,"bevelSegments":2});
  const material_right_hindwing_4 = componentSurfaceMaterial(materialMap["wing-membrane-palette"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 }), {"macroRoughness": 0.08, "microRoughness": 0.16, "bumpAmplitude": 0.01, "normalPattern": "fine aligned wing scales"}, componentMaterialVariants, "wing-membrane-palette::0242931f9d33");
  const mesh_right_hindwing_4 = new THREE.Mesh(
    mesh_right_hindwing_4Geometry,
    material_right_hindwing_4
  );
  mesh_right_hindwing_4.name = "Right hindwing";
  mesh_right_hindwing_4.castShadow = true;
  mesh_right_hindwing_4.receiveShadow = true;
  mesh_right_hindwing_4.userData.sculptComponentId = "right-hindwing";
  mesh_right_hindwing_4.userData.sculptPrimitive = "extrude";
  mesh_right_hindwing_4.userData.blockoutProxy = false;
  node_right_hindwing_4.add(mesh_right_hindwing_4);
  meshes["right-hindwing"] = mesh_right_hindwing_4;

  const dispose = (): void => {
    sculptFactoryRoots.delete(root);
    sculptFactoryInitialGeometry.delete(root);
    sculptFactoryGeometryObjects.delete(root);
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<THREE.Material>();
    const disposedTextures = new Set<THREE.Texture>();
    const disposeMaterial = (material: THREE.Material): void => {
      if (disposedMaterials.has(material)) return;
      for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
          value.dispose();
          disposedTextures.add(value);
        }
      }
      const heightMap = material.userData.heightMap;
      if (heightMap instanceof THREE.Texture && !disposedTextures.has(heightMap)) {
        heightMap.dispose();
        disposedTextures.add(heightMap);
      }
      material.dispose();
      disposedMaterials.add(material);
    };
    for (const mesh of Object.values(meshes)) {
      if (!disposedGeometries.has(mesh.geometry)) {
        mesh.geometry.dispose();
        disposedGeometries.add(mesh.geometry);
      }
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of meshMaterials) disposeMaterial(material);
    }
    const disposedInstances = new Set<THREE.InstancedMesh>();
    for (const instance of Object.values(instances)) {
      if (disposedInstances.has(instance)) continue;
      instance.dispose();
      disposedInstances.add(instance);
    }
    for (const material of Object.values(materialMap)) disposeMaterial(material);
  };
  root.userData.sculptRuntime = { nodes, meshes, instances, sockets, colliders, destructionGroups, dispose } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"minimumTextureResolution": 1024, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.75, "stopOnLowConfidence": true, "acceptedLimitation": "Single-image maps are inferred material evidence, not photogrammetry."}}, "lightingPass": {"requiredTerms": ["key/fill/environment", "exposure/tone", "contact shadow"]}, "screenshotReview": ["neutral", "grazing", "reference"]};
  root.userData.specializedRegions = [];
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime nodes/instances/sockets for transforms and attachments; call dispose when removing the model.',
  };
  sculptFactoryRoots.add(root);
  sculptFactoryInitialGeometry.set(
    root,
    sculptGeometryFingerprint({ ...meshes, ...instances }),
  );
  sculptFactoryGeometryObjects.set(
    root,
    Object.fromEntries(Object.entries({ ...meshes, ...instances }).map(([id, mesh]) => [id, mesh.geometry])),
  );
  installSculptRuntimeCapture();
  return root;
}

export const createSculptModel = createAfricanMonarchButterflyModel;

export function createAfricanMonarchButterflyLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "African Monarch Butterfly look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === 'reference' ? 0xfff0d6 : 0xf2f4ff,
    0x363b42,
    mode === 'grazing' ? 0.28 : mode === 'reference' ? 0.72 : 0.85,
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === 'reference' ? 0xffcf8a : 0xfff4e8,
    mode === 'grazing' ? 4.2 : mode === 'reference' ? 2.6 : 2.15,
  );
  if (mode === 'grazing') key.position.set(7.5, 1.1, 4.0);
  else if (mode === 'reference') key.position.set(-4.5, 7.5, 5.0);
  else key.position.set(-4.0, 6.0, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  lights.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, mode === 'grazing' ? 0.12 : 0.42);
  fill.position.set(4.0, 3.0, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1c4, mode === 'grazing' ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6.0);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = [];
  lights.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"minimumTextureResolution": 1024, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.75, "stopOnLowConfidence": true, "acceptedLimitation": "Single-image maps are inferred material evidence, not photogrammetry."}}, "lightingPass": {"requiredTerms": ["key/fill/environment", "exposure/tone", "contact shadow"]}, "screenshotReview": ["neutral", "grazing", "reference"]};
  return lights;
}

export function configureAfricanMonarchButterflyLookDevRenderer(
  renderer: THREE.WebGLRenderer,
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
  pixelRatio: number = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
): THREE.WebGLRenderer {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mode === 'grazing' ? 0.9 : mode === 'reference' ? 1.0 : 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.max(1, Math.min(2, pixelRatio)));
  return renderer;
}

export function frameAfricanMonarchButterflyForReview(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  model: THREE.Object3D,
  padding = 1.18,
): void {
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(0.001, size.length() * 0.5);
  const direction = camera.position.clone().sub(center);
  if (direction.lengthSq() <= Number.EPSILON) direction.set(0, 0, 1);
  direction.normalize();
  if (camera instanceof THREE.PerspectiveCamera) {
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distance = radius * padding / Math.max(0.01, Math.tan(halfFov));
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = Math.max(0.001, distance - radius * 2.5);
    camera.far = Math.max(camera.near + 1, distance + radius * 4);
  } else {
    const aspect = Math.max(0.1, (camera.right - camera.left) / Math.max(0.001, camera.top - camera.bottom));
    const halfHeight = radius * padding;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.position.copy(center).addScaledVector(direction, radius * 3);
  }
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

export function createAfricanMonarchButterflyContactShadow(
  model: THREE.Object3D,
  padding = 1.4,
): THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial> {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const groundSize = Math.max(1, size.x, size.z) * padding;
  const material = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.28 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), material);
  ground.name = 'sculpt-lookdev-contact-shadow';
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = bounds.isEmpty() ? 0 : bounds.min.y - Math.max(0.0005, size.y * 0.001);
  ground.receiveShadow = true;
  ground.userData.reviewOnly = true;
  return ground;
}
