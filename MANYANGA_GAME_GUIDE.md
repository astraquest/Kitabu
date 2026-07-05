# Manyanga! — 3D Matatu Racing Game: Implementation Guide

This document is the authoritative build spec for the Manyanga game. It is written so that
**any agent can pick up the work at any checkpoint and finish it to the intended quality**
without access to the original conversation.

Read `CLAUDE.md` and skim the Crazy Balloon game first — Manyanga deliberately mirrors its
architecture (`packages/game-core/src/crazy-balloon/` → engine, `native-app/src/renderers/crazy-balloon/`
→ renderer, `native-app/src/hooks/useCrazyBalloonRuntime.ts` → runtime hook,
`native-app/src/screens/CrazyBalloonScreen.tsx` → screen).

---

## 1. Product Spec (what the player experiences)

- **Genre:** Endless 3-lane matatu racer, behind-the-vehicle camera, Subway-Surfers-style
  perspective corridor. Set on a Nairobi highway: KICC, Times Tower and Britam Tower on the
  skyline, acacia trees on the roadside, colorful "nganya" matatus as traffic.
- **Core loop:** The player's matatu drives forward automatically, accelerating over time.
  The player switches lanes (tap left/right half of the screen) to dodge slower traffic
  matatus and collect coins. Score accrues continuously with distance, plus a bonus per coin.
- **Crash → rescue:** Smashing into a traffic matatu pauses the race and shows a **floating
  glassmorphic question card** with a **5-second countdown**:
  - **Correct answer** → race resumes exactly where it stopped, with ~2.5 s of
    invulnerability (player blinks) so the player is not instantly re-crashed.
  - **Wrong answer or timeout** → game over; run resets (score awarded, then back to menu /
    play again).
  - The player gets **at most 3 rescues per run**. A 4th crash is an immediate game over.
- **Rewards:** On game over, the run's score is awarded to the student's points via the
  existing `onAddPoints` prop (same pattern as `CrazyBalloonScreen`).
- **HUD:** Score (top right, big), coin count chip, 3 rescue-chance dots (green → red as
  used), pause is out of scope for v1.

## 2. Architecture Decision: pseudo-3D projection (NOT a GL engine)

The app has **no GL/three.js dependencies** and CLAUDE.md mandates production-safe
increments. Do **not** add `expo-gl`/`three` for v1 — it requires a native rebuild and
cannot be verified in this environment. Instead we render **true perspective projection
(1/z) with plain React Native Views + react-native-svg**, the classic OutRun/pseudo-3D
technique. Done well, this reads as real 3D on a phone: a road trapezoid converging to a
vanishing point, lane dashes that stream toward the camera at road speed, traffic that
scales and slides with depth, parallax skyline.

**Phase-2 upgrade path (only if explicitly requested):** swap `ManyangaRenderer` for an
`expo-gl` + `three` renderer. The engine/state contract below is renderer-agnostic, so
nothing else changes. This is the ONLY sanctioned way to get "real" 3D later.

## 3. File Map (create exactly these)

| File | Purpose | Status markers |
|---|---|---|
| `MANYANGA_GAME_GUIDE.md` | This guide | ✅ |
| `packages/game-core/src/manyanga/types.ts` | State/Input/Event/entity types | ✅ |
| `packages/game-core/src/manyanga/questions.ts` | `MANYANGA_RESCUE_QUESTIONS` pool | ✅ |
| `packages/game-core/src/manyanga/engine.ts` | `createManyangaEngine(rng)` — pure, deterministic | ✅ |
| `packages/game-core/src/manyanga/index.ts` | Barrel export | ✅ |
| `packages/game-core/src/index.ts` | Add `export * from './manyanga';` | ✅ |
| `native-app/src/renderers/manyanga/mapManyangaRenderState.ts` | World → screen projection | ✅ |
| `native-app/src/renderers/manyanga/ManyangaRenderer.tsx` | Playfield rendering (sky, skyline, road, sprites) | ✅ |
| `native-app/src/hooks/useManyangaRuntime.ts` | Engine + `IntervalGameLoop` glue | ✅ |
| `native-app/src/screens/ManyangaScreen.tsx` | HUD, overlays, controls, points award | ✅ |
| `native-app/src/types/app.ts` | Add `'manyanga'` to `BaseViewState` | ✅ |
| `native-app/src/hooks/useKitabuApp.ts` | `playGame`: route `'manyanga'` → `navigateTo('manyanga')` | ✅ |
| `native-app/src/KitabuApp.tsx` | Import screen, `case 'manyanga':`, title map entry `manyanga: 'Manyanga!'` | ✅ |
| `native-app/__tests__/gameCore.test.ts` | Add manyanga engine describe block | ✅ (7 tests) |
| `LEDGER.md` | Append entry (see §10) | ✅ |

