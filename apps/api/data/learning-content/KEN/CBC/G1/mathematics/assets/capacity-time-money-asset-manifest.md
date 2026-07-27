# Grade 1 Mathematics: Capacity, Time, and Money asset manifest

## Delivery rules

- Generate each item as a transparent-background **PNG or WebP** raster (not SVG), at 1024px square; export a 256px WebP runtime copy.
- Visual style: friendly 3D-cartoon classroom object, rounded forms, warm Kenyan-home colour palette, soft front-left light, centred full object, no cast shadow outside the object.
- Do not include words, numerals, watermarks, UI, background scenery, or a mascot in these object assets. The app supplies labels and accessibility text.
- Keep every capacity container visibly empty; the runtime adds fill levels so comparisons stay deterministic.
- Coins and notes are instructional illustrations, not photorealistic currency reproductions. They must be clearly stylised and contain no serial number, portrait, official seal, or currency text.

## Capacity assets

| Asset ID | Runtime use | Generation prompt |
| --- | --- | --- |
| `g1-capacity-small-cup` | Small-capacity comparison and filling | `Single small drinking cup, cheerful 3D cartoon classroom object, yellow plastic, transparent background, empty, full object visible, soft front-left studio lighting, no text, no logo, no shadow outside object` |
| `g1-capacity-medium-bottle` | Compare / order containers | `Single reusable water bottle, medium capacity, cheerful 3D cartoon classroom object, turquoise plastic with orange cap, transparent background, empty, full object visible, no text, no logo, soft studio lighting` |
| `g1-capacity-large-jug` | Compare / order containers | `Single large pouring jug, cheerful 3D cartoon classroom object, coral red plastic, transparent background, empty, full object visible, no text, no logo, soft studio lighting` |
| `g1-capacity-bucket` | More/less and arbitrary-unit measuring | `Single household bucket with handle, cheerful 3D cartoon classroom object, blue plastic, transparent background, empty, full object visible, no text, no logo, soft studio lighting` |
| `g1-capacity-basin` | Container sorting and reuse lesson | `Single round wash basin, cheerful 3D cartoon classroom object, green plastic, transparent background, empty, full object visible, no text, no logo, soft studio lighting` |
| `g1-capacity-scoop` | Arbitrary-unit filling counter | `Single small measuring scoop, cheerful 3D cartoon classroom object, orange plastic, transparent background, empty, full object visible, no text, no logo, soft studio lighting` |

## Time assets

| Asset ID | Runtime use | Generation prompt |
| --- | --- | --- |
| `g1-time-analog-clock` | Day/activity sequencing and optional clock extension | `Single simple analog classroom clock, cheerful 3D cartoon object, cream face, teal rim, blank face with tick marks only, no numerals and no hands, transparent background, full object visible, no text, soft studio lighting` |
| `g1-time-school-bag` | School-day activity sorting | `Single small school backpack, cheerful 3D cartoon classroom object, red and navy fabric, transparent background, no text, no logo, full object visible, soft studio lighting` |
| `g1-time-family-meal` | Weekly activity sorting | `Single covered family meal bowl with spoon beside it, cheerful 3D cartoon object, transparent background, no food branding, no text, full object visible, soft studio lighting` |
| `g1-time-play-ball` | Weekday activity sorting | `Single bright play ball, cheerful 3D cartoon object, orange and blue panels, transparent background, no text, full object visible, soft studio lighting` |
| `g1-time-calendar-blank` | Month ordering; app overlays month names | `Single blank wall calendar page with top rings, cheerful 3D cartoon classroom object, cream paper and green header band, transparent background, empty grid with no text or numerals, full object visible, soft studio lighting` |

## Money assets

| Asset ID | Runtime use | Generation prompt |
| --- | --- | --- |
| `g1-money-coin-1` | Identify/count Kenyan coin set | `Single stylised Kenyan-learning coin token, round gold-colour 3D cartoon object, one raised dot in centre as denomination cue, transparent background, no real currency design, no text, no logo, full object visible, soft studio lighting` |
| `g1-money-coin-5` | Identify/count Kenyan coin set | `Single stylised Kenyan-learning coin token, round silver-colour 3D cartoon object, five raised dots in centre as denomination cue, transparent background, no real currency design, no text, no logo, full object visible, soft studio lighting` |
| `g1-money-coin-10` | Identify/count Kenyan coin set | `Single stylised Kenyan-learning coin token, round bronze-colour 3D cartoon object, ten small raised dots in centre as denomination cue, transparent background, no real currency design, no text, no logo, full object visible, soft studio lighting` |
| `g1-money-note-50` | Identify sh50 note and simple buying | `Single stylised learning note, green rectangular 3D cartoon object with rounded corners and a simple lion icon, transparent background, clearly fictional educational token, no serial number, no portrait, no seal, no currency text, no real banknote design, full object visible, soft studio lighting` |
| `g1-money-market-banana` | Buy up to two items | `Single ripe banana bunch, cheerful 3D cartoon market object, transparent background, no text, no logo, full object visible, soft studio lighting` |
| `g1-money-market-mango` | Buy up to two items | `Single ripe mango, cheerful 3D cartoon market object, transparent background, no text, no logo, full object visible, soft studio lighting` |
| `g1-money-market-bread` | Buy up to two items | `Single small loaf of bread, cheerful 3D cartoon market object, transparent background, no text, no logo, full object visible, soft studio lighting` |

## Runtime composition notes

- Values, fill levels, prices, month/day names, and coin denominations render as native accessible UI; never bake them into imagery.
- A learner must be able to tap an object or select its labelled card in place of drag-and-drop.
- Reuse assets across missions; do not generate a bespoke image per question variant.
