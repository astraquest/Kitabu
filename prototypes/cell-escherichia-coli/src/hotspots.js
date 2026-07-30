export const HOTSPOT_SCHEMA_VERSION = "1.0.0";

export const SEMANTIC_PART_IDS = Object.freeze({
  OUTER_MEMBRANE_LPS: "outer_membrane_lps",
  PERIPLASM: "periplasm",
  PEPTIDOGLYCAN_SACCULUS: "peptidoglycan_sacculus",
  INNER_MEMBRANE: "inner_membrane",
  CYTOPLASM: "cytoplasm",
  NUCLEOID_CHROMOSOMAL_DNA: "nucleoid_chromosomal_dna",
  RIBOSOMES: "ribosomes",
  PLASMID_DNA: "plasmid_dna",
  FLAGELLUM: "flagellum",
  FIMBRIAE: "fimbriae",
  CONJUGATIVE_PILUS: "conjugative_pilus",
});

export const BEHAVIOR_TYPES = Object.freeze({ ISOLATE: "isolate", EXPLODE: "explode", PEEL: "peel" });
export const AVAILABILITY = Object.freeze({ CORE: "representative-core", OPTIONAL: "strain-or-condition-dependent" });

function hotspot(record) {
  return Object.freeze({ ...record, position: Object.freeze(record.position), behavior: Object.freeze(record.behavior) });
}

