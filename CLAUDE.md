# CLAUDE.md — Goop Tower dev guide

**Goop Tower** is a deliberately-stupid 3D incremental game: slap goop onto a wobbling, physically
jiggling tower and climb it from a kitchen counter to "Past God" across 7 zones, or melt into a
puddle trying. Losing grants meta-currency (Goop Essence), so no run is wasted. Full design is in
[`PLAN.md`](./PLAN.md) — read the relevant section before touching a system. This file is the
standing context + session handoff; keep §"Current milestone" updated at the end of every session.

## Architecture invariants (PLAN §10 — do not break)
- **`src/sim/` is pure & deterministic.** No `three.js`, no DOM/browser globals, seeded RNG only
  (`src/sim/rng.ts`). Enforced by an ESLint rule (`.eslintrc.cjs` override on `src/sim`+`src/config`);
  `npm run lint` fails if you import `three`/`window`/`document`/`localStorage` there.
- **All tunable numbers live in `src/config/`** (`balance.ts` is the single source of truth). Never
  hardcode balance numbers in gameplay logic.
- **UI/renderer read sim state through the store** (`src/store.ts`, custom pub/sub) and call its
  actions; they never mutate sim state directly.
- **All goop quantities are `Decimal`** (break_infinity.js) via `src/sim/numbers.ts` — never raw JS
  numbers for goop. (Height is a plain number; it never exceeds the double range.)
- **Content is data-driven.** A new producer/upgrade/event/zone is a config entry, not a new code
  path. Flavor text must be funny (see Style below).

## Commands
- `npm run dev` — Vite dev server.
- `npm test` — Vitest unit + balance acceptance tests (`tests/`).
- `npm run sim` — headless balance harness report (`sim-harness/`). Run after any balance change.
- `npm run build` — strict typecheck + production build.
- `npm run lint` — ESLint (enforces the sim-purity rule).

## Definition of done for a gameplay PR
1. `npm test` green (incl. PLAN §14 acceptance tests) and `npm run lint` clean.
2. If balance changed: `npm run sim`, paste the table into `docs/balance-notes.md` with a one-line
   rationale, and update the acceptance-test windows if intended.
3. No console errors; if the DOM/UI changed, smoke it in a browser (see `docs/balance-notes.md` for
   the M0 Playwright approach) in portrait AND landscape once M1 layouts land.

## Style
- TypeScript strict; `noUncheckedIndexedAccess` is on — index access is `T | undefined`, handle it.
- Flavor text must earn a laugh. Match the established tone, e.g.:
  - Producer: *"Goop Intern — Unpaid. Sighs audibly."*
  - Upgrade: *"Thermal Goop Underwear — -5% melt per level. Surprisingly comfortable."*
  - Puddle screen: *"Every puddle makes you stronger."*
- Prefer the shippable path first (marching cubes before raymarching; DOM UI before fancy). Record
  significant tech/design decisions as ADRs in `docs/decisions/`.

## Known footguns
- **Browser autoplay:** audio only after a user gesture; start muted (settings default `muted:true`).
- **localStorage quota / private mode:** `save/` fails silently and never destroys an unparseable
  save (it stashes it under `goopTower.save.corrupt.*`).
- **UI re-render:** the M0 UI rebuilds `innerHTML` on each ~10 Hz tick and relies on event delegation
  on `#app`; that's why rapid clicking survives the rebuild. Moving to in-place/diff updates is an M1
  task (it will also fix shop scroll-reset).
- **Height vs. zones tension:** the design's meters-per-zone are decoupled from raw sim height — see
  `docs/decisions/0001`. Tune via the harness, not by eyeballing meters.

## Current milestone & next tasks (HANDOFF — update me every session)
**Done: M0 — Skeleton (playable ugly).** Pure sim, prestige + meta shop, data-driven config,
versioned localStorage save, custom pub/sub store, DOM UI (now in-place patched, not innerHTML
rebuild), sim-harness with passing PLAN §14 acceptance tests. Deployed to GitHub Pages
(`.github/workflows/deploy.yml`, auto-deploys on push to `main`).

