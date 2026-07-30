/**
 * Learner-facing anchors for the mature neutrophil model.
 *
 * Coordinates are model-local: +X right, +Y up and +Z toward the viewer in
 * the default pose. `semanticPartId` is the durable link to model geometry;
 * labels and positions may be refined without changing that identity.
 */

function hotspot(definition) {
  const position = Object.freeze([...definition.position]);

  return Object.freeze({
    ...definition,
    position,
    anchor: Object.freeze({ position }),
  });
}

export const HOTSPOTS = Object.freeze([
  hotspot({
    id: "plasma-membrane",
    semanticPartId: "plasma-membrane",
    label: "Cell membrane",
    title: "Deformable cell membrane",
    category: "movement",
    summary: "I reshape my flexible boundary to crawl and squeeze through narrow tissue spaces.",
    position: [1.32, 0.28, 0.34],
  }),
  hotspot({
    id: "cytoplasm",
    semanticPartId: "cytoplasm",
    label: "Cytoplasm",
    title: "Cytoplasm",
    category: "cell-interior",
    summary: "My cytoplasm carries granules, vesicles and stored fuel where I can use them quickly.",
    position: [0.64, 0.46, 0.64],
  }),
  hotspot({
    id: "nucleus",
    semanticPartId: "nucleus",
    label: "Nucleus",
    title: "Connected multi-lobed nucleus",
    category: "cell-interior",
    summary: "My mature nucleus is divided into connected lobes that fit through tight tissue spaces.",
    position: [-0.38, 0.14, 0.3],
  }),
  hotspot({
    id: "nuclear-lobes",
    semanticPartId: "nuclear-lobes",
    label: "Multi-lobed nucleus",
    title: "Nuclear lobes",
    category: "cell-interior",
    summary: "My nuclear lobes form a flexible chain rather than separate nuclei.",
    position: [-0.62, 0.28, 0.38],
  }),
  hotspot({
    id: "chromatin-bridges",
    semanticPartId: "chromatin-bridges",
    label: "Chromatin bridges",
    title: "Thin chromatin bridges",
    category: "cell-interior",
    summary: "My thin chromatin bridges keep the nuclear lobes connected as I change shape.",
    position: [-0.22, -0.04, 0.48],
  }),
  hotspot({
    id: "azurophilic-granules",
    semanticPartId: "azurophilic-granules",
    label: "Primary granules",
    title: "Primary (azurophilic) granules",
    category: "defence",
    summary: "My primary granules carry myeloperoxidase and powerful enzymes that help destroy engulfed microbes.",
    position: [0.4, -0.34, 0.76],
  }),
  hotspot({
    id: "specific-granules",
    semanticPartId: "specific-granules",
    label: "Secondary granules",
    title: "Secondary (specific) granules",
    category: "defence",
    summary: "My secondary granules deliver lactoferrin and antimicrobial proteins during an immune response.",
    position: [0.82, 0.12, -0.3],
  }),
  hotspot({
    id: "glycogen-stores",
    semanticPartId: "cytoplasm",
    label: "Glycogen stores",
    title: "Glycogen fuel stores",
    category: "energy",
    summary: "I store glycogen to fuel glycolysis, even in inflamed places where oxygen may be scarce.",
    position: [0.1, -0.72, 0.16],
  }),
  hotspot({
    id: "transport-vesicles",
    semanticPartId: "cytoplasm",
    label: "Transport vesicles",
    title: "Secretory transport vesicles",
    category: "response",
    summary: "My transport vesicles move receptors and extra membrane to my surface when I become activated.",
    position: [1.02, -0.42, -0.2],
  }),
]);

export function getHotspot(hotspotId) {
  return HOTSPOTS.find(({ id }) => id === hotspotId) ?? null;
}
