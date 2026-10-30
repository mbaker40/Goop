import { describe, it, expect } from 'vitest';
import { newState } from '../src/econ.js';
import { EVENTS, EVENT_BY_ID, LEGACY_DECK, pickEvent, weightAt, applyEffect, deckEV, incomeBoost, isHazard, isChoice, tickEventClock, grabTarget, riskNote, spillRisk, hitRadius, MIN_TAP_PX } from '../src/events.js';
import { compare } from '../src/sim.js';
import { rng } from '../src/rng.js';

const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(0) + '%';
const always = v => () => v;

describe('event deck', () => {
  it('has about eighteen types across all four buckets, with unique ids', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(16); expect(EVENTS.length).toBeLessThanOrEqual(20);
    for (const b of ['boost', 'gamble', 'choice', 'hazard']) expect(EVENTS.filter(e => e.bucket === b).length).toBeGreaterThanOrEqual(3);
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
    expect(EVENTS.filter(e => weightAt(e, 6) > 0).length).toBe(EVENTS.length);          // from stage 7 on, every kind can turn up
    for (let k = 7; k < 20; k++) expect(EVENTS.filter(e => weightAt(e, k) > 0).length).toBe(EVENTS.length);
  });
  it('pickEvent follows the weights', () => {
    const r = rng(9), n = {};
    for (let i = 0; i < 20000; i++) { const e = pickEvent(EVENTS, 3, r); n[e.id] = (n[e.id] || 0) + 1; }
    const tw = EVENTS.reduce((a, e) => a + weightAt(e, 3), 0);
    for (const e of EVENTS) expect((n[e.id] || 0) / 20000).toBeCloseTo(weightAt(e, 3) / tw, 1);
  });
});

