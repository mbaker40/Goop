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
    // Phase 4
    bestStageFrom: [],                            // the stage the run that set each best started in (>0: a Head Start)
    gambleStreak: 0, bestGambleStreak: 0,         // gambles won in a row
    lastSecond: 0,                                // events caught with under a second left
    runHazards: 0, runHazardsMissed: 0,           // visitors this run, and how many got their way
    flags: {},                                    // one-off things the niche badges look for (see achievements.js)
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
// SKIPPED: a stage this run never had to reach, because a Head Start began past it. Also only in runStageAt,
// and also never a time: the notebook says "skipped".
export const SKIPPED = -2;
const timeArr = (a, run) => (Array.isArray(a) ? a.slice(0, UNIVERSE + 1).map(v => (Number.isFinite(v) && v >= 0 ? v : run && (v === UNKNOWN || v === SKIPPED) ? v : null)) : []);

// Rebuild a stats object from anything (an old save, an import). Unknown fields are dropped.
export function adoptStats(o) {
  const st = newStats();
  if (!o || typeof o !== 'object') return st;
  for (const k of Object.keys(st)) {
    if (typeof st[k] === 'number') st[k] = num(o[k]);
  }
  for (const k of ['seen', 'caught', 'missed', 'peeked', 'moods', 'flags']) st[k] = countMap(o[k]);
  st.runBadges = Array.isArray(o.runBadges) ? o.runBadges.filter(id => typeof id === 'string' && id.length < 40).slice(0, 100) : [];
  st.runStageAt = timeArr(o.runStageAt, true); if (st.runStageAt[0] == null) st.runStageAt[0] = 0;
  st.bestStageAt = timeArr(o.bestStageAt);
  st.bestStageFrom = Array.isArray(o.bestStageFrom) ? o.bestStageFrom.slice(0, UNIVERSE + 1).map(v => (Number.isInteger(v) && v >= 0 && v < UNIVERSE ? v : 0)) : [];
  return st;
}

export function bump(map, id, n = 1) { map[id] = (map[id] || 0) + n; }

// A stage (or the Sun, k = SUN) reached `secs` into the run. Records it once per run and keeps the best.
// from: the stage the run started in; a best set by a Head Start run says so in the notebook. A stage the
// run skipped (SKIPPED) or reached before times were kept (UNKNOWN) never records anything.
export function recordStage(st, k, secs, from = 0) {
  if (st.runStageAt[k] != null) return false;
  st.runStageAt[k] = secs;
  const best = st.bestStageAt[k];
  if (best == null || secs < best) { st.bestStageAt[k] = secs; st.bestStageFrom[k] = from | 0; return true; }
  return false;
}
// What the notebook shows for stage k: { best, from, run } where run is 'skipped', a time, or null.
export function stageRow(st, k) {
  const r = st.runStageAt[k];
  return { best: knownTime(st.bestStageAt[k]) ? st.bestStageAt[k] : null, from: st.bestStageFrom[k] | 0, run: r === SKIPPED ? 'skipped' : knownTime(r) ? r : null };
}
// A save that reached its stage before stage times were kept (a migrated player past the Sun has times
// only up to the Sun, a v1 player none at all): mark the stages behind the goop that have no time as
// UNKNOWN, so the next stage change does not record "now" as the time it took to reach them.
export function seedUnknownStages(st, stage) {
  for (let k = 1; k <= stage; k++) if (st.runStageAt[k] == null) st.runStageAt[k] = UNKNOWN;
  return st;
}
// A run that began past stage 1 (a Head Start): its stages behind the start were skipped. Older saves wrote
// 0 seconds for them; this marks them SKIPPED, so the notebook says so.
export function markSkipped(st, startStage) {
  for (let k = 1; k <= Math.min(startStage | 0, UNIVERSE); k++) if (st.runStageAt[k] == null || st.runStageAt[k] === 0) st.runStageAt[k] = SKIPPED;
  return st;
}
// A run time worth showing: a real number of seconds, not null and not UNKNOWN.
export const knownTime = v => Number.isFinite(v) && v >= 0;
// A new run starting in `stage`: the stages a Head Start jumped over are SKIPPED, never 0 seconds.
export function newRun(st, stage = 0) {
  st.runStageAt = [0]; st.runBadges = []; st.runHazards = 0; st.runHazardsMissed = 0;
  for (let k = 1; k <= stage; k++) st.runStageAt[k] = SKIPPED;
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
// A gamble's result (true won, false lost): the win streak the Hot Streak badge reads.
export function recordGamble(st, won) {
  if (won) { st.gambleWins++; st.gambleStreak++; st.bestGambleStreak = Math.max(st.bestGambleStreak, st.gambleStreak); }
  else { st.gambleLosses++; st.gambleStreak = 0; }
}
// A visitor this run: shooed (true) or not. A whole run with three or more and none missed earns a flag at the hop.
export function recordVisitor(st, shooed) { st.runHazards++; if (shooed) st.hazardsTapped++; else { st.runHazardsMissed++; st.hazardsMissed++; } }
export function cleanRun(st) { return st.runHazards >= 3 && st.runHazardsMissed === 0; }
export function flag(st, id) { st.flags[id] = (st.flags[id] || 0) + 1; }
export function totalCaught(st) { return Object.values(st.caught).reduce((a, b) => a + b, 0); }

// What a finished run claims, for a leaderboard's plausibility check (worker/src/plausible.js reads it):
// its time, paid feeds and caught events this run, and the start it had (hops, perks, Big Bangs; or the
// daily's mutator). The local boards ignore it; the cloud provider sends it with a new best.
export function runClaim(s, mutator) {
  const out = { seconds: s.played, clicks: s.feeds | 0, events: s.caught | 0, asc: s.asc | 0, hopBonus: Number.isFinite(s.hopBonus) ? s.hopBonus : 0, perks: { ...(s.perks || {}) }, bangs: s.bangs | 0 };
  if (mutator) { out.mutator = mutator; out.asc = 0; out.hopBonus = 0; out.perks = {}; out.bangs = 0; }
  return out;
}
