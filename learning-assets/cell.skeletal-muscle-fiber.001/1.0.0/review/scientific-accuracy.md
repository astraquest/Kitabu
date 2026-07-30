# Skeletal muscle fiber scientific-accuracy review

## Verdict

**Status: conditional until the final bundled model and evidence renders are available.** The contract is suitable for a volumetric learning-scale cutaway of a healthy mature mammalian skeletal muscle fiber. It must not be approved from a hero view, an illustration, or generated turnaround images alone.

The model is scientifically acceptable only if it depicts one elongated multinucleated cell enclosed by a continuous sarcolemma; peripheral intracellular myonuclei; densely packed parallel myofibrils with coherent sarcomere striations; a distinct SR/T-tubule triad; plausible mitochondria; and an extracellular capillary. The cutaway, semantic colors, spacing, and cross-scale enlargements must be disclosed as schematic.

## Mandatory final-model review

Review the exact hash-bound runtime from front, rear, left, right, top, bottom, front three-quarter, and rear three-quarter views. Add close-ups of the cut edge, one peripheral nucleus, one banded myofibril, one triad, mitochondria in context, and the capillary-sarcolemma relationship.

| System | Pass criteria | Block publication when |
| --- | --- | --- |
| Whole fiber | One real cylindrical cell segment with continuous volume and a deliberate cutaway; back, sides, ends, and cut edges remain modelled. | It is a billboard, shallow relief, hollow tube without sarcoplasm, front-detailed shell, or bundle mistaken for one cell. |
| Sarcolemma | Continuous outer cellular membrane with readable cut-edge thickness; encloses every intracellular structure. | Accidental holes appear, membrane is an external decorative stripe, or a T-tubule is disconnected from it. |
| Myonuclei | Multiple elongated/flattened nuclei inside and immediately beneath the sarcolemma, spaced along the mature fiber. | There is one central nucleus, nuclei lie outside the membrane, or satellite-cell nuclei are labelled as myonuclei. |
| Sarcoplasm | Continuous intracellular matrix in modest interfibrillar and peripheral spaces. | Interior is empty, flooded with exaggerated open space, or sarcoplasm is rendered outside the membrane. |
| Myofibrils | Many dense parallel cylinders run along the fiber axis; striations approximately register transversely. | Myofibrils are random, radial, sparse, disconnected beads, or replaced by stripes painted only on the surface. |
| Sarcomeres | Repeating Z-disc-to-Z-disc units resolve the learning-scale order Z / half-I / A / half-I / Z. | Decorative stripes lack repeat logic, Z discs do not define unit boundaries, or A and I bands are swapped. |
| SR | Connected longitudinal tubules surround myofibrils and expand into terminal cisternae. | The SR is an opaque sleeve, isolated loops, outside the cell, or visually fused with the T-tubule lumen. |
| T-tubule and triad | One transverse sarcolemmal invagination is flanked by two distinct SR terminal cisternae at an A-I junction in the adult mammalian reference model. | The labelled triad is a dyad, three identical tubes, disconnected from both membrane systems, or positioned with no sarcomere landmark. |
| Mitochondria | Several representative organelles occupy interfibrillar and/or subsarcolemmal spaces; distribution is visibly selective rather than uniform. | They sit inside myofibrils or capillary lumen, form a uniform carpet, or imply identical abundance across fiber types. |
| Capillary | A separate extracellular vessel follows the outer surface and may occupy a shallow sarcolemmal groove while retaining a lumen and wall. | It enters the sarcoplasm, crosses myofibrils, or is confused with a T-tubule. |
| Contraction state | Z discs approach, Z-to-Z distance and I-band width decrease, and A-band width remains constant; filament overlap increases without filament shortening. | A band or filaments shrink, band order changes, or the animation is presented as quantitatively predictive. |

## Stable semantic IDs

The following IDs are approved for geometry, picking, hotspots, and authored scene bindings:

- `muscle-fiber`
- `sarcolemma`
- `myonucleus`
- `sarcoplasm`
- `myofibril`
- `sarcomere`
- `z-disc`
- `a-band`
- `i-band`
- `sarcoplasmic-reticulum`
- `t-tubule`
- `terminal-cisterna`
- `triad`
- `mitochondrion`
- `capillary`