> **Build status (2026-07-05):** all files implemented; `tsc --noEmit` clean, ESLint clean,
> full jest suite 19/19 green (105 tests). Also added `useManyangaEffects` in
> `native-app/src/runtime/effects/GameEffectsController.ts` (crash/rescue/gameover flashes).
> Swipe steering (PanResponder in `ManyangaScreen`, 28 px horizontal threshold, fires
> mid-gesture; plain taps steer toward the tapped half) and haptics (via
> `services/haptics` `triggerHaptic`: crash/game-over → `error`, rescue → `success`)
> are implemented. Remaining polish ideas: sound, and the phase-2 GL renderer (§2).

`native-app/src/screens/GameZoneScreen.tsx` already emits `onPlayGame('manyanga')` — no
change needed there.

## 4. Engine Spec (`packages/game-core/src/manyanga/`)

Pure and deterministic: **no `Date.now`, no `Math.random`** — all randomness through the
injected `SeededRandom` (`packages/runtime-contracts/src/game.ts`). Implements
`GameEngine<ManyangaState, ManyangaInput, ManyangaEvent>` exactly like the crazy-balloon
engine (same `create/update/collectEvents` + internal `pendingEvents` pattern).

### 4.1 World model & units

- Distances in **meters**. Player is always at `z = 0`; entities carry `z` = meters ahead
  of the player. Each tick, `entity.z -= (speed - TRAFFIC_SPEED) * dt` (traffic drives the
  same direction but slower, so the player closes in).
- **Lanes:** `0 | 1 | 2` (left/center/right). Lane changes are instant in the engine; the
  renderer animates the slide.

### 4.2 Constants (tune here only)

```ts
const LANES = [0, 1, 2] as const;
const START_SPEED = 16;        // m/s
const MAX_SPEED = 40;          // m/s
const ACCELERATION = 0.4;      // m/s per second
const TRAFFIC_SPEED = 7;       // m/s (constant for all traffic)
const SPAWN_EVERY_M = 52;      // spawn a wave each N meters travelled
const SPAWN_Z = 230;           // where waves appear (beyond draw distance)
const DESPAWN_Z = -12;         // cleanup behind camera
const CRASH_NEAR_Z = -1.5;     // collision window (player bumper ~ traffic tail)
const CRASH_FAR_Z = 5.5;
const COIN_COLLECT_Z = 3.5;    // coin pickup window 0..3.5 in player lane
const SCORE_PER_METER = 0.6;   // distance score
const COIN_SCORE = 5;
const MAX_RESCUES = 3;
const RESCUE_DURATION_SEC = 5;
const RESCUE_INVULN_SEC = 2.5;
const RESCUE_CLEAR_AHEAD_M = 45; // traffic removed from player lane after rescue
```

### 4.3 State

```ts
interface ManyangaTraffic { id: number; lane: 0 | 1 | 2; z: number; liveryIndex: number; }
interface ManyangaCoin    { id: number; lane: 0 | 1 | 2; z: number; }
interface ManyangaQuestion { prompt: string; options: string[]; answer: string; }

interface ManyangaState {
  status: 'menu' | 'playing' | 'rescue_quiz' | 'gameover';
  playerLane: 0 | 1 | 2;          // starts at 1
  speed: number;                  // current m/s
  distanceM: number;              // total travelled
  scoreFloat: number;             // fractional accumulator; UI shows Math.floor
  coins: number;                  // coins collected this run
  rescuesUsed: number;            // 0..3
  invulnerableSec: number;        // >0 → collisions ignored, renderer blinks player
  traffic: ManyangaTraffic[];
  coinItems: ManyangaCoin[];
  rescueQuestion: ManyangaQuestion | null;
  rescueTimeLeftSec: number;
  nextEntityId: number;
  nextSpawnAtM: number;
}
```

### 4.4 Inputs

```ts
type ManyangaInput =
  | { type: 'tick' }                        // uses dtMs
  | { type: 'start' }                       // menu/gameover → fresh 'playing' run
  | { type: 'return_menu' }
  | { type: 'steer'; direction: 'left' | 'right' }   // clamp to 0..2; ignored unless playing
  | { type: 'answer_rescue'; answer: string };
```

