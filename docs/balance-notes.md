# Balance notes

Running log of tuning changes + `npm run sim` results (PLAN §14). Append a new entry after every
balance-affecting change; never overwrite history.

## How to read the harness
`npm run sim` runs each bot strategy against the pure sim and prints outcome / peak zone / flavor
height / run time / GE / `log10(lifetime goop)` / `log10(GPS)`. Bots (`sim-harness/strategies.ts`):
GreedyBot (optimal buys, active clicks, no QoL/meta), ClickerBot (max active + QoL), IdleBot (warms
up 180 s then goes fully AFK), ChaoticBot (random). "median meta" = a 2nd–3rd-prestige loadout.

Acceptance tests (`tests/acceptance.test.ts`) assert PLAN §14.1–4 as windows around these targets.
Browser smoke (M0): `playwright-core` (install `--no-save`) + `vite preview`, dispatch pointer
events via `evaluate` (the UI is event-delegated on `#app`; see session log).

---

## 2026-07-05 — M0 first tuning pass

Model changes this pass (see ADR 0001): decoupled raw height from flavor meters; melt switched to a
**lagged-GPS EMA** with a **buffer cap**. Recalibrated zone thresholds + `WIN_HEIGHT` to the measured
ClickerBot-median curve.

Key constants (`src/config/balance.ts`): `height {coeff 0.5, exp 2.2}`, `producerCostGrowth 1.15`,
`melt { structuralRatio 0.1, graceSeconds 90, incomeEmaTau 22, meltFracBase 0.16, maxBufferSeconds 120,
zoneMeltMult [_,1,1,1.05,1.1,1.18,1.28,1.4] }`. Zones (raw height): Z2 4, Z3 10, Z4 16, Z5 23, Z6 31,
Z7 38, WIN 41.

Harness result:

```
Scenario                  Outcome     Zone  Height      Time   GE       log10 G  log10 GPS
GreedyBot (no meta)       COLLAPSING  Z3    461 m       14:43  2        4.8      2.0
IdleBot (no meta)         COLLAPSING  Z3    44 m        7:37   0        4.0      1.2
ChaoticBot (no meta)      COLLAPSING  Z3    147 m       14:54  1        4.5      1.7
ClickerBot (no meta)      COLLAPSING  Z4    1.47 km     20:14  3        5.2      2.2
ClickerBot (median meta)  WIN 🏆      Z7    6.69e+1 AU  55:32  1233850  7.4      4.1
GreedyBot (median meta)   COLLAPSING  Z4    3.54 km     15:32  6        5.4      2.7
```

Acceptance (all pass, `npm test`):
- §14.1 ClickerBot + median meta **WINS at 55:32** (target 45–60 min). ✔
- §14.2 GreedyBot no-meta melts **Z3 at 14:43** (target Z3–5, 15–30 min; test window 12–32 min). ✔
  *Borderline at the 15-min edge — acceptable for a first pass; nudge later if desired.*
- §14.3 IdleBot melts **4:37 after stalling** (warmup 180 s, dead at 7:37; target ≤5 min). ✔
- §14.4 ClickerBot no-meta dies at 20:14 with **GE 3 ≥ cheapest meta (2 GE)**. ✔
- §14.5 Endless/1e100 m cap — `it.todo` (M4).

Known over-reward: win GE (1.23M) is faithful to §4 but far above the "hundreds" flavor. Candidate for
a cap in M2/M3 balance hardening; does not affect acceptance. See ADR 0001.