export const HOTSPOTS = Object.freeze([
  hotspot({ id: "ecoli.hotspot.outer-membrane-lps", semanticPartId: SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS, label: "Outer membrane and LPS", category: "Cell envelope", marker: "1", position: [2.4, .8, .45], availability: AVAILABILITY.CORE, summary: "My outer membrane is an extra protective barrier. Lipopolysaccharide, or LPS, is found in its outer leaflet.", accuracyNote: "LPS is part of the outer leaflet, not a separate shell.", behavior: { type: BEHAVIOR_TYPES.PEEL, peelLayer: 0, exposes: SEMANTIC_PART_IDS.PERIPLASM } }),
  hotspot({ id: "ecoli.hotspot.periplasm", semanticPartId: SEMANTIC_PART_IDS.PERIPLASM, label: "Periplasm", category: "Cell envelope", marker: "2", position: [2.18, .55, .72], availability: AVAILABILITY.CORE, summary: "My periplasm is the space between my outer and inner membranes. It contains my thin peptidoglycan layer and many proteins.", accuracyNote: "The periplasm is a compartment, not a membrane-bound organelle.", behavior: { type: BEHAVIOR_TYPES.PEEL, peelLayer: 1, exposes: SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS } }),
  hotspot({ id: "ecoli.hotspot.peptidoglycan", semanticPartId: SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS, label: "Thin peptidoglycan wall", category: "Cell envelope", marker: "3", position: [1.9, .35, .86], availability: AVAILABILITY.CORE, summary: "My thin peptidoglycan sacculus helps me keep my rod shape and resist bursting.", accuracyNote: "E. coli is Gram-negative; this wall is thin and lies within the periplasm.", behavior: { type: BEHAVIOR_TYPES.PEEL, peelLayer: 2, exposes: SEMANTIC_PART_IDS.INNER_MEMBRANE } }),
  hotspot({ id: "ecoli.hotspot.inner-membrane", semanticPartId: SEMANTIC_PART_IDS.INNER_MEMBRANE, label: "Inner membrane", category: "Cell envelope", marker: "4", position: [1.6, .1, .92], availability: AVAILABILITY.CORE, summary: "My inner membrane controls exchange with my cytoplasm and hosts many energy-producing reactions.", accuracyNote: "It surrounds cytoplasm, not a nucleus.", behavior: { type: BEHAVIOR_TYPES.PEEL, peelLayer: 3, exposes: SEMANTIC_PART_IDS.CYTOPLASM } }),
  hotspot({ id: "ecoli.hotspot.cytoplasm", semanticPartId: SEMANTIC_PART_IDS.CYTOPLASM, label: "Cytoplasm", category: "Inside the cell", marker: "5", position: [.8, -.3, .8], availability: AVAILABILITY.CORE, summary: "My cytoplasm contains the molecules and structures that keep me alive. I have no nucleus and no membrane-bound organelles.", accuracyNote: "Do not add a nucleus, mitochondria, chloroplasts, ER, or Golgi apparatus.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.INNER_MEMBRANE } }),
  hotspot({ id: "ecoli.hotspot.nucleoid", semanticPartId: SEMANTIC_PART_IDS.NUCLEOID_CHROMOSOMAL_DNA, label: "Nucleoid", category: "Genetic material", marker: "6", position: [-.35, .45, 1.02], availability: AVAILABILITY.CORE, summary: "My chromosome occupies a nucleoid region, but no membrane encloses it. The region contains DNA together with RNA and proteins.", accuracyNote: "The nucleoid is dynamic and is not a nucleus.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.CYTOPLASM } }),
  hotspot({ id: "ecoli.hotspot.ribosomes", semanticPartId: SEMANTIC_PART_IDS.RIBOSOMES, label: "Ribosomes", category: "Protein building", marker: "7", position: [-1.25, -.25, .92], availability: AVAILABILITY.CORE, summary: "My ribosomes build proteins. Their positions change as I grow, so this model shows a representative distribution.", accuracyNote: "No ribosome has a permanent fixed position.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.CYTOPLASM } }),
  hotspot({ id: "ecoli.hotspot.plasmid", semanticPartId: SEMANTIC_PART_IDS.PLASMID_DNA, label: "Plasmid DNA (optional)", category: "Genetic material", marker: "8", position: [1.05, .48, .82], availability: AVAILABILITY.OPTIONAL, summary: "I may carry plasmids: small DNA molecules separate from my chromosome. Not every E. coli cell has them.", accuracyNote: "Plasmid number, size, and genes vary by strain and conditions.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.CYTOPLASM } }),
  hotspot({ id: "ecoli.hotspot.flagellum", semanticPartId: SEMANTIC_PART_IDS.FLAGELLUM, label: "Flagellum (strain-dependent)", category: "Optional appendage", marker: "9", position: [-3.15, -1.05, .15], availability: AVAILABILITY.OPTIONAL, summary: "Some E. coli cells grow flagella that rotate and help them swim. Other strains or growth conditions may show few or none.", accuracyNote: "Flagella are not universal or continuously expressed.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS } }),
  hotspot({ id: "ecoli.hotspot.fimbriae", semanticPartId: SEMANTIC_PART_IDS.FIMBRIAE, label: "Fimbriae (strain-dependent)", category: "Optional appendage", marker: "10", position: [.15, 1.55, .25], availability: AVAILABILITY.OPTIONAL, summary: "Some E. coli cells grow many short fimbriae that help them attach to surfaces or host cells.", accuracyNote: "Fimbriae vary by strain and expression state and are distinct here from a conjugative pilus.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS } }),
  hotspot({ id: "ecoli.hotspot.conjugative-pilus", semanticPartId: SEMANTIC_PART_IDS.CONJUGATIVE_PILUS, label: "Conjugative pilus (optional)", category: "Optional appendage", marker: "11", position: [2.9, 1.6, -.15], availability: AVAILABILITY.OPTIONAL, summary: "A cell carrying suitable genes may make a conjugative pilus involved in DNA transfer. Many E. coli cells do not have one.", accuracyNote: "Terminology can overlap; this model distinguishes a conjugative pilus from adhesive fimbriae.", behavior: { type: BEHAVIOR_TYPES.ISOLATE, preserveContext: SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS } }),
]);

export const HOTSPOT_BY_ID = Object.freeze(Object.fromEntries(HOTSPOTS.map((item) => [item.id, item])));

export const LEARNING_BEHAVIORS = Object.freeze({
  isolate: Object.freeze({ id: "ecoli.behavior.isolate", type: BEHAVIOR_TYPES.ISOLATE, targetSource: "hotspot.semanticPartId", dimNonTargetsTo: .12, restoreOnExit: true }),
  explode: Object.freeze({ id: "ecoli.behavior.explode-cell", type: BEHAVIOR_TYPES.EXPLODE, originSemanticPartId: SEMANTIC_PART_IDS.CYTOPLASM, targetSemanticPartIds: Object.freeze(Object.values(SEMANTIC_PART_IDS)), layout: "scale-from-origin", minFactor: 1, maxFactor: 1.8, defaultFactor: 1.45, repeatedPartPolicy: "move-with-semantic-parent", restoreOnExit: true }),
  peel: Object.freeze({ id: "ecoli.behavior.peel-envelope", type: BEHAVIOR_TYPES.PEEL, mode: "ordered-visibility-or-clipping", orderedLayers: Object.freeze([SEMANTIC_PART_IDS.OUTER_MEMBRANE_LPS, SEMANTIC_PART_IDS.PERIPLASM, SEMANTIC_PART_IDS.PEPTIDOGLYCAN_SACCULUS, SEMANTIC_PART_IDS.INNER_MEMBRANE]), terminalReveal: SEMANTIC_PART_IDS.CYTOPLASM, cumulative: true, restoreOnExit: true }),
});

export function getHotspot(id) { return HOTSPOT_BY_ID[id] ?? null; }
export function getHotspotsForAvailableParts(ids) { const available = new Set(ids); return HOTSPOTS.filter((item) => available.has(item.semanticPartId)); }
