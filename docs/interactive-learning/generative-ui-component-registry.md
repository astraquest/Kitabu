# Kitabu AI Generative UI Component Registry

Status: compact discovery catalogue. The catalogue describes candidates; only an exact, validated version in the installed registry is runtime-available.

The [interactive-learning living reference](kitabu-interactive-learning-living-reference.md) is the current runtime authority. This document is retrieval metadata for reusable learning components across Grades 1-12.

## Retrieval contract

The model selects the smallest safe, versioned component that matches the approved activity, grade band, subject, learner input mode, device, connectivity, and accessibility needs. It returns a declarative tree with a stable `componentId`, exact `componentVersion`, and schema-validated typed props. It must never generate arbitrary executable UI, JavaScript, JSX, event handlers, hidden answers, grader configuration, or undeclared URLs.

The server resolves the exact `(componentId, componentVersion)` pair, validates the full tree and fallback, and owns grading, evidence, permissions, and durable state. Aliases and priorities are search metadata only; `latest` and silent version upgrades are invalid.

Each catalogue row is indexed by all seven fields below. A retrieval result should return the complete row plus the exact installed version candidate. If no candidate is installed, use an installed fallback or simpler renderer; do not invent a renderer.

## Catalogue

Rows are ordered by build priority and common usage: P01 is the first retrieval candidate. P01-P04 use four specialized `Installed (Wave 1)` lower-primary renderers. P05-P50 use the installed generic declarative sample renderer/fallback.

### First implementation wave: installed lower-primary renderers

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `trace-construct` | P01 | Build early pencil, shape, number, or letter control. | Give a bounded trace or construction path and emit progress and completion events. | G1-G3 / math, language, arts | Installed (Wave 1) | Trace a numeral or follow a shape path before writing. |
| `authored-interaction` | P02 | Present a lower-primary tap-based choice or manipulable activity authored by Kitabu. | Render typed choices, objects, targets, feedback, and a non-drag tap alternative. | G1-G3 / all lower-primary subjects | Installed (Wave 1) | Choose the object that belongs in a group. |
| `structured-response` | P03 | Capture a bounded numeric, text, or other typed response. | Render labelled inputs and submit an untrusted response for server-side grading. | G1-G6 / math, language, all | Installed (Wave 1) | Enter the number represented by a place-value model. |
| `classify-sort-match-rank` | P04 | Classify, pair, sort, or order items. | Use typed groups and explicit move or tap controls; emit bounded selections. | G1-G6 / all | Installed (Wave 1) | Match words to sounds or order numbers from least to greatest. |

### Lower-primary and common lesson components

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `picture-choice` | P05 | Make an early-grade concept accessible through familiar images. | Show a small typed choice set with labels, captions, and an accessible text mode. | G1-G3 / all | Implemented (generic sample renderer) | Choose which picture shows a living thing. |
| `number-manipulatives` | P06 | Represent counting, grouping, place value, or simple operations concretely. | Compose bounded units, tens, counters, or bars and submit the resulting representation. | G1-G4 / math | Implemented (generic sample renderer) | Build 24 with tens and ones. |
| `phonics-sound-match` | P07 | Connect sounds, letters, words, or pictures during early reading. | Pair typed graphemes or pictures with an optional reviewed audio prompt. | G1-G4 / English, Kiswahili, languages | Implemented (generic sample renderer) | Match /sh/ to the word and picture that contain it. |
| `vocabulary-picture-match` | P08 | Introduce and revisit concrete vocabulary. | Match words to definitions, categories, or reviewed images with a text-only path. | G1-G8 / languages, all | Implemented (generic sample renderer) | Match a classroom word to its meaning. |
| `reading-passage` | P09 | Present leveled fiction or nonfiction for independent reading. | Render structured text with glossary, scaling, and optional reviewed audio. | G1-G12 / languages, social studies, science | Implemented (generic sample renderer) | Read a short passage about local weather. |
| `sentence-builder` | P10 | Practise word order, clauses, or sentence formation. | Arrange bounded tokens with keyboard and explicit move controls. | G1-G8 / languages | Implemented (generic sample renderer) | Build “The child waters the plant.” |
| `handwriting-trace` | P11 | Practise formation after visual or motor tracing. | Guide bounded strokes and retain progress; provide a text or selection alternative. | G1-G4 / language, math | Implemented (generic sample renderer) | Trace a letter, then identify its sound. |
| `rich-text-content` | P12 | Explain a concept, instruction, worked reasoning, or feedback. | Render structured paragraphs, lists, math tokens, and citations as native text. | G1-G12 / all | Implemented (generic sample renderer) | Read the explanation before retrying a question. |
| `single-choice` | P13 | Check one claim or diagnose a known misconception. | Render typed radio options and submit the selected option. | G1-G12 / all | Implemented (generic sample renderer) | Choose the safe response to a classroom scenario. |
| `fill-gap` | P14 | Complete a bounded sentence, equation, or passage. | Render labelled slots with typed response constraints. | G1-G12 / language, math, science | Implemented (generic sample renderer) | Fill the missing operation in an addition sentence. |
| `worked-example` | P15 | Model ordered reasoning before independent practice. | Reveal authored steps with a show-all accessible control. | G1-G12 / all | Implemented (generic sample renderer) | Follow the steps for adding two two-digit numbers. |

