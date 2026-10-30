/* Pure game rules. No DOM in here, so the same code runs in the browser, in tests, in the balance
   simulator and, later, in the leaderboard Worker. */
import { lateMult, bangMult } from './perkfx.js';
export const COST_GROWTH = 1.15;            // each copy of a feeder costs 15% more than the last (the Cookie Clicker constant)

// lifetime slop needed to enter each stage, and the goop's real-world mass at that moment (grams).
// Act 1 is the first six stages and ends at the Sun (SUN_AT); Act 2 runs to the edge of the universe (END).
export const STAGES = [
  { name: 'On the Table',          at: 0,      grams: 1,       goal: 'outgrows the lab table', when: ' at 1 kg' },
  { name: 'Loose in the Lab',      at: 2000,   grams: 1e3,     goal: 'bursts out of the building', when: ' at 1,000 tonnes' },
  { name: 'Downtown Is Lunch',     at: 1.5e5,  grams: 1e9,     goal: 'is bigger than the city', when: ' at 10 billion tonnes' },
  { name: 'Continental Breakfast', at: 2e7,    grams: 1e16,    goal: 'has swallowed the Earth', when: '' },
  { name: 'Planet-Sized',          at: 5e9,    grams: 5.97e27, goal: 'outweighs Jupiter', when: ' (318 Earths)' },
  { name: 'Star Eater',            at: 6e11,   grams: 1.9e30,  goal: 'finishes the solar system', when: ' (1,047 Jupiters)' },
  { name: 'Neighbourhood Watch',   at: 3e13,   grams: 1.99e33, goal: 'has eaten the neighbours', when: ' (half a million Suns)' },
  { name: 'Nebula Nibbler',        at: 2e15,   grams: 1e36,    goal: 'clears out the star nursery', when: '' },
  { name: 'Black Hole Buffet',     at: 1e17,   grams: 1e39,    goal: 'wins the fight with Sagittarius A*', when: '' },
  { name: 'Milky Way Mukbang',     at: 5e18,   grams: 1e41,    goal: 'finishes the Milky Way', when: ' (one whole galaxy)' },
  { name: 'Andromeda Delivery',    at: 2e20,   grams: 3e45,    goal: 'signs for Andromeda and eats it', when: '' },
  { name: 'Local Group Potluck',   at: 1e22,   grams: 1e46,    goal: 'clears the potluck table', when: '' },
  { name: 'Virgo Supercluster',    at: 5e23,   grams: 1e47,    goal: 'eats a thousand galaxy clusters', when: '' },
  { name: 'Laniakea',              at: 2e25,   grams: 2e48,    goal: 'swallows its home supercluster', when: '' },
  { name: 'The Cosmic Web',        at: 1e27,   grams: 1e50,    goal: 'slurps up the cosmic web', when: '' },
  { name: 'Eating the Nothing',    at: 5e28,   grams: 1e52,    goal: 'runs out of nothing', when: '' },
  { name: 'The Observable Universe', at: 2e30, grams: 1e54,    goal: 'eats everything in sight', when: '' },
  { name: 'Beyond the Horizon',    at: 1e32,   grams: 1.5e56,  goal: 'eats what nobody can see', when: '' },
  { name: 'The Dark Side of the Menu', at: 5e33, grams: 1e58,  goal: 'finishes dessert', when: ' (dark energy)' },
  { name: 'The Fourth Wall',       at: 3e36,   grams: 1e59,    goal: 'is ready to eat the rest', when: '' },
];
export const SUN_AT = 3e13;                  // the end of Act 1: the old finish line, and stage 7's door
export const SUN_STAGE = 6;                  // the stage whose entry is the Sun
export const END = { at: 1e37, grams: 1e60 }; // the universe: Eat the Rest unlocks here
export const LAST = STAGES.length - 1;       // The Fourth Wall

