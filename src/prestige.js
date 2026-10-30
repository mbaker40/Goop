/* Star Dust: the currency a hop leaves behind, and the small permanent tree it buys; and the hop bonus.
   All the maths lives here. Pure, no DOM. Perks are stored on the state as { id: level } and survive
   hops, like the hop bonus (s.hopBonus, read by econ.js). */
import { SUN_AT, SUN_STAGE, STAGES, CLICK_CAP, OFFLINE_CAP, ASCEND_BONUS, LAST, newState, earn } from './econ.js';
import { seedMilestones, milestonesIn, milestoneBonus, nextMilestone } from './milestones.js';
import { LATE_FROM, LATE_MULT, BANG_STEP, MUT_COST, lateMult, bangMult } from './perkfx.js';
export { LATE_FROM, LATE_MULT, BANG_STEP, MUT_COST, lateMult, bangMult };

/* ---------- the hop bonus: deeper hops pay more ---------- */
// Each hop adds a permanent bonus to everything the goop earns, and the bonuses add up (+10% and +50%
// make +60%). Until phase 4 every hop paid a flat +50%, so twenty quick hops at the Sun were worth 11x
// and farming the Sun was the fastest way through the universe. Now the size depends on the furthest
// stage the run reached: a hop at the Sun (stage 7's door) pays +10%, one from stage 12 the old +50%,
// and one from stage 17 or beyond (a Big Bang included) +100%. Indexes are 0-based stages.
export const HOP_BONUS = [0.10, 0.18, 0.26, 0.34, 0.42, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80];   // from SUN_STAGE upward
// Each depth also has a ceiling: hops from that stage can lift the total bonus that far and no further
// (a deeper hop always can). Twenty quick hops at the Sun stop paying a bonus at +50%; nothing is ever
// taken away, so a bonus already above a ceiling (an old save's) stays where it is.
export const HOP_CEIL = [0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.6, 3.2, 3.8, 4.4, Infinity];
export const HOP_MAX = HOP_BONUS[HOP_BONUS.length - 1];
const hopIdx = stage => Math.max(0, Math.min(HOP_BONUS.length - 1, (stage | 0) - SUN_STAGE));
export function hopBonusFor(stage) { return HOP_BONUS[hopIdx(stage)]; }
export function hopCeiling(stage) { return HOP_CEIL[hopIdx(stage)]; }
// What a hop from `stage` adds to a total bonus of `have`: its bonus, up to the ceiling for that depth.
export function hopGain(have, stage) { return Math.max(0, Math.min(hopBonusFor(stage), hopCeiling(stage) - (have || 0))); }
// The bonus a save made before phase 4 starts with: what it was already earning (+50% per hop), so
// nobody is nerfed retroactively.
export function legacyHopBonus(asc) { return Math.max(0, Math.floor(asc || 0)) * ASCEND_BONUS; }
export const pct = x => Math.round(x * 100) + '%';

// Dust for a run, from how far it got. Measured in orders of magnitude past the Sun so that a plain
// Sun run pays 6 (one or two perks), lingering to 10x the Sun pays 11, and 100x pays 16. Runs that
// never reached the Sun pay a little for the stages they did reach, so the formula keeps working when
// hopping early is allowed. Stages 7 to 20 sit on the same line: each stage is roughly 50x the last, so
// each pays about 8 more (stage 10 at 5e18 pays 32, stage 15 at 1e27 pays 74, the universe at 1e37
// pays 123). A hop after Eat the Rest is a Big Bang and adds BIG_BANG_DUST on top.
export const DUST_AT_SUN = 6, DUST_PER_DECADE = 5, BIG_BANG_DUST = 100;
export function dustForRun(life, ate = false) {
  if (!(life > 0)) return 0;
  if (life >= SUN_AT) return Math.floor(DUST_AT_SUN + DUST_PER_DECADE * Math.log10(life / SUN_AT) + 1e-9) + (ate ? BIG_BANG_DUST : 0);
  let k = 0;
  for (let i = 1; i < STAGES.length; i++) if (life >= STAGES[i].at) k = i;
  return Math.floor(k / 2);           // at most 2 short of the Sun's 6
}

