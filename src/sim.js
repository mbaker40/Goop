/* Headless balance simulation: a greedy buyer plays the real economy and event deck, one second at a
   time, until the Sun is eaten. Pure; used by `npm run sim` and by the tests. */
import { FEEDERS, UPGRADES, END, CLICK_CAP, newState, feederCost, feederRate, baseRate, slopPerSec, feedValue, earn, feederOpen, upgradeOpen } from './econ.js';
import { EVENTS, FIRST_EVENT, EVENTS_FROM_LIFE, pickEvent, nextGap, applyEffect, isHazard, isChoice, effectEV } from './events.js';
import { rng } from './rng.js';

function clickWorth(s, cps) { return cps > 0 ? Math.min(cps, CLICK_CAP) * feedValue(s) : 0; }
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
// collected). Returns { secs, won, baseSlop, eventSlop, clickSlop, events }.
export function simulate(opts = {}) {
  const deck = opts.deck === undefined ? EVENTS : opts.deck, cps = opts.clicksPerSec || 0;
  const rand = rng(opts.seed == null ? 1 : opts.seed), maxSecs = opts.maxSecs || 6 * 3600, reaction = opts.reaction == null ? 1 : opts.reaction;
  const s = opts.state || newState();
  let gap = FIRST_EVENT, pending = null, t = 0;
  const r = { secs: 0, won: false, baseSlop: 0, eventSlop: 0, clickSlop: 0, events: 0, byType: {} };
  let boostSrc = null;
  const tally = (id, secs) => { const b = r.byType[id] || (r.byType[id] = { n: 0, secs: 0 }); b.secs += secs; return b; };
  while (t < maxSecs && !s.won) {
    for (let b = bestBuy(s, cps); b && s.slop >= b.cost; b = bestBuy(s, cps)) { s.slop -= b.cost; b.buy(); }
    const base = baseRate(s), inc = slopPerSec(s);
    r.baseSlop += base; r.eventSlop += inc - base;
    if (base > 0 && inc !== base && boostSrc) tally(boostSrc, (inc - base) / base);
    const cv = clickWorth(s, cps); r.clickSlop += cv;
    earn(s, inc + cv);
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
          pending = null; gap = nextGap(true, rand);
        }
      } else if ((gap -= 1) <= 0) pending = { ev: pickEvent(deck, s.stage, rand), age: 0 };
    }
    t += 1;
  }
  r.secs = t; r.won = s.won; r.state = s;
  return r;
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
