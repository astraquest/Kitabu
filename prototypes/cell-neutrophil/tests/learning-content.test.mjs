import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_DEFINITIONS,
  getActivityDefinition,
} from "../src/activity-definitions.js";
import { HOTSPOTS, getHotspot } from "../src/hotspots.js";

const EXPECTED_PART_IDS = [
  "plasma-membrane",
  "cytoplasm",
  "nucleus",
  "nuclear-lobes",
  "chromatin-bridges",
  "azurophilic-granules",
  "specific-granules",
];

const EXPECTED_HOTSPOT_IDS = [
  ...EXPECTED_PART_IDS,
  "glycogen-stores",
  "transport-vesicles",
];

test("hotspots resolve to authoritative semantic identities and finite local positions", () => {
  assert.deepEqual(HOTSPOTS.map(({ id }) => id), EXPECTED_HOTSPOT_IDS);
  assert.equal(new Set(HOTSPOTS.map(({ id }) => id)).size, HOTSPOTS.length);

  for (const record of HOTSPOTS) {
    assert.ok(EXPECTED_PART_IDS.includes(record.semanticPartId));
    assert.ok(record.label.length > 0);
    assert.ok(record.title.length > 0);
    assert.match(record.summary, /\b(?:I|my)\b/i);
    assert.ok(record.summary.length <= 120, `${record.id} copy should stay compact`);
    assert.equal(record.position.length, 3);
    assert.ok(record.position.every(Number.isFinite));
    assert.equal(record.anchor.position, record.position);
    assert.equal(getHotspot(record.id), record);
  }

  assert.equal(getHotspot("glycogen-stores").semanticPartId, "cytoplasm");
  assert.equal(getHotspot("transport-vesicles").semanticPartId, "cytoplasm");

  assert.equal(getHotspot("not-a-part"), null);
});

test("hotspots describe mature-neutrophil structures without foregrounding sparse organelles", () => {
  const content = JSON.stringify(HOTSPOTS);
  assert.match(content, /connected multi-lobed nucleus/i);
  assert.match(content, /primary \(azurophilic\) granules/i);
  assert.match(content, /secondary \(specific\) granules/i);
  assert.doesNotMatch(content, /mitochondri|golgi/i);
});

test("activities cover each required inspection mode in a one-screen mobile contract", () => {
  const modes = new Set(ACTIVITY_DEFINITIONS.flatMap(({ view }) => view.allowedModes));
  assert.deepEqual([...modes].sort(), [
    "cross-section",
    "explode",
    "explore",
    "isolate",
    "transparent",
  ]);

  for (const definition of ACTIVITY_DEFINITIONS) {
    assert.equal(definition.ui.layout, "one-screen");
    assert.deepEqual(definition.ui.viewport, [390, 844]);
    assert.ok(definition.prompt.length <= 100);
    assert.ok(definition.instructions.length <= 3);
    assert.equal(getActivityDefinition(definition.activityId), definition);
    for (const semanticPartId of definition.view.focusSemanticPartIds) {
      assert.ok(EXPECTED_PART_IDS.includes(semanticPartId));
    }
  }

  assert.equal(getActivityDefinition("not-an-activity"), null);
});
