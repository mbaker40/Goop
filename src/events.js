/* The event deck. Replaces the old 50/50 mutagen vial with weighted, data-driven event types in four
   buckets: boosts, gambles, choices and hazards. Pure, no DOM: the game, the tests and the balance
   simulator all use these same definitions. Randomness is always passed in.

   Every number here was tuned so that always collecting events is worth about what it was before
   (see deckEV below and `npm run sim`): the vial is the game's pace, not a bonus. */
import { baseRate, feederRate, FEEDERS, FRENZY_MULT, FRENZY_SECS, GEYSER_SECS, SUN_STAGE } from './econ.js';
import { gambleOdds } from './prestige.js';
import { fmt } from './fmt.js';

// Timing, in seconds. Same as the old vial: first one after 38 s, then 42 to 72 s after a catch,
// 30 to 60 s after one gets away, and a vial dangles for 13 s.
export const FIRST_EVENT = 38, GAP_CAUGHT = [42, 72], GAP_MISSED = [30, 60], VIAL_LIFE = 13;
export const EVENTS_FROM_LIFE = 30;   // no events until the goop has eaten this much

const boost = (mult, secs, msg) => ({ type: 'boost', mult, secs, msg });
const geyser = (secs, msg) => ({ type: 'geyser', secs, msg });

