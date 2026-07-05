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
**Done: M0 — Skeleton (playable ugly).** Pure sim (producers/costs/melt/combo/zones/win), prestige +
meta shop, data-driven config, versioned localStorage save (export/import, capped offline), custom
pub/sub store, DOM-only UI (menu → run → win/puddle), and the **sim-harness with passing PLAN §14
acceptance tests**. Balance first-pass tuned & logged in `docs/balance-notes.md`.

**Next: M1 — The Tower (PLAN §17).**
- three.js scene + `MarchingCubes` tower that grows with `heightRaw`, click splats, wobble springs,
  camera dolly, Zone 1 environment. Renderer lives in `src/render/`, reads store state, mutates
  nothing. Build against a mock sim-state fixture so it never blocks on sim work.
- Responsive portrait + landscape layouts (PLAN §9.2); replace the M0 innerHTML rebuild with in-place
  updates.
- Known follow-ups from M0: win-run GE payout is very large (faithful to §4's formula but likely
  needs a cap — see balance-notes); events scheduler is a stub (`src/sim/events.ts`) awaiting M3.
