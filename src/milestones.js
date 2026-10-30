/* Mid-stage milestones: three or four named checkpoints inside every stage, because a stage spans a
   couple of orders of magnitude and the bar barely moves. Pure, no DOM. Each one fires once per run (the
   ids passed live on the state as s.miles and are cleared by a hop), pops a toast, pays a small bonus,
   and may hide one prop in the diorama (`hide`, read by the scene through anim.gone).

   f is how far through the stage it sits, measured like the progress bar: in orders of magnitude. */
import { STAGES, stageSpan } from './econ.js';

const M = (k, f, id, name, hide) => ({ k, f, id, name, hide });
export const MILESTONES = [
  M(0, .3, 'm1a', 'Ate the sticky note'), M(0, .55, 'm1b', 'Ate the coffee machine'), M(0, .8, 'm1c', 'Drank the pink flask', 'pinkFlask'),
  M(1, .25, 'm2a', 'Ate the fire extinguisher'), M(1, .5, 'm2b', 'Ate the warning sign', 'sign'), M(1, .75, 'm2c', 'Ate the vending machine'),
  M(2, .25, 'm3a', 'Ate a parking garage'), M(2, .5, 'm3b', 'Ate the park', 'tree'), M(2, .75, 'm3c', 'Ate rush hour'),
  M(3, .2, 'm4a', 'Ate the Eiffel Tower'), M(3, .4, 'm4b', 'Ate the space station', 'station'), M(3, .6, 'm4c', 'Ate the Alps'), M(3, .8, 'm4d', 'Drank the Pacific'),
  M(4, .25, 'm5a', 'Ate the Moon', 'moon'), M(4, .5, 'm5b', 'Ate Mars'), M(4, .75, 'm5c', 'Ate the asteroid belt'),
  M(5, .2, 'm6a', 'Ate Saturn, rings first', 'saturn'), M(5, .4, 'm6b', 'Ate Neptune'), M(5, .6, 'm6c', 'Ate the Kuiper Belt'), M(5, .8, 'm6d', 'Licked the Sun'),
  M(6, .25, 'm7a', 'Ate Proxima Centauri', 'proxima'), M(6, .5, 'm7b', 'Ate Sirius'), M(6, .75, 'm7c', 'Ate Betelgeuse before it could explode'),
  M(7, .25, 'm8a', 'Ate the Pillars of Creation'), M(7, .5, 'm8b', 'Ate a star nursery, cot and all', 'cot'), M(7, .75, 'm8c', 'Ate the Orion Nebula'),
  M(8, .25, 'm9a', 'Bit the black hole'), M(8, .5, 'm9b', 'The black hole bit back'), M(8, .75, 'm9c', 'Won the staring contest with Sagittarius A*'),
  M(9, .25, 'm10a', 'Ate the Orion Arm'), M(9, .5, 'm10b', 'Ate the galactic bar', 'bar'), M(9, .75, 'm10c', 'Ate both Magellanic Clouds'),
  M(10, .25, 'm11a', 'Heard the doorbell'), M(10, .5, 'm11b', 'Signed for Andromeda'), M(10, .75, 'm11c', 'Ate Triangulum as a side'),
  M(11, .25, 'm12a', 'Ate the dwarf galaxies'), M(11, .5, 'm12b', 'Ate the potato salad', 'salad'), M(11, .75, 'm12c', 'Ate the picnic blanket'),
  M(12, .25, 'm13a', 'Ate the Virgo Cluster'), M(12, .5, 'm13b', 'Ate M87, black hole and all'), M(12, .75, 'm13c', 'Compacted a thousand clusters'),
  M(13, .25, 'm14a', 'Found the Great Attractor'), M(13, .5, 'm14b', 'Ate the Great Attractor'), M(13, .75, 'm14c', 'Ate the Shapley Supercluster'),
  M(14, .25, 'm15a', 'Slurped a filament'), M(14, .5, 'm15b', 'Ate the Sloan Great Wall', 'wall'), M(14, .75, 'm15c', 'Ate the Hercules Great Wall'),
  M(15, .25, 'm16a', 'Ate some nothing'), M(15, .5, 'm16b', 'Made eye contact with a toaster'), M(15, .75, 'm16c', 'Ate the Bootes Void'),
  M(16, .25, 'm17a', 'Ate the oldest light'), M(16, .5, 'm17b', 'Ate the "You are here" sign', 'here'), M(16, .75, 'm17c', 'Ate everything in sight'),
  M(17, .25, 'm18a', 'Waved at an old friend'), M(17, .5, 'm18b', 'Ate the edge of the map'), M(17, .75, 'm18c', 'Ate what was behind it'),
  M(18, .25, 'm19a', 'Ate the dark matter'), M(18, .5, 'm19b', 'Ordered the dark energy'), M(18, .75, 'm19c', 'Asked for the bill', 'bill'),
  // The Fourth Wall: these are the bites out of the interface (see fourthwall.js)
  M(19, .2, 'w-shop', 'Ate a corner of the shop'), M(19, .4, 'w-digits', 'Ate some digits'), M(19, .6, 'w-sound', 'Ate the sound toggle'), M(19, .8, 'w-title', 'Ate the title'),
];
export const MILESTONE_BY_ID = Object.fromEntries(MILESTONES.map(m => [m.id, m]));
// The bonus: a small share of what the goop had eaten when it got there (at least 10 slop). Sized by
// the milestone, not by income, so it stays small in a fast run too: worth a few percent of a stage.
export const MILE_SHARE = 0.01, MILE_MIN = 10;

// Lifetime slop at which a milestone fires.
export function milestoneAt(m) {
  const [a, b] = stageSpan(m.k), lo = Math.log10(a.at + 1), hi = Math.log10(b.at + 1);
  return Math.pow(10, lo + m.f * (hi - lo)) - 1;
}
const AT = MILESTONES.map(milestoneAt);
export function milestonesIn(k) { return MILESTONES.filter(m => m.k === k); }
// Milestones whose threshold the goop has passed but that have not fired this run, in order.
export function dueMilestones(s) {
  const out = [], miles = s.miles || {};
  for (let i = 0; i < MILESTONES.length; i++) { if (AT[i] > s.life) break; if (!miles[MILESTONES[i].id]) out.push(MILESTONES[i]); }
  return out;
}
export function milestoneBonus(m) { return Math.max(MILE_MIN, AT[MILESTONES.indexOf(m)] * MILE_SHARE); }
// Fire everything due: marks each once and returns [{ m, bonus }]. The caller adds the bonus with earn().
export function passMilestones(s) {
  const out = [];
  for (const m of dueMilestones(s)) { s.miles = { ...s.miles, [m.id]: true }; out.push({ m, bonus: milestoneBonus(m) }); }
  return out;
}
// Mark everything already behind the goop as done, with no bonus and no toast: a Head Start run, or an
// old save loading into a game that has milestones for the first time.
export function seedMilestones(s) {
  for (const m of dueMilestones(s)) s.miles = { ...s.miles, [m.id]: true };
  return s;
}
// Props a stage's scene should leave out, given the milestones passed.
export function goneIn(miles, k) {
  const out = new Set();
  for (const m of MILESTONES) if (m.k === k && m.hide && miles && miles[m.id]) out.add(m.hide);
  return out;
}
export function milestonesPassed(s) { return Object.keys(s.miles || {}).filter(id => MILESTONE_BY_ID[id]).length; }
export { STAGES };
