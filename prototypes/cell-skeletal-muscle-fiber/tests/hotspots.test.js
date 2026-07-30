import assert from "node:assert/strict";
import test from "node:test";

import { HOTSPOTS, getHotspotById, getHotspotsForMode } from "../src/hotspots.js";

test("hotspot IDs and semantic targets are stable and unique", () => {
  assert.equal(new Set(HOTSPOTS.map(({ id }) => id)).size, HOTSPOTS.length);
  assert.equal(new Set(HOTSPOTS.map(({ semanticId }) => semanticId)).size, HOTSPOTS.length);
  assert.ok(HOTSPOTS.every(({ id }) => /^hotspot\.[a-z0-9-]+$/.test(id)));
});

test("every hotspot has concise first-person narration and a resolvable anchor", () => {
  for (const hotspot of HOTSPOTS) {
    assert.match(hotspot.narration, /\bI\b|\bmy\b/i);
    assert.ok(hotspot.narration.length <= 140, hotspot.id);
    assert.equal(hotspot.anchor.semanticId, hotspot.semanticId);
    assert.equal(hotspot.anchor.nodeId, hotspot.targetNodeId);
    assert.ok(hotspot.targetNodeId.length > 0);
    assert.deepEqual(hotspot.anchor.localOffset.length, 3);
  }
});

test("mode lookup is deterministic, read-only, and rejects unknown modes", () => {
  const crossSection = getHotspotsForMode("cross-section");
  assert.ok(crossSection.some(({ semanticId }) => semanticId === "myofibril"));
  assert.ok(crossSection.some(({ semanticId }) => semanticId === "capillary"));
  assert.ok(Object.isFrozen(crossSection));
  assert.deepEqual(getHotspotsForMode("not-a-mode"), []);
});

test("ID lookup returns the canonical object or null", () => {
  const hotspot = getHotspotById("hotspot.triad");
  assert.equal(hotspot.semanticId, "triad");
  assert.equal(getHotspotById("missing"), null);
});

test("scientific relationship wording preserves contraction and location safeguards", () => {
  assert.match(getHotspotById("hotspot.a-band").narration, /stays nearly constant/);
  assert.match(getHotspotById("hotspot.i-band").narration, /narrow/);
  assert.match(getHotspotById("hotspot.capillary").narration, /outside/);
  assert.match(getHotspotById("hotspot.myonucleus").narration, /beneath the sarcolemma/);
});
