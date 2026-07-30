import { BEHAVIOR_TYPES, HOTSPOT_BY_ID, LEARNING_BEHAVIORS, SEMANTIC_PART_IDS } from "./hotspots.js";

export const ACTIVITY_SCHEMA_VERSION = "1.0.0";

function activity(record) {
  return Object.freeze({ ...record, hotspotIds: Object.freeze(record.hotspotIds), steps: Object.freeze(record.steps.map((step) => Object.freeze({ ...step, targetSemanticPartIds: step.targetSemanticPartIds ? Object.freeze(step.targetSemanticPartIds) : undefined }))) });
}

export const ACTIVITIES = Object.freeze([
  activity({ id: "ecoli.activity.peel-the-envelope", title: "Peel my cell envelope", behaviorId: LEARNING_BEHAVIORS.peel.id, behaviorType: BEHAVIOR_TYPES.PEEL, narration: "Peel my layers from outside to inside. My thin wall sits between two membranes.", hotspotIds: ["ecoli.hotspot.outer-membrane-lps", "ecoli.hotspot.periplasm", "ecoli.hotspot.peptidoglycan", "ecoli.hotspot.inner-membrane", "ecoli.hotspot.cytoplasm"], steps: [
    { id: "outer", action: "peel-next", targetSemanticPartIds: [SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS], narration: "First, lift my outer membrane and its outer-leaflet LPS." },
    { id: "periplasm", action: "peel-next", targetSemanticPartIds: [SEMANTIC_PART_IDS.PERIPLASM], narration: "Now look through my periplasmic space." },
    { id: "wall", action: "peel-next", targetSemanticPartIds: [SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS], narration: "Find my thin peptidoglycan sacculus inside that space." },
    { id: "inner", action: "peel-next", targetSemanticPartIds: [SEMANTIC_PART_IDS.INNER_MEMBRANE], narration: "Lift my inner membrane to reveal my cytoplasm." },
  ], completion: "all-steps-visited-in-order" }),
  activity({ id: "ecoli.activity.find-genetic-material", title: "Find my genetic material", behaviorId: LEARNING_BEHAVIORS.isolate.id, behaviorType: BEHAVIOR_TYPES.ISOLATE, narration: "Find my chromosome without looking for a nucleus. Then check whether this representative cell shows optional plasmid DNA.", hotspotIds: ["ecoli.hotspot.nucleoid", "ecoli.hotspot.plasmid"], steps: [
    { id: "nucleoid", action: "isolate", targetSemanticPartIds: [SEMANTIC_PART_IDS.NUCLEOID_CHROMOSOMAL_DNA], narration: "My chromosome occupies a nucleoid region with no enclosing membrane." },
    { id: "plasmid", action: "isolate-if-present", targetSemanticPartIds: [SEMANTIC_PART_IDS.PLASMID_DNA], narration: "This model may show plasmid DNA, but plasmids are not universal in E. coli." },
  ], completion: "all-present-targets-visited" }),
  activity({ id: "ecoli.activity.compare-appendages", title: "Compare optional appendages", behaviorId: LEARNING_BEHAVIORS.isolate.id, behaviorType: BEHAVIOR_TYPES.ISOLATE, narration: "Compare appendages that some strains express. Their presence and number can change with strain and growth conditions.", hotspotIds: ["ecoli.hotspot.flagellum", "ecoli.hotspot.fimbriae", "ecoli.hotspot.conjugative-pilus"], steps: [
    { id: "flagellum", action: "isolate-if-present", targetSemanticPartIds: [SEMANTIC_PART_IDS.FLAGELLUM], narration: "A flagellum can rotate to help me swim." },
    { id: "fimbriae", action: "isolate-if-present", targetSemanticPartIds: [SEMANTIC_PART_IDS.FIMBRIAE], narration: "Many short fimbriae can help me attach." },
    { id: "pilus", action: "isolate-if-present", targetSemanticPartIds: [SEMANTIC_PART_IDS.CONJUGATIVE_PILUS], narration: "A conjugative pilus can participate in DNA transfer when the required genes are present." },
  ], completion: "all-present-targets-visited" }),
  activity({ id: "ecoli.activity.explode-and-rebuild", title: "Explode and rebuild my cell", behaviorId: LEARNING_BEHAVIORS.explode.id, behaviorType: BEHAVIOR_TYPES.EXPLODE, narration: "Spread my parts from my centre, then rebuild me. I am a cell without a nucleus or membrane-bound organelles.", hotspotIds: Object.keys(HOTSPOT_BY_ID), steps: [
    { id: "explode", action: "set-explode-factor", value: LEARNING_BEHAVIORS.explode.defaultFactor, narration: "Move each semantic part away from my centre while repeated details stay with their parent." },
    { id: "rebuild", action: "set-explode-factor", value: LEARNING_BEHAVIORS.explode.minFactor, narration: "Return every part to its original position." },
  ], completion: "steps-visited-in-order" }),
]);

export const ACTIVITY_BY_ID = Object.freeze(Object.fromEntries(ACTIVITIES.map((item) => [item.id, item])));
export function getActivity(id) { return ACTIVITY_BY_ID[id] ?? null; }
export function getRunnableActivities(ids) { const available = new Set(ids); return ACTIVITIES.filter((item) => item.steps.every((step) => !step.targetSemanticPartIds || step.action.endsWith("-if-present") || step.targetSemanticPartIds.every((id) => available.has(id)))); }
