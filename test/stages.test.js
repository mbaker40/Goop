import { describe, it, expect } from 'vitest';
import { STAGES, END, SUN_AT, SUN_STAGE, LAST, FEEDERS, UPGRADES, stageOf, stageProgress, massGrams, earn, newState, canEatRest, eatRest, feederOpen } from '../src/econ.js';

describe('stage math', () => {
  it('twenty stages in the design order, the Sun as stage 7\'s door, the universe at 1e37', () => {
    expect(STAGES.length).toBe(20);
    expect(STAGES.map(s => s.name)).toEqual(['On the Table', 'Loose in the Lab', 'Downtown Is Lunch', 'Continental Breakfast', 'Planet-Sized', 'Star Eater',
      'Neighbourhood Watch', 'Nebula Nibbler', 'Black Hole Buffet', 'Milky Way Mukbang', 'Andromeda Delivery', 'Local Group Potluck', 'Virgo Supercluster',
      'Laniakea', 'The Cosmic Web', 'Eating the Nothing', 'The Observable Universe', 'Beyond the Horizon', 'The Dark Side of the Menu', 'The Fourth Wall']);
    expect(STAGES[SUN_STAGE].at).toBe(SUN_AT);
    expect(SUN_AT).toBe(3e13);
    expect(END.at).toBe(1e37);
    expect(LAST).toBe(19);
    for (let k = 1; k < STAGES.length; k++) { expect(STAGES[k].at).toBeGreaterThan(STAGES[k - 1].at); expect(STAGES[k].grams).toBeGreaterThan(STAGES[k - 1].grams); }
    expect(END.at).toBeGreaterThan(STAGES[LAST].at); expect(END.grams).toBeGreaterThan(STAGES[LAST].grams);
  });
  it('keeps the design document masses at entry', () => {
    const g = [1, 1e3, 1e9, 1e16, 5.97e27, 1.9e30, 1.99e33, 1e36, 1e39, 1e41, 3e45, 1e46, 1e47, 2e48, 1e50, 1e52, 1e54, 1.5e56, 1e58];
    g.forEach((v, k) => expect(STAGES[k].grams).toBe(v));
  });
  it('maps lifetime slop to the right stage', () => {
    expect(stageOf(0)).toBe(0);
    expect(stageOf(1999)).toBe(0);
    expect(stageOf(2000)).toBe(1);
    expect(stageOf(1.5e5)).toBe(2);
    expect(stageOf(6e11)).toBe(5);
    expect(stageOf(SUN_AT * 0.999)).toBe(5);
    expect(stageOf(SUN_AT)).toBe(6);
    expect(stageOf(1e20)).toBe(9);
    expect(stageOf(END.at)).toBe(19);
    expect(stageOf(1e60)).toBe(19);
    STAGES.forEach((s, k) => expect(stageOf(s.at)).toBe(k));
  });
  it('measures progress in orders of magnitude, 0 at entry and near 1 at the next', () => {
    for (let k = 1; k < STAGES.length; k++) {
      expect(stageProgress(STAGES[k].at)).toBeCloseTo(0, 6);
      const next = k + 1 < STAGES.length ? STAGES[k + 1].at : END.at;
      expect(stageProgress(next * 0.999999)).toBeGreaterThan(0.99);
    }
  });
  it('maps mass to the real-world anchor at each stage entry, and to the end', () => {
    for (let k = 1; k < STAGES.length; k++) expect(massGrams(STAGES[k].at) / STAGES[k].grams).toBeCloseTo(1, 6);
    expect(massGrams(END.at * 0.9999999) / END.grams).toBeCloseTo(1, 3);
  });
  it('earn moves the stage and flags Act 1 at the Sun; the universe is a purchase', () => {
    const s = newState();
    expect(earn(s, 2500)).toBe(true);
    expect(s.stage).toBe(1);
    expect(earn(s, 10)).toBe(false);
    earn(s, SUN_AT);
    expect(s.won).toBe(true); expect(s.stage).toBe(6); expect(s.ate).toBe(false);
    earn(s, END.at);
    expect(s.stage).toBe(LAST); expect(s.ate).toBe(false);
  });
  it('one feeder per new stage (none in The Fourth Wall), and one Mutation per new stage', () => {
    expect(FEEDERS.length).toBe(23);
    for (let k = SUN_STAGE; k < LAST; k++) expect(FEEDERS.filter(f => f.stage === k).length).toBe(1);
    expect(FEEDERS.filter(f => f.stage === LAST).length).toBe(0);
    const muts = UPGRADES.filter(u => u.kind === 'all' && /^mut([7-9]|1\d|20)$/.test(u.id));
    expect(muts.length).toBe(14);
    const s = newState();
    for (const m of muts) { s.stage = +m.id.slice(3) - 2; expect(m.need(s)).toBe(false); s.stage++; expect(m.need(s)).toBe(true); }
    // every feeder costs more than the one before, and Mk upgrades exist for the new ones
    for (let i = 1; i < FEEDERS.length; i++) expect(FEEDERS[i].cost).toBeGreaterThan(FEEDERS[i - 1].cost);
    expect(UPGRADES.find(u => u.id === 'whisk3')).toBeTruthy();
    s.stage = 6; expect(feederOpen(s, FEEDERS.findIndex(f => f.id === 'dyson'))).toBe(true);
  });
  it('Eat the Rest: only in The Fourth Wall, only at the end, costs every bit of spendable slop', () => {
    const s = newState();
    earn(s, STAGES[LAST].at);
    expect(canEatRest(s)).toBe(false);
    expect(eatRest(s)).toBe(0); expect(s.ate).toBe(false);
    earn(s, END.at);
    expect(canEatRest(s)).toBe(true);
    const had = s.slop;
    expect(eatRest(s)).toBe(had);
    expect(s.slop).toBe(0); expect(s.ate).toBe(true);
    expect(canEatRest(s)).toBe(false);
    expect(eatRest(s)).toBe(0);
  });
});
