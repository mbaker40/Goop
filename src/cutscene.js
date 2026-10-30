/* The ending: a timeline of six beats, title cards and sound cues. Pure, no DOM: ending.js draws whatever
   frameAt() says. Times are seconds from the start. Reduced motion shortens the transitions (fades and
   the camera's travel) but keeps every beat, card and second of content.
   Phase 4: each beat hands off to the next on screen (a match cut, no dip to black): the burp's sparks
   become the stars, the stars become the galaxy the camera dives into, the last evolution still grows
   into stage 1's lab, and the lab's tiny human turns to the camera. Only the cut into the landing dips. */

export const BEATS = [
  { id: 'bite',    from: 0,  to: 6,  title: 'The last bite',
    caption: 'Everything goes black. Only the goop is left, eyes closed, chewing. Then a tiny, polite burp.' },
  { id: 'bang',    from: 6,  to: 22, title: 'The Goop Bang',
    caption: 'The burp sprays sparks that keep going. They cool into stars, the stars pull into galaxies, and the galaxies swirl inside the goop. Its eyes become two spiral galaxies.' },
  { id: 'zoom',    from: 22, to: 42, title: 'Zoom in',
    caption: 'The camera dives into one of the galaxies in its belly: through a spiral arm, past a star, to a molten planet. Its oceans form, the colour of the goop. A goop-fish with the goop\'s own eye crawls out, and evolves: goop-lizard, a goop with too many legs, goop-frog, goop-ape, goop-ape with a clipboard, goop-ape in goggles, a goop in a lab coat.' },
  { id: 'lab',     from: 42, to: 58, title: 'The lab',
    caption: 'A wobbly goop scientist in goggles stands at a lab table. In a petri dish, a tiny human in a tiny lab coat. The goop feeds it with a tiny spoon. The human burps. Plus one grub. The toaster on the counter is judging.' },
  { id: 'stinger', from: 58, to: 70, title: 'The stinger',
    caption: 'The tiny human turns and looks at you.' },
  { id: 'landing', from: 70, to: Infinity, title: 'The landing', caption: '' },
];
export const LENGTH = 70;            // seconds until the landing
// How each beat is entered: 'match' cuts straight from the frame before (the hand-offs above), 'dip'
// fades through black. The first beat needs neither.
export const ENTRY = { bite: 'none', bang: 'match', zoom: 'match', lab: 'match', stinger: 'match', landing: 'dip' };

// Title cards. `on: 'black'` cards hold on a black field; the first one sits over the Goop Bang.
// Each card fades in and out over CARD_FADE and holds at full strength for HOLD seconds between: long
// enough to read. The stinger's three hold 2.5 s each on black, as the design says.
export const CARD_FADE = 0.25, HOLD = 2.5;
export const CARDS = [
  { text: 'Fourteen billion years later. Roughly.', from: 15.5, to: 21.5, on: 'scene' },
  { text: 'GOOP 2: FEED THE HUMAN.', from: 60.2, to: 63.2, on: 'black' },
  { text: 'You are the lunch.',      from: 63.4, to: 66.4, on: 'black' },
  { text: 'Coming eventually.',      from: 66.6, to: 69.6, on: 'black' },
];
// Sound cues, by id (audio.js plays them). The first three seconds are silent on purpose. The two feeds
// in the lab land at 47 and 53 s (ending.js FEEDS), each with a tiny burp just after.
export const CUES = [{ at: 4.6, id: 'burp' }, { at: 6.2, id: 'bang' }, { at: 47, id: 'feed' }, { at: 47.6, id: 'tinyburp' }, { at: 53, id: 'feed' }, { at: 53.6, id: 'tinyburp' }, { at: 60.2, id: 'sting' }];

// Every step is a goop: a goop-fish crawls out of the goop-green sea and keeps the goop's eye and drips.
export const EVOLUTION = ['fish', 'lizard', 'legs', 'frog', 'ape', 'clipboard', 'goggles', 'goop'];
export const EVO_FROM = 32.4, EVO_EACH = 1.2;              // eight stills at 1.2 s, ending exactly at 42 s
export const HANDOFF = 2.4;                                 // seconds of beat 3 spent diving from the goop's belly into one galaxy

export function timeline(reduced = false) {
  return { beats: BEATS, cards: CARDS, cues: CUES, length: LENGTH, fade: reduced ? 0.15 : 0.45, cardFade: reduced ? 0.15 : CARD_FADE, zoomSteps: reduced ? 4 : 0 };
}
const clamp01 = v => Math.max(0, Math.min(1, v));

// Everything the renderer needs at time t: the beat (and how far through it), any title card with its
// opacity, the black dip between beats, and the evolution still on show.
export function frameAt(t, reduced = false) {
  const tl = timeline(reduced), f = tl.fade;
  t = Math.max(0, t);
  let i = BEATS.findIndex(b => t >= b.from && t < b.to);
  if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i], local = t - b.from, span = Number.isFinite(b.to) ? b.to - b.from : 1;
  const card = CARDS.find(c => t >= c.from && t < c.to) || null, cf = tl.cardFade;
  const cardAlpha = card ? Math.min(clamp01((t - card.from) / cf), clamp01((card.to - t) / cf)) : 0;
  // a short dip to black either side of a 'dip' cut only; match cuts go straight through
  const next = BEATS[i + 1], toEnd = next && ENTRY[next.id] === 'dip' ? b.to - t : Infinity;
  const black = Math.max(ENTRY[b.id] === 'dip' ? clamp01(1 - local / f) : 0, clamp01(1 - toEnd / f));
  const evo = b.id === 'zoom' && t >= EVO_FROM ? Math.min(EVOLUTION.length - 1, Math.floor((t - EVO_FROM) / EVO_EACH)) : -1;
  return { t, beat: b.id, index: i, local, u: Number.isFinite(b.to) ? clamp01(local / span) : 1, card, cardAlpha, black, evo, done: t >= LENGTH };
}
// The camera's zoom through beat 3 after the hand-off, 0..1. Smooth normally; with reduced motion it
// moves in a few cuts.
export function zoomAt(local, reduced = false) {
  const u = clamp01((local - HANDOFF) / (EVO_FROM - 22 - HANDOFF));
  const steps = timeline(reduced).zoomSteps;
  return steps ? Math.floor(u * steps + 1e-9) / steps : u;
}
// Cues that fall in (t0, t1]: lets the game fire each sound once even across a long frame.
export function cuesBetween(t0, t1) { return CUES.filter(c => c.at > t0 && c.at <= t1); }
// Skipping is allowed after the first full viewing.
export function canSkip(st) { return !!st && st.cutsceneSeen >= 1; }
// The tab was closed during the first viewing: Eat the Rest was pressed (ate is saved) but the ending
// never finished. On load this counts as seen, so the replay can be skipped, and the landing comes up.
export function interruptedEnding(state, stats) { return !!(state && state.ate) && !!stats && stats.universes > 0 && stats.cutsceneSeen === 0; }