// cost: Star Dust per level (array index = level being bought). max = number of levels.
// act: 1 for the Act 1 tree (2 to 6 dust a level, 45 in all), 2 for the Act 2 tree, priced in the tens to
// hundreds so the dust from a run through the universe and a Big Bang has somewhere to go.
// need(s): when the perk shows up in the panel at all (absent: always).
export const PERKS = [
  { id: 'head',    act: 1, name: 'Head Start',        cost: [4],       blurb: 'Every new run starts in stage 2, already loose in the lab.' },
  { id: 'pantry',  act: 1, name: 'Stocked Pantry',    cost: [2, 4, 6], blurb: 'Start each run with slop in the bank: 500, then 50K, then 5M.' },
  { id: 'linger',  act: 1, name: 'Slow Evaporation',  cost: [3],       blurb: 'Vials and visitors hang around 50% longer before they leave.' },
  { id: 'leak',    act: 1, name: 'Mutagen Leak',      cost: [3, 5],    blurb: 'Events turn up more often: 20% sooner, then 35%.' },
  { id: 'nap',     act: 1, name: 'Long Nap',          cost: [3],       blurb: 'The goop keeps eating while you are away for up to 8 hours, not 2.' },
  { id: 'mut6',    act: 1, name: 'Spare Stomach',     cost: [5],       blurb: 'A sixth Mutation shows up in the shop from stage 3. Feeders x1.5.' },
  { id: 'fingers', act: 1, name: 'Quick Fingers',     cost: [2, 4],    blurb: 'Raise the hand-feeding limit from 15 a second to 20, then 25.' },
  { id: 'dice',    act: 1, name: 'Loaded Dice',       cost: [4],       blurb: 'Gambles come up good 65% of the time instead of 50%.' },
  { id: 'preview', act: 1, name: 'Crystal Pipette',   cost: [3],       blurb: 'See the name of the next milestone under the progress bar.' },
  { id: 'pity',    act: 1, name: 'Event Pity',        cost: [6],       blurb: 'Let three events in a row get away and the next one is always a boost.' },
  { id: 'bundle',  act: 1, name: 'Starter Kit',       cost: [4, 8],    blurb: 'Start each run with 10 pipettes and 5 interns. Then also 5 chutes and 2 garbage trucks.' },
  // Act 2
  { id: 'crumbs',  act: 2, name: 'Crumb Hoarder',     cost: [15, 40],  blurb: 'Milestones pay double, then triple.' },
  { id: 'nap2',    act: 2, name: 'Hibernation',       cost: [25],      blurb: 'The goop keeps eating while you are away for up to 24 hours.', need: s => perkLevel(s, 'nap') > 0 },
  { id: 'late',    act: 2, name: 'Late Feeders',      cost: [60, 150], blurb: 'The Vacuum Straw, Light Cone Ladle, Horizon Hopper and Dark Matter Whisk work 50% harder, then twice as hard.' },
  { id: 'head2',   act: 2, name: 'Head Start II',     cost: [80],      blurb: 'Every new run starts in stage 7, at the Sun\'s door, with a Sun\'s worth of slop to spend.', need: s => (s.bangs | 0) >= 1 },
  { id: 'bang',    act: 2, name: 'Cosmic Memory',     cost: [100, 250], blurb: 'Every feeder works 5% harder for each Big Bang so far, and every Big Bang to come. Then 10%.', need: s => (s.bangs | 0) >= 1 },
  { id: 'fingers2', act: 2, name: 'Quicker Fingers',  cost: [30, 60],  blurb: 'Raise the hand-feeding limit by another 5 a second, then 5 more.', need: s => perkLevel(s, 'fingers') >= 2 },
  { id: 'mutdisc', act: 2, name: 'Mutation Discount', cost: [40, 100], blurb: 'Mutations cost 10% less, then 20% less.' },
  { id: 'mercy',   act: 2, name: 'Fourth Wall Mercy', cost: [20],      blurb: 'The goop eats the interface more slowly, and chews one digit at a time.' },
  { id: 'daily2',  act: 2, name: 'Daily Double',      cost: [25],      blurb: 'A new best on the daily goop counts twice its slop toward your weekly total.' },
  { id: 'echo',    act: 2, name: 'Big Bang Echo',     cost: [60],      blurb: 'After a Big Bang, every stage you walk into pays one free milestone on arrival.', need: s => (s.bangs | 0) >= 1 },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map(p => [p.id, p]));

