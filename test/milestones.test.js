import { describe, it, expect } from 'vitest';
import { MILESTONES, milestoneAt, milestonesIn, dueMilestones, passMilestones, seedMilestones, goneIn, milestoneBonus, MILE_MIN } from '../src/milestones.js';
import { STAGES, newState, earn } from '../src/econ.js';

describe('mid-stage milestones', () => {
  it('three or four per stage for all twenty stages, unique ids, in order', () => {
    for (let k = 0; k < STAGES.length; k++) { const n = milestonesIn(k).length; expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(4); }
    expect(new Set(MILESTONES.map(m => m.id)).size).toBe(MILESTONES.length);
    const at = MILESTONES.map(milestoneAt);
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
    for (const m of MILESTONES) { expect(m.f).toBeGreaterThan(0); expect(m.f).toBeLessThan(1); expect(m.name).toBeTruthy(); }
    expect(MILESTONES.map(m => m.name)).toContain('Ate the coffee machine');
    expect(MILESTONES.map(m => m.name)).toContain('Ate the Eiffel Tower');
  });
  it('each sits inside its own stage', () => {
    for (const m of MILESTONES) { const v = milestoneAt(m); expect(v).toBeGreaterThan(STAGES[m.k].at); if (m.k + 1 < STAGES.length) expect(v).toBeLessThan(STAGES[m.k + 1].at); }
  });
  it('fires once per run, in order, and pays a small bonus', () => {
    const s = newState();
    expect(passMilestones(s)).toEqual([]);
    earn(s, milestoneAt(MILESTONES[0]));
    const a = passMilestones(s);
    expect(a.map(x => x.m.id)).toEqual(['m1a']);
    expect(a[0].bonus).toBe(MILE_MIN);
    expect(passMilestones(s)).toEqual([]);                    // not again
    earn(s, STAGES[2].at);                                      // a big jump fires everything passed, once each
    const b = passMilestones(s).map(x => x.m.id);
    expect(b).toEqual(['m1b', 'm1c', 'm2a', 'm2b', 'm2c']);
    expect(passMilestones(s)).toEqual([]);
  });
  it('the bonus is small next to the stage it sits in', () => {
    for (const m of MILESTONES) { const b = milestoneBonus(m); if (b > MILE_MIN) expect(b / milestoneAt(m)).toBeLessThanOrEqual(0.011); }
  });
  it('seeding marks everything behind the goop without paying', () => {
    const s = newState(); s.life = STAGES[7].at;
    seedMilestones(s);
    expect(dueMilestones(s)).toEqual([]);
    expect(Object.keys(s.miles).length).toBe(MILESTONES.filter(m => m.k < 7).length);
  });
  it('a hop clears them: a fresh state has none', () => {
    expect(newState().miles).toEqual({});
  });
  it('tells a scene which props are gone', () => {
    expect([...goneIn({ m1c: true }, 0)]).toEqual(['pinkFlask']);
    expect(goneIn({ m1c: true }, 1).size).toBe(0);
    expect(goneIn({}, 0).size).toBe(0);
  });
});
