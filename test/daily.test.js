import { describe, it, expect } from 'vitest';
import { MUTATORS, MUTATOR_BY_ID, DAILY_KEY, dateKey, weekKey, seedOf, pickMutator, localDaily, dailyFrom, rulesOf, dailyDeck, newDailyRun, readDaily, loadDaily, writeDaily, retryDaily, dailyFinished } from '../src/daily.js';
import { EVENTS, weightAt } from '../src/events.js';
import { SUN_AT, feederCost, newState } from '../src/econ.js';
import { SAVE_KEY, SHADOW_KEY } from '../src/save.js';
import { createMemoryStorage } from '../src/platform/storage.js';
import { simulate } from '../src/sim.js';

const day = ms => localDaily(ms);
const T = Date.UTC(2026, 9, 30, 12);           // 30 Oct 2026, a Friday, noon UTC

describe('daily goop: the seed and the mutator', () => {
  it('the date is UTC, so everyone shares a day', () => {
    expect(dateKey(T)).toBe('2026-10-30');
    expect(dateKey(Date.UTC(2026, 9, 30, 23, 59, 59))).toBe('2026-10-30');
    expect(dateKey(Date.UTC(2026, 9, 31, 0, 0, 1))).toBe('2026-10-31');
  });
  it('the week starts on Monday (UTC)', () => {
    expect(weekKey(T)).toBe('2026-10-26');
    expect(weekKey(Date.UTC(2026, 9, 26, 0, 0, 1))).toBe('2026-10-26');
    expect(weekKey(Date.UTC(2026, 10, 1, 23))).toBe('2026-10-26');     // Sunday still belongs to that week
    expect(weekKey(Date.UTC(2026, 10, 2, 0, 1))).toBe('2026-11-02');
  });
  it('the seed is a pure function of the date, and differs day to day', () => {
    expect(seedOf('2026-10-30')).toBe(seedOf('2026-10-30'));
    expect(seedOf('2026-10-30')).not.toBe(seedOf('2026-10-31'));
    expect(Number.isInteger(seedOf('2026-10-30'))).toBe(true); expect(seedOf('2026-10-30')).toBeGreaterThanOrEqual(0);
    expect(day(T)).toEqual(day(T + 3600e3));
  });
  it('at least six mutators, and over two months every one of them comes up', () => {
    expect(MUTATORS.length).toBeGreaterThanOrEqual(6);
    const seen = new Set();
    for (let d = 0; d < 60; d++) seen.add(day(T + d * 864e5).mutator);
    expect(seen.size).toBe(MUTATORS.length);
    for (const m of MUTATORS) expect(pickMutator(seedOf('x')).id in MUTATOR_BY_ID).toBe(true), expect(m.blurb.length).toBeGreaterThan(10);
  });
  it('a /daily answer is used when it is sane, and the local rule otherwise', () => {
    const local = day(T);
    expect(dailyFrom({ date: '2026-10-30', seed: 42, mutator: 'quiet' }, T)).toEqual({ date: '2026-10-30', seed: 42, mutator: 'quiet', source: 'cloud' });
    for (const bad of [null, 'nope', {}, { date: '2026-10-30', seed: 42, mutator: 'nope' }, { date: 'yesterday', seed: 1, mutator: 'quiet' }, { date: '2026-10-30', seed: -1, mutator: 'quiet' }, { date: '2025-01-01', seed: 1, mutator: 'quiet' }])
      expect(dailyFrom(bad, T)).toEqual(local);
  });
});

describe('daily goop: what each mutator does', () => {
  it('Feeders Cost Double doubles feeder prices on the daily state only', () => {
    const run = newDailyRun({ date: '2026-10-30', seed: 1, mutator: 'pricey' });
    expect(feederCost(run.state, 0)).toBe(30); expect(feederCost(newState(), 0)).toBe(15);
  });
  it('Quiet Lab has no events, Rush Hour twice as many', () => {
    expect(rulesOf('quiet').gapMult).toBe(0); expect(rulesOf('busy').gapMult).toBe(0.5); expect(rulesOf(null).gapMult).toBe(1);
  });
  it('Inspector Hour: the inspector is half of every stage\'s deck, from stage 1', () => {
    const deck = dailyDeck(EVENTS, 'inspector');
    for (let k = 0; k < 8; k++) {
      const total = deck.reduce((n, e) => n + weightAt(e, k), 0), insp = weightAt(deck.find(e => e.id === 'inspector'), k);
      expect(insp / total).toBeCloseTo(0.5);
    }
    expect(EVENTS.find(e => e.id === 'inspector').w[0]).toBe(0);            // the real deck is untouched
  });
  it('Gambler\'s Night only deals gambles and choices; Light Sleeper halves away pay; Hands On needs your hand', () => {
    expect(dailyDeck(EVENTS, 'lucky').every(e => e.bucket === 'gamble' || e.bucket === 'choice')).toBe(true);
    expect(rulesOf('sleepy').offline).toBe(0.5); expect(rulesOf('hands').handsOn).toBe(true); expect(rulesOf('pricey').handsOn).toBe(false);
  });
  it('every mutator still lets a greedy buyer at one click a second eat the Sun within an hour', () => {
    for (const m of MUTATORS) {
      const r = rulesOf(m.id), run = newDailyRun({ date: 'd', seed: 1, mutator: m.id });
      const sim = simulate({ clicksPerSec: 1, state: run.state, deck: dailyDeck(EVENTS, m.id), gapMult: r.gapMult, seed: 5, maxSecs: 3600 });
      expect(sim.won, m.id).toBe(true);
      expect(dailyFinished(sim.state)).toBe(true);
    }
  });
});

describe('daily goop: its own save slot', () => {
  const d = day(T);
  it('lives under its own key and never touches the main save or its shadow', () => {
    const storage = createMemoryStorage();
    const run = newDailyRun(d); run.state.slop = 99; run.state.played = 12;
    writeDaily(storage, run);
    expect(Object.keys(storage.dump())).toEqual([DAILY_KEY]);
    expect(DAILY_KEY).not.toBe(SAVE_KEY); expect(DAILY_KEY).not.toBe(SHADOW_KEY);
    const back = loadDaily(storage, d);
    expect(back.state.slop).toBe(99); expect(back.state.played).toBe(12); expect(back.mutator).toBe(d.mutator);
  });
  it('yesterday\'s slot is replaced by a fresh run, and a daily run never carries perks or hops', () => {
    const old = newDailyRun({ ...d, date: '2026-10-29' }); old.state.slop = 5;
    expect(readDaily(JSON.parse(JSON.stringify(old)), d).state.slop).toBe(0);
    const sneaky = newDailyRun(d); sneaky.state.perks = { head: 1 }; sneaky.state.asc = 9; sneaky.state.costMult = 1;
    const r = readDaily(JSON.parse(JSON.stringify(sneaky)), d);
    expect(r.state.perks).toEqual({}); expect(r.state.asc).toBe(0); expect(r.state.costMult).toBe(rulesOf(d.mutator).costMult);
    expect(readDaily(null, d).tries).toBe(1);
  });
  it('trying again starts a fresh dish and counts the try', () => {
    const run = newDailyRun(d); run.state.slop = 1e9; run.done = 600;
    const again = retryDaily(run);
    expect(again.tries).toBe(2); expect(again.done).toBe(null); expect(again.state.slop).toBe(0); expect(again.date).toBe(d.date);
  });
  it('finishing means eating the Sun', () => {
    const s = newState(); s.life = SUN_AT - 1; expect(dailyFinished(s)).toBe(false); s.life = SUN_AT; expect(dailyFinished(s)).toBe(true);
  });
});