**Done: M1 (core slice) — The Tower.** three.js renderer in `src/render/` (reads a duck-typed
`RenderSource`, mutates nothing; lint still enforces sim purity): `MarchingCubes` goop tower that
springs/grows with `heightRaw`, framing camera dolly, per-zone gradient sky + ground + salt-shaker
prop, full-viewport canvas behind the DOM overlay. Renderer owns its own rAF (store `emit()` is only
10 Hz) and interpolates 10 Hz → 60 fps. Driven by the live store OR a mock fixture via `?mockrender`
(`src/render/mockState.ts`). See ADR `docs/decisions/0002-m1-tower-rendering.md`.

**Done: M1b (part 1) — juice.** Click-splat droplet bursts (`src/render/splats.ts`, instanced pool)
and wobble/squash springs on the tower (`src/render/tower.ts`, base-pivoted group). Renderer watches
`run.clicks` to fire impacts; idle sway scales with combo + melt-warning.

**Done: M1b (part 2) — HUD + responsive + tower/DOM alignment.** Run screen is now a floating HUD
over a transparent `#stage` click-catcher (stats top-left, melt banner top-center, height/zone/combo
readout bottom-center, shop docked-right & collapsible in landscape / bottom-sheet in portrait, ≥44px
targets). The renderer measures the `#stage` DOM rect each frame and pans the camera (NDC anchor in
`src/render/camera.ts`) so the 3D tower lines up inside it in both orientations; goop base now meets
the ground. Verified with a headless smoke at 1920×1080 and 390×844. **M1 (The Tower) is complete.**

**Done: M2 (slices 1-3) — The Run + mobile polish pass.**
- Melt-warning **screen vignette** + **collapse cinematic** (slump/spread + red drip-storm).
  `?debug` exposes `window.__goopStore`.
- **Feel pass (2026-07):** continuous springy growth + surface boil (`render/tower.ts`),
  tap-located combo-scaled splats w/ per-instance colors (`splats.ts`), per-producer ambient FX
  (`producerFx.ts`), zone crossfade + camera pulse + DOM zone toast, quality tiers (`quality.ts`),
  context-loss recovery. Mobile input hygiene (touch-action/tap-highlight/user-select, pressed
  states, 44px, haptics, floaters, purchase flash, buy ×1/×10/MAX, safe-areas, orientation).
  **First audio pass** (`src/audio/` — synthesized squelch pool per §11, purchase blips, zone
  stings; muted default, toggles in menu/pause/HUD).
- **Progression hardening (2026-07):** full producer ladder reachable in a winning run (late
  ladder compressed/strengthened, tier rungs at 200/400, late run-upgrade shelf), zones/WIN
  recalibrated to measured curves (WIN raw 100), GE soft cap (win ≈ 54K not 1.23M),
  meta costGrowth 2.0 → **first win ≈ run #11 / ~4.2 h** (new prestige-path acceptance test).
  Harness bots now SAVE (see `sim-harness/core.ts`); calibrate with `trajectory.ts`/`prestigePath.ts`.
- **Release infra:** OG/PWA meta + manifest + generated icons (`scripts/icons.mjs`), three.js
  `manualChunks` split (app 33KB gz), pagehide saves, settings forward-merge.
- **Verification tooling:** `node scripts/smoke.mjs` (3-viewport Playwright smoke: screenshots,
  console errors, juice probes), `scripts/mockshots.mjs` (renderer timeline captures).

**Done: M3 (slice 1) — Achievements + feel/clarity revision (2026-07-12).**
- **100 achievements** (Steam per-app cap): data-driven `config/achievements.ts` (pure predicates
  over an `AchievementCtx`), evaluated ~1 Hz in `Game.tick()` + on win/collapse/bank transitions
  (`sim/achievements.ts`). Each grants +0.5% goop/sec (`balance.achievements`). MetaState gained
  `puddles`/`lifetimeGe`/`achievements` (save-migrated via defaults merge). Menu shows a 100-tile
  board (tap to inspect) + a mid-run 🏆 overlay; unlocks toast+blip on any screen (toast node
  lives on `<body>`). Tiles use a **handmade inline-SVG icon set** (`src/ui/icons.ts`, ~38 motifs;
  configs reference icon KEYS, one per family, with tier pips) — no emoji on the board.
  Median win moved 54:07 → 46:48 (in window) — see balance-notes.
