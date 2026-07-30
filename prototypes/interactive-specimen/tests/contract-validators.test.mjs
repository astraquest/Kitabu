import assert from "node:assert/strict";
import test from "node:test";

import {
  validateHotspots,
  validateMobileDocumentMarkup,
  validateModelApi,
  validateMotionSnapshot,
  validateStaticFallbackMarkup,
} from "./contract-validators.mjs";

const VALID_HOTSPOTS = [
  {
    id: "forewing",
    label: "Forewing",
    category: "Anatomy",
    summary: "Primary lift and display surface.",
    detail: "The forewing supplies much of the butterfly's aerodynamic area.",
    anchor: {
      position: [0.8, 0.4, 0],
      normal: [0, 1, 0],
      radius: 0.2,
    },
    modelParts: ["leftForewing"],
  },
  {
    id: "antennae",
    label: "Antennae",
    category: "Anatomy",
    summary: "Paired sensory organs.",
    detail: "Clubbed antennae sense airborne chemical and physical cues.",
    anchor: {
      position: { x: 0, y: 1.1, z: 0.1 },
      normal: [0, 1, 0],
      radius: 0.1,
    },
    modelParts: ["leftAntenna", "rightAntenna"],
  },
];

test("hotspot schema accepts complete, finite hotspot records", () => {
  assert.deepEqual(validateHotspots(VALID_HOTSPOTS), []);
});

test("hotspot schema reports missing fields and invalid vectors", () => {
  const errors = validateHotspots([
    {
      ...VALID_HOTSPOTS[0],
      label: "",
      anchor: { ...VALID_HOTSPOTS[0].anchor, position: [0, NaN, 1] },
    },
  ]);

  assert.ok(errors.some((error) => error.includes("label must be")));
  assert.ok(errors.some((error) => error.includes("finite 3D vector")));
});

test("hotspot ids are unique after trimming and case normalization", () => {
  const errors = validateHotspots([
    VALID_HOTSPOTS[0],
    { ...VALID_HOTSPOTS[1], id: " FOREWING " },
  ]);

  assert.ok(errors.some((error) => error.includes("duplicates")));
});

test("model controller exposes the minimum lifecycle and interaction API", () => {
  const api = {
    root: { type: "Group" },
    update() {},
    reset() {},
    dispose() {},
  };

  assert.deepEqual(validateModelApi(api), []);
  assert.deepEqual(validateModelApi({ root: {} }), [
    "model API must implement update()",
  ]);
});

test("reduced motion disables automatic animation", () => {
  assert.deepEqual(
    validateMotionSnapshot({
      paused: false,
      reducedMotion: true,
      autoAnimationActive: false,
      modelMotionEnabled: false,
      renderFrameScheduled: true,
    }),
    [],
  );

  assert.ok(
    validateMotionSnapshot({
      paused: false,
      reducedMotion: true,
      autoAnimationActive: true,
      modelMotionEnabled: false,
      renderFrameScheduled: true,
    }).includes("reduced motion must disable automatic animation"),
  );
});

test("pause freezes model motion while allowing the scene to render", () => {
  assert.deepEqual(
    validateMotionSnapshot({
      paused: true,
      reducedMotion: false,
      autoAnimationActive: false,
      modelMotionEnabled: false,
      renderFrameScheduled: true,
    }),
    [],
  );

  assert.ok(
    validateMotionSnapshot({
      paused: true,
      reducedMotion: false,
      autoAnimationActive: false,
      modelMotionEnabled: true,
      renderFrameScheduled: true,
    }).includes("paused or reduced-motion state must disable model motion"),
  );
});

test("static fallback is visible, described, and keyboard-operable", () => {
  const fallback = `
    <section aria-label="African Monarch specimen fallback">
      <img src="butterfly-fallback.webp" alt="African Monarch butterfly, dorsal view">
      <button type="button">View specimen details</button>
    </section>
  `;

  assert.deepEqual(validateStaticFallbackMarkup(fallback), []);
  assert.ok(
    validateStaticFallbackMarkup("<img src='fallback.webp'><div>Details</div>")
      .length >= 2,
  );
});

test("mobile document includes responsive metadata and landmarks", () => {
  const document = `
    <!doctype html>
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body><main><h1>African Monarch butterfly</h1></main></body></html>
  `;

  assert.deepEqual(validateMobileDocumentMarkup(document), []);
});