### 4.5 Events

```ts
type ManyangaEvent =
  | { type: 'started' }
  | { type: 'coin_collected'; coins: number }
  | { type: 'crashed'; question: ManyangaQuestion }   // rescue available
  | { type: 'rescued'; rescuesUsed: number }
  | { type: 'game_over'; score: number; distanceM: number; coins: number };
```

### 4.6 Tick algorithm (status `'playing'`, `dt = dtMs / 1000`)

1. `speed = min(MAX_SPEED, speed + ACCELERATION * dt)`
2. `travel = speed * dt`; `distanceM += travel`; `scoreFloat += travel * SCORE_PER_METER`
3. `invulnerableSec = max(0, invulnerableSec - dt)`
4. Move entities: `z -= (speed - TRAFFIC_SPEED) * dt` for traffic, `z -= speed * dt` for
   coins (coins are stationary on the road). Drop anything with `z < DESPAWN_Z`.
5. **Coin pickup:** coins with `lane === playerLane && 0 <= z <= COIN_COLLECT_Z` →
   remove, `coins += 1`, `scoreFloat += COIN_SCORE`, emit `coin_collected`.
6. **Collision:** any traffic with `lane === playerLane && CRASH_NEAR_Z <= z <= CRASH_FAR_Z`
   and `invulnerableSec <= 0`:
   - `rescuesUsed >= MAX_RESCUES` → game over (see 4.8).
   - else: pick + shuffle a question via `rng` (copy the `shuffleOptions`/`pickQuestion`
     helpers from the crazy-balloon engine), set `status: 'rescue_quiz'`,
     `rescueTimeLeftSec: RESCUE_DURATION_SEC`, emit `crashed`. **Do not** remove the hit
     matatu here; the post-rescue lane clear handles it.
7. **Spawning:** while `distanceM >= nextSpawnAtM`: spawn one wave at
   `z = SPAWN_Z + (distanceM - nextSpawnAtM)` … simplest correct version: spawn at
   `SPAWN_Z`, then `nextSpawnAtM += SPAWN_EVERY_M`. A wave is:
   - Pick `blockedCount = 1` or `2` (2 with probability `min(0.65, 0.25 + distanceM/4000)`
     — difficulty ramps).
   - Choose `blockedCount` **distinct** lanes via rng; **at least one lane always stays
     free — never spawn 3 matatus at one z.** Stagger the second matatu `+14 m` behind the
     first so waves read as traffic, not a wall.
   - Each matatu gets `liveryIndex = floor(rng.next() * LIVERY_COUNT)` (renderer owns the
     livery palette; `LIVERY_COUNT = 5`).
   - With probability `0.75`, lay a run of 3 coins (`z`, `z+7`, `z+14`) in one of the FREE
     lanes.

### 4.7 Tick algorithm (status `'rescue_quiz'`)

Only the countdown runs — the world is frozen (traffic/coins/speed/distance untouched):
`rescueTimeLeftSec -= dt`; at `<= 0` → game over.

### 4.8 Rescue resolution (`answer_rescue`)

- Ignore unless `status === 'rescue_quiz'` with a question.
- **Correct** (`input.answer === rescueQuestion.answer`): `status: 'playing'`,
  `rescuesUsed += 1`, `invulnerableSec = RESCUE_INVULN_SEC`, clear the question, and
  **remove all traffic in the player's lane with `z < RESCUE_CLEAR_AHEAD_M`** (this deletes
  the matatu just hit plus anything immediately ahead). Emit `rescued`.
- **Wrong**: game over.
- **Game over** (all paths): `status: 'gameover'`, clear question/timer, emit
  `game_over` with `score: Math.floor(scoreFloat)`, `distanceM`, `coins`.

### 4.9 Questions (`questions.ts`)

`MANYANGA_RESCUE_QUESTIONS: ManyangaQuestion[]` — ≥ 12 quick CBC-flavored items (mental
math, science, Kenya geography/civics), 2–4 options each, answerable in 5 s by an
upper-primary student. Keep prompts ≤ 60 chars. Mirror the crazy-balloon format exactly.

## 5. Projection Math (`mapManyangaRenderState.ts`)

All output in **percentages of the playfield** so the renderer is size-independent.

