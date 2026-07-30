import assert from "node:assert/strict";
import test from "node:test";

import {
  HOTSPOTS,
  VIEW_BEHAVIORS,
  getHotspot,
  resolveViewState,
} from "../src/hotspots.js";
import {
  ACTIVITY_DEFINITIONS,
  getActivityDefinition,
  validateActivityDefinitions,
} from "../src/activity-definitions.js";

const REQUIRED_PART_IDS = [
  "cell-wall", "cell-membrane", "cytoplasm", "nucleus", "nucleolus", "nuclear-envelope",
  "central-vacuole", "tonoplast", "chloroplasts", "grana", "mitochondria", "cristae",
  "endoplasmic-reticulum", "golgi-apparatus", "ribosomes", "peroxisome", "plasmodesmata",
];

test("plant-cell hotspots expose every required stable semantic part", () => {
  assert.deepEqual(HOTSPOTS.map(({ id }) => id), REQUIRED_PART_IDS);
  assert.equal(new Set(HOTSPOTS.map(({ semanticId }) => semanticId)).size, HOTSPOTS.length);
  for (const hotspot of HOTSPOTS) {
    assert.match(hotspot.summary, /^(I am|We are) /);
    assert.ok(hotspot.summary.length <= 100, `${hotspot.id} summary should remain concise for TTS`);
    assert.equal(hotspot.anchor.position.length, 3);
    assert.equal(hotspot.interaction.explodeVector.length, 3);
  }
});

test("substructures retain scientifically useful parent context", () => {
  assert.equal(getHotspot("nucleolus").parentId, "nucleus");
  assert.equal(getHotspot("nuclear-envelope").parentId, "nucleus");
  assert.equal(getHotspot("tonoplast").parentId, "central-vacuole");
  assert.equal(getHotspot("grana").parentId, "chloroplasts");
  assert.equal(getHotspot("cristae").parentId, "mitochondria");
});

test("isolate view is deterministic and keeps parent context", () => {
  const first = resolveViewState({ behaviorId: "isolate", selectedHotspotId: "grana" });
  const second = resolveViewState({ behaviorId: "isolate", selectedHotspotId: "grana" });
  assert.deepEqual(first, second);
  assert.equal(first.parts.find(({ hotspotId }) => hotspotId === "grana").opacity, 1);
  assert.equal(first.parts.find(({ hotspotId }) => hotspotId === "chloroplasts").visible, true);
  assert.equal(first.parts.find(({ hotspotId }) => hotspotId === "nucleus").visible, false);
});

test("explode amount clamps and scales stable part vectors", () => {
  const full = resolveViewState({ behaviorId: "explode", amount: 4 });
  const half = resolveViewState({ behaviorId: "explode", amount: 0.5 });
  assert.equal(full.amount, 1);
  const fullWall = full.parts.find(({ hotspotId }) => hotspotId === "cell-wall").explodeOffset;
  const halfWall = half.parts.find(({ hotspotId }) => hotspotId === "cell-wall").explodeOffset;
  assert.deepEqual(halfWall, fullWall.map((value) => value * 0.5));
});

test("cross-section marks outer layers without hiding internal parts", () => {
  const state = resolveViewState({ behaviorId: "cross-section" });
  for (const id of ["cell-wall", "cell-membrane", "cytoplasm"]) {
    const part = state.parts.find(({ hotspotId }) => hotspotId === id);
    assert.equal(part.sectioned, true);
    assert.ok(part.opacity < 1);
  }
  assert.ok(state.parts.filter(({ sectioned }) => !sectioned).every(({ visible }) => visible));
});

test("reduced motion preserves final state and removes transition time", () => {
  for (const behaviorId of Object.keys(VIEW_BEHAVIORS)) {
    const animated = resolveViewState({ behaviorId, selectedHotspotId: "nucleus" });
    const reduced = resolveViewState({ behaviorId, selectedHotspotId: "nucleus", prefersReducedMotion: true });
    assert.deepEqual(reduced.parts, animated.parts);
    assert.equal(reduced.transitionMs, 0);
  }
});

test("activity definitions are valid and cover all learning views", () => {
  assert.deepEqual(validateActivityDefinitions(), { ok: true, issues: [] });
  assert.deepEqual(new Set(ACTIVITY_DEFINITIONS.map(({ viewBehaviorId }) => viewBehaviorId)), new Set(Object.keys(VIEW_BEHAVIORS)));
  assert.equal(getActivityDefinition("identify-nucleus").mode, "identify-hotspot");
  assert.equal(getActivityDefinition("missing"), null);
});
