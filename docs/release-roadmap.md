# Goop Tower — road to a mobile-browser release

Status after the 2026-07 M2 polish pass (see `docs/research/2026-07-release-readiness.md` for the
audit that produced this). Ordered by ship-impact; each block is roughly one focused session.
Definition of done for every block: CLAUDE.md checklist (tests + lint + sim + portrait/landscape
smoke via `node scripts/smoke.mjs`).

## Done in the M2 polish pass ✅
- Continuous, felt goop growth (springy height, surface boil, tap-located combo-scaled splats).
- Per-producer ambient visual signatures; zone crossfades + camera pulses + zone toasts/stings.
- Mobile input feel: touch hygiene, pressed states, haptics, floaters, purchase flash, buy ×1/×10/MAX,
  44px targets, safe-areas, orientation handling, keyboard access.
- First audio pass (synthesized squelches/blips/stings, rate-limited; sound + haptics toggles).
- Progression hardening: full producer ladder reachable, zones/WIN recalibrated, GE soft cap,
  prestige path to first win ≈ 11 runs / 4.2h — all enforced by acceptance tests.
- Release infra: meta/OG/PWA manifest + icons, three.js chunk split, pagehide saves, quality tiers,
  WebGL context-loss recovery.

## Must-do before calling it "released" (M3-ish)
1. **Chaos events** (PLAN §8) — the sim scheduler is a stub (`src/sim/events.ts`). Ship 4–6 events
   (Golden Goober, Goop Meteor, Health Inspector, Investor) with DOM banners + simple 3D cues.
   This is the biggest missing moment-to-moment hook for an "active" incremental.
2. **Zone 7 boss — "The Flick"** (PLAN §3): 120s Divine Disapproval meter, melt ×5, hand prop.
   Winning is currently a silent threshold crossing; the game's climax doesn't exist yet.
3. ~~Zone set dressing~~ ✅ phase 1 shipped 2026-07-12 as the **continuous ascent** system (design
   decision: smooth altitude gradient, no per-zone color cuts): `render/palette.ts paletteAt()`
   blends sky/fog/ground/goop with altitude; `render/markers.ts` sweeps fixed-altitude scale
   markers past the climbing top (judgmental toaster, birds, house, water tower, "WHY" blimp,
   clouds, looping jet, satellite, thumbs-up astronaut, cratered Moon, face-planet) + a starfield
   above raw 30. ~~Phase 2~~ ✅ shipped 2026-07-12: all assets converted to 2D cardboard-cutout
   sprites (`render/sprites.ts` sticker pipeline), planet-ball recession, goop whale + marble
   hand, new gags (cat photo, kite, balloon, UFO), and a 🔭 view-zoom (1×/1.7×/2.6×) instead of
   keep-top framing. Remaining ideas: parallax depth layers, zone-themed foreground vignettes.
4. **Real-device QA loop**: iOS Safari + Android Chrome on the Pages deploy — the iOS compositing
   invariants (styles.ts:21-46) and audio unlock can only truly be verified on-device.
5. **Prestige-path smoothing**: runs 2–9 currently die on the same Z4 wall. Make zone reach creep
   per prestige (tune mid-`zoneMeltMult` or add an early melt-resist rung) so every run feels
   like progress. Re-run `npx tsx sim-harness/prestigePath.ts` and log it.
6. **Offline-progress + save/restore test coverage** (save layer works but is untested), plus an
   export/import save UI on the menu (the functions exist in `src/save/`).

## Should-do (quality bar for store-front-style polish)
7. ~~Achievements + toasts~~ ✅ shipped 2026-07-12: 100 achievements (Steam cap), +0.5% goop/sec
   each, menu board + unlock toasts. Remaining: Goobers payouts per achievement (M4, with shop).
8. Onboarding coach-marks: first-run pointer at the shop FAB; melt explainer when grace ends.
9. Audio pass 2: GPS ambience layers, melt-warning pulse, distinct per-producer purchase sounds.
10. Service worker + offline PWA (the manifest/icons are already in); wake-lock during runs.
11. Perf: dynamic-import `src/render` so the DOM paints before three.js parses (largest remaining
    first-paint win); test marching-cubes res 24 tier on low-end Android.
12. Streamer mode (PLAN §17 M5): bigger UI text toggle.

## Later (M4+)
- Endless Mode + GOOP TRANSCENDENT cap (re-tune GE soft cap alongside — see balance-notes) + §14.5 test.
- Goobers currency + cosmetics shop + fossils/trophy shelf (menu stat was removed until real).
- Raymarched tower upgrade behind a quality toggle (marching cubes stays the fallback).
- Leaderboard-ish share card (peak height + skin screenshot).

## Tooling you now have
- `npm run sim` — balance table; `npx tsx sim-harness/trajectory.ts` — minute-by-minute growth;
  `npx tsx sim-harness/prestigePath.ts` — road-to-first-win.
- `node scripts/smoke.mjs` — 3-viewport Playwright smoke (screenshots + console errors + juice probes).
- `node scripts/mockshots.mjs` — renderer-only timeline captures across all zones/collapse.
- `node scripts/icons.mjs` — regenerate PWA icons after art changes.
