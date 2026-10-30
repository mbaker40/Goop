/* Pure game rules. No DOM in here, so the same code runs in the browser, in tests, in the balance
   simulator and, later, in the leaderboard Worker. */
export const COST_GROWTH = 1.15;            // each copy of a feeder costs 15% more than the last (the Cookie Clicker constant)

// lifetime slop needed to enter each stage, and the goop's real-world mass at that moment (grams)
export const STAGES = [
  { name: 'On the Table',          at: 0,      grams: 1,       goal: 'outgrows the lab table', when: ' at 1 kg' },
  { name: 'Loose in the Lab',      at: 2000,   grams: 1e3,     goal: 'bursts out of the building', when: ' at 1,000 tonnes' },
  { name: 'Downtown Is Lunch',     at: 1.5e5,  grams: 1e9,     goal: 'is bigger than the city', when: ' at 10 billion tonnes' },
  { name: 'Continental Breakfast', at: 2e7,    grams: 1e16,    goal: 'has swallowed the Earth', when: '' },
  { name: 'Planet-Sized',          at: 5e9,    grams: 5.97e27, goal: 'outweighs Jupiter', when: ' (318 Earths)' },
  { name: 'Star Eater',            at: 6e11,   grams: 1.9e30,  goal: 'finishes the solar system', when: ' (1,047 Jupiters)' },
];
export const END = { at: 3e13, grams: 1.99e33 };

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
];

// kind: 'click' doubles the spoon, 'pct' adds a share of slop/sec to every feed, 'feeder' doubles one feeder, 'all' boosts everything
export const UPGRADES = [
  { id: 'spoon',   kind: 'click', name: 'Bigger Spoon',       cost: 60,    need: s => s.life >= 20,   text: 'Feeding by hand gives twice as much.' },
  { id: 'ladle',   kind: 'click', name: 'Ladle of Science',   cost: 700,   need: s => s.life >= 300,  text: 'Feeding by hand gives twice as much again.' },
  { id: 'cata',    kind: 'pct', v: 0.03, name: 'Catapult Arm',     cost: 6000,  need: s => s.life >= 2500, text: 'Every feed also adds 3% of your slop per second.' },
  { id: 'treb',    kind: 'pct', v: 0.04, name: 'Trebuchet',        cost: 4e5,   need: s => s.life >= 2e5,  text: 'Every feed adds a further 4% of slop per second.' },
  { id: 'rail',    kind: 'pct', v: 0.05, name: 'Railgun Feeder',   cost: 6e7,   need: s => s.life >= 3e7,  text: 'Every feed adds a further 5% of slop per second.' },
  { id: 'orbital', kind: 'pct', v: 0.06, name: 'Orbital Slingshot', cost: 9e9,  need: s => s.life >= 5e9,  text: 'Every feed adds a further 6% of slop per second.' },
  { id: 'mut1', kind: 'all', v: 1.5, name: 'Mutation: Second Eye',   cost: 3000,  need: s => s.stage >= 1, text: 'All feeders work 50% harder.' },
  { id: 'mut2', kind: 'all', v: 1.5, name: 'Mutation: Tentacles',    cost: 3e5,   need: s => s.stage >= 2, text: 'All feeders work 50% harder.' },
  { id: 'mut3', kind: 'all', v: 1.5, name: 'Mutation: Molten Core',  cost: 5e7,   need: s => s.stage >= 3, text: 'All feeders work 50% harder.' },
  { id: 'mut4', kind: 'all', v: 1.5, name: 'Mutation: Own Gravity',  cost: 8e9,   need: s => s.stage >= 4, text: 'All feeders work 50% harder.' },
  { id: 'mut5', kind: 'all', v: 1.5, name: 'Mutation: Inner Galaxy', cost: 7e11,  need: s => s.stage >= 5, text: 'All feeders work 50% harder.' },
];
FEEDERS.forEach((f, i) => {
  UPGRADES.push({ id: f.id + '2', kind: 'feeder', i, v: 2, name: f.name + ' Mk II',  cost: f.cost * 9,   need: s => s.own[i] >= 10, text: 'Each ' + f.name + ' feeds twice as fast.' });
  UPGRADES.push({ id: f.id + '3', kind: 'feeder', i, v: 2, name: f.name + ' Mk III', cost: f.cost * 110, need: s => s.own[i] >= 25, text: 'Each ' + f.name + ' feeds twice as fast again.' });
});

export const FRENZY_MULT = 7, FRENZY_SECS = 20;      // mutagen vial: everything x7 for a short burst
export const GEYSER_SECS = 75;                       // or an instant payout worth this many seconds of slop
export const ASCEND_BONUS = 0.5;                     // each new star system: +50% slop, forever

export function newState() {
  return { slop: 0, life: 0, stage: 0, own: FEEDERS.map(() => 0), ups: {}, feeds: 0, asc: 0, frenzy: 0, won: false, played: 0 };
}
export function feederCost(s, i) { return Math.ceil(FEEDERS[i].cost * Math.pow(COST_GROWTH, s.own[i])); }
export function allMult(s) {
  let m = 1 + ASCEND_BONUS * s.asc;
  for (const u of UPGRADES) if (u.kind === 'all' && s.ups[u.id]) m *= u.v;
  return m;
}
export function feederRate(s, i) {            // slop per second from ONE copy of feeder i
  let r = FEEDERS[i].rate;
  for (const u of UPGRADES) if (u.kind === 'feeder' && u.i === i && s.ups[u.id]) r *= u.v;
  return r * allMult(s);
}
export function slopPerSec(s) {
  let t = 0;
  for (let i = 0; i < FEEDERS.length; i++) t += s.own[i] * feederRate(s, i);
  return t * (s.frenzy > 0 ? FRENZY_MULT : 1);
}
export function feedValue(s) {                // slop from one click on the goop
  let base = 1 + ASCEND_BONUS * s.asc, pct = 0;
  for (const u of UPGRADES) {
    if (!s.ups[u.id]) continue;
    if (u.kind === 'click') base *= 2;
    if (u.kind === 'pct') pct += u.v;
  }
  return (base + pct * slopPerSec(s)) ;
}
export function stageOf(life) {
  let k = 0;
  for (let i = 0; i < STAGES.length; i++) if (life >= STAGES[i].at) k = i;
  return k;
}
export function stageSpan(k) { return [STAGES[k], k + 1 < STAGES.length ? STAGES[k + 1] : END]; }
export function stageProgress(life) {         // 0..1 through the current stage, measured in orders of magnitude
  const k = stageOf(life), [a, b] = stageSpan(k);
  const lo = Math.log10(a.at + 1), hi = Math.log10(b.at + 1);
  return Math.max(0, (Math.log10(life + 1) - lo) / (hi - lo));
}
export function massGrams(life) {             // the number on the shop stays small; the goop's mass spans 33 orders of magnitude
  const k = stageOf(life), [a, b] = stageSpan(k), p = stageProgress(life);
  return Math.pow(10, Math.log10(a.grams) + p * (Math.log10(b.grams) - Math.log10(a.grams)));
}
export function earn(s, n) {
  s.slop += n; s.life += n;
  const k = stageOf(s.life);
  const changed = k !== s.stage;
  s.stage = k;
  if (s.life >= END.at) s.won = true;
  return changed;
}
export function feederOpen(s, i) { return s.stage >= FEEDERS[i].stage; }
export function upgradeOpen(s, u) { return !s.ups[u.id] && u.need(s); }
