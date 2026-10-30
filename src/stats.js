/* The stats layer: everything the game counts, persisted in the save. Pure, no DOM.
   Vocabulary: a click is any press on the scene (goop, vial or visitor), the raw number; a feed is a
   press on the goop under the click cap, which pays slop (paidClicks is kept equal to it); a capped
   click is a press on the goop past the cap, which animates but pays and counts for nothing. */
import { STAGES, SUN_STAGE } from './econ.js';

// Indexes in the stage-time arrays. Stage 7's door is the Sun, so "reached stage 7" and "ate the Sun" are
// the same moment and share index 6, which is also where the six-stage game kept its Sun times: old
// saves line up with no conversion. UNIVERSE is the moment Eat the Rest is pressed.
export const SUN = SUN_STAGE;
export const UNIVERSE = STAGES.length;

export function newStats() {
  return {
    clicks: 0, feeds: 0, paidClicks: 0, cappedClicks: 0,
    seen: {}, caught: {}, missed: {},             // events, by type id
    streak: 0, bestStreak: 0,                     // events caught in a row
    gambleWins: 0, gambleLosses: 0, hazardsTapped: 0, hazardsMissed: 0,
    playSecs: 0,                                  // time with the game open, across every run
    hops: 0, wins: 0, peakSps: 0,
    lifetimeSlop: 0,                              // every bit of slop ever earned, across hops
    feedersBought: 0, upgradesBought: 0, perksBought: 0,
    runStageAt: [0],                              // seconds of play when this run reached stage k (SUN = the win)
    bestStageAt: [],                              // fastest ever, per stage
    offlineReturns: 0, offlineSlop: 0,
    peeked: {}, exports: 0,
    // Act 2
    milestones: 0, moods: {}, universes: 0, bigBangs: 0, cutsceneSeen: 0, cutsceneReplays: 0, cutsceneSkips: 0,
    runBadges: [],                                // badge ids earned during this run, for the landing
    // Phase 3
    burps: 0, dailyDone: 0, shares: 0,            // offline burps watched, daily goops finished, share cards made
  };
}

const num = v => (Number.isFinite(v) && v >= 0 ? v : 0);
const countMap = o => {
  const m = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (typeof k === 'string' && k.length < 40 && num(v)) m[k] = num(v);
  return m;
};
// A stage time is seconds, null (not reached) or UNKNOWN: reached before this save tracked it, so the
// time is lost. UNKNOWN only ever appears in runStageAt, where it stops recordStage from writing an
// inflated time for a stage reached long ago (see seedUnknownStages).
export const UNKNOWN = -1;
const timeArr = (a, unknown) => (Array.isArray(a) ? a.slice(0, UNIVERSE + 1).map(v => (Number.isFinite(v) && v >= 0 ? v : unknown && v === UNKNOWN ? UNKNOWN : null)) : []);

// Rebuild a stats object from anything (an old save, an import). Unknown fields are dropped.
export function adoptStats(o) {
  const st = newStats();
  if (!o || typeof o !== 'object') return st;
  for (const k of Object.keys(st)) {
    if (typeof st[k] === 'number') st[k] = num(o[k]);
  }
  for (const k of ['seen', 'caught', 'missed', 'peeked', 'moods']) st[k] = countMap(o[k]);
  st.runBadges = Array.isArray(o.runBadges) ? o.runBadges.filter(id => typeof id === 'string' && id.length < 40).slice(0, 100) : [];
  st.runStageAt = timeArr(o.runStageAt, true); if (st.runStageAt[0] == null) st.runStageAt[0] = 0;
  st.bestStageAt = timeArr(o.bestStageAt);
  return st;
}

export function bump(map, id, n = 1) { map[id] = (map[id] || 0) + n; }

// A stage (or the Sun, k = SUN) reached `secs` into the run. Records it once per run and keeps the best.
export function recordStage(st, k, secs) {
  if (st.runStageAt[k] != null) return false;
  st.runStageAt[k] = secs;
  const best = st.bestStageAt[k];
  if (best == null || secs < best) { st.bestStageAt[k] = secs; return true; }
  return false;
}
// A save that reached its stage before stage times were kept (a migrated player past the Sun has times
// only up to the Sun, a v1 player none at all): mark the stages behind the goop that have no time as
// UNKNOWN, so the next stage change does not record "now" as the time it took to reach them.
export function seedUnknownStages(st, stage) {
  for (let k = 1; k <= stage; k++) if (st.runStageAt[k] == null) st.runStageAt[k] = UNKNOWN;
  return st;
}
// A run time worth showing: a real number of seconds, not null and not UNKNOWN.
export const knownTime = v => Number.isFinite(v) && v >= 0;
export function newRun(st, stage = 0) {
  st.runStageAt = []; st.runBadges = [];
  for (let k = 0; k <= stage; k++) st.runStageAt[k] = 0;
}
// One feed by hand. Only a paid feed (under the click cap) counts as a feed, so feeding past the cap
// cannot farm the feed badges; the too-fast ones are counted on their own.
export function recordFeed(st, paid) {
  if (paid) { st.feeds++; st.paidClicks++; } else st.cappedClicks++;
}
export function recordEvent(st, id, caught) {
  if (caught) { bump(st.caught, id); st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
  else { bump(st.missed, id); st.streak = 0; }
}
export function totalCaught(st) { return Object.values(st.caught).reduce((a, b) => a + b, 0); }
