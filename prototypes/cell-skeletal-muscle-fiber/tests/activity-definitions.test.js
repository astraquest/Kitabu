import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_DEFINITIONS,
  MOBILE_UI_CONTRACT,
  getActivityDefinition,
} from "../src/activity-definitions.js";

test("activity IDs and step IDs are unique", () => {
  assert.equal(new Set(ACTIVITY_DEFINITIONS.map(({ id }) => id)).size, ACTIVITY_DEFINITIONS.length);
  for (const activity of ACTIVITY_DEFINITIONS) {
    assert.equal(new Set(activity.steps.map(({ id }) => id)).size, activity.steps.length);
  }
});

test("activities cover orbit, section modes, isolation, explode, and contraction", () => {
  const actionTypes = ACTIVITY_DEFINITIONS.flatMap(({ steps }) => steps.map(({ action }) => action.type));
  for (const type of ["enable-orbit", "set-view-mode", "set-layer-isolation", "set-explode", "set-contraction"]) {
    assert.ok(actionTypes.includes(type), type);
  }
});

test("runtime actions bind to the geometry module API", () => {
  const runtimeCalls = ACTIVITY_DEFINITIONS.flatMap(({ steps }) => steps.map(({ action }) => action.runtimeCall).filter(Boolean));
  for (const call of ["setMuscleFiberMode", "setMuscleFiberLayerVisibility", "setMuscleFiberExplode", "updateMuscleFiberContraction"]) {
    assert.ok(runtimeCalls.includes(call), call);
  }
});

test("learner instructions are concise and first-person", () => {
  for (const { id, steps } of ACTIVITY_DEFINITIONS) {
    for (const step of steps) {
      assert.match(step.instruction, /\bI\b|\bme\b|\bmy\b/i, `${id}/${step.id}`);
      assert.ok(step.instruction.length <= 140, `${id}/${step.id}`);
    }
  }
});

test("contraction is subtle, synchronous, and preserves filament and A-band lengths", () => {
  const contraction = getActivityDefinition("activity.contraction-demo");
  assert.ok(contraction.motion.maxSarcomereShortening > 0);
  assert.ok(contraction.motion.maxSarcomereShortening <= 0.1);
  assert.equal(contraction.motion.preserveABandWidth, true);
  assert.equal(contraction.motion.preserveFilamentLengths, true);
  assert.equal(contraction.motion.synchronizeSarcomeres, true);
  assert.equal(contraction.motion.wholeFiberRadialScale, 1);
});

test("reduced motion uses static endpoint changes", () => {
  const contraction = getActivityDefinition("activity.contraction-demo");
  assert.equal(contraction.reducedMotion.durationMs, 0);
  assert.equal(MOBILE_UI_CONTRACT.reducedMotion.orbitAutoRotate, false);
  assert.equal(MOBILE_UI_CONTRACT.reducedMotion.animatedTransitions, false);
});

test("mobile contract fits a single 390 x 844 screen with accessible controls", () => {
  assert.deepEqual(MOBILE_UI_CONTRACT.viewport, { width: 390, height: 844 });
  assert.ok(MOBILE_UI_CONTRACT.canvasMinHeight + MOBILE_UI_CONTRACT.topBarMaxHeight + MOBILE_UI_CONTRACT.bottomSheetMaxHeight <= 844);
  assert.ok(MOBILE_UI_CONTRACT.maxPersistentControls <= 4);
  assert.ok(MOBILE_UI_CONTRACT.accessibility.minimumTouchTargetPx >= 44);
});

test("activity lookup returns the canonical object or null", () => {
  assert.equal(getActivityDefinition("activity.compare-sections"), ACTIVITY_DEFINITIONS[1]);
  assert.equal(getActivityDefinition("missing"), null);
});
