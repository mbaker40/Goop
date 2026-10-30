import { describe, it, expect } from 'vitest';
import { END, SUN_AT, STAGES, FEEDERS, newState, UPGRADES, upgradeOpen, feederRate, baseRate } from '../src/econ.js';
import { PERKS, BIG_BANG_DUST, dustForRun, buyPerk, perkLevel, perkCost, perkOpen, canHop, freshRun, hop, eventLifeMult, spawnGapMult, gambleOdds, dustToMax, milestoneMult, offlineCap, lateFeederMult, bigBangMult, LATE_FROM, LATE_MULT, BANG_STEP } from '../src/prestige.js';

describe('Star Dust', () => {
  it('a Sun run pays 6, and lingering pays more per order of magnitude', () => {
    expect(dustForRun(SUN_AT)).toBe(6);
    expect(dustForRun(SUN_AT * 10)).toBe(11);
    expect(dustForRun(SUN_AT * 100)).toBe(16);
    expect(dustForRun(0)).toBe(0);
    expect(dustForRun(STAGES[3].at)).toBeLessThan(6);
  });
  it('a Sun run funds one or two perks, not the whole tree', () => {
    const costs = PERKS.filter(p => p.act === 1).map(p => p.cost[0]).sort((a, b) => a - b);
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

describe('Act 2 perks: somewhere for Big Bang dust to go', () => {
  it('priced in the tens to hundreds, a real sink next to Act 2 and Big Bang payouts', () => {
    const act2 = PERKS.filter(p => p.act === 2);
    expect(act2.length).toBeGreaterThanOrEqual(5);
    for (const p of act2) for (const c of p.cost) { expect(c).toBeGreaterThanOrEqual(10); expect(c).toBeLessThan(1000); }
    expect(dustToMax(1)).toBe(45);                                  // Act 1 is as it was
    expect(dustToMax(2)).toBeGreaterThan(dustForRun(END.at, true) * 2);   // more than two Big Bangs' worth
    expect(PERKS.filter(p => p.act === 1).map(p => p.id)).toEqual(['head', 'pantry', 'linger', 'leak', 'nap', 'mut6', 'fingers', 'dice']);
  });
  it('Head Start II and Cosmic Memory show up after a Big Bang; Hibernation after the Long Nap', () => {
    const s = newState(); s.dust = 10000;
    expect(perkOpen(s, 'head2')).toBe(false); expect(buyPerk(s, 'head2')).toBe(false); expect(perkOpen(s, 'bang')).toBe(false); expect(perkOpen(s, 'nap2')).toBe(false);
    s.bangs = 1; expect(perkOpen(s, 'head2')).toBe(true); expect(buyPerk(s, 'head2')).toBe(true);
    s.perks.nap = 1; expect(perkOpen(s, 'nap2')).toBe(true);
    expect(perkOpen(s, 'crumbs')).toBe(true); expect(perkOpen(s, 'late')).toBe(true);
  });
  it('Head Start II starts every run at the Sun\'s door, with the Act 1 card already seen', () => {
    const s = freshRun({ asc: 3, dust: 0, perks: { head: 1, head2: 1 }, bangs: 1 });
    expect(s.stage).toBe(6); expect(s.life).toBe(SUN_AT); expect(s.won).toBe(true); expect(s.winSeen).toBe(true);
    expect(s.slop).toBe(SUN_AT);                                         // like Head Start, the door's slop is in the bank to spend
    expect(s.bangs).toBe(1);
  });
  it('a hop carries the Big Bang count and a Big Bang adds one', () => {
    const s = newState(); s.life = END.at; s.ate = true; s.bangs = 2;
    expect(hop(s).state.bangs).toBe(3);
    const t = newState(); t.life = SUN_AT; t.bangs = 2;
    expect(hop(t).state.bangs).toBe(2);
  });
  it('Crumb Hoarder multiplies milestone bonuses; Hibernation lifts the offline cap to a day', () => {
    const s = newState();
    expect(milestoneMult(s)).toBe(1); s.perks.crumbs = 2; expect(milestoneMult(s)).toBe(3);
    expect(offlineCap(s)).toBe(7200); s.perks.nap = 1; expect(offlineCap(s)).toBe(8 * 3600); s.perks.nap2 = 1; expect(offlineCap(s)).toBe(24 * 3600);
  });
  it('Late Feeders boosts only the last four feeders, and the economy sees it', () => {
    const late = FEEDERS.map((f, i) => [i, f]).filter(([, f]) => f.stage >= LATE_FROM).map(([, f]) => f.id);
    expect(late).toEqual(['vacstraw', 'conladle', 'hopper', 'whisk']);
    const s = newState(), whisk = FEEDERS.findIndex(f => f.id === 'whisk'), pip = 0;
    const w0 = feederRate(s, whisk), p0 = feederRate(s, pip);
    s.perks.late = 2;
    expect(feederRate(s, whisk) / w0).toBeCloseTo(LATE_MULT[2]); expect(feederRate(s, pip)).toBe(p0);
    expect(lateFeederMult(s, 18)).toBe(LATE_MULT[2]); expect(lateFeederMult(s, 14)).toBe(1);
  });
  it('Cosmic Memory grows with every Big Bang', () => {
    const s = newState(); s.own[0] = 10;
    const r0 = baseRate(s);
    s.perks.bang = 1; s.bangs = 0; expect(baseRate(s)).toBe(r0);
    s.bangs = 4; expect(baseRate(s) / r0).toBeCloseTo(1 + BANG_STEP[1] * 4);
    s.perks.bang = 2; s.bangs = 10; expect(bigBangMult(s)).toBeCloseTo(1 + BANG_STEP[2] * 10);
  });
});

describe('hopping needs a run that earned it', () => {
  it('a normal run hops after the Sun, as before', () => {
    const s = newState(); expect(canHop(s)).toBe(false);
    s.life = SUN_AT; s.won = true; s.stage = 6; expect(canHop(s)).toBe(true);
    const h = freshRun({ asc: 1, dust: 0, perks: { head: 1 } }); expect(h.startStage).toBe(1); h.won = true; expect(canHop(h)).toBe(true);
  });
  it('a Head Start II run starts at the Sun but cannot hop until it reaches the next stage', () => {
    const s = freshRun({ asc: 3, dust: 0, perks: { head2: 1 }, bangs: 1 });
    expect(s.won).toBe(true); expect(canHop(s)).toBe(false);
    s.life = STAGES[7].at; s.stage = 7; expect(canHop(s)).toBe(true);
  });
});
