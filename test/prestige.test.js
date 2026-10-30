import { describe, it, expect } from 'vitest';
import { END, SUN_AT, STAGES, newState, UPGRADES, upgradeOpen } from '../src/econ.js';
import { PERKS, BIG_BANG_DUST, dustForRun, buyPerk, perkLevel, perkCost, freshRun, hop, eventLifeMult, spawnGapMult, gambleOdds } from '../src/prestige.js';

describe('Star Dust', () => {
  it('a Sun run pays 6, and lingering pays more per order of magnitude', () => {
    expect(dustForRun(SUN_AT)).toBe(6);
    expect(dustForRun(SUN_AT * 10)).toBe(11);
    expect(dustForRun(SUN_AT * 100)).toBe(16);
    expect(dustForRun(0)).toBe(0);
    expect(dustForRun(STAGES[3].at)).toBeLessThan(6);
  });
  it('a Sun run funds one or two perks, not the whole tree', () => {
    const costs = PERKS.map(p => p.cost[0]).sort((a, b) => a - b);
    expect(costs[0]).toBeLessThanOrEqual(6);
    expect(costs[0] + costs[1]).toBeLessThanOrEqual(6);
    expect(costs[0] + costs[1] + costs[2]).toBeGreaterThan(6);
    expect(PERKS.length).toBeGreaterThanOrEqual(8);
  });
  it('buying spends dust and raises the level up to the max', () => {
    const s = newState(); s.dust = 20;
    expect(buyPerk(s, 'fingers')).toBe(true); expect(buyPerk(s, 'fingers')).toBe(true);
    expect(perkLevel(s, 'fingers')).toBe(2); expect(s.dust).toBe(14);
    expect(perkCost(s, 'fingers')).toBe(Infinity); expect(buyPerk(s, 'fingers')).toBe(false);
    s.dust = 0; expect(buyPerk(s, 'head')).toBe(false);
  });
  it('hopping keeps +50% per hop, adds dust and keeps perks', () => {
    const s = newState(); s.life = SUN_AT * 10; s.asc = 1; s.dust = 3; s.perks = { head: 1 };
    const { state, dust, bigBang } = hop(s);
    expect(dust).toBe(11); expect(bigBang).toBe(false); expect(state.dust).toBe(14); expect(state.asc).toBe(2);
    expect(state.perks.head).toBe(1);
    expect(state.stage).toBe(1);                              // Head Start
  });
  it('Act 2 sits on the same line, and a Big Bang after the universe pays a large bonus', () => {
    // every stage past the Sun pays more than the one before it
    for (let k = 7; k < STAGES.length; k++) expect(dustForRun(STAGES[k].at)).toBeGreaterThan(dustForRun(STAGES[k - 1].at));
    expect(dustForRun(END.at)).toBe(123);
    expect(dustForRun(END.at, true)).toBe(123 + BIG_BANG_DUST);
    expect(BIG_BANG_DUST).toBeGreaterThanOrEqual(100);
    const s = newState(); s.life = END.at; s.stage = STAGES.length - 1; s.ate = true; s.asc = 3;
    const r = hop(s);
    expect(r.bigBang).toBe(true); expect(r.dust).toBe(223); expect(r.state.asc).toBe(4);
    expect(r.state.ate).toBe(false); expect(r.state.miles).toEqual({});
  });
  it('a Head Start run skips stage 1 milestones without paying for them', () => {
    const s = freshRun({ asc: 0, dust: 0, perks: { head: 1 } });
    expect(s.stage).toBe(1); expect(s.life).toBe(STAGES[1].at);
    expect(Object.keys(s.miles).length).toBe(3);
  });
  it('start-of-run perks: pantry slop is spendable and does not grow the goop', () => {
    const s = freshRun({ asc: 0, dust: 0, perks: { pantry: 2 } });
    expect(s.slop).toBe(5e4); expect(s.life).toBe(0); expect(s.stage).toBe(0);
  });
  it('event perks and the sixth Mutation', () => {
    const s = newState();
    expect(eventLifeMult(s)).toBe(1); expect(spawnGapMult(s)).toBe(1); expect(gambleOdds(s, 0.5)).toBe(0.5);
    s.perks = { linger: 1, leak: 2, dice: 1 };
    expect(eventLifeMult(s)).toBe(1.5); expect(spawnGapMult(s)).toBeLessThan(1); expect(gambleOdds(s, 0.5)).toBe(0.65);
    const mut6 = UPGRADES.find(u => u.id === 'mut6');
    s.stage = 2;
    expect(upgradeOpen(s, mut6)).toBe(false);
    s.perks.mut6 = 1;
    expect(upgradeOpen(s, mut6)).toBe(true);
  });
});