export function perkLevel(s, id) { return (s.perks && s.perks[id]) | 0; }
export function perkMax(id) { return PERK_BY_ID[id].cost.length; }
export function perkCost(s, id) {                    // dust for the next level, or Infinity when maxed
  const p = PERK_BY_ID[id], lv = perkLevel(s, id);
  return lv < p.cost.length ? p.cost[lv] : Infinity;
}
export function perkOpen(s, id) { const p = PERK_BY_ID[id]; return !!p && (!p.need || p.need(s) || perkLevel(s, id) > 0); }
export function canBuyPerk(s, id) { return !!PERK_BY_ID[id] && perkOpen(s, id) && s.dust >= perkCost(s, id); }
export function buyPerk(s, id) {
  if (!canBuyPerk(s, id)) return false;
  s.dust -= perkCost(s, id);
  s.perks = { ...s.perks, [id]: perkLevel(s, id) + 1 };
  return true;
}
export function perksOwned(s) { return PERKS.reduce((n, p) => n + perkLevel(s, p.id), 0); }
export function perksTotal(act) { return PERKS.reduce((n, p) => n + (!act || p.act === act ? p.cost.length : 0), 0); }
export function perksOwnedIn(s, act) { return PERKS.reduce((n, p) => n + (p.act === act ? perkLevel(s, p.id) : 0), 0); }
export function dustToMax(act) { return PERKS.reduce((n, p) => n + (!act || p.act === act ? p.cost.reduce((a, b) => a + b, 0) : 0), 0); }

/* ---------- what the perks do. Everything the game asks of a perk goes through one of these. ---------- */
export function clickCap(s) { return CLICK_CAP + 5 * perkLevel(s, 'fingers') + 5 * perkLevel(s, 'fingers2'); }
export function eventLifeMult(s) { return perkLevel(s, 'linger') ? 1.5 : 1; }
export function spawnGapMult(s) { return [1, 0.8, 0.65][perkLevel(s, 'leak')]; }
export function offlineCap(s) { return perkLevel(s, 'nap2') ? 24 * 3600 : perkLevel(s, 'nap') ? 8 * 3600 : OFFLINE_CAP; }
export const CRUMBS = [1, 2, 3];
export function milestoneMult(s) { return CRUMBS[perkLevel(s, 'crumbs')]; }
// The feeder multipliers (perkfx.js holds the tables so econ.js can read them without a cycle).
export function lateFeederMult(s, feederStage) { return lateMult(perkLevel(s, 'late'), feederStage); }
export function bigBangMult(s) { return bangMult(perkLevel(s, 'bang'), s.bangs); }
export function gambleOdds(s, p) { return perkLevel(s, 'dice') ? Math.max(p, 0.65) : p; }
export const PANTRY = [0, 500, 5e4, 5e6];
// Event Pity: after this many events in a row got away, the next one is a boost.
export const PITY_AFTER = 3;
export function pityDue(s) { return perkLevel(s, 'pity') > 0 && (s.missRun | 0) >= PITY_AFTER; }
// Crystal Pipette: the next milestone's name, or null (no perk, or none left in this run).
export function milestonePreview(s) { if (!perkLevel(s, 'preview')) return null; const m = nextMilestone(s); return m ? m.name : null; }
// Mutation Discount: Mutations cost this share of their price (econ.upgradeCost reads the same table).
export function mutationPriceMult(s) { return MUT_COST[perkLevel(s, 'mutdisc')]; }
// Fourth Wall Mercy: each bite waits until the goop is this much further through stage 20 than the
// milestone that takes it, and a chewed number loses one digit, not two.
export const MERCY_DELAY = 0.15;
export function wallMercy(s) { return perkLevel(s, 'mercy') > 0; }
// Daily Double: a new daily best adds this many times the daily run's slop to the weekly total (0: none).
export function dailyWeekMult(s) { return perkLevel(s, 'daily2') ? 2 : 0; }
// Starter Kit: feeders every run starts with, by level: [feeder index, how many].
export const BUNDLE = [[], [[0, 10], [1, 5]], [[0, 10], [1, 5], [2, 5], [3, 2]]];
// Big Bang Echo: the stages entered since the last echo (each pays its first milestone's bonus again, on
// arrival), and the bonus. Advances s.echo; the caller pays with earn(). Only after a Big Bang, and never
// for the stages a run started in.
export function echoDue(s) {
  const out = [];
  if (!perkLevel(s, 'echo') || !((s.bangs | 0) >= 1)) { s.echo = Math.max(s.echo | 0, s.stage); return out; }
  for (let k = Math.max(s.echo | 0, s.startStage | 0) + 1; k <= Math.min(s.stage, LAST); k++) {
    const m = milestonesIn(k)[0];
    if (m) out.push({ k, m, bonus: milestoneBonus(m) * milestoneMult(s) });
  }
  s.echo = Math.max(s.echo | 0, s.stage);
  return out;
}

