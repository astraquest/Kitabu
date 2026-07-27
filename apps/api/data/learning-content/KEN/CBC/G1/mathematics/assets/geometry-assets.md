# Grade 1 geometry asset manifest

Use native primitives whenever a learner must identify, draw, sort, or extend a
shape/line pattern. They remain crisp at every size, are easy to tap, and do not
introduce visual detail that changes the mathematical property being taught.

## Native interactive primitives

| Asset identifier | Use | Accessible label |
| --- | --- | --- |
| `shape.circle.primary` | Identify, sort, and pattern circle | "A blue circle" |
| `shape.triangle.primary` | Identify, sort, and pattern triangle | "A yellow triangle with three straight sides" |
| `shape.rectangle.primary` | Identify, sort, and pattern rectangle | "A green rectangle with four straight sides" |
| `shape.oval.primary` | Identify and pattern oval | "A purple oval" |
| `line.straight.primary` | Identify, draw, and sort straight lines | "A straight line" |
| `line.curved.primary` | Identify, draw, and sort curved lines | "A curved line" |
| `pattern.blank-slot` | Child chooses the next primitive in a pattern | "Empty place for the next shape" |
| `drawing.trace-guide` | Wide, high-contrast trace path for straight or curved lines | "Trace this [straight/curved] line" |

Implementation notes: use solid fills plus a strong outline, never colour as the
only distinguishing cue; offer tap-to-select or tap-to-place wherever drag is
available; give each selectable item a minimum 44 by 44 point target.

## Optional friendly real-world objects

These are decorative/context objects only. They must not be used as the sole
evidence for identifying a mathematical shape or line.

| Asset identifier | Lesson context | Accessible label |
| --- | --- | --- |
| `object.kite.triangle` | Find triangle-like forms outdoors | "A friendly kite with a triangle-shaped sail" |
| `object.window.rectangle` | Find rectangles at school or home | "A rectangular classroom window" |
| `object.plate.circle` | Find circles at mealtime | "A round plate" |
| `object.egg.oval` | Find oval forms | "An egg-shaped oval" |
| `object.road.straight` | Recognise a straight path | "A straight path" |
| `object.river.curved` | Recognise a curved path | "A gently curving river" |
| `object.fabric.pattern` | Celebrate rectangle, triangle, circle, and oval patterns | "Colourful fabric with repeating simple shapes" |

## Mascot/image-generation prompt specification

Use only when an optional object above is missing. Generate an original raster
PNG or WebP with transparent background; no logos, text, named characters, or
third-party artwork. Keep the object large, centred, softly shaded, and clearly
separate from its background. Preserve the approved Kitabu mascot identity if it
appears.

Base prompt:

> Original friendly 3D-cartoon learning object for a Kenyan Grade 1 mathematics
> lesson: **[OBJECT]**. Rounded child-safe forms, warm natural colours, clean
> silhouette, transparent background, soft studio lighting, no words, no numbers,
> no logos, no copyrighted character, no busy details. The mathematical feature
> **[FEATURE]** must be visually obvious but the object is decorative only.

Prompt substitutions:

| Identifier | OBJECT | FEATURE |
| --- | --- | --- |
| `object.kite.triangle` | small kite | triangular sail |
| `object.window.rectangle` | classroom window | rectangular frame |
| `object.plate.circle` | plate | circular rim |
| `object.egg.oval` | egg | oval outline |
| `object.road.straight` | short path segment | straight direction |
| `object.river.curved` | short river segment | smooth curved direction |
| `object.fabric.pattern` | folded fabric swatch | repeating simple geometric pattern |

Do not generate assets for the primitive shapes or lines above: render those
natively so their properties remain exact, consistent, and accessible.
