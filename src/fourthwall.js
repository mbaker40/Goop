/* Stage 20, The Fourth Wall: the goop eats the interface. Pure, no DOM: this decides WHAT is damaged and
   how text reads; ui.js applies it. The rule that matters is that the damage is cosmetic. Every
   treatment below is a CSS class or a change to visible text only. Buttons keep working, keep their
   accessible names, and screen readers hear the real numbers (see `spoken`). The tests hold this file
   to that. */
import { LAST, stageProgress } from './econ.js';
import { MILESTONE_BY_ID } from './milestones.js';
import { wallMercy, MERCY_DELAY } from './prestige.js';

// What gets eaten, in order. `when` is the milestone (milestones.js) that takes the bite; 'entry' is
// stage 20's door, where the zero goes first. `cls` is the only thing a treatment may add to the page.
export const WALL_BITES = [
  { when: 'entry',    target: 'banner',  cls: 'chewed',  what: 'The zero in "Stage 20"' },
  { when: 'w-shop',   target: 'shop',    cls: 'bitten',  what: 'A corner of the shop' },
  { when: 'w-digits', target: 'hud',     cls: 'chewed',  what: 'Digits in the slop and mass readouts' },
  { when: 'w-sound',  target: 'sound',   cls: 'eaten',   what: 'The sound toggle (it still works; it is just in the goop now)' },
  { when: 'w-title',  target: 'title',   cls: 'bitten',  what: 'The end of the title' },
];
export const WALL_CLASSES = ['chewed', 'bitten', 'eaten', 'wall'];

// The damage right now, or null outside stage 20. level runs 0..1 through the stage (1 once eaten).
// With the Fourth Wall Mercy perk each bite waits until the goop is MERCY_DELAY further through the stage
// than its milestone, and `mercy` is set so readouts lose one digit, not two.
export function wallOf(s) {
  if (!s || s.stage !== LAST) return null;
  const miles = s.miles || {}, on = {}, mercy = !!s.perks && wallMercy(s), level = s.ate ? 1 : Math.max(0, Math.min(1, stageProgress(s.life)));
  for (const b of WALL_BITES) on[b.target] = b.when === 'entry' || (!!miles[b.when] && (!mercy || s.ate || level >= MILESTONE_BY_ID[b.when].f + MERCY_DELAY));
  return { level, on, mercy, bites: WALL_BITES.filter(b => on[b.target]).length };
}
// Classes to set on each target. Visual only: never disabled, hidden or aria-anything.
export function wallClasses(w) {
  const out = {};
  for (const b of WALL_BITES) out[b.target] = w && w.on[b.target] ? [b.cls] : [];
  return out;
}

// "1,234" -> "1,2?4": one digit in the back half goes missing; long numbers lose two.
export function chew(text, mercy = false) {
  const t = String(text), at = [];
  for (let i = 0; i < t.length; i++) if (t[i] >= '0' && t[i] <= '9') at.push(i);
  if (at.length < 2) return t;
  const pick = [at[Math.min(at.length - 1, Math.floor(at.length * .66))]];
  if (at.length >= 5 && !mercy) pick.push(at[1]);
  return t.split('').map((c, i) => (pick.includes(i) ? '?' : c)).join('');
}
// "Stage 20 of 20" -> "Stage 2 of 2": the zero was delicious.
export function eatZero(text) { return String(text).replace(/20/g, '2'); }

// A readout under the wall: what is drawn, and what assistive tech hears (always the real thing).
export function readout(real, chewed, mercy = false) { return { shown: chewed ? chew(real, mercy) : String(real), spoken: String(real) }; }
export function stageLine(k, total, name, w) {
  const real = 'Stage ' + (k + 1) + ' of ' + total + (name ? ': ' + name : '');
  return { shown: w && w.on.banner ? eatZero(real) : real, spoken: real };
}
