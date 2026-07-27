# Grade 1 Mathematics familiar-object asset manifest

This is an authoring manifest, not a generated-asset directory.  It specifies a
small reusable library for Grade 1 Mathematics missions.  The curriculum outcome
files reference these assets by `assetKey`; the app renders all words, values,
counts, and answer states natively.

## Shared production requirements

- Deliver transparent PNG or WebP raster files, sourced at 2048 px or larger.
- Use a soft 3D-cartoon, premium storybook look: rounded forms, warm natural
  lighting, clean silhouette, generous padding, no text or watermark.
- Keep each object isolated, front/three-quarter view unless the key says
  otherwise.  Use a consistent child-friendly Kenyan home/school/market setting
  without a baked-in background.
- Do not bake numerals, arithmetic symbols, labels, correct answers, or UI into
  an asset.  The native interface supplies these accessibly and can localise them.
- Counters, basic geometric shapes, lines, and measuring tick marks are native
  interface primitives, not generated image assets.

## Reusable keys and prompts

| Asset key | Use | Image-generation prompt |
| --- | --- | --- |
| `g1-object-mango` | Counting, sorting and addition/subtraction stories | `Single ripe mango, friendly Grade 1 learning-object illustration, soft 3D cartoon, realistic mango proportions, warm Kenyan sunshine lighting, isolated transparent background, clean silhouette, generous padding, no text, no watermark` |
| `g1-object-banana` | Counting, matching and pattern work | `Single small bunch of yellow bananas, Grade 1 learning-object illustration, soft 3D cartoon, isolated transparent background, clean silhouette, generous padding, no text, no watermark` |
| `g1-object-orange` | Counting, sorting and sharing stories | `Single orange fruit, soft 3D cartoon educational object, rounded and tactile, isolated transparent background, warm studio lighting, generous padding, no text, no watermark` |
| `g1-object-book` | Sorting, comparing and school-day scenes | `Single colourful closed school exercise book, child-friendly East African classroom object, soft 3D cartoon, isolated transparent background, clean silhouette, no readable writing, no text, no watermark` |
| `g1-object-pencil` | Length comparison and classroom stories | `Single plain yellow pencil, soft 3D cartoon educational object, isolated transparent background, side view, no lettering, no text, no watermark` |
| `g1-object-cup` | Capacity comparisons and arbitrary-unit filling | `Single plain reusable plastic cup, child-friendly household learning object, soft 3D cartoon, isolated transparent background, clean silhouette, no branding, no text, no watermark` |
| `g1-object-bottle` | Capacity comparisons | `Single plain reusable water bottle, child-friendly household learning object, soft 3D cartoon, isolated transparent background, no branding, no measurement markings, no text, no watermark` |
| `g1-object-bucket` | Capacity comparisons and filling stories | `Small plain household bucket with handle, soft 3D cartoon Grade 1 learning object, isolated transparent background, no branding, no markings, no text, no watermark` |
| `g1-object-spoon` | Capacity arbitrary units and matching | `Single metal teaspoon, soft 3D cartoon educational object, isolated transparent background, clean silhouette, no text, no watermark` |
| `g1-object-stone` | Mass comparison and non-standard units | `Single smooth small river stone, soft 3D cartoon educational object, isolated transparent background, warm light, no text, no watermark` |
| `g1-object-feather` | Mass comparison | `Single light brown feather, soft 3D cartoon educational object, isolated transparent background, clean silhouette, no text, no watermark` |
| `g1-object-schoolbag` | Mass and day-of-week activity stories | `Single child school bag, friendly East African school context, soft 3D cartoon, isolated transparent background, no logos, no lettering, no text, no watermark` |
| `g1-object-shoe` | Length, matching and sorting | `Single child shoe, soft 3D cartoon educational object, isolated transparent background, clean silhouette, no brand marks, no text, no watermark` |
| `g1-object-handspan` | Arbitrary-unit length measuring cue | `Child's open hand shown from above beside a simple blank strip, soft 3D cartoon educational illustration, isolated transparent background, no numbers, no ticks, no text, no watermark` |
| `g1-object-market-basket` | Counting, addition/subtraction and money stories | `Small woven market basket, friendly Kenyan market learning object, soft 3D cartoon, isolated transparent background, clean silhouette, no labels, no text, no watermark` |
| `g1-object-shop-counter` | Buying up to two items story scene | `Simple small shop counter with an empty display surface, child-friendly Kenyan neighbourhood shop, soft 3D cartoon, isolated transparent background, no products, no price labels, no text, no watermark` |
| `g1-object-coin-generic` | Generic money-token visual only | `Single unbranded round learning token with a subtle metallic gold edge, soft 3D cartoon, isolated transparent background, blank face with no denomination, no national emblem, no text, no watermark` |
| `g1-object-banknote-generic` | Generic note-token visual only | `Single unbranded rectangular paper money learning token, soft 3D cartoon, isolated transparent background, blank decorative pattern only, no denomination, no national emblem, no portrait, no text, no watermark` |
| `g1-object-calendar` | Days and months sequencing | `Simple blank wall calendar with seven empty rounded cells, soft 3D cartoon educational object, isolated transparent background, no weekday names, no dates, no text, no watermark` |
| `g1-object-sun` | Day activity sequencing | `Cheerful sun icon in soft 3D cartoon style, isolated transparent background, no face text, no watermark` |
| `g1-object-moon` | Day activity sequencing | `Gentle crescent moon icon in soft 3D cartoon style, isolated transparent background, no text, no watermark` |

## Currency safety rule

Do not generate replicas, lookalikes, denomination markings, national emblems,
portraits, or security features for Kenyan currency.  Use `g1-object-coin-generic`
and `g1-object-banknote-generic` only as neutral manipulatives; the native UI must
render the official curriculum's coin/note value as plain text and maintain the
correct answer logic.

## Usage guidance

- Reuse the same object assets across missions to reduce download cost and build
  recognition.  Vary count, arrangement, and story context in native scene data.
- An outcome needing a line, triangle, rectangle, circle, oval, number, or symbol
  must render it with the native accessible component rather than an image.
- Assets should never be required as the only signal for an answer: pair visual
  cues with spoken/readable prompts and tap alternatives.
