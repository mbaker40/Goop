/* Headless balance simulation: a greedy buyer plays the real economy, event deck and milestones, one
   second at a time, until the Sun is eaten (or any other target, up to the end of the universe). Pure;
   used by `npm run sim` and by the tests. */
import { FEEDERS, UPGRADES, END, SUN_AT, STAGES, newState, feederCost, feederRate, baseRate, slopPerSec, feedValue, earn, feederOpen, upgradeOpen } from './econ.js';
import { EVENTS, FIRST_EVENT, EVENTS_FROM_LIFE, pickEvent, nextGap, applyEffect, isHazard, isChoice, effectEV } from './events.js';
import { PERKS, freshRun, clickCap, spawnGapMult, milestoneMult } from './prestige.js';
import { passMilestones } from './milestones.js';
import { rng } from './rng.js';

function clickWorth(s, cps) { return cps > 0 ? Math.min(cps, clickCap(s)) * feedValue(s) : 0; }
function incomeOf(s, cps) { return baseRate(s) + clickWorth(s, cps); }

// The minimum-payback item (cost divided by the income it adds), whether or not it is affordable yet.
function bestBuy(s, cps) {
  const now = incomeOf(s, cps);
  let best = null;
  FEEDERS.forEach((f, i) => {
    if (!feederOpen(s, i)) return;
    const c = feederCost(s, i), d = feederRate(s, i);
    if (d > 0 && (!best || c / d < best.pay)) best = { pay: c / d, cost: c, buy: () => { s.own[i]++; } };
  });
  for (const u of UPGRADES) {
    if (!upgradeOpen(s, u)) continue;
    s.ups[u.id] = true; const d = incomeOf(s, cps) - now; delete s.ups[u.id];
    if (d > 0 && (!best || u.cost / d < best.pay)) best = { pay: u.cost / d, cost: u.cost, buy: () => { s.ups[u.id] = true; } };
  }
  return best;
}

// opts: deck (null for no events), clicksPerSec, seed, maxSecs, reaction (seconds before an event is
// collected), until (lifetime slop that ends the run: the Sun by default, END.at for the universe),
// milestones (false to leave their bonus out), state (a starting state, e.g. from maxedRun()),
// gapMult (seconds between events x this, as the daily goop's mutators do; 0 means no events).
// Returns { secs, won, baseSlop, eventSlop, clickSlop, events, stageAt } where stageAt[k] is the second
// stage k was reached (null if never) and won means `until` was reached.
export function simulate(opts = {}) {
  const deck = opts.deck === undefined ? EVENTS : opts.deck, cps = opts.clicksPerSec || 0;
  const rand = rng(opts.seed == null ? 1 : opts.seed), maxSecs = opts.maxSecs || 6 * 3600, reaction = opts.reaction == null ? 1 : opts.reaction;
  const until = opts.until || SUN_AT, miles = opts.milestones !== false, gm = opts.gapMult == null ? 1 : opts.gapMult;
  const s = opts.state || newState();
  let gap = gm === 0 ? Infinity : FIRST_EVENT * gm, pending = null, t = 0;
  const r = { secs: 0, won: false, baseSlop: 0, eventSlop: 0, clickSlop: 0, events: 0, byType: {}, stageAt: STAGES.map((_, k) => (k <= s.stage ? 0 : null)), mileSlop: 0 };
  let boostSrc = null;
  const tally = (id, secs) => { const b = r.byType[id] || (r.byType[id] = { n: 0, secs: 0 }); b.secs += secs; return b; };
  while (t < maxSecs && s.life < until) {
    for (let b = bestBuy(s, cps); b && s.slop >= b.cost; b = bestBuy(s, cps)) { s.slop -= b.cost; b.buy(); }
    const base = baseRate(s), inc = slopPerSec(s);
    r.baseSlop += base; r.eventSlop += inc - base;
    if (base > 0 && inc !== base && boostSrc) tally(boostSrc, (inc - base) / base);
    const cv = clickWorth(s, cps); r.clickSlop += cv;
    earn(s, inc + cv);
    if (miles) for (const { bonus } of passMilestones(s, milestoneMult(s))) { earn(s, bonus); r.mileSlop += bonus; }
    for (let k = 1; k <= s.stage; k++) if (r.stageAt[k] == null) r.stageAt[k] = t + 1;
    if (s.frenzy > 0) s.frenzy = Math.max(0, s.frenzy - 1);
    if (s.freeze > 0) s.freeze = Math.max(0, s.freeze - 1);
    if (deck && s.life >= EVENTS_FROM_LIFE) {
      if (pending) {
        if (++pending.age >= reaction) {
          const ev = pending.ev;
          const effect = isHazard(ev) ? ev.tap : isChoice(ev) ? ev.options.reduce((a, o) => effectEV(o.effect) > effectEV(a.effect) ? o : a).effect : ev.effect;
          const before = baseRate(s), res = applyEffect(s, effect, rand);
          earn(s, res.gain); r.eventSlop += res.gain - res.lost; r.events++;
          tally(ev.id, before > 0 ? (res.gain - res.lost) / before : 0).n++;
          if (res.type === 'boost') boostSrc = ev.id;
          pending = null; gap = gm === 0 ? Infinity : nextGap(true, rand, spawnGapMult(s) * gm);
        }
      } else if ((gap -= 1) <= 0) pending = { ev: pickEvent(deck, s.stage, rand), age: 0 };
    }
    t += 1;
  }
  r.secs = t; r.won = s.life >= until; r.state = s;
  return r;
}

