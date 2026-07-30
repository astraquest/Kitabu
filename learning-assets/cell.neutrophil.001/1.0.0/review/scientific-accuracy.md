# Scientific accuracy review — mature human neutrophil

## Verdict

**Approved for geometry authoring with stated limitations.** The asset should depict one mature, resting, circulating human neutrophil. Its identity must come from a deformable plasma-membrane boundary, granule-rich cytoplasm, and one segmented nucleus whose lobes remain joined by narrow chromatin-containing bridges. It must not look like a generic animal cell filled with oversized mitochondria, Golgi stacks and rough endoplasmic reticulum.

The authoritative machine-readable requirements and exact integration names are in `source/scientific-contract.json`.

## Defensible morphology

- In suspension, an unprimed human neutrophil is approximately spherical. A primary study measured a mean diameter of 10.39 ± 0.19 µm in 322 resting primary cells. The model may target 10.4 µm and allow modest biological/preparation variation rather than using the larger flattened diameter seen in a smear.
- The surface is a continuous plasma membrane over a deformable cortical cell. A subtle folded or microridged membrane reserve is appropriate. A rigid, glass-smooth ball or a spiky activated cell is not.
- The canonical nucleus should have three or four irregular, unequal lobes. Two to five is normal mature variation, but one asset should not attempt to display the entire population range at once.
- Nuclear lobes are parts of one nucleus. Direct FISH and live-cell microscopy describe thin DNA/chromatin-containing connectors between lobes; they can elongate during migration without separating. Floating purple beads would therefore be a hard scientific failure.
- The cytoplasm is densely granular. Primary/azurophilic and secondary/specific granules must both be present as intermingled, heterogeneous populations. Primary granules are associated with MPO, elastase and defensins; specific granules are associated with lactoferrin and NGAL. Their experimental size/density distributions overlap, so the model must not claim that every granule can be classified by size or color alone.
- Gelatinase/tertiary granules and secretory vesicles are biologically supported but are not required as separate prominent teaching targets for this version. If present, they should be lower-salience populations and described as a simplification of a heterogeneous continuum.
- Glycogen is justified only below the whole-cell visual scale. Electron microscopy of human leukocyte suspensions composed chiefly of neutrophils found roughly 20 nm particles. Do not add conspicuous glycogen spheres; use restrained microtexture or omit them.
- Mitochondria are not absent: live-cell studies demonstrate a functional mitochondrial network. However, neutrophils rely strongly on glycolysis, and mitochondrial ATP-generating activity is low relative to conventional oxidative cells. For this asset, mitochondria should be omitted from the core hotspot set or rendered as fine, low-salience high-detail anatomy—not as several large textbook beans.
- A mature neutrophil can retain a small Golgi region, but it is not identity-defining at this viewing scale. A prominent generic Golgi stack, rough-ER network or nucleolus would pull the model toward an immature or generic secretory-cell diagram and should be excluded.

## Required integration names

The manifest and runtime must expose these exact stable semantic IDs:

1. `plasma-membrane`
2. `cytoplasm`
3. `nucleus`
4. `nuclear-lobes`
5. `chromatin-bridges`
6. `azurophilic-granules`
7. `specific-granules`

`nucleus` is the logical aggregate parent of `nuclear-lobes` and `chromatin-bridges`. Runtime geometry may use `nuclear-lobe-1` through `nuclear-lobe-4` and `chromatin-bridge-1` through `chromatin-bridge-3` as child/debug names, but learner content should normally bind to the aggregate IDs. Granule IDs represent populations, not an individually named hotspot for every granule.

Optional, non-core semantic IDs are `gelatinase-granules`, `secretory-vesicles`, `glycogen-particles`, and `mitochondria`. Adding them does not permit them to dominate the visual hierarchy.

## Visual and geometry acceptance gate

- The intact cell remains volumetric and credible from front, rear, left, right, top, bottom and both three-quarter views.
- A cutaway may reveal internal anatomy, but it must not become the only complete-looking side of the asset.
- Every nuclear lobe connects continuously to its neighbor. No accidental gaps, floating lobes or identical bead-chain geometry.
- Both required granule populations occupy the cytoplasmic volume without penetrating the nucleus or cell boundary. Distribution should be irregular and all-around, not a decorative front-facing layer.
- The palette is explicitly a semantic teaching code. Azurophilic granules do not need to be literally azure in a living-cell rendering, and stain-dependent colors must not be presented as intrinsic.
- Membrane thickness, chromatin-bridge thickness and granule size may be exaggerated only enough for mobile legibility. The UI or metadata must disclose that the cutaway is not quantitatively to scale.
- The resting reference state has no pseudopod, phagosome, expelled granules or extracellular chromatin. Those require a separate activated-state configuration.

## Evidence reviewed

Primary and authoritative sources were prioritized:

