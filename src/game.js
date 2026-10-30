/* The live game's shared, mutable state: one store every browser module reads and writes.
   (econ, events, prestige, stats and save stay pure; this file is where their results live.) */
import { W, H, clamp } from './draw.js';
import { newState, stageProgress } from './econ.js';
import { newStats } from './stats.js';
import { FIRST_EVENT } from './events.js';
import { SCENES } from './scenes/index.js';

export const G = {
  state: newState(),
  stats: newStats(),
  prefs: { sound: true },
  peek: null,            // stage index being peeked at, or null
  ev: null,              // the event on stage: { def, age, life, seed, targets: [{ look, label, x, y, opt, px, py }] }
  evIn: FIRST_EVENT,     // seconds until the next event
  clickTimes: [],        // paid clicks in the last second (the click cap)
  badgeCount: 0,
};

// what's moving on stage
export const anim = { squash: 0, squashV: 0, mouth: 0, fling: 1, zoom: 1, r: 30, cy: 0, won: false, lookX: W / 2, lookY: H / 2 };
export const par = { x: 0, y: 0, tx: 0, ty: 0 };
export const shots = [], drops = [], floats = [];

export function view() { return G.peek == null ? { k: G.state.stage, p: clamp(stageProgress(G.state.life), 0, 1) } : { k: G.peek, p: .72 }; }
export function mouthPoint() { const g = SCENES[view().k].goop; return [g.x + anim.r * .05, anim.cy + anim.r * .3]; }
export function clearStage() { shots.length = drops.length = floats.length = 0; }