```
HORIZON_Y = 34        // % from top — skyline sits on this line
BOTTOM_Y  = 97        // % from top — road reaches here
CAM_DEPTH = 14        // perspective strength (smaller = more aggressive)
ROAD_HALF_BOTTOM = 46 // % — half-width of road at the screen bottom
LANE_OFFSET = 29      // % — lane center offset from road center at z=0 (bottom)
PLAYER_Z_VISUAL = 4   // player sprite drawn as if 4 m ahead (so it sits above the bezel)
```

For an entity at depth `z ≥ 0`:

```
s     = CAM_DEPTH / (z + CAM_DEPTH)          // scale factor: 1 at z=0 → 0 at ∞
yPct  = HORIZON_Y + (BOTTOM_Y - HORIZON_Y) * s   // bottom anchor of the sprite
xPct  = 50 + laneIndexToOffset(lane) * LANE_OFFSET * s   // lane ∈ {0,1,2} → {-1,0,+1}
scale = s                                     // multiply base sprite W/H by this
```

This is genuine 1/z perspective — motion automatically eases near the horizon and rushes
at the camera, which is what sells the 3D.

**Road geometry:** an SVG polygon with vertices
`(50 − ROAD_HALF_BOTTOM, BOTTOM_Y) (50 + ROAD_HALF_BOTTOM, BOTTOM_Y) (50 + 2.2, HORIZON_Y) (50 − 2.2, HORIZON_Y)`
(a ~4.4%-wide strip at the horizon, not a perfect point — looks more natural). Edge lines:
two thin yellow polygons just inside the road edges.

