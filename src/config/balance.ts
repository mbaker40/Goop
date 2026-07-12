/**
 * balance.ts - THE single source of truth for tunable numbers (PLAN §5).
 *
 * Never hardcode balance numbers in gameplay logic. Everything the simulator
 * (§14) tunes lives here. Values are STARTING points; see docs/balance-notes.md
 * for the tuning log and docs/decisions/0001-* for the height/zone tension.
 */

export const balance = {
  /** Fixed sim tick rate (PLAN §13). Logic runs at 10 Hz; rendering interpolates. */
  tickHz: 10,

  /** Height from lifetime goop (PLAN §5.1): height_m = coeff * (log10(goop+1))^exp.
   *  NOTE: the raw meters here are decoupled from the flavor "real-world" meters in
   *  the zone table - see docs/decisions/0001. Zones are thresholded on this height. */
  height: {
    coeff: 0.5,
    exp: 2.2,
  },

  /** Producer cost curve (PLAN §5.2): cost(n) = baseCost * growth^n. */
  producerCostGrowth: 1.15,

  /** Bulk-buy helper geometric sum uses the same growth. */

  /** Click power (PLAN §2.1 / §5.2). Base slap + % of GPS from "Slap Harder" upgrades. */
  click: {
    basePower: 1,
    /** Combo bar ("Goop Momentum", §2.1): consecutive clicks within `window` s build toward maxMult. */
    comboWindowSec: 0.8,
    comboMaxMult: 3,
    /** How many clicks (at full cadence) to reach max combo. */
    comboClicksToMax: 20,
    /** Combo multiplier lost per second while idle. */
    comboDecayPerSec: 1.5,
  },

  /** Melt / structural goop (PLAN §5.3).
   *
   *  MODEL (a tuned realization of §5.3 - see docs/decisions/0001): melt tracks a LAGGED
   *  exponential moving average of GPS. Structural buffer gains `structuralRatio` of income;
   *  melt drains `meltFracBase * zoneMult` of the *lagged* income. Because the lag makes melt
   *  trail rising income, growing fast keeps you safe; stalling lets melt catch up and, since
   *  meltFracBase > structuralRatio, overtake - death in a few minutes at ANY scale. Clicks add
   *  to the buffer but not to the melt EMA, so active play is pure upside (PLAN pillar #2). */
  melt: {
    /** Fraction of income that shores up the tower's Structural Goop buffer. */
    structuralRatio: 0.1,
    /** Grace period at run start with zero melt (PLAN §6 first-run guardrail). */
    graceSeconds: 90,
    /** Time constant (s) of the GPS moving average that melt lags behind. Larger = more forgiving. */
    incomeEmaTau: 26,
    /** Steady-state melt as a fraction of lagged GPS. MUST exceed structuralRatio so stalling kills. */
    meltFracBase: 0.18,
    /** Cap the structural buffer at this many seconds of current melt. Bounds a healthy grower's
     *  cushion so that STALLING anywhere melts you within ~this window (PLAN §14.3) without
     *  making moment-to-moment growth harsher (the EMA lag still protects active play). */
    maxBufferSeconds: 120,
    /** Seconds after the grace period over which melt ramps from 0 to full strength - new players
     *  meet the mechanic as a slope, not a wall (was: instant full melt = carpal-tunnel opener). */
    rampSeconds: 90,
    /** Per-zone melt escalation (index 0 unused; 15 zones). Early zones are gentle on purpose -
     *  a first run should die in zones 4-6 around the 12-20 min mark, not sweat from minute two.
     *  Zones 10-15 steepened 2026-07-12 after a first-run human win: attentive event play adds
     *  ~+30% income the bots never measured, so the late wall must hold against it. */
    zoneMeltMult: [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.08, 1.15, 1.22, 1.3, 1.4, 1.52, 1.66, 1.82, 2.0],
    /** Endless depth melt escalation (PLAN §5.4): meltRate *= (1 + depth*perDepth). */
    endlessPerDepth: 0.5,
    /** Melt resistance from upgrades is capped so melt never becomes irrelevant. */
    maxResistance: 0.75,
    /** Warning thresholds in seconds-of-buffer-remaining (PLAN §5.3). */
    warnOrangeSec: 30,
    warnRedSec: 10,
    /** Collapse cinematic length before the puddle screen. */
    collapseSeconds: 8,
  },

  /** Prestige / Goop Essence (PLAN §4). GE = floor(sqrt(peakHeight)/coeffDiv) * winMult, with a
   *  soft cap above `softCapStart` (excess grows as ^softCapPower) so a WIN pays thousands of GE,
   *  not the uncapped ~1e6 the raw formula yields at 1e13 flavor-meters (the known M2 exploit -
   *  see docs/balance-notes.md). */
  prestige: {
    geCoeffDiv: 5,
    winMultiplier: 3,
    loseMultiplier: 1,
    softCapStart: 300,
    softCapPower: 0.5,
  },

  /** Achievements (PLAN §7): each unlock grants a small permanent goop/sec bonus. */
  achievements: {
    gpsPctEach: 0.005,
  },

  /** Chaos events (PLAN §8): scheduler mechanics. The event POOL lives in config/events.ts. */
  events: {
    /** Never two at once; at least this long between events. */
    minGapSeconds: 45,
    /** Random extra gap on top of the minimum (events land every ~2-4 min). */
    extraGapMin: 75,
    extraGapMax: 165,
    /** No events until the run has been active this long past grace (don't ambush the tutorial). */
    warmupSeconds: 30,
  },

  /** Offline progress (PLAN §12): capped GPS credit, melt paused. */
  offline: {
    maxCreditSeconds: 600,
  },

  /** Number formatting cutover to scientific notation (PLAN §13). */
  format: {
    scientificAbove: 1e33,
  },
} as const;

export type Balance = typeof balance;