describe('event effects', () => {
  const mid = () => { const s = newState(); s.own[0] = 100; s.slop = 1000; return s; };   // 100 slop/s (100 pipettes, doubled by their legend)
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

describe('event keys', () => {
  it('E and G grab from anywhere; 1/2 and the arrows pick only in a choice; Space is left to the page', () => {
    expect([grabTarget('e'), grabTarget('E'), grabTarget('g'), grabTarget('2', true), grabTarget('ArrowLeft', true), grabTarget('2', false), grabTarget(' ', true)]).toEqual([0, 0, 0, 1, 0, -1, -1]);
  });
});

describe('event clock', () => {
  const frame = { real: 1, dt: 1, life: 1e6 };
  it('counts down to a spawn, then ages the event until it expires', () => {
    const c = { ev: null, evIn: 2 };
    expect(tickEventClock(c, frame)).toBe(null);
    expect(tickEventClock(c, frame)).toBe('spawn');
    c.ev = { age: 0, life: 1.5 };
    expect(tickEventClock(c, frame)).toBe(null);
    expect(tickEventClock(c, frame)).toBe('expire');
  });
  it('pauses outright while the win card or a panel covers the canvas', () => {
    const c = { ev: { age: 3.9, life: 4 }, evIn: 0.5 };
    for (let i = 0; i < 100; i++) expect(tickEventClock(c, { ...frame, covered: true })).toBe(null);
    expect(c.ev.age).toBe(3.9);                              // a visitor cannot steal behind the Star Dust panel
    c.ev = null;
    for (let i = 0; i < 100; i++) expect(tickEventClock(c, { ...frame, covered: true })).toBe(null);
    expect(c.evIn).toBe(0.5);
  });
  it('peeking holds back spawns but lets an event on stage keep ageing, as before', () => {
    const c = { ev: null, evIn: 0.5 };
    expect(tickEventClock(c, { ...frame, peek: 2 })).toBe(null);
    expect(c.evIn).toBe(0.5);
    c.ev = { age: 0, life: 0.5 };
    expect(tickEventClock(c, { ...frame, peek: 2 })).toBe('expire');
  });
  it('no events before the goop has eaten a little', () => {
    const c = { ev: null, evIn: 0 };
    expect(tickEventClock(c, { ...frame, life: 10 })).toBe(null);
  });
});

describe('risky gambles say so; event targets are big enough to tap', () => {
  it('the gambles that can spill the bank say it on the label and to a screen reader', () => {
    expect(EVENT_BY_ID.bubbling.label).toMatch(/spill/i);
    expect(EVENT_BY_ID.fork.options[1].label).toMatch(/spill/i);
    expect(riskNote(EVENT_BY_ID.bubbling)).toBe('Careful: it can spill 50% of your slop.');
    expect(riskNote(EVENT_BY_ID.fork)).toBe('Careful: vial 2, Spicy, can spill 50% of your slop.');
    for (const id of ['frenzy', 'geyser', 'drip', 'mystery', 'twin', 'inspector', 'rival']) expect(riskNote(EVENT_BY_ID[id]), id).toBe('');
    expect(spillRisk(EVENT_BY_ID.bubbling.effect)).toBe(0.5); expect(spillRisk(EVENT_BY_ID.frenzy.effect)).toBe(0);
  });
  it('at 390 px wide every event target is at least a 44 px tap; on a desktop the drawn size stands', () => {
    // a 390 px phone: the canvas is about 326 CSS px wide for 960 scene units
    const phone = 326 / 960;
    for (const base of [56, 66]) expect(2 * hitRadius(base, phone) * phone).toBeGreaterThanOrEqual(MIN_TAP_PX);
    expect(2 * 56 * phone).toBeLessThan(MIN_TAP_PX);                     // which the old radius was not
    expect(hitRadius(56, 760 / 960)).toBe(56); expect(hitRadius(56, 0)).toBe(56);
    // the two vials of a choice sit 160 units apart, so even grown their hit circles barely touch
    expect(2 * hitRadius(56, phone)).toBeLessThan(160 + 2 * 12);
  });
});

import { PHASE3_DECK, LATE_EVENTS, swapMult, tickDuel, duelFeed, duelOdds, pickWithPity, effectEV } from '../src/events.js';
import { simulate, maxedRun } from '../src/sim.js';
import { END, FEEDERS as FEEDER_LIST } from '../src/econ.js';

describe('phase 4: eighteen kinds, six or more of them late', () => {
  it('at least six late-game kinds, never seen before stage 7, every one with its own look', () => {
    expect(LATE_EVENTS.length).toBeGreaterThanOrEqual(6);
    for (const id of LATE_EVENTS) for (let k = 0; k < 6; k++) expect(weightAt(EVENT_BY_ID[id], k), id).toBe(0);
    for (const e of EVENTS) { if (isChoice(e)) for (const o of e.options) expect(o.look).toBeTruthy(); else expect(e.look).toBeTruthy(); }
  });
  it('analytic: always collecting is worth within 25% of the phase 3 deck at every one of the twenty stages', () => {
    const lines = [];
    for (let k = 0; k < 20; k++) {
      const o = deckEV(PHASE3_DECK, k), n = deckEV(EVENTS, k), od = deckEV(PHASE3_DECK, k, { odds: 0.65 }), nd = deckEV(EVENTS, k, { odds: 0.65 });
      if (k < 8 || k === 19) lines.push(`  stage ${k + 1}: phase 3 ${o.toFixed(1)} s/event, phase 4 ${n.toFixed(1)} s/event (${pct(n / o - 1)}); with Loaded Dice ${pct(nd / od - 1)}`);
      expect(Math.abs(n / o - 1)).toBeLessThan(0.25); expect(Math.abs(nd / od - 1)).toBeLessThan(0.25);
    }
    console.log('Event deck EV, phase 3 against phase 4 (seconds of feeder income per event):\n' + lines.join('\n'));
  });
  it('simulated: event income through Act 2 stays within 25% of the phase 3 deck', () => {
    const run = (deck, cps) => { let ev = 0, t = 0; for (let i = 0; i < 2; i++) { const r = simulate({ deck, clicksPerSec: cps, until: END.at, state: maxedRun(), seed: 50 + i, maxSecs: 8 * 3600 }); for (const v of Object.values(r.byType)) ev += v.secs; t += r.secs; } return ev / t; };
    const lines = [];
    for (const cps of [1, 5]) { const o = run(PHASE3_DECK, cps), n = run(EVENTS, cps); lines.push(`  ${cps} click/s: phase 3 ${pct(o)}, phase 4 ${pct(n)} (${pct(n / o - 1)})`); expect(Math.abs(n / o - 1)).toBeLessThan(0.25); }
    console.log('Event income from the Sun to the end of the universe (maxed run):\n' + lines.join('\n'));
  }, 60000);
});

describe('phase 4 effects', () => {
  const mid = () => { const s = newState(); s.own[0] = 100; s.slop = 1000; return s; };   // 100 slop/s
  it('a comet shower pays six small geysers; the black-hole hiccup refunds the last purchase within bounds', () => {
    expect(applyEffect(mid(), EVENT_BY_ID.comet.effect, Math.random).gain).toBeCloseTo(100 * 6 * 16);
    const s = mid(); s.lastBuy = 9000;
    expect(applyEffect(s, EVENT_BY_ID.blackhole.effect, Math.random).gain).toBeCloseTo(9000);
    s.lastBuy = 1; expect(applyEffect(s, EVENT_BY_ID.blackhole.effect, Math.random).gain).toBeCloseTo(100 * 60);
    s.lastBuy = 1e12; expect(applyEffect(s, EVENT_BY_ID.blackhole.effect, Math.random).gain).toBeCloseTo(100 * 180);
  });
  it('the wormhole swaps the two best feeders: the one you own more of gets the better rate', () => {
    const s = newState(); s.own[0] = 50; s.own[1] = 2;   // 25 + 7 slop/s; swapped: 50 x 3.5 + 2 x 0.5 = 176
    const eff = EVENT_BY_ID.wormhole.effect;
    expect(swapMult(s, eff)).toBe(4);                    // 176 / 32 = 5.5, clamped to 4
    s.own[0] = 3; s.own[1] = 2;                           // the swap would hurt: clamped up to the floor
    expect(swapMult(s, eff)).toBe(eff.lo);
    const r = applyEffect(mid(), eff, Math.random); expect(r.type).toBe('swap');
  });
  it('the dark-matter vial hides which of four outcomes it is until it is caught', () => {
    const eff = EVENT_BY_ID.darkvial.effect, seen = new Set();
    for (const v of [0.05, 0.4, 0.65, 0.95]) seen.add(applyEffect(mid(), eff, always(v)).lottery);
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
    expect(EVENT_BY_ID.darkvial.label).toMatch(/unknown/i);
  });
  it('a click-off: feeding fast enough wins a boost, running out of time loses', () => {
    const s = mid(); applyEffect(s, EVENT_BY_ID.rivalgoop.effect, Math.random);
    expect(s.duel).toMatchObject({ need: 30, got: 0, left: 15 });
    for (let i = 0; i < 29; i++) duelFeed(s);
    expect(tickDuel(s, 1, Math.random)).toBe(null);
    duelFeed(s); const w = tickDuel(s, 0.1, Math.random);
    expect(w.won).toBe(true); expect(s.duel).toBe(null); expect(s.fmult).toBe(8);
    const t = mid(); applyEffect(t, EVENT_BY_ID.rivalgoop.effect, Math.random); duelFeed(t);
    expect(tickDuel(t, 16, Math.random).won).toBe(false);
    expect(duelOdds(EVENT_BY_ID.rivalgoop.effect, 1)).toBe(0); expect(duelOdds(EVENT_BY_ID.rivalgoop.effect, 5)).toBe(1);
    expect(effectEV(EVENT_BY_ID.rivalgoop.effect, { cps: 5 })).toBe(7 * 15);
  });
  it('Event Pity deals a boost when it is owed', () => {
    const r = rng(3);
    for (let i = 0; i < 200; i++) expect(pickWithPity(EVENTS, 8, r, true).bucket).toBe('boost');
  });
  it('the new hazards can be shooed and take a little if not; nothing new can spill the bank', () => {
    for (const id of ['pigeon', 'taxman']) { expect(isHazard(EVENT_BY_ID[id])).toBe(true); expect(applyEffect(mid(), EVENT_BY_ID[id].tap, Math.random).gain).toBeGreaterThan(0); expect(EVENT_BY_ID[id].miss.frac).toBeLessThan(0.15); }
    for (const id of ['lunch', 'comet', 'blackhole', 'wormhole', 'darkvial', 'rivalgoop', 'nova']) expect(riskNote(EVENT_BY_ID[id]), id).toBe('');
  });
});