- **Taps now ADD goop** visually: blobs converge on the tap point and are absorbed
  (`splats.absorb()`), with settling drips — replacing the outward "damage ejecta" burst.
- **Wet squelch audio**: smack transient + resonant-lowpass-dive noise + low blub wobble.
- **Clarity pass**: emoji icons on every producer/upgrade/meta item (config `icon` fields);
  HUD says "Goop/sec" and "Melt shield: Ns" (seconds only); combo is "Slap Combo"; shop panels
  are "Goop Makers / ×2 Boosts / Upgrades" with plain-language subtitles + per-maker rate lines.

**Done: M3 (slice 2) — Continuous ascent environment (2026-07-12).** Design decision: the sky is a
smooth ALTITUDE gradient (`palette.ts paletteAt()` blending zone palettes by raw height — no
per-zone color cuts; zone identity = toast/sting/props). `render/markers.ts` adds fixed-altitude
scale markers that sweep past the climbing tower top (toaster → birds → house/water tower →
"WHY" blimp → clouds/jet → satellite/astronaut → Moon → face-planet; K=0.55 world-units per raw,
±9 raw visibility window; portrait frustum is the tight axis — keep |x| ≤ ~4.5 and push z back).
Starfield fades in above raw 30; ground/shaker fade out ~raw 14-26. Env exposes `live` blended
palette consumed by tower/splats/light.

**Done: M3 (slice 3) — Ascent phase 2: cardboard-cutout world (2026-07-12).** All background
assets are 2D-on-3D "cardboard cutouts" (LBP style): `render/sprites.ts` draws each asset with
canvas 2D and mounts it as a `board()` — three stacked planes (drawn face over two offset
cardboard-tan silhouette layers) with a per-prop y-tilt so the THICKNESS edge shows; the camera
settles to the front view during runs (orbit eases home) so tilts read consistently. Props split
into GROUND SCENERY (shaker/toaster/houses/water tower standing at staggered depths from frame
one, fading with the ground) and ALTITUDE FLYBYS. Slap feedback is a radial SWELL (squash is
collapse-only) and camera framing ignores tap deformation — no per-tap screen bob. PORTRAIT
frustum check: halfW ≈ 0.215 × depth-from-camera (camera ~7 back at zoom 1) — keep props inside. `markers.ts` gained the cat photo, kite,
hot-air balloon, UFO, goop whale (raw 66), marble hand w/ cocked flick finger (raw 96), the salt
shaker (now a cutout; 3D prop removed), and the **planet recession** — the home planet (counter-
tile ball w/ goop continents) shrinks away below from raw ~13-72. A **view zoom** (🔭 HUD button,
store.viewZoom 1/1.7/2.6, threaded through RenderSource → camera dist + marker window) lets
players pull back and see the diorama. The goop tower is **lumpy** now (persistent per-blob girth/
offset hashes + protruding flank lumps that ooze downward; foot slimmed). Run HUD dropped the
decorative "🟢 GOOP TOWER" title (buttons row: 🔭🏆🔊❚❚). Main menu redesigned: hero (title +
big START + vitals line) over three collapsible sections (Permanent Upgrades / Achievements /
Stats & Settings; state in GoopUI.menuSections survives re-renders).

**Next (see `docs/release-roadmap.md` for the full ordered list):** chaos events (sim stub at
`src/sim/events.ts`), Zone 7 boss "The Flick" (the hand cutout already waits at raw 96),
real-device iOS/Android QA, prestige-path Z4-wall smoothing, save/offline test coverage +
export/import UI.
