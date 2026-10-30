/* The goop on its own: for the share card, the avatar and the app icons. Draws with the game's own
   sprite code into any 2D context, by pointing the drawing kit at it for the duration of the call. */
import { ctx as liveCtx, S as liveS, setContext, setScale, INK } from './draw.js';
import { drawGoop } from './sprites/goop.js';

// Run fn with the drawing kit pointed at c2d (scale: device pixels per drawing unit), then put it back.
export function withContext(c2d, scale, fn) {
  const prev = liveCtx, prevS = liveS;
  setContext(c2d); setScale(scale);
  try { c2d.save(); fn(c2d); } finally { c2d.restore(); setContext(prev); setScale(prevS); }
}
// The goop at stage k, centred at (x, y) with radius r, in the drawing units of the current transform.
// p: progress through the stage (colour drift); mood: one of mood.js's, 'content' by default. t = 1, not
// 0: at t = 0 the first eye is mid-blink.
export function goopAt(x, y, r, k, { p = .5, t = 1, mood = 'content', lookX, lookY } = {}) {
  drawGoop({ x, base: y, grounded: false }, r, k, p, t, { squash: 0, mouth: 0, lookX: lookX == null ? x + r : lookX, lookY: lookY == null ? y - r * .2 : lookY, mood });
}
// A square portrait: a night-sky tile with a few stars and the goop in the middle, drawn in a 400-unit
// space (about the goop's size in the game, so line widths and shadows look the same). inset: the share
// of the tile the goop may use (smaller for maskable icons, whose edges get cropped).
export const PORTRAIT_UNITS = 400;
export function portrait(c2d, size, k, { inset = .62, bg = '#2b2150', stars = true, p = .5 } = {}) {
  const U = PORTRAIT_UNITS, sc = size / U;
  withContext(c2d, sc, c => {
    c.setTransform(sc, 0, 0, sc, 0, 0);
    c.fillStyle = bg; c.fillRect(0, 0, U, U);
    if (stars) { c.fillStyle = '#fff3d6'; c.globalAlpha = .7; for (const [sx, sy, sr] of [[56, 72, 4.4], [328, 48, 3.6], [352, 280, 4.8], [40, 320, 3.2], [200, 32, 2.8], [96, 208, 2.4], [304, 152, 2.8]]) { c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fill(); } c.globalAlpha = 1; }
    goopAt(U / 2, U * .53, U / 2 * inset * .8, k, { p });
  });
}
export { INK };
