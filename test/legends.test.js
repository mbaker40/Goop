import { describe, it, expect } from 'vitest';
import { LEGENDS, LEGEND_AT, LEGEND_MULT, HINT_FROM, legendLevel, legendMult, legendTitle, legendHint, newLegends } from '../src/legends.js';
import { FEEDERS, newState, feederRate, baseRate } from '../src/econ.js';

describe('feeder legends', () => {
  it('one entry per feeder, in shop order, with two titles, two one-liners and a set piece each', () => {
    expect(LEGENDS.map(l => l.id)).toEqual(FEEDERS.map(f => f.id));
    for (const l of LEGENDS) { for (const k of ['t1', 't2', 'say1', 'say2', 'line']) expect(l[k], l.id + k).toBeTruthy(); expect(['rain', 'wave', 'convoy', 'solo', 'storm', 'parade']).toContain(l.piece); }
    expect(new Set(LEGENDS.map(l => l.t1)).size).toBe(LEGENDS.length); expect(new Set(LEGENDS.map(l => l.t2)).size).toBe(LEGENDS.length);
    expect(LEGENDS.find(l => l.id === 'intern').t1).toBe('The Intern Horde'); expect(LEGENDS.find(l => l.id === 'pipette').t2).toBe('The Pipette Cathedral');
  });
  it('100 owned doubles the feeder, 500 triples that again; only that feeder', () => {
    expect([99, 100, 499, 500, 2000].map(legendLevel)).toEqual([0, 1, 1, 2, 2]);
    expect(legendMult(100)).toBe(LEGEND_MULT[1]); expect(legendMult(500) / legendMult(100)).toBe(3);
    const s = newState(); s.own[1] = 99; s.own[0] = 10;
    const one = feederRate(s, 1), pip = feederRate(s, 0);
    s.own[1] = 100; expect(feederRate(s, 1) / one).toBe(2); expect(feederRate(s, 0)).toBe(pip);
    s.own[1] = 500; expect(feederRate(s, 1) / one).toBe(6);
    expect(baseRate(s)).toBeCloseTo(500 * 3.5 * 6 + 10 * 0.5);
  });
  it('the titles and the shop hint, which turns up past 50 owned without spelling it out', () => {
    expect(legendTitle('intern', 50)).toBe(''); expect(legendTitle('intern', 100)).toBe('The Intern Horde'); expect(legendTitle('intern', 600)).toBe('The Intern Union');
    expect(legendHint(HINT_FROM - 1)).toBe(''); expect(legendHint(64)).toMatch(/64 of 100/); expect(legendHint(150)).toMatch(/150 of 500/); expect(legendHint(500)).toBe('');
  });
  it('newLegends lists what has not been celebrated yet, so a loaded save is told quietly and only once', () => {
    const own = FEEDERS.map(() => 0); own[0] = 520; own[3] = 120;
    const ids = FEEDERS.map(f => f.id);
    expect(newLegends(ids, own, {}).map(n => n.id + n.level)).toEqual(['pipette1', 'pipette2', 'truck1']);
    expect(newLegends(ids, own, { 'pipette:1': true, 'pipette:2': true, 'truck:1': true })).toEqual([]);
    expect(LEGEND_AT).toEqual([100, 500]);
  });
});
