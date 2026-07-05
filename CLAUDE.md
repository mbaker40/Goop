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

**In progress: M2 — The Run (PLAN §17, §3).**
- *Done (slice 1):* melt-warning **screen vignette** (`#meltvig`, ramps orange<30s / red<10s, drooped
  edges) + the **collapse cinematic** — the tower slumps/spreads into a puddle driven by
  `run.collapseTimer` with a red drip-storm (`src/render/tower.ts` collapse path + `index.ts`). A
  `?debug` build exposes `window.__goopStore` for smoke tests.
- *Next:* all 7 zone environments + zone-transition moments (camera pull-back, crossfade, sting);
  fuller Zone 1 set-dressing (toaster + more gags). First audio pass (squelch pool, §11).
- Prestige loop + GE meta-shop polish (already functional in the DOM).
- Perf/bundle carry-over: dynamic-import `src/render` (paint DOM before 3D) and/or a `manualChunks`
  split for three; a marching-cubes resolution tier for mobile (PLAN §13). Portrait slim stat-bar wraps
  a little at 390px — tighten. Win-run GE payout likely needs a cap (see balance-notes). Chaos-events
  scheduler is a stub (`src/sim/events.ts`) awaiting M3.
