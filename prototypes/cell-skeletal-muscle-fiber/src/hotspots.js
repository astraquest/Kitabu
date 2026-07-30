const MODES = Object.freeze(["orbit", "longitudinal", "cross-section"]);

function freezeHotspot(hotspot) {
  const localOffset = Object.freeze([...(hotspot.anchor?.localOffset ?? [0, 0, 0])]);
  return Object.freeze({
    ...hotspot,
    label: hotspot.title,
    summary: hotspot.narration,
    semanticPartId: hotspot.semanticId,
    position: localOffset,
    modes: Object.freeze([...hotspot.modes]),
    anchor: Object.freeze({
      semanticId: hotspot.semanticId,
      nodeId: hotspot.targetNodeId,
      localOffset,
    }),
  });
}

/**
 * Scene-owned learning copy keyed to model-owned semantic IDs.
 *
 * The renderer should resolve `anchor.semanticId` through the model's semantic
 * node map. Local offsets are deliberately small and model-relative; they are
 * hints for label placement, not world-space coordinates.
 */
export const HOTSPOTS = Object.freeze(
  [
    {
      id: "hotspot.muscle-fiber",
      semanticId: "muscle-fiber",
      targetNodeId: "skeletal-muscle-fiber",
      layerId: null,
      title: "Muscle fiber",
      narration: "I am one long skeletal muscle fiber, a single cell containing many nuclei.",
      modes: ["orbit"],
    },
    {
      id: "hotspot.sarcolemma",
      semanticId: "sarcolemma",
      targetNodeId: "sarcolemma",
      layerId: "layer.sarcolemma",
      title: "Sarcolemma",
      narration: "I am the sarcolemma, the plasma membrane around this muscle fiber.",
      modes: ["orbit", "cross-section"],
      anchor: { localOffset: [0.03, 0, 0] },
    },
    {
      id: "hotspot.myonucleus",
      semanticId: "myonucleus",
      targetNodeId: "myonucleus",
      layerId: "layer.nuclei",
      title: "Myonucleus",
      narration: "I am one of many nuclei, usually tucked beneath the sarcolemma near the fiber edge.",
      modes: ["orbit", "cross-section"],
      anchor: { localOffset: [0.02, 0.01, 0] },
    },
    {
      id: "hotspot.sarcoplasm",
      semanticId: "sarcoplasm",
      targetNodeId: "sarcoplasm",
      layerId: "layer.sarcoplasm",
      title: "Sarcoplasm",
      narration: "I am the cytoplasm surrounding the fiber's contractile structures.",
      modes: ["cross-section"],
    },
    {
      id: "hotspot.myofibril",
      semanticId: "myofibril",
      targetNodeId: "myofibril",
      layerId: "layer.myofibrils",
      title: "Myofibril",
      narration: "I am one of many parallel contractile cylinders built from repeating sarcomeres.",
      modes: ["longitudinal", "cross-section"],
    },
    {
      id: "hotspot.sarcomere",
      semanticId: "sarcomere",
      targetNodeId: "sarcomere",
      layerId: "layer.sarcomeres",
      title: "Sarcomere",
      narration: "I am a repeating contractile unit that runs from one Z disc to the next.",
      modes: ["longitudinal"],
    },
    {
      id: "hotspot.z-disc",
      semanticId: "z-disc",
      targetNodeId: "z-disc",
      layerId: "layer.sarcomeres",
      title: "Z disc",
      narration: "I mark a sarcomere boundary and anchor thin filaments.",
      modes: ["longitudinal"],
    },
    {
      id: "hotspot.a-band",
      semanticId: "a-band",
      targetNodeId: "a-band",
      layerId: "layer.sarcomeres",
      title: "A band",
      narration: "I span the full length of the thick filaments, so my width stays nearly constant during shortening.",
      modes: ["longitudinal"],
    },
    {
      id: "hotspot.i-band",
      semanticId: "i-band",
      targetNodeId: "i-band",
      layerId: "layer.sarcomeres",
      title: "I band",
      narration: "I contain thin filaments without thick-filament overlap, so I narrow as the sarcomere shortens.",
      modes: ["longitudinal"],
    },
    {
      id: "hotspot.sarcoplasmic-reticulum",
      semanticId: "sarcoplasmic-reticulum",
      targetNodeId: "sarcoplasmic-reticulum",
      layerId: "layer.sarcoplasmic-reticulum",
      title: "Sarcoplasmic reticulum",
      narration: "I wrap around myofibrils and store calcium ions for contraction.",
      modes: ["longitudinal", "cross-section"],
    },
    {
      id: "hotspot.t-tubule",
      semanticId: "t-tubule",
      targetNodeId: "t-tubule",
      layerId: "layer.t-tubules",
      title: "T-tubule",
      narration: "I am a fold of the sarcolemma that carries excitation deep into the fiber.",
      modes: ["longitudinal", "cross-section"],
    },
    {
      id: "hotspot.terminal-cisterna",
      semanticId: "terminal-cisterna",
      targetNodeId: "terminal-cisterna",
      layerId: "layer.sarcoplasmic-reticulum",
      title: "Terminal cisterna",
      narration: "I am an enlarged sarcoplasmic-reticulum sac beside a T-tubule.",
      modes: ["longitudinal", "cross-section"],
    },
    {
      id: "hotspot.triad",
      semanticId: "triad",
      targetNodeId: "triad",
      layerId: "layer.t-tubules",
      title: "Triad",
      narration: "I am one T-tubule between two terminal cisternae, positioned near an A-I junction.",
      modes: ["longitudinal", "cross-section"],
    },
    {
      id: "hotspot.mitochondrion",
      semanticId: "mitochondrion",
      targetNodeId: "mitochondrion",
      layerId: "layer.mitochondria",
      title: "Mitochondrion",
      narration: "I help supply energy and may sit between myofibrils or just beneath the sarcolemma.",
      modes: ["orbit", "longitudinal", "cross-section"],
    },
    {
      id: "hotspot.capillary",
      semanticId: "capillary",
      targetNodeId: "capillary",
      layerId: "layer.capillary",
      title: "Capillary",
      narration: "I run outside the muscle fiber, alongside its surface rather than inside its sarcoplasm.",
      modes: ["orbit", "cross-section"],
      anchor: { localOffset: [0.02, 0, 0] },
    },
  ].map(freezeHotspot),
);

const HOTSPOTS_BY_ID = new Map(HOTSPOTS.map((hotspot) => [hotspot.id, hotspot]));

export function getHotspotById(id) {
  return HOTSPOTS_BY_ID.get(id) ?? null;
}

export function getHotspotsForMode(mode) {
  if (!MODES.includes(mode)) return Object.freeze([]);
  return Object.freeze(HOTSPOTS.filter((hotspot) => hotspot.modes.includes(mode)));
}
