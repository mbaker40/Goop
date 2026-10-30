import { describe, it, expect } from 'vitest';
import { pacingTable, formatPacing, compare, maxedRun, strategyTable, stageTimes, STRATEGIES, hm } from '../src/sim.js';
import { STAGES } from '../src/econ.js';
import { PERKS, perksOwned, perksTotal } from '../src/prestige.js';

describe('Act 2 pacing (the balance simulator)', () => {
  it('an Act 1 maxed run reaches the end in about three hours, an everything-maxed run in no less than about an hour and a half; a first run still takes the old time to the Sun and never finishes in one sitting', () => {
    const rows = pacingTable(2);
    console.log('Act 2 pacing at 1 click a second, events on (2 seeds):\n' + formatPacing(rows));
    const end = rows[rows.length - 1], sun = rows[6];
    expect(end.act1).toBeGreaterThan(2.5 * 3600); expect(end.act1).toBeLessThan(3.75 * 3600);
    // the Act 2 perks are a real sink, and a real speed-up, but a maxed run is still an evening
    expect(end.maxed).toBeGreaterThan(1.4 * 3600); expect(end.maxed).toBeLessThan(end.act1 * 0.8);   // maxed: 3 Big Bangs and 2 deep hops of bonus
    expect(sun.first / 60).toBeGreaterThan(10); expect(sun.first / 60).toBeLessThan(15);
    expect(end.first == null || end.first > 12 * 3600).toBe(true);
    // every stage is reached, in order, by both maxed runs
    for (let k = 7; k < STAGES.length; k++) { expect(rows[k].maxed).toBeGreaterThan(rows[k - 1].maxed); expect(rows[k].act1).toBeGreaterThan(rows[k - 1].act1); }
    // and no single stage drags: none takes more than 40 minutes
    for (let k = 7; k <= STAGES.length; k++) { expect(rows[k].maxed - rows[k - 1].maxed).toBeLessThan(40 * 60); expect(rows[k].act1 - rows[k - 1].act1).toBeLessThan(40 * 60); }
  }, 120000);
  it('milestone bonuses leave the first run to the Sun roughly where it was', () => {
    const on = compare({ clicksPerSec: 1 }, 6).minutes, off = compare({ clicksPerSec: 1, milestones: false }, 6).minutes;
    expect(on / off).toBeGreaterThan(0.85); expect(on).toBeLessThanOrEqual(off);
  });
  it('the maxed runs really have every perk and five hops', () => {
    const s = maxedRun(5);
    expect(s.asc).toBe(5); expect(perksOwned(s)).toBe(perksTotal()); expect(s.stage).toBe(6); expect(s.bangs).toBe(3);   // Head Start II: the Sun's door
    expect(s.hopBonus).toBeCloseTo(3 * 0.8 + 2 * 0.5);                                                                 // three Big Bangs, two hops from stage 12
    expect(s.winSeen).toBe(true);
    const a = maxedRun(5, 1);
    expect(a.asc).toBe(5); expect(perksOwned(a)).toBe(perksTotal(1)); expect(a.stage).toBe(1); expect(a.bangs).toBe(0);
    expect(PERKS.length).toBeGreaterThan(0);
  });
});

describe('hop strategies at 5 clicks a second (the owner\'s pace)', () => {
  it('farming the Sun is no longer the fastest way through the universe, and is at most a little faster than pure deep hops', () => {
    const rows = strategyTable({ cps: 5, seeds: 1, list: STRATEGIES.filter(s => ['farm20', 'deep2', 'deep3', 'mixed'].includes(s.id)) });
    console.log('Hop strategies, 5 clicks a second, to the end of the universe:\n' + rows.map(r => `  ${r.name}: ${hm(r.total)} (hopping ${hm(r.hopSecs)}, bonus +${Math.round(r.bonus * 100)}%)`).join('\n'));
    const by = Object.fromEntries(rows.map(r => [r.id, r]));
    for (const r of rows) expect(r.total).not.toBe(null);
    const deep = Math.min(by.deep2.total, by.deep3.total);
    expect(by.farm20.total).toBeGreaterThan(deep / 1.25);          // farming wins by less than 25% over hopping only from stage 12 ...
    expect(by.mixed.total).toBeLessThan(by.farm20.total);          // ... and loses to a mix that goes deep once the Act 1 perks are bought
    expect(by.farm20.bonus).toBeCloseTo(0.5);                      // twenty Sun hops: the Sun's ceiling
  }, 120000);
  it('a fully maxed deep-hop run still takes at least about 1.4 hours at a click a second, and about an hour at five', () => {
    const one = stageTimes({ clicksPerSec: 1, maxSecs: 12 * 3600, makeState: () => maxedRun() }, 2).end;
    const five = stageTimes({ clicksPerSec: 5, maxSecs: 12 * 3600, makeState: () => maxedRun() }, 2).end;
    console.log(`Maxed run to the end: ${hm(one)} at 1 click/s, ${hm(five)} at 5 clicks/s`);
    expect(one).toBeGreaterThan(1.4 * 3600); expect(five).toBeGreaterThan(0.85 * 3600);
  }, 120000);
  it('stacking one feeder to 500 for its legend never beats the plain buyer (the legends are a reward, not a strategy)', () => {
    const at = [6, 6, 6, 6, 6, 11, 11];
    const [plain, stack] = strategyTable({ cps: 5, seeds: 1, list: [{ id: 'mixed', name: 'mixed', hopAt: at }, { id: 'stack', name: 'mixed, interns to 500', hopAt: at, stack: { i: 1, to: 500 } }] });
    console.log(`Stacking interns to 500: ${hm(stack.total)} against ${hm(plain.total)}`);
    expect(stack.total).toBeGreaterThanOrEqual(plain.total * 0.97);
  }, 120000);
});
