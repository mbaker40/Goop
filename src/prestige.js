/* Star Dust: the currency a hop leaves behind, and the small permanent tree it buys.
   All the maths lives here. Pure, no DOM. Perks are stored on the state as { id: level } and survive
   hops, like the +50% per hop in econ.js (which stays exactly as it was). */
import { SUN_AT, STAGES, CLICK_CAP, OFFLINE_CAP, newState, earn } from './econ.js';
import { seedMilestones } from './milestones.js';

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
export const PERKS = [
  { id: 'head',    name: 'Head Start',        cost: [4],       blurb: 'Every new run starts in stage 2, already loose in the lab.' },
  { id: 'pantry',  name: 'Stocked Pantry',    cost: [2, 4, 6], blurb: 'Start each run with slop in the bank: 500, then 50K, then 5M.' },
  { id: 'linger',  name: 'Slow Evaporation',  cost: [3],       blurb: 'Vials and visitors hang around 50% longer before they leave.' },
  { id: 'leak',    name: 'Mutagen Leak',      cost: [3, 5],    blurb: 'Events turn up more often: 20% sooner, then 35%.' },
  { id: 'nap',     name: 'Long Nap',          cost: [3],       blurb: 'The goop keeps eating while you are away for up to 8 hours, not 2.' },
  { id: 'mut6',    name: 'Spare Stomach',     cost: [5],       blurb: 'A sixth Mutation shows up in the shop from stage 3. Feeders x1.5.' },
  { id: 'fingers', name: 'Quick Fingers',     cost: [2, 4],    blurb: 'Raise the hand-feeding limit from 15 a second to 20, then 25.' },
  { id: 'dice',    name: 'Loaded Dice',       cost: [4],       blurb: 'Gambles come up good 65% of the time instead of 50%.' },
];
export const PERK_BY_ID = Object.fromEntries(PERKS.map(p => [p.id, p]));

export function perkLevel(s, id) { return (s.perks && s.perks[id]) | 0; }
export function perkMax(id) { return PERK_BY_ID[id].cost.length; }
export function perkCost(s, id) {                    // dust for the next level, or Infinity when maxed
  const p = PERK_BY_ID[id], lv = perkLevel(s, id);
  return lv < p.cost.length ? p.cost[lv] : Infinity;
}
export function canBuyPerk(s, id) { return !!PERK_BY_ID[id] && s.dust >= perkCost(s, id); }
export function buyPerk(s, id) {
  if (!canBuyPerk(s, id)) return false;
  s.dust -= perkCost(s, id);
  s.perks = { ...s.perks, [id]: perkLevel(s, id) + 1 };
  return true;
}
export function perksOwned(s) { return PERKS.reduce((n, p) => n + perkLevel(s, p.id), 0); }
export function perksTotal() { return PERKS.reduce((n, p) => n + p.cost.length, 0); }

/* ---------- what the perks do. Everything the game asks of a perk goes through one of these. ---------- */
export function clickCap(s) { return CLICK_CAP + 5 * perkLevel(s, 'fingers'); }
export function eventLifeMult(s) { return perkLevel(s, 'linger') ? 1.5 : 1; }
export function spawnGapMult(s) { return [1, 0.8, 0.65][perkLevel(s, 'leak')]; }
export function offlineCap(s) { return perkLevel(s, 'nap') ? 8 * 3600 : OFFLINE_CAP; }
export function gambleOdds(s, p) { return perkLevel(s, 'dice') ? Math.max(p, 0.65) : p; }
export const PANTRY = [0, 500, 5e4, 5e6];

// A fresh run after a hop (or a wipe): keeps asc, dust and perks, then applies the start-of-run perks.
export function freshRun(prev) {
  const s = newState();
  if (prev) { s.asc = prev.asc; s.dust = prev.dust; s.perks = { ...prev.perks }; }
  if (perkLevel(s, 'head')) earn(s, STAGES[1].at);
  s.slop += PANTRY[perkLevel(s, 'pantry')];        // spendable only: the goop does not grow from it
  return seedMilestones(s);                        // a Head Start skips stage 1's milestones, quietly
}

// Hop to the next star: award dust for the run, +1 asc, fresh run. Returns { state, dust, bigBang }.
// After Eat the Rest the same hop is a Big Bang: the goop becomes the new universe, with the bonus.
export function hop(s) {
  const bigBang = !!s.ate;
  const dust = dustForRun(s.life, bigBang);
  const next = freshRun({ asc: s.asc + 1, dust: s.dust + dust, perks: s.perks });
  return { state: next, dust, bigBang };
}
