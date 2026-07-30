# African Monarch interactive specimen card

A standalone Vite + Three.js proof for a reusable, embedded learning card about the African Monarch (`Danaus chrysippus`). It supports three activity modes without turning the specimen into a full page:

- **Explore:** select a hotspot and read the butterfly's first-person explanation.
- **Identify:** select the body part requested by the question and check the answer.
- **Explain:** write a short response for later teacher/server rubric grading.

The card is designed and tested at 390 × 844. The asset, question, answer controls and primary actions fit in one phone viewport without page scrolling. Optional detail appears in a floating glass-style panel. Desktop uses the same card in a two-column layout.

This is a procedural, articulated reconstruction based on one generated dorsal reference. It proves reusable hotspots, orbit/zoom, gentle wing motion, pause/reset, accessible controls, a static fallback and lesson/assessment reuse. It is not photogrammetry or a taxonomy-grade specimen.

## Run

```powershell
npm install
npm run dev
```

Use `npm run build` for the production bundle.

## Verification

```powershell
npm test
npm run build
```

The accepted container evidence is in `review/interactive-specimen-card-mobile-390x844.png`. Earlier articulated-model evidence remains in `review/articulated-wings-mobile-390x844.png`. The source image and model manifest are hash-bound through `butterfly-sculpt.json` and the generated sculpt receipts.

## Reusable production pattern

Future specimens use parallel, non-overlapping owners for reference generation, subject accuracy, procedural reconstruction, hotspot content, shell integration, tests and independent review. A single integrator combines the outputs. Production runtime integration only follows a successful standalone proof and a real lesson requirement.

Production assets should be reviewed, versioned and hash-bound procedural img2threejs runtime bundles accompanied by validated manifest, hotspot, camera and activity data. Do not load JavaScript supplied by authored lessons. Learner-visible definitions must not contain answer keys; the prototype's `demo-grading-service.js` is only a local simulation of the production API boundary.

## Voice roadmap

Voice will use simple device/browser text-to-speech to read the same first-person introduction and hotspot copy. It will not use recorded narration. TTS controls, language selection and interruption behavior are intentionally deferred until the visual interaction is promoted into the runtime.

## Integration contract

`src/butterfly-model.js` exports `createButterflyModel(THREE, context)`. It may return a bare `THREE.Object3D` or:

```js
{
  root, // required THREE.Object3D
  update(delta, elapsed, motionEnabled),
  reset(),
  dispose()
}
```

`src/hotspots.js` exports:

- `HOTSPOTS`: metadata records with `id`, `title`, `description`, and a local-space `position` (`THREE.Vector3`, `[x, y, z]`, or `{ x, y, z }`). The shell renders these as accessible screen-space buttons.
- `createHotspots(THREE, modelRoot, onSelect)`: a reusable Three.js marker layer for later host integration. The standalone proof deliberately uses the accessible screen-space buttons to avoid duplicate visual markers.

`src/activity-definitions.js` exports the answer-free specimen and activity definitions. `src/activity-runtime.js` emits Kitabu protocol-shaped interaction and completion events. `src/demo-grading-service.js` contains the standalone Identify-mode answer boundary and must be replaced by the server grader in production.