export const FEEDERS = [
  { id: 'pipette',  stage: 0, name: 'Pipette',             cost: 15,     rate: 0.5,    blurb: 'Drip. Drip. Drip.' },
  { id: 'intern',   stage: 0, name: 'Intern with a Spoon', cost: 110,    rate: 3.5,      blurb: 'Unpaid. Asks no questions.' },
  { id: 'chute',    stage: 1, name: 'Cafeteria Chute',     cost: 1000,   rate: 28,     blurb: 'Taco Tuesday goes straight down the hatch.' },
  { id: 'truck',    stage: 1, name: 'Garbage Truck Route', cost: 9000,   rate: 220,    blurb: 'The whole neighbourhood chips in.' },
  { id: 'pipeline', stage: 2, name: 'Landfill Pipeline',   cost: 9e4,    rate: 1900,    blurb: 'A straw the size of a subway tunnel.' },
  { id: 'siphon',   stage: 2, name: 'Ocean Siphon',        cost: 9e5,    rate: 16000,   blurb: 'It likes the salty ones.' },
  { id: 'grinder',  stage: 3, name: 'Mountain Grinder',    cost: 1e7,    rate: 1.4e5,    blurb: 'The Alps, lightly crumbled.' },
  { id: 'lasso',    stage: 3, name: 'Moon Lasso',          cost: 1.2e8,  rate: 1.3e6,    blurb: 'Yee, and furthermore, haw.' },
  { id: 'cracker',  stage: 4, name: 'Planet Cracker',      cost: 1.6e9,  rate: 1.3e7,  blurb: 'Mars was mostly decorative anyway.' },
  { id: 'straw',    stage: 5, name: 'Star Straw',          cost: 6e10,  rate: 2.2e8,    blurb: 'One long slurp of sunshine.' },
  // Act 2: one feeder per stage. Each costs 8% of its stage's door; its payback (cost over base rate)
  // grows from 800 s to about 10^6 s, Cookie Clicker style, and the Mutations make up the difference.
  // Tuned with `npm run sim` so a maxed-perk run reaches the end in about three hours (see README).
  { id: 'dyson',     stage: 6,  name: 'Dyson Funnel',          cost: 2.4e12, rate: 3e9,   blurb: 'A star in a sock, wrung out.' },
  { id: 'comet',     stage: 7,  name: 'Comet Conveyor',        cost: 1.6e14, rate: 2.9e10,  blurb: 'Dirty snowballs, delivered hourly.' },
  { id: 'spork',     stage: 8,  name: 'Event Horizon Spork',   cost: 8e15,   rate: 4.7e11,  blurb: 'Half spoon, half fork, no way back.' },
  { id: 'gulper',    stage: 9,  name: 'Galaxy Gulper',         cost: 4e17,   rate: 1e13,  blurb: 'Two hundred billion stars, one swallow.' },
  { id: 'towrope',   stage: 10, name: 'Gravity Tow Rope',      cost: 1.6e19, rate: 2.2e14,  blurb: 'Hauls the next galaxy over. Gently. Ish.' },
  { id: 'wormhole',  stage: 11, name: 'Wormhole Gullet',       cost: 8e20,   rate: 6.7e15,  blurb: 'A shortcut straight to the stomach.' },
  { id: 'compactor', stage: 12, name: 'Cluster Compactor',     cost: 4e22,   rate: 2.1e17,  blurb: 'A thousand galaxies, one tidy cube.' },
  { id: 'magnet',    stage: 13, name: 'Great Attractor Magnet', cost: 1.6e24, rate: 5.9e18,   blurb: 'Everything was heading this way anyway.' },
  { id: 'filfork',   stage: 14, name: 'Filament Fork',         cost: 8e25,   rate: 2.1e20,    blurb: 'Twirl. Slurp. Repeat.' },
  { id: 'vacstraw',  stage: 15, name: 'Vacuum Straw',          cost: 4e27,   rate: 8e21,  blurb: 'Sucks up the nothing. There is a lot of it.' },
  { id: 'conladle',  stage: 16, name: 'Light Cone Ladle',      cost: 1.6e29, rate: 2.3e23,  blurb: 'Scoops up everything the light has reached.' },
  { id: 'hopper',    stage: 17, name: 'Horizon Hopper',        cost: 8e30,   rate: 8.4e24,    blurb: 'Fetches what nobody can see. Very rude.' },
  { id: 'whisk',     stage: 18, name: 'Dark Matter Whisk',     cost: 4e32,   rate: 5.7e26,  blurb: 'Beats the dark matter to stiff peaks.' },
];

