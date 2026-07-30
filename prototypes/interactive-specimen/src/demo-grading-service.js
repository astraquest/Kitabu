/**
 * Standalone prototype adapter. In Kitabu this call crosses the API boundary;
 * sealed evaluator configuration never ships in learner-visible scene props.
 */
const DEMO_HOTSPOT_EXPECTATIONS = Object.freeze({
  "identify-thorax": "thorax",
});

export async function gradeHotspotSelection({ activityId, hotspotId, attempt = 1 }) {
  const expectedHotspotId = DEMO_HOTSPOT_EXPECTATIONS[activityId];
  if (!expectedHotspotId) throw new Error(`No demo grader is configured for ${activityId}.`);

  await Promise.resolve();
  const correct = hotspotId === expectedHotspotId;
  return {
    correct,
    revealHotspotId: !correct && attempt >= 2 ? expectedHotspotId : null,
    feedback: correct
      ? "Correct. The thorax contains the muscles and attachment points for the wings and all six legs."
      : attempt >= 2
        ? "The correct structure is the thorax: the middle body section where the wings and legs meet."
        : "Not quite. Look for the middle body section where the wings and legs meet, then try again.",
  };
}
