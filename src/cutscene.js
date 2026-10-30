/* The ending: a timeline of six beats, title cards and sound cues. Pure, no DOM: ending.js draws whatever
   frameAt() says. Times are seconds from the start. Reduced motion shortens the transitions (fades and
   the camera's travel) but keeps every beat, card and second of content. */

export const BEATS = [
  { id: 'bite',    from: 0,  to: 6,  title: 'The last bite',
    caption: 'Everything goes black. Only the goop is left, eyes closed, chewing. Then a tiny, polite burp.' },
  { id: 'bang',    from: 6,  to: 22, title: 'The Goop Bang',
    caption: 'The burp sprays sparks that keep going. They cool into stars, the stars pull into galaxies, and the galaxies swirl inside the goop. Its eyes become two spiral galaxies.' },
  { id: 'zoom',    from: 22, to: 42, title: 'Zoom in',
    caption: 'Through a spiral arm, past a star, to a molten planet. Its oceans form, slop green. A fish with the goop\'s eye crawls out, and evolves: lizard, too many legs, frog, monkey, monkey with a clipboard, monkey in goggles, a goop in a lab coat.' },
  { id: 'lab',     from: 42, to: 58, title: 'The lab',
    caption: 'A wobbly goop scientist in goggles stands at a lab table. In a petri dish, a tiny human in a tiny lab coat. The goop feeds it with a tiny spoon. The human burps. Plus one grub. The toaster on the counter is judging.' },
  { id: 'stinger', from: 58, to: 68, title: 'The stinger',
    caption: 'The tiny human turns and looks at you.' },
  { id: 'landing', from: 68, to: Infinity, title: 'The landing', caption: '' },
];
export const LENGTH = 68;            // seconds until the landing

// Title cards. `on: 'black'` cards hold on a black field; the first one sits over the Goop Bang.
export const CARDS = [
  { text: 'Fourteen billion years later. Roughly.', from: 16, to: 21.5, on: 'scene' },
  { text: 'GOOP 2: FEED THE HUMAN.', from: 59.5, to: 62, on: 'black' },
  { text: 'You are the lunch.',      from: 62.5, to: 65, on: 'black' },
  { text: 'Coming eventually.',      from: 65.5, to: 68, on: 'black' },
];
// Sound cues, by id (audio.js plays them). The first three seconds are silent on purpose.
export const CUES = [{ at: 4.6, id: 'burp' }, { at: 6.2, id: 'bang' }, { at: 49, id: 'feed' }, { at: 50.6, id: 'tinyburp' }, { at: 59.5, id: 'sting' }];

export const EVOLUTION = ['fish', 'lizard', 'legs', 'frog', 'monkey', 'clipboard', 'goggles', 'goop'];
export const EVO_FROM = 32.4, EVO_EACH = 1.2;              // eight stills at 1.2 s, ending exactly at 42 s

export function timeline(reduced = false) {
  return { beats: BEATS, cards: CARDS, cues: CUES, length: LENGTH, fade: reduced ? 0.15 : 0.6, zoomSteps: reduced ? 4 : 0 };
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
  const card = CARDS.find(c => t >= c.from && t < c.to) || null;
  const cardAlpha = card ? Math.min(clamp01((t - card.from) / f), clamp01((card.to - t) / f)) : 0;
  // a short dip to black either side of each cut between beats (not into the first or out of the last)
  const toEnd = Number.isFinite(b.to) && i < BEATS.length - 2 ? b.to - t : Infinity;
  const black = i > 0 ? Math.max(clamp01(1 - local / f), clamp01(1 - toEnd / f)) : clamp01(1 - toEnd / f);
  const evo = b.id === 'zoom' && t >= EVO_FROM ? Math.min(EVOLUTION.length - 1, Math.floor((t - EVO_FROM) / EVO_EACH)) : -1;
  return { t, beat: b.id, index: i, local, u: Number.isFinite(b.to) ? clamp01(local / span) : 1, card, cardAlpha, black, evo, done: t >= LENGTH };
}
// The camera's zoom through beat 3, 0..1. Smooth normally; with reduced motion it moves in a few cuts.
export function zoomAt(local, reduced = false) {
  const u = clamp01(local / (EVO_FROM - 22));
  const steps = timeline(reduced).zoomSteps;
  return steps ? Math.floor(u * steps + 1e-9) / steps : u;
}
// Cues that fall in (t0, t1]: lets the game fire each sound once even across a long frame.
export function cuesBetween(t0, t1) { return CUES.filter(c => c.at > t0 && c.at <= t1); }
// Skipping is allowed after the first full viewing.
export function canSkip(st) { return !!st && st.cutsceneSeen >= 1; }
