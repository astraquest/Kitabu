const ONE_SCREEN_MOBILE_UI = Object.freeze({
  layout: "one-screen",
  viewport: Object.freeze([390, 844]),
  detailPresentation: "compact-sheet",
});

function activity(definition) {
  return Object.freeze({
    ...definition,
    instructions: Object.freeze([...definition.instructions]),
    view: Object.freeze({
      ...definition.view,
      allowedModes: Object.freeze([...definition.view.allowedModes]),
      focusSemanticPartIds: Object.freeze([...definition.view.focusSemanticPartIds]),
    }),
    ui: ONE_SCREEN_MOBILE_UI,
  });
}

export const ACTIVITY_DEFINITIONS = Object.freeze([
  activity({
    activityId: "explore-neutrophil",
    label: "Explore",
    purpose: "guided-learning",
    mode: "explore",
    prompt: "Meet a mature neutrophil and tap a part to learn what it does.",
    instructions: ["Drag to rotate.", "Pinch to zoom.", "Tap a hotspot for a short explanation."],
    view: {
      initialMode: "explore",
      allowedModes: ["explore"],
      focusSemanticPartIds: [],
    },
  }),
  activity({
    activityId: "look-inside-neutrophil",
    label: "Look inside",
    purpose: "guided-learning",
    mode: "transparent-cross-section",
    prompt: "Look through my membrane and trace how my connected nuclear lobes fit inside me.",
    instructions: ["Switch between transparent and cross-section views.", "Tap an internal part to inspect it."],
    view: {
      initialMode: "transparent",
      allowedModes: ["transparent", "cross-section"],
      focusSemanticPartIds: ["cytoplasm", "nucleus", "nuclear-lobes", "chromatin-bridges"],
    },
  }),
  activity({
    activityId: "compare-neutrophil-cargo",
    label: "Compare cargo",
    purpose: "guided-learning",
    mode: "isolate-explode",
    prompt: "Separate my defence cargo and compare the jobs of granules, fuel stores and vesicles.",
    instructions: ["Use isolate for one structure.", "Use explode to compare their positions."],
    view: {
      initialMode: "isolate",
      allowedModes: ["isolate", "explode"],
      focusSemanticPartIds: [
        "azurophilic-granules",
        "specific-granules",
        "cytoplasm",
      ],
    },
  }),
]);

export function getActivityDefinition(activityId) {
  return ACTIVITY_DEFINITIONS.find(({ activityId: id }) => id === activityId) ?? null;
}