// A fresh run after a hop (or a wipe): keeps asc, the hop bonus, dust, perks and the Big Bang count, then
// applies the start-of-run perks. Head Start II starts at the Sun's door: the Act 1 card has been seen, so
// it stays shut. A prev without hopBonus (an old caller) gets the old +50% per hop.
export function freshRun(prev) {
  const s = newState();
  if (prev) {
    s.asc = prev.asc | 0; s.dust = prev.dust; s.perks = { ...prev.perks }; s.bangs = prev.bangs | 0;
    s.hopBonus = Number.isFinite(prev.hopBonus) ? Math.max(0, prev.hopBonus) : legacyHopBonus(prev.asc);
  }
  if (perkLevel(s, 'head2')) { earn(s, STAGES[SUN_STAGE].at); s.winSeen = true; }
  else if (perkLevel(s, 'head')) earn(s, STAGES[1].at);
  s.startStage = s.echo = s.stage;
  s.slop += PANTRY[perkLevel(s, 'pantry')];        // spendable only: the goop does not grow from it
  for (const [i, n] of BUNDLE[perkLevel(s, 'bundle')]) s.own[i] += n;
  return seedMilestones(s);                        // a Head Start skips stage 1's milestones, quietly
}

// Can this run hop? After the Sun, as always. A run that started at the Sun's door (Head Start II) must
// eat its way into the next stage first, or a hop would be free: +50% and Star Dust for one click.
export function canHop(s) { return !!s.won && (s.startStage < SUN_STAGE || s.stage > s.startStage); }

// What hopping right now would pay: Star Dust, and the bonus it adds (the furthest stage decides it).
export function hopPreview(s) {
  const have = Number.isFinite(s.hopBonus) ? s.hopBonus : 0, bonus = hopGain(have, s.stage);
  return { dust: dustForRun(s.life, !!s.ate), bonus, total: have + bonus, ceiling: hopCeiling(s.stage), capped: bonus < hopBonusFor(s.stage) };
}

// Hop to the next star: award dust for the run, +1 asc, the hop bonus for the stage reached, fresh run.
// Returns { state, dust, bigBang, bonus }. After Eat the Rest the same hop is a Big Bang: the goop becomes
// the new universe, with the dust bonus.
export function hop(s) {
  const bigBang = !!s.ate, { dust, bonus } = hopPreview(s);
  const next = freshRun({ asc: s.asc + 1, hopBonus: (Number.isFinite(s.hopBonus) ? s.hopBonus : 0) + bonus, dust: s.dust + dust, perks: s.perks, bangs: (s.bangs | 0) + (bigBang ? 1 : 0) });
  return { state: next, dust, bigBang, bonus };
}