**Streaming lane dashes** (the #1 motion cue — do not skip): dashes live at fixed world
positions repeating every `DASH_PERIOD = 14` m. Mapper computes
`phase = state.distanceM % DASH_PERIOD`, then for `k = 0..16` projects
`z = k * DASH_PERIOD − phase + 2` for each of the two lane-divider lines
(divider x-offsets = ±0.5 lanes → `±0.5 * 2 * LANE_OFFSET`… i.e. divider offsets are
`±LANE_OFFSET` **halved between lane centers**: use `±LANE_OFFSET * 1.0` for lane centers
`{-1,0,1}` and `±LANE_OFFSET * 0.5 * 2 = ±LANE_OFFSET` — concretely: divider offsets are
`-0.5` and `+0.5` in lane units, i.e. `offset = ±0.5 * LANE_OFFSET * 2 = ±LANE_OFFSET`).
Render each dash as a small white rect of `width = 1.6 * s %`, `height = 5.5 * s %` at the
projected `(x, y)`. Because `phase` advances with real distance, dash speed always matches
ground speed. Cull dashes with `s < 0.045`.

**Render order:** sort every sprite by `z` **descending** (painter's algorithm), then the
player last (always on top).

**RenderState contract** (keep the mapper pure; renderer takes only this):

```ts
interface ManyangaRenderState {
  horizonYPct: number;
  roadPolygonPoints: string;        // ready-made "x,y x,y ..." for <Polygon>
  edgeLines: { left: string; right: string };
  dashes: Array<{ key: string; xPct: number; yPct: number; scale: number }>;
  sprites: Array<
    | { kind: 'traffic'; id: number; xPct: number; yPct: number; scale: number; liveryIndex: number }
    | { kind: 'coin'; id: number; xPct: number; yPct: number; scale: number }
  >;                                 // pre-sorted far → near
  player: { xPct: number; yPct: number; scale: number; blinking: boolean };
  speedKmh: number;                  // round(speed * 3.6) for the HUD
  showHint: boolean;                 // playing && distanceM < 40
}
```

Cull traffic/coins with `z > 200` (behind the skyline haze) or `z < −6`.

## 6. Renderer Spec (`ManyangaRenderer.tsx`) — Nairobi art direction

Full-screen playfield (no inset card — racing needs immersion). Layers bottom-up:

1. **Sky:** `LinearGradient` `['#7DD3FC', '#BAE6FD', '#FEF3C7']` (vertical) — bright
   equatorial morning. A soft sun disc (View, `#FDE68A`) upper right; 2–3 static cloud
   Views.
2. **Nairobi skyline** on the horizon line (one `<Svg>` strip, silhouette
   `#94A3B8`/`#64748B` two-tone, no outlines):
   - **KICC**: a cylinder (rounded-top tall rect) with the wider helipad disc on top —
     the most recognizable shape; place ~30% from left.
   - **Times Tower**: tall slab with a stepped top, ~55%.
   - **Britam Tower**: tapering triangle with the little mast, ~70%.
   - Filler blocks of varying heights between them; a second, lighter row behind for depth.
3. **Roadside strips:** green Views (`#4D7C0F` verge into `#A3E635` grass) left and right
   of the road polygon; 3–4 **acacia trees** per side (flat wide canopy: an SVG ellipse
   `#3F6212` on a thin trunk), positioned at fixed screen spots between horizon and bottom
   — scale them up the lower they sit (fake depth, they don't need to stream in v1).
4. **Road:** dark asphalt polygon `#3F3F46` (SVG), yellow edge lines `#FACC15`, white
   center dashes from `renderState.dashes`.
5. **Traffic matatus** (per sprite, a positioned View composition — no images exist in the
   repo, build vector-style with Views; rear view):
   - Body: rounded rect, livery base color; white roof strip on top edge.
   - Rear windshield: dark rounded rect `#1E293B` upper half with a lighter glare stripe.
   - Livery stripe: diagonal/horizontal accent bar in the livery's secondary color across
     the body — this is what makes it a *nganya*.
   - Rear bumper `#334155`, two brake lights (`#F87171` dots), two wheels peeking below.
   - LIVERIES (5): `['#7C3AED'+'#FDE047', '#DC2626'+'#FFFFFF', '#16A34A'+'#FACC15',
     '#0EA5E9'+'#F472B6', '#F97316'+'#0F172A']` (base + accent).
   - Base size ~ `W 118 × H 92` (logical px) multiplied by `scale`; anchor bottom-center
     (`left = x − W*scale/2`, `top = y − H*scale`). Use absolute positioning from
     percentage coords of the playfield container (measure with `onLayout`).
6. **Coins:** gold circle `#FBBF24`, inner ring `#F59E0B`, tiny star; base ~34 px.
7. **Player matatu:** same construction, fixed livery (purple `#7C3AED` + yellow
   `#FDE047`, roof text "MANYANGA" tiny white caps). Positioned via **Animated.Value**:
   `translateX` springs to the current lane's projected x (spring config
   `{ tension: 120, friction: 14 }`, native driver) — the engine snaps lanes; the spring
   sells the swerve. Add a slight static rotateZ of `-1.5deg`/`+1.5deg` while the spring is
   settling if cheap to do; skip if fiddly.
   Blinking: when `player.blinking`, loop opacity 1 → 0.35 (Animated, native driver).
8. **Speed sensation extras (cheap, high value):** two short white "speed line" Views near
   the screen edges whose opacity pulses with speed; subtle darker vignette at the corners
   (4 absolutely-positioned Views with rgba black, or skip).

Everything must render at **30 fps state updates** (see §7) without images or GL. Keep
every sprite < ~10 Views. Avoid shadows on moving sprites (Android perf).

## 7. Runtime Hook (`useManyangaRuntime.ts`)

Copy the shape of `useCrazyBalloonRuntime.ts` (including `SeededRuntimeRandom`):

- `playingLoop = new IntervalGameLoop(33)` → ~30 Hz ticks while `status === 'playing'`.
  The engine integrates with real `dtMs`, so jank degrades gracefully instead of slowing
  the game.
- `rescueLoop = new IntervalGameLoop(100)` while `status === 'rescue_quiz'` (drives the
  countdown only).
- Expose: `state`, `events`, `start()`, `returnMenu()`, `steer(direction)`,
  `answerRescue(answer)`.

## 8. Screen Spec (`ManyangaScreen.tsx`)

Props: `{ onBack: () => void; onAddPoints: (points: number) => void }` — wired in
`KitabuApp.tsx` exactly like `CrazyBalloonScreen`.

- **Controls:** two invisible full-height `Pressable`s over the left/right halves of the
  playfield (`steer('left')` / `steer('right')`). Active only while `playing`.
- **HUD (absolute, top):** back button (left, rgba-white circle like CrazyBalloon); score
  big bold white with dark text-shadow (top right, like the Rail Rush screenshot); coin
  chip `● 5` below it; speed `82 km/h` small; three rescue dots (unused = `#22C55E`,
  used = `#EF4444`).
- **Menu overlay:** dark scrim + poster card — "MANYANGA!" chunky title (orange like the
  GameZone card), subtitle "Race matatus through Nairobi streets", control hint ("Tap left
  or right to change lanes"), big Start button. Rules row: "Crash? Answer in 5s to keep
  racing. 3 rescues per run."
- **Rescue overlay — the glassmorphic card (spec, no blur dependency exists so fake it):**
  - Scrim: `rgba(15,23,42,0.30)` (light — the frozen race must stay visible behind).
  - Card: `backgroundColor: 'rgba(255,255,255,0.14)'`, `borderWidth: 1.5`,
    `borderColor: 'rgba(255,255,255,0.45)'`, `borderRadius: 28`, generous padding,
    `shadowColor '#000', shadowOpacity 0.35, shadowRadius 24` + a second inner
    highlight View (`rgba(255,255,255,0.10)`) across the top half for the glass sheen.
    Text in white. Option buttons: `rgba(255,255,255,0.18)` with `rgba(255,255,255,0.4)`
    border, letter markers A/B/C.
  - Countdown: 5→0 progress bar at the card top (green → amber `#F59E0B` under 2 s) plus
    `x.xs` numeric readout. Header: "🚨 CRASH! Answer to keep racing" and
    "Rescue N of 3".
- **Game over overlay:** solid white card (matches CrazyBalloon result card): "Game Over",
  final score huge, `distance m` + coins summary, "+{score} points earned", Play Again
  (→ `runtime.start()`) and Main Menu buttons.
- **Points award:** replicate the `awardedStatusRef` guard from `CrazyBalloonScreen`
  verbatim (award `Math.floor(score)` once per gameover, keyed on
  `status:score:distance`).
- **Effects:** on `crashed` event flash `rgba(239,68,68,0.18)` overlay ~400 ms; on
  `rescued` flash green. Follow the `useCrazyBalloonEffects` pattern (add a
  `useManyangaEffects` beside it in `GameEffectsController.ts`).

## 9. Wiring Checklist

1. `native-app/src/types/app.ts` → add `| 'manyanga'` to `BaseViewState`.
2. `native-app/src/hooks/useKitabuApp.ts` `playGame()` → before the coming-soon fallback:
   `if (gameId === 'manyanga') { navigateTo('manyanga'); return; }`
3. `native-app/src/KitabuApp.tsx` →
   `case 'manyanga': return <ManyangaScreen onAddPoints={actions.addPoints} onBack={() => actions.openFeature('game_zone')} />;`
   and `manyanga: 'Manyanga!'` in the title map.
4. `packages/game-core/src/index.ts` → `export * from './manyanga';`

## 10. Tests & Verification

Add to `native-app/__tests__/gameCore.test.ts` (reuse `FixedSequenceRandom`), minimum:

1. Tick with traffic in player lane inside the crash window → `status 'rescue_quiz'`,
   `rescueTimeLeftSec === 5`, `crashed` event.
2. Correct `answer_rescue` → `'playing'`, `rescuesUsed === 1`, `invulnerableSec > 0`, and
   the offending traffic is gone from the player lane.
3. Wrong answer → `'gameover'` + `game_over` event with floored score.
4. Countdown timeout (tick 5100 ms in rescue) → `'gameover'`.
5. Crash with `rescuesUsed: 3` → immediate `'gameover'` (no quiz).
6. Coin at `z: 2` in player lane collected on tick → `coins === 1`, score +5,
   `coin_collected` event.
7. Steer clamps at edges (steer left at lane 0 stays 0) and is ignored while
   `rescue_quiz`.

Run: `npm --prefix native-app run typecheck` and `npm --prefix native-app test` —
**note:** `native-app/node_modules` may not be installed in the worktree; if
`tsc` fails with `expo/tsconfig.base not found`, run `npm install` in `native-app`
first (or flag it in the handoff summary instead of claiming verification).

## 11. Quality Bar / Acceptance Criteria

- Road + dashes visibly *stream* toward the camera and speed up over time; the vanishing
  point never moves. Traffic grows smoothly from horizon dot to full sprite with 1/z
  scaling (no linear pop-in).
- Nairobi is recognizable at a glance: KICC silhouette + acacias + nganya liveries.
- Lane change feels sprung, not teleported; crash freeze is instant; rescue card is
  readable over the frozen scene; timer pressure is obvious.
- Exactly 3 rescues; 4th crash or any wrong/timeout ends the run; points land in the
  student profile once.
- No new npm dependencies. No `Math.random`/`Date.now` inside `packages/game-core`.
- All copy is student-friendly English (match the app's tone; "Manyanga!" branding).

## 12. Handoff Protocol

If you stop mid-way: commit what compiles, then update the **Status markers** column in
§3's table (✅ / 🚧 / ❌) and list any deviations from this spec at the bottom of this file
under a `## Deviations` heading. The next agent trusts this file over the git log.
