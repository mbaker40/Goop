/* The event deck. Replaces the old 50/50 mutagen vial with weighted, data-driven event types in four
   buckets: boosts, gambles, choices and hazards. Pure, no DOM: the game, the tests and the balance
   simulator all use these same definitions. Randomness is always passed in.

   Every number here was tuned so that always collecting events is worth about what it was before
   (see deckEV below and `npm run sim`): the vial is the game's pace, not a bonus. */
import { baseRate, FRENZY_MULT, FRENZY_SECS, GEYSER_SECS } from './econ.js';
import { gambleOdds } from './prestige.js';
import { fmt } from './fmt.js';

// Timing, in seconds. Same as the old vial: first one after 38 s, then 42 to 72 s after a catch,
// 30 to 60 s after one gets away, and a vial dangles for 13 s.
export const FIRST_EVENT = 38, GAP_CAUGHT = [42, 72], GAP_MISSED = [30, 60], VIAL_LIFE = 13;
export const EVENTS_FROM_LIFE = 30;   // no events until the goop has eaten this much

const boost = (mult, secs, msg) => ({ type: 'boost', mult, secs, msg });
const geyser = (secs, msg) => ({ type: 'geyser', secs, msg });

// w: weight per stage (index = stage; the last entry covers every later stage). look: how it is drawn.
export const EVENTS = [
  { id: 'frenzy', bucket: 'boost', name: 'Frenzy Vial', look: 'frenzy', label: 'Frenzy vial!',
    w: [30, 24, 22, 22, 22, 22], effect: boost(FRENZY_MULT, FRENZY_SECS, 'Mutagen! Feeders work {mult} times faster for {secs} seconds.') },
  { id: 'geyser', bucket: 'boost', name: 'Geyser Vial', look: 'geyser', label: 'Geyser vial!',
    w: [30, 22, 16, 16, 16, 16], effect: geyser(GEYSER_SECS, 'Slop geyser! +{n} slop.') },
  { id: 'drip', bucket: 'boost', name: 'Slow Drip', look: 'drip', label: 'Slow drip',
    w: [10, 10, 10, 10, 10, 10], effect: boost(2, 90, 'Slow drip. Feeders work twice as hard for {secs} seconds.') },
  { id: 'bubbling', bucket: 'gamble', name: 'Bubbling Vial', look: 'bubbling', label: 'Bubbling vial?',
    // TODO(follow-up): spell the risk out in the spawn label and the screen-reader announcement for the
    // gambles that can spill the bank (this one and fork's "Spicy"), not just a question mark.
    w: [0, 8, 9, 9, 9, 9],
    effect: { type: 'gamble', p: 0.5, win: boost(12, 20, 'It held! Feeders work {mult} times faster for {secs} seconds.'),
              lose: { type: 'spill', frac: 0.5, msg: 'It boiled over. {n} slop is on the floor.' } } },
  { id: 'mystery', bucket: 'gamble', name: 'Unlabelled Flask', look: 'mystery', label: 'Unlabelled flask?',
    w: [0, 8, 10, 10, 10, 10],
    effect: { type: 'gamble', p: 0.5, win: geyser(200, 'It was mutagen. Lots of it. +{n} slop.'),
              lose: { type: 'nothing', msg: 'It was cold tea. The goop is disappointed in you.' } } },
  { id: 'twin', bucket: 'choice', name: 'Twin Vials', label: 'Pick one!',
    w: [10, 10, 10, 10, 10, 10],
    options: [{ look: 'frenzy', label: 'Frenzy', effect: boost(FRENZY_MULT, FRENZY_SECS, 'Mutagen! Feeders work {mult} times faster for {secs} seconds.') },
              { look: 'geyser', label: 'Big geyser', effect: geyser(110, 'Big geyser! +{n} slop. The other vial evaporates in a huff.') }] },
  { id: 'fork', bucket: 'choice', name: 'Safe or Spicy', label: 'Pick one!',
    w: [0, 6, 8, 8, 8, 8],
    options: [{ look: 'drip', label: 'Safe', effect: boost(2, 90, 'The sensible choice. Feeders work twice as hard for {secs} seconds.') },
              { look: 'bubbling', label: 'Spicy', effect: { type: 'gamble', p: 0.5, win: boost(12, 20, 'Spicy paid off! Feeders x{mult} for {secs} seconds.'),
                                                            lose: { type: 'spill', frac: 0.5, msg: 'Too spicy. {n} slop boiled away.' } } }] },
  { id: 'inspector', bucket: 'hazard', name: 'Lab Inspector', look: 'inspector', label: 'Inspector! Tap or press E',
    w: [0, 6, 8, 8, 8, 8], window: 4,
    tap: geyser(30, 'Inspector shooed. He left his lunch money: +{n} slop.'),
    miss: { type: 'freeze', secs: 10, msg: 'Inspection! Feeders frozen for {secs} seconds while he fills in a form.' } },
  { id: 'rival', bucket: 'hazard', name: 'Rival Scientist', look: 'rival', label: 'Thief! Tap or press E',
    w: [0, 0, 6, 6, 6, 6], window: 4,
    tap: geyser(30, 'Not today, Gary. He dropped {n} slop running off.'),
    miss: { type: 'steal', frac: 0.15, msg: 'The rival scientist made off with {n} slop.' } },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

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
export function nextGap(caught, rand, mult = 1) {
  const [lo, hi] = caught ? GAP_CAUGHT : GAP_MISSED;
  return (lo + rand() * (hi - lo)) * mult;
}
export function isHazard(ev) { return ev.bucket === 'hazard'; }

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
    case 'spill':
    case 'steal': out.lost = s.slop * effect.frac; s.slop -= out.lost; out.text = say(effect.msg, { n: fmt(out.lost) }); return out;
    case 'freeze': s.freeze = Math.max(s.freeze, effect.secs); out.text = say(effect.msg, { secs: effect.secs }); return out;
    default: out.text = effect.msg || ''; return out;
  }
}

/* ---------- expected value, in seconds of feeder income ---------- */
// bankSecs: how much spendable slop a player typically holds, in seconds of income (spills and thefts
// take a share of it). odds: the gamble win chance override (Loaded Dice), or null.
export function effectEV(effect, o = {}) {
  const bank = o.bankSecs == null ? 30 : o.bankSecs;
  switch (effect.type) {
    case 'gamble': { const p = effect.fixedOdds || o.odds == null ? effect.p : Math.max(effect.p, o.odds); return p * effectEV(effect.win, o) + (1 - p) * effectEV(effect.lose, o); }
    case 'boost': return (effect.mult - 1) * effect.secs;
    case 'geyser': return effect.secs;
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