// w: weight per stage (index = stage; the last entry covers every later stage). look: how it is drawn.
// w3: the phase 3 weights, for the events that existed then (PHASE3_DECK below rebuilds that deck, so the
// tests and the simulator can hold the new deck to it). late: only turns up from stage 7 (the Sun) on.
// Phase 4 doubled the deck to eighteen kinds and re-tuned every weight so that always collecting is
// worth within 25% of what it was at every stage (deckEV, `npm run sim`).
const L = SUN_STAGE;                  // index of stage 7: where the late-game events start
const late = (n, before = 0) => [...Array(L).fill(before), n];
export const EVENTS = [
  { id: 'frenzy', bucket: 'boost', name: 'Frenzy Vial', look: 'frenzy', label: 'Frenzy vial!',
    w: [28, 22, 20, 20, 20, 20, 15], w3: [30, 24, 22, 22, 22, 22], effect: boost(FRENZY_MULT, FRENZY_SECS, 'Mutagen! Feeders work {mult} times faster for {secs} seconds.') },
  { id: 'geyser', bucket: 'boost', name: 'Geyser Vial', look: 'geyser', label: 'Geyser vial!',
    w: [26, 18, 13, 13, 13, 13, 6], w3: [30, 22, 16, 16, 16, 16], effect: geyser(GEYSER_SECS, 'Slop geyser! +{n} slop.') },
  { id: 'drip', bucket: 'boost', name: 'Slow Drip', look: 'drip', label: 'Slow drip',
    w: [10, 9, 8, 8, 8, 8, 5], w3: [10, 10, 10, 10, 10, 10], effect: boost(2, 90, 'Slow drip. Feeders work twice as hard for {secs} seconds.') },
  { id: 'lunch', bucket: 'boost', name: 'Lunch Bell', look: 'bell', label: 'Lunch bell!',
    w: [8, 8, 8, 8, 8, 8, 5], effect: boost(3, 45, 'Ding ding! Lunch is served. Feeders work {mult} times harder for {secs} seconds.') },
  // The two gambles that can spill the bank say so on the label and in the screen-reader announcement
  // (riskNote below), not just with a question mark.
  { id: 'bubbling', bucket: 'gamble', name: 'Bubbling Vial', look: 'bubbling', label: 'Bubbling vial? Might spill',
    w: [0, 8, 8, 8, 8, 8, 7], w3: [0, 8, 9, 9, 9, 9],
    effect: { type: 'gamble', p: 0.5, win: boost(12, 20, 'It held! Feeders work {mult} times faster for {secs} seconds.'),
              lose: { type: 'spill', frac: 0.5, msg: 'It boiled over. {n} slop is on the floor.' } } },
  { id: 'mystery', bucket: 'gamble', name: 'Unlabelled Flask', look: 'mystery', label: 'Unlabelled flask?',
    w: [0, 8, 9, 9, 9, 9, 8], w3: [0, 8, 10, 10, 10, 10],
    effect: { type: 'gamble', p: 0.5, win: geyser(200, 'It was mutagen. Lots of it. +{n} slop.'),
              lose: { type: 'nothing', msg: 'It was cold tea. The goop is disappointed in you.' } } },
  { id: 'twin', bucket: 'choice', name: 'Twin Vials', label: 'Pick one!',
    w: [10, 9, 9, 9, 9, 9, 7], w3: [10, 10, 10, 10, 10, 10],
    options: [{ look: 'frenzy', label: 'Frenzy', effect: boost(FRENZY_MULT, FRENZY_SECS, 'Mutagen! Feeders work {mult} times faster for {secs} seconds.') },
              { look: 'geyser', label: 'Big geyser', effect: geyser(110, 'Big geyser! +{n} slop. The other vial evaporates in a huff.') }] },
  { id: 'fork', bucket: 'choice', name: 'Safe or Spicy', label: 'Pick one!',
    w: [0, 6, 7, 7, 7, 7, 6], w3: [0, 6, 8, 8, 8, 8],
    options: [{ look: 'drip', label: 'Safe', effect: boost(2, 90, 'The sensible choice. Feeders work twice as hard for {secs} seconds.') },
              { look: 'bubbling', label: 'Spicy, might spill', effect: { type: 'gamble', p: 0.5, win: boost(12, 20, 'Spicy paid off! Feeders x{mult} for {secs} seconds.'),
                                                            lose: { type: 'spill', frac: 0.5, msg: 'Too spicy. {n} slop boiled away.' } } }] },
  { id: 'inspector', bucket: 'hazard', name: 'Lab Inspector', look: 'inspector', label: 'Inspector! Tap or press E',
    w: [0, 6, 7, 7, 7, 7, 4], w3: [0, 6, 8, 8, 8, 8], window: 4,
    tap: geyser(30, 'Inspector shooed. He left his lunch money: +{n} slop.'),
    miss: { type: 'freeze', secs: 10, msg: 'Inspection! Feeders frozen for {secs} seconds while he fills in a form.' } },
  { id: 'rival', bucket: 'hazard', name: 'Rival Scientist', look: 'rival', label: 'Thief! Tap or press E',
    w: [0, 0, 5, 5, 5, 5, 3], w3: [0, 0, 6, 6, 6, 6], window: 4,
    tap: geyser(30, 'Not today, Gary. He dropped {n} slop running off.'),
    miss: { type: 'steal', frac: 0.15, msg: 'The rival scientist made off with {n} slop.' } },
  { id: 'pigeon', bucket: 'hazard', name: 'Lab Pigeon', look: 'pigeon', label: 'Pigeon! Tap or press E',
    w: [0, 4, 4, 4, 4, 4, 2], window: 4,
    tap: geyser(30, 'Shoo! The pigeon flaps off and leaves a feather worth {n} slop. Somehow.'),
    miss: { type: 'steal', frac: 0.08, msg: 'The pigeon pecked up {n} slop and flew off with it.' } },
  // Late game: from stage 7, the Sun's door, on.
  { id: 'comet', bucket: 'boost', name: 'Comet Shower', look: 'comet', label: 'Comet shower!', late: true,
    w: late(10), effect: { type: 'shower', n: 6, secs: 16, msg: 'Six little comets, six little geysers: +{n} slop.' } },
  { id: 'blackhole', bucket: 'boost', name: 'Black-Hole Hiccup', look: 'blackhole', label: 'Black hole hiccup!', late: true,
    w: late(6), effect: { type: 'refund', lo: 60, hi: 180, msg: 'Hic! The black hole coughs up what you last paid: +{n} slop back.' } },
  { id: 'wormhole', bucket: 'boost', name: 'Wormhole', look: 'wormhole', label: 'Wormhole!', late: true,
    w: late(6), effect: { type: 'swap', secs: 30, lo: 2, hi: 4, msg: 'The wormhole swapped your two best feeders round. Everything works {mult} times harder for {secs} seconds.' } },
  { id: 'darkvial', bucket: 'gamble', name: 'Dark-Matter Vial', look: 'darkvial', label: 'Dark-matter vial? Contents unknown', late: true,
    w: late(9), effect: { type: 'lottery', outcomes: [
      { w: 3, effect: geyser(40, 'It was a little dark matter: +{n} slop.') },
      { w: 3, effect: boost(FRENZY_MULT, FRENZY_SECS, 'It was mutagen, the dark kind. Feeders x{mult} for {secs} seconds.') },
      { w: 2, effect: geyser(200, 'It was a LOT of dark matter: +{n} slop.') },
      { w: 2, effect: { type: 'nothing', msg: 'It was empty. Or it was full of nothing. Hard to say.' } }] } },
  { id: 'rivalgoop', bucket: 'gamble', name: 'Rival Goop', look: 'rivalgoop', label: 'A rival goop! Click-off?', late: true,
    w: late(6), effect: { type: 'duel', secs: 15, need: 30, msg: 'Click-off! Feed the goop {need} times in {secs} seconds to win.',
      win: boost(8, 15, 'You won the click-off! Feeders work {mult} times harder for {secs} seconds.'),
      lose: { type: 'nothing', msg: 'The rival goop wins the click-off and slinks off, smug.' } } },
  { id: 'nova', bucket: 'choice', name: 'Supernova or Slow Burn', label: 'Pick one!', late: true,
    w: late(6),
    options: [{ look: 'nova', label: 'Supernova', effect: geyser(100, 'Supernova! +{n} slop, all at once.') },
              { look: 'ember', label: 'Slow burn', effect: boost(3, 60, 'A slow burn. Feeders work {mult} times harder for {secs} seconds.') }] },
  { id: 'taxman', bucket: 'hazard', name: 'Cosmic Tax Collector', look: 'taxman', label: 'Taxman! Tap or press E', late: true,
    w: late(3), window: 4,
    tap: geyser(30, 'The cosmic tax collector is shooed. He dropped a rebate: +{n} slop.'),
    miss: { type: 'steal', frac: 0.12, msg: 'The cosmic tax collector took {n} slop. It is for the roads.' } },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
export const LATE_EVENTS = EVENTS.filter(e => e.late).map(e => e.id);
// The phase 3 deck (nine kinds, its own weights), for the tests and the simulator to compare against.
export const PHASE3_DECK = EVENTS.filter(e => e.w3).map(e => ({ ...e, w: e.w3 }));

// The deck the game shipped with, kept so the tests and the simulator can compare against it.
export const LEGACY_DECK = [
  { id: 'mutagen', bucket: 'gamble', name: 'Mutagen Vial', look: 'frenzy', label: 'Mutagen vial!', w: [1],
    effect: { type: 'gamble', p: 0.5, fixedOdds: true, win: boost(FRENZY_MULT, FRENZY_SECS), lose: geyser(GEYSER_SECS) } },
];

export function weightAt(ev, stage) { return ev.w[Math.min(stage, ev.w.length - 1)] || 0; }
export function pickEvent(deck, stage, rand) {
  let total = 0;
  for (const e of deck) total += weightAt(e, stage);
  let r = rand() * total;
  for (const e of deck) { r -= weightAt(e, stage); if (r < 0 && weightAt(e, stage) > 0) return e; }
  return deck.find(e => weightAt(e, stage) > 0) || deck[0];
}
// Event Pity (prestige.pityDue): when owed, the next event comes from the boosts only.
export function pickWithPity(deck, stage, rand, pity) {
  if (!pity) return pickEvent(deck, stage, rand);
  const boosts = deck.filter(e => e.bucket === 'boost' && weightAt(e, stage) > 0);
  return boosts.length ? pickEvent(boosts, stage, rand) : pickEvent(deck, stage, rand);
}
export function nextGap(caught, rand, mult = 1) {
  const [lo, hi] = caught ? GAP_CAUGHT : GAP_MISSED;
  return (lo + rand() * (hi - lo)) * mult;
}
export function isHazard(ev) { return ev.bucket === 'hazard'; }

// The share of the bank an effect can take if it goes wrong (0 if it cannot): a spill inside a gamble.
export function spillRisk(effect) {
  if (!effect) return 0;
  if (effect.type === 'spill' || effect.type === 'steal') return effect.frac;
  if (effect.type === 'gamble') return Math.max(spillRisk(effect.win), spillRisk(effect.lose));
  return 0;
}
// The warning a screen reader hears when a risky event appears, or '' when nothing on offer can spill.
// Hazards are left out: their risk is in not tapping them, and their label already says what to do.
export function riskNote(ev) {
  if (isHazard(ev)) return '';
  const opts = ev.options ? ev.options.map((o, i) => [o, i]) : [[ev, 0]];
  const risky = opts.filter(([o]) => spillRisk(o.effect) > 0);
  if (!risky.length) return '';
  const pct = Math.round(Math.max(...risky.map(([o]) => spillRisk(o.effect))) * 100);
  if (ev.options) return 'Careful: ' + risky.map(([o, i]) => 'vial ' + (i + 1) + ', ' + o.label.split(',')[0]).join(' and ') + ', can spill ' + pct + '% of your slop.';
  return 'Careful: it can spill ' + pct + '% of your slop.';
}

// Hit radius for an event target, in scene units: the drawn size, but never less than a 44 CSS pixel
// tap target (22 px radius) at the canvas's current size. cssPerUnit: CSS pixels per scene unit.
export const MIN_TAP_PX = 44;
export function hitRadius(base, cssPerUnit) {
  if (!(cssPerUnit > 0)) return base;
  return Math.max(base, MIN_TAP_PX / 2 / cssPerUnit + 4);
}

// Which target a key grabs, or -1. E (and G) grab the first target, or shoo a visitor, from anywhere on
// the page, a focused button included. 1/2 and the arrows pick in a choice. Space and Enter are not
// here: they belong to whatever has focus, so main.js only takes them on the canvas or the page body.
export const GRAB_KEYS = ['e', 'g'];
export function grabTarget(key, choice) {
  const k = String(key).toLowerCase();
  if (GRAB_KEYS.includes(k)) return 0;
  if (choice && (k === '1' || k === 'arrowleft')) return 0;
  if (choice && (k === '2' || k === 'arrowright')) return 1;
  return -1;
}

// One frame of the event clock. `c` holds { ev, evIn } (the game's store). While something covers the
// canvas (the win card, the trophy shelf, the Star Dust panel) the clock is paused outright: a vial or a
// visitor cannot age, expire or spawn behind an overlay the player cannot see past. Peeking at another
// stage only holds back new spawns, as before. Returns 'spawn', 'expire' or null; the caller acts on it.
export function tickEventClock(c, { real, dt, life, peek = null, covered = false }) {
  if (covered) return null;
  if (c.ev) { c.ev.age += dt; return c.ev.age > c.ev.life ? 'expire' : null; }
  if (life >= EVENTS_FROM_LIFE && peek == null) { c.evIn -= real; if (c.evIn <= 0) return 'spawn'; }
  return null;
}
export function isChoice(ev) { return ev.bucket === 'choice'; }

// Apply one effect to the state. Never calls earn(): slop to add comes back as `gain`, so the game can
// run its stage-change and win checks, and the simulator can call earn() itself.
// Returns { type, gain, lost, won (gambles: true/false), text }.
export function applyEffect(s, effect, rand) {
  const out = { type: effect.type, gain: 0, lost: 0, won: null, text: '' };
  const say = (msg, vars) => (msg || '').replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  const base = baseRate(s);
  switch (effect.type) {
    case 'gamble': {
      const p = effect.fixedOdds ? effect.p : gambleOdds(s, effect.p);
      const won = rand() < p;
      const inner = applyEffect(s, won ? effect.win : effect.lose, rand);
      return { ...inner, won };
    }
    case 'boost': {
      if (!(base > 0)) {                 // nothing to boost yet: pay a small geyser instead, as the old vial did
        out.type = 'geyser'; out.gain = 25; out.text = say('Slop geyser! +{n} slop.', { n: fmt(25) }); return out;
      }
      if (s.frenzy > 0 && s.fmult !== effect.mult) {
        // two different boosts never overwrite each other's value: the weaker one is paid out as slop
        const keepOld = s.fmult > effect.mult;
        const weak = keepOld ? { mult: effect.mult, secs: effect.secs } : { mult: s.fmult, secs: s.frenzy };
        out.gain = base * (weak.mult - 1) * weak.secs;
        if (keepOld) { out.type = 'geyser'; out.text = say('Already buzzing. That vial is worth +{n} slop instead.', { n: fmt(out.gain) }); return out; }
        s.frenzy = effect.secs; s.fmult = effect.mult;
        out.text = say(effect.msg, { mult: effect.mult, secs: effect.secs }) + ' The old buzz pays out ' + fmt(out.gain) + '.';
        return out;
      }
      s.frenzy = s.frenzy > 0 ? s.frenzy + effect.secs : effect.secs;   // same strength: the timers add up
      s.fmult = effect.mult;
      out.text = say(effect.msg, { mult: effect.mult, secs: effect.secs });
      return out;
    }
    case 'geyser': out.gain = Math.max(25, base * effect.secs); out.text = say(effect.msg || 'Slop geyser! +{n} slop.', { n: fmt(out.gain) }); return out;
    case 'shower': out.gain = Math.max(25, base * effect.secs * effect.n); out.text = say(effect.msg, { n: fmt(out.gain) }); return out;
    case 'refund': out.gain = base > 0 ? Math.min(base * effect.hi, Math.max(base * effect.lo, s.lastBuy || 0)) : 25; out.text = say(effect.msg, { n: fmt(out.gain) }); return out;
    case 'swap': {
      const mult = swapMult(s, effect);
      const inner = applyEffect(s, { type: 'boost', mult, secs: effect.secs, msg: effect.msg }, rand);
      return { ...inner, type: inner.type === 'boost' ? 'swap' : inner.type };
    }
    case 'lottery': {
      const tw = effect.outcomes.reduce((a, o) => a + o.w, 0);
      let r = rand() * tw, pick = effect.outcomes[effect.outcomes.length - 1];
      for (const o of effect.outcomes) { r -= o.w; if (r < 0) { pick = o; break; } }
      return { ...applyEffect(s, pick.effect, rand), lottery: effect.outcomes.indexOf(pick) };
    }
    case 'duel':
      if (s.duel) { out.type = 'geyser'; out.gain = Math.max(25, base * 30); out.text = say('One click-off at a time. The rival goop leaves a tip: +{n} slop.', { n: fmt(out.gain) }); return out; }
      s.duel = { left: effect.secs, need: effect.need, got: 0, win: effect.win, lose: effect.lose };
      out.text = say(effect.msg, { need: effect.need, secs: effect.secs }); return out;
    case 'spill':
    case 'steal': out.lost = s.slop * effect.frac; s.slop -= out.lost; out.text = say(effect.msg, { n: fmt(out.lost) }); return out;
    case 'freeze': s.freeze = Math.max(s.freeze, effect.secs); out.text = say(effect.msg, { secs: effect.secs }); return out;
    default: out.text = effect.msg || ''; return out;
  }
}

// The wormhole: how much harder everything works with your two best feeders' rates swapped (the one you
// own more of gets the better rate), clamped to [lo, hi] so it is always worth catching and never absurd.
export function swapMult(s, effect) {
  const owned = FEEDERS.map((_, i) => i).filter(i => s.own[i] > 0).sort((a, b) => feederRate(s, b) - feederRate(s, a));
  const base = baseRate(s);
  if (owned.length < 2 || !(base > 0)) return effect.lo;
  const [a, b] = owned, ra = feederRate(s, a), rb = feederRate(s, b), na = s.own[a], nb = s.own[b];
  const after = base - na * ra - nb * rb + na * rb + nb * ra;
  return Math.round(Math.max(effect.lo, Math.min(effect.hi, after / base)) * 10) / 10;
}
// A click-off in progress: count a paid feed, and run its clock. tickDuel returns null while it runs, or
// the result of its win or lose effect ({ ...applyEffect(), won }) when it ends, clearing s.duel.
export function duelFeed(s) { if (s.duel) s.duel.got++; }
export function tickDuel(s, dt, rand) {
  const d = s.duel; if (!d) return null;
  d.left -= dt;
  if (d.got < d.need && d.left > 0) return null;
  s.duel = null;
  const won = d.got >= d.need;
  return { ...applyEffect(s, won ? d.win : d.lose, rand), won, duel: true };
}
// Who wins a click-off at a steady rate of clicks a second (the simulator, and the expected value).
export function duelOdds(effect, cps) { return cps == null ? 0.75 : cps * effect.secs >= effect.need ? 1 : 0; }

/* ---------- expected value, in seconds of feeder income ---------- */
// bankSecs: how much spendable slop a player typically holds, in seconds of income (spills and thefts
// take a share of it). odds: the gamble win chance override (Loaded Dice), or null.
export function effectEV(effect, o = {}) {
  const bank = o.bankSecs == null ? 30 : o.bankSecs;
  switch (effect.type) {
    case 'gamble': { const p = effect.fixedOdds || o.odds == null ? effect.p : Math.max(effect.p, o.odds); return p * effectEV(effect.win, o) + (1 - p) * effectEV(effect.lose, o); }
    case 'boost': return (effect.mult - 1) * effect.secs;
    case 'geyser': return effect.secs;
    case 'shower': return effect.secs * effect.n;
    case 'refund': return effect.lo + 10;                              // an estimate (the sim measures it): mostly the floor
    case 'swap': return (Math.min(effect.hi, 2.5) - 1) * effect.secs;  // an estimate: about x2.5 in practice
    case 'lottery': { const tw = effect.outcomes.reduce((a, x) => a + x.w, 0); return effect.outcomes.reduce((a, x) => a + x.w / tw * effectEV(x.effect, o), 0); }
    case 'duel': { const p = duelOdds(effect, o.cps); return p * effectEV(effect.win, o) + (1 - p) * effectEV(effect.lose, o); }
    case 'spill': case 'steal': return -effect.frac * bank;
    case 'freeze': return -effect.secs;
    default: return 0;
  }
}
// What collecting one event is worth when you always collect it: hazards are tapped away, and from a
// choice you take the better vial.
export function eventEV(ev, o = {}) {
  if (isHazard(ev)) return effectEV(ev.tap, o);
  if (isChoice(ev)) return Math.max(...ev.options.map(op => effectEV(op.effect, o)));
  return effectEV(ev.effect, o);
}
export function deckEV(deck, stage, o = {}) {
  let tw = 0, t = 0;
  for (const e of deck) { const w = weightAt(e, stage); tw += w; t += w * eventEV(e, o); }
  return tw ? t / tw : 0;
}
// Average extra income from always collecting, as a fraction of feeder income: EV per event over the
// mean gap between events.
export function incomeBoost(deck, stage, o = {}) {
  return deckEV(deck, stage, o) / ((GAP_CAUGHT[0] + GAP_CAUGHT[1]) / 2);
}
