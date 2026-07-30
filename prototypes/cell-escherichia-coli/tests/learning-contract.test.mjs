import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES, getActivity, getRunnableActivities } from "../src/activity-definitions.js";
import { AVAILABILITY, HOTSPOTS, LEARNING_BEHAVIORS, SEMANTIC_PART_IDS, getHotspot, getHotspotsForAvailableParts } from "../src/hotspots.js";

const CORE_PARTS = [SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS, SEMANTIC_PART_IDS.PERIPLASM, SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS, SEMANTIC_PART_IDS.INNER_MEMBRANE, SEMANTIC_PART_IDS.CYTOPLASM, SEMANTIC_PART_IDS.NUCLEOID_CHROMOSOMAL_DNA, SEMANTIC_PART_IDS.RIBOSOMES];

test("IDs are stable, unique, and resolvable", () => {
  assert.equal(new Set(HOTSPOTS.map(({ id }) => id)).size, HOTSPOTS.length);
  assert.equal(new Set(HOTSPOTS.map(({ semanticPartId }) => semanticPartId)).size, HOTSPOTS.length);
  assert.equal(new Set(ACTIVITIES.map(({ id }) => id)).size, ACTIVITIES.length);
  for (const item of HOTSPOTS) { assert.equal(getHotspot(item.id), item); assert.equal(item.position.length, 3); assert.ok(item.position.every(Number.isFinite)); }
  for (const item of ACTIVITIES) { assert.equal(getActivity(item.id), item); for (const id of item.hotspotIds) assert.ok(getHotspot(id), id); }
});

test("peel order matches a Gram-negative envelope", () => {
  assert.deepEqual(LEARNING_BEHAVIORS.peel.orderedLayers, [SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS, SEMANTIC_PART_IDS.PERIPLASM, SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS, SEMANTIC_PART_IDS.INNER_MEMBRANE]);
  assert.equal(LEARNING_BEHAVIORS.peel.terminalReveal, SEMANTIC_PART_IDS.CYTOPLASM);
});

test("explode scales parts about the cell rather than translating the assembly", () => {
  assert.equal(LEARNING_BEHAVIORS.explode.layout, "scale-from-origin");
  assert.equal(LEARNING_BEHAVIORS.explode.originSemanticPartId, SEMANTIC_PART_IDS.CYTOPLASM);
  assert.ok(LEARNING_BEHAVIORS.explode.defaultFactor > 1);
  assert.ok(LEARNING_BEHAVIORS.explode.defaultFactor <= LEARNING_BEHAVIORS.explode.maxFactor);
});

test("optional structures are qualified and can be absent", () => {
  const optional = HOTSPOTS.filter(({ availability }) => availability === AVAILABILITY.OPTIONAL).map(({ semanticPartId }) => semanticPartId);
  assert.deepEqual(optional, [SEMANTIC_PART_IDS.PLASMID_DNA, SEMANTIC_PART_IDS.FLAGELLUM, SEMANTIC_PART_IDS.FIMBRIAE, SEMANTIC_PART_IDS.CONJUGATIVE_PILUS]);
  assert.deepEqual(getHotspotsForAvailableParts(CORE_PARTS).map(({ semanticPartId }) => semanticPartId), CORE_PARTS);
  const runnable = getRunnableActivities(CORE_PARTS).map(({ id }) => id);
  assert.ok(runnable.includes("ecoli.activity.find-genetic-material"));
  assert.ok(runnable.includes("ecoli.activity.compare-appendages"));
});

test("copy rejects eukaryotic structures and qualifies variability", () => {
  const copy = [...HOTSPOTS.flatMap(({ summary, accuracyNote }) => [summary, accuracyNote]), ...ACTIVITIES.map(({ narration }) => narration)].join(" ").toLowerCase();
  assert.match(copy, /no nucleus/);
  assert.match(copy, /no membrane-bound organelles/);
  assert.match(copy, /not every e\. coli cell/);
  assert.match(copy, /strain and growth conditions|strain or growth conditions/);
});

test("contracts are frozen", () => {
  assert.ok(Object.isFrozen(HOTSPOTS)); assert.ok(Object.isFrozen(HOTSPOTS[0])); assert.ok(Object.isFrozen(HOTSPOTS[0].position)); assert.ok(Object.isFrozen(ACTIVITIES)); assert.ok(Object.isFrozen(ACTIVITIES[0].steps)); assert.ok(Object.isFrozen(LEARNING_BEHAVIORS.peel.orderedLayers));
});