Do not rename an ID to match a grade-specific term. Learner wording belongs in a scene definition. Keep `terminal-cisterna`, `t-tubule`, and `sarcoplasmic-reticulum` independently pickable even when the parent hotspot is `triad`.

## Contraction limitations

Any contraction control is an illustrative sliding-filament comparison, not a force-producing simulation. Preserve A-band width. Narrow the I bands and reduce Z-disc spacing. If the H zone is present, it may narrow. Do not shorten actin or myosin filaments, peel the cutaway open physiologically, or suggest that nuclei, mitochondria, SR, or T-tubules are contractile material. Timing, displacement, calcium release, and whole-fiber thickening are qualitative unless separately validated against a declared quantitative model.

## Scale and representation limits

The asset combines structures whose real dimensions differ by orders of magnitude. Sarcolemma thickness, T-tubule and SR membranes, sarcomere bands, mitochondria, nuclei, myofibrils, fiber diameter, and capillary diameter cannot all be both literal and legible in one mobile cutaway. Enlarge membranes and the representative triad, separate tightly packed structures, and reduce repeated counts only with an always-available “schematic; not to scale” disclosure.

Colors are semantic, not native tissue colors. A smooth cylindrical segment is a teaching abstraction: real fibers vary in diameter, length, shape, fiber type, mitochondrial content, and capillary relationships. The asset adopts the adult mammalian A-I-junction triad convention; this is not universal across vertebrate groups or development. Central nuclei are not shown as the normal state here, though they can appear during development, regeneration, loading responses, and disease.

The capillary is part of the surrounding microvascular network, not an intracellular organelle and not necessarily dedicated to one fiber. Basal lamina, endomysium, satellite cells, neuromuscular junction, molecular filament lattice, costameres, M line, and H zone may be omitted; omission must not be mistaken for absence.

## Reference and evidence policy

Generated front, rear, side, top, bottom, or three-quarter views are `synthetic-hypothesis` evidence. They can guide construction and expose inconsistencies, but cannot establish unseen anatomy or pass scientific review. Final acceptance must trace structure claims to microscopy or peer-reviewed anatomical evidence and must inspect the exact bundled model from all eight required directions.

The img2threejs local `core_3d` specification search returned no skeletal-muscle-specific records for this contract. Consequently, no local cache was treated as anatomy evidence. Procedural geometry decisions remain subordinate to the sources below and to final subject-matter review.

## Evidence basis

- Sarcomere organization and the rule that I/H regions narrow while A-band width remains unchanged during shortening: [Squire, *Muscle Contraction*](https://pmc.ncbi.nlm.nih.gov/articles/PMC5793755/) and the landmark primary report [Huxley & Hanson, 1954](https://pubmed.ncbi.nlm.nih.gov/13165698/).
- T-tubule continuity with the sarcolemma and the triad as one T-tubule plus two SR terminal cisternae: [Al-Qusairi & Laporte, 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3156648/) and [Rossi et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9026860/).
- Peripheral myonuclei beneath the sarcolemma in healthy adult mammalian fibers: [Hastings et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7204059/).
- Capillaries may occupy extracellular grooves closely apposed to the sarcolemma, with associated peripheral spaces for nuclei and mitochondria: [Glancy et al., 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4185432/).
- Interfibrillar, subsarcolemmal, and paravascular mitochondrial regions differ in morphology and context, so one uniform mitochondrial pattern is misleading: [Parry et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11068488/).

## Outstanding evidence required before approval

- Hash-bound eight-view turntable renders from one runtime build.
- Close-up proving the triad is three-part and correctly connected.
- Close-up proving myonuclei are inside the sarcolemma rather than external cells.
- Section view proving the capillary remains extracellular.
- Relaxed-versus-contracted comparison proving A-band constancy and I-band narrowing.
- Geometry audit for the cut edge, rear interior, attachments, and all semantic part IDs.
- Mobile inspection at 390 × 844 confirming the not-to-scale disclosure and critical structures remain legible.
- Independent scientific review of the rendered final model; this document reviews the contract, not yet the finished geometry.
