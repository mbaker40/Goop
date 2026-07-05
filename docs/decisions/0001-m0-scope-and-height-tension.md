# ADR 0001 — M0 scope, and the height/zone/melt model

Status: accepted (M0)
Date: 2026-07-05

## Context
PLAN.md is a full 6-milestone game design. This first session builds **Milestone 0** only: the
"playable ugly" text version (pure sim + config + save + DOM UI + the balance harness). Two design
details in the plan are internally inconsistent and had to be resolved to make M0 winnable.

### 1. Height-in-meters vs. the zone table (PLAN §5.1 vs §3)
§5.1 gives `height_m = 0.5 * (log10(goop+1))^2.2`, but that function tops out around ~1600 m for any
plausible goop, while §3's zone table runs to 1 AU (1.5e11 m) at Zone 7. The two cannot both be
literal. §14 explicitly says reconciling this is "the simulator's first job."

**Decision:** decouple **raw sim height** (the `height()` function, used for zone thresholds, win, and
GE) from **flavor "meters"** shown in the UI. Raw height is what gameplay runs on; `displayMeters()`
(`src/config/zones.ts`) maps raw height → the design's flavor meters via log-interpolated anchors, so
the player still visibly climbs counter → ceiling → orbit → Past God. Zone thresholds and `WIN_HEIGHT`
are calibrated to the measured ClickerBot-median growth curve (~raw 40 at ~52 min) rather than to
meters. GE is derived from `displayMeters` so payouts match §4's examples (Zone 3 ≈ 1 GE, Zone 5 ≈ tens).

### 2. Melt model (PLAN §5.3)
§5.3 describes `baseMelt(zone)` draining a Structural Goop buffer, with "stop buying ⇒ die in 3–5 min
in any zone" and "progress = safety." A naive per-zone-constant melt keyed to a reference GPS made the
game either instantly lethal or trivially safe (the survival threshold is razor-thin at any fixed
number).

**Decision:** melt tracks a **lagged EMA of GPS** (`balance.melt.incomeEmaTau`, `meltFracBase`). Because
the lag makes melt trail rising income, growing fast keeps you safe; stalling lets melt catch up and —
since `meltFracBase > structuralRatio` — overtake, killing you within minutes at ANY scale (it's all
relative to income, so it's scale-invariant, satisfying "in any zone"). Clicks add to the buffer but
NOT to the melt EMA, so active play is pure upside (design pillar #2). A **buffer cap**
(`maxBufferSeconds`) bounds a healthy grower's cushion so a stall anywhere melts within ~the cap window
without making moment-to-moment growth harsher. This is a faithful realization of §5.3's intent; the
Structural Goop buffer and warning states remain exactly as specified.

## Consequences
- All four §14 acceptance criteria pass with the harness (see `docs/balance-notes.md`).
- `referenceGps`/`baseMeltFrac` from an earlier draft are gone; melt is EMA-based.
- Endless scaling and the 1e100 m cap (§5.4, §14.5) are **not** implemented in M0 — they're M4. The
  cap acceptance test is `it.todo`.
- Win-run GE is faithful to §4's `sqrt(meters)/10 × 3` but is very large at 1 AU+ (~1.2M GE). Flagged
  for a cap in a later balance pass; it does not affect M0 acceptance.

## Alternatives considered
- Keeping literal meters and making producers scale to 1e50+ GPS: would require inventing a much larger
  producer/prestige economy than the plan specifies — out of M0 scope.
- Per-zone constant melt: rejected (too sensitive; can't satisfy "die in any zone" cleanly).
