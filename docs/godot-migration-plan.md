# Goop Tower → Godot migration plan

*Status: PLAN ONLY — nothing implemented yet. Written 2026-07-11 from a codebase inventory plus
research into Godot 4.7 and the Blender MCP asset pipeline.*

## Why migrate

Two goals drive this: (1) use **Blender MCP** (Claude driving Blender over a socket) to generate
3D props/set-dressing for the 7 zones, and (2) a **native experience** (desktop, eventually
mobile) instead of a browser tab.

## Why this is a favorable migration

The codebase is ~2,600 LOC of TypeScript split by a machine-enforced purity seam:

| Layer | LOC | Fate in Godot |
|---|---|---|
| `src/sim` + `src/config` + `src/save` | ~1,040 | **Port** — pure, deterministic, no three.js/DOM. Near-mechanical translation. |
| `tests/` + `sim-harness/` | ~540 | **Port first** — the PLAN §14 acceptance tests + deterministic harness become the *port oracle*: the Godot sim must reproduce the same balance tables (ClickerBot+median-meta wins ~55 min, etc.). |
| `src/render` + `src/ui` + `styles.ts` + `store.ts` | ~1,280 | **Re-author, don't translate** — treat as art-direction/behavior specs (spring constants, palettes, camera dolly params, splat params, melt thresholds). All the iOS-Safari compositing hacks in `styles.ts` simply vanish. |
| Assets | 0 files | Nothing to convert. Everything is procedural today — which is exactly what Blender MCP changes. |

Only two runtime dependencies exist: `break_infinity.js` (needs an equivalent) and `three`
(replaced by the engine).

## The one decision that shapes everything: language

**Recommendation: Godot 4.7+ with C# (.NET), sim as a pure C# class library.**

