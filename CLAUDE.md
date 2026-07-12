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

**Next (see `docs/release-roadmap.md` for the full ordered list):** chaos events (sim stub at
`src/sim/events.ts`), Zone 7 boss "The Flick", per-zone set dressing, real-device iOS/Android QA,
prestige-path Z4-wall smoothing, save/offline test coverage + export/import UI.
