import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_DEFINITIONS,
  SPECIMEN_COMPONENT,
  validateActivityDefinitions,
} from "../src/activity-definitions.js";
import { createActivityRuntime } from "../src/activity-runtime.js";
import { HOTSPOTS } from "../src/hotspots.js";

const forbiddenEvaluatorKeys = new Set([
  "acceptedHotspotIds",
  "answerKey",
  "correctHotspotId",
  "expectedHotspotId",
]);

function collectKeys(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    output.push(key);
    collectKeys(child, output);
  }
  return output;
}

function createRuntime(definition, overrides = {}) {
  const events = [];
  const states = [];
  const runtime = createActivityRuntime({
    definition,
    component: SPECIMEN_COMPONENT,
    gradeHotspot: async ({ hotspotId }) => ({
      correct: hotspotId === "thorax",
      feedback: hotspotId === "thorax" ? "Correct" : "Try again",
    }),
    onEvent: (event) => events.push(event),
    onState: (state) => states.push(state),
    ...overrides,
  });
  return { runtime, events, states };
}

test("all three learner-facing activity definitions are valid and answer-free", () => {
  assert.deepEqual(validateActivityDefinitions(), { ok: true, issues: [] });
  assert.deepEqual(ACTIVITY_DEFINITIONS.map(({ mode }) => mode), [
    "explore",
    "identify-hotspot",
    "structured-response",
  ]);
  const keys = collectKeys(ACTIVITY_DEFINITIONS);
  assert.deepEqual(keys.filter((key) => forbiddenEvaluatorKeys.has(key)), []);
});

test("hotspot information uses first-person specimen narration", () => {
  const firstPerson = /\b(?:my|me|I)\b/i;
  assert.ok(HOTSPOTS.every(({ summary, detail }) => firstPerson.test(`${summary} ${detail}`)));
  assert.deepEqual(SPECIMEN_COMPONENT.voice, {
    status: "planned",
    strategy: "device-tts",
    source: "first-person-hotspot-copy",
  });
});

test("exploration emits replay-safe protocol events and completes after interaction", () => {
  const definition = ACTIVITY_DEFINITIONS[0];
  const { runtime, events } = createRuntime(definition);

  runtime.ready();
  runtime.selectHotspot("antennae");

  assert.deepEqual(events.map(({ type }) => type), ["READY", "INTERACTION", "COMPLETED"]);
  assert.deepEqual(events.map(({ sequence }) => sequence), [1, 2, 3]);
  for (const event of events) {
    assert.equal(event.protocolVersion, "1.0.1");
    assert.equal(event.componentId, "interactive-specimen");
    assert.equal(event.sceneId, definition.sceneId);
    assert.equal(event.eventId, event.idempotencyKey);
    assert.match(event.clientTimestamp, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test("identify mode submits a semantic hotspot response through the grading boundary", async () => {
  const definition = ACTIVITY_DEFINITIONS[1];
  const gradingCalls = [];
  const { runtime, events } = createRuntime(definition, {
    gradeHotspot: async (input) => {
      gradingCalls.push(input);
      return { correct: true, feedback: "Correct" };
    },
  });

  runtime.selectHotspot("thorax");
  const state = await runtime.submit();

  assert.deepEqual(gradingCalls, [{ activityId: definition.activityId, hotspotId: "thorax", attempt: 1 }]);
  assert.equal(state.completed, true);
  assert.deepEqual(events.map(({ type }) => type), ["INTERACTION", "ANSWER_CHANGED", "SUBMITTED", "COMPLETED"]);
  assert.deepEqual(events[2].payload.response, { hotspotId: "thorax" });
});

test("structured response is learner-authored content and contains no local correctness claim", async () => {
  const definition = ACTIVITY_DEFINITIONS[2];
  const { runtime, events } = createRuntime(definition);

  runtime.changeResponse("Its smaller front pair is held close to its body.");
  const state = await runtime.submit();

  assert.equal(state.completed, true);
  assert.deepEqual(events.map(({ type }) => type), ["ANSWER_CHANGED", "SUBMITTED", "COMPLETED"]);
  assert.equal(events[0].privacy.privacyClass, "learner-authored-content");
  assert.equal(events[1].privacy.privacyClass, "learner-authored-content");
  assert.equal("correct" in events[1].payload, false);
});

test("mobile shell keeps the activity modes, question area and floating detail surface in one component", async () => {
  const { readFile } = await import("node:fs/promises");
  const root = new URL("../", import.meta.url);
  const [markup, css, source] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("src/main.js", root), "utf8"),
  ]);

  assert.match(markup, /id="activity-tabs"/);
  assert.match(markup, /id="activity-workspace"/);
  assert.match(markup, /id="specimen-card"/);
  assert.match(source, /aria-label[\s\S]*Select marker/);
  assert.match(css, /Mobile is a single-screen learning surface/);
  assert.match(css, /body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /backdrop-filter:\s*blur\(20px\)/);
});
