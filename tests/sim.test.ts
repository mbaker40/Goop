/**
 * sim.test.ts — unit tests for the pure sim (PLAN §10). Fast, deterministic.
 */

import { describe, it, expect } from 'vitest';
import { Game, createMetaState } from '../src/sim/game';
import { format, formatTime, D } from '../src/sim/numbers';
import { geEarned, metaUpgradeCost, buyMeta, canBuyMeta } from '../src/sim/prestige';
import { balance } from '../src/config/balance';
import { PRODUCER_BY_ID } from '../src/config/producers';
import { WIN_HEIGHT } from '../src/config/zones';
import { Rng } from '../src/sim/rng';

function newGame() {
  return new Game(createMetaState(), 1);
}

describe('numbers.format (PLAN §13)', () => {
  it('formats small and grouped numbers', () => {
    expect(format(0)).toBe('0');
    expect(format(42)).toBe('42');
    expect(format(1234)).toBe('1.23K');
    expect(format(1_500_000)).toBe('1.50M');
  });
  it('uses silly names when asked', () => {
    expect(format(1e15, { silly: true })).toContain('Goopillion');
  });
  it('switches to scientific past the cutover', () => {
    expect(format(1e40)).toMatch(/e\d+$/);
  });
  it('formatTime renders m:ss and h:mm:ss', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(3661)).toBe('1:01:01');
  });
});

describe('producer costs (PLAN §5.2)', () => {
  it('follows baseCost * growth^owned', () => {
    const g = newGame();
    const base = PRODUCER_BY_ID['dripper']!.baseCost;
    expect(g.producerCost('dripper', 1).toNumber()).toBeCloseTo(base, 5);
    g.run.producersOwned['dripper'] = 3;
    expect(g.producerCost('dripper', 1).toNumber()).toBeCloseTo(
      base * Math.pow(balance.producerCostGrowth, 3),
      3,
    );
  });
  it('bulk cost equals the geometric sum of single costs', () => {
    const g = newGame();
    const single = g.producerCost('intern', 1).toNumber() + // owned 0
      D(PRODUCER_BY_ID['intern']!.baseCost).mul(balance.producerCostGrowth).toNumber() + // owned 1
      D(PRODUCER_BY_ID['intern']!.baseCost).mul(balance.producerCostGrowth ** 2).toNumber(); // owned 2
    expect(g.producerCost('intern', 3).toNumber()).toBeCloseTo(single, 2);
  });
});

describe('clicking + combo (PLAN §2.1)', () => {
  it('a click adds goop and builds combo', () => {
    const g = newGame();
    expect(g.run.goop.toNumber()).toBe(0);
    g.click();
    expect(g.run.goop.toNumber()).toBeGreaterThan(0);
    expect(g.run.combo).toBeGreaterThan(1);
  });
  it('combo decays back toward 1 when idle', () => {
    const g = newGame();
    for (let i = 0; i < 20; i++) g.click();
    const peak = g.run.combo;
    for (let i = 0; i < 100; i++) g.tick(0.1); // ~10s idle
    expect(g.run.combo).toBeLessThan(peak);
    expect(g.run.combo).toBeGreaterThanOrEqual(1);
  });
});

describe('purchases (PLAN §5.2)', () => {
  it('buying a producer deducts goop and increments owned', () => {
    const g = newGame();
    g.run.goop = D(1000);
    const cost = g.producerCost('dripper', 1);
    expect(g.buyProducer('dripper', 1)).toBe(true);
    expect(g.run.producersOwned['dripper']).toBe(1);
    expect(g.run.goop.toNumber()).toBeCloseTo(D(1000).sub(cost).toNumber(), 5);
  });
  it('cannot buy what you cannot afford', () => {
    const g = newGame();
    expect(g.buyProducer('bottle', 1)).toBe(false);
  });
});

describe('height, melt, win (PLAN §5.1, §5.3, §3)', () => {
  it('height increases monotonically with lifetime goop', () => {
    const g = newGame();
    const h0 = g.heightRaw();
    g.run.lifetimeGoop = D(1e6);
    const h1 = g.heightRaw();
    g.run.lifetimeGoop = D(1e12);
    const h2 = g.heightRaw();
    expect(h1).toBeGreaterThan(h0);
    expect(h2).toBeGreaterThan(h1);
  });

  it('no melt during the grace period, melt after', () => {
    const g = newGame();
    g.run.producersOwned['intern'] = 100; // real income
    g.tick(0.1);
    expect(g.meltRate()).toBe(0); // still in grace
    g.run.runTime = balance.melt.graceSeconds + 1;
    g.run.status = 'active';
    for (let i = 0; i < 50; i++) g.tick(0.1); // warm the EMA
    expect(g.meltRate()).toBeGreaterThan(0);
  });

  it('reaching WIN_HEIGHT sets status to won', () => {
    const g = newGame();
    g.run.status = 'active';
    // Enough lifetime goop to exceed WIN_HEIGHT.
    g.run.lifetimeGoop = D(10).pow(Math.ceil(Math.pow((WIN_HEIGHT + 5) / balance.height.coeff, 1 / balance.height.exp)));
    g.tick(0.1);
    expect(g.run.status).toBe('won');
  });
});

describe('prestige / GE (PLAN §4)', () => {
  it('GE rises with peak height and win multiplier', () => {
    const meta = createMetaState();
    const lose = geEarned(30, false, meta);
    const win = geEarned(30, true, meta);
    const higher = geEarned(40, false, meta);
    expect(win).toBeGreaterThanOrEqual(lose);
    expect(higher).toBeGreaterThan(lose);
  });
  it('buying a meta upgrade deducts GE and raises the level', () => {
    const meta = createMetaState();
    meta.ge = 100;
    expect(canBuyMeta(meta, 'gpsBoost')).toBe(true);
    const cost = metaUpgradeCost({ ...(META_LOOKUP('gpsBoost')) }, 0);
    expect(buyMeta(meta, 'gpsBoost')).toBe(true);
    expect(meta.metaLevels['gpsBoost']).toBe(1);
    expect(meta.ge).toBe(100 - cost);
  });
});

describe('rng determinism', () => {
  it('same seed yields same sequence', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });
});

// helper to avoid importing the whole config just for one lookup in a test
import { META_BY_ID } from '../src/config/upgrades';
function META_LOOKUP(id: string) {
  return META_BY_ID[id]!;
}