### Mathematics and science

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `number-line` | P16 | Locate, compare, add, subtract, or reason about intervals. | Bound the scale and moves, expose text values, and submit the marked point. | G1-G12 / math, science | Implemented (generic sample renderer) | Place -3 and 2 on a number line. |
| `fraction-manipulative` | P17 | Represent, compare, combine, or invert fractions visually. | Use typed pieces or bars, then submit the constructed representation. | G1-G9 / math | Implemented (generic sample renderer) | Show two equivalent fractions. |
| `measurement-lab` | P18 | Measure or convert length, mass, time, area, volume, or units. | Present a bounded instrument with numeric and text reading controls. | G1-G9 / math, science | Implemented (generic sample renderer) | Read a ruler and convert centimetres to metres. |
| `equation-builder` | P19 | Construct a valid expression or equation from bounded tokens. | Validate grammar and order without executing remote code. | G4-G12 / math, science | Implemented (generic sample renderer) | Build an equation for a word problem. |
| `data-table-chart` | P20 | Inspect data or create a bounded table, bar, line, or pie chart. | Keep the table as the accessible source and bind edits to typed cells. | G3-G12 / math, science, business | Implemented (generic sample renderer) | Turn rainfall observations into a bar chart. |
| `labelled-science-diagram` | P21 | Identify structures, apparatus, processes, or cycles in 2D. | Use reviewed diagrams with hotspot labels mirrored in a list/table mode. | G1-G12 / science, health | Implemented (generic sample renderer) | Label the parts of a plant. |
| `observation-table` | P22 | Record measurements or qualitative observations. | Provide bounded columns, units, row limits, drafts, and server submission. | G1-G12 / science, agriculture | Implemented (generic sample renderer) | Record seed height across five days. |
| `virtual-lab` | P23 | Manipulate a bounded apparatus when a real demonstration is unavailable. | Expose authored controls and observations with a static procedure fallback. | G4-G12 / science, math | Implemented (generic sample renderer) | Change resistance and observe a circuit reading. |
| `glb-3d-model-viewer` | P24 | Use depth, hidden surfaces, scale, or spatial relationships to teach a concept. | Load an exact reviewed GLB asset, allow bounded orbit and hotspots, and provide a static 2D fallback. | G1-G12 / science, geography, arts, agriculture | Implemented (generic sample renderer) | Inspect a GLB model of a flower and identify its parts. |
| `specimen-3d-explorer` | P25 | Explore a reviewed biological, geological, or cultural specimen. | Use authored Explore, Identify, and Explain modes with a 2D or text fallback. | G3-G12 / science, social studies | Implemented (generic sample renderer) | Identify features of a rock specimen. |

