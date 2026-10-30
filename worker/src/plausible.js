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
import { freshRun, clickCap, spawnGapMult, PERK_BY_ID } from '../../src/prestige.js';
import { SUN_AT, END } from '../../src/econ.js';
import { EVENTS, GAP_CAUGHT } from '../../src/events.js';
import { newDailyRun, dailyDeck, rulesOf, MUTATOR_BY_ID, isDateKey } from '../../src/daily.js';

export const TOLERANCE = 0.35;        // a claim may be up to 35% faster than the simulated floor
export const SEEDS = 3;
export const KINDS = { sun: SUN_AT, universe: END.at, daily: SUN_AT };
const num = v => Number.isFinite(v) && v >= 0;

// Check the shape. Returns a reason string, or '' when the summary can be replayed.
export function summaryProblem(run) {
  if (!run || typeof run !== 'object') return 'not a run summary';
  if (!KINDS[run.kind]) return 'not a time board';
  if (!num(run.seconds) || run.seconds < 1 || run.seconds > 30 * 24 * 3600) return 'seconds out of range';
  if (!num(run.clicks)) return 'clicks out of range';
  if (run.kind === 'daily' && (!MUTATOR_BY_ID[run.mutator] || (run.key && !isDateKey(run.key)))) return 'unknown daily';
  if (run.perks && typeof run.perks !== 'object') return 'perks out of range';
  for (const [id, lv] of Object.entries(run.perks || {})) if (!PERK_BY_ID[id] || !Number.isInteger(lv) || lv < 0 || lv > PERK_BY_ID[id].cost.length) return 'unknown perk ' + id;
  return '';
}
// The start the submitted run claims: a fresh run after its hops with its perks, or the daily's dish.
export function startState(run) {
  if (run.kind === 'daily') return newDailyRun({ date: run.key || '2000-01-01', seed: 0, mutator: run.mutator }).state;
  return freshRun({ asc: Math.max(0, Math.floor(run.asc || 0)), dust: 0, perks: run.perks || {}, bangs: Math.max(0, Math.floor(run.bangs || 0)) });
}
const caughtOf = events => (events && typeof events === 'object' ? Object.values(events).reduce((a, b) => a + (num(b) ? b : 0), 0) : num(events) ? events : 0);

// Returns { flagged, reason, floor, claimed, cps } (floor: the simulated time, in seconds, of the best seed).
export function checkRun(run, { seeds = SEEDS, tolerance = TOLERANCE } = {}) {
  const bad = summaryProblem(run);
  if (bad) return { flagged: true, reason: bad, floor: null, claimed: run && run.seconds };
  const s0 = startState(run), cap = clickCap(s0), cps = Math.min(cap, run.clicks / run.seconds);
  if (run.clicks > run.seconds * cap + 5) return { flagged: true, reason: 'more paid feeds than the click cap allows', floor: null, claimed: run.seconds, cps };
  const rules = run.kind === 'daily' ? rulesOf(run.mutator) : rulesOf(null);
  const caught = caughtOf(run.events), minGap = GAP_CAUGHT[0] * spawnGapMult(s0) * (rules.gapMult || Infinity);
  if (caught > run.seconds / minGap + 2) return { flagged: true, reason: 'more events caught than can turn up', floor: null, claimed: run.seconds, cps };
  let floor = Infinity;
  for (let i = 0; i < seeds; i++) {
    const r = simulate({ until: KINDS[run.kind], clicksPerSec: cps, state: startState(run), seed: 7000 + i, deck: run.kind === 'daily' ? dailyDeck(EVENTS, run.mutator) : EVENTS,
      gapMult: rules.gapMult, maxSecs: Math.max(run.seconds / (1 - tolerance) + 60, 600) });
    if (r.won) floor = Math.min(floor, r.secs);
  }
  // No seed finished in the time the claim would need: the claim is faster than the floor by more than the tolerance.
  if (!Number.isFinite(floor)) return { flagged: true, reason: 'faster than the simulated floor', floor: null, claimed: run.seconds, cps };
  const flagged = run.seconds < floor * (1 - tolerance);
  return { flagged, reason: flagged ? 'faster than the simulated floor' : '', floor, claimed: run.seconds, cps };
}