1. Ekpenyong AE et al. *Mechanical deformation induces depolarization of neutrophils.* Science Advances 3, e1602536 (2017). [doi:10.1126/sciadv.1602536](https://doi.org/10.1126/sciadv.1602536) — resting spherical morphology, measured diameter and deformation of primary human neutrophils.
2. Morikis VA et al. *Atrial natriuretic peptide down-regulates neutrophil recruitment on inflamed endothelium by reducing cell deformability and resistance to detachment force.* Biorheology 52, 447–463 (2015). [doi:10.3233/BIR-15067](https://doi.org/10.3233/BIR-15067) — primary-cell micropipette mechanics and recovery after deformation.
3. Rice WG, Kinkade JM Jr, Parmley RT. *High resolution of heterogeneity among human neutrophil granules.* Blood 68, 541–555 (1986). [PubMed 3015286](https://pubmed.ncbi.nlm.nih.gov/3015286/) — primary versus specific granule markers, intact ultrastructure and overlapping heterogeneous populations.
4. Rørvig S et al. *Proteome profiling of human neutrophil granule subsets, secretory vesicles, and cell membrane.* Journal of Leukocyte Biology 94, 711–721 (2013). [doi:10.1189/jlb.1212619](https://doi.org/10.1189/jlb.1212619) — fractionated fresh human neutrophils, granule subsets, vesicles and membrane proteome.
5. Sanchez JA, Karni RJ, Wangh LJ. *FISH analysis of the relationship between chromosome location and nuclear morphology in human neutrophils.* Chromosoma 106, 168–177 (1997). [doi:10.1007/s004120050236](https://doi.org/10.1007/s004120050236) — heterochromatic lobes joined by thin DNA-containing filaments.
6. Campbell MS, Lovell MA, Gorbsky GJ. *Stability of nuclear segments in human neutrophils…* Journal of Leukocyte Biology 58, 659–666 (1995). [doi:10.1002/jlb.58.6.659](https://doi.org/10.1002/jlb.58.6.659) — three-to-five interconnected lobes and persistent thin connections during migration.
7. Shen C et al. *Nuclear segmentation facilitates neutrophil migration.* Journal of Cell Science 136, jcs260768 (2023). [doi:10.1242/jcs.260768](https://doi.org/10.1242/jcs.260768) — direct primary-human-neutrophil evidence for the functional relevance of segmentation.
8. Scott RB, Still WJS. *Glycogen in human peripheral blood leukocytes. II.* Journal of Clinical Investigation 47, 353–359 (1968). [doi:10.1172/JCI105731](https://doi.org/10.1172/JCI105731) — approximately 20 nm glycogen particles in neutrophil-rich preparations.
9. Fossati G et al. *The mitochondrial network of human neutrophils.* Journal of Immunology 170, 1964–1972 (2003). [doi:10.4049/jimmunol.170.4.1964](https://doi.org/10.4049/jimmunol.170.4.1964) — live-cell evidence that mitochondria are present and functional.
10. Maianski NA et al. *Functional characterization of mitochondria in neutrophils: a role restricted to apoptosis.* Cell Death & Differentiation 11, 143–153 (2004). [doi:10.1038/sj.cdd.4401320](https://doi.org/10.1038/sj.cdd.4401320) — low mitochondrial ATP-synthetic contribution and context for restrained visual prominence.
11. Al Jumaa MA, Dewitt S, Hallett MB. *Topographical interrogation of the living cell surface reveals its role in rapid cell shape changes during phagocytosis and spreading.* Scientific Reports 7, 9790 (2017). [doi:10.1038/s41598-017-09761-6](https://doi.org/10.1038/s41598-017-09761-6) — live-cell topography measurements and correlated electron microscopy supporting membrane wrinkles/microridges as a shape-change reservoir.

For an authoritative morphology cross-check, the American Society of Hematology Image Bank describes mature segmented neutrophils as having condensed chromatin, two to five lobes separated by thin filaments, pale cytoplasm and numerous specific granules: [Segmented neutrophil, image 60395](https://imagebank.hematology.org/image/60395/segmented-neutrophil).

## Limitations

- This is a representative resting cell, not a statement that all neutrophils have identical lobe counts, granule inventories, diameter or organelle topology.
- The highlighted two-granule scheme is pedagogical. Modern fractionation and proteomics show greater heterogeneity, including gelatinase granules and secretory vesicles.
- Smear appearance, electron microscopy, fluorescent labels and a living-cell cutaway do not share literal colors or dimensions. The renderer necessarily combines modalities.
- The glycogen study used preparations chiefly, not exclusively, composed of neutrophils; it supports only an optional/subvisual treatment.
- Mitochondrial abundance and topology are method- and state-sensitive. The defensible choice here is low salience, not a claim of absence.
- No source image or synthetic turnaround alone can prove hidden internal arrangement. Final acceptance still requires a subject-matter review of the exact eight-view render and cutaway produced from the registered runtime.
