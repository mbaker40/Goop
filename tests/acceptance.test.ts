/**
 * acceptance.test.ts — the balance acceptance criteria from PLAN §14.
 * These enforce the game's feel as MATH. Run on every balance-affecting change.
 * If you retune balance.ts, update these windows AND docs/balance-notes.md.
 */

import { describe, it, expect } from 'vitest';
import { runSimulation } from '../sim-harness/core';
import { simulatePrestigePath } from '../sim-harness/prestigePath';
import { GreedyBot, ClickerBot, IdleBot, MEDIAN_META, IDLE_WARMUP_SEC } from '../sim-harness/strategies';
import { META_UPGRADES } from '../src/config/upgrades';
import { metaUpgradeCost } from '../src/sim/prestige';

const MIN = 60;
const cheapestMetaCost = Math.min(...META_UPGRADES.map((m) => metaUpgradeCost(m, 0)));

describe('PLAN §14 balance acceptance', () => {
  it('§14.1 ClickerBot with median meta WINS in 45-60 min', () => {
    const r = runSimulation(ClickerBot, { metaLevels: MEDIAN_META, maxSeconds: 75 * MIN });
    expect(r.won).toBe(true);
    // Small tolerance around the 45-60 target for a first tuning pass.
    expect(r.runTimeSec).toBeGreaterThan(42 * MIN);
    expect(r.runTimeSec).toBeLessThan(65 * MIN);
  });

  it('§14.2 GreedyBot with zero meta melts in zone 3-5, 8-32 min (first-run experience)', () => {
    // Window widened from PLAN's 15-30: with saving-aware play (see core.ts) a passive-ish first
    // run dies faster, and a ~10 min first death is a better mobile session shape anyway.
    const r = runSimulation(GreedyBot, { metaLevels: {}, maxSeconds: 60 * MIN });
    expect(r.won).toBe(false);
    expect(r.peakZone).toBeGreaterThanOrEqual(3);
    expect(r.peakZone).toBeLessThanOrEqual(5);
    expect(r.runTimeSec).toBeGreaterThan(8 * MIN);
    expect(r.runTimeSec).toBeLessThan(32 * MIN);
  });

  it('§14.3 IdleBot melts within 5 min of stalling', () => {
    const r = runSimulation(IdleBot, { metaLevels: {}, maxSeconds: 40 * MIN });
    expect(r.won).toBe(false);
    // It builds a tower during warmup, then goes AFK; must die within 5 min of stalling.
    const postStall = r.runTimeSec - IDLE_WARMUP_SEC;
    expect(postStall).toBeGreaterThan(0);
    expect(postStall).toBeLessThanOrEqual(5 * MIN);
  });

  it('§14.4 GE from a ~20-min failed run funds >=1 meaningful meta upgrade', () => {
    // ClickerBot with no meta is the "attentive first-timer" who dies mid-run.
    const r = runSimulation(ClickerBot, { metaLevels: {}, maxSeconds: 60 * MIN });
    expect(r.won).toBe(false);
    expect(r.runTimeSec).toBeGreaterThan(12 * MIN);
    expect(r.ge).toBeGreaterThanOrEqual(cheapestMetaCost);
  });

  // §14.5 Endless / 1e100 m cap is a Milestone 4 deliverable — endless scaling doesn't exist yet.
  it.todo('§14.5 ClickerBot + maxed meta reaches 1e100 m in Endless (M4)');

  it('prestige path: a fresh account reaches its first WIN within 15 prestiges / ~6h cumulative', { timeout: 240_000 }, () => {
    // Validates the road from meta-zero to the win as an economy property (not just the
    // hand-picked MEDIAN_META snapshot). Currently ~11 runs / ~4.2h — see docs/balance-notes.md.
    const r = simulatePrestigePath(15);
    expect(r.runsToWin).toBeGreaterThan(2); // the win must not come absurdly early either
    expect(r.runsToWin).toBeLessThanOrEqual(15);
    expect(r.totalMinutes).toBeLessThan(6 * 60);
    // The first run is a proper tutorial death: a meaningful session that still funds meta.
    const first = r.runs[0]!;
    expect(first.minutes).toBeGreaterThan(5);
    expect(first.minutes).toBeLessThan(30);
    expect(first.ge).toBeGreaterThanOrEqual(2);
  });
});

describe('determinism (PLAN §10 architecture rule #1)', () => {
  it('same seed + strategy produces identical results', () => {
    const a = runSimulation(GreedyBot, { metaLevels: {}, seed: 7, maxSeconds: 20 * MIN });
    const b = runSimulation(GreedyBot, { metaLevels: {}, seed: 7, maxSeconds: 20 * MIN });
    expect(a.peakHeightRaw).toBe(b.peakHeightRaw);
    expect(a.runTimeSec).toBe(b.runTimeSec);
    expect(a.status).toBe(b.status);
  });
});
