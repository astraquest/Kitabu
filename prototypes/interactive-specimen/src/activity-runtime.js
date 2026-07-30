const VERSION_PINS = Object.freeze({
  bundleId: "interactive-specimen-proof",
  bundleVersion: "1.0.0",
  sceneVersion: "1.0.0",
  componentVersion: "1.0.0",
  graderId: "kitabu.no-grader",
  graderVersion: "1.0.0",
});

const PRIVACY = Object.freeze({
  ordinary: Object.freeze({
    privacyClass: "ordinary-learning-event",
    retentionPolicyId: "kitabu.learning-event-standard",
    retentionPolicyVersion: "1.0.0",
  }),
  authored: Object.freeze({
    privacyClass: "learner-authored-content",
    retentionPolicyId: "kitabu.learner-response-standard",
    retentionPolicyVersion: "1.0.0",
  }),
});

function initialState(definition) {
  return {
    activityId: definition.activityId,
    mode: definition.mode,
    visitedHotspotIds: [],
    selectedHotspotId: null,
    response: "",
    attempts: 0,
    submitted: false,
    completed: false,
    revealedHotspotId: null,
    feedback: null,
    feedbackTone: null,
  };
}

export function createActivityRuntime({ definition, component, gradeHotspot, onEvent = () => {}, onState = () => {} }) {
  let sequence = 0;
  let state = initialState(definition);
  const attemptId = `proof-attempt-${definition.activityId}`;
  const sessionId = "proof-session-african-monarch";

  function snapshot() {
    return { ...state, visitedHotspotIds: [...state.visitedHotspotIds] };
  }

  function publish() {
    onState(snapshot());
  }

  function emit(type, payload, privacy = PRIVACY.ordinary) {
    sequence += 1;
    const eventId = `${attemptId}:${sequence}:${type.toLowerCase()}`;
    const envelope = {
      eventId,
      idempotencyKey: eventId,
      type,
      protocolVersion: "1.0.1",
      sessionId,
      sceneId: definition.sceneId,
      attemptId,
      componentId: component.componentId,
      sequence,
      clientTimestamp: new Date().toISOString(),
      versions: {
        ...VERSION_PINS,
        componentVersion: component.componentVersion,
        graderId: definition.grader?.graderId ?? VERSION_PINS.graderId,
        graderVersion: definition.grader?.graderVersion ?? VERSION_PINS.graderVersion,
      },
      privacy,
      payload,
    };
    onEvent(envelope);
    return envelope;
  }

  function ready() {
    emit("READY", { assetId: component.assetId, mode: definition.mode });
    publish();
  }

  function selectHotspot(hotspotId) {
    const visited = state.visitedHotspotIds.includes(hotspotId)
      ? state.visitedHotspotIds
      : [...state.visitedHotspotIds, hotspotId];
    state = { ...state, visitedHotspotIds: visited, selectedHotspotId: hotspotId, feedback: null, feedbackTone: null };
    emit("INTERACTION", { action: "hotspot-selected", targetId: hotspotId });

    if (definition.mode === "identify-hotspot") {
      emit("ANSWER_CHANGED", { response: { hotspotId } });
    } else if (definition.mode === "explore" && !state.completed) {
      state = { ...state, completed: true };
      emit("COMPLETED", { completionRuleId: definition.completionRuleId });
    }
    publish();
  }

  function changeResponse(response) {
    const maxLength = definition.response?.maxLength ?? 500;
    state = { ...state, response: String(response).slice(0, maxLength), feedback: null, feedbackTone: null };
    emit("ANSWER_CHANGED", { response: state.response }, PRIVACY.authored);
    publish();
  }

  async function submit() {
    if (definition.mode === "identify-hotspot") {
      if (!state.selectedHotspotId || typeof gradeHotspot !== "function") return snapshot();
      const attempts = state.attempts + 1;
      const result = await gradeHotspot({
        activityId: definition.activityId,
        hotspotId: state.selectedHotspotId,
        attempt: attempts,
      });
      const completed = result.correct || attempts >= (definition.attemptPolicy?.maxAttempts ?? 1);
      state = {
        ...state,
        attempts,
        submitted: true,
        completed,
        revealedHotspotId: result.revealHotspotId ?? null,
        feedback: result.feedback,
        feedbackTone: result.correct ? "success" : "retry",
      };
      emit("SUBMITTED", { response: { hotspotId: state.selectedHotspotId }, completionRuleId: definition.completionRuleId });
      if (completed) emit("COMPLETED", { completionRuleId: definition.completionRuleId });
      publish();
      return snapshot();
    }

    if (definition.mode === "structured-response" && state.response.trim()) {
      state = {
        ...state,
        attempts: state.attempts + 1,
        submitted: true,
        completed: true,
        feedback: "Response saved for teacher or server-side rubric review.",
        feedbackTone: "saved",
      };
      emit("SUBMITTED", { response: state.response, completionRuleId: definition.completionRuleId }, PRIVACY.authored);
      emit("COMPLETED", { completionRuleId: definition.completionRuleId });
      publish();
    }
    return snapshot();
  }

  return { ready, selectHotspot, changeResponse, submit, getState: snapshot };
}
