export const SPECIMEN_COMPONENT = Object.freeze({
  componentId: "interactive-specimen",
  componentVersion: "1.0.0",
  assetId: "cell.plant.001",
  assetVersion: "1.0.0",
  voice: Object.freeze({ status: "planned", strategy: "device-tts", source: "first-person-hotspot-copy" }),
  motion: Object.freeze({ strategy: "respect-prefers-reduced-motion", reducedMotionTransitionMs: 0 }),
});

const sealedHotspotGrader = Object.freeze({
  graderId: "kitabu.sealed-hotspot-answer",
  graderVersion: "1.0.0",
  mode: "semantic-state",
});

export const ACTIVITY_DEFINITIONS = Object.freeze([
  Object.freeze({
    activityId: "explore-plant-cell",
    sceneId: "ken.cbc.science.plant-cell.explore-1",
    purpose: "instruction",
    mode: "explore",
    label: "Explore",
    eyebrow: "Guided learning",
    prompt: "Explore how a plant cell's structures work together.",
    instructions: "Rotate the cell and select a named point to hear that structure describe its job.",
    viewBehaviorId: "overview",
    completionRuleId: "explore-three-structures",
  }),
  Object.freeze({
    activityId: "isolate-organelles",
    sceneId: "ken.cbc.science.plant-cell.isolate-1",
    purpose: "instruction",
    mode: "explore",
    label: "Isolate",
    eyebrow: "Structure focus",
    prompt: "Isolate an organelle and inspect it with its enclosing structure.",
    instructions: "Select a point, then rotate the isolated structure. Reduced-motion mode changes the view instantly.",
    viewBehaviorId: "isolate",
    completionRuleId: "isolate-two-organelles",
  }),
  Object.freeze({
    activityId: "map-cell-parts",
    sceneId: "ken.cbc.science.plant-cell.explode-1",
    purpose: "instruction",
    mode: "explore",
    label: "Explode",
    eyebrow: "Spatial relationships",
    prompt: "Separate the cell structures to see how they fit together.",
    instructions: "Move the explode control, then select parts to compare their positions. Motion is skipped when reduced motion is preferred.",
    viewBehaviorId: "explode",
    completionRuleId: "inspect-exploded-view",
  }),
  Object.freeze({
    activityId: "identify-nucleus",
    sceneId: "ken.cbc.science.plant-cell.identify-1",
    purpose: "practice",
    mode: "identify-hotspot",
    label: "Identify",
    eyebrow: "Knowledge check",
    prompt: "Select the structure that stores most of the cell's DNA.",
    instructions: "Use the cross-section view, choose one named point, then check your answer.",
    viewBehaviorId: "cross-section",
    grader: sealedHotspotGrader,
    attemptPolicy: Object.freeze({ maxAttempts: 2, feedbackTiming: "on-submit", revealAnswer: "after-completion" }),
    completionRuleId: "correct-hotspot-selected",
  }),
  Object.freeze({
    activityId: "explain-plant-support",
    sceneId: "ken.cbc.science.plant-cell.explain-1",
    purpose: "practice",
    mode: "structured-response",
    label: "Explain",
    eyebrow: "Evidence question",
    prompt: "Explain how two plant-cell structures help keep a plant upright.",
    instructions: "Inspect the cell wall and central vacuole, then write one or two clear sentences.",
    viewBehaviorId: "isolate",
    focusHotspotIds: Object.freeze(["cell-wall", "central-vacuole", "tonoplast"]),
    response: Object.freeze({
      inputLabel: "Explain how the structures support the plant",
      placeholder: "The cell wall... The central vacuole...",
      maxLength: 280,
    }),
    grader: Object.freeze({ graderId: "kitabu.teacher-rubric", graderVersion: "1.0.0", mode: "rubric" }),
    attemptPolicy: Object.freeze({ maxAttempts: 1, feedbackTiming: "manual", revealAnswer: "teacher-only" }),
    completionRuleId: "response-submitted",
  }),
]);

export function getActivityDefinition(activityId) {
  return ACTIVITY_DEFINITIONS.find((activity) => activity.activityId === activityId) ?? null;
}

export function validateActivityDefinitions(definitions = ACTIVITY_DEFINITIONS) {
  const issues = [];
  const ids = new Set();
  const allowedModes = new Set(["explore", "identify-hotspot", "structured-response"]);
  const allowedViewBehaviors = new Set(["overview", "isolate", "explode", "cross-section"]);

  for (const [index, activity] of definitions.entries()) {
    const path = `activities[${index}]`;
    for (const key of ["activityId", "sceneId", "purpose", "mode", "label", "prompt", "instructions", "viewBehaviorId", "completionRuleId"]) {
      if (typeof activity?.[key] !== "string" || activity[key].trim().length === 0) issues.push(`${path}.${key}`);
    }
    if (ids.has(activity.activityId)) issues.push(`${path}.activityId:duplicate`);
    ids.add(activity.activityId);
    if (!allowedModes.has(activity.mode)) issues.push(`${path}.mode:unsupported`);
    if (!allowedViewBehaviors.has(activity.viewBehaviorId)) issues.push(`${path}.viewBehaviorId:unsupported`);
    if (activity.mode !== "explore" && !activity.grader) issues.push(`${path}.grader:required`);
    if (activity.mode === "structured-response" && !activity.response) issues.push(`${path}.response:required`);
  }

  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}
