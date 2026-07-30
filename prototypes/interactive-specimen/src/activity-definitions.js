export const SPECIMEN_COMPONENT = Object.freeze({
  componentId: "interactive-specimen",
  componentVersion: "1.0.0",
  assetId: "specimen.african-monarch.001",
  assetVersion: "1.0.0",
  voice: Object.freeze({ status: "planned", strategy: "device-tts", source: "first-person-hotspot-copy" }),
});

export const ACTIVITY_DEFINITIONS = Object.freeze([
  Object.freeze({
    activityId: "explore-anatomy",
    sceneId: "ken.cbc.g6.science.butterfly-anatomy.explore-1",
    purpose: "instruction",
    mode: "explore",
    label: "Explore",
    eyebrow: "Guided learning",
    prompt: "Explore how the butterfly's body is organised.",
    instructions: "Select the numbered points to examine its senses, body sections, wings and legs.",
    completionRuleId: "explore-one-structure",
  }),
  Object.freeze({
    activityId: "identify-thorax",
    sceneId: "ken.cbc.g6.science.butterfly-anatomy.identify-1",
    purpose: "practice",
    mode: "identify-hotspot",
    label: "Identify",
    eyebrow: "Knowledge check",
    prompt: "Select the body section where the wings and all six legs attach.",
    instructions: "Choose one numbered point on the specimen, then check your selection.",
    grader: Object.freeze({
      graderId: "kitabu.sealed-hotspot-answer",
      graderVersion: "1.0.0",
      mode: "semantic-state",
    }),
    attemptPolicy: Object.freeze({ maxAttempts: 2, feedbackTiming: "on-submit", revealAnswer: "after-completion" }),
    completionRuleId: "correct-hotspot-selected",
  }),
  Object.freeze({
    activityId: "explain-reduced-forelegs",
    sceneId: "ken.cbc.g6.science.butterfly-anatomy.explain-1",
    purpose: "practice",
    mode: "structured-response",
    label: "Explain",
    eyebrow: "Observation question",
    prompt: "A butterfly may appear to have four legs. Explain why it is still classified as a six-legged insect.",
    instructions: "Examine the legs point, then write one or two clear sentences using your observation.",
    response: Object.freeze({
      inputLabel: "Explain why the butterfly appears to have four legs",
      placeholder: "I observed that…",
      maxLength: 280,
    }),
    grader: Object.freeze({
      graderId: "kitabu.teacher-rubric",
      graderVersion: "1.0.0",
      mode: "rubric",
    }),
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

  for (const [index, activity] of definitions.entries()) {
    const path = `activities[${index}]`;
    for (const key of ["activityId", "sceneId", "purpose", "mode", "label", "prompt", "instructions", "completionRuleId"]) {
      if (typeof activity?.[key] !== "string" || activity[key].trim().length === 0) {
        issues.push(`${path}.${key}`);
      }
    }
    if (ids.has(activity.activityId)) issues.push(`${path}.activityId:duplicate`);
    ids.add(activity.activityId);
    if (!allowedModes.has(activity.mode)) issues.push(`${path}.mode:unsupported`);
    if (activity.mode !== "explore" && !activity.grader) issues.push(`${path}.grader:required`);
    if (activity.mode === "structured-response" && !activity.response) issues.push(`${path}.response:required`);
  }

  return { ok: issues.length === 0, issues };
}
