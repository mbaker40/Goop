import { describe, it, expect } from 'vitest';
import { FEEDERS, UPGRADES, CLICK_CAP, OFFLINE_CAP, newState, feederCost, baseRate, slopPerSec, feedValue, clickGate, awayEarnings } from '../src/econ.js';
import { clickCap, offlineCap } from '../src/prestige.js';

describe('economy', () => {
  it('feeder prices grow 15% a copy', () => {
    const s = newState();
    expect(feederCost(s, 0)).toBe(15);
    s.own[0] = 10;
    expect(feederCost(s, 0)).toBe(Math.ceil(15 * 1.15 ** 10));
  });
  it('mutations, Mk upgrades and hops multiply feeder income', () => {
    const s = newState(); s.own[1] = 4;
    expect(baseRate(s)).toBeCloseTo(14);
    s.ups.mut1 = true; s.ups.intern2 = true; s.asc = 1;
    expect(baseRate(s)).toBeCloseTo(14 * 1.5 * 2 * 1.5);
  });
  it('boosts multiply and a freeze stops the feeders', () => {
    const s = newState(); s.own[0] = 10;
    s.frenzy = 5; s.fmult = 12;
    expect(slopPerSec(s)).toBeCloseTo(5 * 12);
    s.freeze = 3;
    expect(slopPerSec(s)).toBe(0);
  });
  it('Bigger Spoon and Ladle double the base helping only, as their text now says', () => {
    const s = newState(); s.own[0] = 100;               // 50 slop/s
    s.ups.cata = true;                                   // +3% of slop/s per feed = 1.5
    expect(feedValue(s)).toBeCloseTo(1 + 1.5);
    s.ups.spoon = true; s.ups.ladle = true;
    expect(feedValue(s)).toBeCloseTo(4 + 1.5);          // the 1.5 share is not doubled
    const spoon = UPGRADES.find(u => u.id === 'spoon'), ladle = UPGRADES.find(u => u.id === 'ladle');
    expect(spoon.text).not.toMatch(/twice as much/);
    expect(spoon.text + ladle.text).toMatch(/base helping/);
  });
  it('every feeder has a matching Mk II and Mk III', () => {
    for (const f of FEEDERS) { expect(UPGRADES.some(u => u.id === f.id + '2')).toBe(true); expect(UPGRADES.some(u => u.id === f.id + '3')).toBe(true); }
  });
});

describe('click cap', () => {
  it('pays the first 15 feeds in any one second and nothing past that', () => {
    expect(CLICK_CAP).toBe(15);
    const times = [];
    let paid = 0;
    for (let i = 0; i < 40; i++) if (clickGate(times, 1000 + i * 20)) paid++;   // 50 a second for 0.8 s
    expect(paid).toBe(15);
  });
  it('the window slides: a second later it pays again', () => {
    const times = [];
    for (let i = 0; i < 15; i++) clickGate(times, i);
    expect(clickGate(times, 500)).toBe(false);
    expect(clickGate(times, 1000)).toBe(true);
  });
  it('a steady 15 a second is never capped, 30 a second pays half', () => {
    let times = [], paid = 0, n = 0;
    for (let t = 0; t < 10000; t += 67) { n++; if (clickGate(times, t)) paid++; }    // 14.9 a second
    expect(paid).toBe(n);
    times = []; paid = 0;
    for (let t = 0; t < 10000; t += 1000 / 30) if (clickGate(times, t)) paid++;
    expect(paid).toBeGreaterThanOrEqual(149); expect(paid).toBeLessThanOrEqual(151);
  });
  it('the Quick Fingers perk raises the cap', () => {
    const s = newState();
    expect(clickCap(s)).toBe(15);
    s.perks.fingers = 2;
    expect(clickCap(s)).toBe(25);
  });
});

describe('offline: one rule for a hidden tab and a closed one', () => {
  const rate = 100;
  it('a blink of up to a minute pays as if you never left', () => {
    expect(awayEarnings(rate, 30)).toBe(3000);
    expect(awayEarnings(rate, 60)).toBe(6000);
  });
  it('longer than a minute pays half rate', () => {
    expect(awayEarnings(rate, 600)).toBe(30000);
  });
  it('capped at two hours, never the old full-rate hour', () => {
    expect(OFFLINE_CAP).toBe(7200);
    expect(awayEarnings(rate, 3600)).toBe(rate * 3600 * 0.5);
    expect(awayEarnings(rate, 10 * 3600)).toBe(rate * 7200 * 0.5);
  });
  it('nothing for no feeders or a clock that ran backwards', () => {
    expect(awayEarnings(0, 5000)).toBe(0);
    expect(awayEarnings(rate, -50)).toBe(0);
  });
  it('the Long Nap perk raises the cap to eight hours', () => {
    const s = newState();
    expect(offlineCap(s)).toBe(7200);
    s.perks.nap = 1;
    expect(awayEarnings(rate, 24 * 3600, offlineCap(s))).toBe(rate * 8 * 3600 * 0.5);
  });
});
