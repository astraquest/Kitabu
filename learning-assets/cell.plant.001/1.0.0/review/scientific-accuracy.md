# Plant Cell Scientific Accuracy Review

## Decision

**Scientific contract approved for production, with conditional final acceptance.** The requested organelle set is coherent for a representative **mature photosynthetic leaf mesophyll cell**, but it must not be described as universal to all plant cells. Final approval depends on inspecting the rendered volumetric asset against the checks below.

This review evaluates the specification, not a completed model. No geometry, turntable, labels, or mobile render was available in the assigned review scope on 2026-07-27.

## Required anatomical reading

The strongest visual requirement is the compartment order. From outside inward, a viewer must be able to resolve **cell wall → plasma membrane → peripheral cytoplasm → tonoplast → vacuolar lumen**. A large central vacuole can occupy up to about 90% of a mature vegetative plant cell, so a biologically credible cell cannot present the cytoplasm as a uniform full-volume gel with organelles floating throughout it. The contract uses a 65–85% modeling target as an explicit visibility compromise, not as a universal measurement.

The nucleus, chloroplasts, mitochondria, ER, Golgi stacks, ribosomes, and peroxisomes belong in the connected cytoplasmic compartment. A peripheral or slightly compressed nucleus is appropriate because the vacuole dominates the interior. The nuclear envelope must be double, the nucleolus must remain inside it, and continuity between outer nuclear membrane and ER should be spatially credible.

Chloroplasts must be double-envelope organelles containing stroma and a separate thylakoid membrane system. Grana are stacks within that system, ideally connected by stroma/intergranal lamellae. The chloroplast inner envelope must not be folded into cristae. Mitochondria must instead show a double membrane with the **inner** membrane forming cristae into the matrix.

Plant ER should read as a network of tubules and cisternae in peripheral cytoplasm and, if modeled, transvacuolar strands. Rough ER ribosomes sit on its cytosolic face; free ribosomes occur in cytosol. Plant Golgi should appear as multiple dispersed stacks of flattened cisternae, rather than one giant perinuclear ribbon. Peroxisomes are small single-membrane organelles; positioning one near a chloroplast and mitochondrion is plausible for photosynthetic tissue, but the model must not imply that every organelle is permanently tethered in a fixed triad.

Plasmodesmata are only accurate if they cross a shared cell wall and establish continuity toward a neighboring cell. A magnified depiction should preserve plasma-membrane lining, central ER-derived desmotubule, and intervening cytosolic sleeve. A blind hole ending within one wall is not a plasmodesma. Because plasmodesmata are below ordinary light-microscope resolution, an enlarged inset or enlarged local channel must be labeled as a didactic scale exaggeration.

## Final acceptance checklist

- [ ] The asset is a genuine 3D cutaway with closed, inspectable rear/side/top/bottom geometry rather than a relief or billboard.
- [ ] Cell wall and plasma membrane are separately modeled in the correct outside-to-inside order.
- [ ] The central vacuole is the dominant volume and has a continuous tonoplast.
- [ ] No cytoplasmic organelle intersects or floats inside the vacuolar lumen.
- [ ] Cytoplasm forms a connected peripheral layer, with only plausible transvacuolar strands crossing the vacuolar region.
- [ ] Nucleus has a double envelope and internal nucleolus and lies in cytoplasm.
- [ ] At least one chloroplast cutaway distinguishes envelope, stroma, thylakoids, grana, and connecting lamellae.
- [ ] At least one mitochondrion cutaway distinguishes outer membrane, inner membrane/cristae, intermembrane space, and matrix.
- [ ] ER is a network; rough ER ribosomes face cytosol; Golgi occurs as dispersed cisternal stacks.
- [ ] Peroxisomes are single-membrane structures without cristae or grana.
- [ ] Any plasmodesmata traverse a shared wall into neighboring-cell context; otherwise they are omitted or shown in a scientifically labeled inset.
- [ ] Labels use granum/grana and crista/cristae correctly and distinguish tonoplast from plasma membrane.
- [ ] The UI or legend discloses enlarged ultrastructure and does not imply literal common scale.
- [ ] A 360-degree orbit and cut-plane inspection reveal no hidden compartment violations.

## Automatic rejection conditions

Reject the asset if any of the following is observed:

