# Release-readiness deep dive — 2026-07 (four parallel research passes)

Condensed findings from four research agents (progression/balance, rendering/visuals, input/UI,
release infra) that drove the M2 polish pass. Items marked ✅ were FIXED in that pass (see git log
+ `docs/balance-notes.md`); open items live in [`../release-roadmap.md`](../release-roadmap.md).

## Progression / balance
- ✅ **Half the producer ladder unreachable** — a winning run peaked ~2.6e7 lifetime goop; Mother
  (3.3e8), Pipeline (5.1e9), Bottle (7.5e10) could never be bought. Root cause: myopic
  greedy buying (never saving) + late GPS/cost ratios decaying. Fixed via saving-aware harness
  bots, compressed/strengthened late ladder, tier rungs at 200/400, zone recalibration (WIN 41→100).
- ✅ **First win took ~40 prestiges (~16 h)** vs design intent "2nd-3rd prestige". Fixed:
  geCoeffDiv 10→5, meta costGrowth 2.5→2.0 → first win on run #11 (~4.2 h), enforced by a new
  prestige-path acceptance test.
- ✅ **Win GE exploit** — 1.23M GE per win (design says "hundreds"). Soft cap above 300 base GE
  (excess ^0.5) → ~54K. Revisit with Endless in M4.
- ✅ Run-upgrade shop exhausted mid-run → late shelf added (Slap IV/V, Grease III/IV, Cryo Coolant).
- Open: chaos events are a no-op stub; Zone 7 boss ("The Flick") missing — win is a silent
  threshold; Endless mode + 1e100 m cap unimplemented (§14.5 `it.todo`); achievements/fossils/
  Goobers absent (Goobers stat was removed from the menu until it exists); prestige-path runs 2–9
  hit the same Z4 wall (zone reach should creep per run).

## Rendering / visuals
- ✅ Height spring was effectively instantaneous → replaced with under-damped spring + growth-driven
  surface boil + fresh-goop top swell (growth reads continuously).
- ✅ Identical splat for every tap → per-instance colors (fixed shared-material color bleed), tap-located
  bursts via ray→tower-axis cast, combo-scaled size/count/heat.
- ✅ No producer visuals despite flavor text promising them → `producerFx.ts` ambient signatures.
- ✅ Hard-cut zone changes → sky/fog/ground crossfade + camera pull-back pulse.
- ✅ Marching cubes re-polygonized every rAF at res 40 → quality tiers (res 32 / DPR 1.75 / 30 Hz
  field rebuild on coarse-pointer devices); WebGL context-loss recovery added.
- Open: zones 2–7 have no unique set dressing (only palettes); no post-fx (bloom/aberration — M5);
  fixed splat-emission point could sample the deformed surface instead of the axis.

## Input / UI (mobile)
- ✅ No `touch-action`/tap-highlight/user-select hygiene outside #stage; no pressed states; pause
  button under 44px — all fixed globally.
- ✅ No purchase feedback, no buy-×10/MAX (sim already supported count), no zone-change moment in
  the DOM, no haptics, silent audio layer — all added (toast, flash, FAB pulse, vibrate, WebAudio
  squelch synth per PLAN §11 incl. 8/s rate limit + mega-squelch coalescing).
- ✅ Orientation change didn't re-apply the shop drawer transform; safe-area gaps on drawer/FAB.
- Open (deliberate): multi-touch taps each count (reads as a fun mechanic, combo cap bounds it —
  revisit if scores need integrity); no aria-live audit beyond banner/toast; no onboarding
  coach-marks beyond copy hints.
- iOS Safari compositing invariants are load-bearing — see comments in `src/ui/styles.ts:21-46`
  (canvas hidden off-run; #app becomes a fixed composited layer on run; don't "fix" these).

## Release infra
- ✅ 564KB single chunk → manualChunks splits three.js (app 33KB gzip + three 120KB cacheable).
- ✅ Meta tags (description/theme-color/OG/Twitter/apple-*), PWA manifest + generated icons
  (`scripts/icons.mjs`), `pagehide` save hook, settings forward-merge for old saves.
- Already solid: versioned save w/ corrupt-stash + offline credit; Pages deploy gated by lint+test;
  build badge; 100dvh + safe-area handling.
- Open: no service worker (offline PWA), no wake-lock, no error reporting/analytics.