- [BreakInfinity.cs](https://github.com/Razenpok/BreakInfinity.cs) is a direct port of
  break_infinity.js — same mantissa×10^exponent design, single engine-free file. `Decimal` →
  `BigDouble` with the same semantics makes the sim port close to transliteration, likely
  numerically identical.
- A sim assembly that never references `GodotSharp` gives a *compiler-enforced* purity seam
  (stronger than the current ESLint rule), testable with plain `dotnet test` (xUnit) and a plain
  .NET console balance harness — reproducing today's Vitest + `npm run sim` CI shape with no Godot
  binary in the loop.

**The cost: C# blocks Godot web export** (still true as of mid-2026; official .NET-WASM support
is an open draft, [godot#106125](https://github.com/godotengine/godot/pull/106125)), and C#
mobile export is functional but experimental. Since "native experience" is the stated goal, we
accept losing the GitHub Pages web build — the TS version stays deployed as the web edition
until/unless .NET web export lands.

*Fallback if web export becomes a hard requirement:* all-GDScript with a vendored break_infinity
port (e.g. fork [break-nihility](https://github.com/peachey2k2/break-nihility) or hand-port).
Workable, but clunkier math (no operator overloading) and a riskier big-number dependency.

## Architecture mapping

| Today (TS/three.js) | Godot equivalent |
|---|---|
| `src/sim` pure classes, 10 Hz `tick(dt)` | `GoopTower.Sim` C# class library (no Godot refs); same fixed-timestep accumulator, driven from an autoload |
| mulberry32 `Rng` | Port verbatim (mask to uint32 — C# `uint` makes this natural). Do **not** use Godot's `RandomNumberGenerator` (stream not guaranteed stable across engine versions) |
| `break_infinity.js` `Decimal` via `numbers.ts` | `BigDouble` via a ported `Numbers.cs` (keep the formatter suite: silly suffixes, formatHeight) |
| `src/config` (balance + tagged-union effects) | Balance stays config-as-code in the sim assembly; content (producers/upgrades/zones/flavor) as custom `Resource` `.tres` files once stable — effects remain tagged-union data interpreted by the sim |
| `store.ts` pub/sub + game loop | Autoload singleton (`GameStore`) owning the accumulator, emitting **signals**; renderer/UI read state, call actions — same seam |
| `RenderSource` read-only duck type | Keep the concept: renderer nodes read a read-only sim view; `?mockrender` fixture → a mock-source scene for isolated visual testing |
| three.js `MarchingCubes` tower | **Raymarched metaball fragment shader on a box** first (godotshaders.com pattern; centers/radii uniforms driven by the same lean/squash springs). GPU marching cubes via compute shaders as the M5-style upgrade. This inverts the original plan's ordering because in Godot the shader is the cheap path |
| `splats.ts` InstancedMesh pool | `GPUParticles3D` (or `MultiMeshInstance3D` for the script-driven pool); PER_BURST/GRAVITY params carry over |
| Camera NDC-anchor-to-DOM-rect pan | Deleted — pure DOM artifact. Keep the dolly/idle-orbit math on a `Camera3D` |
| Canvas gradient sky, `zone1.ts`, `palette.ts` | `WorldEnvironment` + gradient sky shader per zone; palettes port as data (and finally move to config, per ADR-0002's note) |
| DOM HUD + `styles.ts` | `Control` nodes: anchors map 1:1 (stats top-left, banner top-center, readout bottom-center); portrait/landscape = two container layouts swapped on viewport `size_changed`. All iOS compositing hacks deleted |
| localStorage save v1 | Versioned JSON at `user://` via `FileAccess`; keep the never-destroy-corrupt-saves rule; add atomic write + rolling backup. **Bonus:** implement the existing base64 export/import so a web save can be pasted into the native build |
| Vitest + `npm run sim` | xUnit `dotnet test` + .NET console harness; gdUnit4 only for scene-level smoke tests; `godot --headless` in CI |
| GitHub Pages deploy | Desktop export artifacts from CI; TS web build stays as-is on `main` until parity |

## Repo strategy

Keep the migration **in this repo** under a top-level `godot/` project directory, with the TS
game untouched and playable throughout. The TS sim-harness output is the golden master; delete or
freeze the TS version only after the Godot build passes the same acceptance windows. Record the
language decision and the shader-first tower decision as ADRs (`docs/decisions/0003`, `0004`).

## Phased plan

**Phase 0 — Golden master (half a session).** Run the TS harness across all bots/seeds and commit
the deterministic result tables (and a few per-tick state trace dumps) as fixtures. This is the
contract the port must satisfy.

**Phase 1 — Scaffold (half a session).** Godot 4.7 .NET project under `godot/`; solution with
`GoopTower.Sim` (pure), `GoopTower.Sim.Tests` (xUnit), `GoopTower.Harness` (console); CI job:
`dotnet test` + harness + `godot --headless` import/export check.

**Phase 2 — Port the sim (1–2 sessions).** `rng.ts` → `Rng.cs` (verify identical uint32
sequences first — it seeds everything), `numbers.ts`, `game.ts`, `prestige.ts`, `events.ts` stub,
config data. Port the unit tests, then the acceptance tests, then golden-master against Phase 0
fixtures. ADR-0001's two load-bearing subtleties — display-meters log-interpolation and the
EMA-lagged melt model — get ported under test, not re-derived.

**Phase 3 — Store, save, loop (1 session).** `GameStore` autoload with the 10 Hz accumulator
(clamp dt ≤ 0.25 s, emit only on tick advance), signals, screen flow; `user://` save with
version-migration chain, offline progress, base64 import of web saves.

**Phase 4 — UI (1–2 sessions).** Control-node screens: menu/meta-shop, run HUD, paused, win,
puddle. Anchors + containers; portrait bottom-sheet vs landscape docked shop; ≥44 px targets via
theme. Progressive producer reveal and shop-list rebuild-on-membership-change carry over as logic.

**Phase 5 — The tower (1–2 sessions).** Raymarch metaball shader + the lean/squash/height springs
(port the semi-implicit Euler integrators and constants verbatim); splat bursts; camera dolly;
melt vignette (CanvasLayer shader); collapse cinematic. Mock-source scene for visual iteration.
Parity check against the current web build side-by-side.

**Phase 6 — Blender MCP asset pipeline (ongoing from here).** See below. First deliverables:
replace the primitive salt shaker, add the toaster, then zone-by-zone set-dressing (≥3 sight gags
per zone, PLAN §9.1) as M2 resumes — now in Godot.

**Phase 7 — Native polish + release.** Audio (greenfield either way — Godot's bus system +
`AudioStreamGenerator` fit the §11 squelch-pool spec well), desktop export presets +
signing/notarization, quality tiers. Mobile export later (C# mobile is experimental — re-check
status when we get there). Then resume the M2→M5 roadmap in Godot.

Rough total: **6–10 focused sessions** to reach feature parity with today's build, with the sim
provably identical and the visuals re-authored.

## The Blender MCP workflow (the payoff)

- **It's a local-desktop loop:** Blender 3.0+ runs on your machine with the addon's socket server
  ("Connect to Claude"); Claude Code/Desktop connects via `uvx blender-mcp`. It does **not** work
  in a headless cloud session (the addon needs Blender's GUI event loop), though the remote-host
  option can point a cloud session at your desktop's Blender if you expose the socket.
- **Day-to-day:** "make a chunky smug low-poly toaster, ~1 m, name the body `toaster` and a box
  named `toaster-colonly`" → Claude writes `bpy` code, screenshots the viewport, you art-direct in
  2–4 rounds. Godot's import honors `-col`/`-colonly`/`-rigid`/`-noimp` suffixes, so props arrive
  physics-ready. Poly Haven integration (CC0) covers HDRIs/ground textures; Sketchfab needs
  per-model license checks; Hyper3D/Hunyuan text-to-3D helps organic shapes but ships messy topology.
- **Import path:** commit exported `.glb` (baked textures — procedural Blender materials do NOT
  survive glTF) as the canonical assets; optionally keep `.blend` sources with Godot's direct
  .blend import for fast local iteration (requires Blender installed; disable for CI).
- **Expectations:** great for props, blockouts, set-dressing (10–30 min per prop); weak for rigged
  characters and precise placement; every asset gets a human pass (scale, origin, backface culling
  on, poly budget).
- **The goop itself stays procedural** (shader/marching cubes) — Blender MCP feeds the world
  *around* the tower.
- This retires PLAN §16.4's "no external asset dependencies" invariant — record that as an ADR
  with the licensing rules (CC0 free-for-all; Sketchfab requires an attribution file).

## Risks

1. **C# web export doesn't exist** — the web edition freezes at the TS build. Mitigation: keep TS
   `main` deployed; revisit when godot#106125 lands (or fall back to GDScript if web becomes primary).
2. **Tower look parity** — the raymarch shader may not match three.js MarchingCubes exactly;
   budget an iteration loop with the mock-source scene and side-by-side comparison.
3. **Float divergence** across .NET/platforms could break golden-master equality — accept
   tolerance-window comparisons (the acceptance tests are already windows, not exact values).
4. **C# mobile is experimental** — treat mobile as a later, re-evaluated milestone.
5. **Blender MCP is local-only** — asset generation happens on the user's machine, not in cloud
   sessions; cloud sessions handle everything else (sim, UI, shaders, import wiring).
6. **Engine download size** — a Godot build is tens of MB vs the current Vite bundle; irrelevant
   for native, one more reason the web edition stays TS.
