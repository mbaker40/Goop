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
  it('hopping adds the hop bonus for the stage reached, adds dust and keeps perks', () => {
    const s = newState(); s.life = SUN_AT * 10; s.stage = 6; s.asc = 1; s.hopBonus = 0.5; s.dust = 3; s.perks = { head: 1 };
    const { state, dust, bigBang, bonus } = hop(s);
    expect(dust).toBe(11); expect(bigBang).toBe(false); expect(state.dust).toBe(14); expect(state.asc).toBe(2);
    expect(bonus).toBe(0); expect(state.hopBonus).toBe(0.5);  // a Sun hop pays nothing above the Sun's +50% ceiling
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
    expect(dustToMax(1)).toBe(66);                                  // the old tree's 45, plus three small phase 4 perks
    expect(dustToMax(2)).toBeGreaterThan(dustForRun(END.at, true) * 2);   // more than two Big Bangs' worth
    expect(PERKS.filter(p => p.act === 1).map(p => p.id)).toEqual(['head', 'pantry', 'linger', 'leak', 'nap', 'mut6', 'fingers', 'dice', 'preview', 'pity', 'bundle']);
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

import { HOP_BONUS, HOP_CEIL, HOP_MAX, hopBonusFor, hopCeiling, hopGain, hopPreview, legacyHopBonus, clickCap, pityDue, PITY_AFTER, milestonePreview, wallMercy, dailyWeekMult, BUNDLE, echoDue, mutationPriceMult } from '../src/prestige.js';
import { upgradeCost, allMult, feedValue, SUN_STAGE } from '../src/econ.js';
import { milestonesIn, milestoneBonus } from '../src/milestones.js';

describe('depth-scaled hops', () => {
  it('a Sun hop pays +10%, a hop from stage 12 the full +50%, from stage 17 on +80%; deeper never pays less', () => {
    expect(hopBonusFor(SUN_STAGE)).toBe(0.10);
    expect(hopBonusFor(11)).toBe(0.50);                       // stage 12, Local Group Potluck
    expect(hopBonusFor(16)).toBe(HOP_MAX); expect(hopBonusFor(19)).toBe(HOP_MAX); expect(HOP_MAX).toBeGreaterThanOrEqual(0.75);
    for (let k = SUN_STAGE + 1; k < STAGES.length; k++) { expect(hopBonusFor(k)).toBeGreaterThanOrEqual(hopBonusFor(k - 1)); expect(hopCeiling(k)).toBeGreaterThanOrEqual(hopCeiling(k - 1)); }
    expect(HOP_BONUS.length).toBe(HOP_CEIL.length);
  });
  it('the bonus is stored on the state, is additive, and every hop adds what its depth pays', () => {
    let s = freshRun({ asc: 0, hopBonus: 0, dust: 0, perks: {} });
    s.life = STAGES[11].at; s.stage = 11; s.won = true;
    s = hop(s).state; expect(s.hopBonus).toBeCloseTo(0.5);
    s.life = STAGES[17].at; s.stage = 17; s.won = true;
    s = hop(s).state; expect(s.hopBonus).toBeCloseTo(0.5 + HOP_MAX);
    expect(allMult(s)).toBeCloseTo(1 + 0.5 + HOP_MAX); expect(feedValue(s)).toBeCloseTo(1 + 0.5 + HOP_MAX);
  });
  it('Sun farming runs into the Sun\'s ceiling: twenty Sun hops are worth +50%, not +200% (or the old +1000%)', () => {
    let s = freshRun({ asc: 0, hopBonus: 0, dust: 0, perks: {} });
    for (let i = 0; i < 20; i++) { s.life = SUN_AT; s.stage = SUN_STAGE; s.won = true; s = hop(s).state; }
    expect(s.hopBonus).toBeCloseTo(HOP_CEIL[0]); expect(s.asc).toBe(20); expect(s.dust).toBe(120);
    s.life = STAGES[11].at; s.stage = 11; s.won = true;     // a deeper hop still pays in full
    expect(hopPreview(s).bonus).toBe(0.5); expect(hop(s).state.hopBonus).toBeCloseTo(1.0);
  });
  it('a bonus already above a ceiling is never reduced (an old save keeps its +50% per hop)', () => {
    expect(legacyHopBonus(21)).toBe(10.5); expect(legacyHopBonus(0)).toBe(0); expect(legacyHopBonus(-3)).toBe(0);
    expect(hopGain(10.5, SUN_STAGE)).toBe(0); expect(hopGain(10.5, 11)).toBe(0); expect(hopGain(10.5, 19)).toBe(HOP_MAX);
    const s = freshRun({ asc: 21, dust: 0, perks: {} });          // an old caller without hopBonus: the old rule
    expect(s.hopBonus).toBe(10.5);
    s.life = SUN_AT; s.stage = SUN_STAGE; s.won = true;
    expect(hop(s).state.hopBonus).toBe(10.5);
  });
  it('the preview says what a hop will pay before it is pressed, and when the ceiling caps it', () => {
    const s = newState(); s.life = SUN_AT; s.stage = SUN_STAGE; s.won = true;
    expect(hopPreview(s)).toMatchObject({ dust: 6, bonus: 0.1, total: 0.1, capped: false });
    s.hopBonus = 0.45; expect(hopPreview(s).bonus).toBeCloseTo(0.05); expect(hopPreview(s).capped).toBe(true);
    s.ate = true; s.life = END.at; s.stage = 19; expect(hopPreview(s)).toMatchObject({ dust: 223, bonus: HOP_MAX });
  });
});

describe('phase 4 perks', () => {
  it('Quicker Fingers stacks on Quick Fingers, and shows up once it is maxed', () => {
    const s = newState(); s.perks = { fingers: 2 }; expect(clickCap(s)).toBe(25); expect(perkOpen(s, 'fingers2')).toBe(true);
    s.perks.fingers2 = 2; expect(clickCap(s)).toBe(35);
    expect(perkOpen({ perks: { fingers: 1 } }, 'fingers2')).toBe(false);
  });
  it('Event Pity is owed after three misses in a row, only with the perk', () => {
    const s = newState(); s.missRun = PITY_AFTER; expect(pityDue(s)).toBe(false);
    s.perks.pity = 1; expect(pityDue(s)).toBe(true); s.missRun = 2; expect(pityDue(s)).toBe(false);
  });
  it('the Crystal Pipette names the next milestone', () => {
    const s = newState(); expect(milestonePreview(s)).toBe(null);
    s.perks.preview = 1; expect(milestonePreview(s)).toBe('Ate the sticky note');
    s.miles = { m1a: true }; s.life = 50; expect(milestonePreview(s)).toBe('Ate the coffee machine');
  });
  it('Mutation Discount takes 10%, then 20%, off Mutations only', () => {
    const s = newState(), mut = UPGRADES.find(u => u.id === 'mut3'), spoon = UPGRADES.find(u => u.id === 'spoon');
    expect(upgradeCost(s, mut)).toBe(mut.cost);
    s.perks.mutdisc = 1; expect(upgradeCost(s, mut)).toBe(Math.ceil(mut.cost * 0.9)); expect(mutationPriceMult(s)).toBe(0.9);
    s.perks.mutdisc = 2; expect(upgradeCost(s, mut)).toBe(Math.ceil(mut.cost * 0.8)); expect(upgradeCost(s, spoon)).toBe(spoon.cost);
  });
  it('Fourth Wall Mercy and Daily Double are flags the game reads', () => {
    const s = newState(); expect(wallMercy(s)).toBe(false); expect(dailyWeekMult(s)).toBe(0);
    s.perks = { mercy: 1, daily2: 1 }; expect(wallMercy(s)).toBe(true); expect(dailyWeekMult(s)).toBe(2);
  });
  it('the Starter Kit puts feeders on the bench at the start of every run', () => {
    const a = freshRun({ asc: 0, dust: 0, perks: { bundle: 1 } }); expect(a.own.slice(0, 4)).toEqual([10, 5, 0, 0]);
    const b = freshRun({ asc: 0, dust: 0, perks: { bundle: 2 } }); expect(b.own.slice(0, 4)).toEqual([10, 5, 5, 2]);
    expect(BUNDLE.length).toBe(PERK_BY_ID_LEN('bundle') + 1);
  });
  it('Big Bang Echo pays each new stage\'s first milestone on arrival, once, and only after a Big Bang', () => {
    const s = freshRun({ asc: 1, dust: 0, perks: { echo: 1, crumbs: 1 }, bangs: 1 });
    s.life = STAGES[3].at; s.stage = 3;
    const due = echoDue(s);
    expect(due.map(d => d.k)).toEqual([1, 2, 3]);
    expect(due[0].bonus).toBe(milestoneBonus(milestonesIn(1)[0]) * 2);
    expect(echoDue(s)).toEqual([]);
    const t = freshRun({ asc: 1, dust: 0, perks: { echo: 1 }, bangs: 0 }); t.stage = 3; expect(echoDue(t)).toEqual([]);
    expect(perkOpen(newState(), 'echo')).toBe(false);
  });
  it('the new perks are a sink in the hundreds, across both acts', () => {
    const added = ['preview', 'pity', 'bundle', 'fingers2', 'mutdisc', 'mercy', 'daily2', 'echo'];
    const cost = added.reduce((n, id) => n + PERKS.find(p => p.id === id).cost.reduce((a, b) => a + b, 0), 0);
    expect(cost).toBeGreaterThan(300); expect(cost).toBeLessThan(600);
    expect(new Set(added.map(id => PERKS.find(p => p.id === id).act))).toEqual(new Set([1, 2]));
  });
});
const PERK_BY_ID_LEN = id => PERKS.find(p => p.id === id).cost.length;