// kind: 'click' doubles the spoon, 'pct' adds a share of slop/sec to every feed, 'feeder' doubles one feeder, 'all' boosts everything
export const UPGRADES = [
  { id: 'spoon',   kind: 'click', name: 'Bigger Spoon',       cost: 60,    need: s => s.life >= 20,   text: 'Doubles the base helping you feed by hand. Bonuses from slop per second stay the same.' },
  { id: 'ladle',   kind: 'click', name: 'Ladle of Science',   cost: 700,   need: s => s.life >= 300,  text: 'Doubles the base helping again. The slop-per-second share is not invited.' },
  { id: 'cata',    kind: 'pct', v: 0.03, name: 'Catapult Arm',     cost: 6000,  need: s => s.life >= 2500, text: 'Every feed also adds 3% of your slop per second.' },
  { id: 'treb',    kind: 'pct', v: 0.04, name: 'Trebuchet',        cost: 4e5,   need: s => s.life >= 2e5,  text: 'Every feed adds a further 4% of slop per second.' },
  { id: 'rail',    kind: 'pct', v: 0.05, name: 'Railgun Feeder',   cost: 6e7,   need: s => s.life >= 3e7,  text: 'Every feed adds a further 5% of slop per second.' },
  { id: 'orbital', kind: 'pct', v: 0.06, name: 'Orbital Slingshot', cost: 9e9,  need: s => s.life >= 5e9,  text: 'Every feed adds a further 6% of slop per second.' },
  { id: 'mut1', kind: 'all', v: 1.5, name: 'Mutation: Second Eye',   cost: 3000,  need: s => s.stage >= 1, text: 'All feeders work 50% harder.' },
  { id: 'mut2', kind: 'all', v: 1.5, name: 'Mutation: Tentacles',    cost: 3e5,   need: s => s.stage >= 2, text: 'All feeders work 50% harder.' },
  { id: 'mut3', kind: 'all', v: 1.5, name: 'Mutation: Molten Core',  cost: 5e7,   need: s => s.stage >= 3, text: 'All feeders work 50% harder.' },
  { id: 'mut4', kind: 'all', v: 1.5, name: 'Mutation: Own Gravity',  cost: 8e9,   need: s => s.stage >= 4, text: 'All feeders work 50% harder.' },
  { id: 'mut5', kind: 'all', v: 1.5, name: 'Mutation: Inner Galaxy', cost: 7e11,  need: s => s.stage >= 5, text: 'All feeders work 50% harder.' },
  // the sixth Mutation slot is a Star Dust perk (see prestige.js); econ only reads the flag on the state
  { id: 'mut6', kind: 'all', v: 1.5, name: 'Mutation: Spare Stomach', cost: 2e6,   need: s => s.stage >= 2 && !!(s.perks && s.perks.mut6), text: 'All feeders work 50% harder. A gift from the stars.' },
];
// Act 2: one Mutation per stage, from stage 7 (index 6) to The Fourth Wall. Each costs a little more
// than the slop it takes to reach its stage.
[['Telescope Eyes', 'It can see the neighbours now. They can see it.'],
 ['Gas Giant Gut', 'Room for a nebula, and pudding.'],
 ['Spaghetti Proof', 'The black hole pulls. The goop pulls harder.'],
 ['Spiral Arms', 'Two more arms. Both of them are for eating.'],
 ['Second Galaxy', 'It grew a spare galaxy for leftovers.'],
 ['Elastic Waistband', 'Potluck rules: everyone brings a stomach.'],
 ['Cluster Teeth', 'Each tooth is a galaxy cluster. Flossing is a problem.'],
 ['Great Attraction', 'It is not vain. It is simply where everything ends up.'],
 ['Noodle Tongue', 'Built for slurping filaments.'],
 ['Hollow Leg', 'Where the nothing goes.'],
 ['Eyes Everywhere', 'One for every direction you can look.'],
 ['Peripheral Vision', 'It can see past the horizon. It wishes it could not.'],
 ['Dark Appetite', 'Hungry in a way the light cannot see.'],
 ['Self Awareness', 'It knows it is in a game. It is fine with that.'],
].forEach(([name, flavour], j) => {
  const k = SUN_STAGE + j;
  UPGRADES.push({ id: 'mut' + (k + 1), kind: 'all', v: 1.5, name: 'Mutation: ' + name, cost: STAGES[k].at * 1.5, need: s => s.stage >= k, text: 'All feeders work 50% harder. ' + flavour });
});
FEEDERS.forEach((f, i) => {
  UPGRADES.push({ id: f.id + '2', kind: 'feeder', i, v: 2, name: f.name + ' Mk II',  cost: f.cost * 9,   need: s => s.own[i] >= 10, text: 'Each ' + f.name + ' feeds twice as fast.' });
  UPGRADES.push({ id: f.id + '3', kind: 'feeder', i, v: 2, name: f.name + ' Mk III', cost: f.cost * 110, need: s => s.own[i] >= 25, text: 'Each ' + f.name + ' feeds twice as fast again.' });
});

