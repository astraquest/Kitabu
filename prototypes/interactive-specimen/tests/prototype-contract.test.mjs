import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as THREE from "three";

import { createButterflyModel } from "../src/butterfly-model.js";
import { HOTSPOTS, createHotspots } from "../src/hotspots.js";
import {
  validateHotspots,
  validateMobileDocumentMarkup,
  validateModelApi,
  validateStaticFallbackMarkup,
} from "./contract-validators.mjs";

const prototypeUrl = new URL("../", import.meta.url);

async function readPrototypeFile(relativePath) {
  return readFile(new URL(relativePath, prototypeUrl), "utf8");
}

test("production hotspot metadata satisfies the shared schema", () => {
  assert.deepEqual(validateHotspots(HOTSPOTS), []);
});

test("production hotspot ids are stable and unique", () => {
  const ids = HOTSPOTS.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 6, "the specimen proof should expose its major anatomy");
});

test("production hotspot layer supports selection, visibility, and disposal", () => {
  const modelRoot = new THREE.Group();
  let selected = null;
  const layer = createHotspots(THREE, modelRoot, (hotspot) => {
    selected = hotspot;
  });

  assert.equal(layer.root.isObject3D, true);
  assert.equal(layer.targets.length, HOTSPOTS.length);
  assert.equal(layer.select(HOTSPOTS[0].id), HOTSPOTS[0]);
  assert.equal(selected, HOTSPOTS[0]);

  layer.setVisible(false);
  assert.equal(layer.root.visible, false);

  modelRoot.add(layer.root);
  layer.dispose();
  assert.equal(layer.root.parent, null);
});

test("production butterfly exposes four independent wing pivots", () => {
  const model = createButterflyModel(THREE);
  const pivots = model.root.userData.sculptRuntime?.pivots;

  assert.deepEqual(validateModelApi(model), []);
  assert.deepEqual(Object.keys(pivots).sort(), [
    "leftFore",
    "leftHind",
    "rightFore",
    "rightHind",
  ]);
  assert.equal(new Set(Object.values(pivots)).size, 4);
  assert.ok(Object.values(pivots).every((pivot) => pivot.isObject3D));

  model.dispose();
});

test("production butterfly gates wing motion and reset restores rest angles", () => {
  const model = createButterflyModel(THREE);
  const pivots = model.root.userData.sculptRuntime.pivots;
  const snapshot = () => ({
    leftFore: pivots.leftFore.rotation.z,
    leftHind: pivots.leftHind.rotation.z,
    rightFore: pivots.rightFore.rotation.z,
    rightHind: pivots.rightHind.rotation.z,
  });
  const rest = snapshot();

  model.update(0.05, 1.25, false);
  assert.deepEqual(snapshot(), rest, "disabled motion must preserve the rest pose");

  model.update(0.05, 1.25, true);
  const animated = snapshot();
  assert.notDeepEqual(animated, rest, "enabled motion must advance the wing pose");
  assert.equal(animated.leftFore, -animated.rightFore);
  assert.equal(animated.leftHind, -animated.rightHind);
  assert.notEqual(animated.rightFore, animated.rightHind);

  model.reset();
  assert.deepEqual(snapshot(), rest, "reset must restore all four rest angles");
  model.dispose();
});

test("production butterfly dispose releases owned geometries and materials", () => {
  const model = createButterflyModel(THREE);
  const geometries = new Set();
  const materials = new Set();

  model.root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => materials.add(material));
    } else if (object.material) {
      materials.add(object.material);
    }
  });

  let disposedGeometries = 0;
  let disposedMaterials = 0;
  geometries.forEach((geometry) => {
    geometry.addEventListener("dispose", () => {
      disposedGeometries += 1;
    });
  });
  materials.forEach((material) => {
    material.addEventListener("dispose", () => {
      disposedMaterials += 1;
    });
  });

  model.dispose();
  assert.equal(disposedGeometries, geometries.size);
  assert.equal(disposedMaterials, materials.size);
});

test("shell reads the nested anchor and the authored hotspot copy", async () => {
  const source = await readPrototypeFile("src/main.js");

  assert.match(
    source,
    /record\?\.anchor\?\.position|record\.anchor\.position/,
    "screen hotspots must use the schema's anchor.position vector",
  );
  assert.match(
    source,
    /record\?\.(?:detail|summary)/,
    "the detail panel must render authored summary or detail copy",
  );
});

test("pause and reduced-motion state reach the model update contract", async () => {
  const source = await readPrototypeFile("src/main.js");

  assert.match(source, /matchMedia\(["']\(prefers-reduced-motion:\s*reduce\)["']\)/);
  assert.match(source, /motionEnabled\s*=\s*!prefersReducedMotion/);
  assert.match(
    source,
    /specimen\?\.update\?\.\(delta,\s*elapsed,\s*motionEnabled\)/,
    "each model update must receive the current motion-enabled state",
  );
});

test("mobile document exposes an accessible viewer without redundant control buttons", async () => {
  const markup = await readPrototypeFile("index.html");

  assert.deepEqual(validateMobileDocumentMarkup(markup), []);
  assert.match(markup, /id=["']specimen-canvas["'][^>]*aria-label=/);
  assert.doesNotMatch(markup, /id=["']motion-toggle["']/);
  assert.doesNotMatch(markup, /id=["']reset-view["']/);
  assert.match(markup, /id=["']view-status["'][^>]*role=["']status["']/);
  assert.match(markup, /id=["']loading-state["'][^>]*role=["']status["']/);
  assert.match(markup, /id=["']detail-panel["'][^>]*aria-hidden=/);
  assert.match(markup, /id=["']panel-close["'][^>]*aria-label=/);
});

test("document contains an accessible static specimen fallback", async () => {
  const markup = await readPrototypeFile("index.html");
  const source = await readPrototypeFile("src/main.js");

  assert.match(markup, /id=["']specimen-fallback["']/);
  assert.match(markup, /id=["']fallback-annotations["'][^>]*aria-labelledby=/);
  assert.match(markup, /id=["']fallback-annotation-list["']/);
  assert.deepEqual(validateStaticFallbackMarkup(markup), []);
  assert.match(source, /renderFallbackAnnotations\(hotspotRecords\)/);
  assert.match(source, /fallbackAnnotations\.hidden\s*=\s*false/);
});

test("styles include reduced-motion and mobile-size interaction contracts", async () => {
  const css = await readPrototypeFile("styles.css");

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(
    css,
    /--touch-target:\s*44px|min-(?:height|width):\s*44px/,
    "mobile controls must provide at least a 44px touch target",
  );
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /(?:100svh|100dvh)/);
});