// The starting state of a run with every perk maxed after `hops` hops, `bangs` of them Big Bangs (Head
// Start, the pantry, and the rest all applied by freshRun, exactly as in the game). act: 1 maxes only the
// Act 1 tree (the table before the Act 2 perks existed); 2 maxes everything.
export const MAXED = { hops: 5, bangs: 3 };
export function maxedRun(hops = MAXED.hops, act = 2, bangs = MAXED.bangs) {
  const perks = Object.fromEntries(PERKS.filter(p => p.act <= act).map(p => [p.id, p.cost.length]));
  return freshRun({ asc: hops, dust: 0, perks, bangs: act >= 2 ? bangs : 0 });
}

// Seconds to reach each stage and the end of the universe, averaged over seeds. Stages a run never
// reaches within maxSecs come back as null (as does `end`).
export function stageTimes(opts = {}, seeds = 4) {
  // stages reached by some seeds but not all within maxSecs also come back null
  const sum = STAGES.map(() => 0), hit = STAGES.map(() => 0);
  let end = 0, ended = 0;
  for (let i = 0; i < seeds; i++) {
    const r = simulate({ until: END.at, ...opts, state: opts.makeState ? opts.makeState() : undefined, seed: 2000 + i });
    r.stageAt.forEach((v, k) => { if (v != null) { sum[k] += v; hit[k]++; } });
    if (r.won) { end += r.secs; ended++; }
  }
  return { stageAt: sum.map((v, k) => (hit[k] === seeds ? v / seeds : null)), end: ended === seeds ? end / seeds : null };
}

// Averages over several seeds. Returns { minutes, boost } where boost is event slop over feeder slop.
export function compare(opts = {}, seeds = 12) {
  let secs = 0, ev = 0, base = 0;
  const byType = {};
  for (let i = 0; i < seeds; i++) {
    const r = simulate({ ...opts, seed: 1000 + i }); secs += r.secs; ev += r.eventSlop; base += r.baseSlop;
    for (const [id, b] of Object.entries(r.byType)) { const t = byType[id] || (byType[id] = { n: 0, secs: 0 }); t.n += b.n; t.secs += b.secs; }
  }
  let n = 0, evSecs = 0;
  for (const b of Object.values(byType)) { n += b.n; evSecs += b.secs; }
  // perEvent: realised value of one event, in seconds of the feeder income at that moment.
  // boost: the time-averaged extra income from always collecting (perEvent x events / run length),
  // the same measure as the +170% the old vial was worth. slopShare: event slop / feeder slop, which
  // is dominated by the last few minutes of a run and so much noisier.
  return { minutes: secs / seeds / 60, perEvent: n ? evSecs / n : 0, boost: secs ? evSecs / secs : 0, slopShare: base ? ev / base : 0, byType };
}
export { END };

// The pacing table for stages 7 to 20 and the end, all clicking once a second: a first run with no perks;
// a run with the Act 1 perk tree maxed after five hops (the table before the Act 2 perks existed); and a
// run with every perk maxed, Act 2 included, after five hops of which three were Big Bangs. Times are
// seconds (null: not reached in maxSecs).
export const FIRST_RUN_HOURS = 36;
export function pacingTable(seeds = 3, { first = true } = {}) {
  const none = first ? stageTimes({ clicksPerSec: 1, maxSecs: FIRST_RUN_HOURS * 3600 }, seeds) : { stageAt: STAGES.map(() => null), end: null };
  const act1 = stageTimes({ clicksPerSec: 1, maxSecs: 12 * 3600, makeState: () => maxedRun(MAXED.hops, 1) }, seeds);
  const all = stageTimes({ clicksPerSec: 1, maxSecs: 12 * 3600, makeState: () => maxedRun(MAXED.hops, 2) }, seeds);
  const rows = STAGES.map((st, k) => ({ k, name: st.name, at: st.at, first: none.stageAt[k], act1: act1.stageAt[k], maxed: all.stageAt[k] }));
  rows.push({ k: STAGES.length, name: 'End (Eat the Rest)', at: END.at, first: none.end, act1: act1.end, maxed: all.end });
  return rows;
}
export const hm = s => { if (s == null) return 'not reached'; if (s < 3600) return (s / 60).toFixed(1) + ' min'; const m = Math.round(s / 60); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
export function formatPacing(rows, from = 6) {
  const out = [`| # | Stage | Enters at (slop) | First run, no perks | Act 1 perks maxed, ${MAXED.hops} hops (before) | All perks maxed, ${MAXED.hops} hops, ${MAXED.bangs} Big Bangs (after) |`, '|---|---|---|---|---|---|'];
  for (const r of rows.slice(from)) out.push(`| ${r.k < STAGES.length ? r.k + 1 : 'End'} | ${r.name} | ${r.at.toExponential(0).replace('+', '')} | ${hm(r.first)} | ${hm(r.act1)} | ${hm(r.maxed)} |`);
  return out.join('\n');
}
