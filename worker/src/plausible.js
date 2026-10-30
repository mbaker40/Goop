/* The plausibility check: is a submitted run physically possible? Pure, and it runs the game's own
   rules: the same economy, event deck, perks and greedy-buyer simulator as `npm run sim`. Imported by the
   Worker (src/index.js) and tested from the game's test suite in Node (test/worker.test.js).

   A run summary says how long the run took, how many paid feeds and caught events it had, and what it
   started with (hops, perks, Big Bangs; or the daily's mutator). The check replays a greedy buyer from
   that start, clicking at the submitted rate (never past the click cap) and catching every event a
   second after it appears. That buyer is quick but not perfect, so a real player can beat it a little;
   a run more than TOLERANCE faster than its best seed, or one with more feeds or events than the clock
   allows, is flagged. Flagged runs go to the Suspicious Goop board, never deleted (see the design doc).
   This catches impossible runs, not merely fast ones. */
import { simulate } from '../../src/sim.js';
import { freshRun, clickCap, spawnGapMult, PERK_BY_ID, HOP_MAX } from '../../src/prestige.js';
import { SUN_AT, END, baseRate, feederCost } from '../../src/econ.js';
import { EVENTS, GAP_CAUGHT } from '../../src/events.js';
import { newDailyRun, dailyDeck, rulesOf, MUTATOR_BY_ID, isDateKey } from '../../src/daily.js';

export const TOLERANCE = 0.35;        // a claim may be up to 35% faster than the simulated floor
export const SEEDS = 3;
export const KINDS = { sun: SUN_AT, universe: END.at, daily: SUN_AT };
// The longest claim a time board takes (a first run to the universe is about a day at a click a second;
// a slower run would never place on a "fastest" board), and the most simulated seconds one check may
// spend across all its seeds: one full replay of the longest claim (36 h / (1 - TOLERANCE), about 55 h).
// Seeds after the first run only while the claim still looks too fast, so an honest claim costs one
// replay up to its own length, and no submission costs more than the budget. In Node a simulated hour is
// about 0.1 s of CPU late in the game, so the worst case is a few seconds: run it from a queue or with
// waitUntil rather than inside the request (see worker/README.md).
export const MAX_CLAIM_SECS = 36 * 3600, SIM_BUDGET = 56 * 3600;
const num = v => Number.isFinite(v) && v >= 0;
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);

// Check the shape. Returns a reason string, or '' when the summary can be replayed.
export function summaryProblem(run) {
  if (!run || typeof run !== 'object') return 'not a run summary';
  if (!own(KINDS, run.kind)) return 'not a time board';
  if (!num(run.seconds) || run.seconds < 1 || run.seconds > MAX_CLAIM_SECS) return 'seconds out of range';
  if (!num(run.clicks)) return 'clicks out of range';
  if (run.kind === 'daily' && (!own(MUTATOR_BY_ID, run.mutator) || (run.key && !isDateKey(run.key)))) return 'unknown daily';
  if (run.perks != null && (typeof run.perks !== 'object' || Array.isArray(run.perks))) return 'perks out of range';
  for (const [id, lv] of Object.entries(run.perks || {})) if (!own(PERK_BY_ID, id) || !Number.isInteger(lv) || lv < 0 || lv > PERK_BY_ID[id].cost.length) return 'unknown perk ' + id;
  return '';
}
// The start the submitted run claims: a fresh run after its hops with its perks, or the daily's dish.
export function startState(run) {
  if (run.kind === 'daily') return newDailyRun({ date: run.key || '2000-01-01', seed: 0, mutator: run.mutator }).state;
  // The hop bonus the run claims, never more than its hops could pay at the deepest (and, from a client
  // that does not send it, the most they could pay: the check stays lenient).
  const asc = Math.max(0, Math.floor(run.asc || 0)), most = asc * HOP_MAX;
  const hopBonus = Number.isFinite(run.hopBonus) && run.hopBonus >= 0 ? Math.min(run.hopBonus, most) : most;
  return freshRun({ asc, hopBonus, dust: 0, perks: run.perks || {}, bangs: Math.max(0, Math.floor(run.bangs || 0)) });
}
const caughtOf = events => (events && typeof events === 'object' ? Object.values(events).reduce((a, b) => a + (num(b) ? b : 0), 0) : num(events) ? events : 0);

// Returns { flagged, reason, floor, claimed, cps, simulated } (floor: the simulated time, in seconds, of the
// best seed; simulated: seconds of game simulated, never more than SIM_BUDGET).
export function checkRun(run, { seeds = SEEDS, tolerance = TOLERANCE } = {}) {
  const bad = summaryProblem(run);
  if (bad) return { flagged: true, reason: bad, floor: null, claimed: run && run.seconds };
  const s0 = startState(run), cap = clickCap(s0), cps = Math.min(cap, run.clicks / run.seconds);
  if (run.clicks > run.seconds * cap + 5) return { flagged: true, reason: 'more paid feeds than the click cap allows', floor: null, claimed: run.seconds, cps };
  const rules = run.kind === 'daily' ? rulesOf(run.mutator) : rulesOf(null);
  const caught = caughtOf(run.events), minGap = GAP_CAUGHT[0] * spawnGapMult(s0) * (rules.gapMult || Infinity);
  if (caught > run.seconds / minGap + 2) return { flagged: true, reason: 'more events caught than can turn up', floor: null, claimed: run.seconds, cps };
  // No feeding, no feeders and nothing to buy one with: the goop cannot grow at all. No replay needed.
  if (!(cps > 0) && !(baseRate(s0) > 0) && !(s0.slop >= feederCost(s0, 0))) return { flagged: true, reason: 'the goop cannot grow without feeding', floor: null, claimed: run.seconds, cps };
  let floor = Infinity, budget = SIM_BUDGET;
  const tooFast = () => !(run.seconds >= floor * (1 - tolerance));
  for (let i = 0; i < seeds && budget > 0 && tooFast(); i++) {
    const r = simulate({ until: KINDS[run.kind], clicksPerSec: cps, state: startState(run), seed: 7000 + i, deck: run.kind === 'daily' ? dailyDeck(EVENTS, run.mutator) : EVENTS,
      gapMult: rules.gapMult, maxSecs: Math.min(budget, Math.max(run.seconds / (1 - tolerance) + 60, 600)) });
    budget -= r.secs;
    if (r.won) floor = Math.min(floor, r.secs);
  }
  // No seed finished in the time the claim would need: the claim is faster than the floor by more than the tolerance.
  const simulated = SIM_BUDGET - budget;
  if (!Number.isFinite(floor)) return { flagged: true, reason: 'faster than the simulated floor', floor: null, claimed: run.seconds, cps, simulated };
  const flagged = tooFast();
  return { flagged, reason: flagged ? 'faster than the simulated floor' : '', floor, claimed: run.seconds, cps, simulated };
}