### Language, social studies, and digital literacy

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `comprehension-questions` | P26 | Ask literal, inferential, vocabulary, or evidence questions against a passage. | Bind typed questions to a passage reference and collect bounded responses. | G1-G12 / languages, all | Implemented (generic sample renderer) | Select evidence that supports an inference. |
| `scribble-sign-doodle-canvas` | P27 | Capture bounded freehand movement, a sign, doodle, diagram, or annotation. | Accept capped strokes with undo and clear; save an opaque reference, not executable content. | G1-G12 / language, math, science, arts | Implemented (generic sample renderer) | Sign a name or sketch the path of a river. |
| `draw-annotate-canvas` | P28 | Draw or annotate a reviewed prompt when freehand response is the objective. | Use bounded strokes and optional labels with touch, mouse, stylus, and text alternatives. | G1-G12 / arts, science, math | Implemented (generic sample renderer) | Annotate the force direction on a diagram. |
| `map-explorer` | P29 | Explore location, distance, route, or spatial patterns. | Use a cached bounded map with layers and a searchable marker list; no live tiles required. | G1-G12 / geography, social studies, science | Implemented (generic sample renderer) | Find a county and compare its rainfall. |
| `history-timeline` | P30 | Sequence events, people, or periods with concise evidence. | Render authored events in a list and optional ordered timeline. | G3-G12 / history, social studies | Implemented (generic sample renderer) | Put independence milestones in order. |
| `primary-source-analysis` | P31 | Analyse claim, evidence, perspective, or reliability in a source. | Show reviewed source text or OCR and collect structured annotations. | G7-G12 / history, social studies, languages | Implemented (generic sample renderer) | Identify a source’s claim and supporting evidence. |
| `hardware-labeling` | P32 | Identify computer hardware and relate parts to functions. | Use a reviewed diagram with a searchable list mode. | G1-G8 / computer studies | Implemented (generic sample renderer) | Match a keyboard, screen, and mouse to their uses. |
| `block-code-trace` | P33 | Predict a result from bounded blocks or pseudocode. | Treat blocks as data for ordering and tracing; never execute model-provided code. | G3-G9 / computer studies, math | Implemented (generic sample renderer) | Order blocks to move a character three steps. |
| `digital-citizenship-scenario` | P34 | Practise privacy, safety, and responsible online choices. | Present an authored scenario and consequence cards without shame or hidden policy. | G3-G12 / computer studies, life skills | Implemented (generic sample renderer) | Choose what to do when a stranger requests a password. |

### Business, agriculture, health, arts, and life skills

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `budget-planner` | P35 | Allocate bounded income to needs, wants, savings, or goals. | Use a table and numeric controls; calculate and grade totals server-side. | G5-G12 / business, math, life skills | Implemented (generic sample renderer) | Balance a household budget without exceeding income. |
| `accounting-ledger` | P36 | Classify transactions or enter a bounded ledger. | Render table rows and calculate balances on the server; never expose grading rules. | G8-G12 / accounting, business | Implemented (generic sample renderer) | Record a cash purchase and update the balance. |
| `crop-life-cycle` | P37 | Sequence crop stages and connect conditions to growth. | Use reviewed images or text stages with an ordered list alternative. | G1-G8 / agriculture, science | Implemented (generic sample renderer) | Order maize growth stages. |
| `nutrition-plate-builder` | P38 | Compose a culturally appropriate meal across food groups. | Select bounded food items and portions with a text/table alternative. | G1-G9 / health, home science, agriculture | Implemented (generic sample renderer) | Build a balanced lunch plate. |
| `health-anatomy-diagram` | P39 | Identify body structures and age-appropriate functions. | Use reviewed diagrams, labels, and careful non-diagnostic language. | G1-G12 / health, science | Implemented (generic sample renderer) | Match lungs to their function. |
| `safety-decision-scenario` | P40 | Choose a safe response to an everyday physical or environmental risk. | Present text-first options with no time pressure and authored explanations. | G1-G12 / health, PE, life skills | Implemented (generic sample renderer) | Choose what to do before crossing a road. |
| `pattern-composition-board` | P41 | Arrange bounded shapes, lines, or motifs into a composition. | Provide a keyboard-addressable grid and text description of the result. | G1-G12 / creative arts, math | Implemented (generic sample renderer) | Continue a repeating visual pattern. |
| `music-rhythm-grid` | P42 | Compose or inspect a bounded beat pattern. | Place typed notes and rests with pause/stop and text notation. | G1-G12 / music, math | Implemented (generic sample renderer) | Complete a four-beat rhythm. |
| `drama-roleplay` | P43 | Rehearse a bounded role, cue, dialogue, or response choice. | Offer read-aloud and text modes; recording is optional and never required. | G1-G12 / drama, languages, life skills | Implemented (generic sample renderer) | Choose a respectful response in a role-play. |
| `movement-sequence` | P44 | Learn, order, or reflect on safe movement without camera or pose capture. | Show authored movement cards with text descriptions and a seated alternative. | G1-G9 / PE, health | Implemented (generic sample renderer) | Order a safe warm-up routine. |
| `emotion-regulation-checkin` | P45 | Name a feeling and choose an authored coping or support route. | Use optional, non-diagnostic choices and calm reduced-motion presentation. | G1-G12 / life skills, health | Implemented (generic sample renderer) | Choose a calming strategy after frustration. |