- a flat poster, shallow relief, or front-only shell presented as a volumetric cell;
- absence or inversion of the cell wall/plasma membrane layers;
- organelles placed inside the vacuolar lumen;
- grana depicted as mitochondrial cristae, or cristae placed inside chloroplasts;
- nucleolus outside the nucleus or a nucleus with no enclosing envelope;
- tonoplast mislabeled as plasma membrane;
- plasmodesmata represented as large open wall tunnels or blind pores;
- claims that all plant cells have this organelle complement, shape, count, or proportion;
- generated imagery used as the acceptance authority for scientific anatomy.

## Evidence reviewed

1. Cooper GM, *The Cell: A Molecular Approach*, “The Origin and Evolution of Cells,” NCBI Bookshelf (2000): plant/eukaryotic boundaries and major organelles. https://www.ncbi.nlm.nih.gov/books/NBK9841/
2. Alberts B et al., *Molecular Biology of the Cell*, “Chloroplasts and Photosynthesis,” NCBI Bookshelf (2002): peripheral cytoplasm around a large vacuole; chloroplast envelope, stroma, and thylakoids. https://www.ncbi.nlm.nih.gov/books/NBK26819/
3. Dünser K et al., “To Lead or to Follow: Contribution of the Plant Vacuole to Cell Growth,” *Frontiers in Plant Science* (2020): the vacuole as the largest organelle, occupying up to 90% of cellular volume in vegetative tissue. https://pmc.ncbi.nlm.nih.gov/articles/PMC7227418/
4. Rojo E, Denecke J, “The Secretory System of Arabidopsis,” *The Arabidopsis Book* (2008): central vacuole, tonoplast, and plant secretory system. https://pmc.ncbi.nlm.nih.gov/articles/PMC3243370/
5. Cooper GM, *The Cell: A Molecular Approach*, NCBI Bookshelf glossary: nuclear envelope, nuclear-membrane/ER continuity, nucleolus, and ribosome terminology. https://www.ncbi.nlm.nih.gov/books/NBK9926/
6. Cooper GM, “Chloroplasts and Other Plastids,” NCBI Bookshelf (2000): chloroplast double envelope and thylakoid organization. https://www.ncbi.nlm.nih.gov/books/NBK9905/
7. Cooper GM, “Mitochondria,” NCBI Bookshelf (2000): double membranes, matrix, intermembrane space, and inner-membrane cristae. https://www.ncbi.nlm.nih.gov/books/NBK9896/
8. Burch-Smith TM et al., “Communicating Across Cell Walls: Structure, Evolution, and Regulation of Plasmodesmatal Transport in Plants” (2025): plasma-membrane continuity, ER-derived desmotubule, cytosolic sleeve, and resolution limits. https://pmc.ncbi.nlm.nih.gov/articles/PMC12147918/
9. Brandizzi F, “Transport from the endoplasmic reticulum to the Golgi in plants: Where are we now?” *Seminars in Cell & Developmental Biology* (2018): plant ER morphology and dispersed, motile Golgi stacks. https://pmc.ncbi.nlm.nih.gov/articles/PMC5756139/
10. Bobik K, Burch-Smith TM, “Chloroplast signaling within, between and beyond cells,” *Frontiers in Plant Science* (2015): peroxisomes are membrane-bound and commonly associate with chloroplasts and mitochondria in photosynthetic metabolism. https://pmc.ncbi.nlm.nih.gov/articles/PMC4593955/

Sources were accessed 2026-07-27. ImageGen outputs and other synthetic reference views were excluded as scientific evidence.

## Limitations and unresolved choices

- Organelle numbers, shapes, vacuole fraction, chloroplast abundance, and wall thickness vary by species, tissue, developmental stage, light environment, and physiological state. This asset is an archetype, not a quantitative reconstruction of a named specimen.
- Cell membranes, ribosomes, plasmodesmata, thylakoids, cristae, and nuclear pores span incompatible physical scales. A single explorable model must exaggerate some features; the exaggeration must be disclosed.
- A single isolated-cell cutaway cannot fully represent plasmodesmata because they are intercellular structures. A neighboring-cell fragment or magnified inset is scientifically preferable.
- The contract does not require starch grains, plastoglobules, cytoskeleton, microtubules, actin, mitochondria/chloroplast DNA, vesicle subclasses, or molecular membrane composition. Their omission is acceptable at this learning level.
- Color is pedagogical, not intrinsic. Do not describe organelle colors as natural visible-light colors.
- Final scientific sign-off remains pending until the actual geometry, label anchors, cutaway behavior, and turntable evidence are reviewed.
