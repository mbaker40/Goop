/* Sound: tiny synth blips, nothing to load. */
import { G } from './game.js';

let ac = null;
function blip(f, dur, type, vol, slide, delay) {
  if (!G.prefs.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) { /* no audio here: play silently */ }
}
export const sfx = {
  feed: () => blip(190 + Math.random() * 70, .13, 'sine', .07, .42),
  full: () => blip(150 + Math.random() * 30, .08, 'sine', .035, .6),          // a feed past the click cap
  buy: () => { blip(520, .08, 'triangle', .05, 1.5); blip(780, .1, 'triangle', .05, 1.2, .07); },
  vial: () => [0, 1, 2, 3].forEach(i => blip(440 * Math.pow(1.26, i), .14, 'square', .03, 1.02, i * .07)),
  spill: () => [0, 1, 2].forEach(i => blip(330 / Math.pow(1.26, i), .18, 'square', .03, .8, i * .09)),
  visitor: () => { blip(620, .12, 'square', .03, 1); blip(470, .16, 'square', .03, 1, .14); },
  stage: () => [0, 1, 2, 3, 4].forEach(i => blip(262 * Math.pow(1.335, i), .2, 'triangle', .06, 1, i * .1)),
  badge: () => [0, 2, 4].forEach(i => blip(660 * Math.pow(1.122, i), .16, 'triangle', .045, 1, i * .06)),
};
