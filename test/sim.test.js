import { describe, it, expect } from 'vitest';
import { pacingTable, formatPacing, compare, maxedRun } from '../src/sim.js';
import { STAGES } from '../src/econ.js';
import { PERKS, perksOwned, perksTotal } from '../src/prestige.js';

describe('Act 2 pacing (the balance simulator)', () => {
  it('a maxed-perk run reaches the end in about three hours; a first run still takes the old time to the Sun and never finishes in one sitting', () => {
    const rows = pacingTable(2);
    console.log('Act 2 pacing at 1 click a second, events on (2 seeds):\n' + formatPacing(rows));
    const end = rows[rows.length - 1], sun = rows[6];
    expect(end.maxed).toBeGreaterThan(2.5 * 3600); expect(end.maxed).toBeLessThan(3.5 * 3600);
    expect(sun.first / 60).toBeGreaterThan(10); expect(sun.first / 60).toBeLessThan(15);
    expect(end.first == null || end.first > 12 * 3600).toBe(true);
    // every stage is reached, in order, by the maxed run
    for (let k = 7; k < STAGES.length; k++) expect(rows[k].maxed).toBeGreaterThan(rows[k - 1].maxed);
    // and no single stage drags: none takes more than 40 minutes of a three-hour run
    for (let k = 7; k <= STAGES.length; k++) expect(rows[k].maxed - rows[k - 1].maxed).toBeLessThan(40 * 60);
  }, 120000);
  it('milestone bonuses leave the first run to the Sun roughly where it was', () => {
    const on = compare({ clicksPerSec: 1 }, 6).minutes, off = compare({ clicksPerSec: 1, milestones: false }, 6).minutes;
    expect(on / off).toBeGreaterThan(0.85); expect(on).toBeLessThanOrEqual(off);
  });
  it('the maxed run really has every perk and five hops', () => {
    const s = maxedRun(5);
    expect(s.asc).toBe(5); expect(perksOwned(s)).toBe(perksTotal()); expect(s.stage).toBe(1);
    expect(PERKS.length).toBeGreaterThan(0);
  });
});