### Host and runtime primitives

| Stable ID | Priority | When needed | How used | Grade band / subjects | Maturity | Sample use case |
|---|---:|---|---|---|---|---|
| `lesson-flow` | P46 | Own one ordered lesson sequence and progress state. | Host child components, completion, and validated fallback transitions. | G1-G12 / all | Implemented (generic sample renderer) | Resume the next approved activity. |
| `feedback-panel` | P47 | Show server-authorized feedback, correction, or next hint. | Render typed message blocks and declared actions with live-region discipline. | G1-G12 / all | Implemented (generic sample renderer) | Show a retry hint after an incorrect response. |
| `offline-content-fallback` | P48 | Continue when connectivity or an asset fetch is unavailable. | Select a complete cached scene, verify its bindings, and explain submission limits. | G1-G12 / all | Implemented (generic sample renderer) | Switch from an interactive map to its cached text list. |
| `asset-reference` | P49 | Resolve a reviewed asset for a child component. | Require stable asset ID, exact version, lower-case SHA-256, allowed origin, MIME, and licence metadata. | G1-G12 / all | Implemented (generic sample renderer) | Load the approved GLB and its static thumbnail. |
| `evidence-capture` | P50 | Normalize learner events at the server-authoritative attempt boundary. | Emit bounded, idempotent, version-bound evidence references; never include grading secrets or raw learner media. | G1-G12 / all | Implemented (generic sample renderer) | Queue a response event offline for later acknowledgement. |

## Minimum generation and runtime rules

- Select only safe, exact-version components from the installed registry and emit typed, learner-safe props. Never generate arbitrary executable UI or remote code.
- Keep answers, rubrics, accepted-answer normalization, scoring, grader configuration, exam policy, and all grading secrets server-side. Client events and offline queues are untrusted submissions.
- Resolve exact component and asset versions. Bind every asset to its stable ID, exact version, lower-case SHA-256, allowed origin, MIME type, size limit, licence, and provenance. Reject unknown or mismatched bindings.
- Provide a complete accessible alternative for every interaction: keyboard or explicit controls, labels and focus order, text/list/table modes, captions or transcripts, and reduced-motion behavior. Dragging, colour, audio, animation, camera orbit, and freehand input cannot be the only path.
- Define offline behavior before publication: cache immutable approved bundles/assets, verify hashes, restore only exact snapshots, queue idempotently, and use a complete fallback that preserves the learning objective and accessibility.
- Design 390x844 first: keep the prompt, asset, response control, and primary action usable in one phone viewport before optimizing larger screens.
- Do not build or promote a catalogue/component entry until an approved activity needs it, a producer and consumer exist, and its typed contract, fallback, accessibility path, versioned asset bindings, and proof are approved. A row alone does not authorize implementation.

## Related authority

- [Interactive-learning living reference](kitabu-interactive-learning-living-reference.md)
- [Runtime Contract v1.0.1 Errata](runtime-contract-v1.0.1-errata.md)
- [Asset registry](../../learning-assets/registry.json)
