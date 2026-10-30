/* The daily goop: one seeded run a day, the same for everyone, with one mutator that bends the rules.
   Pure, no DOM. The seed comes from the UTC date (or, later, from the Worker's GET /daily, which serves
   the same rule); the mutator is picked from the seed. The run is a race to the Sun (end of Act 1) from
   a fresh petri dish: no perks, no hops. It lives in its own save slot (DAILY_KEY), apart from the main
   run, and its best times live in the scores adapter as 'daily:YYYY-MM-DD'. */
import { rng } from './rng.js';
import { SUN_AT, newState } from './econ.js';
import { adoptState } from './save.js';
import { adoptStats, newStats } from './stats.js';

export const DAILY_KEY = 'feed-the-goop-daily';
export const DAILY_GOAL = SUN_AT;            // the finish line: eat the Sun
export const HANDS_IDLE = 3;                 // Hands On: feeders stop this many seconds after your last feed

// Each mutator is data the game and the simulator both read:
//   costMult   feeder prices x this          gapMult  seconds between events x this (0: no events)
//   offline    away pay x this               handsOn  feeders only work while you keep feeding
//   deck(evs)  which events can turn up, and how often
export const MUTATORS = [
  { id: 'pricey',    name: 'Feeders Cost Double', blurb: 'Every feeder costs twice as much. Upgrades are their usual price.', costMult: 2 },
  { id: 'hands',     name: 'Hands On',            blurb: 'Feeders only work while you keep feeding. Stop for ' + HANDS_IDLE + ' seconds and they down tools.', handsOn: true },
  { id: 'quiet',     name: 'Quiet Lab',           blurb: 'No vials, no visitors. Just you and the goop.', gapMult: 0 },
  { id: 'busy',      name: 'Rush Hour',           blurb: 'Events turn up twice as often.', gapMult: 0.5 },
  { id: 'inspector', name: 'Inspector Hour',      blurb: 'Every other event is the lab inspector, from the very first one.',
    deck: evs => { const others = evs.filter(e => e.id !== 'inspector'); const sum = k => others.reduce((n, e) => n + (e.w[Math.min(k, e.w.length - 1)] || 0), 0);
      return [...others, { ...evs.find(e => e.id === 'inspector'), w: [0, 1, 2, 3, 4, 5].map(sum) }]; } },
  { id: 'sleepy',    name: 'Light Sleeper',       blurb: 'The goop eats half as much while you are away.', offline: 0.5 },
  { id: 'lucky',     name: 'Gambler\'s Night',    blurb: 'Only gambles and choices turn up. Pick well.', deck: evs => evs.filter(e => e.bucket === 'gamble' || e.bucket === 'choice') },
];
export const MUTATOR_BY_ID = Object.fromEntries(MUTATORS.map(m => [m.id, m]));
const DEFAULTS = { costMult: 1, gapMult: 1, offline: 1, handsOn: false, deck: evs => evs };
export function rulesOf(id) { return { ...DEFAULTS, ...(MUTATOR_BY_ID[id] || {}) }; }

// 'YYYY-MM-DD' for a moment, in UTC: everyone on Earth shares a daily goop, and it turns over at 00:00 UTC.
export function dateKey(ms = Date.now()) { return new Date(ms).toISOString().slice(0, 10); }
export const isDateKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(Date.parse(k + 'T00:00:00Z'));
// The Monday (UTC) that starts the week a moment falls in, as a date key: the weekly board resets then.
export function weekKey(ms = Date.now()) {
  const d = new Date(ms), back = (d.getUTCDay() + 6) % 7;
  return dateKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back));
}
// FNV-1a over the date: a 32-bit seed. The Worker uses this same function, so /daily and the fallback agree.
export function seedOf(key) {
  let h = 0x811c9dc5;
  const s = 'goop:' + key;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function pickMutator(seed) { return MUTATORS[Math.floor(rng(seed)() * MUTATORS.length)]; }
// Today's daily by the local rule: what the game uses offline, and what GET /daily serves.
export function localDaily(ms = Date.now()) {
  const date = dateKey(ms), seed = seedOf(date);
  return { date, seed, mutator: pickMutator(seed).id, source: 'local' };
}
// A /daily response, checked. Anything odd (or a different day than the device thinks it is, beyond the
// date line) falls back to the local rule, so the daily always works offline.
export function dailyFrom(remote, ms = Date.now()) {
  const local = localDaily(ms);
  if (!remote || typeof remote !== 'object' || !isDateKey(remote.date) || !MUTATOR_BY_ID[remote.mutator] || !Number.isInteger(remote.seed) || remote.seed < 0) return local;
  if (Math.abs(Date.parse(remote.date) - Date.parse(local.date)) > 864e5) return local;
  return { date: remote.date, seed: remote.seed >>> 0, mutator: remote.mutator, source: 'cloud' };
}

// The event deck under a mutator.
export function dailyDeck(events, id) { return rulesOf(id).deck(events); }

// A fresh daily run: a new petri dish with the mutator's prices, and its own stats.
export function newDailyRun(daily) {
  const state = newState();
  state.costMult = rulesOf(daily.mutator).costMult;
  return { v: 1, date: daily.date, seed: daily.seed, mutator: daily.mutator, state, stats: newStats(), at: 0, done: null, tries: 1 };
}
// The daily slot, from storage: today's run if there is one, else a fresh one. A slot for another day is
// replaced (its best time is already in the scores adapter).
export function readDaily(raw, daily) {
  if (!raw || typeof raw !== 'object' || raw.date !== daily.date || !MUTATOR_BY_ID[raw.mutator]) return newDailyRun(daily);
  const run = newDailyRun(daily);
  run.state = adoptState(raw.state); run.state.costMult = rulesOf(daily.mutator).costMult;   // the mutator owns the prices
  run.state.asc = 0; run.state.dust = 0; run.state.perks = {}; run.state.bangs = 0;          // no perks or hops in a daily
  run.stats = adoptStats(raw.stats);
  run.at = Number.isFinite(raw.at) ? raw.at : 0;
  run.done = Number.isFinite(raw.done) && raw.done >= 0 ? raw.done : null;
  run.tries = Math.max(1, Math.floor(+raw.tries || 1));
  return run;
}
export function loadDaily(storage, daily) {
  let raw = null;
  try { raw = JSON.parse(storage.get(DAILY_KEY) || 'null'); } catch (e) { raw = null; }
  return readDaily(raw, daily);
}
export function writeDaily(storage, run) { return storage.set(DAILY_KEY, JSON.stringify({ ...run, v: 1 })); }
// Start today's daily over (a new try): the best time stays in the scores adapter.
export function retryDaily(run) { const r = newDailyRun(run); r.tries = run.tries + 1; return r; }
// Has the run eaten the Sun? Then `secs` (play seconds) is its time.
export function dailyFinished(state) { return state.life >= DAILY_GOAL; }
