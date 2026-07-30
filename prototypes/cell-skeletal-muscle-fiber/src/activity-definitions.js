const freezeActivity = (activity) =>
  Object.freeze({
    ...activity,
    modes: Object.freeze([...activity.modes]),
    steps: Object.freeze(activity.steps.map((step) => Object.freeze({ ...step, action: Object.freeze({ ...step.action }) }))),
  });

/**
 * Declarative interaction records consumed by the mobile viewer.
 * Actions describe intent only; they never contain executable lesson code.
 */
export const ACTIVITY_DEFINITIONS = Object.freeze(
  [
    {
      id: "activity.orbit-and-inspect",
      title: "Inspect my surface",
      summary: "Orbit the whole fiber, then open one surface hotspot.",
      modes: ["orbit"],
      steps: [
        {
          id: "orbit",
          instruction: "Drag me to inspect my full surface, including both ends.",
          action: { type: "enable-orbit", runtimeMode: "combined", allowTopBottom: true },
        },
        {
          id: "surface-hotspot",
          instruction: "Tap a marker to hear how that structure helps me work.",
          action: { type: "show-hotspots", mode: "orbit" },
        },
      ],
    },
    {
      id: "activity.compare-sections",
      title: "Look inside me",
      summary: "Switch between lengthwise and cross-section views.",
      modes: ["longitudinal", "cross-section"],
      steps: [
        {
          id: "lengthwise",
          instruction: "Open my lengthwise view to follow repeating sarcomeres.",
          action: { type: "set-view-mode", mode: "longitudinal", runtimeCall: "setMuscleFiberMode" },
        },
        {
          id: "across",
          instruction: "Open my cross-section to compare structures across my width.",
          action: { type: "set-view-mode", mode: "cross-section", runtimeCall: "setMuscleFiberMode" },
        },
      ],
    },
    {
      id: "activity.isolate-layers",
      title: "Separate my layers",
      summary: "Isolate one structure or gently spread the assemblies.",
      modes: ["orbit", "longitudinal", "cross-section"],
      steps: [
        {
          id: "isolate",
          instruction: "Choose one layer and I will dim the others without hiding its context.",
          action: {
            type: "set-layer-isolation",
            layerId: null,
            runtimeCall: "setMuscleFiberLayerVisibility",
          },
        },
        {
          id: "explode",
          instruction: "Move the spread control to see how my named parts fit together.",
          action: { type: "set-explode", amount: 0.45, range: Object.freeze([0, 1]), runtimeCall: "setMuscleFiberExplode" },
        },
        {
          id: "restore",
          instruction: "Restore me before changing view modes.",
          action: { type: "reset-assembly" },
        },
      ],
    },
    {
      id: "activity.contraction-demo",
      title: "Watch me shorten",
      summary: "Compare relaxed and contracted sarcomeres without distorting the anatomy.",
      modes: ["longitudinal"],
      steps: [
        {
          id: "relaxed",
          instruction: "Start with my relaxed sarcomeres and note the Z-disc spacing.",
          action: { type: "set-contraction", phase: "relaxed", phaseRadians: 0, intensity: 0, runtimeCall: "updateMuscleFiberContraction" },
        },
        {
          id: "contracted",
          instruction: "Now I shorten: my Z discs move closer and my I bands narrow while each A band stays the same width.",
          action: { type: "set-contraction", phase: "contracted", phaseRadians: Math.PI / 2, intensity: 1, runtimeCall: "updateMuscleFiberContraction" },
        },
      ],
      motion: Object.freeze({
        durationMs: 900,
        maxSarcomereShortening: 0.08,
        preserveABandWidth: true,
        preserveFilamentLengths: true,
        synchronizeSarcomeres: true,
        wholeFiberRadialScale: 1,
      }),
      reducedMotion: Object.freeze({
        durationMs: 0,
        behavior: "show-end-states",
        comparison: "side-by-side-or-toggle",
      }),
      limitation: "This schematic demonstrates sliding-filament relationships; it is not to scale and does not show every molecular event.",
    },
  ].map(freezeActivity),
);

const ACTIVITIES_BY_ID = new Map(ACTIVITY_DEFINITIONS.map((activity) => [activity.id, activity]));

export function getActivityDefinition(id) {
  return ACTIVITIES_BY_ID.get(id) ?? null;
}

/**
 * One-screen integration contract for a 390 x 844 viewport.
 * Keep the canvas visible and render only one active card at a time.
 */
export const MOBILE_UI_CONTRACT = Object.freeze({
  viewport: Object.freeze({ width: 390, height: 844 }),
  canvasMinHeight: 430,
  topBarMaxHeight: 56,
  bottomSheetCollapsedHeight: 88,
  bottomSheetMaxHeight: 270,
  maxPersistentControls: 4,
  hotspotPresentation: "markers-with-single-active-card",
  activityPresentation: "one-step-at-a-time",
  primaryControls: Object.freeze(["view-mode", "layers", "contraction", "reset"]),
  accessibility: Object.freeze({
    minimumTouchTargetPx: 44,
    keyboardOperable: true,
    narrationLiveRegion: "polite",
    doNotUseColorAlone: true,
  }),
  reducedMotion: Object.freeze({
    orbitAutoRotate: false,
    animatedTransitions: false,
    contractionBehavior: "instant-end-state",
    explodeBehavior: "instant-end-state",
  }),
});
