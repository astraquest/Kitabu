# Reference library source and reuse policy

Date reviewed: 2026-08-04

## Scope and confirmed requirements

- Extract all available PP2, Grade 2, Grade 4, Grade 5, and Grade 6 homework and assessment learning content after PP1.
- Preserve corrected semantic content, tables, prompts, answer structures, visual requirements, and template guidance rather than exact page reproduction.
- Prefer an existing suitable asset or open educational resource over generated artwork.
- Keep raw source photographs, EXIF/GPS, publisher metadata, learner details, and other capture data out of the reference packages and database.
- Use the existing reference-library importer and schema; do not use the PDF importer or add a second storage system.
- Treat KITABU's existing Kenya CBC/KICD curriculum corpus as the alignment authority. External resources are supplementary patterns or assets, not a replacement curriculum.

## Candidate screen

| Candidate | Relevant use | License finding | Decision |
| --- | --- | --- | --- |
| [Noto Emoji](https://github.com/googlefonts/noto-emoji) | General objects, people, animals, places, symbols; SVG/PNG and monochrome coverage | Fonts use OFL 1.1; most image resources use Apache 2.0 | Primary reusable visual pack |
| [OpenMoji](https://www.openmoji.org/faq) | Child-friendly general-purpose color and black-line emoji/icons | CC BY-SA 4.0, including commercial use, with attribution and ShareAlike | Fallback when Noto has no suitable concept |
| [Mulberry Symbols](https://mulberrysymbols.org/) | Clear educational/AAC pictograms, including actions and classroom concepts | CC BY-SA 2.0 UK; commercial products allowed with attribution and ShareAlike | Preferred concept-symbol fallback |
| [ARASAAC](https://arasaac.org/terms-of-use) | Broad pictogram catalog | CC BY-NC-SA; commercial use excluded | Do not import without separate written authorization |
| [African Storybook](https://www.africanstorybook.org/terms.html) | African early-literacy stories and illustrations | Openly licensed, but some individual stories add a non-commercial restriction | Discovery only; require item-level license review before any use |
| [Global Digital Library](https://digitallibrary.io/about/developer/) | Early-grade reading and mathematics materials | Content is Creative Commons, but the exact license can vary by item | Discovery only; require item-level license review before any use |
| [Book Dash](https://bookdash.org/books/) | African early-literacy themes, wordless books, illustrations, editable sources | All Book Dash books are CC BY 4.0 and source files are offered | Preferred early-literacy supplementary source |
| [Siyavula open textbooks](https://www.siyavula.com/read) | Grade 4–6 Natural Sciences and Technology explanations, diagrams, and activity patterns | Unbranded EPUB editions are CC BY; branded PDFs are CC BY-ND and some titles are closed | Use only explicitly marked unbranded CC-BY editions |
| [PhET](https://phet.colorado.edu/en/licensing) | Mathematics and science simulations | Current regular HTML simulations are CC BY-NC 4.0 | Do not import into commercial KITABU materials |
| [Open Up Resources](https://access.openupresources.org/curricula/our6-8math-v1) | Grade 6 mathematics task and representation patterns | First edition is CC BY; current editions and assessments have tighter or excluded licensing | Use only clearly identified first-edition CC-BY material; never copy excluded assessments |

## Shortlist and subject/grade routing

Repository baselines checked for deterministic asset resolution:

- Noto Emoji commit `8998f5dd683424a73e2314a8c1f1e359c19e8742` (2025-09-12).
- Mulberry Symbols release `v3.6.0`, commit `5fdf6b90fd7c64573cc6bd7ae9e6687471710958` (2026-07-17).

1. Noto Emoji is the first lookup for a required object, animal, person, place, number-adjacent visual, religious symbol, or simple action across every grade and subject.
2. Mulberry Symbols is the second lookup for actions, feelings, routines, accessibility-friendly concepts, and classroom instructions. OpenMoji is the final general-icon fallback when its ShareAlike obligation is acceptable.
3. Book Dash may supply early-literacy themes or illustrations for PP2 and Grade 2 English, language, environmental, and life-skills activities when the exact work and creator attribution are retained.
4. Siyavula's unbranded CC-BY Grade 4–6 Natural Sciences and Technology editions may inform science, agriculture, environmental, and diagram patterns. They are not Kenyan curriculum authority and should not be copied wholesale.
5. Open Up Resources 6–8 Mathematics first edition may inform Grade 6 mathematical representations and task patterns. Grade 4–5 and all Kenyan alignment continue to use the user-owned references and KITABU's KICD corpus.

For languages, social studies, religious education, creative arts, and subjects without a strong reusable OER match, use the user-owned extracted learning content plus Noto/Mulberry/OpenMoji visuals. Generate an original image only when no shortlisted asset expresses the required concept clearly and age-appropriately.

## Integration boundary

- Do not clone or import whole third-party catalogs into KITABU.
- Resolve only the exact assets needed after each extracted document's visual requirements are known.
- Store selected files inside that document's `assets/` directory so the existing path-safe importer remains unchanged.
- Add a package-local `asset-sources.json` entry for every third-party asset: local asset key, upstream project and item, canonical URL, upstream revision or release when available, creator, exact license, required attribution, original checksum, packaged checksum, and transformation notes.
- Fail package validation when a third-party asset is missing provenance, has a non-commercial or NoDerivatives restriction, or lacks a stable license statement.
- Generated assets must be labeled `generated-original`, include the generation prompt/category, and be used only after the shortlist misses.

## Validation checkpoints

1. Reinspect every source photograph and reconcile page numbering and subjects.
2. Validate corrected page/activity JSON and asset requirements before acquisition.
3. Match each visual requirement against the shortlist in order and record misses.
4. Validate asset licenses, attribution, checksums, and package-relative paths.
5. Run importer dry-run, real import, and an unchanged zero-write repeat.
6. Verify database counts, authenticated retrieval, backups, exact release identity, service health, and protected public routes.
