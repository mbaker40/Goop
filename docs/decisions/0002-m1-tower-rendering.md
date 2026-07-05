# ADR 0002 — M1 tower rendering (marching cubes, RenderSource seam, own rAF)

Status: accepted (M1 core slice)
Date: 2026-07-05

## Context
M1 adds the three.js tower that makes the number *felt, not read* (PLAN pillar #1). Several
implementation choices needed pinning down; the sim/UI already existed and must not be disturbed
(architecture rule: `src/render` reads state, mutates nothing — PLAN §10).

## Decisions

### 1. Marching cubes before raymarch
Render the goop tower as a `MarchingCubes` (three addon) metaball column — the *proven, shippable*
path per PLAN §9.1. The raymarched-SDF upgrade behind a quality toggle is deferred to M5. This keeps
M1 unblocked and cross-platform (WebGL2).

### 2. A narrow `RenderSource` seam, not a store dependency
The renderer depends on `src/render/source.ts` — a duck-typed interface exposing only what it reads
(`screen`, `game.heightRaw()/currentZone()/bufferSeconds()`, `run.{status,combo,collapseTimer}`,
`subscribe`). The real `Store` satisfies it structurally, and `src/render/mockState.ts` implements it
for isolated visual testing via `?mockrender`. This honours "build against a mock sim-state fixture
so the renderer never blocks on sim work" (PLAN §16.2) and keeps the render layer swappable.

### 3. Renderer owns its own rAF and interpolates; store `emit()` is not the render clock
`store.emit()` fires only ~10 Hz (and is silent on menu/win/puddle). The renderer runs its **own**
requestAnimationFrame loop, re-reads `store.game` each frame (it is swapped on `startRun()`, so never
cache it), and **springs** `renderedHeight` toward `heightRaw` — smoothing the 10 Hz sim into 60 fps
motion (`balance.tickHz` comment: "rendering interpolates"). The spring is also where wobble will live.

### 4. Renderer-owned zone palette
`ZoneDef` has no colour fields yet, and adding them is a sim/config change out of scope for a render
slice. The zone→palette map lives in `src/render/palette.ts`. If/when config grows palette data, the
renderer can switch to reading it without an interface change.

### 5. Canvas layered behind the DOM overlay
A full-viewport `<canvas id="scene">` sits `position:fixed; inset:0; z-index:0; pointer-events:none`
behind `#app` (`z-index:1`). The run-screen `.tower` element became a transparent click-catcher so
the 3D tower shows through while pointer input still flows through DOM delegation on `#app`.

## Consequences / known follow-ups (M1b)
- Deferred by scope: click-splat impacts, wobble/jiggle springs, the other 6 zone environments, full
  Zone 1 set-dressing, responsive portrait/landscape, post-fx/bloom (M5).
- **Camera/DOM alignment:** the 3D tower is screen-centred while the DOM tower region is in the left
  column on wide layouts — they don't yet line up. Aligning them is part of the responsive pass.
- **Bundle size:** three.js pushes the JS bundle past 500 kB. Consider dynamic-importing `src/render`
  so the DOM UI paints before the 3D loads, and/or a `manualChunks` split for three (better caching).
- **Perf:** marching cubes re-polygonizes every frame at resolution 40 (CPU cost ~res³). Fine on
  desktop; for the mobile budget (PLAN §13) consider a resolution tier or updating the field at a
  lower rate than the camera/material.
- The goop base currently floats slightly above the ground (metaball isolation clips near field
  edges) — cosmetic, to tidy in M1b.
