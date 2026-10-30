import { describe, it, expect } from 'vitest';
import { WALL_BITES, WALL_CLASSES, wallOf, wallClasses, chew, eatZero, readout, stageLine } from '../src/fourthwall.js';
import { MILESTONES, passMilestones } from '../src/milestones.js';
import { STAGES, END, LAST, newState, earn, canEatRest, eatRest, feederCost } from '../src/econ.js';

const at = (life) => { const s = newState(); earn(s, life); passMilestones(s); return s; };

describe('The Fourth Wall', () => {
  it('only in stage 20', () => {
    expect(wallOf(at(STAGES[LAST - 1].at))).toBe(null);
    const w = wallOf(at(STAGES[LAST].at));
    expect(w.on.banner).toBe(true); expect(w.on.shop).toBe(false); expect(w.bites).toBe(1);
  });
  it('gets worse through the stage, one bite per milestone', () => {
    let last = 0;
    for (const f of [0, .25, .45, .65, .85, .9999]) {
      const life = Math.pow(10, Math.log10(STAGES[LAST].at) + f * (Math.log10(END.at) - Math.log10(STAGES[LAST].at)));
      const w = wallOf(at(life));
      expect(w.bites).toBeGreaterThanOrEqual(last); last = w.bites;
    }
    expect(last).toBe(WALL_BITES.length);
    for (const b of WALL_BITES) if (b.when !== 'entry') expect(MILESTONES.find(m => m.id === b.when).k).toBe(LAST);
  });
  it('every treatment is visual only: a class from the allow-list, never disabled, hidden or aria', () => {
    for (const b of WALL_BITES) { expect(WALL_CLASSES).toContain(b.cls); expect(b.cls).not.toMatch(/disabled|hidden|aria|inert/); }
    const cls = wallClasses(wallOf(at(END.at)));
    for (const list of Object.values(cls)) for (const c of list) expect(WALL_CLASSES).toContain(c);
    expect(wallClasses(null)).toEqual({ banner: [], shop: [], hud: [], sound: [], title: [] });
  });
  it('chews digits for show; assistive tech always hears the real number', () => {
    expect(chew('1,234')).toBe('1,2?4');
    expect(chew('7')).toBe('7');
    expect(chew('12.3 Bellies')).toMatch(/\?/);
    const r = readout('1,234', true);
    expect(r.shown).toBe('1,2?4'); expect(r.spoken).toBe('1,234');
    expect(readout('1,234', false).shown).toBe('1,234');
  });
  it('the banner reads "Stage 2" because the zero was eaten', () => {
    expect(eatZero('Stage 20 of 20')).toBe('Stage 2 of 2');
    const w = wallOf(at(STAGES[LAST].at));
    const l = stageLine(LAST, 20, 'The Fourth Wall', w);
    expect(l.shown).toBe('Stage 2 of 2: The Fourth Wall'); expect(l.spoken).toBe('Stage 20 of 20: The Fourth Wall');
    expect(stageLine(3, 20, 'X', null).shown).toBe('Stage 4 of 20: X');
  });
  it('no amount of damage stops the economy: feeders still price, Eat the Rest still works', () => {
    const s = at(END.at);
    expect(wallOf(s).bites).toBe(WALL_BITES.length);
    expect(Number.isFinite(feederCost(s, 0))).toBe(true);
    expect(canEatRest(s)).toBe(true);
    eatRest(s);
    expect(s.ate).toBe(true); expect(wallOf(s).level).toBe(1);
  });
});
