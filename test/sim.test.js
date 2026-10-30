import { describe, it, expect } from 'vitest';
import { pacingTable, formatPacing, compare, maxedRun } from '../src/sim.js';
import { STAGES } from '../src/econ.js';
import { PERKS, perksOwned, perksTotal } from '../src/prestige.js';

describe('Act 2 pacing (the balance simulator)', () => {
  it('an Act 1 maxed run reaches the end in about three hours, an everything-maxed run in no less than about an hour and a half; a first run still takes the old time to the Sun and never finishes in one sitting', () => {
    const rows = pacingTable(2);
    console.log('Act 2 pacing at 1 click a second, events on (2 seeds):\n' + formatPacing(rows));
    const end = rows[rows.length - 1], sun = rows[6];
    expect(end.act1).toBeGreaterThan(2.5 * 3600); expect(end.act1).toBeLessThan(3.5 * 3600);
    // the Act 2 perks are a real sink, and a real speed-up, but a maxed run is still an evening
    expect(end.maxed).toBeGreaterThan(1.4 * 3600); expect(end.maxed).toBeLessThan(end.act1 * 0.8);
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
    expect(s.winSeen).toBe(true);
    const a = maxedRun(5, 1);
    expect(a.asc).toBe(5); expect(perksOwned(a)).toBe(perksTotal(1)); expect(a.stage).toBe(1); expect(a.bangs).toBe(0);
    expect(PERKS.length).toBeGreaterThan(0);
  });
});