// Upgrade lists by kind, built once, so the hot rate functions below do not scan every upgrade.
const ALL_UPS = UPGRADES.filter(u => u.kind === 'all');
const FEEDER_UPS = FEEDERS.map((_, i) => UPGRADES.filter(u => u.kind === 'feeder' && u.i === i));
const HAND_UPS = UPGRADES.filter(u => u.kind === 'click' || u.kind === 'pct');

export const FRENZY_MULT = 7, FRENZY_SECS = 20;      // the original mutagen vial: everything x7 for a short burst
export const GEYSER_SECS = 75;                       // or an instant payout worth this many seconds of slop
export const ASCEND_BONUS = 0.5;                     // each new star system: +50% slop, forever

// Feeds by hand beyond this many per second still animate but pay nothing. Keeps autoclickers (and a
// future leaderboard) honest. The Quick Fingers perk in prestige.js raises it.
export const CLICK_CAP = 15;

// One offline rule for a hidden tab and a closed one: a short blink (up to a minute) pays as if you
// never left; anything longer pays half rate, capped at two hours (a perk raises the cap).
export const OFFLINE_GRACE = 60, OFFLINE_RATE = 0.5, OFFLINE_CAP = 7200;

export function newState() {
  return {
    slop: 0, life: 0, stage: 0, own: FEEDERS.map(() => 0), ups: {}, feeds: 0, asc: 0, won: false, played: 0,
    frenzy: 0, fmult: FRENZY_MULT,     // a running boost: seconds left and its multiplier
    freeze: 0,                         // seconds the feeders are frozen (the lab inspector)
    dust: 0, perks: {},                // Star Dust and perks survive hops, like asc
    miles: {},                         // mid-stage milestones passed this run (see milestones.js)
    ate: false,                        // Eat the Rest pressed: the universe is gone and the ending has played
    bangs: 0,                          // Big Bangs so far: survives hops, like asc (the Cosmic Memory perk reads it)
    startStage: 0,                     // the stage this run began in (a Head Start); prestige.canHop reads it
    costMult: 1,                       // feeder prices x this. 1 in the main game; the daily goop's mutators change it
  };
}
export function feederCost(s, i) { return Math.ceil(FEEDERS[i].cost * Math.pow(COST_GROWTH, s.own[i]) * (s.costMult || 1)); }
const perk = (s, id) => (s.perks && s.perks[id]) | 0;
export function allMult(s) {
  let m = (1 + ASCEND_BONUS * s.asc) * bangMult(perk(s, 'bang'), s.bangs);
  for (const u of ALL_UPS) if (s.ups[u.id]) m *= u.v;
  return m;
}
function ownRate(s, i) {               // feeder i's base rate with its own Mk II and Mk III (and the Late Feeders perk)
  let r = FEEDERS[i].rate * lateMult(perk(s, 'late'), FEEDERS[i].stage);
  for (const u of FEEDER_UPS[i]) if (s.ups[u.id]) r *= u.v;
  return r;
}
export function feederRate(s, i) { return ownRate(s, i) * allMult(s); }   // slop per second from ONE copy of feeder i
export function baseRate(s) {          // feeders only: no boost, no freeze. Geysers and offline pay are measured in this.
  let t = 0;
  for (let i = 0; i < FEEDERS.length; i++) if (s.own[i]) t += s.own[i] * ownRate(s, i);
  return t * allMult(s);
}
export function boostMult(s) { return s.frenzy > 0 ? (s.fmult || FRENZY_MULT) : 1; }
export function slopPerSec(s) { return s.freeze > 0 ? 0 : baseRate(s) * boostMult(s); }
export function feedValue(s) {         // slop from one paid click on the goop
  let base = 1 + ASCEND_BONUS * s.asc, pct = 0;
  for (const u of HAND_UPS) {
    if (!s.ups[u.id]) continue;
    if (u.kind === 'click') base *= 2;
    if (u.kind === 'pct') pct += u.v;
  }
  return base + pct * baseRate(s) * boostMult(s);   // a frozen feeder line still lets the catapult throw
}
export function stageOf(life) {
  let k = 0;
  for (let i = 0; i < STAGES.length; i++) if (life >= STAGES[i].at) k = i;
  return k;
}
export function stageSpan(k) { return [STAGES[k], k + 1 < STAGES.length ? STAGES[k + 1] : END]; }
export function stageProgress(life) {  // 0..1 through the current stage, measured in orders of magnitude
  const k = stageOf(life), [a, b] = stageSpan(k);
  const lo = Math.log10(a.at + 1), hi = Math.log10(b.at + 1);
  return Math.max(0, (Math.log10(life + 1) - lo) / (hi - lo));
}
export function massGrams(life) {      // the number on the shop stays small; the goop's mass spans 60 orders of magnitude
  const k = stageOf(life), [a, b] = stageSpan(k), p = stageProgress(life);
  return Math.pow(10, Math.log10(a.grams) + p * (Math.log10(b.grams) - Math.log10(a.grams)));
}
export function earn(s, n) {
  s.slop += n; s.life += n;
  const k = stageOf(s.life);
  const changed = k !== s.stage;
  s.stage = k;
  if (s.life >= SUN_AT) s.won = true;          // won = Act 1, the Sun. The universe is s.ate (eatRest below).
  return changed;
}

