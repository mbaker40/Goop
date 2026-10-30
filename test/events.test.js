import { describe, it, expect } from 'vitest';
import { newState } from '../src/econ.js';
import { EVENTS, LEGACY_DECK, pickEvent, weightAt, applyEffect, deckEV, incomeBoost, isHazard, isChoice } from '../src/events.js';
import { compare } from '../src/sim.js';
import { rng } from '../src/rng.js';

const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%';
const always = v => () => v;

describe('event deck', () => {
  it('has 8 to 12 types across all four buckets, with unique ids', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(8); expect(EVENTS.length).toBeLessThanOrEqual(12);
    expect(new Set(EVENTS.map(e => e.bucket))).toEqual(new Set(['boost', 'gamble', 'choice', 'hazard']));
    expect(new Set(EVENTS.map(e => e.id)).size).toBe(EVENTS.length);
  });
  it('every type is drawn distinctly and has a spawn label', () => {
    const looks = EVENTS.map(e => isChoice(e) ? e.options.map(o => o.look).join('+') : e.look);
    expect(new Set(looks).size).toBe(EVENTS.length);
    for (const e of EVENTS) expect(e.label.length).toBeGreaterThan(0);
  });
  it('weights shift by stage: no gambles or visitors on the first table', () => {
    for (const e of EVENTS) if (e.bucket === 'gamble' || e.bucket === 'hazard') expect(weightAt(e, 0)).toBe(0);
    expect(EVENTS.filter(e => weightAt(e, 5) > 0).length).toBe(EVENTS.length);
  });
  it('pickEvent follows the weights', () => {
    const r = rng(9), n = {};
    for (let i = 0; i < 20000; i++) { const e = pickEvent(EVENTS, 3, r); n[e.id] = (n[e.id] || 0) + 1; }
    const tw = EVENTS.reduce((a, e) => a + weightAt(e, 3), 0);
    for (const e of EVENTS) expect(n[e.id] / 20000).toBeCloseTo(weightAt(e, 3) / tw, 1);
  });
});

describe('event effects', () => {
  const mid = () => { const s = newState(); s.own[0] = 200; s.slop = 1000; return s; };   // 100 slop/s
  it('frenzy, geyser and the boosting rules', () => {
    const s = mid();
    applyEffect(s, EVENTS.find(e => e.id === 'frenzy').effect, Math.random);
    expect(s.frenzy).toBe(20); expect(s.fmult).toBe(7);
    const g = applyEffect(s, EVENTS.find(e => e.id === 'geyser').effect, Math.random);
    expect(g.gain).toBeCloseTo(7500);                       // measured in un-boosted income
    const weaker = applyEffect(s, EVENTS.find(e => e.id === 'drip').effect, Math.random);
    expect(s.fmult).toBe(7);                                 // the stronger boost keeps running
    expect(weaker.gain).toBeCloseTo(100 * 1 * 90);          // the weaker one is paid out instead
  });
  it('a gamble wins x12 or spills half the bank', () => {
    const eff = EVENTS.find(e => e.id === 'bubbling').effect;
    let s = mid(); const w = applyEffect(s, eff, always(0.1));
    expect(w.won).toBe(true); expect(s.fmult).toBe(12);
    s = mid(); const l = applyEffect(s, eff, always(0.9));
    expect(l.won).toBe(false); expect(s.slop).toBe(500); expect(l.lost).toBe(500);
  });
  it('Loaded Dice improves gamble odds', () => {
    const eff = EVENTS.find(e => e.id === 'bubbling').effect, s = mid();
    s.perks.dice = 1;
    expect(applyEffect(s, eff, always(0.6)).won).toBe(true);
  });
  it('an inspector freezes the feeders unless shooed', () => {
    const insp = EVENTS.find(e => e.id === 'inspector');
    expect(isHazard(insp)).toBe(true);
    const s = mid(); applyEffect(s, insp.miss, Math.random);
    expect(s.freeze).toBe(10);
    expect(applyEffect(mid(), insp.tap, Math.random).gain).toBeGreaterThan(0);
  });
  it('with nothing to boost yet, a boost pays a small geyser like the old vial', () => {
    const s = newState();
    const r = applyEffect(s, EVENTS[0].effect, Math.random);
    expect(r.gain).toBe(25); expect(s.frenzy).toBe(0);
  });
});

describe('event deck expected value vs the old 50/50 vial', () => {
  it('analytic: always collecting is worth within 25% of the old vial at every stage', () => {
    const lines = [];
    for (let k = 0; k < 6; k++) {
      const o = deckEV(LEGACY_DECK, k), n = deckEV(EVENTS, k);
      lines.push(`  stage ${k + 1}: old ${o.toFixed(1)} s/event (${pct(incomeBoost(LEGACY_DECK, k))} income), new ${n.toFixed(1)} s/event (${pct(incomeBoost(EVENTS, k))}), ${pct(n / o - 1)}`);
      expect(Math.abs(n / o - 1)).toBeLessThan(0.25);
    }
    console.log('Event deck EV, analytic (seconds of feeder income per event):\n' + lines.join('\n'));
  });
  it('simulated: a greedy buyer gets within 25% of the old event income, and a similar time to the Sun', () => {
    const lines = [];
    for (const cps of [1, 5]) {
      const none = compare({ deck: null, clicksPerSec: cps }, 8), old = compare({ deck: LEGACY_DECK, clicksPerSec: cps }, 8), now = compare({ deck: EVENTS, clicksPerSec: cps }, 8);
      lines.push(`  ${cps} click/s: no events ${none.minutes.toFixed(1)} min | old vial ${old.minutes.toFixed(1)} min, income ${pct(old.boost)} | new deck ${now.minutes.toFixed(1)} min, income ${pct(now.boost)} | event income ${pct(now.boost / old.boost - 1)}`);
      expect(Math.abs(now.boost / old.boost - 1)).toBeLessThan(0.25);
      expect(Math.abs(now.minutes / old.minutes - 1)).toBeLessThan(0.25);
      expect(old.boost).toBeGreaterThan(1.3);               // the old vial really was worth about +170%
      expect(none.minutes).toBeGreaterThan(old.minutes * 1.6);
    }
    console.log('Event deck EV, simulated to the Sun (8 seeds each):\n' + lines.join('\n'));
  }, 60000);
});
