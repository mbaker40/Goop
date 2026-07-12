/**
 * Chaos events (PLAN §8): scheduler determinism, gating rules, and each mechanic's outcome.
 */

import { describe, it, expect } from 'vitest';
import { Game, createMetaState } from '../src/sim/game';
import { balance } from '../src/config/balance';
import { CHAOS_EVENTS, EVENT_BY_ID } from '../src/config/events';
import { D, Decimal } from '../src/sim/numbers';

const DT = 1 / balance.tickHz;

/** Run the sim forward `seconds`, keeping income alive with clicks + early drippers. */
function warmGame(seed = 42): Game {
  const g = new Game(createMetaState(), seed);
  // A little economy so gps() > 0 and melt has something to chew on.
  for (let i = 0; i < 200; i++) g.click();
  g.buyProducer('dripper', 10);
  return g;
}

describe('chaos events (PLAN §8)', () => {
  it('config sanity: unique ids, positive weights/durations, targets where needed', () => {
    const ids = new Set(CHAOS_EVENTS.map((e) => e.id));
    expect(ids.size).toBe(CHAOS_EVENTS.length);
    for (const e of CHAOS_EVENTS) {
      expect(e.weight).toBeGreaterThan(0);
      expect(e.durationSec).toBeGreaterThan(0);
      if (e.kind === 'targets') expect(e.targets ?? 0).toBeGreaterThan(0);
      if (e.kind === 'decision') expect(e.onAccept).toBeDefined();
      if (e.kind === 'aura') expect(e.aura).toBeDefined();
    }
  });

  it('same seed → identical event schedule (determinism)', () => {
    const seen = (seed: number) => {
      const g = warmGame(seed);
      const log: string[] = [];
      let last = '';
      for (let i = 0; i < Math.round(600 / DT); i++) {
        g.click();
        g.tick(DT);
        const a = g.run.activeEvent;
        const key = a ? `${a.id}@${Math.round(g.run.runTime)}` : '';
        if (a && key !== last) {
          log.push(key);
          last = key;
        }
      }
      return log.join('|');
    };
    expect(seen(7)).toBe(seen(7));
    // And different seeds should (almost surely) differ.
    expect(seen(7)).not.toBe(seen(8));
  });

  it('no events during grace + warmup window', () => {
    const g = warmGame();
    const quiet = balance.melt.graceSeconds + balance.events.warmupSeconds;
    for (let i = 0; i < Math.round(quiet / DT); i++) {
      g.click();
      g.tick(DT);
      expect(g.run.activeEvent).toBeNull();
    }
  });

  it('events respect the minimum gap and never overlap', () => {
    const g = warmGame(11);
    let lastEnd = -Infinity;
    let prevActive = false;
    let seen = 0;
    for (let i = 0; i < Math.round(1800 / DT); i++) {
      g.click();
      if (i % 40 === 0) {
        for (const p of ['dripper', 'intern', 'cannon', 'union']) {
          while (g.canAfford(g.producerCost(p, 1))) g.buyProducer(p, 1);
        }
      }
      g.tick(DT);
      const active = g.run.activeEvent !== null;
      if (active && !prevActive) {
        seen++;
        // Gap from the previous event's end to this start must be >= minGapSeconds (with a tick
        // of slack for the fixed timestep).
        expect(g.run.runTime - lastEnd).toBeGreaterThanOrEqual(balance.events.minGapSeconds - DT * 2);
      }
      if (!active && prevActive) lastEnd = g.run.runTime;
      prevActive = active;
    }
    expect(seen).toBeGreaterThanOrEqual(2); // ~2-4/10min at zone-1 pools
  });

  it('zone gating: only minZone-eligible events fire', () => {
    const g = warmGame(13);
    for (let i = 0; i < Math.round(1200 / DT); i++) {
      g.click();
      g.tick(DT);
      const a = g.run.activeEvent;
      if (a) {
        const def = EVENT_BY_ID[a.id]!;
        expect(g.currentZone().index).toBeGreaterThanOrEqual(def.minZone);
      }
    }
  });

  it('targets event: tapping all targets pays out and resolves as success', () => {
    const g = warmGame(3);
    // Force a goober swarm directly (unit-level: scheduler picks are tested elsewhere).
    g.run.status = 'active';
    g.run.activeEvent = { id: 'goober', remaining: 12, targetsLeft: 8, resolved: false };
    const before = g.run.goop;
    for (let i = 0; i < 8; i++) expect(g.tapEventTarget()).toBe(true);
    expect(g.run.activeEvent!.resolved).toBe(true);
    expect(g.tapEventTarget()).toBe(false); // resolved events stop reacting
    expect(g.run.goop.gt(before)).toBe(true); // per-tap GPS payouts landed
  });

  it('inspector expiry (fail) halves GPS for its effect window, then recovers', () => {
    const g = warmGame(5);
    g.run.status = 'active';
    const cleanGps = g.gps();
    g.run.activeEvent = { id: 'inspector', remaining: 0.05, targetsLeft: 1, resolved: false };
    g.tick(DT); // expires → onFail effect
    expect(g.run.activeEvent).toBeNull();
    expect(g.run.eventEffects.length).toBe(1);
    expect(g.gps().div(cleanGps).toNumber()).toBeCloseTo(0.5, 1);
    // Effect expires after its duration.
    for (let i = 0; i < Math.round(31 / DT); i++) g.tick(DT);
    expect(g.run.eventEffects.length).toBe(0);
  });

  it('investor deal: pays min(9x bank, capped seconds of GPS) and raises melt for 90s', () => {
    const g = warmGame(6);
    g.run.status = 'active';
    g.run.runTime = 400; // past ramp: full melt applies
    g.run.emaIncome = D(1000); // clicks don't feed the melt EMA; give it income to chew on
    g.run.activeEvent = { id: 'investor', remaining: 12, targetsLeft: 0, resolved: false };
    const before = g.run.goop;
    const capSec = EVENT_BY_ID['investor']!.onAccept!.goopMultCapGpsSeconds!;
    const expected = Decimal.min(before.mul(9), g.gps().mul(capSec));
    const meltBefore = g.meltRate();
    expect(g.answerEvent(true)).toBe(true);
    expect(g.run.goop.sub(before).div(expected).toNumber()).toBeCloseTo(1, 2);
    expect(g.meltRate() / Math.max(1e-9, meltBefore)).toBeCloseTo(1.25, 1);
  });

  it('investor cap blocks the hoard-the-bank compounding exploit', () => {
    const g = warmGame(7);
    g.run.status = 'active';
    g.run.goop = D(1e9); // an absurdly hoarded bank
    g.run.activeEvent = { id: 'investor', remaining: 12, targetsLeft: 0, resolved: false };
    const before = g.run.goop;
    expect(g.answerEvent(true)).toBe(true);
    // Payout must be bounded by GPS seconds, nowhere near 9x the hoard.
    expect(g.run.goop.sub(before).lt(before.mul(0.1))).toBe(true);
  });

  it('declining the investor does nothing', () => {
    const g = warmGame(6);
    g.run.status = 'active';
    g.run.activeEvent = { id: 'investor', remaining: 12, targetsLeft: 0, resolved: false };
    const before = g.run.goop;
    expect(g.answerEvent(false)).toBe(true);
    expect(g.run.goop.eq(before)).toBe(true);
    expect(g.run.eventEffects.length).toBe(0);
  });

  it('heatwave aura triples melt while live and stops when it ends', () => {
    const g = warmGame(9);
    g.run.status = 'active';
    g.run.runTime = 400;
    g.run.emaIncome = D(1000);
    const clean = g.meltRate();
    g.run.activeEvent = { id: 'heatwave', remaining: 15, targetsLeft: 0, resolved: true };
    expect(g.meltRate() / clean).toBeCloseTo(3, 5);
    g.run.activeEvent = null;
    expect(g.meltRate() / clean).toBeCloseTo(1, 5);
  });

  it('meteor fail costs structural buffer and grants anger-goop click power', () => {
    const g = warmGame(10);
    g.run.status = 'active';
    g.run.structuralGoop = D(1000);
    const clickBefore = g.clickGain();
    g.run.activeEvent = { id: 'meteor', remaining: 0.05, targetsLeft: 10, resolved: false };
    g.tick(DT);
    expect(g.run.structuralGoop.toNumber()).toBeLessThan(1000 * 0.8);
    expect(g.clickGain().div(clickBefore).toNumber()).toBeGreaterThan(2);
  });

  it('event state round-trips through save serialization', async () => {
    const { serializeRun, deserializeRun } = await import('../src/save/index');
    const g = warmGame(12);
    g.run.activeEvent = { id: 'goober', remaining: 7.5, targetsLeft: 3, resolved: false };
    g.run.eventEffects.push({ gpsMult: 0.5, meltMult: 1, clickMult: 1, remaining: 12, label: 'x', icon: 'y' });
    const back = deserializeRun(JSON.parse(JSON.stringify(serializeRun(g.run))));
    expect(back.activeEvent).toEqual(g.run.activeEvent);
    expect(back.eventEffects).toEqual(g.run.eventEffects);
    expect(back.eventCooldown).toBe(g.run.eventCooldown);
  });
});