// The last purchase: one button in The Fourth Wall that costs every bit of spendable slop. It opens once
// the goop has eaten END.at in this run, and pressing it is what starts the ending.
export function canEatRest(s) { return s.stage === LAST && s.life >= END.at && !s.ate; }
export function eatRest(s) {
  if (!canEatRest(s)) return 0;
  const spent = s.slop;
  s.slop = 0; s.ate = true;
  return spent;
}
export function feederOpen(s, i) { return s.stage >= FEEDERS[i].stage; }
export function upgradeOpen(s, u) { return !s.ups[u.id] && u.need(s); }

// The click cap as a sliding one-second window. `times` holds the timestamps (ms) of recent paid
// clicks and is updated in place. Returns true when this click pays.
export function clickGate(times, now, cap = CLICK_CAP) {
  while (times.length && now - times[0] >= 1000) times.shift();
  if (times.length >= cap) return false;
  times.push(now);
  return true;
}

// Slop earned while away for `secs` at feeder rate `rate`. Same rule for a hidden tab and a closed one:
// the first minute pays full rate, the rest half rate, up to the cap. No cliff at 60 s: 61 s pays a
// little more than 60 s, never less.
export function awayEarnings(rate, secs, cap = OFFLINE_CAP) {
  if (!(secs > 0) || !(rate > 0)) return 0;
  return rate * awayWeight(0, Math.min(secs, Math.max(cap, OFFLINE_GRACE)));
}
// How much of [t0, t1] seconds into an absence counts: full weight up to OFFLINE_GRACE, then OFFLINE_RATE.
function awayWeight(t0, t1) {
  if (!(t1 > t0)) return 0;
  const full = Math.max(0, Math.min(t1, OFFLINE_GRACE) - t0);
  const half = Math.max(0, t1 - Math.max(t0, OFFLINE_GRACE));
  return full + half * OFFLINE_RATE;
}
// The whole absence for a state: feeders at base rate, a running boost (frenzy) paid for the part of the
// gap it really covered, and a freeze (the inspector) paying nothing for the part it covered; then the
// timers are run down. Mutates s.frenzy and s.freeze only; returns the slop to add with earn().
export function awayPay(s, secs, cap = OFFLINE_CAP) {
  if (!(secs > 0)) return 0;
  const rate = baseRate(s), end = Math.min(secs, Math.max(cap, OFFLINE_GRACE));
  const fz = Math.min(s.freeze || 0, end), fr = Math.min(s.frenzy || 0, end), mult = s.fmult || FRENZY_MULT;
  s.frenzy = Math.max(0, (s.frenzy || 0) - secs); s.freeze = Math.max(0, (s.freeze || 0) - secs);
  if (!(rate > 0)) return 0;
  // [0, fz): frozen, nothing. [fz, fr): boosted (if the boost outlasts the freeze). Then plain.
  const boosted = fr > fz ? awayWeight(fz, fr) : 0;
  return rate * (awayWeight(fz, end) + boosted * (mult - 1));
}
